# Nguồn bổ sung Watchnian

Luồng `sync-kame-prices.mjs` lấy Kame trước, sau đó đọc các trang Reference
được liên kết từ https://buy.watchnian.com/brand_rolex_sky-dweller_watch/.
Chỉ bổ sung Sky-Dweller chưa có trên Kame theo Reference, mặt số và dây.
Khi thông tin Kame không đủ phân biệt, ưu tiên Kame và bỏ qua ứng viên.
Chỉ nhập mục có giá mới, giá đã dùng, mặt và dây nhận diện được.

Cùng nút Xem trước/Đồng bộ ngay và lịch mỗi ngày; dùng cấu hình đang lưu:
`(giá nguồn JPY - buffer_man_yen * 10000) * (DCOM + dcom_rate_adjustment)`.
Ví dụ `buffer_man_yen=15`, `dcom_rate_adjustment=-2`, DCOM=170,
giá nguồn=3.000.000 JPY => 478.800.000 VND. Giữ phần lẻ triệu đồng.

Giá và URL nguồn được lưu với tên `watchnian`. Ảnh lấy từ đúng khối giá
và được đưa vào Storage qua cơ chế hiện có. Không thay giá cha Kame khi
chỉ bổ sung biến thể. Mục chỉnh tay không bị Watchnian ghi đè.
Kame xuất hiện phiên bản tương ứng về sau thì ẩn phiên bản Watchnian trùng.
Nếu Watchnian lỗi hoặc bỏ niêm yết, giữ dữ liệu cũ cùng thời điểm kiểm tra
cuối; xem `watchnianWarning` trong báo cáo. Không suy đoán giá bị thiếu.

Không cần SQL hay Edge Function mới. Merge rồi chạy Xem trước trong quản trị
để kiểm tra báo cáo trước khi Đồng bộ ngay. Đặt -2 và 15 nếu muốn công thức
trong ví dụ; không tự thay cấu hình đang lưu.

Kiểm tra: `node scripts/test-watchnian.mjs`.
