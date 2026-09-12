-- Thêm tên gọi thị trường cho Daytona 126500LN.
-- Chạy toàn bộ file một lần trong Supabase SQL Editor.

begin;

update public.purchase_price_variants
set nickname = case reference
  when '126500LN-W' then 'Panda'
  when '126500LN-B' then 'Reverse Panda'
  else nickname
end
where reference in ('126500LN-W', '126500LN-B');

commit;

select
  reference,
  nickname,
  variant_label,
  new_price_million_vnd,
  used_price_million_vnd
from public.purchase_price_variants
where reference in ('126500LN-W', '126500LN-B')
order by reference;
