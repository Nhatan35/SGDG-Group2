# SGDG Design System Foundation

## 1. Mục tiêu

Phase 1 hệ thống hóa visual identity hiện tại mà không redesign:

> Same brand, same energy, better system.

Foundation gồm primitive tokens, semantic tokens, typography utilities,
auction display status và các quy tắc label/CTA. Migration được thực hiện tăng
dần; literal CSS ngoài phạm vi không bị thay hàng loạt.

## 2. Inventory

Inventory được đo từ `src/**/*.{css,ts,tsx}` tại thời điểm thực hiện Phase 1.

### 2.1. Color inventory

- 1.974 occurrence màu hex.
- 1.073 giá trị hex duy nhất.
- 15 giá trị xuất hiện từ 10 lần trở lên.
- 844 giá trị chỉ xuất hiện một lần.
- 26 token legacy ban đầu trong `tokens.css`.

| Giá trị hiện tại | Số nơi dùng | Vai trò thực tế | Token cũ | Token mới |
| --- | ---: | --- | --- | --- |
| `#fff` | 184 | Surface/elevated | Không thống nhất | `--sgdg-surface-elevated` |
| `#fffdf9` | 61 | Warm card | Không | `--sgdg-cream-50` |
| `#f4510b` | 42 | Brand, live, CTA | `--sgdg-orange-600` | `--sgdg-color-brand-primary`, `--sgdg-color-live` |
| `#735342` | 31 | Text phụ màu nâu | Không | Đang giữ literal; migrate sang `--sgdg-text-muted` sau |
| `#f0dfd2` | 21 | Border subtle | Không | `--sgdg-border-subtle` |
| `#ecd1bd` | 21 | Border warm/strong | Không | `--sgdg-border-strong` |
| `#fffefd` | 21 | Card/on-primary | `--sgdg-white` | `--sgdg-surface-card`, `--sgdg-color-brand-on-primary` |
| `#fff8f1` | 14 | Warm surface | Không | `--sgdg-surface-warm` |
| `#5a2b1712` | 12 | Warm shadow alpha | Không | Họ `--sgdg-shadow-*` |
| `#fff0e7` | 11 | Orange soft | `--sgdg-orange-100` | `--sgdg-color-brand-primary-soft`, `--sgdg-color-live-soft` |
| `#a94711` | 11 | Orange text/active | Không | `--sgdg-orange-800`, `--sgdg-color-brand-primary-active` |
| `#fffaf6` | 11 | Cream rất nhạt | Không | `--sgdg-orange-50` |
| `#a84813` | 10 | Orange text gần trùng | Không | Candidate migrate sang orange 800 sau |
| `#765544`, `#765443` | 20 | Muted brown text | Không | Candidate migrate sang `--sgdg-text-muted` sau |
| `#ff4b10`, `#df5d12` | 14 | Live/ending energy | Không | `--sgdg-color-ending-soon`, `--sgdg-color-ember` |

Nhóm duplicate chính:

- Nhiều white/cream gần nhau đang cùng đại diện page/card/warm surface.
- Nhiều brown `#73...`, `#76...`, `#80...` cùng đại diện secondary/muted
  text.
- Nhiều orange `#f4510b`, `#ff4b10`, `#df5d12`, `#a94711`,
  `#a84813` đang trộn brand, live, ending và text.
- Shadow màu nâu có nhiều alpha khác nhau nhưng chưa có vai trò đặt tên.

Quyết định Phase 1:

- Giữ toàn bộ màu đang render.
- Token hóa các vai trò có consumer rõ.
- Không gom các màu gần nhau bằng search/replace.
- Chỉ đánh dấu candidate migration; không xóa literal ngoài phạm vi.

### 2.2. Typography inventory

- 658 khai báo `font-size`.
- 75 giá trị `font-size` duy nhất.
- Giá trị phổ biến: 12px (119), 11px (90), 13px (66), 10px (57),
  14px (39), 9px (35).
- Font weight tập trung tại 800 (99), 700 (72), 900 (71).
- Font chính là Be Vietnam Pro; Georgia chỉ dùng tại một số display/live
  treatment.

| Kiểu hiện tại | Số nơi dùng/độ phổ biến | Vai trò | Vấn đề | Foundation đề xuất |
| --- | ---: | --- | --- | --- |
| `clamp(40px, 5vw, 68px)` và biến thể | Ít | Display/hero | Nhiều scale riêng | `.sgdg-text-display` |
| 27–42px | 31+ | Page/price/countdown | Vai trò bị trộn | Page title, price, countdown |
| 18–24px | 57+ | Section/card title | Chưa có semantic name | Section/card title |
| 14–17px | 73+ | Body/button | Không đồng nhất | Body, body-small |
| 11–13px | 275 | Label/caption/table | Dễ dùng sai ngữ cảnh | Label, caption |
| 7–10px | 99+ | Dense metadata | Có rủi ro accessibility | Không migrate; audit theo màn |
| 700/800/900 | 242 | Emphasis | Dùng lẫn semantic level | Bold/extrabold/black aliases |
| Numeric không thống nhất | Nhiều | Price/countdown/metric | Có thể nhảy ngang | Numeric family + tabular nums |

Scale mới được định nghĩa trong `tokens.css`; utilities nằm tại
`typography.css`. Phase 1 không thay 658 declaration hiện tại.

### 2.3. Status inventory

Số file có status liên quan trong frontend:

| State | Số file | Ghi chú trước migration |
| --- | ---: | --- |
| `UPCOMING` | 1 | Chỉ tồn tại nội bộ trong `AuctionStatus` |
| `REGISTRATION_OPEN` | 10 | Mapping lặp tại catalog/detail/admin |
| `LIVE` | 30 | Mapping nhiều nhất; domain và presentation trộn |
| `ENDING_SOON` | 0 | Được suy ra bằng tên `ENDING` cục bộ |
| `EXTENDED` | 0 | Chưa có display model |
| `PAUSED` | 12 | Tone/CTA chưa nhất quán |
| `RECONNECTING` | 2 | Presentation state nằm ngoài lifecycle |
| `CLOSED` | 21 | Có nơi đồng nhất với completed |
| `COMPLETED` | 18 | Có nơi hiển thị như closed |
| `CANCELLED` | 10 | Label tương đối nhất quán |

Nguồn lặp chính trước Phase 1:

- `AuctionStatus.tsx`: derivation + label + tone + countdown.
- `AuctionsPage.tsx`: filter label + CTA mapping.
- `AuctionDetailPage.tsx`: scenario label + CTA mapping.
- `AuctionResultPage.tsx`: Candidate/Final Winner wording.
- Admin/operations: mapping nghiệp vụ riêng, chưa migrate trong Phase 1.

## 3. Token architecture

### 3.1. Primitive colors

Các family được dùng:

- Orange: nhận diện SGDG và live energy.
- Amber: warning.
- Red: danger/critical.
- Green: success/trust.
- Neutral: text và neutral surface.
- Cream: warm page/card surfaces.
- Brown: border, shadow và dark competitive surface.

Không tạo đầy đủ mọi cấp màu; chỉ cấp có use case hiện tại hoặc semantic
consumer được định nghĩa.

### 3.2. Semantic colors

Các nhóm semantic:

- Brand: `--sgdg-color-brand-*`.
- Live: `--sgdg-color-live-*`, ember, ending và critical ending.
- Text: primary, secondary, muted, inverse, link, live, warning, danger,
  success.
- Surface: page, card, elevated, muted, warm, live, live-dark, overlay.
- Border: default, subtle, strong, focus, live, warning, danger.
- Feedback: success, warning, danger, info và soft variants.
- Focus: color, width, offset.

Orange sáng dùng cho background/glow/CTA; orange 700/800 dùng cho text nhỏ để
giữ contrast. Không hạ saturation của live state.

### 3.3. Gradients, shadows và glows

Gradient, shadow và glow có namespace riêng. Glow chỉ dành cho live badge,
countdown, bid CTA, current leader và ending-soon. Không áp orange glow lên mọi
card.

### 3.4. Spacing, radius và layout

Spacing scale 4–64px được thêm để dùng dần. Radius giữ 8/10/14/18/24/pill;
không ép mọi component cùng độ bo. Layout tokens giữ container 1440px, gutter,
header height, sidebar width và sticky offset hiện có.

## 4. Typography foundation

- Display và body tiếp tục dùng Be Vietnam Pro với fallback Inter/system.
- Không cài font mới.
- Numeric dùng cùng family để không đổi identity và bật
  `font-variant-numeric: tabular-nums`.
- Semantic utilities:
  `sgdg-text-display`, `sgdg-text-page-title`, `sgdg-text-section-title`,
  `sgdg-text-card-title`, `sgdg-text-body`, `sgdg-text-body-small`,
  `sgdg-text-label`, `sgdg-text-caption`, `sgdg-text-price`,
  `sgdg-text-countdown`, `sgdg-text-metric`.
- Không uppercase đoạn văn tiếng Việt.
- Letter-spacing rộng chỉ dành cho label ngắn; không áp cho câu dài.

Phase 1 dùng CSS utilities thay vì React Typography wrapper để giữ semantic
HTML và tránh wrapper thừa.

## 5. Auction display status

Typed source of truth:
`src/domain/auctionDisplay.ts`.

| Display state | Label | Tone | Countdown | Bidding | Consumer Phase 1 |
| --- | --- | --- | --- | --- | --- |
| `UPCOMING` | Sắp diễn ra | neutral | Có | Không | AuctionStatus/Card/Detail |
| `REGISTRATION_OPEN` | Đang mở đăng ký | brand | Có | Không | AuctionStatus/Card/Listing/Detail |
| `LIVE` | Đang diễn ra | live | Có | Có | AuctionStatus/Card |
| `ENDING_SOON` | Sắp kết thúc | ending | Có | Có | AuctionStatus/Card |
| `EXTENDED` | Đã gia hạn | live-attention | Có | Có | Config/API sẵn sàng |
| `PAUSED` | Tạm dừng | warning | Không | Không | AuctionStatus/Detail |
| `RECONNECTING` | Đang kết nối lại | warning | Không | Không | Presentation override |
| `CLOSED` | Đã kết thúc | neutral | Không | Không | AuctionStatus/Card/Detail |
| `COMPLETED` | Hoàn tất | success | Không | Không | AuctionStatus/Card |
| `CANCELLED` | Đã hủy | danger | Không | Không | AuctionStatus/Card/Detail |
| `UNKNOWN` | Đang cập nhật | neutral | Không | Không | Safe fallback |

Lifecycle state không bị thay đổi. `ENDING_SOON` và `EXTENDED` là derived
display state; `RECONNECTING` là connection/presentation state.

## 6. CTA label rules

`selectAuctionCta` tách khỏi status config:

- Upcoming/published: Xem chi tiết.
- Registration open: Đăng ký tham gia.
- Registration + deposit pending: Hoàn tất đặt cọc.
- Live + eligible/deposit ready: Vào phòng đấu giá.
- Closed/completed: Xem kết quả.
- Result context: Xem nghĩa vụ khi caller chủ động chọn context.
- Cancelled: không tạo CTA giao dịch.
- Khi caller cung cấp user context, selector xét authentication, eligibility,
  registration status và deposit.

Selector không tự đọc store và không che giấu authoritative business logic.
Scenario-specific blocking tại Auction Detail vẫn nằm tại page trong Phase 1.

## 7. Candidate và Final Winner

Constants chuẩn:

- Current Leader.
- Closing Rank.
- Candidate.
- Final Winner.

Closing Rank/Candidate không được hiển thị thành “Bạn đã thắng” hoặc “Người
chiến thắng”. Auction Result tiếp tục nói rõ snapshot đóng phiên chưa xác nhận
Final Winner.

## 8. Accessibility

- Status luôn có text và `accessibleDescription`, không chỉ dựa vào màu.
- Focus ring giữ orange SGDG với width/offset token hóa.
- Price/countdown/metric dùng tabular numbers.
- Orange 700/800 ưu tiên cho small text trên white/cream; orange 500/600 dành
  cho CTA, accent, background và glow.
- Minimum touch target hiện tại của `.button` giữ 44px.
- Không giảm contrast của muted text.
- `prefers-reduced-motion` hiện hữu tiếp tục được giữ.

## 9. Backward compatibility và migration matrix

| Legacy token/value | New token | Compatibility strategy | Planned removal |
| --- | --- | --- | --- |
| `--sgdg-cream` | `--sgdg-surface-page` | Alias | Sau khi CSS pages migrate |
| `--sgdg-white` | `--sgdg-surface-card`/neutral-0 | Alias | Phase 3+ |
| `--sgdg-charcoal` | `--sgdg-text-primary` | Alias | Phase 3+ |
| `--sgdg-border` | `--sgdg-border-default` | Alias | Phase 3+ |
| `--sgdg-success` | `--sgdg-color-success` | Alias | Phase 3+ |
| `--sgdg-warning` | `--sgdg-color-warning` | Alias | Phase 3+ |
| `--sgdg-danger` | `--sgdg-color-danger` | Alias | Phase 3+ |
| `--sgdg-info` | `--sgdg-color-info` | Alias | Phase 3+ |
| `--sgdg-focus` | `--sgdg-focus-ring-color` | Alias | Phase 2+ |
| `--font-sans` | `--sgdg-font-family-body` | Alias | Phase 3+ |
| `--radius-*` | `--sgdg-radius-*` | Alias | Phase 2/3 |
| `--shadow-*` | `--sgdg-shadow-*` | Alias | Phase 3+ |
| `--container` | `--sgdg-container-max-width` | Alias | Phase 3+ |
| Hard-coded orange/brown/cream | Semantic tokens | Không replace hàng loạt | Theo component migration |

Không có breaking token removal trong Phase 1.

## 10. Visual identity lock

- SGDG giữ orange làm màu chủ lực.
- Live Auction là vùng có cường độ màu cao nhất.
- Ember/hot glow được token hóa nhưng không bị giảm saturation.
- Warm cream surfaces và warm brown border/shadow được giữ.
- Dark competitive surfaces dùng `--sgdg-surface-live-dark`; không chuyển toàn
  site sang black-gold.
- Luxury polish không được triệt tiêu live energy.
- Sotheby’s/Christie’s chỉ là benchmark hierarchy/editorial, không phải palette
  replacement.

Rendered palette, spacing và layout trên các canonical snapshot không đổi.
Status config chuẩn hóa `PAUSED` sang warning và `COMPLETED` sang success cho
những consumer render các state này. Thay đổi nhìn thấy trên baseline là
semantic correction cho `REGISTRATION_OPEN`: card dùng label “Đang mở đăng
ký” và đếm tới hạn đăng ký thay vì hiển thị như “Sắp diễn ra”. Hai visual
baseline Home và Auction Detail đã được kiểm tra diff riêng rồi mới cập nhật;
Catalog, Admin, Finance, CMS và Support giữ nguyên snapshot.

## 11. Không thực hiện trong foundation

- Không migrate hàng loạt raw button/card.
- Không xây shared Dialog/Drawer.
- Không redesign Auction Detail hoặc Live Auction Room.
- Không thay framework CSS.
- Không xử lý bundle splitting.
- Không gom toàn bộ literal color/font-size trong một phase.

## 12. Migration plan

1. Phase 1: token aliases, typography utilities, Badge/AuctionStatus,
   canonical status/CTA consumers.
2. Phase 2+: migrate Button và component primitives theo consumer thật.
3. Phase 3+: migrate Card/surface/border literals theo từng page và gỡ alias
   chỉ khi không còn consumer.
4. Phase 4: connection/user bid/live state model hoàn chỉnh.

Mỗi migration phải chạy unit, E2E và visual target liên quan; không update
snapshot hàng loạt.

## 13. Phase 2 — Shared component foundation

Phase 2 bổ sung các primitive domain-neutral và giữ compatibility với CSS/API
cũ. Chi tiết audit và migration matrix nằm tại
`docs/design-system-component-migration.md`.

### 13.1. Button và ButtonLink

`Button` chỉ render `<button>`; `ButtonLink` chỉ render React Router `<Link>`.
Không bọc button trong anchor và không dùng `navigate()` cho navigation thông
thường.

```tsx
<Button variant="live" loading={submitting} loadingText="Đang gửi bid">
  Đấu giá ngay
</Button>

<ButtonLink to="/auctions/AUC-001/live" variant="live">
  Vào phòng đấu giá
</ButtonLink>
```

Variants: `primary`, `secondary`, `ghost`, `danger`, `link`, `live`. Sizes:
`sm`, `md`, `lg`. Button mặc định `type="button"`; form submit phải khai báo
`type="submit"`. Icon-only button phải có `aria-label`.

Loading khóa interaction, có `aria-busy`, accessible loading text và giữ label
gốc trong layout để hạn chế nhảy chiều rộng. `live` chỉ dùng cho bid/live CTA;
`danger` chỉ dùng cho destructive action thật.

Do:

- dùng `ButtonLink` cho navigation;
- dùng `leftIcon`/`rightIcon` thay vì tự sửa gap;
- giữ label rõ khi disabled/loading.

Don't:

- `<a><button /></a>`;
- dùng live variant cho mọi CTA;
- đổi tab, menu item, radio hoặc toggle thành Button máy móc.

### 13.2. Card composition

`Card` hỗ trợ `div`, `article`, `section` và các variant `default`, `elevated`,
`outlined`, `warm`, `live`, `flat`. `CardHeader`, `CardBody`, `CardFooter` chỉ
quản lý cấu trúc/spacing; domain component tự chọn heading, CTA và status.

AuctionCard compose Card nhưng giữ detail link và CTA là sibling. Không bọc cả
card trong một Link khi bên trong còn action phụ.

### 13.3. Dialog

Dialog sở hữu overlay, `role="dialog"`, `aria-modal`, ID title/description duy
nhất, focus trap, initial focus, Escape, backdrop policy, scroll lock và trả
focus về trigger. `preventClose` khóa Escape/backdrop/close button khi critical
submit đang chạy. Nội dung dài cuộn trong body và footer vẫn tiếp cận được.

Business validation không nằm trong Dialog. UI confirmation của Manual Bid chỉ
xác nhận ý định; kết quả vẫn đi qua simulation/service hiện tại.

### 13.4. Drawer

Drawer dùng cùng focus/keyboard contract với Dialog. Desktop hỗ trợ panel trái
hoặc phải; mobile hỗ trợ `bottom-sheet` hoặc `full-screen`. Body cuộn độc lập,
footer sticky trong grid. AutoBidDrawer compose primitive nhưng giữ nguyên
setup/edit/cancel, validation theo bước giá, privacy note và limit reached.

### 13.5. Feedback State

`FeedbackState` dùng `variant`, không dùng nhiều boolean:

- `loading`, `empty`, `error`, `blocked`;
- `success`, `reconnecting`;
- `auction-closed`, `auction-cancelled`.

Props dùng chung: icon, title, description, primary/secondary action, compact,
full-page và reference ID. Loading/reconnecting/success dùng polite status.
Error chỉ có `role="alert"` khi caller đặt `announce`; lỗi tĩnh không tự
announce. Auction closed/cancelled không suy diễn Final Winner hoặc payment.

Wrappers `LoadingState`, `EmptyState`, `ErrorState`, `BlockedState`,
`SuccessState`, `ReconnectingState`, `AuctionClosedState` và
`AuctionCancelledState` giữ API ngắn cho consumer.

### 13.6. Visual identity lock

Shared components dùng token Phase 1, không thêm token hoặc dependency. Brand
orange `#f4510b`, live gradient/glow, warm cream, dark competitive surface và Be
Vietnam Pro không đổi. Compatibility stylesheet chỉ giữ spacing domain của các
consumer đã migrate; primitive vẫn sở hữu focus, overlay và disabled behavior.

### 13.7. Information hierarchy và primary action

Mỗi decision context (page hero, result hero hoặc AuctionCard) có tối đa một
CTA dùng visual `primary`. Action navigation/support như xem chi tiết, chia sẻ,
quy tắc và lịch sử dùng `secondary`, `ghost`, `link` hoặc text link. Lifecycle,
eligibility, registration và deposit quyết định CTA; visual prominence không
được dùng để bypass business gate.

Thứ tự mặc định của auction decision block là identity/status → lifecycle price
→ countdown/time → eligibility/outcome → primary action → supporting metadata.
Lifecycle có thể bỏ một bước không áp dụng, nhưng metadata không được chen giữa
title và price. Chi tiết và bằng chứng của bốn màn hình canonical nằm tại
`docs/phase3-information-hierarchy.md`.

### 13.8. Live countdown dial

Phòng đấu giá live dùng `AuctionCountdownDial` làm countdown hero: mặt đồng hồ
tối, vòng kim loại/cam cháy, timer tabular, LIVE pill và thời điểm kết thúc nằm
trong cùng card. Component không dùng ảnh nền tĩnh; số đếm, accessible timer và
reduced-motion vẫn là dữ liệu/behavior thật.

Các surface nhỏ hơn (Auction Detail, Landing live showcase và AuctionCard live)
chỉ dùng treatment gọn gồm dark competitive surface, ember ring/glow và chữ
trắng. Không nhúng nguyên countdown hero lớn vào card hoặc làm metadata cạnh
tranh với giá/CTA.
