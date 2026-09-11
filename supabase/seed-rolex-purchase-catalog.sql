-- Danh mục 30 mẫu Rolex REWATCH ưu tiên thu mua.
-- Chạy toàn bộ file này trong Supabase SQL Editor.
-- Giá của các dòng đã tồn tại được giữ nguyên.
-- Mẫu mới dùng giá 0 để website hiển thị "Liên hệ".

begin;

insert into public.purchase_prices (
  reference,
  brand,
  family,
  model,
  new_price_million_vnd,
  used_price_million_vnd,
  active,
  updated_at
)
values
  -- GMT-Master II (6)
  ('126710BLRO', 'Rolex', 'GMT-Master II', 'Pepsi', 0, 0, true, now()),
  ('126710BLNR', 'Rolex', 'GMT-Master II', 'Vành đen - xanh', 0, 0, true, now()),
  ('126720VTNR', 'Rolex', 'GMT-Master II', 'Sprite', 0, 0, true, now()),
  ('126713GRNR', 'Rolex', 'GMT-Master II', 'Rolesor vàng, vành xám - đen', 0, 0, true, now()),
  ('126711CHNR', 'Rolex', 'GMT-Master II', 'Root Beer', 0, 0, true, now()),
  ('126718GRNR', 'Rolex', 'GMT-Master II', 'Vàng vàng, vành xám - đen', 0, 0, true, now()),

  -- Cosmograph Daytona (6)
  ('126500LN-W', 'Rolex', 'Cosmograph Daytona', 'Mặt trắng', 0, 0, true, now()),
  ('126500LN-B', 'Rolex', 'Cosmograph Daytona', 'Mặt đen', 0, 0, true, now()),
  ('126503', 'Rolex', 'Cosmograph Daytona', 'Rolesor vàng', 0, 0, true, now()),
  ('126508', 'Rolex', 'Cosmograph Daytona', 'Vàng vàng', 0, 0, true, now()),
  ('126505', 'Rolex', 'Cosmograph Daytona', 'Everose gold', 0, 0, true, now()),
  ('126506', 'Rolex', 'Cosmograph Daytona', 'Platinum', 0, 0, true, now()),

  -- Submariner (5)
  ('124060', 'Rolex', 'Submariner', 'No Date', 0, 0, true, now()),
  ('126610LN', 'Rolex', 'Submariner Date', 'Mặt đen, vành đen', 0, 0, true, now()),
  ('126610LV', 'Rolex', 'Submariner Date', 'Starbucks', 0, 0, true, now()),
  ('126613LB', 'Rolex', 'Submariner Date', 'Rolesor vàng, mặt xanh', 0, 0, true, now()),
  ('126618LB', 'Rolex', 'Submariner Date', 'Vàng vàng, mặt xanh', 0, 0, true, now()),

  -- Datejust (4)
  ('126300', 'Rolex', 'Datejust', 'Datejust 41 thép, vành trơn', 0, 0, true, now()),
  ('126334', 'Rolex', 'Datejust', 'Datejust 41 thép, vành khía', 0, 0, true, now()),
  ('126233', 'Rolex', 'Datejust', 'Datejust 36 Rolesor vàng', 0, 0, true, now()),
  ('126333', 'Rolex', 'Datejust', 'Datejust 41 Rolesor vàng', 0, 0, true, now()),

  -- Explorer và Air-King (3)
  ('124270', 'Rolex', 'Explorer', 'Explorer 36', 0, 0, true, now()),
  ('226570', 'Rolex', 'Explorer II', 'Explorer II 42', 0, 0, true, now()),
  ('126900', 'Rolex', 'Air-King', 'Air-King 40', 0, 0, true, now()),

  -- Yacht-Master (3)
  ('126622', 'Rolex', 'Yacht-Master', 'Yacht-Master 40 Rolesium', 0, 0, true, now()),
  ('126621', 'Rolex', 'Yacht-Master', 'Yacht-Master 40 Everose Rolesor', 0, 0, true, now()),
  ('226659', 'Rolex', 'Yacht-Master', 'Yacht-Master 42 vàng trắng', 0, 0, true, now()),

  -- Sky-Dweller, Sea-Dweller và Deepsea (3)
  ('336934', 'Rolex', 'Sky-Dweller', 'Sky-Dweller thép và vàng trắng', 0, 0, true, now()),
  ('126600', 'Rolex', 'Sea-Dweller', 'Sea-Dweller 43', 0, 0, true, now()),
  ('136660', 'Rolex', 'Deepsea', 'Deepsea 44', 0, 0, true, now())
on conflict (reference) do update
set
  brand = excluded.brand,
  family = excluded.family,
  model = excluded.model,
  active = true;

commit;

-- Kết quả mong đợi: 30 dòng Rolex đang hoạt động.
select
  reference,
  family,
  model,
  new_price_million_vnd,
  used_price_million_vnd,
  active
from public.purchase_prices
where brand = 'Rolex'
  and active = true
order by family, reference;
