-- Enable Row Level Security on all tables
alter table stores          enable row level security;
alter table categories      enable row level security;
alter table products        enable row level security;
alter table prices          enable row level security;
alter table shopping_lists  enable row level security;
alter table list_items      enable row level security;

-- Public read-only tables (catalog data)
create policy "anon can read stores"
  on stores for select to anon using (true);

create policy "anon can read categories"
  on categories for select to anon using (true);

create policy "anon can read products"
  on products for select to anon using (true);

create policy "anon can read prices"
  on prices for select to anon using (true);

-- Shopping lists — anon can do everything (no user auth in this app)
create policy "anon can read shopping_lists"
  on shopping_lists for select to anon using (true);

create policy "anon can insert shopping_lists"
  on shopping_lists for insert to anon with check (true);

create policy "anon can update shopping_lists"
  on shopping_lists for update to anon using (true);

-- List items — anon can do everything
create policy "anon can read list_items"
  on list_items for select to anon using (true);

create policy "anon can insert list_items"
  on list_items for insert to anon with check (true);

create policy "anon can update list_items"
  on list_items for update to anon using (true);

create policy "anon can delete list_items"
  on list_items for delete to anon using (true);
