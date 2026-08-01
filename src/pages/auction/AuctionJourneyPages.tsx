import {
  Activity,
  Check,
  Clock3,
  Eye,
  Gavel,
  Radio,
  RefreshCw,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { auctions } from "../../services/mock/auctionService";
import { formatMoney } from "../../utils/format";
import { formatDuration, useDemoClock } from "../../hooks/useDemoClock";
import { validateBid } from "../../utils/bidding";
import { NotFoundPage } from "../NotFoundPage";

const participants = Array.from({ length: 20 }, (_, i) => ({
  alias: `${["Mi", "An", "Qu", "Ha", "Tu"][i % 5]}***${String.fromCharCode(65 + i)}`,
  joined: `${9 + Math.floor(i / 4)}:${String((i * 7) % 60).padStart(2, "0")}`,
  bids: Math.max(1, 18 - i),
  activity: Math.max(42, 96 - i * 2),
  latest: 450000000 - i * 5000000,
  online: i < 14,
}));

export function RegistrationPage() {
  const { auctionId } = useParams();
  const auction = auctions.find((x) => x.id === auctionId);
  const [step, setStep] = useState(0);
  if (!auction) return <NotFoundPage />;
  const labels = [
    "Tài khoản",
    "KYC",
    "Hồ sơ",
    "Quy chế",
    "Tiền đặt trước",
    "Kết quả",
  ];
  return (
    <JourneyPage
      title="Đăng ký tham gia"
      subtitle={`${auction.code} · ${auction.assetName}`}
    >
      <div className="registration-steps">
        {labels.map((x, i) => (
          <div className={i <= step ? "active" : ""} key={x}>
            <span>{i < step ? <Check /> : i + 1}</span>
            <strong>{x}</strong>
          </div>
        ))}
      </div>
      <section className="journey-card wizard-card">
        <Badge tone={step === 5 ? "success" : "info"}>BƯỚC {step + 1}/6</Badge>
        <h2>{labels[step]}</h2>
        <p>
          {
            [
              "Tài khoản đang hoạt động và không có hạn chế tham gia.",
              "KYC đã được xác minh, thông tin định danh còn hiệu lực.",
              "Tải và kiểm tra các tài liệu bắt buộc của phiên.",
              "Đọc, chấp thuận quy chế và cam kết đặt giá.",
              "Xác nhận khoản tiền đặt trước 50.000.000 ₫.",
              "Bạn đã đủ điều kiện tham gia phiên đấu giá.",
            ][step]
          }
        </p>
        {step === 2 && (
          <label className="upload-box">
            <input type="file" />
            <span>Tải hồ sơ chứng minh năng lực tham gia</span>
          </label>
        )}
        {step === 3 && (
          <label className="check-row">
            <input type="checkbox" required /> Tôi đã đọc và chấp thuận toàn bộ
            quy chế phiên.
          </label>
        )}
        <div className="wizard-actions">
          <button
            className="button secondary"
            disabled={step === 0}
            onClick={() => setStep((x) => x - 1)}
          >
            Quay lại
          </button>
          {step < 5 ? (
            <button
              className="button primary"
              onClick={() => setStep((x) => x + 1)}
            >
              Xác nhận và tiếp tục
            </button>
          ) : (
            <Link
              className="button primary"
              to={`/auctions/${auction.id}/live`}
            >
              Vào phòng đấu giá
            </Link>
          )}
        </div>
      </section>
    </JourneyPage>
  );
}

export function LiveRoomPage() {
  const { auctionId } = useParams();
  const auction = auctions.find((x) => x.id === auctionId);
  const [price, setPrice] = useState(auction?.currentPrice ?? 0);
  const [amount, setAmount] = useState(
    (auction?.currentPrice ?? 0) + (auction?.minimumIncrement ?? 0),
  );
  const [autoMax, setAutoMax] = useState("");
  const [autoActive, setAutoActive] = useState(false);
  const [connection, setConnection] = useState<"ONLINE" | "RECONNECTING">(
    "ONLINE",
  );
  const [notice, setNotice] = useState("Bạn đang ở vị trí dẫn đầu.");
  const [feed, setFeed] = useState([
    "Mi***A đặt giá 445.000.000 ₫",
    "Bạn đặt giá 450.000.000 ₫",
    "An***B vừa tham gia phiên",
  ]);
    const now = useDemoClock();
  if (!auction) return <NotFoundPage />;
  const increment = auction.minimumIncrement;
  function bid(e: FormEvent) {
    e.preventDefault();
    const error = validateBid({
      amount,
      currentPrice: price,
      minimumIncrement: increment,
      eligible: true,
      status: connection === "ONLINE" ? "LIVE" : "PAUSED",
    });
    if (error) {
      setNotice(error);
      return;
    }
    setPrice(amount);
    setAmount(amount + increment);
    setNotice("Bid đã được chấp nhận. Bạn đang dẫn đầu.");
    setFeed((x) => [`Bạn đặt giá ${formatMoney(amount)}`, ...x].slice(0, 20));
  }
  function reconnect() {
    setConnection("RECONNECTING");
    setNotice("Đang kết nối lại và đồng bộ dữ liệu…");
    window.setTimeout(() => {
      setConnection("ONLINE");
      setNotice("Đồng bộ hoàn tất. Dữ liệu đã mới.");
    }, 1200);
  }
  return (
    <div className="live-room">
      <div className="live-topbar container">
        <div>
          <Badge tone="brand">ĐANG DIỄN RA</Badge>
          <strong>{auction.assetName}</strong>
        </div>
        <div>
          <span>
            <Clock3 /> Server {new Date(now).toLocaleTimeString("vi-VN")}
          </span>
          <Badge tone={connection === "ONLINE" ? "success" : "warning"}>
            {connection === "ONLINE" ? (
              <>
                <Wifi /> Trực tuyến
              </>
            ) : (
              <>
                <RefreshCw /> Đang đồng bộ
              </>
            )}
          </Badge>
          <button
            className="button ghost"
            onClick={reconnect}
            aria-label="Mô phỏng kết nối lại"
          >
            <WifiOff />
          </button>
        </div>
      </div>
      {connection === "RECONNECTING" && (
        <div className="resync-banner" role="status">
          Đang kết nối lại — chức năng đặt giá tạm khóa trong lúc đồng bộ.
        </div>
      )}
      <div className="container live-layout">
        <main>
          <section className="live-focus">
            <div>
              <span>Giá hiện tại</span>
              <strong>{formatMoney(price)}</strong>
              <small>
                Bid hợp lệ tiếp theo:{" "}
                {formatMoney(price + auction.minimumIncrement)}
              </small>
            </div>
            <div className="countdown-block">
              <span>Còn lại</span>
              <strong>{formatDuration(auction.endsAt, now)}</strong>
              <small>Dữ liệu cập nhật vừa xong</small>
            </div>
          </section>
          <div className="live-metrics">
            <Metric
              icon={<Users />}
              value={auction.participantCount}
              label="Người tham gia"
            />
            <Metric
              icon={<Eye />}
              value={auction.watcherCount}
              label="Đang xem"
            />
            <Metric
              icon={<Gavel />}
              value={auction.acceptedBidCount + feed.length}
              label="Bid hợp lệ"
            />
            <Metric
              icon={<Activity />}
              value={`${auction.heatScore}%`}
              label="Rất sôi động"
            />
          </div>
          <div className="bid-grid">
            <form className="journey-card bid-panel" onSubmit={bid}>
              <Badge tone="brand">MANUAL BID</Badge>
              <h2>Đặt giá thủ công</h2>
              <label>
                Mức giá của bạn
                <input
                  type="number"
                  value={amount}
                  step={auction.minimumIncrement}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
              <small>Bước giá {formatMoney(auction.minimumIncrement)}</small>
              <button
                disabled={connection !== "ONLINE"}
                className="button primary"
              >
                Xác nhận đặt giá
              </button>
            </form>
            <form
              className="journey-card bid-panel"
              onSubmit={(e) => {
                e.preventDefault();
                setAutoActive(true);
                setNotice(
                  "Auto Bid đã được kích hoạt. Mức tối đa được bảo mật.",
                );
              }}
            >
              <Badge tone={autoActive ? "success" : "info"}>
                {autoActive ? "AUTO BID ĐANG HOẠT ĐỘNG" : "AUTO BID"}
              </Badge>
              <h2>Đặt giá tự động</h2>
              <label>
                Mức tối đa riêng tư
                <input
                  type="number"
                  value={autoMax}
                  onChange={(e) => setAutoMax(e.target.value)}
                  min={price + auction.minimumIncrement}
                />
              </label>
              <small>Không hiển thị mức tối đa cho người khác.</small>
              <button
                disabled={connection !== "ONLINE" || !autoMax}
                className="button secondary"
              >
                {autoActive ? "Cập nhật Auto Bid" : "Kích hoạt Auto Bid"}
              </button>
            </form>
          </div>
          <div className="live-notice" aria-live="polite">
            {notice}
          </div>
        </main>
        <aside>
          <section className="journey-card">
            <div className="panel-title">
              <h2>Leaderboard</h2>
              <Link to={`/auctions/${auction.id}/participants`}>
                Xem tất cả
              </Link>
            </div>
            <div className="leaderboard">
              {participants.slice(0, 5).map((p, i) => (
                <div key={p.alias}>
                  <span>#{i + 1}</span>
                  <strong>{i === 0 ? "Bạn" : p.alias}</strong>
                  <small>{formatMoney(i === 0 ? price : p.latest)}</small>
                </div>
              ))}
            </div>
          </section>
          <section className="journey-card feed">
            <h2>Hoạt động trực tiếp</h2>
            {feed.map((x, i) => (
              <div key={`${x}-${i}`}>
                <Radio />
                <span>{x}</span>
                <time>vừa xong</time>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

export function ParticipantsPage() {
  const { auctionId } = useParams();
  const auction = auctions.find((x) => x.id === auctionId);
  const [sort, setSort] = useState("activity");
  const rows = useMemo(
    () =>
      [...participants].sort((a, b) =>
        sort === "joined"
          ? b.joined.localeCompare(a.joined)
          : sort === "bids"
            ? b.bids - a.bids
            : b.activity - a.activity,
      ),
    [sort],
  );
  if (!auction) return <NotFoundPage />;
  return (
    <JourneyPage
      title="Người tham gia phiên"
      subtitle={`${auction.code} · Danh tính công khai được bảo vệ bằng alias`}
    >
      <div className="live-metrics">
        <Metric icon={<Users />} value={20} label="Tổng tham gia" />
        <Metric icon={<Wifi />} value={14} label="Đang trực tuyến" />
        <Metric
          icon={<Gavel />}
          value={auction.acceptedBidCount}
          label="Bid hợp lệ"
        />
        <Metric
          icon={<Zap />}
          value={`${auction.heatScore}%`}
          label="Rất sôi động"
        />
      </div>
      <div className="table-toolbar">
        <strong>Danh sách công khai</strong>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="activity">Sôi động nhất</option>
          <option value="joined">Mới tham gia</option>
          <option value="bids">Nhiều bid nhất</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Hạng</th>
              <th>Alias</th>
              <th>Tham gia</th>
              <th>Trạng thái</th>
              <th>Bid hợp lệ</th>
              <th>Điểm hoạt động</th>
              <th>Bid gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.alias}>
                <td>#{i + 1}</td>
                <td>
                  <strong>{p.alias}</strong>
                </td>
                <td>{p.joined}</td>
                <td>
                  <Badge tone={p.online ? "success" : "neutral"}>
                    {p.online ? "Trực tuyến" : "Ngoại tuyến"}
                  </Badge>
                </td>
                <td>{p.bids}</td>
                <td>{p.activity}%</td>
                <td>{formatMoney(p.latest)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </JourneyPage>
  );
}

export function MyBidsPage() {
  return (
    <JourneyPage
      title="Lượt trả giá của tôi"
      subtitle="Theo dõi lịch sử trả giá theo thời gian hệ thống và mức trả giá tự động của bạn."
    >
      <div className="journey-card auto-summary">
        <div>
          <Badge tone="success">TRẢ GIÁ TỰ ĐỘNG ĐANG HOẠT ĐỘNG</Badge>
          <h2>Rolex Submariner Date</h2>
          <p>
            Mức tối đa của bạn: <strong>{formatMoney(500000000)}</strong>
          </p>
        </div>
        <Link className="button secondary" to="/auctions/rolex-126610lv/live">
          Quản lý trả giá tự động
        </Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Thời gian hệ thống</th>
              <th>Phiên</th>
              <th>Hình thức</th>
              <th>Mức giá</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["10:42:18", "SGD-260717-001", "Thủ công", 450000000, "ACCEPTED"],
              ["10:39:02", "SGD-260717-001", "Tự động", 440000000, "OUTBID"],
              ["10:34:46", "SGD-260717-001", "Thủ công", 420000000, "ACCEPTED"],
              [
                "09:12:11",
                "SGD-260719-004",
                "Thủ công",
                2000000000,
                "REJECTED",
              ],
            ].map((x) => (
              <tr key={String(x[0])}>
                <td>{x[0]}</td>
                <td>{x[1]}</td>
                <td>{x[2]}</td>
                <td>{formatMoney(Number(x[3]))}</td>
                <td>
                  <Badge
                    tone={
                      x[4] === "ACCEPTED"
                        ? "success"
                        : x[4] === "OUTBID"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {x[4] === "ACCEPTED"
                      ? "Đã ghi nhận"
                      : x[4] === "OUTBID"
                        ? "Đã bị vượt"
                        : "Bị từ chối"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </JourneyPage>
  );
}

function JourneyPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="container page-shell">
      <div className="page-heading">
        <span className="eyebrow">HÀNH TRÌNH ĐẤU GIÁ</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div>
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
