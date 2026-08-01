import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StaffRole } from "../config/staffRoles";
import type { ActorRole } from "../types/domain";
import type {
  AuctionManagementMode,
  AuctionSessionFixture,
} from "../services/mock/operationsService";
import {
  type PersistedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";
import {
  AUCTION_ROOM_FEE_POLICY_DISCLAIMER,
  evaluateRoomAndMemberFee,
  getAuctionRoomFeePolicy,
  PRICE_BAND_NORMALIZATION_DISCLAIMER,
  SGDG_MANAGED_FEE_DECISION_MESSAGE,
  type ListingFee,
  type MemberTitle,
  type MemberTitleReference,
  type OrdinaryRoomReference,
  type PriceBandReference,
} from "../services/roomValueTierPolicy";
import { getMembershipAccountReference } from "../services/membershipAccountReference";
import { useOpeningRequestStore } from "./openingRequestStore";

export type ConfigurationProposalStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "RETURNED_FOR_CORRECTION"
  | "CONFIRMED";

export type ConfigurationSection =
  | "MANAGEMENT_MODE"
  | "RULES"
  | "PRICE_BAND"
  | "ROOM"
  | "MEMBER_FEE"
  | "SESSION";

export interface AuctionConfigurationRules {
  startingPrice: number | null;
  minimumIncrement: number | null;
  depositPolicyReference: string;
  eligibilityPolicyReference: string;
  extensionPolicyReference: string;
  fallbackPolicyReference: string;
}

export interface ConfigurationPolicyDecisionReference {
  decisionId: "SGDG-ROOM-FEE-2017-PROTOTYPE";
  decisionVersion: 2;
  authorityType: "LEGACY_SOURCE_PROTOTYPE";
  approvalStatus: "REQUIRES_BUSINESS_RECONFIRMATION";
  sourceReference: "1_DeAnXayDungSan_SGDG — Article 12 fee table";
}

export interface ConfigurationPriceBandResolution {
  sourceStatus: "SOURCE_SUPPORTED";
  reference: PriceBandReference;
  evaluatedStartingPrice: number;
  normalizationAssumption: "AMBIGUOUS_20M_BOUNDARY_NORMALIZED";
}

export interface ConfigurationRoomResolution {
  sourceStatus: "SOURCE_SUPPORTED";
  roomReference: OrdinaryRoomReference;
  displayName: string;
  derivedFromPriceBand: PriceBandReference;
}

export type ConfigurationListingFeeResolution =
  | {
      applicability: "APPLICABLE";
      memberTitle: MemberTitle;
      roomReference: OrdinaryRoomReference;
      fee: Exclude<
        ListingFee,
        { kind: "EVENT_SPECIFIC_POLICY" | "UNDEFINED" }
      >;
    }
  | {
      applicability: "MEMBER_REFERENCE_REQUIRED";
    }
  | {
      applicability: "BUSINESS_DECISION_REQUIRED";
      reasonCode: "SGDG_MANAGED_FEE_APPLICABILITY_UNDEFINED";
    };

export interface ConfigurationSpecialRoomContext {
  vipRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE";
  eventRoomStatus: "OUT_OF_CURRENT_CONFIGURATION_SCOPE";
  vipRoomFutureRequirement:
    "SPECIAL_ROOM_DECISION_REQUIRED_BEFORE_USE";
  eventRoomFutureRequirement:
    "EVENT_SPECIFIC_POLICY_REQUIRED_BEFORE_USE";
}

export type RoomResolutionState = "REQUIRED" | "APPLIED" | "STALE" | "BLOCKED";
export type ListingFeeResolutionState =
  | "REQUIRED"
  | "APPLIED"
  | "STALE"
  | "BUSINESS_DECISION_REQUIRED"
  | "BLOCKED";
export type OverallConfigurationResolutionState =
  | "READY"
  | "INCOMPLETE"
  | "STALE"
  | "BUSINESS_DECISION_REQUIRED"
  | "BLOCKED";

export interface ConfigurationCorrectionContext {
  reason: string;
  affectedSections: ConfigurationSection[];
  requestedBy: string;
  requestedAt: string;
}

export type ConfigurationHistoryAction =
  | "CONFIGURATION_DRAFT_CREATED"
  | "CONFIGURATION_DRAFT_SAVED"
  | "CONFIGURATION_SUBMITTED"
  | "CONFIGURATION_CORRECTION_REQUESTED"
  | "ROOM_MEMBER_FEE_RESOLUTION_COMPLETED"
  | "AUCTION_ROOM_RESOLVED_FEE_DECISION_REQUIRED"
  | "PRICE_BAND_DERIVED"
  | "ORDINARY_ROOM_DERIVED"
  | "MEMBER_REFERENCE_VALIDATED"
  | "MEMBER_LISTING_FEE_RESOLVED"
  | "SGDG_MANAGED_FEE_DECISION_REQUIRED"
  | "CONFIGURATION_SUBMISSION_BLOCKED"
  | "CONFIGURATION_CONFIRMATION_BLOCKED"
  | "CONFIGURATION_RESUBMITTED"
  | "CONFIGURATION_CONFIRMED"
  | "CONFIGURATION_SNAPSHOT_CREATED";

export interface AuctionConfigurationHistoryEntry {
  historyId: string;
  configurationId: string;
  sessionId: string;
  proposalVersion: number;
  action: ConfigurationHistoryAction;
  fromStatus?: ConfigurationProposalStatus;
  toStatus: ConfigurationProposalStatus;
  actorId: string;
  actorRole: StaffRole;
  commandId: string;
  reason?: string;
  affectedSections?: ConfigurationSection[];
  occurredAt: string;
  visibility: "STAFF_ONLY";
  policyDecisionId?: "SGDG-ROOM-FEE-2017-PROTOTYPE";
  policyDecisionVersion?: 2;
  startingPrice?: number;
  priceBandReference?: PriceBandReference;
  roomReference?: OrdinaryRoomReference;
  memberTitle?: MemberTitle;
  listingFee?: ListingFee | ConfigurationListingFeeResolution;
}

export interface AuctionConfigurationProposalVersion {
  proposalVersion: number;
  status: ConfigurationProposalStatus;
  rules: AuctionConfigurationRules;
  recordedAt: string;
  recordedBy: string;
  commandId: string;
}

export interface AuctionConfigurationProposal {
  configurationId: string;
  sessionId: string;
  sessionVersion: number;
  proposalVersion: number;
  status: ConfigurationProposalStatus;
  creationSource: AuctionSessionFixture["creationSource"];
  managementMode: AuctionManagementMode;
  rules: AuctionConfigurationRules;
  createdBy: string;
  updatedBy: string;
  submittedBy?: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  confirmedAt?: string;
  correctionContext?: ConfigurationCorrectionContext;
  roomResolutionState: RoomResolutionState;
  listingFeeResolutionState: ListingFeeResolutionState;
  overallConfigurationResolutionState: OverallConfigurationResolutionState;
  policyDecisionReference?: ConfigurationPolicyDecisionReference;
  priceBandResolution?: ConfigurationPriceBandResolution;
  roomResolution?: ConfigurationRoomResolution;
  memberTitleReference?: MemberTitleReference;
  listingFeeResolution?: ConfigurationListingFeeResolution;
  specialRoomContext?: ConfigurationSpecialRoomContext;
  policyDisclaimer?: typeof AUCTION_ROOM_FEE_POLICY_DISCLAIMER;
  normalizationDisclaimer?: typeof PRICE_BAND_NORMALIZATION_DISCLAIMER;
  legacyPolicyState?:
    | "LEGACY_PROTOTYPE_POLICY"
    | "LEGACY_SGDG_FEE_UNRESOLVED"
    | "LEGACY_CUSTOMER_REVALIDATION_REQUIRED";
  versions: AuctionConfigurationProposalVersion[];
  history: AuctionConfigurationHistoryEntry[];
}

export interface ConfirmedAuctionConfigurationSnapshot {
  snapshotId: string;
  configurationId: string;
  sessionId: string;
  sessionVersionAtConfirmation: number;
  proposalVersion: number;
  creationSource: "OPENING_REQUEST";
  managementMode: "CUSTOMER_REQUESTED";
  rules: Readonly<AuctionConfigurationRules>;
  policyDecisionReference: Readonly<ConfigurationPolicyDecisionReference>;
  policyDisclaimer: typeof AUCTION_ROOM_FEE_POLICY_DISCLAIMER;
  normalizationDisclaimer: typeof PRICE_BAND_NORMALIZATION_DISCLAIMER;
  priceBandResolution: Readonly<ConfigurationPriceBandResolution>;
  roomResolution: Readonly<ConfigurationRoomResolution>;
  memberTitleReference: Readonly<MemberTitleReference>;
  listingFeeResolution: Readonly<
    Extract<ConfigurationListingFeeResolution, { applicability: "APPLICABLE" }>
  >;
  specialRoomContext: Readonly<ConfigurationSpecialRoomContext>;
  confirmedBy: string;
  confirmedAt: string;
  confirmationCommandReference: string;
  snapshotVersion: 1;
}

export interface LegacyAuctionConfigurationSnapshot {
  snapshotId: string;
  configurationId: string;
  sessionId: string;
  proposalVersion: number;
  snapshotVersion: 1;
  policyClassification:
    | "LEGACY_PROTOTYPE_POLICY"
    | "LEGACY_SGDG_FEE_UNRESOLVED"
    | "LEGACY_CUSTOMER_REVALIDATION_REQUIRED";
  originalConfirmedBy?: string;
  originalConfirmedAt?: string;
  legacyEvidence: Readonly<Record<string, unknown>>;
}

export interface ConfigurationFinding {
  code: string;
  message: string;
  owner: "CONTENT_STAFF" | "ADMIN" | "BUSINESS_DECISION" | "AUCTION_SYSTEM";
  severity: "ERROR" | "WARNING";
  section: ConfigurationSection;
  correctableInCurrentWorkspace: boolean;
  field?: keyof AuctionConfigurationRules;
}

export interface ConfigurationValidationResult {
  validForSubmission: boolean;
  validForConfirmation: boolean;
  findings: ConfigurationFinding[];
}

export type ConfigurationCommandErrorCode =
  | "SESSION_NOT_FOUND"
  | "CONFIGURATION_NOT_FOUND"
  | "ACCESS_DENIED"
  | "INVALID_SESSION_STATE"
  | "INVALID_TRANSITION"
  | "STALE_SESSION_VERSION"
  | "STALE_PROPOSAL_VERSION"
  | "STALE_POLICY_VERSION"
  | "POLICY_SCOPE_MISMATCH"
  | "POLICY_RESOLUTION_STALE"
  | "INVALID_STARTING_PRICE"
  | "MEMBER_REFERENCE_NOT_FOUND"
  | "MEMBER_REFERENCE_STALE"
  | "FEE_APPLICABILITY_UNRESOLVED"
  | "SGDG_MANAGED_FEE_DECISION_REQUIRED"
  | "VALIDATION_ERROR"
  | "DUPLICATE_COMMAND"
  | "ALREADY_SUBMITTED"
  | "ALREADY_CONFIRMED"
  | "BLOCKING_CONDITION"
  | "PERSISTENCE_ERROR"
  | "BLOCKED";

export type ConfigurationCommandResult =
  | {
      ok: true;
      proposal: AuctionConfigurationProposal;
      created?: boolean;
      snapshot?: ConfirmedAuctionConfigurationSnapshot;
    }
  | {
      ok: false;
      code: ConfigurationCommandErrorCode;
      message: string;
      fieldErrors?: Partial<Record<keyof AuctionConfigurationRules, string>>;
      currentProposalVersion?: number;
      currentSessionVersion?: number;
      snapshot?: ConfirmedAuctionConfigurationSnapshot;
    };

export interface CreateConfigurationDraftCommand {
  sessionId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedSessionVersion: number;
  commandId: string;
}

export interface SaveConfigurationDraftCommand {
  configurationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedProposalVersion: number;
  commandId: string;
  values: AuctionConfigurationRules;
}

export interface SubmitConfigurationProposalCommand {
  configurationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedProposalVersion: number;
  expectedSessionVersion: number;
  commandId: string;
}

export interface RequestConfigurationCorrectionCommand {
  configurationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedProposalVersion: number;
  commandId: string;
  reason: string;
  affectedSections: ConfigurationSection[];
}

export interface ConfirmConfigurationProposalCommand {
  configurationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedProposalVersion: number;
  expectedSessionVersion: number;
  commandId: string;
}

export interface ApplyAuctionRoomMemberFeeResolutionCommand {
  configurationId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedProposalVersion: number;
  expectedSessionVersion: number;
  expectedPolicyVersion: number;
  commandId: string;
}

interface AuctionConfigurationState {
  proposals: AuctionConfigurationProposal[];
  snapshots: ConfirmedAuctionConfigurationSnapshot[];
  legacySnapshots: LegacyAuctionConfigurationSnapshot[];
  getProposalBySessionId: (
    sessionId: string,
  ) => AuctionConfigurationProposal | undefined;
  getProposalById: (
    configurationId: string,
  ) => AuctionConfigurationProposal | undefined;
  getSubmittedProposals: () => AuctionConfigurationProposal[];
  getConfirmedSnapshotBySessionId: (
    sessionId: string,
  ) => ConfirmedAuctionConfigurationSnapshot | undefined;
  createConfigurationDraft: (
    command: CreateConfigurationDraftCommand,
  ) => ConfigurationCommandResult;
  saveConfigurationDraft: (
    command: SaveConfigurationDraftCommand,
  ) => ConfigurationCommandResult;
  submitConfigurationProposal: (
    command: SubmitConfigurationProposalCommand,
  ) => ConfigurationCommandResult;
  requestConfigurationCorrection: (
    command: RequestConfigurationCorrectionCommand,
  ) => ConfigurationCommandResult;
  applyAuctionRoomMemberFeeResolution: (
    command: ApplyAuctionRoomMemberFeeResolutionCommand,
  ) => ConfigurationCommandResult;
  confirmConfigurationProposal: (
    command: ConfirmConfigurationProposalCommand,
  ) => ConfigurationCommandResult;
  resetDeterministicConfigurationState: () => void;
}

export const configurationStorageKey = "sgdg-auction-configurations-v1";
const supportedSections: ConfigurationSection[] = [
  "MANAGEMENT_MODE",
  "RULES",
  "PRICE_BAND",
  "ROOM",
  "MEMBER_FEE",
  "SESSION",
];

const emptyRules = (): AuctionConfigurationRules => ({
  startingPrice: null,
  minimumIncrement: null,
  depositPolicyReference: "",
  eligibilityPolicyReference: "",
  extensionPolicyReference: "",
  fallbackPolicyReference: "",
});

const normalizeIdPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const cloneRules = (
  rules: AuctionConfigurationRules,
): AuctionConfigurationRules => ({ ...rules });

const deterministicTimestamp = (version: number, offset = 0) =>
  new Date(Date.UTC(2026, 6, 26, 9, version + offset, 0)).toISOString();

const commandFailure = (
  code: ConfigurationCommandErrorCode,
  message: string,
  details?: Pick<
    Extract<ConfigurationCommandResult, { ok: false }>,
    | "fieldErrors"
    | "currentProposalVersion"
    | "currentSessionVersion"
    | "snapshot"
  >,
): ConfigurationCommandResult => ({ ok: false, code, message, ...details });

const getSession = (
  sessionId: string,
): PersistedAuctionSession | AuctionSessionFixture | undefined =>
  useAuctionSessionStore.getState().getSessionById(sessionId);

const getDynamicSession = (
  sessionId: string,
): PersistedAuctionSession | undefined => {
  const session = getSession(sessionId);
  return session && "recordKind" in session ? session : undefined;
};

const validateDynamicSession = (
  sessionId: string,
  expectedVersion?: number,
): { session: PersistedAuctionSession } | { failure: ConfigurationCommandResult } => {
  const anySession = getSession(sessionId);
  if (!anySession)
    return {
      failure: commandFailure(
        "SESSION_NOT_FOUND",
        "Không tìm thấy Auction Session.",
      ),
    };
  if (!("recordKind" in anySession))
    return {
      failure: commandFailure(
        "INVALID_SESSION_STATE",
        "Fixture Session chỉ hỗ trợ chế độ tương thích và không thể trở thành cấu hình động.",
      ),
    };
  const session = anySession;
  if (
    session.lifecycleStatus !== "DRAFT" ||
    session.publicationStatus !== "NOT_READY"
  )
    return {
      failure: commandFailure(
        "INVALID_SESSION_STATE",
        "Configuration chỉ được chuẩn bị cho Session DRAFT / NOT_READY.",
      ),
    };
  if (
    expectedVersion !== undefined &&
    session.currentVersion !== expectedVersion
  )
    return {
      failure: commandFailure(
        "STALE_SESSION_VERSION",
        "Session đã thay đổi. Hãy tải lại trước khi tiếp tục.",
        { currentSessionVersion: session.currentVersion },
      ),
    };
  return { session };
};

const policyReferenceValid = (value: string) =>
  /^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(value.trim());

export function validateConfiguration(
  rules: AuctionConfigurationRules,
): ConfigurationValidationResult {
  const findings: ConfigurationFinding[] = [];
  const requiredNumber = (
    field: "startingPrice" | "minimumIncrement",
    label: string,
  ) => {
    const value = rules[field];
    if (value === null) {
      findings.push({
        code: `MISSING_${field.toUpperCase()}`,
        message: `${label} là bắt buộc trước khi gửi xác nhận.`,
        owner: "CONTENT_STAFF",
        severity: "ERROR",
        section: "RULES",
        correctableInCurrentWorkspace: true,
        field,
      });
    } else if (!Number.isFinite(value) || value <= 0) {
      findings.push({
        code: `INVALID_${field.toUpperCase()}`,
        message: `${label} phải là số hữu hạn lớn hơn 0.`,
        owner: "CONTENT_STAFF",
        severity: "ERROR",
        section: "RULES",
        correctableInCurrentWorkspace: true,
        field,
      });
    }
  };
  requiredNumber("startingPrice", "Giá khởi điểm");
  requiredNumber("minimumIncrement", "Bước giá tối thiểu");
  if (
    rules.startingPrice !== null &&
    rules.minimumIncrement !== null &&
    Number.isFinite(rules.startingPrice) &&
    Number.isFinite(rules.minimumIncrement) &&
    rules.minimumIncrement > rules.startingPrice
  )
    findings.push({
      code: "INCREMENT_EXCEEDS_STARTING_PRICE",
      message: "Bước giá tối thiểu không được vượt giá khởi điểm.",
      owner: "CONTENT_STAFF",
      severity: "ERROR",
      section: "RULES",
      correctableInCurrentWorkspace: true,
      field: "minimumIncrement",
    });

  (
    [
      ["depositPolicyReference", "Deposit"],
      ["eligibilityPolicyReference", "Eligibility"],
      ["extensionPolicyReference", "Extension"],
      ["fallbackPolicyReference", "Fallback"],
    ] as const
  ).forEach(([field, label]) => {
    if (!policyReferenceValid(rules[field]))
      findings.push({
        code: `INVALID_${field.toUpperCase()}`,
        message: `${label} policy reference là bắt buộc và phải là identifier hợp lệ.`,
        owner: "CONTENT_STAFF",
        severity: "ERROR",
        section: "RULES",
        correctableInCurrentWorkspace: true,
        field,
      });
  });

  const ruleErrors = findings.some(
    (finding) => finding.severity === "ERROR",
  );
  return {
    validForSubmission: !ruleErrors,
    validForConfirmation: !ruleErrors,
    findings,
  };
}

const draftStructureErrors = (
  rules: AuctionConfigurationRules,
): Partial<Record<keyof AuctionConfigurationRules, string>> => {
  const errors: Partial<Record<keyof AuctionConfigurationRules, string>> = {};
  (["startingPrice", "minimumIncrement"] as const).forEach((field) => {
    const value = rules[field];
    if (value !== null && (!Number.isFinite(value) || value <= 0))
      errors[field] = "Giá trị phải là số hữu hạn lớn hơn 0 hoặc để trống.";
  });
  return errors;
};

const sanitizeRulesInput = (
  input: AuctionConfigurationRules,
): AuctionConfigurationRules => ({
  startingPrice: input.startingPrice,
  minimumIncrement: input.minimumIncrement,
  depositPolicyReference: String(input.depositPolicyReference ?? "").trim(),
  eligibilityPolicyReference: String(
    input.eligibilityPolicyReference ?? "",
  ).trim(),
  extensionPolicyReference: String(input.extensionPolicyReference ?? "").trim(),
  fallbackPolicyReference: String(input.fallbackPolicyReference ?? "").trim(),
});

const fieldErrorsFromFindings = (
  findings: ConfigurationFinding[],
): Partial<Record<keyof AuctionConfigurationRules, string>> =>
  findings.reduce<Partial<Record<keyof AuctionConfigurationRules, string>>>(
    (errors, finding) => {
      if (finding.field && finding.severity === "ERROR")
        errors[finding.field] = finding.message;
      return errors;
    },
    {},
  );

const makeHistory = ({
  proposal,
  action,
  fromStatus,
  toStatus,
  actorId,
  actorRole,
  commandId,
  version,
  reason,
  affectedSections,
  time,
  policyEvidence,
}: {
  proposal: Pick<AuctionConfigurationProposal, "configurationId" | "sessionId">;
  action: ConfigurationHistoryAction;
  fromStatus?: ConfigurationProposalStatus;
  toStatus: ConfigurationProposalStatus;
  actorId: string;
  actorRole: StaffRole;
  commandId: string;
  version: number;
  reason?: string;
  affectedSections?: ConfigurationSection[];
  time: string;
  policyEvidence?: {
    startingPrice: number;
    priceBandReference: PriceBandReference;
    roomReference: OrdinaryRoomReference;
    memberTitle?: MemberTitle;
    listingFee: ListingFee | ConfigurationListingFeeResolution;
  };
}): AuctionConfigurationHistoryEntry => ({
  historyId: `${proposal.configurationId}-history-${version}-${action
    .toLowerCase()
    .replaceAll("_", "-")}`,
  configurationId: proposal.configurationId,
  sessionId: proposal.sessionId,
  proposalVersion: version,
  action,
  fromStatus,
  toStatus,
  actorId,
  actorRole,
  commandId,
  reason,
  affectedSections,
  occurredAt: time,
  visibility: "STAFF_ONLY",
  ...(policyEvidence
    ? {
        policyDecisionId: "SGDG-ROOM-FEE-2017-PROTOTYPE" as const,
        policyDecisionVersion: 2 as const,
        startingPrice: policyEvidence.startingPrice,
        priceBandReference: policyEvidence.priceBandReference,
        roomReference: policyEvidence.roomReference,
        memberTitle: policyEvidence.memberTitle,
        listingFee: policyEvidence.listingFee,
      }
    : {}),
});

const makeVersion = (
  proposalVersion: number,
  status: ConfigurationProposalStatus,
  rules: AuctionConfigurationRules,
  recordedAt: string,
  recordedBy: string,
  commandId: string,
): AuctionConfigurationProposalVersion => ({
  proposalVersion,
  status,
  rules: cloneRules(rules),
  recordedAt,
  recordedBy,
  commandId,
});

const commandOwner = (
  proposals: AuctionConfigurationProposal[],
  commandId: string,
) =>
  proposals.find((proposal) =>
    proposal.history.some((entry) => entry.commandId === commandId),
  );

const getMemberReferenceForSession = (
  session: PersistedAuctionSession,
): MemberTitleReference | undefined => {
  if (session.recordKind !== "DYNAMIC_LINKED_SESSION") return undefined;
  const request = useOpeningRequestStore
    .getState()
    .records.find((item) => item.requestId === session.openingRequestId);
  return request
    ? getMembershipAccountReference(request.ownerId)
    : undefined;
};

type PersistablePolicyEvaluation = Extract<
  ReturnType<typeof evaluateRoomAndMemberFee>,
  | { ready: true }
  | { code: "SGDG_MANAGED_FEE_DECISION_REQUIRED" }
>;

const buildPolicyEvidence = (evaluation: PersistablePolicyEvaluation) => ({
  policyDecisionReference: {
    decisionId: evaluation.decisionId,
    decisionVersion: evaluation.decisionVersion,
    authorityType: "LEGACY_SOURCE_PROTOTYPE" as const,
    approvalStatus: "REQUIRES_BUSINESS_RECONFIRMATION" as const,
    sourceReference:
      "1_DeAnXayDungSan_SGDG — Article 12 fee table" as const,
  },
  priceBandResolution: { ...evaluation.priceBandResolution },
  roomResolution: { ...evaluation.roomResolution },
  ...("memberTitleReference" in evaluation
    ? { memberTitleReference: { ...evaluation.memberTitleReference } }
    : {}),
  listingFeeResolution: structuredClone(evaluation.listingFeeResolution),
  specialRoomContext: { ...evaluation.specialRoomContext },
  policyDisclaimer: AUCTION_ROOM_FEE_POLICY_DISCLAIMER,
  normalizationDisclaimer: PRICE_BAND_NORMALIZATION_DISCLAIMER,
});

const policyResolutionMatches = (
  proposal: AuctionConfigurationProposal,
  session: PersistedAuctionSession,
) => {
  const evaluation = evaluateRoomAndMemberFee({
    session,
    proposal,
    memberReference: getMemberReferenceForSession(session),
  });
  if (
    !evaluation.ready &&
    evaluation.code !== "SGDG_MANAGED_FEE_DECISION_REQUIRED"
  )
    return { ok: false as const, resolutionReady: false as const, evaluation };
  const expected = buildPolicyEvidence(evaluation);
  const expectedStates =
    evaluation.ready
      ? {
          roomResolutionState: "APPLIED" as const,
          listingFeeResolutionState: "APPLIED" as const,
          overallConfigurationResolutionState: "READY" as const,
        }
      : {
          roomResolutionState: "APPLIED" as const,
          listingFeeResolutionState:
            "BUSINESS_DECISION_REQUIRED" as const,
          overallConfigurationResolutionState:
            "BUSINESS_DECISION_REQUIRED" as const,
        };
  const matches =
    proposal.roomResolutionState === expectedStates.roomResolutionState &&
    proposal.listingFeeResolutionState ===
      expectedStates.listingFeeResolutionState &&
    proposal.overallConfigurationResolutionState ===
      expectedStates.overallConfigurationResolutionState &&
    JSON.stringify(proposal.policyDecisionReference) ===
      JSON.stringify(expected.policyDecisionReference) &&
    JSON.stringify(proposal.priceBandResolution) ===
      JSON.stringify(expected.priceBandResolution) &&
    JSON.stringify(proposal.roomResolution) ===
      JSON.stringify(expected.roomResolution) &&
    JSON.stringify(proposal.memberTitleReference) ===
      JSON.stringify(expected.memberTitleReference) &&
    JSON.stringify(proposal.listingFeeResolution) ===
      JSON.stringify(expected.listingFeeResolution) &&
    JSON.stringify(proposal.specialRoomContext) ===
      JSON.stringify(expected.specialRoomContext) &&
    proposal.policyDisclaimer === expected.policyDisclaimer &&
    proposal.normalizationDisclaimer === expected.normalizationDisclaimer;
  return {
    ok: matches,
    resolutionReady: matches && evaluation.ready,
    evaluation,
    expected,
  };
};

const forbiddenLaterPhaseKeys = new Set([
  "approvalPackageId",
  "approvedVersion",
  "schedule",
  "scheduleVersion",
  "publication",
  "publicationAt",
  "publicationTimestamp",
  "registration",
  "registrationState",
]);

const containsForbiddenKey = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  return Object.entries(value).some(
    ([key, nested]) =>
      forbiddenLaterPhaseKeys.has(key) || containsForbiddenKey(nested),
  );
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isString = (value: unknown): value is string =>
  typeof value === "string";

const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) > 0;

const isRules = (value: unknown): value is AuctionConfigurationRules => {
  if (!isPlainObject(value)) return false;
  const startingPrice = value.startingPrice;
  const minimumIncrement = value.minimumIncrement;
  return (
    (startingPrice === null ||
      (typeof startingPrice === "number" && Number.isFinite(startingPrice))) &&
    (minimumIncrement === null ||
      (typeof minimumIncrement === "number" &&
        Number.isFinite(minimumIncrement))) &&
    isString(value.depositPolicyReference) &&
    isString(value.eligibilityPolicyReference) &&
    isString(value.extensionPolicyReference) &&
    isString(value.fallbackPolicyReference) &&
    Object.keys(value).every((key) =>
      [
        "startingPrice",
        "minimumIncrement",
        "depositPolicyReference",
        "eligibilityPolicyReference",
        "extensionPolicyReference",
        "fallbackPolicyReference",
      ].includes(key),
    )
  );
};

const isHistoryEntry = (
  value: unknown,
  proposal: AuctionConfigurationProposal,
): value is AuctionConfigurationHistoryEntry =>
  isPlainObject(value) &&
  isString(value.historyId) &&
  value.configurationId === proposal.configurationId &&
  value.sessionId === proposal.sessionId &&
  isPositiveInteger(value.proposalVersion) &&
  [
    "CONFIGURATION_DRAFT_CREATED",
    "CONFIGURATION_DRAFT_SAVED",
    "CONFIGURATION_SUBMITTED",
    "CONFIGURATION_CORRECTION_REQUESTED",
    "ROOM_MEMBER_FEE_RESOLUTION_COMPLETED",
    "AUCTION_ROOM_RESOLVED_FEE_DECISION_REQUIRED",
    "AUCTION_ROOM_MEMBER_FEE_POLICY_APPLIED",
    "PRICE_BAND_DERIVED",
    "ORDINARY_ROOM_DERIVED",
    "MEMBER_REFERENCE_VALIDATED",
    "MEMBER_LISTING_FEE_RESOLVED",
    "SGDG_MANAGED_FEE_DECISION_REQUIRED",
    "CONFIGURATION_SUBMISSION_BLOCKED",
    "CONFIGURATION_CONFIRMATION_BLOCKED",
    "ROOM_VALUE_TIER_POLICY_APPLIED",
    "VALUE_TIER_DERIVED",
    "ROOM_PROFILE_DERIVED",
    "ROOM_TIER_COMPATIBILITY_VALIDATED",
    "CONFIGURATION_RESUBMITTED",
    "CONFIGURATION_CONFIRMED",
    "CONFIGURATION_SNAPSHOT_CREATED",
  ].includes(String(value.action)) &&
  ["DRAFT", "SUBMITTED", "RETURNED_FOR_CORRECTION", "CONFIRMED"].includes(
    String(value.toStatus),
  ) &&
  isString(value.actorId) &&
  ["ADMIN", "CONTENT_STAFF", "CUSTOMER_SUPPORT", "FINANCE"].includes(
    String(value.actorRole),
  ) &&
  isString(value.commandId) &&
  isString(value.occurredAt) &&
  value.visibility === "STAFF_ONLY";

const isProposalVersion = (
  value: unknown,
): value is AuctionConfigurationProposalVersion =>
  isPlainObject(value) &&
  isPositiveInteger(value.proposalVersion) &&
  ["DRAFT", "SUBMITTED", "RETURNED_FOR_CORRECTION", "CONFIRMED"].includes(
    String(value.status),
  ) &&
  isRules(value.rules) &&
  isString(value.recordedAt) &&
  isString(value.recordedBy) &&
  isString(value.commandId);

const isProposal = (
  value: unknown,
  sourceSchemaVersion: number,
): value is AuctionConfigurationProposal => {
  if (!isPlainObject(value) || containsForbiddenKey(value)) return false;
  if (
    sourceSchemaVersion >= 4 &&
    ("room" in value ||
      "valueTier" in value ||
      "policyResolutionState" in value ||
      "specialRooms" in value)
  )
    return false;
  const proposal = value as unknown as AuctionConfigurationProposal;
  const session = isString(value.sessionId)
    ? getDynamicSession(value.sessionId)
    : undefined;
  if (!session) return false;
  const validBase =
    isString(value.configurationId) &&
    value.configurationId ===
      `configuration-${normalizeIdPart(value.sessionId as string)}` &&
    isPositiveInteger(value.sessionVersion) &&
    isPositiveInteger(value.proposalVersion) &&
    ["DRAFT", "SUBMITTED", "RETURNED_FOR_CORRECTION", "CONFIRMED"].includes(
      String(value.status),
    ) &&
    value.creationSource === session.creationSource &&
    value.managementMode === session.managementMode &&
    isRules(value.rules) &&
    (sourceSchemaVersion < 4 ||
      ["REQUIRED", "APPLIED", "STALE", "BLOCKED"].includes(
        String(value.roomResolutionState),
      )) &&
    (sourceSchemaVersion < 4 ||
      [
        "REQUIRED",
        "APPLIED",
        "STALE",
        "BUSINESS_DECISION_REQUIRED",
        "BLOCKED",
      ].includes(String(value.listingFeeResolutionState))) &&
    (sourceSchemaVersion < 4 ||
      [
        "READY",
        "INCOMPLETE",
        "STALE",
        "BUSINESS_DECISION_REQUIRED",
        "BLOCKED",
      ].includes(String(value.overallConfigurationResolutionState))) &&
    isString(value.createdBy) &&
    isString(value.updatedBy) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    Array.isArray(value.versions) &&
    value.versions.length > 0 &&
    value.versions.every(isProposalVersion) &&
    Array.isArray(value.history) &&
    value.history.length > 0;
  if (!validBase) return false;
  if (!proposal.history.every((entry) => isHistoryEntry(entry, proposal)))
    return false;
  const versionNumbers = proposal.versions.map((entry) => entry.proposalVersion);
  if (new Set(versionNumbers).size !== versionNumbers.length) return false;
  if (Math.max(...versionNumbers) !== proposal.proposalVersion) return false;
  if (proposal.status === "CONFIRMED" && !proposal.confirmedAt) return false;
  return true;
};

const sameRules = (
  left: AuctionConfigurationRules,
  right: AuctionConfigurationRules,
) => JSON.stringify(left) === JSON.stringify(right);

const deepFreeze = <T,>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach((nested) =>
      deepFreeze(nested),
    );
    Object.freeze(value);
  }
  return value;
};

const freezeSnapshot = (
  value: ConfirmedAuctionConfigurationSnapshot,
): ConfirmedAuctionConfigurationSnapshot =>
  deepFreeze({
    ...value,
    rules: Object.freeze(cloneRules(value.rules)),
    policyDecisionReference: Object.freeze({
      ...value.policyDecisionReference,
    }),
    priceBandResolution: Object.freeze({ ...value.priceBandResolution }),
    roomResolution: Object.freeze({ ...value.roomResolution }),
    ...(value.memberTitleReference
      ? {
          memberTitleReference: Object.freeze({
            ...value.memberTitleReference,
          }),
        }
      : {}),
    listingFeeResolution: deepFreeze(
      structuredClone(value.listingFeeResolution),
    ),
    specialRoomContext: Object.freeze({ ...value.specialRoomContext }),
  });

const clearCurrentPolicyEvidence = (
  proposal: AuctionConfigurationProposal,
  state: "REQUIRED" | "STALE",
) => {
  const clean = { ...proposal };
  delete clean.policyDecisionReference;
  delete clean.priceBandResolution;
  delete clean.roomResolution;
  delete clean.memberTitleReference;
  delete clean.listingFeeResolution;
  delete clean.specialRoomContext;
  delete clean.policyDisclaimer;
  delete clean.normalizationDisclaimer;
  return {
    ...clean,
    roomResolutionState: state,
    listingFeeResolutionState: state,
    overallConfigurationResolutionState:
      state === "REQUIRED" ? ("INCOMPLETE" as const) : ("STALE" as const),
  };
};

const stripLegacyDynamicFields = (value: Record<string, unknown>) => {
  const clean = structuredClone(value);
  delete clean.room;
  delete clean.valueTier;
  delete clean.policyResolutionState;
  delete clean.specialRooms;
  return clean;
};

const v3EvidenceMatches = (
  raw: Record<string, unknown>,
  expected: ReturnType<typeof buildPolicyEvidence>,
) =>
  isPlainObject(raw.policyDecisionReference) &&
  raw.policyDecisionReference.decisionId ===
    expected.policyDecisionReference.decisionId &&
  raw.policyDecisionReference.decisionVersion ===
    expected.policyDecisionReference.decisionVersion &&
  raw.policyDecisionReference.authorityType ===
    expected.policyDecisionReference.authorityType &&
  raw.policyDecisionReference.sourceReference ===
    expected.policyDecisionReference.sourceReference &&
  JSON.stringify(raw.priceBandResolution) ===
    JSON.stringify(expected.priceBandResolution) &&
  JSON.stringify(raw.roomResolution) ===
    JSON.stringify(expected.roomResolution) &&
  JSON.stringify(raw.memberTitleReference) ===
    JSON.stringify(expected.memberTitleReference) &&
  JSON.stringify(raw.listingFeeResolution) ===
    JSON.stringify(expected.listingFeeResolution);

const sanitizeProposal = (
  value: unknown,
  sourceSchemaVersion: number,
): AuctionConfigurationProposal | undefined => {
  if (!isProposal(value, sourceSchemaVersion) || !isPlainObject(value))
    return undefined;
  const legacyPolicyResolutionState = value.policyResolutionState;
  const proposal = stripLegacyDynamicFields(
    value,
  ) as unknown as AuctionConfigurationProposal;
  const session = getDynamicSession(proposal.sessionId);
  if (!session) return undefined;
  if (sourceSchemaVersion < 3) {
    const migrated = clearCurrentPolicyEvidence(
      {
        ...proposal,
        roomResolutionState: "STALE",
        listingFeeResolutionState: "STALE",
        overallConfigurationResolutionState: "STALE",
      },
      "STALE",
    );
    return proposal.status === "CONFIRMED"
      ? { ...migrated, legacyPolicyState: "LEGACY_PROTOTYPE_POLICY" }
      : migrated;
  }
  if (
    sourceSchemaVersion >= 4 &&
    proposal.legacyPolicyState &&
    proposal.status === "CONFIRMED"
  )
    return clearCurrentPolicyEvidence(proposal, "STALE");
  if (sourceSchemaVersion === 3) {
    const evaluation = evaluateRoomAndMemberFee({
      session,
      proposal,
      memberReference: getMemberReferenceForSession(session),
    });
    if (
      legacyPolicyResolutionState === "APPLIED" &&
      (evaluation.ready ||
        evaluation.code === "SGDG_MANAGED_FEE_DECISION_REQUIRED") &&
      v3EvidenceMatches(value, buildPolicyEvidence(evaluation))
    ) {
      const evidence = buildPolicyEvidence(evaluation);
      const migrated: AuctionConfigurationProposal = {
        ...proposal,
        roomResolutionState: "APPLIED",
        listingFeeResolutionState: evaluation.ready
          ? "APPLIED"
          : "BUSINESS_DECISION_REQUIRED",
        overallConfigurationResolutionState: evaluation.ready
          ? "READY"
          : "BUSINESS_DECISION_REQUIRED",
        ...evidence,
      };
      if (!evaluation.ready && proposal.status === "CONFIRMED")
        return {
          ...migrated,
          legacyPolicyState: "LEGACY_SGDG_FEE_UNRESOLVED",
        };
      return migrated;
    }
    const stale = clearCurrentPolicyEvidence(
      {
        ...proposal,
        roomResolutionState: "STALE",
        listingFeeResolutionState: "STALE",
        overallConfigurationResolutionState: "STALE",
      },
      "STALE",
    );
    return proposal.status === "CONFIRMED"
      ? {
          ...stale,
          legacyPolicyState:
            proposal.managementMode === "SGDG_MANAGED"
              ? "LEGACY_SGDG_FEE_UNRESOLVED"
              : "LEGACY_CUSTOMER_REVALIDATION_REQUIRED",
        }
      : stale;
  }
  if (proposal.legacyPolicyState)
    return proposal.status === "CONFIRMED"
      ? clearCurrentPolicyEvidence(proposal, "STALE")
      : undefined;
  if (
    proposal.overallConfigurationResolutionState === "INCOMPLETE" ||
    proposal.overallConfigurationResolutionState === "STALE"
  )
    return proposal.status === "CONFIRMED"
      ? undefined
      : clearCurrentPolicyEvidence(
          proposal,
          proposal.overallConfigurationResolutionState === "STALE"
            ? "STALE"
            : "REQUIRED",
        );
  return policyResolutionMatches(proposal, session).ok
    ? {
        ...proposal,
        rules: cloneRules(proposal.rules),
        policyDecisionReference: { ...proposal.policyDecisionReference! },
        priceBandResolution: { ...proposal.priceBandResolution! },
        roomResolution: { ...proposal.roomResolution! },
        ...(proposal.memberTitleReference
          ? { memberTitleReference: { ...proposal.memberTitleReference } }
          : {}),
        listingFeeResolution: structuredClone(proposal.listingFeeResolution!),
        specialRoomContext: { ...proposal.specialRoomContext! },
        versions: proposal.versions.map((version) => ({
          ...version,
          rules: cloneRules(version.rules),
        })),
        history: proposal.history.map((entry) => ({ ...entry })),
      }
    : undefined;
};

const isSnapshot = (
  value: unknown,
  proposals: AuctionConfigurationProposal[],
): value is ConfirmedAuctionConfigurationSnapshot => {
  if (
    !isPlainObject(value) ||
    containsForbiddenKey(value) ||
    "room" in value ||
    "valueTier" in value ||
    "specialRooms" in value
  )
    return false;
  const proposal = proposals.find(
    (item) => item.configurationId === value.configurationId,
  );
  if (!proposal) return false;
  const session = getDynamicSession(proposal.sessionId);
  const policyCheck = session
    ? policyResolutionMatches(proposal, session)
    : undefined;
  if (
    !session ||
    !policyCheck?.resolutionReady ||
    proposal.managementMode !== "CUSTOMER_REQUESTED" ||
    proposal.creationSource !== "OPENING_REQUEST"
  )
    return false;
  const snapshot = value as unknown as ConfirmedAuctionConfigurationSnapshot;
  return Boolean(
    proposal.status === "CONFIRMED" &&
      isString(value.snapshotId) &&
      value.snapshotId ===
        `${proposal.configurationId}-snapshot-v${proposal.proposalVersion}` &&
      value.sessionId === proposal.sessionId &&
      value.sessionVersionAtConfirmation === proposal.sessionVersion &&
      value.proposalVersion === proposal.proposalVersion &&
      value.creationSource === proposal.creationSource &&
      value.managementMode === proposal.managementMode &&
      isRules(value.rules) &&
      sameRules(snapshot.rules, proposal.rules) &&
      JSON.stringify(snapshot.policyDecisionReference) ===
        JSON.stringify(proposal.policyDecisionReference) &&
      snapshot.policyDisclaimer === AUCTION_ROOM_FEE_POLICY_DISCLAIMER &&
      snapshot.normalizationDisclaimer ===
        PRICE_BAND_NORMALIZATION_DISCLAIMER &&
      JSON.stringify(snapshot.priceBandResolution) ===
        JSON.stringify(proposal.priceBandResolution) &&
      JSON.stringify(snapshot.roomResolution) ===
        JSON.stringify(proposal.roomResolution) &&
      JSON.stringify(snapshot.memberTitleReference) ===
        JSON.stringify(proposal.memberTitleReference) &&
      JSON.stringify(snapshot.listingFeeResolution) ===
        JSON.stringify(proposal.listingFeeResolution) &&
      JSON.stringify(snapshot.specialRoomContext) ===
        JSON.stringify(proposal.specialRoomContext) &&
      isString(value.confirmedBy) &&
      isString(value.confirmedAt) &&
      isString(value.confirmationCommandReference) &&
      proposal.history.some(
        (entry) =>
          entry.action === "CONFIGURATION_CONFIRMED" &&
          entry.commandId === value.confirmationCommandReference,
      ) &&
      value.snapshotVersion === 1,
  );
};

const legacySnapshotFromRaw = (
  snapshot: Record<string, unknown>,
  proposal: AuctionConfigurationProposal,
): LegacyAuctionConfigurationSnapshot =>
  deepFreeze({
    snapshotId: String(snapshot.snapshotId),
    configurationId: proposal.configurationId,
    sessionId: proposal.sessionId,
    proposalVersion: Number(snapshot.proposalVersion),
    snapshotVersion: 1 as const,
    policyClassification:
      proposal.legacyPolicyState ?? "LEGACY_PROTOTYPE_POLICY",
    ...(isString(snapshot.confirmedBy)
      ? { originalConfirmedBy: snapshot.confirmedBy }
      : {}),
    ...(isString(snapshot.confirmedAt)
      ? { originalConfirmedAt: snapshot.confirmedAt }
      : {}),
    legacyEvidence: deepFreeze(structuredClone(snapshot)),
  });

const migrateV3CustomerSnapshot = (
  snapshot: unknown,
  proposal: AuctionConfigurationProposal,
): ConfirmedAuctionConfigurationSnapshot | undefined => {
  if (
    !isPlainObject(snapshot) ||
    containsForbiddenKey(snapshot) ||
    "room" in snapshot ||
    "valueTier" in snapshot ||
    proposal.creationSource !== "OPENING_REQUEST" ||
    proposal.managementMode !== "CUSTOMER_REQUESTED" ||
    proposal.status !== "CONFIRMED" ||
    proposal.legacyPolicyState ||
    !proposal.memberTitleReference ||
    proposal.listingFeeResolution?.applicability !== "APPLICABLE" ||
    !proposal.specialRoomContext
  )
    return undefined;
  const session = getDynamicSession(proposal.sessionId);
  if (!session || !policyResolutionMatches(proposal, session).resolutionReady)
    return undefined;
  if (
    snapshot.snapshotId !==
      `${proposal.configurationId}-snapshot-v${proposal.proposalVersion}` ||
    snapshot.configurationId !== proposal.configurationId ||
    snapshot.sessionId !== proposal.sessionId ||
    snapshot.sessionVersionAtConfirmation !== proposal.sessionVersion ||
    snapshot.proposalVersion !== proposal.proposalVersion ||
    snapshot.creationSource !== proposal.creationSource ||
    snapshot.managementMode !== proposal.managementMode ||
    !isRules(snapshot.rules) ||
    !sameRules(snapshot.rules, proposal.rules) ||
    JSON.stringify(snapshot.priceBandResolution) !==
      JSON.stringify(proposal.priceBandResolution) ||
    JSON.stringify(snapshot.roomResolution) !==
      JSON.stringify(proposal.roomResolution) ||
    JSON.stringify(snapshot.memberTitleReference) !==
      JSON.stringify(proposal.memberTitleReference) ||
    JSON.stringify(snapshot.listingFeeResolution) !==
      JSON.stringify(proposal.listingFeeResolution) ||
    !isString(snapshot.confirmedBy) ||
    !isString(snapshot.confirmedAt) ||
    !isString(snapshot.confirmationCommandReference) ||
    snapshot.snapshotVersion !== 1
  )
    return undefined;
  return freezeSnapshot({
    snapshotId: snapshot.snapshotId,
    configurationId: proposal.configurationId,
    sessionId: proposal.sessionId,
    sessionVersionAtConfirmation: proposal.sessionVersion,
    proposalVersion: proposal.proposalVersion,
    creationSource: "OPENING_REQUEST",
    managementMode: "CUSTOMER_REQUESTED",
    rules: cloneRules(proposal.rules),
    policyDecisionReference: { ...proposal.policyDecisionReference! },
    policyDisclaimer: AUCTION_ROOM_FEE_POLICY_DISCLAIMER,
    normalizationDisclaimer: PRICE_BAND_NORMALIZATION_DISCLAIMER,
    priceBandResolution: { ...proposal.priceBandResolution! },
    roomResolution: { ...proposal.roomResolution! },
    memberTitleReference: { ...proposal.memberTitleReference },
    listingFeeResolution: structuredClone(proposal.listingFeeResolution),
    specialRoomContext: { ...proposal.specialRoomContext },
    confirmedBy: snapshot.confirmedBy,
    confirmedAt: snapshot.confirmedAt,
    confirmationCommandReference: snapshot.confirmationCommandReference,
    snapshotVersion: 1,
  });
};

const sanitizePersistedConfigurationState = (
  persisted: unknown,
  sourceSchemaVersion = 4,
): Pick<
  AuctionConfigurationState,
  "proposals" | "snapshots" | "legacySnapshots"
> => {
  const empty = { proposals: [], snapshots: [], legacySnapshots: [] };
  if (!isPlainObject(persisted)) return empty;
  const rawProposals = persisted.proposals;
  const rawSnapshots = persisted.snapshots;
  if (!Array.isArray(rawProposals) || !Array.isArray(rawSnapshots))
    return empty;
  const proposals = rawProposals.map((proposal) =>
    sanitizeProposal(proposal, sourceSchemaVersion),
  );
  if (proposals.some((proposal) => !proposal))
    return empty;
  const safeProposals = proposals as AuctionConfigurationProposal[];
  const configurationIds = safeProposals.map((item) => item.configurationId);
  const sessionIds = safeProposals.map((item) => item.sessionId);
  const commandIds = safeProposals.flatMap((item) =>
    item.history.map((entry) => entry.commandId),
  );
  if (
    new Set(configurationIds).size !== configurationIds.length ||
    new Set(sessionIds).size !== sessionIds.length ||
    new Set(commandIds).size !== commandIds.length
  )
    return empty;
  if (sourceSchemaVersion < 3) {
    const legacySnapshots = rawSnapshots
      .filter(
        (snapshot) =>
          isPlainObject(snapshot) &&
          safeProposals.some(
            (proposal) =>
              proposal.legacyPolicyState === "LEGACY_PROTOTYPE_POLICY" &&
              proposal.configurationId === snapshot.configurationId,
          ),
      )
      .map((snapshot) =>
        legacySnapshotFromRaw(
          snapshot,
          safeProposals.find(
            (proposal) =>
              proposal.configurationId === snapshot.configurationId,
          )!,
        ),
      );
    if (
      safeProposals.some(
        (proposal) =>
          proposal.legacyPolicyState === "LEGACY_PROTOTYPE_POLICY" &&
          !legacySnapshots.some(
            (snapshot) =>
              snapshot.configurationId === proposal.configurationId,
          ),
      )
    )
      return empty;
    return { proposals: safeProposals, snapshots: [], legacySnapshots };
  }
  if (sourceSchemaVersion === 3) {
    const snapshots: ConfirmedAuctionConfigurationSnapshot[] = [];
    const legacySnapshots: LegacyAuctionConfigurationSnapshot[] = [];
    for (const proposal of safeProposals) {
      if (proposal.status !== "CONFIRMED") continue;
      const rawSnapshot = rawSnapshots.find(
        (snapshot) =>
          isPlainObject(snapshot) &&
          snapshot.configurationId === proposal.configurationId,
      );
      if (!isPlainObject(rawSnapshot)) return empty;
      if (proposal.legacyPolicyState)
        legacySnapshots.push(legacySnapshotFromRaw(rawSnapshot, proposal));
      else {
        const currentSnapshot = migrateV3CustomerSnapshot(
          rawSnapshot,
          proposal,
        );
        if (!currentSnapshot) return empty;
        snapshots.push(currentSnapshot);
      }
    }
    if (
      rawSnapshots.some(
        (snapshot) =>
          !isPlainObject(snapshot) ||
          !safeProposals.some(
            (proposal) =>
              proposal.status === "CONFIRMED" &&
              proposal.configurationId === snapshot.configurationId,
          ),
      )
    )
      return empty;
    return { proposals: safeProposals, snapshots, legacySnapshots };
  }
  if (!rawSnapshots.every((snapshot) => isSnapshot(snapshot, safeProposals)))
    return empty;
  const snapshots = (
    rawSnapshots as ConfirmedAuctionConfigurationSnapshot[]
  ).map(freezeSnapshot);
  const snapshotIds = snapshots.map((item) => item.snapshotId);
  const snapshotSessions = snapshots.map((item) => item.sessionId);
  if (
    new Set(snapshotIds).size !== snapshotIds.length ||
    new Set(snapshotSessions).size !== snapshotSessions.length
  )
    return empty;
  if (
    safeProposals.some(
      (proposal) =>
        (proposal.status === "CONFIRMED" &&
          !proposal.legacyPolicyState) !==
        snapshots.some(
          (snapshot) => snapshot.configurationId === proposal.configurationId,
        ),
    )
  )
    return empty;
  const rawLegacySnapshots = Array.isArray(persisted.legacySnapshots)
    ? persisted.legacySnapshots
    : [];
  const legacySnapshots = rawLegacySnapshots
    .filter(
      (value): value is LegacyAuctionConfigurationSnapshot =>
        isPlainObject(value) &&
        [
          "LEGACY_PROTOTYPE_POLICY",
          "LEGACY_SGDG_FEE_UNRESOLVED",
          "LEGACY_CUSTOMER_REVALIDATION_REQUIRED",
        ].includes(String(value.policyClassification)) &&
        isString(value.snapshotId) &&
        isString(value.configurationId) &&
        isString(value.sessionId) &&
        isPositiveInteger(value.proposalVersion) &&
        value.snapshotVersion === 1 &&
        isPlainObject(value.legacyEvidence),
    )
    .map((value) =>
      Object.freeze({
        ...value,
        legacyEvidence: deepFreeze(structuredClone(value.legacyEvidence)),
      }),
    );
  return { proposals: safeProposals, snapshots, legacySnapshots };
};

export const useAuctionConfigurationStore = create<AuctionConfigurationState>()(
  persist(
    (set, get) => ({
      proposals: [],
      snapshots: [],
      legacySnapshots: [],
      getProposalBySessionId: (sessionId) =>
        get().proposals.find((proposal) => proposal.sessionId === sessionId),
      getProposalById: (configurationId) =>
        get().proposals.find(
          (proposal) => proposal.configurationId === configurationId,
        ),
      getSubmittedProposals: () =>
        get().proposals.filter((proposal) => proposal.status === "SUBMITTED"),
      getConfirmedSnapshotBySessionId: (sessionId) =>
        get().snapshots.find((snapshot) => snapshot.sessionId === sessionId),
      createConfigurationDraft: (command) => {
        if (command.actorRole !== "CONTENT_STAFF")
          return commandFailure(
            "ACCESS_DENIED",
            "Chỉ CONTENT_STAFF có thể tạo Configuration Draft.",
          );
        if (!command.commandId.trim())
          return commandFailure("DUPLICATE_COMMAND", "Command ID là bắt buộc.");
        const globalOwner = commandOwner(get().proposals, command.commandId);
        if (globalOwner) {
          if (globalOwner.sessionId === command.sessionId)
            return { ok: true, proposal: globalOwner, created: false };
          return commandFailure(
            "DUPLICATE_COMMAND",
            "Command ID đã thuộc Configuration khác.",
          );
        }
        const sessionCheck = validateDynamicSession(
          command.sessionId,
          command.expectedSessionVersion,
        );
        if ("failure" in sessionCheck) return sessionCheck.failure;
        const existing = get().proposals.find(
          (proposal) => proposal.sessionId === command.sessionId,
        );
        if (existing)
          return {
            ok: true,
            proposal: existing,
            created: false,
          };
        const configurationId = `configuration-${normalizeIdPart(
          command.sessionId,
        )}`;
        if (
          get().proposals.some(
            (proposal) => proposal.configurationId === configurationId,
          )
        )
          return commandFailure(
            "PERSISTENCE_ERROR",
            "Configuration ID bị trùng.",
          );
        const time = deterministicTimestamp(1);
        const rules = emptyRules();
        const proposalBase = {
          configurationId,
          sessionId: command.sessionId,
        };
        const history = makeHistory({
          proposal: proposalBase,
          action: "CONFIGURATION_DRAFT_CREATED",
          toStatus: "DRAFT",
          actorId: command.actorId,
          actorRole: command.actorRole,
          commandId: command.commandId,
          version: 1,
          time,
        });
        const proposal: AuctionConfigurationProposal = {
          ...proposalBase,
          sessionVersion: sessionCheck.session.currentVersion,
          proposalVersion: 1,
          status: "DRAFT",
          creationSource: sessionCheck.session.creationSource,
          managementMode: sessionCheck.session.managementMode,
          rules,
          roomResolutionState: "REQUIRED",
          listingFeeResolutionState: "REQUIRED",
          overallConfigurationResolutionState: "INCOMPLETE",
          createdBy: command.actorId,
          updatedBy: command.actorId,
          createdAt: time,
          updatedAt: time,
          versions: [
            makeVersion(
              1,
              "DRAFT",
              rules,
              time,
              command.actorId,
              command.commandId,
            ),
          ],
          history: [history],
        };
        set((state) => ({ proposals: [...state.proposals, proposal] }));
        return { ok: true, proposal, created: true };
      },
      saveConfigurationDraft: (command) => {
        if (command.actorRole !== "CONTENT_STAFF")
          return commandFailure(
            "ACCESS_DENIED",
            "Chỉ CONTENT_STAFF có thể lưu Configuration Draft.",
          );
        const proposal = get().getProposalById(command.configurationId);
        if (!proposal)
          return commandFailure(
            "CONFIGURATION_NOT_FOUND",
            "Không tìm thấy Configuration Proposal.",
          );
        const globalOwner = commandOwner(get().proposals, command.commandId);
        if (globalOwner) {
          if (globalOwner.configurationId === proposal.configurationId)
            return { ok: true, proposal: globalOwner };
          return commandFailure(
            "DUPLICATE_COMMAND",
            "Command ID đã thuộc Configuration khác.",
          );
        }
        if (proposal.proposalVersion !== command.expectedProposalVersion)
          return commandFailure(
            "STALE_PROPOSAL_VERSION",
            "Proposal đã thay đổi. Giá trị trên màn hình được giữ lại để bạn tải lại.",
            { currentProposalVersion: proposal.proposalVersion },
          );
        if (
          proposal.status !== "DRAFT" &&
          proposal.status !== "RETURNED_FOR_CORRECTION"
        )
          return commandFailure(
            "INVALID_TRANSITION",
            "Proposal đã gửi hoặc đã xác nhận là chỉ đọc.",
          );
        const sessionCheck = validateDynamicSession(proposal.sessionId);
        if ("failure" in sessionCheck) return sessionCheck.failure;
        const rules = sanitizeRulesInput(command.values);
        const fieldErrors = draftStructureErrors(rules);
        if (Object.keys(fieldErrors).length)
          return commandFailure(
            "VALIDATION_ERROR",
            "Bản nháp có giá trị số không hợp lệ.",
            { fieldErrors },
          );
        const nextVersion = proposal.proposalVersion + 1;
        const time = deterministicTimestamp(nextVersion);
        const startingPriceChanged =
          rules.startingPrice !== proposal.rules.startingPrice;
        const stalePolicyResolution =
          startingPriceChanged &&
          ["READY", "BUSINESS_DECISION_REQUIRED"].includes(
            proposal.overallConfigurationResolutionState,
          );
        const updated: AuctionConfigurationProposal = {
          ...(stalePolicyResolution
            ? clearCurrentPolicyEvidence(proposal, "STALE")
            : proposal),
          proposalVersion: nextVersion,
          sessionVersion: sessionCheck.session.currentVersion,
          rules,
          updatedBy: command.actorId,
          updatedAt: time,
          versions: [
            ...proposal.versions,
            makeVersion(
              nextVersion,
              proposal.status,
              rules,
              time,
              command.actorId,
              command.commandId,
            ),
          ],
          history: [
            ...proposal.history,
            makeHistory({
              proposal,
              action: "CONFIGURATION_DRAFT_SAVED",
              fromStatus: proposal.status,
              toStatus: proposal.status,
              actorId: command.actorId,
              actorRole: command.actorRole,
              commandId: command.commandId,
              version: nextVersion,
              time,
              policyEvidence:
                proposal.roomResolutionState === "APPLIED"
                  ? {
                      startingPrice:
                        proposal.priceBandResolution!.evaluatedStartingPrice,
                      priceBandReference:
                        proposal.priceBandResolution!.reference,
                      roomReference: proposal.roomResolution!.roomReference,
                      memberTitle: proposal.memberTitleReference?.title,
                      listingFee: proposal.listingFeeResolution!,
                    }
                  : undefined,
            }),
          ],
        };
        set((state) => ({
          proposals: state.proposals.map((item) =>
            item.configurationId === updated.configurationId ? updated : item,
          ),
        }));
        return { ok: true, proposal: updated };
      },
      submitConfigurationProposal: (command) => {
        if (command.actorRole !== "CONTENT_STAFF")
          return commandFailure(
            "ACCESS_DENIED",
            "Chỉ CONTENT_STAFF có thể gửi Configuration Proposal.",
          );
        const proposal = get().getProposalById(command.configurationId);
        if (!proposal)
          return commandFailure(
            "CONFIGURATION_NOT_FOUND",
            "Không tìm thấy Configuration Proposal.",
          );
        const globalOwner = commandOwner(get().proposals, command.commandId);
        if (globalOwner) {
          const blocked = globalOwner.history.find(
            (entry) =>
              entry.commandId === command.commandId &&
              entry.action === "CONFIGURATION_SUBMISSION_BLOCKED",
          );
          if (blocked)
            return commandFailure(
              "SGDG_MANAGED_FEE_DECISION_REQUIRED",
              SGDG_MANAGED_FEE_DECISION_MESSAGE,
            );
          if (globalOwner.configurationId === proposal.configurationId)
            return { ok: true, proposal: globalOwner };
          return commandFailure(
            "DUPLICATE_COMMAND",
            "Command ID đã thuộc Configuration khác.",
          );
        }
        if (proposal.proposalVersion !== command.expectedProposalVersion)
          return commandFailure(
            "STALE_PROPOSAL_VERSION",
            "Proposal đã thay đổi. Hãy tải lại trước khi gửi.",
            { currentProposalVersion: proposal.proposalVersion },
          );
        if (proposal.status === "SUBMITTED")
          return commandFailure(
            "ALREADY_SUBMITTED",
            "Proposal hiện đã chờ ADMIN xác nhận.",
          );
        if (
          proposal.status !== "DRAFT" &&
          proposal.status !== "RETURNED_FOR_CORRECTION"
        )
          return commandFailure(
            "INVALID_TRANSITION",
            "Proposal không ở trạng thái có thể gửi.",
          );
        const sessionCheck = validateDynamicSession(
          proposal.sessionId,
          command.expectedSessionVersion,
        );
        if ("failure" in sessionCheck) return sessionCheck.failure;
        if (
          proposal.managementMode !== sessionCheck.session.managementMode ||
          proposal.creationSource !== sessionCheck.session.creationSource
        )
          return commandFailure(
            "BLOCKING_CONDITION",
            "Management mode hoặc creation source không còn khớp Session.",
          );
        if (
          proposal.managementMode === "SGDG_MANAGED" &&
          proposal.creationSource === "DIRECT_SGDG"
        ) {
          const blockedEntry = makeHistory({
            proposal,
            action: "CONFIGURATION_SUBMISSION_BLOCKED",
            fromStatus: proposal.status,
            toStatus: proposal.status,
            actorId: command.actorId,
            actorRole: command.actorRole,
            commandId: command.commandId,
            version: proposal.proposalVersion,
            reason: SGDG_MANAGED_FEE_DECISION_MESSAGE,
            time: deterministicTimestamp(proposal.proposalVersion, 30),
            policyEvidence:
              proposal.priceBandResolution &&
              proposal.roomResolution &&
              proposal.listingFeeResolution
              ? {
                  startingPrice:
                    proposal.priceBandResolution.evaluatedStartingPrice,
                  priceBandReference: proposal.priceBandResolution.reference,
                  roomReference: proposal.roomResolution.roomReference,
                  listingFee: proposal.listingFeeResolution,
                }
              : undefined,
          });
          set((state) => ({
            proposals: state.proposals.map((item) =>
              item.configurationId === proposal.configurationId
                ? {
                    ...proposal,
                    history: [...proposal.history, blockedEntry],
                  }
                : item,
            ),
          }));
          return commandFailure(
            "SGDG_MANAGED_FEE_DECISION_REQUIRED",
            SGDG_MANAGED_FEE_DECISION_MESSAGE,
          );
        }
        const validation = validateConfiguration(proposal.rules);
        if (!validation.validForSubmission)
          return commandFailure(
            "VALIDATION_ERROR",
            "Configuration chưa đủ điều kiện gửi xác nhận.",
            { fieldErrors: fieldErrorsFromFindings(validation.findings) },
          );
        const policyCheck = policyResolutionMatches(
          proposal,
          sessionCheck.session,
        );
        if (
          proposal.overallConfigurationResolutionState !== "READY" ||
          !policyCheck.resolutionReady
        )
          return commandFailure(
            "POLICY_RESOLUTION_STALE",
            "Auction Room/member-fee resolution is missing or stale. Apply policy version 2 before submission.",
          );
        const nextVersion = proposal.proposalVersion + 1;
        const time = deterministicTimestamp(nextVersion);
        const action =
          proposal.status === "RETURNED_FOR_CORRECTION"
            ? "CONFIGURATION_RESUBMITTED"
            : "CONFIGURATION_SUBMITTED";
        const updated: AuctionConfigurationProposal = {
          ...proposal,
          proposalVersion: nextVersion,
          sessionVersion: sessionCheck.session.currentVersion,
          status: "SUBMITTED",
          updatedBy: command.actorId,
          submittedBy: command.actorId,
          updatedAt: time,
          submittedAt: time,
          correctionContext: undefined,
          versions: [
            ...proposal.versions,
            makeVersion(
              nextVersion,
              "SUBMITTED",
              proposal.rules,
              time,
              command.actorId,
              command.commandId,
            ),
          ],
          history: [
            ...proposal.history,
            makeHistory({
              proposal,
              action,
              fromStatus: proposal.status,
              toStatus: "SUBMITTED",
              actorId: command.actorId,
              actorRole: command.actorRole,
              commandId: command.commandId,
              version: nextVersion,
              time,
              policyEvidence: {
                startingPrice:
                  proposal.priceBandResolution!.evaluatedStartingPrice,
                priceBandReference: proposal.priceBandResolution!.reference,
                roomReference: proposal.roomResolution!.roomReference,
                memberTitle: proposal.memberTitleReference?.title,
                listingFee: proposal.listingFeeResolution!,
              },
            }),
          ],
        };
        set((state) => ({
          proposals: state.proposals.map((item) =>
            item.configurationId === updated.configurationId ? updated : item,
          ),
        }));
        return { ok: true, proposal: updated };
      },
      requestConfigurationCorrection: (command) => {
        if (command.actorRole !== "ADMIN")
          return commandFailure(
            "ACCESS_DENIED",
            "Chỉ ADMIN có thể yêu cầu chỉnh sửa Configuration.",
          );
        const proposal = get().getProposalById(command.configurationId);
        if (!proposal)
          return commandFailure(
            "CONFIGURATION_NOT_FOUND",
            "Không tìm thấy Configuration Proposal.",
          );
        const globalOwner = commandOwner(get().proposals, command.commandId);
        if (globalOwner) {
          if (globalOwner.configurationId === proposal.configurationId)
            return { ok: true, proposal: globalOwner };
          return commandFailure(
            "DUPLICATE_COMMAND",
            "Command ID đã thuộc Configuration khác.",
          );
        }
        if (proposal.proposalVersion !== command.expectedProposalVersion)
          return commandFailure(
            "STALE_PROPOSAL_VERSION",
            "Proposal đã thay đổi. Hãy tải lại trước khi quyết định.",
            { currentProposalVersion: proposal.proposalVersion },
          );
        if (proposal.status !== "SUBMITTED")
          return commandFailure(
            "INVALID_TRANSITION",
            "Chỉ proposal SUBMITTED mới có thể được trả lại.",
          );
        const reason = command.reason.trim();
        const affectedSections = Array.from(
          new Set(
            command.affectedSections.filter((section) =>
              supportedSections.includes(section),
            ),
          ),
        );
        if (reason.length < 10 || affectedSections.length === 0)
          return commandFailure(
            "VALIDATION_ERROR",
            "Lý do có ý nghĩa và ít nhất một phần bị ảnh hưởng là bắt buộc.",
          );
        const nextVersion = proposal.proposalVersion + 1;
        const time = deterministicTimestamp(nextVersion);
        const updated: AuctionConfigurationProposal = {
          ...proposal,
          proposalVersion: nextVersion,
          status: "RETURNED_FOR_CORRECTION",
          updatedBy: command.actorId,
          updatedAt: time,
          correctionContext: {
            reason,
            affectedSections,
            requestedBy: command.actorId,
            requestedAt: time,
          },
          versions: [
            ...proposal.versions,
            makeVersion(
              nextVersion,
              "RETURNED_FOR_CORRECTION",
              proposal.rules,
              time,
              command.actorId,
              command.commandId,
            ),
          ],
          history: [
            ...proposal.history,
            makeHistory({
              proposal,
              action: "CONFIGURATION_CORRECTION_REQUESTED",
              fromStatus: "SUBMITTED",
              toStatus: "RETURNED_FOR_CORRECTION",
              actorId: command.actorId,
              actorRole: command.actorRole,
              commandId: command.commandId,
              version: nextVersion,
              reason,
              affectedSections,
              time,
            }),
          ],
        };
        set((state) => ({
          proposals: state.proposals.map((item) =>
            item.configurationId === updated.configurationId ? updated : item,
          ),
        }));
        return { ok: true, proposal: updated };
      },
      applyAuctionRoomMemberFeeResolution: (command) => {
        if (command.actorRole !== "CONTENT_STAFF")
          return commandFailure(
            "ACCESS_DENIED",
            "Only CONTENT_STAFF can apply the source-based Room/member-fee policy.",
          );
        if (!command.commandId.trim())
          return commandFailure("DUPLICATE_COMMAND", "Command ID is required.");
        const proposal = get().getProposalById(command.configurationId);
        if (!proposal)
          return commandFailure(
            "CONFIGURATION_NOT_FOUND",
            "Configuration Proposal was not found.",
          );
        const globalOwner = commandOwner(get().proposals, command.commandId);
        if (globalOwner) {
          if (globalOwner.configurationId === proposal.configurationId)
            return { ok: true, proposal: globalOwner, created: false };
          return commandFailure(
            "DUPLICATE_COMMAND",
            "Command ID belongs to another Configuration.",
          );
        }
        if (proposal.proposalVersion !== command.expectedProposalVersion)
          return commandFailure(
            "STALE_PROPOSAL_VERSION",
            "Proposal changed. Reload before applying the prototype policy.",
            { currentProposalVersion: proposal.proposalVersion },
          );
        if (
          proposal.status !== "DRAFT" &&
          proposal.status !== "RETURNED_FOR_CORRECTION"
        )
          return commandFailure(
            "INVALID_TRANSITION",
            "Policy resolution can only be applied to a Draft or returned Proposal.",
          );
        const sessionCheck = validateDynamicSession(
          proposal.sessionId,
          command.expectedSessionVersion,
        );
        if ("failure" in sessionCheck) return sessionCheck.failure;
        const policy = getAuctionRoomFeePolicy();
        if (command.expectedPolicyVersion !== policy.decisionVersion)
          return commandFailure(
            "STALE_POLICY_VERSION",
            "The expected prototype policy version is stale.",
          );
        const evaluation = evaluateRoomAndMemberFee({
          session: sessionCheck.session,
          proposal,
          memberReference: getMemberReferenceForSession(sessionCheck.session),
          expectedPolicyVersion: command.expectedPolicyVersion,
        });
        if (
          !evaluation.ready &&
          evaluation.code !== "SGDG_MANAGED_FEE_DECISION_REQUIRED"
        ) {
          const errorCode =
            evaluation.code === "INVALID_STARTING_PRICE"
              ? "INVALID_STARTING_PRICE"
              : evaluation.code === "MEMBER_REFERENCE_NOT_FOUND"
                ? "MEMBER_REFERENCE_NOT_FOUND"
                : evaluation.code === "POLICY_VERSION_STALE"
                  ? "STALE_POLICY_VERSION"
                  : "POLICY_SCOPE_MISMATCH";
          return commandFailure(
            errorCode,
            `Room/member-fee policy evaluation failed: ${evaluation.code}.`,
          );
        }
        const nextVersion = proposal.proposalVersion + 1;
        const time = deterministicTimestamp(nextVersion);
        const evidence = buildPolicyEvidence(evaluation);
        const historyEvidence = {
          startingPrice:
            evaluation.priceBandResolution.evaluatedStartingPrice,
          priceBandReference: evaluation.priceBandResolution.reference,
          roomReference: evaluation.roomResolution.roomReference,
          memberTitle:
            "memberTitleReference" in evaluation
              ? evaluation.memberTitleReference.title
              : undefined,
          listingFee: evaluation.listingFeeResolution,
        };
        const resolutionHistory = evaluation.ready
          ? [
              makeHistory({
                proposal,
                action: "MEMBER_REFERENCE_VALIDATED",
                fromStatus: proposal.status,
                toStatus: proposal.status,
                actorId: command.actorId,
                actorRole: command.actorRole,
                commandId: `${command.commandId}:member-reference`,
                version: nextVersion,
                time,
                policyEvidence: historyEvidence,
              }),
              makeHistory({
                proposal,
                action: "MEMBER_LISTING_FEE_RESOLVED",
                fromStatus: proposal.status,
                toStatus: proposal.status,
                actorId: command.actorId,
                actorRole: command.actorRole,
                commandId: `${command.commandId}:member-fee`,
                version: nextVersion,
                time,
                policyEvidence: historyEvidence,
              }),
            ]
          : [
              makeHistory({
                proposal,
                action: "SGDG_MANAGED_FEE_DECISION_REQUIRED",
                fromStatus: proposal.status,
                toStatus: proposal.status,
                actorId: command.actorId,
                actorRole: command.actorRole,
                commandId: `${command.commandId}:fee-decision`,
                version: nextVersion,
                reason: SGDG_MANAGED_FEE_DECISION_MESSAGE,
                time,
                policyEvidence: historyEvidence,
              }),
            ];
        const updated: AuctionConfigurationProposal = {
          ...clearCurrentPolicyEvidence(proposal, "REQUIRED"),
          proposalVersion: nextVersion,
          sessionVersion: sessionCheck.session.currentVersion,
          updatedBy: command.actorId,
          updatedAt: time,
          roomResolutionState: "APPLIED",
          listingFeeResolutionState: evaluation.ready
            ? "APPLIED"
            : "BUSINESS_DECISION_REQUIRED",
          overallConfigurationResolutionState: evaluation.ready
            ? "READY"
            : "BUSINESS_DECISION_REQUIRED",
          ...evidence,
          versions: [
            ...proposal.versions,
            makeVersion(
              nextVersion,
              proposal.status,
              proposal.rules,
              time,
              command.actorId,
              command.commandId,
            ),
          ],
          history: [
            ...proposal.history,
            makeHistory({
              proposal,
              action: evaluation.ready
                ? "ROOM_MEMBER_FEE_RESOLUTION_COMPLETED"
                : "AUCTION_ROOM_RESOLVED_FEE_DECISION_REQUIRED",
              fromStatus: proposal.status,
              toStatus: proposal.status,
              actorId: command.actorId,
              actorRole: command.actorRole,
              commandId: command.commandId,
              version: nextVersion,
              time,
              policyEvidence: historyEvidence,
            }),
            makeHistory({
              proposal,
              action: "PRICE_BAND_DERIVED",
              fromStatus: proposal.status,
              toStatus: proposal.status,
              actorId: command.actorId,
              actorRole: command.actorRole,
              commandId: `${command.commandId}:price-band`,
              version: nextVersion,
              time,
              policyEvidence: historyEvidence,
            }),
            makeHistory({
              proposal,
              action: "ORDINARY_ROOM_DERIVED",
              fromStatus: proposal.status,
              toStatus: proposal.status,
              actorId: command.actorId,
              actorRole: command.actorRole,
              commandId: `${command.commandId}:room`,
              version: nextVersion,
              time,
              policyEvidence: historyEvidence,
            }),
            ...resolutionHistory,
          ],
        };
        set((state) => ({
          proposals: state.proposals.map((item) =>
            item.configurationId === updated.configurationId ? updated : item,
          ),
        }));
        return { ok: true, proposal: updated, created: true };
      },
      confirmConfigurationProposal: (command) => {
        if (command.actorRole !== "ADMIN")
          return commandFailure(
            "ACCESS_DENIED",
            "Chỉ ADMIN có thể xác nhận Configuration.",
          );
        const proposal = get().getProposalById(command.configurationId);
        if (!proposal)
          return commandFailure(
            "CONFIGURATION_NOT_FOUND",
            "Không tìm thấy Configuration Proposal.",
          );
        const existingSnapshot = get().snapshots.find(
          (snapshot) => snapshot.configurationId === proposal.configurationId,
        );
        const globalOwner = commandOwner(get().proposals, command.commandId);
        if (globalOwner) {
          const blocked = globalOwner.history.find(
            (entry) =>
              entry.commandId === command.commandId &&
              entry.action === "CONFIGURATION_CONFIRMATION_BLOCKED",
          );
          if (blocked)
            return commandFailure(
              "SGDG_MANAGED_FEE_DECISION_REQUIRED",
              SGDG_MANAGED_FEE_DECISION_MESSAGE,
            );
          if (
            globalOwner.configurationId === proposal.configurationId &&
            existingSnapshot
          )
            return {
              ok: true,
              proposal: globalOwner,
              snapshot: existingSnapshot,
              created: false,
            };
          return commandFailure(
            "DUPLICATE_COMMAND",
            "Command ID đã được xử lý.",
          );
        }
        if (proposal.status === "CONFIRMED" || existingSnapshot)
          return commandFailure(
            "ALREADY_CONFIRMED",
            "Configuration đã có confirmed snapshot.",
            { snapshot: existingSnapshot },
          );
        if (proposal.proposalVersion !== command.expectedProposalVersion)
          return commandFailure(
            "STALE_PROPOSAL_VERSION",
            "Proposal đã thay đổi. Hãy tải lại trước khi xác nhận.",
            { currentProposalVersion: proposal.proposalVersion },
          );
        if (proposal.status !== "SUBMITTED")
          return commandFailure(
            "INVALID_TRANSITION",
            "Chỉ proposal SUBMITTED mới có thể được xác nhận.",
          );
        const sessionCheck = validateDynamicSession(
          proposal.sessionId,
          command.expectedSessionVersion,
        );
        if ("failure" in sessionCheck) return sessionCheck.failure;
        if (
          proposal.sessionVersion !== sessionCheck.session.currentVersion ||
          proposal.managementMode !== sessionCheck.session.managementMode ||
          proposal.creationSource !== sessionCheck.session.creationSource
        )
          return commandFailure(
            "STALE_SESSION_VERSION",
            "Session lineage đã thay đổi. Confirmation bị chặn.",
            { currentSessionVersion: sessionCheck.session.currentVersion },
          );
        if (
          proposal.managementMode === "SGDG_MANAGED" &&
          proposal.creationSource === "DIRECT_SGDG"
        ) {
          const blockedEntry = makeHistory({
            proposal,
            action: "CONFIGURATION_CONFIRMATION_BLOCKED",
            fromStatus: "SUBMITTED",
            toStatus: "SUBMITTED",
            actorId: command.actorId,
            actorRole: command.actorRole,
            commandId: command.commandId,
            version: proposal.proposalVersion,
            reason: SGDG_MANAGED_FEE_DECISION_MESSAGE,
            time: deterministicTimestamp(proposal.proposalVersion, 31),
            policyEvidence:
              proposal.priceBandResolution &&
              proposal.roomResolution &&
              proposal.listingFeeResolution
              ? {
                  startingPrice:
                    proposal.priceBandResolution.evaluatedStartingPrice,
                  priceBandReference: proposal.priceBandResolution.reference,
                  roomReference: proposal.roomResolution.roomReference,
                  listingFee: proposal.listingFeeResolution,
                }
              : undefined,
          });
          set((state) => ({
            proposals: state.proposals.map((item) =>
              item.configurationId === proposal.configurationId
                ? {
                    ...proposal,
                    history: [...proposal.history, blockedEntry],
                  }
                : item,
            ),
          }));
          return commandFailure(
            "SGDG_MANAGED_FEE_DECISION_REQUIRED",
            SGDG_MANAGED_FEE_DECISION_MESSAGE,
          );
        }
        const validation = validateConfiguration(proposal.rules);
        if (!validation.validForSubmission)
          return commandFailure(
            "VALIDATION_ERROR",
            "Configuration không vượt qua final revalidation.",
            { fieldErrors: fieldErrorsFromFindings(validation.findings) },
          );
        const policyCheck = policyResolutionMatches(
          proposal,
          sessionCheck.session,
        );
        if (!policyCheck.resolutionReady)
          return commandFailure(
            proposal.overallConfigurationResolutionState === "STALE"
              ? "POLICY_RESOLUTION_STALE"
              : "BLOCKING_CONDITION",
            "Source-based Room/member-fee evidence failed final revalidation.",
          );
        if (
          proposal.creationSource !== "OPENING_REQUEST" ||
          proposal.managementMode !== "CUSTOMER_REQUESTED" ||
          !proposal.memberTitleReference ||
          proposal.listingFeeResolution?.applicability !== "APPLICABLE" ||
          !proposal.policyDecisionReference ||
          !proposal.priceBandResolution ||
          !proposal.roomResolution ||
          !proposal.specialRoomContext ||
          !proposal.policyDisclaimer ||
          !proposal.normalizationDisclaimer
        )
          return commandFailure(
            "BLOCKING_CONDITION",
            "Customer-requested Room/member-fee evidence is incomplete.",
          );
        const latestProposal = get().getProposalById(command.configurationId);
        const latestSession = getDynamicSession(proposal.sessionId);
        if (
          !latestProposal ||
          !latestSession ||
          latestProposal.proposalVersion !== proposal.proposalVersion ||
          latestSession.currentVersion !== sessionCheck.session.currentVersion
        )
          return commandFailure(
            "STALE_PROPOSAL_VERSION",
            "Configuration state changed immediately before confirmation.",
            {
              currentProposalVersion: latestProposal?.proposalVersion,
              currentSessionVersion: latestSession?.currentVersion,
            },
          );

        const time = deterministicTimestamp(proposal.proposalVersion, 20);
        const snapshot: ConfirmedAuctionConfigurationSnapshot = freezeSnapshot({
          snapshotId: `${proposal.configurationId}-snapshot-v${proposal.proposalVersion}`,
          configurationId: proposal.configurationId,
          sessionId: proposal.sessionId,
          sessionVersionAtConfirmation: sessionCheck.session.currentVersion,
          proposalVersion: proposal.proposalVersion,
          creationSource: "OPENING_REQUEST",
          managementMode: "CUSTOMER_REQUESTED",
          rules: cloneRules(proposal.rules),
          policyDecisionReference: {
            ...proposal.policyDecisionReference,
          },
          policyDisclaimer: proposal.policyDisclaimer,
          normalizationDisclaimer: proposal.normalizationDisclaimer,
          priceBandResolution: { ...proposal.priceBandResolution },
          roomResolution: { ...proposal.roomResolution },
          memberTitleReference: { ...proposal.memberTitleReference },
          listingFeeResolution: structuredClone(
            proposal.listingFeeResolution,
          ),
          specialRoomContext: { ...proposal.specialRoomContext },
          confirmedBy: command.actorId,
          confirmedAt: time,
          confirmationCommandReference: command.commandId,
          snapshotVersion: 1 as const,
        });
        const confirmed: AuctionConfigurationProposal = {
          ...proposal,
          status: "CONFIRMED",
          confirmedBy: command.actorId,
          confirmedAt: time,
          updatedBy: command.actorId,
          updatedAt: time,
          history: [
            ...proposal.history,
            makeHistory({
              proposal,
              action: "CONFIGURATION_CONFIRMED",
              fromStatus: "SUBMITTED",
              toStatus: "CONFIRMED",
              actorId: command.actorId,
              actorRole: command.actorRole,
              commandId: command.commandId,
              version: proposal.proposalVersion,
              time,
              policyEvidence: {
                startingPrice: proposal.priceBandResolution!
                  .evaluatedStartingPrice,
                priceBandReference: proposal.priceBandResolution!.reference,
                roomReference: proposal.roomResolution!.roomReference,
                memberTitle: proposal.memberTitleReference?.title,
                listingFee: proposal.listingFeeResolution!,
              },
            }),
            makeHistory({
              proposal,
              action: "CONFIGURATION_SNAPSHOT_CREATED",
              fromStatus: "CONFIRMED",
              toStatus: "CONFIRMED",
              actorId: command.actorId,
              actorRole: command.actorRole,
              commandId: `${command.commandId}:snapshot`,
              version: proposal.proposalVersion,
              time,
              policyEvidence: {
                startingPrice: proposal.priceBandResolution!
                  .evaluatedStartingPrice,
                priceBandReference: proposal.priceBandResolution!.reference,
                roomReference: proposal.roomResolution!.roomReference,
                memberTitle: proposal.memberTitleReference?.title,
                listingFee: proposal.listingFeeResolution!,
              },
            }),
          ],
        };
        set((state) => ({
          proposals: state.proposals.map((item) =>
            item.configurationId === confirmed.configurationId
              ? confirmed
              : item,
          ),
          snapshots: [...state.snapshots, snapshot],
        }));
        return { ok: true, proposal: confirmed, snapshot, created: true };
      },
      resetDeterministicConfigurationState: () =>
        set({ proposals: [], snapshots: [], legacySnapshots: [] }),
    }),
    {
      name: configurationStorageKey,
      version: 4,
      partialize: (state) => ({
        proposals: state.proposals,
        snapshots: state.snapshots,
        legacySnapshots: state.legacySnapshots,
      }),
      migrate: (persisted, version) =>
        version === 0 || version === 1
          ? sanitizePersistedConfigurationState(persisted, 1)
          : version === 2
            ? sanitizePersistedConfigurationState(persisted, 2)
            : version === 3
              ? sanitizePersistedConfigurationState(persisted, 3)
              : version === 4
                ? sanitizePersistedConfigurationState(persisted, 4)
                : { proposals: [], snapshots: [], legacySnapshots: [] },
      merge: (persisted, current) => ({
        ...current,
        ...sanitizePersistedConfigurationState(persisted),
      }),
    },
  ),
);
