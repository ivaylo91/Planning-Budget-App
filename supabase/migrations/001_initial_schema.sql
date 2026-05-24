-- Магазини
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_color text not null,
  website text,
  created_at timestamptz default now()
);

-- Категории продукти
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null
);

-- Продукти
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  category_id uuid references categories(id),
  barcode text,
  image_url text,
  unit text default 'бр.',
  created_at timestamptz default now()
);

-- Цени по магазини
create table if not exists prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  store_id uuid references stores(id) on delete cascade,
  price decimal(10,2) not null,
  is_promotion boolean default false,
  promo_price decimal(10,2),
  promo_end_date date,
  updated_at timestamptz default now(),
  unique(product_id, store_id)
);

-- Списъци за пазаруване
create table if not exists shopping_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Моят списък',
  budget_eur decimal(10,2) not null default 50,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Елементи в списъка
create table if not exists list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references shopping_lists(id) on delete cascade,
  product_id uuid references products(id),
  store_id uuid references stores(id),
  product_name text not null,
  quantity integer default 1,
  price_at_add decimal(10,2),
  is_checked boolean default false,
  added_at timestamptz default now()
);

-- Indexes
create index if not exists prices_product_id_idx on prices(product_id);
create index if not exists prices_store_id_idx on prices(store_id);
create index if not exists list_items_list_id_idx on list_items(list_id);
create index if not exists products_name_idx on products(name);

-- Seed данни: Магазини
insert into stores (name, slug, logo_color, website) values
  ('Billa', 'billa', '#E30613', 'https://www.billa.bg'),
  ('Lidl', 'lidl', '#0050AA', 'https://www.lidl.bg'),
  ('Kaufland', 'kaufland', '#E40521', 'https://www.kaufland.bg'),
  ('Metro', 'metro', '#003882', 'https://www.metro.bg'),
  ('Fantastico', 'fantastico', '#FF6600', 'https://www.fantastico.bg')
on conflict (slug) do nothing;

-- Seed данни: Категории
insert into categories (name, icon) values
  ('Мляко и млечни', '🥛'),
  ('Месо и колбаси', '🥩'),
  ('Плодове и зеленчуци', '🥦'),
  ('Хляб и хлебни', '🍞'),
  ('Напитки', '🧃'),
  ('Почистващи', '🧹'),
  ('Замразени', '🧊'),
  ('Консерви', '🥫'),
  ('Снаксове', '🍪'),
  ('Хигиена', '🧴')
on conflict do nothing;

-- Seed данни: Примерни продукти
insert into products (name, brand, category_id, unit)
select v.name, v.brand, c.id, v.unit
from (values
  ('Прясно мляко 3.5%',          'Верея',        'Мляко и млечни',        'л'),
  ('Кашкавал Витоша',             'Млечна слава', 'Мляко и млечни',        'кг'),
  ('Масло 125г',                  'Президент',    'Мляко и млечни',        'бр.'),
  ('Пилешки бутчета',             null,           'Месо и колбаси',        'кг'),
  ('Кайма смесена',               null,           'Месо и колбаси',        'кг'),
  ('Шунка варена',                'Стара Загора', 'Месо и колбаси',        'кг'),
  ('Домати',                      null,           'Плодове и зеленчуци',   'кг'),
  ('Краставици',                  null,           'Плодове и зеленчуци',   'кг'),
  ('Ябълки Голдън',               null,           'Плодове и зеленчуци',   'кг'),
  ('Хляб Добруджа',               'Пекарна',      'Хляб и хлебни',         'бр.'),
  ('Вода Горна Баня 1.5л',        'Горна Баня',   'Напитки',               'бр.'),
  ('Coca-Cola 2л',                'Coca-Cola',    'Напитки',               'бр.'),
  ('Перилен препарат Ariel 3кг',  'Ariel',        'Почистващи',            'бр.'),
  ('Пица Маргарита',              'Dr. Oetker',   'Замразени',             'бр.'),
  ('Риба тон в масло',            'Rio Mare',     'Консерви',              'бр.')
) as v(name, brand, cat_name, unit)
join categories c on c.name = v.cat_name
where not exists (select 1 from products p where p.name = v.name);

-- Seed данни: Цени
do $$
declare
  v_billa      uuid := (select id from stores where slug='billa');
  v_lidl       uuid := (select id from stores where slug='lidl');
  v_kaufland   uuid := (select id from stores where slug='kaufland');
  v_metro      uuid := (select id from stores where slug='metro');
  v_fantastico uuid := (select id from stores where slug='fantastico');

  p_mlyako     uuid := (select id from products where name='Прясно мляко 3.5%');
  p_kashkaval  uuid := (select id from products where name='Кашкавал Витоша');
  p_maslo      uuid := (select id from products where name='Масло 125г');
  p_pile       uuid := (select id from products where name='Пилешки бутчета');
  p_kaima      uuid := (select id from products where name='Кайма смесена');
  p_shunka     uuid := (select id from products where name='Шунка варена');
  p_domati     uuid := (select id from products where name='Домати');
  p_krastavici uuid := (select id from products where name='Краставици');
  p_yabolki    uuid := (select id from products where name='Ябълки Голдън');
  p_hlyab      uuid := (select id from products where name='Хляб Добруджа');
  p_voda       uuid := (select id from products where name='Вода Горна Баня 1.5л');
  p_cola       uuid := (select id from products where name='Coca-Cola 2л');
  p_ariel      uuid := (select id from products where name='Перилен препарат Ariel 3кг');
  p_pica       uuid := (select id from products where name='Пица Маргарита');
  p_riba       uuid := (select id from products where name='Риба тон в масло');
begin
  insert into prices (product_id, store_id, price, is_promotion, promo_price, promo_end_date) values
    (p_mlyako, v_billa,      2.49, false, null,  null),
    (p_mlyako, v_lidl,       2.29, true,  1.99,  '2026-06-01'),
    (p_mlyako, v_kaufland,   2.39, false, null,  null),
    (p_mlyako, v_metro,      2.19, false, null,  null),
    (p_mlyako, v_fantastico, 2.45, false, null,  null),

    (p_kashkaval, v_billa,      18.99, true,  15.99, '2026-06-01'),
    (p_kashkaval, v_lidl,       17.49, false, null,  null),
    (p_kashkaval, v_kaufland,   16.99, false, null,  null),
    (p_kashkaval, v_metro,      15.50, false, null,  null),
    (p_kashkaval, v_fantastico, 18.50, true,  16.50, '2026-05-31'),

    (p_maslo, v_billa,      3.99, false, null, null),
    (p_maslo, v_lidl,       3.79, false, null, null),
    (p_maslo, v_kaufland,   3.89, true,  3.29, '2026-06-07'),
    (p_maslo, v_metro,      3.60, false, null, null),
    (p_maslo, v_fantastico, 3.95, false, null, null),

    (p_pile, v_billa,      5.99, false, null, null),
    (p_pile, v_lidl,       5.49, true,  4.99, '2026-06-01'),
    (p_pile, v_kaufland,   5.79, false, null, null),
    (p_pile, v_metro,      4.99, false, null, null),
    (p_pile, v_fantastico, 6.19, false, null, null),

    (p_kaima, v_billa,      9.99, false, null, null),
    (p_kaima, v_lidl,       9.49, false, null, null),
    (p_kaima, v_kaufland,   9.79, true,  8.99, '2026-05-31'),
    (p_kaima, v_metro,      8.90, false, null, null),
    (p_kaima, v_fantastico, 10.20, false, null, null),

    (p_shunka, v_billa,      14.99, true,  12.99, '2026-06-07'),
    (p_shunka, v_lidl,       13.99, false, null,  null),
    (p_shunka, v_kaufland,   14.50, false, null,  null),
    (p_shunka, v_metro,      12.80, false, null,  null),
    (p_shunka, v_fantastico, 15.20, false, null,  null),

    (p_domati, v_billa,      3.99, false, null, null),
    (p_domati, v_lidl,       3.49, false, null, null),
    (p_domati, v_kaufland,   3.29, true,  2.79, '2026-06-01'),
    (p_domati, v_metro,      2.99, false, null, null),
    (p_domati, v_fantastico, 3.79, false, null, null),

    (p_krastavici, v_billa,      2.49, false, null, null),
    (p_krastavici, v_lidl,       2.19, false, null, null),
    (p_krastavici, v_kaufland,   2.29, false, null, null),
    (p_krastavici, v_metro,      1.99, false, null, null),
    (p_krastavici, v_fantastico, 2.39, true,  1.99, '2026-05-31'),

    (p_yabolki, v_billa,      3.49, false, null, null),
    (p_yabolki, v_lidl,       2.99, true,  2.49, '2026-06-01'),
    (p_yabolki, v_kaufland,   3.19, false, null, null),
    (p_yabolki, v_metro,      2.79, false, null, null),
    (p_yabolki, v_fantastico, 3.39, false, null, null),

    (p_hlyab, v_billa,      1.89, false, null, null),
    (p_hlyab, v_lidl,       1.69, false, null, null),
    (p_hlyab, v_kaufland,   1.79, false, null, null),
    (p_hlyab, v_metro,      1.59, false, null, null),
    (p_hlyab, v_fantastico, 1.85, true,  1.59, '2026-05-31'),

    (p_voda, v_billa,      1.19, false, null, null),
    (p_voda, v_lidl,       0.99, false, null, null),
    (p_voda, v_kaufland,   1.09, true,  0.89, '2026-06-07'),
    (p_voda, v_metro,      0.89, false, null, null),
    (p_voda, v_fantastico, 1.15, false, null, null),

    (p_cola, v_billa,      3.99, false, null, null),
    (p_cola, v_lidl,       3.49, true,  2.99, '2026-06-01'),
    (p_cola, v_kaufland,   3.79, false, null, null),
    (p_cola, v_metro,      3.29, false, null, null),
    (p_cola, v_fantastico, 3.89, false, null, null),

    (p_ariel, v_billa,      19.99, true,  16.99, '2026-06-01'),
    (p_ariel, v_lidl,       18.99, false, null,  null),
    (p_ariel, v_kaufland,   19.49, false, null,  null),
    (p_ariel, v_metro,      17.50, false, null,  null),
    (p_ariel, v_fantastico, 20.49, false, null,  null),

    (p_pica, v_billa,      7.99, false, null, null),
    (p_pica, v_lidl,       6.99, true,  5.99, '2026-06-07'),
    (p_pica, v_kaufland,   7.49, false, null, null),
    (p_pica, v_metro,      6.80, false, null, null),
    (p_pica, v_fantastico, 7.99, false, null, null),

    (p_riba, v_billa,      3.49, false, null, null),
    (p_riba, v_lidl,       2.99, true,  2.49, '2026-05-31'),
    (p_riba, v_kaufland,   3.29, false, null, null),
    (p_riba, v_metro,      2.89, false, null, null),
    (p_riba, v_fantastico, 3.39, false, null, null)
  on conflict (product_id, store_id) do nothing;
end $$;

-- Default списък (само ако няма нито един)
insert into shopping_lists (name, budget_eur)
select 'Седмично пазаруване', 100
where not exists (select 1 from shopping_lists);
