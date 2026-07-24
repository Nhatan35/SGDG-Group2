# Business Rules

- Customer-facing UI không có price history chart hoặc reference price.
- Manual Bid hợp lệ khi customer eligible, phiên LIVE, không paused, amount đạt minimum và đúng increment.
- Auto Bid max là dữ liệu riêng của owner; leaderboard chỉ dùng masked alias.
- Mỗi phiên công khai participant, watcher, accepted bid count, heat score và heat label.
- Reconnect/resync vô hiệu bid controls cho đến khi dữ liệu fresh.
- Payment là nghĩa vụ thanh toán trúng đấu giá, không phải ecommerce checkout.
- `CLOSED`, `RESULT_PENDING`, provisional và confirmed winner là các trạng thái khác nhau.
- Admin mutation nhạy cảm cần permission, reason và audit log.
