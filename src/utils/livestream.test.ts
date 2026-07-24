import { describe, expect, it } from "vitest";
import {
  formatLivestreamDuration,
  isShortLiveAuction,
} from "./livestream";

const now = new Date("2026-07-18T10:00:00.000Z").getTime();

function auction(
  overrides: Partial<{
    status: "LIVE" | "PUBLISHED";
    startsAt: string;
    endsAt: string;
  }> = {},
) {
  return {
    status: "LIVE" as const,
    startsAt: "2026-07-18T09:00:00.000Z",
    endsAt: "2026-07-18T12:00:00.000Z",
    ...overrides,
  };
}

describe("short auction livestream eligibility", () => {
  it("accepts a live auction that is currently running for a few hours", () => {
    expect(isShortLiveAuction(auction(), now)).toBe(true);
  });

  it("rejects auctions longer than four hours", () => {
    expect(
      isShortLiveAuction(
        auction({ endsAt: "2026-07-18T14:00:01.000Z" }),
        now,
      ),
    ).toBe(false);
  });

  it("rejects non-live, upcoming, and already ended auctions", () => {
    expect(
      isShortLiveAuction(auction({ status: "PUBLISHED" }), now),
    ).toBe(false);
    expect(
      isShortLiveAuction(
        auction({
          startsAt: "2026-07-18T11:00:00.000Z",
          endsAt: "2026-07-18T13:00:00.000Z",
        }),
        now,
      ),
    ).toBe(false);
    expect(
      isShortLiveAuction(
        auction({
          startsAt: "2026-07-18T07:00:00.000Z",
          endsAt: "2026-07-18T10:00:00.000Z",
        }),
        now,
      ),
    ).toBe(false);
  });

  it("formats the scheduled livestream duration", () => {
    expect(
      formatLivestreamDuration(
        "2026-07-18T09:00:00.000Z",
        "2026-07-18T10:42:00.000Z",
      ),
    ).toBe("1 giờ 42 phút");
  });
});
