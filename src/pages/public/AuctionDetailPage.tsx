import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Expand,
  Eye,
  FileText,
  Flame,
  Gavel,
  Heart,
  Image as ImageIcon,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AuctionCard } from "../../components/auction/AuctionCard";
import { AuctionStatus } from "../../components/auction/AuctionStatus";
import {
  Button,
  ButtonLink,
} from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/feedback/States";
import {
  getAuctionDisplayStatusConfig,
  type AuctionDisplayStatus,
} from "../../domain/auctionDisplay";
import {
  catalogAuctions,
  type Auction,
} from "../../services/mock/auctionService";
import { formatDuration, useDemoClock } from "../../hooks/useDemoClock";
import "../../styles/auction-detail.css";
import { formatMoney } from "../../utils/format";

type TabId = "overview" | "asset" | "rules" | "timeline";
type Scenario =
  | "live"
  | "registration-open"
  | "registration-closed"
  | "waiting"
  | "paused"
  | "closing"
  | "closed"
  | "cancelled"
  | "restricted";

interface DetailImage {
  src: string;
  alt: string;
}

const tabs: Array<[TabId, string]> = [
  ["overview", "Tổng quan"],
  ["asset", "Tài sản"],
  ["rules", "Quy tắc đấu giá"],
  ["timeline", "Lịch trình"],
];

const detailDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));

function scenarioAuction(auction: Auction, scenario: Scenario | null): Auction {
  const status =
    scenario === "registration-open"
      ? "REGISTRATION_OPEN"
      : scenario === "registration-closed"
        ? "REGISTRATION_CLOSED"
        : scenario === "waiting"
          ? "PUBLISHED"
          : scenario === "paused"
            ? "PAUSED"
            : scenario === "closed"
              ? "CLOSED"
              : scenario === "cancelled"
                ? "CANCELLED"
                : auction.status;

  return {
    ...auction,
    status,
    cancellationNotice:
      scenario === "cancelled"
        ? "Phiên được hủy trước giờ mở do cập nhật hồ sơ tài sản."
        : auction.cancellationNotice,
  };
}

function buildGallery(auction: Auction): DetailImage[] {
  if (auction.id === "rolex-126610lv") {
    return [
      {
        src: auction.image,
        alt: `${auction.assetName} - ảnh chính`,
      },
      {
        src: "/assets/featured-rolex-angle-hd.png",
        alt: `${auction.assetName} - góc nghiêng`,
      },
    ];
  }

  return [
    {
      src: auction.image,
      alt: `${auction.assetName} - ảnh chính`,
    },
  ];
}

function brandFromName(name: string) {
  const words = name.split(" ").filter(Boolean);
  return words.slice(0, Math.min(2, words.length)).join(" ");
}

function getAssetSpecs(auction: Auction): Array<[string, string]> {
  const shared: Array<[string, string]> = [
    ["Danh mục", auction.category],
    ["Mã đấu giá", auction.code],
    ["Khu vực", auction.region],
    ["Giá khởi điểm", formatMoney(auction.startPrice)],
  ];

  const categorySpecs: Record<string, Array<[string, string]>> = {
    "Đồng hồ": [
      ["Thương hiệu / dòng", brandFromName(auction.assetName)],
      ["Tên sản phẩm", auction.assetName],
      ["Tình trạng", "Đã kiểm định, vận hành ổn định"],
      ["Phụ kiện", "Hộp, thẻ và biên bản kiểm tra nếu có"],
    ],
    "Trang sức": [
      ["Loại tài sản", auction.assetName],
      ["Chứng thư", "Có chứng thư thẩm định và thông tin vật liệu"],
      ["Tình trạng", "Đã kiểm tra bề mặt, khóa cài và viên chủ"],
      ["Bảo quản", "Niêm phong trong hộp trưng bày an toàn"],
    ],
    "Điện thoại": [
      ["Model", auction.assetName],
      ["Tình trạng máy", "Đã kiểm tra ngoại hình, màn hình và chức năng"],
      ["Hồ sơ thiết bị", "Có số series/IMEI tham chiếu"],
      ["Phụ kiện", "Bộ phụ kiện theo tình trạng công bố"],
    ],
    "Xe cộ": [
      ["Dòng xe", auction.assetName],
      ["Hồ sơ pháp lý", "Có hồ sơ đăng ký và lịch sử kiểm tra"],
      ["Tình trạng", "Đã kiểm tra ngoại thất, nội thất và vận hành"],
      ["Bàn giao", "Theo quy trình xác nhận sau phiên"],
    ],
    "Nghệ thuật": [
      ["Tác phẩm", auction.assetName],
      ["Chất liệu", "Theo hồ sơ tác phẩm và biên bản thẩm định"],
      ["Nguồn gốc", "Có hồ sơ sở hữu/nguồn gốc tham chiếu"],
      ["Tình trạng", "Đã kiểm tra bề mặt, khung và bảo quản"],
    ],
    "Đồ cổ": [
      ["Hiện vật", auction.assetName],
      ["Niên đại", "Theo hồ sơ giám định tham chiếu"],
      ["Tình trạng", "Đã đánh giá dấu vết thời gian và phục chế"],
      ["Nguồn gốc", "Có biên bản xác minh nguồn gốc"],
    ],
    "Thời trang": [
      ["Mẫu sản phẩm", auction.assetName],
      ["Chất liệu", "Theo hồ sơ công bố của phiên"],
      ["Tình trạng", "Đã kiểm tra bề mặt, form dáng và phụ kiện"],
      ["Phụ kiện", "Túi/hộp/thẻ đi kèm nếu có"],
    ],
    "Đồ sưu tầm": [
      ["Vật phẩm", auction.assetName],
      ["Phiên bản", "Theo thông tin công bố của phiên"],
      ["Tình trạng", "Đã kiểm tra độ nguyên bản và bảo quản"],
      ["Nguồn gốc", "Có hồ sơ sưu tầm tham chiếu"],
    ],
    "Bất động sản": [
      ["Tài sản", auction.assetName],
      ["Vị trí", auction.region],
      ["Pháp lý", "Hồ sơ pháp lý được rà soát trước khi công bố"],
      ["Bàn giao", "Theo quy trình xác nhận sau đấu giá"],
    ],
  };

  return [
    ...(categorySpecs[auction.category] ?? [
      ["Tên tài sản", auction.assetName],
      ["Tình trạng", "Đã thẩm định theo hồ sơ công bố"],
      ["Nguồn gốc", "Có thông tin nguồn gốc tham chiếu"],
      ["Bàn giao", "Theo quy trình sau phiên"],
    ]),
    ...shared,
    ["Bước giá tối thiểu", formatMoney(auction.minimumIncrement)],
    [
      "Hồ sơ tham gia",
      auction.eligible ? "Đủ điều kiện công bố" : "Đang chờ rà soát bổ sung",
    ],
  ];
}

function getAssetNote(auction: Auction) {
  const notes: Record<string, string> = {
    "Đồng hồ":
      "Ảnh, số series và tình trạng vận hành được đối chiếu trước khi công bố.",
    "Trang sức":
      "Chứng thư, vật liệu và tình trạng bề mặt được kiểm tra trước phiên.",
    "Điện thoại":
      "Thiết bị được đối chiếu số series/IMEI và kiểm tra chức năng chính.",
    "Xe cộ": "Hồ sơ xe và tình trạng vận hành được rà soát trước khi mở phiên.",
    "Nghệ thuật":
      "Hồ sơ tác phẩm, chất liệu và tình trạng bảo quản được ghi nhận.",
    "Đồ cổ":
      "Hiện vật được kiểm tra niên đại tham chiếu, nguồn gốc và bảo quản.",
    "Thời trang":
      "Form dáng, chất liệu, phụ kiện và tình trạng sử dụng được kiểm tra.",
    "Đồ sưu tầm":
      "Độ nguyên bản, phiên bản và nguồn gốc sưu tầm được đối chiếu.",
    "Bất động sản":
      "Vị trí, pháp lý và thông tin bàn giao được rà soát trước phiên.",
  };

  return notes[auction.category] ?? "Hồ sơ tài sản được xác thực trước phiên.";
}

function getOverviewCopy(auction: Auction) {
  return `${auction.assetName} thuộc danh mục ${auction.category.toLowerCase()} và được trình bày cùng ảnh, mô tả, giá khởi điểm, bước giá và hồ sơ tham chiếu riêng của tài sản. Toàn bộ thông tin trên trang là projection frontend phục vụ trải nghiệm tham khảo.`;
}

function getPrimaryAction(auction: Auction, isLive: boolean) {
  if (isLive) {
    return {
      label: "Vào phòng đấu giá",
      href: `/auctions/${auction.id}/live`,
    };
  }
  if (auction.status === "REGISTRATION_OPEN") {
    return {
      label: "Đăng ký tham gia",
      href: `/auctions/${auction.id}/register`,
    };
  }
  if (auction.status === "CLOSED" || auction.status === "COMPLETED") {
    return {
      label: "Xem kết quả",
      href: `/auctions/${auction.id}/result`,
    };
  }
  return null;
}

function getBlockedReason(auction: Auction, scenario: Scenario | null) {
  if (scenario === "paused") {
    return "Phiên đang được tạm dừng. Bid mới chưa được xử lý.";
  }
  if (scenario === "closing") {
    return "Phiên đang được chốt theo quy tắc công bố.";
  }
  if (scenario === "registration-closed") {
    return "Thời hạn đăng ký cho phiên này đã kết thúc.";
  }
  if (scenario === "restricted") {
    return "Bạn chưa có quyền truy cập nội dung chi tiết của phiên này.";
  }
  if (scenario === "cancelled") {
    return auction.cancellationNotice ?? "Phiên đấu giá đã hủy.";
  }
  return "";
}

function DetailStatus({
  auction,
  scenario,
}: {
  auction: Auction;
  scenario: Scenario | null;
}) {
  if (!scenario || scenario === "live") {
    return <AuctionStatus auction={auction} catalog compact />;
  }

  const displayStatusByScenario: Partial<
    Record<Exclude<Scenario, "live">, AuctionDisplayStatus>
  > = {
    "registration-open": "REGISTRATION_OPEN",
    waiting: "UPCOMING",
    paused: "PAUSED",
    closed: "CLOSED",
    cancelled: "CANCELLED",
  };
  const scenarioLabels: Partial<Record<Exclude<Scenario, "live">, string>> = {
    "registration-closed": "ĐÃ ĐÓNG ĐĂNG KÝ",
    closing: "ĐANG CHỐT PHIÊN",
    restricted: "HẠN CHẾ TRUY CẬP",
  };
  const displayStatus = displayStatusByScenario[scenario];
  const label = displayStatus
    ? getAuctionDisplayStatusConfig(displayStatus).label.toLocaleUpperCase(
        "vi-VN",
      )
    : scenarioLabels[scenario];

  return (
    <span className={`detail-status-pill ${scenario}`}>
      <Flame aria-hidden="true" />
      {label}
    </span>
  );
}

function DetailTabs({
  tab,
  onChange,
}: {
  tab: TabId;
  onChange: (tab: TabId) => void;
}) {
  const handleKeys = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : (index - 1 + tabs.length) % tabs.length;
    onChange(tabs[next][0]);
    document.getElementById(`detail-tab-${tabs[next][0]}`)?.focus();
  };

  return (
    <div
      className="detail-tabs"
      role="tablist"
      aria-label="Nội dung phiên đấu giá"
    >
      {tabs.map(([id, label], index) => (
        <button
          key={id}
          id={`detail-tab-${id}`}
          role="tab"
          aria-selected={tab === id}
          aria-controls={`detail-panel-${id}`}
          tabIndex={tab === id ? 0 : -1}
          className={tab === id ? "active" : ""}
          onClick={() => onChange(id)}
          onKeyDown={(event) => handleKeys(event, index)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function TabContent({
  tab,
  auction,
  openRules,
}: {
  tab: TabId;
  auction: Auction;
  openRules: () => void;
}) {
  if (tab === "asset") {
    return (
      <section
        className="detail-tab-content spec-content"
        id="detail-panel-asset"
        role="tabpanel"
        aria-labelledby="detail-tab-asset"
      >
        <div>
          <span className="eyebrow">HỒ SƠ TÀI SẢN</span>
          <h2>Thông tin {auction.assetName}</h2>
          <dl className="detail-spec-grid">
            {getAssetSpecs(auction).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <aside className="detail-side-note">
          <ShieldCheck />
          <h3>Đã xác thực hồ sơ</h3>
          <p>{getAssetNote(auction)}</p>
        </aside>
      </section>
    );
  }

  if (tab === "rules") {
    return (
      <section
        className="detail-tab-content rules-content"
        id="detail-panel-rules"
        role="tabpanel"
        aria-labelledby="detail-tab-rules"
      >
        <div>
          <span className="eyebrow">QUY TẮC PHIÊN</span>
          <h2>Phiên bản QD-2026.07</h2>
          <p>
            Snapshot quy tắc chỉ đọc, áp dụng cho phiên đang công khai của{" "}
            {auction.assetName}.
          </p>
          <ul>
            <li>
              Giá khởi điểm: <b>{formatMoney(auction.startPrice)}</b>
            </li>
            <li>
              Bước giá tối thiểu: <b>{formatMoney(auction.minimumIncrement)}</b>
            </li>
            <li>
              Gia hạn giả lập khi có bid hợp lệ sát giờ chốt, nếu phiên đang
              diễn ra.
            </li>
            <li>
              Ứng viên hợp lệ tiếp tục sang Financial Mock sau khi phiên kết
              thúc.
            </li>
          </ul>
          <Button
            variant="secondary"
            leftIcon={<FileText />}
            onClick={openRules}
          >
            Xem toàn bộ quy tắc
          </Button>
        </div>
        <aside className="detail-side-note">
          <Gavel />
          <h3>Quy tắc đã khóa</h3>
          <p>
            Snapshot theo mã {auction.code} · Nguồn: Product Management Mock.
          </p>
        </aside>
      </section>
    );
  }

  if (tab === "timeline") {
    return (
      <section
        className="detail-tab-content timeline-content"
        id="detail-panel-timeline"
        role="tabpanel"
        aria-labelledby="detail-tab-timeline"
      >
        <div>
          <span className="eyebrow">LỊCH TRÌNH PHIÊN</span>
          <h2>Các mốc công khai</h2>
          <ol className="detail-timeline">
            <li>
              <time>{detailDate(auction.registrationDeadline)}</time>
              <div>
                <b>Hạn đăng ký</b>
                <span>Hồ sơ tham gia được tiếp nhận theo quy tắc phiên</span>
              </div>
            </li>
            <li>
              <time>{detailDate(auction.startsAt)}</time>
              <div>
                <b>Mở phiên</b>
                <span>{auction.assetName} bắt đầu nhận tương tác hợp lệ</span>
              </div>
            </li>
            <li className="current">
              <time>{detailDate(auction.endsAt)}</time>
              <div>
                <b>Chốt phiên dự kiến</b>
                <span>
                  Thời điểm có thể thay đổi theo quy tắc gia hạn đã công bố
                </span>
              </div>
            </li>
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section
      className="detail-tab-content overview-content"
      id="detail-panel-overview"
      role="tabpanel"
      aria-labelledby="detail-tab-overview"
    >
      <div>
        <span className="eyebrow">TỔNG QUAN</span>
        <h2>{auction.assetName}</h2>
        <p>{auction.description}</p>
        <p>{getOverviewCopy(auction)}</p>
        <div className="detail-highlight-list">
          <span>
            <CheckCircle2 /> Tài sản đã được thẩm định tình trạng
          </span>
          <span>
            <CheckCircle2 /> Hồ sơ nguồn gốc tham chiếu
          </span>
          <span>
            <CheckCircle2 /> Quy tắc phiên minh bạch
          </span>
        </div>
      </div>
      <aside className="detail-side-note">
        <ImageIcon />
        <h3>Điểm nổi bật</h3>
        <p>{getAssetNote(auction)}</p>
      </aside>
    </section>
  );
}

export function AuctionDetailPage() {
  const { auctionId } = useParams();
  const now = useDemoClock();
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceAuction = catalogAuctions.find(
    (auction) => auction.id === auctionId,
  );
  const scenario = searchParams.get("scenario") as Scenario | null;
  const projection = searchParams.get("projection");
  const auction = sourceAuction
    ? scenarioAuction(sourceAuction, scenario)
    : undefined;
  const detailGallery = auction ? buildGallery(auction) : [];
  const [gallerySelection, setGallerySelection] = useState<{
    auctionId: string | undefined;
    index: number;
  }>({ auctionId, index: 0 });
  const activeImage =
    gallerySelection.auctionId === auctionId &&
    gallerySelection.index < detailGallery.length
      ? gallerySelection.index
      : 0;
  const [zoomOpen, setZoomOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [toast, setToast] = useState(false);
  const [showStickyPrimary, setShowStickyPrimary] = useState(false);
  const primaryActionAnchorRef = useRef<HTMLDivElement>(null);
  const tab = (searchParams.get("tab") as TabId) || "overview";
  const safeTab = tabs.some(([id]) => id === tab) ? tab : "overview";
  const actionIsLive =
    auction?.status === "LIVE" && scenario !== "closing";
  const actionIsBlocked = [
    "paused",
    "closing",
    "cancelled",
    "restricted",
    "registration-closed",
  ].includes(scenario ?? "");
  const primaryAction = auction
    ? getPrimaryAction(auction, actionIsLive)
    : null;
  const primaryActionHref = primaryAction?.href;

  useEffect(() => {
    if (!zoomOpen && !rulesOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setZoomOpen(false);
        setRulesOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [rulesOpen, zoomOpen]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(false), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const anchor = primaryActionAnchorRef.current;
    const mobile = window.matchMedia("(max-width: 600px)").matches;

    if (!anchor || !primaryActionHref || actionIsBlocked || !mobile) {
      setShowStickyPrimary(false);
      return;
    }

    let anchorVisible = false;
    const syncStickyState = () =>
      setShowStickyPrimary(window.scrollY > 80 && !anchorVisible);
    const observer = new IntersectionObserver(([entry]) => {
      anchorVisible = entry.isIntersecting;
      syncStickyState();
    }, { threshold: 0.2 });
    observer.observe(anchor);
    window.addEventListener("scroll", syncStickyState, { passive: true });
    syncStickyState();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", syncStickyState);
    };
  }, [actionIsBlocked, primaryActionHref]);

  const sameCategory = auction
    ? catalogAuctions.filter(
        (item) => item.id !== auction.id && item.category === auction.category,
      )
    : [];
  const fallback = auction
    ? catalogAuctions.filter((item) => item.id !== auction.id)
    : [];
  const related = (sameCategory.length >= 3 ? sameCategory : fallback).slice(
    0,
    3,
  );

  const setTab = (next: TabId) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params);
  };

  const share = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
    } finally {
      setToast(true);
    }
  };

  if (projection === "loading")
    return (
      <div className="auction-detail-page detail-loading">
        <LoadingState
          label="Đang tải thông tin phiên đấu giá"
          description="Hệ thống đang chuẩn bị projection chi tiết mô phỏng."
          fullPage
        />
      </div>
    );

  if (!auction) {
    return (
      <div className="auction-detail-page">
        <EmptyState
          title="Không tìm thấy phiên đấu giá"
          description="Phiên này không tồn tại hoặc không còn được công khai."
          primaryAction={
            <ButtonLink to="/auctions">
              Quay lại danh sách phiên đấu giá
            </ButtonLink>
          }
        />
      </div>
    );
  }

  if (projection === "error") {
    return (
      <div className="auction-detail-page">
        <div className="container detail-error">
          <ErrorState
            title="Chưa thể tải thông tin phiên đấu giá"
            description="Dữ liệu trình bày mô phỏng tạm thời chưa sẵn sàng. Vui lòng thử lại."
            retry={() => {
              const params = new URLSearchParams(searchParams);
              params.delete("projection");
              setSearchParams(params);
            }}
          />
          <ButtonLink to="/auctions" variant="ghost">
            Quay lại danh sách phiên
          </ButtonLink>
        </div>
      </div>
    );
  }

  const activeDetailImage = detailGallery[activeImage] ?? {
    src: auction.image,
    alt: `${auction.assetName} - ảnh chính`,
  };
  const isLive = auction.status === "LIVE" && scenario !== "closing";
  const transactionBlocked = [
    "paused",
    "closing",
    "cancelled",
    "restricted",
    "registration-closed",
  ].includes(scenario ?? "");
  const primary = primaryAction;
  const blockedReason = getBlockedReason(auction, scenario);
  const isClosed =
    auction.status === "CLOSED" || auction.status === "COMPLETED";
  const usesLatestPrice =
    isLive || isClosed || scenario === "paused" || scenario === "closing";
  const priceLabel = isLive
    ? "Giá chính thức hiện tại"
    : isClosed
      ? "Giá đóng phiên"
      : scenario === "paused" || scenario === "closing"
        ? "Giá gần nhất"
        : "Giá khởi điểm";
  const importantTime =
    scenario === "cancelled"
      ? {
          title: "Trạng thái thời gian",
          value: "Phiên không còn hiệu lực",
          caption: "Không hiển thị countdown cho phiên đã hủy",
        }
      : scenario === "paused"
        ? {
            title: "Phiên đang tạm dừng",
            value: "Chờ thông báo tiếp theo",
            caption: `Mốc kết thúc dự kiến ${detailDate(auction.endsAt)} (GMT+7)`,
          }
        : scenario === "closing"
          ? {
              title: "Phiên đang được chốt",
              value: "Đang xác nhận kết quả",
              caption: `Mốc chốt dự kiến ${detailDate(auction.endsAt)} (GMT+7)`,
            }
          : scenario === "registration-closed"
            ? {
                title: "Đăng ký đã kết thúc",
                value: detailDate(auction.registrationDeadline),
                caption: "Không tiếp nhận hồ sơ đăng ký mới",
              }
            : auction.status === "REGISTRATION_OPEN"
              ? {
                  title: "Hạn đăng ký còn",
                  value: formatDuration(auction.registrationDeadline, now),
                  caption: `Hạn đăng ký ${detailDate(auction.registrationDeadline)} (GMT+7)`,
                }
              : isLive
                ? {
                    title: "Phiên kết thúc sau",
                    value: formatDuration(auction.endsAt, now),
                    caption: `Kết thúc lúc ${detailDate(auction.endsAt)} (GMT+7)`,
                  }
                : isClosed
                  ? {
                      title: "Phiên đã kết thúc",
                      value: detailDate(auction.endsAt),
                      caption: "Thời điểm đóng phiên (GMT+7)",
                    }
                  : {
                      title: "Phiên bắt đầu sau",
                      value: formatDuration(auction.startsAt, now),
                      caption: `Bắt đầu lúc ${detailDate(auction.startsAt)} (GMT+7)`,
                    };
  const eligibilityTitle = auction.eligible
    ? "Đủ điều kiện tham gia"
    : "Cần hoàn tất điều kiện tham gia";
  const eligibilityDescription = auction.eligible
    ? isLive
      ? "Hồ sơ hợp lệ. Tiền cọc được kiểm tra trước khi hệ thống nhận giá đấu."
      : "Hồ sơ hiện đáp ứng điều kiện công bố của phiên."
    : "Hồ sơ đang chờ rà soát; quyền tham gia sẽ được xác nhận ở bước tiếp theo.";

  return (
    <div className="auction-detail-page">
      <div className="container detail-breadcrumb">
        <nav aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight />
          <Link to="/auctions">Phiên đấu giá</Link>
          <ChevronRight />
          <span>{auction.assetName}</span>
        </nav>
      </div>

      <section className="container detail-hero-grid">
        <div className="detail-gallery">
          <div className="detail-main-image">
            <img src={activeDetailImage.src} alt={activeDetailImage.alt} />
            <span className="detail-image-count" aria-label={`${activeImage + 1} trên ${detailGallery.length} ảnh`}>
              {activeImage + 1}/{detailGallery.length}
            </span>
            <div className="detail-image-actions">
              <button
                aria-label={
                  wishlisted
                    ? "Bỏ khỏi danh sách theo dõi"
                    : "Thêm vào danh sách theo dõi"
                }
                aria-pressed={wishlisted}
                onClick={() => setWishlisted((value) => !value)}
              >
                <Heart fill={wishlisted ? "currentColor" : "none"} />
              </button>
              <button
                aria-label="Phóng to ảnh tài sản"
                onClick={() => setZoomOpen(true)}
              >
                <Expand />
              </button>
            </div>
          </div>

          <div className="detail-thumbnails" aria-label="Thư viện ảnh">
            {detailGallery.map((image, index) => (
              <button
                key={`${image.src}-${index}`}
                className={index === activeImage ? "active" : ""}
                aria-label={`Xem ${image.alt}`}
                aria-pressed={index === activeImage}
                onClick={() => setGallerySelection({ auctionId, index })}
              >
                <img src={image.src} alt="" />
              </button>
            ))}
          </div>
        </div>

        <aside className="detail-summary-card">
          <div className="detail-summary-status">
            <DetailStatus auction={auction} scenario={scenario} />
          </div>
          <div className="detail-summary-meta">
            <span>{auction.category}</span>
            <span>{auction.code}</span>
          </div>
          <h1>{auction.assetName}</h1>
          <div className="detail-decision-group">
            <div
              className="detail-price"
              aria-label={`${priceLabel}: ${formatMoney(
                usesLatestPrice ? auction.currentPrice : auction.startPrice,
              )}`}
            >
              <span>{priceLabel}</span>
              <strong>
                {formatMoney(
                  usesLatestPrice ? auction.currentPrice : auction.startPrice,
                )}
              </strong>
              <div>
                <span>Giá khởi điểm: {formatMoney(auction.startPrice)}</span>
                <span>Bước giá: {formatMoney(auction.minimumIncrement)}</span>
              </div>
            </div>
            <div
              className={`detail-countdown ${isLive ? "live" : ""} ${
                scenario === "cancelled" || scenario === "paused"
                  ? "is-inactive"
                  : ""
              }`}
              role={isLive ? "timer" : undefined}
              aria-label={`${importantTime.title}: ${importantTime.value}`}
            >
              {isLive ? (
                <Flame aria-hidden="true" />
              ) : (
                <Clock3 aria-hidden="true" />
              )}
              <div>
                <span>{importantTime.title}</span>
                <strong>{importantTime.value}</strong>
                <small>{importantTime.caption}</small>
              </div>
            </div>
          </div>
          <div
            className={`detail-eligibility ${
              auction.eligible ? "is-eligible" : "needs-action"
            }`}
          >
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>{eligibilityTitle}</strong>
              <span>{eligibilityDescription}</span>
            </div>
          </div>
          {transactionBlocked ? (
            <div className="detail-blocked">
              <Button variant="secondary" disabled>
                {scenario === "cancelled"
                  ? "Phiên đã hủy"
                  : scenario === "closing"
                    ? "Phiên đang được chốt"
                    : "Tạm thời chưa thể đặt giá"}
              </Button>
              <p>{blockedReason}</p>
            </div>
          ) : primary ? (
            <div className="detail-actions">
              <div
                ref={primaryActionAnchorRef}
                className="detail-primary-action-anchor"
              >
                {!showStickyPrimary && (
                  <ButtonLink
                    to={primary.href}
                    leftIcon={<Gavel />}
                    fullWidth
                  >
                    {primary.label}
                  </ButtonLink>
                )}
              </div>
              <Button
                variant="secondary"
                onClick={() => setRulesOpen(true)}
              >
                Xem quy tắc phiên
              </Button>
            </div>
          ) : (
            <div className="detail-actions">
              <Button variant="secondary" disabled>
                Chưa đến giờ bắt đầu
              </Button>
            </div>
          )}
          <button className="detail-share" onClick={share}>
            <Copy /> Chia sẻ phiên
          </button>
          <div className="detail-metrics" aria-label="Chỉ số quan tâm phiên">
            <span>
              <Users /> {auction.participantCount} người tham gia
            </span>
            <span>
              <Eye /> {auction.watcherCount} lượt theo dõi
            </span>
            <span>
              <Activity /> {auction.heatScore}% quan tâm
            </span>
          </div>
          <div className="detail-trust">
            <span>
              <ShieldCheck /> Tài sản đã được thẩm định
            </span>
            <span>
              <Gavel /> Quy tắc phiên đã được khóa
            </span>
            <span>
              <CheckCircle2 /> Mô phỏng minh bạch, chỉ tham khảo
            </span>
          </div>
        </aside>
      </section>

      {primary && !transactionBlocked && showStickyPrimary && (
        <div className="detail-mobile-sticky-action">
          <ButtonLink
            to={primary.href}
            leftIcon={<Gavel />}
            fullWidth
          >
            {primary.label}
          </ButtonLink>
        </div>
      )}

      <section className="container detail-content-area">
        <DetailTabs tab={safeTab} onChange={setTab} />
        <TabContent
          tab={safeTab}
          auction={auction}
          openRules={() => setRulesOpen(true)}
        />
      </section>

      <section className="container detail-related">
        <div className="detail-related-heading">
          <div>
            <span className="eyebrow">KHÁM PHÁ THÊM</span>
            <h2>Phiên đấu giá liên quan</h2>
          </div>
          <Link to="/auctions">
            Xem tất cả phiên đấu giá <ChevronRight />
          </Link>
        </div>
        <div className="auction-list-grid three detail-related-grid">
          {related.map((item) => (
            <AuctionCard key={item.id} auction={item} />
          ))}
        </div>
      </section>

      {zoomOpen && (
        <div
          className="detail-modal-backdrop"
          role="presentation"
          onMouseDown={() => setZoomOpen(false)}
        >
          <div
            className="detail-zoom-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Ảnh tài sản phóng to"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="detail-modal-close"
              aria-label="Đóng ảnh phóng to"
              autoFocus
              onClick={() => setZoomOpen(false)}
            >
              <X />
            </button>
            <img src={activeDetailImage.src} alt={activeDetailImage.alt} />
          </div>
        </div>
      )}

      <Dialog
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        title="Toàn bộ quy tắc phiên"
        panelClassName="detail-rules-dialog"
        closeLabel="Đóng quy tắc phiên"
      >
        <span className="eyebrow">QD-2026.07 · SNAPSHOT CHỈ ĐỌC</span>
        <p>
          Giá chỉ được ghi nhận theo bước giá hợp lệ của {auction.assetName}. Các
          mốc gia hạn, điều kiện tham gia và xác nhận ứng viên được mô phỏng theo
          fixture cục bộ.
        </p>
        <ul>
          <li>Không hiển thị danh tính người trả giá.</li>
          <li>Không xác nhận người thắng hoặc thanh toán tại trang public.</li>
          <li>Thông tin này là reference mock, không thể chỉnh sửa.</li>
        </ul>
      </Dialog>

      {toast && (
        <div className="detail-toast" role="status">
          Đã sao chép liên kết phiên đấu giá
        </div>
      )}
    </div>
  );
}
