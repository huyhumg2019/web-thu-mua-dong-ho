-- Chuẩn bị dữ liệu và kho ảnh cho đồng bộ giá Kame-Kichi.
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.

begin;

alter table public.purchase_prices
  add column if not exists source_new_price_man_yen numeric,
  add column if not exists source_used_price_man_yen numeric,
  add column if not exists source_variant text,
  add column if not exists source_image_url text,
  add column if not exists image_url text,
  add column if not exists auto_calculated_at timestamptz;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'purchase-price-images',
  'purchase-price-images',
  true,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can view purchase price images'
  ) then
    create policy "Public can view purchase price images"
    on storage.objects
    for select
    to public
    using (bucket_id = 'purchase-price-images');
  end if;
end
$$;

commit;

select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'purchase-price-images';
