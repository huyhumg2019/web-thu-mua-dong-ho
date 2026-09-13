-- Lưu cấu hình đồng bộ Kame dùng chung cho mọi máy và nhân viên.
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.

begin;

create table if not exists public.kame_sync_settings (
  id text primary key,
  dcom_rate_adjustment numeric not null default -2,
  buffer_man_yen numeric not null default 20,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint kame_sync_settings_singleton_check
    check (id = 'default'),
  constraint kame_sync_settings_dcom_check
    check (
      dcom_rate_adjustment >= -50
      and dcom_rate_adjustment <= 50
    ),
  constraint kame_sync_settings_buffer_check
    check (buffer_man_yen >= 0)
);

insert into public.kame_sync_settings (
  id,
  dcom_rate_adjustment,
  buffer_man_yen
)
values ('default', -2, 20)
on conflict (id) do nothing;

alter table public.kame_sync_settings enable row level security;

drop policy if exists "Staff can read Kame sync settings"
on public.kame_sync_settings;

create policy "Staff can read Kame sync settings"
on public.kame_sync_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'staff')
  )
);

drop policy if exists "Staff can insert Kame sync settings"
on public.kame_sync_settings;

create policy "Staff can insert Kame sync settings"
on public.kame_sync_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'staff')
  )
);

drop policy if exists "Staff can update Kame sync settings"
on public.kame_sync_settings;

create policy "Staff can update Kame sync settings"
on public.kame_sync_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'staff')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'staff')
  )
);

revoke all on table public.kame_sync_settings from anon;

grant select, insert, update
on table public.kame_sync_settings
to authenticated, service_role;

commit;

select * from public.kame_sync_settings;
