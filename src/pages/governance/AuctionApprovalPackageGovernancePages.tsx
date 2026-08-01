import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { BlockedState } from "../../components/feedback/States";
import { useDemoStore } from "../../store/demoStore";
import {
  getApprovalPackageEvidenceValidity,
  useAuctionApprovalPackageStore,
} from "../../store/auctionApprovalPackageStore";
import {
  APPROVAL_REVIEW_BLOCKED_BY_INVALID_PACKAGE,
  APPROVAL_REVIEW_BLOCKED_BY_STALE_PACKAGE_EVIDENCE,
  INVALID_PACKAGE_MESSAGE,
  STALE_PACKAGE_EVIDENCE_MESSAGE,
  useAuctionApprovalReviewStore,
} from "../../store/auctionApprovalReviewStore";
import {
  getApprovalDecisionQueue,
  useAuctionApprovalDecisionStore,
} from "../../store/auctionApprovalDecisionStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import { PROTOTYPE_CONTENT_POLICY } from "../../store/auctionContentStore";
import "../../styles/auction-approval-package.css";

const feeLabel = (
  fee:
    | { kind: "AMOUNT"; amountVnd: number; unit: "PER_PRODUCT" }
    | { kind: "MP"; sourceLabel: "MP" | "MP/1SP" },
) =>
  fee.kind === "AMOUNT"
    ? `${fee.amountVnd.toLocaleString("vi-VN")} VND / sản phẩm`
    : fee.sourceLabel;

export function AuctionApprovalPackageGovernanceQueuePage() {
  const actorRole = useDemoStore((state) => state.actorRole);
  useAuctionApprovalPackageStore((state) => state.packages);
  useAuctionApprovalPackageStore((state) => state.submissionRecords);
  useAuctionApprovalReviewStore((state) => state.reviews);
  useAuctionApprovalDecisionStore((state) => state.decisions);
  const queue = getApprovalDecisionQueue();
  if (actorRole !== "ADMIN")
    return (
      <main className="approval-package-page">
        <header className="approval-package-heading">
          <span>ADMIN GOVERNANCE</span>
          <h1>Submitted Approval Packages</h1>
        </header>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ ADMIN được xem dynamic submitted Package queue."
        />
      </main>
    );
  return (
    <main className="approval-package-page">
      <header className="approval-package-heading">
        <span>ADMIN GOVERNANCE · READ-ONLY QUEUE</span>
        <h1>Submitted Approval Packages</h1>
        <p>{PROTOTYPE_CONTENT_POLICY.classification}</p>
        <p>
          Submitted for ADMIN review. This queue contains no approval decision
          controls.
        </p>
      </header>
      <section className="approval-package-card">
        <h2>Derived Approval Review queue</h2>
        <p>
          Only valid submitted dynamic packages are derived into this queue.
          Draft, blocked, fixture and malformed packages are excluded.
        </p>
      </section>
      {queue.length === 0 ? (
        <section className="approval-package-card">
          <h2>Không có Package đang chờ xem xét</h2>
          <p>No dynamic submitted Approval Package is available.</p>
        </section>
      ) : (
        <div className="approval-package-queue" role="list">
          {queue.map((item) => (
            <article
              className="approval-package-card approval-package-queue-card"
              key={item.packageId}
              role="listitem"
            >
              <div className="approval-package-queue-title">
                <div>
                  <h2>{item.packageId}</h2>
                  <p>
                    {item.sessionCode} · {item.sessionId}
                  </p>
                </div>
                <div className="approval-package-badges">
                  <Badge>{item.queueState}</Badge>
                  <Badge>{item.evidenceValidity}</Badge>
                </div>
              </div>
              <dl>
                <dt>Source / mode</dt>
                <dd>
                  {item.creationSource} / {item.managementMode}
                </dd>
                <dt>Submitted Package</dt>
                <dd>v{item.submittedPackageVersion}</dd>
                <dt>Content version</dt>
                <dd>v{item.contentVersion}</dd>
                <dt>Configuration Snapshot</dt>
                <dd>{item.configurationSnapshotId}</dd>
                <dt>Completion Record</dt>
                <dd>{item.completionRecordId}</dd>
                <dt>Submitted by/at</dt>
                <dd>
                  {item.submittedBy} · {item.submittedAt}
                </dd>
              </dl>
              {item.evidenceValidity === "STALE_AFTER_SUBMISSION" && (
                <p className="approval-package-alert" role="alert">
                  SUBMITTED_PACKAGE_EVIDENCE_STALE. Submitted evidence remains
                  immutable; no governed correction phase exists here.
                </p>
              )}
              <Link
                className="button secondary"
                to={`/governance/auction-approval-packages/${item.packageId}`}
              >
                Xem immutable package evidence
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export function AuctionApprovalPackageGovernanceDetailPage() {
  const { packageId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commandError, setCommandError] = useState("");
  const packageValue = useAuctionApprovalPackageStore((state) =>
    state.packages.find((item) => item.packageId === packageId),
  );
  const submission = useAuctionApprovalPackageStore((state) =>
    state.submissionRecords.find((item) => item.packageId === packageId),
  );
  const review = useAuctionApprovalReviewStore((state) =>
    state.reviews.find((item) => item.packageId === packageId),
  );
  useAuctionApprovalDecisionStore((state) => state.decisions);
  const startApprovalReview = useAuctionApprovalReviewStore(
    (state) => state.startApprovalReview,
  );
  const session = useAuctionSessionStore((state) =>
    state.sessions.find((item) => item.sessionId === packageValue?.sessionId),
  );
  if (actorRole !== "ADMIN")
    return (
      <main className="approval-package-page">
        <header className="approval-package-heading">
          <span>ADMIN GOVERNANCE</span>
          <h1>Approval Package Detail</h1>
        </header>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ ADMIN được xem submitted Package detail."
        />
      </main>
    );
  if (!packageValue || packageValue.status !== "SUBMITTED" || !submission)
    return (
      <main className="approval-package-page">
        <header className="approval-package-heading">
          <span>ADMIN GOVERNANCE</span>
          <h1>Approval Package Detail</h1>
        </header>
        <BlockedState
          title="Không tìm thấy submitted dynamic Package"
          description="Draft, malformed and fixture packages are not available in this detail."
        />
      </main>
    );
  const evidence = packageValue.evidence;
  const validity = getApprovalPackageEvidenceValidity(packageValue);
  const queueItem = getApprovalDecisionQueue().find(
    (item) => item.packageId === packageValue.packageId,
  );
  const startReview = () => {
    if (!session) return;
    const result = startApprovalReview({
      packageId: packageValue.packageId,
      actorId: "admin.approval-review@mock.local",
      actorRole,
      expectedPackageVersion: packageValue.packageVersion,
      expectedSubmissionRecordId: submission.submissionRecordId,
      expectedSessionVersion: session.currentVersion,
      commandId: `START_APPROVAL_REVIEW:${packageValue.packageId}:V${packageValue.packageVersion}`,
    });
    if (!result.ok) {
      setCommandError(`${result.code}: ${result.message}`);
      return;
    }
    setDialogOpen(false);
    setCommandError("");
  };
  return (
    <main className="approval-package-page">
      <header className="approval-package-heading">
        <span>ADMIN GOVERNANCE · IMMUTABLE READ-ONLY EVIDENCE</span>
        <h1>Approval Package Detail</h1>
        <p>{PROTOTYPE_CONTENT_POLICY.classification}</p>
      </header>
      <section className="approval-package-card approval-package-identity">
        <div>
          <h2>{packageValue.packageId}</h2>
          <p>
            Package v{packageValue.packageVersion} · {packageValue.status}
          </p>
        </div>
        <div className="approval-package-badges">
          <Badge>{queueItem?.queueState ?? "INVALID"}</Badge>
          <Badge>{validity}</Badge>
        </div>
        {validity === "STALE_AFTER_SUBMISSION" && (
          <p className="approval-package-alert" role="alert">
            SUBMITTED_PACKAGE_EVIDENCE_STALE.{" "}
            {APPROVAL_REVIEW_BLOCKED_BY_STALE_PACKAGE_EVIDENCE}:{" "}
            {STALE_PACKAGE_EVIDENCE_MESSAGE}
          </p>
        )}
        {validity === "INVALID" && (
          <p className="approval-package-alert" role="alert">
            {APPROVAL_REVIEW_BLOCKED_BY_INVALID_PACKAGE}:{" "}
            {INVALID_PACKAGE_MESSAGE}
          </p>
        )}
        {!review && validity === "CURRENT" && (
          <Button onClick={() => setDialogOpen(true)}>
            Bắt đầu xem xét
          </Button>
        )}
        {review && (
          <div>
            <p>
              Review {review.reviewId} · v{review.reviewVersion} ·{" "}
              {review.status}
            </p>
            <p>
              {review.startedBy} · {review.startedAt}
            </p>
            <Link
              className="button primary"
              to={`/governance/auction-approval-reviews/${review.reviewId}`}
            >
              Mở Approval Review
            </Link>
          </div>
        )}
        {commandError && (
          <p className="approval-package-alert" role="alert">
            {commandError}
          </p>
        )}
      </section>

      <div className="approval-package-grid">
        <section className="approval-package-card">
          <p className="approval-package-eyebrow">SUBMISSION · READ-ONLY</p>
          <h2>Submission Record</h2>
          <dl>
            <dt>Record</dt>
            <dd>
              {submission.submissionRecordId} · v{submission.recordVersion}
            </dd>
            <dt>Submitted Package</dt>
            <dd>v{submission.submittedPackageVersion}</dd>
            <dt>Submitted by/at</dt>
            <dd>
              {submission.submittedBy} · {submission.submittedAt}
            </dd>
            <dt>Queue state</dt>
            <dd>{submission.queueState}</dd>
          </dl>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">SESSION · READ-ONLY</p>
          <h2>Session evidence</h2>
          <dl>
            <dt>Session</dt>
            <dd>
              {evidence.session.sessionId} · {evidence.session.sessionCode}
            </dd>
            <dt>Version</dt>
            <dd>v{evidence.session.sessionVersion}</dd>
            <dt>Source / mode</dt>
            <dd>
              {evidence.session.creationSource} /{" "}
              {evidence.session.managementMode}
            </dd>
            <dt>Lifecycle / publication</dt>
            <dd>
              {evidence.session.lifecycleStatus} /{" "}
              {evidence.session.publicationStatus}
            </dd>
          </dl>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            CUSTOMER SOURCE · READ-ONLY
          </p>
          <h2>Opening Request lineage</h2>
          <dl>
            <dt>Request</dt>
            <dd>
              {evidence.openingRequest.openingRequestId} · v
              {evidence.openingRequest.openingRequestVersion}
            </dd>
            <dt>Customer</dt>
            <dd>{evidence.openingRequest.customerId}</dd>
            <dt>Accepted state</dt>
            <dd>{evidence.openingRequest.acceptedState}</dd>
            <dt>Original title</dt>
            <dd>{evidence.openingRequest.originalTitle}</dd>
            <dt>Original purpose</dt>
            <dd>{evidence.openingRequest.originalPurpose}</dd>
          </dl>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            AUCTION CONTENT · READ-ONLY
          </p>
          <h2>Content evidence</h2>
          <dl>
            <dt>Content</dt>
            <dd>
              {evidence.auctionContent.contentId} · v
              {evidence.auctionContent.contentVersion}
            </dd>
            <dt>Title</dt>
            <dd>{evidence.auctionContent.auctionTitle}</dd>
            <dt>Summary</dt>
            <dd>{evidence.auctionContent.auctionSummary}</dd>
            <dt>Completeness</dt>
            <dd>{evidence.auctionContent.completenessStatus}</dd>
          </dl>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            CONFIGURATION · READ-ONLY
          </p>
          <h2>Configuration evidence</h2>
          <dl>
            <dt>Snapshot / Proposal</dt>
            <dd>
              {evidence.configuration.snapshotId} · v
              {evidence.configuration.proposalVersion}
            </dd>
            <dt>Starting Price</dt>
            <dd>
              {evidence.configuration.startingPrice.toLocaleString("vi-VN")}{" "}
              VND
            </dd>
            <dt>Price Band / Room</dt>
            <dd>
              {evidence.configuration.priceBand} →{" "}
              {evidence.configuration.ordinaryRoom}
            </dd>
            <dt>Member Title</dt>
            <dd>
              {evidence.configuration.memberTitle} ·{" "}
              {evidence.configuration.membershipReferenceVersion}
            </dd>
            <dt>Listing Fee</dt>
            <dd>{feeLabel(evidence.configuration.memberListingFee)}</dd>
          </dl>
          <p>{evidence.configuration.policyDisclaimer}</p>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            CONTENT REVIEW · READ-ONLY
          </p>
          <h2>Completion evidence</h2>
          <dl>
            <dt>Review</dt>
            <dd>
              {evidence.contentReview.reviewId} · v
              {evidence.contentReview.reviewVersion}
            </dd>
            <dt>Completion Record</dt>
            <dd>
              {evidence.contentReview.completionRecordId} · v
              {evidence.contentReview.completionRecordVersion}
            </dd>
            <dt>Completed by/at</dt>
            <dd>
              {evidence.contentReview.completedBy} ·{" "}
              {evidence.contentReview.completedAt}
            </dd>
            <dt>Readiness</dt>
            <dd>{evidence.contentReview.readiness}</dd>
          </dl>
        </section>
      </div>

      <section className="approval-package-card approval-package-boundary">
        <h2>ADMIN review boundary</h2>
        <p>No approval decision has been made.</p>
        <p>The Session remains DRAFT / NOT_READY.</p>
        <p>No Schedule or Publication has been created.</p>
        <p>
          This detail is read-only. Approve, Return, Reject, Schedule and
          Publish controls do not exist for dynamic packages in this phase.
        </p>
      </section>
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Bắt đầu Approval Review"
        description="Hành động này chỉ bắt đầu review intake."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={startReview}>Bắt đầu xem xét</Button>
          </>
        }
      >
        <p>Không có quyết định phê duyệt nào được tạo.</p>
        <p>Submitted Approval Package vẫn bất biến.</p>
        <p>Session vẫn giữ DRAFT / NOT_READY.</p>
        <p>Không tạo Schedule hoặc Publication.</p>
      </Dialog>
    </main>
  );
}

export function AuctionApprovalReviewPage() {
  const { reviewId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const [message, setMessage] = useState("");
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
  if (actorRole !== "ADMIN")
    return (
      <main className="approval-package-page">
        <h1>Approval Review</h1>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ ADMIN được xem Approval Review."
        />
      </main>
    );
  if (!review || !packageValue || !submission)
    return (
      <main className="approval-package-page">
        <h1>Approval Review</h1>
        <BlockedState
          title="Không tìm thấy Approval Review"
          description="Malformed hoặc orphan Review không được hiển thị."
        />
      </main>
    );
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
  return (
    <main className="approval-package-page">
      <header className="approval-package-heading">
        <span>ADMIN GOVERNANCE · REVIEW INTAKE ONLY</span>
        <h1>Approval Review</h1>
        <p>{PROTOTYPE_CONTENT_POLICY.classification}</p>
      </header>
      <section className="approval-package-card approval-package-identity">
        <div>
          <h2>{review.reviewId}</h2>
          <p>
            Review v{review.reviewVersion} · {review.status}
          </p>
          <p>
            Started by {review.startedBy} · {review.startedAt}
          </p>
        </div>
        <Badge>{review.status}</Badge>
        {review.status === "IN_REVIEW" && (
          <Button onClick={runRevalidation}>Kiểm tra lại evidence</Button>
        )}
        {message && <p role="status">{message}</p>}
      </section>
      <section className="approval-package-card">
        <h2>Governed references</h2>
        <dl>
          <dt>Package</dt>
          <dd>
            {review.packageId} · v{review.packageVersionAtStart}
          </dd>
          <dt>Submission Record</dt>
          <dd>{review.submissionRecordId}</dd>
          <dt>Session</dt>
          <dd>
            {review.sessionId} · v{review.sessionVersionAtStart}
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
        <p>
          {review.currentEvidenceValidation.validForReview
            ? "CURRENT"
            : review.status === "STALE"
              ? "STALE_AFTER_SUBMISSION"
              : "INVALID"}
        </p>
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
          Approval Review đã bắt đầu nhưng chưa có quyết định phê duyệt.
        </p>
        <p>
          Prototype frontend-only: Package remains SUBMITTED; Session remains
          DRAFT / NOT_READY. No decision, Schedule or Publication exists.
        </p>
      </section>
    </main>
  );
}
