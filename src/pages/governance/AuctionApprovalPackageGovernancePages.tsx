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
          <span>QUẢN TRỊ PHÊ DUYỆT</span>
          <h1>Phê duyệt hồ sơ đấu giá</h1>
        </header>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ Admin được xem hàng đợi hồ sơ đấu giá đã gửi."
        />
      </main>
    );
  return (
    <main className="approval-package-page">
      <header className="approval-package-heading">
        <span>QUẢN TRỊ PHÊ DUYỆT · HÀNG ĐỢI CHỈ ĐỌC</span>
          <h1>Phê duyệt hồ sơ đấu giá</h1>
        <p>{PROTOTYPE_CONTENT_POLICY.classification}</p>
        <p>
          Hồ sơ do Nhân viên nội dung gửi để Admin kiểm tra tính đầy đủ trước
          khi bắt đầu quyết định phê duyệt.
        </p>
      </header>
      <section className="approval-package-card">
        <h2>Hàng đợi hồ sơ hợp lệ</h2>
        <p>
          Chỉ hồ sơ động đã gửi, đúng phiên bản và đủ bằng chứng mới xuất hiện.
          Bản nháp, hồ sơ bị chặn và dữ liệu mẫu cũ được loại khỏi hàng đợi.
        </p>
      </section>
      {queue.length === 0 ? (
        <section className="approval-package-card">
          <h2>Không có hồ sơ đang chờ xem xét</h2>
          <p>
            Nhân viên nội dung cần hoàn tất cấu hình, nội dung và kiểm tra sẵn
            sàng, sau đó chọn “Gửi hồ sơ phê duyệt”.
          </p>
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
                <dt>Nguồn / chế độ</dt>
                <dd>
                  {item.creationSource} / {item.managementMode}
                </dd>
                <dt>Phiên bản hồ sơ đã gửi</dt>
                <dd>v{item.submittedPackageVersion}</dd>
                <dt>Content version</dt>
                <dd>v{item.contentVersion}</dd>
                <dt>Bản chụp cấu hình</dt>
                <dd>{item.configurationSnapshotId}</dd>
                <dt>Completion Record</dt>
                <dd>{item.completionRecordId}</dd>
                <dt>Người gửi / thời điểm</dt>
                <dd>
                  {item.submittedBy} · {item.submittedAt}
                </dd>
              </dl>
              {item.evidenceValidity === "STALE_AFTER_SUBMISSION" && (
                <p className="approval-package-alert" role="alert">
                  Bằng chứng nguồn đã thay đổi sau khi gửi. Hồ sơ đã gửi vẫn
                  được giữ nguyên; cần tạo vòng chỉnh sửa mới tại nghiệp vụ nguồn.
                </p>
              )}
              <Link
                className="button secondary"
                to={`/governance/auction-approval-packages/${item.packageId}`}
              >
                Xem bằng chứng hồ sơ
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
          <span>QUẢN TRỊ PHÊ DUYỆT</span>
          <h1>Chi tiết hồ sơ phê duyệt</h1>
        </header>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ Admin được xem chi tiết hồ sơ đã gửi."
        />
      </main>
    );
  if (!packageValue || packageValue.status !== "SUBMITTED" || !submission)
    return (
      <main className="approval-package-page">
        <header className="approval-package-heading">
          <span>QUẢN TRỊ PHÊ DUYỆT</span>
          <h1>Chi tiết hồ sơ phê duyệt</h1>
        </header>
        <BlockedState
          title="Không tìm thấy hồ sơ động đã gửi"
          description="Bản nháp, hồ sơ không hợp lệ và dữ liệu mẫu cũ không xuất hiện tại đây."
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
        <span>QUẢN TRỊ PHÊ DUYỆT · BẰNG CHỨNG CHỈ ĐỌC</span>
        <h1>Chi tiết hồ sơ phê duyệt</h1>
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
              Bắt đầu thẩm định
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
          <p className="approval-package-eyebrow">HỒ SƠ ĐÃ GỬI · CHỈ ĐỌC</p>
          <h2>Bản ghi gửi duyệt</h2>
          <dl>
            <dt>Mã bản ghi</dt>
            <dd>
              {submission.submissionRecordId} · v{submission.recordVersion}
            </dd>
            <dt>Phiên bản hồ sơ đã gửi</dt>
            <dd>v{submission.submittedPackageVersion}</dd>
            <dt>Người gửi / thời điểm</dt>
            <dd>
              {submission.submittedBy} · {submission.submittedAt}
            </dd>
            <dt>Trạng thái hàng đợi</dt>
            <dd>{submission.queueState}</dd>
          </dl>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">PHIÊN ĐẤU GIÁ · CHỈ ĐỌC</p>
          <h2>Bằng chứng phiên đấu giá</h2>
          <dl>
            <dt>Phiên đấu giá</dt>
            <dd>
              {evidence.session.sessionId} · {evidence.session.sessionCode}
            </dd>
            <dt>Phiên bản</dt>
            <dd>v{evidence.session.sessionVersion}</dd>
            <dt>Nguồn / chế độ</dt>
            <dd>
              {evidence.session.creationSource} /{" "}
              {evidence.session.managementMode}
            </dd>
            <dt>Vòng đời / công bố</dt>
            <dd>
              {evidence.session.lifecycleStatus} /{" "}
              {evidence.session.publicationStatus}
            </dd>
          </dl>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            NGUỒN CUSTOMER · CHỈ ĐỌC
          </p>
          <h2>Nguồn gốc yêu cầu mở phiên</h2>
          <dl>
            <dt>Yêu cầu</dt>
            <dd>
              {evidence.openingRequest.openingRequestId} · v
              {evidence.openingRequest.openingRequestVersion}
            </dd>
            <dt>Customer</dt>
            <dd>{evidence.openingRequest.customerId}</dd>
            <dt>Trạng thái tiếp nhận</dt>
            <dd>{evidence.openingRequest.acceptedState}</dd>
            <dt>Tiêu đề ban đầu</dt>
            <dd>{evidence.openingRequest.originalTitle}</dd>
            <dt>Mục đích ban đầu</dt>
            <dd>{evidence.openingRequest.originalPurpose}</dd>
          </dl>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            NỘI DUNG ĐẤU GIÁ · CHỈ ĐỌC
          </p>
          <h2>Bằng chứng nội dung</h2>
          <dl>
            <dt>Content</dt>
            <dd>
              {evidence.auctionContent.contentId} · v
              {evidence.auctionContent.contentVersion}
            </dd>
            <dt>Tiêu đề</dt>
            <dd>{evidence.auctionContent.auctionTitle}</dd>
            <dt>Tóm tắt</dt>
            <dd>{evidence.auctionContent.auctionSummary}</dd>
            <dt>Mức độ hoàn thiện</dt>
            <dd>{evidence.auctionContent.completenessStatus}</dd>
          </dl>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            CẤU HÌNH · CHỈ ĐỌC
          </p>
          <h2>Bằng chứng cấu hình</h2>
          <dl>
            <dt>Bản chụp / đề xuất</dt>
            <dd>
              {evidence.configuration.snapshotId} · v
              {evidence.configuration.proposalVersion}
            </dd>
            <dt>Giá khởi điểm</dt>
            <dd>
              {evidence.configuration.startingPrice.toLocaleString("vi-VN")}{" "}
              VND
            </dd>
            <dt>Dải giá / phòng đấu giá</dt>
            <dd>
              {evidence.configuration.priceBand} →{" "}
              {evidence.configuration.ordinaryRoom}
            </dd>
            <dt>Hạng thành viên</dt>
            <dd>
              {evidence.configuration.memberTitle} ·{" "}
              {evidence.configuration.membershipReferenceVersion}
            </dd>
            <dt>Phí đăng sản phẩm</dt>
            <dd>{feeLabel(evidence.configuration.memberListingFee)}</dd>
          </dl>
          <p>{evidence.configuration.policyDisclaimer}</p>
        </section>

        <section className="approval-package-card">
          <p className="approval-package-eyebrow">
            THẨM ĐỊNH NỘI DUNG · CHỈ ĐỌC
          </p>
          <h2>Bằng chứng hoàn tất</h2>
          <dl>
            <dt>Review</dt>
            <dd>
              {evidence.contentReview.reviewId} · v
              {evidence.contentReview.reviewVersion}
            </dd>
            <dt>Bản ghi hoàn tất</dt>
            <dd>
              {evidence.contentReview.completionRecordId} · v
              {evidence.contentReview.completionRecordVersion}
            </dd>
            <dt>Người / thời điểm hoàn tất</dt>
            <dd>
              {evidence.contentReview.completedBy} ·{" "}
              {evidence.contentReview.completedAt}
            </dd>
            <dt>Mức độ sẵn sàng</dt>
            <dd>{evidence.contentReview.readiness}</dd>
          </dl>
        </section>
      </div>

      <section className="approval-package-card approval-package-boundary">
        <h2>Phạm vi thẩm định của Admin</h2>
        <p>Chưa có quyết định phê duyệt nào được đưa ra.</p>
        <p>Phiên vẫn ở trạng thái bản nháp/chưa sẵn sàng.</p>
        <p>Chưa tạo lịch hoặc bản công bố.</p>
        <p>
          Màn hình này chỉ dùng để xem. Các thao tác phê duyệt, trả lại, từ
          chối, lên lịch và công bố chưa áp dụng cho hồ sơ động ở giai đoạn này.
        </p>
      </section>
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Bắt đầu thẩm định hồ sơ"
        description="Hành động này chỉ bắt đầu bước tiếp nhận thẩm định."
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
        <p>Hồ sơ đã gửi vẫn được giữ nguyên để truy vết.</p>
        <p>Phiên vẫn ở trạng thái bản nháp/chưa sẵn sàng.</p>
        <p>Không tạo lịch hoặc bản công bố ở bước này.</p>
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
        <h1>Thẩm định hồ sơ</h1>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ Admin được xem nội dung thẩm định hồ sơ."
        />
      </main>
    );
  if (!review || !packageValue || !submission)
    return (
      <main className="approval-package-page">
        <h1>Thẩm định hồ sơ</h1>
        <BlockedState
          title="Không tìm thấy hồ sơ thẩm định"
          description="Hồ sơ thẩm định không hợp lệ hoặc không còn dữ liệu nguồn sẽ không được hiển thị."
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
        <span>QUẢN TRỊ PHÊ DUYỆT · TIẾP NHẬN THẨM ĐỊNH</span>
        <h1>Thẩm định hồ sơ</h1>
        <p>{PROTOTYPE_CONTENT_POLICY.classification}</p>
      </header>
      <section className="approval-package-card approval-package-identity">
        <div>
          <h2>{review.reviewId}</h2>
          <p>
            Review v{review.reviewVersion} · {review.status}
          </p>
          <p>
            Bắt đầu bởi {review.startedBy} · {review.startedAt}
          </p>
        </div>
        <Badge>{review.status}</Badge>
        {review.status === "IN_REVIEW" && (
          <Button onClick={runRevalidation}>Kiểm tra lại bằng chứng</Button>
        )}
        {message && <p role="status">{message}</p>}
      </section>
      <section className="approval-package-card">
        <h2>Tham chiếu được quản trị</h2>
        <dl>
          <dt>Package</dt>
          <dd>
            {review.packageId} · v{review.packageVersionAtStart}
          </dd>
          <dt>Bản ghi gửi duyệt</dt>
          <dd>{review.submissionRecordId}</dd>
          <dt>Phiên đấu giá</dt>
          <dd>
            {review.sessionId} · v{review.sessionVersionAtStart}
          </dd>
          <dt>Content</dt>
          <dd>
            {review.startEvidence.contentId} · v
            {review.startEvidence.contentVersion}
          </dd>
          <dt>Bản chụp cấu hình</dt>
          <dd>{review.startEvidence.configurationSnapshotId}</dd>
          <dt>Hoàn tất thẩm định nội dung</dt>
          <dd>{review.startEvidence.contentReviewCompletionRecordId}</dd>
        </dl>
      </section>
      <section className="approval-package-card">
        <h2>Hiệu lực bằng chứng hiện tại</h2>
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
            <li>Không có phát hiện cần xử lý.</li>
          )}
        </ul>
      </section>
      <section className="approval-package-card">
        <h2>Bằng chứng hồ sơ đã gửi · chỉ đọc</h2>
        <p>
          {packageValue.evidence.auctionContent.auctionTitle} ·{" "}
          {packageValue.evidence.auctionContent.auctionSummary}
        </p>
        <p>
          Hồ sơ {packageValue.status} · Bản ghi gửi duyệt{" "}
          {submission.submissionRecordId}
        </p>
      </section>
      <section className="approval-package-card">
        <h2>Lịch sử thẩm định</h2>
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
          Đây là prototype frontend: hồ sơ vẫn ở trạng thái SUBMITTED; phiên
          vẫn là DRAFT / NOT_READY. Chưa có quyết định, lịch hoặc bản công bố.
        </p>
      </section>
    </main>
  );
}
