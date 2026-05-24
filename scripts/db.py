"""Supabase helper — uses service role key so it bypasses RLS."""
import os
from supabase import create_client, Client

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


def get_or_create_product(client: Client, name: str, brand: str | None,
                           category_slug: str, unit: str) -> str:
    """Return product id, creating the row if it doesn't exist."""
    cat = client.table("categories").select("id").eq("icon", category_slug).maybe_single().execute()
    category_id = cat.data["id"] if cat.data else None

    existing = client.table("products").select("id").eq("name", name).maybe_single().execute()
    if existing.data:
        return existing.data["id"]

    row = client.table("products").insert({
        "name": name,
        "brand": brand,
        "category_id": category_id,
        "unit": unit,
    }).select("id").single().execute()
    return row.data["id"]


def upsert_price(client: Client, product_id: str, store_id: str,
                  price: float, is_promo: bool,
                  promo_price: float | None, promo_end: str | None) -> None:
    client.table("prices").upsert({
        "product_id": product_id,
        "store_id": store_id,
        "price": price,
        "is_promotion": is_promo,
        "promo_price": promo_price,
        "promo_end_date": promo_end,
        "updated_at": "now()",
    }, on_conflict="product_id,store_id").execute()
