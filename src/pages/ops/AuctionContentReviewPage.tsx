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
  CONTENT_STAFF: "Nhân viên nội dung",
  CUSTOMER_SOURCE: "Nguồn khách hàng",
  PRODUCT_ASSET: "Sản phẩm / tài sản",
  MEMBERSHIP: "Quản lý thành viên",
  CONFIGURATION_GOVERNANCE: "Quản trị cấu hình",
  AUCTION_SYSTEM: "Hệ thống đấu giá",
  BUSINESS_DECISION: "Quyết định nghiệp vụ",
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
        ? `Đã kiểm tra lại hồ sơ phiên · thẩm định v${result.review.reviewVersion}.`
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
      `Đã hoàn tất thẩm định nội dung. Biên bản hoàn tất: ${result.completionRecord?.completionRecordId}.`,
    );
  };

  if (!session)
    return (
      <main className="content-review-page">
        <header className="content-review-heading">
          <span>VẬN HÀNH ĐẤU GIÁ</span>
          <h1>Thẩm định nội dung</h1>
        </header>
        <BlockedState
          title="Không tìm thấy phiên đấu giá"
          description="Thẩm định nội dung không sử dụng dữ liệu mẫu thay thế."
        />
      </main>
    );

  if (actorRole !== "CONTENT_STAFF")
    return (
      <main className="content-review-page">
        <header className="content-review-heading">
          <span>VẬN HÀNH ĐẤU GIÁ</span>
          <h1>Thẩm định nội dung</h1>
        </header>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ Nhân viên nội dung được xem và cập nhật hồ sơ thẩm định nội bộ."
        />
      </main>
    );

  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return (
      <main className="content-review-page">
        <header className="content-review-heading">
          <span>VẬN HÀNH ĐẤU GIÁ · HỒ SƠ PHIÊN</span>
          <h1>Thẩm định nội dung</h1>
        </header>
        <section className="prototype-content-disclaimer" role="note">
          <strong>{PROTOTYPE_CONTENT_POLICY.classification}</strong>
        </section>
        <section className="content-review-blocker" role="alert">
          <strong>{CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION}</strong>
          <p>{SGDG_CONTENT_REVIEW_BLOCKER_MESSAGE}</p>
        </section>
        <section className="content-review-card">
          <h2>Phạm vi phiên do SGDG quản lý</h2>
          <dl>
            <dt>Phiên đấu giá</dt>
            <dd>{session.sessionId}</dd>
            <dt>Cấu hình</dt>
            <dd>CẦN CHỐT NGHIỆP VỤ</dd>
            <dt>Nội dung đấu giá</dt>
            <dd>CHƯA THỰC HIỆN</dd>
            <dt>Thẩm định nội dung</dt>
            <dd>ĐANG BỊ CHẶN BỞI CẤU HÌNH</dd>
            <dt>Biên bản hoàn tất</dt>
            <dd>CHƯA CÓ</dd>
            <dt>Hồ sơ phê duyệt</dt>
            <dd>CHƯA CÓ</dd>
          </dl>
          <Link className="button secondary" to={`/ops/auctions/${session.sessionId}`}>
            Trở lại phiên
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
      ? "AUCTION_CONTENT_NOT_INITIALIZED: Khởi tạo nội dung đấu giá trước khi bắt đầu thẩm định."
      : legacySnapshot && !snapshot
        ? "CONFIGURATION_SNAPSHOT_LEGACY_ONLY: cần governed revalidation."
        : !snapshot
          ? "CONFIGURATION_SNAPSHOT_MISSING: cần bản chụp cấu hình đã xác nhận hiện hành."
          : eligibility && !eligibility.eligible
            ? `${eligibility.code}: ${eligibility.message}`
            : ""
    : "";

  return (
    <main className="content-review-page">
      <header className="content-review-heading">
        <span>VẬN HÀNH ĐẤU GIÁ · HỒ SƠ PHIÊN CHÍNH THỨC</span>
        <h1>Thẩm định nội dung</h1>
        <p>
          Bằng chứng thẩm định được quản lý phiên bản độc lập và đối chiếu
          với dữ liệu chính thức hiện tại.
        </p>
      </header>

      <section className="prototype-content-disclaimer" role="note">
        <strong>{PROTOTYPE_CONTENT_POLICY.classification}</strong>
        <p>
          Việc thẩm định không đồng nghĩa nội dung làm việc đã được phê duyệt,
          công khai hoặc đủ điều kiện xuất bản.
        </p>
      </section>

      <section className="content-review-card content-review-identity">
        <div>
          <h2>Thông tin phiên đấu giá</h2>
          <dl>
            <dt>Mã phiên / mã đấu giá</dt>
            <dd>
              {session.sessionId} · {session.auctionCode}
            </dd>
            <dt>Nguồn tạo / chế độ quản lý</dt>
            <dd>
              {session.creationSource} / {session.managementMode}
            </dd>
            <dt>Phiên bản</dt>
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
            {review?.status ?? "CHƯA BẮT ĐẦU"}
          </Badge>
        </div>
      </section>

      <div className="content-review-evidence-grid">
        <section className="content-review-card">
          <p className="content-review-eyebrow">NGUỒN KHÁCH HÀNG · CHỈ ĐỌC</p>
          <h2>Thông tin yêu cầu mở phiên</h2>
          <dl>
            <dt>Mã yêu cầu / phiên bản</dt>
            <dd>
              {request?.requestId ?? "THIẾU"} · v{request?.version ?? "—"}
            </dd>
            <dt>Tiêu đề ban đầu</dt>
            <dd>{request?.title ?? "—"}</dd>
            <dt>Mục đích ban đầu</dt>
            <dd>{request?.purpose || "—"}</dd>
            <dt>Chủ sở hữu nguồn</dt>
            <dd>{request?.ownerId ?? "—"} · Nguồn khách hàng</dd>
          </dl>
        </section>

        <section className="content-review-card">
          <p className="content-review-eyebrow">NHÂN VIÊN NỘI DUNG · CHỈ ĐỌC TẠI ĐÂY</p>
          <h2>Nội dung đấu giá hiện tại</h2>
          <dl>
            <dt>Mã nội dung / phiên bản</dt>
            <dd>
              {content?.contentId ?? "CHƯA KHỞI TẠO"} · v
              {content?.contentVersion ?? "—"}
            </dd>
            <dt>Tiêu đề đấu giá</dt>
            <dd>{content?.workingContent.auctionTitle || "Chưa có"}</dd>
            <dt>Tóm tắt đấu giá</dt>
            <dd>{content?.workingContent.auctionSummary || "Chưa có"}</dd>
            <dt>Mức độ hoàn thiện</dt>
            <dd>
              {content?.completeness.complete
                ? "BẢN NHÁP ĐÃ ĐẦY ĐỦ"
                : "CHƯA ĐẦY ĐỦ"}
            </dd>
            <dt>Người phụ trách</dt>
            <dd>Nhân viên nội dung</dd>
          </dl>
        </section>

        <section className="content-review-card">
          <p className="content-review-eyebrow">
            QUẢN TRỊ CẤU HÌNH · CHỈ ĐỌC
          </p>
          <h2>Bằng chứng cấu hình</h2>
          <dl>
            <dt>Bản chụp / đề xuất</dt>
            <dd>
              {snapshot?.snapshotId ??
                legacySnapshot?.snapshotId ??
                "THIẾU BẢN CHỤP HIỆN HÀNH"}{" "}
              · v
              {snapshot?.proposalVersion ??
                legacySnapshot?.proposalVersion ??
                "—"}
            </dd>
            <dt>Khung giá</dt>
            <dd>{snapshot?.priceBandResolution.reference ?? "—"}</dd>
            <dt>Phòng đấu giá thường</dt>
            <dd>{snapshot?.roomResolution.displayName ?? "—"}</dd>
            <dt>Hạng thành viên</dt>
            <dd>{snapshot?.memberTitleReference.title ?? "—"}</dd>
            <dt>Phí niêm yết thành viên</dt>
            <dd>
              {snapshot?.listingFeeResolution.fee.kind === "AMOUNT"
                ? `${snapshot.listingFeeResolution.fee.amountVnd.toLocaleString("vi-VN")} VND`
                : snapshot?.listingFeeResolution.fee.sourceLabel ?? "—"}
            </dd>
          </dl>
          <Link to={`/ops/auctions/${session.sessionId}/rules`}>
            Mở khu vực cấu hình
          </Link>
        </section>

        <section className="content-review-card">
          <p className="content-review-eyebrow">THÀNH VIÊN · CHỈ ĐỌC</p>
          <h2>Thông tin thành viên</h2>
          <dl>
            <dt>Mã thành viên</dt>
            <dd>{membership?.memberId ?? "THIẾU"}</dd>
            <dt>Hạng thành viên</dt>
            <dd>{membership?.title ?? "—"}</dd>
            <dt>Phiên bản tham chiếu</dt>
            <dd>{membership?.referenceVersion ?? "—"}</dd>
            <dt>Nguồn</dt>
            <dd>{membership?.sourceDomain ?? "—"}</dd>
          </dl>
        </section>
      </div>

      {notStartedBlocker && (
        <section className="content-review-blocker" role="alert">
          <strong>Thẩm định nội dung chưa đủ điều kiện bắt đầu</strong>
          <p>{notStartedBlocker}</p>
        </section>
      )}
      {currentEvidenceChanged && review && review.status !== "COMPLETED" && (
        <section className="content-review-blocker" role="alert">
          <strong>Dữ liệu chính thức đã thay đổi</strong>
          <p>
            Hồ sơ thẩm định đang giữ nội dung v{review.lastEvaluatedContentVersion};
            nội dung hiện tại là v{content?.contentVersion}. Hãy kiểm tra lại
            trước khi hoàn tất.
          </p>
        </section>
      )}
      {error && (
        <section className="content-review-blocker" role="alert">
          <strong>Không thể hoàn tất thao tác</strong>
          <p>{error}</p>
          <p>Ngữ cảnh thẩm định được giữ nguyên; không ghi nhận dữ liệu dở dang.</p>
        </section>
      )}
      <p className="content-review-success" aria-live="polite">
        {success}
      </p>

      <section className="content-review-card content-review-readiness">
        <div>
          <p className="content-review-eyebrow">HỒ SƠ PHIÊN</p>
          <h2>Mức độ sẵn sàng của hồ sơ</h2>
          <p className="content-review-projection">
            {projection === "READY_FOR_APPROVAL_PACKAGE_PREPARATION"
              ? "Sẵn sàng chuẩn bị hồ sơ phê duyệt"
              : projection}
          </p>
          <p>
            Phiên vẫn ở trạng thái <strong>BẢN NHÁP / CHƯA SẴN SÀNG</strong>.
            Hồ sơ phê duyệt: <strong>CHƯA TẠO</strong>.
          </p>
          <small>{PROTOTYPE_CONTENT_POLICY.classification}</small>
        </div>
        {review ? (
          <dl>
            <dt>Mã thẩm định / phiên bản</dt>
            <dd>
              {review.reviewId} · v{review.reviewVersion}
            </dd>
            <dt>Nội dung được đánh giá gần nhất</dt>
            <dd>
              {review.readiness.evaluatedContentId} · v
              {review.lastEvaluatedContentVersion}
            </dd>
            <dt>Bản chụp đã đánh giá</dt>
            <dd>{review.readiness.evaluatedConfigurationSnapshotId}</dd>
            <dt>Tham chiếu thành viên đã đánh giá</dt>
            <dd>
              {review.readiness.evaluatedMembershipReferenceVersion ?? "—"}
            </dd>
            <dt>Vấn đề đang chặn</dt>
            <dd>
              {
                review.readiness.findings.filter(
                  (item) => item.severity === "ERROR",
                ).length
              }
            </dd>
          </dl>
        ) : (
          <p>Chưa bắt đầu thẩm định nội dung.</p>
        )}
      </section>

      {review && (
        <section className="content-review-card">
          <h2>Vấn đề theo đơn vị phụ trách</h2>
          {findingsByOwner.length ? (
            <div className="content-review-findings">
              {findingsByOwner.map(([owner, findings]) => (
                <section key={owner} aria-labelledby={`finding-owner-${owner}`}>
                  <h3 id={`finding-owner-${owner}`}>
                    Phụ trách: {ownerLabel[owner]} ({owner})
                  </h3>
                  <ul>
                    {findings.map((finding) => (
                      <li key={`${finding.code}-${finding.field ?? ""}`}>
                        <strong>{finding.code}</strong>
                        <span>{finding.message}</span>
                        <small>
                          Khu vực: {finding.section} · Mức độ:{" "}
                          {finding.severity} ·{" "}
                          {finding.correctableInContentWorkspace
                            ? "Chỉnh sửa tại Nội dung đấu giá"
                            : "Vấn đề chỉ đọc từ nguồn ngoài hoặc nguồn quản trị"}
                        </small>
                        {finding.correctableInContentWorkspace && (
                          <Link
                            to={`/ops/auctions/${session.sessionId}/content`}
                            aria-label={`Mở nội dung đấu giá để chỉnh sửa ${finding.field ?? finding.code}`}
                          >
                            Mở nội dung đấu giá để chỉnh sửa
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
            Bắt đầu thẩm định nội dung
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
              Kiểm tra lại hồ sơ phiên
            </Button>
          )}
        {review?.status === "READY_TO_COMPLETE" &&
          !currentEvidenceChanged && (
            <Button
              onClick={() => setDialogOpen(true)}
            >
              Hoàn tất thẩm định nội dung
            </Button>
          )}
        <Link
          className="button secondary"
          to={`/ops/auctions/${session.sessionId}/content`}
        >
          Mở nội dung đấu giá
        </Link>
        <Link className="button secondary" to={`/ops/auctions/${session.sessionId}`}>
          Trở lại phiên
        </Link>
      </div>

      {completionRecord && (
        <section className="content-review-card content-review-completion">
          <p className="content-review-eyebrow">BIÊN BẢN HOÀN TẤT BẤT BIẾN</p>
          <h2>Sẵn sàng chuẩn bị hồ sơ phê duyệt</h2>
          <dl>
            <dt>Biên bản hoàn tất</dt>
            <dd>
              {completionRecord.completionRecordId} · record v
              {completionRecord.recordVersion}
            </dd>
            <dt>Hồ sơ thẩm định đã hoàn tất</dt>
            <dd>
              {completionRecord.reviewId} · v{completionRecord.reviewVersion}
            </dd>
            <dt>Đúng phiên bản nội dung</dt>
            <dd>
              {completionRecord.contentId} · v
              {completionRecord.contentVersion}
            </dd>
            <dt>Đúng bản chụp cấu hình</dt>
            <dd>{completionRecord.configurationSnapshotId}</dd>
            <dt>Kết quả</dt>
            <dd>Sẵn sàng chuẩn bị hồ sơ phê duyệt</dd>
          </dl>
          <p>{completionRecord.prototypeClassification}</p>
          <p>
            Biên bản hoàn tất được khóa ở cấp ứng dụng; đây không phải tuyên
            bố về bằng chứng chống can thiệp ở hệ thống backend.
          </p>
          <Link
            className="button primary"
            to={`/ops/auctions/${session.sessionId}/approval-package`}
          >
            Chuẩn bị hồ sơ phê duyệt
          </Link>
        </section>
      )}

      {review && (
        <section className="content-review-card content-review-history">
          <h2>Lịch sử thẩm định · chỉ dành cho nhân viên</h2>
          <ol>
            {review.history
              .slice()
              .reverse()
              .map((entry) => (
                <li key={entry.historyId}>
                  <strong>{entry.action}</strong>
                  <span>
                    Thẩm định v{entry.reviewVersion} · Nội dung v
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
          title="Hoàn tất thẩm định nội dung"
          description="Hệ thống sẽ đối chiếu lại dữ liệu chính thức ngay trước khi ghi nhận."
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
                Hủy
              </Button>
              <Button
                loading={busyAction === "complete"}
                onClick={complete}
              >
                Hoàn tất thẩm định
              </Button>
            </>
          }
        >
          <section className="prototype-content-disclaimer" role="note">
            <strong>{PROTOTYPE_CONTENT_POLICY.classification}</strong>
          </section>
          <dl>
            <dt>Mã phiên / phiên bản</dt>
            <dd>
              {session.sessionId} · v{session.currentVersion}
            </dd>
            <dt>Mã thẩm định / phiên bản</dt>
            <dd>
              {review.reviewId} · v{review.reviewVersion}
            </dd>
            <dt>Yêu cầu mở phiên</dt>
            <dd>
              {review.openingRequestId} · v
              {review.openingRequestVersionAtStart}
            </dd>
            <dt>Mã nội dung / phiên bản</dt>
            <dd>
              {content.contentId} · v{content.contentVersion}
            </dd>
            <dt>Tiêu đề đấu giá</dt>
            <dd>{content.workingContent.auctionTitle}</dd>
            <dt>Tóm tắt đấu giá</dt>
            <dd>{content.workingContent.auctionSummary}</dd>
            <dt>Bản chụp cấu hình / đề xuất</dt>
            <dd>
              {snapshot.snapshotId} · v{snapshot.proposalVersion}
            </dd>
            <dt>Phiên bản tham chiếu thành viên</dt>
            <dd>{membership?.referenceVersion ?? "THIẾU"}</dd>
            <dt>Mức độ sẵn sàng / cảnh báo</dt>
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
            <p>Thao tác này chỉ hoàn tất bước thẩm định nội dung.</p>
            <p>Phiên vẫn ở trạng thái BẢN NHÁP / CHƯA SẴN SÀNG.</p>
            <p>Chưa tạo hoặc gửi hồ sơ phê duyệt.</p>
            <p>Bước tiếp theo là chuẩn bị hồ sơ phê duyệt.</p>
          </div>
          {error && (
            <div className="content-review-blocker" role="alert">
              <p>{error}</p>
              <p>Hãy tải lại hoặc kiểm tra lại; nội dung hiện tại vẫn được giữ nguyên.</p>
            </div>
          )}
        </Dialog>
      )}
    </main>
  );
}
