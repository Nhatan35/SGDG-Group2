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
  BellRing,
  SearchCheck,
  Camera,
} from "lucide-react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
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
    ["/admin/users", "Người dùng & eKYC", Users],
    ["/admin/auctions", "Quản lý phiên đấu giá", Gavel],
    ["/admin/workforce", "Workforce & Access", Users],
    ["/admin/access-requests", "Yêu cầu cấp quyền", KeyRound],
    ["/admin/roles", "Role & Permission", ShieldCheck],
    ["/admin/approval-tasks", "Approval Task Center", ClipboardCheck],
    ["/admin/workflows", "Workflow Definitions", GitBranch],
    ["/admin/configurations", "Platform Configuration", Settings],
    ["/admin/notifications", "Notification Governance", BellRing],
    ["/admin/search-governance", "Search Governance", SearchCheck],
    ["/governance/opening-requests", "Opening Request Governance", ClipboardCheck],
    [
      "/governance/auction-configurations",
      "Configuration Governance",
      Settings,
    ],
    [
      "/governance/auction-approval-packages",
      "Submitted Auction Packages",
      Gavel,
    ],
    ["/governance/approvals", "Fixture Auction Governance", Gavel],
    ["/governance/eligibility-reviews", "Eligibility Reviews", ShieldCheck],
    ["/governance/handover-cases", "Tra cứu bàn giao", ReceiptText],
    ["/governance/finance-overrides", "Finance Overrides", CreditCard],
    ["/governance/content-approvals", "Content Governance", FileText],
    ["/admin/audit", "Audit & Monitoring", FileClock],
    ["/admin/reports", "Báo cáo quản trị", BarChart3],
    ["/admin/report-snapshots", "Report Snapshots", Camera],
  ],
  CUSTOMER_SUPPORT: [
    ["/support", "Tổng quan hỗ trợ", Headphones],
    ["/support/conversations", "Hội thoại & Handoff", Radio],
    ["/support/tickets", "Ticket hỗ trợ", MessageSquareWarning],
    ["/support/complaints", "Khiếu nại", MessageSquareWarning],
    ["/support/disputes", "Dispute Case", ShieldCheck],
    ["/support/customers", "Tra cứu khách hàng", Users],
    ["/support/knowledge-gaps", "Khoảng trống tri thức", ClipboardCheck],
  ],
  CONTENT_STAFF: [
    ["/cms", "CMS Dashboard", LayoutDashboard],
    ["/cms/contents", "Content Management", FileText],
    ["/cms/media", "Media Library", Image],
    ["/cms/categories", "Category Management", FolderTree],
    ["/cms/policies", "Policy", ShieldCheck],
    ["/cms/faqs", "FAQ", ClipboardCheck],
    ["/cms/knowledge-base", "Knowledge Base", BookOpen],
    ["/cms/knowledge-proposals", "Knowledge Proposals", MessageSquareWarning],
    ["/cms/livestreams", "Livestream", Radio],
    ["/cms/replays", "Replay Management", PlayCircle],
    ["/ops", "Tổng quan vận hành", LayoutDashboard],
    ["/admin/assets", "Tài sản đấu giá", Boxes],
    ["/ops/opening-requests", "Yêu cầu mở phiên", ClipboardCheck],
    ["/ops/auctions", "Phiên đấu giá", Gavel],
    ["/ops/live/patek-nautilus", "Live Operations", Radio],
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
    ["/finance/investigations", "Financial Investigation", FileClock],
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

export function AdminLayout() {
  const role = useDemoStore((s) => s.actorRole) as StaffRole;
  const adminLogout = useDemoStore((s) => s.adminLogout);
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
            <NavLink
              key={to}
              to={to}
              end={["/admin", "/support", "/ops", "/finance", "/cms"].includes(
                to,
              )}
            >
              <Icon />
              {label}
            </NavLink>
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
          </div>
        </header>
        <main className="admin-content">
          <Outlet context={{ role }} />
        </main>
      </div>
    </div>
  );
}
