-- Staff may propose a product sale price; only an admin can apply it.
begin;

create table if not exists public.product_price_change_requests (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  proposed_price_million_vnd numeric not null check (
    proposed_price_million_vnd >= 0 and
    proposed_price_million_vnd = trunc(proposed_price_million_vnd)
  ),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);
create unique index if not exists product_price_one_pending_per_product
  on public.product_price_change_requests(product_id) where status = 'pending';
alter table public.product_price_change_requests enable row level security;
drop policy if exists "Staff see own product prices; admin sees all"
  on public.product_price_change_requests;
create policy "Staff see own product prices; admin sees all"
  on public.product_price_change_requests for select to authenticated
  using (requested_by = auth.uid() or exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));
revoke all on public.product_price_change_requests from public, anon, authenticated;
grant select on public.product_price_change_requests to authenticated;

create or replace function public.submit_product_price_change(
  p_product_id text, p_price numeric
) returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.profiles
      where id = auth.uid() and role = 'staff') then
    raise exception 'Chỉ nhân viên được gửi đề xuất giá bán' using errcode = '42501';
  end if;
  if p_price is null or p_price < 0 or p_price <> trunc(p_price) then
    raise exception 'Giá bán phải là số triệu VND nguyên không âm' using errcode = '22023';
  end if;
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Không tìm thấy sản phẩm' using errcode = '22023';
  end if;
  if exists (select 1 from public.product_price_change_requests
      where product_id = p_product_id and status = 'pending') then
    raise exception 'Giá bán sản phẩm này đang chờ admin duyệt' using errcode = '22023';
  end if;
  insert into public.product_price_change_requests(product_id,requested_by,proposed_price_million_vnd)
  values (p_product_id,auth.uid(),p_price) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.review_product_price_change(
  p_id uuid, p_approve boolean
) returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_request public.product_price_change_requests%rowtype;
begin
  if not exists (select 1 from public.profiles
      where id = auth.uid() and role = 'admin') then
    raise exception 'Chỉ admin được duyệt giá bán' using errcode = '42501';
  end if;
  select * into v_request from public.product_price_change_requests
    where id = p_id and status = 'pending' for update;
  if not found then
    raise exception 'Đề xuất không còn chờ duyệt' using errcode = '22023';
  end if;
  if p_approve then
    update public.products set sale_price_million_vnd = v_request.proposed_price_million_vnd,
      updated_at = now() where id = v_request.product_id;
    if not found then raise exception 'Sản phẩm đã bị xóa' using errcode = '22023'; end if;
  end if;
  update public.product_price_change_requests set
    status = case when p_approve then 'approved' else 'rejected' end,
    reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  return true;
end;
$$;

-- Block the direct API update path as well as inserts with a staff-set price.
create or replace function public.guard_staff_product_sale_price()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'staff') then
    if tg_op = 'INSERT' then
      raise exception 'Admin cần tạo sản phẩm có giá bán' using errcode = '42501';
    end if;
    if new.sale_price_million_vnd is distinct from old.sale_price_million_vnd then
      raise exception 'Giá bán của nhân viên cần admin duyệt' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists staff_product_sale_price_review on public.products;
create trigger staff_product_sale_price_review
  before insert or update on public.products
  for each row execute function public.guard_staff_product_sale_price();

grant execute on function public.submit_product_price_change(text,numeric) to authenticated;
grant execute on function public.review_product_price_change(uuid,boolean) to authenticated;
revoke execute on function public.submit_product_price_change(text,numeric) from public, anon;
revoke execute on function public.review_product_price_change(uuid,boolean) from public, anon;
commit;
