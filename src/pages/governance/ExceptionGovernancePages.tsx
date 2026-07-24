import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  Link,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import {
  getCancellationFixture,
  getChangeFixture,
  getFailedAuctionFixture,
  getPublicationFixture,
  getReauctionFixture,
  getRemediationFixture,
} from "../../services/mock/exceptionGovernanceService";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/exception-governance.css";
type Ctx = { role: "CONTENT_STAFF" | "ADMIN" };
function Header({ title }: { title: string }) {
  return (
    <header className="ops-heading">
      <span>EXCEPTION GOVERNANCE</span>
      <h1>{title}</h1>
      <p>Authority, impact và audit projection · dữ liệu mock chỉ đọc.</p>
    </header>
  );
}
function Decision({
  title,
  blocked = false,
  destructive = false,
}: {
  title: string;
  blocked?: boolean;
  destructive?: boolean;
}) {
  const { role } = useOutletContext<Ctx>();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const allowed = role !== "CONTENT_STAFF" && !blocked;
  return (
    <aside className="gov-rail">
      <h2>Decision rail</h2>
      {!allowed && (
        <p className="ops-conflict">
          {blocked
            ? "Current state chặn quyết định."
            : "Content Staff không có authority commit."}
        </p>
      )}
      <button
        className={destructive ? "button ops-destructive" : "button primary"}
        disabled={!allowed}
        onClick={() => setOpen(true)}
      >
        {title}
      </button>
      {open && (
        <div className="ops-dialog-overlay">
          <section className="ops-dialog" role="dialog" aria-modal="true">
            <ShieldCheck />
            <h2>{title}?</h2>
            <p>
              Impact và current state đã được kiểm tra trên fixture. Audit
              event: GOV-AUD-•••-001.
            </p>
            <label>
              Lý do bắt buộc
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {destructive && (
              <label>
                Nhập “CONFIRM GOVERNANCE”
                <input />
              </label>
            )}
            <footer>
              <button
                className="button secondary"
                onClick={() => setOpen(false)}
              >
                Quay lại
              </button>
              <button
                className={
                  destructive ? "button ops-destructive" : "button primary"
                }
                disabled={!reason.trim()}
                onClick={() => setOpen(false)}
              >
                Ghi nhận quyết định
              </button>
            </footer>
          </section>
        </div>
      )}
    </aside>
  );
}
export function FailedAuctionReviewPage() {
  const { failureCaseId } = useParams();
  const [p] = useSearchParams();
  const f =
    failureCaseId &&
    getFailedAuctionFixture(
      failureCaseId,
      p.get("scenario") || "potential-failure",
    );
  if (!f) return <NotFoundPage />;
  return (
    <>
      <Header title="Failed Auction Review" />
      <div className="gov-layout">
        <section className="gov-main">
          <Badge tone={f.definitive ? "warning" : "danger"}>{f.status}</Badge>
          <h2>{f.asset}</h2>
          <p>
            Lý do: {f.reason}.{" "}
            {f.definitive
              ? "Có thể review follow-up có governance."
              : "Payment ambiguity không phải definitive failure; không mở re-auction."}
          </p>
          <GovRefs values={f.references} />
          {f.definitive && (
            <Link
              className="button primary"
              to={`/governance/failed-auctions/${f.id}/reauction`}
            >
              Chuẩn bị đề xuất đấu giá lại
            </Link>
          )}
        </section>
        <Decision
          title="Xác nhận phiên đấu giá thất bại"
          blocked={!f.definitive}
        />
      </div>
    </>
  );
}
export function ReauctionRecommendationPage() {
  const { failureCaseId } = useParams();
  const [p] = useSearchParams();
  const f =
    failureCaseId &&
    getReauctionFixture(failureCaseId, p.get("scenario") || "draft");
  if (!f) return <NotFoundPage />;
  const blocked = !f.assetReady || !f.financialResolved;
  return (
    <>
      <Header title="Re-auction Recommendation" />
      <div className="gov-layout">
        <section className="gov-main">
          <h2>Session mới đề xuất: {f.proposedSessionId}</h2>
          <p>
            Session cũ {f.previousSessionId} vẫn giữ lifecycle cũ; proposal
            không clone mù rule, schedule hay publication.
          </p>
          <Diff rows={f.changes} />
          <p>
            {blocked
              ? "Asset hoặc financial reference chưa sẵn sàng."
              : "Sau approval, session mới có lifecycle DRAFT độc lập."}
          </p>
        </section>
        <Decision title="Phê duyệt đề xuất đấu giá lại" blocked={blocked} />
      </div>
    </>
  );
}
export function SensitiveChangeReviewPage() {
  const { changeId } = useParams();
  const [p] = useSearchParams();
  const f =
    changeId && getChangeFixture(changeId, p.get("scenario") || "pending");
  if (!f) return <NotFoundPage />;
  const stale = f.baseVersion !== f.currentVersion;
  return (
    <>
      <Header title="Sensitive Change Review" />
      <div className="gov-layout">
        <section className="gov-main">
          <h2>
            Version {f.baseVersion} → proposed v{f.proposedVersion}
          </h2>
          <Diff rows={f.fields} />
          <p>
            Customer reaccept: {f.requiresReaccept ? "Có" : "Không"} ·
            Republish: {f.requiresRepublish ? "Có" : "Không"}
          </p>
          {f.requiresRepublish && (
            <Link to="/governance/publication/royal-oak-15500st-draft">
              Mở publication governance
            </Link>
          )}
        </section>
        <Decision title="Phê duyệt sensitive change" blocked={stale} />
      </div>
    </>
  );
}
export function CancellationReviewPage() {
  const { cancellationId } = useParams();
  const [p] = useSearchParams();
  const f =
    cancellationId &&
    getCancellationFixture(cancellationId, p.get("scenario") || "requested");
  if (!f) return <NotFoundPage />;
  return (
    <>
      <Header title="Cancellation Review" />
      <div className="gov-layout">
        <section className="gov-main">
          <h2>
            {f.code} · {f.phase}
          </h2>
          <p>
            Lifecycle: {f.lifecycle} · Publication: {f.publication}
          </p>
          <p>{f.reason}</p>
          <p>
            Bid history retained: Có · Audit history retained: Có · Affected
            customers: {f.customers}
          </p>
        </section>
        <Decision title="Phê duyệt hủy phiên" blocked={f.stale} destructive />
      </div>
    </>
  );
}
export function PublicationGovernancePage() {
  const { sessionId } = useParams();
  const [p] = useSearchParams();
  const f =
    sessionId &&
    getPublicationFixture(sessionId, p.get("scenario") || "published");
  if (!f) return <NotFoundPage />;
  const blocked =
    f.publication !== "READY" || !f.correctionReady || !f.approvalReady;
  return (
    <>
      <Header title="Unpublish / Republish" />
      <div className="gov-layout">
        <section className="gov-main">
          <h2>Lifecycle: {f.lifecycle}</h2>
          <h3>Publication: {f.publication}</h3>
          <p>
            Unpublish không thay đổi lifecycle. Republish cần correction và
            approval readiness; retry projection không rollback domain decision.
          </p>
        </section>
        <Decision
          title={f.publication === "PUBLISHED" ? "Gỡ công bố" : "Công bố lại"}
          blocked={f.publication !== "PUBLISHED" && blocked}
          destructive={f.publication === "PUBLISHED"}
        />
      </div>
    </>
  );
}
export function RemediationPage() {
  const { remediationId } = useParams();
  const [p] = useSearchParams();
  const f =
    remediationId &&
    getRemediationFixture(remediationId, p.get("scenario") || "investigating");
  if (!f) return <NotFoundPage />;
  return (
    <>
      <Header title="Dispute / Remediation" />
      <div className="gov-layout">
        <section className="gov-main">
          <p className="gov-hold">
            <AlertTriangle />
            {f.reason}
          </p>
          <h2>{f.status}</h2>
          <GovRefs values={[f.payment, f.winner, f.handover]} />
          <p>
            Final Winner history retained: Có · Candidate fallback: Không ·
            Handover vẫn ở Hold/Remediation.
          </p>
        </section>
        <Decision title="Quyết định remediation" />
      </div>
    </>
  );
}
function GovRefs({ values }: { values: string[] }) {
  return (
    <dl className="gov-refs">
      {values.map((value, index) => (
        <div key={value}>
          <dt>Reference {index + 1}</dt>
          <dd>{value} · READ_ONLY</dd>
        </div>
      ))}
    </dl>
  );
}
function Diff({ rows }: { rows: string[][] }) {
  return (
    <div className="gov-diff">
      {rows.map((row) => (
        <p key={row[0]}>
          <strong>{row[0]}</strong>
          <span>Old: {row[1]}</span>
          <span>New: {row[2]}</span>
          <small>{row[3]}</small>
        </p>
      ))}
    </div>
  );
}
