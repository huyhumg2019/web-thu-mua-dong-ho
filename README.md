This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Danh sách tài khoản trong admin

Chạy `supabase/setup-admin-accounts.sql` một lần trong Supabase SQL Editor, sau đó xuất bản `admin.html`, `admin.js`, `admin-accounts.js` và `admin-accounts.css`. Chỉ hồ sơ có vai trò `admin` được xem danh sách khách hàng, nhân viên, admin và lịch sử yêu cầu của khách. Nhân viên không được cấp quyền đọc danh sách này. Trang này chỉ xem dữ liệu, không thay đổi vai trò hoặc mật khẩu.

## Tin tức trên GitHub Pages

Trang công khai hiện dùng `index.html`, `news.html` và các file JavaScript/CSS ở gốc dự án. Để bật Tin tức:

1. Sau khi gộp thay đổi vào `main`, mở Supabase Dashboard → SQL Editor và chạy toàn bộ `supabase/setup-news.sql` một lần.
2. Vào `admin.html`, đăng nhập tài khoản admin hoặc staff, chọn **Đăng tin tức** ở đầu trang.
3. Nhập tiêu đề, tóm tắt, nội dung, chọn tối đa 8 ảnh (mỗi ảnh tối đa 5 MB). Lưu **Bản nháp** để chuẩn bị; chọn **Đăng công khai** để bài xuất hiện ở `news.html` và ba bài gần nhất trên trang chủ.

Nội dung bài lưu trong bảng `public.news_articles`; ảnh lưu trong bucket Supabase Storage `news-images`. Staff có thể sửa, gỡ công khai hoặc xóa bài. Không cần sửa mã HTML để đăng bài mỗi ngày.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
