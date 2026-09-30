-- Run before publishing chat-history.js / admin-chat.js.
begin;
create table if not exists public.chat_conversations (
  id uuid primary key,
  token_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  updated_at timestamptz not null default now(),
  message_count integer not null default 0
);
create table if not exists public.chat_messages (
  id uuid primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender text not null check (sender in ('user', 'bot')),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_conversation_idx on public.chat_messages(conversation_id, created_at);
create table if not exists public.chat_log_daily_usage (
  day date primary key,
  count integer not null default 0
);
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_log_daily_usage enable row level security;
revoke all on public.chat_conversations, public.chat_messages, public.chat_log_daily_usage from anon, authenticated;

-- A random capability permits append only. No visitor can read any transcript.
-- Client-reported bot messages are conversation context, not audited quotations.
create or replace function public.append_chat_message(
  p_conversation uuid, p_token uuid, p_message uuid, p_sender text, p_content text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  c public.chat_conversations%rowtype;
  token_digest text := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_token::text, 'UTF8')), 'hex');
  today date := (now() at time zone 'UTC')::date;
  used integer;
begin
  if p_conversation is null or p_token is null or p_message is null
     or p_sender is null or p_sender not in ('user', 'bot')
     or p_content is null or char_length(p_content) not between 1 and 4000 then
    return false;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(930202630);
  select * into c from public.chat_conversations where id = p_conversation;
  if found then
    if c.token_hash <> token_digest or c.expires_at <= now() then return false; end if;
    if exists (select 1 from public.chat_messages where id = p_message and conversation_id = p_conversation) then return true; end if;
    if c.message_count >= 120 then return false; end if;
  end if;
  select count into used from public.chat_log_daily_usage where day = today;
  if coalesce(used, 0) >= 3000 then return false; end if;
  insert into public.chat_conversations(id, token_hash) values(p_conversation, token_digest) on conflict do nothing;
  insert into public.chat_messages(id, conversation_id, sender, content) values(p_message, p_conversation, p_sender, p_content);
  update public.chat_conversations set updated_at = now(), message_count = message_count + 1 where id = p_conversation;
  insert into public.chat_log_daily_usage(day, count) values(today, 1)
    on conflict(day) do update set count = public.chat_log_daily_usage.count + 1;
  return true;
end;
$$;

create or replace function public.list_admin_chats(p_before timestamptz default null)
returns table(id uuid, created_at timestamptz, updated_at timestamptz, expires_at timestamptz, message_count integer, preview text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where profiles.id = auth.uid() and role = 'admin') then
    raise exception 'Admin only' using errcode = '42501';
  end if;
  return query select c.id, c.created_at, c.updated_at, c.expires_at, c.message_count,
    (select left(m.content, 160) from public.chat_messages m where m.conversation_id = c.id and m.sender = 'user' order by m.created_at, m.id limit 1)
    from public.chat_conversations c where c.expires_at > now()
      and (p_before is null or c.created_at < p_before)
    order by c.created_at desc limit 50;
end;
$$;
create or replace function public.get_admin_chat(p_conversation uuid)
returns table(id uuid, sender text, content text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where profiles.id = auth.uid() and role = 'admin') then
    raise exception 'Admin only' using errcode = '42501';
  end if;
  return query select m.id, m.sender, m.content, m.created_at from public.chat_messages m
    join public.chat_conversations c on c.id = m.conversation_id
    where c.id = p_conversation and c.expires_at > now() order by m.created_at, m.id;
end;
$$;
revoke all on function public.append_chat_message(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.append_chat_message(uuid, uuid, uuid, text, text) to anon, authenticated;
revoke all on function public.list_admin_chats(timestamptz), public.get_admin_chat(uuid) from public, anon, authenticated;
grant execute on function public.list_admin_chats(timestamptz), public.get_admin_chat(uuid) to authenticated;

-- Expired conversations are immediately excluded from reads; physical cleanup runs hourly.
create extension if not exists pg_cron;
select cron.schedule('luxtime-chat-retention', '0 * * * *',
  $job$delete from public.chat_conversations where expires_at <= now();
  delete from public.chat_log_daily_usage where day < current_date - 31;$job$);
commit;
