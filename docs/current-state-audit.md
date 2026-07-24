# Current State Audit

## Baseline

- Stack ban đầu: HTML5, CSS thuần và JavaScript thuần; không package manager, router hoặc test runner.
- Baseline được lưu nguyên trạng trong `legacy/` trước migration.
- Assets hiện có: logo SGDG và 7 ảnh tài sản JPG. Không có `data.js` và không có Master UI Board trong repository.

## Phần có thể tái sử dụng

- Logo, ảnh tài sản và nhận diện Cam Sage.
- Cấu trúc header hai tầng, hero, category strip, trust metrics, hướng dẫn và footer.
- Typography Be Vietnam Pro, rounded card, warm border, sage background và orange CTA.

## Phần cần refactor

- Tách dữ liệu, business logic và presentation khỏi một `app.js` duy nhất.
- Thay anchor nội trang bằng route thật; thay emoji bằng Lucide.
- Loại bỏ price chart phía khách hàng, ecommerce wording và các CTA placeholder.
- Namespaced design token, chuẩn hóa focus, loading/empty/error và reduced motion.
- Countdown cũ dựa vào biến cục bộ, không dựa server timestamp và không có freshness state.

## Design token ban đầu

Orange 700/600/500/100, sage 700/500/300/100, cream, sand, white, charcoal, muted, border, radius 16px và shadow nhẹ. Foundation mới chuẩn hóa theo prefix `--sgdg-*` và prompt.

## Component cần tách

Navigation/layout; buttons, form fields, badges, cards; auction card/time/price/metrics/bid panels; feedback states; modal/toast/table/tabs/stepper/timeline; account/admin navigation và data display.

## Route cần xây

31 màn hình được giữ nguyên trong `docs/route-map.md`. Milestone 0–1 chỉ cung cấp shell `/`, error boundary và fallback route; các product route thuộc Milestone 2–5.

## Rủi ro consistency

- Chưa có board hình ảnh để đối chiếu chi tiết.
- Ảnh hiện có ít hơn seed target 12 assets.
- Homepage baseline dùng nhiều kích thước chữ rất nhỏ và emoji, không đạt chuẩn accessibility mục tiêu.
- Một số wording baseline thiên ecommerce.

## Kế hoạch migration an toàn

1. Giữ baseline trong `legacy/`.
2. Dựng Vite ở root, giữ `/assets` tương thích đường dẫn cũ.
3. Trích token và shared component trước product page.
4. Triển khai route theo milestone, dùng service/mock layer và tests cho business rule.
5. Chạy lint, typecheck, unit tests và build sau mỗi milestone.
