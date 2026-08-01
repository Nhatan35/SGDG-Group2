import { Clock3, Flame } from "lucide-react";
import {
  getAuctionDisplayStatusConfig,
  resolveAuctionDisplayStatus,
  type AuctionConnectionPresentationState,
  type AuctionDisplayStatus,
} from "../../domain/auctionDisplay";
import { formatDuration, useDemoClock } from "../../hooks/useDemoClock";
import type { Auction } from "../../services/mock/auctionService";
import { Badge } from "../common/Badge";

const statusClass: Record<AuctionDisplayStatus, string> = {
  UPCOMING: "upcoming",
  REGISTRATION_OPEN: "registration",
  LIVE: "live",
  ENDING_SOON: "ending",
  EXTENDED: "extended",
  PAUSED: "paused",
  RECONNECTING: "reconnecting",
  CLOSED: "closed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  UNKNOWN: "unknown",
};

function formatAuctionDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function getTimeLabel(
  auction: Auction,
  status: AuctionDisplayStatus,
  now: number,
) {
  if (
    status === "LIVE" ||
    status === "ENDING_SOON" ||
    status === "EXTENDED"
  ) {
    return `Còn ${formatDuration(auction.endsAt, now)}`;
  }
  if (status === "REGISTRATION_OPEN") {
    return `Đăng ký đến ${formatAuctionDate(auction.registrationDeadline)}`;
  }
  if (status === "CLOSED" || status === "COMPLETED") {
    return `Kết thúc lúc ${formatAuctionDate(auction.endsAt)}`;
  }
  if (status === "CANCELLED") return "Phiên đã bị hủy";
  if (status === "PAUSED") return "Phiên đang tạm dừng";
  if (status === "RECONNECTING") return "Đang đồng bộ dữ liệu phiên";
  if (status === "UNKNOWN") return "Trạng thái đang cập nhật";
  return `Bắt đầu sau ${formatDuration(auction.startsAt, now)}`;
}

export type AuctionStatusProps = {
  auction: Auction;
  compact?: boolean;
  showBadge?: boolean;
  segmented?: boolean;
  catalog?: boolean;
  extended?: boolean;
  connectionState?: AuctionConnectionPresentationState;
};

function getSegmentedTime(target: string, now: number) {
  const totalSeconds = Math.max(
    0,
    Math.floor((new Date(target).getTime() - now) / 1000),
  );

  return [
    Math.floor(totalSeconds / 3_600),
    Math.floor((totalSeconds % 3_600) / 60),
    totalSeconds % 60,
  ].map((value) => String(value).padStart(2, "0"));
}

export function AuctionStatus({
  auction,
  compact = false,
  showBadge = true,
  segmented = false,
  extended = false,
  connectionState = "CONNECTED",
}: AuctionStatusProps) {
  const now = useDemoClock();
  const status = resolveAuctionDisplayStatus({
    status: auction.status,
    endsAt: auction.endsAt,
    now,
    extended,
    connectionState,
  });
  const config = getAuctionDisplayStatusConfig(status);
  const liveEnergy =
    status === "LIVE" ||
    status === "ENDING_SOON" ||
    status === "EXTENDED";

  return (
    <div
      className={`auction-status ${statusClass[status]} ${compact ? "compact" : ""}`}
      data-auction-display-status={status}
    >
      {showBadge && (
        <Badge
          tone={config.tone}
          aria-label={config.accessibleDescription}
        >
          {liveEnergy && <Flame aria-hidden="true" />}{" "}
          {config.label.toLocaleUpperCase("vi-VN")}
        </Badge>
      )}
      {!compact && (
        segmented && liveEnergy ? (
          <span
            className="auction-countdown auction-countdown--segmented"
            aria-label={getTimeLabel(auction, status, now)}
          >
            <span aria-hidden="true">
              {getSegmentedTime(auction.endsAt, now).map((value, index) => (
                <span className="auction-countdown__part" key={index}>
                  {index > 0 && (
                    <i className="auction-countdown__separator">:</i>
                  )}
                  <b>{value}</b>
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span className="auction-countdown">
            <Clock3 aria-hidden="true" />
            {getTimeLabel(auction, status, now)}
          </span>
        )
      )}
    </div>
  );
}
