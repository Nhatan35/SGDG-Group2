import { Outlet, useLocation } from "react-router-dom";
import { PublicHeader } from "../../components/navigation/PublicHeader";
import { PublicFooter } from "../../components/navigation/PublicFooter";

export function PublicLayout() {
  const { pathname } = useLocation();
  const isAuctionDetail = /^\/auctions\/[^/]+$/.test(pathname);
  return (
    <div className={isAuctionDetail ? "public-layout public-layout-detail" : "public-layout"}>
      <PublicHeader />
      <main id="main-content"><Outlet /></main>
      <PublicFooter />
    </div>
  );
}
