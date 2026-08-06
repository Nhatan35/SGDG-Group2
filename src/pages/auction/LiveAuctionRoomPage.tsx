import {
  Activity,
  AlertCircle,
  BellRing,
  CheckCircle2,
  CreditCard,
  Crown,
  Eye,
  Flame,
  Gavel,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { catalogAuctions } from "../../services/mock/auctionService";
import {
  AutoBidDrawer,
  type AutoBidInstruction,
} from "../../components/auction/AutoBidDrawer";
import {
  MyBidHistoryPanel,
  type BidRejectionCode,
  type BidSource,
  type UserBidRecord,
} from "../../components/auction/MyBidHistoryPanel";
import { AuctionCountdownDial } from "../../components/auction/AuctionCountdownDial";
import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import {
  canEnterAuction,
  useEligibilityWorkflowStore,
} from "../../store/eligibilityWorkflowStore";
import { useDemoStore } from "../../store/demoStore";
import { formatMoney } from "../../utils/format";
import { useDemoClock } from "../../hooks/useDemoClock";
import "../../styles/live-auction-room.css";
import "../../styles/live-deposit-gate.css";
import "../../styles/live-auction-mocks.css";
import "../../styles/live-auction-room-redesign.css";
import "../../styles/live-outbid-notification.css";

type Step = "entry" | "confirmation" | "validating" | "result";
type Outcome =
  "accepted" | "below-minimum" | "stale-price" | "duplicate" | "error";
type LeaderboardEntry = {
  bidderNumber: string;
  amount: number;
  bids: number;
  isCurrentUser?: boolean;
};
type OutbidNotice = {
  id: string;
  competitorNumber: string;
  competitorAmount: number;
  nextMinimum: number;
};
type DepositAction = "manual-bid" | "autobid";
type DepositStep = "confirm" | "need-topup" | "gateway" | "success";

const rule = "QD-2026.07";
const currentUserBidderNumber = "SBD 018";
function createLeaderboard(
  currentPrice: number,
  minimumIncrement: number,
): LeaderboardEntry[] {
  const bidderNumbers = ["SBD 027", "SBD 031", "SBD 044", "SBD 052", "SBD 068"];
  const bidCounts = [16, 12, 9, 7, 5];

  return bidderNumbers.map((bidderNumber, index) => ({
    bidderNumber,
    amount: Math.max(0, currentPrice - minimumIncrement * index),
    bids: bidCounts[index],
  }));
}

function AuctionMetrics() {
  const metrics = [
    [Users, "126", "Người tham gia"],
    [Activity, "84", "Đang trực tuyến"],
    [Eye, "842", "Đang theo dõi"],
  ] as const;

  return (
    <section className="live-mock-metrics live-session-metrics live-header-session-metrics">
      <h2>Thông tin phiên đấu giá</h2>
      <div className="metric-grid">
        {metrics.map(([Icon, value, label]) => (
          <article className="live-session-metric" key={label}>
            <Icon aria-hidden="true" />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function AuctionActivity({ items }: { items: readonly string[] }) {
  return (
    <section className="live-mock-activity">
      <h2>Hoạt động phiên đấu giá</h2>
      <ol>
        {items.map((item) => (
          <li key={item}>
            <Activity aria-hidden="true" />
            {item}
          </li>
        ))}
      </ol>
    </section>
  );
}

function LeaderboardPanel({
  leaderboard,
  isOutbid,
}: {
  leaderboard: LeaderboardEntry[];
  isOutbid: boolean;
}) {
  return (
    <section className="live-mock-leaderboard">
      <header>
        <h2>
          <Crown aria-hidden="true" />
          Bảng xếp hạng đấu giá
        </h2>
      </header>
      <ol>
        {leaderboard.map((entry, index) => (
          <li
            className={`leaderboard-row${entry.isCurrentUser ? " is-current" : ""}${entry.isCurrentUser && isOutbid ? " is-outbid" : ""}`}
            key={entry.bidderNumber}
          >
            <b className="leaderboard-rank">
              {index === 0 ? (
                <Crown aria-label="Hạng một" />
              ) : (
                `#${index + 1}`
              )}
            </b>
            <div className="leaderboard-person">
              <strong>
                {entry.bidderNumber}
                {entry.isCurrentUser && (
                  <small>
                    {isOutbid
                      ? "Bạn · vừa bị vượt giá"
                      : index === 0
                        ? "Bạn · dẫn đầu"
                        : `Bạn · hạng #${index + 1}`}
                  </small>
                )}
              </strong>
              <small>● Online · {entry.bids} lượt đấu</small>
            </div>
            <div className="leaderboard-amount">
              <strong>{formatMoney(entry.amount)}</strong>
              <small>{index === 0 ? "Vừa xong" : `${index} phút trước`}</small>
            </div>
          </li>
        ))}
      </ol>
      <p className="leaderboard-note">
        <Users aria-hidden="true" /> Cạnh tranh rất sát sao! Mỗi bước giá đều
        quan trọng.
      </p>
    </section>
  );
}

function ManualBidModal({
  price,
  minimum,
  increment,
  initialAmount,
  onClose,
  onAccepted,
  onRejected,
  outcome,
}: {
  price: number;
  minimum: number;
  increment: number;
  initialAmount?: number | null;
  onClose: () => void;
  onAccepted: (amount: number) => void;
  onRejected: (amount: number, code: BidRejectionCode, reason: string) => void;
  outcome: Outcome;
}) {
  const [step, setStep] = useState<Step>("entry");
  const [value, setValue] = useState(() =>
    initialAmount ? String(initialAmount) : "",
  );
  const [error, setError] = useState("");
  const [ack, setAck] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const amount = Number(value);
  const valid = amount >= minimum && (amount - price) % increment === 0;
  const next = () => {
    if (!amount) return setError("Vui lòng nhập mức giá bạn muốn đặt.");
    if (amount < minimum)
      return setError(`Giá đặt phải từ ${formatMoney(minimum)} trở lên.`);
    if (!valid)
      return setError(
        `Giá đặt phải phù hợp bước giá ${formatMoney(increment)}.`,
      );
    setError("");
    setStep("confirmation");
  };
  const confirm = () => {
    setStep("validating");
    window.setTimeout(() => {
      if (outcome === "accepted") onAccepted(amount);
      else
        onRejected(
          amount,
          outcome === "below-minimum"
            ? "below-minimum"
            : outcome === "stale-price"
              ? "stale-price"
              : outcome === "duplicate"
                ? "duplicate"
                : "unknown",
          outcome === "below-minimum"
            ? "Mức giá thấp hơn giá tối thiểu hiện tại."
            : outcome === "stale-price"
              ? "Giá chính thức đã thay đổi trước khi bạn xác nhận."
              : outcome === "duplicate"
                ? "Lượt đặt giá này đã được xử lý trước đó."
                : "Không thể xử lý lượt đặt giá. Vui lòng kiểm tra lại.",
        );
      setStep("result");
    }, 700);
  };
  useEffect(() => {
    if (step !== "result" || outcome !== "accepted") return;
    const autoCloseTimer = window.setTimeout(() => onCloseRef.current(), 60_000);
    return () => window.clearTimeout(autoCloseTimer);
  }, [outcome, step]);
  const titles: Record<Outcome, string> = {
    accepted: "Giá mới",
    "below-minimum": "Mức giá chưa hợp lệ",
    "stale-price": "Giá hiện tại đã thay đổi",
    duplicate: "Bid trùng lặp",
    error: "Chưa thể hoàn tất mô phỏng đặt giá",
  };
  const dialogTitle =
    step === "entry"
      ? "Nhập mức giá của bạn"
      : step === "confirmation"
        ? "Xác nhận mức giá"
        : step === "validating"
          ? "Đang kiểm tra mức giá"
          : titles[outcome];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={dialogTitle}
      className={
        step === "result" && outcome === "accepted"
          ? "bid-success-dialog"
          : ""
      }
      panelClassName={`bid-modal${step === "result" && outcome === "accepted" ? " bid-success-modal" : ""}`}
      initialFocusRef={step === "entry" ? input : undefined}
      preventClose={step === "validating"}
      closeLabel="Đóng cửa sổ đặt giá"
    >
        {step === "entry" && (
          <>
            <p>ĐẶT GIÁ THỦ CÔNG</p>
            <small>
              Giá chỉ được ghi nhận sau khi yêu cầu được kiểm tra thành công.
            </small>
            <div className="bid-context">
              Giá hiện tại: <b>{formatMoney(price)}</b> · Tối thiểu:{" "}
              <b>{formatMoney(minimum)}</b>
            </div>
            <label>
              Mức giá bạn muốn đặt
              <input
                ref={input}
                inputMode="numeric"
                value={value}
                onChange={(event) =>
                  setValue(event.target.value.replace(/\D/g, ""))
                }
                placeholder={`Nhập mức giá từ ${formatMoney(minimum)}`}
              />
            </label>
            {error && <strong className="bid-error">{error}</strong>}
            <div className="chips">
              <button onClick={() => setValue(String(minimum))}>
                Mức tối thiểu
              </button>
              <button onClick={() => setValue(String(price + increment))}>
                +{formatMoney(increment)}
              </button>
              <button onClick={() => setValue(String(price + increment * 2))}>
                +{formatMoney(increment * 2)}
              </button>
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={onClose}>
                Hủy
              </Button>
              <Button onClick={next}>
                Tiếp tục xác nhận
              </Button>
            </div>
          </>
        )}
        {step === "confirmation" && (
          <>
            <p>ĐẶT GIÁ THỦ CÔNG</p>
            <div className="bid-context">
              Giá hiện tại: {formatMoney(price)}
              <strong>{formatMoney(amount)}</strong>Bước giá:{" "}
              {formatMoney(increment)}
            </div>
            <label>
              <input
                type="checkbox"
                checked={ack}
                onChange={(event) => setAck(event.target.checked)}
              />{" "}
              Tôi hiểu bid được chấp nhận sẽ không thể chỉnh sửa, hủy hoặc rút
              lại.
            </label>
            {!ack && (
              <small>Vui lòng xác nhận điều kiện trước khi đặt giá.</small>
            )}
            <div className="modal-actions">
              <Button
                variant="secondary"
                onClick={() => setStep("entry")}
              >
                Quay lại chỉnh sửa
              </Button>
              <Button
                disabled={!ack}
                onClick={confirm}
              >
                Xác nhận đặt giá
              </Button>
            </div>
          </>
        )}
        {step === "validating" && (
          <>
            <p>Vui lòng chờ trong khi yêu cầu mô phỏng được kiểm tra.</p>
            <strong>{formatMoney(amount)}</strong>
          </>
        )}
        {step === "result" &&
          (outcome === "accepted" ? (
            <div className="bid-success-luxury" role="status" aria-live="polite">
              <span className="bid-success-mark" aria-hidden="true">
                <CheckCircle2 />
              </span>
              <span className="bid-success-eyebrow">
                GIÁ MỚI ĐÃ GHI NHẬN
              </span>
              <strong className="bid-success-amount">
                {formatMoney(amount)}
              </strong>
              <p className="bid-success-caption">
                Phiên đấu giá đã nhận lượt trả giá của bạn.
              </p>

              <div className="bid-success-bidder">
                <span className="bid-success-bidder-icon" aria-hidden="true">
                  <Gavel />
                </span>
                <span className="bid-success-bidder-code">
                  <small>Mã người trả giá</small>
                  <b>{currentUserBidderNumber}</b>
                </span>
                <span className="bid-success-leading">
                  <Crown aria-hidden="true" />
                  Đang dẫn đầu
                </span>
              </div>

              <p className="bid-success-note">
                <ShieldCheck aria-hidden="true" />
                Bạn đang giữ mức giá cao nhất tại thời điểm hiện tại.
              </p>
            </div>
          ) : (
            <>
              <p>Giá hiện tại và dữ liệu bạn đã nhập vẫn được giữ.</p>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setStep("entry")}>
                  Chỉnh sửa mức giá
                </Button>
                <Button onClick={onClose}>Đóng</Button>
              </div>
            </>
          ))}
    </Dialog>
  );
}

export function DepositGateModal({
  action,
  auctionName,
  startPrice,
  depositAmount,
  walletBalance,
  onCancel,
  onContinue,
  onConfirmDeposit,
}: {
  action: DepositAction;
  auctionName: string;
  startPrice: number;
  depositAmount: number;
  walletBalance: number;
  onCancel: () => void;
  onContinue: () => void;
  onConfirmDeposit: (topUpAmount: number) => void;
}) {
  const missingAmount = Math.max(0, depositAmount - walletBalance);
  const [step, setStep] = useState<DepositStep>(
    missingAmount > 0 ? "need-topup" : "confirm",
  );
  const [processing, setProcessing] = useState(false);
  const balanceAfterDeposit = Math.max(
    0,
    walletBalance + (step === "success" ? missingAmount : 0) - depositAmount,
  );
  const actionLabel =
    action === "manual-bid" ? "đặt giá thủ công" : "thiết lập Auto-bid";

  function confirmWithCurrentWallet() {
    onConfirmDeposit(0);
    setStep("success");
  }

  function payGateway() {
    setProcessing(true);
    window.setTimeout(() => {
      onConfirmDeposit(missingAmount);
      setProcessing(false);
      setStep("success");
    }, 850);
  }
  const dialogTitle =
    step === "confirm"
      ? "Xác nhận đặt cọc để tham gia đấu giá"
      : step === "need-topup"
        ? "Bạn cần nạp thêm tiền trước khi đặt cọc"
        : step === "gateway"
          ? "Thanh toán nạp ví"
          : "Bạn đã đủ điều kiện tham gia đấu giá";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          if (step === "success") onContinue();
          else onCancel();
        }
      }}
      title={dialogTitle}
      panelClassName="bid-modal deposit-modal"
      preventClose={processing}
      closeOnBackdrop={step !== "success"}
      closeLabel="Đóng xác nhận đặt cọc"
    >
        {step === "confirm" && (
          <>
            <p>YÊU CẦU ĐẶT CỌC</p>
            <div className="deposit-summary">
              <span>
                <Gavel />
                {auctionName}
              </span>
              <dl>
                <div>
                  <dt>Giá khởi điểm</dt>
                  <dd>{formatMoney(startPrice)}</dd>
                </div>
                <div>
                  <dt>Tiền cọc 10%</dt>
                  <dd>{formatMoney(depositAmount)}</dd>
                </div>
                <div>
                  <dt>Số dư ví hiện tại</dt>
                  <dd>{formatMoney(walletBalance)}</dd>
                </div>
                <div>
                  <dt>Số dư sau khi cọc</dt>
                  <dd>{formatMoney(walletBalance - depositAmount)}</dd>
                </div>
              </dl>
            </div>
            <p className="deposit-note">
              <ShieldCheck /> Khoản cọc demo sẽ được trừ khỏi ví để mở quyền{" "}
              {actionLabel} cho phiên này.
            </p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={onCancel}>
                Để sau
              </Button>
              <Button onClick={confirmWithCurrentWallet}>
                Đồng ý đặt cọc
              </Button>
            </div>
          </>
        )}

        {step === "need-topup" && (
          <>
            <p>VÍ CHƯA ĐỦ SỐ DƯ</p>
            <div className="deposit-alert">
              <AlertCircle />
              <div>
                <strong>Thiếu {formatMoney(missingAmount)}</strong>
                <span>
                  Tiền cọc bắt buộc là {formatMoney(depositAmount)}, ví hiện có{" "}
                  {formatMoney(walletBalance)}.
                </span>
              </div>
            </div>
            <div className="deposit-summary">
              <dl>
                <div>
                  <dt>Giá khởi điểm</dt>
                  <dd>{formatMoney(startPrice)}</dd>
                </div>
                <div>
                  <dt>Tiền cọc 10%</dt>
                  <dd>{formatMoney(depositAmount)}</dd>
                </div>
                <div>
                  <dt>Nạp bổ sung</dt>
                  <dd>{formatMoney(missingAmount)}</dd>
                </div>
              </dl>
            </div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={onCancel}>
                Hủy
              </Button>
              <Button
                leftIcon={<CreditCard />}
                onClick={() => setStep("gateway")}
              >
                Nạp qua payment gateway
              </Button>
            </div>
          </>
        )}

        {step === "gateway" && (
          <>
            <p>PAYMENT GATEWAY MOCK</p>
            <div className="payment-gateway-card">
              <CreditCard />
              <div>
                <span>Số tiền cần nạp</span>
                <strong>{formatMoney(missingAmount)}</strong>
                <small>SGDG Payment Gateway · giao dịch demo</small>
              </div>
            </div>
            <div className="deposit-summary">
              <dl>
                <div>
                  <dt>Ví sau khi nạp</dt>
                  <dd>{formatMoney(walletBalance + missingAmount)}</dd>
                </div>
                <div>
                  <dt>Tự động trừ cọc</dt>
                  <dd>{formatMoney(depositAmount)}</dd>
                </div>
                <div>
                  <dt>Số dư cuối</dt>
                  <dd>{formatMoney(balanceAfterDeposit)}</dd>
                </div>
              </dl>
            </div>
            <div className="modal-actions">
              <Button
                variant="secondary"
                disabled={processing}
                onClick={() => setStep("need-topup")}
              >
                Quay lại
              </Button>
              <Button
                loading={processing}
                loadingText="Đang xử lý"
                onClick={payGateway}
              >
                Thanh toán và đặt cọc
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <p>ĐẶT CỌC THÀNH CÔNG</p>
            <div className="deposit-success">
              <CheckCircle2 />
              <div>
                <strong>
                  {missingAmount > 0
                    ? `Đã nạp ${formatMoney(missingAmount)} và trừ cọc ${formatMoney(depositAmount)}`
                    : `Đã trừ cọc ${formatMoney(depositAmount)}`}
                </strong>
                <span>Số dư ví mới: {formatMoney(balanceAfterDeposit)}</span>
              </div>
            </div>
            <p className="deposit-note">
              <Wallet /> Quyền {actionLabel} đã được mở cho phiên này.
            </p>
            <div className="modal-actions">
              <Button onClick={onContinue}>
                Vào đấu giá
              </Button>
            </div>
          </>
        )}
    </Dialog>
  );
}

export function LiveAuctionRoomPage() {
  const { auctionId } = useParams();
  const [params, setParams] = useSearchParams();
  const now = useDemoClock();
  const auction = catalogAuctions.find((item) => item.id === auctionId);
  const walletBalance = useDemoStore((state) => state.walletBalance);
  const auctionDeposits = useDemoStore((state) => state.auctionDeposits);
  const topUpWallet = useDemoStore((state) => state.topUpWallet);
  const payAuctionDeposit = useDemoStore(
    (state) => state.payAuctionDeposit,
  );
  const registration = useEligibilityWorkflowStore((store) =>
    store.registrations.find((item) => item.auctionId === auctionId),
  );
  const initialPrice = auction?.currentPrice ?? 0;
  const initialIncrement = auction?.minimumIncrement ?? 0;
  const initialLeaderboard = createLeaderboard(
    initialPrice,
    initialIncrement,
  );
  const initialActivities = [
    `10:05:12 · Bạn vừa đặt ${formatMoney(initialPrice)}`,
    `10:04:50 · Mi***A vừa đặt ${formatMoney(Math.max(0, initialPrice - initialIncrement))}`,
    "10:03:31 · Bạn vừa lên vị trí #1",
    `10:02:05 · An***B vừa đặt ${formatMoney(Math.max(0, initialPrice - initialIncrement * 2))}`,
    "10:00:12 · Phiên đấu giá được mở",
  ];
  const [price, setPrice] = useState(initialPrice);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    initialLeaderboard.map((entry) => ({ ...entry })),
  );
  const [activityItems, setActivityItems] =
    useState<string[]>(initialActivities);
  const [bidHistory, setBidHistory] = useState<UserBidRecord[]>(() =>
    auction?.id === "patek-nautilus"
      ? [
          {
            id: "patek-user-bid-004",
            amount: 3_250_000_000,
            source: "manual",
            result: "accepted",
            createdAt: "2026-07-18T10:05:12+07:00",
            officialPriceAfterBid: 3_250_000_000,
          },
          {
            id: "patek-user-bid-003",
            amount: 3_200_000_000,
            source: "auto",
            result: "accepted",
            createdAt: "2026-07-18T10:02:38+07:00",
            officialPriceAfterBid: 3_200_000_000,
          },
          {
            id: "patek-user-bid-002",
            amount: 3_150_000_000,
            source: "manual",
            result: "accepted",
            createdAt: "2026-07-18T09:58:44+07:00",
            officialPriceAfterBid: 3_150_000_000,
          },
          {
            id: "patek-user-bid-001",
            amount: 3_125_000_000,
            source: "manual",
            result: "rejected",
            createdAt: "2026-07-18T09:55:16+07:00",
            rejectionCode: "stale-price",
            rejectionReason:
              "Giá chính thức đã thay đổi trước khi bạn xác nhận.",
          },
        ]
      : [],
  );
  const [accepted, setAccepted] = useState(false);
  const [isOutbid, setIsOutbid] = useState(false);
  const [outbidNotice, setOutbidNotice] = useState<OutbidNotice | null>(null);
  const [manualBidPrefill, setManualBidPrefill] = useState<number | null>(null);
  const [manualBidRequestId, setManualBidRequestId] = useState(0);
  const [pendingDepositAction, setPendingDepositAction] =
    useState<DepositAction | null>(null);
  const [autoBidInstruction, setAutoBidInstruction] =
    useState<AutoBidInstruction>({
      status: "OFF",
      maximumAmount: null,
      createdAt: null,
      updatedAt: null,
    });
  const autoBidTriggerRef = useRef<HTMLButtonElement>(null);
  const competitorBidTimerRef = useRef<number | null>(null);
  const lastOutbidIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!outbidNotice) return;
    const dismissTimer = window.setTimeout(
      () => setOutbidNotice(null),
      8_000,
    );
    return () => window.clearTimeout(dismissTimer);
  }, [outbidNotice]);

  useEffect(
    () => () => {
      if (competitorBidTimerRef.current !== null)
        window.clearTimeout(competitorBidTimerRef.current);
    },
    [],
  );

  if (registration && !canEnterAuction(registration))
    return (
      <main className="live-room live-state">
        <ShieldCheck />
        <h1>Chưa thể vào phòng đấu giá</h1>
        <p>
          Đăng ký phải còn hiệu lực, Eligibility phải được duyệt và khoản bảo
          đảm phải sẵn sàng. Trạng thái hiện tại: {registration.lifecycle} ·{" "}
          {registration.eligibility}.
        </p>
        <Link
          className="button primary"
          to={`/auctions/${auctionId}/eligibility`}
        >
          Xem trạng thái đăng ký
        </Link>
      </main>
    );

  if (!auction)
    return (
      <main className="live-room live-state">
        <h1>Không tìm thấy phòng đấu giá</h1>
        <Link className="button primary" to="/auctions">
          Quay lại danh sách phiên
        </Link>
      </main>
    );

  const minimum = price + auction.minimumIncrement;
  const depositAmount = Math.ceil(auction.startPrice * 0.1);
  const hasDeposit = Boolean(auctionDeposits[auction.id]);
  const remainingMs = Math.max(0, new Date(auction.endsAt).getTime() - now);
  const panel = params.get("panel");
  const activeTab = params.get("tab") === "my-bids" ? "my-bids" : "activity";
  const openPanel = (nextPanel: DepositAction) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("panel", nextPanel);
      return next;
    });
  const openManualBid = () => {
    setManualBidPrefill(null);
    setManualBidRequestId((current) => current + 1);
    if (!hasDeposit) {
      setPendingDepositAction("manual-bid");
      return;
    }
    openPanel("manual-bid");
  };
  const openAutoBid = () => {
    if (!hasDeposit) {
      setPendingDepositAction("autobid");
      return;
    }
    openPanel("autobid");
  };
  const confirmDeposit = (topUpAmount: number) => {
    if (topUpAmount > 0) topUpWallet(topUpAmount);
    payAuctionDeposit(auction.id, depositAmount);
  };
  const continueAfterDeposit = () => {
    const action = pendingDepositAction;
    setPendingDepositAction(null);
    if (action) openPanel(action);
  };
  const closePanel = () =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      const wasAutoBid = next.get("panel") === "autobid";
      next.delete("panel");
      if (wasAutoBid)
        window.requestAnimationFrame(() => autoBidTriggerRef.current?.focus());
      return next;
    });
  const openMyBids = () =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", "my-bids");
      return next;
    });
  const closeMyBids = () =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("tab");
      return next;
    });
  const saveAutoBid = (maximumAmount: number) => {
    const now = new Date().toISOString();
    setAutoBidInstruction((current) => ({
      status: "ACTIVE",
      maximumAmount,
      createdAt: current.createdAt ?? now,
      updatedAt: now,
    }));
  };
  const disableAutoBid = () =>
    setAutoBidInstruction({
      status: "OFF",
      maximumAmount: null,
      createdAt: null,
      updatedAt: new Date().toISOString(),
    });
  const openOutbidResponse = () => {
    setManualBidPrefill(outbidNotice?.nextMinimum ?? minimum);
    setManualBidRequestId((current) => current + 1);
    setOutbidNotice(null);
    openPanel("manual-bid");
  };
  const applyAcceptedBid = (amount: number, source: BidSource) => {
    if (competitorBidTimerRef.current !== null)
      window.clearTimeout(competitorBidTimerRef.current);
    setIsOutbid(false);
    setOutbidNotice(null);
    setManualBidPrefill(null);
    setPrice(amount);
    setLeaderboard((entries) => {
      const currentUser = entries.find((entry) => entry.isCurrentUser);
      const updatedEntries = currentUser
        ? entries.map((entry) =>
            entry.isCurrentUser
              ? { ...entry, amount, bids: entry.bids + 1 }
              : entry,
          )
        : [
            ...entries,
            {
              bidderNumber: currentUserBidderNumber,
              amount,
              bids: 1,
              isCurrentUser: true,
            },
          ];
      return updatedEntries.sort((first, second) => second.amount - first.amount);
    });
    setActivityItems((items) =>
      [
        `10:06:00 · ${source === "manual" ? "Bạn vừa đặt" : "Auto-bid của bạn vừa đặt"} ${formatMoney(amount)}`,
        ...items,
      ].slice(0, 6),
    );
    setBidHistory((items) =>
      [
        {
          id: crypto.randomUUID(),
          amount,
          source,
          result: "accepted",
          createdAt: new Date().toISOString(),
          officialPriceAfterBid: amount,
        } as UserBidRecord,
        ...items,
      ].slice(0, 50),
    );
    setAccepted(true);
    setAutoBidInstruction((current) =>
      current.status === "ACTIVE" &&
      current.maximumAmount !== null &&
      current.maximumAmount < amount + auction.minimumIncrement
        ? {
            ...current,
            status: "LIMIT_REACHED",
            updatedAt: new Date().toISOString(),
          }
        : current,
    );

    competitorBidTimerRef.current = window.setTimeout(() => {
      const competitorNumber = "SBD 031";
      const competitorAmount = amount + auction.minimumIncrement;
      const nextMinimum = competitorAmount + auction.minimumIncrement;
      const noticeId = `${auction.id}:${competitorNumber}:${competitorAmount}`;

      if (lastOutbidIdRef.current === noticeId) return;
      lastOutbidIdRef.current = noticeId;
      competitorBidTimerRef.current = null;

      setPrice((current) => Math.max(current, competitorAmount));
      setLeaderboard((entries) =>
        entries
          .map((entry) =>
            entry.bidderNumber === competitorNumber
              ? {
                  ...entry,
                  amount: competitorAmount,
                  bids: entry.bids + 1,
                }
              : entry,
          )
          .sort((first, second) => second.amount - first.amount),
      );
      setActivityItems((items) =>
        [
          `Vừa xong · ${competitorNumber} vừa đặt ${formatMoney(competitorAmount)} · Bạn đã bị vượt giá`,
          ...items,
        ].slice(0, 6),
      );
      setAccepted(false);
      setIsOutbid(true);
      setOutbidNotice({
        id: noticeId,
        competitorNumber,
        competitorAmount,
        nextMinimum,
      });
      setAutoBidInstruction((current) =>
        current.status === "ACTIVE" &&
        current.maximumAmount !== null &&
        current.maximumAmount < nextMinimum
          ? {
              ...current,
              status: "LIMIT_REACHED",
              updatedAt: new Date().toISOString(),
            }
          : current,
      );
    }, 3_200);
  };
  const autoBidLabel =
    autoBidInstruction.status === "ACTIVE"
      ? "Quản lý Auto-bid"
      : autoBidInstruction.status === "LIMIT_REACHED"
        ? "Cập nhật giới hạn Auto-bid"
        : "Thiết lập Auto-bid";
  const outcome = (
    ["accepted", "below-minimum", "stale-price", "duplicate", "error"].includes(
      params.get("nextOutcome") || "",
    )
      ? params.get("nextOutcome")
      : "accepted"
  ) as Outcome;

  return (
    <main className="live-room">
      <header className="live-header">
        <div className="container live-header-inner">
          <div className="live-header-copy">
            <p>PHÒNG ĐẤU GIÁ TRỰC TIẾP</p>
            <h1>{auction.assetName}</h1>
            <small>
              {auction.code} · {auction.category} · {rule} · Đủ điều kiện tham
              gia · GMT+7
            </small>
          </div>
          <AuctionMetrics />
        </div>
      </header>
      {outbidNotice && (
        <aside
          className="outbid-toast"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          data-notice-id={outbidNotice.id}
        >
          <div className="outbid-toast__icon" aria-hidden="true">
            <BellRing />
          </div>
          <div className="outbid-toast__content">
            <span className="outbid-toast__eyebrow">
              <Flame aria-hidden="true" /> Cập nhật trực tiếp
            </span>
            <strong>Bạn vừa bị vượt giá</strong>
            <p>
              {outbidNotice.competitorNumber} đã đặt{" "}
              <b>{formatMoney(outbidNotice.competitorAmount)}</b>
            </p>
            <small>
              Giá tối thiểu tiếp theo:{" "}
              <b>{formatMoney(outbidNotice.nextMinimum)}</b>
            </small>
            <div className="outbid-toast__actions">
              <button type="button" onClick={openOutbidResponse}>
                <Gavel aria-hidden="true" />
                Đặt lại ngay
              </button>
              <button
                type="button"
                className="outbid-toast__dismiss"
                onClick={() => setOutbidNotice(null)}
              >
                Đóng
              </button>
            </div>
          </div>
          <button
            type="button"
            className="outbid-toast__close"
            aria-label="Đóng thông báo vượt giá"
            onClick={() => setOutbidNotice(null)}
          >
            <X aria-hidden="true" />
          </button>
          <span className="outbid-toast__timer" aria-hidden="true" />
        </aside>
      )}
      <div className="live-auction-stage">
        <section className="live-visual-column">
          <article className="asset-viewer">
            <img src={auction.image} alt={auction.assetName} />
            <span className="live-badge">LIVE AUCTION</span>
            <div>
              <strong>{auction.code}</strong>
              <p>Hình ảnh tài sản được xác minh trong hồ sơ phiên đấu giá.</p>
            </div>
          </article>
          <section className="asset-trust-strip" aria-label="Cam kết tài sản">
            <div className="asset-trust-item">
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>Chính hãng 100%</strong>
                <small>Bảo hành quốc tế</small>
              </span>
            </div>
            <div className="asset-trust-item">
              <CheckCircle2 aria-hidden="true" />
              <span>
                <strong>Tình trạng xác thực</strong>
                <small>Like new</small>
              </span>
            </div>
            <div className="asset-trust-item">
              <Gavel aria-hidden="true" />
              <span>
                <strong>Hồ sơ đầy đủ</strong>
                <small>Đã thẩm định</small>
              </span>
            </div>
          </section>
        </section>

          <section className="tab-shell">
            <div
              className="live-tabs"
              role="tablist"
              aria-label="Nội dung phiên đấu giá"
            >
              <button
                id="activity-tab"
                className={`live-tab ${activeTab === "activity" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "activity"}
                aria-controls="activity-panel"
                onClick={closeMyBids}
              >
                Hoạt động trực tiếp
              </button>
              <button
                id="my-bids-tab"
                className={`live-tab ${activeTab === "my-bids" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "my-bids"}
                aria-controls="my-bids-panel"
                onClick={openMyBids}
              >
                Lịch sử của tôi
              </button>
            </div>
            {activeTab === "activity" ? (
              <div
                id="activity-panel"
                role="tabpanel"
                aria-labelledby="activity-tab"
              >
                <AuctionActivity items={activityItems} />
              </div>
            ) : (
              <div
                id="my-bids-panel"
                role="tabpanel"
                aria-labelledby="my-bids-tab"
              >
                <MyBidHistoryPanel
                  bids={bidHistory}
                  currentRank={
                    leaderboard.findIndex((entry) => entry.isCurrentUser) + 1
                  }
                  onBack={closeMyBids}
                />
              </div>
            )}
            {accepted && (
              <p className="bid-success">
                <ShieldCheck /> Giá đấu của bạn đã được chấp nhận.
              </p>
            )}
          </section>

        <section className="live-command-column">
          <AuctionCountdownDial
            remainingMs={remainingMs}
            endsAt={auction.endsAt}
          />
          <section className="composer">
            <h2>Đặt giá tiếp theo (tối thiểu)</h2>
            <p className="bid-amount">
              <b>{formatMoney(minimum)}</b>
            </p>
            <p>
              Bước giá tối thiểu: {formatMoney(auction.minimumIncrement)}
            </p>
            {isOutbid && (
              <div className="outbid-inline" role="status">
                <div className="outbid-inline__icon" aria-hidden="true">
                  <Flame />
                </div>
                <div>
                  <strong>Bạn đang không còn dẫn đầu</strong>
                  <span>
                    Đặt từ {formatMoney(minimum)} để quay lại vị trí số 1.
                  </span>
                </div>
                <button type="button" onClick={openOutbidResponse}>
                  Đặt lại ngay
                </button>
              </div>
            )}
            {hasDeposit ? (
              <div className="deposit-inline-status paid">
                <ShieldCheck />
                <div>
                  <strong>Đặt cọc đã được xác nhận</strong>
                  <span>Quyền đặt giá của bạn đã được mở cho phiên này.</span>
                </div>
              </div>
            ) : (
              <div className="deposit-inline-status pending">
                <AlertCircle />
                <div>
                  <strong>Chưa đặt cọc cho phiên này</strong>
                  <span>
                    Bấm đấu giá hoặc Auto-bid để thực hiện đặt cọc 10%.
                  </span>
                </div>
              </div>
            )}
            <Button
              variant="live"
              leftIcon={<Gavel />}
              aria-label="Đặt giá thủ công"
              onClick={openManualBid}
            >
              {isOutbid
                ? `🔥 Đặt lại ${formatMoney(minimum)}`
                : "Đấu giá ngay"}
            </Button>
            <button
              ref={autoBidTriggerRef}
              className="button secondary"
              onClick={openAutoBid}
              disabled={!auction.autoBid}
            >
              {autoBidLabel}
            </button>
            {!auction.autoBid && (
              <small>Phiên này không hỗ trợ Auto-bid.</small>
            )}
            {autoBidInstruction.status !== "OFF" && (
              <div
                className={`auto-bid-inline-status ${autoBidInstruction.status === "LIMIT_REACHED" ? "limit" : ""}`}
              >
                <strong>
                  {autoBidInstruction.status === "LIMIT_REACHED"
                    ? "Auto-bid đã đạt giới hạn"
                    : "Auto-bid đang hoạt động"}
                </strong>
                <span>
                  Mức tối đa của bạn:{" "}
                  {formatMoney(autoBidInstruction.maximumAmount ?? 0)}
                </span>
                {autoBidInstruction.status === "LIMIT_REACHED" && (
                  <span>Mức tối thiểu tiếp theo: {formatMoney(minimum)}</span>
                )}
              </div>
            )}
            <small>
              Giá đấu được xác nhận lại trước khi gửi và không thể thu hồi sau
              khi hệ thống chấp nhận.
            </small>
          </section>
        </section>

        <aside className="live-competition-column">
          <LeaderboardPanel leaderboard={leaderboard} isOutbid={isOutbid} />
        </aside>
      </div>
      {panel === "manual-bid" && (
        <ManualBidModal
          key={manualBidRequestId}
          price={price}
          minimum={minimum}
          increment={auction.minimumIncrement}
          initialAmount={manualBidPrefill}
          outcome={outcome}
          onClose={closePanel}
          onAccepted={(amount) => applyAcceptedBid(amount, "manual")}
          onRejected={(amount, code, reason) =>
            setBidHistory((items) =>
              [
                {
                  id: crypto.randomUUID(),
                  amount,
                  source: "manual",
                  result: "rejected",
                  createdAt: new Date().toISOString(),
                  rejectionCode: code,
                  rejectionReason: reason,
                } as UserBidRecord,
                ...items,
              ].slice(0, 50),
            )
          }
        />
      )}
      {panel === "autobid" && (
        <AutoBidDrawer
          currentPrice={price}
          minimumNextBid={minimum}
          minimumIncrement={auction.minimumIncrement}
          auctionStatus={auction.status}
          autoBidSupported={auction.autoBid}
          instruction={autoBidInstruction}
          onSave={saveAutoBid}
          onDisable={disableAutoBid}
          onClose={closePanel}
        />
      )}
      {pendingDepositAction && (
        <DepositGateModal
          action={pendingDepositAction}
          auctionName={auction.assetName}
          startPrice={auction.startPrice}
          depositAmount={depositAmount}
          walletBalance={walletBalance}
          onCancel={() => setPendingDepositAction(null)}
          onContinue={continueAfterDeposit}
          onConfirmDeposit={confirmDeposit}
        />
      )}
    </main>
  );
}
