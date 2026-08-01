import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "../../components/feedback/States";
import { useEligibilityWorkflowStore } from "../../store/eligibilityWorkflowStore";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/eligibility-review.css";

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
  return (
    <main className="eligibility-review-page">
      <header className="ops-heading">
        <div><span>ELIGIBILITY GOVERNANCE</span><h1>{review.reviewId}</h1></div>
        <Link to="/governance/eligibility-reviews">Về hàng đợi</Link>
      </header>
      <div className="ops-workspace">
        <Card>
          <h2>Nguồn tham chiếu chỉ đọc</h2>
          <dl className="ops-definition">
            <div><dt>Registration</dt><dd>{review.registrationId}</dd></div>
            <div><dt>Customer</dt><dd>{review.customerId}</dd></div>
            <div><dt>KYC</dt><dd>{review.kycReference}</dd></div>
            <div><dt>Restriction</dt><dd>{review.restrictionReference}</dd></div>
            <div><dt>Finance</dt><dd>{review.financeReference}</dd></div>
            <div><dt>Rule version</dt><dd>{review.ruleVersion}</dd></div>
            <div><dt>Version</dt><dd>v{review.version}</dd></div>
          </dl>
          <h3>Check cần xem xét</h3>
          <ul>{review.failedChecks.map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Evidence</h3>
          <ul>{review.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
        </Card>
        <Card>
          <h2>Quyết định · {review.status}</h2>
          {!decided && <>
            <label>Lý do bắt buộc
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <div className="eligibility-review-actions">
              <Button onClick={() => act("APPROVE")} disabled={!reason.trim()}>Duyệt ngoại lệ</Button>
              <Button variant="secondary" onClick={() => act("REQUEST_EVIDENCE")} disabled={!reason.trim()}>Yêu cầu bằng chứng</Button>
              <Button variant="danger" onClick={() => act("REJECT")} disabled={!reason.trim()}>Từ chối</Button>
            </div>
          </>}
          {message && <p role="status">{message}</p>}
          <h3>Lịch sử bất biến</h3>
          <ol>{review.history.map((item) => <li key={`${item.at}-${item.action}`}><strong>{item.action}</strong> · {item.actor}<br/><small>{item.at}{item.reason ? ` · ${item.reason}` : ""}</small></li>)}</ol>
        </Card>
      </div>
    </main>
  );
}
