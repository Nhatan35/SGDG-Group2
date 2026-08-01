import { Outlet, useLocation } from "react-router-dom";
import { PublicHeader } from "../../components/navigation/PublicHeader";
import { PublicFooter } from "../../components/navigation/PublicFooter";

export function PublicLayout() {
  const { pathname } = useLocation();
  const isAuctionDetail = /^\/auctions\/[^/]+$/.test(pathname);
  const isHome = pathname === "/";
  const layoutClassName = [
    "public-layout",
    isAuctionDetail ? "public-layout-detail" : "",
    isHome ? "public-layout-home" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={layoutClassName}>
      <PublicHeader />
      <main id="main-content"><Outlet /></main>
      <PublicFooter />
    </div>
  );
}
