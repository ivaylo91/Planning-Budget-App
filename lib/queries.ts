import { supabase } from './supabase';
import type { ProductWithPrices, ShoppingList, ListItem, ScrapeRun } from '../types';

export async function searchProducts(query: string): Promise<ProductWithPrices[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      prices(
        *,
        store:stores(*)
      )
    `)
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(30);

  if (error) throw error;
  return (data ?? []).map(enrichProduct);
}

export async function getProductByBarcode(barcode: string): Promise<ProductWithPrices | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`*, category:categories(*), prices(*, store:stores(*))`)
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) throw error;
  return data ? enrichProduct(data) : null;
}

export async function getProductById(id: string): Promise<ProductWithPrices | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      prices(
        *,
        store:stores(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data ? enrichProduct(data) : null;
}

export async function getPromotions(): Promise<ProductWithPrices[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      prices!inner(
        *,
        store:stores(*)
      )
    `)
    .eq('prices.is_promotion', true)
    .order('name')
    .limit(50);

  if (error) throw error;
  return (data ?? []).map(enrichProduct);
}

export async function getActiveShoppingList(): Promise<ShoppingList | null> {
  const { data, error } = await supabase
    .from('shopping_lists')
    .select(`*, items:list_items(*, store:stores(*))`)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createShoppingList(name: string, budgetEur: number): Promise<ShoppingList> {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('shopping_lists').update({ is_active: false }).eq('is_active', true);

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({ name, budget_eur: budgetEur, is_active: true, user_id: user!.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addItemToList(
  listId: string,
  productName: string,
  priceAtAdd: number | null,
  productId?: string,
  storeId?: string
): Promise<ListItem> {
  const { data, error } = await supabase
    .from('list_items')
    .insert({
      list_id: listId,
      product_id: productId ?? null,
      store_id: storeId ?? null,
      product_name: productName,
      price_at_add: priceAtAdd,
      quantity: 1,
      is_checked: false,
    })
    .select('*, store:stores(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function toggleItemChecked(itemId: string, isChecked: boolean): Promise<void> {
  const { error } = await supabase
    .from('list_items')
    .update({ is_checked: isChecked })
    .eq('id', itemId);

  if (error) throw error;
}

export async function removeItemFromList(itemId: string): Promise<void> {
  const { error } = await supabase.from('list_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function updateBudget(listId: string, budgetEur: number): Promise<void> {
  const { error } = await supabase
    .from('shopping_lists')
    .update({ budget_eur: budgetEur })
    .eq('id', listId);

  if (error) throw error;
}

export async function updateItemQuantity(itemId: string, quantity: number): Promise<void> {
  const { error } = await supabase
    .from('list_items')
    .update({ quantity })
    .eq('id', itemId);

  if (error) throw error;
}

export async function getShoppingLists(): Promise<ShoppingList[]> {
  const { data, error } = await supabase
    .from('shopping_lists')
    .select(`*, items:list_items(*, store:stores(*))`)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return data ?? [];
}

export async function setActiveList(listId: string): Promise<void> {
  await supabase.from('shopping_lists').update({ is_active: false }).neq('id', listId);
  const { error } = await supabase
    .from('shopping_lists')
    .update({ is_active: true })
    .eq('id', listId);

  if (error) throw error;
}

export async function getScrapeRuns(limit = 40): Promise<ScrapeRun[]> {
  const { data, error } = await supabase
    .from('scrape_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getWatchlist(): Promise<ProductWithPrices[]> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('watchlist')
    .select(`product:products(*, category:categories(*), prices(*, store:stores(*)))`)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row: any) => enrichProduct(row.product)).filter(Boolean);
}

export async function isInWatchlist(productId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase
    .from('watchlist')
    .select('id')
    .eq('user_id', user!.id)
    .eq('product_id', productId)
    .maybeSingle();

  return !!data;
}

export async function addToWatchlist(productId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('watchlist')
    .insert({ user_id: user!.id, product_id: productId });

  if (error) throw error;
}

export async function removeFromWatchlist(productId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', user!.id)
    .eq('product_id', productId);

  if (error) throw error;
}

function enrichProduct(product: any): ProductWithPrices {
  const prices = product.prices ?? [];
  const activePrices = prices.map((p: any) => ({
    ...p,
    effectivePrice: p.is_promotion && p.promo_price ? p.promo_price : p.price,
  }));

  const sorted = [...activePrices].sort((a, b) => a.effectivePrice - b.effectivePrice);
  const cheapest = sorted[0];

  return {
    ...product,
    prices: activePrices,
    cheapest_store: cheapest?.store,
    cheapest_price: cheapest?.effectivePrice,
  };
}
