"""
Billa Bulgaria promotions scraper.

Billa publishes weekly promotions at:
  https://www.billa.bg/promotions

The page is server-rendered HTML. Each promo card has:
  .product-tile  ->  .product-tile__title, .product-tile__brand
  .price-tag--promotion  ->  .price-tag__integer + .price-tag__decimal (промо цена)
  .price-tag--old         ->  original price
  [data-promo-end]        ->  promotion end date (ISO string)

Adjust CSS selectors below if the site structure changes.
"""
import re
import logging
from datetime import datetime, timedelta

import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

log = logging.getLogger(__name__)

BILLA_URL = "https://www.billa.bg/promotions"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "bg,en;q=0.9",
}


def _parse_price(text: str) -> float | None:
    cleaned = re.sub(r"[^\d,.]", "", text).replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _default_promo_end() -> str:
    """If no end date is found, assume end of current week (Sunday)."""
    today = datetime.today()
    days_ahead = 6 - today.weekday()
    return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")


def scrape(store_ids: dict[str, str]) -> list[dict]:
    """Return list of price dicts ready for db.upsert_price."""
    store_id = store_ids.get("billa")
    if not store_id:
        log.warning("Billa store id not found in DB — skipping")
        return []

    try:
        resp = requests.get(BILLA_URL, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as exc:
        log.error("Billa fetch failed: %s", exc)
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    tiles = soup.select(".product-tile")
    log.info("Billa: found %d product tiles", len(tiles))

    results = []
    for tile in tiles:
        try:
            name_el = tile.select_one(".product-tile__title")
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            brand_el = tile.select_one(".product-tile__brand")
            brand = brand_el.get_text(strip=True) if brand_el else None

            promo_tag = tile.select_one(".price-tag--promotion")
            old_tag = tile.select_one(".price-tag--old")

            if promo_tag:
                promo_int = promo_tag.select_one(".price-tag__integer")
                promo_dec = promo_tag.select_one(".price-tag__decimal")
                promo_str = (promo_int.get_text(strip=True) if promo_int else "0") + \
                            "." + (promo_dec.get_text(strip=True).lstrip(".") if promo_dec else "00")
                promo_price = _parse_price(promo_str)
                regular_price = _parse_price(old_tag.get_text()) if old_tag else promo_price
                is_promo = True
            else:
                reg_tag = tile.select_one(".price-tag")
                regular_price = _parse_price(reg_tag.get_text()) if reg_tag else None
                promo_price = None
                is_promo = False

            if not regular_price:
                continue

            end_attr = tile.get("data-promo-end") or tile.select_one("[data-promo-end]")
            if isinstance(end_attr, str) and end_attr:
                try:
                    promo_end = dateparser.parse(end_attr).strftime("%Y-%m-%d")
                except Exception:
                    promo_end = _default_promo_end()
            else:
                promo_end = _default_promo_end() if is_promo else None

            unit_el = tile.select_one(".product-tile__unit, .price-tag__unit")
            unit = unit_el.get_text(strip=True) if unit_el else "бр."

            results.append({
                "name": name,
                "brand": brand,
                "unit": unit,
                "store_id": store_id,
                "price": regular_price,
                "is_promotion": is_promo,
                "promo_price": promo_price,
                "promo_end_date": promo_end,
            })
        except Exception as exc:
            log.debug("Billa tile parse error: %s", exc)

    log.info("Billa: parsed %d products", len(results))
    return results
