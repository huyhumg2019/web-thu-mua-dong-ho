-- Run once in Supabase SQL Editor before using the admin image editor.
-- Image overrides survive automated source syncs without freezing prices.
begin;

create table if not exists public.purchase_image_overrides (
  reference text not null references public.purchase_prices(reference) on delete cascade,
  variant_key text not null,
  image_url text not null,
  image_path text not null,
  updated_at timestamptz not null default now(),
  primary key (reference, variant_key)
);

alter table public.purchase_image_overrides enable row level security;
drop policy if exists "Public can read purchase image overrides"
  on public.purchase_image_overrides;
create policy "Public can read purchase image overrides"
  on public.purchase_image_overrides for select to anon, authenticated
  using (true);

grant select on public.purchase_image_overrides to anon, authenticated;
grant all on public.purchase_image_overrides to service_role;

drop policy if exists "Staff can upload manual purchase images"
  on storage.objects;
create policy "Staff can upload manual purchase images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'purchase-price-images'
    and (storage.foldername(name))[1] = 'manual'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'staff')
    )
  );

create or replace function public.set_purchase_image_override(
  p_reference text,
  p_variant_key text,
  p_image_path text
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
    raise exception 'Tài khoản không có quyền đổi ảnh thu mua'
      using errcode = '42501';
  end if;

  if p_image_path !~ '^manual/[a-z0-9][a-z0-9._/-]*\.(jpg|png|webp|avif)$'
    or position('..' in p_image_path) > 0
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'purchase-price-images' and name = p_image_path
    ) then
    raise exception 'Ảnh chưa được tải lên kho ảnh thu mua'
      using errcode = '22023';
  end if;

  if p_variant_key = '__reference__' then
    if not exists (
      select 1 from public.purchase_prices
      where reference = p_reference and active = true
    ) then return false; end if;
  elsif not exists (
    select 1 from public.purchase_price_variants
    where reference = p_reference and variant_key = p_variant_key
      and active = true
  ) then
    return false;
  end if;

  insert into public.purchase_image_overrides
    (reference, variant_key, image_path, image_url)
  values (
    p_reference,
    p_variant_key,
    p_image_path,
    'https://qmvbkmouxesrjcjcjmme.supabase.co/storage/v1/object/public/purchase-price-images/' || p_image_path
  )
  on conflict (reference, variant_key) do update
    set image_path = excluded.image_path,
        image_url = excluded.image_url,
        updated_at = now();

  return true;
end;
$$;

revoke all on function public.set_purchase_image_override(text, text, text)
  from public;
grant execute on function public.set_purchase_image_override(text, text, text)
  to authenticated;

create or replace view public.purchase_catalog_variants
with (security_invoker = true) as
select
  v.id as variant_id, p.reference, p.brand, p.family, p.model,
  v.variant_key, v.variant_label, v.bracelet, v.dial, v.display_order,
  v.new_price_million_vnd, v.used_price_million_vnd,
  coalesce(o.image_url,
    case when v.variant_key = 'default' then base.image_url end,
    v.image_url) as image_url,
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
    where v.reference = p.reference
  );

grant select on public.purchase_catalog_variants to anon, authenticated;

commit;
