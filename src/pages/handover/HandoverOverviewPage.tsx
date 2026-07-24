import {
  CheckCircle2,
  Clock3,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getHandoverCaseFixture } from "../../services/mock/handoverService";
import { auctions } from "../../services/mock/auctionService";
import { formatDateTime, formatMoney } from "../../utils/format";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/handover-overview.css";

const handoverSteps = [
  ["Đã thanh toán", "16/05/2024"],
  ["Xác nhận về người bán", "16/05/2024"],
  ["Đang chuẩn bị bàn giao", "17/05/2024"],
  ["Đang vận chuyển", "18/05/2024"],
  ["Hoàn tất bàn giao", "Dự kiến 19/05/2024"],
] as const;

export function HandoverOverviewPage() {
  const { caseId } = useParams();
  const [params] = useSearchParams();
  const fixture = caseId ? getHandoverCaseFixture(caseId, "in-transit") : undefined;
  const requestedAuctionId = params.get("auctionId");
  const auction =
    auctions.find((item) => item.id === requestedAuctionId) ||
    auctions.find((item) => item.id === fixture?.auctionId);

  if (!fixture || !auction) return <NotFoundPage />;

  const winningPrice = auction.currentPrice || auction.startPrice;
  const paidAt = "2026-07-20T07:25:00.000Z";

  return (
    <main className="container handover-overview-page post-auction-page">
      <header className="post-auction-heading">
        <span>THEO DÕI BÀN GIAO</span>
        <h1>Theo dõi bàn giao tài sản</h1>
        <p>
          Cập nhật trạng thái thanh toán, chuẩn bị hàng, vận chuyển và hoàn tất
          giao dịch cho tài sản bạn đã thắng đấu giá.
        </p>
      </header>

      <section className="handover-tracker-card">
        <ol className="handover-tracker">
          {handoverSteps.map(([title, date], index) => (
            <li key={title} className={index < 4 ? "done" : "pending"}>
              <span>{index < 4 ? <CheckCircle2 aria-hidden="true" /> : index + 1}</span>
              <strong>{title}</strong>
              <small>{date}</small>
            </li>
          ))}
        </ol>
      </section>

      <div className="handover-summary-layout">
        <section className="handover-transaction-card">
          <h2>Thông tin giao dịch</h2>
          <div className="handover-transaction-asset">
            <img src={auction.image} alt={auction.assetName} />
            <div>
              <h3>{auction.assetName}</h3>
              <p>{auction.code}</p>
              <span>
                <ShieldCheck aria-hidden="true" />
                Người bán uy tín
              </span>
            </div>
          </div>
          <dl>
            <div>
              <dt>Giá trúng</dt>
              <dd>{formatMoney(winningPrice)}</dd>
            </div>
            <div>
              <dt>Ngày thanh toán</dt>
              <dd>{formatDateTime(paidAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="handover-delivery-summary">
          <h2>Thông tin giao hàng</h2>
          <dl>
            <div>
              <dt>Đơn vị vận chuyển</dt>
              <dd>SGDG Logistics</dd>
            </div>
            <div>
              <dt>Mã vận đơn</dt>
              <dd>SGDG-20240517-001</dd>
            </div>
            <div>
              <dt>Dự kiến giao hàng</dt>
              <dd>19/05/2024</dd>
            </div>
            <div>
              <dt>Địa chỉ nhận hàng</dt>
              <dd>72 Nguyễn Huệ, Q.1, TP. HCM</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="handover-live-status">
        <Truck aria-hidden="true" />
        <div>
          <h2>Đang vận chuyển</h2>
          <p>
            Tài sản đã được niêm phong và bàn giao cho SGDG Logistics. Bạn sẽ
            nhận thông báo khi tài sản đến điểm nhận.
          </p>
        </div>
        <Link
          className="button primary"
          to={`/me/handover/${fixture.caseId}/completion?scenario=completed&auctionId=${auction.id}`}
        >
          Hoàn tất giao dịch demo
        </Link>
      </section>

      <section className="handover-support-grid">
        <article>
          <PackageCheck aria-hidden="true" />
          <h2>Hồ sơ bàn giao</h2>
          <p>Mã hồ sơ {fixture.caseReference} đã được kích hoạt.</p>
        </article>
        <article>
          <MapPin aria-hidden="true" />
          <h2>Điểm nhận</h2>
          <p>Địa chỉ được xác nhận theo thông tin người thắng đấu giá.</p>
        </article>
        <article>
          <Clock3 aria-hidden="true" />
          <h2>Cập nhật liên tục</h2>
          <p>Thông báo sẽ được gửi khi có mốc bàn giao mới.</p>
        </article>
      </section>
    </main>
  );
}