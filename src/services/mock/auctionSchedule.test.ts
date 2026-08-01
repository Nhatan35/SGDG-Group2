import { describe, expect, it } from "vitest";
import { auctions } from "./auctionService";

const demoStart = new Date("2026-07-18T10:00:00.000Z").getTime();

describe("auction demo schedules", () => {
  it("keeps every live fixture ahead of the demo clock", () => {
    const liveAuctions = auctions.filter((auction) => auction.status === "LIVE");

    expect(liveAuctions.length).toBeGreaterThan(0);
    expect(
      liveAuctions.every(
        (auction) => new Date(auction.endsAt).getTime() > demoStart,
      ),
    ).toBe(true);
  });
});
