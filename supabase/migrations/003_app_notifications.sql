-- In-app notifications (low stock, etc.)

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
