import {
  AlertTriangle, BellRing, CheckCircle2, ChevronRight, Clock3,
  FileCheck2, FileClock, GitBranch, KeyRound, LockKeyhole, Search, Settings2,
  ShieldCheck, Users, XCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { buildApprovalQueue } from "../../services/approvalQueueProjection";
import { useAdministrationStore } from "../../store/administrationStore";
import { useCmsStore } from "../../store/cmsStore";
import { useDemoStore } from "../../store/demoStore";
import { useEligibilityWorkflowStore } from "../../store/eligibilityWorkflowStore";
import { useFinanceOverrideStore } from "../../store/financeOverrideStore";
import { useOpeningRequestStore } from "../../store/openingRequestStore";
import { useSupportStore } from "../../store/supportStore";
import { demoStaffNames } from "../../config/staffRoles";

const tone = (status: string): "success" | "warning" | "danger" | "info" | "neutral" => {
  if (["ACTIVE", "APPROVED", "COMPLETED"].includes(status)) return "success";
  if (["REJECTED", "FAILED", "SUSPENDED", "HIGH"].includes(status)) return "danger";
  if (["RETURNED", "PENDING_REVIEW", "PENDING_APPROVAL", "AWAITING_DOMAIN", "SCHEDULED", "MEDIUM"].includes(status)) return "warning";
  if (["ASSIGNED", "IN_REVIEW"].includes(status)) return "info";
  return "neutral";
};

function PageHeader({ eyebrow = "QUẢN TRỊ & BÁO CÁO", title, intro, action }: { eyebrow?: string; title: string; intro: string; action?: ReactNode }) {
  return <header className="admin-heading ar-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div>{action}</header>;
}
function Status({ value }: { value: string }) { return <Badge tone={tone(value)}>{value.replaceAll("_", " ")}</Badge>; }
function Empty({ children }: { children: ReactNode }) { return <div className="ar-empty"><Search /><strong>Không có dữ liệu phù hợp</strong><span>{children}</span></div>; }

function useApprovalQueueProjection() {
  const accessRequests = useAdministrationStore((s) => s.accessRequests);
  const configurations = useAdministrationStore((s) => s.configurations);
  const contents = useCmsStore((s) => s.contents);
  const financeOverrides = useFinanceOverrideStore((s) => s.requests);
  const eligibilityReviews = useEligibilityWorkflowStore((s) => s.reviews);
  const openingRequests = useOpeningRequestStore((s) => s.records);
  const disputes = useSupportStore((s) => s.disputes);
  return buildApprovalQueue({
    accessRequests,
    configurations,
    contents,
    financeOverrides,
    eligibilityReviews,
    openingRequests,
    disputes,
  });
}

export function AdministrationDashboardPage() {
  const workforce = useAdministrationStore((s) => s.workforce);
  const requests = useAdministrationStore((s) => s.accessRequests);
  const tasks = useApprovalQueueProjection();
  const configs = useAdministrationStore((s) => s.configurations);
  const pendingAccess = requests.filter((x) => x.status === "PENDING_REVIEW").length;
  const pendingTasks = tasks.filter((x) =>
    ["PENDING", "RETURNED", "AWAITING_DOMAIN", "FAILED"].includes(x.status),
  );
  return <>
    <PageHeader title="Tổng quan Administration Service" intro="Giám sát quyền truy cập, workflow quản trị, cấu hình có phiên bản và độ mới của read model." action={<span className="workspace-status"><CheckCircle2 /> Read model ổn định</span>} />
    <div className="admin-metrics">
      <Metric icon={<Users />} value={String(workforce.filter((x) => x.status === "ACTIVE").length)} label="Nhân sự đang hoạt động" />
      <Metric icon={<KeyRound />} value={String(pendingAccess)} label="Yêu cầu quyền chờ duyệt" />
      <Metric icon={<FileCheck2 />} value={String(pendingTasks.length)} label="Yêu cầu phê duyệt đang mở" />
      <Metric icon={<Settings2 />} value={String(configs.filter((x) => ["DRAFT", "PENDING_APPROVAL"].includes(x.status)).length)} label="Cấu hình chưa hiệu lực" />
    </div>
    <div className="ar-dashboard-grid">
      <section className="admin-panel"><h2>Hàng đợi cần xử lý</h2>{pendingTasks.slice(0, 5).map((task) => <Link className="ar-work-row" key={`${task.sourceDomain}-${task.id}`} to={task.detailRoute}><span className="ar-icon"><Clock3 /></span><div><strong>{task.title}</strong><small>{task.id} · {task.sourceDomain} · {task.requester}</small></div><Status value={task.status} /><ChevronRight /></Link>)}{!pendingTasks.length && <Empty>Không có yêu cầu nào đang chờ xử lý.</Empty>}{pendingTasks.length > 5 && <Link className="button secondary" to="/admin/approval-tasks">Xem toàn bộ {pendingTasks.length} yêu cầu</Link>}</section>
      <section className="admin-panel"><h2>Tình trạng quản trị</h2><Health label="Dữ liệu nhật ký" value="Ổn định" /><Health label="Điều phối phê duyệt" value="Ổn định" /><Health label="Mức đầy đủ báo cáo" value="98,7%" warn /><Health label="Đồng bộ gần nhất" value="20/07/2026 23:40" /></section>
    </div>
    <div className="ar-boundary"><LockKeyhole /><div><strong>Ranh giới thẩm quyền</strong><p>Service 6 chỉ điều phối và gửi command đã được phê duyệt. Domain đích luôn revalidate và tự cập nhật dữ liệu authoritative.</p></div></div>
  </>;
}

export function WorkforcePage() {
  const workforce = useAdministrationStore((s) => s.workforce);
  const [query, setQuery] = useState("");
  const rows = workforce.filter((x) => `${x.name} ${x.email} ${x.id} ${x.role}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageHeader title="Nhân sự & quyền truy cập" intro="Hồ sơ nhân sự back-office và quyền hiệu lực; không phải hồ sơ Customer/KYC." action={<Link className="button primary" to="/admin/access-requests">Xem yêu cầu quyền</Link>} /><Filter query={query} setQuery={setQuery} placeholder="Tìm theo tên, email, mã hoặc vai trò" /><section className="admin-panel ar-table-wrap"><table className="ar-table"><thead><tr><th>Nhân sự</th><th>Phòng ban</th><th>Vai trò hiệu lực</th><th>Phạm vi</th><th>Trạng thái</th><th>Truy cập gần nhất</th></tr></thead><tbody>{rows.map((x) => <tr key={x.id}><td><strong>{x.name}</strong><small>{x.id} · {x.email}</small></td><td>{x.department}</td><td>{x.role}</td><td>{x.scope}</td><td><Status value={x.status} /></td><td>{x.lastAccess}</td></tr>)}</tbody></table>{!rows.length && <Empty>Hãy thay đổi từ khóa tìm kiếm.</Empty>}</section></>;
}

export function AccessRequestQueuePage() {
  const requests = useAdministrationStore((s) => s.accessRequests);
  const navigate = useNavigate();
  const [status, setStatus] = useState("ALL");
  const rows = requests.filter((x) => status === "ALL" || x.status === status);
  const openRequest = (id: string) =>
    navigate(`/admin/access-requests/${id}`);
  return <><PageHeader title="Yêu cầu cấp quyền" intro="Chọn một yêu cầu để thẩm định phạm vi, xung đột vai trò và nguyên tắc maker–checker." /><div className="filter-bar"><Search /><span className="ar-filter-label">Trạng thái</span><select aria-label="Lọc trạng thái" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">Tất cả</option><option value="PENDING_REVIEW">Chờ duyệt</option><option value="RETURNED">Yêu cầu bổ sung</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Từ chối</option></select></div><section className="admin-panel ar-table-wrap"><table className="ar-table ar-access-table"><thead><tr><th>Yêu cầu</th><th>Đối tượng / quyền</th><th>Người yêu cầu</th><th>Rủi ro</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rows.map((x) => <tr key={x.id} className="ar-clickable-row" tabIndex={0} role="link" aria-label={`Thẩm định yêu cầu ${x.id}`} onClick={() => openRequest(x.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openRequest(x.id); } }}><td><strong>{x.id}</strong><small>{x.submittedAt}</small></td><td><strong>{x.requestedRole}</strong><small>{x.targetId} · {x.scope}</small></td><td>{x.requester}</td><td><Status value={x.risk} /></td><td><Status value={x.status} /></td><td><span className="ar-row-cta">Thẩm định<ChevronRight /></span></td></tr>)}</tbody></table></section><div className="ar-table-hint"><ChevronRight /><span>Bạn có thể nhấp vào bất kỳ vị trí nào trên một hàng để mở hồ sơ thẩm định.</span></div></>;
}

export function AccessRequestDetailPage() {
  const { requestId } = useParams();
  const requests = useAdministrationStore((s) => s.accessRequests);
  const workforce = useAdministrationStore((s) => s.workforce);
  const decide = useAdministrationStore((s) => s.decideAccess);
  const staffEmail = useDemoStore((s) => s.staffEmail);
  const actorName = demoStaffNames[staffEmail] ?? staffEmail;
  const item = requests.find((x) => x.id === requestId);
  const target = workforce.find((x) => x.id === item?.targetId);
  if (!item) return <Empty>Yêu cầu không tồn tại hoặc nằm ngoài scope của bạn.</Empty>;
  const open = item.status === "PENDING_REVIEW";
  return <><PageHeader eyebrow="QUẢN TRỊ QUYỀN TRUY CẬP" title={item.id} intro="Quyết định được ghi audit; quyền hiện tại giữ nguyên nếu kiểm tra hoặc phê duyệt thất bại." action={<Status value={item.status} />} /><div className="ar-detail-grid"><section className="admin-panel"><h2>Nội dung yêu cầu</h2><Definition items={[["Nhân sự", `${target?.name} (${item.targetId})`], ["Quyền hiện tại", `${target?.role} · ${target?.scope}`], ["Quyền yêu cầu", `${item.requestedRole} · ${item.scope}`], ["Người yêu cầu", item.requester], ["Lý do", item.reason], ["Thời điểm", item.submittedAt], ["Người quyết định", item.decidedBy ?? "Chưa có"], ["Căn cứ quyết định", item.decisionReason ?? "Chưa có"]]} /></section><aside className="admin-panel"><h2>Kiểm tra quản trị</h2><Check label="Hồ sơ nhân sự tồn tại" /><Check label="Định nghĩa vai trò hợp lệ" /><Check label="Phạm vi nằm trong thẩm quyền" /><Check label="Không tự phê duyệt yêu cầu của chính mình" /><div className="ar-risk"><AlertTriangle /><span>Rủi ro: <strong>{item.risk}</strong>. Quyền chỉ có hiệu lực sau quyết định phê duyệt.</span></div></aside></div>{open && <DecisionBar onReturn={(reason) => decide(item.id, "RETURNED", actorName, reason)} onReject={(reason) => decide(item.id, "REJECTED", actorName, reason)} onApprove={(reason) => decide(item.id, "APPROVED", actorName, reason)} approveLabel="Phê duyệt & áp dụng quyền" />}</>;
}

const roles = [
  { role: "ADMIN", label: "Quản trị hệ thống", scope: "Quản trị & kiểm soát", permissions: ["Quản lý nhân sự", "Quyết định phê duyệt", "Quản trị cấu hình", "Tra cứu audit", "Xuất báo cáo"] },
  { role: "CUSTOMER_SUPPORT", label: "Chăm sóc khách hàng", scope: "Customer Service", permissions: ["Quản lý ticket", "Điều phối khiếu nại", "Tra cứu Customer có masking", "Đề xuất tri thức"] },
  { role: "CONTENT_STAFF", label: "Nội dung & vận hành", scope: "CMS & vận hành đấu giá", permissions: ["Quản lý nội dung", "Quản lý media", "Vận hành phiên", "Điều phối bàn giao"] },
  { role: "FINANCE", label: "Tài chính", scope: "Quản lý tài chính", permissions: ["Xác minh thanh toán", "Quản lý hoàn tiền", "Đối soát", "Quyết toán"] },
];
export function RolePermissionPage() {
  return <div className="ar-governance-shell"><PageHeader title="Ma trận vai trò và quyền hạn" intro="Theo dõi phạm vi của bốn vai trò back-office theo nguyên tắc quyền tối thiểu." action={<Link className="button primary" to="/admin/access-requests"><KeyRound />Xem yêu cầu quyền đang chờ</Link>} /><section className="ar-role-summary"><div><strong>4</strong><span>Vai trò hiệu lực</span></div><div><strong>17</strong><span>Nhóm quyền nghiệp vụ</span></div><div><strong>Maker–checker</strong><span>Áp dụng cho mọi thay đổi</span></div></section><div className="ar-role-matrix">{roles.map((x) => <article className="admin-panel ar-role-card" key={x.role}><div className="ar-card-title"><span className="ar-governance-icon"><ShieldCheck /></span><div><h2>{x.label}</h2><small>{x.role} · {x.scope}</small></div></div><div className="ar-permission-list">{x.permissions.map((permission) => <span key={permission}><CheckCircle2 />{permission}</span>)}</div><Link className="button primary ar-role-cta" to="/admin/access-requests"><KeyRound />Mở hàng đợi yêu cầu quyền<ChevronRight /></Link></article>)}</div><div className="ar-boundary"><LockKeyhole /><div><strong>Nguyên tắc cấp quyền</strong><p>Admin không chỉnh quyền trực tiếp trên ma trận. Mọi thay đổi phải bắt đầu từ một yêu cầu, được thẩm định và lưu căn cứ quyết định.</p></div></div></div>;
}

export function ApprovalTaskQueuePage() {
  const tasks = useApprovalQueueProjection();
  const [status, setStatus] = useState("OPEN");
  const rows = tasks.filter(
    (x) =>
      status === "ALL" ||
      (status === "OPEN"
        ? ["PENDING", "RETURNED", "AWAITING_DOMAIN", "FAILED"].includes(x.status)
        : x.status === status),
  );
  return <><PageHeader title="Trung tâm phê duyệt" intro="Hàng đợi tổng hợp từ dữ liệu gốc của từng nghiệp vụ; mỗi quyết định được thực hiện tại workspace quản trị tương ứng." /><div className="filter-bar"><Search /><select aria-label="Lọc task" value={status} onChange={(e) => setStatus(e.target.value)}><option value="OPEN">Cần xử lý</option><option value="PENDING">Chờ thẩm định</option><option value="RETURNED">Chờ bổ sung</option><option value="AWAITING_DOMAIN">Chờ nghiệp vụ xác nhận</option><option value="APPROVED">Đã phê duyệt</option><option value="REJECTED">Đã từ chối</option><option value="COMPLETED">Hoàn tất</option><option value="FAILED">Thất bại</option><option value="ALL">Tất cả</option></select></div><section className="admin-panel">{rows.map((x) => <Link className="ar-work-row" key={`${x.sourceDomain}-${x.id}`} to={x.detailRoute}><span className="ar-icon"><GitBranch /></span><div><strong>{x.title}</strong><small>{x.id} · {x.summary}</small></div><span className="ar-domain">{x.sourceDomain}</span><Status value={x.status} /><ChevronRight /></Link>)}{!rows.length && <Empty>Không có yêu cầu phù hợp với bộ lọc.</Empty>}</section><div className="ar-boundary"><ShieldCheck /><div><strong>Một nguồn dữ liệu cho mỗi nghiệp vụ</strong><p>Trung tâm này chỉ tổng hợp và điều hướng. Content, Finance, CSKH, Auction và Access vẫn duy trì lifecycle tại store nghiệp vụ của chính mình.</p></div></div></>;
}

export function ApprovalTaskDetailPage() {
  const { taskId } = useParams();
  const tasks = useAdministrationStore((s) => s.approvalTasks);
  const decide = useAdministrationStore((s) => s.decideTask);
  const confirm = useAdministrationStore((s) => s.confirmDomain);
  const staffEmail = useDemoStore((s) => s.staffEmail);
  const actorName = demoStaffNames[staffEmail] ?? staffEmail;
  const sourceRoute: Record<string, string> = {
    "AT-7102": "/governance/content-approvals/CMS-002",
    "AT-7098": "/governance/finance-overrides/FOV-2026-001",
    "AT-7089": "/governance/auction-configurations",
  };
  if (taskId && sourceRoute[taskId])
    return <Navigate to={sourceRoute[taskId]} replace />;
  const item = tasks.find((x) => x.id === taskId);
  if (!item) return <Empty>Approval Task không tồn tại.</Empty>;
  const decidable = ["ASSIGNED", "IN_REVIEW", "RETURNED"].includes(item.status);
  return <><PageHeader eyebrow="ĐIỀU PHỐI PHÊ DUYỆT" title={item.id} intro={item.summary} action={<Status value={item.status} />} /><div className="ar-detail-grid"><section className="admin-panel"><h2>Hồ sơ phê duyệt</h2><Definition items={[["Loại yêu cầu", item.requestType], ["Nghiệp vụ / đối tượng", `${item.domain} · ${item.objectRef}`], ["Người yêu cầu", item.requester], ["Người xử lý", item.assignee], ["Thời hạn", item.dueAt], ["Mã tương quan", item.correlationId], ["Người quyết định", item.decidedBy ?? "Chưa có"], ["Căn cứ quyết định", item.decisionReason ?? "Chưa có"]]} /></section><aside className="admin-panel"><h2>Ranh giới thực thi</h2><div className="ar-flow"><span>ADMIN PHÊ DUYỆT</span><ChevronRight /><span>GỬI LỆNH ĐƯỢC PHÉP</span><ChevronRight /><span>{item.domain.toUpperCase()} KIỂM TRA LẠI</span></div><p className="ar-muted">Được phê duyệt không đồng nghĩa đối tượng nghiệp vụ đã đổi trạng thái. Tác vụ chỉ hoàn tất sau khi nghiệp vụ đích xác nhận.</p></aside></div>{decidable && <DecisionBar onReturn={(reason) => decide(item.id, "RETURNED", actorName, reason)} onReject={(reason) => decide(item.id, "REJECTED", actorName, reason)} onApprove={(reason) => decide(item.id, "APPROVED", actorName, reason)} approveLabel="Phê duyệt & gửi lệnh" />}{item.status === "AWAITING_DOMAIN" && <div className="ar-domain-confirm"><Clock3 /><div><strong>Đang chờ nghiệp vụ đích xác nhận</strong><span>Mô phỏng phản hồi từ {item.domain}; hệ thống thật sẽ nhận qua sự kiện tích hợp.</span></div><button className="button secondary" onClick={() => confirm(item.id, false)}>Mô phỏng thất bại</button><button className="button primary" onClick={() => confirm(item.id, true)}>Xác nhận thành công</button></div>}</>;
}

export function WorkflowDefinitionsPage() {
  const workflows = [
    {
      id: "WF-CMS-PUBLISH",
      name: "Xuất bản nội dung",
      version: "v4",
      steps: ["Content Staff", "Admin", "CMS xác nhận"],
      sla: "4 giờ",
    },
    {
      id: "WF-FIN-EXCEPTION",
      name: "Ngoại lệ tài chính",
      version: "v3",
      steps: ["Finance Maker", "Finance Checker", "Admin", "Finance xác nhận"],
      sla: "2 giờ",
    },
    {
      id: "WF-ACCESS",
      name: "Cấp quyền back-office",
      version: "v2",
      steps: ["Người yêu cầu", "Admin thẩm định", "Kích hoạt quyền"],
      sla: "8 giờ",
    },
  ];
  return (
    <div className="ar-governance-shell">
      <PageHeader
        title="Định nghĩa quy trình phê duyệt"
        intro="Quản lý phiên bản, các bước xử lý, người chịu trách nhiệm, SLA và cơ chế escalation."
      />
      <section className="ar-governance-summary">
        <article><strong>3</strong><span>Quy trình đang hoạt động</span></article>
        <article><strong>10</strong><span>Bước kiểm soát</span></article>
        <article><strong>100%</strong><span>Có SLA và escalation</span></article>
      </section>
      <div className="ar-governance-grid">
        {workflows.map((workflow) => (
          <article className="admin-panel ar-governance-card" key={workflow.id}>
            <div className="ar-card-title">
              <span className="ar-governance-icon"><GitBranch /></span>
              <div>
                <h2>{workflow.name}</h2>
                <small>{workflow.id}</small>
              </div>
              <Status value="ACTIVE" />
            </div>
            <div className="ar-workflow-steps">
              {workflow.steps.map((step, index) => (
                <span key={step}>
                  <b>{index + 1}</b>
                  {step}
                </span>
              ))}
            </div>
            <footer>
              <span>{workflow.version}</span>
              <span>SLA {workflow.sla}</span>
              <span>Escalation đang bật</span>
            </footer>
            <Link
              className="button secondary"
              to={`/admin/configurations?source=${workflow.id}`}
            >
              Tạo phiên bản thay đổi
            </Link>
          </article>
        ))}
      </div>
      <div className="ar-boundary">
        <ShieldCheck />
        <div>
          <strong>Ranh giới quy trình</strong>
          <p>
            Workflow chỉ điều phối phê duyệt; nghiệp vụ đích luôn kiểm tra lại
            trước khi cập nhật dữ liệu có hiệu lực.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ConfigurationPage() {
  const configs = useAdministrationStore((s) => s.configurations);
  const submit = useAdministrationStore((s) => s.submitConfiguration);
  const setEffectiveAt = useAdministrationStore(
    (s) => s.setConfigurationEffectiveAt,
  );
  const approve = useAdministrationStore((s) => s.approveConfiguration);
  const returnConfig = useAdministrationStore((s) => s.returnConfiguration);
  const rejectConfig = useAdministrationStore((s) => s.rejectConfiguration);
  const reviseConfig = useAdministrationStore((s) => s.reviseConfiguration);
  const activateConfig = useAdministrationStore((s) => s.activateConfiguration);
  const deactivateConfig = useAdministrationStore((s) => s.deactivateConfiguration);
  const staffEmail = useDemoStore((s) => s.staffEmail);
  const adminLogin = useDemoStore((s) => s.adminLogin);
  const actorName = demoStaffNames[staffEmail] ?? staffEmail;
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<Record<string, string>>({});
  return <><PageHeader title="Cấu hình nền tảng" intro="Mỗi thay đổi tạo một phiên bản bất biến; phiên bản cũ vẫn có hiệu lực cho tới khi phiên bản mới được một checker khác phê duyệt và kích hoạt." /><div className="ar-config-list">{configs.map((x) => {
    const selfApproval = x.status === "PENDING_APPROVAL" && x.makerEmail === staffEmail;
    const runSubmit = () => {
      if (x.effectiveAt === "Chưa thiết lập" || !reasons[x.id]?.trim()) {
        setValidation((current) => ({ ...current, [x.id]: "Vui lòng nhập thời điểm hiệu lực và lý do thay đổi." }));
        return;
      }
      submit(x.id, staffEmail, actorName, reasons[x.id]);
      setValidation((current) => ({ ...current, [x.id]: "" }));
    };
    const runApprove = () => {
      if (!reasons[x.id]?.trim()) {
        setValidation((current) => ({ ...current, [x.id]: "Vui lòng nhập căn cứ phê duyệt." }));
        return;
      }
      approve(x.id, staffEmail, actorName, reasons[x.id]);
      setValidation((current) => ({ ...current, [x.id]: "" }));
    };
    const requireReason = (message: string, action: (reason: string) => void) => {
      const reason = reasons[x.id]?.trim();
      if (!reason) {
        setValidation((current) => ({ ...current, [x.id]: message }));
        return;
      }
      action(reason);
      setValidation((current) => ({ ...current, [x.id]: "" }));
    };
    return <article className="admin-panel ar-config" key={x.id}><div className="ar-card-title"><Settings2 /><div><h2>{x.name}</h2><small>{x.id} · {x.category} · {x.scope}</small></div><Status value={x.status} /></div><p>{x.valueSummary}</p><Definition items={[["Phiên bản", `v${x.version}`], ["Hiệu lực dự kiến", x.effectiveAt], ["Người tạo", `${x.maker} · ${x.makerEmail}`], ["Người duyệt", x.checker ? `${x.checker} · ${x.checkerEmail}` : "Chưa phân công"], ["Lý do trình", x.submissionReason ?? "Chưa ghi nhận"], ["Căn cứ duyệt", x.decisionReason ?? "Chưa có"]]} />{x.status === "DRAFT" && <label className="ar-config-reason">Thời điểm hiệu lực<input type="datetime-local" onChange={(event) => { setEffectiveAt(x.id, event.target.value); setValidation((current) => ({ ...current, [x.id]: "" })); }} /></label>}{["DRAFT", "PENDING_APPROVAL", "SCHEDULED", "ACTIVE"].includes(x.status) && <label className="ar-config-reason">{x.status === "DRAFT" ? "Lý do thay đổi" : x.status === "PENDING_APPROVAL" ? "Căn cứ thẩm định" : x.status === "SCHEDULED" ? "Kết quả kiểm tra trước kích hoạt" : "Lý do ngừng hiệu lực"}<input value={reasons[x.id] ?? ""} onChange={(event) => { setReasons((current) => ({ ...current, [x.id]: event.target.value })); setValidation((current) => ({ ...current, [x.id]: "" })); }} placeholder="Nhập căn cứ hoặc kết quả thẩm định" /></label>}{validation[x.id] && <p className="ar-inline-error" role="alert">{validation[x.id]}</p>}<div className="ar-config-actions">{x.status === "DRAFT" && <button className="button primary" onClick={runSubmit}>Gửi phê duyệt</button>}{x.status === "PENDING_APPROVAL" && !selfApproval && <><button className="button secondary" onClick={() => requireReason("Vui lòng nhập nội dung cần chỉnh sửa.", (reason) => returnConfig(x.id, staffEmail, actorName, reason))}>Yêu cầu chỉnh sửa</button><button className="button danger" onClick={() => requireReason("Vui lòng nhập lý do từ chối.", (reason) => rejectConfig(x.id, staffEmail, actorName, reason))}>Từ chối</button><button className="button primary" onClick={runApprove}>Phê duyệt & lên lịch</button></>}{x.status === "RETURNED" && x.makerEmail === staffEmail && <button className="button primary" onClick={() => reviseConfig(x.id, staffEmail)}>Tạo bản chỉnh sửa</button>}{x.status === "SCHEDULED" && x.checkerEmail === staffEmail && <button className="button primary" onClick={() => requireReason("Vui lòng nhập kết quả kiểm tra kích hoạt.", (reason) => activateConfig(x.id, staffEmail, reason))}>Xác nhận kích hoạt</button>}{x.status === "ACTIVE" && x.checkerEmail === staffEmail && <button className="button danger" onClick={() => requireReason("Vui lòng nhập lý do ngừng hiệu lực.", (reason) => deactivateConfig(x.id, staffEmail, reason))}>Ngừng hiệu lực</button>}</div>{selfApproval && <div className="ar-checker-action"><button className="button secondary" onClick={() => adminLogin("ADMIN", "admin.checker@sgdg.demo")}>Chuyển sang Admin checker</button><small className="ar-muted">Bạn là người trình cấu hình này; cần checker khác thực hiện phê duyệt.</small></div>}</article>;
  })}</div></>;
}

export function NotificationGovernancePage() { return <GovernanceConfig title="Quản trị thông báo" intro="Quản lý mẫu thông báo, kênh gửi, fallback, khung giờ yên lặng và escalation." kind="notification" cards={[
  ["Thông báo bảo mật bắt buộc", "SECURITY_MANDATORY", "Email + SMS", "Không cho phép người dùng tắt", "Bắt buộc"],
  ["Escalation hỗ trợ khách hàng", "CS_ESCALATION", "Email → SMS", "Fallback sau 10 phút; escalation sau 30 phút", "Theo SLA"],
  ["Nhắc hạn tác vụ phê duyệt", "GOV_TASK_DUE", "In-app + Email", "Nhắc trước SLA 2 giờ", "Tự động"],
]} /> }
export function SearchGovernancePage() { return <GovernanceConfig title="Quản trị tìm kiếm" intro="Quản lý search index, độ mới dữ liệu, masking và chính sách rebuild theo phạm vi truy cập." kind="search" cards={[
  ["Tìm kiếm toàn cục back-office", "IDX-BACKOFFICE-V3", "Ổn định · 1,8 giây", "Email Customer được mask; hỗ trợ mã tương quan", "Nội bộ"],
  ["Tìm kiếm nội dung công khai", "IDX-PUBLIC-CONTENT-V5", "Ổn định · 4,2 giây", "Chỉ lập chỉ mục nội dung đã xuất bản", "Công khai"],
  ["Chính sách dựng lại chỉ mục", "SEARCH-REBUILD-02", "Đã lên lịch", "Dựng lại toàn bộ lúc 02:00; cập nhật tăng dần theo sự kiện", "Hệ thống"],
]} /> }

export function ReportSnapshotsPage() {
  const snapshots = useAdministrationStore((s) => s.snapshots);
  return <><PageHeader title="Bản chụp báo cáo" intro="Bản chụp bất biến lưu bộ lọc, kỳ báo cáo, giá trị tổng hợp và độ mới dữ liệu tại thời điểm tạo." action={<Link className="button secondary" to="/admin/reports">Mở báo cáo để tạo snapshot</Link>} /><div className="ar-notice"><FileClock /><span>Snapshot không tự cập nhật khi read model thay đổi và không phải source of truth của dữ liệu vận hành.</span></div><section className="admin-panel ar-table-wrap"><table className="ar-table"><thead><tr><th>Snapshot</th><th>Báo cáo / kỳ</th><th>Bộ lọc</th><th>Thời điểm tạo</th><th>Data freshness</th><th>Completeness</th><th>Người tạo</th></tr></thead><tbody>{snapshots.map((x) => <tr key={x.id}><td><strong>{x.id}</strong></td><td><strong>{x.report}</strong><small>{x.period}</small></td><td>{x.filters ?? "Bộ lọc mặc định"}<small>{x.values ?? "Giá trị tổng hợp đã lưu"}</small></td><td>{x.createdAt}</td><td>{x.freshness}</td><td><Badge tone={x.completeness === "100%" ? "success" : "warning"}>{x.completeness}</Badge></td><td>{x.actor}</td></tr>)}</tbody></table></section></>;
}

function GovernanceConfig({ title, intro, cards, kind }: { title: string; intro: string; cards: string[][]; kind: "notification" | "search" }) {
  const Icon = kind === "notification" ? BellRing : Search;
  return <div className="ar-governance-shell"><PageHeader title={title} intro={intro} /><section className="ar-governance-summary"><article><strong>3</strong><span>{kind === "notification" ? "Chính sách đang hoạt động" : "Chỉ mục được quản trị"}</span></article><article><strong>100%</strong><span>Áp dụng kiểm soát truy cập</span></article><article><strong>{kind === "notification" ? "2 giờ" : "4,2 giây"}</strong><span>{kind === "notification" ? "SLA nhắc sớm nhất" : "Độ trễ cao nhất"}</span></article></section><div className="ar-governance-grid">{cards.map((x) => <article className="admin-panel ar-governance-card" key={x[1]}><div className="ar-card-title"><span className="ar-governance-icon"><Icon /></span><div><h2>{x[0]}</h2><small>{x[1]}</small></div><Badge tone="success">{x[4]}</Badge></div><div className="ar-governance-status"><strong>{x[2]}</strong><span>Trạng thái hiện tại</span></div><p>{x[3]}</p><footer><Link className="button secondary" to={`/admin/configurations?source=${x[1]}`}>Tạo phiên bản thay đổi</Link></footer></article>)}</div><div className="ar-boundary"><ShieldCheck /><div><strong>Kiểm soát thay đổi</strong><p>Mọi phiên bản mới phải ghi lý do, xác định thời điểm hiệu lực và được một Admin checker khác phê duyệt.</p></div></div></div>;
}
function Metric({ icon, value, label }: { icon: ReactNode; value: string; label: string }) { return <article>{icon}<div><strong>{value}</strong><span>{label}</span></div></article>; }
function Health({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) { return <div className="health-row"><span>{label}</span><Badge tone={warn ? "warning" : "success"}>{value}</Badge></div>; }
function Filter({ query, setQuery, placeholder }: { query: string; setQuery: (x: string) => void; placeholder: string }) { return <div className="filter-bar"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} /></div>; }
function Definition({ items }: { items: string[][] }) { return <dl className="ar-definition">{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>; }
function Check({ label }: { label: string }) { return <div className="ar-check"><CheckCircle2 /><span>{label}</span><strong>PASS</strong></div>; }
function DecisionBar({ onReturn, onReject, onApprove, approveLabel }: { onReturn: (reason: string) => void; onReject: (reason: string) => void; onApprove: (reason: string) => void; approveLabel: string }) {
  const [reason, setReason] = useState("");
  const ready = Boolean(reason.trim());
  const run = (action: (reason: string) => void) => {
    if (!ready) return;
    action(reason.trim());
  };
  return <section className="ar-decision"><div><ShieldCheck /><span><strong>Quyết định có kiểm soát</strong><small>Lý do là bắt buộc và hành động sẽ được ghi vào nhật ký audit.</small></span></div><label className="ar-decision-reason">Lý do quyết định<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập căn cứ hoặc kết quả thẩm định" /></label><button className="button secondary" disabled={!ready} onClick={() => run(onReturn)}>Yêu cầu bổ sung</button><button className="button danger" disabled={!ready} onClick={() => run(onReject)}><XCircle />Từ chối</button><button className="button primary" disabled={!ready} onClick={() => run(onApprove)}><CheckCircle2 />{approveLabel}</button></section>;
}
