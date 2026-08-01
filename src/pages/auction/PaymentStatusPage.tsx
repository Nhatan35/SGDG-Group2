import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  KeyRound,
  Landmark,
  LockKeyhole,
  QrCode,
  ScanLine,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Button,
  ButtonLink,
} from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { BlockedState } from "../../components/feedback/States";
import { useDemoClock } from "../../hooks/useDemoClock";
import { auctions } from "../../services/mock/auctionService";
import { useDemoStore } from "../../store/demoStore";
import { formatMoney } from "../../utils/format";
import { buildVietQrPayload } from "../../utils/vietQr";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/payment-status.css";
import "../../styles/payment-checkout-enhancements.css";

type PaymentMethod = "bank" | "domestic" | "credit";
type CopyState = "idle" | "copied" | "failed";

// Prototype demo value — requires business approval.
const PAYMENT_DEMO_ANCHOR_MS = new Date("2026-07-18T10:00:00.000Z").getTime();
const BANK_BIN = "970407";
const BANK_ACCOUNT = "1903888866";
const BANK_ACCOUNT_DISPLAY = "1903 8888 66";
const BANK_ACCOUNT_NAME = "CONG TY TNHH SGDG";
const DEMO_OTP = "123456";

const methodAction: Record<PaymentMethod, string> = {
  bank: "Tôi đã chuyển khoản",
  domestic: "Tiếp tục với thẻ ATM",
  credit: "Thanh toán bằng thẻ",
};

function MethodDetail({
  method,
  disabled,
}: {
  method: PaymentMethod;
  disabled: boolean;
}) {
  if (method === "bank")
    return (
      <section className="payment-method-detail payment-method-detail--bank">
        <div className="payment-method-detail__icon">
          <QrCode aria-hidden="true" />
        </div>
        <div>
          <h3>Quét VietQR hoặc chuyển khoản thủ công</h3>
          <p>
            QR đã điền sẵn ngân hàng, số tiền và nội dung. Bạn chỉ cần kiểm tra
            lại thông tin trong ứng dụng ngân hàng trước khi xác nhận.
          </p>
          <div className="payment-method-benefits">
            <span><ScanLine aria-hidden="true" /> Nhận diện tự động</span>
            <span><ShieldCheck aria-hidden="true" /> Đúng nội dung giao dịch</span>
          </div>
        </div>
      </section>
    );

  if (method === "domestic")
    return (
      <section className="payment-method-detail" aria-labelledby="domestic-card-title">
        <div className="payment-method-detail__heading">
          <span><WalletCards aria-hidden="true" /></span>
          <div>
            <h3 id="domestic-card-title">Thông tin thẻ ATM nội địa</h3>
            <p>Giao dịch được chuyển tới cổng Napas để ngân hàng xác thực OTP.</p>
          </div>
        </div>
        <div className="payment-card-form">
          <label className="payment-form-field payment-form-field--wide">
            <span>Ngân hàng phát hành</span>
            <select defaultValue="techcombank" disabled={disabled}>
              <option value="techcombank">Techcombank</option>
              <option value="vietcombank">Vietcombank</option>
              <option value="bidv">BIDV</option>
              <option value="mbbank">MB Bank</option>
              <option value="acb">ACB</option>
            </select>
          </label>
          <label className="payment-form-field">
            <span>Số thẻ ATM</span>
            <input
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="9704 •••• •••• ••••"
              disabled={disabled}
            />
          </label>
          <label className="payment-form-field">
            <span>Tên chủ thẻ</span>
            <input
              autoComplete="cc-name"
              placeholder="NGUYEN MINH ANH"
              disabled={disabled}
            />
          </label>
        </div>
        <p className="payment-form-security">
          <LockKeyhole aria-hidden="true" />
          Bạn sẽ xác nhận giao dịch bằng OTP của ngân hàng phát hành.
        </p>
      </section>
    );

  return (
    <section className="payment-method-detail" aria-labelledby="credit-card-title">
      <div className="payment-method-detail__heading">
        <span><CreditCard aria-hidden="true" /></span>
        <div>
          <h3 id="credit-card-title">Thông tin thẻ tín dụng / ghi nợ</h3>
          <p>Hỗ trợ Visa, Mastercard và JCB với xác thực 3D Secure.</p>
        </div>
      </div>
      <div className="payment-card-form">
        <label className="payment-form-field payment-form-field--wide">
          <span>Số thẻ</span>
          <input
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 5678 9012 3456"
            disabled={disabled}
          />
        </label>
        <label className="payment-form-field payment-form-field--wide">
          <span>Tên in trên thẻ</span>
          <input
            autoComplete="cc-name"
            placeholder="NGUYEN MINH ANH"
            disabled={disabled}
          />
        </label>
        <label className="payment-form-field">
          <span>Ngày hết hạn</span>
          <input
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            disabled={disabled}
          />
        </label>
        <label className="payment-form-field">
          <span>CVV/CVC</span>
          <input
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="•••"
            maxLength={4}
            disabled={disabled}
          />
        </label>
      </div>
      <p className="payment-form-security">
        <LockKeyhole aria-hidden="true" />
        Thông tin thẻ được mã hóa trong phiên thanh toán demo.
      </p>
    </section>
  );
}

export function PaymentStatusPage() {
  const { auctionId } = useParams();
  const [params] = useSearchParams();
  const now = useDemoClock();
  const auction = auctions.find((item) => item.id === auctionId);
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [paid, setPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrFailed, setQrFailed] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const activeDepositAmount = useDemoStore((state) =>
    auctionId ? (state.auctionDeposits[auctionId] ?? 0) : 0,
  );
  const depositRecord = useDemoStore((state) =>
    auctionId ? state.auctionDepositRecords[auctionId] : undefined,
  );
  const forfeitDeposit = useDemoStore(
    (state) => state.forfeitAuctionDeposit,
  );
  const applyDepositToPayment = useDemoStore(
    (state) => state.applyAuctionDepositToPayment,
  );
  const requestedDuration = Number(params.get("duration"));
  const paymentWindowMs =
    Number.isFinite(requestedDuration) && requestedDuration > 0
      ? Math.min(requestedDuration, 1800) * 1000
      : 30 * 60 * 1000;
  const deadline = PAYMENT_DEMO_ANCHOR_MS + paymentWindowMs;
  const forcedExpired = ["expired", "defaulted"].includes(
    params.get("scenario") ?? "",
  );
  const remainingMs = forcedExpired ? 0 : Math.max(0, deadline - now);
  const winningPrice = auction?.currentPrice || auction?.startPrice || 0;
  const serviceFee = Math.round(winningPrice * 0.01);
  const totalDue = winningPrice + serviceFee;
  const depositOffset =
    depositRecord?.status === "APPLIED_TO_PAYMENT"
      ? depositRecord.amount
      : ["ACTIVE", "ON_HOLD"].includes(depositRecord?.status ?? "")
        ? depositRecord?.amount ?? 0
        : activeDepositAmount;
  const remainingDue = Math.max(0, totalDue - depositOffset);
  const transferCode = `SGD-${(auction?.code ?? "PAYMENT").replace("SGD-", "")}-Ten cua ban`;
  const expired = remainingMs <= 0 && !paid;
  const hours = Math.floor(remainingMs / 3_600_000);
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  const twoDigits = (value: number) => value.toString().padStart(2, "0");

  useEffect(() => {
    if (!auction || remainingDue <= 0) return;
    let active = true;
    const payload = buildVietQrPayload({
      bankBin: BANK_BIN,
      accountNumber: BANK_ACCOUNT,
      amount: remainingDue,
      additionalInfo: transferCode,
    });
    QRCode.toDataURL(payload, {
      width: 420,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#2f1f17", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (active) {
          setQrFailed(false);
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) setQrFailed(true);
      });
    return () => {
      active = false;
    };
  }, [auction, remainingDue, transferCode]);

  useEffect(() => {
    if (!auction || !expired) return;
    forfeitDeposit(auction.id);
  }, [auction, expired, forfeitDeposit]);

  if (!auction) return <NotFoundPage />;

  const selectMethod = (nextMethod: PaymentMethod) => {
    setMethod(nextMethod);
    setCopyState("idle");
  };
  const copyTransferCode = async () => {
    try {
      if (!navigator.clipboard)
        throw new Error("Clipboard API is unavailable.");
      await navigator.clipboard.writeText(transferCode);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };
  const pay = () => {
    if (processing || paid || expired) return;
    if (method !== "bank") {
      setOtpCode("");
      setOtpError("");
      setResendMessage("");
      setVerificationOpen(true);
      return;
    }
    setProcessing(true);
    window.setTimeout(() => {
      applyDepositToPayment(auction.id);
      setPaid(true);
      setProcessing(false);
    }, 850);
  };
  const confirmCardPayment = () => {
    if (otpCode !== DEMO_OTP) {
      setOtpError("Mã xác thực chưa đúng. Vui lòng kiểm tra và thử lại.");
      return;
    }
    setOtpError("");
    setProcessing(true);
    window.setTimeout(() => {
      applyDepositToPayment(auction.id);
      setPaid(true);
      setProcessing(false);
      setVerificationOpen(false);
    }, 850);
  };

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
            <p>
              Số tiền {formatMoney(remainingDue)} đã được cập nhật; tiền cọc{" "}
              {formatMoney(depositOffset)} đã được khấu trừ.
            </p>
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
              <dt>Tổng nghĩa vụ</dt>
              <dd>{formatMoney(totalDue)}</dd>
            </div>
            {depositOffset > 0 && (
              <div className="payment-deposit-offset">
                <dt>Khấu trừ tiền cọc</dt>
                <dd>-{formatMoney(depositOffset)}</dd>
              </div>
            )}
            <div>
              <dt>Còn phải thanh toán</dt>
              <dd>{formatMoney(remainingDue)}</dd>
            </div>
          </dl>

          {depositRecord?.status === "FORFEITED" ? (
            <div className="payment-deposit-consequence forfeited" role="alert">
              <ShieldCheck aria-hidden="true" />
              <div>
                <strong>Khoản cọc đã bị thu do quá hạn thanh toán</strong>
                <span>
                  Tiền cọc không được hoàn lại và nghĩa vụ Candidate đã kết
                  thúc.
                </span>
              </div>
            </div>
          ) : depositOffset > 0 ? (
            <div className="payment-deposit-consequence">
              <ShieldCheck aria-hidden="true" />
              <div>
                <strong>Tiền cọc sẽ được khấu trừ</strong>
                <span>
                  {formatMoney(depositOffset)} được trừ trực tiếp khỏi tổng số
                  tiền cần thanh toán.
                </span>
              </div>
            </div>
          ) : null}

          <div className="payment-section-heading">
            <div>
              <h2>Phương thức thanh toán</h2>
              <p>Chọn một phương thức để xem hướng dẫn tương ứng.</p>
            </div>
            <span><LockKeyhole aria-hidden="true" /> Bảo mật</span>
          </div>
          <div
            className="payment-methods"
            role="radiogroup"
            aria-label="Phương thức thanh toán"
          >
            <button
              type="button"
              className={method === "bank" ? "selected" : ""}
              onClick={() => selectMethod("bank")}
              role="radio"
              aria-checked={method === "bank"}
              disabled={paid}
            >
              <span>
                <Landmark aria-hidden="true" />
                Chuyển khoản ngân hàng
              </span>
              <CheckCircle2 className="payment-method-check" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={method === "domestic" ? "selected" : ""}
              onClick={() => selectMethod("domestic")}
              role="radio"
              aria-checked={method === "domestic"}
              disabled={paid}
            >
              <span>
                <WalletCards aria-hidden="true" />
                Thẻ ATM nội địa
              </span>
              <CheckCircle2 className="payment-method-check" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={method === "credit" ? "selected" : ""}
              onClick={() => selectMethod("credit")}
              role="radio"
              aria-checked={method === "credit"}
              disabled={paid}
            >
              <span>
                <CreditCard aria-hidden="true" />
                Thẻ tín dụng / ghi nợ
              </span>
              <CheckCircle2 className="payment-method-check" aria-hidden="true" />
            </button>
          </div>

          <div className="payment-method-content" aria-live="polite">
            <MethodDetail method={method} disabled={paid || processing} />
          </div>

          {expired ? (
            <BlockedState
              compact
              title="Đã quá hạn thanh toán"
              description="Tác vụ thanh toán không còn khả dụng. Nếu có tiền cọc, hệ thống đã chuyển khoản cọc sang trạng thái bị thu do không hoàn tất nghĩa vụ đúng hạn."
              primaryAction={
                <ButtonLink variant="secondary" to="/help">
                  Liên hệ hỗ trợ
                </ButtonLink>
              }
            />
          ) : (
            <Button
              className="payment-pay-button"
              onClick={pay}
              loading={processing}
              loadingText="Đang kết nối cổng thanh toán"
              disabled={paid}
              rightIcon={!paid ? <ChevronRight /> : undefined}
            >
              {paid ? "Đã thanh toán" : methodAction[method]}
            </Button>
          )}
        </section>

        <aside className="payment-guide-panel">
          <h2>
            {method === "bank"
              ? "Quét mã để thanh toán"
              : "Thanh toán thẻ an toàn"}
          </h2>

          {method === "bank" ? (
            <>
              <section className="payment-qr-card" aria-label="Mã VietQR thanh toán">
                <div className="payment-qr-brand">
                  <div>
                    <strong>VIETQR</strong>
                    <span>NAPAS 247</span>
                  </div>
                  <span className="payment-bank-pill">Techcombank</span>
                </div>
                <div className="payment-qr-frame">
                  {qrDataUrl && !qrFailed ? (
                    <>
                      <img
                        src={qrDataUrl}
                        alt={`Mã VietQR thanh toán ${formatMoney(remainingDue)} cho giao dịch ${transferCode}`}
                      />
                      <ScanLine className="payment-qr-scan-line" aria-hidden="true" />
                    </>
                  ) : qrFailed ? (
                    <div className="payment-qr-placeholder is-error">
                      <QrCode aria-hidden="true" />
                      <span>Không thể tạo QR. Vui lòng chuyển khoản thủ công.</span>
                    </div>
                  ) : (
                    <div className="payment-qr-placeholder">
                      <QrCode aria-hidden="true" />
                      <span>Đang tạo mã thanh toán…</span>
                    </div>
                  )}
                </div>
                <div className="payment-qr-amount">
                  <span>Số tiền đã điền sẵn</span>
                  <strong>{formatMoney(remainingDue)}</strong>
                </div>
                <p>
                  <Smartphone aria-hidden="true" />
                  Mở ứng dụng ngân hàng, chọn quét QR và kiểm tra thông tin trước
                  khi xác nhận.
                </p>
              </section>

              <section className="payment-bank-card">
                <Building2 aria-hidden="true" />
                <div>
                  <strong>Ngân hàng TMCP Kỹ Thương Việt Nam</strong>
                  <span>Techcombank · BIN {BANK_BIN}</span>
                </div>
              </section>

              <dl className="payment-bank-info">
                <div>
                  <dt>Số tài khoản</dt>
                  <dd>{BANK_ACCOUNT_DISPLAY}</dd>
                </div>
                <div>
                  <dt>Tên tài khoản</dt>
                  <dd>{BANK_ACCOUNT_NAME}</dd>
                </div>
                <div>
                  <dt>Nội dung chuyển khoản</dt>
                  <dd>{transferCode}</dd>
                </div>
              </dl>

              <button
                className={`payment-copy-button ${copyState === "copied" ? "is-copied" : ""}`}
                type="button"
                onClick={copyTransferCode}
              >
                {copyState === "copied" ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <Copy aria-hidden="true" />
                )}
                {copyState === "copied"
                  ? "Đã sao chép nội dung"
                  : copyState === "failed"
                    ? "Không thể sao chép — thử lại"
                    : "Sao chép nội dung chuyển khoản"}
              </button>
            </>
          ) : (
            <section className="payment-card-guide">
              <div className="payment-card-guide__hero">
                <span>
                  {method === "domestic" ? (
                    <WalletCards aria-hidden="true" />
                  ) : (
                    <CreditCard aria-hidden="true" />
                  )}
                </span>
                <div>
                  <strong>
                    {method === "domestic"
                      ? "Cổng thanh toán Napas"
                      : "Cổng thẻ quốc tế"}
                  </strong>
                  <p>
                    {method === "domestic"
                      ? "Hỗ trợ thẻ ATM đã đăng ký thanh toán trực tuyến."
                      : "Hỗ trợ xác thực Visa Secure, Mastercard Identity Check và J/Secure."}
                  </p>
                </div>
              </div>
              <div className="payment-card-networks" aria-label="Mạng thẻ hỗ trợ">
                {method === "domestic" ? (
                  <>
                    <span>NAPAS</span>
                    <span>TCB</span>
                    <span>VCB</span>
                    <span>BIDV</span>
                  </>
                ) : (
                  <>
                    <span>VISA</span>
                    <span>Mastercard</span>
                    <span>JCB</span>
                  </>
                )}
              </div>
              <ol className="payment-card-steps">
                <li><span>1</span><p>Điền chính xác thông tin thẻ ở bên trái.</p></li>
                <li><span>2</span><p>Kiểm tra số tiền {formatMoney(remainingDue)}.</p></li>
                <li><span>3</span><p>Xác thực OTP hoặc 3D Secure từ ngân hàng.</p></li>
              </ol>
              <div className="payment-secure-badge">
                <BadgeCheck aria-hidden="true" />
                <div>
                  <strong>Kết nối được bảo vệ</strong>
                  <span>Thông tin nhạy cảm không được lưu trong hồ sơ đấu giá.</span>
                </div>
              </div>
            </section>
          )}

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

      <Dialog
        open={verificationOpen}
        onOpenChange={(open) => {
          if (!processing) setVerificationOpen(open);
        }}
        title={
          method === "domestic"
            ? "Xác thực giao dịch bằng OTP"
            : "Xác thực thanh toán 3D Secure"
        }
        description={
          method === "domestic"
            ? "Ngân hàng phát hành cần xác nhận chủ thẻ trước khi hoàn tất thanh toán."
            : "Ngân hàng phát hành thẻ yêu cầu thêm một bước bảo mật cho giao dịch này."
        }
        size="sm"
        panelClassName="payment-verification-dialog"
        preventClose={processing}
        closeLabel="Đóng bước xác thực thanh toán"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={processing}
              onClick={() => setVerificationOpen(false)}
            >
              Hủy
            </Button>
            <Button
              loading={processing}
              loadingText="Đang xác thực"
              onClick={confirmCardPayment}
            >
              Xác nhận thanh toán
            </Button>
          </>
        }
      >
        <section className="payment-verification-hero">
          <span><KeyRound aria-hidden="true" /></span>
          <div>
            <strong>Mã xác thực đã được gửi</strong>
            <p>
              Kiểm tra tin nhắn hoặc ứng dụng ngân hàng liên kết với số điện
              thoại ••• ••• 0482.
            </p>
          </div>
        </section>

        <dl className="payment-verification-summary">
          <div>
            <dt>Phương thức</dt>
            <dd>
              {method === "domestic"
                ? "Thẻ ATM nội địa · Napas"
                : "Thẻ quốc tế · 3D Secure"}
            </dd>
          </div>
          <div>
            <dt>Số tiền xác thực</dt>
            <dd>{formatMoney(remainingDue)}</dd>
          </div>
        </dl>

        <label className="payment-otp-field">
          <span>Nhập mã xác thực gồm 6 chữ số</span>
          <input
            value={otpCode}
            onChange={(event) => {
              setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setOtpError("");
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            aria-describedby="payment-otp-help payment-otp-error"
            disabled={processing}
          />
        </label>
        <p id="payment-otp-help" className="payment-otp-demo">
          Phiên bản demo:{" "}
          <button
            type="button"
            disabled={processing}
            onClick={() => {
              setOtpCode(DEMO_OTP);
              setOtpError("");
            }}
          >
            Dùng mã {DEMO_OTP}
          </button>
        </p>
        {otpError && (
          <p id="payment-otp-error" className="payment-otp-error" role="alert">
            {otpError}
          </p>
        )}
        <div className="payment-otp-resend">
          <span>Chưa nhận được mã?</span>
          <button
            type="button"
            disabled={processing}
            onClick={() => setResendMessage("Mã xác thực mới đã được gửi.")}
          >
            Gửi lại mã
          </button>
        </div>
        {resendMessage && <p className="payment-otp-sent" role="status">{resendMessage}</p>}
      </Dialog>
    </main>
  );
}
