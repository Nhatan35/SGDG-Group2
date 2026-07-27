import { beforeEach, describe, expect, it } from "vitest";
import {
  APPROVAL_DECISION_ALREADY_EXISTS,
  APPROVAL_DECISION_BLOCKED_BY_STALE_EVIDENCE,
  APPROVAL_REVIEW_NOT_APPROVABLE,
  getApprovalDecisionEvidenceValidity,
  getApprovalDecisionQueue,
  getSessionApprovalProjection,
  sanitizePersistedAuctionApprovalDecisionState,
  useAuctionApprovalDecisionStore,
} from "./auctionApprovalDecisionStore";
import { useAuctionApprovalPackageStore } from "./auctionApprovalPackageStore";
import { useAuctionApprovalReviewStore } from "./auctionApprovalReviewStore";
import { useAuctionContentStore } from "./auctionContentStore";
import { useAuctionSessionStore } from "./auctionSessionStore";
import {
  resetApprovalPackageTestState,
  submitCurrentApprovalPackage,
} from "../test/approvalPackageTestHarness";

const ADMIN = "admin.approval-decision@mock.local";

function prepareReview() {
  const prepared = submitCurrentApprovalPackage();
  const review = useAuctionApprovalReviewStore
    .getState()
    .startApprovalReview({
      packageId: prepared.packageValue.packageId,
      actorId: "admin.approval-review@mock.local",
      actorRole: "ADMIN",
      expectedPackageVersion: prepared.packageValue.packageVersion,
      expectedSubmissionRecordId: prepared.submission.submissionRecordId,
      expectedSessionVersion: prepared.session.currentVersion,
      commandId: "decision-test-start-review",
    });
  if (!review.ok) throw new Error(review.message);
  return { ...prepared, approvalReview: review.review };
}

function approve(prepared = prepareReview(), commandId = "approve-package") {
  const result = useAuctionApprovalDecisionStore
    .getState()
    .approveApprovalPackage({
      approvalReviewId: prepared.approvalReview.reviewId,
      actorId: ADMIN,
      actorRole: "ADMIN",
      expectedReviewVersion: prepared.approvalReview.reviewVersion,
      expectedPackageVersion: prepared.packageValue.packageVersion,
      expectedSessionVersion: prepared.session.currentVersion,
      commandId,
    });
  return { prepared, result };
}

describe("Approve-only Approval Decision aggregate", () => {
  beforeEach(() => {
    resetApprovalPackageTestState();
    useAuctionApprovalReviewStore
      .getState()
      .resetDeterministicApprovalReviewState();
    useAuctionApprovalDecisionStore
      .getState()
      .resetDeterministicApprovalDecisionState();
  });

  it("ADMIN creates one immutable version 1 APPROVED Decision with exact evidence", () => {
    const { prepared, result } = approve();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.decision).toMatchObject({
      decisionVersion: 1,
      outcome: "APPROVED",
      packageId: prepared.packageValue.packageId,
      packageVersion: prepared.packageValue.packageVersion,
      submissionRecordId: prepared.submission.submissionRecordId,
      approvalReviewId: prepared.approvalReview.reviewId,
      approvalReviewVersion: prepared.approvalReview.reviewVersion,
      sessionId: prepared.session.sessionId,
      sessionVersion: prepared.session.currentVersion,
      decidedBy: ADMIN,
      validationEvidence: {
        packageEvidenceValidity: "CURRENT",
        reviewEvidenceValidity: "CURRENT",
        contentId: prepared.content.contentId,
        contentVersion: prepared.content.contentVersion,
        findingCodes: [],
      },
    });
    expect(Object.isFrozen(result.decision)).toBe(true);
    expect(Object.isFrozen(result.decision.validationEvidence)).toBe(true);
    expect(
      Object.isFrozen(result.decision.validationEvidence.findingCodes),
    ).toBe(true);
    expect(useAuctionApprovalDecisionStore.getState().decisions).toHaveLength(
      1,
    );
    expect(getApprovalDecisionQueue()[0]?.queueState).toBe(
      "APPROVED_DECISION_RECORDED",
    );
    expect(getSessionApprovalProjection(prepared.session.sessionId)).toBe(
      "APPROVED",
    );
  });

  it.each(["CUSTOMER", "CONTENT_STAFF", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "rejects non-ADMIN role %s",
    (actorRole) => {
      const prepared = prepareReview();
      const result = useAuctionApprovalDecisionStore
        .getState()
        .approveApprovalPackage({
          approvalReviewId: prepared.approvalReview.reviewId,
          actorId: "unauthorized",
          actorRole,
          expectedReviewVersion: prepared.approvalReview.reviewVersion,
          expectedPackageVersion: prepared.packageValue.packageVersion,
          expectedSessionVersion: prepared.session.currentVersion,
          commandId: `deny-approve-${actorRole}`,
        });
      expect(result).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
      expect(useAuctionApprovalDecisionStore.getState().decisions).toEqual([]);
    },
  );

  it("rejects a missing Review", () => {
    const result = useAuctionApprovalDecisionStore
      .getState()
      .approveApprovalPackage({
        approvalReviewId: "missing-review",
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: 1,
        expectedPackageVersion: 1,
        expectedSessionVersion: 1,
        commandId: "approve-missing-review",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "APPROVAL_REVIEW_NOT_FOUND",
    });
  });

  it.each(["STALE", "BLOCKED"] as const)(
    "rejects Review status %s",
    (status) => {
      const prepared = prepareReview();
      useAuctionApprovalReviewStore.setState((state) => ({
        reviews: state.reviews.map((review) =>
          review.reviewId === prepared.approvalReview.reviewId
            ? ({ ...review, status } as never)
            : review,
        ),
      }));
      const result = useAuctionApprovalDecisionStore
        .getState()
        .approveApprovalPackage({
          approvalReviewId: prepared.approvalReview.reviewId,
          actorId: ADMIN,
          actorRole: "ADMIN",
          expectedReviewVersion: prepared.approvalReview.reviewVersion,
          expectedPackageVersion: prepared.packageValue.packageVersion,
          expectedSessionVersion: prepared.session.currentVersion,
          commandId: `reject-${status.toLowerCase()}-review`,
        });
      expect(result).toMatchObject({
        ok: false,
        code: APPROVAL_REVIEW_NOT_APPROVABLE,
      });
    },
  );

  it("rejects a non-submitted Package", () => {
    const prepared = prepareReview();
    useAuctionApprovalPackageStore.setState((state) => ({
      packages: state.packages.map((item) =>
        item.packageId === prepared.packageValue.packageId
          ? ({ ...item, status: "READY_TO_SUBMIT" } as never)
          : item,
      ),
    }));
    const result = useAuctionApprovalDecisionStore
      .getState()
      .approveApprovalPackage({
        approvalReviewId: prepared.approvalReview.reviewId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: prepared.approvalReview.reviewVersion,
        expectedPackageVersion: prepared.packageValue.packageVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "reject-non-submitted-package",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "APPROVAL_PACKAGE_NOT_SUBMITTED",
    });
  });

  it("rejects stale current Package evidence", () => {
    const prepared = prepareReview();
    const changed = useAuctionContentStore
      .getState()
      .saveAuctionContentDraft({
        contentId: prepared.content.contentId,
        actorId: "content.staff@mock.local",
        actorRole: "CONTENT_STAFF",
        expectedContentVersion: prepared.content.contentVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "decision-test-pre-approval-drift",
        auctionTitle: prepared.content.workingContent.auctionTitle,
        auctionSummary: `${prepared.content.workingContent.auctionSummary} drift`,
      });
    expect(changed.ok).toBe(true);
    const result = useAuctionApprovalDecisionStore
      .getState()
      .approveApprovalPackage({
        approvalReviewId: prepared.approvalReview.reviewId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: prepared.approvalReview.reviewVersion,
        expectedPackageVersion: prepared.packageValue.packageVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "reject-stale-package-evidence",
      });
    expect(result).toMatchObject({
      ok: false,
      code: APPROVAL_DECISION_BLOCKED_BY_STALE_EVIDENCE,
    });
    expect(useAuctionApprovalDecisionStore.getState().decisions).toEqual([]);
  });

  it("rejects missing and mismatched Submission Records", () => {
    const missing = prepareReview();
    useAuctionApprovalPackageStore.setState({ submissionRecords: [] });
    const missingResult = useAuctionApprovalDecisionStore
      .getState()
      .approveApprovalPackage({
        approvalReviewId: missing.approvalReview.reviewId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: missing.approvalReview.reviewVersion,
        expectedPackageVersion: missing.packageValue.packageVersion,
        expectedSessionVersion: missing.session.currentVersion,
        commandId: "missing-decision-submission",
      });
    expect(missingResult).toMatchObject({
      ok: false,
      code: "SUBMISSION_RECORD_MISSING",
    });

    resetApprovalPackageTestState();
    useAuctionApprovalReviewStore
      .getState()
      .resetDeterministicApprovalReviewState();
    const mismatch = prepareReview();
    useAuctionApprovalPackageStore.setState((state) => ({
      submissionRecords: state.submissionRecords.map((record) => ({
        ...record,
        contentVersion: record.contentVersion + 1,
      })),
    }));
    const mismatchResult = useAuctionApprovalDecisionStore
      .getState()
      .approveApprovalPackage({
        approvalReviewId: mismatch.approvalReview.reviewId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: mismatch.approvalReview.reviewVersion,
        expectedPackageVersion: mismatch.packageValue.packageVersion,
        expectedSessionVersion: mismatch.session.currentVersion,
        commandId: "mismatch-decision-submission",
      });
    expect(mismatchResult).toMatchObject({
      ok: false,
      code: "SUBMISSION_RECORD_INVALID",
    });
  });

  it("rejects SGDG/fixture-like non-Customer session authority", () => {
    const prepared = prepareReview();
    useAuctionSessionStore.setState((state) => ({
      sessions: state.sessions.map((session) =>
        session.sessionId === prepared.session.sessionId
          ? ({
              ...session,
              recordKind: "DYNAMIC_SGDG_MANAGED_SESSION",
              creationSource: "DIRECT_SGDG",
              managementMode: "SGDG_MANAGED",
            } as never)
          : session,
      ),
    }));
    const result = useAuctionApprovalDecisionStore
      .getState()
      .approveApprovalPackage({
        approvalReviewId: prepared.approvalReview.reviewId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: prepared.approvalReview.reviewVersion,
        expectedPackageVersion: prepared.packageValue.packageVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "reject-sgdg-decision",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "DYNAMIC_WORKFLOW_REQUIRED",
    });
  });

  it("is idempotent for the same command and prevents a different duplicate", () => {
    const { prepared, result } = approve();
    if (!result.ok) throw new Error(result.message);
    const same = useAuctionApprovalDecisionStore
      .getState()
      .approveApprovalPackage({
        approvalReviewId: prepared.approvalReview.reviewId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: prepared.approvalReview.reviewVersion,
        expectedPackageVersion: prepared.packageValue.packageVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "approve-package",
      });
    expect(same).toMatchObject({ ok: true, created: false });
    const duplicate = useAuctionApprovalDecisionStore
      .getState()
      .approveApprovalPackage({
        approvalReviewId: prepared.approvalReview.reviewId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: prepared.approvalReview.reviewVersion,
        expectedPackageVersion: prepared.packageValue.packageVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "different-approve-package",
      });
    expect(duplicate).toMatchObject({
      ok: false,
      code: APPROVAL_DECISION_ALREADY_EXISTS,
      decision: { decisionId: result.decision.decisionId },
    });
    expect(useAuctionApprovalDecisionStore.getState().decisions).toHaveLength(
      1,
    );
  });

  it("leaves Package, Review and Session unchanged and creates no later-phase state", () => {
    const prepared = prepareReview();
    const packageBefore = structuredClone(prepared.packageValue);
    const reviewBefore = structuredClone(prepared.approvalReview);
    const sessionBefore = structuredClone(prepared.session);
    const result = approve(prepared).result;
    expect(result.ok).toBe(true);
    expect(
      useAuctionApprovalPackageStore
        .getState()
        .getPackageById(prepared.packageValue.packageId),
    ).toEqual(packageBefore);
    expect(
      useAuctionApprovalReviewStore
        .getState()
        .getReviewById(prepared.approvalReview.reviewId),
    ).toEqual(reviewBefore);
    expect(
      useAuctionSessionStore
        .getState()
        .sessions.find(
          (session) => session.sessionId === prepared.session.sessionId,
        ),
    ).toEqual(sessionBefore);
    expect(result).not.toHaveProperty("schedule");
    expect(result).not.toHaveProperty("publication");
    expect(result).not.toHaveProperty("return");
    expect(result).not.toHaveProperty("reject");
  });

  it("derives post-decision drift without mutating the immutable Decision", () => {
    const { prepared, result } = approve();
    if (!result.ok) throw new Error(result.message);
    const before = structuredClone(result.decision);
    const changed = useAuctionContentStore
      .getState()
      .saveAuctionContentDraft({
        contentId: prepared.content.contentId,
        actorId: "content.staff@mock.local",
        actorRole: "CONTENT_STAFF",
        expectedContentVersion: prepared.content.contentVersion,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "decision-test-post-approval-drift",
        auctionTitle: prepared.content.workingContent.auctionTitle,
        auctionSummary: `${prepared.content.workingContent.auctionSummary} drift`,
      });
    expect(changed.ok).toBe(true);
    expect(getApprovalDecisionEvidenceValidity(result.decision)).toBe(
      "STALE_AFTER_DECISION",
    );
    expect(getApprovalDecisionQueue()[0]?.queueState).toBe(
      "APPROVED_DECISION_EVIDENCE_STALE",
    );
    expect(
      useAuctionApprovalDecisionStore.getState().decisions[0],
    ).toEqual(before);
  });

  it("fails closed for malformed persistence and unsupported fields/outcomes", () => {
    const { result } = approve();
    if (!result.ok) throw new Error(result.message);
    const valid = { decisions: [structuredClone(result.decision)] };
    expect(
      sanitizePersistedAuctionApprovalDecisionState(valid).decisions,
    ).toHaveLength(1);
    for (const mutation of [
      { outcome: "REJECTED" },
      { outcome: "RETURNED" },
      { decisionVersion: 2 },
      { comments: [] },
      { reason: "not supported" },
      { assignedTo: "admin-2" },
      { scheduleId: "schedule-1" },
      { publicationId: "publication-1" },
    ])
      expect(
        sanitizePersistedAuctionApprovalDecisionState({
          decisions: [{ ...valid.decisions[0], ...mutation }],
        }).decisions,
      ).toEqual([]);
    expect(
      sanitizePersistedAuctionApprovalDecisionState({
        decisions: [valid.decisions[0], valid.decisions[0]],
      }).decisions,
    ).toEqual([]);
  });
});
