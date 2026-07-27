import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { catalogAuctions } from "../../services/mock/auctionService";
import {
  canEnterAuction,
  useEligibilityWorkflowStore,
} from "../../store/eligibilityWorkflowStore";
import { formatMoney } from "../../utils/format";
import "../../styles/pre-live-waiting-room.css";

const scenarios = [
  "waiting",
  "under-5m",
  "eligibility-pending",
  "eligibility-revoked",
  "insufficient-participants",
  "rescheduled",
  "paused-before-open",
  "open",
] as const;
type Scenario = (typeof scenarios)[number];
const parse = (value: string | null): Scenario =>
  scenarios.includes(value as Scenario) ? (value as Scenario) : "waiting";
const start = "20:00, 18/07/2026 (GMT+7)";
const end = "21:30, 18/07/2026 (GMT+7)";
const rule = "QD-2026.07";
const config: Record<
  Scenario,
  {
    title: string;
    badge: string;
    copy: string;
    seconds: number;
    tone: string;
    reason?: string;
  }
> = {
  waiting: {
    title: "Phiên đấu giá sắp bắt đầu",
    badge: "ĐANG CHỜ MỞ PHIÊN",
    copy: "Bạn đã vào phòng chờ. Hãy kiểm tra trạng thái sẵn sàng và chờ đến khi phiên chính thức mở.",
    seconds: 1122,
    tone: "waiting",
    reason: "Bạn có thể vào phòng khi phiên chính thức mở.",
  },
  "under-5m": {
    title: "Phiên sẽ bắt đầu trong ít phút",
    badge: "SẮP MỞ PHIÊN",
    copy: "Hãy giữ trang này mở và hoàn tất kiểm tra sẵn sàng.",
    seconds: 270,
    tone: "warning",
    reason: "Phiên sẽ mở sau khi countdown kết thúc.",
  },
  "eligibility-pending": {
    title: "Điều kiện tham gia đang được cập nhật",
    badge: "ĐANG KIỂM TRA ĐIỀU KIỆN",
    copy: "Eligibility đang được tổng hợp trước khi phiên mở.",
    seconds: 1122,
    tone: "warning",
    reason: "Bạn chỉ có thể vào phòng khi điều kiện tham gia được xác nhận.",
  },
  "eligibility-revoked": {
    title: "Điều kiện tham gia không còn hiệu lực",
    badge: "ĐIỀU KIỆN ĐÃ BỊ THU HỒI",
    copy: "Điều kiện tham gia đã thay đổi sau quyết định trước đó.",
    seconds: 1122,
    tone: "error",
    reason: "Điều kiện tham gia đã thay đổi sau quyết định trước đó.",
  },
  "insufficient-participants": {
    title: "Phiên đang chờ đủ số người tham gia",
    badge: "CHƯA ĐỦ ĐIỀU KIỆN MỞ PHIÊN",
    copy: "Điều kiện cá nhân của bạn vẫn hợp lệ, nhưng phiên chưa thể mở bidding.",
    seconds: 1122,
    tone: "warning",
    reason: "Phiên chưa đủ số người tham gia tối thiểu để mở bidding.",
  },
  rescheduled: {
    title: "Phiên đấu giá đã được dời lịch",
    badge: "ĐÃ ĐỔI THỜI GIAN BẮT ĐẦU",
    copy: "Countdown đã được cập nhật theo lịch mới.",
    seconds: 3720,
    tone: "warning",
    reason: "Phiên đã được dời lịch. Vui lòng chờ đến thời gian bắt đầu mới.",
  },
  "paused-before-open": {
    title: "Phiên đang tạm dừng trước khi mở",
    badge: "TẠM DỪNG",
    copy: "Phiên chưa mở bidding. Vui lòng chờ thông báo tiếp theo.",
    seconds: 0,
    tone: "error",
    reason: "Phiên đang tạm dừng trước thời điểm mở.",
  },
  open: {
    title: "Phiên đấu giá đã mở",
    badge: "BIDDING ĐANG MỞ",
    copy: "Phòng đấu giá đã sẵn sàng. Hãy vào phòng để theo dõi giá chính thức.",
    seconds: 0,
    tone: "success",
  },
};

function Countdown({
  seconds,
  onOpen,
}: {
  seconds: number;
  onOpen: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!left) return;
    const id = window.setInterval(
      () =>
        setLeft((value) => {
          if (value <= 1) {
            window.clearInterval(id);
            onOpen();
            return 0;
          }
          return value - 1;
        }),
      1000,
    );
    return () => window.clearInterval(id);
  }, [left, onOpen]);
  const parts = [
    Math.floor(left / 3600),
    Math.floor(left / 60) % 60,
    left % 60,
  ];
  return (
    <div
      className="waiting-countdown"
      aria-label={`Còn ${parts.join(" giờ ")}`}
    >
      <div>
        {left ? (
          parts.map((part, index) => (
            <span key={index}>
              <b>{String(part).padStart(2, "0")}</b>
              <small>{["GIỜ", "PHÚT", "GIÂY"][index]}</small>
            </span>
          ))
        ) : (
          <strong>PHIÊN ĐÃ BẮT ĐẦU</strong>
        )}
      </div>
      <p>Bắt đầu lúc {start}</p>
    </div>
  );
}

export function PreLiveWaitingRoomPage() {
  const { auctionId } = useParams();
  const [params, setParams] = useSearchParams();
  const [localOpen, setLocalOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const auction = catalogAuctions.find((item) => item.id === auctionId);
  const registration = useEligibilityWorkflowStore((store) =>
    store.registrations.find((item) => item.auctionId === auctionId),
  );
  const queryScenario = parse(params.get("scenario"));
  const scenario: Scenario = localOpen ? "open" : queryScenario;
  const model = config[scenario];
  const projection = params.get("projection");
  const goOpen = () => setLocalOpen(true);
  const retry = () => setParams({ scenario: queryScenario });
  const open = scenario === "open";
  const blocked =
    (registration ? !canEnterAuction(registration) : false) ||
    [
      "eligibility-pending",
      "eligibility-revoked",
      "insufficient-participants",
      "rescheduled",
      "paused-before-open",
    ].includes(scenario);
  const readiness = useMemo(
    () => [
      [
        "Điều kiện tham gia",
        scenario === "eligibility-pending"
          ? "Đang cập nhật"
          : scenario === "eligibility-revoked"
            ? "Đã bị thu hồi"
            : "Đã được xác nhận",
        "Eligibility hiện hợp lệ tại snapshot gần nhất.",
        "ELG-•••-260718",
      ],
      [
        "Quy tắc phiên",
        "Đã đọc phiên bản hiện tại",
        `Phiên sử dụng ${rule}.`,
        rule,
      ],
      [
        "Trình duyệt mô phỏng",
        "Sẵn sàng",
        "Môi trường prototype có thể hiển thị phòng đấu giá.",
        "Mô phỏng",
      ],
      [
        "Kết nối mô phỏng",
        "Ổn định",
        "Đây là fixture frontend, không phải đo mạng thực tế.",
        "Mô phỏng",
      ],
      [
        "Trạng thái phiên",
        open ? "Đã mở" : "Đang chờ mở",
        open
          ? "Bidding đã sẵn sàng."
          : "Chờ đến khi phiên chuyển sang trạng thái mở.",
        "Auction Management Mock",
      ],
    ],
    [scenario, open],
  );
  if (!auction)
    return (
      <main className="waiting-room-page waiting-state">
        <h1>Không tìm thấy phòng chờ</h1>
        <p>
          Phiên đấu giá không tồn tại hoặc bạn chưa có quyền truy cập phòng chờ
          này.
        </p>
        <Link className="button primary" to="/auctions">
          Quay lại danh sách phiên đấu giá
        </Link>
      </main>
    );
  if (projection === "error")
    return (
      <main className="waiting-room-page waiting-state">
        <XCircle />
        <h1>Chưa thể tải phòng chờ</h1>
        <p>Dữ liệu mô phỏng tạm thời chưa sẵn sàng. Vui lòng thử lại.</p>
        <div>
          <button className="button primary" onClick={retry}>
            Thử lại
          </button>
          <Link className="button secondary" to={`/auctions/${auction.id}`}>
            Quay lại chi tiết phiên
          </Link>
        </div>
      </main>
    );
  if (projection === "loading")
    return (
      <main className="waiting-room-page waiting-loading" aria-busy="true">
        <div />
        <section className="container">
          <i />
          <i />
          <i />
          <i />
        </section>
      </main>
    );
  return (
    <main className={`waiting-room-page tone-${model.tone}`}>
      <section className="waiting-hero">
        <div className="container">
          <div>
            <p>PHÒNG CHỜ PHIÊN ĐẤU GIÁ</p>
            <span>
              <Clock3 />
              {model.badge}
            </span>
            <h1>{model.title}</h1>
            <p className="waiting-copy">{model.copy}</p>
            <small>
              {auction.assetName} · {auction.code}
            </small>
            <Countdown
              key={model.seconds}
              seconds={model.seconds}
              onOpen={goOpen}
            />
          </div>
          <img src={auction.image} alt="" />
        </div>
      </section>
      <div className="container waiting-grid">
        <div>
          <section className="session-banner">
            <CircleAlert />
            <div>
              <h2>
                {open
                  ? "Phòng đấu giá đã sẵn sàng"
                  : scenario === "under-5m"
                    ? "Phiên sẽ bắt đầu trong ít phút"
                    : "Phiên đang chờ mở"}
              </h2>
              <p>
                {open
                  ? "Nhấn “Vào phòng đấu giá” để tiếp tục."
                  : model.reason ||
                    "Bạn có thể vào phòng đấu giá khi countdown kết thúc và phiên chuyển sang trạng thái mở."}
              </p>
            </div>
          </section>
          {scenario === "insufficient-participants" && (
            <section className="session-banner">
              <CircleAlert />
              <div>
                <h2>Phiên chưa đủ số người tham gia tối thiểu</h2>
                <p>
                  3 / 5 người tham gia tối thiểu. Đây là quyết định cấp phiên,
                  không phải điều kiện cá nhân.
                </p>
              </div>
            </section>
          )}
          <section className="readiness-card">
            <p>SẴN SÀNG THAM GIA</p>
            <h2>Checklist trước khi vào phiên</h2>
            {readiness.map(([label, status, description, reference]) => (
              <article key={label}>
                <CheckCircle2 />
                <div>
                  <h3>
                    {label}
                    <span>{status}</span>
                  </h3>
                  <p>{description}</p>
                  <small>Tham chiếu: {reference} · Chỉ đọc / Mô phỏng</small>
                </div>
              </article>
            ))}
          </section>
          <section className="rule-card">
            <p>THÔNG TIN PHIÊN</p>
            <h2>Quy tắc và bước giá</h2>
            <dl>
              <div>
                <dt>Giá khởi điểm</dt>
                <dd>{formatMoney(auction.startPrice)}</dd>
              </div>
              <div>
                <dt>Bước giá tối thiểu</dt>
                <dd>{formatMoney(auction.minimumIncrement)}</dd>
              </div>
              <div>
                <dt>Bắt đầu</dt>
                <dd>{start}</dd>
              </div>
              <div>
                <dt>Kết thúc dự kiến</dt>
                <dd>{end}</dd>
              </div>
            </dl>
            <p>
              Nếu có bid hợp lệ trong 5 phút cuối, thời gian kết thúc được gia
              hạn theo quy tắc mô phỏng. Rank 1 chưa phải Final Winner.
            </p>
          </section>
          <section className="timeline-card">
            <p>CẬP NHẬT PHIÊN</p>
            <h2>Dòng thời gian</h2>
            <ol>
              {[
                ["19:30", "Phòng chờ được mở"],
                ["19:35", "Eligibility snapshot được xác nhận"],
                ["19:40", "Rule version được khóa"],
                ["19:45", "Trạng thái thiết bị mô phỏng sẵn sàng"],
                [
                  "20:00",
                  open ? "BIDDING_OPEN" : "Thời điểm dự kiến mở bidding",
                ],
              ].map(([time, event]) => (
                <li key={time}>
                  <time>
                    {time}
                    <small>GMT+7</small>
                  </time>
                  <span>
                    {event}
                    <small>Auction Management Mock · Chỉ đọc</small>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside>
          <section className="auction-mini">
            <img src={auction.image} alt={auction.assetName} />
            <span>{model.badge}</span>
            <p>TRANG SỨC · {auction.code}</p>
            <h2>{auction.assetName}</h2>
            <dl>
              <div>
                <dt>Giá khởi điểm</dt>
                <dd>{formatMoney(auction.startPrice)}</dd>
              </div>
              <div>
                <dt>Bước giá</dt>
                <dd>{formatMoney(auction.minimumIncrement)}</dd>
              </div>
              <div>
                <dt>Quy tắc</dt>
                <dd>{rule}</dd>
              </div>
            </dl>
            <Link to={`/auctions/${auction.id}`}>Xem chi tiết phiên</Link>
          </section>
          <section className="device-card">
            <h2>Thiết bị và môi trường mô phỏng</h2>
            <p>Âm thanh thông báo · Sẵn sàng</p>
            <p>Trình duyệt · Tương thích mô phỏng</p>
            <p>Kết nối · Ổn định theo fixture</p>
            <button
              className="button secondary"
              disabled={checking}
              onClick={() => {
                setChecking(true);
                window.setTimeout(() => setChecking(false), 600);
              }}
            >
              <RefreshCw />
              {checking ? "Đang kiểm tra..." : "Kiểm tra lại"}
            </button>
            <small>
              Kết quả chỉ phục vụ prototype, không phải chẩn đoán thiết bị hoặc
              mạng thực tế.
            </small>
          </section>
          <section className="waiting-cta">
            <h2>{open ? "Phiên đã mở" : "Chờ phiên mở"}</h2>
            <p>
              {open
                ? "Hãy vào phòng để theo dõi giá chính thức."
                : model.reason}
            </p>
            {open ? (
              <Link
                className="button primary"
                to={`/auctions/${auction.id}/live`}
              >
                Vào phòng đấu giá
              </Link>
            ) : (
              <button className="button primary" disabled>
                Vào phòng đấu giá
              </button>
            )}
            {blocked &&
            (scenario === "eligibility-pending" ||
              scenario === "eligibility-revoked") ? (
              <Link
                className="button secondary"
                to={`/auctions/${auction.id}/eligibility?scenario=${scenario === "eligibility-pending" ? "pending" : "revoked"}`}
              >
                Xem trạng thái điều kiện
              </Link>
            ) : (
              <Link className="button secondary" to={`/auctions/${auction.id}`}>
                Xem chi tiết phiên
              </Link>
            )}
          </section>
          {params.get("demo") === "1" && (
            <section className="demo-controls">
              <strong>Điều khiển mô phỏng</strong>
              <button onClick={goOpen}>Tua đến giờ mở</button>
              <button onClick={() => setLocalOpen(false)}>
                Đặt lại đồng hồ
              </button>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
