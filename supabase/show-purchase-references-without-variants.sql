-- Run once in Supabase SQL Editor after setup-purchase-image-overrides.sql.
-- References without active variants also appear on the public buyback page.
-- A reference image override applies to its variants unless a variant has its own override.
begin;

-- This reference has manually maintained prices and the owner wants it visible.
-- Restore it only when both stored prices exist; do not change the prices.
update public.purchase_prices
set active = true
where reference = '126710BLRO'
  and active = false
  and new_price_million_vnd > 0
  and used_price_million_vnd > 0;

create or replace view public.purchase_catalog_variants
with (security_invoker = true) as
select
  v.id as variant_id, p.reference, p.brand, p.family, p.model,
  v.variant_key, v.variant_label, v.bracelet, v.dial, v.display_order,
  v.new_price_million_vnd, v.used_price_million_vnd,
  coalesce(o.image_url, base.image_url, v.image_url) as image_url,
  v.updated_at,
  v.nickname
from public.purchase_prices p
join public.purchase_price_variants v on v.reference = p.reference
left join public.purchase_image_overrides o
  on o.reference = v.reference and o.variant_key = v.variant_key
left join public.purchase_image_overrides base
  on base.reference = v.reference and base.variant_key = '__reference__'
where p.active = true and v.active = true
union all
select
  null::uuid as variant_id, p.reference, p.brand, p.family, p.model,
  'default'::text as variant_key,
  coalesce(nullif(p.source_variant, ''), nullif(p.model, ''), 'Tiêu chuẩn') as variant_label,
  null::text as bracelet, null::text as dial, 0::integer as display_order,
  p.new_price_million_vnd, p.used_price_million_vnd,
  coalesce(base.image_url, p.image_url) as image_url,
  p.updated_at, null::text as nickname
from public.purchase_prices p
left join public.purchase_image_overrides base
  on base.reference = p.reference and base.variant_key = '__reference__'
where p.active = true
  and not exists (
    select 1 from public.purchase_price_variants v
    where v.reference = p.reference and v.active = true
  );

grant select on public.purchase_catalog_variants to anon, authenticated;

commit;

-- Return the actual public catalog rows to verify this migration.
select reference, variant_key, new_price_million_vnd,
  used_price_million_vnd, image_url
from public.purchase_catalog_variants
where reference in ('126710BLRO', '126710GRNR')
order by reference, display_order;
