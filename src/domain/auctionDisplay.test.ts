import { describe, expect, it } from "vitest";
import {
  AUCTION_DISPLAY_STATUS_CONFIG,
  AUCTION_OUTCOME_TERMS,
  getAuctionDisplayStatusConfig,
  resolveAuctionDisplayStatus,
  selectAuctionCta,
  type AuctionDisplayStatus,
} from "./auctionDisplay";

describe("auction display status", () => {
  const expected: Array<
    [
      AuctionDisplayStatus,
      string,
      string,
      boolean,
      boolean,
    ]
  > = [
    ["UPCOMING", "Sắp diễn ra", "neutral", true, false],
    [
      "REGISTRATION_OPEN",
      "Đang mở đăng ký",
      "brand",
      true,
      false,
    ],
    ["LIVE", "Đang diễn ra", "live", true, true],
    ["ENDING_SOON", "Sắp kết thúc", "ending", true, true],
    ["EXTENDED", "Đã gia hạn", "live-attention", true, true],
    ["PAUSED", "Tạm dừng", "warning", false, false],
    ["RECONNECTING", "Đang kết nối lại", "warning", false, false],
    ["CLOSED", "Đã kết thúc", "neutral", false, false],
    ["COMPLETED", "Hoàn tất", "success", false, false],
    ["CANCELLED", "Đã hủy", "danger", false, false],
  ];

  it.each(expected)(
    "maps %s to its shared label, tone and capabilities",
    (status, label, tone, showCountdown, biddingEnabled) => {
      const config = AUCTION_DISPLAY_STATUS_CONFIG[status];
      expect(config.label).toBe(label);
      expect(config.tone).toBe(tone);
      expect(config.showCountdown).toBe(showCountdown);
      expect(config.biddingEnabled).toBe(biddingEnabled);
      expect(config.accessibleDescription.length).toBeGreaterThan(10);
    },
  );

  it("derives ending-soon, extended and reconnecting without changing lifecycle state", () => {
    const now = Date.parse("2026-07-18T10:00:00.000Z");

    expect(
      resolveAuctionDisplayStatus({
        status: "LIVE",
        endsAt: "2026-07-18T10:14:59.000Z",
        now,
      }),
    ).toBe("ENDING_SOON");
    expect(
      resolveAuctionDisplayStatus({
        status: "LIVE",
        endsAt: "2026-07-18T11:00:00.000Z",
        now,
        extended: true,
      }),
    ).toBe("EXTENDED");
    expect(
      resolveAuctionDisplayStatus({
        status: "LIVE",
        endsAt: "2026-07-18T11:00:00.000Z",
        now,
        connectionState: "RECONNECTING",
      }),
    ).toBe("RECONNECTING");
  });

  it("keeps lifecycle mappings distinct", () => {
    expect(resolveAuctionDisplayStatus({ status: "RESULT_PENDING" })).toBe(
      "CLOSED",
    );
    expect(resolveAuctionDisplayStatus({ status: "COMPLETED" })).toBe(
      "COMPLETED",
    );
    expect(resolveAuctionDisplayStatus({ status: "REGISTRATION_OPEN" })).toBe(
      "REGISTRATION_OPEN",
    );
    expect(resolveAuctionDisplayStatus({ status: "PUBLISHED" })).toBe(
      "UPCOMING",
    );
  });

  it("provides a safe unsupported-state fallback", () => {
    expect(resolveAuctionDisplayStatus({ status: "NOT_SUPPORTED" })).toBe(
      "UNKNOWN",
    );
    expect(getAuctionDisplayStatusConfig("NOT_SUPPORTED")).toEqual(
      AUCTION_DISPLAY_STATUS_CONFIG.UNKNOWN,
    );
    expect(AUCTION_DISPLAY_STATUS_CONFIG.UNKNOWN.biddingEnabled).toBe(false);
  });
});

describe("auction CTA selector", () => {
  const liveAuction = { id: "watch-01", status: "LIVE" as const };
  const registrationAuction = {
    id: "watch-02",
    status: "REGISTRATION_OPEN" as const,
  };

  it("selects public lifecycle CTAs without hiding business rules", () => {
    expect(
      selectAuctionCta({ auction: liveAuction, context: "catalog" })?.label,
    ).toBe("Vào phòng đấu giá");
    expect(
      selectAuctionCta({
        auction: registrationAuction,
        context: "catalog",
      })?.label,
    ).toBe("Đăng ký tham gia");
    expect(
      selectAuctionCta({
        auction: { id: "watch-03", status: "CLOSED" },
        context: "catalog",
      })?.label,
    ).toBe("Xem kết quả");
  });

  it("uses authentication, eligibility and deposit context when supplied", () => {
    expect(
      selectAuctionCta({
        auction: liveAuction,
        context: "detail",
        user: { isAuthenticated: false },
      })?.label,
    ).toBe("Đăng nhập để tham gia");
    expect(
      selectAuctionCta({
        auction: liveAuction,
        context: "detail",
        user: {
          isAuthenticated: true,
          eligible: true,
          depositPaid: false,
        },
      })?.label,
    ).toBe("Hoàn tất đặt cọc");
    expect(
      selectAuctionCta({
        auction: liveAuction,
        context: "detail",
        user: {
          isAuthenticated: true,
          eligible: false,
          depositPaid: true,
        },
      })?.label,
    ).toBe("Xem chi tiết");
  });

  it("does not expose an action for a cancelled auction", () => {
    expect(
      selectAuctionCta({
        auction: { id: "watch-04", status: "CANCELLED" },
        context: "catalog",
      }),
    ).toBeNull();
  });
});

describe("auction result terminology", () => {
  it("keeps candidate and final-winner concepts distinct", () => {
    expect(AUCTION_OUTCOME_TERMS.candidate).toBe("Candidate");
    expect(AUCTION_OUTCOME_TERMS.finalWinner).toBe("Final Winner");
    expect(AUCTION_OUTCOME_TERMS.currentLeader).toBe("Current Leader");
    expect(AUCTION_OUTCOME_TERMS.closingRank).toBe("Closing Rank");
    expect(AUCTION_OUTCOME_TERMS.candidate).not.toBe("Người chiến thắng");
  });
});
