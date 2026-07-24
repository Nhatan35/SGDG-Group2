# Assumptions

1. Không có Master UI Overview hoặc Showcase Board trong repo; homepage baseline là visual source of truth duy nhất cho Milestone 0–1.
2. `legacy/` là bản backup đọc được, không tham gia production build.
3. Milestone 0–1 không được tính là hoàn thành product routes; fallback page nói rõ route nằm trong lộ trình.
4. Dữ liệu demo dùng VND, locale `vi-VN`, timezone hiển thị mặc định `Asia/Ho_Chi_Minh`.
5. Google Font chỉ là enhancement; system font fallback vẫn sử dụng được nếu offline.
6. Role switcher chỉ xuất hiện khi `VITE_DEMO_MODE=true` và sẽ được thêm cùng auth foundation ở Milestone 3/6.
