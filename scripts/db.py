"""Supabase helper — uses service role key so it bypasses RLS."""
import os
import logging
from datetime import datetime, timezone

from supabase import create_client, Client

log = logging.getLogger(__name__)

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        _client = create_client(url, key)
    return _client


def get_store_ids(client: Client) -> dict[str, str]:
    rows = client.table("stores").select("id, slug").execute().data
    return {r["slug"]: r["id"] for r in rows}


def get_or_create_product(
    client: Client,
    name: str,
    brand: str | None,
    category_icon: str,
    unit: str,
) -> str:
    """Return product id, creating the row if it doesn't exist."""
    cat = (
        client.table("categories")
        .select("id")
        .eq("icon", category_icon)
        .maybe_single()
        .execute()
    )
    category_id = cat.data["id"] if cat.data else None

    existing = (
        client.table("products")
        .select("id")
        .eq("name", name)
        .maybe_single()
        .execute()
    )
    if existing.data:
        return existing.data["id"]

    row = (
        client.table("products")
        .insert({"name": name, "brand": brand, "category_id": category_id, "unit": unit})
        .select("id")
        .single()
        .execute()
    )
    return row.data["id"]


def upsert_price(
    client: Client,
    product_id: str,
    store_id: str,
    price: float,
    is_promo: bool,
    promo_price: float | None,
    promo_end: str | None,
) -> None:
    client.table("prices").upsert(
        {
            "product_id": product_id,
            "store_id": store_id,
            "price": price,
            "is_promotion": is_promo,
            "promo_price": promo_price,
            "promo_end_date": promo_end,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="product_id,store_id",
    ).execute()


# ── Scrape run logging ──────────────────────────────────────────────────────

def start_scrape_run(client: Client, store_slug: str) -> str | None:
    """Insert a scrape_runs row and return its id (or None on error)."""
    try:
        row = (
            client.table("scrape_runs")
            .insert({"store_slug": store_slug, "status": "running"})
            .select("id")
            .single()
            .execute()
        )
        return row.data["id"]
    except Exception as exc:
        log.debug("Could not start scrape run log: %s", exc)
        return None


def finish_scrape_run(
    client: Client,
    run_id: str | None,
    status: str,
    products_upserted: int,
    error_message: str | None = None,
) -> None:
    """Update an existing scrape_runs row."""
    if not run_id:
        return
    try:
        client.table("scrape_runs").update(
            {
                "status": status,
                "products_upserted": products_upserted,
                "error_message": error_message,
                "finished_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", run_id).execute()
    except Exception as exc:
        log.debug("Could not finish scrape run log: %s", exc)
