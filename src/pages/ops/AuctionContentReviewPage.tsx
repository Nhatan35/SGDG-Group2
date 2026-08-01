import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { BlockedState } from "../../components/feedback/States";
import { useDemoStore } from "../../store/demoStore";
import {
  PROTOTYPE_CONTENT_POLICY,
  useAuctionContentStore,
} from "../../store/auctionContentStore";
import {
  CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION,
  SGDG_CONTENT_REVIEW_BLOCKER_MESSAGE,
  evaluateContentReviewEligibility,
  getSessionPackageProjection,
  type ContentReviewCommandResult,
  type SessionPackageFinding,
  useAuctionContentReviewStore,
} from "../../store/auctionContentReviewStore";
import { useAuctionConfigurationStore } from "../../store/auctionConfigurationStore";
import {
  CONTENT_STAFF_ACTOR_ID,
  useOpeningRequestStore,
} from "../../store/openingRequestStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import { getMembershipAccountReference } from "../../services/membershipAccountReference";
import "../../styles/auction-content-review.css";

const resultMessage = (
  result: Extract<ContentReviewCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

const ownerLabel: Record<SessionPackageFinding["owner"], string> = {
  CONTENT_STAFF: "Content Staff",
  CUSTOMER_SOURCE: "Customer source",
  PRODUCT_ASSET: "Product / Asset",
  MEMBERSHIP: "Membership",
  CONFIGURATION_GOVERNANCE: "Configuration Governance",
  AUCTION_SYSTEM: "Auction System",
  BUSINESS_DECISION: "Business Decision",
};

export function AuctionContentReviewPage() {
  const { sessionId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const session = useAuctionSessionStore((state) =>
    state.sessions.find((item) => item.sessionId === sessionId),
  );
  const request = useOpeningRequestStore((state) =>
    state.records.find(
      (item) =>
        session?.recordKind === "DYNAMIC_LINKED_SESSION" &&
        item.requestId === session.openingRequestId,
    ),
  );
  const content = useAuctionContentStore((state) =>
    state.contents.find((item) => item.sessionId === sessionId),
  );
  const configuration = useAuctionConfigurationStore((state) =>
    state.proposals.find((item) => item.sessionId === sessionId),
  );
  const snapshot = useAuctionConfigurationStore((state) =>
    state.snapshots.find((item) => item.sessionId === sessionId),
  );
  const legacySnapshot = useAuctionConfigurationStore((state) =>
    state.legacySnapshots.find((item) => item.sessionId === sessionId),
  );
  const review = useAuctionContentReviewStore((state) =>
    state.reviews.find((item) => item.sessionId === sessionId),
  );
  const completionRecord = useAuctionContentReviewStore((state) =>
    state.completionRecords.find((item) => item.reviewId === review?.reviewId),
  );
  const startContentReview = useAuctionContentReviewStore(
    (state) => state.startContentReview,
  );
  const revalidateSessionPackage = useAuctionContentReviewStore(
    (state) => state.revalidateSessionPackage,
  );
  const completeContentReview = useAuctionContentReviewStore(
    (state) => state.completeContentReview,
  );
  const [busyAction, setBusyAction] = useState<
    "start" | "revalidate" | "complete" | undefined
  >();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const membership = request
    ? getMembershipAccountReference(request.ownerId)
    : undefined;
  const projection = session
    ? getSessionPackageProjection(session.sessionId)
    : "CONTENT_REVIEW_INVALID";
  const currentEvidenceChanged = Boolean(
    review &&
      (content?.contentVersion !== review.lastEvaluatedContentVersion ||
        session?.currentVersion !== review.readiness.evaluatedSessionVersion ||
        snapshot?.snapshotId !==
          review.readiness.evaluatedConfigurationSnapshotId ||
        membership?.referenceVersion !==
          review.readiness.evaluatedMembershipReferenceVersion),
  );
  const findingsByOwner = useMemo(() => {
    const grouped = new Map<
      SessionPackageFinding["owner"],
      SessionPackageFinding[]
    >();
    for (const finding of review?.readiness.findings ?? []) {
      const existing = grouped.get(finding.owner) ?? [];
      grouped.set(finding.owner, [...existing, finding]);
    }
    return [...grouped.entries()];
  }, [review]);

  const clearFeedback = () => {
    setError("");
    setSuccess("");
  };

  const start = () => {
    if (!session || !content || !snapshot) return;
    clearFeedback();
    setBusyAction("start");
    const result = startContentReview({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole,
      expectedSessionVersion: session.currentVersion,
      expectedContentId: content.contentId,
      expectedContentVersion: content.contentVersion,
      expectedConfigurationSnapshotId: snapshot.snapshotId,
      commandId: `START_CONTENT_REVIEW:${session.sessionId}:S${session.currentVersion}:C${content.contentVersion}:${snapshot.snapshotId}`,
    });
    setBusyAction(undefined);
    if (!result.ok) {
      setError(resultMessage(result));
      return;
    }
    setSuccess(
      `Đã bắt đầu ${result.review.reviewId} · review v${result.review.reviewVersion}.`,
    );
  };

  const revalidate = () => {
    if (!review || !session || !content || !snapshot) return;
    clearFeedback();
    setBusyAction("revalidate");
    const result = revalidateSessionPackage({
      reviewId: review.reviewId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole,
      expectedReviewVersion: review.reviewVersion,
      expectedSessionVersion: session.currentVersion,
      expectedContentVersion: content.contentVersion,
      expectedConfigurationSnapshotId: snapshot.snapshotId,
      commandId: `REVALIDATE_SESSION_PACKAGE:${review.reviewId}:R${review.reviewVersion}:S${session.currentVersion}:C${content.contentVersion}:${snapshot.snapshotId}`,
    });
    setBusyAction(undefined);
    if (!result.ok) {
      setError(resultMessage(result));
      return;
    }
    setSuccess(
      result.changed
        ? `Đã kiểm tra lại Session Package · review v${result.review.reviewVersion}.`
        : `Authoritative evidence không đổi · review vẫn ở v${result.review.reviewVersion}.`,
    );
  };

  const complete = () => {
    if (!review || !session || !content || !snapshot) return;
    clearFeedback();
    setBusyAction("complete");
    const result = completeContentReview({
      reviewId: review.reviewId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole,
      expectedReviewVersion: review.reviewVersion,
      expectedSessionVersion: session.currentVersion,
      expectedContentVersion: content.contentVersion,
      expectedConfigurationSnapshotId: snapshot.snapshotId,
      commandId: `COMPLETE_CONTENT_REVIEW:${review.reviewId}:R${review.reviewVersion}:S${session.currentVersion}:C${content.contentVersion}:${snapshot.snapshotId}`,
    });
    setBusyAction(undefined);
    if (!result.ok) {
      setError(resultMessage(result));
      return;
    }
    setDialogOpen(false);
    setSuccess(
      `Content Review đã hoàn tất. Completion record: ${result.completionRecord?.completionRecordId}.`,
    );
  };

  if (!session)
    return (
      <main className="content-review-page">
        <header className="content-review-heading">
          <span>AUCTION OPERATIONS</span>
          <h1>Content Review</h1>
        </header>
        <BlockedState
          title="Không tìm thấy dynamic Session"
          description="Content Review không sử dụng fixture fallback."
        />
      </main>
    );

  if (actorRole !== "CONTENT_STAFF")
    return (
      <main className="content-review-page">
        <header className="content-review-heading">
          <span>AUCTION OPERATIONS</span>
          <h1>Content Review</h1>
        </header>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ CONTENT_STAFF được xem và mutate Content Review nội bộ."
        />
      </main>
    );

  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return (
      <main className="content-review-page">
        <header className="content-review-heading">
          <span>AUCTION OPERATIONS · SESSION PACKAGE</span>
          <h1>Content Review</h1>
        </header>
        <section className="prototype-content-disclaimer" role="note">
          <strong>{PROTOTYPE_CONTENT_POLICY.classification}</strong>
        </section>
        <section className="content-review-blocker" role="alert">
          <strong>{CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION}</strong>
          <p>{SGDG_CONTENT_REVIEW_BLOCKER_MESSAGE}</p>
        </section>
        <section className="content-review-card">
          <h2>SGDG-managed boundary</h2>
          <dl>
            <dt>Session</dt>
            <dd>{session.sessionId}</dd>
            <dt>Configuration</dt>
            <dd>BUSINESS DECISION REQUIRED</dd>
            <dt>Auction Content</dt>
            <dd>DEFERRED</dd>
            <dt>Content Review</dt>
            <dd>BLOCKED BY CONFIGURATION</dd>
            <dt>Completion record</dt>
            <dd>NONE</dd>
            <dt>Approval Package</dt>
            <dd>NONE</dd>
          </dl>
          <Link className="button secondary" to={`/ops/auctions/${session.sessionId}`}>
            Trở lại Session
          </Link>
        </section>
      </main>
    );

  const eligibility =
    content && snapshot
      ? evaluateContentReviewEligibility({
          sources: {
            session,
            openingRequest: request,
            content,
            configuration,
            snapshot,
            legacySnapshotExists: Boolean(legacySnapshot),
            membership,
            approvalPackageExists: false,
          },
          expectedSessionVersion: session.currentVersion,
          expectedContentId: content.contentId,
          expectedContentVersion: content.contentVersion,
          expectedConfigurationSnapshotId: snapshot.snapshotId,
          activeReviewExists: Boolean(review),
        })
      : undefined;
  const notStartedBlocker = !review
    ? !content
      ? "AUCTION_CONTENT_NOT_INITIALIZED: Khởi tạo Auction Content trước khi bắt đầu review."
      : legacySnapshot && !snapshot
        ? "CONFIGURATION_SNAPSHOT_LEGACY_ONLY: cần governed revalidation."
        : !snapshot
          ? "CONFIGURATION_SNAPSHOT_MISSING: cần current confirmed Snapshot."
          : eligibility && !eligibility.eligible
            ? `${eligibility.code}: ${eligibility.message}`
            : ""
    : "";

  return (
    <main className="content-review-page">
      <header className="content-review-heading">
        <span>AUCTION OPERATIONS · AUTHORITATIVE SESSION PACKAGE</span>
        <h1>Content Review</h1>
        <p>
          Review evidence is versioned independently and reads current
          authoritative aggregates.
        </p>
      </header>

      <section className="prototype-content-disclaimer" role="note">
        <strong>{PROTOTYPE_CONTENT_POLICY.classification}</strong>
        <p>
          Content Review does not classify this working content as approved,
          public, legal, regulatory, or publishable copy.
        </p>
      </section>

      <section className="content-review-card content-review-identity">
        <div>
          <h2>Session identity</h2>
          <dl>
            <dt>Session ID / code</dt>
            <dd>
              {session.sessionId} · {session.auctionCode}
            </dd>
            <dt>Creation / management</dt>
            <dd>
              {session.creationSource} / {session.managementMode}
            </dd>
            <dt>Session version</dt>
            <dd>v{session.currentVersion}</dd>
          </dl>
        </div>
        <div className="content-review-badges">
          <Badge tone="neutral">{session.lifecycleStatus}</Badge>
          <Badge tone="warning">{session.publicationStatus}</Badge>
          <Badge
            tone={
              review?.status === "COMPLETED" ||
              review?.status === "READY_TO_COMPLETE"
                ? "success"
                : review
                  ? "warning"
                  : "neutral"
            }
          >
            {review?.status ?? "NOT STARTED"}
          </Badge>
        </div>
      </section>

      <div className="content-review-evidence-grid">
        <section className="content-review-card">
          <p className="content-review-eyebrow">CUSTOMER SOURCE · READ-ONLY</p>
          <h2>Opening Request lineage</h2>
          <dl>
            <dt>Request ID / version</dt>
            <dd>
              {request?.requestId ?? "MISSING"} · v{request?.version ?? "—"}
            </dd>
            <dt>Original title</dt>
            <dd>{request?.title ?? "—"}</dd>
            <dt>Original purpose</dt>
            <dd>{request?.purpose || "—"}</dd>
            <dt>Source owner</dt>
            <dd>{request?.ownerId ?? "—"} · Customer source</dd>
          </dl>
        </section>

        <section className="content-review-card">
          <p className="content-review-eyebrow">CONTENT STAFF · READ-ONLY HERE</p>
          <h2>Current Auction Content</h2>
          <dl>
            <dt>Content ID / version</dt>
            <dd>
              {content?.contentId ?? "NOT INITIALIZED"} · v
              {content?.contentVersion ?? "—"}
            </dd>
            <dt>Auction title</dt>
            <dd>{content?.workingContent.auctionTitle || "Chưa có"}</dd>
            <dt>Auction summary</dt>
            <dd>{content?.workingContent.auctionSummary || "Chưa có"}</dd>
            <dt>Completeness</dt>
            <dd>
              {content?.completeness.complete
                ? "CONTENT DRAFT COMPLETE"
                : "INCOMPLETE"}
            </dd>
            <dt>Working owner</dt>
            <dd>Content Staff</dd>
          </dl>
        </section>

        <section className="content-review-card">
          <p className="content-review-eyebrow">
            CONFIGURATION GOVERNANCE · READ-ONLY
          </p>
          <h2>Configuration evidence</h2>
          <dl>
            <dt>Snapshot / Proposal</dt>
            <dd>
              {snapshot?.snapshotId ??
                legacySnapshot?.snapshotId ??
                "CURRENT SNAPSHOT MISSING"}{" "}
              · v
              {snapshot?.proposalVersion ??
                legacySnapshot?.proposalVersion ??
                "—"}
            </dd>
            <dt>Price Band</dt>
            <dd>{snapshot?.priceBandResolution.reference ?? "—"}</dd>
            <dt>Ordinary Room</dt>
            <dd>{snapshot?.roomResolution.displayName ?? "—"}</dd>
            <dt>Member Title</dt>
            <dd>{snapshot?.memberTitleReference.title ?? "—"}</dd>
            <dt>Member Listing Fee</dt>
            <dd>
              {snapshot?.listingFeeResolution.fee.kind === "AMOUNT"
                ? `${snapshot.listingFeeResolution.fee.amountVnd.toLocaleString("vi-VN")} VND`
                : snapshot?.listingFeeResolution.fee.sourceLabel ?? "—"}
            </dd>
          </dl>
          <Link to={`/ops/auctions/${session.sessionId}/rules`}>
            Mở Configuration workspace
          </Link>
        </section>

        <section className="content-review-card">
          <p className="content-review-eyebrow">MEMBERSHIP · READ-ONLY</p>
          <h2>Membership evidence</h2>
          <dl>
            <dt>Member ID</dt>
            <dd>{membership?.memberId ?? "MISSING"}</dd>
            <dt>Member Title</dt>
            <dd>{membership?.title ?? "—"}</dd>
            <dt>Reference version</dt>
            <dd>{membership?.referenceVersion ?? "—"}</dd>
            <dt>Source</dt>
            <dd>{membership?.sourceDomain ?? "—"}</dd>
          </dl>
        </section>
      </div>

      {notStartedBlocker && (
        <section className="content-review-blocker" role="alert">
          <strong>Content Review chưa đủ điều kiện bắt đầu</strong>
          <p>{notStartedBlocker}</p>
        </section>
      )}
      {currentEvidenceChanged && review && review.status !== "COMPLETED" && (
        <section className="content-review-blocker" role="alert">
          <strong>Authoritative evidence đã thay đổi</strong>
          <p>
            Review đang giữ Content v{review.lastEvaluatedContentVersion};
            current Content là v{content?.contentVersion}. Hãy explicit
            revalidate trước khi hoàn tất.
          </p>
        </section>
      )}
      {error && (
        <section className="content-review-blocker" role="alert">
          <strong>Không thể hoàn tất thao tác</strong>
          <p>{error}</p>
          <p>Review context được giữ nguyên; không có partial commit.</p>
        </section>
      )}
      <p className="content-review-success" aria-live="polite">
        {success}
      </p>

      <section className="content-review-card content-review-readiness">
        <div>
          <p className="content-review-eyebrow">SESSION PACKAGE</p>
          <h2>Package readiness</h2>
          <p className="content-review-projection">
            {projection === "READY_FOR_APPROVAL_PACKAGE_PREPARATION"
              ? "Ready for Approval Package preparation"
              : projection}
          </p>
          <p>
            Session remains <strong>DRAFT / NOT_READY</strong>. Approval
            Package: <strong>NOT CREATED</strong>.
          </p>
          <small>{PROTOTYPE_CONTENT_POLICY.classification}</small>
        </div>
        {review ? (
          <dl>
            <dt>Review ID / version</dt>
            <dd>
              {review.reviewId} · v{review.reviewVersion}
            </dd>
            <dt>Last evaluated Content</dt>
            <dd>
              {review.readiness.evaluatedContentId} · v
              {review.lastEvaluatedContentVersion}
            </dd>
            <dt>Evaluated Snapshot</dt>
            <dd>{review.readiness.evaluatedConfigurationSnapshotId}</dd>
            <dt>Evaluated Membership</dt>
            <dd>
              {review.readiness.evaluatedMembershipReferenceVersion ?? "—"}
            </dd>
            <dt>Blocking findings</dt>
            <dd>
              {
                review.readiness.findings.filter(
                  (item) => item.severity === "ERROR",
                ).length
              }
            </dd>
          </dl>
        ) : (
          <p>Content Review has not started.</p>
        )}
      </section>

      {review && (
        <section className="content-review-card">
          <h2>Findings grouped by owner</h2>
          {findingsByOwner.length ? (
            <div className="content-review-findings">
              {findingsByOwner.map(([owner, findings]) => (
                <section key={owner} aria-labelledby={`finding-owner-${owner}`}>
                  <h3 id={`finding-owner-${owner}`}>
                    Owner: {ownerLabel[owner]} ({owner})
                  </h3>
                  <ul>
                    {findings.map((finding) => (
                      <li key={`${finding.code}-${finding.field ?? ""}`}>
                        <strong>{finding.code}</strong>
                        <span>{finding.message}</span>
                        <small>
                          Section: {finding.section} · Severity:{" "}
                          {finding.severity} ·{" "}
                          {finding.correctableInContentWorkspace
                            ? "Correct through Auction Content"
                            : "Read-only external/governed finding"}
                        </small>
                        {finding.correctableInContentWorkspace && (
                          <Link
                            to={`/ops/auctions/${session.sessionId}/content`}
                            aria-label={`Mở Auction Content để chỉnh sửa ${finding.field ?? finding.code}`}
                          >
                            Mở Auction Content để chỉnh sửa
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p>Không còn blocking finding.</p>
          )}
        </section>
      )}

      <div className="content-review-actions">
        {!review && !notStartedBlocker && (
          <Button loading={busyAction === "start"} onClick={start}>
            Bắt đầu Content Review
          </Button>
        )}
        {review &&
          review.status !== "COMPLETED" &&
          (review.status === "CORRECTION_REQUIRED" ||
            review.status === "BLOCKED" ||
            review.status === "STALE" ||
            currentEvidenceChanged) && (
            <Button
              loading={busyAction === "revalidate"}
              onClick={revalidate}
            >
              Kiểm tra lại Session Package
            </Button>
          )}
        {review?.status === "READY_TO_COMPLETE" &&
          !currentEvidenceChanged && (
            <Button
              onClick={() => setDialogOpen(true)}
            >
              Hoàn tất Content Review
            </Button>
          )}
        <Link
          className="button secondary"
          to={`/ops/auctions/${session.sessionId}/content`}
        >
          Mở Auction Content
        </Link>
        <Link className="button secondary" to={`/ops/auctions/${session.sessionId}`}>
          Trở lại Session
        </Link>
      </div>

      {completionRecord && (
        <section className="content-review-card content-review-completion">
          <p className="content-review-eyebrow">IMMUTABLE COMPLETION EVIDENCE</p>
          <h2>Sẵn sàng chuẩn bị Approval Package</h2>
          <dl>
            <dt>Completion record</dt>
            <dd>
              {completionRecord.completionRecordId} · record v
              {completionRecord.recordVersion}
            </dd>
            <dt>Completed review</dt>
            <dd>
              {completionRecord.reviewId} · v{completionRecord.reviewVersion}
            </dd>
            <dt>Exact Content</dt>
            <dd>
              {completionRecord.contentId} · v
              {completionRecord.contentVersion}
            </dd>
            <dt>Exact Snapshot</dt>
            <dd>{completionRecord.configurationSnapshotId}</dd>
            <dt>Outcome</dt>
            <dd>Ready for Approval Package preparation</dd>
          </dl>
          <p>{completionRecord.prototypeClassification}</p>
          <p>
            This completion evidence is application-level deeply immutable;
            it is not described as tamper-proof backend evidence.
          </p>
          <Link
            className="button primary"
            to={`/ops/auctions/${session.sessionId}/approval-package`}
          >
            Chuẩn bị Approval Package
          </Link>
        </section>
      )}

      {review && (
        <section className="content-review-card content-review-history">
          <h2>Review history · staff-only</h2>
          <ol>
            {review.history
              .slice()
              .reverse()
              .map((entry) => (
                <li key={entry.historyId}>
                  <strong>{entry.action}</strong>
                  <span>
                    Review v{entry.reviewVersion} · Content v
                    {entry.evaluatedContentVersion} · {entry.toStatus}
                  </span>
                  <small>
                    {entry.commandId} · {entry.actorRole} · {entry.occurredAt} ·{" "}
                    {entry.visibility}
                  </small>
                </li>
              ))}
          </ol>
        </section>
      )}

      {review && content && snapshot && (
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Hoàn tất Content Review"
          description="Final authoritative revalidation occurs immediately before commit."
          size="lg"
          preventClose={busyAction === "complete"}
          panelClassName="content-review-dialog"
          footer={
            <>
              <Button
                variant="secondary"
                disabled={busyAction === "complete"}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                loading={busyAction === "complete"}
                onClick={complete}
              >
                Complete Content Review
              </Button>
            </>
          }
        >
          <section className="prototype-content-disclaimer" role="note">
            <strong>{PROTOTYPE_CONTENT_POLICY.classification}</strong>
          </section>
          <dl>
            <dt>Session ID / version</dt>
            <dd>
              {session.sessionId} · v{session.currentVersion}
            </dd>
            <dt>Review ID / version</dt>
            <dd>
              {review.reviewId} · v{review.reviewVersion}
            </dd>
            <dt>Opening Request</dt>
            <dd>
              {review.openingRequestId} · v
              {review.openingRequestVersionAtStart}
            </dd>
            <dt>Content ID / version</dt>
            <dd>
              {content.contentId} · v{content.contentVersion}
            </dd>
            <dt>Auction title</dt>
            <dd>{content.workingContent.auctionTitle}</dd>
            <dt>Auction summary</dt>
            <dd>{content.workingContent.auctionSummary}</dd>
            <dt>Configuration Snapshot / Proposal</dt>
            <dd>
              {snapshot.snapshotId} · v{snapshot.proposalVersion}
            </dd>
            <dt>Membership reference version</dt>
            <dd>{membership?.referenceVersion ?? "MISSING"}</dd>
            <dt>Readiness / warnings</dt>
            <dd>
              {review.readiness.ready ? "READY" : "BLOCKED"} /{" "}
              {
                review.readiness.findings.filter(
                  (item) => item.severity === "WARNING",
                ).length
              }
            </dd>
          </dl>
          <div className="content-review-dialog-statements">
            <p>This completes Content Review only.</p>
            <p>The Session remains DRAFT / NOT_READY.</p>
            <p>No Approval Package is created or submitted.</p>
            <p>The next step is Approval Package preparation.</p>
          </div>
          {error && (
            <div className="content-review-blocker" role="alert">
              <p>{error}</p>
              <p>Reload or revalidate while preserving this context.</p>
            </div>
          )}
        </Dialog>
      )}
    </main>
  );
}
