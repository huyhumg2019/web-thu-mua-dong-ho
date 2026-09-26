-- Chạy trong Supabase SQL Editor trước khi cập nhật admin.js.
-- Ẩn dữ liệu nguồn gốc từ anon/staff, giữ giá và ảnh thu mua công khai.
begin;

create or replace function public.admin_purchase_source_rows(
  p_table text,
  p_offset integer default 0,
  p_limit integer default 1000
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Chỉ quản trị viên được xem nguồn giá'
      using errcode = '42501';
  end if;

  if p_offset < 0 or p_limit < 1 or p_limit > 1000 then
    raise exception 'Phạm vi truy vấn không hợp lệ';
  end if;

  if p_table = 'prices' then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.reference), '[]'::jsonb)
      into result from (
        select * from public.purchase_prices
        order by reference limit p_limit offset p_offset
      ) t;
  elsif p_table in ('variants', 'all_variants') then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.reference, t.variant_key), '[]'::jsonb)
      into result from (
        select * from public.purchase_price_variants
        where p_table = 'all_variants' or active = true
        order by reference, variant_key limit p_limit offset p_offset
      ) t;
  else
    raise exception 'Bảng không hợp lệ';
  end if;

  return result;
end;
$$;

revoke all on function public.admin_purchase_source_rows(text, integer, integer)
  from public, anon;
grant execute on function public.admin_purchase_source_rows(text, integer, integer)
  to authenticated;

-- Quyền cột: người dùng vẫn đọc được giá công khai, nhưng không thể truy vấn
-- source_name, price_source, URL nguồn, giá yên hoặc tỷ giá qua REST API.
do $$
declare target_table text;
declare safe_columns text;
begin
  foreach target_table in array array['purchase_prices', 'purchase_price_variants'] loop
    execute format('revoke select on public.%I from anon, authenticated', target_table);
    select string_agg(format('%I', column_name), ', ' order by ordinal_position)
      into safe_columns
      from information_schema.columns
      where table_schema = 'public' and table_name = target_table
        and column_name not in (
          'price_source', 'source_name', 'source_url', 'source_reference',
          'source_new_price_man_yen',
          'source_used_price_man_yen', 'source_exchange_rate_jpy_vnd',
          'source_exchange_rate_source', 'source_exchange_rate_checked_at',
          'source_checked_at', 'source_last_success_at',
          'fx_jpy_vnd', 'buffer_man_yen'
        );
    execute format('grant select (%s) on public.%I to anon, authenticated',
      safe_columns, target_table);
  end loop;
end;
$$;

drop policy if exists "Staff can read Kame sync settings"
  on public.kame_sync_settings;
drop policy if exists "Staff can insert Kame sync settings"
  on public.kame_sync_settings;
drop policy if exists "Staff can update Kame sync settings"
  on public.kame_sync_settings;

create policy "Only admin can read sync settings"
on public.kame_sync_settings for select to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.role = 'admin'
));

create policy "Only admin can insert sync settings"
on public.kame_sync_settings for insert to authenticated
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.role = 'admin'
));

create policy "Only admin can update sync settings"
on public.kame_sync_settings for update to authenticated
using (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.role = 'admin'
))
with check (exists (
  select 1 from public.profiles
  where profiles.id = auth.uid() and profiles.role = 'admin'
));

commit;
