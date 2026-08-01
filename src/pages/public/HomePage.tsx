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
import { HomeMarketingExperience } from "../../components/home/HomeMarketingExperience";
import { LiveAuctionShowcase } from "../../components/home/LiveAuctionShowcase";
import { auctions } from "../../services/mock/auctionService";
import { formatMoney } from "../../utils/format";
import { featuredAuctions } from "./homeFeaturedAuctions";

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

const auctionRegions = [
  ...new Set(auctions.map((auction) => auction.region)),
].sort((left, right) => left.localeCompare(right, "vi"));

const homePriceOptions = [
  ["", "Chọn khoảng giá"],
  ["under-500", "Dưới 500 triệu"],
  ["500-1000", "Từ 500 triệu – 1 tỷ"],
  ["over-1000", "Trên 1 tỷ"],
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

const spotlightIntroductions: Record<string, string> = {
  "rolex-126610lv":
    "Submariner mặt xanh biểu tượng, bền bỉ trong sử dụng và giàu sức hút sưu tầm.",
  "patek-nautilus":
    "Nautilus vàng hồng, dáng thể thao thanh lịch cùng mặt số nâu chuyển sắc cuốn hút.",
  "antique-01":
    "Bình gốm men lam mang nét cổ điển, họa tiết giàu nhịp điệu và hồ sơ rõ ràng.",
  "collectible-01":
    "Leica M6 Titanium kết hợp cơ chế rangefinder kinh điển với lớp hoàn thiện hiếm.",
  "real-estate-01":
    "Căn hộ hai phòng ngủ tại Thảo Điền, sáng thoáng và sở hữu tầm nhìn sông rộng mở.",
};

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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedPrice, setSelectedPrice] = useState("");
  const featured = spotlightAuctions[spotlightIndex] ?? auctions[0];
  const homeSearchParams = new URLSearchParams();
  if (selectedCategory) homeSearchParams.set("category", selectedCategory);
  if (selectedRegion) homeSearchParams.set("q", selectedRegion);
  if (selectedPrice) homeSearchParams.set("price", selectedPrice);
  const homeSearchQuery = homeSearchParams.toString();
  const homeSearchHref = `/auctions${homeSearchQuery ? `?${homeSearchQuery}` : ""}`;

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
      <section className="home-redesign-hero">
        <div
          key={`backdrop-${featured.id}`}
          className={`home-hero-backdrop home-hero-backdrop--${featured.id}`}
          aria-hidden="true"
        >
          <img src={featured.image} alt="" fetchPriority="high" />
        </div>
        <div className="home-hero-preload" aria-hidden="true">
          {spotlightAuctions.map((auction) => (
            <img key={auction.id} src={auction.image} alt="" />
          ))}
        </div>
        <button
          className="home-hero-stage-arrow home-hero-stage-arrow--previous"
          type="button"
          aria-label="Xem sản phẩm đấu giá trước"
          onClick={showPreviousSpotlight}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          className="home-hero-stage-arrow home-hero-stage-arrow--next"
          type="button"
          aria-label="Xem sản phẩm đấu giá tiếp theo"
          onClick={showNextSpotlight}
        >
          <ChevronRight aria-hidden="true" />
        </button>
        <div className="container home-redesign-grid">
          <div
            className="home-intro home-product-overlay"
            onMouseEnter={() => setSpotlightPaused(true)}
            onMouseLeave={() => setSpotlightPaused(false)}
          >
            <div className="home-product-overlay__topbar">
              <AuctionStatus auction={featured} compact />
              <div
                className="hero-auction-card__dots"
                aria-label="Chọn tài sản nổi bật"
              >
                {spotlightAuctions.map((auction, index) => (
                  <button
                    key={auction.id}
                    type="button"
                    className={index === spotlightIndex ? "active" : ""}
                    aria-label={`Xem ${auction.assetName}`}
                    aria-current={
                      index === spotlightIndex ? "true" : undefined
                    }
                    onClick={() => showSpotlight(index)}
                  />
                ))}
              </div>
            </div>
            <span className="eyebrow">
              {featured.category} · {featured.code}
            </span>
            <h1>{featured.assetName}</h1>
            <p className="home-product-overlay__summary">
              {spotlightIntroductions[featured.id] ?? featured.description}
            </p>
            <div className="home-product-overlay__facts">
              <div>
                <span>Giá hiện tại</span>
                <strong aria-label={`Giá hiện tại ${formatMoney(featured.currentPrice)}`}>
                  {formatMoney(featured.currentPrice)}
                </strong>
              </div>
              <div>
                <span>Kết thúc sau</span>
                <AuctionStatus
                  auction={featured}
                  showBadge={false}
                  segmented
                />
              </div>
            </div>
            <ButtonLink
              variant="live"
              className="home-product-overlay__bid"
              to={`/auctions/${featured.id}/live`}
              leftIcon={<Zap />}
            >
              Tham gia phiên
            </ButtonLink>
            <form className="home-filter-bar">
              <label>
                Danh mục
                <select
                  aria-label="Danh mục"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map(([label]) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Vị trí
                <select
                  aria-label="Vị trí"
                  value={selectedRegion}
                  onChange={(event) => setSelectedRegion(event.target.value)}
                >
                  <option value="">Toàn quốc</option>
                  {auctionRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Khoảng giá
                <select
                  aria-label="Khoảng giá"
                  value={selectedPrice}
                  onChange={(event) => setSelectedPrice(event.target.value)}
                >
                  {homePriceOptions.map(([value, label]) => (
                    <option key={label} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <ButtonLink variant="primary" to={homeSearchHref}>
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
            className={`hero-auction-card ${spotlightPaused ? "is-paused" : ""}`}
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
              className={`hero-auction-card__slide hero-auction-card__slide--${spotlightDirection}`}
              role="group"
              aria-label={`${spotlightIndex + 1} trên ${spotlightAuctions.length}: ${featured.assetName}`}
              aria-live={spotlightPaused ? "polite" : "off"}
            >
              <div className="hero-auction-card__topbar">
                <AuctionStatus auction={featured} compact />
                <div
                  className="hero-auction-card__controls"
                  aria-label="Điều khiển sản phẩm nổi bật"
                >
                  <button
                    type="button"
                    aria-label="Xem sản phẩm trước"
                    onClick={showPreviousSpotlight}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <div className="hero-auction-card__dots">
                    {spotlightAuctions.map((auction, index) => (
                      <button
                        key={auction.id}
                        type="button"
                        className={index === spotlightIndex ? "active" : ""}
                        aria-label={`Xem ${auction.assetName}`}
                        aria-current={
                          index === spotlightIndex ? "true" : undefined
                        }
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
                  className="hero-auction-card__progress"
                  aria-hidden="true"
                >
                  <span />
                </div>
              </div>
              <div className="hero-auction-card__body">
                <div className="hero-auction-card__visual-column">
                  <div className="hero-auction-card__media">
                    <img src={featured.image} alt={featured.assetName} />
                    <button aria-label="Thêm vào yêu thích">♡</button>
                  </div>
                  <div className="hero-auction-card__activity">
                    <div>
                      <span className="hero-auction-card__activity-icon">
                        🔥
                      </span>
                      <p>
                        <strong>{featured.acceptedBidCount}</strong> người trả
                        giá
                      </p>
                      <small>Phiên đang rất sôi động</small>
                    </div>
                    <div>
                      <span className="hero-auction-card__activity-icon">
                        <BadgeDollarSign />
                      </span>
                      <p>Bước giá tối thiểu</p>
                      <strong>{formatMoney(featured.minimumIncrement)}</strong>
                    </div>
                  </div>
                </div>
                <div className="hero-auction-card__details">
                  <h2>{featured.assetName}</h2>
                  <span className="hero-auction-card__code">
                    Mã đấu giá: {featured.code}
                  </span>
                  <p className="hero-auction-card__summary">
                    <span>Giới thiệu tài sản</span>
                    {spotlightIntroductions[featured.id] ??
                      featured.description}
                  </p>
                  <div className="hero-auction-card__urgency">
                    <p>
                      Kết thúc sau <span>Sắp chốt phiên</span>
                    </p>
                    <AuctionStatus auction={featured} showBadge={false} />
                  </div>
                  <p className="hero-auction-card__price-label">
                    Giá hiện tại
                  </p>
                  <strong
                    className="hero-auction-card__price"
                    aria-label={`Giá hiện tại ${formatMoney(featured.currentPrice)}`}
                  >
                    {formatMoney(featured.currentPrice)}
                  </strong>
                  <ButtonLink
                    variant="live"
                    className="hero-auction-card__bid"
                    to={`/auctions/${featured.id}/live`}
                    leftIcon={<Zap />}
                  >
                    Tham gia phiên
                  </ButtonLink>
                </div>
              </div>
            </div>
          </article>
          <aside className="home-estimate-callout">
            <span>ĐỊNH GIÁ CÙNG SGDG</span>
            <h2>Đang cân nhắc bán tài sản? Bắt đầu bằng định giá.</h2>
            <p>
              Công cụ định giá giúp bạn khám phá giá trị tài sản và nhận tư vấn
              phù hợp trước khi đưa ra quyết định.
            </p>
            <Link to="/help">
              Yêu cầu định giá <ArrowRight aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>
      <section className="container home-featured">
        <div className="featured-heading">
          <div>
            <span>CATALOG THÁNG 07</span>
            <h2>Phiên đấu giá đáng chú ý</h2>
          </div>
          <Link to="/auctions">
            Xem toàn bộ lịch phiên <ArrowRight />
          </Link>
        </div>
        <div className="featured-layout">
          <div className="auction-list-grid featured-auctions">
            {featuredAuctions.slice(0, 4).map((item) => (
              <AuctionCard
                key={item.id}
                auction={item}
                segmentedCountdown
              />
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
      <HomeMarketingExperience />
      <LiveAuctionShowcase auctions={auctions} />
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
