import { AlertTriangle, CheckCircle2, FileCheck2, Truck } from "lucide-react";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { useState } from "react";
import {
  getHandoverOperationsFixture,
  handoverOperationsScenarios,
  type HandoverOperationsScenario,
} from "../../services/mock/handoverOperationsService";
import { auctions } from "../../services/mock/auctionService";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/handover-operations.css";
type Ctx = { role: "CONTENT_STAFF" | "ADMIN" };
const tabs = [
  "overview",
  "schedule",
  "delivery",
  "evidence",
  "issues",
  "audit",
] as const;
export function HandoverOperationsPage() {
  const { caseId } = useParams();
  const { role } = useOutletContext<Ctx>();
  const [params, setParams] = useSearchParams();
  const [actionNotice, setActionNotice] = useState("");
  const s = params.get("scenario");
  const scenario: HandoverOperationsScenario =
    handoverOperationsScenarios.includes(s as HandoverOperationsScenario)
      ? (s as HandoverOperationsScenario)
      : "schedule-proposed";
  const f = caseId && getHandoverOperationsFixture(caseId, scenario);
  if (!f) return <NotFoundPage />;
  const auction = auctions.find((a) => a.id === f.base.auctionId);
  if (!auction) return <NotFoundPage />;
  const tab = tabs.includes(params.get("tab") as (typeof tabs)[number])
    ? (params.get("tab") as (typeof tabs)[number])
    : "overview";
  const set = (key: string, value: string) =>
    setParams((c) => {
      const n = new URLSearchParams(c);
      n.set(key, value);
      return n;
    });
  const action = f.action;
  const remediation = scenario === "remediation";
  const runPrimaryAction = () => {
    if (action[0] === "CREATE_DELIVERY_RETRY") {
      set("scenario", "in-transit");
      setActionNotice("Đã tạo lần giao lại và chuyển sang trạng thái vận chuyển.");
      return;
    }
    const targetTab =
      action[0] === "PROPOSE_SCHEDULE"
        ? "schedule"
        : action[0] === "REVIEW_EVIDENCE" ||
            action[0] === "REVIEW_RECEIPT_READINESS"
          ? "evidence"
          : action[0] === "PREPARE_ISSUE_RESOLUTION"
            ? "issues"
            : "audit";
    set("tab", targetTab);
    setActionNotice(`Đã mở khu vực xử lý: ${action[1]}.`);
  };
  return (
    <>
      <header className="ops-heading handover-ops-header">
        <span>VẬN HÀNH BÀN GIAO</span>
        <h1>Điều phối hồ sơ bàn giao</h1>
        <p>
          {f.base.caseReference} · {f.base.caseId} · {auction.assetName} · role{" "}
          {role}
        </p>
      </header>
      <section className="handover-ops-status">
        <Badge
          tone={
            remediation
              ? "danger"
              : scenario === "completed"
                ? "success"
                : "warning"
          }
        >
          {f.base.status}
        </Badge>
        <h2>{f.base.currentStage}</h2>
        <p>Nguồn: Auction Lifecycle & Handover Mock · operational projection</p>
      </section>
      <ol className="handover-ops-progress">
        {[
          "Kích hoạt",
          "Lịch",
          "Fulfillment",
          "Bằng chứng / vấn đề",
          "Receipt",
          "Completion",
        ].map((label, index) => (
          <li key={label} aria-current={index === 2 ? "step" : undefined}>
            <span>{index < 2 ? <CheckCircle2 /> : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="handover-ops-layout">
        <main className="handover-ops-main">
          <section className="handover-ops-action">
            <span>Action priority</span>
            <h2>{action[1]}</h2>
            <p>
              {remediation
                ? "Case đang hold; không retry, receipt hay completion."
                : "Action được chọn theo blocker/ readiness fixture."}
            </p>
            {role === "ADMIN" ? (
              <p className="ops-conflict">
                Chế độ governance chỉ đọc. Transactional action tiếp tục thuộc
                Operations workspace.
              </p>
            ) : remediation ? (
              <Link
                className="button ops-destructive"
                to="/governance/remediation/REM-PATEK-REVERSAL-001"
              >
                Mở hồ sơ remediation
              </Link>
            ) : (
              <button className="button primary" onClick={runPrimaryAction}>
                {action[1]}
              </button>
            )}
            {actionNotice && <small role="status">{actionNotice}</small>}
          </section>
          <nav className="handover-ops-tabs" aria-label="Khu vực vận hành">
            {tabs.map((item) => (
              <button
                key={item}
                className={tab === item ? "active" : ""}
                onClick={() => set("tab", item)}
              >
                {item}
              </button>
            ))}
          </nav>
          {tab === "schedule" && (
            <section className="handover-ops-workspace">
              <h2>Schedule Version history</h2>
              {f.schedule.map((item) => (
                <p key={item.id}>
                  <strong>
                    v{item.version} · {item.status}
                  </strong>{" "}
                  · {item.time} · {item.note}
                </p>
              ))}
              <small>
                Proposal mới luôn tạo version mới, không sửa v1; Operations
                không xác nhận thay Customer.
              </small>
            </section>
          )}
          {tab === "delivery" && (
            <section className="handover-ops-workspace">
              <h2>DeliveryAttempts</h2>
              {f.deliveries.map((item) => (
                <p key={item.id}>
                  <Truck /> Attempt {item.attempt}:{" "}
                  <strong>{item.status}</strong> · {item.retry}
                </p>
              ))}
              <small>
                Provider event chỉ đọc; retry giữ attempt failed trong lịch sử.
              </small>
            </section>
          )}
          {tab === "evidence" && (
            <section className="handover-ops-workspace">
              <h2>Evidence review</h2>
              <p>
                Required {f.evidence.required} · Accepted {f.evidence.accepted}{" "}
                · Incomplete {f.evidence.incomplete} · Pending{" "}
                {f.evidence.pending}
              </p>
              <p>
                {f.evidence.accepted === 3
                  ? "Evidence accepted."
                  : "Receipt và Completion bị chặn do evidence chưa ACCEPTED."}
              </p>
            </section>
          )}
          {tab === "issues" && (
            <section className="handover-ops-workspace">
              <h2>Issues</h2>
              {f.issue ? (
                <p className="ops-conflict">
                  <AlertTriangle />
                  {f.issue.title} · blocking {String(f.issue.blocking)} ·
                  governance {String(f.issue.governance)}
                </p>
              ) : (
                <p>Không có issue blocking.</p>
              )}
              {f.issue?.governance && (
                <Link to="/governance/remediation/REM-PATEK-REVERSAL-001">
                  Xem governance remediation
                </Link>
              )}
            </section>
          )}
          {tab === "audit" && (
            <section className="handover-ops-workspace">
              <h2>Audit timeline</h2>
              <ol>
                <li>AUD-HO-001 · Case created · Handover Mock</li>
                <li>AUD-HO-002 · Schedule proposed · Content Staff</li>
                <li>AUD-HO-003 · Evidence review projection · Content Staff</li>
              </ol>
            </section>
          )}
          {tab === "overview" && (
            <section className="handover-ops-workspace">
              <h2>Operational summary</h2>
              <p>
                Schedule v1 · {f.deliveries.length} DeliveryAttempt · Evidence{" "}
                {f.evidence.accepted}/{f.evidence.required}
              </p>
              <p>Customer receipt và completion là các mốc domain độc lập.</p>
            </section>
          )}
        </main>
        <aside className="handover-ops-rail">
          <section>
            <h2>Receipt readiness</h2>
            <Checklist
              items={[
                ["Delivery valid", f.receipt.delivery],
                ["Evidence accepted", f.receipt.evidence],
                ["No blocking issue", f.receipt.noIssue],
                ["No remediation hold", f.receipt.noHold],
                ["Customer confirmed", f.receipt.confirmed],
              ]}
            />
            {f.receipt.ready && (
              <Link to={`/me/handover/${f.base.caseId}/receipt`}>
                Mở trang xác nhận Customer ở chế độ tham chiếu
              </Link>
            )}
          </section>
          <section>
            <h2>Completion readiness</h2>
            <Checklist
              items={[
                ["Receipt confirmed", f.completion.receipt],
                ["Evidence accepted", f.completion.evidence],
                ["No blocking issue", f.completion.noIssue],
                ["No hold", f.completion.noHold],
                ["CLOSED_COMPLETED", f.completion.closed],
              ]}
            />
            {f.completion.closed && (
              <Link to={`/me/handover/${f.base.caseId}/completion`}>
                Xem completion Customer
              </Link>
            )}
          </section>
          <section className="handover-ops-reference">
            <h2>References</h2>
            <dl>
              <div>
                <dt>Final Winner</dt>
                <dd>SGD-WIN-•••-5711R</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>PAY-••••-5711R</dd>
              </div>
              <div>
                <dt>Receipt</dt>
                <dd>SGD-RCP-1028-5711R</dd>
              </div>
              <div>
                <dt>Completion</dt>
                <dd>SGD-CMP-1028-5711R</dd>
              </div>
            </dl>
          </section>
          <section>
            <h2>Authority</h2>
            <p>
              {role === "CONTENT_STAFF"
                ? "Schedule proposal, retry, evidence review, issue preparation. Không governed override hoặc receipt confirmation."
                : "Có governed override qua governance dialog; không sửa history/payment/receipt declaration."}
            </p>
          </section>
        </aside>
      </div>
      {params.get("demo") === "1" && (
        <label className="handover-demo-toolbar">
          Điều khiển mô phỏng
          <select
            value={scenario}
            onChange={(e) => set("scenario", e.target.value)}
          >
            {handoverOperationsScenarios.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
function Checklist({ items }: { items: [string, boolean][] }) {
  return (
    <ul className="handover-ops-checklist">
      {items.map(([label, pass]) => (
        <li key={label} className={pass ? "pass" : "fail"}>
          <FileCheck2 />
          {label}: {pass ? "Pass" : "Blocked"}
        </li>
      ))}
    </ul>
  );
}
