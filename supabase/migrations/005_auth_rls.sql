-- Tie shopping lists to authenticated users and lock them down with RLS.
-- Run after 001_initial_schema.sql.

-- ── shopping_lists: add owner column ─────────────────────────────────────
alter table shopping_lists
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- ── Enable RLS ────────────────────────────────────────────────────────────
alter table shopping_lists enable row level security;
alter table list_items     enable row level security;

-- ── shopping_lists policies ───────────────────────────────────────────────
create policy "users select own lists"
  on shopping_lists for select using (auth.uid() = user_id);

create policy "users insert own lists"
  on shopping_lists for insert with check (auth.uid() = user_id);

create policy "users update own lists"
  on shopping_lists for update using (auth.uid() = user_id);

create policy "users delete own lists"
  on shopping_lists for delete using (auth.uid() = user_id);

-- ── list_items policies (scoped through parent list) ──────────────────────
create policy "users select own list items"
  on list_items for select
  using (exists (
    select 1 from shopping_lists sl
    where sl.id = list_items.list_id and sl.user_id = auth.uid()
  ));

create policy "users insert own list items"
  on list_items for insert
  with check (exists (
    select 1 from shopping_lists sl
    where sl.id = list_items.list_id and sl.user_id = auth.uid()
  ));

create policy "users update own list items"
  on list_items for update
  using (exists (
    select 1 from shopping_lists sl
    where sl.id = list_items.list_id and sl.user_id = auth.uid()
  ));

create policy "users delete own list items"
  on list_items for delete
  using (exists (
    select 1 from shopping_lists sl
    where sl.id = list_items.list_id and sl.user_id = auth.uid()
  ));

-- Note: products, prices, stores, categories are public read — no RLS needed.
