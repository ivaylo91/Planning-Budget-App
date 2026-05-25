create table if not exists watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  product_id  uuid references products(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique(user_id, product_id)
);

alter table watchlist enable row level security;

create policy "users manage own watchlist"
  on watchlist for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
