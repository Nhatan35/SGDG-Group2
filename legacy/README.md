# SGDG Homepage Demo

Bản frontend demo độc lập cho trang chủ SIGONDAUGIA.

## Chạy nhanh

### Cách 1
Mở trực tiếp file `index.html` bằng Chrome/Edge.

### Cách 2 — khuyến nghị
Trong thư mục dự án, chạy:

```bash
python -m http.server 8080
```

Sau đó mở:

```text
http://localhost:8080
```

## Cấu trúc

- `index.html`: layout homepage
- `styles.css`: design system Cam Sage Modern + responsive
- `app.js`: dữ liệu đấu giá giả, filter, countdown, modal và toast
- `assets/`: logo và ảnh sản phẩm được cắt từ mockup SGDG người dùng cung cấp

## Phạm vi hiện tại

Đây là version 0.1 để kiểm tra:
- màu sắc
- header/navigation
- hero
- live auction
- danh mục
- card sản phẩm
- thống kê uy tín
- quy trình hoạt động
- responsive cơ bản

Chưa có backend, đăng nhập thật, eKYC, realtime bidding hay payment.
