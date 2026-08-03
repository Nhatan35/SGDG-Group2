import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  History,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "../../components/feedback/States";
import { useEligibilityWorkflowStore } from "../../store/eligibilityWorkflowStore";
import { NotFoundPage } from "../NotFoundPage";
import { formatDateTime } from "../../utils/format";
import "../../styles/eligibility-review.css";
import "../../styles/governance-decision.css";

export function EligibilityReviewQueuePage() {
  const reviews = useEligibilityWorkflowStore((state) => state.reviews);
  const [params, setParams] = useSearchParams();
  const query = params.get("q")?.trim().toLowerCase() || "";
  const status = params.get("status") || "ALL";
  const scenario = params.get("scenario");
  if (scenario === "loading") return <LoadingState label="Đang tải hồ sơ review…" />;
  if (scenario === "error")
    return <ErrorState title="Không thể tải eligibility review" description="Dữ liệu mô phỏng tạm thời chưa sẵn sàng." />;
  const filtered = reviews.filter(
    (item) =>
      (status === "ALL" || item.status === status) &&
      (!query ||
        [item.reviewId, item.registrationId, item.auctionId, item.customerId]
          .join(" ")
          .toLowerCase()
          .includes(query)),
  );
  return (
    <main className="eligibility-review-page">
      <header className="ops-heading">
        <div><span>ELIGIBILITY GOVERNANCE</span><h1>Eligibility exception reviews</h1></div>
        <p>ADMIN-only · dữ liệu nguồn chỉ đọc</p>
      </header>
      <Card className="eligibility-review-filters">
        <label>Tìm kiếm
          <input value={params.get("q") || ""} onChange={(event) => {
            const next = new URLSearchParams(params);
            if (event.target.value) next.set("q", event.target.value);
            else next.delete("q");
            setParams(next);
          }} placeholder="Review, registration, auction, customer" />
        </label>
        <label>Trạng thái
          <select value={status} onChange={(event) => {
            const next = new URLSearchParams(params);
            next.set("status", event.target.value);
            setParams(next);
          }}>
            <option value="ALL">Tất cả</option>
            <option value="PENDING">Đang chờ</option>
            <option value="EVIDENCE_REQUESTED">Chờ bổ sung</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </label>
      </Card>
      {!filtered.length ? (
        <EmptyState title={reviews.length ? "Không có kết quả phù hợp" : "Chưa có review case"} description={reviews.length ? "Thử bỏ bớt bộ lọc tìm kiếm." : "Queue sẽ xuất hiện khi có ngoại lệ cần xem xét."} />
      ) : (
        <section className="eligibility-review-list">
          {filtered.map((item) => (
            <Card key={item.reviewId}>
              <small>{item.status} · v{item.version}</small>
              <h2>{item.reviewId}</h2>
              <p>{item.registrationId} · {item.auctionId} · {item.customerId}</p>
              <Link className="button primary" to={`/governance/eligibility-reviews/${item.reviewId}`}>Mở hồ sơ</Link>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}

export function EligibilityReviewDetailPage() {
  const { reviewId } = useParams();
  const review = useEligibilityWorkflowStore((state) =>
    state.reviews.find((item) => item.reviewId === reviewId),
  );
  const decide = useEligibilityWorkflowStore((state) => state.decideReview);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  if (!review) return <NotFoundPage />;
  const act = (action: "APPROVE" | "REJECT" | "REQUEST_EVIDENCE") => {
    const result = decide(review.reviewId, "ADMIN", review.version, action, reason);
    setMessage(result.ok ? "Quyết định đã được ghi nhận và projection khách hàng đã cập nhật." : `Không thể quyết định: ${result.reason}.`);
  };
  const decided = review.status === "APPROVED" || review.status === "REJECTED";
  const statusLabel = {
    PENDING: "Đang chờ Admin quyết định",
    EVIDENCE_REQUESTED: "Đang chờ bổ sung bằng chứng",
    APPROVED: "Đã xác nhận đủ điều kiện",
    REJECTED: "Đã từ chối điều kiện tham gia",
  }[review.status];
  return (
    <main className="eligibility-review-page governance-decision-page">
      <Link className="decision-back-link" to="/governance/eligibility-reviews"><ArrowLeft />Về hàng đợi rà soát</Link>
      <header className="governance-decision-hero">
        <div>
          <span>RÀ SOÁT ĐIỀU KIỆN THAM GIA</span>
          <h1>{review.reviewId}</h1>
          <p>
            Địa chỉ trong hồ sơ eKYC cần được xác nhận thủ công trước khi
            Customer được công nhận đủ điều kiện tham gia phiên.
          </p>
        </div>
        <strong className={`decision-status ${review.status.toLowerCase()}`}>
          {statusLabel}
        </strong>
      </header>
      <div className="governance-decision-grid">
        <div className="governance-decision-main">
          <Card className="decision-summary-card">
            <div className="decision-section-heading">
              <span><AlertTriangle /></span>
              <div>
                <small>VẤN ĐỀ CẦN XÁC NHẬN</small>
                <h2>Bằng chứng địa chỉ eKYC cần được kiểm tra thủ công</h2>
              </div>
            </div>
            <p>
              Hệ thống tự động chưa thể kết luận hồ sơ đạt điều kiện vì bằng
              chứng địa chỉ cần người có thẩm quyền đối chiếu.
            </p>
            <div className="decision-impact eligibility-impact">
              <div className="will-change"><CheckCircle2 /><span><strong>Nếu xác nhận đủ điều kiện</strong>Hồ sơ hoàn tất bước rà soát ngoại lệ và tiếp tục luồng kiểm tra điều kiện tham gia.</span></div>
              <div><FileCheck2 /><span><strong>Nếu yêu cầu bổ sung</strong>Hồ sơ chuyển sang chờ bằng chứng; Customer/CSKH cần cung cấp tài liệu còn thiếu.</span></div>
              <div><ShieldCheck /><span><strong>Nếu từ chối</strong>Customer chưa đủ điều kiện tham gia ở phiên bản đăng ký hiện tại và có thể xử lý lại theo quy trình.</span></div>
            </div>
          </Card>
          <Card>
            <div className="decision-section-heading compact">
              <span><UserRound /></span>
              <div><small>HỒ SƠ ĐANG RÀ SOÁT</small><h2>Customer và nguồn kiểm tra</h2></div>
            </div>
            <dl className="decision-reference-grid">
              <div><dt>Đăng ký tham gia</dt><dd>{review.registrationId}</dd></div>
              <div><dt>Customer</dt><dd>{review.customerId}</dd></div>
              <div><dt>Hồ sơ eKYC</dt><dd>{review.kycReference}</dd></div>
              <div><dt>Hạn chế tham gia</dt><dd>{review.restrictionReference === "RST-NONE-1048" ? "Không ghi nhận hạn chế" : review.restrictionReference}</dd></div>
              <div><dt>Tham chiếu tài chính</dt><dd>{review.financeReference}</dd></div>
              <div><dt>Bộ quy tắc áp dụng</dt><dd>{review.ruleVersion} · hồ sơ v{review.version}</dd></div>
            </dl>
            <h3>Bằng chứng hiện có</h3>
            <div className="decision-evidence-list">{review.evidence.map((item) => <span key={item}><FileCheck2 />{item.replace("KYC snapshot", "Bản chụp eKYC").replace("Deposit reference", "Tham chiếu tiền đặt trước")}</span>)}</div>
          </Card>
        </div>
        <Card className="governance-decision-rail">
          <div className="decision-section-heading compact">
            <span><ShieldCheck /></span>
            <div><small>QUYẾT ĐỊNH CÓ KIỂM SOÁT</small><h2>{statusLabel}</h2></div>
          </div>
          {!decided && <>
            <p className="decision-guidance">Kiểm tra bằng chứng hiện có và ghi rõ căn cứ trước khi chọn một phương án.</p>
            <label>Căn cứ quyết định
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Đã đối chiếu địa chỉ trên eKYC với tài liệu bổ sung…" />
            </label>
            <div className="eligibility-review-actions">
              <Button onClick={() => act("APPROVE")} disabled={!reason.trim()}>Xác nhận đủ điều kiện</Button>
              <Button variant="secondary" onClick={() => act("REQUEST_EVIDENCE")} disabled={!reason.trim()}>Yêu cầu bổ sung bằng chứng</Button>
              <Button variant="danger" onClick={() => act("REJECT")} disabled={!reason.trim()}>Từ chối điều kiện tham gia</Button>
            </div>
          </>}
          {message && <p role="status">{message}</p>}
          <div className="decision-history-heading"><History /><h3>Lịch sử xử lý</h3></div>
          <ol className="decision-history">{review.history.map((item) => <li key={`${item.at}-${item.action}`}><strong>{item.action === "REVIEW_CREATED" ? "Đã tạo hồ sơ rà soát" : item.action}</strong><span>{item.actor}</span><small>{formatDateTime(item.at)}{item.reason ? ` · ${item.reason}` : ""}</small></li>)}</ol>
        </Card>
      </div>
    </main>
  );
}
