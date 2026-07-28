import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";
import {
  collectAuthoritativeApprovalPackageSources,
  evaluateApprovalPackageValidation,
  getApprovalPackageEvidenceValidity,
  type ApprovalPackageEvidenceValidity,
  type AuctionApprovalPackage,
  type ApprovalPackageSubmissionRecord,
  useAuctionApprovalPackageStore,
} from "./auctionApprovalPackageStore";
import { useAuctionSessionStore } from "./auctionSessionStore";

export const AUCTION_APPROVAL_REVIEW_STORAGE_KEY =
  "sgdg-auction-approval-reviews-v1";
export const AUCTION_APPROVAL_REVIEW_SCHEMA_VERSION = 1;
export const APPROVAL_REVIEW_BLOCKED_BY_STALE_PACKAGE_EVIDENCE =
  "APPROVAL_REVIEW_BLOCKED_BY_STALE_PACKAGE_EVIDENCE";
export const APPROVAL_REVIEW_BLOCKED_BY_INVALID_PACKAGE =
  "APPROVAL_REVIEW_BLOCKED_BY_INVALID_PACKAGE";
export const APPROVAL_REVIEW_BLOCKED_BY_CONFIGURATION =
  "APPROVAL_REVIEW_BLOCKED_BY_CONFIGURATION";
export const STALE_PACKAGE_EVIDENCE_MESSAGE =
  "Approval Package đã được gửi nhưng evidence hiện hành không còn khớp với Package đã nộp. Không thể bắt đầu xem xét.";
export const INVALID_PACKAGE_MESSAGE =
  "Approval Package hoặc Submission Record không hợp lệ. Không thể bắt đầu Approval Review.";
export const REVIEW_CONFIGURATION_BLOCKER_MESSAGE =
  "Phiên SGDG-managed chưa có Approval Package hợp lệ. Không thể bắt đầu Approval Review.";

export type AuctionApprovalReviewStatus = "IN_REVIEW" | "STALE" | "BLOCKED";
export type ApprovalReviewQueueState =
  | "AWAITING_ADMIN_REVIEW"
  | "IN_REVIEW"
  | "REVIEW_INTAKE_BLOCKED_STALE_EVIDENCE"
  | "IN_REVIEW_EVIDENCE_STALE"
  | "REVIEW_BLOCKED_INVALID_EVIDENCE";

export interface ApprovalReviewStartEvidence {
  readonly packageId: string;
  readonly packageVersion: number;
  readonly submissionRecordId: string;
  readonly sessionId: string;
  readonly sessionVersion: number;
  readonly contentId: string;
  readonly contentVersion: number;
  readonly configurationSnapshotId: string;
  readonly contentReviewCompletionRecordId: string;
  readonly packageEvidenceValidity: "CURRENT";
  readonly evaluatedAt: string;
}

export interface ApprovalReviewCurrentEvidenceValidation {
  readonly validForReview: boolean;
  readonly findingCodes: readonly string[];
  readonly evaluatedAt: string;
}

export type ApprovalReviewHistoryAction =
  | "APPROVAL_REVIEW_STARTED"
  | "APPROVAL_REVIEW_EVIDENCE_REVALIDATED";

export interface ApprovalReviewHistoryEntry {
  readonly historyId: string;
  readonly reviewId: string;
  readonly reviewVersion: number;
  readonly action: ApprovalReviewHistoryAction;
  readonly actorId: string;
  readonly actorRole: "ADMIN";
  readonly commandId: string;
  readonly resultingStatus: AuctionApprovalReviewStatus;
  readonly findingCodes: readonly string[];
  readonly occurredAt: string;
  readonly visibility: "STAFF_ONLY";
}

export interface AuctionApprovalReview {
  readonly reviewId: string;
  readonly reviewVersion: number;
  readonly packageId: string;
  readonly packageVersionAtStart: number;
  readonly submissionRecordId: string;
  readonly sessionId: string;
  readonly sessionVersionAtStart: number;
  readonly status: AuctionApprovalReviewStatus;
  readonly startEvidence: ApprovalReviewStartEvidence;
  readonly currentEvidenceValidation: ApprovalReviewCurrentEvidenceValidation;
  readonly startedBy: string;
  readonly startedAt: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
  readonly history: readonly ApprovalReviewHistoryEntry[];
}

export type ApprovalReviewCommandErrorCode =
  | "ACCESS_DENIED"
  | "INVALID_COMMAND"
  | "APPROVAL_PACKAGE_NOT_FOUND"
  | "APPROVAL_PACKAGE_NOT_SUBMITTED"
  | "STALE_PACKAGE_VERSION"
  | "SUBMISSION_RECORD_MISSING"
  | "SUBMISSION_RECORD_MISMATCH"
  | "STALE_SUBMISSION_RECORD"
  | "SESSION_NOT_FOUND"
  | "STALE_SESSION_VERSION"
  | "INVALID_SESSION_STATE"
  | "LATER_PHASE_STATE_EXISTS"
  | "APPROVAL_REVIEW_NOT_FOUND"
  | "STALE_REVIEW_VERSION"
  | "APPROVAL_REVIEW_ALREADY_STARTED"
  | typeof APPROVAL_REVIEW_BLOCKED_BY_STALE_PACKAGE_EVIDENCE
  | typeof APPROVAL_REVIEW_BLOCKED_BY_INVALID_PACKAGE
  | typeof APPROVAL_REVIEW_BLOCKED_BY_CONFIGURATION;

export interface StartApprovalReviewCommand {
  packageId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedPackageVersion: number;
  expectedSubmissionRecordId: string;
  expectedSessionVersion: number;
  commandId: string;
}

export interface RevalidateApprovalReviewEvidenceCommand {
  reviewId: string;
  actorId: string;
  actorRole: ActorRole;
  expectedReviewVersion: number;
  commandId: string;
}

export type ApprovalReviewCommandResult =
  | {
      ok: true;
      review: AuctionApprovalReview;
      created: boolean;
      changed: boolean;
    }
  | {
      ok: false;
      code: ApprovalReviewCommandErrorCode;
      message: string;
      review?: AuctionApprovalReview;
    };

export interface ApprovalReviewQueueItem {
  readonly packageId: string;
  readonly sessionId: string;
  readonly sessionCode: string;
  readonly creationSource: "OPENING_REQUEST";
  readonly managementMode: "CUSTOMER_REQUESTED";
  readonly submittedPackageVersion: number;
  readonly submissionRecordId: string;
  readonly contentVersion: number;
  readonly configurationSnapshotId: string;
  readonly completionRecordId: string;
  readonly submittedBy: string;
  readonly submittedAt: string;
  readonly evidenceValidity: ApprovalPackageEvidenceValidity;
  readonly queueState: ApprovalReviewQueueState;
  readonly reviewId?: string;
  readonly reviewVersion?: number;
  readonly reviewStatus?: AuctionApprovalReviewStatus;
}

export interface AuctionApprovalReviewState {
  reviews: AuctionApprovalReview[];
  getReviewById: (reviewId: string) => AuctionApprovalReview | undefined;
  getReviewByPackageId: (
    packageId: string,
  ) => AuctionApprovalReview | undefined;
  startApprovalReview: (
    command: StartApprovalReviewCommand,
  ) => ApprovalReviewCommandResult;
  revalidateApprovalReviewEvidence: (
    command: RevalidateApprovalReviewEvidenceCommand,
  ) => ApprovalReviewCommandResult;
  resetDeterministicApprovalReviewState: () => void;
}

type EvidenceClassification =
  | { kind: "CURRENT"; findingCodes: readonly string[] }
  | { kind: "STALE"; findingCodes: readonly string[] }
  | { kind: "INVALID"; findingCodes: readonly string[] };

const reviewIdFor = (packageId: string) => `approval-review-${packageId}`;
const deterministicTime = (reviewVersion: number, offset = 0) =>
  new Date(Date.UTC(2026, 6, 26, 16, reviewVersion, offset)).toISOString();
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
    "approvalDecision",
    "decision",
    "outcome",
    "approvedAt",
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

const freezeReview = (review: AuctionApprovalReview): AuctionApprovalReview =>
  Object.freeze({
    ...review,
    startEvidence: Object.freeze({ ...review.startEvidence }),
    currentEvidenceValidation: Object.freeze({
      ...review.currentEvidenceValidation,
      findingCodes: Object.freeze([
        ...review.currentEvidenceValidation.findingCodes,
      ]),
    }),
    history: Object.freeze(
      review.history.map((entry) =>
        Object.freeze({
          ...entry,
          findingCodes: Object.freeze([...entry.findingCodes]),
        }),
      ),
    ),
  });

const validSubmissionForPackage = (
  packageValue: AuctionApprovalPackage,
  submission: ApprovalPackageSubmissionRecord | undefined,
) =>
  Boolean(
    submission &&
      packageValue.submissionRecordId === submission.submissionRecordId &&
      submission.packageId === packageValue.packageId &&
      submission.submittedPackageVersion === packageValue.packageVersion &&
      submission.sessionId === packageValue.sessionId &&
      submission.sessionVersion === packageValue.evidence.session.sessionVersion &&
      submission.contentId === packageValue.evidence.auctionContent.contentId &&
      submission.contentVersion ===
        packageValue.evidence.auctionContent.contentVersion &&
      submission.configurationSnapshotId ===
        packageValue.evidence.configuration.snapshotId &&
      submission.completionRecordId ===
        packageValue.evidence.contentReview.completionRecordId,
  );

const classifyPackageEvidence = (
  packageValue: AuctionApprovalPackage | undefined,
  submission: ApprovalPackageSubmissionRecord | undefined,
): EvidenceClassification => {
  if (
    !packageValue ||
    packageValue.status !== "SUBMITTED" ||
    hasLaterPhaseState(packageValue) ||
    !validSubmissionForPackage(packageValue, submission)
  )
    return { kind: "INVALID", findingCodes: ["PACKAGE_EVIDENCE_INVALID"] };
  const sources = collectAuthoritativeApprovalPackageSources(
    packageValue.sessionId,
  );
  if (
    !sources.session ||
    sources.session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
    sources.session.creationSource !== "OPENING_REQUEST" ||
    sources.session.managementMode !== "CUSTOMER_REQUESTED" ||
    sources.session.lifecycleStatus !== "DRAFT" ||
    sources.session.publicationStatus !== "NOT_READY" ||
    hasLaterPhaseState(sources.session)
  )
    return { kind: "INVALID", findingCodes: ["PACKAGE_EVIDENCE_INVALID"] };
  const validation = evaluateApprovalPackageValidation({
    evidence: packageValue.evidence,
    sources,
    evaluatedAt: deterministicTime(packageValue.packageVersion),
  });
  if (!validation.readyToSubmit)
    return {
      kind: "STALE",
      findingCodes: Object.freeze(
        validation.findings.length
          ? validation.findings.map((finding) => finding.code)
          : ["PACKAGE_EVIDENCE_STALE_AFTER_SUBMISSION"],
      ),
    };
  return { kind: "CURRENT", findingCodes: Object.freeze([]) };
};

export const evaluateApprovalReviewEligibility = ({
  packageValue,
  submission,
  actorRole,
}: {
  packageValue: AuctionApprovalPackage | undefined;
  submission: ApprovalPackageSubmissionRecord | undefined;
  actorRole: ActorRole;
}):
  | { eligible: true }
  | {
      eligible: false;
      code: ApprovalReviewCommandErrorCode;
      message: string;
    } => {
  if (actorRole !== "ADMIN")
    return {
      eligible: false,
      code: "ACCESS_DENIED",
      message: "Chỉ ADMIN được bắt đầu Approval Review.",
    };
  const classification = classifyPackageEvidence(packageValue, submission);
  if (classification.kind === "STALE")
    return {
      eligible: false,
      code: APPROVAL_REVIEW_BLOCKED_BY_STALE_PACKAGE_EVIDENCE,
      message: STALE_PACKAGE_EVIDENCE_MESSAGE,
    };
  if (classification.kind === "INVALID")
    return {
      eligible: false,
      code: APPROVAL_REVIEW_BLOCKED_BY_INVALID_PACKAGE,
      message: INVALID_PACKAGE_MESSAGE,
    };
  return { eligible: true };
};

const failure = (
  code: ApprovalReviewCommandErrorCode,
  message: string,
  review?: AuctionApprovalReview,
): ApprovalReviewCommandResult => ({
  ok: false,
  code,
  message,
  ...(review ? { review } : {}),
});

const statuses: readonly AuctionApprovalReviewStatus[] = [
  "IN_REVIEW",
  "STALE",
  "BLOCKED",
];
const actions: readonly ApprovalReviewHistoryAction[] = [
  "APPROVAL_REVIEW_STARTED",
  "APPROVAL_REVIEW_EVIDENCE_REVALIDATED",
];
const forbiddenKeys = new Set([
  "decision",
  "outcome",
  "recommendation",
  "comment",
  "comments",
  "reason",
  "assignedTo",
  "claimedBy",
  "approvedAt",
  "returnedAt",
  "rejectedAt",
  "scheduleId",
  "schedule",
  "publicationId",
  "publication",
  "registration",
  "eligibility",
]);
const containsForbiddenKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      forbiddenKeys.has(key) || containsForbiddenKey(nested),
  );
};

const validStartEvidence = (
  value: unknown,
  review: Record<string, unknown>,
) =>
  isRecord(value) &&
  exactKeys(value, [
    "packageId",
    "packageVersion",
    "submissionRecordId",
    "sessionId",
    "sessionVersion",
    "contentId",
    "contentVersion",
    "configurationSnapshotId",
    "contentReviewCompletionRecordId",
    "packageEvidenceValidity",
    "evaluatedAt",
  ]) &&
  value.packageId === review.packageId &&
  value.packageVersion === review.packageVersionAtStart &&
  value.submissionRecordId === review.submissionRecordId &&
  value.sessionId === review.sessionId &&
  value.sessionVersion === review.sessionVersionAtStart &&
  typeof value.contentId === "string" &&
  positiveInteger(value.contentVersion) &&
  typeof value.configurationSnapshotId === "string" &&
  typeof value.contentReviewCompletionRecordId === "string" &&
  value.packageEvidenceValidity === "CURRENT" &&
  validIsoTime(value.evaluatedAt);

const validCurrentValidation = (value: unknown) =>
  isRecord(value) &&
  exactKeys(value, ["validForReview", "findingCodes", "evaluatedAt"]) &&
  typeof value.validForReview === "boolean" &&
  Array.isArray(value.findingCodes) &&
  value.findingCodes.every((code) => typeof code === "string") &&
  validIsoTime(value.evaluatedAt);

const validHistory = (
  value: unknown,
  reviewId: string,
  maximumVersion: number,
) =>
  isRecord(value) &&
  exactKeys(value, [
    "historyId",
    "reviewId",
    "reviewVersion",
    "action",
    "actorId",
    "actorRole",
    "commandId",
    "resultingStatus",
    "findingCodes",
    "occurredAt",
    "visibility",
  ]) &&
  typeof value.historyId === "string" &&
  value.reviewId === reviewId &&
  positiveInteger(value.reviewVersion) &&
  value.reviewVersion <= maximumVersion &&
  actions.includes(value.action as ApprovalReviewHistoryAction) &&
  typeof value.actorId === "string" &&
  value.actorRole === "ADMIN" &&
  typeof value.commandId === "string" &&
  validCommandId(value.commandId) &&
  statuses.includes(value.resultingStatus as AuctionApprovalReviewStatus) &&
  Array.isArray(value.findingCodes) &&
  value.findingCodes.every((code) => typeof code === "string") &&
  validIsoTime(value.occurredAt) &&
  value.visibility === "STAFF_ONLY";

const sanitizeReview = (
  value: unknown,
): AuctionApprovalReview | undefined => {
  if (
    !isRecord(value) ||
    containsForbiddenKey(value) ||
    !exactKeys(value, [
      "reviewId",
      "reviewVersion",
      "packageId",
      "packageVersionAtStart",
      "submissionRecordId",
      "sessionId",
      "sessionVersionAtStart",
      "status",
      "startEvidence",
      "currentEvidenceValidation",
      "startedBy",
      "startedAt",
      "updatedBy",
      "updatedAt",
      "history",
    ]) ||
    typeof value.packageId !== "string" ||
    value.reviewId !== reviewIdFor(value.packageId) ||
    positiveInteger(value.reviewVersion) === false ||
    positiveInteger(value.packageVersionAtStart) === false ||
    typeof value.submissionRecordId !== "string" ||
    typeof value.sessionId !== "string" ||
    positiveInteger(value.sessionVersionAtStart) === false ||
    !statuses.includes(value.status as AuctionApprovalReviewStatus) ||
    !validStartEvidence(value.startEvidence, value) ||
    !validCurrentValidation(value.currentEvidenceValidation) ||
    typeof value.startedBy !== "string" ||
    !validIsoTime(value.startedAt) ||
    typeof value.updatedBy !== "string" ||
    !validIsoTime(value.updatedAt) ||
    !Array.isArray(value.history) ||
    !value.history.every((entry) =>
      validHistory(entry, value.reviewId as string, value.reviewVersion as number),
    ) ||
    value.history[0]?.action !== "APPROVAL_REVIEW_STARTED"
  )
    return undefined;
  const packageValue = useAuctionApprovalPackageStore
    .getState()
    .packages.find((item) => item.packageId === value.packageId);
  const submission = useAuctionApprovalPackageStore
    .getState()
    .submissionRecords.find(
      (item) => item.submissionRecordId === value.submissionRecordId,
    );
  if (
    !packageValue ||
    packageValue.status !== "SUBMITTED" ||
    packageValue.sessionId !== value.sessionId ||
    !validSubmissionForPackage(packageValue, submission) ||
    packageValue.evidence.auctionContent.contentId !==
      Reflect.get(value.startEvidence as object, "contentId") ||
    packageValue.evidence.configuration.snapshotId !==
      Reflect.get(value.startEvidence as object, "configurationSnapshotId") ||
    packageValue.evidence.contentReview.completionRecordId !==
      Reflect.get(
        value.startEvidence as object,
        "contentReviewCompletionRecordId",
      )
  )
    return undefined;
  return freezeReview(value as unknown as AuctionApprovalReview);
};

export const sanitizePersistedAuctionApprovalReviewState = (
  persisted: unknown,
): Pick<AuctionApprovalReviewState, "reviews"> => {
  const empty = { reviews: [] as AuctionApprovalReview[] };
  if (
    !isRecord(persisted) ||
    !exactKeys(persisted, ["reviews"]) ||
    !Array.isArray(persisted.reviews)
  )
    return empty;
  const reviews = persisted.reviews.map(sanitizeReview);
  if (reviews.some((review) => !review)) return empty;
  const safe = reviews.filter(
    (review): review is AuctionApprovalReview => Boolean(review),
  );
  if (
    new Set(safe.map((review) => review.reviewId)).size !== safe.length ||
    new Set(safe.map((review) => review.packageId)).size !== safe.length
  )
    return empty;
  return { reviews: safe };
};

export const getApprovalReviewQueue =
  (): readonly ApprovalReviewQueueItem[] => {
    const packageState = useAuctionApprovalPackageStore.getState();
    const reviews = useAuctionApprovalReviewStore.getState().reviews;
    return packageState.packages
      .filter((packageValue) => packageValue.status === "SUBMITTED")
      .flatMap((packageValue) => {
        const submission = packageState.submissionRecords.find(
          (item) => item.packageId === packageValue.packageId,
        );
        if (!submission) return [];
        const review = reviews.find(
          (item) => item.packageId === packageValue.packageId,
        );
        const validity = getApprovalPackageEvidenceValidity(packageValue);
        const queueState: ApprovalReviewQueueState = review
          ? review.status === "BLOCKED"
            ? "REVIEW_BLOCKED_INVALID_EVIDENCE"
            : review.status === "STALE" || validity !== "CURRENT"
              ? "IN_REVIEW_EVIDENCE_STALE"
              : "IN_REVIEW"
          : validity === "CURRENT"
            ? "AWAITING_ADMIN_REVIEW"
            : "REVIEW_INTAKE_BLOCKED_STALE_EVIDENCE";
        return [
          Object.freeze({
            packageId: packageValue.packageId,
            sessionId: packageValue.sessionId,
            sessionCode: packageValue.evidence.session.sessionCode,
            creationSource: "OPENING_REQUEST" as const,
            managementMode: "CUSTOMER_REQUESTED" as const,
            submittedPackageVersion: submission.submittedPackageVersion,
            submissionRecordId: submission.submissionRecordId,
            contentVersion: submission.contentVersion,
            configurationSnapshotId: submission.configurationSnapshotId,
            completionRecordId: submission.completionRecordId,
            submittedBy: submission.submittedBy,
            submittedAt: submission.submittedAt,
            evidenceValidity: validity,
            queueState,
            ...(review
              ? {
                  reviewId: review.reviewId,
                  reviewVersion: review.reviewVersion,
                  reviewStatus: review.status,
                }
              : {}),
          }),
        ];
      })
      .sort(
        (left, right) =>
          right.submittedAt.localeCompare(left.submittedAt) ||
          left.packageId.localeCompare(right.packageId),
      );
  };

export const useAuctionApprovalReviewStore =
  create<AuctionApprovalReviewState>()(
    persist(
      (set, get) => ({
        reviews: [],
        getReviewById: (reviewId) =>
          get().reviews.find((review) => review.reviewId === reviewId),
        getReviewByPackageId: (packageId) =>
          get().reviews.find((review) => review.packageId === packageId),
        startApprovalReview: (command) => {
          if (command.actorRole !== "ADMIN")
            return failure(
              "ACCESS_DENIED",
              "Chỉ ADMIN được bắt đầu Approval Review.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID không hợp lệ.");
          const sameCommand = get().reviews.find((review) =>
            review.history.some(
              (entry) =>
                entry.commandId === command.commandId &&
                entry.action === "APPROVAL_REVIEW_STARTED",
            ),
          );
          if (sameCommand)
            return {
              ok: true,
              review: sameCommand,
              created: false,
              changed: false,
            };
          const existing = get().reviews.find(
            (review) => review.packageId === command.packageId,
          );
          if (existing)
            return failure(
              "APPROVAL_REVIEW_ALREADY_STARTED",
              "Approval Review đã được bắt đầu.",
              existing,
            );
          const packageState = useAuctionApprovalPackageStore.getState();
          let packageValue = packageState.packages.find(
            (item) => item.packageId === command.packageId,
          );
          if (!packageValue) {
            const sessionId = command.packageId.replace(
              /^approval-package-/,
              "",
            );
            const session = useAuctionSessionStore
              .getState()
              .sessions.find((item) => item.sessionId === sessionId);
            return session?.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION"
              ? failure(
                  APPROVAL_REVIEW_BLOCKED_BY_CONFIGURATION,
                  REVIEW_CONFIGURATION_BLOCKER_MESSAGE,
                )
              : failure(
                  "APPROVAL_PACKAGE_NOT_FOUND",
                  "Không tìm thấy Approval Package.",
                );
          }
          if (packageValue.status !== "SUBMITTED")
            return failure(
              "APPROVAL_PACKAGE_NOT_SUBMITTED",
              "Approval Package phải ở trạng thái SUBMITTED.",
            );
          if (packageValue.packageVersion !== command.expectedPackageVersion)
            return failure(
              "STALE_PACKAGE_VERSION",
              "Package version đã thay đổi.",
            );
          let submission = packageState.submissionRecords.find(
            (item) => item.packageId === packageValue?.packageId,
          );
          if (!submission)
            return failure(
              "SUBMISSION_RECORD_MISSING",
              INVALID_PACKAGE_MESSAGE,
            );
          if (
            submission.submissionRecordId !==
            command.expectedSubmissionRecordId
          )
            return failure(
              "STALE_SUBMISSION_RECORD",
              "Submission Record đã thay đổi.",
            );
          if (!validSubmissionForPackage(packageValue, submission))
            return failure(
              "SUBMISSION_RECORD_MISMATCH",
              INVALID_PACKAGE_MESSAGE,
            );
          let session = useAuctionSessionStore
            .getState()
            .sessions.find((item) => item.sessionId === packageValue?.sessionId);
          if (!session)
            return failure("SESSION_NOT_FOUND", "Không tìm thấy Session.");
          if (session.currentVersion !== command.expectedSessionVersion)
            return failure(
              "STALE_SESSION_VERSION",
              "Session version đã thay đổi.",
            );
          const eligibility = evaluateApprovalReviewEligibility({
            packageValue,
            submission,
            actorRole: command.actorRole,
          });
          if (!eligibility.eligible)
            return failure(eligibility.code, eligibility.message);

          // Re-read every authority immediately before commit.
          packageValue = useAuctionApprovalPackageStore
            .getState()
            .packages.find((item) => item.packageId === command.packageId);
          submission = useAuctionApprovalPackageStore
            .getState()
            .submissionRecords.find(
              (item) =>
                item.submissionRecordId === command.expectedSubmissionRecordId,
            );
          session = useAuctionSessionStore
            .getState()
            .sessions.find((item) => item.sessionId === packageValue?.sessionId);
          const finalEligibility = evaluateApprovalReviewEligibility({
            packageValue,
            submission,
            actorRole: command.actorRole,
          });
          if (!finalEligibility.eligible)
            return failure(
              finalEligibility.code,
              finalEligibility.message,
            );
          if (
            !packageValue ||
            !submission ||
            !session ||
            packageValue.packageVersion !== command.expectedPackageVersion ||
            session.currentVersion !== command.expectedSessionVersion ||
            get().reviews.some(
              (review) => review.packageId === command.packageId,
            )
          )
            return failure(
              "APPROVAL_REVIEW_ALREADY_STARTED",
              "Authoritative state changed before Review commit.",
            );
          const occurredAt = deterministicTime(1);
          const reviewId = reviewIdFor(packageValue.packageId);
          const review = freezeReview({
            reviewId,
            reviewVersion: 1,
            packageId: packageValue.packageId,
            packageVersionAtStart: packageValue.packageVersion,
            submissionRecordId: submission.submissionRecordId,
            sessionId: session.sessionId,
            sessionVersionAtStart: session.currentVersion,
            status: "IN_REVIEW",
            startEvidence: {
              packageId: packageValue.packageId,
              packageVersion: packageValue.packageVersion,
              submissionRecordId: submission.submissionRecordId,
              sessionId: session.sessionId,
              sessionVersion: session.currentVersion,
              contentId: packageValue.evidence.auctionContent.contentId,
              contentVersion:
                packageValue.evidence.auctionContent.contentVersion,
              configurationSnapshotId:
                packageValue.evidence.configuration.snapshotId,
              contentReviewCompletionRecordId:
                packageValue.evidence.contentReview.completionRecordId,
              packageEvidenceValidity: "CURRENT",
              evaluatedAt: occurredAt,
            },
            currentEvidenceValidation: {
              validForReview: true,
              findingCodes: [],
              evaluatedAt: occurredAt,
            },
            startedBy: command.actorId,
            startedAt: occurredAt,
            updatedBy: command.actorId,
            updatedAt: occurredAt,
            history: [
              {
                historyId: `${reviewId}-history-1`,
                reviewId,
                reviewVersion: 1,
                action: "APPROVAL_REVIEW_STARTED",
                actorId: command.actorId,
                actorRole: "ADMIN",
                commandId: command.commandId,
                resultingStatus: "IN_REVIEW",
                findingCodes: [],
                occurredAt,
                visibility: "STAFF_ONLY",
              },
            ],
          });
          set({ reviews: [...get().reviews, review] });
          return { ok: true, review, created: true, changed: true };
        },
        revalidateApprovalReviewEvidence: (command) => {
          if (command.actorRole !== "ADMIN")
            return failure(
              "ACCESS_DENIED",
              "Chỉ ADMIN được kiểm tra lại Approval Review evidence.",
            );
          if (!validCommandId(command.commandId))
            return failure("INVALID_COMMAND", "Command ID không hợp lệ.");
          const sameCommand = get().reviews.find((review) =>
            review.history.some(
              (entry) =>
                entry.commandId === command.commandId &&
                entry.action === "APPROVAL_REVIEW_EVIDENCE_REVALIDATED",
            ),
          );
          if (sameCommand)
            return {
              ok: true,
              review: sameCommand,
              created: false,
              changed: false,
            };
          const review = get().reviews.find(
            (item) => item.reviewId === command.reviewId,
          );
          if (!review)
            return failure(
              "APPROVAL_REVIEW_NOT_FOUND",
              "Không tìm thấy Approval Review.",
            );
          if (review.reviewVersion !== command.expectedReviewVersion)
            return failure(
              "STALE_REVIEW_VERSION",
              "Review version đã thay đổi.",
              review,
            );
          const packageValue = useAuctionApprovalPackageStore
            .getState()
            .packages.find((item) => item.packageId === review.packageId);
          const submission = useAuctionApprovalPackageStore
            .getState()
            .submissionRecords.find(
              (item) =>
                item.submissionRecordId === review.submissionRecordId,
            );
          const classification = classifyPackageEvidence(
            packageValue,
            submission,
          );
          const nextStatus: AuctionApprovalReviewStatus =
            classification.kind === "CURRENT"
              ? "IN_REVIEW"
              : classification.kind === "STALE"
                ? "STALE"
                : "BLOCKED";
          const findingCodes =
            classification.kind === "CURRENT"
              ? []
              : [
                  classification.kind === "STALE"
                    ? "PACKAGE_EVIDENCE_STALE_AFTER_SUBMISSION"
                    : "PACKAGE_EVIDENCE_INVALID",
                ];
          const unchanged =
            review.status === nextStatus &&
            review.currentEvidenceValidation.validForReview ===
              (classification.kind === "CURRENT") &&
            JSON.stringify(review.currentEvidenceValidation.findingCodes) ===
              JSON.stringify(findingCodes);
          if (unchanged)
            return {
              ok: true,
              review,
              created: false,
              changed: false,
            };
          const nextVersion = review.reviewVersion + 1;
          const occurredAt = deterministicTime(nextVersion);
          const next = freezeReview({
            ...review,
            reviewVersion: nextVersion,
            status: nextStatus,
            currentEvidenceValidation: {
              validForReview: classification.kind === "CURRENT",
              findingCodes,
              evaluatedAt: occurredAt,
            },
            updatedBy: command.actorId,
            updatedAt: occurredAt,
            history: [
              ...review.history,
              {
                historyId: `${review.reviewId}-history-${review.history.length + 1}`,
                reviewId: review.reviewId,
                reviewVersion: nextVersion,
                action: "APPROVAL_REVIEW_EVIDENCE_REVALIDATED",
                actorId: command.actorId,
                actorRole: "ADMIN",
                commandId: command.commandId,
                resultingStatus: nextStatus,
                findingCodes,
                occurredAt,
                visibility: "STAFF_ONLY",
              },
            ],
          });
          set({
            reviews: get().reviews.map((item) =>
              item.reviewId === next.reviewId ? next : item,
            ),
          });
          return { ok: true, review: next, created: false, changed: true };
        },
        resetDeterministicApprovalReviewState: () => set({ reviews: [] }),
      }),
      {
        name: AUCTION_APPROVAL_REVIEW_STORAGE_KEY,
        version: AUCTION_APPROVAL_REVIEW_SCHEMA_VERSION,
        partialize: (state) => ({ reviews: state.reviews }),
        merge: (persisted, current) => ({
          ...current,
          ...sanitizePersistedAuctionApprovalReviewState(
            isRecord(persisted) ? persisted : undefined,
          ),
        }),
      },
    ),
  );
