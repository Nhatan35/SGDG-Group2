import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { BlockedState } from "../../components/feedback/States";
import { useDemoStore } from "../../store/demoStore";
import {
  APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION,
  SGDG_APPROVAL_PACKAGE_BLOCKER_MESSAGE,
  collectAuthoritativeApprovalPackageSources,
  evaluateApprovalPackageEligibility,
  getApprovalPackageEvidenceValidity,
  type ApprovalPackageCommandResult,
  type ApprovalPackageFinding,
  useAuctionApprovalPackageStore,
} from "../../store/auctionApprovalPackageStore";
import {
  PROTOTYPE_CONTENT_POLICY,
  useAuctionContentStore,
} from "../../store/auctionContentStore";
import { useAuctionContentReviewStore } from "../../store/auctionContentReviewStore";
import { useAuctionConfigurationStore } from "../../store/auctionConfigurationStore";
import { useOpeningRequestStore } from "../../store/openingRequestStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import "../../styles/auction-approval-package.css";

const CONTENT_STAFF_ID = "content.staff@mock.local";
const resultError = (
  result: Extract<ApprovalPackageCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;
const ownerLabels: Record<ApprovalPackageFinding["owner"], string> = {
  CONTENT_STAFF: "Content Staff",
  CUSTOMER_SOURCE: "Customer source",
  MEMBERSHIP: "Membership",
  CONFIGURATION_GOVERNANCE: "Configuration Governance",
  CONTENT_REVIEW: "Content Review",
  AUCTION_SYSTEM: "Auction System",
  BUSINESS_DECISION: "Business Decision",
};

const feeLabel = (
  fee:
    | { kind: "AMOUNT"; amountVnd: number; unit: "PER_PRODUCT" }
    | { kind: "MP"; sourceLabel: "MP" | "MP/1SP" },
) =>
  fee.kind === "AMOUNT"
    ? `${fee.amountVnd.toLocaleString("vi-VN")} VND / sản phẩm`
    : fee.sourceLabel;

export function AuctionApprovalPackagePage() {
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
  useAuctionConfigurationStore((state) => state.legacySnapshots);
  const review = useAuctionContentReviewStore((state) =>
    state.reviews.find((item) => item.sessionId === sessionId),
  );
  const completionRecord = useAuctionContentReviewStore((state) =>
    state.completionRecords.find((item) => item.reviewId === review?.reviewId),
  );
  const packageValue = useAuctionApprovalPackageStore((state) =>
    state.packages.find((item) => item.sessionId === sessionId),
  );
  const submissionRecord = useAuctionApprovalPackageStore((state) =>
    state.submissionRecords.find(
      (item) => item.packageId === packageValue?.packageId,
    ),
  );
  const createDraft = useAuctionApprovalPackageStore(
    (state) => state.createApprovalPackageDraft,
  );
  const refreshDraft = useAuctionApprovalPackageStore(
    (state) => state.refreshApprovalPackageDraft,
  );
  const submitPackage = useAuctionApprovalPackageStore(
    (state) => state.submitApprovalPackage,
  );
  const [busy, setBusy] = useState<"create" | "refresh" | "submit">();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sources = collectAuthoritativeApprovalPackageSources(sessionId);
  const eligibility =
    session &&
    content &&
    snapshot &&
    review &&
    completionRecord &&
    !packageValue
      ? evaluateApprovalPackageEligibility({
          sources,
          actorRole,
          commandId: `CHECK_APPROVAL_PACKAGE:${sessionId}`,
          expectedSessionVersion: session.currentVersion,
          expectedContentVersion: content.contentVersion,
          expectedConfigurationSnapshotId: snapshot.snapshotId,
          expectedReviewVersion: review.reviewVersion,
          expectedCompletionRecordId: completionRecord.completionRecordId,
          approvalPackageExists: false,
        })
      : undefined;
  const evidence = packageValue?.evidence;
  const findingsByOwner = useMemo(() => {
    const grouped = new Map<
      ApprovalPackageFinding["owner"],
      ApprovalPackageFinding[]
    >();
    for (const finding of packageValue?.preparationValidation.findings ?? []) {
      const current = grouped.get(finding.owner) ?? [];
      grouped.set(finding.owner, [...current, finding]);
    }
    return [...grouped.entries()];
  }, [packageValue]);
  const evidenceValidity =
    packageValue?.status === "SUBMITTED"
      ? getApprovalPackageEvidenceValidity(packageValue)
      : undefined;

  const clearFeedback = () => {
    setError("");
    setSuccess("");
  };
  const create = () => {
    if (!session || !content || !snapshot || !review || !completionRecord)
      return;
    clearFeedback();
    setBusy("create");
    const result = createDraft({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ID,
      actorRole,
      expectedSessionVersion: session.currentVersion,
      expectedContentVersion: content.contentVersion,
      expectedConfigurationSnapshotId: snapshot.snapshotId,
      expectedReviewVersion: review.reviewVersion,
      expectedCompletionRecordId: completionRecord.completionRecordId,
      commandId: `CREATE_APPROVAL_PACKAGE:${session.sessionId}:S${session.currentVersion}:C${content.contentVersion}:R${review.reviewVersion}:${completionRecord.completionRecordId}`,
    });
    setBusy(undefined);
    if (!result.ok) {
      setError(resultError(result));
      return;
    }
    setSuccess(
      `Đã chuẩn bị ${result.package.packageId} · package v${result.package.packageVersion}.`,
    );
  };
  const refresh = () => {
    if (!packageValue || !session) return;
    clearFeedback();
    setBusy("refresh");
    const result = refreshDraft({
      packageId: packageValue.packageId,
      actorId: CONTENT_STAFF_ID,
      actorRole,
      expectedPackageVersion: packageValue.packageVersion,
      expectedSessionVersion: session.currentVersion,
      expectedContentVersion:
        content?.contentVersion ??
        packageValue.evidence.auctionContent.contentVersion,
      expectedConfigurationSnapshotId:
        snapshot?.snapshotId ??
        packageValue.evidence.configuration.snapshotId,
      expectedReviewVersion:
        review?.reviewVersion ??
        packageValue.evidence.contentReview.reviewVersion,
      expectedCompletionRecordId:
        completionRecord?.completionRecordId ??
        packageValue.evidence.contentReview.completionRecordId,
      commandId: `REFRESH_APPROVAL_PACKAGE:${packageValue.packageId}:P${packageValue.packageVersion}:S${session.currentVersion}:C${content?.contentVersion ?? packageValue.evidence.auctionContent.contentVersion}:R${review?.reviewVersion ?? packageValue.evidence.contentReview.reviewVersion}`,
    });
    setBusy(undefined);
    if (!result.ok) {
      setError(resultError(result));
      return;
    }
    setSuccess(
      result.changed
        ? `Đã kiểm tra và làm mới Package · v${result.package.packageVersion} · ${result.package.status}.`
        : `Authoritative evidence không đổi · Package vẫn ở v${result.package.packageVersion}.`,
    );
  };
  const submit = () => {
    if (
      !packageValue ||
      !session ||
      !content ||
      !snapshot ||
      !review ||
      !completionRecord
    )
      return;
    clearFeedback();
    setBusy("submit");
    const result = submitPackage({
      packageId: packageValue.packageId,
      actorId: CONTENT_STAFF_ID,
      actorRole,
      expectedPackageVersion: packageValue.packageVersion,
      expectedSessionVersion: session.currentVersion,
      expectedContentVersion: content.contentVersion,
      expectedConfigurationSnapshotId: snapshot.snapshotId,
      expectedReviewVersion: review.reviewVersion,
      expectedCompletionRecordId: completionRecord.completionRecordId,
      commandId: `SUBMIT_APPROVAL_PACKAGE:${packageValue.packageId}:P${packageValue.packageVersion}:S${session.currentVersion}:C${content.contentVersion}:R${review.reviewVersion}:${completionRecord.completionRecordId}`,
    });
    setBusy(undefined);
    if (!result.ok) {
      setError(resultError(result));
      return;
    }
    setDialogOpen(false);
    setSuccess(
      `Đã gửi để ADMIN xem xét · ${result.submissionRecord?.submissionRecordId} · AWAITING_ADMIN_REVIEW.`,
    );
  };

  if (!session)
    return (
      <main className="approval-package-page">
        <header className="approval-package-heading">
          <span>AUCTION OPERATIONS</span>
          <h1>Approval Package</h1>
        </header>
        <BlockedState
          title="Không tìm thấy dynamic Session"
          description="Dynamic Approval Package không sử dụng fixture fallback."
        />
      </main>
    );
  if (actorRole !== "CONTENT_STAFF")
    return (
      <main className="approval-package-page">
        <header className="approval-package-heading">
          <span>AUCTION OPERATIONS</span>
          <h1>Approval Package</h1>
        </header>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ CONTENT_STAFF được chuẩn bị, làm mới và gửi Approval Package."
        />
      </main>
    );
  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return (
      <main className="approval-package-page">
        <header className="approval-package-heading">
          <span>AUCTION OPERATIONS · GOVERNED PACKAGE</span>
          <h1>Approval Package</h1>
          <p>{PROTOTYPE_CONTENT_POLICY.classification}</p>
        </header>
        <section className="approval-package-alert" role="alert">
          <strong>{APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION}</strong>
          <p>{SGDG_APPROVAL_PACKAGE_BLOCKER_MESSAGE}</p>
          <p>
            Listing Fee business decision remains unresolved. No Package or
            ADMIN queue entry exists.
          </p>
        </section>
        <section className="approval-package-card">
          <h2>Session boundary</h2>
          <dl>
            <dt>Session</dt>
            <dd>{session.sessionId}</dd>
            <dt>Source / mode</dt>
            <dd>DIRECT_SGDG / SGDG_MANAGED</dd>
            <dt>Lifecycle / publication</dt>
            <dd>DRAFT / NOT_READY</dd>
            <dt>Approval Package</dt>
            <dd>BLOCKED BY CONFIGURATION</dd>
          </dl>
        </section>
      </main>
    );

  return (
    <main className="approval-package-page">
      <header className="approval-package-heading">
        <span>AUCTION OPERATIONS · GOVERNED PACKAGE PREPARATION</span>
        <h1>Approval Package</h1>
        <p>{PROTOTYPE_CONTENT_POLICY.classification}</p>
        <p>
          Package submission does not approve the Session or underlying
          prototype content.
        </p>
      </header>

      <section className="approval-package-card approval-package-identity">
        <div>
          <h2>{packageValue?.packageId ?? "Package chưa được tạo"}</h2>
          <p>{session.sessionId}</p>
        </div>
        <div className="approval-package-badges">
          <Badge>{packageValue?.status ?? "NOT CREATED"}</Badge>
          <Badge>DRAFT / NOT_READY</Badge>
        </div>
        <dl>
          <dt>Session code</dt>
          <dd>{session.auctionCode}</dd>
          <dt>Source / mode</dt>
          <dd>OPENING_REQUEST / CUSTOMER_REQUESTED</dd>
          <dt>Session version</dt>
          <dd>v{session.currentVersion}</dd>
          <dt>Package version</dt>
          <dd>{packageValue ? `v${packageValue.packageVersion}` : "—"}</dd>
          <dt>Eligibility</dt>
          <dd>
            {packageValue
              ? packageValue.status
              : eligibility?.eligible
                ? "ELIGIBLE"
                : eligibility
                  ? `${eligibility.code}: ${eligibility.message}`
                  : "NOT ELIGIBLE"}
          </dd>
        </dl>
      </section>

      {error && (
        <section className="approval-package-alert" role="alert">
          <strong>Không thể hoàn tất hành động</strong>
          <p>{error}</p>
        </section>
      )}
      {success && (
        <p className="approval-package-success" aria-live="polite">
          {success}
        </p>
      )}

      <div className="approval-package-grid">
        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            CUSTOMER SOURCE · READ-ONLY
          </p>
          <h2>Opening Request evidence</h2>
          <dl>
            <dt>Request</dt>
            <dd>
              {evidence?.openingRequest.openingRequestId ??
                request?.requestId ??
                "MISSING"}
            </dd>
            <dt>Version</dt>
            <dd>
              v
              {evidence?.openingRequest.openingRequestVersion ??
                request?.version ??
                "—"}
            </dd>
            <dt>Accepted state</dt>
            <dd>
              {evidence?.openingRequest.acceptedState ??
                request?.status ??
                "MISSING"}
            </dd>
            <dt>Original title</dt>
            <dd>
              {evidence?.openingRequest.originalTitle ??
                request?.title ??
                "MISSING"}
            </dd>
            <dt>Original purpose</dt>
            <dd>
              {evidence?.openingRequest.originalPurpose ??
                request?.purpose ??
                "MISSING"}
            </dd>
          </dl>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            AUCTION CONTENT · READ-ONLY HERE
          </p>
          <h2>Content evidence</h2>
          <dl>
            <dt>Content</dt>
            <dd>
              {evidence?.auctionContent.contentId ??
                content?.contentId ??
                "MISSING"}
            </dd>
            <dt>Version</dt>
            <dd>
              v
              {evidence?.auctionContent.contentVersion ??
                content?.contentVersion ??
                "—"}
            </dd>
            <dt>Title</dt>
            <dd>
              {evidence?.auctionContent.auctionTitle ??
                content?.workingContent.auctionTitle ??
                "MISSING"}
            </dd>
            <dt>Summary</dt>
            <dd>
              {evidence?.auctionContent.auctionSummary ??
                content?.workingContent.auctionSummary ??
                "MISSING"}
            </dd>
            <dt>Completeness</dt>
            <dd>
              {evidence?.auctionContent.completenessStatus ??
                content?.status ??
                "MISSING"}
            </dd>
          </dl>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            CONFIGURATION GOVERNANCE · READ-ONLY
          </p>
          <h2>Configuration evidence</h2>
          <dl>
            <dt>Snapshot</dt>
            <dd>
              {evidence?.configuration.snapshotId ??
                snapshot?.snapshotId ??
                "MISSING"}
            </dd>
            <dt>Proposal version</dt>
            <dd>
              v
              {evidence?.configuration.proposalVersion ??
                configuration?.proposalVersion ??
                "—"}
            </dd>
            <dt>Starting Price</dt>
            <dd>
              {(
                evidence?.configuration.startingPrice ??
                snapshot?.rules.startingPrice
              )?.toLocaleString("vi-VN") ?? "MISSING"}{" "}
              VND
            </dd>
            <dt>Price Band / Room</dt>
            <dd>
              {evidence?.configuration.priceBand ??
                snapshot?.priceBandResolution.reference ??
                "MISSING"}{" "}
              →{" "}
              {evidence?.configuration.ordinaryRoom ??
                snapshot?.roomResolution.roomReference ??
                "MISSING"}
            </dd>
            <dt>Membership</dt>
            <dd>
              {evidence?.configuration.membershipReferenceId ??
                snapshot?.memberTitleReference.memberId ??
                "MISSING"}{" "}
              ·{" "}
              {evidence?.configuration.memberTitle ??
                snapshot?.memberTitleReference.title ??
                "MISSING"}
            </dd>
            <dt>Listing Fee</dt>
            <dd>
              {evidence
                ? feeLabel(evidence.configuration.memberListingFee)
                : snapshot
                  ? feeLabel(snapshot.listingFeeResolution.fee)
                  : "MISSING"}
            </dd>
          </dl>
          <p>
            {evidence?.configuration.policyDisclaimer ??
              snapshot?.policyDisclaimer}
          </p>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            CONTENT REVIEW · READ-ONLY
          </p>
          <h2>Completion evidence</h2>
          <dl>
            <dt>Review</dt>
            <dd>
              {evidence?.contentReview.reviewId ??
                review?.reviewId ??
                "MISSING"}{" "}
              · v
              {evidence?.contentReview.reviewVersion ??
                review?.reviewVersion ??
                "—"}
            </dd>
            <dt>Completion Record</dt>
            <dd>
              {evidence?.contentReview.completionRecordId ??
                completionRecord?.completionRecordId ??
                "MISSING"}
            </dd>
            <dt>Readiness</dt>
            <dd>
              {evidence?.contentReview.readiness ??
                (completionRecord
                  ? "READY_FOR_APPROVAL_PACKAGE_PREPARATION"
                  : "NOT READY")}
            </dd>
            <dt>Completed by/at</dt>
            <dd>
              {evidence?.contentReview.completedBy ??
                completionRecord?.completedBy ??
                "—"}{" "}
              ·{" "}
              {evidence?.contentReview.completedAt ??
                completionRecord?.completedAt ??
                "—"}
            </dd>
          </dl>
        </section>
      </div>

      {packageValue && (
        <section className="approval-package-card">
          <h2>Package validation</h2>
          <p>
            {packageValue.preparationValidation.readyToSubmit
              ? "READY TO SUBMIT"
              : "BLOCKED / STALE"}{" "}
            · evaluated Content v
            {packageValue.preparationValidation.evaluatedContentVersion}
          </p>
          {findingsByOwner.length === 0 ? (
            <p>Không có blocking finding.</p>
          ) : (
            <div className="approval-package-findings">
              {findingsByOwner.map(([owner, findings]) => (
                <section key={owner}>
                  <h3>{ownerLabels[owner]}</h3>
                  {findings.map((finding) => (
                    <article key={`${owner}-${finding.code}`}>
                      <strong>{finding.code}</strong>
                      <span>
                        Owner: {ownerLabels[owner]} · Section:{" "}
                        {finding.section}
                      </span>
                      <p>{finding.message}</p>
                      <small>
                        Read-only here; correct in the authoritative upstream
                        workspace.
                      </small>
                    </article>
                  ))}
                </section>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="approval-package-card approval-package-boundary">
        <h2>Submission boundary</h2>
        <p>This submits the Approval Package for ADMIN review only.</p>
        <p>No approval decision is made by this action.</p>
        <p>The Session remains DRAFT / NOT_READY.</p>
        <p>No Schedule or Publication is created.</p>
        {packageValue?.status === "SUBMITTED" && (
          <dl>
            <dt>Submission Record</dt>
            <dd>{submissionRecord?.submissionRecordId}</dd>
            <dt>Queue state</dt>
            <dd>AWAITING_ADMIN_REVIEW</dd>
            <dt>Evidence validity</dt>
            <dd>{evidenceValidity}</dd>
          </dl>
        )}
      </section>

      <div className="approval-package-actions">
        {!packageValue && eligibility?.eligible && (
          <Button
            onClick={create}
            loading={busy === "create"}
            loadingText="Đang chuẩn bị"
          >
            Chuẩn bị Approval Package
          </Button>
        )}
        {packageValue?.status === "READY_TO_SUBMIT" && (
          <Button onClick={() => setDialogOpen(true)}>
            Gửi Approval Package
          </Button>
        )}
        {packageValue &&
          ["STALE", "BLOCKED"].includes(packageValue.status) && (
            <Button
              onClick={refresh}
              loading={busy === "refresh"}
              loadingText="Đang kiểm tra"
            >
              Kiểm tra và làm mới Package
            </Button>
          )}
        {packageValue?.status === "SUBMITTED" && (
          <p aria-live="polite">
            <strong>Đã gửi để ADMIN xem xét</strong>
          </p>
        )}
      </div>

      {packageValue && (
        <section className="approval-package-card approval-package-history">
          <h2>Package history · STAFF ONLY</h2>
          <ol>
            {packageValue.history.map((entry) => (
              <li key={entry.historyId}>
                <strong>{entry.action}</strong>
                <span>
                  Package v{entry.packageVersion} · {entry.resultingStatus}
                </span>
                <small>
                  {entry.actorRole} · {entry.occurredAt} · {entry.visibility}
                </small>
              </li>
            ))}
          </ol>
        </section>
      )}

      {packageValue && (
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Gửi Approval Package"
          description="Final authoritative revalidation occurs before the immutable submission is recorded."
          size="lg"
          preventClose={busy === "submit"}
          panelClassName="approval-package-dialog"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setDialogOpen(false)}
                disabled={busy === "submit"}
              >
                Cancel
              </Button>
              <Button
                onClick={submit}
                loading={busy === "submit"}
                loadingText="Đang gửi"
              >
                Submit Approval Package
              </Button>
            </>
          }
        >
          <dl>
            <dt>Package</dt>
            <dd>
              {packageValue.packageId} · v{packageValue.packageVersion}
            </dd>
            <dt>Session</dt>
            <dd>
              {packageValue.evidence.session.sessionId} · v
              {packageValue.evidence.session.sessionVersion}
            </dd>
            <dt>Opening Request</dt>
            <dd>
              {packageValue.evidence.openingRequest.openingRequestId} · v
              {packageValue.evidence.openingRequest.openingRequestVersion}
            </dd>
            <dt>Content</dt>
            <dd>
              {packageValue.evidence.auctionContent.contentId} · v
              {packageValue.evidence.auctionContent.contentVersion}
            </dd>
            <dt>Title</dt>
            <dd>{packageValue.evidence.auctionContent.auctionTitle}</dd>
            <dt>Summary</dt>
            <dd>{packageValue.evidence.auctionContent.auctionSummary}</dd>
            <dt>Configuration Snapshot</dt>
            <dd>
              {packageValue.evidence.configuration.snapshotId} · proposal v
              {packageValue.evidence.configuration.proposalVersion}
            </dd>
            <dt>Review / Completion</dt>
            <dd>
              {packageValue.evidence.contentReview.reviewId} · v
              {packageValue.evidence.contentReview.reviewVersion} ·{" "}
              {packageValue.evidence.contentReview.completionRecordId}
            </dd>
            <dt>Validation / warnings</dt>
            <dd>
              {packageValue.preparationValidation.readyToSubmit
                ? "READY TO SUBMIT"
                : "BLOCKED"}{" "}
              · {packageValue.preparationValidation.findings.length}
            </dd>
          </dl>
          <div className="approval-package-dialog-statements">
            <p>{PROTOTYPE_CONTENT_POLICY.classification}</p>
            <p>This submits the Approval Package for ADMIN review only.</p>
            <p>No approval decision is made by this action.</p>
            <p>The Session remains DRAFT / NOT_READY.</p>
            <p>No Schedule or Publication is created.</p>
          </div>
          {error && (
            <div className="approval-package-alert" role="alert">
              {error}
            </div>
          )}
        </Dialog>
      )}
    </main>
  );
}
