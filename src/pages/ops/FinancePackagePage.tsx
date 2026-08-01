import { AlertTriangle, CheckCircle2, Send, ShieldCheck } from "lucide-react";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { getAuditEvents } from "../../services/mock/auditProjectionService";
import {
  getFinancePackageFixture,
  getFinancePackageVersions,
} from "../../services/mock/financePackageService";
import type { FinancePackageScenario } from "../../types/domain";
import { formatDateTime, formatMoney } from "../../utils/format";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/finance-package.css";
type Ctx = { role: "CONTENT_STAFF" | "ADMIN" | "FINANCE" };
const scenarios: FinancePackageScenario[] = [
  "draft",
  "submitted",
  "correction-requested",
  "resubmitted",
  "accepted",
  "rejected",
  "superseded",
  "error",
];
const tone = (status: string) =>
  status === "ACCEPTED" || status === "PASS"
    ? "success"
    : status === "REJECTED" || status === "FAIL"
      ? "danger"
      : status === "SUPERSEDED"
        ? "neutral"
        : "warning";
export function FinancePackagePage() {
  const { packageId } = useParams();
  const { role } = useOutletContext<Ctx>();
  const [params, setParams] = useSearchParams();
  const requested = params.get("scenario");
  const scenario = scenarios.includes(requested as FinancePackageScenario)
    ? (requested as FinancePackageScenario)
    : "submitted";
  if (params.get("view") === "loading") return <FinanceSkeleton />;
  if (scenario === "error")
    return (
      <main className="finance-package-page">
        <h1>Không thể tải Finance Result Package</h1>
        <p className="finance-error">
          Không thay đổi package status hoặc dữ liệu nguồn.
        </p>
        <button
          className="button primary"
          onClick={() =>
            setParams((current) => {
              const next = new URLSearchParams(current);
              next.set("scenario", "submitted");
              return next;
            })
          }
        >
          Thử lại
        </button>
      </main>
    );
  if (params.get("view") === "error")
    return (
      <main className="finance-package-page">
        <h1>Không thể tải Finance Result Package</h1>
        <button
          className="button primary"
          onClick={() =>
            setParams((current) => {
              const next = new URLSearchParams(current);
              next.delete("view");
              return next;
            })
          }
        >
          Thử lại
        </button>
      </main>
    );
  const item = packageId && getFinancePackageFixture(packageId, scenario);
  if (!item) return <NotFoundPage />;
  const versions = getFinancePackageVersions(item.packageGroupId);
  const acceptedCount = versions.filter(
    (version) => version.acceptedEffective,
  ).length;
  const canFinance = role === "FINANCE" && item.status === "SUBMITTED";
  const canSend = role === "CONTENT_STAFF" && item.status === "DRAFT";
  const canCorrect =
    role === "CONTENT_STAFF" && item.status === "CORRECTION_REQUESTED";
  const audit = getAuditEvents("finance-package", item.packageId);
  const set = (key: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set(key, value);
      return next;
    });
  return (
    <main className="finance-package-page">
      <header className="finance-header">
        <span>SUP-001 · FINANCE HANDOFF</span>
        <h1>Finance Result Package</h1>
        <p>Supporting handoff cho kết quả đấu giá · {item.packageId}</p>
        <div className="finance-meta">
          <Badge tone={tone(item.status)}>{item.status}</Badge>
          {item.acceptedEffective && (
            <Badge tone="success">Effective accepted package version</Badge>
          )}
          <span>
            Group {item.packageGroupId} · Version {item.version}
          </span>
        </div>
      </header>
      <p className="finance-disclosure">
        <ShieldCheck />
        Package này chỉ chuyển giao dữ liệu kết quả đấu giá mô phỏng sang
        Financial Management Mock. Việc package được chấp nhận không xác nhận
        thanh toán và không xác lập Final Winner.
      </p>
      {acceptedCount > 1 && (
        <p className="finance-error">
          <AlertTriangle />
          Integrity error: có nhiều effective accepted version.
        </p>
      )}
      <div className="finance-layout">
        <section className="finance-main">
          <section className="finance-panel">
            <h2>Phiên bản hiện tại</h2>
            <dl className="finance-definition">
              <div>
                <dt>Created</dt>
                <dd>
                  <time dateTime={item.createdAt}>
                    {formatDateTime(item.createdAt)} GMT+7
                  </time>
                </dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>
                  {item.submittedAt ? (
                    <time dateTime={item.submittedAt}>
                      {formatDateTime(item.submittedAt)} GMT+7
                    </time>
                  ) : (
                    "Chưa gửi"
                  )}
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>Auction Management Mock</dd>
              </div>
              <div>
                <dt>Current role</dt>
                <dd>{role}</dd>
              </div>
            </dl>
          </section>
          <section className="finance-panel">
            <h2>Validation</h2>
            <ul className="finance-validation">
              {item.validationItems.map((check) => (
                <li key={check.id}>
                  <Badge tone={tone(check.status)}>{check.status}</Badge>
                  <div>
                    <strong>{check.label}</strong>
                    <p>{check.description}</p>
                    {check.relatedReference && (
                      <small>{check.relatedReference}</small>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="finance-panel">
            <h2>Payload summary</h2>
            <dl className="finance-definition">
              {item.payloadSummary.map((field) => (
                <div key={field.label}>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="finance-panel">
            <h2>Version timeline</h2>
            <ol className="finance-versions">
              {versions.map((version) => (
                <li
                  key={version.packageId}
                  className={
                    version.packageId === item.packageId ? "current" : ""
                  }
                >
                  <strong>
                    v{version.version} · {version.status}
                  </strong>
                  <span>{version.packageId}</span>
                  {version.supersedesVersion && (
                    <small>Supersedes v{version.supersedesVersion}</small>
                  )}
                </li>
              ))}
            </ol>
          </section>
          <section className="finance-panel">
            <h2>Audit timeline</h2>
            <ol className="finance-audit">
              {audit.length ? (
                audit.map((event) => (
                  <li key={event.eventId}>
                    <time dateTime={event.occurredAt}>
                      {formatDateTime(event.occurredAt)}
                    </time>
                    <strong>{event.action}</strong>
                    <small>
                      {event.actorDisplay} · {event.correlationId}
                    </small>
                  </li>
                ))
              ) : (
                <li>Chưa có event cho version/scenario này.</li>
              )}
            </ol>
          </section>
        </section>
        <aside className="finance-rail">
          <section className="finance-panel">
            <h2>Result & candidate</h2>
            <p>
              <strong>{formatMoney(item.amount)}</strong>
              <br />
              RES-PATEK-5711R · Candidate rank 1
            </p>
            <Link to="/ops/results/RES-PATEK-5711R">Mở Result Monitor</Link>
            <Link to="/ops/results/RES-PATEK-5711R/candidates">
              Mở Candidate Timeline
            </Link>
          </section>
          <section className="finance-panel finance-decision">
            <h2>Finance decision</h2>
            <p>
              {item.decisionReason ||
                "Package chỉ là supporting handoff. Không tạo Payment hoặc Final Winner."}
            </p>
            {canSend && (
              <button className="button primary">
                <Send />
                Gửi package
              </button>
            )}
            {canCorrect && (
              <Link
                className="button primary"
                to="/ops/finance-packages/FIN-PKG-PATEK-5711R-V2?scenario=resubmitted"
              >
                Tạo bản sửa V2
              </Link>
            )}
            {canFinance && (
              <div className="finance-actions">
                <button className="button primary">
                  <CheckCircle2 />
                  Accept
                </button>
                <button className="button secondary">Request Correction</button>
                <button className="button ops-destructive">Reject</button>
              </div>
            )}
            {!canSend && !canCorrect && !canFinance && (
              <p className="read-only">
                Read-only oversight. Accepted Package ≠ Payment Confirmed ≠
                FinalWinnerConfirmed.
              </p>
            )}
          </section>
          <section className="finance-panel">
            <h2>References</h2>
            <Link
              to={`/admin/audit?objectType=finance-package&objectId=${item.packageId}`}
            >
              Mở Audit projection
            </Link>
            <p>Payment: PAY-••••-5711R</p>
            <p>Final Winner: SGD-WIN-•••-5711R</p>
            {role === "FINANCE" && (
              <Link to="/finance/override-requests/new">
                Tạo yêu cầu xử lý ngoại lệ có kiểm soát
              </Link>
            )}
          </section>
        </aside>
      </div>
      {params.get("demo") === "1" && (
        <label className="finance-demo">
          Demo scenario
          <select
            value={scenario}
            onChange={(event) => set("scenario", event.target.value)}
          >
            {scenarios.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      )}
    </main>
  );
}
function FinanceSkeleton() {
  return (
    <main className="finance-package-page">
      <header className="finance-header">
        <span>SUP-001</span>
        <h1>Finance Result Package</h1>
      </header>
      <div className="finance-skeleton">
        <i />
        <i />
        <i />
        <i />
      </div>
    </main>
  );
}
