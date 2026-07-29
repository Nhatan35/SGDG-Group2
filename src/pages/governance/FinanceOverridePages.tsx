import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  History,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/feedback/States";
import {
  useFinanceOverrideStore,
  type ControlledFinanceAction,
} from "../../store/financeOverrideStore";
import { NotFoundPage } from "../NotFoundPage";
import { formatDateTime } from "../../utils/format";
import "../../styles/finance-override.css";
import "../../styles/governance-decision.css";

export function FinanceOverrideRequestPage() {
  const createRequest = useFinanceOverrideStore((state) => state.createRequest);
  const navigate = useNavigate();
  const [action, setAction] = useState<ControlledFinanceAction>("RE_REVIEW_FINANCE_PACKAGE");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [message, setMessage] = useState("");
  const submit = () => {
    const result = createRequest("FINANCE", "finance@sgdg.demo", {
      packageId: "FIN-PKG-PATEK-5711R-V2",
      targetReference: "SGD-WIN-•••-5711R",
      requestedAction: action,
      businessReason: reason,
      evidenceReferences: evidence.split(",").map((item) => item.trim()).filter(Boolean),
      expectedVersion: 2,
    });
    if (result.ok) navigate(`/finance/override-requests/${result.request.overrideId}`);
    else setMessage(`Không thể gửi yêu cầu: ${result.reason}.`);
  };
  return (
    <main className="finance-override-page">
      <header className="ops-heading"><div><span>FINANCE CONTROLLED REQUEST</span><h1>Yêu cầu xử lý ngoại lệ</h1></div></header>
      <p className="finance-disclosure">
        Yêu cầu này không cho phép chọn Candidate, rank, Final Winner, amount
        hoặc sửa Auction Result. ADMIN chỉ có thể duyệt đúng action đã kiểm soát.
      </p>
      <Card className="finance-override-form">
        <dl className="ops-definition">
          <div><dt>Finance package</dt><dd>FIN-PKG-PATEK-5711R-V2</dd></div>
          <div><dt>Target</dt><dd>SGD-WIN-•••-5711R</dd></div>
          <div><dt>Current state</dt><dd>FINAL_WINNER_CONFIRMED</dd></div>
          <div><dt>Expected package version</dt><dd>v2</dd></div>
        </dl>
        <label>Controlled action
          <select value={action} onChange={(event) => setAction(event.target.value as ControlledFinanceAction)}>
            <option value="RE_REVIEW_FINANCE_PACKAGE">Re-review Finance package</option>
            <option value="ROUTE_TO_REMEDIATION">Route to remediation</option>
          </select>
        </label>
        <label>Lý do nghiệp vụ
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <label>Evidence references (phân cách bằng dấu phẩy)
          <input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="PAY-REF-001, AUD-REF-002" />
        </label>
        {message && <p role="alert">{message}</p>}
        <Button onClick={submit} disabled={!reason.trim() || !evidence.trim()}>Gửi yêu cầu cho ADMIN</Button>
      </Card>
    </main>
  );
}

export function FinanceOverrideReadPage() {
  const { overrideId } = useParams();
  const request = useFinanceOverrideStore((state) => state.requests.find((item) => item.overrideId === overrideId));
  if (!request) return <NotFoundPage />;
  return <FinanceOverrideSummary requestId={request.overrideId} reviewer={false} />;
}

export function FinanceOverrideQueuePage() {
  const requests = useFinanceOverrideStore((state) => state.requests);
  return (
    <main className="finance-override-page">
      <header className="ops-heading"><div><span>QUẢN TRỊ NGOẠI LỆ TÀI CHÍNH</span><h1>Yêu cầu ngoại lệ đang chờ</h1></div><p>Hàng đợi maker–checker dành cho Admin</p></header>
      {!requests.length ? <EmptyState title="Chưa có yêu cầu ngoại lệ" description="Queue sẽ hiển thị khi FINANCE gửi một yêu cầu hợp lệ." /> : (
        <section className="finance-override-list">{requests.map((request) => (
          <Card key={request.overrideId}>
            <small>{request.status} · v{request.version}</small>
            <h2>{request.overrideId}</h2>
            <p>{request.requestedAction} · {request.packageId}</p>
            <Link className="button secondary" to={`/governance/finance-overrides/${request.overrideId}`}>Mở yêu cầu</Link>
          </Card>
        ))}</section>
      )}
    </main>
  );
}

export function FinanceOverrideDetailPage() {
  const { overrideId } = useParams();
  const exists = useFinanceOverrideStore((state) => state.requests.some((item) => item.overrideId === overrideId));
  if (!exists || !overrideId) return <NotFoundPage />;
  return <FinanceOverrideSummary requestId={overrideId} reviewer />;
}

function FinanceOverrideSummary({ requestId, reviewer }: { requestId: string; reviewer: boolean }) {
  const request = useFinanceOverrideStore((state) => state.requests.find((item) => item.overrideId === requestId))!;
  const decide = useFinanceOverrideStore((state) => state.decide);
  const startExecution = useFinanceOverrideStore(
    (state) => state.startExecution,
  );
  const completeExecution = useFinanceOverrideStore(
    (state) => state.completeExecution,
  );
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const act = (decision: "APPROVE" | "REJECT") => {
    const result = decide(request.overrideId, "ADMIN", "admin@sgdg.demo", request.version, decision, reason);
    setMessage(result.ok ? "Quyết định đã được ghi vào history; Auction Result không bị chỉnh sửa." : `Không thể quyết định: ${result.reason}.`);
  };
  const routesToRemediation =
    request.requestedAction === "ROUTE_TO_REMEDIATION";
  const actionLabel = routesToRemediation
    ? "Chuyển sang quy trình xử lý khắc phục"
    : "Mở lại bước thẩm định hồ sơ tài chính";
  const statusLabel = {
    PENDING: "Đang chờ Admin quyết định",
    APPROVED: "Admin đã phê duyệt · chờ Finance thực hiện",
    IN_PROGRESS: "Finance đang thực hiện",
    COMPLETED: "Đã hoàn tất xử lý",
    REJECTED: "Đã từ chối",
  }[request.status];
  const runFinanceExecution = (complete = false) => {
    const result = complete
      ? completeExecution(
          request.overrideId,
          "FINANCE",
          "finance@sgdg.demo",
          request.version,
          reason,
        )
      : startExecution(
          request.overrideId,
          "FINANCE",
          "finance@sgdg.demo",
          request.version,
        );
    setMessage(
      result.ok
        ? complete
          ? "Đã hoàn tất bước xử lý thuộc Finance."
          : "Finance đã tiếp nhận và bắt đầu thực hiện quyết định."
        : `Không thể cập nhật: ${result.reason}.`,
    );
    if (result.ok) setReason("");
  };
  return (
    <main className="finance-override-page governance-decision-page">
      <header className="governance-decision-hero">
        <div>
          <span>NGOẠI LỆ TÀI CHÍNH CÓ KIỂM SOÁT</span>
          <h1>{request.overrideId}</h1>
          <p>
            Finance đề nghị <strong>{actionLabel.toLowerCase()}</strong> vì dữ
            liệu thanh toán đã thay đổi sau khi xác nhận kết quả.
          </p>
        </div>
        <strong className={`decision-status ${request.status.toLowerCase()}`}>
          {statusLabel}
        </strong>
      </header>
      <div className="governance-decision-grid">
        <div className="governance-decision-main">
          <Card className="decision-summary-card">
            <div className="decision-section-heading">
              <span><AlertTriangle /></span>
              <div>
                <small>VẤN ĐỀ CẦN QUYẾT ĐỊNH</small>
                <h2>{actionLabel}</h2>
              </div>
            </div>
            <p>{request.businessReason}</p>
            <div className="decision-impact">
              <div className="will-change">
                <CheckCircle2 />
                <span><strong>Nếu phê duyệt</strong>{routesToRemediation ? "Tạo hồ sơ xử lý khắc phục và chuyển Finance tiếp tục theo dõi." : "Mở lại bước thẩm định đúng phiên bản hồ sơ tài chính."}</span>
              </div>
              <div>
                <ShieldCheck />
                <span><strong>Không bị thay đổi</strong>Ứng viên, người trúng đấu giá và kết quả đấu giá vẫn được giữ nguyên.</span>
              </div>
            </div>
          </Card>
          <Card>
            <div className="decision-section-heading compact">
              <span><FileCheck2 /></span>
              <div><small>THÔNG TIN THAM CHIẾU</small><h2>Đối tượng và bằng chứng</h2></div>
            </div>
            <dl className="decision-reference-grid">
              <div><dt>Hồ sơ Finance</dt><dd>{request.packageId}</dd></div>
              <div><dt>Đối tượng liên quan</dt><dd>{request.targetReference}</dd></div>
              <div><dt>Trạng thái hiện tại</dt><dd>Đã xác nhận người trúng đấu giá</dd></div>
              <div><dt>Phiên bản cần kiểm tra</dt><dd>v{request.expectedVersion}</dd></div>
              <div><dt>Người gửi yêu cầu</dt><dd>{request.requesterId}</dd></div>
              <div><dt>Mã hành động kỹ thuật</dt><dd>{request.requestedAction}</dd></div>
            </dl>
            <h3>Bằng chứng đi kèm</h3>
            <div className="decision-evidence-list">{request.evidenceReferences.map((item) => <span key={item}><FileCheck2 />{item}</span>)}</div>
          </Card>
          {request.status === "APPROVED" && routesToRemediation && <Link className="button primary" to="/governance/remediation/REM-PATEK-REVERSAL-001">Mở hồ sơ xử lý khắc phục<ArrowRight /></Link>}
        </div>
        <Card className="governance-decision-rail">
          <div className="decision-section-heading compact">
            <span><UserRound /></span>
            <div><small>MAKER–CHECKER</small><h2>Quyết định của Admin</h2></div>
          </div>
          {reviewer && request.status === "PENDING" && <>
            <p className="decision-guidance">Đọc phần tác động và bằng chứng trước khi chọn phương án. Lý do quyết định là bắt buộc.</p>
            <label>Căn cứ quyết định
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nêu kết quả kiểm tra và căn cứ phê duyệt hoặc từ chối" />
            </label>
            <div className="finance-override-actions">
              <Button onClick={() => act("APPROVE")} disabled={!reason.trim()}>{routesToRemediation ? "Phê duyệt chuyển sang xử lý khắc phục" : "Phê duyệt mở lại bước thẩm định"}</Button>
              <Button variant="danger" onClick={() => act("REJECT")} disabled={!reason.trim()}>Từ chối yêu cầu ngoại lệ</Button>
            </div>
          </>}
          {!reviewer && request.status === "PENDING" && <p>Đang chờ một Admin độc lập xem xét. Finance không thể tự phê duyệt yêu cầu của mình.</p>}
          {!reviewer && request.status === "APPROVED" && <>
            <p>Admin đã phê duyệt phạm vi xử lý. Finance cần tiếp nhận trước khi thực hiện nghiệp vụ tài chính.</p>
            <Button onClick={() => runFinanceExecution(false)}>
              Tiếp nhận và bắt đầu xử lý
            </Button>
          </>}
          {!reviewer && request.status === "IN_PROGRESS" && <>
            <label>Kết quả thực hiện
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ghi kết quả đối soát hoặc mã hồ sơ khắc phục"
              />
            </label>
            <Button
              onClick={() => runFinanceExecution(true)}
              disabled={!reason.trim()}
            >
              Xác nhận hoàn tất xử lý
            </Button>
          </>}
          {!reviewer && request.status === "COMPLETED" && (
            <p>Quy trình ngoại lệ đã hoàn tất. Kết quả đấu giá gốc không bị thay đổi bởi luồng này.</p>
          )}
          {!reviewer && request.status === "REJECTED" && (
            <p>Admin đã từ chối yêu cầu. Finance không được thực hiện action ngoại lệ.</p>
          )}
          {message && <p role="status">{message}</p>}
          <div className="decision-history-heading"><History /><h3>Lịch sử xử lý</h3></div>
          <ol className="decision-history">{request.history.map((item) => <li key={`${item.at}-${item.action}`}><strong>{item.action === "REQUESTED" ? "Đã gửi yêu cầu" : item.action}</strong><span>{item.actorId}</span><small>{formatDateTime(item.at)}{item.reason ? ` · ${item.reason}` : ""}</small></li>)}</ol>
        </Card>
      </div>
    </main>
  );
}
