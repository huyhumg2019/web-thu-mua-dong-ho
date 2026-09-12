-- Chuẩn hóa tên thương mại GMT-Master II theo từng biến thể.
-- Chạy toàn bộ file một lần trong Supabase SQL Editor.

begin;

alter table public.purchase_price_variants
  add column if not exists nickname text;

update public.purchase_prices
set model = case reference
  when '126710BLRO' then 'Pepsi'
  when '126710BLNR' then 'Batgirl / Batman'
  when '126710GRNR' then 'Bruce Wayne'
  when '126720VTNR' then 'Sprite'
  else model
end
where reference in (
  '126710BLRO',
  '126710BLNR',
  '126710GRNR',
  '126720VTNR'
);

update public.purchase_price_variants
set
  nickname = case
    when reference = '126710BLRO' then 'Pepsi'
    when reference = '126710BLNR'
      and bracelet = 'Jubilee' then 'Batgirl'
    when reference = '126710BLNR'
      and bracelet = 'Oyster' then 'Batman'
    when reference = '126710GRNR' then 'Bruce Wayne'
    when reference = '126720VTNR' then 'Sprite'
    else nickname
  end,
  variant_label = case
    when reference = '126710BLRO' then 'Dây Jubilee'
    else variant_label
  end,
  bracelet = case
    when reference = '126710BLRO' then 'Jubilee'
    else bracelet
  end
where reference in (
  '126710BLRO',
  '126710BLNR',
  '126710GRNR',
  '126720VTNR'
);

-- Chỉ xóa bản tạm/cũ khi hai bản chuẩn Jubilee và Oyster đã tồn tại.
delete from public.purchase_price_variants old_variant
where old_variant.reference in (
  '126710BLNR',
  '126710GRNR',
  '126720VTNR'
)
and old_variant.variant_key in ('default', 'jubilee', 'oyster')
and exists (
  select 1 from public.purchase_price_variants correct_variant
  where correct_variant.reference = old_variant.reference
    and correct_variant.variant_key = 'jubilee-black'
)
and exists (
  select 1 from public.purchase_price_variants correct_variant
  where correct_variant.reference = old_variant.reference
    and correct_variant.variant_key = 'oyster-black'
);

create or replace view public.purchase_catalog_variants
with (security_invoker = true) as
select
  v.id as variant_id,
  p.reference,
  p.brand,
  p.family,
  p.model,
  v.variant_key,
  v.variant_label,
  v.bracelet,
  v.dial,
  v.display_order,
  v.new_price_million_vnd,
  v.used_price_million_vnd,
  v.image_url,
  v.updated_at,
  v.nickname
from public.purchase_prices p
join public.purchase_price_variants v
  on v.reference = p.reference
where p.active = true and v.active = true;

grant select on public.purchase_catalog_variants
to anon, authenticated;

commit;

select
  p.family,
  p.reference,
  v.nickname,
  v.variant_label,
  v.new_price_million_vnd,
  v.used_price_million_vnd
from public.purchase_prices p
join public.purchase_price_variants v
  on v.reference = p.reference
where p.reference in (
  '126710BLRO',
  '126710BLNR',
  '126710GRNR',
  '126720VTNR'
)
order by p.reference, v.display_order;
