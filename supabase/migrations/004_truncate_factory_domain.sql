-- Clears domain tables in FK-safe order (used before full re-sync from the app).
-- Use `WHERE true` on each DELETE: some Postgres/Supabase setups reject DELETE without a WHERE.

create or replace function public.truncate_factory_domain()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.customer_order_lines where true;
  delete from public.customer_orders where true;
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
