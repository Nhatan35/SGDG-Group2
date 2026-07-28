import { beforeEach, describe, expect, it } from "vitest";
import {
  getApprovalReviewQueue,
  sanitizePersistedAuctionApprovalReviewState,
  useAuctionApprovalReviewStore,
} from "./auctionApprovalReviewStore";
import { useAuctionApprovalPackageStore } from "./auctionApprovalPackageStore";
import { useAuctionContentStore } from "./auctionContentStore";
import {
  resetApprovalPackageTestState,
  submitCurrentApprovalPackage,
} from "../test/approvalPackageTestHarness";

const ADMIN = "admin.review-intake@mock.local";

describe("Approval Review intake aggregate", () => {
  beforeEach(() => {
    resetApprovalPackageTestState();
    useAuctionApprovalReviewStore
      .getState()
      .resetDeterministicApprovalReviewState();
  });

  const start = () => {
    const prepared = submitCurrentApprovalPackage();
    const result = useAuctionApprovalReviewStore.getState().startApprovalReview({
      packageId: prepared.packageValue.packageId,
      actorId: ADMIN,
      actorRole: "ADMIN",
      expectedPackageVersion: prepared.packageValue.packageVersion,
      expectedSubmissionRecordId: prepared.submission.submissionRecordId,
      expectedSessionVersion: prepared.session.currentVersion,
      commandId: "start-approval-review-command",
    });
    return { prepared, result };
  };

  it("ADMIN starts exactly one version 1 IN_REVIEW with exact immutable references", () => {
    const beforePackages = useAuctionApprovalPackageStore.getState().packages;
    const { prepared, result } = start();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.review).toMatchObject({
      reviewVersion: 1,
      status: "IN_REVIEW",
      packageId: prepared.packageValue.packageId,
      packageVersionAtStart: prepared.packageValue.packageVersion,
      submissionRecordId: prepared.submission.submissionRecordId,
      sessionId: prepared.session.sessionId,
      sessionVersionAtStart: prepared.session.currentVersion,
      startedBy: ADMIN,
    });
    expect(Object.isFrozen(result.review.startEvidence)).toBe(true);
    expect(result.review.history).toHaveLength(1);
    expect(useAuctionApprovalReviewStore.getState().reviews).toHaveLength(1);
    expect(prepared.packageValue.status).toBe("SUBMITTED");
    expect(prepared.session.lifecycleStatus).toBe("DRAFT");
    expect(prepared.session.publicationStatus).toBe("NOT_READY");
    expect(beforePackages).toHaveLength(0);
    expect(getApprovalReviewQueue()[0]?.queueState).toBe("IN_REVIEW");
  });

  it.each(["CUSTOMER", "CONTENT_STAFF", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "rejects non-ADMIN role %s",
    (actorRole) => {
      const prepared = submitCurrentApprovalPackage();
      const result = useAuctionApprovalReviewStore
        .getState()
        .startApprovalReview({
          packageId: prepared.packageValue.packageId,
          actorId: "unauthorized",
          actorRole,
          expectedPackageVersion: prepared.packageValue.packageVersion,
          expectedSubmissionRecordId: prepared.submission.submissionRecordId,
          expectedSessionVersion: prepared.session.currentVersion,
          commandId: `start-review-${actorRole}`,
        });
      expect(result).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
      expect(useAuctionApprovalReviewStore.getState().reviews).toHaveLength(0);
    },
  );

  it("is idempotent for the same command and blocks a different duplicate", () => {
    const { prepared, result } = start();
    expect(result.ok).toBe(true);
    const again = useAuctionApprovalReviewStore.getState().startApprovalReview({
      packageId: prepared.packageValue.packageId,
      actorId: ADMIN,
      actorRole: "ADMIN",
      expectedPackageVersion: prepared.packageValue.packageVersion,
      expectedSubmissionRecordId: prepared.submission.submissionRecordId,
      expectedSessionVersion: prepared.session.currentVersion,
      commandId: "start-approval-review-command",
    });
    expect(again).toMatchObject({ ok: true, created: false, changed: false });
    const duplicate = useAuctionApprovalReviewStore
      .getState()
      .startApprovalReview({
        packageId: prepared.packageValue.packageId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedPackageVersion: prepared.packageValue.packageVersion,
        expectedSubmissionRecordId: prepared.submission.submissionRecordId,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "different-start-approval-review-command",
      });
    expect(duplicate).toMatchObject({
      ok: false,
      code: "APPROVAL_REVIEW_ALREADY_STARTED",
    });
    expect(useAuctionApprovalReviewStore.getState().reviews).toHaveLength(1);
  });

  it("blocks missing Submission Record and stale evidence", () => {
    const prepared = submitCurrentApprovalPackage();
    useAuctionApprovalPackageStore.setState({ submissionRecords: [] });
    const missing = useAuctionApprovalReviewStore
      .getState()
      .startApprovalReview({
        packageId: prepared.packageValue.packageId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedPackageVersion: prepared.packageValue.packageVersion,
        expectedSubmissionRecordId: prepared.submission.submissionRecordId,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "missing-submission-start",
      });
    expect(missing).toMatchObject({
      ok: false,
      code: "SUBMISSION_RECORD_MISSING",
    });

    resetApprovalPackageTestState();
    const stale = submitCurrentApprovalPackage();
    const changed = useAuctionContentStore
      .getState()
      .saveAuctionContentDraft({
      contentId: stale.content.contentId,
      actorId: "content.staff@mock.local",
      actorRole: "CONTENT_STAFF",
      expectedContentVersion: stale.content.contentVersion,
      expectedSessionVersion: stale.session.currentVersion,
      commandId: "drift-content-after-submission",
      auctionTitle: stale.content.workingContent.auctionTitle,
      auctionSummary: `${stale.content.workingContent.auctionSummary} drift`,
      });
    expect(changed.ok).toBe(true);
    const blocked = useAuctionApprovalReviewStore
      .getState()
      .startApprovalReview({
        packageId: stale.packageValue.packageId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedPackageVersion: stale.packageValue.packageVersion,
        expectedSubmissionRecordId: stale.submission.submissionRecordId,
        expectedSessionVersion: stale.session.currentVersion,
        commandId: "stale-evidence-start",
      });
    expect(blocked).toMatchObject({
      ok: false,
      code: "APPROVAL_REVIEW_BLOCKED_BY_STALE_PACKAGE_EVIDENCE",
    });
  });

  it("unchanged revalidation is version-stable and drift marks STALE", () => {
    const { prepared, result } = start();
    if (!result.ok) throw new Error(result.message);
    const unchanged = useAuctionApprovalReviewStore
      .getState()
      .revalidateApprovalReviewEvidence({
        reviewId: result.review.reviewId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: 1,
        commandId: "revalidate-current-review",
      });
    expect(unchanged).toMatchObject({
      ok: true,
      changed: false,
      review: { reviewVersion: 1 },
    });
    const changed = useAuctionContentStore
      .getState()
      .saveAuctionContentDraft({
      contentId: prepared.content.contentId,
      actorId: "content.staff@mock.local",
      actorRole: "CONTENT_STAFF",
      expectedContentVersion: prepared.content.contentVersion,
      expectedSessionVersion: prepared.session.currentVersion,
      commandId: "drift-review-evidence",
      auctionTitle: prepared.content.workingContent.auctionTitle,
      auctionSummary: `${prepared.content.workingContent.auctionSummary} drift`,
      });
    expect(changed.ok).toBe(true);
    const stale = useAuctionApprovalReviewStore
      .getState()
      .revalidateApprovalReviewEvidence({
        reviewId: result.review.reviewId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: 1,
        commandId: "revalidate-stale-review",
      });
    expect(stale).toMatchObject({
      ok: true,
      changed: true,
      review: {
        reviewVersion: 2,
        status: "STALE",
        currentEvidenceValidation: {
          findingCodes: ["PACKAGE_EVIDENCE_STALE_AFTER_SUBMISSION"],
        },
      },
    });
    if (stale.ok)
      expect(stale.review.startEvidence).toEqual(result.review.startEvidence);
    expect(prepared.packageValue.status).toBe("SUBMITTED");
  });

  it("structurally invalid Package blocks Review without changing start evidence", () => {
    const { result } = start();
    if (!result.ok) throw new Error(result.message);
    const originalStartEvidence = result.review.startEvidence;
    useAuctionApprovalPackageStore.setState((state) => ({
      packages: state.packages.map((item) =>
        item.packageId === result.review.packageId
          ? ({ ...item, approvalDecision: "ILLEGAL" } as never)
          : item,
      ),
    }));
    const blocked = useAuctionApprovalReviewStore
      .getState()
      .revalidateApprovalReviewEvidence({
        reviewId: result.review.reviewId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: 1,
        commandId: "revalidate-invalid-review",
      });
    expect(blocked).toMatchObject({
      ok: true,
      changed: true,
      review: {
        reviewVersion: 2,
        status: "BLOCKED",
        currentEvidenceValidation: {
          findingCodes: ["PACKAGE_EVIDENCE_INVALID"],
        },
      },
    });
    if (blocked.ok)
      expect(blocked.review.startEvidence).toEqual(originalStartEvidence);
  });

  it("non-ADMIN and stale-version revalidation cause no mutation", () => {
    const { result } = start();
    if (!result.ok) throw new Error(result.message);
    const denied = useAuctionApprovalReviewStore
      .getState()
      .revalidateApprovalReviewEvidence({
        reviewId: result.review.reviewId,
        actorId: "content.staff@mock.local",
        actorRole: "CONTENT_STAFF",
        expectedReviewVersion: 1,
        commandId: "denied-review-revalidation",
      });
    expect(denied).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    const staleVersion = useAuctionApprovalReviewStore
      .getState()
      .revalidateApprovalReviewEvidence({
        reviewId: result.review.reviewId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedReviewVersion: 99,
        commandId: "stale-version-review-revalidation",
      });
    expect(staleVersion).toMatchObject({
      ok: false,
      code: "STALE_REVIEW_VERSION",
    });
    expect(
      useAuctionApprovalReviewStore.getState().reviews[0]?.reviewVersion,
    ).toBe(1);
  });

  it("rejects a non-submitted Package before intake", () => {
    const prepared = submitCurrentApprovalPackage();
    useAuctionApprovalPackageStore.setState((state) => ({
      packages: state.packages.map((item) =>
        item.packageId === prepared.packageValue.packageId
          ? ({ ...item, status: "READY_TO_SUBMIT" } as never)
          : item,
      ),
    }));
    const result = useAuctionApprovalReviewStore
      .getState()
      .startApprovalReview({
        packageId: prepared.packageValue.packageId,
        actorId: ADMIN,
        actorRole: "ADMIN",
        expectedPackageVersion: prepared.packageValue.packageVersion,
        expectedSubmissionRecordId: prepared.submission.submissionRecordId,
        expectedSessionVersion: prepared.session.currentVersion,
        commandId: "reject-draft-package-review",
      });
    expect(result).toMatchObject({
      ok: false,
      code: "APPROVAL_PACKAGE_NOT_SUBMITTED",
    });
    expect(useAuctionApprovalReviewStore.getState().reviews).toEqual([]);
  });

  it("fails closed for malformed and forbidden persistence", () => {
    const { result } = start();
    if (!result.ok) throw new Error(result.message);
    const valid = { reviews: [structuredClone(result.review)] };
    expect(sanitizePersistedAuctionApprovalReviewState(valid).reviews).toHaveLength(
      1,
    );
    expect(
      sanitizePersistedAuctionApprovalReviewState({
        reviews: [{ ...valid.reviews[0], decision: "APPROVE" }],
      }).reviews,
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionApprovalReviewState({
        reviews: [{ ...valid.reviews[0], comments: [] }],
      }).reviews,
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionApprovalReviewState({
        reviews: [
          valid.reviews[0],
          { ...valid.reviews[0], reviewId: "approval-review-duplicate" },
        ],
      }).reviews,
    ).toEqual([]);
  });
});
