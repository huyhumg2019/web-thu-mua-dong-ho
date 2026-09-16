-- Run once in Supabase SQL Editor. Safe to run again.
-- Counts one click per browser, family and UTC day; shared across visitors.
begin;
create table if not exists public.watch_family_view_targets (
  brand_slug text not null,
  family_name text not null,
  primary key (brand_slug, family_name)
);
insert into public.watch_family_view_targets values
('rolex','Datejust'),('rolex','Submariner'),('rolex','Cosmograph Daytona'),
('rolex','GMT-Master II'),('rolex','Day-Date'),('rolex','Oyster Perpetual'),
('rolex','Yacht-Master'),('rolex','Sea-Dweller / Deepsea'),('rolex','Air-King'),
('rolex','Explorer'),('rolex','Sky-Dweller'),
('patek','Nautilus'),('patek','Aquanaut'),
('ap','Royal Oak'),('ap','Royal Oak Offshore')
on conflict do nothing;

create table if not exists public.watch_family_views (
  brand_slug text not null,
  family_name text not null,
  visitor_id uuid not null,
  viewed_on date not null,
  primary key (brand_slug, family_name, visitor_id, viewed_on),
  foreign key (brand_slug, family_name)
    references public.watch_family_view_targets (brand_slug, family_name)
);
create index if not exists watch_family_views_day_idx
  on public.watch_family_views(viewed_on);
alter table public.watch_family_view_targets enable row level security;
alter table public.watch_family_views enable row level security;
revoke all on public.watch_family_view_targets, public.watch_family_views from public, anon, authenticated;

create or replace function public.record_family_view(p_brand text, p_family text, p_visitor uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_visitor is null or not exists (
    select 1 from public.watch_family_view_targets
    where brand_slug = p_brand and family_name = p_family
  ) then
    raise exception 'Invalid family view';
  end if;
  insert into public.watch_family_views (brand_slug, family_name, visitor_id, viewed_on)
  values (p_brand, p_family, p_visitor, (now() at time zone 'UTC')::date)
  on conflict do nothing;
  delete from public.watch_family_views
    where viewed_on < (now() at time zone 'UTC')::date - 29;
end;
$$;

create or replace function public.get_family_popularity()
returns table (brand_slug text, family_name text, views bigint)
language sql stable security definer set search_path = '' as $$
  select v.brand_slug, v.family_name, count(*)
  from public.watch_family_views v
  where v.viewed_on >= (now() at time zone 'UTC')::date - 29
  group by v.brand_slug, v.family_name;
$$;
revoke all on function public.record_family_view(text,text,uuid) from public;
revoke all on function public.get_family_popularity() from public;
grant execute on function public.record_family_view(text,text,uuid) to anon, authenticated;
grant execute on function public.get_family_popularity() to anon, authenticated;
commit;
