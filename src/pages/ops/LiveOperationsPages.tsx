import { AlertTriangle, FileCheck2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import {
  candidateScenarios,
  getCandidateTimelineFixture,
  getLiveOperationsFixture,
  getOfficialBidEvents,
  getResultOperationsFixture,
  liveScenarios,
  resultScenarios,
  type CandidateTimelineScenario,
  type ClosingResultScenario,
  type LiveOperationsScenario,
} from "../../services/mock/liveOperationsService";
import { formatDateTime, formatMoney } from "../../utils/format";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/live-operations.css";
type Context = { role: "CONTENT_STAFF" | "ADMIN" };
const Head = ({ title }: { title: string }) => (
  <header className="ops-heading">
    <span>LIVE & CLOSING OPERATIONS</span>
    <h1>{title}</h1>
    <p>Projection nội bộ chỉ đọc từ Auction Management Mock.</p>
  </header>
);
export function LiveOperationsConsolePage() {
  const { sessionId } = useParams();
  const { role } = useOutletContext<Context>();
  const [params, setParams] = useSearchParams();
  const requested = params.get("scenario");
  const scenario: LiveOperationsScenario = liveScenarios.includes(
    requested as LiveOperationsScenario,
  )
    ? (requested as LiveOperationsScenario)
    : "healthy";
  const fixture = sessionId && getLiveOperationsFixture(sessionId, scenario);
  if (!fixture) return <NotFoundPage />;
  const events = getOfficialBidEvents(fixture.sessionId);
  const filter = params.get("eventFilter") || "all";
  const setScenario = (value: LiveOperationsScenario) =>
    setParams((c) => {
      const n = new URLSearchParams(c);
      n.set("scenario", value);
      return n;
    });
  return (
    <>
      <Head title="Live Operations Console" />
      <section className="live-status">
        <Badge tone={fixture.status === "HEALTHY" ? "success" : "warning"}>
          {fixture.status}
        </Badge>
        <h2>{fixture.assetName}</h2>
        <p>
          {fixture.code} · Session {fixture.sessionId} · cập nhật{" "}
          {formatDateTime(fixture.updatedAt)}
        </p>
        <strong>{formatMoney(fixture.currentPrice)}</strong>
        <time dateTime={fixture.endsAt}>
          Mock closing: {formatDateTime(fixture.endsAt)}
        </time>
      </section>
      <div className="live-grid">
        <section className="live-panel">
          <h2>Health metrics</h2>
          <div className="live-metrics">
            {fixture.metrics.map(([label, value]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="live-panel">
          <h2>Actions</h2>
          {role === "CONTENT_STAFF" ? (
            <p>
              Content Staff chỉ có quyền theo dõi và escalate; không được thực
              hiện high-risk action.
            </p>
          ) : (
            <div className="live-actions">
              <Link
                className="button secondary"
                to={`/ops/live/${fixture.sessionId}?action=pause`}
              >
                Tạm dừng
              </Link>
              <Link
                className="button secondary"
                to={`/ops/live/${fixture.sessionId}?action=resume`}
              >
                Tiếp tục
              </Link>
              <Link
                className="button ops-destructive"
                to={`/ops/live/${fixture.sessionId}?action=emergency-close`}
              >
                Đóng khẩn cấp
              </Link>
            </div>
          )}
        </section>
        <section className="live-panel">
          <h2>Official bid events</h2>
          <div className="ops-filter">
            <label>
              Lọc
              <select
                value={filter}
                onChange={(e) =>
                  setParams((c) => {
                    const n = new URLSearchParams(c);
                    n.set("eventFilter", e.target.value);
                    return n;
                  })
                }
              >
                <option value="all">Tất cả</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
          </div>
          <ol className="live-events">
            {events
              .filter((event) => filter === "all" || event.status === filter)
              .map((event) => (
                <li key={event.id}>
                  <time>{formatDateTime(event.time)}</time>
                  <Badge
                    tone={event.status === "ACCEPTED" ? "success" : "danger"}
                  >
                    {event.status}
                  </Badge>
                  <strong>
                    {event.alias} · {formatMoney(event.amount)}
                  </strong>
                  <small>
                    {event.reason || "Auction Management Mock"} ·{" "}
                    {event.correlation}
                  </small>
                </li>
              ))}
          </ol>
        </section>
        <section className="live-panel">
          <h2>Participants / eligibility</h2>
          <p>68 eligible · 0 revoked · projection read-only.</p>
          <h2>Incidents</h2>
          {fixture.incidents.length ? (
            fixture.incidents.map((item) => (
              <p className="live-alert" key={item}>
                <AlertTriangle />
                {item}
              </p>
            ))
          ) : (
            <p>Không có incident mở.</p>
          )}
        </section>
      </div>
      {params.get("demo") === "1" && (
        <label className="handover-demo-toolbar">
          Điều khiển mô phỏng
          <select
            value={scenario}
            onChange={(e) =>
              setScenario(e.target.value as LiveOperationsScenario)
            }
          >
            {liveScenarios.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      )}
      {params.get("action") && (
        <HighRiskDialog
          action={params.get("action")!}
          role={role}
          sessionId={fixture.sessionId}
          scenario={scenario}
          onClose={() =>
            setParams((c) => {
              const n = new URLSearchParams(c);
              n.delete("action");
              return n;
            })
          }
        />
      )}
    </>
  );
}
function HighRiskDialog({
  action,
  role,
  sessionId,
  scenario,
  onClose,
}: {
  action: string;
  role: Context["role"];
  sessionId: string;
  scenario: LiveOperationsScenario;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [phrase, setPhrase] = useState("");
  const destructive = action === "emergency-close" || action === "cancel";
  const phraseNeeded =
    action === "emergency-close"
      ? "CLOSE SGD-260717-002"
      : action === "cancel"
        ? "CANCEL SGD-260717-002"
        : "";
  const denied = role === "CONTENT_STAFF" || scenario === "stale-projection";
  const valid =
    reason.trim() && (!phraseNeeded || phrase === phraseNeeded) && !denied;
  return (
    <div className="ops-dialog-overlay">
      <section
        className="ops-dialog high-risk"
        role="dialog"
        aria-modal="true"
        aria-labelledby="risk-title"
      >
        <ShieldAlert />
        <h2 id="risk-title">
          {action === "pause"
            ? "Tạm dừng phiên đấu giá"
            : action === "resume"
              ? "Tiếp tục phiên đấu giá"
              : action === "emergency-close"
                ? "Đóng phiên khẩn cấp"
                : "Hủy phiên đấu giá"}
        </h2>
        <p>
          Current state: {scenario}. Impact: dừng nhận bid mới, giữ event
          history và tạo audit projection.
        </p>
        {denied && (
          <p className="ops-conflict">
            {role === "CONTENT_STAFF"
              ? "Authority denied: Content Staff không được commit high-risk action."
              : "Stale state: cần xác minh projection trước khi commit."}
          </p>
        )}
        <label>
          Lý do bắt buộc
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {phraseNeeded && (
          <label>
            Nhập “{phraseNeeded}”
            <input value={phrase} onChange={(e) => setPhrase(e.target.value)} />
          </label>
        )}
        <aside className="audit-preview">
          Audit preview · {role} · {action} · {sessionId} · COR-OPS-5711R-01 ·
          21:29, 18/07/2026 (GMT+7)
        </aside>
        <footer>
          <button className="button secondary" onClick={onClose}>
            Hủy
          </button>
          <button
            className={
              destructive ? "button ops-destructive" : "button primary"
            }
            disabled={!valid}
            onClick={onClose}
          >
            Ghi nhận action
          </button>
        </footer>
      </section>
    </div>
  );
}
export function ClosingResultMonitorPage() {
  const { resultId } = useParams();
  const [params] = useSearchParams();
  const requested = params.get("scenario");
  const scenario: ClosingResultScenario = resultScenarios.includes(
    requested as ClosingResultScenario,
  )
    ? (requested as ClosingResultScenario)
    : "closed-with-top3";
  const fixture = resultId && getResultOperationsFixture(resultId, scenario);
  if (!fixture) return <NotFoundPage />;
  return (
    <>
      <Head title="Closing & Result Monitor" />
      <section className="result-ops">
        <Badge tone={scenario === "closed-with-top3" ? "success" : "warning"}>
          {scenario}
        </Badge>
        <h2>{fixture.resultId} · version 1</h2>
        <p>Reference {fixture.reference} · immutable read-only projection</p>
        <ol className="result-steps">
          {fixture.steps.map((step, index) => (
            <li key={step}>
              <span>{index < 5 ? <FileCheck2 /> : index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        {fixture.top3.length > 0 ? (
          <div className="top-three">
            {fixture.top3.map((item) => (
              <article key={item.rank}>
                <strong>Rank {item.rank}</strong>
                <span>{item.alias}</span>
                <b>{formatMoney(item.amount)}</b>
                <small>{item.bidId}</small>
              </article>
            ))}
          </div>
        ) : (
          <p className="live-alert">
            <AlertTriangle />
            Không có Top 3 khả dụng trong scenario này; không có thao tác chọn
            winner thủ công.
          </p>
        )}
        <Link
          className="button primary"
          to={`/ops/results/${fixture.resultId}/candidates`}
        >
          Mở Candidate Timeline
        </Link>
      </section>
    </>
  );
}
export function CandidateFallbackTimelinePage() {
  const { resultId } = useParams();
  const [params, setParams] = useSearchParams();
  const requested = params.get("scenario");
  const scenario: CandidateTimelineScenario = candidateScenarios.includes(
    requested as CandidateTimelineScenario,
  )
    ? (requested as CandidateTimelineScenario)
    : "rank1-active";
  const fixture = resultId && getCandidateTimelineFixture(resultId, scenario);
  if (!fixture) return <NotFoundPage />;
  const active = fixture.attempts.filter((item) => item.status === "ACTIVE");
  if (active.length > 1)
    return (
      <main className="admin-content">
        <p className="ops-conflict">
          Integrity error: có nhiều CandidateAttempt ACTIVE.
        </p>
      </main>
    );
  return (
    <>
      <Head title="Candidate & Fallback Timeline" />
      <section className="candidate-ops">
        <p>Result snapshot read-only · {fixture.resultId}</p>
        {fixture.hold && (
          <p className="live-alert">
            <AlertTriangle />
            {fixture.hold}
          </p>
        )}
        <ol>
          {fixture.attempts.map((item) => (
            <li
              key={item.rank}
              aria-current={item.status === "ACTIVE" ? "step" : undefined}
            >
              <strong>
                Rank {item.rank} · {item.alias}
              </strong>
              <span>
                {formatMoney(item.amount)} · {item.status}
              </span>
              <small>
                Deadline: {formatDateTime(item.deadline)}{" "}
                {item.payment && `· Payment ${item.payment}`}
              </small>
            </li>
          ))}
        </ol>
        <section className="live-panel">
          <h2>Financial reference</h2>
          <p>PAY-••••-5711R · Financial Management Mock · read-only.</p>
          <p>
            Payment pending hoặc ambiguous không kích hoạt fallback. Final
            Winner chỉ do system transition tạo.
          </p>
        </section>
      </section>
      {params.get("demo") === "1" && (
        <label className="handover-demo-toolbar">
          Điều khiển mô phỏng
          <select
            value={scenario}
            onChange={(e) =>
              setParams((c) => {
                const n = new URLSearchParams(c);
                n.set("scenario", e.target.value);
                return n;
              })
            }
          >
            {candidateScenarios.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
