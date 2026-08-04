import {
  getCustomerMembershipEvidence,
  getMembershipAccountReference,
  type CustomerMembershipStatus,
} from "./membershipAccountReference";
import {
  MEMBER_TITLE_DEFINITIONS,
  type MemberTitle,
} from "./roomValueTierPolicy";

export const OPEN_AUCTION_MINIMUM_MEMBER_TITLE = "VANG" as const;

const memberTitleRank: Record<MemberTitle, number> = {
  REGISTER_MEMBER: 0,
  DONG: 1,
  BAC: 2,
  VANG: 3,
  KIM_CUONG: 4,
  VIP: 5,
};

export type OpenAuctionEligibilityReason =
  | "ELIGIBLE"
  | "MEMBERSHIP_NOT_FOUND"
  | "MEMBERSHIP_INACTIVE"
  | "MEMBERSHIP_TIER_TOO_LOW";

export interface OpenAuctionEligibility {
  eligible: boolean;
  reason: OpenAuctionEligibilityReason;
  currentTitle?: MemberTitle;
  currentTitleLabel: string;
  membershipStatus: CustomerMembershipStatus;
  requiredTitle: typeof OPEN_AUCTION_MINIMUM_MEMBER_TITLE;
  requiredTitleLabel: "Vàng";
}

export function getMemberTitleLabel(title?: MemberTitle) {
  if (!title) return "Chưa xác định";
  return (
    MEMBER_TITLE_DEFINITIONS.find((item) => item.reference === title)
      ?.displayName ?? title
  );
}

export function evaluateOpenAuctionEligibility({
  currentTitle,
  membershipStatus,
}: {
  currentTitle?: MemberTitle;
  membershipStatus: CustomerMembershipStatus;
}): OpenAuctionEligibility {
  const shared = {
    currentTitle,
    currentTitleLabel: getMemberTitleLabel(currentTitle),
    membershipStatus,
    requiredTitle: OPEN_AUCTION_MINIMUM_MEMBER_TITLE,
    requiredTitleLabel: "Vàng" as const,
  };

  if (!currentTitle) {
    return {
      ...shared,
      eligible: false,
      reason: "MEMBERSHIP_NOT_FOUND",
    };
  }

  if (membershipStatus !== "ACTIVE") {
    return {
      ...shared,
      eligible: false,
      reason: "MEMBERSHIP_INACTIVE",
    };
  }

  const eligible =
    memberTitleRank[currentTitle] >=
    memberTitleRank[OPEN_AUCTION_MINIMUM_MEMBER_TITLE];

  return {
    ...shared,
    eligible,
    reason: eligible ? "ELIGIBLE" : "MEMBERSHIP_TIER_TOO_LOW",
  };
}

export function getOpenAuctionEligibility(customerId: string) {
  const membership = getMembershipAccountReference(customerId);
  const evidence = getCustomerMembershipEvidence(customerId);

  return evaluateOpenAuctionEligibility({
    currentTitle: membership?.title,
    membershipStatus: evidence?.membershipStatus ?? "UNKNOWN",
  });
}
