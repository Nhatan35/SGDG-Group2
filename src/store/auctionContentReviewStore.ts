import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import { getApprovalPackages } from "../services/mock/operationsService";
import { getMembershipAccountReference } from "../services/membershipAccountReference";
import type { MemberTitleReference } from "../services/roomValueTierPolicy";
import {
  type PersistedLinkedAuctionSession,
  type PersistedAuctionSession,
  useAuctionSessionStore,
} from "./auctionSessionStore";
import {
  type CustomerOpeningRequest,
  useOpeningRequestStore,
} from "./openingRequestStore";
import {
  type AuctionContent,
  type AuctionContentSourceLineage,
  evaluateAuctionContentCompleteness,
  PROTOTYPE_CONTENT_POLICY,
  useAuctionContentStore,
} from "./auctionContentStore";
import {
  type AuctionConfigurationProposal,
  type ConfirmedAuctionConfigurationSnapshot,
  useAuctionConfigurationStore,
} from "./auctionConfigurationStore";

export const AUCTION_CONTENT_REVIEW_STORAGE_KEY =
  "sgdg-auction-content-reviews-v1";
export const AUCTION_CONTENT_REVIEW_SCHEMA_VERSION = 1;
export const CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION =
  "CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION";
export const SGDG_CONTENT_REVIEW_BLOCKER_MESSAGE =
  "Phiên SGDG-managed chưa có cấu hình hiện hành được xác nhận.\nQuyết định nghiệp vụ về phí niêm yết vẫn chưa hoàn tất,\nvì vậy chưa thể bắt đầu Content Review.";

export type ContentReviewStatus =
  | "IN_PROGRESS"
  | "CORRECTION_REQUIRED"
  | "READY_TO_COMPLETE"
  | "COMPLETED"
  | "STALE"
  | "BLOCKED";

export type SessionPackageFindingOwner =
  | "CONTENT_STAFF"
  | "CUSTOMER_SOURCE"
  | "PRODUCT_ASSET"
  | "MEMBERSHIP"
  | "CONFIGURATION_GOVERNANCE"
  | "AUCTION_SYSTEM"
  | "BUSINESS_DECISION";

export type SessionPackageFindingSection =
  | "SESSION"
  | "OPENING_REQUEST"
  | "AUCTION_CONTENT"
  | "ASSET_REFERENCE"
  | "CONFIGURATION"
  | "MEMBERSHIP"
  | "VERSION"
  | "LATER_PHASE_BOUNDARY";

export interface SessionPackageFinding {
  readonly code: string;
  readonly message: string;
  readonly owner: SessionPackageFindingOwner;
  readonly section: SessionPackageFindingSection;
  readonly severity: "ERROR" | "WARNING";
  readonly field?: "auctionTitle" | "auctionSummary";
  readonly correctableInContentWorkspace: boolean;
  readonly referenceId?: string;
  readonly referenceVersion?: string | number;
}

export interface SessionPackageReadinessResult {
  readonly ready: boolean;
  readonly evaluatedSessionVersion: number;
  readonly evaluatedContentId: string;
  readonly evaluatedContentVersion: number;
  readonly evaluatedConfigurationSnapshotId: string;
  readonly evaluatedConfigurationProposalVersion: number;
  readonly evaluatedOpeningRequestId: string;
  readonly evaluatedOpeningRequestVersion: number;
  readonly evaluatedMembershipReferenceVersion?: string;
  readonly evaluatedAt: string;
  readonly findings: readonly SessionPackageFinding[];
}

export type AuctionContentReviewHistoryAction =
  | "CONTENT_REVIEW_STARTED"
  | "CONTENT_REVIEW_INITIAL_READINESS_EVALUATED"
  | "CONTENT_REVIEW_CORRECTION_REQUIRED"
  | "CONTENT_REVIEW_BLOCKED"
  | "SESSION_PACKAGE_REVALIDATED"
  | "CONTENT_VERSION_CHANGED_DURING_REVIEW"
  | "CONFIGURATION_CHANGED_DURING_REVIEW"
  | "MEMBERSHIP_CHANGED_DURING_REVIEW"
  | "CONTENT_REVIEW_READY_TO_COMPLETE"
  | "CONTENT_REVIEW_COMPLETED"
  | "CONTENT_REVIEW_COMPLETION_RECORDED"
  | "CONTENT_REVIEW_STALE"
  | "CONTENT_REVIEW_PERSISTENCE_REJECTED";

export interface AuctionContentReviewHistoryEntry {
  readonly historyId: string;
  readonly reviewId: string;
  readonly sessionId: string;
  readonly reviewVersion: number;
  readonly actorId: string;
  readonly actorRole: "CONTENT_STAFF";
  readonly commandId: string;
  readonly action: AuctionContentReviewHistoryAction;
  readonly fromStatus?: ContentReviewStatus;
  readonly toStatus: ContentReviewStatus;
  readonly evaluatedSessionVersion: number;
  readonly evaluatedContentId: string;
  readonly evaluatedContentVersion: number;
  readonly evaluatedConfigurationSnapshotId: string;
  readonly findingCodes: readonly string[];
  readonly reason: string;
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export interface AuctionContentReview {
  readonly reviewId: string;
  readonly sessionId: string;
  readonly sessionVersionAtStart: number;
  readonly openingRequestId: string;
  readonly openingRequestVersionAtStart: number;
  readonly configurationSnapshotIdAtStart: string;
  readonly configurationProposalVersionAtStart: number;
  readonly contentId: string;
  readonly contentVersionAtStart: number;
  readonly lastEvaluatedContentVersion: number;
  readonly reviewVersion: number;
  readonly status: ContentReviewStatus;
  readonly readiness: SessionPackageReadinessResult;
  readonly startedBy: string;
  readonly startedAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
  readonly completedBy?: string;
  readonly completedAt?: string;
  readonly history: readonly AuctionContentReviewHistoryEntry[];
}

export interface ContentReviewCompletionRecord {
  readonly completionRecordId: string;
  readonly recordVersion: 1;
  readonly reviewId: string;
  readonly reviewVersion: number;
  readonly sessionId: string;
  readonly sessionVersionAtCompletion: number;
  readonly openingRequestId: string;
  readonly openingRequestVersion: number;
  readonly configurationSnapshotId: string;
  readonly configurationProposalVersion: number;
  readonly contentId: string;
  readonly contentVersion: number;
  readonly reviewedContentSnapshot: Readonly<{
    auctionTitle: string;
    auctionSummary: string;
    sourceLineage: Readonly<AuctionContentSourceLineage>;
  }>;
  readonly readinessSnapshot: SessionPackageReadinessResult;
  readonly prototypeClassification: typeof PROTOTYPE_CONTENT_POLICY.classification;
  readonly completedBy: string;
  readonly completedAt: string;
}

export type SessionPackageProjection =
  | "CONTENT_REVIEW_NOT_STARTED"
  | "CONTENT_REVIEW_CORRECTION_REQUIRED"
  | "CONTENT_REVIEW_BLOCKED"
  | "CONTENT_REVIEW_READY_TO_COMPLETE"
  | "CONTENT_REVIEW_COMPLETED"
  | "READY_FOR_APPROVAL_PACKAGE_PREPARATION"
  | "CONTENT_REVIEW_STALE"
  | "CONTENT_REVIEW_INVALID";

export type ContentReviewCommandErrorCode =
  | "SESSION_NOT_FOUND"
  | "SESSION_NOT_DYNAMIC"
  | "INVALID_SESSION_STATE"
  | "INVALID_PUBLICATION_STATE"
  | "ACCESS_DENIED"
  | "STALE_SESSION_VERSION"
  | "OPENING_REQUEST_LINEAGE_INVALID"
  | "AUCTION_CONTENT_NOT_INITIALIZED"
  | "AUCTION_CONTENT_STALE"
  | "AUCTION_CONTENT_BLOCKED"
  | "STALE_CONTENT_VERSION"
  | "CONFIGURATION_NOT_CONFIRMED"
  | "CONFIGURATION_SNAPSHOT_MISSING"
  | "CONFIGURATION_SNAPSHOT_INVALID"
  | "CONFIGURATION_SNAPSHOT_LEGACY_ONLY"
  | "CONFIGURATION_BUSINESS_DECISION_REQUIRED"
  | "STALE_CONFIGURATION_SNAPSHOT"
  | "MEMBERSHIP_REFERENCE_MISSING"
  | "MEMBERSHIP_REFERENCE_STALE"
  | "CONTENT_REVIEW_NOT_FOUND"
  | "CONTENT_REVIEW_ALREADY_STARTED"
  | "CONTENT_REVIEW_ALREADY_COMPLETED"
  | "CONTENT_REVIEW_NOT_READY"
  | "STALE_REVIEW_VERSION"
  | "APPROVAL_PACKAGE_ALREADY_EXISTS"
  | "LATER_PHASE_RECORD_EXISTS"
  | "DUPLICATE_COMMAND"
  | "UNSUPPORTED_FIELD"
  | "PERSISTENCE_ERROR"
  | "BLOCKED"
  | typeof CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION;

export type ContentReviewEligibilityResult =
  | {
      eligible: true;
      session: PersistedLinkedAuctionSession;
      openingRequest: CustomerOpeningRequest;
      content: AuctionContent;
      configuration: AuctionConfigurationProposal;
      snapshot: ConfirmedAuctionConfigurationSnapshot;
      membership: MemberTitleReference;
    }
  | {
      eligible: false;
      code: ContentReviewCommandErrorCode;
      message: string;
    };

export interface StartContentReviewCommand {
  sessionId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedSessionVersion: number;
  expectedContentId: string;
  expectedContentVersion: number;
  expectedConfigurationSnapshotId: string;
  commandId: string;
}

export interface RevalidateSessionPackageCommand {
  reviewId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedReviewVersion: number;
  expectedSessionVersion: number;
  expectedContentVersion: number;
  expectedConfigurationSnapshotId: string;
  commandId: string;
}

export type CompleteContentReviewCommand = RevalidateSessionPackageCommand;

export type ContentReviewCommandResult =
  | {
      ok: true;
      review: AuctionContentReview;
      created?: boolean;
      changed?: boolean;
      completionRecord?: ContentReviewCompletionRecord;
    }
  | {
      ok: false;
      code: ContentReviewCommandErrorCode;
      message: string;
      review?: AuctionContentReview;
      completionRecord?: ContentReviewCompletionRecord;
    };

interface AuthoritativeReviewSources {
  session?: PersistedAuctionSession;
  openingRequest?: CustomerOpeningRequest;
  content?: AuctionContent;
  configuration?: AuctionConfigurationProposal;
  snapshot?: ConfirmedAuctionConfigurationSnapshot;
  legacySnapshotExists: boolean;
  membership?: MemberTitleReference;
  approvalPackageExists: boolean;
}

interface AuctionContentReviewState {
  reviews: AuctionContentReview[];
  completionRecords: ContentReviewCompletionRecord[];
  getReviewBySessionId: (sessionId: string) => AuctionContentReview | undefined;
  getReviewById: (reviewId: string) => AuctionContentReview | undefined;
  getCompletionRecordByReviewId: (
    reviewId: string,
  ) => ContentReviewCompletionRecord | undefined;
  startContentReview: (
    command: StartContentReviewCommand,
  ) => ContentReviewCommandResult;
  revalidateSessionPackage: (
    command: RevalidateSessionPackageCommand,
  ) => ContentReviewCommandResult;
  completeContentReview: (
    command: CompleteContentReviewCommand,
  ) => ContentReviewCommandResult;
  resetDeterministicContentReviewState: () => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string =>
  typeof value === "string";
const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) > 0;
const isIsoTime = (value: unknown) =>
  isString(value) && Number.isFinite(Date.parse(value));
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
const hasUnsupportedKeys = (command: object, allowed: readonly string[]) =>
  Object.keys(command).some((key) => !allowed.includes(key));
const validCommandIdentity = (value: string) =>
  value.trim().length > 0 && value.length <= 160;
const hasLaterPhaseFields = (value: object) =>
  [
    "approvalPackage",
    "approvalPackageId",
    "approvalId",
    "approvalStatus",
    "approvedVersion",
    "schedule",
    "scheduleId",
    "publication",
    "publicationId",
    "registration",
    "registrationStatus",
    "eligibility",
    "eligibilityStatus",
  ].some((key) => Reflect.get(value, key) !== undefined);
const deterministicTimestamp = (reviewVersion: number, offset = 0) =>
  new Date(Date.UTC(2026, 6, 28, 8, reviewVersion, offset)).toISOString();
const reviewIdFor = (sessionId: string) => `content-review-${sessionId}`;
const completionRecordIdFor = (reviewId: string) =>
  `content-review-completion-${reviewId}`;

const finding = (value: SessionPackageFinding) =>
  Object.freeze({ ...value });
const freezeReadiness = (
  value: SessionPackageReadinessResult,
): SessionPackageReadinessResult =>
  Object.freeze({
    ...value,
    findings: Object.freeze(
      value.findings.map((item) => Object.freeze({ ...item })),
    ),
  });
const freezeHistory = (value: AuctionContentReviewHistoryEntry) =>
  Object.freeze({
    ...value,
    findingCodes: Object.freeze([...value.findingCodes]),
  });
const freezeReview = (value: AuctionContentReview): AuctionContentReview =>
  Object.freeze({
    ...value,
    readiness: freezeReadiness(value.readiness),
    history: Object.freeze(value.history.map(freezeHistory)),
  });
const freezeCompletionRecord = (
  value: ContentReviewCompletionRecord,
): ContentReviewCompletionRecord =>
  Object.freeze({
    ...value,
    reviewedContentSnapshot: Object.freeze({
      ...value.reviewedContentSnapshot,
      sourceLineage: Object.freeze({
        ...value.reviewedContentSnapshot.sourceLineage,
      }),
    }),
    readinessSnapshot: freezeReadiness(value.readinessSnapshot),
  });

const commandFailure = (
  code: ContentReviewCommandErrorCode,
  message: string,
  review?: AuctionContentReview,
  completionRecord?: ContentReviewCompletionRecord,
): ContentReviewCommandResult => ({
  ok: false,
  code,
  message,
  ...(review ? { review } : {}),
  ...(completionRecord ? { completionRecord } : {}),
});

const collectSources = (sessionId: string): AuthoritativeReviewSources => {
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
  return {
    session,
    openingRequest,
    content,
    configuration,
    snapshot,
    legacySnapshotExists,
    membership,
    approvalPackageExists: getApprovalPackages().some(
      (item) => item.sessionId === sessionId,
    ),
  };
};

const configurationIsCurrent = (
  sources: AuthoritativeReviewSources,
): sources is AuthoritativeReviewSources & {
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
      snapshot.listingFeeResolution.applicability === "APPLICABLE",
  );
};

export const evaluateContentReviewEligibility = ({
  sources,
  expectedSessionVersion,
  expectedContentId,
  expectedContentVersion,
  expectedConfigurationSnapshotId,
  activeReviewExists,
}: {
  sources: AuthoritativeReviewSources;
  expectedSessionVersion: number;
  expectedContentId: string;
  expectedContentVersion: number;
  expectedConfigurationSnapshotId: string;
  activeReviewExists: boolean;
}): ContentReviewEligibilityResult => {
  const { session, openingRequest, content, configuration, snapshot } = sources;
  if (!session)
    return {
      eligible: false,
      code: "SESSION_NOT_FOUND",
      message: "Không tìm thấy dynamic Auction Session.",
    };
  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return {
      eligible: false,
      code: CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION,
      message: SGDG_CONTENT_REVIEW_BLOCKER_MESSAGE,
    };
  if (
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED"
  )
    return {
      eligible: false,
      code: "SESSION_NOT_DYNAMIC",
      message: "Content Review chỉ hỗ trợ dynamic Customer-requested Session.",
    };
  if (session.lifecycleStatus !== "DRAFT")
    return {
      eligible: false,
      code: "INVALID_SESSION_STATE",
      message: "Session phải còn ở DRAFT.",
    };
  if (session.publicationStatus !== "NOT_READY")
    return {
      eligible: false,
      code: "INVALID_PUBLICATION_STATE",
      message: "Publication phải còn ở NOT_READY.",
    };
  if (session.currentVersion !== expectedSessionVersion)
    return {
      eligible: false,
      code: "STALE_SESSION_VERSION",
      message: "Session version đã thay đổi.",
    };
  if (hasLaterPhaseFields(session))
    return {
      eligible: false,
      code: "LATER_PHASE_RECORD_EXISTS",
      message: "Session chứa dữ liệu later phase ngoài phạm vi Content Review.",
    };
  if (sources.approvalPackageExists)
    return {
      eligible: false,
      code: "APPROVAL_PACKAGE_ALREADY_EXISTS",
      message: "Session đã có Approval Package.",
    };
  if (
    !openingRequest ||
    openingRequest.requestId !== session.openingRequestId ||
    openingRequest.version !== session.openingRequestVersion ||
    openingRequest.acceptedOpeningRequestVersion !==
      session.openingRequestVersion ||
    openingRequest.status !== "ACCEPTED_FOR_DRAFT"
  )
    return {
      eligible: false,
      code: "OPENING_REQUEST_LINEAGE_INVALID",
      message: "Opening Request lineage không còn hiện hành.",
    };
  if (!content)
    return {
      eligible: false,
      code: "AUCTION_CONTENT_NOT_INITIALIZED",
      message: "Auction Content chưa được khởi tạo.",
    };
  if (content.contentId !== expectedContentId)
    return {
      eligible: false,
      code: "AUCTION_CONTENT_NOT_INITIALIZED",
      message: "Content ID không khớp aggregate hiện hành.",
    };
  if (content.contentVersion !== expectedContentVersion)
    return {
      eligible: false,
      code: "STALE_CONTENT_VERSION",
      message: "Content version đã thay đổi.",
    };
  if (content.status === "STALE")
    return {
      eligible: false,
      code: "AUCTION_CONTENT_STALE",
      message: "Auction Content đang STALE.",
    };
  if (content.status === "BLOCKED")
    return {
      eligible: false,
      code: "AUCTION_CONTENT_BLOCKED",
      message: "Auction Content đang BLOCKED.",
    };
  if (
    content.sessionId !== session.sessionId ||
    content.sourceLineage.openingRequestId !== openingRequest.requestId ||
    content.sourceLineage.openingRequestVersion !== openingRequest.version ||
    content.sourceLineage.customerId !== openingRequest.ownerId ||
    content.sourceLineage.originalTitle !== openingRequest.title ||
    content.sourceLineage.originalPurpose !== openingRequest.purpose
  )
    return {
      eligible: false,
      code: "OPENING_REQUEST_LINEAGE_INVALID",
      message: "Auction Content source lineage không khớp Opening Request.",
    };
  if (sources.legacySnapshotExists && !snapshot)
    return {
      eligible: false,
      code: "CONFIGURATION_SNAPSHOT_LEGACY_ONLY",
      message: "Chỉ có Configuration Snapshot legacy; cần governed revalidation.",
    };
  if (!configuration)
    return {
      eligible: false,
      code: "CONFIGURATION_NOT_CONFIRMED",
      message: "Configuration chưa được xác nhận.",
    };
  if (
    configuration.overallConfigurationResolutionState ===
      "BUSINESS_DECISION_REQUIRED" ||
    configuration.listingFeeResolutionState === "BUSINESS_DECISION_REQUIRED"
  )
    return {
      eligible: false,
      code: "CONFIGURATION_BUSINESS_DECISION_REQUIRED",
      message: "Configuration còn business-decision blocker.",
    };
  if (!snapshot)
    return {
      eligible: false,
      code: "CONFIGURATION_SNAPSHOT_MISSING",
      message: "Không có current Configuration Snapshot.",
    };
  if (snapshot.snapshotId !== expectedConfigurationSnapshotId)
    return {
      eligible: false,
      code: "STALE_CONFIGURATION_SNAPSHOT",
      message: "Configuration Snapshot đã thay đổi.",
    };
  if (!configurationIsCurrent(sources))
    return {
      eligible: false,
      code: "CONFIGURATION_SNAPSHOT_INVALID",
      message: "Configuration Snapshot không còn hợp lệ hoặc hiện hành.",
    };
  if (!sources.membership)
    return {
      eligible: false,
      code: "MEMBERSHIP_REFERENCE_MISSING",
      message: "Không tìm thấy Membership reference hiện hành.",
    };
  if (
    JSON.stringify(snapshot.memberTitleReference) !==
      JSON.stringify(sources.membership) ||
    snapshot.listingFeeResolution.memberTitle !== sources.membership.title
  )
    return {
      eligible: false,
      code: "MEMBERSHIP_REFERENCE_STALE",
      message: "Membership evidence không còn khớp Configuration Snapshot.",
    };
  if (activeReviewExists)
    return {
      eligible: false,
      code: "CONTENT_REVIEW_ALREADY_STARTED",
      message: "Session đã có Content Review.",
    };
  return {
    eligible: true,
    session,
    openingRequest,
    content,
    configuration,
    snapshot,
    membership: sources.membership,
  };
};

const addFinding = (
  findings: SessionPackageFinding[],
  value: SessionPackageFinding,
) => findings.push(finding(value));

export const evaluateSessionPackageReadiness = ({
  review,
  sources,
  evaluatedAt,
}: {
  review: Pick<
    AuctionContentReview,
    | "sessionId"
    | "sessionVersionAtStart"
    | "openingRequestId"
    | "openingRequestVersionAtStart"
    | "configurationSnapshotIdAtStart"
    | "configurationProposalVersionAtStart"
    | "contentId"
  >;
  sources: AuthoritativeReviewSources;
  evaluatedAt: string;
}): SessionPackageReadinessResult => {
  const findings: SessionPackageFinding[] = [];
  const { session, openingRequest, content, configuration, snapshot, membership } =
    sources;
  if (
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED"
  )
    addFinding(findings, {
      code: "SESSION_INVALID",
      message: "Dynamic Customer-requested Session không còn hợp lệ.",
      owner: "AUCTION_SYSTEM",
      section: "SESSION",
      severity: "ERROR",
      correctableInContentWorkspace: false,
      referenceId: review.sessionId,
    });
  else {
    if (session.lifecycleStatus !== "DRAFT")
      addFinding(findings, {
        code: "SESSION_NOT_DRAFT",
        message: "Session không còn ở DRAFT.",
        owner: "AUCTION_SYSTEM",
        section: "SESSION",
        severity: "ERROR",
        correctableInContentWorkspace: false,
        referenceId: session.sessionId,
      });
    if (session.publicationStatus !== "NOT_READY")
      addFinding(findings, {
        code: "PUBLICATION_NOT_NOT_READY",
        message: "Publication không còn ở NOT_READY.",
        owner: "AUCTION_SYSTEM",
        section: "SESSION",
        severity: "ERROR",
        correctableInContentWorkspace: false,
        referenceId: session.sessionId,
      });
    if (session.currentVersion !== review.sessionVersionAtStart)
      addFinding(findings, {
        code: "STALE_SESSION_VERSION",
        message: "Session version đã thay đổi kể từ khi bắt đầu review.",
        owner: "AUCTION_SYSTEM",
        section: "VERSION",
        severity: "ERROR",
        correctableInContentWorkspace: false,
        referenceId: session.sessionId,
        referenceVersion: session.currentVersion,
      });
    if (!session.assetId.trim())
      addFinding(findings, {
        code: "ASSET_REFERENCE_MISSING",
        message: "Customer Session không có Asset reference identity.",
        owner: "PRODUCT_ASSET",
        section: "ASSET_REFERENCE",
        severity: "ERROR",
        correctableInContentWorkspace: false,
      });
    if (hasLaterPhaseFields(session))
      addFinding(findings, {
        code: "LATER_PHASE_RECORD_EXISTS",
        message: "Phát hiện dữ liệu later phase ngoài phạm vi Content Review.",
        owner: "AUCTION_SYSTEM",
        section: "LATER_PHASE_BOUNDARY",
        severity: "ERROR",
        correctableInContentWorkspace: false,
        referenceId: session.sessionId,
      });
  }
  if (!openingRequest)
    addFinding(findings, {
      code: "OPENING_REQUEST_MISSING",
      message: "Không tìm thấy Opening Request nguồn.",
      owner: "CUSTOMER_SOURCE",
      section: "OPENING_REQUEST",
      severity: "ERROR",
      correctableInContentWorkspace: false,
      referenceId: review.openingRequestId,
    });
  else {
    if (
      openingRequest.requestId !== review.openingRequestId ||
      session?.recordKind !== "DYNAMIC_LINKED_SESSION" ||
      session.openingRequestId !== openingRequest.requestId
    )
      addFinding(findings, {
        code: "OPENING_REQUEST_LINEAGE_MISMATCH",
        message: "Opening Request ID không khớp Session/review.",
        owner: "CUSTOMER_SOURCE",
        section: "OPENING_REQUEST",
        severity: "ERROR",
        correctableInContentWorkspace: false,
        referenceId: openingRequest.requestId,
      });
    if (
      openingRequest.version !== review.openingRequestVersionAtStart ||
      openingRequest.acceptedOpeningRequestVersion !==
        review.openingRequestVersionAtStart
    )
      addFinding(findings, {
        code: "OPENING_REQUEST_VERSION_STALE",
        message: "Opening Request version đã thay đổi.",
        owner: "CUSTOMER_SOURCE",
        section: "VERSION",
        severity: "ERROR",
        correctableInContentWorkspace: false,
        referenceId: openingRequest.requestId,
        referenceVersion: openingRequest.version,
      });
    if (openingRequest.status !== "ACCEPTED_FOR_DRAFT")
      addFinding(findings, {
        code: "OPENING_REQUEST_NOT_ACCEPTED",
        message: "Opening Request không còn ACCEPTED_FOR_DRAFT.",
        owner: "CUSTOMER_SOURCE",
        section: "OPENING_REQUEST",
        severity: "ERROR",
        correctableInContentWorkspace: false,
        referenceId: openingRequest.requestId,
      });
  }
  if (!content)
    addFinding(findings, {
      code: "AUCTION_CONTENT_NOT_INITIALIZED",
      message: "Auction Content không tồn tại.",
      owner: "CONTENT_STAFF",
      section: "AUCTION_CONTENT",
      severity: "ERROR",
      correctableInContentWorkspace: true,
      referenceId: review.contentId,
    });
  else {
    if (content.contentId !== review.contentId || content.sessionId !== review.sessionId)
      addFinding(findings, {
        code: "AUCTION_CONTENT_REFERENCE_MISMATCH",
        message: "Auction Content không khớp review/Session.",
        owner: "AUCTION_SYSTEM",
        section: "AUCTION_CONTENT",
        severity: "ERROR",
        correctableInContentWorkspace: false,
        referenceId: content.contentId,
        referenceVersion: content.contentVersion,
      });
    if (
      !openingRequest ||
      content.sourceLineage.openingRequestId !== openingRequest.requestId ||
      content.sourceLineage.openingRequestVersion !== openingRequest.version ||
      content.sourceLineage.customerId !== openingRequest.ownerId ||
      content.sourceLineage.originalTitle !== openingRequest.title ||
      content.sourceLineage.originalPurpose !== openingRequest.purpose
    )
      addFinding(findings, {
        code: "AUCTION_CONTENT_SOURCE_LINEAGE_INVALID",
        message: "Auction Content source lineage không còn hiện hành.",
        owner: "CUSTOMER_SOURCE",
        section: "OPENING_REQUEST",
        severity: "ERROR",
        correctableInContentWorkspace: false,
        referenceId: content.sourceLineage.openingRequestId,
        referenceVersion: content.sourceLineage.openingRequestVersion,
      });
    if (content.status === "STALE")
      addFinding(findings, {
        code: "AUCTION_CONTENT_STALE",
        message: "Auction Content đang STALE.",
        owner: "AUCTION_SYSTEM",
        section: "AUCTION_CONTENT",
        severity: "ERROR",
        correctableInContentWorkspace: false,
        referenceId: content.contentId,
        referenceVersion: content.contentVersion,
      });
    if (content.status === "BLOCKED")
      addFinding(findings, {
        code: "AUCTION_CONTENT_BLOCKED",
        message: "Auction Content đang BLOCKED.",
        owner: "AUCTION_SYSTEM",
        section: "AUCTION_CONTENT",
        severity: "ERROR",
        correctableInContentWorkspace: false,
        referenceId: content.contentId,
        referenceVersion: content.contentVersion,
      });
    const completeness = evaluateAuctionContentCompleteness({
      workingContent: { ...content.workingContent },
      contentVersion: content.contentVersion,
      sourceState:
        content.status === "STALE"
          ? "STALE"
          : content.status === "BLOCKED"
            ? "INVALID"
            : "CURRENT",
    });
    completeness.findings
      .filter((item) => item.owner === "CONTENT_STAFF")
      .forEach((item) =>
        addFinding(findings, {
          code: item.code,
          message: item.message,
          owner: "CONTENT_STAFF",
          section: "AUCTION_CONTENT",
          severity: item.severity,
          ...(item.field ? { field: item.field } : {}),
          correctableInContentWorkspace: true,
          referenceId: content.contentId,
          referenceVersion: content.contentVersion,
        }),
      );
    if (!completeness.complete)
      addFinding(findings, {
        code: "AUCTION_CONTENT_INCOMPLETE",
        message: "Auction Content chưa hoàn chỉnh theo prototype rules hiện hành.",
        owner: "CONTENT_STAFF",
        section: "AUCTION_CONTENT",
        severity: "ERROR",
        correctableInContentWorkspace: true,
        referenceId: content.contentId,
        referenceVersion: content.contentVersion,
      });
  }
  if (sources.legacySnapshotExists && !snapshot)
    addFinding(findings, {
      code: "CONFIGURATION_SNAPSHOT_LEGACY_ONLY",
      message: "Chỉ có legacy Configuration evidence.",
      owner: "CONFIGURATION_GOVERNANCE",
      section: "CONFIGURATION",
      severity: "ERROR",
      correctableInContentWorkspace: false,
    });
  else if (!snapshot)
    addFinding(findings, {
      code: "CONFIGURATION_SNAPSHOT_MISSING",
      message: "Không có current Configuration Snapshot.",
      owner: "CONFIGURATION_GOVERNANCE",
      section: "CONFIGURATION",
      severity: "ERROR",
      correctableInContentWorkspace: false,
      referenceId: review.configurationSnapshotIdAtStart,
    });
  if (
    configuration?.overallConfigurationResolutionState ===
      "BUSINESS_DECISION_REQUIRED" ||
    configuration?.listingFeeResolutionState === "BUSINESS_DECISION_REQUIRED"
  )
    addFinding(findings, {
      code: "CONFIGURATION_BUSINESS_DECISION_REQUIRED",
      message: "Configuration còn business-decision blocker.",
      owner: "BUSINESS_DECISION",
      section: "CONFIGURATION",
      severity: "ERROR",
      correctableInContentWorkspace: false,
      referenceId: configuration.configurationId,
      referenceVersion: configuration.proposalVersion,
    });
  if (snapshot && snapshot.snapshotId !== review.configurationSnapshotIdAtStart)
    addFinding(findings, {
      code: "CONFIGURATION_CHANGED",
      message: "Current Configuration Snapshot đã thay đổi kể từ khi bắt đầu review.",
      owner: "CONFIGURATION_GOVERNANCE",
      section: "VERSION",
      severity: "ERROR",
      correctableInContentWorkspace: false,
      referenceId: snapshot.snapshotId,
      referenceVersion: snapshot.proposalVersion,
    });
  if (
    snapshot &&
    (snapshot.proposalVersion !==
      review.configurationProposalVersionAtStart ||
      !configurationIsCurrent(sources))
  )
    addFinding(findings, {
      code: "CONFIGURATION_SNAPSHOT_INVALID",
      message: "Configuration evidence không còn current và hợp lệ.",
      owner: "CONFIGURATION_GOVERNANCE",
      section: "CONFIGURATION",
      severity: "ERROR",
      correctableInContentWorkspace: false,
      referenceId: snapshot.snapshotId,
      referenceVersion: snapshot.proposalVersion,
    });
  if (!membership)
    addFinding(findings, {
      code: "MEMBERSHIP_REFERENCE_MISSING",
      message: "Không tìm thấy Membership reference hiện hành.",
      owner: "MEMBERSHIP",
      section: "MEMBERSHIP",
      severity: "ERROR",
      correctableInContentWorkspace: false,
    });
  else if (
    snapshot &&
    membership.referenceVersion !==
      snapshot.memberTitleReference.referenceVersion
  )
    addFinding(findings, {
      code: "MEMBERSHIP_REFERENCE_STALE",
      message: "Membership reference version đã thay đổi.",
      owner: "MEMBERSHIP",
      section: "MEMBERSHIP",
      severity: "ERROR",
      correctableInContentWorkspace: false,
      referenceId: membership.memberId,
      referenceVersion: membership.referenceVersion,
    });
  if (
    membership &&
    snapshot &&
    snapshot.memberTitleReference.title !== membership.title
  )
    addFinding(findings, {
      code: "MEMBER_TITLE_CHANGED",
      message: "Member Title không còn khớp Configuration evidence.",
      owner: "MEMBERSHIP",
      section: "MEMBERSHIP",
      severity: "ERROR",
      correctableInContentWorkspace: false,
      referenceId: membership.memberId,
      referenceVersion: membership.referenceVersion,
    });
  if (
    membership &&
    snapshot &&
    (snapshot.memberTitleReference.referenceVersion !==
      membership.referenceVersion ||
      snapshot.listingFeeResolution.memberTitle !== membership.title)
  )
    addFinding(findings, {
      code: "MEMBER_FEE_EVIDENCE_STALE",
      message: "Member Listing Fee evidence không còn khớp Membership.",
      owner: "CONFIGURATION_GOVERNANCE",
      section: "MEMBERSHIP",
      severity: "ERROR",
      correctableInContentWorkspace: false,
      referenceId: snapshot.snapshotId,
      referenceVersion: snapshot.proposalVersion,
    });
  if (sources.approvalPackageExists)
    addFinding(findings, {
      code: "APPROVAL_PACKAGE_ALREADY_EXISTS",
      message: "Approval Package đã tồn tại ngoài Content Review scope.",
      owner: "AUCTION_SYSTEM",
      section: "LATER_PHASE_BOUNDARY",
      severity: "ERROR",
      correctableInContentWorkspace: false,
      referenceId: review.sessionId,
    });
  return freezeReadiness({
    ready: findings.every((item) => item.severity !== "ERROR"),
    evaluatedSessionVersion:
      session?.currentVersion ?? review.sessionVersionAtStart,
    evaluatedContentId: content?.contentId ?? review.contentId,
    evaluatedContentVersion: content?.contentVersion ?? 0,
    evaluatedConfigurationSnapshotId:
      snapshot?.snapshotId ?? review.configurationSnapshotIdAtStart,
    evaluatedConfigurationProposalVersion:
      snapshot?.proposalVersion ??
      configuration?.proposalVersion ??
      review.configurationProposalVersionAtStart,
    evaluatedOpeningRequestId:
      openingRequest?.requestId ?? review.openingRequestId,
    evaluatedOpeningRequestVersion:
      openingRequest?.version ?? review.openingRequestVersionAtStart,
    ...(membership
      ? {
          evaluatedMembershipReferenceVersion:
            String(membership.referenceVersion),
        }
      : {}),
    evaluatedAt,
    findings,
  });
};

const statusForReadiness = (
  readiness: SessionPackageReadinessResult,
): ContentReviewStatus => {
  if (readiness.ready) return "READY_TO_COMPLETE";
  if (
    readiness.findings.some(
      (item) =>
        item.severity === "ERROR" && item.correctableInContentWorkspace,
    )
  )
    return "CORRECTION_REQUIRED";
  if (
    readiness.findings.some((item) =>
      [
        "STALE_SESSION_VERSION",
        "CONFIGURATION_CHANGED",
        "OPENING_REQUEST_VERSION_STALE",
      ].includes(item.code),
    )
  )
    return "STALE";
  return "BLOCKED";
};

const readinessMaterial = (value: SessionPackageReadinessResult) => ({
  ready: value.ready,
  evaluatedSessionVersion: value.evaluatedSessionVersion,
  evaluatedContentId: value.evaluatedContentId,
  evaluatedContentVersion: value.evaluatedContentVersion,
  evaluatedConfigurationSnapshotId:
    value.evaluatedConfigurationSnapshotId,
  evaluatedConfigurationProposalVersion:
    value.evaluatedConfigurationProposalVersion,
  evaluatedOpeningRequestId: value.evaluatedOpeningRequestId,
  evaluatedOpeningRequestVersion: value.evaluatedOpeningRequestVersion,
  evaluatedMembershipReferenceVersion:
    value.evaluatedMembershipReferenceVersion,
  findings: value.findings,
});
const sameReadiness = (
  left: SessionPackageReadinessResult,
  right: SessionPackageReadinessResult,
) =>
  JSON.stringify(readinessMaterial(left)) ===
  JSON.stringify(readinessMaterial(right));

const makeHistory = ({
  review,
  reviewVersion,
  actorId,
  commandId,
  action,
  fromStatus,
  toStatus,
  readiness,
  reason,
  occurredAt,
}: {
  review: Pick<AuctionContentReview, "reviewId" | "sessionId" | "history">;
  reviewVersion: number;
  actorId: string;
  commandId: string;
  action: AuctionContentReviewHistoryAction;
  fromStatus?: ContentReviewStatus;
  toStatus: ContentReviewStatus;
  readiness: SessionPackageReadinessResult;
  reason: string;
  occurredAt: string;
}): AuctionContentReviewHistoryEntry =>
  freezeHistory({
    historyId: `${review.reviewId}-h${review.history.length + 1}-${action.toLowerCase()}`,
    reviewId: review.reviewId,
    sessionId: review.sessionId,
    reviewVersion,
    actorId,
    actorRole: "CONTENT_STAFF",
    commandId,
    action,
    ...(fromStatus ? { fromStatus } : {}),
    toStatus,
    evaluatedSessionVersion: readiness.evaluatedSessionVersion,
    evaluatedContentId: readiness.evaluatedContentId,
    evaluatedContentVersion: readiness.evaluatedContentVersion,
    evaluatedConfigurationSnapshotId:
      readiness.evaluatedConfigurationSnapshotId,
    findingCodes: readiness.findings.map((item) => item.code),
    reason,
    occurredAt,
    visibility: "STAFF_ONLY",
  });

const allowedStartKeys = [
  "sessionId",
  "actorId",
  "actorRole",
  "expectedSessionVersion",
  "expectedContentId",
  "expectedContentVersion",
  "expectedConfigurationSnapshotId",
  "commandId",
];
const allowedReviewCommandKeys = [
  "reviewId",
  "actorId",
  "actorRole",
  "expectedReviewVersion",
  "expectedSessionVersion",
  "expectedContentVersion",
  "expectedConfigurationSnapshotId",
  "commandId",
];

const validFinding = (value: unknown): value is SessionPackageFinding =>
  isRecord(value) &&
  exactKeys(
    value,
    [
      "code",
      "message",
      "owner",
      "section",
      "severity",
      "correctableInContentWorkspace",
    ],
    ["field", "referenceId", "referenceVersion"],
  ) &&
  isString(value.code) &&
  isString(value.message) &&
  [
    "CONTENT_STAFF",
    "CUSTOMER_SOURCE",
    "PRODUCT_ASSET",
    "MEMBERSHIP",
    "CONFIGURATION_GOVERNANCE",
    "AUCTION_SYSTEM",
    "BUSINESS_DECISION",
  ].includes(String(value.owner)) &&
  [
    "SESSION",
    "OPENING_REQUEST",
    "AUCTION_CONTENT",
    "ASSET_REFERENCE",
    "CONFIGURATION",
    "MEMBERSHIP",
    "VERSION",
    "LATER_PHASE_BOUNDARY",
  ].includes(String(value.section)) &&
  ["ERROR", "WARNING"].includes(String(value.severity)) &&
  typeof value.correctableInContentWorkspace === "boolean" &&
  (value.field === undefined ||
    ["auctionTitle", "auctionSummary"].includes(String(value.field))) &&
  (value.referenceId === undefined || isString(value.referenceId)) &&
  (value.referenceVersion === undefined ||
    isString(value.referenceVersion) ||
    isPositiveInteger(value.referenceVersion));

const validReadiness = (
  value: unknown,
): value is SessionPackageReadinessResult =>
  isRecord(value) &&
  exactKeys(
    value,
    [
      "ready",
      "evaluatedSessionVersion",
      "evaluatedContentId",
      "evaluatedContentVersion",
      "evaluatedConfigurationSnapshotId",
      "evaluatedConfigurationProposalVersion",
      "evaluatedOpeningRequestId",
      "evaluatedOpeningRequestVersion",
      "evaluatedAt",
      "findings",
    ],
    ["evaluatedMembershipReferenceVersion"],
  ) &&
  typeof value.ready === "boolean" &&
  isPositiveInteger(value.evaluatedSessionVersion) &&
  isString(value.evaluatedContentId) &&
  Number.isInteger(value.evaluatedContentVersion) &&
  Number(value.evaluatedContentVersion) >= 0 &&
  isString(value.evaluatedConfigurationSnapshotId) &&
  isPositiveInteger(value.evaluatedConfigurationProposalVersion) &&
  isString(value.evaluatedOpeningRequestId) &&
  isPositiveInteger(value.evaluatedOpeningRequestVersion) &&
  (value.evaluatedMembershipReferenceVersion === undefined ||
    isString(value.evaluatedMembershipReferenceVersion)) &&
  isIsoTime(value.evaluatedAt) &&
  Array.isArray(value.findings) &&
  value.findings.every(validFinding) &&
  value.ready ===
    value.findings.every(
      (item) =>
        isRecord(item) && item.severity !== "ERROR",
    );

const reviewStatuses: ContentReviewStatus[] = [
  "IN_PROGRESS",
  "CORRECTION_REQUIRED",
  "READY_TO_COMPLETE",
  "COMPLETED",
  "STALE",
  "BLOCKED",
];
const historyActions: AuctionContentReviewHistoryAction[] = [
  "CONTENT_REVIEW_STARTED",
  "CONTENT_REVIEW_INITIAL_READINESS_EVALUATED",
  "CONTENT_REVIEW_CORRECTION_REQUIRED",
  "CONTENT_REVIEW_BLOCKED",
  "SESSION_PACKAGE_REVALIDATED",
  "CONTENT_VERSION_CHANGED_DURING_REVIEW",
  "CONFIGURATION_CHANGED_DURING_REVIEW",
  "MEMBERSHIP_CHANGED_DURING_REVIEW",
  "CONTENT_REVIEW_READY_TO_COMPLETE",
  "CONTENT_REVIEW_COMPLETED",
  "CONTENT_REVIEW_COMPLETION_RECORDED",
  "CONTENT_REVIEW_STALE",
  "CONTENT_REVIEW_PERSISTENCE_REJECTED",
];

const validHistory = (
  value: unknown,
  reviewId: string,
  sessionId: string,
  maxReviewVersion: number,
): value is AuctionContentReviewHistoryEntry =>
  isRecord(value) &&
  exactKeys(
    value,
    [
      "historyId",
      "reviewId",
      "sessionId",
      "reviewVersion",
      "actorId",
      "actorRole",
      "commandId",
      "action",
      "toStatus",
      "evaluatedSessionVersion",
      "evaluatedContentId",
      "evaluatedContentVersion",
      "evaluatedConfigurationSnapshotId",
      "findingCodes",
      "reason",
      "occurredAt",
      "visibility",
    ],
    ["fromStatus"],
  ) &&
  isString(value.historyId) &&
  value.reviewId === reviewId &&
  value.sessionId === sessionId &&
  isPositiveInteger(value.reviewVersion) &&
  Number(value.reviewVersion) <= maxReviewVersion &&
  isString(value.actorId) &&
  value.actorRole === "CONTENT_STAFF" &&
  isString(value.commandId) &&
  validCommandIdentity(value.commandId) &&
  historyActions.includes(value.action as AuctionContentReviewHistoryAction) &&
  reviewStatuses.includes(value.toStatus as ContentReviewStatus) &&
  (value.fromStatus === undefined ||
    reviewStatuses.includes(value.fromStatus as ContentReviewStatus)) &&
  isPositiveInteger(value.evaluatedSessionVersion) &&
  isString(value.evaluatedContentId) &&
  Number.isInteger(value.evaluatedContentVersion) &&
  Number(value.evaluatedContentVersion) >= 0 &&
  isString(value.evaluatedConfigurationSnapshotId) &&
  Array.isArray(value.findingCodes) &&
  value.findingCodes.every(isString) &&
  isString(value.reason) &&
  isIsoTime(value.occurredAt) &&
  value.visibility === "STAFF_ONLY";

const sanitizeReview = (value: unknown): AuctionContentReview | undefined => {
  if (
    !isRecord(value) ||
    !exactKeys(
      value,
      [
        "reviewId",
        "sessionId",
        "sessionVersionAtStart",
        "openingRequestId",
        "openingRequestVersionAtStart",
        "configurationSnapshotIdAtStart",
        "configurationProposalVersionAtStart",
        "contentId",
        "contentVersionAtStart",
        "lastEvaluatedContentVersion",
        "reviewVersion",
        "status",
        "readiness",
        "startedBy",
        "startedAt",
        "updatedBy",
        "updatedAt",
        "history",
      ],
      ["completedBy", "completedAt"],
    ) ||
    hasLaterPhaseFields(value) ||
    Reflect.get(value, "auctionTitle") !== undefined ||
    Reflect.get(value, "auctionSummary") !== undefined ||
    !isString(value.reviewId) ||
    !isString(value.sessionId) ||
    value.reviewId !== reviewIdFor(value.sessionId) ||
    !isPositiveInteger(value.sessionVersionAtStart) ||
    !isString(value.openingRequestId) ||
    !isPositiveInteger(value.openingRequestVersionAtStart) ||
    !isString(value.configurationSnapshotIdAtStart) ||
    !isPositiveInteger(value.configurationProposalVersionAtStart) ||
    !isString(value.contentId) ||
    !isPositiveInteger(value.contentVersionAtStart) ||
    !isPositiveInteger(value.lastEvaluatedContentVersion) ||
    Number(value.lastEvaluatedContentVersion) <
      Number(value.contentVersionAtStart) ||
    !isPositiveInteger(value.reviewVersion) ||
    !reviewStatuses.includes(value.status as ContentReviewStatus) ||
    !validReadiness(value.readiness) ||
    !isString(value.startedBy) ||
    !isIsoTime(value.startedAt) ||
    !isString(value.updatedBy) ||
    !isIsoTime(value.updatedAt) ||
    !Array.isArray(value.history) ||
    (value.status === "COMPLETED") !==
      (isString(value.completedBy) && isIsoTime(value.completedAt))
  )
    return undefined;
  const reviewVersion = Number(value.reviewVersion);
  const history = value.history.filter((entry) =>
    validHistory(entry, value.reviewId as string, value.sessionId as string, reviewVersion),
  );
  if (
    history.length !== value.history.length ||
    history[0]?.action !== "CONTENT_REVIEW_STARTED" ||
    history[1]?.action !== "CONTENT_REVIEW_INITIAL_READINESS_EVALUATED" ||
    history.some(
      (entry, index) =>
        entry.historyId !==
        `${value.reviewId}-h${index + 1}-${entry.action.toLowerCase()}`,
    ) ||
    (value.status === "COMPLETED" &&
      !history.some((entry) => entry.action === "CONTENT_REVIEW_COMPLETED"))
  )
    return undefined;
  const sources = collectSources(value.sessionId as string);
  if (
    !sources.session ||
    sources.session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    sources.session.sessionId !== value.sessionId ||
    sources.session.openingRequestId !== value.openingRequestId ||
    !sources.openingRequest ||
    !sources.content ||
    sources.content.contentId !== value.contentId ||
    Number(value.contentVersionAtStart) > sources.content.contentVersion ||
    Number(value.lastEvaluatedContentVersion) > sources.content.contentVersion ||
    !sources.snapshot ||
    sources.snapshot.snapshotId !== value.configurationSnapshotIdAtStart ||
    sources.snapshot.proposalVersion !==
      value.configurationProposalVersionAtStart
  )
    return undefined;
  const contentVersionRecord = sources.content.versions.find(
    (item) => item.contentVersion === value.lastEvaluatedContentVersion,
  );
  if (!contentVersionRecord) return undefined;
  const historicalCompleteness = evaluateAuctionContentCompleteness({
    workingContent: { ...contentVersionRecord.workingContent },
    contentVersion: contentVersionRecord.contentVersion,
  });
  const historicalContent: AuctionContent = {
    ...sources.content,
    contentVersion: contentVersionRecord.contentVersion,
    status: historicalCompleteness.complete ? "COMPLETE" : "DRAFT",
    workingContent: contentVersionRecord.workingContent,
    completeness: historicalCompleteness,
  };
  const expected = evaluateSessionPackageReadiness({
    review: value as unknown as AuctionContentReview,
    sources: { ...sources, content: historicalContent },
    evaluatedAt: (value.readiness as SessionPackageReadinessResult).evaluatedAt,
  });
  if (
    !sameReadiness(
      expected,
      value.readiness as unknown as SessionPackageReadinessResult,
    )
  )
    return undefined;
  return freezeReview({
    ...(value as unknown as AuctionContentReview),
    history,
  });
};

const sanitizeCompletionRecord = (
  value: unknown,
): ContentReviewCompletionRecord | undefined => {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "completionRecordId",
      "recordVersion",
      "reviewId",
      "reviewVersion",
      "sessionId",
      "sessionVersionAtCompletion",
      "openingRequestId",
      "openingRequestVersion",
      "configurationSnapshotId",
      "configurationProposalVersion",
      "contentId",
      "contentVersion",
      "reviewedContentSnapshot",
      "readinessSnapshot",
      "prototypeClassification",
      "completedBy",
      "completedAt",
    ]) ||
    hasLaterPhaseFields(value) ||
    !isString(value.completionRecordId) ||
    !isString(value.reviewId) ||
    value.completionRecordId !== completionRecordIdFor(value.reviewId) ||
    value.recordVersion !== 1 ||
    !isPositiveInteger(value.reviewVersion) ||
    !isString(value.sessionId) ||
    !isPositiveInteger(value.sessionVersionAtCompletion) ||
    !isString(value.openingRequestId) ||
    !isPositiveInteger(value.openingRequestVersion) ||
    !isString(value.configurationSnapshotId) ||
    !isPositiveInteger(value.configurationProposalVersion) ||
    !isString(value.contentId) ||
    !isPositiveInteger(value.contentVersion) ||
    !isRecord(value.reviewedContentSnapshot) ||
    !exactKeys(value.reviewedContentSnapshot, [
      "auctionTitle",
      "auctionSummary",
      "sourceLineage",
    ]) ||
    !isString(value.reviewedContentSnapshot.auctionTitle) ||
    !isString(value.reviewedContentSnapshot.auctionSummary) ||
    !isRecord(value.reviewedContentSnapshot.sourceLineage) ||
    !validReadiness(value.readinessSnapshot) ||
    value.prototypeClassification !== PROTOTYPE_CONTENT_POLICY.classification ||
    !isString(value.completedBy) ||
    !isIsoTime(value.completedAt)
  )
    return undefined;
  const sources = collectSources(value.sessionId as string);
  const contentVersionRecord = sources.content?.versions.find(
    (item) => item.contentVersion === value.contentVersion,
  );
  if (
    !sources.session ||
    sources.session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    !sources.snapshot ||
    sources.snapshot.snapshotId !== value.configurationSnapshotId ||
    sources.snapshot.proposalVersion !== value.configurationProposalVersion ||
    !sources.content ||
    sources.content.contentId !== value.contentId ||
    !contentVersionRecord ||
    contentVersionRecord.workingContent.auctionTitle !==
      value.reviewedContentSnapshot.auctionTitle ||
    contentVersionRecord.workingContent.auctionSummary !==
      value.reviewedContentSnapshot.auctionSummary ||
    JSON.stringify(sources.content.sourceLineage) !==
      JSON.stringify(value.reviewedContentSnapshot.sourceLineage)
  )
    return undefined;
  return freezeCompletionRecord(value as unknown as ContentReviewCompletionRecord);
};

export const sanitizePersistedAuctionContentReviewState = (
  persisted: unknown,
) => {
  const empty = {
    reviews: [] as AuctionContentReview[],
    completionRecords: [] as ContentReviewCompletionRecord[],
  };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["reviews", "completionRecords"]) ||
    !Array.isArray(persisted.reviews) ||
    !Array.isArray(persisted.completionRecords)
  )
    return empty;
  const reviews = persisted.reviews.map(sanitizeReview);
  const completionRecords = persisted.completionRecords.map(
    sanitizeCompletionRecord,
  );
  if (
    reviews.some((item) => !item) ||
    completionRecords.some((item) => !item)
  )
    return empty;
  const safeReviews = reviews as AuctionContentReview[];
  const safeRecords = completionRecords as ContentReviewCompletionRecord[];
  if (
    new Set(safeReviews.map((item) => item.reviewId)).size !==
      safeReviews.length ||
    new Set(safeReviews.map((item) => item.sessionId)).size !==
      safeReviews.length ||
    new Set(safeRecords.map((item) => item.completionRecordId)).size !==
      safeRecords.length ||
    new Set(safeRecords.map((item) => item.reviewId)).size !==
      safeRecords.length
  )
    return empty;
  const commandOwners = new Map<string, string>();
  for (const review of safeReviews) {
    for (const entry of review.history) {
      const owner = commandOwners.get(entry.commandId);
      if (owner && owner !== review.reviewId) return empty;
      commandOwners.set(entry.commandId, review.reviewId);
    }
    const record = safeRecords.find((item) => item.reviewId === review.reviewId);
    if ((review.status === "COMPLETED") !== Boolean(record)) return empty;
    if (
      record &&
      (record.reviewVersion !== review.reviewVersion ||
        record.sessionId !== review.sessionId ||
        record.sessionVersionAtCompletion !==
          review.readiness.evaluatedSessionVersion ||
        record.openingRequestId !== review.openingRequestId ||
        record.openingRequestVersion !==
          review.openingRequestVersionAtStart ||
        record.configurationSnapshotId !==
          review.readiness.evaluatedConfigurationSnapshotId ||
        record.configurationProposalVersion !==
          review.readiness.evaluatedConfigurationProposalVersion ||
        record.contentId !== review.contentId ||
        record.contentVersion !== review.lastEvaluatedContentVersion ||
        !sameReadiness(record.readinessSnapshot, review.readiness))
    )
      return empty;
  }
  if (
    safeRecords.some(
      (record) =>
        !safeReviews.some((review) => review.reviewId === record.reviewId),
    )
  )
    return empty;
  return { reviews: safeReviews, completionRecords: safeRecords };
};

export const getSessionPackageProjection = (
  sessionId: string,
): SessionPackageProjection => {
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === sessionId);
  if (!session) return "CONTENT_REVIEW_INVALID";
  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return "CONTENT_REVIEW_BLOCKED";
  const review = useAuctionContentReviewStore
    .getState()
    .reviews.find((item) => item.sessionId === sessionId);
  if (!review) return "CONTENT_REVIEW_NOT_STARTED";
  if (review.status === "COMPLETED") {
    const record = useAuctionContentReviewStore
      .getState()
      .completionRecords.find((item) => item.reviewId === review.reviewId);
    return record
      ? "READY_FOR_APPROVAL_PACKAGE_PREPARATION"
      : "CONTENT_REVIEW_INVALID";
  }
  const sources = collectSources(sessionId);
  if (
    sources.session?.currentVersion !== review.sessionVersionAtStart ||
    sources.content?.contentVersion !== review.lastEvaluatedContentVersion ||
    sources.snapshot?.snapshotId !==
      review.readiness.evaluatedConfigurationSnapshotId ||
    sources.membership?.referenceVersion !==
      review.readiness.evaluatedMembershipReferenceVersion
  )
    return "CONTENT_REVIEW_STALE";
  if (review.status === "CORRECTION_REQUIRED")
    return "CONTENT_REVIEW_CORRECTION_REQUIRED";
  if (review.status === "BLOCKED") return "CONTENT_REVIEW_BLOCKED";
  if (review.status === "READY_TO_COMPLETE")
    return "CONTENT_REVIEW_READY_TO_COMPLETE";
  if (review.status === "STALE") return "CONTENT_REVIEW_STALE";
  return "CONTENT_REVIEW_INVALID";
};

export const useAuctionContentReviewStore =
  create<AuctionContentReviewState>()(
    persist(
      (set, get) => ({
        reviews: [],
        completionRecords: [],
        getReviewBySessionId: (sessionId) =>
          get().reviews.find((item) => item.sessionId === sessionId),
        getReviewById: (reviewId) =>
          get().reviews.find((item) => item.reviewId === reviewId),
        getCompletionRecordByReviewId: (reviewId) =>
          get().completionRecords.find(
            (item) => item.reviewId === reviewId,
          ),
        startContentReview: (command) => {
          if (hasUnsupportedKeys(command, allowedStartKeys))
            return commandFailure(
              "UNSUPPORTED_FIELD",
              "Start command chứa field không được hỗ trợ.",
            );
          if (command.actorRole !== "CONTENT_STAFF")
            return commandFailure(
              "ACCESS_DENIED",
              "Chỉ CONTENT_STAFF có thể bắt đầu Content Review.",
            );
          if (!validCommandIdentity(command.commandId))
            return commandFailure(
              "DUPLICATE_COMMAND",
              "Command ID là bắt buộc và phải hợp lệ.",
            );
          const commandReview = get().reviews.find((item) =>
            item.history.some(
              (entry) => entry.commandId === command.commandId,
            ),
          );
          if (commandReview) {
            if (
              commandReview.sessionId === command.sessionId &&
              commandReview.history.some(
                (entry) =>
                  entry.commandId === command.commandId &&
                  entry.action === "CONTENT_REVIEW_STARTED",
              )
            )
              return { ok: true, review: commandReview, created: false };
            return commandFailure(
              "DUPLICATE_COMMAND",
              "Command ID đã thuộc Content Review khác.",
            );
          }
          const activeReview = get().reviews.find(
            (item) => item.sessionId === command.sessionId,
          );
          if (activeReview)
            return commandFailure(
              "CONTENT_REVIEW_ALREADY_STARTED",
              "Session đã có Content Review.",
              activeReview,
            );
          let sources = collectSources(command.sessionId);
          let eligibility = evaluateContentReviewEligibility({
            sources,
            expectedSessionVersion: command.expectedSessionVersion,
            expectedContentId: command.expectedContentId,
            expectedContentVersion: command.expectedContentVersion,
            expectedConfigurationSnapshotId:
              command.expectedConfigurationSnapshotId,
            activeReviewExists: false,
          });
          if (!eligibility.eligible)
            return commandFailure(eligibility.code, eligibility.message);
          sources = collectSources(command.sessionId);
          eligibility = evaluateContentReviewEligibility({
            sources,
            expectedSessionVersion: command.expectedSessionVersion,
            expectedContentId: command.expectedContentId,
            expectedContentVersion: command.expectedContentVersion,
            expectedConfigurationSnapshotId:
              command.expectedConfigurationSnapshotId,
            activeReviewExists: get().reviews.some(
              (item) => item.sessionId === command.sessionId,
            ),
          });
          if (!eligibility.eligible)
            return commandFailure(eligibility.code, eligibility.message);
          const time = deterministicTimestamp(1);
          const reviewBase = {
            reviewId: reviewIdFor(command.sessionId),
            sessionId: command.sessionId,
            sessionVersionAtStart: eligibility.session.currentVersion,
            openingRequestId: eligibility.openingRequest.requestId,
            openingRequestVersionAtStart:
              eligibility.openingRequest.version,
            configurationSnapshotIdAtStart:
              eligibility.snapshot.snapshotId,
            configurationProposalVersionAtStart:
              eligibility.snapshot.proposalVersion,
            contentId: eligibility.content.contentId,
            contentVersionAtStart: eligibility.content.contentVersion,
            history: [] as AuctionContentReviewHistoryEntry[],
          };
          const readiness = evaluateSessionPackageReadiness({
            review: reviewBase,
            sources,
            evaluatedAt: time,
          });
          const status = statusForReadiness(readiness);
          const first = makeHistory({
            review: reviewBase,
            reviewVersion: 1,
            actorId: command.actorId,
            commandId: command.commandId,
            action: "CONTENT_REVIEW_STARTED",
            toStatus: status,
            readiness,
            reason: "Content Review started from current authoritative references.",
            occurredAt: time,
          });
          const second = makeHistory({
            review: { ...reviewBase, history: [first] },
            reviewVersion: 1,
            actorId: command.actorId,
            commandId: command.commandId,
            action: "CONTENT_REVIEW_INITIAL_READINESS_EVALUATED",
            toStatus: status,
            readiness,
            reason: readiness.ready
              ? "Initial Session Package readiness is ready to complete."
              : "Initial Session Package readiness contains blocking findings.",
            occurredAt: deterministicTimestamp(1, 1),
          });
          const review = freezeReview({
            ...reviewBase,
            lastEvaluatedContentVersion: eligibility.content.contentVersion,
            reviewVersion: 1,
            status,
            readiness,
            startedBy: command.actorId,
            startedAt: time,
            updatedBy: command.actorId,
            updatedAt: time,
            history: [first, second],
          });
          set((state) => ({ reviews: [...state.reviews, review] }));
          return { ok: true, review, created: true };
        },
        revalidateSessionPackage: (command) => {
          if (hasUnsupportedKeys(command, allowedReviewCommandKeys))
            return commandFailure(
              "UNSUPPORTED_FIELD",
              "Revalidation command chứa field không được hỗ trợ.",
            );
          if (command.actorRole !== "CONTENT_STAFF")
            return commandFailure(
              "ACCESS_DENIED",
              "Chỉ CONTENT_STAFF có thể revalidate Content Review.",
            );
          if (!validCommandIdentity(command.commandId))
            return commandFailure(
              "DUPLICATE_COMMAND",
              "Command ID là bắt buộc và phải hợp lệ.",
            );
          const committed = get().reviews.find((item) =>
            item.history.some(
              (entry) => entry.commandId === command.commandId,
            ),
          );
          if (committed) {
            if (committed.reviewId === command.reviewId)
              return { ok: true, review: committed, changed: false };
            return commandFailure(
              "DUPLICATE_COMMAND",
              "Command ID đã thuộc Content Review khác.",
            );
          }
          const review = get().reviews.find(
            (item) => item.reviewId === command.reviewId,
          );
          if (!review)
            return commandFailure(
              "CONTENT_REVIEW_NOT_FOUND",
              "Không tìm thấy Content Review.",
            );
          if (review.status === "COMPLETED")
            return commandFailure(
              "CONTENT_REVIEW_ALREADY_COMPLETED",
              "Content Review đã hoàn tất.",
              review,
              get().completionRecords.find(
                (item) => item.reviewId === review.reviewId,
              ),
            );
          if (review.reviewVersion !== command.expectedReviewVersion)
            return commandFailure(
              "STALE_REVIEW_VERSION",
              "Review version đã thay đổi.",
              review,
            );
          let sources = collectSources(review.sessionId);
          if (!sources.session)
            return commandFailure(
              "SESSION_NOT_FOUND",
              "Không tìm thấy Session hiện hành.",
              review,
            );
          if (sources.session.currentVersion !== command.expectedSessionVersion)
            return commandFailure(
              "STALE_SESSION_VERSION",
              "Session version đã thay đổi.",
              review,
            );
          if (!sources.content)
            return commandFailure(
              "AUCTION_CONTENT_NOT_INITIALIZED",
              "Không tìm thấy Auction Content.",
              review,
            );
          if (sources.content.contentVersion !== command.expectedContentVersion)
            return commandFailure(
              "STALE_CONTENT_VERSION",
              "Content version đã thay đổi.",
              review,
            );
          if (!sources.snapshot)
            return commandFailure(
              sources.legacySnapshotExists
                ? "CONFIGURATION_SNAPSHOT_LEGACY_ONLY"
                : "CONFIGURATION_SNAPSHOT_MISSING",
              "Không có current Configuration Snapshot.",
              review,
            );
          if (
            sources.snapshot.snapshotId !==
            command.expectedConfigurationSnapshotId
          )
            return commandFailure(
              "STALE_CONFIGURATION_SNAPSHOT",
              "Configuration Snapshot đã thay đổi.",
              review,
            );
          const time = deterministicTimestamp(
            review.reviewVersion + 1,
            review.history.length + 1,
          );
          const readiness = evaluateSessionPackageReadiness({
            review,
            sources,
            evaluatedAt: time,
          });
          const status = statusForReadiness(readiness);
          if (
            sameReadiness(review.readiness, readiness) &&
            status === review.status
          )
            return { ok: true, review, changed: false };
          sources = collectSources(review.sessionId);
          if (
            !sources.session ||
            !sources.content ||
            !sources.snapshot ||
            sources.session.currentVersion !== command.expectedSessionVersion ||
            sources.content.contentVersion !== command.expectedContentVersion ||
            sources.snapshot.snapshotId !==
              command.expectedConfigurationSnapshotId ||
            get().reviews.find((item) => item.reviewId === review.reviewId)
              ?.reviewVersion !== command.expectedReviewVersion
          )
            return commandFailure(
              "PERSISTENCE_ERROR",
              "Authoritative state changed before revalidation commit.",
              review,
            );
          const nextVersion = review.reviewVersion + 1;
          const action: AuctionContentReviewHistoryAction =
            sources.content.contentVersion !==
            review.lastEvaluatedContentVersion
              ? "CONTENT_VERSION_CHANGED_DURING_REVIEW"
              : sources.snapshot.snapshotId !==
                    review.configurationSnapshotIdAtStart
                ? "CONFIGURATION_CHANGED_DURING_REVIEW"
                : sources.membership?.referenceVersion !==
                    review.readiness.evaluatedMembershipReferenceVersion
                  ? "MEMBERSHIP_CHANGED_DURING_REVIEW"
                  : status === "READY_TO_COMPLETE"
                    ? "CONTENT_REVIEW_READY_TO_COMPLETE"
                    : status === "STALE"
                      ? "CONTENT_REVIEW_STALE"
                      : "SESSION_PACKAGE_REVALIDATED";
          const nextBase = {
            ...review,
            lastEvaluatedContentVersion: sources.content.contentVersion,
            reviewVersion: nextVersion,
            status,
            readiness,
            updatedBy: command.actorId,
            updatedAt: time,
          };
          const next = freezeReview({
            ...nextBase,
            history: [
              ...review.history,
              makeHistory({
                review,
                reviewVersion: nextVersion,
                actorId: command.actorId,
                commandId: command.commandId,
                action,
                fromStatus: review.status,
                toStatus: status,
                readiness,
                reason: `Session Package explicitly revalidated; content v${review.lastEvaluatedContentVersion} → v${sources.content.contentVersion}.`,
                occurredAt: time,
              }),
            ],
          });
          set((state) => ({
            reviews: state.reviews.map((item) =>
              item.reviewId === next.reviewId ? next : item,
            ),
          }));
          return { ok: true, review: next, changed: true };
        },
        completeContentReview: (command) => {
          if (hasUnsupportedKeys(command, allowedReviewCommandKeys))
            return commandFailure(
              "UNSUPPORTED_FIELD",
              "Completion command chứa field không được hỗ trợ.",
            );
          if (command.actorRole !== "CONTENT_STAFF")
            return commandFailure(
              "ACCESS_DENIED",
              "Chỉ CONTENT_STAFF có thể hoàn tất Content Review.",
            );
          if (!validCommandIdentity(command.commandId))
            return commandFailure(
              "DUPLICATE_COMMAND",
              "Command ID là bắt buộc và phải hợp lệ.",
            );
          const committed = get().reviews.find((item) =>
            item.history.some(
              (entry) => entry.commandId === command.commandId,
            ),
          );
          if (committed) {
            const record = get().completionRecords.find(
              (item) => item.reviewId === committed.reviewId,
            );
            if (
              committed.reviewId === command.reviewId &&
              record &&
              committed.history.some(
                (entry) =>
                  entry.commandId === command.commandId &&
                  entry.action === "CONTENT_REVIEW_COMPLETED",
              )
            )
              return {
                ok: true,
                review: committed,
                completionRecord: record,
                created: false,
              };
            return commandFailure(
              "DUPLICATE_COMMAND",
              "Command ID đã thuộc command khác.",
            );
          }
          const review = get().reviews.find(
            (item) => item.reviewId === command.reviewId,
          );
          if (!review)
            return commandFailure(
              "CONTENT_REVIEW_NOT_FOUND",
              "Không tìm thấy Content Review.",
            );
          const existingRecord = get().completionRecords.find(
            (item) => item.reviewId === review.reviewId,
          );
          if (review.status === "COMPLETED" || existingRecord)
            return commandFailure(
              "CONTENT_REVIEW_ALREADY_COMPLETED",
              "Content Review đã hoàn tất bằng command khác.",
              review,
              existingRecord,
            );
          if (review.reviewVersion !== command.expectedReviewVersion)
            return commandFailure(
              "STALE_REVIEW_VERSION",
              "Review version đã thay đổi.",
              review,
            );
          let sources = collectSources(review.sessionId);
          if (
            !sources.session ||
            sources.session.currentVersion !== command.expectedSessionVersion
          )
            return commandFailure(
              "STALE_SESSION_VERSION",
              "Session version đã thay đổi.",
              review,
            );
          if (
            !sources.content ||
            sources.content.contentVersion !== command.expectedContentVersion
          )
            return commandFailure(
              "STALE_CONTENT_VERSION",
              "Content version đã thay đổi; hãy revalidate trước.",
              review,
            );
          if (
            sources.content.contentVersion !==
            review.lastEvaluatedContentVersion
          )
            return commandFailure(
              "STALE_CONTENT_VERSION",
              "Current Content chưa được review này revalidate.",
              review,
            );
          if (review.status !== "READY_TO_COMPLETE")
            return commandFailure(
              "CONTENT_REVIEW_NOT_READY",
              "Chỉ review READY_TO_COMPLETE mới có thể hoàn tất.",
              review,
            );
          if (
            !sources.snapshot ||
            sources.snapshot.snapshotId !==
              command.expectedConfigurationSnapshotId
          )
            return commandFailure(
              "STALE_CONFIGURATION_SNAPSHOT",
              "Configuration Snapshot đã thay đổi.",
              review,
            );
          const time = deterministicTimestamp(
            review.reviewVersion + 1,
            review.history.length + 1,
          );
          const readiness = evaluateSessionPackageReadiness({
            review,
            sources,
            evaluatedAt: time,
          });
          if (!readiness.ready || sources.content.status !== "COMPLETE")
            return commandFailure(
              "CONTENT_REVIEW_NOT_READY",
              "Final readiness evaluation còn blocking finding.",
              review,
            );
          sources = collectSources(review.sessionId);
          if (
            !sources.session ||
            !sources.openingRequest ||
            !sources.content ||
            !sources.snapshot ||
            !sources.membership ||
            sources.session.currentVersion !== command.expectedSessionVersion ||
            sources.session.lifecycleStatus !== "DRAFT" ||
            sources.session.publicationStatus !== "NOT_READY" ||
            sources.content.contentVersion !== command.expectedContentVersion ||
            sources.content.status !== "COMPLETE" ||
            sources.snapshot.snapshotId !==
              command.expectedConfigurationSnapshotId ||
            sources.approvalPackageExists ||
            get().reviews.find((item) => item.reviewId === review.reviewId)
              ?.reviewVersion !== command.expectedReviewVersion
          )
            return commandFailure(
              "PERSISTENCE_ERROR",
              "Authoritative state changed before completion commit.",
              review,
            );
          const nextVersion = review.reviewVersion + 1;
          const completedBase = {
            ...review,
            reviewVersion: nextVersion,
            status: "COMPLETED" as const,
            readiness,
            completedBy: command.actorId,
            completedAt: time,
            updatedBy: command.actorId,
            updatedAt: time,
          };
          const completedHistory = makeHistory({
            review,
            reviewVersion: nextVersion,
            actorId: command.actorId,
            commandId: command.commandId,
            action: "CONTENT_REVIEW_COMPLETED",
            fromStatus: review.status,
            toStatus: "COMPLETED",
            readiness,
            reason:
              "Content Review completed only; Session remains DRAFT / NOT_READY and no Approval Package was created.",
            occurredAt: time,
          });
          const completed = freezeReview({
            ...completedBase,
            history: [...review.history, completedHistory],
          });
          const completionRecord = freezeCompletionRecord({
            completionRecordId: completionRecordIdFor(review.reviewId),
            recordVersion: 1,
            reviewId: review.reviewId,
            reviewVersion: nextVersion,
            sessionId: review.sessionId,
            sessionVersionAtCompletion: sources.session.currentVersion,
            openingRequestId: sources.openingRequest.requestId,
            openingRequestVersion: sources.openingRequest.version,
            configurationSnapshotId: sources.snapshot.snapshotId,
            configurationProposalVersion: sources.snapshot.proposalVersion,
            contentId: sources.content.contentId,
            contentVersion: sources.content.contentVersion,
            reviewedContentSnapshot: Object.freeze({
              auctionTitle: sources.content.workingContent.auctionTitle,
              auctionSummary: sources.content.workingContent.auctionSummary,
              sourceLineage: Object.freeze({
                ...sources.content.sourceLineage,
              }),
            }),
            readinessSnapshot: readiness,
            prototypeClassification:
              PROTOTYPE_CONTENT_POLICY.classification,
            completedBy: command.actorId,
            completedAt: time,
          });
          set((state) => ({
            reviews: state.reviews.map((item) =>
              item.reviewId === completed.reviewId ? completed : item,
            ),
            completionRecords: [
              ...state.completionRecords,
              completionRecord,
            ],
          }));
          return {
            ok: true,
            review: completed,
            completionRecord,
            created: true,
          };
        },
        resetDeterministicContentReviewState: () =>
          set({ reviews: [], completionRecords: [] }),
      }),
      {
        name: AUCTION_CONTENT_REVIEW_STORAGE_KEY,
        version: AUCTION_CONTENT_REVIEW_SCHEMA_VERSION,
        partialize: (state) => ({
          reviews: state.reviews,
          completionRecords: state.completionRecords,
        }),
        migrate: (persisted, version) =>
          version === AUCTION_CONTENT_REVIEW_SCHEMA_VERSION
            ? sanitizePersistedAuctionContentReviewState(persisted)
            : { reviews: [], completionRecords: [] },
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionContentReviewState(persisted),
        }),
      },
    ),
  );
