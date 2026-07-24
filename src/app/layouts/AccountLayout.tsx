import {
  Bell,
  FileCheck2,
  Heart,
  History,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  Headphones,
  LogOut,
  Trophy,
  UserRound,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useDemoStore } from "../../store/demoStore";

const links = [
  ["/account/dashboard", "Tổng quan", LayoutDashboard],
  ["/account/profile", "Hồ sơ cá nhân", UserRound],
  ["/account/kyc", "Xác minh KYC", FileCheck2],
  ["/account/wallet", "Tài khoản ngân hàng", Landmark],
  ["/account/profile?section=security", "Cài đặt bảo mật", LockKeyhole],
  ["/account/membership", "Điểm thành viên", Trophy],
  ["/account/watchlist", "Danh sách theo dõi", Heart],
  ["/account/bids", "Lịch sử giao dịch", History],
  ["/account/notifications", "Trung tâm thông báo", Bell],
  ["/account/support", "Trung tâm hỗ trợ", Headphones],
] as const;

export function AccountLayout() {
  const { userName, logout } = useDemoStore();
  const location = useLocation();
  const current = `${location.pathname}${location.search}`;

  function isActive(to: string) {
    if (to.includes("?")) return current === to;
    if (to === "/account/support") return location.pathname.startsWith(to);
    return location.pathname === to && !location.search;
  }

  return (
    <div className="account-shell container">
      <aside className="account-sidebar">
        <div className="account-person">
          <span>{userName.slice(0, 1)}</span>
          <div>
            <strong>{userName}</strong>
            <small>Customer đã xác minh</small>
          </div>
        </div>
        <nav aria-label="Tài khoản">
          {links.map(([to, label, Icon]) => (
            <Link className={isActive(to) ? "active" : ""} key={to} to={to}>
              <Icon />
              {label}
            </Link>
          ))}
        </nav>
        <button className="account-sidebar-logout" onClick={logout}>
          <LogOut />
          Đăng xuất
        </button>
      </aside>
      <section className="account-content">
        <Outlet />
      </section>
    </div>
  );
}
