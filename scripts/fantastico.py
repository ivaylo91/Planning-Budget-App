"""
Fantastico Bulgaria promotions scraper.

Primary URL:
  https://fantastico.bg/promo/

Fallback URLs:
  https://fantastico.bg/promotions/
  https://fantastico.bg/sedmichni-promotsii/
  https://www.fantastico.bg/promo/

Known HTML structure (verify if selectors return 0 results):
  .product-card, .promo-product  -> product container
  .product-card__title           -> product name
  .product-card__brand           -> brand
  .product-card__price           -> current price
  .product-card__old-price       -> old price (if promotion)
  .product-card__date            -> "до DD.MM.YYYY" validity

If the site changes, look for elements wrapping both the product name and
price in the same container — that is the tile selector.
"""
import re
import logging
from datetime import datetime, timedelta

import requests
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

URLS = [
    "https://fantastico.bg/promo/",
    "https://fantastico.bg/promotions/",
    "https://fantastico.bg/sedmichni-promotsii/",
    "https://www.fantastico.bg/promo/",
]
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "bg,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

_DATE_RE = re.compile(r"(\d{1,2})\.(\d{1,2})\.(\d{4})")


def _parse_price(text: str) -> float | None:
    if not text:
        return None
    cleaned = re.sub(r"[^\d,.]", "", text.strip()).replace(",", ".").strip(".")
    try:
        val = float(cleaned)
        return val if val > 0 else None
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


def _fetch_html() -> str | None:
    for url in URLS:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=25)
            resp.raise_for_status()
            if len(resp.content) < 3000:
                log.warning("Fantastico: response too small at %s — skipping", url)
                continue
            log.info("Fantastico: fetched %d bytes from %s", len(resp.content), url)
            return resp.text
        except Exception as exc:
            log.warning("Fantastico: fetch failed for %s — %s", url, exc)
    return None


def _extract_tiles(soup: BeautifulSoup) -> list:
    for selector in [
        ".product-card",
        ".promo-product",
        ".promo-item",
        ".deal-card",
        ".promotion-item",
        ".product-item",
        "article[class*='product']",
        ".offer-card",
        ".catalogue-item",
        "li[class*='product']",
    ]:
        tiles = soup.select(selector)
        if tiles:
            log.info("Fantastico: found %d tiles with selector '%s'", len(tiles), selector)
            return tiles
    log.warning("Fantastico: no product tiles found — check selectors")
    return []


def _parse_tile(tile, store_id: str) -> dict | None:
    # Name
    name_el = tile.select_one(
        ".product-card__title, .product-name, .promo-item__name, "
        ".deal-card__title, h2, h3, [class*='title'], [class*='name']"
    )
    if not name_el:
        return None
    name = name_el.get_text(strip=True)
    if not name or len(name) < 2:
        return None

    # Brand
    brand_el = tile.select_one(
        ".product-card__brand, .brand, [class*='brand'], "
        ".product-manufacturer, .manufacturer"
    )
    brand = brand_el.get_text(strip=True) if brand_el else None

    # Old price first (before current to detect promo context)
    old_el = tile.select_one(
        ".product-card__old-price, .old-price, .price-old, .price-before, "
        ".original-price, strike, del, s, [class*='old'], [class*='before']"
    )
    current_el = tile.select_one(
        ".product-card__price, .sale-price, .promo-price, .price-now, "
        ".current-price, .price-highlight, [class*='promo'], [class*='sale']"
    )

    if not current_el:
        current_el = tile.select_one(".price, [class*='price']")

    if current_el and old_el:
        promo_price = _parse_price(current_el.get_text())
        regular_price = _parse_price(old_el.get_text())
        is_promo = True
        if regular_price and promo_price and regular_price < promo_price:
            regular_price, promo_price = promo_price, regular_price
    elif current_el:
        regular_price = _parse_price(current_el.get_text())
        promo_price = None
        is_promo = False
    else:
        return None

    if not regular_price:
        return None

    # Validity
    valid_el = tile.select_one(
        ".product-card__date, .validity, .valid-until, "
        "[class*='valid'], [class*='date'], [class*='period']"
    )
    if valid_el:
        promo_end = _parse_bg_date(valid_el.get_text()) or (_default_promo_end() if is_promo else None)
    else:
        promo_end = _default_promo_end() if is_promo else None

    # Unit
    unit_el = tile.select_one(
        ".product-card__unit, .price-unit, .unit, [class*='unit']"
    )
    unit = unit_el.get_text(strip=True) if unit_el else "бр."

    return {
        "name": name,
        "brand": brand if brand and brand != name else None,
        "unit": unit,
        "store_id": store_id,
        "price": regular_price,
        "is_promotion": is_promo,
        "promo_price": promo_price if is_promo else None,
        "promo_end_date": promo_end,
    }


def scrape(store_ids: dict[str, str]) -> list[dict]:
    """Return list of price dicts ready for db.upsert_price."""
    store_id = store_ids.get("fantastico")
    if not store_id:
        log.warning("Fantastico store id not found in DB — skipping")
        return []

    html = _fetch_html()
    if not html:
        log.error("Fantastico: all fetch attempts failed")
        return []

    soup = BeautifulSoup(html, "lxml")
    tiles = _extract_tiles(soup)

    results = []
    for tile in tiles:
        try:
            item = _parse_tile(tile, store_id)
            if item:
                results.append(item)
        except Exception as exc:
            log.debug("Fantastico tile parse error: %s", exc)

    log.info("Fantastico: parsed %d products", len(results))
    return results
