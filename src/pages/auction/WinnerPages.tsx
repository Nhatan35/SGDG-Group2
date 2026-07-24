import {
  CheckCircle2,
  Clock3,
  Headphones,
  PackageCheck,
  Star,
  Trophy,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { auctions } from "../../services/mock/auctionService";
import { formatMoney } from "../../utils/format";
import { formatDuration, useSystemClock } from "../../hooks/useDemoClock";
import { NotFoundPage } from "../NotFoundPage";

const confirmationDeadline = new Date(Date.now() + 86400000).toISOString();
const paymentDeadline = new Date(Date.now() + 79200000).toISOString();

export function ResultPage() {
  const { auctionId } = useParams();
  const a = auctions.find((x) => x.id === auctionId);
  const [state, setState] = useState("PROVISIONAL_WINNER");
  if (!a) return <NotFoundPage />;
  const data: Record<
    string,
    [string, string, "success" | "warning" | "danger" | "info"]
  > = {
    RESULT_PENDING: [
      "Đang xác lập kết quả",
      "Hệ thống đang kiểm tra bid và điều kiện của ứng viên.",
      "info",
    ],
    PROVISIONAL_WINNER: [
      "Bạn là ứng viên trúng đấu giá",
      "Hãy xác nhận trong thời hạn để tiếp tục quy trình.",
      "warning",
    ],
    FALLBACK_CANDIDATE: [
      "Bạn là ứng viên dự phòng",
      "Hệ thống sẽ thông báo nếu quy trình chuyển sang bạn.",
      "info",
    ],
    CONFIRMED_WINNER: [
      "Đã xác nhận người trúng đấu giá",
      "Nghĩa vụ thanh toán đã được tạo.",
      "success",
    ],
    NO_WINNER: [
      "Phiên không xác lập người trúng",
      "Không có bid đáp ứng đầy đủ điều kiện.",
      "danger",
    ],
    CANCELLED: [
      "Phiên đã hủy",
      "Xem thông báo chính thức để biết thêm chi tiết.",
      "danger",
    ],
  };
  const [title, text, tone] = data[state];
  return (
    <WinnerPage title="Kết quả phiên">
      <section className="winner-hero">
        <Trophy />
        <Badge tone={tone}>{state.replaceAll("_", " ")}</Badge>
        <h2>{title}</h2>
        <p>{text}</p>
        <strong>{formatMoney(a.currentPrice)}</strong>
        {state === "PROVISIONAL_WINNER" && (
          <Link
            className="button primary"
            to={`/account/winner/${a.id}/confirm`}
          >
            Xác nhận kết quả
          </Link>
        )}
      </section>
      <label className="demo-state">
        Trạng thái demo
        <select value={state} onChange={(e) => setState(e.target.value)}>
          {Object.keys(data).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
    </WinnerPage>
  );
}
export function WinnerConfirmPage() {
  const now = useSystemClock();
  const { auctionId } = useParams();
  const a = auctions.find((x) => x.id === auctionId);
  const [confirmed, setConfirmed] = useState(false);
  if (!a) return <NotFoundPage />;
  return (
    <WinnerPage title="Xác nhận trúng đấu giá">
      <section className="journey-card confirm-card">
        <Badge tone={confirmed ? "success" : "warning"}>
          {confirmed ? "ĐÃ XÁC NHẬN" : "CHỜ XÁC NHẬN"}
        </Badge>
        <h2>{a.assetName}</h2>
        <p>Bid cuối được chấp nhận</p>
        <strong>{formatMoney(a.currentPrice)}</strong>
        <div className="deadline">
          <Clock3 />
          <span>
            Còn {formatDuration(confirmationDeadline, now)} để xác nhận
          </span>
        </div>
        {!confirmed ? (
          <>
            <label className="check-row">
              <input type="checkbox" required /> Tôi xác nhận thông tin tài sản,
              bid cuối và nghĩa vụ tiếp theo.
            </label>
            <div className="dual-actions">
              <button
                className="button primary"
                onClick={() => setConfirmed(true)}
              >
                Xác nhận trúng đấu giá
              </button>
              <button className="button secondary">
                <Headphones /> Yêu cầu hỗ trợ
              </button>
            </div>
          </>
        ) : (
          <Link
            className="button primary"
            to={`/account/winner/${a.id}/payment`}
          >
            Xem nghĩa vụ thanh toán
          </Link>
        )}
      </section>
    </WinnerPage>
  );
}
export function PaymentPage() {
  const now = useSystemClock();
  const { auctionId } = useParams();
  const a = auctions.find((x) => x.id === auctionId);
  const [state, setState] = useState("PENDING");
  if (!a) return <NotFoundPage />;
  const deposit = 50000000,
    fee = 9000000,
    total = a.currentPrice - deposit + fee;
  return (
    <WinnerPage title="Nghĩa vụ thanh toán trúng đấu giá">
      <div className="payment-grid">
        <section className="journey-card">
          <div className="panel-title">
            <div>
              <small>Mã nghĩa vụ</small>
              <h2>SGD-PAY-1028</h2>
            </div>
            <Badge
              tone={
                state === "CONFIRMED"
                  ? "success"
                  : state === "FAILED"
                    ? "danger"
                    : "warning"
              }
            >
              {state}
            </Badge>
          </div>
          <dl className="amount-list">
            <div>
              <dt>Bid cuối</dt>
              <dd>{formatMoney(a.currentPrice)}</dd>
            </div>
            <div>
              <dt>Khấu trừ tiền đặt trước</dt>
              <dd>− {formatMoney(deposit)}</dd>
            </div>
            <div>
              <dt>Phí dịch vụ</dt>
              <dd>{formatMoney(fee)}</dd>
            </div>
            <div className="total">
              <dt>Tổng nghĩa vụ còn lại</dt>
              <dd>{formatMoney(total)}</dd>
            </div>
          </dl>
          <p className="deadline">
            <Clock3 /> Còn {formatDuration(paymentDeadline, now)} để thanh toán
          </p>
        </section>
        <section className="journey-card">
          <h2>Phương thức chuyển khoản</h2>
          <p>Ngân hàng SGDG Demo · 1028 260717</p>
          <p>
            Nội dung: <strong>SGD-PAY-1028</strong>
          </p>
          <label>
            Trạng thái nhà cung cấp
            <select value={state} onChange={(e) => setState(e.target.value)}>
              <option>PENDING</option>
              <option>PROCESSING</option>
              <option>RECONCILING</option>
              <option>CONFIRMED</option>
              <option>FAILED</option>
            </select>
          </label>
          {state === "CONFIRMED" && (
            <Link className="button primary" to="/account/handover/HD-204">
              Theo dõi bàn giao
            </Link>
          )}
        </section>
      </div>
    </WinnerPage>
  );
}
export function HandoverPage() {
  const steps = [
    "Thanh toán xác nhận",
    "Kích hoạt bàn giao",
    "Chuẩn bị tài sản",
    "Sẵn sàng nhận",
    "Đang vận chuyển",
    "Đã giao",
    "Khách hàng xác nhận",
    "Hoàn tất",
  ];
  const [current, setCurrent] = useState(3);
  return (
    <WinnerPage title="Theo dõi bàn giao">
      <section className="journey-card">
        <div className="panel-title">
          <div>
            <small>Mã hồ sơ</small>
            <h2>HD-204</h2>
          </div>
          <Badge tone="success">{steps[current]}</Badge>
        </div>
        <div className="handover-timeline">
          {steps.map((x, i) => (
            <div className={i <= current ? "done" : ""} key={x}>
              <span>{i < current ? <CheckCircle2 /> : i + 1}</span>
              <div>
                <strong>{x}</strong>
                <small>
                  {i <= current
                    ? "Đã cập nhật trên hệ thống"
                    : "Chờ bước trước hoàn tất"}
                </small>
              </div>
            </div>
          ))}
        </div>
        <button
          className="button primary"
          disabled={current === steps.length - 1}
          onClick={() => setCurrent((x) => Math.min(x + 1, steps.length - 1))}
        >
          Mô phỏng bước tiếp theo
        </button>
        {current === steps.length - 1 && (
          <Link className="button secondary" to="/account/review/HD-204">
            Đánh giá quy trình
          </Link>
        )}
      </section>
    </WinnerPage>
  );
}
export function ReviewPage() {
  const [done, setDone] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    setDone(true);
  }
  return (
    <WinnerPage title="Hoàn tất & đánh giá">
      {done ? (
        <section className="winner-hero">
          <CheckCircle2 />
          <h2>Cảm ơn phản hồi của bạn</h2>
          <p>
            Hồ sơ HD-204 đã đóng. Phản hồi được ghi nhận để cải thiện quy trình.
          </p>
          <Link className="button primary" to="/account/dashboard">
            Về tổng quan
          </Link>
        </section>
      ) : (
        <form className="journey-card review-form" onSubmit={submit}>
          <PackageCheck />
          <h2>Bàn giao đã hoàn tất</h2>
          <label>
            Mức độ hài lòng
            <select required defaultValue="">
              <option value="" disabled>
                Chọn mức đánh giá
              </option>
              {[5, 4, 3, 2, 1].map((x) => (
                <option value={x} key={x}>
                  {x} sao
                </option>
              ))}
            </select>
          </label>
          <label>
            Phản hồi
            <textarea rows={5} placeholder="Chia sẻ trải nghiệm của bạn" />
          </label>
          <label className="check-row">
            <input type="checkbox" required /> Tôi xác nhận hồ sơ có thể được
            đóng.
          </label>
          <button className="button primary">
            <Star /> Gửi đánh giá
          </button>
        </form>
      )}
    </WinnerPage>
  );
}
function WinnerPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="container page-shell narrow">
      <div className="page-heading">
        <span className="eyebrow">WINNER FLOW</span>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
