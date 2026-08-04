import { describe, expect, it } from "vitest";
import { evaluateOpenAuctionEligibility } from "./openAuctionEligibility";

describe("open auction membership eligibility", () => {
  it.each([
    ["BAC", "ACTIVE", false, "MEMBERSHIP_TIER_TOO_LOW"],
    ["VANG", "ACTIVE", true, "ELIGIBLE"],
    ["KIM_CUONG", "ACTIVE", true, "ELIGIBLE"],
    ["VIP", "ACTIVE", true, "ELIGIBLE"],
    ["VANG", "SUSPENDED", false, "MEMBERSHIP_INACTIVE"],
  ] as const)(
    "evaluates %s membership with %s status",
    (currentTitle, membershipStatus, eligible, reason) => {
      expect(
        evaluateOpenAuctionEligibility({
          currentTitle,
          membershipStatus,
        }),
      ).toMatchObject({ eligible, reason, currentTitle });
    },
  );

  it("rejects a customer without membership evidence", () => {
    expect(
      evaluateOpenAuctionEligibility({
        membershipStatus: "UNKNOWN",
      }),
    ).toMatchObject({
      eligible: false,
      reason: "MEMBERSHIP_NOT_FOUND",
      requiredTitle: "VANG",
    });
  });
});
