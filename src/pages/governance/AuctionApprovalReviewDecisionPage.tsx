import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { BlockedState } from "../../components/feedback/States";
import {
  APPROVAL_DECISION_BLOCKED_BY_STALE_EVIDENCE,
  APPROVAL_DECISION_STALE_EVIDENCE_MESSAGE,
  APPROVAL_REVIEW_NOT_APPROVABLE,
  APPROVAL_REVIEW_NOT_APPROVABLE_MESSAGE,
  getApprovalDecisionEvidenceValidity,
  useAuctionApprovalDecisionStore,
} from "../../store/auctionApprovalDecisionStore";
import {
  getApprovalPackageEvidenceValidity,
  useAuctionApprovalPackageStore,
} from "../../store/auctionApprovalPackageStore";
import { useAuctionApprovalReviewStore } from "../../store/auctionApprovalReviewStore";
import { PROTOTYPE_CONTENT_POLICY } from "../../store/auctionContentStore";
import { useDemoStore } from "../../store/demoStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import "../../styles/auction-approval-package.css";

export function AuctionApprovalReviewDecisionPage() {
  const { reviewId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const [message, setMessage] = useState("");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalError, setApprovalError] = useState("");
  const review = useAuctionApprovalReviewStore((state) =>
    state.reviews.find((item) => item.reviewId === reviewId),
  );
  const revalidate = useAuctionApprovalReviewStore(
    (state) => state.revalidateApprovalReviewEvidence,
  );
  const packageValue = useAuctionApprovalPackageStore((state) =>
    state.packages.find((item) => item.packageId === review?.packageId),
  );
  const submission = useAuctionApprovalPackageStore((state) =>
    state.submissionRecords.find(
      (item) => item.submissionRecordId === review?.submissionRecordId,
    ),
  );
  const session = useAuctionSessionStore((state) =>
    state.sessions.find((item) => item.sessionId === review?.sessionId),
  );
  const decision = useAuctionApprovalDecisionStore((state) =>
    state.decisions.find(
      (item) => item.approvalReviewId === review?.reviewId,
    ),
  );
  const approveApprovalPackage = useAuctionApprovalDecisionStore(
    (state) => state.approveApprovalPackage,
  );

  if (actorRole !== "ADMIN")
    return (
      <main className="approval-package-page">
        <h1>Approval Review</h1>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ ADMIN được xem Approval Review và Decision."
        />
      </main>
    );
  if (!review || !packageValue || !submission || !session)
    return (
      <main className="approval-package-page">
        <h1>Approval Review</h1>
        <BlockedState
          title="Không tìm thấy Approval Review"
          description="Malformed hoặc orphan Review không được hiển thị."
        />
      </main>
    );

  const packageEvidenceValidity =
    getApprovalPackageEvidenceValidity(packageValue);
  const decisionEvidenceValidity = decision
    ? getApprovalDecisionEvidenceValidity(decision)
    : undefined;
  const canApprove =
    !decision &&
    review.status === "IN_REVIEW" &&
    review.currentEvidenceValidation.validForReview &&
    packageEvidenceValidity === "CURRENT";

  const runRevalidation = () => {
    const result = revalidate({
      reviewId: review.reviewId,
      actorId: "admin.approval-review@mock.local",
      actorRole,
      expectedReviewVersion: review.reviewVersion,
      commandId: `REVALIDATE_APPROVAL_REVIEW:${review.reviewId}:V${review.reviewVersion}`,
    });
    setMessage(
      result.ok
        ? result.changed
          ? `Evidence đã được kiểm tra lại: ${result.review.status}.`
          : "Evidence không thay đổi."
        : `${result.code}: ${result.message}`,
    );
  };

  const confirmApproval = () => {
    const result = approveApprovalPackage({
      approvalReviewId: review.reviewId,
      actorId: "admin.approval-decision@mock.local",
      actorRole,
      expectedReviewVersion: review.reviewVersion,
      expectedPackageVersion: packageValue.packageVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: `APPROVE_APPROVAL_PACKAGE:${review.reviewId}:V${review.reviewVersion}`,
    });
    if (!result.ok) {
      setApprovalError(
        `${result.code}: ${result.message} Reload or revalidate evidence before retrying.`,
      );
      return;
    }
    setApprovalError("");
    setApprovalOpen(false);
    setMessage(
      `Approval Decision ${result.decision.decisionId} recorded as APPROVED.`,
    );
  };

  return (
    <main className="approval-package-page">
      <header className="approval-package-heading">
        <span>ADMIN GOVERNANCE · APPROVE-ONLY DECISION</span>
        <h1>Approval Review</h1>
        <p>{PROTOTYPE_CONTENT_POLICY.classification}</p>
      </header>
      <section className="approval-package-card approval-package-identity">
        <div>
          <h2>{review.reviewId}</h2>
          <p>
            Review v{review.reviewVersion} ·{" "}
            {decision ? "DECISION RECORDED" : review.status}
          </p>
          <p>
            Started by {review.startedBy} · {review.startedAt}
          </p>
        </div>
        <Badge>{decision ? "DECISION RECORDED" : review.status}</Badge>
        {!decision && review.status === "IN_REVIEW" && (
          <Button onClick={runRevalidation}>Kiểm tra lại evidence</Button>
        )}
        {canApprove && (
          <Button onClick={() => setApprovalOpen(true)}>Phê duyệt</Button>
        )}
        {!decision &&
          (review.status === "STALE" || review.status === "BLOCKED") && (
            <p className="approval-package-alert" role="alert">
              {APPROVAL_REVIEW_NOT_APPROVABLE}:{" "}
              {APPROVAL_REVIEW_NOT_APPROVABLE_MESSAGE}
            </p>
          )}
        {!decision &&
          review.status === "IN_REVIEW" &&
          packageEvidenceValidity !== "CURRENT" && (
            <p className="approval-package-alert" role="alert">
              {APPROVAL_DECISION_BLOCKED_BY_STALE_EVIDENCE}:{" "}
              {APPROVAL_DECISION_STALE_EVIDENCE_MESSAGE}
            </p>
          )}
        {message && (
          <p role="status" aria-live="polite">
            {message}
          </p>
        )}
      </section>

      {decision && (
        <section className="approval-package-card">
          <h2>Approval Decision · read-only</h2>
          <dl>
            <dt>Decision</dt>
            <dd>
              {decision.decisionId} · v{decision.decisionVersion}
            </dd>
            <dt>Outcome</dt>
            <dd>{decision.outcome}</dd>
            <dt>Decided by/at</dt>
            <dd>
              {decision.decidedBy} · {decision.decidedAt}
            </dd>
            <dt>Package</dt>
            <dd>
              {decision.packageId} · v{decision.packageVersion}
            </dd>
            <dt>Approval Review</dt>
            <dd>
              {decision.approvalReviewId} · v
              {decision.approvalReviewVersion}
            </dd>
            <dt>Evidence validity</dt>
            <dd>{decisionEvidenceValidity}</dd>
          </dl>
          {decisionEvidenceValidity !== "CURRENT" && (
            <p className="approval-package-alert" role="alert">
              APPROVED_DECISION_EVIDENCE_STALE. The immutable APPROVED
              Decision remains recorded; future Schedule preparation is
              blocked.
            </p>
          )}
          <h3>Final validation evidence</h3>
          <dl>
            <dt>Content</dt>
            <dd>
              {decision.validationEvidence.contentId} · v
              {decision.validationEvidence.contentVersion}
            </dd>
            <dt>Configuration Snapshot</dt>
            <dd>
              {decision.validationEvidence.configurationSnapshotId}
            </dd>
            <dt>Content Review Completion</dt>
            <dd>
              {
                decision.validationEvidence
                  .contentReviewCompletionRecordId
              }
            </dd>
            <dt>Evaluated at</dt>
            <dd>{decision.validationEvidence.evaluatedAt}</dd>
          </dl>
        </section>
      )}

      <section className="approval-package-card">
        <h2>Governed references</h2>
        <dl>
          <dt>Package</dt>
          <dd>
            {review.packageId} · v{packageValue.packageVersion}
          </dd>
          <dt>Submission Record</dt>
          <dd>{review.submissionRecordId}</dd>
          <dt>Session</dt>
          <dd>
            {review.sessionId} · v{session.currentVersion}
          </dd>
          <dt>Content</dt>
          <dd>
            {review.startEvidence.contentId} · v
            {review.startEvidence.contentVersion}
          </dd>
          <dt>Configuration Snapshot</dt>
          <dd>{review.startEvidence.configurationSnapshotId}</dd>
          <dt>Content Review Completion</dt>
          <dd>{review.startEvidence.contentReviewCompletionRecordId}</dd>
        </dl>
      </section>

      <section className="approval-package-card">
        <h2>Current evidence validity</h2>
        <p>{packageEvidenceValidity}</p>
        <ul>
          {review.currentEvidenceValidation.findingCodes.length ? (
            review.currentEvidenceValidation.findingCodes.map((code) => (
              <li key={code}>{code}</li>
            ))
          ) : (
            <li>Không có finding.</li>
          )}
        </ul>
      </section>

      <section className="approval-package-card">
        <h2>Submitted Package evidence · read-only</h2>
        <p>
          {packageValue.evidence.auctionContent.auctionTitle} ·{" "}
          {packageValue.evidence.auctionContent.auctionSummary}
        </p>
        <p>
          Package {packageValue.status} · Submission{" "}
          {submission.submissionRecordId}
        </p>
      </section>

      <section className="approval-package-card">
        <h2>Review history</h2>
        <ol>
          {review.history.map((entry) => (
            <li key={entry.historyId}>
              <strong>{entry.action}</strong> · v{entry.reviewVersion} ·{" "}
              {entry.resultingStatus}
              <br />
              <small>
                {entry.actorId} · {entry.occurredAt}
              </small>
            </li>
          ))}
        </ol>
      </section>

      <section className="approval-package-card approval-package-boundary">
        <p>
          {decision
            ? "Approval Decision APPROVED has been recorded."
            : "Approval Review đã bắt đầu nhưng chưa có quyết định phê duyệt."}
        </p>
        <p>
          Prototype frontend-only: Package remains SUBMITTED; Session remains
          DRAFT / NOT_READY. No Schedule or Publication exists.
        </p>
      </section>

      <Dialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        title="Phê duyệt Approval Package"
        description="Confirm the immutable Approve-only decision record."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setApprovalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmApproval}>Confirm Approval</Button>
          </>
        }
      >
        <dl>
          <dt>Approval Review</dt>
          <dd>
            {review.reviewId} · v{review.reviewVersion}
          </dd>
          <dt>Package</dt>
          <dd>
            {packageValue.packageId} · v{packageValue.packageVersion}
          </dd>
          <dt>Submission Record</dt>
          <dd>{submission.submissionRecordId}</dd>
          <dt>Session</dt>
          <dd>
            {session.sessionId} · v{session.currentVersion}
          </dd>
          <dt>Content</dt>
          <dd>
            {review.startEvidence.contentId} · v
            {review.startEvidence.contentVersion}
          </dd>
          <dt>Configuration Snapshot</dt>
          <dd>{review.startEvidence.configurationSnapshotId}</dd>
          <dt>Content Review Completion Record</dt>
          <dd>{review.startEvidence.contentReviewCompletionRecordId}</dd>
          <dt>Current evidence validity</dt>
          <dd>{packageEvidenceValidity}</dd>
        </dl>
        <p>{PROTOTYPE_CONTENT_POLICY.classification}</p>
        <p>
          This records an APPROVED decision for the submitted Approval
          Package.
        </p>
        <p>The submitted Package remains immutable.</p>
        <p>The Session remains DRAFT / NOT_READY.</p>
        <p>No Schedule or Publication is created.</p>
        <p>Return and Reject are not included in this task.</p>
        {approvalError && (
          <p className="approval-package-alert" role="alert">
            {approvalError}
          </p>
        )}
      </Dialog>
    </main>
  );
}
