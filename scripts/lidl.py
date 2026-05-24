"""
Lidl Bulgaria promotions scraper.

Lidl publishes weekly promotions at:
  https://www.lidl.bg/c/sedmichni-promotsii/a10011303

The page uses server-rendered HTML. Each product card has:
  .s-grid-item           -> container
  .s-grid-item__name     -> product name
  .m-price__top          -> promo price (top = sale)
  .m-price__bottom       -> original price (struck-through)
  .s-grid-item__validity -> promo validity text (e.g. "до 01.06.2026")

Adjust selectors if the site structure changes.
"""
import re
import logging
from datetime import datetime, timedelta

import requests
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

LIDL_URL = "https://www.lidl.bg/c/sedmichni-promotsii/a10011303"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "bg,en;q=0.9",
}

_DATE_RE = re.compile(r"(\d{1,2})\.(\d{1,2})\.(\d{4})")


def _parse_price(text: str) -> float | None:
    cleaned = re.sub(r"[^\d,.]", "", text).replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _parse_bg_date(text: str) -> str | None:
    m = _DATE_RE.search(text)
    if not m:
        return None
    day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return f"{year:04d}-{month:02d}-{day:02d}"


def _default_promo_end() -> str:
    today = datetime.today()
    days_ahead = 6 - today.weekday()
    return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")


def scrape(store_ids: dict[str, str]) -> list[dict]:
    """Return list of price dicts ready for db.upsert_price."""
    store_id = store_ids.get("lidl")
    if not store_id:
        log.warning("Lidl store id not found in DB — skipping")
        return []

    try:
        resp = requests.get(LIDL_URL, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as exc:
        log.error("Lidl fetch failed: %s", exc)
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    cards = soup.select(".s-grid-item")
    log.info("Lidl: found %d product cards", len(cards))

    results = []
    for card in cards:
        try:
            name_el = card.select_one(".s-grid-item__name, .product__title, h3")
            if not name_el:
                continue
            name = name_el.get_text(strip=True)

            promo_el = card.select_one(".m-price__top, .price--highlight, .price-promo")
            old_el = card.select_one(".m-price__bottom, .price--old, .price-original")
            reg_el = card.select_one(".m-price, .price")

            if promo_el and old_el:
                promo_price = _parse_price(promo_el.get_text())
                regular_price = _parse_price(old_el.get_text())
                is_promo = True
            elif reg_el:
                regular_price = _parse_price(reg_el.get_text())
                promo_price = None
                is_promo = False
            else:
                continue

            if not regular_price:
                continue

            validity_el = card.select_one(".s-grid-item__validity, .validity, [class*='valid']")
            if validity_el:
                promo_end = _parse_bg_date(validity_el.get_text()) or (_default_promo_end() if is_promo else None)
            else:
                promo_end = _default_promo_end() if is_promo else None

            unit_el = card.select_one(".s-grid-item__unit, .price__unit, .unit")
            unit = unit_el.get_text(strip=True) if unit_el else "бр."

            results.append({
                "name": name,
                "brand": None,
                "unit": unit,
                "store_id": store_id,
                "price": regular_price,
                "is_promotion": is_promo,
                "promo_price": promo_price,
                "promo_end_date": promo_end,
            })
        except Exception as exc:
            log.debug("Lidl card parse error: %s", exc)

    log.info("Lidl: parsed %d products", len(results))
    return results
