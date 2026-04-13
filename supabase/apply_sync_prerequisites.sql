-- Run this once in Supabase → SQL Editor if sync fails or RPC/table is missing.
-- Safe to re-run (idempotent where noted).

-- ---------------------------------------------------------------------------
-- 003: app_notifications (required by truncate_factory_domain + app sync)
-- ---------------------------------------------------------------------------
create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.app_notifications enable row level security;

drop policy if exists "app_notifications_demo_all" on public.app_notifications;
create policy "app_notifications_demo_all"
  on public.app_notifications
  for all
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 004: RPC used before full re-sync from the browser
-- DELETE ... WHERE true: environments that require a WHERE on DELETE (safety).
-- ---------------------------------------------------------------------------
create or replace function public.truncate_factory_domain()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.sale_lines where true;
  delete from public.sales where true;
  delete from public.purchases where true;
  delete from public.production where true;
  delete from public.app_notifications where true;
  delete from public.products where true;
  delete from public.customers where true;
end;
$$;

grant execute on function public.truncate_factory_domain() to anon;
grant execute on function public.truncate_factory_domain() to authenticated;

-- ---------------------------------------------------------------------------
-- 006: shared admin module toggles (optional — run if Admin access control
-- should apply to every browser, not only localStorage)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id smallint primary key default 1,
  admin_permissions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into public.app_settings (id, admin_permissions)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_demo_all" on public.app_settings;
create policy "app_settings_demo_all"
  on public.app_settings
  for all
  using (true)
  with check (true);
