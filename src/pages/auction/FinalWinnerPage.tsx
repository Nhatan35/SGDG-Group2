import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Gavel,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { auctions } from "../../services/mock/auctionService";
import { formatDateTime, formatMoney } from "../../utils/format";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/final-winner.css";

export function FinalWinnerPage() {
  const { auctionId } = useParams();
  const auction = auctions.find((item) => item.id === auctionId);
  const [confirmed, setConfirmed] = useState(false);

  if (!auction) return <NotFoundPage />;

  const winningPrice = auction.currentPrice || auction.startPrice;
  const serviceFee = Math.round(winningPrice * 0.01);
  const totalDue = winningPrice + serviceFee;
  const endedAt = auction.endsAt || new Date().toISOString();

  return (
    <main className="container final-winner-page post-auction-page">
      <header className="post-auction-heading">
        <span>XÁC NHẬN TRÚNG ĐẤU GIÁ</span>
        <h1>Xác nhận thông tin trúng đấu giá</h1>
        <p>
          Kiểm tra lại tài sản, giá trúng và nghĩa vụ thanh toán trước khi
          chuyển sang bước thanh toán.
        </p>
      </header>

      <div className="winner-confirm-layout">
        <section className="winner-confirm-card">
          <div className="winner-confirm-asset">
            <img src={auction.image} alt={auction.assetName} />
            <div>
              <p>{auction.category}</p>
              <h2>{auction.assetName}</h2>
              <span>{auction.code}</span>
              <small>
                <ShieldCheck aria-hidden="true" />
                Người bán uy tín
              </small>
            </div>
          </div>

          <dl className="winner-confirm-total">
            <div>
              <dt>Giá trúng đấu giá</dt>
              <dd>{formatMoney(winningPrice)}</dd>
            </div>
            <div>
              <dt>Phí dịch vụ (1%)</dt>
              <dd>{formatMoney(serviceFee)}</dd>
            </div>
            <div>
              <dt>Tổng thanh toán</dt>
              <dd>{formatMoney(totalDue)}</dd>
            </div>
          </dl>

          <label className="winner-confirm-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              Tôi xác nhận đồng ý mua tài sản với giá trúng đấu giá và cam kết
              thanh toán đúng thời hạn.
            </span>
          </label>

          <div className="winner-confirm-actions">
            <Link className="button secondary" to={`/me/auctions/${auction.id}/candidate`}>
              Hủy bỏ
            </Link>
            <Link
              aria-disabled={!confirmed}
              className={confirmed ? "button primary" : "button primary disabled"}
              to={
                confirmed
                  ? `/me/auctions/${auction.id}/payment?scenario=pending`
                  : "#"
              }
              onClick={(event) => {
                if (!confirmed) event.preventDefault();
              }}
            >
              Xác nhận trúng đấu giá
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>

        <aside className="winner-confirm-sidebar">
          <section>
            <FileCheck2 aria-hidden="true" />
            <h2>Thông tin phiên</h2>
            <dl>
              <div>
                <dt>Kết thúc lúc</dt>
                <dd>{formatDateTime(endedAt)}</dd>
              </div>
              <div>
                <dt>Số lượt trả giá hợp lệ</dt>
                <dd>{Math.max(auction.acceptedBidCount, 42)} lượt</dd>
              </div>
              <div>
                <dt>Bước giá tối thiểu</dt>
                <dd>{formatMoney(auction.minimumIncrement)}</dd>
              </div>
            </dl>
          </section>

          <section>
            <Gavel aria-hidden="true" />
            <h2>Cam kết sau xác nhận</h2>
            <p>
              Sau khi xác nhận, hệ thống sẽ giữ trạng thái người thắng và mở
              nghĩa vụ thanh toán cho tài sản này.
            </p>
          </section>

          <section>
            <CreditCard aria-hidden="true" />
            <h2>Bước tiếp theo</h2>
            <p>Thanh toán trúng đấu giá, sau đó theo dõi bàn giao tài sản.</p>
          </section>
        </aside>
      </div>

      <section className="winner-confirm-checks">
        {[
          "Tài sản đã được thẩm định trước khi công bố",
          "Thông tin người bán và giá trúng được khóa",
          "Thanh toán sẽ được ghi nhận trong ví và lịch sử giao dịch",
        ].map((item) => (
          <span key={item}>
            <CheckCircle2 aria-hidden="true" />
            {item}
          </span>
        ))}
      </section>
    </main>
  );
}