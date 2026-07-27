import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import { getAuctionSessionById as getFixtureSessionById } from "../services/mock/operationsService";
import { getMembershipAccountReference } from "../services/membershipAccountReference";
import type {
  ListingFee,
  MemberTitle,
  MemberTitleReference,
  OrdinaryRoomReference,
  PriceBandReference,
} from "../services/roomValueTierPolicy";
import {
  type PersistedAuctionSession,
  type PersistedLinkedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";
import {
  type CustomerOpeningRequest,
  useOpeningRequestStore,
} from "./openingRequestStore";
import {
  PROTOTYPE_CONTENT_POLICY,
  type AuctionContent,
  useAuctionContentStore,
} from "./auctionContentStore";
import {
  type AuctionConfigurationProposal,
  type ConfirmedAuctionConfigurationSnapshot,
  useAuctionConfigurationStore,
} from "./auctionConfigurationStore";
import {
  type AuctionContentReview,
  type ContentReviewCompletionRecord,
  useAuctionContentReviewStore,
} from "./auctionContentReviewStore";

export const AUCTION_APPROVAL_PACKAGE_STORAGE_KEY =
  "sgdg-auction-approval-packages-v1";
export const AUCTION_APPROVAL_PACKAGE_SCHEMA_VERSION = 1;
export const APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION =
  "APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION";
export const SGDG_APPROVAL_PACKAGE_BLOCKER_MESSAGE =
  "Phiên SGDG-managed chưa có cấu hình hiện hành được xác nhận và chưa hoàn tất\nContent Review. Không thể chuẩn bị Approval Package.";

export type AuctionApprovalPackageStatus =
  | "DRAFT"
  | "READY_TO_SUBMIT"
  | "SUBMITTED"
  | "STALE"
  | "BLOCKED";

export type ApprovalPackageEvidenceValidity =
  | "CURRENT"
  | "STALE_AFTER_SUBMISSION"
  | "INVALID";

export interface ApprovalPackageEvidence {
  readonly packageEvidenceVersion: 1;
  readonly prototypeClassification: typeof PROTOTYPE_CONTENT_POLICY.classification;
  readonly session: Readonly<{
    sessionId: string;
    sessionCode: string;
    sessionVersion: number;
    creationSource: "OPENING_REQUEST";
    managementMode: "CUSTOMER_REQUESTED";
    lifecycleStatus: "DRAFT";
    publicationStatus: "NOT_READY";
    assetId: string;
    assetName: string;
  }>;
  readonly openingRequest: Readonly<{
    openingRequestId: string;
    openingRequestVersion: number;
    customerId: string;
    acceptedState: "ACCEPTED_FOR_DRAFT";
    originalTitle: string;
    originalPurpose: string;
  }>;
  readonly auctionContent: Readonly<{
    contentId: string;
    contentVersion: number;
    auctionTitle: string;
    auctionSummary: string;
    completenessStatus: "COMPLETE";
    sourceOpeningRequestId: string;
    sourceOpeningRequestVersion: number;
  }>;
  readonly configuration: Readonly<{
    configurationId: string;
    proposalVersion: number;
    snapshotId: string;
    snapshotVersion: 1;
    confirmedBy: string;
    confirmedAt: string;
    startingPrice: number;
    priceBand: PriceBandReference;
    ordinaryRoom: OrdinaryRoomReference;
    membershipReferenceId: string;
    membershipReferenceVersion: string | number;
    memberTitle: MemberTitle;
    memberListingFee: Exclude<
      ListingFee,
      { kind: "EVENT_SPECIFIC_POLICY" | "UNDEFINED" }
    >;
    policyId: "SGDG-ROOM-FEE-2017-PROTOTYPE";
    policyVersion: 2;
    policyDisclaimer: string;
  }>;
  readonly contentReview: Readonly<{
    reviewId: string;
    reviewVersion: number;
    completionRecordId: string;
    completionRecordVersion: 1;
    completedBy: string;
    completedAt: string;
    readiness: "READY_FOR_APPROVAL_PACKAGE_PREPARATION";
    findingCodes: readonly string[];
  }>;
}

export type ApprovalPackageFindingOwner =
  | "CONTENT_STAFF"
  | "CUSTOMER_SOURCE"
  | "MEMBERSHIP"
  | "CONFIGURATION_GOVERNANCE"
  | "CONTENT_REVIEW"
  | "AUCTION_SYSTEM"
  | "BUSINESS_DECISION";

export type ApprovalPackageFindingSection =
  | "SESSION"
  | "OPENING_REQUEST"
  | "AUCTION_CONTENT"
  | "CONFIGURATION"
  | "MEMBERSHIP"
  | "CONTENT_REVIEW"
  | "PACKAGE"
  | "LATER_PHASE_BOUNDARY";

export interface ApprovalPackageFinding {
  readonly code: string;
  readonly message: string;
  readonly owner: ApprovalPackageFindingOwner;
  readonly section: ApprovalPackageFindingSection;
  readonly severity: "ERROR" | "WARNING";
  readonly correctableInPackageWorkspace: false;
  readonly referenceId?: string;
  readonly referenceVersion?: string | number;
}

export interface ApprovalPackageValidationResult {
  readonly readyToSubmit: boolean;
  readonly evaluatedSessionVersion: number;
  readonly evaluatedOpeningRequestVersion: number;
  readonly evaluatedContentVersion: number;
  readonly evaluatedConfigurationSnapshotId: string;
  readonly evaluatedConfigurationProposalVersion: number;
  readonly evaluatedReviewVersion: number;
  readonly evaluatedCompletionRecordId: string;
  readonly evaluatedAt: string;
  readonly findings: readonly ApprovalPackageFinding[];
}

export type ApprovalPackageHistoryAction =
  | "APPROVAL_PACKAGE_DRAFT_CREATED"
  | "APPROVAL_PACKAGE_EVIDENCE_SNAPSHOTTED"
  | "APPROVAL_PACKAGE_READY_TO_SUBMIT"
  | "APPROVAL_PACKAGE_DRAFT_REFRESHED"
  | "APPROVAL_PACKAGE_MARKED_STALE"
  | "APPROVAL_PACKAGE_BLOCKED"
  | "APPROVAL_PACKAGE_SUBMISSION_STARTED"
  | "APPROVAL_PACKAGE_SUBMITTED"
  | "APPROVAL_PACKAGE_SUBMISSION_RECORDED"
  | "APPROVAL_PACKAGE_EVIDENCE_STALE_AFTER_SUBMISSION"
  | "APPROVAL_PACKAGE_PERSISTENCE_REJECTED";

export interface ApprovalPackageHistoryEntry {
  readonly historyId: string;
  readonly packageId: string;
  readonly packageVersion: number;
  readonly sessionId: string;
  readonly sessionVersion: number;
  readonly contentId: string;
  readonly contentVersion: number;
  readonly configurationSnapshotId: string;
  readonly reviewId: string;
  readonly reviewVersion: number;
  readonly completionRecordId: string;
  readonly actorId: string;
  readonly actorRole: "CONTENT_STAFF";
  readonly commandId: string;
  readonly action: ApprovalPackageHistoryAction;
  readonly previousStatus?: AuctionApprovalPackageStatus;
  readonly resultingStatus: AuctionApprovalPackageStatus;
  readonly findingCodes: readonly string[];
  readonly reason: string;
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export interface AuctionApprovalPackage {
  readonly packageId: string;
  readonly packageVersion: number;
  readonly sessionId: string;
  readonly sessionVersionAtPreparation: number;
  readonly status: AuctionApprovalPackageStatus;
  readonly evidence: ApprovalPackageEvidence;
  readonly preparationValidation: ApprovalPackageValidationResult;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
  readonly submittedBy?: string;
  readonly submittedAt?: string;
  readonly submissionRecordId?: string;
  readonly history: readonly ApprovalPackageHistoryEntry[];
}

export interface ApprovalPackageSubmissionRecord {
  readonly submissionRecordId: string;
  readonly recordVersion: 1;
  readonly packageId: string;
  readonly submittedPackageVersion: number;
  readonly sessionId: string;
  readonly sessionVersion: number;
  readonly contentId: string;
  readonly contentVersion: number;
  readonly configurationSnapshotId: string;
  readonly configurationProposalVersion: number;
  readonly reviewId: string;
  readonly reviewVersion: number;
  readonly completionRecordId: string;
  readonly submittedBy: string;
  readonly submittedAt: string;
  readonly queueState: "AWAITING_ADMIN_REVIEW";
}

export type ApprovalPackageCommandErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_COMMAND"
  | "SESSION_NOT_FOUND"
  | "SESSION_NOT_DYNAMIC"
  | "INVALID_SESSION_STATE"
  | "INVALID_PUBLICATION_STATE"
  | "STALE_SESSION_VERSION"
  | "OPENING_REQUEST_LINEAGE_INVALID"
  | "AUCTION_CONTENT_NOT_COMPLETE"
  | "AUCTION_CONTENT_STALE"
  | "STALE_CONTENT_VERSION"
  | "CONFIGURATION_NOT_CONFIRMED"
  | "CONFIGURATION_SNAPSHOT_MISSING"
  | "CONFIGURATION_SNAPSHOT_LEGACY_ONLY"
  | "CONFIGURATION_CHANGED"
  | "MEMBERSHIP_EVIDENCE_STALE"
  | "CONTENT_REVIEW_NOT_COMPLETED"
  | "STALE_REVIEW_VERSION"
  | "COMPLETION_RECORD_MISSING"
  | "COMPLETION_RECORD_INVALID"
  | "CONTENT_REVIEW_COMPLETION_STALE"
  | "PACKAGE_READINESS_INVALID"
  | "APPROVAL_PACKAGE_NOT_FOUND"
  | "APPROVAL_PACKAGE_ALREADY_EXISTS"
  | "APPROVAL_PACKAGE_ALREADY_SUBMITTED"
  | "APPROVAL_PACKAGE_NOT_READY"
  | "STALE_PACKAGE_VERSION"
  | "LATER_PHASE_STATE_EXISTS"
  | "PERSISTENCE_ERROR"
  | "BLOCKED"
  | typeof APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION;

export interface CreateApprovalPackageDraftCommand {
  sessionId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedSessionVersion: number;
  expectedContentVersion: number;
  expectedConfigurationSnapshotId: string;
  expectedReviewVersion: number;
  expectedCompletionRecordId: string;
  commandId: string;
}

export interface RefreshApprovalPackageDraftCommand {
  packageId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedPackageVersion: number;
  expectedSessionVersion: number;
  expectedContentVersion: number;
  expectedConfigurationSnapshotId: string;
  expectedReviewVersion: number;
  expectedCompletionRecordId: string;
  commandId: string;
}

export type SubmitApprovalPackageCommand =
  RefreshApprovalPackageDraftCommand;

export type ApprovalPackageCommandResult =
  | {
      ok: true;
      package: AuctionApprovalPackage;
      submissionRecord?: ApprovalPackageSubmissionRecord;
      created?: boolean;
      changed?: boolean;
    }
  | {
      ok: false;
      code: ApprovalPackageCommandErrorCode;
      message: string;
      package?: AuctionApprovalPackage;
      submissionRecord?: ApprovalPackageSubmissionRecord;
    };

export interface AuthoritativeApprovalPackageSources {
  session?: PersistedAuctionSession;
  fixtureSessionExists: boolean;
  openingRequest?: CustomerOpeningRequest;
  content?: AuctionContent;
  configuration?: AuctionConfigurationProposal;
  snapshot?: ConfirmedAuctionConfigurationSnapshot;
  legacySnapshotExists: boolean;
  membership?: MemberTitleReference;
  review?: AuctionContentReview;
  completionRecord?: ContentReviewCompletionRecord;
}

export type ApprovalPackageEligibilityResult =
  | {
      eligible: true;
      sources: AuthoritativeApprovalPackageSources & {
        session: PersistedLinkedAuctionSession;
        openingRequest: CustomerOpeningRequest;
        content: AuctionContent;
        configuration: AuctionConfigurationProposal;
        snapshot: ConfirmedAuctionConfigurationSnapshot;
        membership: MemberTitleReference;
        review: AuctionContentReview;
        completionRecord: ContentReviewCompletionRecord;
      };
    }
  | {
      eligible: false;
      code: ApprovalPackageCommandErrorCode;
      message: string;
    };

export interface AdminApprovalPackageQueueItem {
  readonly packageId: string;
  readonly sessionId: string;
  readonly sessionCode: string;
  readonly creationSource: "OPENING_REQUEST";
  readonly managementMode: "CUSTOMER_REQUESTED";
  readonly submittedPackageVersion: number;
  readonly contentVersion: number;
  readonly configurationSnapshotId: string;
  readonly completionRecordId: string;
  readonly submittedBy: string;
  readonly submittedAt: string;
  readonly queueState: "AWAITING_ADMIN_REVIEW";
  readonly evidenceValidity: ApprovalPackageEvidenceValidity;
}

export interface AuctionApprovalPackageState {
  packages: AuctionApprovalPackage[];
  submissionRecords: ApprovalPackageSubmissionRecord[];
  getPackageBySessionId: (
    sessionId: string,
  ) => AuctionApprovalPackage | undefined;
  getPackageById: (packageId: string) => AuctionApprovalPackage | undefined;
  getSubmissionRecordByPackageId: (
    packageId: string,
  ) => ApprovalPackageSubmissionRecord | undefined;
  createApprovalPackageDraft: (
    command: CreateApprovalPackageDraftCommand,
  ) => ApprovalPackageCommandResult;
  refreshApprovalPackageDraft: (
    command: RefreshApprovalPackageDraftCommand,
  ) => ApprovalPackageCommandResult;
  submitApprovalPackage: (
    command: SubmitApprovalPackageCommand,
  ) => ApprovalPackageCommandResult;
  resetDeterministicApprovalPackageState: () => void;
}

const packageIdFor = (sessionId: string) => `approval-package-${sessionId}`;
const submissionRecordIdFor = (packageId: string) =>
  `approval-package-submission-${packageId}`;
const deterministicTime = (version: number, offset = 0) =>
  new Date(Date.UTC(2026, 6, 26, 14, version, offset)).toISOString();
const validCommandId = (commandId: string) =>
  /^[A-Za-z0-9][A-Za-z0-9:._-]{2,499}$/.test(commandId);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
) => {
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
};
const validIsoTime = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const positiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;
const cloneListingFee = (
  fee: Exclude<
    ListingFee,
    { kind: "EVENT_SPECIFIC_POLICY" | "UNDEFINED" }
  >,
) => Object.freeze({ ...fee });

const freezeEvidence = (
  evidence: ApprovalPackageEvidence,
): ApprovalPackageEvidence =>
  Object.freeze({
    ...evidence,
    session: Object.freeze({ ...evidence.session }),
    openingRequest: Object.freeze({ ...evidence.openingRequest }),
    auctionContent: Object.freeze({ ...evidence.auctionContent }),
    configuration: Object.freeze({
      ...evidence.configuration,
      memberListingFee: cloneListingFee(
        evidence.configuration.memberListingFee,
      ),
    }),
    contentReview: Object.freeze({
      ...evidence.contentReview,
      findingCodes: Object.freeze([
        ...evidence.contentReview.findingCodes,
      ]),
    }),
  });

const freezeFinding = (finding: ApprovalPackageFinding) =>
  Object.freeze({ ...finding });
const freezeValidation = (
  validation: ApprovalPackageValidationResult,
): ApprovalPackageValidationResult =>
  Object.freeze({
    ...validation,
    findings: Object.freeze(validation.findings.map(freezeFinding)),
  });
const freezeHistory = (history: ApprovalPackageHistoryEntry) =>
  Object.freeze({
    ...history,
    findingCodes: Object.freeze([...history.findingCodes]),
  });
const freezePackage = (
  value: AuctionApprovalPackage,
): AuctionApprovalPackage =>
  Object.freeze({
    ...value,
    evidence: freezeEvidence(value.evidence),
    preparationValidation: freezeValidation(value.preparationValidation),
    history: Object.freeze(value.history.map(freezeHistory)),
  });
const freezeSubmissionRecord = (
  value: ApprovalPackageSubmissionRecord,
): ApprovalPackageSubmissionRecord => Object.freeze({ ...value });

const hasLaterPhaseState = (value: object) =>
  [
    "approvedVersion",
    "approvalPackageId",
    "scheduleId",
    "scheduleVersion",
    "publishedAt",
    "publicationId",
    "registrationState",
    "registrationStatus",
    "eligibilityState",
    "eligibilityStatus",
    "approvalDecision",
  ].some((key) => Reflect.get(value, key) !== undefined);

export const collectAuthoritativeApprovalPackageSources = (
  sessionId: string,
): AuthoritativeApprovalPackageSources => {
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === sessionId);
  const openingRequest =
    session?.recordKind === "DYNAMIC_LINKED_SESSION"
      ? useOpeningRequestStore
          .getState()
          .records.find(
            (item) => item.requestId === session.openingRequestId,
          )
      : undefined;
  const content = useAuctionContentStore
    .getState()
    .contents.find((item) => item.sessionId === sessionId);
  const configuration = useAuctionConfigurationStore
    .getState()
    .proposals.find((item) => item.sessionId === sessionId);
  const snapshot = useAuctionConfigurationStore
    .getState()
    .snapshots.find((item) => item.sessionId === sessionId);
  const legacySnapshotExists = useAuctionConfigurationStore
    .getState()
    .legacySnapshots.some((item) => item.sessionId === sessionId);
  const membership = openingRequest
    ? getMembershipAccountReference(openingRequest.ownerId)
    : undefined;
  const review = useAuctionContentReviewStore
    .getState()
    .reviews.find((item) => item.sessionId === sessionId);
  const completionRecord = review
    ? useAuctionContentReviewStore
        .getState()
        .completionRecords.find((item) => item.reviewId === review.reviewId)
    : undefined;
  return {
    session,
    fixtureSessionExists: Boolean(getFixtureSessionById(sessionId)),
    openingRequest,
    content,
    configuration,
    snapshot,
    legacySnapshotExists,
    membership,
    review,
    completionRecord,
  };
};

const currentConfigurationIsValid = (
  sources: AuthoritativeApprovalPackageSources,
): sources is AuthoritativeApprovalPackageSources & {
  session: PersistedLinkedAuctionSession;
  configuration: AuctionConfigurationProposal;
  snapshot: ConfirmedAuctionConfigurationSnapshot;
} => {
  const { session, configuration, snapshot } = sources;
  return Boolean(
    session?.recordKind === "DYNAMIC_LINKED_SESSION" &&
      configuration &&
      snapshot &&
      !configuration.legacyPolicyState &&
      configuration.status === "CONFIRMED" &&
      configuration.overallConfigurationResolutionState === "READY" &&
      configuration.roomResolutionState === "APPLIED" &&
      configuration.listingFeeResolutionState === "APPLIED" &&
      configuration.sessionId === session.sessionId &&
      configuration.sessionVersion === session.currentVersion &&
      snapshot.sessionId === session.sessionId &&
      snapshot.configurationId === configuration.configurationId &&
      snapshot.proposalVersion === configuration.proposalVersion &&
      snapshot.sessionVersionAtConfirmation === session.currentVersion &&
      snapshot.creationSource === "OPENING_REQUEST" &&
      snapshot.managementMode === "CUSTOMER_REQUESTED" &&
      snapshot.rules.startingPrice !== null &&
      snapshot.listingFeeResolution.applicability === "APPLICABLE",
  );
};

const membershipMatchesSnapshot = (
  membership: MemberTitleReference | undefined,
  snapshot: ConfirmedAuctionConfigurationSnapshot | undefined,
) =>
  Boolean(
    membership &&
      snapshot &&
      membership.memberId === snapshot.memberTitleReference.memberId &&
      membership.referenceVersion ===
        snapshot.memberTitleReference.referenceVersion &&
      membership.title === snapshot.memberTitleReference.title &&
      snapshot.listingFeeResolution.memberTitle === membership.title,
  );

const completionEvidenceIsCurrent = (
  sources: AuthoritativeApprovalPackageSources,
) => {
  const {
    session,
    openingRequest,
    content,
    snapshot,
    membership,
    review,
    completionRecord,
  } = sources;
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    !openingRequest ||
    !content ||
    !snapshot ||
    !membership ||
    !review ||
    !completionRecord
  )
    return false;
  const readiness = completionRecord.readinessSnapshot;
  return (
    review.status === "COMPLETED" &&
    completionRecord.reviewId === review.reviewId &&
    completionRecord.reviewVersion === review.reviewVersion &&
    completionRecord.sessionId === session.sessionId &&
    completionRecord.sessionVersionAtCompletion === session.currentVersion &&
    completionRecord.openingRequestId === openingRequest.requestId &&
    completionRecord.openingRequestVersion === openingRequest.version &&
    completionRecord.contentId === content.contentId &&
    completionRecord.contentVersion === content.contentVersion &&
    completionRecord.configurationSnapshotId === snapshot.snapshotId &&
    completionRecord.configurationProposalVersion === snapshot.proposalVersion &&
    completionRecord.reviewedContentSnapshot.auctionTitle ===
      content.workingContent.auctionTitle &&
    completionRecord.reviewedContentSnapshot.auctionSummary ===
      content.workingContent.auctionSummary &&
    completionRecord.reviewedContentSnapshot.sourceLineage.openingRequestId ===
      content.sourceLineage.openingRequestId &&
    completionRecord.reviewedContentSnapshot.sourceLineage
      .openingRequestVersion === content.sourceLineage.openingRequestVersion &&
    readiness.ready &&
    readiness.findings.every((finding) => finding.severity !== "ERROR") &&
    readiness.evaluatedSessionVersion === session.currentVersion &&
    readiness.evaluatedContentId === content.contentId &&
    readiness.evaluatedContentVersion === content.contentVersion &&
    readiness.evaluatedConfigurationSnapshotId === snapshot.snapshotId &&
    readiness.evaluatedConfigurationProposalVersion ===
      snapshot.proposalVersion &&
    readiness.evaluatedOpeningRequestId === openingRequest.requestId &&
    readiness.evaluatedOpeningRequestVersion === openingRequest.version &&
    readiness.evaluatedMembershipReferenceVersion ===
      membership.referenceVersion &&
    membershipMatchesSnapshot(membership, snapshot)
  );
};

export const evaluateApprovalPackageEligibility = ({
  sources,
  actorRole,
  commandId,
  expectedSessionVersion,
  expectedContentVersion,
  expectedConfigurationSnapshotId,
  expectedReviewVersion,
  expectedCompletionRecordId,
  approvalPackageExists,
}: {
  sources: AuthoritativeApprovalPackageSources;
  actorRole: ActorRole;
  commandId: string;
  expectedSessionVersion: number;
  expectedContentVersion: number;
  expectedConfigurationSnapshotId: string;
  expectedReviewVersion: number;
  expectedCompletionRecordId: string;
  approvalPackageExists: boolean;
}): ApprovalPackageEligibilityResult => {
  const {
    session,
    openingRequest,
    content,
    configuration,
    snapshot,
    membership,
    review,
    completionRecord,
  } = sources;
  if (actorRole !== "CONTENT_STAFF")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Chỉ CONTENT_STAFF được chuẩn bị Approval Package.",
    };
  if (!validCommandId(commandId))
    return {
      eligible: false,
      code: "INVALID_COMMAND",
      message: "Command ID bắt buộc và phải hợp lệ.",
    };
  if (!session) {
    return {
      eligible: false,
      code: sources.fixtureSessionExists
        ? "SESSION_NOT_DYNAMIC"
        : "SESSION_NOT_FOUND",
      message: sources.fixtureSessionExists
        ? "Fixture Session không thuộc dynamic Approval Package authority."
        : "Không tìm thấy dynamic Auction Session.",
    };
  }
  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return {
      eligible: false,
      code: APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION,
      message: SGDG_APPROVAL_PACKAGE_BLOCKER_MESSAGE,
    };
  if (
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED"
  )
    return {
      eligible: false,
      code: "SESSION_NOT_DYNAMIC",
      message: "Chỉ dynamic Customer-requested Session được hỗ trợ.",
    };
  if (session.lifecycleStatus !== "DRAFT")
    return {
      eligible: false,
      code: "INVALID_SESSION_STATE",
      message: "Session phải giữ lifecycle DRAFT.",
    };
  if (session.publicationStatus !== "NOT_READY")
    return {
      eligible: false,
      code: "INVALID_PUBLICATION_STATE",
      message: "Publication phải giữ NOT_READY.",
    };
  if (session.currentVersion !== expectedSessionVersion)
    return {
      eligible: false,
      code: "STALE_SESSION_VERSION",
      message: "Session version đã thay đổi.",
    };
  if (
    !openingRequest ||
    openingRequest.status !== "ACCEPTED_FOR_DRAFT" ||
    openingRequest.requestId !== session.openingRequestId ||
    openingRequest.version !== session.openingRequestVersion ||
    openingRequest.acceptedOpeningRequestVersion !==
      session.openingRequestVersion
  )
    return {
      eligible: false,
      code: "OPENING_REQUEST_LINEAGE_INVALID",
      message: "Opening Request lineage không còn current.",
    };
  if (
    !content ||
    content.sessionId !== session.sessionId ||
    content.status !== "COMPLETE" ||
    !content.completeness.complete
  )
    return {
      eligible: false,
      code: "AUCTION_CONTENT_NOT_COMPLETE",
      message: "Current Auction Content phải COMPLETE.",
    };
  if (
    content.sourceLineage.openingRequestId !== openingRequest.requestId ||
    content.sourceLineage.openingRequestVersion !== openingRequest.version ||
    content.sourceLineage.customerId !== openingRequest.ownerId
  )
    return {
      eligible: false,
      code: "AUCTION_CONTENT_STALE",
      message: "Auction Content source lineage đã stale.",
    };
  if (content.contentVersion !== expectedContentVersion)
    return {
      eligible: false,
      code: "STALE_CONTENT_VERSION",
      message: "Content version đã thay đổi.",
    };
  if (!snapshot) {
    return {
      eligible: false,
      code: sources.legacySnapshotExists
        ? "CONFIGURATION_SNAPSHOT_LEGACY_ONLY"
        : "CONFIGURATION_SNAPSHOT_MISSING",
      message: sources.legacySnapshotExists
        ? "Chỉ có legacy Configuration evidence."
        : "Không có current Configuration Snapshot.",
    };
  }
  if (!currentConfigurationIsValid(sources))
    return {
      eligible: false,
      code: configuration
        ? "CONFIGURATION_NOT_CONFIRMED"
        : "CONFIGURATION_SNAPSHOT_MISSING",
      message: "Configuration evidence không còn confirmed/current.",
    };
  if (snapshot.snapshotId !== expectedConfigurationSnapshotId)
    return {
      eligible: false,
      code: "CONFIGURATION_CHANGED",
      message: "Configuration Snapshot đã thay đổi.",
    };
  if (!membership || !membershipMatchesSnapshot(membership, snapshot))
    return {
      eligible: false,
      code: "MEMBERSHIP_EVIDENCE_STALE",
      message: "Membership/Member Title/Listing Fee evidence đã stale.",
    };
  if (!review || review.status !== "COMPLETED")
    return {
      eligible: false,
      code: "CONTENT_REVIEW_NOT_COMPLETED",
      message: "Content Review chưa hoàn tất.",
    };
  if (review.reviewVersion !== expectedReviewVersion)
    return {
      eligible: false,
      code: "STALE_REVIEW_VERSION",
      message: "Content Review version đã thay đổi.",
    };
  if (!completionRecord)
    return {
      eligible: false,
      code: "COMPLETION_RECORD_MISSING",
      message: "Không tìm thấy Content Review Completion Record.",
    };
  if (completionRecord.completionRecordId !== expectedCompletionRecordId)
    return {
      eligible: false,
      code: "COMPLETION_RECORD_INVALID",
      message: "Completion Record ID không khớp.",
    };
  if (!completionEvidenceIsCurrent(sources))
    return {
      eligible: false,
      code: "CONTENT_REVIEW_COMPLETION_STALE",
      message: "Content Review completion evidence không còn current.",
    };
  if (
    !completionRecord.readinessSnapshot.ready ||
    completionRecord.readinessSnapshot.findings.some(
      (finding) => finding.severity === "ERROR",
    )
  )
    return {
      eligible: false,
      code: "PACKAGE_READINESS_INVALID",
      message: "Session Package chưa sẵn sàng để chuẩn bị Approval Package.",
    };
  if (approvalPackageExists)
    return {
      eligible: false,
      code: "APPROVAL_PACKAGE_ALREADY_EXISTS",
      message: "Session đã có Approval Package.",
    };
  if (hasLaterPhaseState(session))
    return {
      eligible: false,
      code: "LATER_PHASE_STATE_EXISTS",
      message: "Session có later-phase state ngoài phạm vi.",
    };
  return {
    eligible: true,
    sources: {
      ...sources,
      session,
      openingRequest,
      content,
      configuration: sources.configuration,
      snapshot: sources.snapshot,
      membership,
      review,
      completionRecord,
    },
  };
};

const buildEvidence = (
  sources: Extract<ApprovalPackageEligibilityResult, { eligible: true }>["sources"],
): ApprovalPackageEvidence => {
  const {
    session,
    openingRequest,
    content,
    snapshot,
    membership,
    review,
    completionRecord,
  } = sources;
  const startingPrice = snapshot.rules.startingPrice;
  if (typeof startingPrice !== "number")
    throw new Error("Eligible configuration must contain a starting price.");
  return freezeEvidence({
    packageEvidenceVersion: 1,
    prototypeClassification: PROTOTYPE_CONTENT_POLICY.classification,
    session: {
      sessionId: session.sessionId,
      sessionCode: session.auctionCode,
      sessionVersion: session.currentVersion,
      creationSource: "OPENING_REQUEST",
      managementMode: "CUSTOMER_REQUESTED",
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
      assetId: session.assetId,
      assetName: session.assetName,
    },
    openingRequest: {
      openingRequestId: openingRequest.requestId,
      openingRequestVersion: openingRequest.version,
      customerId: openingRequest.ownerId,
      acceptedState: "ACCEPTED_FOR_DRAFT",
      originalTitle: openingRequest.title,
      originalPurpose: openingRequest.purpose,
    },
    auctionContent: {
      contentId: content.contentId,
      contentVersion: content.contentVersion,
      auctionTitle: content.workingContent.auctionTitle,
      auctionSummary: content.workingContent.auctionSummary,
      completenessStatus: "COMPLETE",
      sourceOpeningRequestId: content.sourceLineage.openingRequestId,
      sourceOpeningRequestVersion:
        content.sourceLineage.openingRequestVersion,
    },
    configuration: {
      configurationId: snapshot.configurationId,
      proposalVersion: snapshot.proposalVersion,
      snapshotId: snapshot.snapshotId,
      snapshotVersion: 1,
      confirmedBy: snapshot.confirmedBy,
      confirmedAt: snapshot.confirmedAt,
      startingPrice,
      priceBand: snapshot.priceBandResolution.reference,
      ordinaryRoom: snapshot.roomResolution.roomReference,
      membershipReferenceId: membership.memberId,
      membershipReferenceVersion: membership.referenceVersion,
      memberTitle: membership.title,
      memberListingFee: cloneListingFee(
        snapshot.listingFeeResolution.fee,
      ),
      policyId: snapshot.policyDecisionReference.decisionId,
      policyVersion: snapshot.policyDecisionReference.decisionVersion,
      policyDisclaimer: snapshot.policyDisclaimer,
    },
    contentReview: {
      reviewId: review.reviewId,
      reviewVersion: review.reviewVersion,
      completionRecordId: completionRecord.completionRecordId,
      completionRecordVersion: 1,
      completedBy: completionRecord.completedBy,
      completedAt: completionRecord.completedAt,
      readiness: "READY_FOR_APPROVAL_PACKAGE_PREPARATION",
      findingCodes: Object.freeze(
        completionRecord.readinessSnapshot.findings.map(
          (finding) => finding.code,
        ),
      ),
    },
  });
};

const addFinding = (
  findings: ApprovalPackageFinding[],
  finding: Omit<
    ApprovalPackageFinding,
    "severity" | "correctableInPackageWorkspace"
  >,
) =>
  findings.push(
    freezeFinding({
      ...finding,
      severity: "ERROR",
      correctableInPackageWorkspace: false,
    }),
  );

export const evaluateApprovalPackageValidation = ({
  evidence,
  sources,
  evaluatedAt,
}: {
  evidence: ApprovalPackageEvidence;
  sources: AuthoritativeApprovalPackageSources;
  evaluatedAt: string;
}): ApprovalPackageValidationResult => {
  const findings: ApprovalPackageFinding[] = [];
  const {
    session,
    openingRequest,
    content,
    configuration,
    snapshot,
    membership,
    review,
    completionRecord,
  } = sources;
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.sessionId !== evidence.session.sessionId ||
    session.lifecycleStatus !== "DRAFT" ||
    session.publicationStatus !== "NOT_READY"
  )
    addFinding(findings, {
      code: "SESSION_EVIDENCE_STALE",
      message: "Session evidence không còn current DRAFT / NOT_READY.",
      owner: "AUCTION_SYSTEM",
      section: "SESSION",
      referenceId: evidence.session.sessionId,
      referenceVersion: session?.currentVersion,
    });
  else if (session.currentVersion !== evidence.session.sessionVersion)
    addFinding(findings, {
      code: "SESSION_VERSION_CHANGED",
      message: "Session version đã thay đổi sau khi Package được chuẩn bị.",
      owner: "AUCTION_SYSTEM",
      section: "SESSION",
      referenceId: session.sessionId,
      referenceVersion: session.currentVersion,
    });
  if (
    !openingRequest ||
    openingRequest.status !== "ACCEPTED_FOR_DRAFT" ||
    openingRequest.requestId !==
      evidence.openingRequest.openingRequestId ||
    openingRequest.version !==
      evidence.openingRequest.openingRequestVersion
  )
    addFinding(findings, {
      code: "OPENING_REQUEST_EVIDENCE_STALE",
      message: "Opening Request lineage không còn current.",
      owner: "CUSTOMER_SOURCE",
      section: "OPENING_REQUEST",
      referenceId: evidence.openingRequest.openingRequestId,
      referenceVersion: openingRequest?.version,
    });
  if (
    !content ||
    content.contentId !== evidence.auctionContent.contentId ||
    content.status !== "COMPLETE" ||
    !content.completeness.complete
  )
    addFinding(findings, {
      code: "AUCTION_CONTENT_NOT_COMPLETE",
      message: "Auction Content không còn COMPLETE.",
      owner: "CONTENT_STAFF",
      section: "AUCTION_CONTENT",
      referenceId: evidence.auctionContent.contentId,
      referenceVersion: content?.contentVersion,
    });
  else if (
    content.contentVersion !== evidence.auctionContent.contentVersion ||
    content.workingContent.auctionTitle !==
      evidence.auctionContent.auctionTitle ||
    content.workingContent.auctionSummary !==
      evidence.auctionContent.auctionSummary
  )
    addFinding(findings, {
      code: "CONTENT_VERSION_CHANGED",
      message: "Auction Content evidence đã thay đổi.",
      owner: "CONTENT_STAFF",
      section: "AUCTION_CONTENT",
      referenceId: content.contentId,
      referenceVersion: content.contentVersion,
    });
  if (!snapshot)
    addFinding(findings, {
      code: sources.legacySnapshotExists
        ? "CONFIGURATION_SNAPSHOT_LEGACY_ONLY"
        : "CONFIGURATION_SNAPSHOT_MISSING",
      message: "Không còn current Configuration Snapshot.",
      owner: "CONFIGURATION_GOVERNANCE",
      section: "CONFIGURATION",
      referenceId: evidence.configuration.snapshotId,
    });
  else if (
    !currentConfigurationIsValid(sources) ||
    !configuration ||
    snapshot.snapshotId !== evidence.configuration.snapshotId ||
    snapshot.proposalVersion !== evidence.configuration.proposalVersion
  )
    addFinding(findings, {
      code: "CONFIGURATION_CHANGED",
      message: "Configuration evidence đã thay đổi hoặc không còn valid.",
      owner: "CONFIGURATION_GOVERNANCE",
      section: "CONFIGURATION",
      referenceId: snapshot.snapshotId,
      referenceVersion: snapshot.proposalVersion,
    });
  if (
    !membership ||
    !membershipMatchesSnapshot(membership, snapshot) ||
    membership.memberId !== evidence.configuration.membershipReferenceId ||
    membership.referenceVersion !==
      evidence.configuration.membershipReferenceVersion ||
    membership.title !== evidence.configuration.memberTitle
  )
    addFinding(findings, {
      code: "MEMBERSHIP_EVIDENCE_STALE",
      message: "Membership, Member Title hoặc Listing Fee evidence đã stale.",
      owner: "MEMBERSHIP",
      section: "MEMBERSHIP",
      referenceId: evidence.configuration.membershipReferenceId,
      referenceVersion: membership?.referenceVersion,
    });
  if (
    !review ||
    review.status !== "COMPLETED" ||
    review.reviewId !== evidence.contentReview.reviewId ||
    review.reviewVersion !== evidence.contentReview.reviewVersion
  )
    addFinding(findings, {
      code: "CONTENT_REVIEW_COMPLETION_STALE",
      message: "Completed Content Review evidence không còn current.",
      owner: "CONTENT_REVIEW",
      section: "CONTENT_REVIEW",
      referenceId: evidence.contentReview.reviewId,
      referenceVersion: review?.reviewVersion,
    });
  if (
    !completionRecord ||
    completionRecord.completionRecordId !==
      evidence.contentReview.completionRecordId ||
    !completionEvidenceIsCurrent(sources)
  )
    addFinding(findings, {
      code: "COMPLETION_RECORD_INVALID",
      message: "Content Review Completion Record không còn current/valid.",
      owner: "CONTENT_REVIEW",
      section: "CONTENT_REVIEW",
      referenceId: evidence.contentReview.completionRecordId,
    });
  if (session && hasLaterPhaseState(session))
    addFinding(findings, {
      code: "LATER_PHASE_STATE_EXISTS",
      message: "Phát hiện later-phase state ngoài Approval Package scope.",
      owner: "AUCTION_SYSTEM",
      section: "LATER_PHASE_BOUNDARY",
      referenceId: session.sessionId,
    });
  return freezeValidation({
    readyToSubmit: findings.length === 0,
    evaluatedSessionVersion:
      session?.currentVersion ?? evidence.session.sessionVersion,
    evaluatedOpeningRequestVersion:
      openingRequest?.version ??
      evidence.openingRequest.openingRequestVersion,
    evaluatedContentVersion:
      content?.contentVersion ?? evidence.auctionContent.contentVersion,
    evaluatedConfigurationSnapshotId:
      snapshot?.snapshotId ?? evidence.configuration.snapshotId,
    evaluatedConfigurationProposalVersion:
      snapshot?.proposalVersion ?? evidence.configuration.proposalVersion,
    evaluatedReviewVersion:
      review?.reviewVersion ?? evidence.contentReview.reviewVersion,
    evaluatedCompletionRecordId:
      completionRecord?.completionRecordId ??
      evidence.contentReview.completionRecordId,
    evaluatedAt,
    findings,
  });
};

const evidenceEquals = (
  left: ApprovalPackageEvidence,
  right: ApprovalPackageEvidence,
) => JSON.stringify(left) === JSON.stringify(right);
const validationEquals = (
  left: ApprovalPackageValidationResult,
  right: ApprovalPackageValidationResult,
) =>
  left.readyToSubmit === right.readyToSubmit &&
  left.evaluatedSessionVersion === right.evaluatedSessionVersion &&
  left.evaluatedOpeningRequestVersion ===
    right.evaluatedOpeningRequestVersion &&
  left.evaluatedContentVersion === right.evaluatedContentVersion &&
  left.evaluatedConfigurationSnapshotId ===
    right.evaluatedConfigurationSnapshotId &&
  left.evaluatedConfigurationProposalVersion ===
    right.evaluatedConfigurationProposalVersion &&
  left.evaluatedReviewVersion === right.evaluatedReviewVersion &&
  left.evaluatedCompletionRecordId ===
    right.evaluatedCompletionRecordId &&
  JSON.stringify(left.findings) === JSON.stringify(right.findings);

const makeHistory = ({
  packageValue,
  packageVersion,
  actorId,
  commandId,
  action,
  previousStatus,
  resultingStatus,
  validation,
  reason,
  occurredAt,
  index,
}: {
  packageValue: Pick<
    AuctionApprovalPackage,
    "packageId" | "sessionId" | "evidence"
  >;
  packageVersion: number;
  actorId: string;
  commandId: string;
  action: ApprovalPackageHistoryAction;
  previousStatus?: AuctionApprovalPackageStatus;
  resultingStatus: AuctionApprovalPackageStatus;
  validation: ApprovalPackageValidationResult;
  reason: string;
  occurredAt: string;
  index: number;
}): ApprovalPackageHistoryEntry =>
  freezeHistory({
    historyId: `APH-${packageValue.packageId}-${packageVersion}-${index}-${action}`,
    packageId: packageValue.packageId,
    packageVersion,
    sessionId: packageValue.sessionId,
    sessionVersion: packageValue.evidence.session.sessionVersion,
    contentId: packageValue.evidence.auctionContent.contentId,
    contentVersion: packageValue.evidence.auctionContent.contentVersion,
    configurationSnapshotId:
      packageValue.evidence.configuration.snapshotId,
    reviewId: packageValue.evidence.contentReview.reviewId,
    reviewVersion: packageValue.evidence.contentReview.reviewVersion,
    completionRecordId:
      packageValue.evidence.contentReview.completionRecordId,
    actorId,
    actorRole: "CONTENT_STAFF",
    commandId,
    action,
    ...(previousStatus ? { previousStatus } : {}),
    resultingStatus,
    findingCodes: validation.findings.map((finding) => finding.code),
    reason,
    occurredAt,
    visibility: "STAFF_ONLY",
  });

const commandFailure = (
  code: ApprovalPackageCommandErrorCode,
  message: string,
  packageValue?: AuctionApprovalPackage,
  submissionRecord?: ApprovalPackageSubmissionRecord,
): ApprovalPackageCommandResult => ({
  ok: false,
  code,
  message,
  ...(packageValue ? { package: packageValue } : {}),
  ...(submissionRecord ? { submissionRecord } : {}),
});

const statusForInvalidEvidence = (
  validation: ApprovalPackageValidationResult,
): AuctionApprovalPackageStatus =>
  validation.findings.some((finding) =>
    [
      "CONFIGURATION_SNAPSHOT_MISSING",
      "CONFIGURATION_SNAPSHOT_LEGACY_ONLY",
      "LATER_PHASE_STATE_EXISTS",
    ].includes(finding.code),
  )
    ? "BLOCKED"
    : "STALE";

const markPackageInvalid = (
  packageValue: AuctionApprovalPackage,
  validation: ApprovalPackageValidationResult,
  actorId: string,
  commandId: string,
) => {
  const status = statusForInvalidEvidence(validation);
  if (
    packageValue.status === status &&
    validationEquals(packageValue.preparationValidation, validation)
  )
    return packageValue;
  const nextVersion = packageValue.packageVersion + 1;
  const occurredAt = deterministicTime(nextVersion);
  const action =
    status === "BLOCKED"
      ? "APPROVAL_PACKAGE_BLOCKED"
      : "APPROVAL_PACKAGE_MARKED_STALE";
  const history = makeHistory({
    packageValue,
    packageVersion: nextVersion,
    actorId,
    commandId,
    action,
    previousStatus: packageValue.status,
    resultingStatus: status,
    validation,
    reason: "Authoritative evidence changed before package submission.",
    occurredAt,
    index: packageValue.history.length + 1,
  });
  return freezePackage({
    ...packageValue,
    packageVersion: nextVersion,
    status,
    preparationValidation: validation,
    updatedBy: actorId,
    updatedAt: occurredAt,
    history: [...packageValue.history, history],
  });
};

const packageStatuses: readonly AuctionApprovalPackageStatus[] = [
  "DRAFT",
  "READY_TO_SUBMIT",
  "SUBMITTED",
  "STALE",
  "BLOCKED",
];
const historyActions: readonly ApprovalPackageHistoryAction[] = [
  "APPROVAL_PACKAGE_DRAFT_CREATED",
  "APPROVAL_PACKAGE_EVIDENCE_SNAPSHOTTED",
  "APPROVAL_PACKAGE_READY_TO_SUBMIT",
  "APPROVAL_PACKAGE_DRAFT_REFRESHED",
  "APPROVAL_PACKAGE_MARKED_STALE",
  "APPROVAL_PACKAGE_BLOCKED",
  "APPROVAL_PACKAGE_SUBMISSION_STARTED",
  "APPROVAL_PACKAGE_SUBMITTED",
  "APPROVAL_PACKAGE_SUBMISSION_RECORDED",
  "APPROVAL_PACKAGE_EVIDENCE_STALE_AFTER_SUBMISSION",
  "APPROVAL_PACKAGE_PERSISTENCE_REJECTED",
];
const findingOwners: readonly ApprovalPackageFindingOwner[] = [
  "CONTENT_STAFF",
  "CUSTOMER_SOURCE",
  "MEMBERSHIP",
  "CONFIGURATION_GOVERNANCE",
  "CONTENT_REVIEW",
  "AUCTION_SYSTEM",
  "BUSINESS_DECISION",
];
const findingSections: readonly ApprovalPackageFindingSection[] = [
  "SESSION",
  "OPENING_REQUEST",
  "AUCTION_CONTENT",
  "CONFIGURATION",
  "MEMBERSHIP",
  "CONTENT_REVIEW",
  "PACKAGE",
  "LATER_PHASE_BOUNDARY",
];

const validListingFee = (
  value: unknown,
): value is Exclude<
  ListingFee,
  { kind: "EVENT_SPECIFIC_POLICY" | "UNDEFINED" }
> => {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "AMOUNT")
    return (
      exactKeys(value, ["kind", "amountVnd", "unit"]) &&
      typeof value.amountVnd === "number" &&
      Number.isFinite(value.amountVnd) &&
      value.amountVnd >= 0 &&
      value.unit === "PER_PRODUCT"
    );
  return (
    value.kind === "MP" &&
    exactKeys(value, ["kind", "sourceLabel"]) &&
    (value.sourceLabel === "MP" || value.sourceLabel === "MP/1SP")
  );
};

const validFinding = (value: unknown): value is ApprovalPackageFinding =>
  isRecord(value) &&
  exactKeys(
    value,
    [
      "code",
      "message",
      "owner",
      "section",
      "severity",
      "correctableInPackageWorkspace",
    ],
    ["referenceId", "referenceVersion"],
  ) &&
  typeof value.code === "string" &&
  typeof value.message === "string" &&
  findingOwners.includes(value.owner as ApprovalPackageFindingOwner) &&
  findingSections.includes(value.section as ApprovalPackageFindingSection) &&
  value.severity === "ERROR" &&
  value.correctableInPackageWorkspace === false &&
  (value.referenceId === undefined ||
    typeof value.referenceId === "string") &&
  (value.referenceVersion === undefined ||
    typeof value.referenceVersion === "string" ||
    typeof value.referenceVersion === "number");

const validEvidence = (value: unknown): value is ApprovalPackageEvidence => {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "packageEvidenceVersion",
      "prototypeClassification",
      "session",
      "openingRequest",
      "auctionContent",
      "configuration",
      "contentReview",
    ]) ||
    value.packageEvidenceVersion !== 1 ||
    value.prototypeClassification !== PROTOTYPE_CONTENT_POLICY.classification ||
    !isRecord(value.session) ||
    !isRecord(value.openingRequest) ||
    !isRecord(value.auctionContent) ||
    !isRecord(value.configuration) ||
    !isRecord(value.contentReview)
  )
    return false;
  const session = value.session;
  const request = value.openingRequest;
  const content = value.auctionContent;
  const configuration = value.configuration;
  const review = value.contentReview;
  return (
    exactKeys(session, [
      "sessionId",
      "sessionCode",
      "sessionVersion",
      "creationSource",
      "managementMode",
      "lifecycleStatus",
      "publicationStatus",
      "assetId",
      "assetName",
    ]) &&
    typeof session.sessionId === "string" &&
    typeof session.sessionCode === "string" &&
    positiveInteger(session.sessionVersion) &&
    session.creationSource === "OPENING_REQUEST" &&
    session.managementMode === "CUSTOMER_REQUESTED" &&
    session.lifecycleStatus === "DRAFT" &&
    session.publicationStatus === "NOT_READY" &&
    typeof session.assetId === "string" &&
    typeof session.assetName === "string" &&
    exactKeys(request, [
      "openingRequestId",
      "openingRequestVersion",
      "customerId",
      "acceptedState",
      "originalTitle",
      "originalPurpose",
    ]) &&
    typeof request.openingRequestId === "string" &&
    positiveInteger(request.openingRequestVersion) &&
    typeof request.customerId === "string" &&
    request.acceptedState === "ACCEPTED_FOR_DRAFT" &&
    typeof request.originalTitle === "string" &&
    typeof request.originalPurpose === "string" &&
    exactKeys(content, [
      "contentId",
      "contentVersion",
      "auctionTitle",
      "auctionSummary",
      "completenessStatus",
      "sourceOpeningRequestId",
      "sourceOpeningRequestVersion",
    ]) &&
    typeof content.contentId === "string" &&
    positiveInteger(content.contentVersion) &&
    typeof content.auctionTitle === "string" &&
    content.auctionTitle.trim().length > 0 &&
    typeof content.auctionSummary === "string" &&
    content.auctionSummary.trim().length > 0 &&
    content.completenessStatus === "COMPLETE" &&
    typeof content.sourceOpeningRequestId === "string" &&
    positiveInteger(content.sourceOpeningRequestVersion) &&
    content.sourceOpeningRequestId === request.openingRequestId &&
    content.sourceOpeningRequestVersion ===
      request.openingRequestVersion &&
    exactKeys(configuration, [
      "configurationId",
      "proposalVersion",
      "snapshotId",
      "snapshotVersion",
      "confirmedBy",
      "confirmedAt",
      "startingPrice",
      "priceBand",
      "ordinaryRoom",
      "membershipReferenceId",
      "membershipReferenceVersion",
      "memberTitle",
      "memberListingFee",
      "policyId",
      "policyVersion",
      "policyDisclaimer",
    ]) &&
    typeof configuration.configurationId === "string" &&
    positiveInteger(configuration.proposalVersion) &&
    typeof configuration.snapshotId === "string" &&
    configuration.snapshotVersion === 1 &&
    typeof configuration.confirmedBy === "string" &&
    validIsoTime(configuration.confirmedAt) &&
    typeof configuration.startingPrice === "number" &&
    Number.isFinite(configuration.startingPrice) &&
    configuration.startingPrice >= 0 &&
    [
      "PRICE-BAND-ROOM-1",
      "PRICE-BAND-ROOM-2",
      "PRICE-BAND-ROOM-3",
    ].includes(String(configuration.priceBand)) &&
    ["ROOM-1", "ROOM-2", "ROOM-3"].includes(
      String(configuration.ordinaryRoom),
    ) &&
    typeof configuration.membershipReferenceId === "string" &&
    (typeof configuration.membershipReferenceVersion === "string" ||
      typeof configuration.membershipReferenceVersion === "number") &&
    [
      "REGISTER_MEMBER",
      "DONG",
      "BAC",
      "VANG",
      "KIM_CUONG",
      "VIP",
    ].includes(String(configuration.memberTitle)) &&
    validListingFee(configuration.memberListingFee) &&
    configuration.policyId === "SGDG-ROOM-FEE-2017-PROTOTYPE" &&
    configuration.policyVersion === 2 &&
    typeof configuration.policyDisclaimer === "string" &&
    exactKeys(review, [
      "reviewId",
      "reviewVersion",
      "completionRecordId",
      "completionRecordVersion",
      "completedBy",
      "completedAt",
      "readiness",
      "findingCodes",
    ]) &&
    typeof review.reviewId === "string" &&
    positiveInteger(review.reviewVersion) &&
    typeof review.completionRecordId === "string" &&
    review.completionRecordVersion === 1 &&
    typeof review.completedBy === "string" &&
    validIsoTime(review.completedAt) &&
    review.readiness === "READY_FOR_APPROVAL_PACKAGE_PREPARATION" &&
    Array.isArray(review.findingCodes) &&
    review.findingCodes.every((code) => typeof code === "string")
  );
};

const validValidation = (
  value: unknown,
): value is ApprovalPackageValidationResult =>
  isRecord(value) &&
  exactKeys(value, [
    "readyToSubmit",
    "evaluatedSessionVersion",
    "evaluatedOpeningRequestVersion",
    "evaluatedContentVersion",
    "evaluatedConfigurationSnapshotId",
    "evaluatedConfigurationProposalVersion",
    "evaluatedReviewVersion",
    "evaluatedCompletionRecordId",
    "evaluatedAt",
    "findings",
  ]) &&
  typeof value.readyToSubmit === "boolean" &&
  positiveInteger(value.evaluatedSessionVersion) &&
  positiveInteger(value.evaluatedOpeningRequestVersion) &&
  positiveInteger(value.evaluatedContentVersion) &&
  typeof value.evaluatedConfigurationSnapshotId === "string" &&
  positiveInteger(value.evaluatedConfigurationProposalVersion) &&
  positiveInteger(value.evaluatedReviewVersion) &&
  typeof value.evaluatedCompletionRecordId === "string" &&
  validIsoTime(value.evaluatedAt) &&
  Array.isArray(value.findings) &&
  value.findings.every(validFinding) &&
  value.readyToSubmit === (value.findings.length === 0);

const validHistory = (
  value: unknown,
  packageId: string,
  sessionId: string,
  maximumVersion: number,
): value is ApprovalPackageHistoryEntry =>
  isRecord(value) &&
  exactKeys(
    value,
    [
      "historyId",
      "packageId",
      "packageVersion",
      "sessionId",
      "sessionVersion",
      "contentId",
      "contentVersion",
      "configurationSnapshotId",
      "reviewId",
      "reviewVersion",
      "completionRecordId",
      "actorId",
      "actorRole",
      "commandId",
      "action",
      "resultingStatus",
      "findingCodes",
      "reason",
      "occurredAt",
      "visibility",
    ],
    ["previousStatus"],
  ) &&
  typeof value.historyId === "string" &&
  value.packageId === packageId &&
  positiveInteger(value.packageVersion) &&
  value.packageVersion <= maximumVersion &&
  value.sessionId === sessionId &&
  positiveInteger(value.sessionVersion) &&
  typeof value.contentId === "string" &&
  positiveInteger(value.contentVersion) &&
  typeof value.configurationSnapshotId === "string" &&
  typeof value.reviewId === "string" &&
  positiveInteger(value.reviewVersion) &&
  typeof value.completionRecordId === "string" &&
  typeof value.actorId === "string" &&
  value.actorRole === "CONTENT_STAFF" &&
  typeof value.commandId === "string" &&
  validCommandId(value.commandId) &&
  historyActions.includes(value.action as ApprovalPackageHistoryAction) &&
  packageStatuses.includes(
    value.resultingStatus as AuctionApprovalPackageStatus,
  ) &&
  (value.previousStatus === undefined ||
    packageStatuses.includes(
      value.previousStatus as AuctionApprovalPackageStatus,
    )) &&
  Array.isArray(value.findingCodes) &&
  value.findingCodes.every((code) => typeof code === "string") &&
  typeof value.reason === "string" &&
  validIsoTime(value.occurredAt) &&
  value.visibility === "STAFF_ONLY";

const forbiddenPersistenceKeys = new Set([
  "approvalId",
  "makerUserId",
  "checkerUserId",
  "submittedVersion",
  "readinessPassed",
  "risks",
  "approvalDecision",
  "approvalActor",
  "approvalComment",
  "approvalComments",
  "approvedAt",
  "rejectedAt",
  "returnedAt",
  "returnReason",
  "rejectionReason",
  "scheduleId",
  "scheduleVersion",
  "publicationId",
  "publishedAt",
  "registrationState",
  "registrationStatus",
  "eligibilityState",
  "eligibilityStatus",
]);
const containsForbiddenPersistenceKey = (value: unknown): boolean => {
  if (Array.isArray(value))
    return value.some(containsForbiddenPersistenceKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      forbiddenPersistenceKeys.has(key) ||
      containsForbiddenPersistenceKey(nested),
  );
};

const sanitizePackage = (
  value: unknown,
): AuctionApprovalPackage | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenPersistenceKey(value) ||
    !exactKeys(
      value,
      [
        "packageId",
        "packageVersion",
        "sessionId",
        "sessionVersionAtPreparation",
        "status",
        "evidence",
        "preparationValidation",
        "createdBy",
        "createdAt",
        "updatedBy",
        "updatedAt",
        "history",
      ],
      ["submittedBy", "submittedAt", "submissionRecordId"],
    ) ||
    typeof value.packageId !== "string" ||
    typeof value.sessionId !== "string" ||
    value.packageId !== packageIdFor(value.sessionId) ||
    positiveInteger(value.packageVersion) === false ||
    positiveInteger(value.sessionVersionAtPreparation) === false ||
    !packageStatuses.includes(value.status as AuctionApprovalPackageStatus) ||
    !validEvidence(value.evidence) ||
    !validValidation(value.preparationValidation) ||
    typeof value.createdBy !== "string" ||
    !validIsoTime(value.createdAt) ||
    typeof value.updatedBy !== "string" ||
    !validIsoTime(value.updatedAt) ||
    !Array.isArray(value.history)
  )
    return undefined;
  const submittedFieldsValid =
    value.status === "SUBMITTED"
      ? typeof value.submittedBy === "string" &&
        validIsoTime(value.submittedAt) &&
        typeof value.submissionRecordId === "string"
      : value.submittedBy === undefined &&
        value.submittedAt === undefined &&
        value.submissionRecordId === undefined;
  if (!submittedFieldsValid) return undefined;
  const history = value.history.filter((entry) =>
    validHistory(
      entry,
      value.packageId as string,
      value.sessionId as string,
      value.packageVersion as number,
    ),
  );
  if (
    history.length !== value.history.length ||
    history[0]?.action !== "APPROVAL_PACKAGE_DRAFT_CREATED" ||
    history[1]?.action !== "APPROVAL_PACKAGE_EVIDENCE_SNAPSHOTTED" ||
    history[2]?.action !== "APPROVAL_PACKAGE_READY_TO_SUBMIT"
  )
    return undefined;
  const evidence = value.evidence;
  const validation = value.preparationValidation;
  if (
    evidence.session.sessionId !== value.sessionId ||
    evidence.session.sessionVersion !== value.sessionVersionAtPreparation ||
    validation.evaluatedCompletionRecordId !==
      evidence.contentReview.completionRecordId ||
    (value.status === "READY_TO_SUBMIT" && !validation.readyToSubmit) ||
    (["STALE", "BLOCKED"].includes(value.status as string) &&
      validation.readyToSubmit) ||
    (value.status === "SUBMITTED" &&
      !history.some(
        (entry) => entry.action === "APPROVAL_PACKAGE_SUBMITTED",
      ))
  )
    return undefined;
  return freezePackage({
    packageId: value.packageId,
    packageVersion: value.packageVersion,
    sessionId: value.sessionId,
    sessionVersionAtPreparation: value.sessionVersionAtPreparation,
    status: value.status as AuctionApprovalPackageStatus,
    evidence,
    preparationValidation: validation,
    createdBy: value.createdBy,
    createdAt: value.createdAt,
    updatedBy: value.updatedBy,
    updatedAt: value.updatedAt,
    ...(typeof value.submittedBy === "string"
      ? { submittedBy: value.submittedBy }
      : {}),
    ...(typeof value.submittedAt === "string"
      ? { submittedAt: value.submittedAt }
      : {}),
    ...(typeof value.submissionRecordId === "string"
      ? { submissionRecordId: value.submissionRecordId }
      : {}),
    history,
  });
};

const sanitizeSubmissionRecord = (
  value: unknown,
): ApprovalPackageSubmissionRecord | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenPersistenceKey(value) ||
    !exactKeys(value, [
      "submissionRecordId",
      "recordVersion",
      "packageId",
      "submittedPackageVersion",
      "sessionId",
      "sessionVersion",
      "contentId",
      "contentVersion",
      "configurationSnapshotId",
      "configurationProposalVersion",
      "reviewId",
      "reviewVersion",
      "completionRecordId",
      "submittedBy",
      "submittedAt",
      "queueState",
    ]) ||
    typeof value.submissionRecordId !== "string" ||
    typeof value.packageId !== "string" ||
    value.submissionRecordId !== submissionRecordIdFor(value.packageId) ||
    value.recordVersion !== 1 ||
    positiveInteger(value.submittedPackageVersion) === false ||
    typeof value.sessionId !== "string" ||
    positiveInteger(value.sessionVersion) === false ||
    typeof value.contentId !== "string" ||
    positiveInteger(value.contentVersion) === false ||
    typeof value.configurationSnapshotId !== "string" ||
    positiveInteger(value.configurationProposalVersion) === false ||
    typeof value.reviewId !== "string" ||
    positiveInteger(value.reviewVersion) === false ||
    typeof value.completionRecordId !== "string" ||
    typeof value.submittedBy !== "string" ||
    !validIsoTime(value.submittedAt) ||
    value.queueState !== "AWAITING_ADMIN_REVIEW"
  )
    return undefined;
  return freezeSubmissionRecord({
    submissionRecordId: value.submissionRecordId,
    recordVersion: 1,
    packageId: value.packageId,
    submittedPackageVersion: value.submittedPackageVersion,
    sessionId: value.sessionId,
    sessionVersion: value.sessionVersion,
    contentId: value.contentId,
    contentVersion: value.contentVersion,
    configurationSnapshotId: value.configurationSnapshotId,
    configurationProposalVersion:
      value.configurationProposalVersion,
    reviewId: value.reviewId,
    reviewVersion: value.reviewVersion,
    completionRecordId: value.completionRecordId,
    submittedBy: value.submittedBy,
    submittedAt: value.submittedAt,
    queueState: "AWAITING_ADMIN_REVIEW",
  });
};

const packageInternallyMatchesReviewEvidence = (
  packageValue: AuctionApprovalPackage,
) => {
  const sources = collectAuthoritativeApprovalPackageSources(
    packageValue.sessionId,
  );
  const { session, review, completionRecord } = sources;
  const evidence = packageValue.evidence;
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    !review ||
    review.status !== "COMPLETED" ||
    !completionRecord
  )
    return false;
  return (
    evidence.session.sessionId === session.sessionId &&
    evidence.openingRequest.openingRequestId ===
      completionRecord.openingRequestId &&
    evidence.openingRequest.openingRequestVersion ===
      completionRecord.openingRequestVersion &&
    evidence.auctionContent.contentId === completionRecord.contentId &&
    evidence.auctionContent.contentVersion ===
      completionRecord.contentVersion &&
    evidence.auctionContent.auctionTitle ===
      completionRecord.reviewedContentSnapshot.auctionTitle &&
    evidence.auctionContent.auctionSummary ===
      completionRecord.reviewedContentSnapshot.auctionSummary &&
    evidence.configuration.snapshotId ===
      completionRecord.configurationSnapshotId &&
    evidence.configuration.proposalVersion ===
      completionRecord.configurationProposalVersion &&
    evidence.contentReview.reviewId === review.reviewId &&
    evidence.contentReview.reviewVersion === review.reviewVersion &&
    evidence.contentReview.completionRecordId ===
      completionRecord.completionRecordId
  );
};

export const sanitizePersistedAuctionApprovalPackageState = (
  persisted: unknown,
): Pick<
  AuctionApprovalPackageState,
  "packages" | "submissionRecords"
> => {
  const empty = {
    packages: [] as AuctionApprovalPackage[],
    submissionRecords: [] as ApprovalPackageSubmissionRecord[],
  };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["packages", "submissionRecords"]) ||
    !Array.isArray(persisted.packages) ||
    !Array.isArray(persisted.submissionRecords)
  )
    return empty;
  const packages = persisted.packages.map(sanitizePackage);
  const records = persisted.submissionRecords.map(sanitizeSubmissionRecord);
  if (
    packages.some((item) => !item) ||
    records.some((item) => !item)
  )
    return empty;
  const safePackages = packages.filter(
    (item): item is AuctionApprovalPackage => Boolean(item),
  );
  const safeRecords = records.filter(
    (item): item is ApprovalPackageSubmissionRecord => Boolean(item),
  );
  const packageIds = new Set(safePackages.map((item) => item.packageId));
  const sessionIds = new Set(safePackages.map((item) => item.sessionId));
  const recordIds = new Set(
    safeRecords.map((item) => item.submissionRecordId),
  );
  const commandOwners = new Map<string, string>();
  for (const packageValue of safePackages)
    for (const history of packageValue.history) {
      const owner = commandOwners.get(history.commandId);
      if (owner && owner !== packageValue.packageId) return empty;
      commandOwners.set(history.commandId, packageValue.packageId);
    }
  if (
    packageIds.size !== safePackages.length ||
    sessionIds.size !== safePackages.length ||
    recordIds.size !== safeRecords.length ||
    safePackages.some(
      (packageValue) =>
        !packageInternallyMatchesReviewEvidence(packageValue),
    )
  )
    return empty;
  for (const packageValue of safePackages) {
    const recordsForPackage = safeRecords.filter(
      (record) => record.packageId === packageValue.packageId,
    );
    if (packageValue.status === "SUBMITTED") {
      const record = recordsForPackage[0];
      if (
        recordsForPackage.length !== 1 ||
        !record ||
        packageValue.submissionRecordId !== record.submissionRecordId ||
        record.submittedPackageVersion !== packageValue.packageVersion ||
        record.sessionId !== packageValue.sessionId ||
        record.sessionVersion !==
          packageValue.evidence.session.sessionVersion ||
        record.contentId !==
          packageValue.evidence.auctionContent.contentId ||
        record.contentVersion !==
          packageValue.evidence.auctionContent.contentVersion ||
        record.configurationSnapshotId !==
          packageValue.evidence.configuration.snapshotId ||
        record.configurationProposalVersion !==
          packageValue.evidence.configuration.proposalVersion ||
        record.reviewId !== packageValue.evidence.contentReview.reviewId ||
        record.reviewVersion !==
          packageValue.evidence.contentReview.reviewVersion ||
        record.completionRecordId !==
          packageValue.evidence.contentReview.completionRecordId
      )
        return empty;
    } else if (recordsForPackage.length > 0) return empty;
  }
  if (
    safeRecords.some(
      (record) =>
        !safePackages.some(
          (packageValue) =>
            packageValue.packageId === record.packageId &&
            packageValue.status === "SUBMITTED",
        ),
    )
  )
    return empty;
  return { packages: safePackages, submissionRecords: safeRecords };
};

export const getApprovalPackageEvidenceValidity = (
  packageValue: AuctionApprovalPackage,
): ApprovalPackageEvidenceValidity => {
  if (packageValue.status !== "SUBMITTED") return "INVALID";
  const sources = collectAuthoritativeApprovalPackageSources(
    packageValue.sessionId,
  );
  const validation = evaluateApprovalPackageValidation({
    evidence: packageValue.evidence,
    sources,
    evaluatedAt: packageValue.submittedAt ?? packageValue.updatedAt,
  });
  return validation.readyToSubmit
    ? "CURRENT"
    : "STALE_AFTER_SUBMISSION";
};

export const getAdminApprovalPackageQueue =
  (): readonly AdminApprovalPackageQueueItem[] => {
    const state = useAuctionApprovalPackageStore.getState();
    return state.packages
      .filter((packageValue) => packageValue.status === "SUBMITTED")
      .flatMap((packageValue) => {
        const record = state.submissionRecords.find(
          (item) => item.packageId === packageValue.packageId,
        );
        if (!record) return [];
        return [
          Object.freeze({
            packageId: packageValue.packageId,
            sessionId: packageValue.sessionId,
            sessionCode: packageValue.evidence.session.sessionCode,
            creationSource: "OPENING_REQUEST" as const,
            managementMode: "CUSTOMER_REQUESTED" as const,
            submittedPackageVersion: record.submittedPackageVersion,
            contentVersion: record.contentVersion,
            configurationSnapshotId: record.configurationSnapshotId,
            completionRecordId: record.completionRecordId,
            submittedBy: record.submittedBy,
            submittedAt: record.submittedAt,
            queueState: "AWAITING_ADMIN_REVIEW" as const,
            evidenceValidity:
              getApprovalPackageEvidenceValidity(packageValue),
          }),
        ];
      })
      .sort(
        (left, right) =>
          right.submittedAt.localeCompare(left.submittedAt) ||
          left.packageId.localeCompare(right.packageId),
      );
  };

export const useAuctionApprovalPackageStore =
  create<AuctionApprovalPackageState>()(
    persist(
      (set, get) => ({
        packages: [],
        submissionRecords: [],
        getPackageBySessionId: (sessionId) =>
          get().packages.find((item) => item.sessionId === sessionId),
        getPackageById: (packageId) =>
          get().packages.find((item) => item.packageId === packageId),
        getSubmissionRecordByPackageId: (packageId) =>
          get().submissionRecords.find(
            (item) => item.packageId === packageId,
          ),
        createApprovalPackageDraft: (command) => {
          if (command.actorRole !== "CONTENT_STAFF")
            return commandFailure(
              "ACCESS_DENIED",
              "Chỉ CONTENT_STAFF được chuẩn bị Approval Package.",
            );
          if (!validCommandId(command.commandId))
            return commandFailure(
              "INVALID_COMMAND",
              "Command ID bắt buộc và phải hợp lệ.",
            );
          const commandPackage = get().packages.find((item) =>
            item.history.some(
              (history) =>
                history.commandId === command.commandId &&
                history.action === "APPROVAL_PACKAGE_DRAFT_CREATED",
            ),
          );
          if (commandPackage)
            return {
              ok: true,
              package: commandPackage,
              created: false,
              changed: false,
            };
          const existing = get().packages.find(
            (item) => item.sessionId === command.sessionId,
          );
          if (existing)
            return commandFailure(
              "APPROVAL_PACKAGE_ALREADY_EXISTS",
              "Session đã có Approval Package.",
              existing,
            );
          let sources = collectAuthoritativeApprovalPackageSources(
            command.sessionId,
          );
          let eligibility = evaluateApprovalPackageEligibility({
            sources,
            actorRole: command.actorRole,
            commandId: command.commandId,
            expectedSessionVersion: command.expectedSessionVersion,
            expectedContentVersion: command.expectedContentVersion,
            expectedConfigurationSnapshotId:
              command.expectedConfigurationSnapshotId,
            expectedReviewVersion: command.expectedReviewVersion,
            expectedCompletionRecordId:
              command.expectedCompletionRecordId,
            approvalPackageExists: false,
          });
          if (!eligibility.eligible)
            return commandFailure(eligibility.code, eligibility.message);
          sources = collectAuthoritativeApprovalPackageSources(
            command.sessionId,
          );
          eligibility = evaluateApprovalPackageEligibility({
            sources,
            actorRole: command.actorRole,
            commandId: command.commandId,
            expectedSessionVersion: command.expectedSessionVersion,
            expectedContentVersion: command.expectedContentVersion,
            expectedConfigurationSnapshotId:
              command.expectedConfigurationSnapshotId,
            expectedReviewVersion: command.expectedReviewVersion,
            expectedCompletionRecordId:
              command.expectedCompletionRecordId,
            approvalPackageExists: get().packages.some(
              (item) => item.sessionId === command.sessionId,
            ),
          });
          if (!eligibility.eligible)
            return commandFailure(eligibility.code, eligibility.message);
          const evidence = buildEvidence(eligibility.sources);
          const time = deterministicTime(1);
          const validation = evaluateApprovalPackageValidation({
            evidence,
            sources: eligibility.sources,
            evaluatedAt: time,
          });
          if (!validation.readyToSubmit)
            return commandFailure(
              "PACKAGE_READINESS_INVALID",
              "Package evidence còn blocking finding.",
            );
          const packageBase = {
            packageId: packageIdFor(command.sessionId),
            packageVersion: 1,
            sessionId: command.sessionId,
            sessionVersionAtPreparation:
              eligibility.sources.session.currentVersion,
            status: "READY_TO_SUBMIT" as const,
            evidence,
            preparationValidation: validation,
            createdBy: command.actorId,
            createdAt: time,
            updatedBy: command.actorId,
            updatedAt: time,
          };
          const first = makeHistory({
            packageValue: packageBase,
            packageVersion: 1,
            actorId: command.actorId,
            commandId: command.commandId,
            action: "APPROVAL_PACKAGE_DRAFT_CREATED",
            resultingStatus: "DRAFT",
            validation,
            reason: "Created one dynamic Approval Package Draft.",
            occurredAt: time,
            index: 1,
          });
          const second = makeHistory({
            packageValue: packageBase,
            packageVersion: 1,
            actorId: command.actorId,
            commandId: command.commandId,
            action: "APPROVAL_PACKAGE_EVIDENCE_SNAPSHOTTED",
            previousStatus: "DRAFT",
            resultingStatus: "DRAFT",
            validation,
            reason: "Snapshotted exact authoritative preparation evidence.",
            occurredAt: time,
            index: 2,
          });
          const third = makeHistory({
            packageValue: packageBase,
            packageVersion: 1,
            actorId: command.actorId,
            commandId: command.commandId,
            action: "APPROVAL_PACKAGE_READY_TO_SUBMIT",
            previousStatus: "DRAFT",
            resultingStatus: "READY_TO_SUBMIT",
            validation,
            reason: "Package is ready for submission to ADMIN review only.",
            occurredAt: time,
            index: 3,
          });
          const created = freezePackage({
            ...packageBase,
            history: [first, second, third],
          });
          set((state) => ({
            packages: [...state.packages, created],
          }));
          return {
            ok: true,
            package: created,
            created: true,
            changed: true,
          };
        },
        refreshApprovalPackageDraft: (command) => {
          if (command.actorRole !== "CONTENT_STAFF")
            return commandFailure(
              "ACCESS_DENIED",
              "Chỉ CONTENT_STAFF được làm mới Approval Package.",
            );
          if (!validCommandId(command.commandId))
            return commandFailure(
              "INVALID_COMMAND",
              "Command ID bắt buộc và phải hợp lệ.",
            );
          const packageValue = get().packages.find(
            (item) => item.packageId === command.packageId,
          );
          if (!packageValue)
            return commandFailure(
              "APPROVAL_PACKAGE_NOT_FOUND",
              "Không tìm thấy Approval Package.",
            );
          if (packageValue.status === "SUBMITTED")
            return commandFailure(
              "APPROVAL_PACKAGE_ALREADY_SUBMITTED",
              "Submitted Package không thể refresh.",
              packageValue,
              get().submissionRecords.find(
                (item) => item.packageId === packageValue.packageId,
              ),
            );
          if (packageValue.packageVersion !== command.expectedPackageVersion)
            return commandFailure(
              "STALE_PACKAGE_VERSION",
              "Package version đã thay đổi.",
              packageValue,
            );
          if (
            packageValue.history.some(
              (history) =>
                history.commandId === command.commandId &&
                history.action === "APPROVAL_PACKAGE_DRAFT_REFRESHED",
            )
          )
            return {
              ok: true,
              package: packageValue,
              created: false,
              changed: false,
            };
          let sources = collectAuthoritativeApprovalPackageSources(
            packageValue.sessionId,
          );
          let eligibility = evaluateApprovalPackageEligibility({
            sources,
            actorRole: command.actorRole,
            commandId: command.commandId,
            expectedSessionVersion: command.expectedSessionVersion,
            expectedContentVersion: command.expectedContentVersion,
            expectedConfigurationSnapshotId:
              command.expectedConfigurationSnapshotId,
            expectedReviewVersion: command.expectedReviewVersion,
            expectedCompletionRecordId:
              command.expectedCompletionRecordId,
            approvalPackageExists: false,
          });
          const evaluatedAt = deterministicTime(
            packageValue.packageVersion + 1,
          );
          if (!eligibility.eligible) {
            const validation = evaluateApprovalPackageValidation({
              evidence: packageValue.evidence,
              sources,
              evaluatedAt,
            });
            const invalid = markPackageInvalid(
              packageValue,
              validation,
              command.actorId,
              command.commandId,
            );
            if (invalid !== packageValue)
              set((state) => ({
                packages: state.packages.map((item) =>
                  item.packageId === invalid.packageId ? invalid : item,
                ),
              }));
            return {
              ok: true,
              package: invalid,
              created: false,
              changed: invalid !== packageValue,
            };
          }
          sources = collectAuthoritativeApprovalPackageSources(
            packageValue.sessionId,
          );
          eligibility = evaluateApprovalPackageEligibility({
            sources,
            actorRole: command.actorRole,
            commandId: command.commandId,
            expectedSessionVersion: command.expectedSessionVersion,
            expectedContentVersion: command.expectedContentVersion,
            expectedConfigurationSnapshotId:
              command.expectedConfigurationSnapshotId,
            expectedReviewVersion: command.expectedReviewVersion,
            expectedCompletionRecordId:
              command.expectedCompletionRecordId,
            approvalPackageExists: false,
          });
          if (!eligibility.eligible)
            return commandFailure(
              "PERSISTENCE_ERROR",
              "Authoritative evidence changed before refresh commit.",
              packageValue,
            );
          const evidence = buildEvidence(eligibility.sources);
          const validation = evaluateApprovalPackageValidation({
            evidence,
            sources: eligibility.sources,
            evaluatedAt,
          });
          const noChange =
            packageValue.status === "READY_TO_SUBMIT" &&
            evidenceEquals(packageValue.evidence, evidence) &&
            validationEquals(packageValue.preparationValidation, validation);
          if (noChange)
            return {
              ok: true,
              package: packageValue,
              created: false,
              changed: false,
            };
          const nextVersion = packageValue.packageVersion + 1;
          const updatedBase = {
            ...packageValue,
            packageVersion: nextVersion,
            sessionVersionAtPreparation:
              eligibility.sources.session.currentVersion,
            status: "READY_TO_SUBMIT" as const,
            evidence,
            preparationValidation: validation,
            updatedBy: command.actorId,
            updatedAt: evaluatedAt,
          };
          const history = makeHistory({
            packageValue: updatedBase,
            packageVersion: nextVersion,
            actorId: command.actorId,
            commandId: command.commandId,
            action: "APPROVAL_PACKAGE_DRAFT_REFRESHED",
            previousStatus: packageValue.status,
            resultingStatus: "READY_TO_SUBMIT",
            validation,
            reason: "Rebuilt Package from current valid authoritative evidence.",
            occurredAt: evaluatedAt,
            index: packageValue.history.length + 1,
          });
          const updated = freezePackage({
            ...updatedBase,
            history: [...packageValue.history, history],
          });
          set((state) => ({
            packages: state.packages.map((item) =>
              item.packageId === updated.packageId ? updated : item,
            ),
          }));
          return {
            ok: true,
            package: updated,
            created: false,
            changed: true,
          };
        },
        submitApprovalPackage: (command) => {
          if (command.actorRole !== "CONTENT_STAFF")
            return commandFailure(
              "ACCESS_DENIED",
              "Chỉ CONTENT_STAFF được gửi Approval Package.",
            );
          if (!validCommandId(command.commandId))
            return commandFailure(
              "INVALID_COMMAND",
              "Command ID bắt buộc và phải hợp lệ.",
            );
          let packageValue = get().packages.find(
            (item) => item.packageId === command.packageId,
          );
          if (!packageValue)
            return commandFailure(
              "APPROVAL_PACKAGE_NOT_FOUND",
              "Không tìm thấy Approval Package.",
            );
          const existingRecord = get().submissionRecords.find(
            (item) => item.packageId === packageValue?.packageId,
          );
          if (packageValue.status === "SUBMITTED") {
            const sameCommand = packageValue.history.some(
              (history) =>
                history.commandId === command.commandId &&
                history.action === "APPROVAL_PACKAGE_SUBMITTED",
            );
            if (sameCommand && existingRecord)
              return {
                ok: true,
                package: packageValue,
                submissionRecord: existingRecord,
                created: false,
                changed: false,
              };
            return commandFailure(
              "APPROVAL_PACKAGE_ALREADY_SUBMITTED",
              "Approval Package đã được gửi.",
              packageValue,
              existingRecord,
            );
          }
          if (packageValue.packageVersion !== command.expectedPackageVersion)
            return commandFailure(
              "STALE_PACKAGE_VERSION",
              "Package version đã thay đổi.",
              packageValue,
            );
          if (packageValue.status !== "READY_TO_SUBMIT")
            return commandFailure(
              "APPROVAL_PACKAGE_NOT_READY",
              "Chỉ READY_TO_SUBMIT Package mới có thể gửi.",
              packageValue,
            );
          let sources = collectAuthoritativeApprovalPackageSources(
            packageValue.sessionId,
          );
          let eligibility = evaluateApprovalPackageEligibility({
            sources,
            actorRole: command.actorRole,
            commandId: command.commandId,
            expectedSessionVersion: command.expectedSessionVersion,
            expectedContentVersion: command.expectedContentVersion,
            expectedConfigurationSnapshotId:
              command.expectedConfigurationSnapshotId,
            expectedReviewVersion: command.expectedReviewVersion,
            expectedCompletionRecordId:
              command.expectedCompletionRecordId,
            approvalPackageExists: false,
          });
          const evaluatedAt = deterministicTime(
            packageValue.packageVersion + 1,
          );
          if (!eligibility.eligible) {
            const validation = evaluateApprovalPackageValidation({
              evidence: packageValue.evidence,
              sources,
              evaluatedAt,
            });
            const invalid = markPackageInvalid(
              packageValue,
              validation,
              command.actorId,
              command.commandId,
            );
            if (invalid !== packageValue)
              set((state) => ({
                packages: state.packages.map((item) =>
                  item.packageId === invalid.packageId ? invalid : item,
                ),
              }));
            return commandFailure(
              eligibility.code,
              eligibility.message,
              invalid,
            );
          }
          const currentEvidence = buildEvidence(eligibility.sources);
          const validation = evaluateApprovalPackageValidation({
            evidence: packageValue.evidence,
            sources: eligibility.sources,
            evaluatedAt,
          });
          if (
            !validation.readyToSubmit ||
            !evidenceEquals(packageValue.evidence, currentEvidence)
          ) {
            const invalid = markPackageInvalid(
              packageValue,
              validation.readyToSubmit
                ? freezeValidation({
                    ...validation,
                    readyToSubmit: false,
                    findings: [
                      ...validation.findings,
                      freezeFinding({
                        code: "PACKAGE_EVIDENCE_STALE",
                        message:
                          "Prepared Package evidence không khớp authoritative evidence.",
                        owner: "AUCTION_SYSTEM",
                        section: "PACKAGE",
                        severity: "ERROR",
                        correctableInPackageWorkspace: false,
                      }),
                    ],
                  })
                : validation,
              command.actorId,
              command.commandId,
            );
            set((state) => ({
              packages: state.packages.map((item) =>
                item.packageId === invalid.packageId ? invalid : item,
              ),
            }));
            return commandFailure(
              "APPROVAL_PACKAGE_NOT_READY",
              "Package evidence đã stale; cần explicit refresh.",
              invalid,
            );
          }
          sources = collectAuthoritativeApprovalPackageSources(
            packageValue.sessionId,
          );
          eligibility = evaluateApprovalPackageEligibility({
            sources,
            actorRole: command.actorRole,
            commandId: command.commandId,
            expectedSessionVersion: command.expectedSessionVersion,
            expectedContentVersion: command.expectedContentVersion,
            expectedConfigurationSnapshotId:
              command.expectedConfigurationSnapshotId,
            expectedReviewVersion: command.expectedReviewVersion,
            expectedCompletionRecordId:
              command.expectedCompletionRecordId,
            approvalPackageExists: false,
          });
          const currentPackage = get().packages.find(
            (item) => item.packageId === command.packageId,
          );
          if (
            !eligibility.eligible ||
            !currentPackage ||
            currentPackage.packageVersion !== command.expectedPackageVersion ||
            currentPackage.status !== "READY_TO_SUBMIT" ||
            get().submissionRecords.some(
              (item) => item.packageId === currentPackage?.packageId,
            )
          )
            return commandFailure(
              "PERSISTENCE_ERROR",
              "Authoritative state changed before submission commit.",
              currentPackage ?? packageValue,
            );
          packageValue = currentPackage;
          const nextVersion = packageValue.packageVersion + 1;
          const submittedAt = evaluatedAt;
          const submissionRecord = freezeSubmissionRecord({
            submissionRecordId: submissionRecordIdFor(
              packageValue.packageId,
            ),
            recordVersion: 1,
            packageId: packageValue.packageId,
            submittedPackageVersion: nextVersion,
            sessionId: packageValue.sessionId,
            sessionVersion: packageValue.evidence.session.sessionVersion,
            contentId: packageValue.evidence.auctionContent.contentId,
            contentVersion:
              packageValue.evidence.auctionContent.contentVersion,
            configurationSnapshotId:
              packageValue.evidence.configuration.snapshotId,
            configurationProposalVersion:
              packageValue.evidence.configuration.proposalVersion,
            reviewId: packageValue.evidence.contentReview.reviewId,
            reviewVersion:
              packageValue.evidence.contentReview.reviewVersion,
            completionRecordId:
              packageValue.evidence.contentReview.completionRecordId,
            submittedBy: command.actorId,
            submittedAt,
            queueState: "AWAITING_ADMIN_REVIEW",
          });
          const submittedBase = {
            ...packageValue,
            packageVersion: nextVersion,
            status: "SUBMITTED" as const,
            preparationValidation: validation,
            submittedBy: command.actorId,
            submittedAt,
            submissionRecordId: submissionRecord.submissionRecordId,
            updatedBy: command.actorId,
            updatedAt: submittedAt,
          };
          const startedHistory = makeHistory({
            packageValue: submittedBase,
            packageVersion: nextVersion,
            actorId: command.actorId,
            commandId: command.commandId,
            action: "APPROVAL_PACKAGE_SUBMISSION_STARTED",
            previousStatus: packageValue.status,
            resultingStatus: "READY_TO_SUBMIT",
            validation,
            reason: "Final authoritative submission revalidation started.",
            occurredAt: submittedAt,
            index: packageValue.history.length + 1,
          });
          const submittedHistory = makeHistory({
            packageValue: submittedBase,
            packageVersion: nextVersion,
            actorId: command.actorId,
            commandId: command.commandId,
            action: "APPROVAL_PACKAGE_SUBMITTED",
            previousStatus: "READY_TO_SUBMIT",
            resultingStatus: "SUBMITTED",
            validation,
            reason:
              "Submitted for ADMIN review only; no approval decision occurred.",
            occurredAt: submittedAt,
            index: packageValue.history.length + 2,
          });
          const recordedHistory = makeHistory({
            packageValue: submittedBase,
            packageVersion: nextVersion,
            actorId: command.actorId,
            commandId: command.commandId,
            action: "APPROVAL_PACKAGE_SUBMISSION_RECORDED",
            previousStatus: "READY_TO_SUBMIT",
            resultingStatus: "SUBMITTED",
            validation,
            reason:
              "Created one immutable AWAITING_ADMIN_REVIEW Submission Record.",
            occurredAt: submittedAt,
            index: packageValue.history.length + 3,
          });
          const submitted = freezePackage({
            ...submittedBase,
            history: [
              ...packageValue.history,
              startedHistory,
              submittedHistory,
              recordedHistory,
            ],
          });
          set((state) => ({
            packages: state.packages.map((item) =>
              item.packageId === submitted.packageId ? submitted : item,
            ),
            submissionRecords: [
              ...state.submissionRecords,
              submissionRecord,
            ],
          }));
          return {
            ok: true,
            package: submitted,
            submissionRecord,
            created: true,
            changed: true,
          };
        },
        resetDeterministicApprovalPackageState: () =>
          set({ packages: [], submissionRecords: [] }),
      }),
      {
        name: AUCTION_APPROVAL_PACKAGE_STORAGE_KEY,
        version: AUCTION_APPROVAL_PACKAGE_SCHEMA_VERSION,
        partialize: (state) => ({
          packages: state.packages,
          submissionRecords: state.submissionRecords,
        }),
        migrate: (persisted, version) =>
          version === AUCTION_APPROVAL_PACKAGE_SCHEMA_VERSION
            ? sanitizePersistedAuctionApprovalPackageState(persisted)
            : { packages: [], submissionRecords: [] },
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionApprovalPackageState(persisted),
        }),
      },
    ),
  );
