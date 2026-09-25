-- Run once in Supabase SQL Editor before enabling per-variant controls.
-- All sources use the same staff-authorized operation.
begin;

create or replace function public.manage_purchase_variant(
  p_reference text,
  p_variant_key text,
  p_action text,
  p_new_price numeric default null,
  p_used_price numeric default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'staff')
  ) then
    raise exception 'Tài khoản không có quyền sửa giá thu mua'
      using errcode = '42501';
  end if;

  if p_action not in ('auto', 'manual', 'delete') then
    raise exception 'Thao tác không hợp lệ'
      using errcode = '22023';
  end if;

  if p_action = 'delete' and not exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  ) then
    raise exception 'Chỉ admin được xóa phiên bản'
      using errcode = '42501';
  end if;

  if p_action = 'manual' and (
    p_new_price is null or p_used_price is null or
    p_new_price < 1 or p_used_price < 1 or
    p_new_price <> trunc(p_new_price) or
    p_used_price <> trunc(p_used_price)
  ) then
    raise exception 'Nhập đủ giá mới và cũ từ 1 triệu VND, số nguyên'
      using errcode = '22023';
  end if;

  update public.purchase_price_variants
  set
    active = case when p_action = 'delete' then false else active end,
    price_mode = case when p_action = 'delete' then 'manual' else p_action end,
    manual_new_price_million_vnd =
      case when p_action = 'manual' then p_new_price
           else manual_new_price_million_vnd end,
    manual_used_price_million_vnd =
      case when p_action = 'manual' then p_used_price
           else manual_used_price_million_vnd end
  where reference = p_reference
    and variant_key = p_variant_key
    and active = true;

  return found;
end;
$$;

revoke all on function public.manage_purchase_variant(
  text, text, text, numeric, numeric
) from public;
grant execute on function public.manage_purchase_variant(
  text, text, text, numeric, numeric
) to authenticated;

commit;
