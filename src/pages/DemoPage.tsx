import { ExternalLink, KeyRound, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useDemoStore } from "../store/demoStore";

type DemoLink = { label: string; description: string; to: string; access?: "customer" | "admin" | "content" };
type DemoGroup = { title: string; description: string; links: DemoLink[] };

const groups: DemoGroup[] = [
  {
    title: "Trang công khai & xác thực",
    description: "Các trang không yêu cầu đăng nhập.",
    links: [
      { label: "Trang chủ", description: "Điểm vào chính của SGDG.", to: "/" },
      { label: "Danh sách đấu giá", description: "Catalog các phiên đang có.", to: "/auctions" },
      { label: "Phiên sắp diễn ra", description: "Danh sách upcoming auctions.", to: "/auctions/upcoming" },
      { label: "Chi tiết phiên Patek", description: "Fixture patek-nautilus.", to: "/auctions/patek-nautilus" },
      { label: "Người tham gia", description: "Danh sách participant của phiên Patek.", to: "/auctions/patek-nautilus/participants" },
      { label: "Tin tức", description: "Trang news công khai.", to: "/news" },
      { label: "Hỗ trợ", description: "FAQ và hướng dẫn.", to: "/help" },
      { label: "Đăng nhập", description: "Đăng nhập tài khoản khách hàng.", to: "/auth/login" },
      { label: "Đăng ký", description: "Tạo tài khoản khách hàng.", to: "/auth/register" },
      { label: "Khôi phục mật khẩu", description: "Recovery và OTP mock.", to: "/auth/recovery" },
      { label: "Đăng nhập quản trị", description: "Màn hình admin login.", to: "/admin/login" },
    ],
  },
  {
    title: "Hành trình khách hàng",
    description: "Bật “Khách hàng” trước khi mở những liên kết có biểu tượng khóa.",
    links: [
      { label: "Đăng ký tham gia", description: "Registration wizard cho Patek.", to: "/auctions/patek-nautilus/register", access: "customer" },
      { label: "Trạng thái đủ điều kiện", description: "Eligibility của Patek.", to: "/auctions/patek-nautilus/eligibility", access: "customer" },
      { label: "Phòng chờ", description: "Pre-live waiting room.", to: "/auctions/patek-nautilus/waiting-room", access: "customer" },
      { label: "Phòng đấu giá trực tiếp", description: "Live auction room.", to: "/auctions/patek-nautilus/live", access: "customer" },
      { label: "Kết quả đấu giá", description: "Kết quả + candidate flow.", to: "/me/auctions/patek-nautilus/result?scenario=rank-1-invited", access: "customer" },
      { label: "Phản hồi ứng viên", description: "Candidate response fixture.", to: "/me/auctions/patek-nautilus/candidate?scenario=invited", access: "customer" },
      { label: "Final winner", description: "Xác nhận người thắng cuối cùng.", to: "/me/auctions/patek-nautilus/winner?scenario=final-winner-confirmed", access: "customer" },
      { label: "Thanh toán", description: "Payment reference mock.", to: "/me/auctions/patek-nautilus/payment?scenario=confirmed", access: "customer" },
      { label: "Tổng quan bàn giao", description: "Case HO-5711R-2026.", to: "/me/handover/HO-5711R-2026?scenario=schedule-proposed", access: "customer" },
      { label: "Lịch bàn giao", description: "Schedule detail.", to: "/me/handover/HO-5711R-2026/schedule", access: "customer" },
      { label: "Theo dõi giao nhận", description: "Delivery tracking.", to: "/me/handover/HO-5711R-2026/delivery", access: "customer" },
      { label: "Bằng chứng bàn giao", description: "Handover evidence.", to: "/me/handover/HO-5711R-2026/evidence", access: "customer" },
      { label: "Xác nhận biên nhận", description: "Receipt confirmation.", to: "/me/handover/HO-5711R-2026/receipt", access: "customer" },
      { label: "Hoàn tất bàn giao", description: "Completion status.", to: "/me/handover/HO-5711R-2026/completion", access: "customer" },
      { label: "Dashboard tài khoản", description: "Customer dashboard.", to: "/account/dashboard", access: "customer" },
      { label: "Hồ sơ", description: "Profile khách hàng.", to: "/account/profile", access: "customer" },
      { label: "KYC", description: "KYC status và documents.", to: "/account/kyc", access: "customer" },
      { label: "Danh sách theo dõi", description: "Watchlist.", to: "/account/watchlist", access: "customer" },
      { label: "Thông báo", description: "Customer notifications.", to: "/account/notifications", access: "customer" },
      { label: "Lịch sử đặt giá", description: "My bids và auto bid.", to: "/account/bids", access: "customer" },
      { label: "Đánh giá", description: "Review sau bàn giao.", to: "/account/review/HO-5711R-2026", access: "customer" },
    ],
  },
  {
    title: "Vận hành",
    description: "Các workspace nội bộ, gồm scenario chuẩn bị và phê duyệt Cluster 1.",
    links: [
      { label: "Operations dashboard", description: "Tổng quan vận hành.", to: "/ops", access: "admin" },
      { label: "Opening requests", description: "Hàng đợi yêu cầu mở phiên.", to: "/ops/opening-requests", access: "admin" },
      { label: "Review Royal Oak", description: "OPS-003 · request under review, chưa có session.", to: "/ops/opening-requests/ORQ-ROYAL-OAK-001?scenario=request-under-review", access: "admin" },
      { label: "Auction sessions", description: "Danh sách session.", to: "/ops/auctions", access: "admin" },
      { label: "Tạo phiên SGDG", description: "OPS-004 · Omega Direct SGDG, chỉ Content Staff.", to: "/ops/auctions/new", access: "content" },
      { label: "Workspace Royal Oak", description: "OPS-005 · DRAFT từ Opening Request.", to: "/ops/auctions/royal-oak-15500st-draft?scenario=session-draft", access: "admin" },
      { label: "Workspace Omega", description: "OPS-005 · Direct SGDG, không có Opening Request.", to: "/ops/auctions/sgdg-omega-speedmaster-draft-01?scenario=session-draft", access: "admin" },
      { label: "Rules Royal Oak", description: "OPS-006 · Rule proposal draft.", to: "/ops/auctions/royal-oak-15500st-draft/rules?scenario=draft", access: "admin" },
      { label: "Rule snapshot", description: "OPS-006 · Approved snapshot read-only.", to: "/ops/auctions/royal-oak-15500st-draft/rules?scenario=approved-snapshot", access: "admin" },
      { label: "Schedule Royal Oak", description: "OPS-007 · Approved, chưa scheduled.", to: "/ops/auctions/royal-oak-15500st-draft/schedule-publication?scenario=approved-not-scheduled", access: "admin" },
      { label: "Schedule đã publish", description: "OPS-007 · Lifecycle và publication tách riêng.", to: "/ops/auctions/royal-oak-15500st-draft/schedule-publication?scenario=published", access: "admin" },
      { label: "Live operations", description: "Patek live console.", to: "/ops/live/patek-nautilus?scenario=healthy", access: "admin" },
      { label: "Closing result monitor", description: "RES-PATEK-5711R.", to: "/ops/results/RES-PATEK-5711R?scenario=closed-with-top3", access: "admin" },
      { label: "Candidate timeline", description: "Candidate fallback timeline.", to: "/ops/results/RES-PATEK-5711R/candidates?scenario=rank1-active", access: "admin" },
      { label: "Handover operations", description: "HO-5711R-2026.", to: "/ops/handover/HO-5711R-2026?scenario=active", access: "admin" },
      { label: "Finance package", description: "FIN-PKG-PATEK-5711R-V1.", to: "/ops/finance-packages/FIN-PKG-PATEK-5711R-V1", access: "admin" },
      { label: "Approval queue", description: "GOV-001 · package pending.", to: "/governance/approvals?scenario=session-pending-approval", access: "admin" },
      { label: "Approval Royal Oak", description: "GOV-002 · checker hợp lệ.", to: "/governance/approvals/APR-ROYAL-OAK-001?scenario=ready&user=admin.checker@mock.local", access: "admin" },
      { label: "Maker-checker conflict", description: "GOV-002 · identity trùng maker bị chặn.", to: "/governance/approvals/APR-ROYAL-OAK-001?scenario=ready&user=content.staff@mock.local", access: "admin" },
      { label: "Approval Omega", description: "APR-OMEGA-SGDG-001 fixture.", to: "/governance/approvals/APR-OMEGA-SGDG-001?scenario=ready&user=admin.checker@mock.local", access: "admin" },
    ],
  },
  {
    title: "Exception Governance",
    description: "Các màn hình GOV-004 đến GOV-009, đã gắn scenario demo tiêu biểu.",
    links: [
      { label: "Failed auction review", description: "GOV-004 · FAIL-PATEK-001.", to: "/governance/failed-auctions/FAIL-PATEK-001?scenario=potential-failure&demo=1", access: "admin" },
      { label: "Re-auction recommendation", description: "GOV-005 · recommendation draft.", to: "/governance/failed-auctions/FAIL-PATEK-001/reauction?scenario=draft&demo=1", access: "admin" },
      { label: "Sensitive change review", description: "GOV-006 · CHG-ROYAL-OAK-001.", to: "/governance/changes/CHG-ROYAL-OAK-001?scenario=pending&demo=1", access: "admin" },
      { label: "Cancellation review", description: "GOV-007 · CAN-ROYAL-OAK-001.", to: "/governance/cancellations/CAN-ROYAL-OAK-001?scenario=requested&demo=1", access: "admin" },
      { label: "Publication governance", description: "GOV-008 · Royal Oak draft.", to: "/governance/publication/royal-oak-15500st-draft?scenario=published&demo=1", access: "admin" },
      { label: "Dispute & remediation", description: "GOV-009 · Patek payment reversal.", to: "/governance/remediation/REM-PATEK-REVERSAL-001?scenario=investigating&demo=1", access: "admin" },
    ],
  },
  {
    title: "Quản trị & kiểm toán",
    description: "Các trang quản trị hệ thống.",
    links: [
      { label: "Admin dashboard", description: "Tổng quan quản trị.", to: "/admin", access: "admin" },
      { label: "Người dùng & KYC", description: "Admin users.", to: "/admin/users", access: "admin" },
      { label: "Tài sản", description: "Quản trị asset.", to: "/admin/assets", access: "admin" },
      { label: "Phiên đấu giá", description: "Admin auction sessions.", to: "/admin/auctions", access: "admin" },
      { label: "Admin live ops", description: "Live operations legacy admin view.", to: "/admin/live-ops/patek-nautilus", access: "admin" },
      { label: "Thanh toán", description: "Payment verification.", to: "/admin/payments", access: "admin" },
      { label: "Audit timeline", description: "Audit projection.", to: "/admin/audit", access: "admin" },
      { label: "Reports", description: "Reports projection.", to: "/admin/reports", access: "admin" },
    ],
  },
];

export function DemoPage() {
  const { authenticated, adminAuthenticated, actorRole, login, adminLogin } = useDemoStore();

  return (
    <main className="demo-page">
      <header className="demo-hero">
        <div>
          <p className="eyebrow">SGDG · SCREEN DIRECTORY</p>
          <h1>Demo navigator</h1>
          <p>Một nơi để mở trực tiếp mọi màn hình và fixture chính của dự án.</p>
        </div>
        <div className="demo-access" aria-label="Thiết lập quyền demo">
          <p><KeyRound size={16} /> Khách hàng: <strong>{authenticated ? "đã bật" : "chưa bật"}</strong></p>
          <p><ShieldCheck size={16} /> Quản trị: <strong>{adminAuthenticated ? `${actorRole} đã bật` : "chưa bật"}</strong></p>
          <div>
            <button className="button secondary" onClick={() => login()}>Bật Khách hàng</button>
            <button className="button secondary" onClick={() => adminLogin("CONTENT_STAFF")}>Bật Content Staff</button>
            <button className="button primary" onClick={() => adminLogin("ADMIN")}>Bật Admin</button>
          </div>
        </div>
      </header>

      <p className="demo-note">Liên kết có khóa yêu cầu quyền tương ứng. Bạn có thể bật quyền ở phía trên rồi bấm bất kỳ màn hình nào.</p>
      <div className="demo-groups">
        {groups.map((group) => (
          <section className="demo-group" key={group.title}>
            <div className="demo-group-heading"><h2>{group.title}</h2><p>{group.description}</p></div>
            <div className="demo-links">
              {group.links.map((item) => (
                <Link className="demo-link" to={item.to} key={item.to}>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  <span className="demo-link-meta">{item.access === "customer" ? "Khách hàng" : item.access === "content" ? "Content Staff" : item.access === "admin" ? "Admin" : "Công khai"}<ExternalLink size={16} /></span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
