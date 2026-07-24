import {
  ArrowDownUp,
  Check,
  ChevronDown,
  Clock3,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";
import { FormEvent, Fragment, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AuctionCard,
  type AuctionCardAction,
} from "../../components/auction/AuctionCard";
import { Button } from "../../components/common/Button";
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
import "../../styles/auction-catalog.css";

const pageSize = 6;
const statusOptions = [
  ["upcoming", "Sắp diễn ra"],
  ["registration-open", "Đang mở đăng ký"],
  ["live", "Đang diễn ra"],
  ["closed", "Đã kết thúc"],
  ["cancelled", "Đã hủy"],
] as const;
const statusValues: Record<string, Auction["status"][]> = {
  upcoming: ["PUBLISHED"],
  "registration-open": ["REGISTRATION_OPEN"],
  live: ["LIVE", "PAUSED"],
  closed: ["CLOSED", "COMPLETED"],
  cancelled: ["CANCELLED"],
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

export function AuctionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
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
    if (resetPage) next.set("page", "1");
    if (next.get("page") === "1") next.delete("page");
    setSearchParams(next);
  };
  const clearAll = () => setSearchParams({});
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    const result = availableAuctions.filter((auction) => {
      const haystack =
        `${auction.assetName} ${auction.category} ${auction.code}`.toLocaleLowerCase(
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
            : Date.parse(left.startsAt) - Date.parse(right.startsAt),
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
  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParams({
      q: new FormData(event.currentTarget).get("q")?.toString().trim() || null,
    });
  };

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
          <form
            className="catalog-search"
            role="search"
            onSubmit={submitSearch}
          >
            <label className="sr-only" htmlFor="catalog-search">
              Tìm kiếm phiên đấu giá
            </label>
            <Search aria-hidden="true" />
            <input
              id="catalog-search"
              name="q"
              defaultValue={query}
              placeholder="Tìm tài sản, danh mục hoặc mã phiên"
            />
            <Button type="submit">
              Tìm kiếm
            </Button>
          </form>
        </div>
      </section>
      <div
        className="container catalog-main"
        aria-busy={projection === "loading"}
      >
        <section className="catalog-results" aria-live="polite">
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
              <div className="auction-list-grid three catalog-auction-grid">
                {visibleAuctions.map((auction) => (
                  <AuctionCard
                    key={auction.id}
                    auction={auction}
                    action={actionFor(auction)}
                    detailLink={auction.status !== "PUBLISHED"}
                    showCategory
                  />
                ))}
              </div>
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
