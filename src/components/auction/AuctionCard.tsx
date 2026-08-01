import { Activity, ArrowRight, Eye, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { ButtonLink } from "../common/Button";
import { Card } from "../common/Card";
import type { AuctionDisplayCta } from "../../domain/auctionDisplay";
import type { Auction } from "../../services/mock/auctionService";
import { formatMoney } from "../../utils/format";
import { AuctionStatus } from "./AuctionStatus";

export type AuctionCardAction = Pick<AuctionDisplayCta, "label" | "href"> & {
  variant?: AuctionDisplayCta["variant"];
};

export interface AuctionCardProps {
  auction: Auction;
  action?: AuctionCardAction | null;
  showCategory?: boolean;
  detailLink?: boolean;
  segmentedCountdown?: boolean;
}

export function AuctionCard({
  auction,
  action,
  showCategory = false,
  detailLink = true,
  segmentedCountdown = false,
}: AuctionCardProps) {
  const live = auction.status === "LIVE";
  const showSegmentedCountdown = segmentedCountdown && live;
  const completed =
    auction.status === "COMPLETED" || auction.status === "CLOSED";
  const priceLabel = live
    ? showCategory
      ? "Giá chính thức hiện tại"
      : "Giá hiện tại"
    : completed
      ? "Giá đóng phiên"
      : "Giá khởi điểm";
  const price = live || completed ? auction.currentPrice : auction.startPrice;
  const detailHref = `/auctions/${auction.id}`;
  const showDetailAction = detailLink && action?.href !== detailHref;
  const detailLabel = action === null ? "Xem thông tin" : "Xem chi tiết";

  return (
    <Card
      variant={live ? "live" : "default"}
      className={`auction-card auction-card-state-${auction.status.toLowerCase()} ${
        live ? "auction-card-live" : ""
      } ${
        showCategory
          ? `catalog-auction-card catalog-status-${auction.status.toLowerCase()}`
          : ""
      }`}
    >
      <Link
        className="auction-card-main"
        to={detailHref}
        aria-label={`${auction.assetName} — ${priceLabel} ${formatMoney(price)}`}
      >
        <div className="auction-image">
          <img src={auction.image} alt={auction.assetName} />
          <AuctionStatus auction={auction} catalog={showCategory} compact />
        </div>
        <div className="auction-body">
          {showCategory && (
            <span className="auction-category">{auction.category}</span>
          )}
          <span className="auction-code">{auction.code}</span>
          <h3>{auction.assetName}</h3>
          <span className="price-caption">{priceLabel}</span>
          <strong className="auction-price">{formatMoney(price)}</strong>
          <div
            className={`auction-time ${showSegmentedCountdown ? "auction-time--segmented" : ""}`}
          >
            {showSegmentedCountdown && (
              <span className="auction-time__label">Kết thúc sau</span>
            )}
            <AuctionStatus
              auction={auction}
              catalog={showCategory}
              segmented={showSegmentedCountdown}
            />
          </div>
          {auction.cancellationNotice && (
            <p className="auction-notice">{auction.cancellationNotice}</p>
          )}
        </div>
      </Link>

      <div className="auction-card-actions">
        {action && (
          <ButtonLink
            className="auction-card-action"
            variant={action.variant ?? "primary"}
            to={action.href}
          >
            {action.label}
          </ButtonLink>
        )}
        {showDetailAction && (
          <Link className="card-link" to={detailHref}>
            {detailLabel} <ArrowRight />
          </Link>
        )}
      </div>

      <div className="auction-metrics" aria-label="Chỉ số quan tâm">
        <span>
          <Users aria-hidden="true" /> {auction.participantCount}
        </span>
        <span>
          <Eye aria-hidden="true" /> {auction.watcherCount}
        </span>
        <span>
          <Activity aria-hidden="true" /> {auction.heatScore}%
        </span>
      </div>
    </Card>
  );
}
