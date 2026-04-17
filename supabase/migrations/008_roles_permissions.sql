-- Dynamic role-based permissions (manager, sales, viewer).
-- Manager UI edits Sales role permissions via role_permissions.

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  allowed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

insert into public.roles (key, name)
values
  ('manager', 'Manager'),
  ('sales', 'Sales'),
  ('viewer', 'Viewer')
on conflict (key) do nothing;

insert into public.permissions (key, description)
values
  ('view_customers', 'See customers list and details'),
  ('add_customers', 'Create and update customers'),
  ('create_orders', 'Create new orders/sales'),
  ('edit_orders', 'Edit and delete orders/sales'),
  ('view_products', 'See products list'),
  ('manage_products', 'Create, edit, and delete products'),
  ('view_dashboard', 'See dashboard'),
  ('view_purchases', 'See purchases')
on conflict (key) do nothing;

-- Seed Sales defaults if missing (do not override manager edits).
insert into public.role_permissions (role_id, permission_id, allowed)
select
  r.id,
  p.id,
  case
    when p.key = 'manage_products' then false
    else true
  end
from public.roles r
join public.permissions p on true
where r.key = 'sales'
  and not exists (
    select 1
    from public.role_permissions rp
    where rp.role_id = r.id
      and rp.permission_id = p.id
  );

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

drop policy if exists "roles_demo_all" on public.roles;
create policy "roles_demo_all"
  on public.roles
  for all
  using (true)
  with check (true);

drop policy if exists "permissions_demo_all" on public.permissions;
create policy "permissions_demo_all"
  on public.permissions
  for all
  using (true)
  with check (true);

drop policy if exists "role_permissions_demo_all" on public.role_permissions;
create policy "role_permissions_demo_all"
  on public.role_permissions
  for all
  using (true)
  with check (true);
