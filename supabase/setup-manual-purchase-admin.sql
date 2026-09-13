-- Cho phép admin/staff thêm mẫu thu mua không có trên Kame.
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.

begin;

create or replace function public.upsert_manual_purchase_price(
  p_reference text,
  p_brand text,
  p_family text,
  p_model text,
  p_variant_label text,
  p_new_price numeric,
  p_used_price numeric,
  p_image_url text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reference text := upper(trim(p_reference));
begin
  if not exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'staff')
  ) then
    raise exception 'Tài khoản không có quyền thêm mã thu mua'
      using errcode = '42501';
  end if;

  if v_reference !~ '^[0-9A-Z-]+$' then
    raise exception 'Reference không hợp lệ'
      using errcode = '22023';
  end if;

  if
    nullif(trim(p_brand), '') is null
    or nullif(trim(p_family), '') is null
    or nullif(trim(p_model), '') is null
  then
    raise exception 'Thiếu thương hiệu, dòng hoặc tên đồng hồ'
      using errcode = '22023';
  end if;

  if p_new_price < 0 or p_used_price < 0 then
    raise exception 'Giá thu mua không được nhỏ hơn 0'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.purchase_prices
    where reference = v_reference
      and price_source = 'kame-kichi'
  ) then
    raise exception 'Mã này đang được đồng bộ từ Kame; hãy sửa giá trong bảng'
      using errcode = '22023';
  end if;

  insert into public.purchase_prices (
    reference,
    brand,
    family,
    model,
    active,
    price_mode,
    manual_new_price_million_vnd,
    manual_used_price_million_vnd,
    new_price_million_vnd,
    used_price_million_vnd,
    image_url,
    price_source,
    source_variant
  )
  values (
    v_reference,
    trim(p_brand),
    trim(p_family),
    trim(p_model),
    true,
    'manual',
    p_new_price,
    p_used_price,
    p_new_price,
    p_used_price,
    p_image_url,
    'manual',
    coalesce(nullif(trim(p_variant_label), ''), 'Tiêu chuẩn')
  )
  on conflict (reference) do update
  set
    brand = excluded.brand,
    family = excluded.family,
    model = excluded.model,
    active = true,
    price_mode = 'manual',
    manual_new_price_million_vnd = excluded.manual_new_price_million_vnd,
    manual_used_price_million_vnd = excluded.manual_used_price_million_vnd,
    new_price_million_vnd = excluded.new_price_million_vnd,
    used_price_million_vnd = excluded.used_price_million_vnd,
    image_url = excluded.image_url,
    price_source = 'manual',
    source_variant = excluded.source_variant;

  insert into public.purchase_price_variants (
    reference,
    variant_key,
    variant_label,
    display_order,
    active,
    price_mode,
    manual_new_price_million_vnd,
    manual_used_price_million_vnd,
    new_price_million_vnd,
    used_price_million_vnd,
    image_url,
    source_name,
    source_reference
  )
  values (
    v_reference,
    'manual-default',
    coalesce(nullif(trim(p_variant_label), ''), 'Tiêu chuẩn'),
    0,
    true,
    'manual',
    p_new_price,
    p_used_price,
    p_new_price,
    p_used_price,
    p_image_url,
    'manual',
    v_reference
  )
  on conflict (reference, variant_key) do update
  set
    variant_label = excluded.variant_label,
    active = true,
    price_mode = 'manual',
    manual_new_price_million_vnd = excluded.manual_new_price_million_vnd,
    manual_used_price_million_vnd = excluded.manual_used_price_million_vnd,
    image_url = excluded.image_url,
    source_name = 'manual',
    updated_at = now();

  return v_reference;
end;
$$;

revoke all
on function public.upsert_manual_purchase_price(
  text, text, text, text, text, numeric, numeric, text
)
from public;

grant execute
on function public.upsert_manual_purchase_price(
  text, text, text, text, text, numeric, numeric, text
)
to authenticated;

drop policy if exists "Staff can upload manual purchase images"
on storage.objects;

create policy "Staff can upload manual purchase images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'purchase-price-images'
  and (storage.foldername(name))[1] = 'manual'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'staff')
  )
);

commit;
