import type {
  AuctionManagementMode,
  SessionCreationSource,
} from "./mock/operationsService";

export const AUCTION_ROOM_FEE_POLICY_DISCLAIMER =
  "LEGACY SOURCE-BASED PROTOTYPE POLICY — USER-REQUESTED IMPLEMENTATION — NOT CURRENT STAKEHOLDER-APPROVED — REQUIRES BUSINESS RECONFIRMATION" as const;

export const PRICE_BAND_NORMALIZATION_DISCLAIMER =
  "The assignment of exactly 20,000,000 VND to ROOM-3 is a prototype normalization assumption requiring stakeholder confirmation." as const;

export const MP_INTERPRETATION_DISCLAIMER =
  "PROTOTYPE INTERPRETATION — MP ASSUMED TO MEAN MIỄN PHÍ — REQUIRES STAKEHOLDER CONFIRMATION" as const;

export const SGDG_MANAGED_FEE_DECISION_MESSAGE =
  "Phạm vi áp dụng phí niêm yết cho phiên SGDG-managed chưa được phê duyệt. Không thể gửi hoặc xác nhận cấu hình cho đến khi có quyết định nghiệp vụ." as const;

export type PriceBandReference =
  | "PRICE-BAND-ROOM-1"
  | "PRICE-BAND-ROOM-2"
  | "PRICE-BAND-ROOM-3";

export type OrdinaryRoomReference = "ROOM-1" | "ROOM-2" | "ROOM-3";
export type AuctionRoomReference =
  | OrdinaryRoomReference
  | "ROOM-VIP"
  | "ROOM-EVENT";

export type MemberTitle =
  | "REGISTER_MEMBER"
  | "DONG"
  | "BAC"
  | "VANG"
  | "KIM_CUONG"
  | "VIP";

export interface MemberTitleReference {
  readonly memberId: string;
  readonly title: MemberTitle;
  readonly referenceVersion: string | number;
  readonly sourceDomain: "MEMBERSHIP_ACCOUNT";
}

export type ListingFee =
  | {
      readonly kind: "AMOUNT";
      readonly amountVnd: number;
      readonly unit: "PER_PRODUCT";
    }
  | {
      readonly kind: "MP";
      readonly sourceLabel: "MP" | "MP/1SP";
    }
  | {
      readonly kind: "EVENT_SPECIFIC_POLICY";
    }
  | {
      readonly kind: "UNDEFINED";
    };

export interface PriceBandDefinition {
  readonly reference: PriceBandReference;
  readonly displayName: string;
  readonly roomReference: OrdinaryRoomReference;
  readonly minimumStartingPriceExclusive?: number;
  readonly minimumStartingPriceInclusive?: number;
  readonly maximumStartingPriceExclusive?: number;
}

export interface RoomDefinition {
  readonly reference: AuctionRoomReference;
  readonly displayName: string;
}

const amount = (amountVnd: number): ListingFee =>
  Object.freeze({ kind: "AMOUNT", amountVnd, unit: "PER_PRODUCT" });
const mp = (sourceLabel: "MP" | "MP/1SP"): ListingFee =>
  Object.freeze({ kind: "MP", sourceLabel });
const eventFee = Object.freeze({
  kind: "EVENT_SPECIFIC_POLICY",
} as const satisfies ListingFee);

export const MEMBER_TITLE_DEFINITIONS = Object.freeze([
  Object.freeze({ reference: "REGISTER_MEMBER", displayName: "Register / Member" }),
  Object.freeze({ reference: "DONG", displayName: "Đồng" }),
  Object.freeze({ reference: "BAC", displayName: "Bạc" }),
  Object.freeze({ reference: "VANG", displayName: "Vàng" }),
  Object.freeze({ reference: "KIM_CUONG", displayName: "Kim cương" }),
  Object.freeze({ reference: "VIP", displayName: "VIP" }),
] as const);

const priceBands = Object.freeze([
  Object.freeze({
    reference: "PRICE-BAND-ROOM-1",
    displayName: "Dải giá Phòng 1",
    roomReference: "ROOM-1",
    minimumStartingPriceExclusive: 0,
    maximumStartingPriceExclusive: 5_000_000,
  }),
  Object.freeze({
    reference: "PRICE-BAND-ROOM-2",
    displayName: "Dải giá Phòng 2",
    roomReference: "ROOM-2",
    minimumStartingPriceInclusive: 5_000_000,
    maximumStartingPriceExclusive: 20_000_000,
  }),
  Object.freeze({
    reference: "PRICE-BAND-ROOM-3",
    displayName: "Dải giá Phòng 3",
    roomReference: "ROOM-3",
    minimumStartingPriceInclusive: 20_000_000,
  }),
] as const satisfies readonly PriceBandDefinition[]);

const rooms = Object.freeze([
  Object.freeze({ reference: "ROOM-1", displayName: "Phòng 1" }),
  Object.freeze({ reference: "ROOM-2", displayName: "Phòng 2" }),
  Object.freeze({ reference: "ROOM-3", displayName: "Phòng 3" }),
  Object.freeze({ reference: "ROOM-VIP", displayName: "Phòng VIP" }),
  Object.freeze({ reference: "ROOM-EVENT", displayName: "Phòng Event" }),
] as const satisfies readonly RoomDefinition[]);

export const MEMBER_FEE_MATRIX = Object.freeze({
  REGISTER_MEMBER: Object.freeze({
    "ROOM-1": amount(35_000),
    "ROOM-2": amount(50_000),
    "ROOM-3": amount(60_000),
    "ROOM-VIP": amount(100_000),
    "ROOM-EVENT": eventFee,
  }),
  DONG: Object.freeze({
    "ROOM-1": amount(25_000),
    "ROOM-2": amount(40_000),
    "ROOM-3": amount(50_000),
    "ROOM-VIP": amount(80_000),
    "ROOM-EVENT": eventFee,
  }),
  BAC: Object.freeze({
    "ROOM-1": amount(15_000),
    "ROOM-2": amount(30_000),
    "ROOM-3": amount(40_000),
    "ROOM-VIP": amount(60_000),
    "ROOM-EVENT": eventFee,
  }),
  VANG: Object.freeze({
    "ROOM-1": mp("MP/1SP"),
    "ROOM-2": amount(20_000),
    "ROOM-3": amount(30_000),
    "ROOM-VIP": amount(40_000),
    "ROOM-EVENT": eventFee,
  }),
  KIM_CUONG: Object.freeze({
    "ROOM-1": mp("MP/1SP"),
    "ROOM-2": mp("MP/1SP"),
    "ROOM-3": mp("MP/1SP"),
    "ROOM-VIP": amount(30_000),
    "ROOM-EVENT": eventFee,
  }),
  VIP: Object.freeze({
    "ROOM-1": mp("MP"),
    "ROOM-2": mp("MP"),
    "ROOM-3": mp("MP"),
    "ROOM-VIP": mp("MP"),
    "ROOM-EVENT": eventFee,
  }),
} as const satisfies Record<
  MemberTitle,
  Record<AuctionRoomReference, ListingFee>
>);

const currentPolicy = Object.freeze({
  decisionId: "SGDG-ROOM-FEE-2017-PROTOTYPE",
  decisionVersion: 2,
  authorityType: "LEGACY_SOURCE_PROTOTYPE",
  approvalStatus: "REQUIRES_BUSINESS_RECONFIRMATION",
  sourceReference: "1_DeAnXayDungSan_SGDG — Article 12 fee table",
  disclaimer: AUCTION_ROOM_FEE_POLICY_DISCLAIMER,
  normalizationDisclaimer: PRICE_BAND_NORMALIZATION_DISCLAIMER,
  mpInterpretationDisclaimer: MP_INTERPRETATION_DISCLAIMER,
  priceBands,
  rooms,
  memberTitles: MEMBER_TITLE_DEFINITIONS,
  feeMatrix: MEMBER_FEE_MATRIX,
  specialRoomContext: Object.freeze({
    vipRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE",
    eventRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE",
    vipRoomFutureRequirement:
      "SPECIAL_ROOM_DECISION_REQUIRED_BEFORE_USE",
    eventRoomFutureRequirement:
      "EVENT_SPECIFIC_POLICY_REQUIRED_BEFORE_USE",
  }),
} as const);

export const getAuctionRoomFeePolicy = () => currentPolicy;

export const deriveOrdinaryRoom = (startingPrice: unknown) => {
  if (
    typeof startingPrice !== "number" ||
    !Number.isFinite(startingPrice) ||
    startingPrice <= 0
  )
    return undefined;
  const priceBand =
    startingPrice < 5_000_000
      ? priceBands[0]
      : startingPrice < 20_000_000
        ? priceBands[1]
        : priceBands[2];
  const room = rooms.find(
    (candidate) => candidate.reference === priceBand.roomReference,
  )!;
  return Object.freeze({ priceBand, room });
};

export const getMemberListingFee = ({
  memberTitle,
  room,
}: {
  memberTitle: MemberTitle;
  room: AuctionRoomReference;
}): ListingFee => MEMBER_FEE_MATRIX[memberTitle][room];

export const validateDerivedRoom = ({
  startingPrice,
  room,
}: {
  startingPrice: unknown;
  room: OrdinaryRoomReference;
}) => deriveOrdinaryRoom(startingPrice)?.room.reference === room;

type PolicySession = {
  recordKind?: string;
  creationSource: SessionCreationSource;
  managementMode: AuctionManagementMode;
  lifecycleStatus: string;
  publicationStatus: string;
};

export type RoomMemberFeeEvaluationResult =
  | {
      ready: true;
      branch: "CUSTOMER_REQUESTED";
      decisionId: "SGDG-ROOM-FEE-2017-PROTOTYPE";
      decisionVersion: 2;
      priceBandResolution: {
        sourceStatus: "SOURCE_SUPPORTED";
        reference: PriceBandReference;
        evaluatedStartingPrice: number;
        normalizationAssumption: "AMBIGUOUS_20M_BOUNDARY_NORMALIZED";
      };
      roomResolution: {
        sourceStatus: "SOURCE_SUPPORTED";
        roomReference: OrdinaryRoomReference;
        displayName: string;
        derivedFromPriceBand: PriceBandReference;
      };
      memberTitleReference: MemberTitleReference;
      listingFeeResolution: {
        applicability: "APPLICABLE";
        memberTitle: MemberTitle;
        roomReference: OrdinaryRoomReference;
        fee: Exclude<
          ListingFee,
          { kind: "EVENT_SPECIFIC_POLICY" | "UNDEFINED" }
        >;
      };
      specialRoomContext: {
        vipRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE";
        eventRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE";
        vipRoomFutureRequirement:
          "SPECIAL_ROOM_DECISION_REQUIRED_BEFORE_USE";
        eventRoomFutureRequirement:
          "EVENT_SPECIFIC_POLICY_REQUIRED_BEFORE_USE";
      };
      findings: readonly [];
    }
  | {
      ready: false;
      branch: "SGDG_MANAGED";
      code: "SGDG_MANAGED_FEE_DECISION_REQUIRED";
      decisionId: "SGDG-ROOM-FEE-2017-PROTOTYPE";
      decisionVersion: 2;
      priceBandResolution: {
        sourceStatus: "SOURCE_SUPPORTED";
        reference: PriceBandReference;
        evaluatedStartingPrice: number;
        normalizationAssumption: "AMBIGUOUS_20M_BOUNDARY_NORMALIZED";
      };
      roomResolution: {
        sourceStatus: "SOURCE_SUPPORTED";
        roomReference: OrdinaryRoomReference;
        displayName: string;
        derivedFromPriceBand: PriceBandReference;
      };
      listingFeeResolution: {
        applicability: "BUSINESS_DECISION_REQUIRED";
        reasonCode: "SGDG_MANAGED_FEE_APPLICABILITY_UNDEFINED";
      };
      specialRoomContext: {
        vipRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE";
        eventRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE";
        vipRoomFutureRequirement:
          "SPECIAL_ROOM_DECISION_REQUIRED_BEFORE_USE";
        eventRoomFutureRequirement:
          "EVENT_SPECIFIC_POLICY_REQUIRED_BEFORE_USE";
      };
      findings: readonly [
        {
          code: "SGDG_MANAGED_FEE_DECISION_REQUIRED";
          message: typeof SGDG_MANAGED_FEE_DECISION_MESSAGE;
        },
      ];
    }
  | {
      ready: false;
      code:
        | "INVALID_STARTING_PRICE"
        | "SESSION_OUT_OF_SCOPE"
        | "MEMBER_REFERENCE_NOT_FOUND"
        | "MEMBER_REFERENCE_STALE"
        | "MEMBER_TITLE_UNSUPPORTED"
        | "LISTING_FEE_UNRESOLVED"
        | "POLICY_VERSION_STALE"
        | "BLOCKED";
      findings: readonly { code: string; message: string }[];
    };

export const evaluateRoomAndMemberFee = ({
  session,
  proposal,
  memberReference,
  expectedPolicyVersion = currentPolicy.decisionVersion,
}: {
  session: PolicySession;
  proposal: { rules: { startingPrice: unknown } };
  memberReference?: MemberTitleReference;
  expectedPolicyVersion?: number;
}): RoomMemberFeeEvaluationResult => {
  if (expectedPolicyVersion !== currentPolicy.decisionVersion)
    return {
      ready: false,
      code: "POLICY_VERSION_STALE",
      findings: [
        {
          code: "POLICY_VERSION_STALE",
          message: "The expected policy version is stale.",
        },
      ],
    };
  if (
    !session.recordKind?.startsWith("DYNAMIC_") ||
    session.lifecycleStatus !== "DRAFT" ||
    session.publicationStatus !== "NOT_READY" ||
    !["OPENING_REQUEST", "DIRECT_SGDG"].includes(session.creationSource) ||
    !["CUSTOMER_REQUESTED", "SGDG_MANAGED"].includes(session.managementMode)
  )
    return {
      ready: false,
      code: "SESSION_OUT_OF_SCOPE",
      findings: [
        {
          code: "SESSION_OUT_OF_SCOPE",
          message: "The Session is outside the dynamic Configuration scope.",
        },
      ],
    };
  const derived = deriveOrdinaryRoom(proposal.rules.startingPrice);
  if (!derived)
    return {
      ready: false,
      code: "INVALID_STARTING_PRICE",
      findings: [
        {
          code: "INVALID_STARTING_PRICE",
          message: "Starting Price must be a finite positive number.",
        },
      ],
    };

  const base = {
    ready: true as const,
    decisionId: currentPolicy.decisionId,
    decisionVersion: currentPolicy.decisionVersion,
    priceBandResolution: {
      sourceStatus: "SOURCE_SUPPORTED" as const,
      reference: derived.priceBand.reference,
      evaluatedStartingPrice: proposal.rules.startingPrice as number,
      normalizationAssumption:
        "AMBIGUOUS_20M_BOUNDARY_NORMALIZED" as const,
    },
    roomResolution: {
      sourceStatus: "SOURCE_SUPPORTED" as const,
      roomReference: derived.room.reference as OrdinaryRoomReference,
      displayName: derived.room.displayName,
      derivedFromPriceBand: derived.priceBand.reference,
    },
    specialRoomContext: {
      vipRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE" as const,
      eventRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE" as const,
      vipRoomFutureRequirement:
        "SPECIAL_ROOM_DECISION_REQUIRED_BEFORE_USE" as const,
      eventRoomFutureRequirement:
        "EVENT_SPECIFIC_POLICY_REQUIRED_BEFORE_USE" as const,
    },
  };

  if (
    session.creationSource === "DIRECT_SGDG" &&
    session.managementMode === "SGDG_MANAGED"
  )
    return {
      ...base,
      ready: false,
      branch: "SGDG_MANAGED",
      code: "SGDG_MANAGED_FEE_DECISION_REQUIRED",
      listingFeeResolution: {
        applicability: "BUSINESS_DECISION_REQUIRED",
        reasonCode: "SGDG_MANAGED_FEE_APPLICABILITY_UNDEFINED",
      },
      findings: [
        {
          code: "SGDG_MANAGED_FEE_DECISION_REQUIRED",
          message: SGDG_MANAGED_FEE_DECISION_MESSAGE,
        },
      ],
    };
  if (!memberReference)
    return {
      ready: false,
      code: "MEMBER_REFERENCE_NOT_FOUND",
      findings: [
        {
          code: "MEMBER_REFERENCE_NOT_FOUND",
          message: "A current read-only Membership reference is required.",
        },
      ],
    };
  const fee = getMemberListingFee({
    memberTitle: memberReference.title,
    room: derived.room.reference,
  });
  if (fee.kind === "EVENT_SPECIFIC_POLICY" || fee.kind === "UNDEFINED")
    return {
      ready: false,
      code: "LISTING_FEE_UNRESOLVED",
      findings: [
        {
          code: "LISTING_FEE_UNRESOLVED",
          message: "Member Listing Fee could not be resolved.",
        },
      ],
    };
  return {
    ...base,
    branch: "CUSTOMER_REQUESTED",
    memberTitleReference: Object.freeze({ ...memberReference }),
    listingFeeResolution: {
      applicability: "APPLICABLE",
      memberTitle: memberReference.title,
      roomReference: derived.room.reference as OrdinaryRoomReference,
      fee,
    },
    findings: [],
  };
};
