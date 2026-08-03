import {
  BarChart3,
  BookOpen,
  Boxes,
  CreditCard,
  ClipboardCheck,
  FileClock,
  FileText,
  Image,
  FolderTree,
  Gavel,
  Headphones,
  LayoutDashboard,
  LogOut,
  MessageSquareWarning,
  Radio,
  PlayCircle,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  GitBranch,
  KeyRound,
  LockKeyhole,
  BellRing,
  SearchCheck,
  Camera,
} from "lucide-react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { Fragment } from "react";
import {
  canVisitStaffPath,
  staffRoleMeta,
  type StaffRole,
} from "../../config/staffRoles";
import { useDemoStore } from "../../store/demoStore";

export type AdminRole = StaffRole;
const navigation = {
  ADMIN: [
    ["/admin", "Tổng quan quản trị", LayoutDashboard],
    ["/admin/users", "Customer & ngoại lệ eKYC", Users],
    ["/admin/workforce", "Nhân sự & quyền truy cập", Users],
    ["/admin/access-requests", "Yêu cầu cấp quyền", KeyRound],
    ["/admin/roles", "Vai trò & quyền hạn", ShieldCheck],
    ["/admin/approval-tasks", "Trung tâm phê duyệt", ClipboardCheck],
    ["/admin/workflows", "Định nghĩa quy trình", GitBranch],
    ["/admin/configurations", "Cấu hình nền tảng", Settings],
    ["/admin/notifications", "Quản trị thông báo", BellRing],
    ["/admin/search-governance", "Quản trị tìm kiếm", SearchCheck],
    ["/governance/opening-requests", "Ngoại lệ yêu cầu mở phiên", ClipboardCheck],
    [
      "/governance/auction-configurations",
      "Phê duyệt cấu hình phiên",
      Settings,
    ],
    [
      "/governance/auction-approval-packages",
      "Phê duyệt hồ sơ đấu giá",
      Gavel,
    ],
    ["/governance/eligibility-reviews", "Rà soát điều kiện tham gia", ShieldCheck],
    ["/governance/handover-cases", "Tra cứu bàn giao", ReceiptText],
    ["/governance/finance-overrides", "Ngoại lệ tài chính", CreditCard],
    ["/governance/content-approvals", "Phê duyệt nội dung", FileText],
    ["/governance/retention-holds", "Phê duyệt bảo toàn dữ liệu", LockKeyhole],
    ["/admin/audit", "Nhật ký & giám sát", FileClock],
    ["/admin/reports", "Báo cáo quản trị", BarChart3],
    ["/admin/report-snapshots", "Bản chụp báo cáo", Camera],
  ],
  CUSTOMER_SUPPORT: [
    ["/support", "Tổng quan hỗ trợ", Headphones],
    ["/support/conversations", "Hội thoại và bàn giao", Radio],
    ["/support/tickets", "Phiếu hỗ trợ", MessageSquareWarning],
    ["/support/complaints", "Khiếu nại", MessageSquareWarning],
    ["/support/disputes", "Hồ sơ tranh chấp", ShieldCheck],
    ["/support/customers", "Tra cứu khách hàng", Users],
    ["/support/knowledge-gaps", "Khoảng trống tri thức", ClipboardCheck],
  ],
  CONTENT_STAFF: [
    ["/cms", "Tổng quan nội dung", LayoutDashboard],
    ["/cms/contents", "Quản lý nội dung", FileText],
    ["/cms/media", "Thư viện đa phương tiện", Image],
    ["/cms/categories", "Quản lý danh mục", FolderTree],
    ["/cms/policies", "Chính sách", ShieldCheck],
    ["/cms/faqs", "FAQ", ClipboardCheck],
    ["/cms/knowledge-base", "Kho tri thức", BookOpen],
    ["/cms/knowledge-proposals", "Đề xuất tri thức", MessageSquareWarning],
    ["/cms/livestreams", "Livestream", Radio],
    ["/cms/replays", "Quản lý phát lại", PlayCircle],
    ["/ops", "Tổng quan vận hành", LayoutDashboard],
    ["/ops/assets", "Tài sản đấu giá", Boxes],
    ["/ops/opening-requests", "Yêu cầu mở phiên", ClipboardCheck],
    ["/ops/auctions", "Phiên đấu giá", Gavel],
    ["/ops/live/patek-nautilus", "Vận hành trực tiếp", Radio],
    ["/ops/handover/HO-5711R-2026", "Bàn giao", ReceiptText],
    [
      "/ops/finance-packages/FIN-PKG-PATEK-5711R-V1",
      "Gói kết quả tài chính",
      CreditCard,
    ],
  ],
  FINANCE: [
    ["/finance", "Tổng quan tài chính", LayoutDashboard],
    ["/admin/payments", "Xác minh thanh toán", CreditCard],
    ["/finance/investigations", "Điều tra giao dịch", FileClock],
    ["/finance/refunds", "Hoàn tiền", ReceiptText],
    ["/finance/reconciliation", "Đối soát", ClipboardCheck],
    ["/finance/settlements", "Quyết toán & chi trả", Boxes],
    ["/finance/reports", "Báo cáo & Phân tích", BarChart3],
    ["/finance/override-requests/new", "Yêu cầu ngoại lệ", ShieldCheck],
  ],
} satisfies Record<
  StaffRole,
  ReadonlyArray<readonly [string, string, typeof LayoutDashboard]>
>;

const adminNavigationSections: Record<string, string> = {
  "/admin": "Tổng quan",
  "/admin/users": "Danh tính & quyền truy cập",
  "/admin/approval-tasks": "Điều phối nền tảng",
  "/governance/opening-requests": "Quản trị phiên đấu giá",
  "/governance/eligibility-reviews": "Điều kiện & khách hàng",
  "/governance/handover-cases": "Tài chính & bàn giao",
  "/admin/audit": "Nhật ký & báo cáo",
};

export function AdminLayout() {
  const role = useDemoStore((s) => s.actorRole) as StaffRole;
  const adminLogout = useDemoStore((s) => s.adminLogout);
  const staffEmail = useDemoStore((s) => s.staffEmail);
  const location = useLocation();
  const meta = staffRoleMeta[role];
  if (!canVisitStaffPath(role, location.pathname))
    return <Navigate to={meta.workspace} replace />;
  return (
    <div className="admin-frame">
      <aside className="admin-sidebar">
        <div className="admin-brand-zone">
          <img src="/assets/logo-transparent.png" alt="SGDG" />
          <div>
            <span>SGDG BACK-OFFICE</span>
            <strong>{meta.label}</strong>
          </div>
        </div>
        <nav>
          {navigation[role].map(([to, label, Icon]) => (
            <Fragment key={to}>
              {role === "ADMIN" && adminNavigationSections[to] && (
                <span className="admin-nav-section">{adminNavigationSections[to]}</span>
              )}
              <NavLink
                to={to}
                end={["/admin", "/support", "/ops", "/finance", "/cms"].includes(to)}
              >
                <Icon />
                {label}
              </NavLink>
            </Fragment>
          ))}
        </nav>
        <NavLink to="/" onClick={adminLogout}>
          <LogOut />
          Đăng xuất & về trang công khai
        </NavLink>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <strong>{meta.eyebrow}</strong>
            <small>{meta.description}</small>
          </div>
          <div className="staff-identity">
            <span>Đã đăng nhập với vai trò</span>
            <strong>{meta.label}</strong>
            <small>{staffEmail}</small>
          </div>
        </header>
        <main className="admin-content">
          <Outlet context={{ role }} />
        </main>
      </div>
    </div>
  );
}
