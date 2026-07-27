import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/feedback/States";
import {
  useFinanceOverrideStore,
  type ControlledFinanceAction,
} from "../../store/financeOverrideStore";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/finance-override.css";

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
      <header className="ops-heading"><div><span>FINANCE GOVERNANCE</span><h1>Exceptional override requests</h1></div><p>ADMIN maker-checker queue</p></header>
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
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const act = (decision: "APPROVE" | "REJECT") => {
    const result = decide(request.overrideId, "ADMIN", "admin@sgdg.demo", request.version, decision, reason);
    setMessage(result.ok ? "Quyết định đã được ghi vào history; Auction Result không bị chỉnh sửa." : `Không thể quyết định: ${result.reason}.`);
  };
  return (
    <main className="finance-override-page">
      <header className="ops-heading"><div><span>CONTROLLED FINANCE EXCEPTION</span><h1>{request.overrideId}</h1></div><strong>{request.status}</strong></header>
      <div className="ops-workspace">
        <Card>
          <h2>Target và impact preview</h2>
          <dl className="ops-definition">
            <div><dt>Package</dt><dd>{request.packageId}</dd></div>
            <div><dt>Target</dt><dd>{request.targetReference}</dd></div>
            <div><dt>Authoritative state</dt><dd>{request.currentAuthoritativeState}</dd></div>
            <div><dt>Controlled action</dt><dd>{request.requestedAction}</dd></div>
            <div><dt>Requester</dt><dd>{request.requesterId}</dd></div>
            <div><dt>Expected package version</dt><dd>v{request.expectedVersion}</dd></div>
          </dl>
          <h3>Lý do</h3><p>{request.businessReason}</p>
          <h3>Evidence bất biến</h3><ul>{request.evidenceReferences.map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="finance-disclosure">Impact: {request.requestedAction === "ROUTE_TO_REMEDIATION" ? "tạo đường dẫn sang hồ sơ remediation sau approval" : "chỉ mở lại review của Finance package"}. Không thay đổi Candidate/FinalWinner/Result.</p>
          {request.status === "APPROVED" && request.requestedAction === "ROUTE_TO_REMEDIATION" && <Link className="button primary" to="/governance/remediation/REM-PATEK-REVERSAL-001">Mở remediation</Link>}
        </Card>
        <Card>
          <h2>Maker-checker</h2>
          {reviewer && request.status === "PENDING" && <>
            <label>Lý do quyết định
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <div className="finance-override-actions">
              <Button onClick={() => act("APPROVE")} disabled={!reason.trim()}>Phê duyệt action</Button>
              <Button variant="danger" onClick={() => act("REJECT")} disabled={!reason.trim()}>Từ chối</Button>
            </div>
          </>}
          {!reviewer && <p>Đang chờ ADMIN độc lập xem xét. FINANCE không thể tự duyệt.</p>}
          {message && <p role="status">{message}</p>}
          <h3>History bất biến</h3>
          <ol>{request.history.map((item) => <li key={`${item.at}-${item.action}`}><strong>{item.action}</strong> · {item.actorId}<br/><small>{item.at}{item.reason ? ` · ${item.reason}` : ""}</small></li>)}</ol>
        </Card>
      </div>
    </main>
  );
}
