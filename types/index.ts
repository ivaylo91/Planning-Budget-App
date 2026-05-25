export type Store = {
  id: string;
  name: string;
  slug: string;
  logo_color: string;
  website: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type Product = {
  id: string;
  name: string;
  brand: string | null;
  category_id: string;
  barcode: string | null;
  image_url: string | null;
  unit: string;
  category?: Category;
};

export type Price = {
  id: string;
  product_id: string;
  store_id: string;
  price: number;
  is_promotion: boolean;
  promo_price: number | null;
  promo_end_date: string | null;
  updated_at: string;
  store?: Store;
};

export type ProductWithPrices = Product & {
  prices: Price[];
  cheapest_store?: Store;
  cheapest_price?: number;
};

export type ShoppingList = {
  id: string;
  name: string;
  budget_eur: number;
  is_active: boolean;
  created_at: string;
  items?: ListItem[];
};

export type ScrapeRun = {
  id: string;
  store_slug: string;
  status: 'running' | 'success' | 'partial' | 'error' | 'empty';
  products_upserted: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

export type ListItem = {
  id: string;
  list_id: string;
  product_id: string | null;
  store_id: string | null;
  product_name: string;
  quantity: number;
  price_at_add: number | null;
  is_checked: boolean;
  added_at: string;
  store?: Store;
};
