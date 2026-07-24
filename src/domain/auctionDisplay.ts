import type { AuctionStatus, RegistrationStatus } from "../types/domain";

export const ENDING_SOON_THRESHOLD_MS = 15 * 60 * 1_000;

export type AuctionDisplayStatus =
  | "UPCOMING"
  | "REGISTRATION_OPEN"
  | "LIVE"
  | "ENDING_SOON"
  | "EXTENDED"
  | "PAUSED"
  | "RECONNECTING"
  | "CLOSED"
  | "COMPLETED"
  | "CANCELLED"
  | "UNKNOWN";

export type AuctionStatusTone =
  | "neutral"
  | "info"
  | "brand"
  | "live"
  | "ending"
  | "live-attention"
  | "warning"
  | "success"
  | "danger";

export type AuctionStatusIcon =
  | "calendar"
  | "registration"
  | "flame"
  | "clock-alert"
  | "pause"
  | "reconnecting"
  | "closed"
  | "check"
  | "cancelled"
  | "unknown";

export type AuctionDisplayStatusConfig = {
  label: string;
  shortLabel?: string;
  tone: AuctionStatusTone;
  icon: AuctionStatusIcon;
  priority: number;
  showCountdown: boolean;
  biddingEnabled: boolean;
  accessibleDescription: string;
};

export const AUCTION_DISPLAY_STATUS_CONFIG = {
  UPCOMING: {
    label: "Sắp diễn ra",
    tone: "neutral",
    icon: "calendar",
    priority: 20,
    showCountdown: true,
    biddingEnabled: false,
    accessibleDescription: "Phiên đấu giá sắp diễn ra và chưa nhận đặt giá.",
  },
  REGISTRATION_OPEN: {
    label: "Đang mở đăng ký",
    shortLabel: "Mở đăng ký",
    tone: "brand",
    icon: "registration",
    priority: 30,
    showCountdown: true,
    biddingEnabled: false,
    accessibleDescription:
      "Phiên đấu giá đang nhận đăng ký, chưa mở đặt giá.",
  },
  LIVE: {
    label: "Đang diễn ra",
    tone: "live",
    icon: "flame",
    priority: 70,
    showCountdown: true,
    biddingEnabled: true,
    accessibleDescription: "Phiên đấu giá đang diễn ra và đang nhận đặt giá.",
  },
  ENDING_SOON: {
    label: "Sắp kết thúc",
    tone: "ending",
    icon: "clock-alert",
    priority: 90,
    showCountdown: true,
    biddingEnabled: true,
    accessibleDescription:
      "Phiên đấu giá đang diễn ra và sắp kết thúc, vẫn đang nhận đặt giá.",
  },
  EXTENDED: {
    label: "Đã gia hạn",
    tone: "live-attention",
    icon: "clock-alert",
    priority: 80,
    showCountdown: true,
    biddingEnabled: true,
    accessibleDescription:
      "Phiên đấu giá đã được gia hạn và vẫn đang nhận đặt giá.",
  },
  PAUSED: {
    label: "Tạm dừng",
    tone: "warning",
    icon: "pause",
    priority: 85,
    showCountdown: false,
    biddingEnabled: false,
    accessibleDescription:
      "Phiên đấu giá đang tạm dừng và hiện không nhận đặt giá.",
  },
  RECONNECTING: {
    label: "Đang kết nối lại",
    tone: "warning",
    icon: "reconnecting",
    priority: 95,
    showCountdown: false,
    biddingEnabled: false,
    accessibleDescription:
      "Dữ liệu phiên đang được kết nối lại; đặt giá tạm thời bị khóa.",
  },
  CLOSED: {
    label: "Đã kết thúc",
    tone: "neutral",
    icon: "closed",
    priority: 50,
    showCountdown: false,
    biddingEnabled: false,
    accessibleDescription: "Phiên đấu giá đã kết thúc và không nhận đặt giá.",
  },
  COMPLETED: {
    label: "Hoàn tất",
    tone: "success",
    icon: "check",
    priority: 40,
    showCountdown: false,
    biddingEnabled: false,
    accessibleDescription:
      "Quy trình phiên đấu giá đã hoàn tất và không nhận đặt giá.",
  },
  CANCELLED: {
    label: "Đã hủy",
    tone: "danger",
    icon: "cancelled",
    priority: 100,
    showCountdown: false,
    biddingEnabled: false,
    accessibleDescription: "Phiên đấu giá đã bị hủy và không nhận đặt giá.",
  },
  UNKNOWN: {
    label: "Đang cập nhật",
    tone: "neutral",
    icon: "unknown",
    priority: 0,
    showCountdown: false,
    biddingEnabled: false,
    accessibleDescription: "Trạng thái phiên đấu giá đang được cập nhật.",
  },
} satisfies Record<AuctionDisplayStatus, AuctionDisplayStatusConfig>;

export type AuctionConnectionPresentationState =
  | "CONNECTED"
  | "RECONNECTING"
  | "STALE";

export type ResolveAuctionDisplayStatusInput = {
  status: AuctionStatus | string;
  endsAt?: string;
  now?: number;
  extended?: boolean;
  connectionState?: AuctionConnectionPresentationState;
};

export function resolveAuctionDisplayStatus({
  status,
  endsAt,
  now = Date.now(),
  extended = false,
  connectionState = "CONNECTED",
}: ResolveAuctionDisplayStatusInput): AuctionDisplayStatus {
  if (connectionState === "RECONNECTING" || connectionState === "STALE") {
    return "RECONNECTING";
  }

  if (status === "CANCELLED") return "CANCELLED";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "CLOSED" || status === "RESULT_PENDING") return "CLOSED";
  if (status === "PAUSED") return "PAUSED";
  if (status === "REGISTRATION_OPEN") return "REGISTRATION_OPEN";

  if (status === "LIVE") {
    if (extended) return "EXTENDED";
    const endTime = endsAt ? new Date(endsAt).getTime() : Number.NaN;
    if (
      Number.isFinite(endTime) &&
      endTime - now <= ENDING_SOON_THRESHOLD_MS
    ) {
      return "ENDING_SOON";
    }
    return "LIVE";
  }

  if (
    status === "PUBLISHED" ||
    status === "REGISTRATION_CLOSED"
  ) {
    return "UPCOMING";
  }

  return "UNKNOWN";
}

export function getAuctionDisplayStatusConfig(
  status: AuctionDisplayStatus | string,
): AuctionDisplayStatusConfig {
  return (
    AUCTION_DISPLAY_STATUS_CONFIG[status as AuctionDisplayStatus] ??
    AUCTION_DISPLAY_STATUS_CONFIG.UNKNOWN
  );
}

export type AuctionCtaContext = "catalog" | "detail" | "result";

export type AuctionDisplayCta = {
  label: string;
  href: string;
  variant: "primary" | "secondary";
};

export type AuctionCtaUserContext = {
  isAuthenticated: boolean;
  registrationStatus?: RegistrationStatus;
  depositPaid?: boolean;
  eligible?: boolean;
};

export type SelectAuctionCtaInput = {
  auction: {
    id: string;
    status: AuctionStatus;
  };
  context: AuctionCtaContext;
  user?: AuctionCtaUserContext;
};

export function selectAuctionCta({
  auction,
  context,
  user,
}: SelectAuctionCtaInput): AuctionDisplayCta | null {
  const detailHref = `/auctions/${auction.id}`;

  if (auction.status === "CANCELLED") return null;

  if (auction.status === "REGISTRATION_OPEN") {
    if (user && !user.isAuthenticated) {
      return {
        label: "Đăng nhập để đăng ký",
        href: "/auth/login",
        variant: "primary",
      };
    }
    if (
      user?.registrationStatus === "DEPOSIT_PENDING" ||
      user?.depositPaid === false
    ) {
      return {
        label: "Hoàn tất đặt cọc",
        href: `/me/auctions/${auction.id}/eligibility`,
        variant: "primary",
      };
    }
    return {
      label: "Đăng ký tham gia",
      href: `/auctions/${auction.id}/register`,
      variant: "primary",
    };
  }

  if (auction.status === "LIVE") {
    if (user && !user.isAuthenticated) {
      return {
        label: "Đăng nhập để tham gia",
        href: "/auth/login",
        variant: "primary",
      };
    }
    if (user?.eligible === false) {
      return {
        label: "Xem chi tiết",
        href: detailHref,
        variant: "secondary",
      };
    }
    if (user?.depositPaid === false) {
      return {
        label: "Hoàn tất đặt cọc",
        href: `/me/auctions/${auction.id}/eligibility`,
        variant: "primary",
      };
    }
    return {
      label: "Vào phòng đấu giá",
      href: `/auctions/${auction.id}/live`,
      variant: "primary",
    };
  }

  if (auction.status === "CLOSED" || auction.status === "COMPLETED") {
    return {
      label: context === "result" ? "Xem nghĩa vụ" : "Xem kết quả",
      href:
        context === "detail"
          ? `/auctions/${auction.id}/result`
          : detailHref,
      variant: "secondary",
    };
  }

  return {
    label: "Xem chi tiết",
    href: detailHref,
    variant: "secondary",
  };
}

export const AUCTION_OUTCOME_TERMS = {
  currentLeader: "Current Leader",
  closingRank: "Closing Rank",
  candidate: "Candidate",
  finalWinner: "Final Winner",
} as const;
