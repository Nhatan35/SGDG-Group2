import type { MemberTitleReference } from "./roomValueTierPolicy";

const references = Object.freeze({
  "CUS-NMA-001": Object.freeze({
    memberId: "CUS-NMA-001",
    title: "VANG",
    referenceVersion: "MEMBERSHIP-MOCK-V1",
    sourceDomain: "MEMBERSHIP_ACCOUNT",
  }),
  "CUS-OTHER-001": Object.freeze({
    memberId: "CUS-OTHER-001",
    title: "REGISTER_MEMBER",
    referenceVersion: "MEMBERSHIP-MOCK-V1",
    sourceDomain: "MEMBERSHIP_ACCOUNT",
  }),
  "CUS-ROYAL-OAK-001": Object.freeze({
    memberId: "CUS-ROYAL-OAK-001",
    title: "BAC",
    referenceVersion: "MEMBERSHIP-MOCK-V1",
    sourceDomain: "MEMBERSHIP_ACCOUNT",
  }),
} as const satisfies Record<string, MemberTitleReference>);

export const getMembershipAccountReference = (
  memberId: string,
): MemberTitleReference | undefined => {
  const reference = references[memberId as keyof typeof references];
  return reference ? Object.freeze({ ...reference }) : undefined;
};

export const getMembershipAccountReferenceVersion = () =>
  "MEMBERSHIP-MOCK-V1" as const;

export type CustomerMembershipStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "EXPIRED"
  | "UNKNOWN";

export interface CustomerMembershipEvidence {
  readonly customerId: string;
  readonly membershipId?: string;
  readonly membershipStatus: CustomerMembershipStatus;
  readonly membershipValidUntil?: string;
  readonly referenceVersion: "MEMBERSHIP-MOCK-V1";
  readonly sourceDomain: "MEMBERSHIP_ACCOUNT";
}

const validationEvidence = Object.freeze({
  "CUS-NMA-001": Object.freeze({
    customerId: "CUS-NMA-001",
    membershipId: "MBR-CUS-NMA-001",
    membershipStatus: "ACTIVE",
    membershipValidUntil: "2027-12-31T23:59:59.999Z",
    referenceVersion: "MEMBERSHIP-MOCK-V1",
    sourceDomain: "MEMBERSHIP_ACCOUNT",
  }),
  "CUS-OTHER-001": Object.freeze({
    customerId: "CUS-OTHER-001",
    membershipId: "MBR-CUS-OTHER-001",
    membershipStatus: "INACTIVE",
    referenceVersion: "MEMBERSHIP-MOCK-V1",
    sourceDomain: "MEMBERSHIP_ACCOUNT",
  }),
  "CUS-ROYAL-OAK-001": Object.freeze({
    customerId: "CUS-ROYAL-OAK-001",
    membershipId: "MBR-CUS-ROYAL-OAK-001",
    membershipStatus: "SUSPENDED",
    referenceVersion: "MEMBERSHIP-MOCK-V1",
    sourceDomain: "MEMBERSHIP_ACCOUNT",
  }),
} as const satisfies Record<string, CustomerMembershipEvidence>);

export const getCustomerMembershipEvidence = (
  customerId: string,
): CustomerMembershipEvidence | undefined => {
  const evidence =
    validationEvidence[customerId as keyof typeof validationEvidence];
  return evidence ? Object.freeze({ ...evidence }) : undefined;
};
