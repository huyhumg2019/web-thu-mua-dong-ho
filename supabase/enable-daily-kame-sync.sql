-- Bật đồng bộ Kame hằng ngày và thao tác xóa trong trang quản trị.
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor sau khi PR được nhập.

begin;

alter table public.purchase_prices
  add column if not exists source_exchange_rate_jpy_vnd numeric,
  add column if not exists source_exchange_rate_source text,
  add column if not exists source_exchange_rate_checked_at timestamptz;

grant usage on schema public to service_role;
grant select, update
on table public.purchase_prices
to service_role;

create or replace function public.delete_purchase_price(
  p_reference text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Chỉ quản trị viên được xóa mã thu mua'
      using errcode = '42501';
  end if;

  delete from public.purchase_prices
  where reference = upper(trim(p_reference));

  return found;
end;
$$;

revoke all
on function public.delete_purchase_price(text)
from public;

grant execute
on function public.delete_purchase_price(text)
to authenticated;

commit;

select
  reference,
  family,
  model,
  source_last_success_at
from public.purchase_prices
where brand = 'Rolex'
order by family, reference;
