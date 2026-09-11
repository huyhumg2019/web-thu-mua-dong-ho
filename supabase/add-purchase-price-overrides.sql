-- Bổ sung chế độ giá tự động và giá chỉnh tay cho REWATCH.
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.

begin;

alter table public.purchase_prices
  add column if not exists price_mode text not null default 'auto',
  add column if not exists auto_new_price_million_vnd numeric,
  add column if not exists auto_used_price_million_vnd numeric,
  add column if not exists manual_new_price_million_vnd numeric,
  add column if not exists manual_used_price_million_vnd numeric,
  add column if not exists price_source text,
  add column if not exists source_url text,
  add column if not exists source_checked_at timestamptz,
  add column if not exists source_last_success_at timestamptz;

update public.purchase_prices
set
  auto_new_price_million_vnd =
    coalesce(auto_new_price_million_vnd, new_price_million_vnd),
  auto_used_price_million_vnd =
    coalesce(auto_used_price_million_vnd, used_price_million_vnd)
where
  auto_new_price_million_vnd is null
  or auto_used_price_million_vnd is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_prices_price_mode_check'
      and conrelid = 'public.purchase_prices'::regclass
  ) then
    alter table public.purchase_prices
      add constraint purchase_prices_price_mode_check
      check (price_mode in ('auto', 'manual'));
  end if;
end
$$;

create or replace function public.sync_purchase_price_effective()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.price_mode = 'manual' then
    new.new_price_million_vnd :=
      coalesce(
        new.manual_new_price_million_vnd,
        new.auto_new_price_million_vnd,
        new.new_price_million_vnd,
        0
      );

    new.used_price_million_vnd :=
      coalesce(
        new.manual_used_price_million_vnd,
        new.auto_used_price_million_vnd,
        new.used_price_million_vnd,
        0
      );
  else
    new.new_price_million_vnd :=
      coalesce(
        new.auto_new_price_million_vnd,
        new.new_price_million_vnd,
        0
      );

    new.used_price_million_vnd :=
      coalesce(
        new.auto_used_price_million_vnd,
        new.used_price_million_vnd,
        0
      );
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_purchase_price_effective_trigger
on public.purchase_prices;

create trigger sync_purchase_price_effective_trigger
before insert or update of
  price_mode,
  auto_new_price_million_vnd,
  auto_used_price_million_vnd,
  manual_new_price_million_vnd,
  manual_used_price_million_vnd
on public.purchase_prices
for each row
execute function public.sync_purchase_price_effective();

-- Đồng bộ lại giá hiển thị sau khi tạo trigger.
update public.purchase_prices
set price_mode = price_mode;

commit;

select
  reference,
  price_mode,
  auto_new_price_million_vnd,
  auto_used_price_million_vnd,
  manual_new_price_million_vnd,
  manual_used_price_million_vnd,
  new_price_million_vnd as displayed_new_price,
  used_price_million_vnd as displayed_used_price
from public.purchase_prices
order by brand, family, reference;
