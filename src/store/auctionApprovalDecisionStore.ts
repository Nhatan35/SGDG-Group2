import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  collectAuthoritativeApprovalPackageSources,
  evaluateApprovalPackageValidation,
  getApprovalPackageEvidenceValidity,
  type AuctionApprovalPackage,
  type ApprovalPackageSubmissionRecord,
  useAuctionApprovalPackageStore,
} from "./auctionApprovalPackageStore";
import {
  getApprovalReviewQueue,
  type ApprovalReviewQueueItem,
  useAuctionApprovalReviewStore,
} from "./auctionApprovalReviewStore";
import { useAuctionSessionStore } from "./auctionSessionStore";

export const AUCTION_APPROVAL_DECISION_STORAGE_KEY =
  "sgdg-auction-approval-decisions-v1";
export const AUCTION_APPROVAL_DECISION_SCHEMA_VERSION = 1;
export const APPROVAL_DECISION_BLOCKED_BY_STALE_EVIDENCE =
  "APPROVAL_DECISION_BLOCKED_BY_STALE_EVIDENCE";
export const APPROVAL_REVIEW_NOT_APPROVABLE =
  "APPROVAL_REVIEW_NOT_APPROVABLE";
export const APPROVAL_DECISION_ALREADY_EXISTS =
  "APPROVAL_DECISION_ALREADY_EXISTS";
export const APPROVAL_DECISION_STALE_EVIDENCE_MESSAGE =
  "Evidence hiện hành không còn khớp với Approval Package và Approval Review. Không thể phê duyệt.";
export const APPROVAL_REVIEW_NOT_APPROVABLE_MESSAGE =
  "Approval Review chưa ở trạng thái hợp lệ để phê duyệt.";

export type ApprovalDecisionEvidenceValidity =
  | "CURRENT"
  | "STALE_AFTER_DECISION"
  | "INVALID";

export interface ApprovalDecisionValidationEvidence {
  readonly packageEvidenceValidity: "CURRENT";
  readonly reviewEvidenceValidity: "CURRENT";
  readonly contentId: string;
  readonly contentVersion: number;
  readonly configurationSnapshotId: string;
  readonly contentReviewCompletionRecordId: string;
  readonly evaluatedAt: string;
  readonly findingCodes: readonly string[];
}

export interface AuctionApprovalDecision {
  readonly decisionId: string;
  readonly decisionVersion: 1;
  readonly packageId: string;
  readonly packageVersion: number;
  readonly submissionRecordId: string;
  readonly approvalReviewId: string;
  readonly approvalReviewVersion: number;
  readonly sessionId: string;
  readonly sessionVersion: number;
  readonly outcome: "APPROVED";
  readonly validationEvidence: ApprovalDecisionValidationEvidence;
  readonly decidedBy: string;
  readonly decidedAt: string;
  readonly commandId: string;
}

export interface ApproveApprovalPackageCommand {
  approvalReviewId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedReviewVersion: number;
  expectedPackageVersion: number;
  expectedSessionVersion: number;
  commandId: string;
}

export type ApprovalDecisionCommandErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_COMMAND"
  | "APPROVAL_REVIEW_NOT_FOUND"
  | "STALE_REVIEW_VERSION"
  | "APPROVAL_PACKAGE_NOT_FOUND"
  | "APPROVAL_PACKAGE_NOT_SUBMITTED"
  | "STALE_PACKAGE_VERSION"
  | "SUBMISSION_RECORD_MISSING"
  | "SUBMISSION_RECORD_INVALID"
  | "SESSION_NOT_FOUND"
  | "STALE_SESSION_VERSION"
  | "INVALID_SESSION_STATE"
  | "INVALID_PUBLICATION_STATE"
  | "DYNAMIC_WORKFLOW_REQUIRED"
  | "LATER_PHASE_STATE_EXISTS"
  | typeof APPROVAL_DECISION_BLOCKED_BY_STALE_EVIDENCE
  | typeof APPROVAL_REVIEW_NOT_APPROVABLE
  | typeof APPROVAL_DECISION_ALREADY_EXISTS;

export type ApprovalDecisionCommandResult =
  | {
      ok: true;
      decision: AuctionApprovalDecision;
      created: boolean;
    }
  | {
      ok: false;
      code: ApprovalDecisionCommandErrorCode;
      message: string;
      decision?: AuctionApprovalDecision;
    };

export type ApprovalDecisionQueueState =
  | ApprovalReviewQueueItem["queueState"]
  | "APPROVED_DECISION_RECORDED"
  | "APPROVED_DECISION_EVIDENCE_STALE";

export interface ApprovalDecisionQueueItem
  extends Omit<ApprovalReviewQueueItem, "queueState"> {
  readonly queueState: ApprovalDecisionQueueState;
  readonly decisionId?: string;
  readonly decisionVersion?: 1;
  readonly decisionOutcome?: "APPROVED";
  readonly decisionEvidenceValidity?: ApprovalDecisionEvidenceValidity;
}

export type SessionApprovalProjection =
  | "NOT STARTED"
  | "APPROVED"
  | "APPROVED_DECISION_EVIDENCE_STALE"
  | "BLOCKED_BY_CONFIGURATION";

export interface AuctionApprovalDecisionState {
  decisions: AuctionApprovalDecision[];
  getDecisionById: (
    decisionId: string,
  ) => AuctionApprovalDecision | undefined;
  getDecisionByReviewId: (
    approvalReviewId: string,
  ) => AuctionApprovalDecision | undefined;
  approveApprovalPackage: (
    command: ApproveApprovalPackageCommand,
  ) => ApprovalDecisionCommandResult;
  resetDeterministicApprovalDecisionState: () => void;
}

const decisionIdFor = (approvalReviewId: string) =>
  `approval-decision-${approvalReviewId}`;
const deterministicDecisionTime = () =>
  new Date(Date.UTC(2026, 6, 26, 18, 1)).toISOString();
const validCommandId = (value: string) =>
  /^[A-Za-z0-9][A-Za-z0-9:._-]{2,499}$/.test(value);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
) => {
  const keys = Object.keys(value);
  return (
    required.every((key) => keys.includes(key)) &&
    keys.every((key) => required.includes(key))
  );
};
const positiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;
const validIsoTime = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const hasLaterPhaseState = (value: object) =>
  [
    "returnDecision",
    "rejectDecision",
    "returnedAt",
    "rejectedAt",
    "scheduleId",
    "scheduleVersion",
    "publicationId",
    "publishedAt",
    "registrationState",
    "registrationStatus",
    "eligibilityState",
    "eligibilityStatus",
  ].some((key) => Reflect.get(value, key) !== undefined);

const freezeDecision = (
  decision: AuctionApprovalDecision,
): AuctionApprovalDecision =>
  Object.freeze({
    ...decision,
    validationEvidence: Object.freeze({
      ...decision.validationEvidence,
      findingCodes: Object.freeze([
        ...decision.validationEvidence.findingCodes,
      ]),
    }),
  });

const validSubmissionForPackage = (
  packageValue: AuctionApprovalPackage,
  submission: ApprovalPackageSubmissionRecord | undefined,
) =>
  Boolean(
    submission &&
      submission.submissionRecordId === packageValue.submissionRecordId &&
      submission.packageId === packageValue.packageId &&
      submission.submittedPackageVersion === packageValue.packageVersion &&
      submission.sessionId === packageValue.sessionId &&
      submission.sessionVersion ===
        packageValue.evidence.session.sessionVersion &&
      submission.contentId === packageValue.evidence.auctionContent.contentId &&
      submission.contentVersion ===
        packageValue.evidence.auctionContent.contentVersion &&
      submission.configurationSnapshotId ===
        packageValue.evidence.configuration.snapshotId &&
      submission.configurationProposalVersion ===
        packageValue.evidence.configuration.proposalVersion &&
      submission.reviewId === packageValue.evidence.contentReview.reviewId &&
      submission.reviewVersion ===
        packageValue.evidence.contentReview.reviewVersion &&
      submission.completionRecordId ===
        packageValue.evidence.contentReview.completionRecordId,
  );

const failure = (
  code: ApprovalDecisionCommandErrorCode,
  message: string,
  decision?: AuctionApprovalDecision,
): ApprovalDecisionCommandResult => ({
  ok: false,
  code,
  message,
  ...(decision ? { decision } : {}),
});

export const evaluateApproveEligibility = ({
  command,
}: {
  command: ApproveApprovalPackageCommand;
}):
  | {
      eligible: true;
      review: NonNullable<
        ReturnType<
          typeof useAuctionApprovalReviewStore.getState
        >["reviews"][number]
      >;
      packageValue: AuctionApprovalPackage;
      submission: ApprovalPackageSubmissionRecord;
      session: NonNullable<
        ReturnType<typeof useAuctionSessionStore.getState>["sessions"][number]
      >;
    }
  | {
      eligible: false;
      code: ApprovalDecisionCommandErrorCode;
      message: string;
    } => {
  if (command.actorRole !== "ADMIN")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Chỉ ADMIN được phê duyệt Approval Package.",
    };
  if (!validCommandId(command.commandId))
    return {
      eligible: false,
      code: "INVALID_COMMAND",
      message: "Command ID không hợp lệ.",
    };
  const review = useAuctionApprovalReviewStore
    .getState()
    .reviews.find((item) => item.reviewId === command.approvalReviewId);
  if (!review)
    return {
      eligible: false,
      code: "APPROVAL_REVIEW_NOT_FOUND",
      message: "Không tìm thấy Approval Review.",
    };
  if (review.status !== "IN_REVIEW")
    return {
      eligible: false,
      code: APPROVAL_REVIEW_NOT_APPROVABLE,
      message: APPROVAL_REVIEW_NOT_APPROVABLE_MESSAGE,
    };
  if (review.reviewVersion !== command.expectedReviewVersion)
    return {
      eligible: false,
      code: "STALE_REVIEW_VERSION",
      message: "Approval Review version đã thay đổi.",
    };
  if (!review.currentEvidenceValidation.validForReview)
    return {
      eligible: false,
      code: APPROVAL_DECISION_BLOCKED_BY_STALE_EVIDENCE,
      message: APPROVAL_DECISION_STALE_EVIDENCE_MESSAGE,
    };
  const packageValue = useAuctionApprovalPackageStore
    .getState()
    .packages.find((item) => item.packageId === review.packageId);
  if (!packageValue)
    return {
      eligible: false,
      code: "APPROVAL_PACKAGE_NOT_FOUND",
      message: "Không tìm thấy submitted Approval Package.",
    };
  if (packageValue.status !== "SUBMITTED")
    return {
      eligible: false,
      code: "APPROVAL_PACKAGE_NOT_SUBMITTED",
      message: "Approval Package phải giữ trạng thái SUBMITTED.",
    };
  if (packageValue.packageVersion !== command.expectedPackageVersion)
    return {
      eligible: false,
      code: "STALE_PACKAGE_VERSION",
      message: "Approval Package version đã thay đổi.",
    };
  const submission = useAuctionApprovalPackageStore
    .getState()
    .submissionRecords.find(
      (item) => item.submissionRecordId === review.submissionRecordId,
    );
  if (!submission)
    return {
      eligible: false,
      code: "SUBMISSION_RECORD_MISSING",
      message: "Không tìm thấy Submission Record.",
    };
  if (!validSubmissionForPackage(packageValue, submission))
    return {
      eligible: false,
      code: "SUBMISSION_RECORD_INVALID",
      message: "Submission Record không khớp submitted Package.",
    };
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === review.sessionId);
  if (!session)
    return {
      eligible: false,
      code: "SESSION_NOT_FOUND",
      message: "Không tìm thấy Auction Session.",
    };
  if (
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    session.creationSource !== "OPENING_REQUEST" ||
    session.managementMode !== "CUSTOMER_REQUESTED" ||
    packageValue.sessionId !== session.sessionId ||
    review.packageId !== packageValue.packageId ||
    review.submissionRecordId !== submission.submissionRecordId
  )
    return {
      eligible: false,
      code: "DYNAMIC_WORKFLOW_REQUIRED",
      message: "Chỉ dynamic Customer-requested Approval Review được phê duyệt.",
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
  if (session.currentVersion !== command.expectedSessionVersion)
    return {
      eligible: false,
      code: "STALE_SESSION_VERSION",
      message: "Session version đã thay đổi.",
    };
  if (
    review.startEvidence.packageId !== packageValue.packageId ||
    review.startEvidence.packageVersion !== packageValue.packageVersion ||
    review.startEvidence.submissionRecordId !==
      submission.submissionRecordId ||
    review.startEvidence.sessionId !== session.sessionId ||
    review.startEvidence.sessionVersion !== session.currentVersion ||
    hasLaterPhaseState(packageValue) ||
    hasLaterPhaseState(review) ||
    hasLaterPhaseState(session)
  )
    return {
      eligible: false,
      code: "LATER_PHASE_STATE_EXISTS",
      message: "Phát hiện state ngoài phạm vi Approve-only.",
    };
  const sources = collectAuthoritativeApprovalPackageSources(
    packageValue.sessionId,
  );
  const validation = evaluateApprovalPackageValidation({
    evidence: packageValue.evidence,
    sources,
    evaluatedAt: deterministicDecisionTime(),
  });
  if (
    !validation.readyToSubmit ||
    getApprovalPackageEvidenceValidity(packageValue) !== "CURRENT"
  )
    return {
      eligible: false,
      code: APPROVAL_DECISION_BLOCKED_BY_STALE_EVIDENCE,
      message: APPROVAL_DECISION_STALE_EVIDENCE_MESSAGE,
    };
  return {
    eligible: true,
    review,
    packageValue,
    submission,
    session,
  };
};

export const getApprovalDecisionEvidenceValidity = (
  decision: AuctionApprovalDecision,
): ApprovalDecisionEvidenceValidity => {
  const packageValue = useAuctionApprovalPackageStore
    .getState()
    .packages.find((item) => item.packageId === decision.packageId);
  const review = useAuctionApprovalReviewStore
    .getState()
    .reviews.find((item) => item.reviewId === decision.approvalReviewId);
  const submission = useAuctionApprovalPackageStore
    .getState()
    .submissionRecords.find(
      (item) => item.submissionRecordId === decision.submissionRecordId,
    );
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === decision.sessionId);
  if (
    !packageValue ||
    packageValue.status !== "SUBMITTED" ||
    !review ||
    !submission ||
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    packageValue.packageId !== review.packageId ||
    packageValue.packageVersion !== decision.packageVersion ||
    review.reviewVersion < decision.approvalReviewVersion ||
    submission.packageId !== decision.packageId ||
    session.sessionId !== packageValue.sessionId ||
    !validSubmissionForPackage(packageValue, submission)
  )
    return "INVALID";
  if (
    session.lifecycleStatus !== "DRAFT" ||
    session.publicationStatus !== "NOT_READY" ||
    getApprovalPackageEvidenceValidity(packageValue) !== "CURRENT" ||
    review.status !== "IN_REVIEW" ||
    !review.currentEvidenceValidation.validForReview
  )
    return "STALE_AFTER_DECISION";
  return "CURRENT";
};

export const getApprovalDecisionQueue =
  (): readonly ApprovalDecisionQueueItem[] => {
    const decisions = useAuctionApprovalDecisionStore.getState().decisions;
    return getApprovalReviewQueue().map((item) => {
      const decision = decisions.find(
        (candidate) => candidate.packageId === item.packageId,
      );
      if (!decision) return item;
      const decisionEvidenceValidity =
        getApprovalDecisionEvidenceValidity(decision);
      return Object.freeze({
        ...item,
        queueState:
          decisionEvidenceValidity === "CURRENT"
            ? ("APPROVED_DECISION_RECORDED" as const)
            : ("APPROVED_DECISION_EVIDENCE_STALE" as const),
        decisionId: decision.decisionId,
        decisionVersion: decision.decisionVersion,
        decisionOutcome: decision.outcome,
        decisionEvidenceValidity,
      });
    });
  };

export const getSessionApprovalProjection = (
  sessionId: string,
): SessionApprovalProjection => {
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === sessionId);
  if (session?.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return "BLOCKED_BY_CONFIGURATION";
  const decision = useAuctionApprovalDecisionStore
    .getState()
    .decisions.find((item) => item.sessionId === sessionId);
  if (!decision) return "NOT STARTED";
  return getApprovalDecisionEvidenceValidity(decision) === "CURRENT"
    ? "APPROVED"
    : "APPROVED_DECISION_EVIDENCE_STALE";
};

const forbiddenPersistenceKeys = new Set([
  "returnedAt",
  "returnReason",
  "returnInstructions",
  "rejectedAt",
  "rejectionReason",
  "comment",
  "comments",
  "reason",
  "recommendation",
  "assignedTo",
  "claimedBy",
  "secondApprover",
  "schedule",
  "scheduleId",
  "publication",
  "publicationId",
  "registration",
  "eligibility",
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

const validValidationEvidence = (value: unknown) =>
  isRecord(value) &&
  exactKeys(value, [
    "packageEvidenceValidity",
    "reviewEvidenceValidity",
    "contentId",
    "contentVersion",
    "configurationSnapshotId",
    "contentReviewCompletionRecordId",
    "evaluatedAt",
    "findingCodes",
  ]) &&
  value.packageEvidenceValidity === "CURRENT" &&
  value.reviewEvidenceValidity === "CURRENT" &&
  typeof value.contentId === "string" &&
  positiveInteger(value.contentVersion) &&
  typeof value.configurationSnapshotId === "string" &&
  typeof value.contentReviewCompletionRecordId === "string" &&
  validIsoTime(value.evaluatedAt) &&
  Array.isArray(value.findingCodes) &&
  value.findingCodes.length === 0;

const sanitizeDecision = (
  value: unknown,
): AuctionApprovalDecision | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenPersistenceKey(value) ||
    !exactKeys(value, [
      "decisionId",
      "decisionVersion",
      "packageId",
      "packageVersion",
      "submissionRecordId",
      "approvalReviewId",
      "approvalReviewVersion",
      "sessionId",
      "sessionVersion",
      "outcome",
      "validationEvidence",
      "decidedBy",
      "decidedAt",
      "commandId",
    ]) ||
    typeof value.approvalReviewId !== "string" ||
    value.decisionId !== decisionIdFor(value.approvalReviewId) ||
    value.decisionVersion !== 1 ||
    typeof value.packageId !== "string" ||
    positiveInteger(value.packageVersion) === false ||
    typeof value.submissionRecordId !== "string" ||
    positiveInteger(value.approvalReviewVersion) === false ||
    typeof value.sessionId !== "string" ||
    positiveInteger(value.sessionVersion) === false ||
    value.outcome !== "APPROVED" ||
    !validValidationEvidence(value.validationEvidence) ||
    typeof value.decidedBy !== "string" ||
    !validIsoTime(value.decidedAt) ||
    typeof value.commandId !== "string" ||
    !validCommandId(value.commandId)
  )
    return undefined;
  const review = useAuctionApprovalReviewStore
    .getState()
    .reviews.find((item) => item.reviewId === value.approvalReviewId);
  const packageValue = useAuctionApprovalPackageStore
    .getState()
    .packages.find((item) => item.packageId === value.packageId);
  const submission = useAuctionApprovalPackageStore
    .getState()
    .submissionRecords.find(
      (item) => item.submissionRecordId === value.submissionRecordId,
    );
  const session = useAuctionSessionStore
    .getState()
    .sessions.find((item) => item.sessionId === value.sessionId);
  if (
    !review ||
    review.status !== "IN_REVIEW" ||
    !packageValue ||
    packageValue.status !== "SUBMITTED" ||
    !submission ||
    !session ||
    session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    review.packageId !== packageValue.packageId ||
    review.submissionRecordId !== submission.submissionRecordId ||
    review.sessionId !== session.sessionId ||
    packageValue.packageVersion !== value.packageVersion ||
    review.reviewVersion < (value.approvalReviewVersion as number) ||
    session.currentVersion !== value.sessionVersion ||
    !validSubmissionForPackage(packageValue, submission)
  )
    return undefined;
  const evidence = value.validationEvidence as Record<string, unknown>;
  if (
    evidence.contentId !== packageValue.evidence.auctionContent.contentId ||
    evidence.contentVersion !==
      packageValue.evidence.auctionContent.contentVersion ||
    evidence.configurationSnapshotId !==
      packageValue.evidence.configuration.snapshotId ||
    evidence.contentReviewCompletionRecordId !==
      packageValue.evidence.contentReview.completionRecordId
  )
    return undefined;
  return freezeDecision(value as unknown as AuctionApprovalDecision);
};

export const sanitizePersistedAuctionApprovalDecisionState = (
  persisted: unknown,
): Pick<AuctionApprovalDecisionState, "decisions"> => {
  const empty = { decisions: [] as AuctionApprovalDecision[] };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["decisions"]) ||
    !Array.isArray(persisted.decisions)
  )
    return empty;
  const decisions = persisted.decisions.map(sanitizeDecision);
  if (decisions.some((decision) => !decision)) return empty;
  const safe = decisions.filter(
    (decision): decision is AuctionApprovalDecision => Boolean(decision),
  );
  if (
    new Set(safe.map((decision) => decision.decisionId)).size !== safe.length ||
    new Set(safe.map((decision) => decision.approvalReviewId)).size !==
      safe.length ||
    new Set(safe.map((decision) => decision.packageId)).size !== safe.length
  )
    return empty;
  return { decisions: safe };
};

export const useAuctionApprovalDecisionStore =
  create<AuctionApprovalDecisionState>()(
    persist(
      (set, get) => ({
        decisions: [],
        getDecisionById: (decisionId) =>
          get().decisions.find(
            (decision) => decision.decisionId === decisionId,
          ),
        getDecisionByReviewId: (approvalReviewId) =>
          get().decisions.find(
            (decision) =>
              decision.approvalReviewId === approvalReviewId,
          ),
        approveApprovalPackage: (command) => {
          if (command.actorRole !== "ADMIN")
            return failure(
              "ACCESS_DENIED",
              "Chỉ ADMIN được phê duyệt Approval Package.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID không hợp lệ.");
          const sameCommand = get().decisions.find(
            (decision) => decision.commandId === command.commandId,
          );
          if (sameCommand)
            return { ok: true, decision: sameCommand, created: false };
          const existing = get().decisions.find(
            (decision) =>
              decision.approvalReviewId === command.approvalReviewId,
          );
          if (existing)
            return failure(
              APPROVAL_DECISION_ALREADY_EXISTS,
              "Approval Decision đã tồn tại.",
              existing,
            );
          let eligibility = evaluateApproveEligibility({ command });
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);

          // Re-read all authority immediately before the immutable commit.
          eligibility = evaluateApproveEligibility({ command });
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);
          const duplicate = get().decisions.find(
            (decision) =>
              decision.approvalReviewId === command.approvalReviewId ||
              decision.packageId === eligibility.packageValue.packageId,
          );
          if (duplicate)
            return failure(
              APPROVAL_DECISION_ALREADY_EXISTS,
              "Approval Decision đã tồn tại.",
              duplicate,
            );
          const evaluatedAt = deterministicDecisionTime();
          const decision = freezeDecision({
            decisionId: decisionIdFor(eligibility.review.reviewId),
            decisionVersion: 1,
            packageId: eligibility.packageValue.packageId,
            packageVersion: eligibility.packageValue.packageVersion,
            submissionRecordId:
              eligibility.submission.submissionRecordId,
            approvalReviewId: eligibility.review.reviewId,
            approvalReviewVersion: eligibility.review.reviewVersion,
            sessionId: eligibility.session.sessionId,
            sessionVersion: eligibility.session.currentVersion,
            outcome: "APPROVED",
            validationEvidence: {
              packageEvidenceValidity: "CURRENT",
              reviewEvidenceValidity: "CURRENT",
              contentId:
                eligibility.packageValue.evidence.auctionContent.contentId,
              contentVersion:
                eligibility.packageValue.evidence.auctionContent.contentVersion,
              configurationSnapshotId:
                eligibility.packageValue.evidence.configuration.snapshotId,
              contentReviewCompletionRecordId:
                eligibility.packageValue.evidence.contentReview
                  .completionRecordId,
              evaluatedAt,
              findingCodes: [],
            },
            decidedBy: command.actorId,
            decidedAt: evaluatedAt,
            commandId: command.commandId,
          });
          set({ decisions: [...get().decisions, decision] });
          return { ok: true, decision, created: true };
        },
        resetDeterministicApprovalDecisionState: () =>
          set({ decisions: [] }),
      }),
      {
        name: AUCTION_APPROVAL_DECISION_STORAGE_KEY,
        version: AUCTION_APPROVAL_DECISION_SCHEMA_VERSION,
        partialize: (state) => ({ decisions: state.decisions }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionApprovalDecisionState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
