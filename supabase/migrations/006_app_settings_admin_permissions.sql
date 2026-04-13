-- Shared admin module toggles (used by all signed-in users when Supabase is configured).

create table if not exists public.app_settings (
  id smallint primary key default 1,
  admin_permissions jsonb not null default '{"dashboard":true,"products":true,"production":true,"sales":true,"purchases":true,"reports":true,"customers":true,"settings":true}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

insert into public.app_settings (id, admin_permissions)
values (
  1,
  '{"dashboard":true,"products":true,"production":true,"sales":true,"purchases":true,"reports":true,"customers":true,"settings":true}'::jsonb
)
on conflict (id) do nothing;

create index if not exists app_settings_updated_idx on public.app_settings (updated_at desc);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_demo_all" on public.app_settings;
create policy "app_settings_demo_all"
  on public.app_settings
  for all
  using (true)
  with check (true);
