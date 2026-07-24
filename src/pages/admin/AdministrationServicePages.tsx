import {
  AlertTriangle, BellRing, CheckCircle2, ChevronRight, Clock3,
  FileCheck2, FileClock, GitBranch, KeyRound, LockKeyhole, Search, Settings2,
  ShieldCheck, Users, XCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { useAdministrationStore } from "../../store/administrationStore";

const tone = (status: string): "success" | "warning" | "danger" | "info" | "neutral" => {
  if (["ACTIVE", "APPROVED", "COMPLETED"].includes(status)) return "success";
  if (["REJECTED", "FAILED", "SUSPENDED", "HIGH"].includes(status)) return "danger";
  if (["RETURNED", "PENDING_REVIEW", "PENDING_APPROVAL", "AWAITING_DOMAIN", "SCHEDULED", "MEDIUM"].includes(status)) return "warning";
  if (["ASSIGNED", "IN_REVIEW"].includes(status)) return "info";
  return "neutral";
};

function PageHeader({ eyebrow = "ADMINISTRATION & REPORTING", title, intro, action }: { eyebrow?: string; title: string; intro: string; action?: ReactNode }) {
  return <header className="admin-heading ar-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div>{action}</header>;
}
function Status({ value }: { value: string }) { return <Badge tone={tone(value)}>{value.replaceAll("_", " ")}</Badge>; }
function Empty({ children }: { children: ReactNode }) { return <div className="ar-empty"><Search /><strong>Không có dữ liệu phù hợp</strong><span>{children}</span></div>; }

export function AdministrationDashboardPage() {
  const workforce = useAdministrationStore((s) => s.workforce);
  const requests = useAdministrationStore((s) => s.accessRequests);
  const tasks = useAdministrationStore((s) => s.approvalTasks);
  const configs = useAdministrationStore((s) => s.configurations);
  const pendingAccess = requests.filter((x) => x.status === "PENDING_REVIEW").length;
  const pendingTasks = tasks.filter((x) => !["COMPLETED", "FAILED"].includes(x.status));
  return <>
    <PageHeader title="Tổng quan Administration Service" intro="Giám sát quyền truy cập, workflow quản trị, cấu hình có phiên bản và độ mới của read model." action={<span className="workspace-status"><CheckCircle2 /> Read model ổn định</span>} />
    <div className="admin-metrics">
      <Metric icon={<Users />} value={String(workforce.filter((x) => x.status === "ACTIVE").length)} label="Nhân sự đang hoạt động" />
      <Metric icon={<KeyRound />} value={String(pendingAccess)} label="Yêu cầu quyền chờ duyệt" />
      <Metric icon={<FileCheck2 />} value={String(pendingTasks.length)} label="Approval task đang mở" />
      <Metric icon={<Settings2 />} value={String(configs.filter((x) => ["DRAFT", "PENDING_APPROVAL"].includes(x.status)).length)} label="Cấu hình chưa hiệu lực" />
    </div>
    <div className="ar-dashboard-grid">
      <section className="admin-panel"><h2>Hàng đợi cần xử lý</h2>{pendingTasks.map((task) => <Link className="ar-work-row" key={task.id} to={`/admin/approval-tasks/${task.id}`}><span className="ar-icon"><Clock3 /></span><div><strong>{task.summary}</strong><small>{task.id} · {task.domain} · Hạn {task.dueAt}</small></div><Status value={task.status} /><ChevronRight /></Link>)}</section>
      <section className="admin-panel"><h2>Governance health</h2><Health label="Audit projection" value="Healthy" /><Health label="Approval orchestration" value="Healthy" /><Health label="Reporting completeness" value="98,7%" warn /><Health label="Last synchronization" value="20/07/2026 23:40" /></section>
    </div>
    <div className="ar-boundary"><LockKeyhole /><div><strong>Ranh giới thẩm quyền</strong><p>Service 6 chỉ điều phối và gửi command đã được phê duyệt. Domain đích luôn revalidate và tự cập nhật dữ liệu authoritative.</p></div></div>
  </>;
}

export function WorkforcePage() {
  const workforce = useAdministrationStore((s) => s.workforce);
  const [query, setQuery] = useState("");
  const rows = workforce.filter((x) => `${x.name} ${x.email} ${x.id} ${x.role}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageHeader title="Workforce & Access" intro="Hồ sơ nhân sự back-office và quyền hiệu lực; không phải hồ sơ Customer/KYC." action={<Link className="button primary" to="/admin/access-requests">Xem yêu cầu quyền</Link>} /><Filter query={query} setQuery={setQuery} placeholder="Tìm theo tên, email, mã hoặc vai trò" /><section className="admin-panel ar-table-wrap"><table className="ar-table"><thead><tr><th>Nhân sự</th><th>Phòng ban</th><th>Vai trò hiệu lực</th><th>Phạm vi</th><th>Trạng thái</th><th>Truy cập gần nhất</th></tr></thead><tbody>{rows.map((x) => <tr key={x.id}><td><strong>{x.name}</strong><small>{x.id} · {x.email}</small></td><td>{x.department}</td><td>{x.role}</td><td>{x.scope}</td><td><Status value={x.status} /></td><td>{x.lastAccess}</td></tr>)}</tbody></table>{!rows.length && <Empty>Hãy thay đổi từ khóa tìm kiếm.</Empty>}</section></>;
}

export function AccessRequestQueuePage() {
  const requests = useAdministrationStore((s) => s.accessRequests);
  const [status, setStatus] = useState("ALL");
  const rows = requests.filter((x) => status === "ALL" || x.status === status);
  return <><PageHeader title="Yêu cầu cấp quyền" intro="Kiểm tra scope, xung đột vai trò và nguyên tắc maker–checker trước khi thay đổi quyền hiệu lực." /><div className="filter-bar"><Search /><span className="ar-filter-label">Trạng thái</span><select aria-label="Lọc trạng thái" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">Tất cả</option><option value="PENDING_REVIEW">Chờ duyệt</option><option value="RETURNED">Yêu cầu bổ sung</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Từ chối</option></select></div><section className="admin-panel ar-table-wrap"><table className="ar-table"><thead><tr><th>Yêu cầu</th><th>Đối tượng / quyền</th><th>Người yêu cầu</th><th>Risk</th><th>Trạng thái</th><th></th></tr></thead><tbody>{rows.map((x) => <tr key={x.id}><td><strong>{x.id}</strong><small>{x.submittedAt}</small></td><td><strong>{x.requestedRole}</strong><small>{x.targetId} · {x.scope}</small></td><td>{x.requester}</td><td><Status value={x.risk} /></td><td><Status value={x.status} /></td><td><Link className="button ghost" to={`/admin/access-requests/${x.id}`}>Thẩm định</Link></td></tr>)}</tbody></table></section></>;
}

export function AccessRequestDetailPage() {
  const { requestId } = useParams();
  const requests = useAdministrationStore((s) => s.accessRequests);
  const workforce = useAdministrationStore((s) => s.workforce);
  const decide = useAdministrationStore((s) => s.decideAccess);
  const item = requests.find((x) => x.id === requestId);
  const target = workforce.find((x) => x.id === item?.targetId);
  if (!item) return <Empty>Yêu cầu không tồn tại hoặc nằm ngoài scope của bạn.</Empty>;
  const open = item.status === "PENDING_REVIEW";
  return <><PageHeader eyebrow="ACCESS GOVERNANCE" title={item.id} intro="Quyết định được audit; quyền hiện tại giữ nguyên nếu validation hoặc phê duyệt thất bại." action={<Status value={item.status} />} /><div className="ar-detail-grid"><section className="admin-panel"><h2>Nội dung yêu cầu</h2><Definition items={[["Nhân sự", `${target?.name} (${item.targetId})`], ["Quyền hiện tại", `${target?.role} · ${target?.scope}`], ["Quyền yêu cầu", `${item.requestedRole} · ${item.scope}`], ["Người yêu cầu", item.requester], ["Lý do", item.reason], ["Thời điểm", item.submittedAt]]} /></section><aside className="admin-panel"><h2>Kiểm tra quản trị</h2><Check label="Workforce Profile tồn tại" /><Check label="Role definition hợp lệ" /><Check label="Scope nằm trong thẩm quyền" /><Check label="Không tự phê duyệt yêu cầu của chính mình" /><div className="ar-risk"><AlertTriangle /><span>Risk: <strong>{item.risk}</strong>. Quyền chỉ có hiệu lực sau quyết định APPROVED.</span></div></aside></div>{open && <DecisionBar onReturn={() => decide(item.id, "RETURNED")} onReject={() => decide(item.id, "REJECTED")} onApprove={() => decide(item.id, "APPROVED")} approveLabel="Phê duyệt & áp dụng quyền" />}</>;
}

const roles = [
  { role: "ADMIN", scope: "Administration & Governance", permissions: ["workforce.manage", "approval.decide", "configuration.govern", "audit.view", "report.export"] },
  { role: "CUSTOMER_SUPPORT", scope: "Customer Service", permissions: ["ticket.manage", "complaint.coordinate", "customer.lookup.masked", "knowledge.propose"] },
  { role: "CONTENT_STAFF", scope: "CMS & Auction Operations", permissions: ["content.manage", "media.manage", "auction.operate", "handover.coordinate"] },
  { role: "FINANCE", scope: "Financial Management", permissions: ["payment.verify", "refund.manage", "reconciliation.manage", "settlement.manage"] },
];
export function RolePermissionPage() { return <><PageHeader title="Role & Permission Matrix" intro="Bốn vai trò back-office được cấp theo least privilege; các thay đổi quan trọng phải tạo version và đi qua phê duyệt." /><div className="ar-role-grid">{roles.map((x) => <article className="admin-panel" key={x.role}><div className="ar-card-title"><ShieldCheck /><div><h2>{x.role}</h2><small>{x.scope}</small></div></div><ul>{x.permissions.map((p) => <li key={p}><CheckCircle2 />{p}</li>)}</ul><button className="button secondary" title="Prototype chỉ đọc">Tạo change request</button></article>)}</div></> }

export function ApprovalTaskQueuePage() {
  const tasks = useAdministrationStore((s) => s.approvalTasks);
  const [status, setStatus] = useState("OPEN");
  const rows = tasks.filter((x) => status === "ALL" || (status === "OPEN" ? !["COMPLETED", "FAILED"].includes(x.status) : x.status === status));
  return <><PageHeader title="Approval Task Center" intro="Một hàng đợi quản trị thống nhất; quyết định nghiệp vụ cuối cùng vẫn thuộc domain authoritative." /><div className="filter-bar"><Search /><select aria-label="Lọc task" value={status} onChange={(e) => setStatus(e.target.value)}><option value="OPEN">Đang mở</option><option value="AWAITING_DOMAIN">Chờ domain xác nhận</option><option value="COMPLETED">Hoàn tất</option><option value="FAILED">Thất bại</option><option value="ALL">Tất cả</option></select></div><section className="admin-panel">{rows.map((x) => <Link className="ar-work-row" key={x.id} to={`/admin/approval-tasks/${x.id}`}><span className="ar-icon"><GitBranch /></span><div><strong>{x.summary}</strong><small>{x.id} · {x.requestType} · {x.objectRef}</small></div><span className="ar-domain">{x.domain}</span><Status value={x.status} /><ChevronRight /></Link>)}</section></>;
}

export function ApprovalTaskDetailPage() {
  const { taskId } = useParams();
  const tasks = useAdministrationStore((s) => s.approvalTasks);
  const decide = useAdministrationStore((s) => s.decideTask);
  const confirm = useAdministrationStore((s) => s.confirmDomain);
  const item = tasks.find((x) => x.id === taskId);
  if (!item) return <Empty>Approval Task không tồn tại.</Empty>;
  const decidable = ["ASSIGNED", "IN_REVIEW", "RETURNED"].includes(item.status);
  return <><PageHeader eyebrow="APPROVAL ORCHESTRATION" title={item.id} intro={item.summary} action={<Status value={item.status} />} /><div className="ar-detail-grid"><section className="admin-panel"><h2>Approval package</h2><Definition items={[["Request type", item.requestType], ["Domain / object", `${item.domain} · ${item.objectRef}`], ["Requester", item.requester], ["Assignee", item.assignee], ["Due time", item.dueAt], ["Correlation ID", item.correlationId]]} /></section><aside className="admin-panel"><h2>Execution boundary</h2><div className="ar-flow"><span>ADMIN APPROVAL</span><ChevronRight /><span>AUTHORIZED COMMAND</span><ChevronRight /><span>{item.domain.toUpperCase()} REVALIDATION</span></div><p className="ar-muted">Approved không đồng nghĩa domain object đã đổi trạng thái. Task chỉ Completed sau khi domain đích xác nhận.</p></aside></div>{decidable && <DecisionBar onReturn={() => decide(item.id, "RETURNED")} onReject={() => decide(item.id, "REJECTED")} onApprove={() => decide(item.id, "APPROVED")} approveLabel="Phê duyệt & gửi command" />}{item.status === "AWAITING_DOMAIN" && <div className="ar-domain-confirm"><Clock3 /><div><strong>Đang chờ domain xác nhận</strong><span>Mô phỏng callback từ {item.domain}; production sẽ nhận qua integration event.</span></div><button className="button secondary" onClick={() => confirm(item.id, false)}>Mô phỏng thất bại</button><button className="button primary" onClick={() => confirm(item.id, true)}>Xác nhận thành công</button></div>}</>;
}

export function WorkflowDefinitionsPage() { return <><PageHeader title="Approval Workflow Definitions" intro="Quy tắc điều phối có version, step, assignee rule, SLA và escalation; không chứa logic cập nhật domain." /><div className="ar-role-grid">{[
  ["WF-CMS-PUBLISH", "Content Publication", "v4 · ACTIVE", "Content Staff → Admin → CMS confirmation"],
  ["WF-FIN-EXCEPTION", "Financial Exception", "v3 · ACTIVE", "Finance Maker → Finance Checker → Admin → Finance confirmation"],
  ["WF-ACCESS", "Back-office Access", "v2 · ACTIVE", "Requester → Admin validation → Access activation"],
].map((x) => <article className="admin-panel" key={x[0]}><div className="ar-card-title"><GitBranch /><div><h2>{x[1]}</h2><small>{x[0]}</small></div></div><Status value={x[2].split(" · ")[1]} /><p>{x[3]}</p><div className="ar-version">{x[2].split(" · ")[0]} · SLA & escalation enabled</div></article>)}</div></> }

export function ConfigurationPage() {
  const configs = useAdministrationStore((s) => s.configurations);
  const submit = useAdministrationStore((s) => s.submitConfiguration);
  const approve = useAdministrationStore((s) => s.approveConfiguration);
  return <><PageHeader title="Platform Configuration" intro="Mỗi thay đổi tạo Configuration Version bất biến; version cũ vẫn authoritative cho tới khi version mới được duyệt và kích hoạt." /><div className="ar-config-list">{configs.map((x) => <article className="admin-panel ar-config" key={x.id}><div className="ar-card-title"><Settings2 /><div><h2>{x.name}</h2><small>{x.id} · {x.category} · {x.scope}</small></div><Status value={x.status} /></div><p>{x.valueSummary}</p><Definition items={[["Version", `v${x.version}`], ["Hiệu lực dự kiến", x.effectiveAt], ["Maker", x.maker], ["Checker", x.checker ?? "Chưa phân công"]]} />{x.status === "DRAFT" && <button className="button primary" onClick={() => submit(x.id)}>Gửi phê duyệt</button>}{x.status === "PENDING_APPROVAL" && <button className="button primary" onClick={() => approve(x.id)}>Phê duyệt & lên lịch</button>}</article>)}</div></>;
}

export function NotificationGovernancePage() { return <GovernanceConfig title="Notification Governance" intro="Quản trị template, kênh, routing, fallback, quiet hours và escalation; không thay đổi quyết định nghiệp vụ." cards={[
  ["Thông báo bảo mật bắt buộc", "SECURITY_MANDATORY", "Email + SMS", "Không cho phép người dùng tắt"],
  ["Customer Service escalation", "CS_ESCALATION", "Email → SMS", "Fallback sau 10 phút; escalation sau 30 phút"],
  ["Approval task due reminder", "GOV_TASK_DUE", "In-app + Email", "Nhắc trước SLA 2 giờ"],
]} /> }
export function SearchGovernancePage() { return <GovernanceConfig title="Search Governance" intro="Search Index chỉ là projection có thể rebuild; kết quả luôn áp dụng role, scope và masking trước khi hiển thị." cards={[
  ["Back-office Global Search", "IDX-BACKOFFICE-V3", "Healthy · 1,8s", "Customer email được mask; hỗ trợ correlation ID"],
  ["CMS Public Search", "IDX-PUBLIC-CONTENT-V5", "Healthy · 4,2s", "Chỉ index nội dung PUBLISHED"],
  ["Rebuild policy", "SEARCH-REBUILD-02", "Scheduled", "Full rebuild 02:00; incremental theo event"],
]} /> }

export function ReportSnapshotsPage() {
  const snapshots = useAdministrationStore((s) => s.snapshots);
  const save = useAdministrationStore((s) => s.saveSnapshot);
  return <><PageHeader title="Report Snapshots" intro="Bản chụp báo cáo bất biến, lưu nguyên filter, kỳ báo cáo, generation time và freshness tại thời điểm tạo." action={<button className="button primary" onClick={save}>Lưu snapshot hiện tại</button>} /><div className="ar-notice"><FileClock /><span>Snapshot không tự cập nhật khi read model thay đổi và không phải source of truth của dữ liệu vận hành.</span></div><section className="admin-panel ar-table-wrap"><table className="ar-table"><thead><tr><th>Snapshot</th><th>Báo cáo / kỳ</th><th>Thời điểm tạo</th><th>Data freshness</th><th>Completeness</th><th>Người tạo</th></tr></thead><tbody>{snapshots.map((x) => <tr key={x.id}><td><strong>{x.id}</strong></td><td><strong>{x.report}</strong><small>{x.period}</small></td><td>{x.createdAt}</td><td>{x.freshness}</td><td><Badge tone={x.completeness === "100%" ? "success" : "warning"}>{x.completeness}</Badge></td><td>{x.actor}</td></tr>)}</tbody></table></section></>;
}

function GovernanceConfig({ title, intro, cards }: { title: string; intro: string; cards: string[][] }) { return <><PageHeader title={title} intro={intro} /><div className="ar-role-grid">{cards.map((x) => <article className="admin-panel" key={x[1]}><div className="ar-card-title"><BellRing /><div><h2>{x[0]}</h2><small>{x[1]}</small></div></div><Badge tone="success">{x[2]}</Badge><p>{x[3]}</p><button className="button secondary">Tạo version thay đổi</button></article>)}</div></>; }
function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) { return <article>{icon}<div><strong>{value}</strong><span>{label}</span></div></article>; }
function Health({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) { return <div className="health-row"><span>{label}</span><Badge tone={warn ? "warning" : "success"}>{value}</Badge></div>; }
function Filter({ query, setQuery, placeholder }: { query: string; setQuery: (x: string) => void; placeholder: string }) { return <div className="filter-bar"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} /></div>; }
function Definition({ items }: { items: string[][] }) { return <dl className="ar-definition">{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>; }
function Check({ label }: { label: string }) { return <div className="ar-check"><CheckCircle2 /><span>{label}</span><strong>PASS</strong></div>; }
function DecisionBar({ onReturn, onReject, onApprove, approveLabel }: { onReturn: () => void; onReject: () => void; onApprove: () => void; approveLabel: string }) { return <section className="ar-decision"><div><ShieldCheck /><span><strong>Quyết định có kiểm soát</strong><small>Hành động sẽ tạo Audit Record và không thể chỉnh sửa lịch sử.</small></span></div><button className="button secondary" onClick={onReturn}>Yêu cầu bổ sung</button><button className="button danger" onClick={onReject}><XCircle />Từ chối</button><button className="button primary" onClick={onApprove}><CheckCircle2 />{approveLabel}</button></section>; }
