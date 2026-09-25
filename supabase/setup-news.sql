-- Run once in the Supabase SQL Editor before publishing the News page.
begin;

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 3 and 180),
  excerpt text not null default '' check (length(excerpt) <= 500),
  body text not null check (length(btrim(body)) >= 10),
  image_paths text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_published_has_date check (status = 'draft' or published_at is not null)
);

create index if not exists news_articles_published_idx
  on public.news_articles (published_at desc) where status = 'published';

alter table public.news_articles enable row level security;

drop policy if exists "Anyone can read published news" on public.news_articles;
create policy "Anyone can read published news"
  on public.news_articles for select to anon, authenticated
  using (status = 'published' and published_at <= now());

drop policy if exists "Staff can read all news" on public.news_articles;
create policy "Staff can read all news"
  on public.news_articles for select to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  ));

drop policy if exists "Staff can create news" on public.news_articles;
create policy "Staff can create news"
  on public.news_articles for insert to authenticated
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  ));

drop policy if exists "Staff can update news" on public.news_articles;
create policy "Staff can update news"
  on public.news_articles for update to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  ))
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  ));

drop policy if exists "Staff can delete news" on public.news_articles;
create policy "Staff can delete news"
  on public.news_articles for delete to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  ));

grant select on public.news_articles to anon, authenticated;
grant insert, update, delete on public.news_articles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-images', 'news-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Staff can upload news images" on storage.objects;
create policy "Staff can upload news images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'news-images' and exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  ));

drop policy if exists "Staff can list news images" on storage.objects;
create policy "Staff can list news images"
  on storage.objects for select to authenticated
  using (bucket_id = 'news-images' and exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  ));

drop policy if exists "Staff can delete news images" on storage.objects;
create policy "Staff can delete news images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'news-images' and exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'staff')
  ));

commit;
