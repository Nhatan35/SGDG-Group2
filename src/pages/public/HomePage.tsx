import {
  ArrowRight,
  Amphora,
  BadgeCheck,
  BadgeDollarSign,
  Car,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Gem,
  Gavel,
  Headphones,
  House,
  PackageOpen,
  Palette,
  Send,
  ShieldCheck,
  Smartphone,
  UserRound,
  Watch,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuctionCard } from "../../components/auction/AuctionCard";
import { AuctionStatus } from "../../components/auction/AuctionStatus";
import { ButtonLink } from "../../components/common/Button";
import { HomeCampaignBanner } from "../../components/home/HomeCampaignBanner";
import { LiveAuctionShowcase } from "../../components/home/LiveAuctionShowcase";
import { auctions } from "../../services/mock/auctionService";
import { formatMoney } from "../../utils/format";

const categories = [
  ["Đồng hồ", Watch],
  ["Trang sức", Gem],
  ["Điện thoại", Smartphone],
  ["Xe cộ", Car],
  ["Nghệ thuật", Palette],
  ["Đồ cổ", Amphora],
  ["Thời trang", CreditCard],
  ["Đồ sưu tầm", PackageOpen],
  ["Bất động sản", House],
] as const;

const spotlightAuctionIds = [
  "rolex-126610lv",
  "patek-nautilus",
  "antique-01",
  "collectible-01",
  "real-estate-01",
];

const spotlightAuctions = spotlightAuctionIds.flatMap((auctionId) => {
  const auction = auctions.find((item) => item.id === auctionId);
  return auction ? [auction] : [];
});

function AuctionExpertIcon({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`home-chat-expert-symbol ${compact ? "compact" : ""}`}
      aria-hidden="true"
    >
      <UserRound className="home-chat-expert-person" />
      <Gavel className="home-chat-expert-gavel" />
      <BadgeCheck className="home-chat-expert-verified" />
    </span>
  );
}

export function HomePage() {
  const [chatOpen, setChatOpen] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightDirection, setSpotlightDirection] = useState<"next" | "prev">(
    "next",
  );
  const [spotlightPaused, setSpotlightPaused] = useState(false);
  const featured = spotlightAuctions[spotlightIndex] ?? auctions[0];

  useEffect(() => {
    if (spotlightPaused || spotlightAuctions.length < 2) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let timer: number | undefined;

    const startAutoPlay = () => {
      if (reducedMotionQuery.matches) return;
      timer = window.setInterval(() => {
        setSpotlightDirection("next");
        setSpotlightIndex((current) =>
          (current + 1) % spotlightAuctions.length,
        );
      }, 5200);
    };

    const handleMotionPreference = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
      startAutoPlay();
    };

    startAutoPlay();
    reducedMotionQuery.addEventListener("change", handleMotionPreference);

    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      reducedMotionQuery.removeEventListener("change", handleMotionPreference);
    };
  }, [spotlightIndex, spotlightPaused]);

  const showPreviousSpotlight = () => {
    setSpotlightDirection("prev");
    setSpotlightIndex(
      (current) =>
        (current - 1 + spotlightAuctions.length) % spotlightAuctions.length,
    );
  };

  const showNextSpotlight = () => {
    setSpotlightDirection("next");
    setSpotlightIndex((current) => (current + 1) % spotlightAuctions.length);
  };

  const showSpotlight = (nextIndex: number) => {
    setSpotlightDirection(nextIndex >= spotlightIndex ? "next" : "prev");
    setSpotlightIndex(nextIndex);
  };

  return (
    <>
      <section className="home-redesign-hero">
        <div className="container home-redesign-grid">
          <div className="home-intro">
            <span className="eyebrow">NỀN TẢNG ĐẤU GIÁ TRỰC TUYẾN</span>
            <h1>
              Đấu giá thông minh
              <br />
              <span>Giá trị xứng tầm</span>
            </h1>
            <p>
              Nền tảng đấu giá trực tuyến minh bạch, nhanh chóng và an toàn cho
              mọi giá trị bạn tìm kiếm.
            </p>
            <form className="home-filter-bar">
              <label>
                Danh mục
                <select aria-label="Danh mục">
                  <option>Tất cả danh mục</option>
                </select>
              </label>
              <label>
                Vị trí
                <select aria-label="Vị trí">
                  <option>Toàn quốc</option>
                </select>
              </label>
              <label>
                Khoảng giá
                <select aria-label="Khoảng giá">
                  <option>Chọn khoảng giá</option>
                </select>
              </label>
              <ButtonLink variant="secondary" to="/auctions">
                Tìm kiếm ngay
              </ButtonLink>
            </form>
            <div className="hero-assurances">
              <span>
                <ShieldCheck />
                100% minh bạch
              </span>
              <span>
                <BadgeCheck />
                Bảo mật tuyệt đối
              </span>
              <span>
                <CreditCard />
                Thanh toán an toàn
              </span>
              <span>
                <Headphones />
                Hỗ trợ 24/7
              </span>
            </div>
          </div>
          <article
            className={`auction-spotlight spotlight-carousel ${spotlightPaused ? "carousel-paused" : ""}`}
            aria-label="Sản phẩm đấu giá nổi bật"
            aria-roledescription="carousel"
            onMouseEnter={() => setSpotlightPaused(true)}
            onMouseLeave={() => setSpotlightPaused(false)}
            onFocus={() => setSpotlightPaused(true)}
            onBlur={(event) => {
              if (
                !event.currentTarget.contains(event.relatedTarget as Node | null)
              ) {
                setSpotlightPaused(false);
              }
            }}
          >
            <div
              key={featured.id}
              className={`spotlight-slide spotlight-slide-${spotlightDirection}`}
              role="group"
              aria-label={`${spotlightIndex + 1} trên ${spotlightAuctions.length}: ${featured.assetName}`}
              aria-live={spotlightPaused ? "polite" : "off"}
            >
              <div className="spotlight-heading">
              <AuctionStatus auction={featured} compact />
              </div>
              <div className="spotlight-content">
              <div className="spotlight-media">
                <img src={featured.image} alt={featured.assetName} />
                <button aria-label="Thêm vào yêu thích">♡</button>
                <div className="spotlight-meta">
                  <span>Tình trạng: Như mới 99%</span>
                  <span>Giao hàng toàn quốc</span>
                  <span className="auction-poster">
                    {featured.postedBy?.type === "MEMBER"
                      ? `Đăng bởi: ${featured.postedBy.name}`
                      : "Sản phẩm của sàn"}
                  </span>
                </div>
              </div>
              <div className="spotlight-summary">
                <h2>{featured.assetName}</h2>
                <span className="auction-code">
                  Mã đấu giá: {featured.code}
                </span>
                <div className="auction-urgency">
                  <p className="countdown-title">
                    Kết thúc sau <span>Sắp chốt phiên</span>
                  </p>
                  <AuctionStatus auction={featured} showBadge={false} />
                </div>
                <p className="price-caption">Giá hiện tại</p>
                <strong
                  aria-label={`Giá hiện tại ${formatMoney(featured.currentPrice)}`}
                >
                  {formatMoney(featured.currentPrice)}
                </strong>
                <div className="bid-activity">
                  <div>
                    <span className="activity-icon">🔥</span>
                    <p>
                      <strong>{featured.acceptedBidCount}</strong> người trả giá
                    </p>
                    <small>Phiên đang rất sôi động</small>
                  </div>
                  <div>
                    <span className="activity-icon">
                      <BadgeDollarSign />
                    </span>
                    <p>Bước giá tối thiểu</p>
                    <strong>{formatMoney(featured.minimumIncrement)}</strong>
                  </div>
                </div>
                <ButtonLink
                  variant="live"
                  className="bid-now"
                  to={`/auctions/${featured.id}/live`}
                  leftIcon={<Zap />}
                >
                  Đặt giá ngay
                </ButtonLink>
              </div>
              </div>
            </div>
            <div
              className="spotlight-carousel-controls"
              aria-label="Điều khiển sản phẩm nổi bật"
            >
              <button
                type="button"
                aria-label="Xem sản phẩm trước"
                onClick={showPreviousSpotlight}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <div className="spotlight-carousel-dots">
                {spotlightAuctions.map((auction, index) => (
                  <button
                    key={auction.id}
                    type="button"
                    className={index === spotlightIndex ? "active" : ""}
                    aria-label={`Xem ${auction.assetName}`}
                    aria-current={index === spotlightIndex ? "true" : undefined}
                    onClick={() => showSpotlight(index)}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Xem sản phẩm tiếp theo"
                onClick={showNextSpotlight}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
            <div
              key={`progress-${featured.id}`}
              className="spotlight-carousel-progress"
              aria-hidden="true"
            >
              <span />
            </div>
          </article>
        </div>
      </section>
      <LiveAuctionShowcase auctions={auctions} />
      <section className="container home-featured">
        <div className="featured-heading">
          <h2>🔥 ĐẤU GIÁ NỔI BẬT</h2>
          <Link to="/auctions">
            Xem tất cả <ArrowRight />
          </Link>
        </div>
        <div className="featured-layout">
          <div className="auction-list-grid featured-auctions">
            {auctions.slice(0, 7).map((item) => (
              <AuctionCard key={item.id} auction={item} />
            ))}
          </div>
          <aside className="trust-panel">
            <h2>
              <ShieldCheck /> NỀN TẢNG ĐÁNG TIN CẬY
            </h2>
            <div>
              <strong>150.000+</strong>
              <span>Thành viên tin tưởng</span>
            </div>
            <div>
              <strong>25.000+</strong>
              <span>Phiên đấu giá thành công</span>
            </div>
            <div>
              <strong>99,8%</strong>
              <span>Thông báo được giao</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Hỗ trợ vận hành</span>
            </div>
          </aside>
        </div>
      </section>
      <section className="category-strip">
        {categories.map(([label, Icon]) => (
          <Link
            key={label}
            to={`/auctions?category=${encodeURIComponent(label)}`}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        ))}
      </section>
      <HomeCampaignBanner />
      <div className={chatOpen ? "home-chat-widget open" : "home-chat-widget"}>
        {chatOpen && (
          <section
            className="home-chatbox"
            aria-label="AI chatbox và hỗ trợ khách hàng"
          >
            <header>
              <div className="home-chat-identity">
                <span className="home-chat-ai-mark">
                  <AuctionExpertIcon />
                </span>
                <div>
                  <span className="home-chat-kicker">
                    <BadgeCheck aria-hidden="true" /> Chuyên viên SGDG xác thực
                  </span>
                  <h2>Chuyên viên đấu giá AI</h2>
                  <p>
                    <i aria-hidden="true" /> Đang trực tuyến · Phản hồi nhanh
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Đóng khung chat hỗ trợ"
                onClick={() => setChatOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="home-chat-messages">
              <article className="support">
                <span className="home-chat-avatar" aria-hidden="true">
                  <AuctionExpertIcon compact />
                </span>
                <div>
                  <span className="home-chat-author">Chuyên viên SGDG</span>
                  <p>
                    Xin chào, mình có thể hỗ trợ bạn tìm phiên đấu giá, đặt cọc,
                    thanh toán hoặc theo dõi bàn giao.
                  </p>
                </div>
              </article>
              <article className="user">
                <div>
                  <span className="home-chat-author">Bạn</span>
                  <p>Tôi muốn hỏi về quy trình đặt giá.</p>
                </div>
              </article>
              <article className="support">
                <span className="home-chat-avatar" aria-hidden="true">
                  <AuctionExpertIcon compact />
                </span>
                <div>
                  <span className="home-chat-author">Chuyên viên SGDG</span>
                  <p>
                    Bạn cần đăng nhập, xác minh tài khoản và đặt cọc 10% giá khởi
                    điểm trước khi vào phòng đấu giá.
                  </p>
                </div>
              </article>
            </div>
            <div className="home-chat-live-note" role="status">
              <span className="home-chat-typing" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>Chuyên viên AI đang sẵn sàng hỗ trợ</span>
              <BadgeCheck aria-hidden="true" />
            </div>
            <div className="home-chat-suggestions" aria-label="Câu hỏi gợi ý">
              <span>Gợi ý nhanh</span>
              <div>
                <button type="button">Cách đặt giá</button>
                <button type="button">Xác minh KYC</button>
                <button type="button">Thanh toán</button>
              </div>
            </div>
            <form
              className="home-chat-input"
              onSubmit={(event) => event.preventDefault()}
            >
              <input
                aria-label="Nhập tin nhắn hỗ trợ"
                placeholder="Nhập câu hỏi của bạn..."
              />
              <button type="submit" aria-label="Gửi tin nhắn">
                <Send aria-hidden="true" />
              </button>
            </form>
          </section>
        )}
        <button
          type="button"
          className="home-chat-button"
          aria-label={chatOpen ? "Đóng chat hỗ trợ" : "Mở chat hỗ trợ"}
          aria-expanded={chatOpen}
          onClick={() => setChatOpen((value) => !value)}
        >
          {chatOpen ? (
            <X aria-hidden="true" />
          ) : (
            <>
              <AuctionExpertIcon />
              <span className="home-chat-button-status" aria-hidden="true" />
              <span className="home-chat-button-label">
                <strong>Chuyên viên đấu giá AI</strong>
                <small>Đang trực tuyến</small>
              </span>
            </>
          )}
        </button>
      </div>
    </>
  );
}
