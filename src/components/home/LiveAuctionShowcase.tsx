import {
  BadgeCheck,
  Clock3,
  Eye,
  Gavel,
  MapPin,
  Mic2,
  Radio,
  ShieldCheck,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Auction } from "../../services/mock/auctionService";
import { useDemoClock } from "../../hooks/useDemoClock";
import { formatMoney } from "../../utils/format";
import {
  formatLivestreamDuration,
  isShortLiveAuction,
} from "../../utils/livestream";
import { AuctionStatus } from "../auction/AuctionStatus";

const maximumVisibleStreams = 4;

export function LiveAuctionShowcase({ auctions }: { auctions: Auction[] }) {
  const now = useDemoClock();
  const liveAuctions = useMemo(
    () =>
      auctions
        .filter((auction) => isShortLiveAuction(auction, now))
        .slice(0, maximumVisibleStreams),
    [auctions, now],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const selectedAuction =
    liveAuctions.find((auction) => auction.id === selectedId) ?? liveAuctions[0];

  if (!selectedAuction) return null;

  return (
    <section className="home-live-showcase" aria-labelledby="live-showcase-title">
      <div className="container">
        <header className="home-live-heading">
          <div>
            <span className="home-live-eyebrow">
              <span className="home-live-signal" aria-hidden="true" />
              Livestream đang phát
            </span>
            <h2 id="live-showcase-title">Theo dõi từng nhịp trả giá</h2>
          </div>
          <p>
            Góc nhìn trực tiếp dành riêng cho những phiên ngắn, kéo dài không
            quá 4 giờ trên Sài Gòn Đấu Giá.
          </p>
        </header>

        <div className="home-live-stage">
          <article className="home-live-broadcast">
            <img
              src={selectedAuction.image}
              alt={`Livestream sản phẩm ${selectedAuction.assetName}`}
            />
            <div className="home-live-glow" aria-hidden="true" />
            <div className="home-live-topbar">
              <span className="home-live-badge">
                <Radio aria-hidden="true" />
                LIVE
              </span>
              <span className="home-live-viewers">
                <Eye aria-hidden="true" />
                {selectedAuction.watcherCount.toLocaleString("vi-VN")} đang xem
              </span>
            </div>
            <button
              type="button"
              className="home-live-audio"
              aria-label={muted ? "Bật âm thanh livestream" : "Tắt âm thanh livestream"}
              aria-pressed={!muted}
              onClick={() => setMuted((value) => !value)}
            >
              {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            </button>
            <div className="home-live-host">
              <span>
                <Mic2 aria-hidden="true" />
              </span>
              <div>
                <strong>
                  SGDG Live Studio <BadgeCheck aria-label="Đã xác minh" />
                </strong>
                <small>Đang giới thiệu chi tiết tài sản</small>
              </div>
            </div>
          </article>

          <article className="home-live-summary" aria-live="polite">
            <div className="home-live-summary-kicker">
              <span>{selectedAuction.category}</span>
              <span>
                <Clock3 aria-hidden="true" />
                {formatLivestreamDuration(
                  selectedAuction.startsAt,
                  selectedAuction.endsAt,
                )}
              </span>
            </div>
            <h3>{selectedAuction.assetName}</h3>
            <div className="home-live-meta">
              <span>{selectedAuction.code}</span>
              <span>
                <MapPin aria-hidden="true" />
                {selectedAuction.region}
              </span>
            </div>

            <div className="home-live-countdown">
              <div>
                <Clock3 aria-hidden="true" />
                <span>Kết thúc sau</span>
              </div>
              <AuctionStatus auction={selectedAuction} showBadge={false} />
            </div>

            <div className="home-live-price">
              <span>Giá hiện tại</span>
              <strong>{formatMoney(selectedAuction.currentPrice)}</strong>
              <small>
                Bước giá tiếp theo: {formatMoney(selectedAuction.minimumIncrement)}
              </small>
            </div>

            <div className="home-live-metrics">
              <span>
                <Users aria-hidden="true" />
                <b>{selectedAuction.participantCount}</b> người tham gia
              </span>
              <span>
                <Gavel aria-hidden="true" />
                <b>{selectedAuction.acceptedBidCount}</b> lượt trả giá
              </span>
            </div>

            <div className="home-live-actions">
              <Link
                className="button primary"
                to={`/auctions/${selectedAuction.id}/livestream`}
              >
                <Radio aria-hidden="true" />
                Xem livestream
              </Link>
              <Link
                className="button secondary"
                to={`/auctions/${selectedAuction.id}`}
              >
                Chi tiết phiên
              </Link>
            </div>
            <p className="home-live-trust">
              <ShieldCheck aria-hidden="true" />
              Hình ảnh trực tiếp hỗ trợ quan sát; giá tại phòng đấu giá là dữ
              liệu chính thức.
            </p>
          </article>
        </div>

        <div className="home-live-channel-heading">
          <h3>Đang phát cùng lúc</h3>
          <span>{liveAuctions.length} phòng trực tiếp</span>
        </div>
        <div className="home-live-channels">
          {liveAuctions.map((auction) => {
            const active = auction.id === selectedAuction.id;
            return (
              <button
                key={auction.id}
                type="button"
                className={active ? "active" : ""}
                aria-label={`Xem livestream ${auction.assetName}`}
                aria-pressed={active}
                onClick={() => setSelectedId(auction.id)}
              >
                <span className="home-live-channel-image">
                  <img src={auction.image} alt="" />
                  <span>
                    <span aria-hidden="true" /> LIVE
                  </span>
                </span>
                <span className="home-live-channel-copy">
                  <strong>{auction.assetName}</strong>
                  <small>{formatMoney(auction.currentPrice)}</small>
                  <span>
                    <Eye aria-hidden="true" />
                    {auction.watcherCount.toLocaleString("vi-VN")} người xem
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
