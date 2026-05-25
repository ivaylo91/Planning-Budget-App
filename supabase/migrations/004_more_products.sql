-- Expanded product catalog: adds 44 common Bulgarian grocery items.
-- Requires: 001_initial_schema.sql (stores + categories already seeded).

-- ── Step 1: insert products ───────────────────────────────────────────────
insert into products (name, brand, category_id, unit)
select v.name, v.brand, c.id, v.unit
from (values
  -- Мляко и млечни
  ('Кисело мляко 400г',               'Данон',           'Мляко и млечни',      'бр.'),
  ('Яйца L 10 бр.',                   null,              'Мляко и млечни',      'бр.'),
  ('Сирене бяло 400г',                'Родопея',         'Мляко и млечни',      'бр.'),
  ('Извара 250г',                     'Верея',           'Мляко и млечни',      'бр.'),
  ('Сметана 200мл',                   'Данон',           'Мляко и млечни',      'бр.'),
  -- Месо и колбаси
  ('Пилешки гърди',                   null,              'Месо и колбаси',      'кг'),
  ('Свинско бон филе',                null,              'Месо и колбаси',      'кг'),
  ('Наденица пилешка',                'Стара Загора',    'Месо и колбаси',      'бр.'),
  ('Кренвирши',                       'Стара Загора',    'Месо и колбаси',      'бр.'),
  ('Сьомга филе',                     null,              'Месо и колбаси',      'кг'),
  ('Скариди замразени',               null,              'Месо и колбаси',      'кг'),
  -- Плодове и зеленчуци
  ('Портокали',                       null,              'Плодове и зеленчуци', 'кг'),
  ('Банани',                          null,              'Плодове и зеленчуци', 'кг'),
  ('Моркови',                         null,              'Плодове и зеленчуци', 'кг'),
  ('Картофи',                         null,              'Плодове и зеленчуци', 'кг'),
  ('Зеле бяло',                       null,              'Плодове и зеленчуци', 'кг'),
  ('Чушки червени',                   null,              'Плодове и зеленчуци', 'кг'),
  ('Лимони',                          null,              'Плодове и зеленчуци', 'кг'),
  -- Хляб и хлебни
  ('Питка бяла',                      null,              'Хляб и хлебни',       'бр.'),
  ('Кроасан',                         null,              'Хляб и хлебни',       'бр.'),
  ('Франзела',                        null,              'Хляб и хлебни',       'бр.'),
  -- Напитки
  ('Сок портокал 1л',                 'Cappy',           'Напитки',             'бр.'),
  ('Минерална вода 0.5л',             'Горна Баня',      'Напитки',             'бр.'),
  ('Бира Каменица 0.5л',              'Каменица',        'Напитки',             'бр.'),
  ('Нектар праскова 1л',              'Я',               'Напитки',             'бр.'),
  -- Почистващи
  ('Омекотител Lenor 1л',             'Lenor',           'Почистващи',          'бр.'),
  ('Препарат за съдове Fairy 500мл',  'Fairy',           'Почистващи',          'бр.'),
  ('Тоалетна хартия Zewa 8бр.',       'Zewa',            'Почистващи',          'бр.'),
  ('Торбички за боклук 10бр.',        null,              'Почистващи',          'бр.'),
  -- Замразени
  ('Пържени картофи 1кг',             'McCain',          'Замразени',           'бр.'),
  ('Кюфтета замразени',               null,              'Замразени',           'бр.'),
  ('Зеленчуков микс замразен',        null,              'Замразени',           'бр.'),
  -- Консерви
  ('Леща консерва 400г',              null,              'Консерви',            'бр.'),
  ('Нахут консерва 400г',             null,              'Консерви',            'бр.'),
  ('Царевица консерва 340г',          null,              'Консерви',            'бр.'),
  ('Грах консерва 400г',              null,              'Консерви',            'бр.'),
  -- Снаксове
  ('Чипс Lay''s 200г',                'Lay''s',          'Снаксове',            'бр.'),
  ('Шоколад Milka 100г',              'Milka',           'Снаксове',            'бр.'),
  ('Вафли Oreo',                      'Oreo',            'Снаксове',            'бр.'),
  ('Бисквити Digestive 400г',         'McVitie''s',      'Снаксове',            'бр.'),
  ('Мюсли 500г',                      null,              'Снаксове',            'бр.'),
  -- Хигиена
  ('Шампоан Head&Shoulders 400мл',    'Head&Shoulders',  'Хигиена',             'бр.'),
  ('Паста за зъби Colgate 75мл',      'Colgate',         'Хигиена',             'бр.'),
  ('Сапун Dove 100г',                 'Dove',            'Хигиена',             'бр.'),
  ('Дезодорант Rexona 150мл',         'Rexona',          'Хигиена',             'бр.')
) as v(name, brand, cat_name, unit)
join categories c on c.name = v.cat_name
where not exists (select 1 from products p where p.name = v.name);

-- ── Step 2: insert prices (5 stores × 44 products = 220 rows) ────────────
with
  store_map   as (select slug, id from stores),
  product_map as (select name, id from products),
  raw as (select * from (values
    -- Кисело мляко 400г
    ('Кисело мляко 400г',              'billa',      2.89, false, null::decimal, null::date),
    ('Кисело мляко 400г',              'lidl',       2.59, true,  2.29,          '2026-06-01'::date),
    ('Кисело мляко 400г',              'kaufland',   2.75, false, null,          null),
    ('Кисело мляко 400г',              'metro',      2.50, false, null,          null),
    ('Кисело мляко 400г',              'fantastico', 2.85, false, null,          null),
    -- Яйца L 10 бр.
    ('Яйца L 10 бр.',                  'billa',      4.99, false, null,          null),
    ('Яйца L 10 бр.',                  'lidl',       4.59, true,  3.99,          '2026-06-07'::date),
    ('Яйца L 10 бр.',                  'kaufland',   4.79, false, null,          null),
    ('Яйца L 10 бр.',                  'metro',      4.39, false, null,          null),
    ('Яйца L 10 бр.',                  'fantastico', 4.89, false, null,          null),
    -- Сирене бяло 400г
    ('Сирене бяло 400г',               'billa',      5.99, true,  4.99,          '2026-06-01'::date),
    ('Сирене бяло 400г',               'lidl',       5.49, false, null,          null),
    ('Сирене бяло 400г',               'kaufland',   5.79, false, null,          null),
    ('Сирене бяло 400г',               'metro',      4.90, false, null,          null),
    ('Сирене бяло 400г',               'fantastico', 5.89, false, null,          null),
    -- Извара 250г
    ('Извара 250г',                    'billa',      2.99, false, null,          null),
    ('Извара 250г',                    'lidl',       2.69, false, null,          null),
    ('Извара 250г',                    'kaufland',   2.79, true,  2.39,          '2026-05-31'::date),
    ('Извара 250г',                    'metro',      2.49, false, null,          null),
    ('Извара 250г',                    'fantastico', 2.95, false, null,          null),
    -- Сметана 200мл
    ('Сметана 200мл',                  'billa',      2.69, false, null,          null),
    ('Сметана 200мл',                  'lidl',       2.49, false, null,          null),
    ('Сметана 200мл',                  'kaufland',   2.59, false, null,          null),
    ('Сметана 200мл',                  'metro',      2.30, false, null,          null),
    ('Сметана 200мл',                  'fantastico', 2.65, false, null,          null),
    -- Пилешки гърди
    ('Пилешки гърди',                  'billa',      8.99, true,  7.49,          '2026-06-01'::date),
    ('Пилешки гърди',                  'lidl',       8.49, false, null,          null),
    ('Пилешки гърди',                  'kaufland',   8.79, false, null,          null),
    ('Пилешки гърди',                  'metro',      7.90, false, null,          null),
    ('Пилешки гърди',                  'fantastico', 9.19, false, null,          null),
    -- Свинско бон филе
    ('Свинско бон филе',               'billa',      17.99, false, null,         null),
    ('Свинско бон филе',               'lidl',       16.99, true,  14.99,        '2026-06-07'::date),
    ('Свинско бон филе',               'kaufland',   17.49, false, null,         null),
    ('Свинско бон филе',               'metro',      15.80, false, null,         null),
    ('Свинско бон филе',               'fantastico', 18.50, false, null,         null),
    -- Наденица пилешка
    ('Наденица пилешка',               'billa',      4.49, false, null,          null),
    ('Наденица пилешка',               'lidl',       3.99, false, null,          null),
    ('Наденица пилешка',               'kaufland',   4.29, true,  3.59,          '2026-05-31'::date),
    ('Наденица пилешка',               'metro',      3.80, false, null,          null),
    ('Наденица пилешка',               'fantastico', 4.59, false, null,          null),
    -- Кренвирши
    ('Кренвирши',                      'billa',      4.99, false, null,          null),
    ('Кренвирши',                      'lidl',       4.49, true,  3.79,          '2026-06-01'::date),
    ('Кренвирши',                      'kaufland',   4.79, false, null,          null),
    ('Кренвирши',                      'metro',      4.20, false, null,          null),
    ('Кренвирши',                      'fantastico', 5.09, false, null,          null),
    -- Сьомга филе
    ('Сьомга филе',                    'billa',      32.99, true,  27.99,        '2026-06-01'::date),
    ('Сьомга филе',                    'lidl',       29.99, false, null,         null),
    ('Сьомга филе',                    'kaufland',   31.49, false, null,         null),
    ('Сьомга филе',                    'metro',      27.50, false, null,         null),
    ('Сьомга филе',                    'fantastico', 33.50, false, null,         null),
    -- Скариди замразени
    ('Скариди замразени',              'billa',      19.99, true,  16.99,        '2026-06-07'::date),
    ('Скариди замразени',              'lidl',       17.99, false, null,         null),
    ('Скариди замразени',              'kaufland',   18.99, false, null,         null),
    ('Скариди замразени',              'metro',      16.50, false, null,         null),
    ('Скариди замразени',              'fantastico', 20.50, false, null,         null),
    -- Портокали
    ('Портокали',                      'billa',      2.99, false, null,          null),
    ('Портокали',                      'lidl',       2.49, true,  1.99,          '2026-06-01'::date),
    ('Портокали',                      'kaufland',   2.79, false, null,          null),
    ('Портокали',                      'metro',      2.29, false, null,          null),
    ('Портокали',                      'fantastico', 2.89, false, null,          null),
    -- Банани
    ('Банани',                         'billa',      2.29, false, null,          null),
    ('Банани',                         'lidl',       1.99, false, null,          null),
    ('Банани',                         'kaufland',   2.09, true,  1.79,          '2026-05-31'::date),
    ('Банани',                         'metro',      1.89, false, null,          null),
    ('Банани',                         'fantastico', 2.19, false, null,          null),
    -- Моркови
    ('Моркови',                        'billa',      1.99, false, null,          null),
    ('Моркови',                        'lidl',       1.69, false, null,          null),
    ('Моркови',                        'kaufland',   1.79, false, null,          null),
    ('Моркови',                        'metro',      1.49, false, null,          null),
    ('Моркови',                        'fantastico', 1.89, true,  1.49,          '2026-05-31'::date),
    -- Картофи
    ('Картофи',                        'billa',      1.89, false, null,          null),
    ('Картофи',                        'lidl',       1.59, false, null,          null),
    ('Картофи',                        'kaufland',   1.69, true,  1.39,          '2026-06-01'::date),
    ('Картофи',                        'metro',      1.45, false, null,          null),
    ('Картофи',                        'fantastico', 1.85, false, null,          null),
    -- Зеле бяло
    ('Зеле бяло',                      'billa',      1.49, false, null,          null),
    ('Зеле бяло',                      'lidl',       1.19, false, null,          null),
    ('Зеле бяло',                      'kaufland',   1.29, false, null,          null),
    ('Зеле бяло',                      'metro',      1.09, false, null,          null),
    ('Зеле бяло',                      'fantastico', 1.45, false, null,          null),
    -- Чушки червени
    ('Чушки червени',                  'billa',      4.99, false, null,          null),
    ('Чушки червени',                  'lidl',       4.29, true,  3.49,          '2026-06-01'::date),
    ('Чушки червени',                  'kaufland',   4.49, false, null,          null),
    ('Чушки червени',                  'metro',      3.90, false, null,          null),
    ('Чушки червени',                  'fantastico', 4.79, false, null,          null),
    -- Лимони
    ('Лимони',                         'billa',      3.49, false, null,          null),
    ('Лимони',                         'lidl',       2.99, false, null,          null),
    ('Лимони',                         'kaufland',   3.19, true,  2.69,          '2026-05-31'::date),
    ('Лимони',                         'metro',      2.79, false, null,          null),
    ('Лимони',                         'fantastico', 3.39, false, null,          null),
    -- Питка бяла
    ('Питка бяла',                     'billa',      1.29, false, null,          null),
    ('Питка бяла',                     'lidl',       1.09, false, null,          null),
    ('Питка бяла',                     'kaufland',   1.19, false, null,          null),
    ('Питка бяла',                     'metro',      0.99, false, null,          null),
    ('Питка бяла',                     'fantastico', 1.25, true,  0.99,          '2026-05-31'::date),
    -- Кроасан
    ('Кроасан',                        'billa',      1.49, false, null,          null),
    ('Кроасан',                        'lidl',       1.19, true,  0.99,          '2026-06-07'::date),
    ('Кроасан',                        'kaufland',   1.39, false, null,          null),
    ('Кроасан',                        'metro',      1.10, false, null,          null),
    ('Кроасан',                        'fantastico', 1.45, false, null,          null),
    -- Франзела
    ('Франзела',                       'billa',      2.19, false, null,          null),
    ('Франзела',                       'lidl',       1.89, false, null,          null),
    ('Франзела',                       'kaufland',   1.99, true,  1.69,          '2026-06-01'::date),
    ('Франзела',                       'metro',      1.75, false, null,          null),
    ('Франзела',                       'fantastico', 2.09, false, null,          null),
    -- Сок портокал 1л
    ('Сок портокал 1л',                'billa',      4.49, true,  3.69,          '2026-06-01'::date),
    ('Сок портокал 1л',                'lidl',       3.99, false, null,          null),
    ('Сок портокал 1л',                'kaufland',   4.29, false, null,          null),
    ('Сок портокал 1л',                'metro',      3.75, false, null,          null),
    ('Сок портокал 1л',                'fantastico', 4.39, false, null,          null),
    -- Минерална вода 0.5л
    ('Минерална вода 0.5л',            'billa',      0.89, false, null,          null),
    ('Минерална вода 0.5л',            'lidl',       0.69, false, null,          null),
    ('Минерална вода 0.5л',            'kaufland',   0.79, true,  0.59,          '2026-06-07'::date),
    ('Минерална вода 0.5л',            'metro',      0.65, false, null,          null),
    ('Минерална вода 0.5л',            'fantastico', 0.85, false, null,          null),
    -- Бира Каменица 0.5л
    ('Бира Каменица 0.5л',             'billa',      2.19, false, null,          null),
    ('Бира Каменица 0.5л',             'lidl',       1.89, true,  1.59,          '2026-05-31'::date),
    ('Бира Каменица 0.5л',             'kaufland',   2.09, false, null,          null),
    ('Бира Каменица 0.5л',             'metro',      1.79, false, null,          null),
    ('Бира Каменица 0.5л',             'fantastico', 2.25, false, null,          null),
    -- Нектар праскова 1л
    ('Нектар праскова 1л',             'billa',      2.99, false, null,          null),
    ('Нектар праскова 1л',             'lidl',       2.59, true,  2.19,          '2026-06-01'::date),
    ('Нектар праскова 1л',             'kaufland',   2.79, false, null,          null),
    ('Нектар праскова 1л',             'metro',      2.45, false, null,          null),
    ('Нектар праскова 1л',             'fantastico', 2.89, false, null,          null),
    -- Омекотител Lenor 1л
    ('Омекотител Lenor 1л',            'billa',      10.99, true,  8.99,         '2026-06-01'::date),
    ('Омекотител Lenor 1л',            'lidl',        9.99, false, null,         null),
    ('Омекотител Lenor 1л',            'kaufland',   10.49, false, null,         null),
    ('Омекотител Lenor 1л',            'metro',       9.20, false, null,         null),
    ('Омекотител Lenor 1л',            'fantastico', 11.20, false, null,         null),
    -- Препарат за съдове Fairy 500мл
    ('Препарат за съдове Fairy 500мл', 'billa',       6.99, false, null,         null),
    ('Препарат за съдове Fairy 500мл', 'lidl',        6.29, true,  5.49,         '2026-06-07'::date),
    ('Препарат за съдове Fairy 500мл', 'kaufland',    6.79, false, null,         null),
    ('Препарат за съдове Fairy 500мл', 'metro',       5.90, false, null,         null),
    ('Препарат за съдове Fairy 500мл', 'fantastico',  7.09, false, null,         null),
    -- Тоалетна хартия Zewa 8бр.
    ('Тоалетна хартия Zewa 8бр.',      'billa',       7.99, true,  6.49,         '2026-06-01'::date),
    ('Тоалетна хартия Zewa 8бр.',      'lidl',        6.99, false, null,         null),
    ('Тоалетна хартия Zewa 8бр.',      'kaufland',    7.49, false, null,         null),
    ('Тоалетна хартия Zewa 8бр.',      'metro',       6.50, false, null,         null),
    ('Тоалетна хартия Zewa 8бр.',      'fantastico',  8.19, false, null,         null),
    -- Торбички за боклук 10бр.
    ('Торбички за боклук 10бр.',       'billa',       3.49, false, null,         null),
    ('Торбички за боклук 10бр.',       'lidl',        2.99, false, null,         null),
    ('Торбички за боклук 10бр.',       'kaufland',    3.19, true,  2.79,         '2026-05-31'::date),
    ('Торбички за боклук 10бр.',       'metro',       2.79, false, null,         null),
    ('Торбички за боклук 10бр.',       'fantastico',  3.59, false, null,         null),
    -- Пържени картофи 1кг
    ('Пържени картофи 1кг',            'billa',       5.49, true,  4.49,         '2026-06-07'::date),
    ('Пържени картофи 1кг',            'lidl',        4.99, false, null,         null),
    ('Пържени картофи 1кг',            'kaufland',    5.29, false, null,         null),
    ('Пържени картофи 1кг',            'metro',       4.60, false, null,         null),
    ('Пържени картофи 1кг',            'fantastico',  5.59, false, null,         null),
    -- Кюфтета замразени
    ('Кюфтета замразени',              'billa',       6.99, false, null,         null),
    ('Кюфтета замразени',              'lidl',        5.99, true,  5.29,         '2026-06-01'::date),
    ('Кюфтета замразени',              'kaufland',    6.49, false, null,         null),
    ('Кюфтета замразени',              'metro',       5.80, false, null,         null),
    ('Кюфтета замразени',              'fantastico',  7.09, false, null,         null),
    -- Зеленчуков микс замразен
    ('Зеленчуков микс замразен',       'billa',       3.99, false, null,         null),
    ('Зеленчуков микс замразен',       'lidl',        3.49, true,  2.99,         '2026-06-07'::date),
    ('Зеленчуков микс замразен',       'kaufland',    3.79, false, null,         null),
    ('Зеленчуков микс замразен',       'metro',       3.29, false, null,         null),
    ('Зеленчуков микс замразен',       'fantastico',  4.09, false, null,         null),
    -- Леща консерва 400г
    ('Леща консерва 400г',             'billa',       2.19, false, null,         null),
    ('Леща консерва 400г',             'lidl',        1.89, false, null,         null),
    ('Леща консерва 400г',             'kaufland',    1.99, true,  1.69,         '2026-05-31'::date),
    ('Леща консерва 400г',             'metro',       1.79, false, null,         null),
    ('Леща консерва 400г',             'fantastico',  2.25, false, null,         null),
    -- Нахут консерва 400г
    ('Нахут консерва 400г',            'billa',       2.49, false, null,         null),
    ('Нахут консерва 400г',            'lidl',        2.09, true,  1.79,         '2026-06-01'::date),
    ('Нахут консерва 400г',            'kaufland',    2.29, false, null,         null),
    ('Нахут консерва 400г',            'metro',       1.99, false, null,         null),
    ('Нахут консерва 400г',            'fantastico',  2.45, false, null,         null),
    -- Царевица консерва 340г
    ('Царевица консерва 340г',         'billa',       1.99, false, null,         null),
    ('Царевица консерва 340г',         'lidl',        1.69, true,  1.39,         '2026-06-07'::date),
    ('Царевица консерва 340г',         'kaufland',    1.79, false, null,         null),
    ('Царевица консерва 340г',         'metro',       1.59, false, null,         null),
    ('Царевица консерва 340г',         'fantastico',  1.99, false, null,         null),
    -- Грах консерва 400г
    ('Грах консерва 400г',             'billa',       1.99, false, null,         null),
    ('Грах консерва 400г',             'lidl',        1.69, false, null,         null),
    ('Грах консерва 400г',             'kaufland',    1.79, true,  1.49,         '2026-05-31'::date),
    ('Грах консерва 400г',             'metro',       1.55, false, null,         null),
    ('Грах консерва 400г',             'fantastico',  1.99, false, null,         null),
    -- Чипс Lay's 200г
    ('Чипс Lay''s 200г',               'billa',       5.49, true,  4.49,         '2026-06-01'::date),
    ('Чипс Lay''s 200г',               'lidl',        4.79, false, null,         null),
    ('Чипс Lay''s 200г',               'kaufland',    5.19, false, null,         null),
    ('Чипс Lay''s 200г',               'metro',       4.50, false, null,         null),
    ('Чипс Lay''s 200г',               'fantastico',  5.59, false, null,         null),
    -- Шоколад Milka 100г
    ('Шоколад Milka 100г',             'billa',       3.49, false, null,         null),
    ('Шоколад Milka 100г',             'lidl',        2.99, true,  2.49,         '2026-06-07'::date),
    ('Шоколад Milka 100г',             'kaufland',    3.29, false, null,         null),
    ('Шоколад Milka 100г',             'metro',       2.89, false, null,         null),
    ('Шоколад Milka 100г',             'fantastico',  3.45, false, null,         null),
    -- Вафли Oreo
    ('Вафли Oreo',                     'billa',       3.99, false, null,         null),
    ('Вафли Oreo',                     'lidl',        3.49, true,  2.99,         '2026-06-01'::date),
    ('Вафли Oreo',                     'kaufland',    3.79, false, null,         null),
    ('Вафли Oreo',                     'metro',       3.29, false, null,         null),
    ('Вафли Oreo',                     'fantastico',  3.99, false, null,         null),
    -- Бисквити Digestive 400г
    ('Бисквити Digestive 400г',        'billa',       4.49, false, null,         null),
    ('Бисквити Digestive 400г',        'lidl',        3.89, true,  3.29,         '2026-06-07'::date),
    ('Бисквити Digestive 400г',        'kaufland',    4.19, false, null,         null),
    ('Бисквити Digestive 400г',        'metro',       3.69, false, null,         null),
    ('Бисквити Digestive 400г',        'fantastico',  4.59, false, null,         null),
    -- Мюсли 500г
    ('Мюсли 500г',                     'billa',       7.99, true,  6.49,         '2026-06-01'::date),
    ('Мюсли 500г',                     'lidl',        6.99, false, null,         null),
    ('Мюсли 500г',                     'kaufland',    7.49, false, null,         null),
    ('Мюсли 500г',                     'metro',       6.50, false, null,         null),
    ('Мюсли 500г',                     'fantastico',  7.99, false, null,         null),
    -- Шампоан Head&Shoulders 400мл
    ('Шампоан Head&Shoulders 400мл',   'billa',      11.99, true,  9.99,         '2026-06-01'::date),
    ('Шампоан Head&Shoulders 400мл',   'lidl',       10.49, false, null,         null),
    ('Шампоан Head&Shoulders 400мл',   'kaufland',   11.29, false, null,         null),
    ('Шампоан Head&Shoulders 400мл',   'metro',       9.90, false, null,         null),
    ('Шампоан Head&Shoulders 400мл',   'fantastico', 12.20, false, null,         null),
    -- Паста за зъби Colgate 75мл
    ('Паста за зъби Colgate 75мл',     'billa',       4.29, false, null,         null),
    ('Паста за зъби Colgate 75мл',     'lidl',        3.79, true,  3.29,         '2026-06-07'::date),
    ('Паста за зъби Colgate 75мл',     'kaufland',    4.09, false, null,         null),
    ('Паста за зъби Colgate 75мл',     'metro',       3.59, false, null,         null),
    ('Паста за зъби Colgate 75мл',     'fantastico',  4.39, false, null,         null),
    -- Сапун Dove 100г
    ('Сапун Dove 100г',                'billa',       3.19, false, null,         null),
    ('Сапун Dove 100г',                'lidl',        2.79, false, null,         null),
    ('Сапун Dove 100г',                'kaufland',    2.99, true,  2.49,         '2026-05-31'::date),
    ('Сапун Dove 100г',                'metro',       2.60, false, null,         null),
    ('Сапун Dove 100г',                'fantastico',  3.25, false, null,         null),
    -- Дезодорант Rexona 150мл
    ('Дезодорант Rexona 150мл',        'billa',       7.49, true,  5.99,         '2026-06-01'::date),
    ('Дезодорант Rexona 150мл',        'lidl',        6.49, false, null,         null),
    ('Дезодорант Rexona 150мл',        'kaufland',    6.99, false, null,         null),
    ('Дезодорант Rexona 150мл',        'metro',       5.90, false, null,         null),
    ('Дезодорант Rexona 150мл',        'fantastico',  7.59, false, null,         null)
  ) as t(pname, sslug, price, is_promo, promo_price, promo_end)
)
insert into prices (product_id, store_id, price, is_promotion, promo_price, promo_end_date)
select
  pm.id,
  sm.id,
  r.price,
  r.is_promo,
  r.promo_price,
  r.promo_end
from raw r
join product_map pm on pm.name = r.pname
join store_map   sm on sm.slug = r.sslug
on conflict (product_id, store_id) do nothing;
