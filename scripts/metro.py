"""
Metro Bulgaria promotions scraper.

Primary URL:
  https://www.metro.bg/promotii

Fallback URLs:
  https://www.metro.bg/offers
  https://www.metro.bg/

Known HTML structure (verify if selectors return 0 results):
  .m-article-item or .article-tile  -> product container
  .m-article-item__title            -> product name
  .m-article-item__description      -> description / brand
  .m-price                          -> price block
  .m-price__price                   -> current price text
  .m-price__old                     -> old price (if promotion)
  .m-article-item__validity         -> "до DD.MM.YYYY" validity

Metro's site may load products via XHR on some pages. If 0 results are
returned and the page HTML is minimal, the site is JS-rendered — in that
case check for an API endpoint at /api/products or similar.
"""
import re
import logging
from datetime import datetime, timedelta

import requests
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

URLS = [
    "https://www.metro.bg/promotii",
    "https://www.metro.bg/offers",
    "https://www.metro.bg/aktualni-predlozheniya",
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
            # Sanity check: if response body is very small it might be a
            # redirect or a JS-rendered shell
            if len(resp.content) < 5000:
                log.warning("Kaufland: response too small (%d bytes) at %s — likely JS-rendered", len(resp.content), url)
                continue
            log.info("Metro: fetched %d bytes from %s", len(resp.content), url)
            return resp.text
        except Exception as exc:
            log.warning("Metro: fetch failed for %s — %s", url, exc)
    return None


def _extract_tiles(soup: BeautifulSoup) -> list:
    for selector in [
        ".m-article-item",
        ".article-tile",
        ".article-item",
        ".product-item",
        ".product-card",
        ".m-product-tile",
        "article[class*='product']",
        "article[class*='article']",
        ".offer-item",
    ]:
        tiles = soup.select(selector)
        if tiles:
            log.info("Metro: found %d tiles with selector '%s'", len(tiles), selector)
            return tiles
    log.warning("Metro: no product tiles found — check selectors")
    return []


def _parse_tile(tile, store_id: str) -> dict | None:
    # Name
    name_el = tile.select_one(
        ".m-article-item__title, .article-tile__title, .product-item__title, "
        ".product-name, .article-name, h2, h3"
    )
    if not name_el:
        return None
    name = name_el.get_text(strip=True)
    if not name or len(name) < 2:
        return None

    # Brand / description
    brand_el = tile.select_one(
        ".m-article-item__description, .article-tile__description, "
        ".product-brand, .brand, .subtitle"
    )
    brand = brand_el.get_text(strip=True) if brand_el else None

    # Prices
    old_el = tile.select_one(
        ".m-price__old, .price-old, .price-before, .original-price, "
        "strike, del, s, .m-price--previous"
    )
    current_el = tile.select_one(
        ".m-price__price, .m-price .price, .current-price, .price-now, "
        ".price-highlight, .sale-price, .price-promo"
    )

    if not current_el:
        current_el = tile.select_one(".price, .m-price")

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
        ".m-article-item__validity, .validity, .valid-until, "
        "[class*='valid'], [class*='period'], [class*='date']"
    )
    if valid_el:
        promo_end = _parse_bg_date(valid_el.get_text()) or (_default_promo_end() if is_promo else None)
    else:
        promo_end = _default_promo_end() if is_promo else None

    # Unit
    unit_el = tile.select_one(".m-price__unit, .price-unit, .unit, .quantity-unit")
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
    store_id = store_ids.get("metro")
    if not store_id:
        log.warning("Metro store id not found in DB — skipping")
        return []

    html = _fetch_html()
    if not html:
        log.error("Metro: all fetch attempts failed")
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
            log.debug("Metro tile parse error: %s", exc)

    log.info("Metro: parsed %d products", len(results))
    return results
