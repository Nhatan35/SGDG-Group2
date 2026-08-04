import {
  Bell,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  FileCheck2,
  Gavel,
  Heart,
  History,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  Headphones,
  LogOut,
  PackageCheck,
  Trophy,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useDemoStore } from "../../store/demoStore";

const primaryLinks = [
  ["/account/dashboard", "Tổng quan", LayoutDashboard],
] as const;

const profileLinks = [
  ["/account/profile", "Thông tin cá nhân", UserRound],
  ["/account/kyc", "Xác minh KYC", FileCheck2],
  ["/account/wallet", "Tài khoản ngân hàng", Landmark],
  ["/account/profile?section=security", "Cài đặt bảo mật", LockKeyhole],
] as const;

const accountLinks = [
  ["/account/deposits", "Tiền cọc đấu giá", CircleDollarSign],
] as const;

const auctionLinks = [
  ["/account/auctions", "Phiên đấu giá", Gavel],
  ["/account/bids", "Lượt trả giá", History],
  ["/account/payments", "Thanh toán", CreditCard],
  ["/account/deliveries", "Bàn giao", PackageCheck],
] as const;

const secondaryLinks = [
  ["/account/membership", "Điểm thành viên", Trophy],
  ["/account/watchlist", "Danh sách theo dõi", Heart],
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

  const profileGroupActive = profileLinks.some(([to]) => isActive(to));
  const auctionGroupActive = auctionLinks.some(([to]) => isActive(to));
  const [profileGroupOverride, setProfileGroupOverride] = useState<{
    location: string;
    open: boolean;
  } | null>(null);
  const [auctionGroupOverride, setAuctionGroupOverride] = useState<{
    location: string;
    open: boolean;
  } | null>(null);
  const profileGroupOpen =
    profileGroupOverride?.location === current
      ? profileGroupOverride.open
      : profileGroupActive;
  const auctionGroupOpen =
    auctionGroupOverride?.location === current
      ? auctionGroupOverride.open
      : auctionGroupActive;

  return (
    <div className="account-shell container">
      <aside className="account-sidebar">
        <div className="account-person">
          <span>{userName.slice(0, 1)}</span>
          <div>
            <strong>{userName}</strong>
            <small>Khách hàng đã xác minh</small>
          </div>
        </div>
        <nav aria-label="Tài khoản">
          {primaryLinks.map(([to, label, Icon]) => (
            <Link className={isActive(to) ? "active" : ""} key={to} to={to}>
              <Icon />
              {label}
            </Link>
          ))}
          <div
            className={`account-nav-group ${profileGroupOpen ? "open" : ""}`}
          >
            <button
              className={`account-nav-group__toggle ${profileGroupActive ? "active" : ""}`}
              type="button"
              aria-expanded={profileGroupOpen}
              aria-controls="account-profile-menu"
              onClick={() =>
                setProfileGroupOverride({
                  location: current,
                  open: !profileGroupOpen,
                })
              }
            >
              <UserRound aria-hidden="true" />
              <span>Hồ sơ cá nhân</span>
              <ChevronDown
                className="account-nav-group__chevron"
                aria-hidden="true"
              />
            </button>
            {profileGroupOpen && (
              <div
                className="account-nav-group__submenu"
                id="account-profile-menu"
              >
                {profileLinks.map(([to, label, Icon]) => (
                  <Link
                    className={isActive(to) ? "active" : ""}
                    key={to}
                    to={to}
                  >
                    <Icon />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {accountLinks.map(([to, label, Icon]) => (
            <Link className={isActive(to) ? "active" : ""} key={to} to={to}>
              <Icon />
              {label}
            </Link>
          ))}
          <div
            className={`account-nav-group ${auctionGroupOpen ? "open" : ""}`}
          >
            <button
              className={`account-nav-group__toggle ${auctionGroupActive ? "active" : ""}`}
              type="button"
              aria-expanded={auctionGroupOpen}
              aria-controls="account-auction-menu"
              onClick={() =>
                setAuctionGroupOverride({
                  location: current,
                  open: !auctionGroupOpen,
                })
              }
            >
              <Gavel aria-hidden="true" />
              <span>Đấu giá của tôi</span>
              <ChevronDown
                className="account-nav-group__chevron"
                aria-hidden="true"
              />
            </button>
            {auctionGroupOpen && (
              <div
                className="account-nav-group__submenu"
                id="account-auction-menu"
              >
                {auctionLinks.map(([to, label, Icon]) => (
                  <Link
                    className={isActive(to) ? "active" : ""}
                    key={to}
                    to={to}
                  >
                    <Icon />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {secondaryLinks.map(([to, label, Icon]) => (
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
