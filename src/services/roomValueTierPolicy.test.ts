import { describe, expect, it } from "vitest";
import {
  AUCTION_ROOM_FEE_POLICY_DISCLAIMER,
  deriveOrdinaryRoom,
  evaluateRoomAndMemberFee,
  getAuctionRoomFeePolicy,
  getMemberListingFee,
  MEMBER_FEE_MATRIX,
  MP_INTERPRETATION_DISCLAIMER,
  PRICE_BAND_NORMALIZATION_DISCLAIMER,
  type AuctionRoomReference,
  type MemberTitle,
} from "./roomValueTierPolicy";

describe("legacy-source Room/member-fee prototype policy", () => {
  it("exposes the governed v2 identity and required source disclaimers", () => {
    const policy = getAuctionRoomFeePolicy();
    expect(policy.decisionId).toBe("SGDG-ROOM-FEE-2017-PROTOTYPE");
    expect(policy.decisionVersion).toBe(2);
    expect(policy.authorityType).toBe("LEGACY_SOURCE_PROTOTYPE");
    expect(policy.approvalStatus).toBe(
      "REQUIRES_BUSINESS_RECONFIRMATION",
    );
    expect(AUCTION_ROOM_FEE_POLICY_DISCLAIMER).toContain(
      "NOT CURRENT STAKEHOLDER-APPROVED",
    );
    expect(PRICE_BAND_NORMALIZATION_DISCLAIMER).toContain(
      "exactly 20,000,000 VND to ROOM-3",
    );
    expect(MP_INTERPRETATION_DISCLAIMER).toContain(
      "MP ASSUMED TO MEAN MIỄN PHÍ",
    );
  });

  it("keeps the policy, bands, rooms and fee matrix immutable", () => {
    const policy = getAuctionRoomFeePolicy();
    expect(Object.isFrozen(policy)).toBe(true);
    expect(Object.isFrozen(policy.priceBands)).toBe(true);
    expect(Object.isFrozen(policy.rooms)).toBe(true);
    expect(Object.isFrozen(MEMBER_FEE_MATRIX)).toBe(true);
    expect(Object.isFrozen(MEMBER_FEE_MATRIX.VANG)).toBe(true);
    expect(Object.isFrozen(MEMBER_FEE_MATRIX.VANG["ROOM-1"])).toBe(true);
  });

  it.each([
    [1, "PRICE-BAND-ROOM-1", "ROOM-1"],
    [4_999_999, "PRICE-BAND-ROOM-1", "ROOM-1"],
    [5_000_000, "PRICE-BAND-ROOM-2", "ROOM-2"],
    [19_999_999, "PRICE-BAND-ROOM-2", "ROOM-2"],
    [20_000_000, "PRICE-BAND-ROOM-3", "ROOM-3"],
    [20_000_001, "PRICE-BAND-ROOM-3", "ROOM-3"],
  ])(
    "maps starting price %i to %s and %s",
    (startingPrice, priceBand, room) => {
      const result = deriveOrdinaryRoom(startingPrice);
      expect(result?.priceBand.reference).toBe(priceBand);
      expect(result?.room.reference).toBe(room);
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, null, "5000000"])(
    "rejects invalid starting price %s",
    (startingPrice) => {
      expect(deriveOrdinaryRoom(startingPrice)).toBeUndefined();
    },
  );

  const expectedFees: Array<
    [
      MemberTitle,
      AuctionRoomReference,
      "AMOUNT" | "MP" | "EVENT_SPECIFIC_POLICY",
      number | string | undefined,
    ]
  > = [
    ["REGISTER_MEMBER", "ROOM-1", "AMOUNT", 35_000],
    ["REGISTER_MEMBER", "ROOM-2", "AMOUNT", 50_000],
    ["REGISTER_MEMBER", "ROOM-3", "AMOUNT", 60_000],
    ["REGISTER_MEMBER", "ROOM-VIP", "AMOUNT", 100_000],
    ["REGISTER_MEMBER", "ROOM-EVENT", "EVENT_SPECIFIC_POLICY", undefined],
    ["DONG", "ROOM-1", "AMOUNT", 25_000],
    ["DONG", "ROOM-2", "AMOUNT", 40_000],
    ["DONG", "ROOM-3", "AMOUNT", 50_000],
    ["DONG", "ROOM-VIP", "AMOUNT", 80_000],
    ["DONG", "ROOM-EVENT", "EVENT_SPECIFIC_POLICY", undefined],
    ["BAC", "ROOM-1", "AMOUNT", 15_000],
    ["BAC", "ROOM-2", "AMOUNT", 30_000],
    ["BAC", "ROOM-3", "AMOUNT", 40_000],
    ["BAC", "ROOM-VIP", "AMOUNT", 60_000],
    ["BAC", "ROOM-EVENT", "EVENT_SPECIFIC_POLICY", undefined],
    ["VANG", "ROOM-1", "MP", "MP/1SP"],
    ["VANG", "ROOM-2", "AMOUNT", 20_000],
    ["VANG", "ROOM-3", "AMOUNT", 30_000],
    ["VANG", "ROOM-VIP", "AMOUNT", 40_000],
    ["VANG", "ROOM-EVENT", "EVENT_SPECIFIC_POLICY", undefined],
    ["KIM_CUONG", "ROOM-1", "MP", "MP/1SP"],
    ["KIM_CUONG", "ROOM-2", "MP", "MP/1SP"],
    ["KIM_CUONG", "ROOM-3", "MP", "MP/1SP"],
    ["KIM_CUONG", "ROOM-VIP", "AMOUNT", 30_000],
    ["KIM_CUONG", "ROOM-EVENT", "EVENT_SPECIFIC_POLICY", undefined],
    ["VIP", "ROOM-1", "MP", "MP"],
    ["VIP", "ROOM-2", "MP", "MP"],
    ["VIP", "ROOM-3", "MP", "MP"],
    ["VIP", "ROOM-VIP", "MP", "MP"],
    ["VIP", "ROOM-EVENT", "EVENT_SPECIFIC_POLICY", undefined],
  ];

  it.each(expectedFees)(
    "preserves the source fee for %s in %s",
    (memberTitle, room, kind, value) => {
      const fee = getMemberListingFee({ memberTitle, room });
      expect(fee.kind).toBe(kind);
      if (fee.kind === "AMOUNT") expect(fee.amountVnd).toBe(value);
      if (fee.kind === "MP") expect(fee.sourceLabel).toBe(value);
    },
  );

  const customerSession = {
    recordKind: "DYNAMIC_LINKED_SESSION",
    creationSource: "OPENING_REQUEST" as const,
    managementMode: "CUSTOMER_REQUESTED" as const,
    lifecycleStatus: "DRAFT",
    publicationStatus: "NOT_READY",
  };

  it("requires a read-only membership reference for customer-requested fees", () => {
    expect(
      evaluateRoomAndMemberFee({
        session: customerSession,
        proposal: { rules: { startingPrice: 5_000_000 } },
      }),
    ).toMatchObject({ ready: false, code: "MEMBER_REFERENCE_NOT_FOUND" });
  });

  it("derives the customer fee from membership and ordinary room only", () => {
    const result = evaluateRoomAndMemberFee({
      session: customerSession,
      proposal: { rules: { startingPrice: 5_000_000 } },
      memberReference: {
        memberId: "CUS-NMA-001",
        title: "VANG",
        referenceVersion: "MEMBERSHIP-MOCK-V1",
        sourceDomain: "MEMBERSHIP_ACCOUNT",
      },
    });
    expect(result.ready).toBe(true);
    if (!result.ready) return;
    expect(result.roomResolution.roomReference).toBe("ROOM-2");
    expect(result.listingFeeResolution).toMatchObject({
      applicability: "APPLICABLE",
      memberTitle: "VANG",
      fee: { kind: "AMOUNT", amountVnd: 20_000 },
    });
    expect(result.specialRoomContext).toEqual({
      vipRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE",
      eventRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE",
      vipRoomFutureRequirement:
        "SPECIAL_ROOM_DECISION_REQUIRED_BEFORE_USE",
      eventRoomFutureRequirement:
        "EVENT_SPECIFIC_POLICY_REQUIRED_BEFORE_USE",
    });
  });

  it("does not auto-derive VIP or Event for SGDG-managed sessions", () => {
    const result = evaluateRoomAndMemberFee({
      session: {
        recordKind: "DYNAMIC_SGDG_SESSION",
        creationSource: "DIRECT_SGDG",
        managementMode: "SGDG_MANAGED",
        lifecycleStatus: "DRAFT",
        publicationStatus: "NOT_READY",
      },
      proposal: { rules: { startingPrice: 20_000_000 } },
    });
    expect(result).toMatchObject({
      ready: false,
      branch: "SGDG_MANAGED",
      code: "SGDG_MANAGED_FEE_DECISION_REQUIRED",
    });
    if (result.ready || !("roomResolution" in result)) return;
    expect(result.roomResolution.roomReference).toBe("ROOM-3");
    expect(result.listingFeeResolution).toEqual({
      applicability: "BUSINESS_DECISION_REQUIRED",
      reasonCode: "SGDG_MANAGED_FEE_APPLICABILITY_UNDEFINED",
    });
    expect(result.specialRoomContext.vipRoomStatus).toBe(
      "OUT_OF_CURRENT_CONFIGURATION_SCOPE",
    );
    expect(result.specialRoomContext.eventRoomStatus).toBe(
      "OUT_OF_CURRENT_CONFIGURATION_SCOPE",
    );
  });

  it("rejects stale expected policy versions", () => {
    expect(
      evaluateRoomAndMemberFee({
        session: customerSession,
        proposal: { rules: { startingPrice: 1 } },
        expectedPolicyVersion: 1,
      }),
    ).toMatchObject({ ready: false, code: "POLICY_VERSION_STALE" });
  });
});
