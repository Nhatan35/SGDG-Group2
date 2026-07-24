import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  Link,
  Navigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  auctionSession,
  getApprovalPackageFixture,
  getApprovalQueueFixture,
  getAuctionRuleFixture,
  getAuctionScheduleFixture,
  getAuctionSessionWorkspaceFixture,
  getAuctionSessions,
  getOpeningRequestWorkspaceFixture,
  getOpeningRequests,
  getOperationsDashboardFixture,
} from "../../services/mock/operationsService";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/operations-foundation.css";
type Context = { role: "CONTENT_STAFF" | "ADMIN" };
function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <header className="ops-heading">
        <span>OPERATIONS FOUNDATION</span>
        <h1>{title}</h1>
        <p>Fixture deterministic · Auction Management Mock</p>
      </header>
      {children}
    </>
  );
}
const scenario = (p: URLSearchParams, base: string) =>
  p.get("scenario") || base;
const replaceView = (set: ReturnType<typeof useSearchParams>[1]) =>
  set((current) => {
    const n = new URLSearchParams(current);
    n.delete("view");
    return n;
  });
export function OperationsDashboardPage() {
  const fixture = getOperationsDashboardFixture();
  return (
    <Shell title="Tổng quan vận hành">
      <div className="ops-kpis">
        {fixture.kpis.map(([v, l]) => (
          <article key={l}>
            <strong>{v}</strong>
            <span>{l}</span>
          </article>
        ))}
      </div>
    </Shell>
  );
}
export function OpeningRequestQueuePage() {
  return (
    <Shell title="Yêu cầu mở phiên">
      <Table headers={["Yêu cầu", "Tài sản", "Trạng thái", "Thao tác"]}>
        {getOpeningRequests().map((x) => (
          <tr key={x.requestId}>
            <td>{x.requestId}</td>
            <td>{x.assetName}</td>
            <td>
              <Badge>{x.status}</Badge>
            </td>
            <td>
              <Link
                to={`/ops/opening-requests/${x.requestId}?scenario=request-under-review`}
              >
                Mở review
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
export function OpeningRequestWorkspacePage() {
  const { requestId } = useParams();
  const [p, setP] = useSearchParams();
  const [tab, setTab] = useState("evidence");
  const [decision, setDecision] = useState<string>();
  const f =
    requestId &&
    getOpeningRequestWorkspaceFixture(
      requestId,
      scenario(p, "request-under-review"),
    );
  if (!f) return <NotFoundPage />;
  if (p.get("view") === "loading")
    return (
      <Shell title="Review yêu cầu mở phiên">
        <p className="ops-panel" aria-busy="true">
          Đang tải review workspace…
        </p>
      </Shell>
    );
  if (p.get("view") === "error")
    return (
      <Shell title="Review yêu cầu mở phiên">
        <p className="ops-conflict">
          Không thể tải fixture.
          <button
            className="button secondary"
            onClick={() => replaceView(setP)}
          >
            Thử lại
          </button>
        </p>
      </Shell>
    );
  const content =
    tab === "evidence" ? (
      <ul>
        {f.evidence.map((x) => (
          <li key={x}>{x} · READY · Product Management Mock</li>
        ))}
      </ul>
    ) : tab === "versions" ? (
      <ol>
        <li aria-current="step">
          v{f.request.currentVersion} · Current request version
        </li>
      </ol>
    ) : tab === "notes" ? (
      <ol>
        {f.notes.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ol>
    ) : (
      <ol>
        {f.audit.map((x) => (
          <li key={x}>{x} · OPS-AUD-ROYAL-001</li>
        ))}
      </ol>
    );
  return (
    <Shell title="Review yêu cầu mở phiên">
      <div className="ops-workspace">
        <section className="ops-panel">
          <Badge>{f.request.status}</Badge>
          <h2>
            {f.request.requestId} · {f.request.assetName}
          </h2>
          <p>
            Customer {f.request.requesterMasked} · assignee{" "}
            {f.request.assigneeId} · request v{f.request.currentVersion}
          </p>
          {f.linkedSession ? (
            <p>
              Linked session:{" "}
              <Link
                to={`/ops/auctions/${f.linkedSession.sessionId}?scenario=session-draft`}
              >
                {f.linkedSession.sessionId}
              </Link>
            </p>
          ) : (
            <p>Chưa có linked session và chưa có Approval Package.</p>
          )}
          <nav className="ops-tabs" aria-label="Nội dung review">
            {[
              ["evidence", "Evidence"],
              ["versions", "Version history"],
              ["notes", "Internal notes"],
              ["audit", "Audit"],
            ].map(([id, label]) => (
              <button
                role="tab"
                aria-selected={tab === id}
                key={id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div role="tabpanel">{content}</div>
        </section>
        <aside className="ops-decision">
          <h2>Quyết định review</h2>
          {["return", "hold", "reject", "accept"].map((x) => (
            <button
              className={x === "accept" ? "button primary" : "button secondary"}
              key={x}
              disabled={f.request.status !== "UNDER_REVIEW"}
              onClick={() => setDecision(x)}
            >
              {x === "accept"
                ? "Accept for Draft"
                : x === "return"
                  ? "Return for Update"
                  : x === "hold"
                    ? "Place Hold"
                    : "Reject"}
            </button>
          ))}
        </aside>
      </div>
      {decision && (
        <Decision
          title="Xác nhận quyết định review"
          onClose={() => setDecision(undefined)}
          onConfirm={() => setDecision(undefined)}
          link={
            decision === "accept"
              ? `/ops/auctions/${auctionSession.sessionId}?scenario=session-draft&role=content`
              : undefined
          }
        />
      )}
    </Shell>
  );
}
export function AuctionSessionListPage() {
  const { role } = useOutletContext<Context>();
  return (
    <Shell title="Phiên đấu giá">
      {role === "CONTENT_STAFF" && (
        <Link className="button primary" to="/ops/auctions/new">
          Tạo phiên do SGDG quản lý
        </Link>
      )}
      <Table
        headers={["Session", "Tài sản", "Nguồn", "Lifecycle", "Publication"]}
      >
        {getAuctionSessions().map((x) => (
          <tr key={x.sessionId}>
            <td>
              <Link to={`/ops/auctions/${x.sessionId}?scenario=session-draft`}>
                {x.code}
              </Link>
            </td>
            <td>{x.assetName}</td>
            <td>{x.creationSource}</td>
            <td>{x.lifecycleStatus}</td>
            <td>{x.publicationStatus}</td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
export function AuctionSessionWorkspacePage() {
  const { sessionId } = useParams();
  const [p] = useSearchParams();
  const f =
    sessionId &&
    getAuctionSessionWorkspaceFixture(sessionId, scenario(p, "session-draft"));
  if (!f) return <NotFoundPage />;
  const ready = f.readiness.every((x) => x.passed);
  return (
    <Shell title="Workspace phiên đấu giá">
      <div className="ops-workspace">
        <section className="ops-panel">
          <Badge>{f.session.lifecycleStatus}</Badge>
          <Badge>{f.session.publicationStatus}</Badge>
          <h2>{f.session.assetName}</h2>
          <p>
            Creation: {f.session.creationSource} · Management:{" "}
            {f.session.managementMode}
          </p>
          {f.session.openingRequestId ? (
            <p>Request lineage: {f.session.openingRequestId}</p>
          ) : (
            <p>Direct SGDG session — không có Opening Request.</p>
          )}
          <button className="button secondary">Lưu bản nháp</button>
          {f.session.lifecycleStatus === "DRAFT" && (
            <Link
              className="button primary"
              to={`/governance/approvals/APR-ROYAL-OAK-001?scenario=ready&role=admin&user=admin.checker@mock.local`}
            >
              Submit for Approval
            </Link>
          )}
          <p>
            Submit readiness: {ready ? "PASSED" : "BLOCKED"}; package chỉ tồn
            tại sau submit.
          </p>
          <Link
            to={`/ops/auctions/${f.session.sessionId}/rules?scenario=draft`}
          >
            Chuẩn bị rules
          </Link>{" "}
          ·{" "}
          <Link
            to={`/ops/auctions/${f.session.sessionId}/schedule-publication?scenario=draft`}
          >
            Chuẩn bị schedule
          </Link>
        </section>
        <aside className="ops-decision">
          <h2>Readiness</h2>
          {f.readiness.map((x) => (
            <p key={x.id}>
              {x.passed ? <CheckCircle2 /> : <AlertTriangle />}
              {x.label}
            </p>
          ))}
        </aside>
      </div>
    </Shell>
  );
}
export function RuleConfigurationPage() {
  const { sessionId } = useParams();
  const [p] = useSearchParams();
  const f = sessionId && getAuctionRuleFixture(sessionId, scenario(p, "draft"));
  const [price, setPrice] = useState(2900000000);
  if (!f) return <NotFoundPage />;
  if (f.sensitiveChange)
    return (
      <Shell title="Rule & configuration">
        <p className="ops-conflict">
          Sensitive change cần governance review.{" "}
          <Link to="/governance/changes/CHG-ROYAL-OAK-001">Mở GOV-006</Link>
        </p>
      </Shell>
    );
  return (
    <Shell title="Rule & configuration">
      <section className="ops-panel">
        <h2>
          Rule version {f.version} · {f.status}
        </h2>
        <label>
          Giá khởi điểm
          <input
            type="number"
            disabled={f.immutableSnapshot}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </label>
        <label>
          Bước giá
          <input
            type="number"
            disabled={f.immutableSnapshot}
            defaultValue={f.minimumIncrement}
          />
        </label>
        <p>
          Deposit {f.depositPolicyReference} · Eligibility{" "}
          {f.eligibilityPolicyReference} · Extension{" "}
          {f.extensionPolicyReference}
        </p>
        {f.immutableSnapshot ? (
          <p>Approved snapshot là chỉ đọc, không thể overwrite.</p>
        ) : (
          <button className="button primary" disabled={price <= 0}>
            Lưu Rule Proposal
          </button>
        )}
      </section>
    </Shell>
  );
}
export function SchedulePublicationPage() {
  const { sessionId } = useParams();
  const [p] = useSearchParams();
  const { role } = useOutletContext<Context>();
  const s = scenario(p, "draft");
  const f = sessionId && getAuctionScheduleFixture(sessionId, s);
  if (!f) return <NotFoundPage />;
  const invalid = s === "invalid-chronology";
  const canCommit = role === "ADMIN";
  return (
    <Shell title="Lịch & publication">
      <section className="ops-panel">
        <h2>Schedule proposal · {f.timezone}</h2>
        {[
          ["Registration open", f.registrationOpenAt],
          ["Registration close", f.registrationCloseAt],
          ["Eligibility checkpoint", f.eligibilityCheckpointAt],
          ["Bidding start", f.biddingStartAt],
          ["Bidding end", f.biddingEndAt],
        ].map(([l, v]) => (
          <label key={l}>
            {l}
            <input value={v} readOnly />
          </label>
        ))}
        {invalid && (
          <p className="ops-conflict">
            Invalid chronology: không tạo Schedule Version.
          </p>
        )}
        <p>
          Lifecycle{" "}
          {s === "approved-not-scheduled"
            ? "APPROVED"
            : s === "scheduled" || s === "published"
              ? "SCHEDULED"
              : "DRAFT"}{" "}
          · Publication{" "}
          {s === "published"
            ? "PUBLISHED"
            : s === "scheduled"
              ? "SCHEDULED_FOR_PUBLICATION"
              : "NOT_PUBLISHED"}
        </p>
        {canCommit && !invalid && s === "approved-not-scheduled" && (
          <Link className="button primary" to="?scenario=scheduled">
            Create Schedule
          </Link>
        )}
        {canCommit && s === "scheduled" && (
          <Link className="button primary" to="?scenario=published">
            Publish separately
          </Link>
        )}
        <p>APPROVED ≠ SCHEDULED ≠ PUBLISHED.</p>
      </section>
    </Shell>
  );
}
export function ApprovalQueuePage() {
  const [p] = useSearchParams();
  const { role } = useOutletContext<Context>();
  if (role === "CONTENT_STAFF") return <Navigate to="/ops" replace />;
  const rows = getApprovalQueueFixture(scenario(p, "session-pending-approval"));
  return (
    <Shell title="Hàng đợi phê duyệt">
      <Table headers={["Package", "Session", "Maker", "Readiness", "Action"]}>
        {rows.map((x) => (
          <tr key={x.approvalId}>
            <td>{x.approvalId}</td>
            <td>{x.sessionId}</td>
            <td>{x.makerUserId}</td>
            <td>{x.readinessPassed ? "Passed" : "Missing"}</td>
            <td>
              <Link
                to={`/governance/approvals/${x.approvalId}?scenario=ready&role=admin&user=admin.checker@mock.local`}
              >
                Review Package
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
export function ApprovalPackagePage() {
  const { approvalId } = useParams();
  const [p] = useSearchParams();
  const { role } = useOutletContext<Context>();
  const f =
    approvalId &&
    getApprovalPackageFixture(
      approvalId,
      scenario(p, "ready"),
      p.get("user") || "admin.checker@mock.local",
      role,
    );
  const [decision, setDecision] = useState<string>();
  if (!f) return <NotFoundPage />;
  const blocked = f.stale || !f.canApprove;
  return (
    <Shell title="Approval package">
      <div className="ops-workspace">
        <section className="ops-panel">
          <Badge>{f.item.status}</Badge>
          <h2>{f.item.approvalId}</h2>
          <p>
            Maker {f.item.makerUserId} · current actor {f.currentUserId} ·
            version {f.item.submittedVersion}
          </p>
          <p>
            {f.makerConflict
              ? "Maker-checker conflict: identity matches maker."
              : f.stale
                ? "Stale version blocks decision."
                : "Ready for checker decision."}
          </p>
          <p>
            Approve results in APPROVED only: not scheduled and not published.
          </p>
        </section>
        <aside className="ops-decision">
          <h2>Decision rail</h2>
          <button
            className="button primary"
            disabled={blocked}
            onClick={() => setDecision("approve")}
          >
            Approve
          </button>
          <button
            className="button secondary"
            disabled={f.stale}
            onClick={() => setDecision("correction")}
          >
            Request Correction
          </button>
          <button
            className="button ops-destructive"
            disabled={f.stale}
            onClick={() => setDecision("reject")}
          >
            Reject
          </button>
        </aside>
      </div>
      {decision && (
        <Decision
          title={`Confirm ${decision}`}
          onClose={() => setDecision(undefined)}
          onConfirm={() => setDecision(undefined)}
          link={
            decision === "approve"
              ? `/ops/auctions/${f.item.sessionId}/schedule-publication?scenario=approved-not-scheduled`
              : undefined
          }
        />
      )}
    </Shell>
  );
}
function Badge({ children }: { children: ReactNode }) {
  return <span className="badge warning">{children}</span>;
}
function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="ops-table-wrap">
      <table>
        <caption className="sr-only">Dữ liệu vận hành</caption>
        <thead>
          <tr>
            {headers.map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Decision({
  title,
  onClose,
  onConfirm,
  link,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  link?: string;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="ops-dialog-overlay">
      <section className="ops-dialog" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <label>
          Lý do
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        {link ? (
          <Link className="button primary" to={link}>
            Confirm
          </Link>
        ) : (
          <button
            className="button primary"
            disabled={!reason.trim()}
            onClick={onConfirm}
          >
            Confirm
          </button>
        )}
      </section>
    </div>
  );
}
