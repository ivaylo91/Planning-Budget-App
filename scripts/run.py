#!/usr/bin/env python3
"""
Entry point: scrape Billa + Lidl and upsert prices into Supabase.

Usage:
  SUPABASE_URL=https://... SUPABASE_SERVICE_KEY=... python scripts/run.py

Required env vars:
  SUPABASE_URL         — project URL (same as EXPO_PUBLIC_SUPABASE_URL)
  SUPABASE_SERVICE_KEY — service role key (from Supabase dashboard → Settings → API)
"""
import logging
import sys

import billa
import lidl
import db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("run")

# Category name → icon mapping (matches seed data in 001_initial_schema.sql)
CATEGORY_ICONS = {
    "мляко": "🥛", "млечни": "🥛", "dairy": "🥛",
    "месо": "🥩", "колбас": "🥩", "meat": "🥩",
    "плод": "🥦", "зеленчук": "🥦", "fruit": "🥦", "vegetable": "🥦",
    "хляб": "🍞", "bread": "🍞",
    "напит": "🧃", "drink": "🧃", "вода": "🧃",
    "почист": "🧹", "clean": "🧹",
    "замраз": "🧊", "frozen": "🧊",
    "консерв": "🥫", "can": "🥫",
    "снак": "🍪", "snack": "🍪", "бисквит": "🍪",
    "хигиен": "🧴", "hygiene": "🧴",
}

EUR_BGN = 1.95583


def guess_category_icon(name: str) -> str:
    name_lower = name.lower()
    for keyword, icon in CATEGORY_ICONS.items():
        if keyword in name_lower:
            return icon
    return "🛒"


def process_items(client, store_ids: dict[str, str], items: list[dict]) -> int:
    saved = 0
    for item in items:
        try:
            product_id = db.get_or_create_product(
                client,
                name=item["name"],
                brand=item.get("brand"),
                category_slug=guess_category_icon(item["name"]),
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
    return saved


def main() -> None:
    client = db.get_client()
    store_ids = db.get_store_ids(client)
    log.info("Connected to Supabase. Stores: %s", list(store_ids.keys()))

    total = 0

    log.info("--- Billa ---")
    billa_items = billa.scrape(store_ids)
    total += process_items(client, store_ids, billa_items)

    log.info("--- Lidl ---")
    lidl_items = lidl.scrape(store_ids)
    total += process_items(client, store_ids, lidl_items)

    log.info("Done. Upserted %d price rows.", total)
    if total == 0:
        log.warning(
            "No prices were saved. The store sites may have changed their HTML structure.\n"
            "Update the CSS selectors in billa.py / lidl.py and re-run."
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
