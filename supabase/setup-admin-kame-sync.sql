-- Quyền cần thiết để bộ đồng bộ có thể tự thêm mẫu Rolex mới.
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.

begin;

grant usage on schema public to service_role;

grant select, insert, update
on table public.purchase_prices
to service_role;

grant select, insert, update
on table public.purchase_price_variants
to service_role;

commit;
