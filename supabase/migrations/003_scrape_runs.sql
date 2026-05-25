-- Track scraper execution history for monitoring and debugging
create table if not exists scrape_runs (
  id           uuid primary key default gen_random_uuid(),
  store_slug   text not null,
  status       text not null default 'running',  -- running | success | partial | empty | error
  products_upserted integer default 0,
  error_message text,
  started_at   timestamptz default now(),
  finished_at  timestamptz
);

create index if not exists scrape_runs_store_idx    on scrape_runs(store_slug);
create index if not exists scrape_runs_started_idx  on scrape_runs(started_at desc);
create index if not exists scrape_runs_status_idx   on scrape_runs(status);

-- RLS: service role can write; anon can read (for potential monitoring UI)
alter table scrape_runs enable row level security;

create policy "anon can read scrape_runs"
  on scrape_runs for select to anon using (true);

create policy "service can all scrape_runs"
  on scrape_runs for all to service_role using (true);

-- View: latest run per store (useful for monitoring)
create or replace view latest_scrape_runs as
select distinct on (store_slug)
  id, store_slug, status, products_upserted, error_message, started_at, finished_at,
  extract(epoch from (finished_at - started_at))::int as duration_seconds
from scrape_runs
order by store_slug, started_at desc;
