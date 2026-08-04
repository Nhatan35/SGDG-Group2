import {
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  SlidersHorizontal,
  Tag,
  Users,
  X,
} from "lucide-react";
import { Fragment, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { AuctionCardAction } from "../../components/auction/AuctionCard";
import { AuctionStatus } from "../../components/auction/AuctionStatus";
import { Button, ButtonLink } from "../../components/common/Button";
import { ResilientImage } from "../../components/common/ResilientImage";
import { selectAuctionCta } from "../../domain/auctionDisplay";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/feedback/States";
import {
  auctionCategories,
  catalogAuctions,
  type Auction,
} from "../../services/mock/auctionService";
import { formatMoney } from "../../utils/format";
import { resolveStagePresentation } from "./stageImagePresentation";
import "../../styles/auction-catalog.css";

const pageSize = 6;
const SHOW_STAGE_GUIDES = false;
const statusOptions = [
  ["upcoming", "Sắp diễn ra"],
  ["registration-open", "Đang mở đăng ký"],
  ["live", "Đang diễn ra"],
] as const;
const statusValues: Record<string, Auction["status"][]> = {
  upcoming: ["PUBLISHED"],
  "registration-open": ["REGISTRATION_OPEN"],
  live: ["LIVE", "PAUSED"],
};
const priceOptions = [
  ["under-500", "Dưới 500 triệu"],
  ["500-1000", "500 triệu – 1 tỷ"],
  ["over-1000", "Trên 1 tỷ"],
] as const;
const sortOptions = [
  ["soonest", "Sắp diễn ra sớm nhất"],
  ["newest", "Mới nhất"],
  ["price-asc", "Giá thấp – cao"],
  ["price-desc", "Giá cao – thấp"],
] as const;

function actionFor(auction: Auction): AuctionCardAction | null {
  if (auction.status === "CANCELLED") {
    return {
      label: "Xem thông báo",
      href: `/auctions/${auction.id}`,
      variant: "secondary",
    };
  }

  const action = selectAuctionCta({ auction, context: "catalog" });
  if (!action) return null;

  return {
    ...action,
    variant:
      auction.status === "PUBLISHED" ||
      auction.status === "CLOSED" ||
      auction.status === "COMPLETED"
        ? "primary"
        : action.variant,
  };
}

function catalogPrice(auction: Auction) {
  return auction.status === "LIVE" ||
    auction.status === "CLOSED" ||
    auction.status === "COMPLETED"
    ? auction.currentPrice
    : auction.startPrice;
}

function catalogLifecyclePriority(status: Auction["status"]) {
  if (status === "LIVE") return 0;
  if (status === "PAUSED") return 1;
  if (status === "REGISTRATION_OPEN") return 2;
  if (status === "PUBLISHED") return 3;
  if (status === "CLOSED" || status === "COMPLETED") return 4;
  return 5;
}

function StageAuctionCard({
  auction,
  position,
}: {
  auction: Auction;
  position: "left" | "center" | "right";
}) {
  const action = actionFor(auction);
  const stagePresentation = resolveStagePresentation(auction);

  return (
    <article
      className={`auction-card stage-auction-card stage-auction-card-${position} ${
        auction.status === "LIVE" ? "stage-auction-card-live" : ""
      } stage-display-${stagePresentation.mode} stage-scale-${stagePresentation.scale}`}
    >
      <div className="product-anchor">
        <Link
          className="stage-product"
          to={`/auctions/${auction.id}`}
          aria-label={`Mở chi tiết ${auction.assetName}`}
        >
          <span className="stage-product-frame">
            <ResilientImage
              src={stagePresentation.src}
              fallbackSrc={auction.image}
              alt={auction.assetName}
            />
          </span>
        </Link>
      </div>
      <div className="stage-info-panel product-information">
        <div className="stage-info-meta">
          <AuctionStatus auction={auction} catalog compact />
          <span>{auction.category}</span>
          <span>{auction.code}</span>
        </div>
        <Link className="stage-info-title" to={`/auctions/${auction.id}`}>
          {auction.assetName}
        </Link>
        <div className="stage-info-price">
          <span>
            {auction.status === "LIVE" ? "Giá hiện tại" : "Giá khởi điểm"}
          </span>
          <strong>{formatMoney(catalogPrice(auction))}</strong>
        </div>
        <div className="stage-info-activity">
          <AuctionStatus auction={auction} catalog segmented />
          <span>
            <Users aria-hidden="true" />
            {auction.participantCount} người tham gia
          </span>
        </div>
        {action ? (
          <ButtonLink
            className="stage-info-action"
            variant={action.variant ?? "primary"}
            to={action.href}
          >
            {action.label}
          </ButtonLink>
        ) : (
          <ButtonLink
            className="stage-info-action"
            variant="secondary"
            to={`/auctions/${auction.id}`}
          >
            Xem thông tin
          </ButtonLink>
        )}
      </div>
    </article>
  );
}

function DiscoveryAuctionCard({ auction }: { auction: Auction }) {
  return (
    <Link
      className="discovery-auction-card"
      to={`/auctions/${auction.id}`}
      aria-label={`Mở chi tiết ${auction.assetName}`}
    >
      <span className="discovery-product">
        <ResilientImage src={auction.image} alt={auction.assetName} />
      </span>
      <span className="discovery-info">
        <div>
          <span>{auction.category}</span>
          <span>{auction.code}</span>
        </div>
        <span className="discovery-title">{auction.assetName}</span>
        <strong>{formatMoney(catalogPrice(auction))}</strong>
        <AuctionStatus auction={auction} catalog />
      </span>
    </Link>
  );
}

export function AuctionsPage() {
  const discoveryRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const requestedStatus = searchParams.get("status") ?? "";
  const status = statusValues[requestedStatus] ? requestedStatus : "";
  const category = searchParams.get("category") ?? "";
  const price = searchParams.get("price") ?? "";
  const sort = searchParams.get("sort") ?? "soonest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const projection = searchParams.get("projection");
  const availableAuctions = useMemo(
    () => (projection === "empty" ? [] : catalogAuctions),
    [projection],
  );
  const categories = useMemo(
    () => [
      ...new Set([
        ...auctionCategories,
        ...catalogAuctions.map((auction) => auction.category),
        ...(category ? [category] : []),
      ]),
    ],
    [category],
  );
  const summary = useMemo(
    () => ({
      live: availableAuctions.filter((auction) => auction.status === "LIVE")
        .length,
      registration: availableAuctions.filter(
        (auction) => auction.status === "REGISTRATION_OPEN",
      ).length,
      upcoming: availableAuctions.filter(
        (auction) => auction.status === "PUBLISHED",
      ).length,
    }),
    [availableAuctions],
  );

  const updateParams = (
    changes: Record<string, string | null>,
    resetPage = true,
  ) => {
    const next = new URLSearchParams(window.location.search);
    Object.entries(changes).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    if (next.get("status") && !statusValues[next.get("status")!]) {
      next.delete("status");
    }
    if (resetPage) next.set("page", "1");
    if (next.get("page") === "1") next.delete("page");
    setSearchParams(next);
  };
  const clearAll = () => setSearchParams({});
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    const result = availableAuctions.filter((auction) => {
      const haystack =
        `${auction.assetName} ${auction.category} ${auction.region} ${auction.code}`.toLocaleLowerCase(
          "vi-VN",
        );
      const matchesQuery =
        !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesStatus =
        !status || statusValues[status]?.includes(auction.status);
      const matchesCategory = !category || auction.category === category;
      const value = catalogPrice(auction);
      const matchesPrice =
        !price ||
        (price === "under-500" && value < 500000000) ||
        (price === "500-1000" && value >= 500000000 && value <= 1000000000) ||
        (price === "over-1000" && value > 1000000000);
      return matchesQuery && matchesStatus && matchesCategory && matchesPrice;
    });
    return result.sort((left, right) =>
      sort === "price-asc"
        ? catalogPrice(left) - catalogPrice(right)
        : sort === "price-desc"
          ? catalogPrice(right) - catalogPrice(left)
          : sort === "newest"
            ? Date.parse(right.startsAt) - Date.parse(left.startsAt)
            : catalogLifecyclePriority(left.status) -
                  catalogLifecyclePriority(right.status) ||
                Number(resolveStagePresentation(right).mode === "cutout") -
                  Number(resolveStagePresentation(left).mode === "cutout") ||
                (left.status === "LIVE" || left.status === "PAUSED"
                  ? Date.parse(left.endsAt) - Date.parse(right.endsAt)
                  : Date.parse(left.startsAt) - Date.parse(right.startsAt)),
    );
  }, [availableAuctions, category, price, query, sort, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginationPages = [
    ...new Set(
      [1, page - 1, page, page + 1, totalPages].filter(
        (value) => value >= 1 && value <= totalPages,
      ),
    ),
  ].sort((left, right) => left - right);
  const visibleAuctions = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const featuredAuctionIds = new Set(
    visibleAuctions.slice(0, 3).map((auction) => auction.id),
  );
  const discoveryAuctions = filtered
    .filter((auction) => !featuredAuctionIds.has(auction.id))
    .slice(0, 15);
  const scrollDiscovery = (direction: -1 | 1) => {
    const ticker = discoveryRef.current;
    if (!ticker) return;

    ticker.scrollBy({
      left: direction * Math.max(320, Math.round(ticker.clientWidth * 0.82)),
      behavior: "smooth",
    });
  };
  const applied = [
    { key: "q", value: query, label: query && `Tìm: ${query}` },
    {
      key: "status",
      value: status,
      label: status && statusOptions.find(([value]) => value === status)?.[1],
    },
    { key: "category", value: category, label: category },
    {
      key: "price",
      value: price,
      label: price && priceOptions.find(([value]) => value === price)?.[1],
    },
  ].filter((item) => item.value && item.label) as Array<{
    key: string;
    value: string;
    label: string;
  }>;
  return (
    <div className="auction-catalog-page">
      <section className="catalog-hero">
        <div className="container catalog-context">
          Khám phá <span>/</span> Phiên đấu giá công khai
        </div>
        <div className="container catalog-intro">
          <div className="catalog-copy">
            <span className="eyebrow">AUCTION CATALOG</span>
            <h1>Khám phá các phiên đấu giá</h1>
            <p>
              Săn những tài sản chọn lọc, theo dõi nhịp trả giá và sở hữu cơ hội
              dành cho người hiểu giá trị.
            </p>
            <div
              className="catalog-summary"
              aria-label="Tổng quan phiên đấu giá"
            >
              <span>
                <b>{summary.live}</b> đang diễn ra
              </span>
              <span>
                <b>{summary.registration}</b> mở đăng ký
              </span>
              <span>
                <b>{summary.upcoming}</b> sắp diễn ra
              </span>
            </div>
          </div>
        </div>
      </section>
      <div
        className="container catalog-main"
        aria-busy={projection === "loading"}
      >
        <section className="catalog-results" aria-live="polite">
          <div className="catalog-controls-bar">
          <section
            className="catalog-filter-bar"
            aria-label="Bộ lọc phiên đấu giá"
          >
            <h2>Chọn theo tiêu chí</h2>
            <div className="catalog-filter-chips">
              <button
                type="button"
                className="filter-anchor"
                onClick={clearAll}
              >
                <SlidersHorizontal />
                Bộ lọc
              </button>
              {statusOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-chip ${status === value ? "active" : ""}`}
                  aria-pressed={status === value}
                  onClick={() =>
                    updateParams({ status: status === value ? null : value })
                  }
                >
                  {status === value && <Check />}
                  {label}
                </button>
              ))}
              <label className="filter-select">
                <Tag />
                <span>{category || "Tất cả danh mục"}</span>
                <ChevronDown />
                <select
                  aria-label="Danh mục"
                  value={category}
                  onChange={(event) =>
                    updateParams({ category: event.target.value || null })
                  }
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="filter-select">
                <ArrowDownUp />
                <span>
                  {priceOptions.find(([value]) => value === price)?.[1] ||
                    "Tất cả mức giá"}
                </span>
                <ChevronDown />
                <select
                  aria-label="Khoảng giá"
                  value={price}
                  onChange={(event) =>
                    updateParams({ price: event.target.value || null })
                  }
                >
                  <option value="">Tất cả mức giá</option>
                  {priceOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <section className="catalog-sort-bar">
            <h2>Sắp xếp theo</h2>
            <div>
              {sortOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`sort-chip ${sort === value ? "active" : ""}`}
                  aria-pressed={sort === value}
                  onClick={() => updateParams({ sort: value })}
                >
                  {value === "soonest" ? <Clock3 /> : <ArrowDownUp />}
                  {label}
                </button>
              ))}
            </div>
          </section>
          </div>
          <div className="catalog-toolbar">
            <div>
              <strong>{filtered.length} phiên đấu giá phù hợp</strong>
              {applied.length > 0 && (
                <div className="filter-chips">
                  {applied.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => updateParams({ [item.key]: null })}
                    >
                      {item.label}
                      <X aria-label={`Xóa ${item.label}`} />
                    </button>
                  ))}
                  <button
                    type="button"
                    className="clear-all"
                    onClick={clearAll}
                  >
                    Xóa tất cả
                  </button>
                </div>
              )}
            </div>
          </div>
          {projection === "loading" ? (
            <LoadingState
              label="Đang chuẩn bị danh sách phiên đấu giá"
              description="Hệ thống đang tải projection danh mục mô phỏng."
            />
          ) : projection === "error" ? (
            <div className="catalog-error">
              <ErrorState
                title="Chưa thể tải danh sách phiên đấu giá"
                description="Dữ liệu trình bày mô phỏng tạm thời chưa sẵn sàng. Vui lòng thử lại."
                retry={() => updateParams({ projection: null }, false)}
              />
            </div>
          ) : availableAuctions.length === 0 ? (
            <EmptyState
              title="Chưa có phiên đấu giá"
              description="Hiện chưa có phiên nào được công khai. Vui lòng quay lại sau."
            />
          ) : visibleAuctions.length ? (
            <>
              <section
                className={`catalog-stage${SHOW_STAGE_GUIDES ? " show-stage-guides" : ""}`}
                aria-label="Khu trưng bày phiên đấu giá nổi bật"
              >
                <div className="catalog-stage-products catalog-auction-grid">
                  {visibleAuctions.slice(0, 3).map((auction, index) => (
                    <StageAuctionCard
                      key={auction.id}
                      auction={auction}
                      position={
                        index === 0 ? "left" : index === 1 ? "center" : "right"
                      }
                    />
                  ))}
                </div>
              </section>
              {discoveryAuctions.length > 0 && (
                <section className="catalog-discovery">
                  <div className="catalog-discovery-heading">
                    <h2>Khám phá thêm</h2>
                    <span>Kéo ngang để xem thêm phiên đấu giá</span>
                  </div>
                  <div className="catalog-discovery-ticker">
                    <button
                      type="button"
                      className="catalog-discovery-arrow catalog-discovery-arrow-left"
                      aria-label="Xem các phiên trước"
                      onClick={() => scrollDiscovery(-1)}
                    >
                      <ChevronLeft aria-hidden="true" />
                    </button>
                    <div ref={discoveryRef} className="catalog-discovery-grid">
                      {discoveryAuctions.map((auction) => (
                        <DiscoveryAuctionCard key={auction.id} auction={auction} />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="catalog-discovery-arrow catalog-discovery-arrow-right"
                      aria-label="Xem các phiên tiếp theo"
                      onClick={() => scrollDiscovery(1)}
                    >
                      <ChevronRight aria-hidden="true" />
                    </button>
                  </div>
                </section>
              )}
              {totalPages > 1 && (
                <nav className="catalog-pagination" aria-label="Phân trang">
                  <button
                    className="button secondary"
                    disabled={page === 1}
                    onClick={() =>
                      updateParams({ page: String(page - 1) }, false)
                    }
                  >
                    Trước
                  </button>
                  {paginationPages.map((value, index) => (
                    <Fragment key={value}>
                      {index > 0 &&
                        value - paginationPages[index - 1] > 1 && (
                          <span className="pagination-gap" aria-hidden="true">
                            …
                          </span>
                        )}
                      <button
                        className={`button ${value === page ? "primary" : "secondary"}`}
                        aria-current={value === page ? "page" : undefined}
                        aria-label={`Trang ${value}`}
                        onClick={() =>
                          updateParams({ page: String(value) }, false)
                        }
                      >
                        {value}
                      </button>
                    </Fragment>
                  ))}
                  <button
                    className="button secondary"
                    disabled={page === totalPages}
                    onClick={() =>
                      updateParams({ page: String(page + 1) }, false)
                    }
                  >
                    Sau
                  </button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              title="Không tìm thấy phiên đấu giá phù hợp"
              description="Thử thay đổi từ khóa hoặc xóa bớt bộ lọc để xem thêm kết quả."
              primaryAction={
                <Button onClick={clearAll}>
                  Xóa tất cả bộ lọc
                </Button>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
