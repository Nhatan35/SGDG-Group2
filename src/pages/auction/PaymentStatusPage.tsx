import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Landmark,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Button,
  ButtonLink,
} from "../../components/common/Button";
import { BlockedState } from "../../components/feedback/States";
import { useDemoClock } from "../../hooks/useDemoClock";
import { auctions } from "../../services/mock/auctionService";
import { formatMoney } from "../../utils/format";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/payment-status.css";

type PaymentMethod = "bank" | "domestic" | "credit";

// Prototype demo value — requires business approval.
const PAYMENT_DEMO_ANCHOR_MS = new Date("2026-07-18T10:00:00.000Z").getTime();

export function PaymentStatusPage() {
  const { auctionId } = useParams();
  const [params] = useSearchParams();
  const now = useDemoClock();
  const auction = auctions.find((item) => item.id === auctionId);
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [paid, setPaid] = useState(false);
  const requestedDuration = Number(params.get("duration"));
  const paymentWindowMs =
    Number.isFinite(requestedDuration) && requestedDuration > 0
      ? Math.min(requestedDuration, 1800) * 1000
      : 30 * 60 * 1000;
  const deadline = PAYMENT_DEMO_ANCHOR_MS + paymentWindowMs;
  const remainingMs = Math.max(0, deadline - now);

  if (!auction) return <NotFoundPage />;

  const winningPrice = auction.currentPrice || auction.startPrice;
  const serviceFee = Math.round(winningPrice * 0.01);
  const totalDue = winningPrice + serviceFee;
  const transferCode = `SGD-${auction.code.replace("SGD-", "")}-Ten cua ban`;
  const expired = remainingMs <= 0 && !paid;
  const hours = Math.floor(remainingMs / 3_600_000);
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  const twoDigits = (value: number) => value.toString().padStart(2, "0");

  return (
    <main className="container payment-status-page post-auction-page">
      <header className="post-auction-heading">
        <span>THANH TOÁN TRÚNG ĐẤU GIÁ</span>
        <h1>Hoàn tất thanh toán để nhận tài sản</h1>
        <p>
          Chọn phương thức thanh toán, kiểm tra số tiền và hoàn tất trong thời
          hạn để chuyển sang bước bàn giao.
        </p>
      </header>

      {paid && (
        <section className="payment-success-banner" role="status">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <h2>Thanh toán đã được ghi nhận</h2>
            <p>Số tiền {formatMoney(totalDue)} đã được cập nhật vào giao dịch.</p>
          </div>
          <ButtonLink
            to={`/me/handover/HO-5711R-2026?scenario=in-transit&auctionId=${auction.id}`}
            rightIcon={<ArrowRight />}
          >
            Theo dõi bàn giao
          </ButtonLink>
        </section>
      )}

      <div className="payment-checkout-layout">
        <section className="payment-panel">
          <h2>Thông tin thanh toán</h2>
          <dl className="payment-breakdown">
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

          <h2>Phương thức thanh toán</h2>
          <div className="payment-methods" role="radiogroup" aria-label="Phương thức thanh toán">
            <button
              className={method === "bank" ? "selected" : ""}
              onClick={() => setMethod("bank")}
              role="radio"
              aria-checked={method === "bank"}
            >
              <Landmark aria-hidden="true" />
              Chuyển khoản ngân hàng
            </button>
            <button
              className={method === "domestic" ? "selected" : ""}
              onClick={() => setMethod("domestic")}
              role="radio"
              aria-checked={method === "domestic"}
            >
              <WalletCards aria-hidden="true" />
              Thẻ ATM nội địa
            </button>
            <button
              className={method === "credit" ? "selected" : ""}
              onClick={() => setMethod("credit")}
              role="radio"
              aria-checked={method === "credit"}
            >
              <CreditCard aria-hidden="true" />
              Thẻ tín dụng / ghi nợ
            </button>
          </div>

          {expired ? (
            <BlockedState
              compact
              title="Đã quá hạn thanh toán"
              description="Tác vụ thanh toán hiện không khả dụng. Vui lòng liên hệ hỗ trợ để kiểm tra nghĩa vụ."
              primaryAction={
                <ButtonLink variant="secondary" to="/help">
                  Liên hệ hỗ trợ
                </ButtonLink>
              }
            />
          ) : (
            <Button
              className="payment-pay-button"
              onClick={() => setPaid(true)}
            >
              Thanh toán ngay
            </Button>
          )}
        </section>

        <aside className="payment-guide-panel">
          <h2>Hướng dẫn thanh toán</h2>
          <section className="payment-bank-card">
            <Building2 aria-hidden="true" />
            <div>
              <strong>Ngân hàng TMCP Kỹ Thương Việt Nam</strong>
              <span>Techcombank</span>
            </div>
          </section>

          <dl className="payment-bank-info">
            <div>
              <dt>Số tài khoản</dt>
              <dd>1903 8888 66</dd>
            </div>
            <div>
              <dt>Tên tài khoản</dt>
              <dd>CONG TY TNHH SGDG</dd>
            </div>
            <div>
              <dt>Nội dung chuyển khoản</dt>
              <dd>{transferCode}</dd>
            </div>
          </dl>

          <button className="payment-copy-button" type="button">
            <Copy aria-hidden="true" />
            Sao chép nội dung chuyển khoản
          </button>

          <div className={expired ? "payment-countdown expired" : "payment-countdown"}>
            <p>{expired ? "Đã hết thời gian thanh toán" : "Vui lòng thanh toán trong"}</p>
            <div>
              <span>{twoDigits(hours)}<small>Giờ</small></span>
              <span>{twoDigits(minutes)}<small>Phút</small></span>
              <span>{twoDigits(seconds)}<small>Giây</small></span>
            </div>
          </div>

          <p className="payment-note">
            <Clock3 aria-hidden="true" />
            {expired
              ? "Vui lòng liên hệ hỗ trợ để mở lại nghĩa vụ thanh toán hoặc chuyển lượt theo quy định phiên."
              : "Hệ thống sẽ tự động mở hồ sơ bàn giao sau khi thanh toán được ghi nhận."}
          </p>
        </aside>
      </div>
    </main>
  );
}
