-- Empty admin_permissions ({}) was merged as "all modules on" in older clients.
-- Replace with an explicit object so viewers and managers load the same defaults.

update public.app_settings
set
  admin_permissions =
    '{"dashboard":true,"products":true,"production":true,"sales":true,"purchases":true,"reports":true,"customers":true,"settings":true}'::jsonb,
  updated_at = now()
where
  id = 1
  and admin_permissions = '{}'::jsonb;
