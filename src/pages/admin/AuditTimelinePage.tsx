import { Clipboard, ExternalLink, FileClock, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAuditEvents, getSupportedAuditObjects } from "../../services/mock/auditProjectionService";
import type { AuditProjectionEvent } from "../../types/domain";
import { formatDateTime } from "../../utils/format";
import "../../styles/audit-timeline.css";

const routes: Record<string, string> = {
  "opening-request": "/governance/opening-requests/",
  "approval-package": "/governance/approvals/",
  handover: "/governance/handover-cases/",
  remediation: "/governance/remediation/",
};

export function AuditTimelinePage() {
  const [params, setParams] = useSearchParams();
  const [exported, setExported] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const objectType = params.get("objectType") || "";
  const objectId = params.get("objectId") || "";
  const objects = getSupportedAuditObjects();
  if (!objectType && !objectId) return <AuditOverview />;
  const known = objects.find((item) => item.objectType === objectType && item.objectId === objectId);
  if (!known) return <AuditOverview invalidReference={`${objectType} · ${objectId}`} />;
  const events = getAuditEvents(known.objectType, objectId);
  const selected = events.find((event) => event.eventId === params.get("eventId"));
  const set = (key: string, value?: string) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (value) next.set(key, value); else next.delete(key);
    return next;
  });
  const filtered = events.filter((event) =>
    (!params.get("actor") || event.actorRole === params.get("actor")) &&
    (!params.get("action") || event.action.toLowerCase().includes(params.get("action")!.toLowerCase())) &&
    (!params.get("state") || event.newState === params.get("state")),
  );
  return (
    <main className="audit-page">
      <header className="audit-header"><span>ADM-004 · AUDIT PROJECTION</span><h1>Audit & Decision Timeline</h1><p>Projection chỉ đọc; dữ liệu authoritative vẫn thuộc workspace nguồn.</p></header>
      <p className="audit-disclosure"><FileClock />Audit projection không phải source of truth và không thể chỉnh sửa hoặc xóa event.</p>
      <section className="audit-context">
        <dl><div><dt>Object</dt><dd>{known.label}</dd></div><div><dt>Type / ID</dt><dd>{objectType} · {objectId}</dd></div><div><dt>Source</dt><dd>Operations & Governance</dd></div><div><dt>Timezone</dt><dd>Asia/Ho_Chi_Minh (GMT+7)</dd></div></dl>
        <div className="audit-context-actions"><Link to="/admin/audit">Tất cả đối tượng</Link>{routes[objectType] ? <Link to={`${routes[objectType]}${objectId}`}><ExternalLink />Mở workspace quản trị</Link> : <span title="Workspace nguồn thuộc domain khác và chưa có projection quản trị an toàn.">Chỉ xem qua audit</span>}<button className="button secondary" onClick={() => setExported(true)}>Xuất bằng chứng đang lọc</button></div>
      </section>
      {exported && <p className="audit-disclosure" role="status"><FileClock />Đã chuẩn bị bản xuất mô phỏng gồm {filtered.length} sự kiện; thao tác xuất được ghi nhận phục vụ truy vết.</p>}
      <section className="audit-filters">
        <label>Actor<select value={params.get("actor") || ""} onChange={(e) => set("actor", e.target.value || undefined)}><option value="">Tất cả</option>{[...new Set(events.map((x) => x.actorRole))].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Action<input value={params.get("action") || ""} onChange={(e) => set("action", e.target.value || undefined)} placeholder="Tìm hành động" /></label>
        <label>State<select value={params.get("state") || ""} onChange={(e) => set("state", e.target.value || undefined)}><option value="">Tất cả</option>{[...new Set(events.map((x) => x.newState).filter(Boolean))].map((x) => <option key={x}>{x}</option>)}</select></label>
        <span>{filtered.length} event</span>
      </section>
      <ol className="audit-events">{filtered.length ? filtered.map((event) => <li key={event.eventId}><button ref={params.get("eventId") === event.eventId ? trigger : undefined} onClick={() => set("eventId", event.eventId)}><time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)} GMT+7</time><strong>{event.action}</strong><span>{event.actorDisplay} · {event.previousState || "—"} → {event.newState || "—"}</span><small>{event.source} · {event.correlationId}</small></button></li>) : <li className="audit-empty">Không có event khớp bộ lọc hiện tại.</li>}</ol>
      {selected && <AuditDrawer event={selected} onClose={() => { set("eventId"); trigger.current?.focus(); }} />}
    </main>
  );
}

function AuditOverview({ invalidReference }: { invalidReference?: string }) {
  const objects = getSupportedAuditObjects();
  const records = objects.flatMap((object) => getAuditEvents(object.objectType, object.objectId));
  const [query, setQuery] = useState("");
  const [exported, setExported] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredObjects = objects.filter((object) => {
    if (!normalizedQuery) return true;
    const events = getAuditEvents(object.objectType, object.objectId);
    return (
      `${object.label} ${object.objectType} ${object.objectId}`
        .toLowerCase()
        .includes(normalizedQuery) ||
      events.some((event) =>
        `${event.correlationId} ${event.action}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    );
  });
  return <main className="audit-page">
    <header className="audit-header"><span>ADM-004 · MONITORING & AUDIT</span><h1>Audit & Monitoring</h1><p>Tra cứu projection theo đối tượng, correlation ID và theo dõi tính toàn vẹn của luồng quản trị.</p></header>
    {invalidReference && <p className="audit-warning">Không tìm thấy reference “{invalidReference}”. Hãy chọn một đối tượng khả dụng bên dưới.</p>}
    <div className="audit-overview-metrics"><article><strong>{objects.length}</strong><span>Đối tượng được lập chỉ mục</span></article><article><strong>{records.length}</strong><span>Audit event</span></article><article><strong>{new Set(records.map((x) => x.correlationId)).size}</strong><span>Correlation flow</span></article><article><strong>Healthy</strong><span>Projection integrity</span></article></div>
    <section className="audit-search"><Search /><input aria-label="Tìm kiếm audit" placeholder="Tìm theo đối tượng hoặc mã tương quan" value={query} onChange={(event) => setQuery(event.target.value)} /><span>{filteredObjects.length} kết quả</span><button className="button secondary" onClick={() => setExported(true)}>Xuất danh sách</button></section>
    {exported && <p className="audit-disclosure" role="status"><FileClock />Đã chuẩn bị bản xuất mô phỏng cho {filteredObjects.length} đối tượng; dữ liệu nguồn không bị thay đổi.</p>}
    <section className="audit-object-list"><h2>Đối tượng audit gần đây</h2>{filteredObjects.map((object) => { const events = getAuditEvents(object.objectType, object.objectId); const latest = events.at(-1); return <Link key={`${object.objectType}-${object.objectId}`} to={`/admin/audit?objectType=${object.objectType}&objectId=${object.objectId}`}><FileClock /><div><strong>{object.label}</strong><small>{object.objectType} · {object.objectId}</small></div><span>{events.length} sự kiện</span><time>{latest ? formatDateTime(latest.occurredAt) : "Chưa có dữ liệu"}</time></Link>; })}{!filteredObjects.length && <p className="audit-empty">Không tìm thấy đối tượng hoặc mã tương quan phù hợp.</p>}</section>
    <p className="audit-disclosure"><FileClock />Read model chỉ phục vụ giám sát. Mọi thay đổi nghiệp vụ phải thực hiện tại domain authoritative tương ứng.</p>
  </main>;
}

function AuditDrawer({ event, onClose }: { event: AuditProjectionEvent; onClose: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { ref.current?.focus(); const close = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);
  return <div className="audit-drawer-scrim"><aside className="audit-drawer" role="dialog" aria-modal="true" aria-label="Chi tiết sự kiện audit"><button ref={ref} className="audit-close" onClick={onClose} aria-label="Đóng chi tiết audit"><X /></button><h2>Chi tiết sự kiện</h2><dl>{[["Mã sự kiện", event.eventId], ["Đối tượng", `${event.objectType} · ${event.objectId}`], ["Người thực hiện", `${event.actorDisplay} (${event.actorRole})`], ["Hành động", event.action], ["Trạng thái", `${event.previousState || "—"} → ${event.newState || "—"}`], ["Lý do", event.reason || "—"], ["Thời điểm", `${formatDateTime(event.occurredAt)} GMT+7`], ["Mã tương quan", event.correlationId], ["Nguồn", event.source]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><button className="button secondary" onClick={() => navigator.clipboard?.writeText(event.correlationId).then(() => setCopied(true)).catch(() => setCopied(false))}><Clipboard />{copied ? "Đã sao chép" : "Sao chép mã tương quan"}</button></aside></div>;
}
