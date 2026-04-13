-- Normalized tables for Cleaning Factory (products, customers, sales, purchases, production, reports).
-- Run in Supabase → SQL Editor after 001_factory_app_state.sql (order does not matter if 001 already ran).
--
-- SECURITY: Policies below allow anonymous read/write for local demo apps.
-- Replace with Supabase Auth + user-scoped RLS before production.

-- ---------------------------------------------------------------------------
-- customers (referenced by sales)
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  location text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_name_idx on public.customers (name);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  price numeric(14, 4) not null default 0,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);

-- ---------------------------------------------------------------------------
-- sales (order header) + sale_lines (line items)
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  sale_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists sales_customer_idx on public.sales (customer_id);
create index if not exists sales_sale_date_idx on public.sales (sale_date desc);

create table if not exists public.sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 4) not null check (unit_price >= 0)
);

create index if not exists sale_lines_sale_idx on public.sale_lines (sale_id);
create index if not exists sale_lines_product_idx on public.sale_lines (product_id);

-- ---------------------------------------------------------------------------
-- purchases (incoming stock)
-- ---------------------------------------------------------------------------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier text not null,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  cost numeric(14, 4) not null default 0 check (cost >= 0),
  purchase_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists purchases_product_idx on public.purchases (product_id);
create index if not exists purchases_date_idx on public.purchases (purchase_date desc);

-- ---------------------------------------------------------------------------
-- production (manufacturing output)
-- ---------------------------------------------------------------------------
create table if not exists public.production (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  production_date timestamptz not null default now(),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists production_product_idx on public.production (product_id);
create index if not exists production_date_idx on public.production (production_date desc);

-- ---------------------------------------------------------------------------
-- reports (saved report runs / exports metadata — app can store snapshots here)
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null
    check (report_type in ('sales', 'stock', 'profit', 'custom')),
  title text not null default 'Report',
  period_start date,
  period_end date,
  filters jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reports_type_idx on public.reports (report_type);
create index if not exists reports_created_idx on public.reports (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security (demo — open access)
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_lines enable row level security;
alter table public.purchases enable row level security;
alter table public.production enable row level security;
alter table public.reports enable row level security;

drop policy if exists "customers_demo_all" on public.customers;
create policy "customers_demo_all" on public.customers for all using (true) with check (true);

drop policy if exists "products_demo_all" on public.products;
create policy "products_demo_all" on public.products for all using (true) with check (true);

drop policy if exists "sales_demo_all" on public.sales;
create policy "sales_demo_all" on public.sales for all using (true) with check (true);

drop policy if exists "sale_lines_demo_all" on public.sale_lines;
create policy "sale_lines_demo_all" on public.sale_lines for all using (true) with check (true);

drop policy if exists "purchases_demo_all" on public.purchases;
create policy "purchases_demo_all" on public.purchases for all using (true) with check (true);

drop policy if exists "production_demo_all" on public.production;
create policy "production_demo_all" on public.production for all using (true) with check (true);

drop policy if exists "reports_demo_all" on public.reports;
create policy "reports_demo_all" on public.reports for all using (true) with check (true);
