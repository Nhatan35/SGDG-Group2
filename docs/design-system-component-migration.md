# Phase 2 Component Audit & Migration

## 1. Audit trước migration

| Component | API trước Phase 2 | Consumer trước | Custom implementation | Vấn đề |
| --- | --- | ---: | ---: | --- |
| Button | `variant` 4 tone, truyền thẳng native props | 1 component | 283 raw `<button>` | Không loading/size/icon/fullWidth, mặc định type không rõ, Link dùng class thủ công |
| Card | Luôn render `article`, chỉ nhận class/native props | 1 component | 107 card-like container (ước tính regex) | Không variant/slot/semantic element; domain cards không có composition pattern |
| Dialog | Không có shared API | 0 | 15 | Focus trap/return-focus/scroll lock/backdrop policy không đồng nhất |
| Drawer | Không có shared API | 0 | 2 | AutoBid tự fixed-position, chưa focus trap/return-focus |
| State UI | Loading/Empty/Error wrapper tối giản | 6 | Nhiều state domain riêng | Error luôn alert, thiếu action pair/reference/blocked/reconnecting/closed/cancelled |

Raw button được phân loại trước khi chọn migration:

- CTA/navigation/form/bid action: candidate cho Button/ButtonLink;
- tab/menu/radio/toggle/disclosure/pagination/backoffice table action: giữ
  implementation hiện tại nếu semantics hoặc CSS cascade chuyên biệt;
- icon-only: chỉ migrate khi có label và touch target rõ.

Card-like container được phân loại theo auction, information, metric, result,
live activity, dashboard/table và pure layout. Phase 2 chỉ chuyển AuctionCard;
không biến mọi bordered `div` thành Card.

## 2. API sau migration

| Component | API | Compatibility |
| --- | --- | --- |
| Button | 6 variants, 3 sizes, loading/loadingText, fullWidth, left/right icon | Vẫn phát class `.button` và tone legacy |
| ButtonLink | Cùng visual API, render Router Link | Thay Link có `.button` tại consumer canonical |
| Card | `as`, 6 variants, Header/Body/Footer | Vẫn phát `.card`; AuctionCard có spacing compatibility |
| Dialog | controlled open, title/description, size, footer, backdrop/preventClose, initial focus | Không dependency mới |
| Drawer | controlled open, side, mobile presentation, footer, backdrop/preventClose, initial focus | Không dependency mới |
| FeedbackState | discriminated `variant`, actions, compact/fullPage, referenceId, announce | `action` của EmptyState được giữ và đánh dấu deprecated |

## 3. Controlled migration

### Button/ButtonLink

| Area | Raw trước | Đã migrate | Còn lại | Lý do defer |
| --- | ---: | ---: | ---: | --- |
| AuctionCard | 0 button + 1 Link CTA | 1 ButtonLink CTA | 0 | Detail Link và CTA giữ sibling |
| Auction Listing | 10 | 2 + AuctionCard CTA | 8 | Filter, disclosure và pagination giữ semantics/CSS |
| Auction Detail | 10 | 4 button + 3 Link action | 6 | Gallery, tab, share controls là chuyên biệt |
| Auction Result | 0 button + 3 Link CTA | 3 ButtonLink | 0 | Navigation semantics |
| Payment | 5 | 1 button + 1 Link action | 4 | 3 radio buttons + copy action không migrate máy móc |
| Live Auction | 24 | 16 | 8 | Tab/chip và AutoBid trigger ref giữ chuyên biệt |
| AutoBidDrawer | 8 | 7 | 1 | Suggestion chip giữ control chuyên biệt |
| Shared/common selected | 1 | State retry + navigation Link actions | 0 | Raw icon/menu semantics ngoài nhóm selected còn defer |
| Toàn repository (production TSX) | 283 | Giảm ròng 30 raw button | 253 | Backoffice, tab/menu/toggle/editor giữ ngoài Phase 2 |

Số JSX shared Button/ButtonLink production sau migration: 40.

### Card

- `AuctionCard` compose `Card`.
- `FoundationPage` giữ API cũ nhờ class `.card`.
- 106 card-like custom container còn lại (ước tính); không migrate hàng loạt.

### Dialog

| Existing dialog | Shared Dialog | Deferred reason |
| --- | --- | --- |
| Manual Bid | Đã migrate | — |
| Deposit/entry confirmation | Đã migrate | — |
| Auto-Bid cancel | Đã migrate | Dialog lồng trên Drawer, topmost focus trap |
| Auction Detail rules | Đã migrate | Low-risk read-only proof of reuse |
| Auction Detail zoom | Deferred | Image viewer có geometry/gesture riêng |
| Admin/ops/support/handover/account dialogs | Deferred | Workflow/CSS cascade riêng; migrate theo domain |

11 custom dialog semantic markup còn lại.

### Drawer

- AutoBidDrawer đã compose shared Drawer.
- Auto-Bid cancel tách thành shared Dialog, không đổi `onDisable`.
- Audit drawer và registration drawer/modal còn defer vì là backoffice và
  responsive hybrid riêng.

### Feedback State

Áp dụng tại:

- Auction Listing: loading, empty, error;
- Auction Detail: loading, error, not-found;
- Auction Result: missing result;
- Payment: expired/unavailable;
- Account watchlist: empty;
- NotFound và ErrorBoundary giữ wrapper compatibility.

Business-specific state backlog của Phase 9 không được mở rộng trong Phase 2.

## 4. Legacy compatibility

| Legacy API/class | New API | Compatibility | Removal phase |
| --- | --- | --- | --- |
| `.button primary/secondary/ghost/danger` | `Button variant` | Shared Button vẫn phát class cũ | Sau controlled migration |
| Link với `.button` | `ButtonLink` | CSS class cũ vẫn phát | Sau controlled migration |
| Card luôn `article.card` | `Card as/variant` | Default vẫn là article và phát `.card` | Phase 3+ |
| `EmptyState action` | `primaryAction` | Alias có JSDoc deprecated | Phase 3+ |
| Page modal spacing | Shared Dialog + compatibility selectors | Chỉ giữ domain spacing | Khi page CSS migrate |
| AutoBid fixed drawer CSS | Shared Drawer | Class domain giữ content hierarchy | Khi AutoBid style migrate |

Không có breaking change được chủ động tạo trong Phase 2.

## 5. Responsive foundation

Shared primitives dùng token và breakpoint component:

- Button có touch target 44px mặc định, fullWidth, wrap và loading ổn định;
- Dialog giới hạn theo `dvh`, body cuộn, footer stack trên mobile;
- Drawer desktop side panel, mobile bottom sheet/full-screen, body cuộn và
  footer luôn nằm trong viewport grid;
- Card có `min-width: 0`/overflow wrap;
- Feedback actions stack tại mobile.

Đây là responsive foundation ở 390/768/1024/1440, không phải tuyên bố toàn bộ
screen đã hoàn tất Responsive Phase.

## 6. Validation và visual review

- Typecheck, lint, 58/58 unit test, build và 50/50 Playwright E2E đều pass.
- Home, Catalog, Admin, Finance, CMS và Support giữ nguyên snapshot.
- Auction Detail snapshot được xem expected/actual riêng và cập nhật đúng một
  target. Diff 1.025 pixel chỉ nằm tại text/icon raster của hai action đã chuyển
  sang Button/ButtonLink; kích thước, vị trí, hierarchy và palette không đổi.
- Không update hàng loạt snapshot.
- Build tiếp tục có cảnh báo chunk JavaScript lớn hơn 500 kB; đây là debt có
  sẵn và không thuộc scope Phase 2.
