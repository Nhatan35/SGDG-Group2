import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Info,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Dialog } from "../../components/common/Dialog";
import { catalogAuctions } from "../../services/mock/auctionService";
import {
  canEnterAuction,
  useEligibilityWorkflowStore,
} from "../../store/eligibilityWorkflowStore";
import { formatMoney } from "../../utils/format";
import "../../styles/eligibility-status.css";

const scenarios = [
  "approved",
  "pending",
  "manual-review",
  "rejected",
  "revoked",
  "timeout",
  "insufficient-participants",
] as const;
type Scenario = (typeof scenarios)[number];
const updated = "09:05, 18/07/2026 (GMT+7)";
const snapshot = "18/07/2026, 09:00 (GMT+7)";
const deadline = "19/07/2026, 17:00 (GMT+7)";
const startsAt = "20/07/2026, 09:00 (GMT+7)";
const rule = "QD-2026.07";
const scenarioOf = (value: string | null): Scenario =>
  scenarios.includes(value as Scenario) ? (value as Scenario) : "approved";

const copy: Record<
  Scenario,
  { title: string; badge: string; description: string; tone: string }
> = {
  approved: {
    title: "Bạn đủ điều kiện tham gia phiên đấu giá",
    badge: "ĐỦ ĐIỀU KIỆN THAM GIA",
    description:
      "Các tham chiếu thành viên, KYC và khoản bảo đảm hiện đáp ứng yêu cầu của phiên.",
    tone: "success",
  },
  pending: {
    title: "Hồ sơ đang được kiểm tra điều kiện",
    badge: "ĐANG KIỂM TRA ĐIỀU KIỆN",
    description:
      "Các tham chiếu đang được tổng hợp. Chưa có quyết định cuối cùng.",
    tone: "pending",
  },
  "manual-review": {
    title: "Hồ sơ cần được xem xét thêm",
    badge: "CẦN XEM XÉT THÊM",
    description:
      "Chưa có quyết định cuối cùng. Bạn không cần gửi lại thông tin.",
    tone: "warning",
  },
  rejected: {
    title: "Hồ sơ chưa đáp ứng điều kiện tham gia",
    badge: "CHƯA ĐÁP ỨNG ĐIỀU KIỆN",
    description:
      "Tham chiếu KYC hiện không đáp ứng điều kiện của phiên tại snapshot hiện tại.",
    tone: "error",
  },
  revoked: {
    title: "Điều kiện tham gia đã bị thu hồi",
    badge: "ĐIỀU KIỆN ĐÃ BỊ THU HỒI",
    description:
      "Một hoặc nhiều tham chiếu đã thay đổi sau quyết định trước đó.",
    tone: "error",
  },
  timeout: {
    title: "Chưa thể cập nhật trạng thái điều kiện",
    badge: "CHƯA THỂ CẬP NHẬT THAM CHIẾU",
    description:
      "Một nguồn dữ liệu mô phỏng tạm thời chưa phản hồi. Quyết định cuối cùng chưa được đưa ra.",
    tone: "warning",
  },
  "insufficient-participants": {
    title: "Bạn đủ điều kiện tham gia phiên đấu giá",
    badge: "ĐỦ ĐIỀU KIỆN THAM GIA",
    description:
      "Các tham chiếu thành viên, KYC và khoản bảo đảm hiện đáp ứng yêu cầu của phiên.",
    tone: "success",
  },
};

function Checklist({ scenario }: { scenario: Scenario }) {
  const altered =
    scenario === "rejected" || scenario === "revoked"
      ? 1
      : scenario === "timeout"
        ? 3
        : scenario === "manual-review"
          ? 1
          : -1;
  const pending = scenario === "pending";
  const items = [
    [
      "Tài khoản thành viên",
      "Đã xác minh",
      "Membership Management Mock xác nhận tài khoản đang hoạt động.",
      "Membership Management Mock",
      "MBR-•••-1048",
    ],
    [
      "KYC và danh tính",
      "Hồ sơ phù hợp",
      "Tham chiếu KYC hiện đáp ứng yêu cầu của phiên đấu giá.",
      "Membership Management Mock",
      "KYC-•••-2817",
    ],
    [
      "Hạn chế tham gia",
      "Không có hạn chế",
      "Không có trạng thái giới hạn hoặc thu hồi quyền tham gia.",
      "Membership Management Mock",
      "MBR-•••-1048",
    ],
    [
      "Tham chiếu khoản bảo đảm",
      "Đã ghi nhận",
      "Financial Management Mock đã cung cấp tham chiếu phù hợp với điều kiện phiên.",
      "Financial Management Mock",
      "FIN-•••-6830",
    ],
    [
      "Tương thích quy tắc phiên",
      `Phù hợp với ${rule}`,
      "Các tham chiếu hiện tại phù hợp với phiên bản quy tắc đang áp dụng.",
      "Auction Management",
      rule,
    ],
  ];
  const status =
    scenario === "timeout"
      ? "Chưa thể đọc tham chiếu"
      : scenario === "manual-review"
        ? "Cần xem xét thêm"
        : scenario === "revoked"
          ? "Đã bị thu hồi"
          : "Chưa đáp ứng điều kiện";
  return (
    <section className="eligibility-checklist">
      <div className="section-heading">
        <p>THAM CHIẾU CHỈ ĐỌC</p>
        <h2>Checklist điều kiện tham gia</h2>
      </div>
      {items.map(([label, value, description, source, reference], index) => {
        const changed = index === altered;
        const itemPending = pending && index > 1;
        return (
          <article
            className={`eligibility-check ${changed ? "is-alert" : ""}`}
            key={label}
          >
            <CheckCircle2 />
            <div>
              <div className="eligibility-check-title">
                <h3>{label}</h3>
                <span
                  className={
                    changed || itemPending ? "status-muted" : "status-good"
                  }
                >
                  {changed ? status : itemPending ? "Đang tổng hợp" : value}
                </span>
              </div>
              <p>{changed ? copy[scenario].description : description}</p>
              <small>
                Nguồn: {source} · Tham chiếu: {reference} · Snapshot: {snapshot}{" "}
                · Chỉ đọc
              </small>
            </div>
          </article>
        );
      })}
    </section>
  );
}

export function EligibilityStatusPage() {
  const { auctionId } = useParams();
  const [params, setParams] = useSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState("");
  const auction = catalogAuctions.find((item) => item.id === auctionId);
  const registration = useEligibilityWorkflowStore((store) =>
    store.registrations.find((item) => item.auctionId === auctionId),
  );
  const withdraw = useEligibilityWorkflowStore((store) => store.withdraw);
  const storedScenario =
    registration?.eligibility === "ELIGIBLE"
      ? "approved"
      : registration?.eligibility === "REJECTED"
        ? "rejected"
        : registration?.eligibility === "REVOKED"
          ? "revoked"
          : registration?.eligibility === "MANUAL_REVIEW"
            ? "manual-review"
            : "pending";
  const scenario = scenarioOf(params.get("scenario") || storedScenario);
  const projection = params.get("projection");
  const state = copy[scenario];
  const timeline = useMemo(
    () => [
      ["08:55", "Đăng ký được gửi", "Auction Registration Mock"],
      ["09:00", "Membership reference được đọc", "Membership Management Mock"],
      ["09:01", "KYC reference được kiểm tra", "Membership Management Mock"],
      ["09:02", "Financial reference được đọc", "Financial Management Mock"],
      [
        "09:05",
        scenario === "revoked"
          ? "Eligibility decision bị thu hồi"
          : scenario === "approved" || scenario === "insufficient-participants"
            ? "Eligibility decision được cập nhật"
            : "Trạng thái đang được cập nhật",
        "Auction Management Mock",
      ],
    ],
    [scenario],
  );
  const retry = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      setParams({ scenario: "approved" });
    }, 500);
  };
  if (!auction)
    return (
      <main className="eligibility-status-page eligibility-state">
        <h1>Không tìm thấy trạng thái điều kiện</h1>
        <p>Phiên đấu giá không tồn tại hoặc chưa có hồ sơ đăng ký phù hợp.</p>
        <Link className="button primary" to="/auctions">
          Quay lại danh sách phiên đấu giá
        </Link>
      </main>
    );
  if (projection === "error")
    return (
      <main className="eligibility-status-page eligibility-state">
        <XCircle />
        <h1>Chưa thể tải trạng thái điều kiện</h1>
        <p>Dữ liệu mô phỏng tạm thời chưa sẵn sàng. Vui lòng thử lại.</p>
        <div>
          <button
            className="button primary"
            onClick={() => setParams({ scenario })}
          >
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
      <main
        className="eligibility-status-page eligibility-loading"
        aria-busy="true"
      >
        <div className="loading-hero" />
        <div className="container loading-grid">
          <div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="loading-card" key={index} />
            ))}
          </div>
          <div className="loading-card loading-side" />
        </div>
      </main>
    );
  const waiting =
    (scenario === "approved" || scenario === "insufficient-participants") &&
    (registration ? canEnterAuction(registration) : true);
  return (
    <main className={`eligibility-status-page status-${state.tone}`}>
      <section className="eligibility-hero">
        <div className="container">
          <div>
            <p>TRẠNG THÁI ĐIỀU KIỆN</p>
            <span className="hero-status">
              <ShieldCheck />
              {state.badge}
            </span>
            <h1>{state.title}</h1>
            <p className="hero-copy">{state.description}</p>
            <small>
              {auction.assetName} · {auction.code} · Cập nhật lúc {updated}
            </small>
          </div>
          <img src={auction.image} alt="" />
        </div>
      </section>
      <div className="container eligibility-grid">
        <div>
          {registration && (
            <section className="decision-card registration-lifecycle-card">
              <p>TRẠNG THÁI ĐĂNG KÝ</p>
              <h2>{registration.lifecycle === "WITHDRAWN" ? "ĐÃ RÚT ĐĂNG KÝ" : "ĐÃ ĐĂNG KÝ"}</h2>
              <dl>
                <div><dt>Mã đăng ký</dt><dd>{registration.registrationId}</dd></div>
                <div><dt>Eligibility</dt><dd>{registration.eligibility}</dd></div>
                <div><dt>Khoản bảo đảm</dt><dd>{registration.depositReferenceStatus}</dd></div>
                <div><dt>Hạn rút</dt><dd>{new Date(registration.withdrawalDeadline).toLocaleString("vi-VN")}</dd></div>
                <div><dt>Cập nhật</dt><dd>{new Date(registration.updatedAt).toLocaleString("vi-VN")}</dd></div>
              </dl>
              {registration.lifecycle === "REGISTERED" && !registration.activeAuthoritativeBid && registration.depositReferenceStatus === "READY" && (
                <button className="button secondary" onClick={() => setWithdrawDialog(true)}>
                  Rút đăng ký tham gia
                </button>
              )}
              {registration.lifecycle === "WITHDRAWN" && <p>Đăng ký đã rút; trạng thái này không phải là Eligibility bị từ chối. Không có cam kết hoàn tiền tự động.</p>}
              {withdrawMessage && <p role="status">{withdrawMessage}</p>}
            </section>
          )}
          <section className="decision-card">
            <p>QUYẾT ĐỊNH HIỆN TẠI</p>
            <h2>{state.badge}</h2>
            <dl>
              <div>
                <dt>Mã quyết định</dt>
                <dd>ELG-•••-260718</dd>
              </div>
              <div>
                <dt>Thời điểm</dt>
                <dd>{updated}</dd>
              </div>
              <div>
                <dt>Quy tắc</dt>
                <dd>{rule}</dd>
              </div>
              <div>
                <dt>Nguồn</dt>
                <dd>Auction Management Mock</dd>
              </div>
            </dl>
            <p>
              Trạng thái có thể thay đổi nếu một tham chiếu bên ngoài bị thu hồi
              trước khi phiên bắt đầu.
            </p>
          </section>
          {scenario === "insufficient-participants" && (
            <aside className="session-notice">
              <CircleAlert />
              <div>
                <strong>Phiên chưa đủ số người tham gia tối thiểu</strong>
                <p>
                  Điều kiện cá nhân của bạn vẫn hợp lệ. Trạng thái mở phiên được
                  quyết định ở cấp phiên đấu giá.
                </p>
              </div>
            </aside>
          )}
          <Checklist scenario={scenario} />
          <section className="decision-reason">
            <Info />
            <div>
              <h2>Điều gì xảy ra tiếp theo?</h2>
              <p>
                Hồ sơ hiện đáp ứng điều kiện của phiên. Bạn có thể vào phòng chờ
                trước khi phiên đấu giá bắt đầu. Hệ thống mô phỏng tiếp tục theo
                dõi tham chiếu đến thời điểm mở phiên.
              </p>
              <small>
                Đủ điều kiện tham gia không đồng nghĩa bạn đã đặt giá, trở thành
                ứng viên hoặc người trúng đấu giá.
              </small>
            </div>
          </section>
          <section className="eligibility-timeline">
            <div className="section-heading">
              <p>NHẬT KÝ QUYẾT ĐỊNH</p>
              <h2>Dòng thời gian tham chiếu</h2>
            </div>
            <ol>
              {timeline.map(([time, event, source]) => (
                <li key={time}>
                  <time>
                    {time}
                    <small>GMT+7</small>
                  </time>
                  <div>
                    <strong>{event}</strong>
                    <p>{source} · Trạng thái chỉ đọc</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="eligibility-side">
          <section className="action-card">
            <h2>
              {waiting
                ? "Sẵn sàng cho bước tiếp theo"
                : "Trạng thái cần theo dõi"}
            </h2>
            <p>
              {waiting
                ? "Phòng chờ sẽ hiển thị countdown, readiness và trạng thái mở phiên."
                : "Các tham chiếu là dữ liệu mô phỏng chỉ đọc; Auction UI không tự thay đổi quyết định."}
            </p>
            {waiting ? (
              <Link
                className="button primary"
                to={`/auctions/${auction.id}/waiting-room`}
              >
                Đến phòng chờ
              </Link>
            ) : scenario === "pending" || scenario === "timeout" ? (
              <button
                className="button primary"
                onClick={retry}
                disabled={refreshing}
              >
                <RefreshCw />
                {refreshing
                  ? "Đang làm mới..."
                  : scenario === "timeout"
                    ? "Thử lại"
                    : "Làm mới trạng thái"}
              </button>
            ) : (
              <Link className="button primary" to="/help">
                {scenario === "rejected" || scenario === "revoked"
                  ? "Liên hệ hỗ trợ"
                  : "Xem chi tiết tham chiếu"}
              </Link>
            )}
            <Link className="button secondary" to={`/auctions/${auction.id}`}>
              Xem chi tiết phiên
            </Link>
          </section>
          <section className="auction-context">
            <img src={auction.image} alt={auction.assetName} />
            <span>ĐANG MỞ ĐĂNG KÝ</span>
            <p>TRANG SỨC · {auction.code}</p>
            <h2>{auction.assetName}</h2>
            <dl>
              <div>
                <dt>Giá khởi điểm</dt>
                <dd>{formatMoney(auction.startPrice)}</dd>
              </div>
              <div>
                <dt>Bắt đầu</dt>
                <dd>{startsAt}</dd>
              </div>
              <div>
                <dt>Hạn đăng ký</dt>
                <dd>{deadline}</dd>
              </div>
              <div>
                <dt>Quy tắc</dt>
                <dd>{rule}</dd>
              </div>
            </dl>
            <ul>
              <li>Tài sản đã được thẩm định mock.</li>
              <li>Quy tắc phiên đã khóa.</li>
              <li>External references chỉ đọc.</li>
            </ul>
            <Link to={`/auctions/${auction.id}`}>
              Xem chi tiết phiên <ExternalLink size={15} />
            </Link>
          </section>
        </aside>
      </div>
      {registration && (
        <Dialog
          open={withdrawDialog}
          onOpenChange={setWithdrawDialog}
          title="Xác nhận rút đăng ký?"
          description="Bạn sẽ không thể vào phòng chờ hoặc phòng đấu giá bằng đăng ký này."
          footer={
            <>
              <button className="button secondary" onClick={() => setWithdrawDialog(false)}>Giữ đăng ký</button>
              <button className="button danger" onClick={() => {
                const result = withdraw(registration.registrationId, "CUSTOMER", registration.version);
                setWithdrawMessage(result.ok ? "Đã rút đăng ký. Không phát sinh tuyên bố hoàn tiền tự động." : `Không thể rút đăng ký: ${result.reason}.`);
                setWithdrawDialog(false);
              }}>Xác nhận rút</button>
            </>
          }
        >
          <p>Thao tác cập nhật riêng vòng đời đăng ký; Eligibility và dữ liệu Finance nguồn không bị chỉnh sửa.</p>
        </Dialog>
      )}
    </main>
  );
}
