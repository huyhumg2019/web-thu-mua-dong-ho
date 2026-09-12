-- Xóa các biến thể tạm/cũ sau khi đã có đủ Jubilee và Oyster chuẩn.
-- Chạy toàn bộ file trong Supabase SQL Editor.
-- Không xóa giá hoặc ảnh của hai biến thể chuẩn bên phải.

begin;

delete from public.purchase_price_variants old_variant
where old_variant.reference in (
  '126710BLNR',
  '126710GRNR',
  '126720VTNR'
)
and old_variant.variant_key in (
  'default',
  'jubilee',
  'oyster'
)
and exists (
  select 1
  from public.purchase_price_variants correct_variant
  where correct_variant.reference = old_variant.reference
    and correct_variant.variant_key = 'jubilee-black'
)
and exists (
  select 1
  from public.purchase_price_variants correct_variant
  where correct_variant.reference = old_variant.reference
    and correct_variant.variant_key = 'oyster-black'
);

commit;

select
  reference,
  variant_key,
  variant_label,
  new_price_million_vnd,
  used_price_million_vnd
from public.purchase_price_variants
where reference in (
  '126710BLNR',
  '126710GRNR',
  '126720VTNR'
)
order by reference, display_order, variant_key;
