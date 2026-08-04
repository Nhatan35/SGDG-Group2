import {
  ArrowRight,
  Bell,
  ChevronDown,
  Gavel,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  UserCircle,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { useDemoStore } from "../../store/demoStore";
import { formatMoney } from "../../utils/format";

const links = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/auctions", label: "Phiên đấu giá", end: true },
  { to: "/open-auction", label: "Mở đấu giá", end: false },
  { to: "/news", label: "Tin tức", end: true },
  { to: "/help", label: "Hướng dẫn", end: true },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const {
    authenticated,
    userName,
    walletBalance,
    unreadNotifications,
    logout,
  } = useDemoStore();
  const initial = userName.trim().slice(0, 1).toUpperCase() || "U";

  function handleLogout() {
    logout();
    setAccountOpen(false);
    setOpen(false);
    navigate("/", { replace: true });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    setOpen(false);
    navigate(query ? `/auctions?q=${encodeURIComponent(query)}` : "/auctions");
  }

  return (
    <header className="public-header">
      <a className="skip-link" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <div className="container header-main">
        <Link className="brand" to="/" aria-label="Trang chủ SGDG">
          <img
            src="/assets/logo-transparent.png"
            alt="SGDG"
            width="222"
            height="96"
          />
        </Link>
        <nav
          className={open ? "nav open" : "nav"}
          aria-label="Điều hướng chính"
        >
          {links.map((x) => (
            <NavLink
              key={x.to}
              to={x.to}
              end={x.end}
              onClick={() => setOpen(false)}
            >
              {x.label}
            </NavLink>
          ))}
        </nav>
        <form
          className="header-search"
          role="search"
          aria-label="Tìm kiếm phiên đấu giá"
          onSubmit={handleSearch}
        >
          <Search className="header-search__icon" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm tài sản, phiên đấu giá..."
            aria-label="Từ khóa tìm kiếm"
          />
          <button type="submit" aria-label="Tìm kiếm">
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
        <div className="header-actions">
          {authenticated && (
            <div className="header-notification">
              <Link
                className="header-notification__button"
                to="/account/notifications"
                aria-label={
                  unreadNotifications > 0
                    ? "Thông báo, có 1 thông báo mới"
                    : "Thông báo"
                }
              >
                <Bell aria-hidden="true" />
                {unreadNotifications > 0 && (
                  <span className="header-notification__badge">1</span>
                )}
              </Link>
              <div className="header-notification__preview" role="tooltip">
                {unreadNotifications > 0 ? (
                  <>
                    <span>Thông báo mới</span>
                    <strong>Bạn đang dẫn đầu</strong>
                    <p>Giá trả 450.000.000 đ đã được chấp nhận.</p>
                    <small>2 phút trước · Nhấn để xem chi tiết</small>
                  </>
                ) : (
                  <p>Bạn không có thông báo mới.</p>
                )}
              </div>
            </div>
          )}
          {authenticated ? (
            <div className="header-account">
              <Link
                className="wallet-pill"
                to="/account/wallet"
                aria-label={`Số dư ví ${formatMoney(walletBalance)}`}
              >
                <Wallet size={18} />
                <span>{formatMoney(walletBalance)}</span>
              </Link>
              <button
                className="avatar-button"
                type="button"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((value) => !value)}
              >
                <span className="avatar-circle" aria-hidden="true">
                  {initial}
                </span>
                <ChevronDown size={16} aria-hidden="true" />
                <span className="sr-only">Mở menu tài khoản</span>
              </button>
              {accountOpen && (
                <div className="account-popover" role="menu">
                  <div className="account-popover-head">
                    <span className="avatar-circle" aria-hidden="true">
                      {initial}
                    </span>
                    <div>
                      <strong>{userName}</strong>
                      <small>Khách hàng đã xác minh</small>
                    </div>
                  </div>
                  <Link
                    role="menuitem"
                    to="/account/profile"
                    onClick={() => setAccountOpen(false)}
                  >
                    <UserCircle />
                    Thông tin cá nhân
                  </Link>
                  <Link
                    role="menuitem"
                    to="/account/dashboard"
                    onClick={() => setAccountOpen(false)}
                  >
                    <LayoutDashboard />
                    Tổng quan tài khoản
                  </Link>
                  <Link
                    role="menuitem"
                    to="/account/wallet"
                    onClick={() => setAccountOpen(false)}
                  >
                    <Wallet />
                    Ví của tôi
                  </Link>
                  <Link
                    role="menuitem"
                    to="/account/bids"
                    onClick={() => setAccountOpen(false)}
                  >
                    <Gavel />
                    Lịch sử đấu giá
                  </Link>
                  <Link
                    role="menuitem"
                    to="/account/watchlist"
                    onClick={() => setAccountOpen(false)}
                  >
                    <Heart />
                    Danh sách theo dõi
                  </Link>
                  <button role="menuitem" type="button" onClick={handleLogout}>
                    <LogOut />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="header-guest-actions">
              <Link className="header-guest-login" to="/auth/login">
                <UserRound aria-hidden="true" />
                Đăng nhập
              </Link>
              <div className="header-guest-meta">
                <span className="header-language" aria-label="Ngôn ngữ: Tiếng Việt">
                  VI <ChevronDown aria-hidden="true" />
                </span>
                <Link to="/help" aria-label="Trung tâm trợ giúp">
                  <span aria-hidden="true">?</span>
                </Link>
                <Link to="/account/watchlist" aria-label="Danh sách theo dõi">
                  <Heart aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            className="menu-toggle"
            aria-expanded={open}
            aria-label={open ? "Đóng menu" : "Mở menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
    </header>
  );
}
