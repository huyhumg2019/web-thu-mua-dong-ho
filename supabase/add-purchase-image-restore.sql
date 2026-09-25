-- Run once in Supabase SQL Editor after setup-purchase-image-overrides.sql.
-- Only remove the manual image override. The original source image and prices
-- stay in their existing tables and appear again through the catalog view.
begin;

create or replace function public.restore_purchase_source_image(
  p_reference text,
  p_variant_key text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  ) then
    raise exception 'Tài khoản không có quyền khôi phục ảnh thu mua'
      using errcode = '42501';
  end if;

  delete from public.purchase_image_overrides
  where reference = p_reference and variant_key = p_variant_key;

  return found;
end;
$$;

revoke all on function public.restore_purchase_source_image(text, text)
  from public;
grant execute on function public.restore_purchase_source_image(text, text)
  to authenticated;

commit;
