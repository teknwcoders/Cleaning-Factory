-- App-level role source of truth for authenticated users.
-- Supports: manager, sales, viewer.

create table if not exists public.app_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('manager', 'sales', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_user_roles_role_idx on public.app_user_roles(role);

create or replace function public.handle_new_auth_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_user_roles (user_id, role, active)
  values (new.id, 'viewer', true)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_set_role on auth.users;
create trigger on_auth_user_created_set_role
after insert on auth.users
for each row execute function public.handle_new_auth_user_role();

alter table public.app_user_roles enable row level security;

drop policy if exists "app_user_roles_select_own_or_manager" on public.app_user_roles;
create policy "app_user_roles_select_own_or_manager"
  on public.app_user_roles
  for select
  using (
    auth.uid() = user_id
    or (auth.jwt()->'app_metadata'->>'role') = 'manager'
  );

-- No direct client-side inserts/updates/deletes:
-- managers should use server-side (edge function with service role) for assignments.
