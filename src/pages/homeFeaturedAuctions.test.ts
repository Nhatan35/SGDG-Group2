import { describe, expect, it } from "vitest";
import { featuredAuctions } from "./public/homeFeaturedAuctions";

describe("homepage featured auctions", () => {
  it("only includes live and registration-open sessions", () => {
    expect(featuredAuctions.length).toBeGreaterThan(0);
    expect(
      featuredAuctions.every(
        (auction) =>
          auction.status === "LIVE" ||
          auction.status === "REGISTRATION_OPEN",
      ),
    ).toBe(true);
    expect(featuredAuctions.some((auction) => auction.status === "LIVE")).toBe(
      true,
    );
    expect(
      featuredAuctions.some(
        (auction) => auction.status === "REGISTRATION_OPEN",
      ),
    ).toBe(true);
  });

  it("prioritizes live sessions before registration-open sessions", () => {
    const firstRegistrationIndex = featuredAuctions.findIndex(
      (auction) => auction.status === "REGISTRATION_OPEN",
    );

    expect(firstRegistrationIndex).toBeGreaterThan(0);
    expect(
      featuredAuctions
        .slice(0, firstRegistrationIndex)
        .every((auction) => auction.status === "LIVE"),
    ).toBe(true);
    expect(
      featuredAuctions
        .slice(firstRegistrationIndex)
        .every((auction) => auction.status === "REGISTRATION_OPEN"),
    ).toBe(true);
  });
});
