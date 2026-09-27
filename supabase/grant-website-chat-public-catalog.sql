-- The website-chat Edge Function reads only the same catalog and popularity
-- function already available to public visitors. No write privileges added.
grant select on public.purchase_catalog_variants to service_role;
grant execute on function public.get_family_popularity() to service_role;
