-- Customer orders (Orders page) — persisted like sales for multi-device sync.

create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null default '',
  location text not null default '',
  order_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists customer_orders_date_idx
  on public.customer_orders (order_date desc);

create table if not exists public.customer_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders (id) on delete cascade,
  sort_idx integer not null default 0,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 4)
);

create index if not exists customer_order_lines_order_idx
  on public.customer_order_lines (order_id);

alter table public.customer_orders enable row level security;
alter table public.customer_order_lines enable row level security;

drop policy if exists "customer_orders_demo_all" on public.customer_orders;
create policy "customer_orders_demo_all"
  on public.customer_orders for all using (true) with check (true);

drop policy if exists "customer_order_lines_demo_all" on public.customer_order_lines;
create policy "customer_order_lines_demo_all"
  on public.customer_order_lines for all using (true) with check (true);
