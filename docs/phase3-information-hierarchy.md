# Phase 3 — Information Hierarchy

## 1. Mục tiêu

Phase 3 làm rõ thứ tự ra quyết định trên bốn màn hình chính mà không đổi
business rule, palette, font hoặc xây state machine live:

1. Auction Detail — `/auctions/:id`.
2. Auction Listing — `/auctions`.
3. Auction Result — `/me/auctions/:id/result`.
4. Landing Page — `/`.

Mục tiêu là “Clearer hierarchy, same SGDG energy”: giá và thời gian được nhìn
thấy trước metadata, mỗi context chỉ có một primary CTA, lifecycle quyết định
label/action, và visual identity cam–kem–tối của SGDG được giữ nguyên.

## 2. Nguyên tắc ba giây

Mỗi màn hình phải trả lời được năm câu hỏi mà không buộc người dùng đọc
metadata phụ trước:

1. Đây là tài sản hoặc phiên nào?
2. Giá quan trọng hiện tại là bao nhiêu?
3. Còn bao lâu hoặc mốc thời gian nào quan trọng?
4. Người dùng có thể/cần làm gì?
5. Phiên đang ở trạng thái nào?

Thứ tự mặc định của decision block là: identity/status → price → time →
eligibility/outcome → primary action → supporting metadata.

## 3. One Primary CTA

- Mỗi screen hoặc AuctionCard có tối đa một CTA dùng visual `primary` trong
  cùng decision context.
- Navigation, share, rules, history và “xem chi tiết” dùng secondary, ghost,
  link hoặc text link.
- Detail link và CTA của AuctionCard là sibling; không có anchor/button lồng
  nhau.
- CTA luôn đi qua selector/lifecycle và eligibility/deposit gate hiện có.
- Mobile sticky action thay thế CTA trong flow khi CTA gốc rời viewport; hai
  action giống nhau không cùng tồn tại trong accessibility tree.

## 4. Lifecycle hierarchy

| Lifecycle | Price | Time | Primary action | Ghi chú |
| --- | --- | --- | --- | --- |
| Upcoming | Giá khởi điểm | Bắt đầu sau/lúc | Xem chi tiết | Không tạo bid affordance |
| Registration open | Giá khởi điểm | Hạn đăng ký | Đăng ký tham gia hoặc hoàn tất đặt cọc | Giữ registration/deposit gate |
| Live | Giá hiện tại | Countdown | Vào phòng đấu giá/Đặt giá | Giữ live orange và countdown glow |
| Ending soon | Giá hiện tại | Countdown urgency cao | Bid/Vào phòng đấu giá | Display state, không đổi domain lifecycle |
| Paused | Giá gần nhất | Chờ thông báo | Không có bid CTA | Lý do/blocked copy gần action |
| Closed/completed | Giá đóng phiên | Thời điểm đóng | Xem kết quả | Không còn active countdown |
| Cancelled | Không suy diễn giá kết quả | Lý do hủy nếu có | Xem thông báo/chi tiết ở mức secondary | Không bid, rank hoặc winner |

## 5. Tổng hợp before/after

| Screen | Before hierarchy | Vấn đề | After hierarchy | Primary CTA | Secondary actions |
| --- | --- | --- | --- | --- | --- |
| Auction Detail | Gallery, title, status, nhiều khối price/time/metrics/action có độ nổi gần nhau | Giá/countdown/eligibility chưa tạo thành một decision group; metadata và action phụ cạnh tranh | Gallery + action column; status → title → price → countdown → eligibility → CTA → metrics; mobile đưa thumbnail/tabs xuống sau decision block | Lifecycle CTA: đăng ký, vào phòng, xem kết quả; không bid khi paused/cancelled | Quy tắc, chia sẻ, gallery, tabs |
| Auction Listing | Search/filter/sort/card content chưa có nhịp quét thống nhất | Result count và active filters chưa đủ rõ; metadata chen giữa thông tin quyết định; CTA card chưa thống nhất lifecycle | Title/search → horizontal filters → sort → active summary/result count → grid; card: image → status → title → price → time → CTA → metrics | Một lifecycle CTA cho mỗi card | Detail link, pagination, reset filters |
| Auction Result | Closing snapshot, rank, Candidate timeline và audit data có thể cạnh tranh | Rank #1 có nguy cơ bị đọc như winner; deadline/action chưa gắn chặt outcome | Result heading → closing price → user outcome → deadline → CTA → timeline → rank/audit support | Phản hồi Candidate khi thực sự invited; các state khác dùng secondary history/back action | Lịch sử bid, asset/reference data |
| Landing | Hero, spotlight, live, featured, campaign và support cùng tranh sự chú ý | Nhiều narrative/CTA; live section chưa chắc đứng trước campaign/editorial | Hero/featured live → live showcase → featured auctions → categories/trust → campaign → support/footer | Đặt giá ngay cho featured live item | Tìm kiếm, chi tiết, livestream, campaign action phụ |

## 6. Auction Detail

### Before, problems và new hierarchy

Action column hiện gom toàn bộ thông tin quyết định thành một nhóm có thứ tự:

1. Status.
2. Category/reference và H1 tài sản.
3. Lifecycle price.
4. Countdown/deadline hoặc inactive time message.
5. Eligibility/deposit state.
6. Một primary CTA.
7. Rules/share.
8. Participant/watch/interest metrics và trust notes.

Gallery không còn mang metadata dài. Trên mobile, main image đứng trước summary;
thumbnail và tabs nằm sau price/action block.

### Prominence

| Element | Before priority | After priority | Reason |
| --- | --- | --- | --- |
| Price | Cao nhưng cạnh tranh với card khác | 1 trong action panel | Là dữ kiện quyết định chính |
| Countdown/time | Cao, chưa luôn gắn với price | 2, cùng decision group với price | Tạo urgency đúng lifecycle |
| CTA | Có thể cạnh tranh với rules/share | 3; một primary action | Hướng người dùng tới bước tiếp theo |
| Status | Lặp ở image/action area | Rõ nhưng compact, một status trong summary | Không cạnh tranh với price |
| Metadata | Participant/watch/interest nổi gần CTA | Sau CTA, opacity và scale thấp hơn | Vẫn giữ dữ liệu nhưng giảm nhiễu |

### Lifecycle và state

- Live: giá hiện tại, countdown, eligibility, “Vào phòng đấu giá”.
- Registration open: giá khởi điểm, deadline, “Đăng ký tham gia”.
- Paused: giá gần nhất, inactive time copy, bid action disabled/removed.
- Closed: giá đóng phiên, thời điểm đóng, “Xem kết quả”.
- Cancelled: lý do hủy, không active timer, không bid CTA.
- Loading/error/not-found dùng shared Feedback State.

### Evidence

- Desktop:
  [`PUB-003-auction-detail-live-desktop-1440.png`](../e2e/auction-detail-visual.spec.ts-snapshots/PUB-003-auction-detail-live-desktop-1440.png)
- Mobile:
  [`PUB-003-auction-detail-live-mobile-390.png`](../e2e/auction-detail-visual.spec.ts-snapshots/PUB-003-auction-detail-live-mobile-390.png)
- Targeted tests: 5/5 pass.

## 7. Auction Listing

### Before, problems và new hierarchy

Trang hiện ưu tiên search trước, sau đó là horizontal lifecycle filter chips,
category/price filters, sort, active filter summary, result count và grid.
Không chuyển sang sidebar filter.

AuctionCard dùng thứ tự image → status → category/reference/title → lifecycle
price → time → one CTA → metrics. Giá/countdown không bị ngăn cách bởi bốn icon
metrics. Detail link và CTA là sibling semantic.

### Prominence

| Element | Before priority | After priority | Reason |
| --- | --- | --- | --- |
| Price | Nằm trong card nhưng chưa tạo điểm scan ổn định | 1 sau title | So sánh nhiều phiên nhanh |
| Countdown/time | Có thể lẫn với metadata | 2, band riêng theo lifecycle | Nhận biết urgency/deadline |
| CTA | Label/variant chưa đồng nhất giữa state | 3, tối đa một primary | Hành động tiếp theo rõ |
| Status | Badge nổi nhưng có thể tranh với CTA | Badge compact trên ảnh | Scan lifecycle trước khi đọc |
| Metadata | Có thể nằm giữa title và price | Cuối card, tone thấp | Giữ giá trị tham khảo |

### Empty/no-result

- `projection=empty`: “Chưa có phiên đấu giá”, không quy lỗi cho filter.
- Search/filter không khớp: “Không tìm thấy phiên đấu giá phù hợp” và CTA
  “Xóa tất cả bộ lọc”.
- Projection error dùng ErrorState; no-result không dùng ErrorState.

### Evidence

- Desktop:
  [`PUB-002-auction-catalog-desktop-1440.png`](../e2e/auction-catalog-visual.spec.ts-snapshots/PUB-002-auction-catalog-desktop-1440.png)
- Mobile:
  [`PUB-002-auction-catalog-mobile-390.png`](../e2e/auction-catalog-visual.spec.ts-snapshots/PUB-002-auction-catalog-mobile-390.png)
- Targeted tests: 5/5 pass.

## 8. Auction Result

### Before, problems và new hierarchy

Result hero hiện ưu tiên giá đóng phiên, sau đó outcome của user, deadline và
CTA. Candidate timeline, top-three snapshot và audit reference được đưa xuống
khu vực supporting. Cancelled state không hiển thị closing price, rank hoặc
timeline.

### Prominence

| Element | Before priority | After priority | Reason |
| --- | --- | --- | --- |
| Closing price | Có nhưng cạnh tranh với timeline/rank | 1 trong result hero | Trả lời kết quả tài chính ngay |
| Outcome/deadline | Tách khỏi CTA | 2; deadline nằm trong outcome card | Người dùng hiểu trạng thái và hạn |
| CTA | Chưa luôn sát deadline | 3, ngay sau deadline | Hoàn tất bước tiếp theo |
| Status | Heading/badge có thể bị hiểu như winner | Compact, dùng Candidate/closing terminology | Tránh false-winner claim |
| Timeline/audit | Có độ nổi gần result | Sau primary result, supporting column | Giữ traceability nhưng giảm nhiễu |

### Candidate và Final Winner

- Candidate copy bắt buộc: “Thứ hạng khi đóng phiên chưa phải kết quả trúng đấu
  giá chính thức.”
- Closing Rank #1 không được đổi thành “Bạn đã thắng”.
- `payment-ambiguous`, `not-top-3`, `top3-exhausted` và `cancelled` không tạo
  false-winner claim.
- Result page không dựng giả state Final Winner. Domain fixture hiện chỉ tạo
  `FINAL_WINNER_CONFIRMED` sau `PAYMENT_CONFIRMED` và đã có route riêng
  `/me/auctions/:id/winner`; vì vậy không thêm CTA thanh toán vào Candidate
  result.

### Evidence

- Desktop:
  [`PUB-RESULT-auction-result-desktop-1440.png`](../e2e/auction-result-visual.spec.ts-snapshots/PUB-RESULT-auction-result-desktop-1440.png)
- Mobile:
  [`PUB-RESULT-auction-result-mobile-390.png`](../e2e/auction-result-visual.spec.ts-snapshots/PUB-RESULT-auction-result-mobile-390.png)
- Targeted tests: 5/5 pass.

## 9. Landing Page

### Before, problems và new hierarchy

Landing hiện dùng thứ tự:

1. Hero narrative + featured live auction.
2. Live/livestream showcase.
3. Featured auctions.
4. Category strip và trust metrics.
5. Campaign/editorial banner.
6. Support/footer.

Hero có một primary CTA “Đặt giá ngay”; search là secondary decision path.
Spotlight giữ status, title, countdown, current price và CTA. Live showcase dùng
dark competitive surface và intensity cao hơn catalog/featured cards.

### Prominence

| Element | Before priority | After priority | Reason |
| --- | --- | --- | --- |
| Featured price | Cạnh tranh với search/narrative | 1 trong spotlight auction | Nêu giá trị phiên nổi bật |
| Countdown | Một trong nhiều metric | 2, glow live rõ | Tạo urgency |
| CTA | Nhiều hero action có thể ngang nhau | 3, một primary | Một đường vào live auction |
| Status | Nhiều badge/chip | Compact live header | Nhận biết lifecycle nhanh |
| Campaign/support | Có thể cạnh tranh hero | Sau live/featured/trust | Không lấn át auction intent |

### Spotlight và motion

- Carousel có previous/next, dots và accessible labels.
- Autoplay dừng khi hover/focus và không chạy khi
  `prefers-reduced-motion: reduce`.
- Mobile không chồng text lên ảnh và controls nằm trong carousel bounds.

### Evidence

- Desktop full-page:
  [`PUB-001-homepage-desktop-1440.png`](../e2e/homepage-visual.spec.ts-snapshots/PUB-001-homepage-desktop-1440.png)
- Mobile full-page:
  [`PUB-001-homepage-mobile-390.png`](../e2e/homepage-visual.spec.ts-snapshots/PUB-001-homepage-mobile-390.png)
- Targeted hierarchy/visual/carousel/live/campaign/support tests: 16/16 pass.

## 10. Mobile và responsive hierarchy

| Screen | 390×844 | 768×1024 | 1024×768 | 1440×900/1200 |
| --- | --- | --- | --- | --- |
| Auction Detail | Main image → summary → thumbnails/tabs; sticky CTA thay thế action gốc khi cần | Pass smoke | Pass smoke | Two-column hero, pass visual |
| Auction Listing | Search stack; filter/sort scroll ngang; card một cột | Pass smoke | Pass smoke | Three-column grid, pass visual |
| Auction Result | Hero/outcome trước timeline và support | Pass smoke | Pass smoke | Primary/supporting columns, pass visual |
| Landing | Hero/spotlight stack; live và featured không tràn | Pass smoke | Pass smoke | Full-page section order, pass visual |

Smoke suite kiểm tra một H1, price/CTA visibility, price containment và mọi
phần tử `body` không vượt viewport. Đây là xác nhận responsive hierarchy cho
bốn màn hình Phase 3, không phải tuyên bố hoàn tất Responsive Phase toàn hệ
thống.

## 11. Accessibility decisions

- Mỗi page có đúng một H1 trong automated checks.
- Price block có accessible label; countdown dùng timer/text label phù hợp.
- Status luôn có text, không chỉ dựa vào màu.
- Gallery thumbnails, zoom, carousel previous/next/dots có accessible name.
- Tablist Auction Detail hỗ trợ arrow keys và focus theo tab đang chọn.
- AuctionCard không có nested anchor/button.
- Sticky mobile CTA không tạo duplicate action liên tiếp trong accessibility
  tree.
- Horizontal chips dùng button + `aria-pressed`; sort/filter vẫn dùng được bằng
  keyboard.
- Reduced motion tắt autoplay/transition cần thiết nhưng không làm mất nội
  dung.

## 12. Business rules preserved

- Candidate khác Final Winner.
- Closing Rank và Current Leader không phải Final Winner.
- Không bid khi paused, closed hoặc cancelled.
- Eligibility, registration và deposit tiếp tục quyết định CTA.
- Bidder alias và auto-bid maximum privacy không thay đổi.
- Không đổi payment/KYC reference boundary.
- Không đổi frontend simulation disclosure.
- Không thêm reducer, WebSocket, realtime scenario driver hoặc notification
  behavior.

## 13. Visual identity preserved

| Identity | Kết quả |
| --- | --- |
| Brand orange `#f4510b` | Giữ nguyên cho CTA/accent |
| Live orange | Giữ nguyên |
| Countdown glow | Giữ ở live/ending-soon, không áp lên mọi card |
| Warm cream surfaces | Giữ nguyên |
| Dark competitive surfaces | Giữ ở hero/live showcase |
| Be Vietnam Pro | Không đổi |
| Saturation | Không giảm |

Snapshot thay đổi trong implementation được giữ theo từng target riêng. Sau
follow-up countdown reference, bốn target Auction Detail/Landing (1440 và 390)
được review rồi cập nhật riêng để ghi nhận dark-dial treatment; Auction
Listing/Result không bị update. Countdown hero riêng của Live Auction Room được
chụp trong targeted Playwright artifacts.

## 14. Shared components reused

- `Button`/`ButtonLink`: primary, secondary, rule/share/navigation actions.
- `Card`: AuctionCard.
- `Dialog`: Auction Detail rules.
- `FeedbackState` wrappers: loading, empty, error và missing result.
- `AuctionStatus` + typed display source of truth: lifecycle label/tone.

Không tạo custom Dialog/Drawer mới và không thêm dependency.

## 15. Validation

| Check | Kết quả |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 0 lỗi |
| `npm run test` | PASS — 58/58 |
| `npm run build` | PASS |
| Auction Detail targeted | PASS — 5/5 |
| Auction Listing targeted | PASS — 5/5 |
| Auction Result targeted | PASS — 5/5 |
| Landing targeted | PASS — 16/16 |
| 768/1024 Phase 3 smoke | PASS — 8/8 |
| `npm run test:e2e` | PASS — 70/70 |
| Visual snapshots | PASS — 8/8 target Phase 3 khớp |

Build vẫn báo chunk JavaScript lớn hơn 500 kB; đây là debt có sẵn, không phải
lỗi build và không thuộc scope Phase 3.

## 16. Implementation surfaces

Workspace không có Git metadata hợp lệ để dựng diff theo commit. Các surface
Phase 3 đang chứa implementation và test đã được audit:

| File/area | Change represented | Reason |
| --- | --- | --- |
| `src/pages/public/AuctionDetailPage.tsx` + `src/styles/auction-detail.css` | Decision group, lifecycle variants, mobile sticky action | Price/time/eligibility/CTA hierarchy |
| `src/pages/public/AuctionsPage.tsx` + `src/styles/auction-catalog.css` | Search/filter/sort/result hierarchy và no-data/no-result | Scan và filtering |
| `src/components/auction/AuctionCard.tsx` | Lifecycle price/time/action, sibling interactions | One CTA, no nested control |
| `src/pages/auction/AuctionResultPage.tsx` + `src/styles/auction-result.css` | Closing price/outcome/deadline hierarchy | Candidate safety |
| `src/pages/public/HomePage.tsx` + home styles/components | Hero, spotlight, live and section order | Landing hierarchy |
| `src/components/auction/AuctionCountdownDial.tsx` + live room styles | Countdown hero theo reference, responsive horizontal/stacked | Live auction urgency |
| `e2e/*detail*`, `e2e/*catalog*`, `e2e/*result*`, `e2e/homepage*` | Targeted behavior và visual evidence | Acceptance coverage |
| `e2e/phase3-responsive-smoke.spec.ts` | 768/1024 containment | Intermediate viewport evidence |
| `docs/phase3-information-hierarchy.md` | Phase report và evidence | Handoff |
| `docs/design-system.md` | Shared one-primary-CTA rule | Cross-screen consistency |

## 17. Deferred work và technical debt

- Raw buttons/custom card-like containers ngoài bốn màn hình.
- Custom dialogs/drawers ngoài migration Phase 2.
- Hard-coded CSS và bundle splitting warning.
- Live Auction reducer/state machine.
- Realtime scenario driver, Outbid, Reconnecting/Extended logic đầy đủ.
- Notification Center, payments/deliveries expansion, auto-bid simulation.
- Membership/Luxury Enhancement.
- Full Responsive QA toàn sản phẩm.
- P2/P3 backlog ngoài bốn màn hình.

## 18. Phase 4 handoff

Phase 4 chưa được bắt đầu. Khi handoff, giữ:

1. Typed display status/CTA selector là source of truth cho presentation.
2. Decision hierarchy Phase 3 không bị reducer/realtime state làm đảo thứ tự.
3. Reconnecting/extended/outbid phải là state rõ, không giả lifecycle hoặc
   bypass eligibility.
4. Candidate/Final Winner invariant và deterministic fixtures phải tiếp tục có
   regression tests.

## 19. Scope disclosure

Đây là frontend deterministic simulation. Không có backend, WebSocket,
database, payment hoặc authentication production. Không tuyên bố
production-ready.
