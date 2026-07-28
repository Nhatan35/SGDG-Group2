import {
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  ShieldCheck,
  UserCircle,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { useDemoStore } from "../../store/demoStore";
import { formatMoney } from "../../utils/format";

const links = [
  { to: "/", label: "Trang chủ" },
  { to: "/auctions", label: "Phiên đấu giá" },
  { to: "/news", label: "Tin tức" },
  { to: "/help", label: "Hướng dẫn" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();
  const { authenticated, userName, walletBalance, logout } = useDemoStore();
  const initial = userName.trim().slice(0, 1).toUpperCase() || "U";

  function handleLogout() {
    logout();
    setAccountOpen(false);
    setOpen(false);
    navigate("/", { replace: true });
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
              end
              onClick={() => setOpen(false)}
            >
              {x.label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <span className="trust-mark">
            <ShieldCheck size={16} />
            Minh bạch & an toàn
          </span>
          <Link
            className="button ghost"
            to="/account/watchlist"
            aria-label="Danh sách theo dõi"
          >
            <Heart size={20} />
          </Link>
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
                    Lịch sử đấu giá
                  </Link>
                  <Link
                    role="menuitem"
                    to="/account/watchlist"
                    onClick={() => setAccountOpen(false)}
                  >
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
            <>
              <Link className="button secondary" to="/auth/login">
                Đăng nhập
              </Link>
              <Link className="button primary" to="/auth/register">
                Đăng ký
              </Link>
            </>
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
