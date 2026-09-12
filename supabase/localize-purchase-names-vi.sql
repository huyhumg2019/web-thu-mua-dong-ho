-- Chuẩn hóa tên hiển thị tiếng Việt cho dữ liệu thu mua hiện có.
-- Chạy toàn bộ file một lần trong Supabase SQL Editor.

begin;

update public.purchase_price_variants
set variant_label = case trim(variant_label)
  when 'ブラック' then 'Mặt đen'
  when 'ホワイト' then 'Mặt trắng'
  when 'ブルー' then 'Mặt xanh'
  when 'グレー' then 'Mặt xám'
  when 'ブラウン' then 'Mặt nâu'
  when 'プラチナ' then 'Bạch kim'
  when 'Platinum' then 'Bạch kim'
  when 'ゴールデン（シャンパン）' then 'Mặt champagne'
  when 'ゴールデン(シャンパン)' then 'Mặt champagne'
  when 'ブラック/サンダスト' then 'Mặt đen / Sundust'
  else variant_label
end,
dial = case trim(coalesce(dial, ''))
  when 'ブラック' then 'Mặt đen'
  when 'ホワイト' then 'Mặt trắng'
  when 'ブルー' then 'Mặt xanh'
  when 'グレー' then 'Mặt xám'
  when 'ブラウン' then 'Mặt nâu'
  when 'ゴールデン（シャンパン）' then 'Mặt champagne'
  when 'ゴールデン(シャンパン)' then 'Mặt champagne'
  when 'ブラック/サンダスト' then 'Mặt đen / Sundust'
  else dial
end;

update public.purchase_prices
set model = case reference
  when '126505' then 'Vàng Everose 18K'
  when '126506' then 'Bạch kim'
  when '126508' then 'Vàng vàng 18K'
  else model
end
where reference in ('126505', '126506', '126508');

commit;

select
  p.reference,
  p.family,
  p.model,
  v.nickname,
  v.variant_label
from public.purchase_prices p
join public.purchase_price_variants v
  on v.reference = p.reference
order by p.family, p.reference, v.display_order;
