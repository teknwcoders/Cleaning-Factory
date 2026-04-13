-- Run this in Supabase → SQL Editor (once) to sync dashboard data from the app.
-- Demo policy: anonymous clients can read/write row id = 1.
-- For production: remove public policies and use Supabase Auth + RLS per user.

create table if not exists public.factory_app_state (
  id smallint primary key default 1,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint factory_app_state_single_row check (id = 1)
);

alter table public.factory_app_state enable row level security;

-- Replace this policy with auth-scoped rules when you add real users.
create policy "factory_app_state_anon_demo_all"
  on public.factory_app_state
  for all
  using (true)
  with check (true);

insert into public.factory_app_state (id, payload)
values (1, '{}'::jsonb)
on conflict (id) do nothing;
