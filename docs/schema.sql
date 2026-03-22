-- FloristApp — схема БД
-- Запустить в Supabase: SQL Editor → New query → вставить всё → Run

-- Поставщики
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  created_at timestamptz default now()
);

-- Цветы (справочник видов)
create table flowers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  low_stock_threshold int not null default 5,
  created_at timestamptz default now()
);

-- Партии (поставки)
create table batches (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id),
  flower_id uuid references flowers(id) not null,
  quantity int not null check (quantity >= 0),
  delivered_at date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

-- Заказы
create table orders (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text,
  delivery_type text not null check (delivery_type in ('самовывоз', 'доставка')),
  delivery_address text,
  ready_at date not null,
  status text not null default 'новый',
  created_at timestamptz default now()
);

-- Состав заказа
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  flower_id uuid references flowers(id) not null,
  quantity int not null check (quantity > 0)
);

-- Поставки (с отслеживанием статуса)
create table deliveries (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id),
  delivered_at date not null default current_date,
  status text not null default 'заказано' check (status in ('заказано', 'на складе')),
  has_issues boolean default false,
  created_at timestamptz default now()
);

-- Позиции поставки
create table delivery_items (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid references deliveries(id) on delete cascade not null,
  flower_id uuid references flowers(id) not null,
  quantity int not null check (quantity > 0),
  reception_status text check (reception_status in ('ok', 'брак', 'не_тот_заказ')),
  defect_qty int,
  comment text,
  batch_id uuid references batches(id)
);

-- Брак
create table defects (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references batches(id) not null,
  flower_id uuid references flowers(id) not null,
  quantity int not null check (quantity > 0),
  defect_type text not null check (defect_type in ('гнилой', 'не тот цвет')),
  resolution text not null check (resolution in ('возврат', 'скидка')),
  created_at timestamptz default now()
);

-- Лог движения
create table movements (
  id uuid primary key default gen_random_uuid(),
  flower_id uuid references flowers(id) not null,
  batch_id uuid references batches(id),
  order_id uuid references orders(id),
  defect_id uuid references defects(id),
  movement_type text not null check (movement_type in ('поставка', 'резерв', 'выдача', 'списание')),
  quantity int not null,
  created_at timestamptz default now()
);

-- View: остатки по цветку
create view flower_stock as
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
