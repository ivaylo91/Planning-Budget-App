#!/usr/bin/env python3
"""
Entry point: scrape all 5 stores and upsert prices into Supabase.

Usage:
  SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=... python scripts/run.py

Optional env vars:
  SCRAPE_STORES   comma-separated subset, e.g. "billa,lidl"  (default: all)
  SCRAPE_DRY_RUN  set to "1" to parse only, skip DB writes

Required env vars:
  SUPABASE_URL         — project URL
  SUPABASE_SERVICE_KEY — service role key (bypasses RLS)
"""
import logging
import os
import sys
import time

import billa
import lidl
import kaufland
import metro
import fantastico
import db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("run")

# ── Category keyword → icon mapping (matches 001_initial_schema.sql) ────────

CATEGORY_MAP = {
    # dairy
    "мляко": "🥛", "кисело": "🥛", "кефир": "🥛", "кашкавал": "🥛",
    "сирен": "🥛", "масло": "🥛", "сметан": "🥛", "яйц": "🥛",
    "млечн": "🥛", "dairy": "🥛", "yogurt": "🥛",
    # meat
    "пиле": "🥩", "месо": "🥩", "кайма": "🥩", "шунка": "🥩",
    "салам": "🥩", "наденица": "🥩", "кренвирш": "🥩", "бекон": "🥩",
    "свинск": "🥩", "телешк": "🥩", "риба": "🥩", "сьомга": "🥩",
    "скарид": "🥩", "meat": "🥩",
    # fruit & veg
    "домат": "🥦", "краставиц": "🥦", "чушк": "🥦", "лук": "🥦",
    "картоф": "🥦", "морков": "🥦", "ябълк": "🥦", "банан": "🥦",
    "портокал": "🥦", "лимон": "🥦", "зеленчук": "🥦", "плод": "🥦",
    "fruit": "🥦", "vegetable": "🥦",
    # bread & bakery
    "хляб": "🍞", "погача": "🍞", "кроасан": "🍞", "питк": "🍞",
    "симит": "🍞", "геврек": "🍞", "bread": "🍞",
    # drinks
    "вода": "🧃", "сок": "🧃", "cola": "🧃", "кола": "🧃",
    "бира": "🧃", "вино": "🧃", "напит": "🧃", "drink": "🧃",
    # cleaning
    "перилен": "🧹", "почистващ": "🧹", "препарат": "🧹",
    "прах": "🧹", "clean": "🧹", "торбичк": "🧹",
    # frozen
    "замраз": "🧊", "пица": "🧊", "frozen": "🧊", "пастет": "🧊",
    # canned
    "консерв": "🥫", "боб": "🥫", "грах": "🥫", "царевиц": "🥫",
    "домашн": "🥫", "can": "🥫",
    # snacks
    "чипс": "🍪", "бисквит": "🍪", "шоколад": "🍪", "вафл": "🍪",
    "снак": "🍪", "снакс": "🍪", "мюсли": "🍪", "snack": "🍪",
    # hygiene
    "шампоан": "🧴", "душ": "🧴", "дезодорант": "🧴", "паста": "🧴",
    "сапун": "🧴", "hygiene": "🧴", "козметик": "🧴",
}


def guess_category_icon(name: str) -> str:
    name_lower = name.lower()
    for keyword, icon in CATEGORY_MAP.items():
        if keyword in name_lower:
            return icon
    return "🛒"


def process_items(
    client,
    items: list[dict],
    dry_run: bool = False,
) -> tuple[int, int]:
    """Returns (saved, failed) counts."""
    saved = 0
    failed = 0
    for item in items:
        try:
            if dry_run:
                log.debug("DRY RUN: would save '%s' @ %.2f", item.get("name"), item.get("price", 0))
                saved += 1
                continue

            product_id = db.get_or_create_product(
                client,
                name=item["name"],
                brand=item.get("brand"),
                category_icon=guess_category_icon(item["name"]),
                unit=item.get("unit", "бр."),
            )
            db.upsert_price(
                client,
                product_id=product_id,
                store_id=item["store_id"],
                price=item["price"],
                is_promo=item["is_promotion"],
                promo_price=item.get("promo_price"),
                promo_end=item.get("promo_end_date"),
            )
            saved += 1
        except Exception as exc:
            log.warning("Failed to save '%s': %s", item.get("name"), exc)
            failed += 1
    return saved, failed


def run_scraper(name: str, module, store_ids: dict, client, dry_run: bool) -> int:
    """
    Run one scraper module, log to scrape_runs, and return count of saved items.
    Never raises — logs errors and returns 0 on failure.
    """
    log.info("─── %s ───", name.upper())
    run_id = db.start_scrape_run(client, name) if not dry_run else None

    try:
        items = module.scrape(store_ids)
    except Exception as exc:
        log.error("%s scraper raised an exception: %s", name, exc)
        db.finish_scrape_run(client, run_id, "error", 0, str(exc))
        return 0

    if not items:
        log.warning("%s: scraper returned 0 items — site may have changed", name)
        db.finish_scrape_run(client, run_id, "empty", 0, "No items scraped")
        return 0

    saved, failed = process_items(client, items, dry_run=dry_run)
    log.info("%s: %d saved, %d failed", name, saved, failed)

    status = "success" if failed == 0 else "partial"
    err = f"{failed} items failed to save" if failed else None
    db.finish_scrape_run(client, run_id, status, saved, err)
    return saved


def main() -> None:
    dry_run = os.environ.get("SCRAPE_DRY_RUN", "0") == "1"
    allowed_stores = {
        s.strip().lower()
        for s in os.environ.get("SCRAPE_STORES", "").split(",")
        if s.strip()
    } or None  # None means all stores

    if dry_run:
        log.info("DRY RUN mode — no DB writes")

    client = db.get_client()
    store_ids = db.get_store_ids(client)
    log.info("Connected. Stores in DB: %s", sorted(store_ids.keys()))

    scrapers = [
        ("billa", billa),
        ("lidl", lidl),
        ("kaufland", kaufland),
        ("metro", metro),
        ("fantastico", fantastico),
    ]

    totals: dict[str, int] = {}
    failed_stores: list[str] = []

    for store_name, module in scrapers:
        if allowed_stores and store_name not in allowed_stores:
            log.info("Skipping %s (not in SCRAPE_STORES)", store_name)
            continue

        start = time.time()
        count = run_scraper(store_name, module, store_ids, client, dry_run)
        elapsed = time.time() - start
        totals[store_name] = count
        if count == 0:
            failed_stores.append(store_name)
        log.info("%s finished in %.1fs", store_name, elapsed)

    # ── Summary ──────────────────────────────────────────────────────────────
    log.info("═══ SUMMARY ═══")
    for store, count in totals.items():
        status = "✓" if count > 0 else "✗"
        log.info("  %s %s: %d products", status, store, count)
    total_saved = sum(totals.values())
    log.info("Total upserted: %d price rows", total_saved)

    if failed_stores:
        log.warning(
            "These stores returned 0 products: %s\n"
            "Their websites may have changed HTML structure.\n"
            "Check the corresponding .py file and update CSS selectors.",
            ", ".join(failed_stores),
        )

    if total_saved == 0:
        log.error("No prices were saved at all — marking run as failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
