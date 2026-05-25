"""
Kaufland Bulgaria promotions scraper.

Primary URL:
  https://www.kaufland.bg/aktualni-predlozheniya/vsichki-predlozheniya.html

Fallback URL:
  https://www.kaufland.bg/aktualni-predlozheniya/sedmichni-predlozheniya.html

Known HTML structure (verify if selectors return 0 results):
  .m-offer-tile               -> product tile container
  .m-offer-tile__name         -> product name (h2 or span)
  .m-offer-tile__description  -> brand / description
  .m-price__price             -> current / promo price
  .m-offer-tile__price--previous or .m-price--previous -> old price (if promo)
  .m-offer-tile__valid-date   -> "до DD.MM.YYYY" validity string

If the site has changed, open kaufland.bg in browser DevTools and search for
the product name text to identify the correct selector.
"""
import re
import logging
from datetime import datetime, timedelta

import requests
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

URLS = [
    "https://www.kaufland.bg/aktualni-predlozheniya/vsichki-predlozheniya.html",
    "https://www.kaufland.bg/aktualni-predlozheniya/sedmichni-predlozheniya.html",
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
    cleaned = re.sub(r"[^\d,.]", "", text.strip()).replace(",", ".")
    # Remove trailing/leading dots
    cleaned = cleaned.strip(".")
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
            log.info("Kaufland: fetched %d bytes from %s", len(resp.content), url)
            return resp.text
        except Exception as exc:
            log.warning("Kaufland: fetch failed for %s — %s", url, exc)
    return None


def _extract_tiles(soup: BeautifulSoup) -> list:
    """Try multiple selector patterns in order."""
    for selector in [
        ".m-offer-tile",
        ".product-tile",
        ".offer-tile",
        "article.product",
        ".c-product-card",
    ]:
        tiles = soup.select(selector)
        if tiles:
            log.info("Kaufland: found %d tiles with selector '%s'", len(tiles), selector)
            return tiles
    log.warning("Kaufland: no product tiles found — check selectors")
    return []


def _parse_tile(tile, store_id: str) -> dict | None:
    # Name
    name_el = tile.select_one(
        ".m-offer-tile__name, .product-tile__name, .offer-tile__name, "
        ".c-product-card__name, h2, h3"
    )
    if not name_el:
        return None
    name = name_el.get_text(strip=True)
    if not name or len(name) < 2:
        return None

    # Brand / description
    brand_el = tile.select_one(
        ".m-offer-tile__description, .product-tile__brand, "
        ".m-offer-tile__subtitle, .brand"
    )
    brand = brand_el.get_text(strip=True) if brand_el else None

    # Prices — promo + old
    promo_el = tile.select_one(
        ".m-price__price, .m-offer-tile__price, .price-highlight, "
        ".price-promo, .sale-price, .current-price"
    )
    old_el = tile.select_one(
        ".m-offer-tile__price--previous, .m-price--previous, "
        ".price-before, .price-old, .original-price, strike, del, s"
    )

    if not promo_el:
        # Try generic price
        promo_el = tile.select_one(".price, .m-price")

    if promo_el and old_el:
        promo_price = _parse_price(promo_el.get_text())
        regular_price = _parse_price(old_el.get_text())
        is_promo = True
        # Swap if old is actually lower (bad parse)
        if regular_price and promo_price and regular_price < promo_price:
            regular_price, promo_price = promo_price, regular_price
    elif promo_el:
        regular_price = _parse_price(promo_el.get_text())
        promo_price = None
        is_promo = False
    else:
        return None

    if not regular_price:
        return None

    # Validity / promo end date
    valid_el = tile.select_one(
        ".m-offer-tile__valid-date, .validity, .valid-until, "
        "[class*='valid'], [class*='date']"
    )
    if valid_el:
        promo_end = _parse_bg_date(valid_el.get_text()) or (_default_promo_end() if is_promo else None)
    else:
        promo_end = _default_promo_end() if is_promo else None

    # Unit
    unit_el = tile.select_one(".m-price__unit, .price-unit, .unit, .m-offer-tile__unit")
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
    store_id = store_ids.get("kaufland")
    if not store_id:
        log.warning("Kaufland store id not found in DB — skipping")
        return []

    html = _fetch_html()
    if not html:
        log.error("Kaufland: all fetch attempts failed")
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
            log.debug("Kaufland tile parse error: %s", exc)

    log.info("Kaufland: parsed %d products", len(results))
    return results
