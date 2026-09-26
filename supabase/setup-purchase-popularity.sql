-- Run once in Supabase SQL Editor. Works for every source and manual entries.
-- Counts one view per browser, variant and UTC day; rankings cover 30 days.
begin;
create table if not exists public.purchase_variant_views (
  reference text not null references public.purchase_prices(reference) on delete cascade,
  variant_key text not null,
  visitor_id uuid not null,
  viewed_on date not null,
  primary key (reference, variant_key, visitor_id, viewed_on)
);
create index if not exists purchase_variant_views_day_idx
  on public.purchase_variant_views(viewed_on);
alter table public.purchase_variant_views enable row level security;
revoke all on public.purchase_variant_views from public, anon, authenticated;

create or replace function public.record_purchase_view(
  p_reference text, p_variant_key text, p_visitor uuid
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_visitor is null or not exists (
    select 1 from public.purchase_prices p
    where p.reference = p_reference and p.active = true and (
      exists (select 1 from public.purchase_price_variants v
              where v.reference = p.reference and v.variant_key = p_variant_key
                and v.active = true)
      or (p_variant_key = 'default' and not exists (
        select 1 from public.purchase_price_variants v
        where v.reference = p.reference and v.active = true
      ))
    )
  ) then
    raise exception 'Invalid purchase view';
  end if;
  insert into public.purchase_variant_views(reference, variant_key, visitor_id, viewed_on)
  values (p_reference, p_variant_key, p_visitor, (now() at time zone 'UTC')::date)
  on conflict do nothing;
  delete from public.purchase_variant_views
  where viewed_on < (now() at time zone 'UTC')::date - 29;
end;
$$;

create or replace function public.get_purchase_popularity()
returns table (reference text, variant_key text, views bigint)
language sql stable security definer set search_path = '' as $$
  select v.reference, v.variant_key, count(*)
  from public.purchase_variant_views v
  join public.purchase_prices p on p.reference = v.reference and p.active = true
  where v.viewed_on >= (now() at time zone 'UTC')::date - 29
    and (exists (select 1 from public.purchase_price_variants pv
                 where pv.reference = v.reference and pv.variant_key = v.variant_key
                   and pv.active = true)
         or (v.variant_key = 'default' and not exists (
           select 1 from public.purchase_price_variants pv
           where pv.reference = v.reference and pv.active = true
         )))
  group by v.reference, v.variant_key;
$$;
revoke all on function public.record_purchase_view(text,text,uuid) from public;
revoke all on function public.get_purchase_popularity() from public;
grant execute on function public.record_purchase_view(text,text,uuid) to anon, authenticated;
grant execute on function public.get_purchase_popularity() to anon, authenticated;
commit;
