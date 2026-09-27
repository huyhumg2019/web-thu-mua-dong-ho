-- Run in Supabase SQL Editor before publishing the price approval UI.
-- Price changes from staff are proposals. Only an admin RPC applies them.
begin;

create table if not exists public.purchase_price_change_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id),
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  kind text not null check (kind in ('reference', 'variant', 'manual_item')),
  action text not null check (action in ('manual', 'auto', 'create')),
  reference text not null,
  variant_key text,
  new_price numeric,
  used_price numeric,
  brand text,
  family text,
  model text,
  variant_label text,
  image_url text
);

create index if not exists purchase_price_requests_status_idx
  on public.purchase_price_change_requests (status, requested_at desc);
alter table public.purchase_price_change_requests enable row level security;
drop policy if exists "Staff see own price proposals; admin sees all"
  on public.purchase_price_change_requests;
create policy "Staff see own price proposals; admin sees all"
  on public.purchase_price_change_requests for select to authenticated
  using (requested_by = auth.uid() or exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));
revoke all on public.purchase_price_change_requests from public, anon, authenticated;
grant select on public.purchase_price_change_requests to authenticated;

create or replace function public.submit_purchase_price_change(
  p_kind text, p_reference text, p_action text,
  p_variant_key text default null, p_new_price numeric default null,
  p_used_price numeric default null, p_brand text default null,
  p_family text default null, p_model text default null,
  p_variant_label text default null, p_image_url text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid; v_reference text := upper(trim(p_reference));
begin
  if not exists (select 1 from public.profiles
      where id = auth.uid() and role = 'staff') then
    raise exception 'Chỉ nhân viên được gửi đề xuất giá' using errcode = '42501';
  end if;
  if v_reference !~ '^[0-9A-Z-]+$' or length(v_reference) > 80 then
    raise exception 'Reference không hợp lệ' using errcode = '22023';
  end if;
  if (p_kind, p_action) not in (('reference','manual'), ('reference','auto'),
                                ('variant','manual'), ('variant','auto'),
                                ('manual_item','create')) then
    raise exception 'Loại đề xuất không hợp lệ' using errcode = '22023';
  end if;
  if p_action in ('manual','create') and (
      p_new_price is null or p_used_price is null or
      p_new_price < case when p_kind = 'variant' then 1 else 0 end or
      p_used_price < case when p_kind = 'variant' then 1 else 0 end or
      p_new_price <> trunc(p_new_price) or p_used_price <> trunc(p_used_price)) then
    raise exception 'Cần nhập giá mới và đã dùng hợp lệ (triệu VND, số nguyên)'
      using errcode = '22023';
  end if;
  if p_kind = 'reference' and not exists (
      select 1 from public.purchase_prices where reference = v_reference) then
    raise exception 'Không tìm thấy Reference' using errcode = '22023';
  end if;
  if p_kind = 'variant' and not exists (
      select 1 from public.purchase_price_variants
      where reference = v_reference and variant_key = p_variant_key and active) then
    raise exception 'Không tìm thấy phiên bản' using errcode = '22023';
  end if;
  if p_kind = 'manual_item' and (
      exists (select 1 from public.purchase_prices where reference = v_reference) or
      nullif(trim(p_brand), '') is null or nullif(trim(p_family), '') is null or
      nullif(trim(p_model), '') is null or nullif(trim(p_image_url), '') is null or
      p_image_url not like 'https://qmvbkmouxesrjcjcjmme.supabase.co/storage/v1/object/public/purchase-price-images/manual/%' or
      length(p_brand) > 120 or length(p_family) > 120 or
      length(p_model) > 240 or length(p_variant_label) > 240 or
      length(p_image_url) > 2048) then
    raise exception 'Mã đã tồn tại hoặc thông tin mẫu thu mua chưa hợp lệ'
      using errcode = '22023';
  end if;
  insert into public.purchase_price_change_requests (
    requested_by, kind, action, reference, variant_key, new_price, used_price,
    brand, family, model, variant_label, image_url
  ) values (
    auth.uid(), p_kind, p_action, v_reference, p_variant_key,
    case when p_action = 'auto' then null else p_new_price end,
    case when p_action = 'auto' then null else p_used_price end,
    trim(p_brand), trim(p_family), trim(p_model), trim(p_variant_label), trim(p_image_url)
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_update_purchase_price(
  p_reference text, p_action text,
  p_new_price numeric default null, p_used_price numeric default null
) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.profiles
      where id = auth.uid() and role = 'admin') then
    raise exception 'Chỉ admin được cập nhật giá' using errcode = '42501';
  end if;
  if p_action not in ('manual','auto') then
    raise exception 'Chế độ giá không hợp lệ' using errcode = '22023';
  end if;
  if p_action = 'manual' and (p_new_price is null or p_used_price is null or
      p_new_price < 0 or p_used_price < 0 or
      p_new_price <> trunc(p_new_price) or p_used_price <> trunc(p_used_price)) then
    raise exception 'Giá thủ công phải là số nguyên từ 0 triệu VND' using errcode = '22023';
  end if;
  update public.purchase_prices set
    price_mode = p_action,
    manual_new_price_million_vnd = case when p_action = 'manual' then p_new_price
      else manual_new_price_million_vnd end,
    manual_used_price_million_vnd = case when p_action = 'manual' then p_used_price
      else manual_used_price_million_vnd end
  where reference = upper(trim(p_reference));
  return found;
end;
$$;

create or replace function public.admin_manage_purchase_variant(
  p_reference text, p_variant_key text, p_action text,
  p_new_price numeric default null, p_used_price numeric default null
) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.profiles
      where id = auth.uid() and role = 'admin') then
    raise exception 'Chỉ admin được cập nhật phiên bản' using errcode = '42501';
  end if;
  return public.manage_purchase_variant(
    p_reference, p_variant_key, p_action, p_new_price, p_used_price);
end;
$$;

create or replace function public.admin_upsert_manual_purchase_price(
  p_reference text, p_brand text, p_family text, p_model text,
  p_variant_label text, p_new_price numeric, p_used_price numeric,
  p_image_url text
) returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.profiles
      where id = auth.uid() and role = 'admin') then
    raise exception 'Chỉ admin được tạo mã thu mua' using errcode = '42501';
  end if;
  return public.upsert_manual_purchase_price(p_reference, p_brand, p_family,
    p_model, p_variant_label, p_new_price, p_used_price, p_image_url);
end;
$$;

create or replace function public.review_purchase_price_change(
  p_id uuid, p_approve boolean
) returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_request public.purchase_price_change_requests%rowtype; v_applied boolean;
begin
  if not exists (select 1 from public.profiles
      where id = auth.uid() and role = 'admin') then
    raise exception 'Chỉ admin được duyệt giá' using errcode = '42501';
  end if;
  select * into v_request from public.purchase_price_change_requests
    where id = p_id and status = 'pending' for update;
  if not found then
    raise exception 'Đề xuất không còn chờ duyệt' using errcode = '22023';
  end if;
  if p_approve then
    if v_request.kind = 'reference' then
      v_applied := public.admin_update_purchase_price(v_request.reference,
        v_request.action, v_request.new_price, v_request.used_price);
    elsif v_request.kind = 'variant' then
      v_applied := public.admin_manage_purchase_variant(v_request.reference,
        v_request.variant_key, v_request.action, v_request.new_price,
        v_request.used_price);
    else
      if exists (select 1 from public.purchase_prices
          where reference = v_request.reference) then
        raise exception 'Mã đã được tạo sau khi gửi đề xuất' using errcode = '22023';
      end if;
      perform public.admin_upsert_manual_purchase_price(v_request.reference,
        v_request.brand, v_request.family, v_request.model,
        v_request.variant_label, v_request.new_price, v_request.used_price,
        v_request.image_url);
      v_applied := true;
    end if;
    if v_applied is not true then
      raise exception 'Mẫu thu mua đã bị xóa hoặc ngừng hiển thị'
        using errcode = '22023';
    end if;
  end if;
  update public.purchase_price_change_requests set
    status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_id;
  return true;
end;
$$;

-- No browser client (including staff) can bypass review by updating prices.
-- The privileged functions above verify the caller's profile before writing.
revoke insert, update, delete on public.purchase_prices from public, anon, authenticated;
revoke insert, update, delete on public.purchase_price_variants from public, anon, authenticated;
revoke all on function public.upsert_manual_purchase_price(
  text,text,text,text,text,numeric,numeric,text) from public, anon, authenticated;
revoke all on function public.manage_purchase_variant(
  text,text,text,numeric,numeric) from public, anon, authenticated;
grant execute on function public.submit_purchase_price_change(
  text,text,text,text,numeric,numeric,text,text,text,text,text) to authenticated;
grant execute on function public.admin_update_purchase_price(
  text,text,numeric,numeric) to authenticated;
grant execute on function public.admin_manage_purchase_variant(
  text,text,text,numeric,numeric) to authenticated;
grant execute on function public.admin_upsert_manual_purchase_price(
  text,text,text,text,text,numeric,numeric,text) to authenticated;
grant execute on function public.review_purchase_price_change(uuid,boolean)
  to authenticated;
revoke execute on function public.submit_purchase_price_change(
  text,text,text,text,numeric,numeric,text,text,text,text,text) from public, anon;
revoke execute on function public.admin_update_purchase_price(
  text,text,numeric,numeric) from public, anon;
revoke execute on function public.admin_manage_purchase_variant(
  text,text,text,numeric,numeric) from public, anon;
revoke execute on function public.admin_upsert_manual_purchase_price(
  text,text,text,text,text,numeric,numeric,text) from public, anon;
revoke execute on function public.review_purchase_price_change(uuid,boolean)
  from public, anon;
commit;
