import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  Eye,
  Flame,
  Gavel,
  Heart,
  LockKeyhole,
  Maximize2,
  MessageCircle,
  Mic2,
  Pause,
  Play,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import { AuctionStatus } from "../../components/auction/AuctionStatus";
import {
  catalogAuctions,
  type Auction,
} from "../../services/mock/auctionService";
import { useDemoClock } from "../../hooks/useDemoClock";
import { useDemoStore } from "../../store/demoStore";
import { formatMoney } from "../../utils/format";
import {
  formatLivestreamDuration,
  isShortLiveAuction,
} from "../../utils/livestream";
import "../../styles/auction-livestream-room.css";

interface LiveBidEvent {
  id: string;
  alias: string;
  amount: number;
  time: string;
}

interface LiveComment {
  id: string;
  author: string;
  avatar: string;
  color: string;
  message: string;
  time: string;
  badge?: string;
  host?: boolean;
  bidEvent?: boolean;
}

const bidderAliases = ["Min***Anh", "Gia***88", "Huy***SG", "Lan***Luxury"];

const initialComments: LiveComment[] = [
  {
    id: "host-01",
    author: "SGDG Host",
    avatar: "SG",
    color: "orange",
    message:
      "Chào mừng bạn đến phòng live. Giá hiển thị tại đây được đồng bộ từ phiên đấu giá.",
    time: "19:00",
    badge: "HOST",
    host: true,
  },
  {
    id: "comment-01",
    author: "Ngọc Linh",
    avatar: "NL",
    color: "violet",
    message: "Góc quay rất rõ, nhìn mặt số ngoài đời đẹp hơn ảnh nhiều!",
    time: "Vừa xong",
    badge: "VIP",
  },
  {
    id: "comment-02",
    author: "Trần Hoàng",
    avatar: "TH",
    color: "blue",
    message: "Cho mình xem kỹ phần dây và khóa được không host ơi?",
    time: "1 phút",
  },
  {
    id: "comment-03",
    author: "Minh Quân",
    avatar: "MQ",
    color: "green",
    message: "Giá đang lên nhanh quá 🔥",
    time: "1 phút",
  },
  {
    id: "comment-04",
    author: "SGDG Host",
    avatar: "SG",
    color: "orange",
    message: "Host sẽ zoom cận cảnh khóa dây ngay sau lượt giá mới này nhé.",
    time: "2 phút",
    badge: "HOST",
    host: true,
  },
  {
    id: "comment-05",
    author: "Bảo Anh",
    avatar: "BA",
    color: "rose",
    message: "Đã kiểm định chống nước chưa ạ?",
    time: "2 phút",
  },
];

const reactions = ["❤", "🔥", "👏"];

const audienceComments: Array<
  Pick<LiveComment, "author" | "avatar" | "color" | "message" | "badge">
> = [
  {
    author: "Tuấn Kiệt",
    avatar: "TK",
    color: "blue",
    message: "Lên giá liên tục rồi, phiên này căng thật! 🔥",
  },
  {
    author: "Hà My",
    avatar: "HM",
    color: "rose",
    message: "Camera zoom đẹp quá, nhìn rõ từng chi tiết luôn 👏",
    badge: "FAN",
  },
  {
    author: "Đức Long",
    avatar: "ĐL",
    color: "green",
    message: "Ai đang giữ top vậy mọi người? Giá chạy nhanh quá!",
  },
  {
    author: "Khánh Vy",
    avatar: "KV",
    color: "violet",
    message: "Tim đập theo từng bước giá luôn ❤️",
    badge: "VIP",
  },
];

function initialBidEvents(auction: Auction): LiveBidEvent[] {
  return [
    {
      id: "seed-bid-01",
      alias: "Min***Anh",
      amount: auction.currentPrice,
      time: "Vừa xong",
    },
    {
      id: "seed-bid-02",
      alias: "Gia***88",
      amount: Math.max(
        auction.startPrice,
        auction.currentPrice - auction.minimumIncrement,
      ),
      time: "12 giây trước",
    },
    {
      id: "seed-bid-03",
      alias: "Huy***SG",
      amount: Math.max(
        auction.startPrice,
        auction.currentPrice - auction.minimumIncrement * 2,
      ),
      time: "31 giây trước",
    },
  ];
}

export function AuctionLivestreamPage() {
  const { auctionId } = useParams();
  const auction = catalogAuctions.find((item) => item.id === auctionId);

  if (!auction) {
    return (
      <main className="container public-auction-live-state">
        <Radio aria-hidden="true" />
        <h1>Không tìm thấy phòng livestream</h1>
        <p>Phiên có thể đã kết thúc hoặc đường dẫn không còn hiệu lực.</p>
        <Link className="button primary" to="/auctions">
          Xem các phiên đấu giá
        </Link>
      </main>
    );
  }

  return <AuctionLivestreamRoom auction={auction} />;
}

function AuctionLivestreamRoom({ auction }: { auction: Auction }) {
  const now = useDemoClock();
  const authenticated = useDemoStore((state) => state.authenticated);
  const userName = useDemoStore((state) => state.userName);
  const [currentPrice, setCurrentPrice] = useState(auction.currentPrice);
  const [bidEvents, setBidEvents] = useState<LiveBidEvent[]>(() =>
    initialBidEvents(auction),
  );
  const [latestBid, setLatestBid] = useState<LiveBidEvent>(() =>
    initialBidEvents(auction)[0],
  );
  const [pricePulse, setPricePulse] = useState(0);
  const [showBidPopup, setShowBidPopup] = useState(false);
  const [comments, setComments] = useState<LiveComment[]>(initialComments);
  const [draft, setDraft] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reactionPulse, setReactionPulse] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef(auction.currentPrice);
  const bidCursorRef = useRef(0);
  const chatCursorRef = useRef(0);
  const popupTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cursor = bidCursorRef.current;
      const amount =
        priceRef.current + auction.minimumIncrement * (1 + (cursor % 2));
      const event: LiveBidEvent = {
        id: `live-bid-${cursor}`,
        alias: bidderAliases[cursor % bidderAliases.length],
        amount,
        time: "Vừa xong",
      };

      bidCursorRef.current += 1;
      priceRef.current = amount;
      setCurrentPrice(amount);
      setLatestBid(event);
      setBidEvents((items) => [event, ...items].slice(0, 8));
      setComments((items) =>
        [
          ...items,
          {
            id: `bid-comment-${cursor}`,
            author: "Bảng giá trực tiếp",
            avatar: "↗",
            color: "orange",
            message: `${event.alias} vừa nâng giá lên ${formatMoney(event.amount)} 🔥`,
            time: "Vừa xong",
            badge: "GIÁ MỚI",
            bidEvent: true,
          },
        ].slice(-24),
      );
      setPricePulse((value) => value + 1);
      setReactionPulse((value) => value + 1);
      setShowBidPopup(true);
      if (popupTimerRef.current !== null) {
        window.clearTimeout(popupTimerRef.current);
      }
      popupTimerRef.current = window.setTimeout(() => {
        setShowBidPopup(false);
        popupTimerRef.current = null;
      }, 2_600);
      window.requestAnimationFrame(() =>
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }, 5_500);

    return () => {
      window.clearInterval(timer);
      if (popupTimerRef.current !== null) {
        window.clearTimeout(popupTimerRef.current);
      }
    };
  }, [auction.minimumIncrement]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cursor = chatCursorRef.current;
      const next = audienceComments[cursor % audienceComments.length];
      chatCursorRef.current += 1;
      setComments((items) =>
        [
          ...items,
          {
            ...next,
            id: `audience-comment-${cursor}`,
            time: "Vừa xong",
          },
        ].slice(-24),
      );
      setReactionPulse((value) => value + 1);
      window.requestAnimationFrame(() =>
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }, 7_200);

    return () => window.clearInterval(timer);
  }, []);

  const livestreamAvailable = isShortLiveAuction(auction, now);

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authenticated) {
      setShowLoginPrompt(true);
      return;
    }
    const message = draft.trim();
    if (!message) return;

    const words = userName.trim().split(/\s+/);
    const avatar = words
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
    setComments((items) => [
      ...items,
      {
        id: `comment-${Date.now()}`,
        author: userName,
        avatar,
        color: "blue",
        message,
        time: "Vừa xong",
      },
    ]);
    setDraft("");
    window.requestAnimationFrame(() =>
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
    );
  }

  function sendReaction(reaction: string) {
    if (!authenticated) {
      setShowLoginPrompt(true);
      return;
    }
    setDraft((value) => `${value}${reaction}`);
    setReactionPulse((value) => value + 1);
  }

  async function openFullscreen() {
    if (!document.fullscreenElement) {
      await playerRef.current?.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  }

  if (!livestreamAvailable) {
    return (
      <main className="container public-auction-live-state">
        <Clock3 aria-hidden="true" />
        <h1>Livestream hiện không phát</h1>
        <p>
          Phòng công khai chỉ mở trong thời gian phiên đấu giá ngắn đang diễn
          ra.
        </p>
        <Link className="button primary" to={`/auctions/${auction.id}`}>
          Xem thông tin phiên
        </Link>
      </main>
    );
  }

  return (
    <main className="public-auction-live-page">
      <div className="container public-auction-live-shell">
        <nav className="public-live-breadcrumb" aria-label="Điều hướng livestream">
          <Link to="/">
            <ArrowLeft aria-hidden="true" /> Trang chủ
          </Link>
          <span>/</span>
          <Link to={`/auctions/${auction.id}`}>{auction.code}</Link>
          <span>/</span>
          <strong>Livestream</strong>
        </nav>

        <header className="public-live-room-header">
          <div>
            <span className="public-live-room-kicker">
              <span aria-hidden="true" /> Đang phát trực tiếp
            </span>
            <h1>{auction.assetName}</h1>
            <p>
              <span>{auction.code}</span>
              <span>{auction.category}</span>
              <span>
                Thời lượng {formatLivestreamDuration(auction.startsAt, auction.endsAt)}
              </span>
            </p>
          </div>
          <div className="public-live-header-actions">
            <span className="public-live-guest-note">
              <Eye aria-hidden="true" />
              {authenticated ? `Xin chào, ${userName}` : "Đang xem với tư cách khách"}
            </span>
            <Link className="button primary" to={`/auctions/${auction.id}/live`}>
              <Gavel aria-hidden="true" />
              {authenticated ? "Đấu giá ngay" : "Đăng nhập để đấu giá"}
            </Link>
          </div>
        </header>

        <section className="public-live-room-layout">
          <div className="public-live-main-column">
            <div
              ref={playerRef}
              className={paused ? "public-live-player paused" : "public-live-player"}
            >
              <img src={auction.image} alt={`Hình ảnh trực tiếp ${auction.assetName}`} />
              <div className="public-live-player-shade" aria-hidden="true" />
              <div className="public-live-energy-line" aria-hidden="true" />

              <div className="public-live-player-top">
                <span className="public-live-onair">
                  <Radio aria-hidden="true" /> LIVE
                </span>
                <span>
                  <Eye aria-hidden="true" />
                  {(auction.watcherCount + 128).toLocaleString("vi-VN")}
                </span>
                <span>
                  <Users aria-hidden="true" />
                  {auction.participantCount} đang đấu
                </span>
              </div>

              <div className="public-live-host-chip">
                <span>
                  <Mic2 aria-hidden="true" />
                </span>
                <div>
                  <strong>
                    SGDG Live Studio <BadgeCheck aria-label="Đã xác minh" />
                  </strong>
                  <small>Camera sản phẩm · Trực tiếp tại phòng kiểm định</small>
                </div>
              </div>

              <div className="public-live-hype-ticker" aria-label="Hoạt động nổi bật">
                <span>
                  <Flame aria-hidden="true" />
                  {auction.acceptedBidCount + pricePulse} lượt giá hợp lệ
                </span>
                <span>
                  <TrendingUp aria-hidden="true" /> Giá đang tăng nhanh
                </span>
                <span>
                  <Heart aria-hidden="true" /> {auction.heatScore}% yêu thích
                </span>
              </div>

              {showBidPopup && (
                <div className="public-live-bid-pop" key={pricePulse}>
                  <span>
                    <Sparkles aria-hidden="true" /> GIÁ MỚI
                  </span>
                  <strong>{latestBid.alias}</strong>
                  <b>{formatMoney(latestBid.amount)}</b>
                </div>
              )}

              <div className="public-live-bid-rain" aria-label="Giá mới gần đây">
                {bidEvents.slice(0, 3).map((event, index) => (
                  <div key={event.id} style={{ opacity: 1 - index * 0.2 }}>
                    <span>
                      <Gavel aria-hidden="true" /> {event.alias}
                    </span>
                    <strong>{formatMoney(event.amount)}</strong>
                  </div>
                ))}
              </div>

              <div className="public-live-floating-hearts" key={reactionPulse} aria-hidden="true">
                <span>❤</span>
                <span>🔥</span>
                <span>❤</span>
              </div>

              {paused && (
                <div className="public-live-paused-message">
                  <Play aria-hidden="true" />
                  <strong>Hình ảnh đang tạm dừng</strong>
                  <span>Giá đấu vẫn được cập nhật theo thời gian thực</span>
                </div>
              )}

              <div className="public-live-player-bottom">
                <div className="public-live-current-price">
                  <span>
                    <TrendingUp aria-hidden="true" /> Giá đang dẫn
                  </span>
                  <strong key={`price-${pricePulse}`}>{formatMoney(currentPrice)}</strong>
                  <small>
                    Bước giá tối thiểu {formatMoney(auction.minimumIncrement)}
                  </small>
                  <b className="public-live-bid-streak">
                    <Flame aria-hidden="true" /> Chuỗi {8 + pricePulse} lượt giá liên tiếp
                  </b>
                </div>
                <div className="public-live-player-controls">
                  <button
                    type="button"
                    aria-label={paused ? "Tiếp tục hình ảnh" : "Tạm dừng hình ảnh"}
                    onClick={() => setPaused((value) => !value)}
                  >
                    {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
                    onClick={() => setMuted((value) => !value)}
                  >
                    {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                  </button>
                  <button type="button" aria-label="Xem toàn màn hình" onClick={openFullscreen}>
                    <Maximize2 aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <div className="public-live-auction-strip">
              <div className="public-live-price-card">
                <span>Giá chính thức hiện tại</span>
                <strong>{formatMoney(currentPrice)}</strong>
                <small>Giá khởi điểm {formatMoney(auction.startPrice)}</small>
              </div>
              <div className="public-live-time-card">
                <Flame aria-hidden="true" />
                <div>
                  <span>Phiên đang rất sôi động</span>
                  <AuctionStatus auction={auction} showBadge={false} />
                </div>
              </div>
              <div className="public-live-secure-card">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <strong>Minh bạch & an toàn</strong>
                  <span>Mọi lượt giá được xác thực trong phòng đấu giá.</span>
                </div>
              </div>
              <Link className="button primary" to={`/auctions/${auction.id}/live`}>
                <Gavel aria-hidden="true" />
                {authenticated ? "Đặt giá ngay" : "Đăng nhập & đặt giá"}
              </Link>
            </div>
          </div>

          <aside className="public-live-chat" aria-label="Bình luận livestream">
            <header>
              <div>
                <MessageCircle aria-hidden="true" />
                <div>
                  <h2>Bình luận trực tiếp</h2>
                  <span>{(auction.watcherCount + 128).toLocaleString("vi-VN")} người đang xem</span>
                </div>
              </div>
              <span className="public-live-chat-online">
                <span aria-hidden="true" /> LIVE
              </span>
            </header>

            <div className="public-live-chat-energy">
              <div className="public-live-active-viewers" aria-hidden="true">
                <span>NL</span>
                <span>TH</span>
                <span>MQ</span>
                <span>+{auction.participantCount}</span>
              </div>
              <p>
                <strong>Chat đang tăng nhiệt</strong>
                Comment mới liên tục
              </p>
              <span className="public-live-hot-label">
                <Flame aria-hidden="true" /> SÔI ĐỘNG
              </span>
            </div>

            <div className="public-live-pinned-comment">
              <span>📌</span>
              <p>
                <strong>SGDG:</strong> Không chia sẻ thông tin cá nhân trong
                bình luận. Giá chính thức nằm trong phòng đấu giá.
              </p>
            </div>

            <div className="public-live-comments" aria-live="polite">
              {comments.map((comment) => (
                <article
                  className={`${comment.host ? "host" : ""} ${comment.bidEvent ? "bid-event" : ""}`}
                  key={comment.id}
                >
                  <span className={`public-live-avatar ${comment.color}`}>
                    {comment.avatar}
                  </span>
                  <div>
                    <p className="public-live-comment-meta">
                      <strong>{comment.author}</strong>
                      {comment.badge && <b>{comment.badge}</b>}
                      <time>{comment.time}</time>
                    </p>
                    <p>{comment.message}</p>
                  </div>
                </article>
              ))}
              <div ref={chatEndRef} />
            </div>

            {showLoginPrompt && !authenticated && (
              <div className="public-live-login-prompt" role="status">
                <LockKeyhole aria-hidden="true" />
                <p>
                  <strong>Đăng nhập để tham gia trò chuyện</strong>
                  Bạn vẫn có thể tiếp tục xem livestream miễn phí.
                </p>
                <Link
                  to="/auth/login"
                  state={{ from: `/auctions/${auction.id}/livestream` }}
                >
                  Đăng nhập
                </Link>
              </div>
            )}

            <form className="public-live-chat-composer" onSubmit={submitComment}>
              <div className="public-live-reactions">
                {reactions.map((reaction) => (
                  <button
                    key={reaction}
                    type="button"
                    aria-label={`Gửi cảm xúc ${reaction}`}
                    onClick={() => sendReaction(reaction)}
                  >
                    {reaction}
                  </button>
                ))}
                <span>
                  <Heart aria-hidden="true" /> {auction.heatScore}% yêu thích
                </span>
              </div>
              <label>
                <span className="sr-only">Viết bình luận</span>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={authenticated ? "Viết bình luận..." : "Đăng nhập để bình luận..."}
                />
                <button type="submit" aria-label="Gửi bình luận">
                  <Send aria-hidden="true" />
                </button>
              </label>
            </form>
          </aside>
        </section>
      </div>
    </main>
  );
}
