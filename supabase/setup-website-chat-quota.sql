-- Giới hạn chi phí chatbot AI. Chỉ Edge Function dùng service_role gọi RPC này.
create table if not exists public.website_chat_daily_usage (
  usage_day date not null,
  visitor_key text not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (usage_day, visitor_key)
);

alter table public.website_chat_daily_usage enable row level security;
revoke all on public.website_chat_daily_usage from anon, authenticated;

create or replace function public.reserve_website_chat_request(p_visitor_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  today_utc date := (now() at time zone 'UTC')::date;
  visitor_count integer;
  total_count integer;
begin
  if length(p_visitor_key) <> 64 or p_visitor_key !~ '^[a-f0-9]{64}$' then
    return false;
  end if;

  -- Serialize reservations so parallel requests cannot exceed the daily cap.
  perform pg_advisory_xact_lock(hashtext('website_chat_quota_' || today_utc::text));
  select request_count into total_count
    from public.website_chat_daily_usage
    where usage_day = today_utc and visitor_key = '_total';
  select request_count into visitor_count
    from public.website_chat_daily_usage
    where usage_day = today_utc and visitor_key = p_visitor_key;
  if coalesce(total_count, 0) >= 200 or coalesce(visitor_count, 0) >= 12 then
    return false;
  end if;

  insert into public.website_chat_daily_usage(usage_day, visitor_key, request_count)
    values (today_utc, '_total', 1), (today_utc, p_visitor_key, 1)
    on conflict (usage_day, visitor_key) do update
      set request_count = public.website_chat_daily_usage.request_count + 1;
  return true;
end;
$$;

revoke all on function public.reserve_website_chat_request(text) from public, anon, authenticated;
grant execute on function public.reserve_website_chat_request(text) to service_role;
