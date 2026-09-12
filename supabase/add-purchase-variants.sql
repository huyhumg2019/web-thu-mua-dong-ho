-- REWATCH: nhiều biến thể cho cùng một mã Reference
-- Chạy toàn bộ file một lần trong Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.purchase_price_variants (
  id uuid primary key default gen_random_uuid(),
  reference text not null references public.purchase_prices(reference) on delete cascade,
  variant_key text not null,
  variant_label text not null default 'Tiêu chuẩn',
  bracelet text,
  dial text,
  display_order integer not null default 0,
  active boolean not null default true,
  price_mode text not null default 'auto' check (price_mode in ('auto','manual')),
  auto_new_price_million_vnd numeric,
  auto_used_price_million_vnd numeric,
  manual_new_price_million_vnd numeric,
  manual_used_price_million_vnd numeric,
  new_price_million_vnd numeric,
  used_price_million_vnd numeric,
  image_url text,
  source_name text,
  source_url text,
  source_reference text,
  source_new_price_man_yen numeric,
  source_used_price_man_yen numeric,
  source_checked_at timestamptz,
  fx_jpy_vnd numeric,
  buffer_man_yen numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(reference, variant_key)
);

create or replace function public.set_purchase_variant_effective_prices()
returns trigger language plpgsql as $$
begin
  if new.price_mode = 'manual' then
    new.new_price_million_vnd := new.manual_new_price_million_vnd;
    new.used_price_million_vnd := new.manual_used_price_million_vnd;
  else
    new.new_price_million_vnd := new.auto_new_price_million_vnd;
    new.used_price_million_vnd := new.auto_used_price_million_vnd;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_purchase_variant_effective_prices
on public.purchase_price_variants;
create trigger set_purchase_variant_effective_prices
before insert or update on public.purchase_price_variants
for each row execute function public.set_purchase_variant_effective_prices();

insert into public.purchase_price_variants (
  reference, variant_key, variant_label, display_order, active,
  price_mode, auto_new_price_million_vnd, auto_used_price_million_vnd,
  manual_new_price_million_vnd, manual_used_price_million_vnd,
  image_url, source_name, source_url, source_reference,
  source_new_price_man_yen, source_used_price_man_yen,
  source_checked_at, fx_jpy_vnd, buffer_man_yen
)
select
  p.reference, 'default', coalesce(nullif(p.source_variant, ''), nullif(p.model, ''), 'Tiêu chuẩn'),
  0, p.active, coalesce(p.price_mode, 'auto'),
  coalesce(p.auto_new_price_million_vnd, p.new_price_million_vnd),
  coalesce(p.auto_used_price_million_vnd, p.used_price_million_vnd),
  p.manual_new_price_million_vnd, p.manual_used_price_million_vnd,
  p.image_url, p.source_name, p.source_url, p.source_reference,
  p.source_new_price_man_yen, p.source_used_price_man_yen,
  p.source_checked_at, p.fx_jpy_vnd, p.buffer_man_yen
from public.purchase_prices p
on conflict (reference, variant_key) do nothing;

-- Hai biến thể GMT phổ biến. Giá/ảnh sẽ được bộ Kame cập nhật ở bước sau.
insert into public.purchase_prices (reference, brand, family, model, active)
values ('126710GRNR', 'Rolex', 'GMT-Master II', 'Mặt đen, vành xám–đen', true)
on conflict (reference) do update set active = true;

insert into public.purchase_price_variants
(reference, variant_key, variant_label, bracelet, dial, display_order, active, price_mode)
values
('126710GRNR','jubilee-black','Dây Jubilee','Jubilee','Đen',0,true,'auto'),
('126710GRNR','oyster-black','Dây Oyster','Oyster','Đen',1,true,'auto'),
('126710BLNR','jubilee-black','Dây Jubilee','Jubilee','Đen',0,true,'auto'),
('126710BLNR','oyster-black','Dây Oyster','Oyster','Đen',1,true,'auto'),
('126720VTNR','jubilee-black','Dây Jubilee','Jubilee','Đen',0,true,'auto'),
('126720VTNR','oyster-black','Dây Oyster','Oyster','Đen',1,true,'auto')
on conflict (reference, variant_key) do update
set variant_label=excluded.variant_label, bracelet=excluded.bracelet,
    dial=excluded.dial, display_order=excluded.display_order, active=true;

alter table public.purchase_price_variants enable row level security;
drop policy if exists "Public can view active purchase variants" on public.purchase_price_variants;
create policy "Public can view active purchase variants"
on public.purchase_price_variants for select to anon, authenticated
using (active = true);

grant select on public.purchase_price_variants to anon, authenticated;
grant all on public.purchase_price_variants to service_role;

create or replace view public.purchase_catalog_variants
with (security_invoker = true) as
select
  v.id as variant_id, p.reference, p.brand, p.family, p.model,
  v.variant_key, v.variant_label, v.bracelet, v.dial, v.display_order,
  v.new_price_million_vnd, v.used_price_million_vnd, v.image_url,
  v.updated_at
from public.purchase_prices p
join public.purchase_price_variants v on v.reference = p.reference
where p.active = true and v.active = true;

grant select on public.purchase_catalog_variants to anon, authenticated;


alter table public.purchase_price_variants enable row level security;

drop policy if exists "Public can view active purchase variants"
on public.purchase_price_variants;
create policy "Public can view active purchase variants"
on public.purchase_price_variants for select
to anon, authenticated
using (active = true);

grant select on public.purchase_price_variants to anon, authenticated;
grant all on public.purchase_price_variants to service_role;

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
  v.updated_at
from public.purchase_prices p
join public.purchase_price_variants v
  on v.reference = p.reference
where p.active = true and v.active = true;

grant select on public.purchase_catalog_variants to anon, authenticated;

-- Mã này có hai loại dây trên Kame nhưng chưa có trong danh mục cũ.
insert into public.purchase_prices (
  reference, brand, family, model, active
) values (
  '126710GRNR', 'Rolex', 'GMT-Master II', 'Vành xám - đen', true
)
on conflict (reference) do update set active = true;
