-- Патч: RLS + права доступа для anon-ключа
-- Запустить в Supabase SQL Editor → New query → Run

-- 1. Пересоздать view с security_invoker (убирает ошибку SECURITY DEFINER)
drop view if exists flower_stock;
create view flower_stock with (security_invoker = true) as
select
  f.id as flower_id,
  f.name,
  coalesce(sum(case
    when m.movement_type = 'поставка' then m.quantity
    when m.movement_type in ('выдача', 'списание') then -m.quantity
    else 0
  end), 0) as total,
  coalesce(sum(case
    when m.movement_type = 'резерв' then m.quantity
    else 0
  end), 0) as reserved,
  coalesce(sum(case
    when m.movement_type = 'поставка' then m.quantity
    when m.movement_type in ('выдача', 'списание') then -m.quantity
    when m.movement_type = 'резерв' then -m.quantity
    else 0
  end), 0) as available
from flowers f
left join movements m on m.flower_id = f.id
group by f.id, f.name;

-- 2. Включить RLS на всех таблицах
alter table suppliers    enable row level security;
alter table flowers      enable row level security;
alter table batches      enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table defects      enable row level security;
alter table movements    enable row level security;

-- 3. Политики: полный доступ для anon (одиночное приложение без авторизации)
create policy "anon_all" on suppliers    for all to anon using (true) with check (true);
create policy "anon_all" on flowers      for all to anon using (true) with check (true);
create policy "anon_all" on batches      for all to anon using (true) with check (true);
create policy "anon_all" on orders       for all to anon using (true) with check (true);
create policy "anon_all" on order_items  for all to anon using (true) with check (true);
create policy "anon_all" on defects      for all to anon using (true) with check (true);
create policy "anon_all" on movements    for all to anon using (true) with check (true);

-- 4. Права на view
grant select on flower_stock to anon;
