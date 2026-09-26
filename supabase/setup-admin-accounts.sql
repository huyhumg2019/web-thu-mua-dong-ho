-- Run in Supabase SQL Editor before enabling the admin account directory.
-- Only an authenticated profile with role = admin may read these functions.
begin;

create or replace function public.list_admin_accounts()
returns table (
  account_id uuid,
  email text,
  full_name text,
  role text,
  created_at timestamptz,
  request_count bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Chỉ admin được xem tài khoản' using errcode = '42501';
  end if;

  return query
  select u.id, u.email::text, p.full_name::text, p.role::text,
    u.created_at, count(r.id)::bigint
  from auth.users u
  join public.profiles p on p.id = u.id
  left join public.purchase_requests r on r.customer_id = u.id
  where p.role in ('customer', 'staff', 'admin')
  group by u.id, u.email, p.full_name, p.role, u.created_at
  order by u.created_at desc, u.id desc;
end;
$$;

create or replace function public.get_admin_account_requests(p_customer_id uuid)
returns table (
  request_code text,
  request_type text,
  status text,
  created_at timestamptz,
  item_count bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Chỉ admin được xem yêu cầu của khách' using errcode = '42501';
  end if;

  return query
  select r.request_code::text, r.request_type::text, r.status::text,
    r.created_at, count(i.id)::bigint
  from public.purchase_requests r
  left join public.purchase_request_items i on i.request_id = r.id
  where r.customer_id = p_customer_id
  group by r.id, r.request_code, r.request_type, r.status, r.created_at
  order by r.created_at desc, r.id desc;
end;
$$;

revoke all on function public.list_admin_accounts() from public, anon, authenticated;
revoke all on function public.get_admin_account_requests(uuid) from public, anon, authenticated;
grant execute on function public.list_admin_accounts() to authenticated;
grant execute on function public.get_admin_account_requests(uuid) to authenticated;
commit;
