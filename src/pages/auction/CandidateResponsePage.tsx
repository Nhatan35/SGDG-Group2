import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  Flame,
  Gavel,
  Trophy,
  Users,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { auctions } from "../../services/mock/auctionService";
import { formatDateTime, formatMoney } from "../../utils/format";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/candidate-response.css";

export function CandidateResponsePage() {
  const { auctionId } = useParams();
  const auction = auctions.find((item) => item.id === auctionId);

  if (!auction) return <NotFoundPage />;

  const winningPrice = auction.currentPrice || auction.startPrice;
  const endedAt = auction.endsAt || new Date().toISOString();
  const totalBids = Math.max(auction.acceptedBidCount, 42);

  return (
    <main className="container candidate-response-page post-auction-page">
      <section className="winner-alert-card">
        <div className="winner-confetti" aria-hidden="true" />
        <div className="winner-alert-heading">
          <span className="winner-shield">
            <Trophy aria-hidden="true" />
          </span>
          <div>
            <p>Bạn là người chiến thắng!</p>
            <h1>Chúc mừng bạn đã trúng đấu giá</h1>
          </div>
        </div>

        <div className="winner-alert-body">
          <img src={auction.image} alt={auction.assetName} />
          <div className="winner-alert-info">
            <h2>{auction.assetName}</h2>
            <p>{auction.code}</p>
            <span className="winner-badge">
              <CheckCircle2 aria-hidden="true" />
              Người bán uy tín
            </span>
            <dl>
              <div>
                <dt>Giá trúng đấu giá</dt>
                <dd>{formatMoney(winningPrice)}</dd>
              </div>
              <div>
                <dt>Thời gian kết thúc</dt>
                <dd>{formatDateTime(endedAt)}</dd>
              </div>
              <div>
                <dt>Tổng số lượt trả giá</dt>
                <dd>{totalBids} lượt</dd>
              </div>
              <div>
                <dt>Bước giá tối thiểu</dt>
                <dd>{formatMoney(auction.minimumIncrement)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="winner-alert-actions">
          <Link className="button secondary" to={`/auctions/${auction.id}`}>
            Xem chi tiết
          </Link>
          <Link
            className="button primary"
            to={`/me/auctions/${auction.id}/winner?scenario=final-winner-confirmed`}
          >
            Tiếp tục
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="winner-next-overview" aria-label="Các bước tiếp theo">
        {[
          ["Xác nhận thông tin", "Kiểm tra tài sản, giá trúng và cam kết thanh toán."],
          ["Thanh toán", "Chọn phương thức thanh toán và hoàn tất trong thời hạn."],
          ["Theo dõi bàn giao", "Theo dõi vận chuyển, lịch nhận và trạng thái hồ sơ."],
          ["Hoàn tất giao dịch", "Xác nhận bàn giao thành công và gửi đánh giá."],
        ].map(([title, description], index) => (
          <article key={title}>
            <span>{index + 1}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <section className="winner-energy-strip">
        <span>
          <Flame aria-hidden="true" />
          Phiên đấu rất sôi động
        </span>
        <span>
          <Users aria-hidden="true" />
          {auction.participantCount} người tham gia
        </span>
        <span>
          <Eye aria-hidden="true" />
          {auction.watcherCount} lượt theo dõi
        </span>
        <span>
          <Gavel aria-hidden="true" />
          {totalBids} lượt trả giá hợp lệ
        </span>
        <span>
          <Clock3 aria-hidden="true" />
          Cần xác nhận sớm
        </span>
      </section>
    </main>
  );
}
