# SGDG Frontend

Frontend prototype cho Sàn Giao Dịch Đấu Giá Trực Tuyến, xây dựng bằng React, TypeScript strict và Vite theo visual language Cam Sage Modern.

## Cài đặt và chạy

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Kiến trúc

`src/app` chứa router/layout/provider; `components` chứa shared UI; `pages` chứa route views; `services` cô lập mock/realtime/storage; `types` chứa domain model; `utils` chứa business rules có thể test; `styles` chứa token và global patterns.

Baseline HTML/CSS/JS được giữ trong `legacy/`. Route map đầy đủ nằm tại `docs/route-map.md`.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Customer | customer@sgdg.demo | Demo@123 |
| Admin | admin@sgdg.demo | Demo@123 |
| Customer Support | support@sgdg.demo | Demo@123 |
| Content Staff | content@sgdg.demo | Demo@123 |
| Finance | finance@sgdg.demo | Demo@123 |

Credential autofill chỉ được bật khi `VITE_DEMO_MODE=true` ở milestone auth.

## Workflow

Guest discovery, onboarding/KYC, registration, Manual Bid, Auto Bid, realtime state, result, winner confirmation, payment obligation, handover và back-office operations. Chi tiết tại `docs/workflows.md`.

## Mock data và realtime

Mock data sẽ đi qua service layer và persist bằng localStorage. Realtime simulator foundation hỗ trợ typed event, controlled interval, manual trigger và unsubscribe; consumer Live Room sẽ giới hạn feed khoảng 20 sự kiện và disable bidding khi resync.

## Trạng thái triển khai

31 route bắt buộc đã được triển khai cho public discovery, customer/onboarding, auction journey, winner flow và admin operations. Demo state được lưu bằng `localStorage`; Manual Bid, Auto Bid, reconnect/resync, payment và handover có interaction mô phỏng.

Account và Live Room được bảo vệ bởi Customer guard; khu vực vận hành được bảo vệ bởi Admin guard. Đăng nhập bằng demo credentials trước khi mở các route này trực tiếp.

## Known limitations

- Chưa kết nối backend, eKYC provider, payment provider hoặc realtime gateway thật.
- Role switcher và state controls phục vụ demo; authorization production vẫn phải được backend xác thực lại.
- Repository không có Master UI Board để pixel-compare; homepage baseline là visual source of truth.
- Mock assets hiện dùng bộ ảnh baseline, chưa đủ 12 ảnh riêng biệt.
