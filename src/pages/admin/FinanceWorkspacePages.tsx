import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  CreditCard,
  Download,
  Eye,
  FileCheck2,
  Gavel,
  Landmark,
  RefreshCw,
  ReceiptText,
  Search,
  ShieldCheck,
  TrendingUp,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "../../components/common/Dialog";
import { useDemoStore } from "../../store/demoStore";
import {
  type FinanceRisk,
  type PayoutRequest,
  type PayoutStatus,
  type ReconciliationBatch,
  type ReconciliationStatus,
  type RefundRequest,
  type RefundStatus,
  useFinanceFlowStore,
} from "../../store/financeFlowStore";
import { formatMoney } from "../../utils/format";

const payoutLabels: Record<PayoutStatus, string> = {
  PENDING_REVIEW: "Chờ kiểm tra",
  APPROVED: "Đã duyệt",
  PROCESSING: "Đang chi trả",
  PAID: "Đã chi trả",
  REJECTED: "Từ chối",
};

const refundLabels: Record<RefundStatus, string> = {
  PENDING_REVIEW: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  PROCESSING: "Đang hoàn tiền",
  COMPLETED: "Hoàn tất",
  REJECTED: "Từ chối",
};

const reconciliationLabels: Record<ReconciliationStatus, string> = {
  MATCHED: "Đã khớp",
  MISMATCH: "Có sai lệch",
  RESOLVED: "Đã xử lý",
};

const riskLabels: Record<FinanceRisk, string> = {
  LOW: "Rủi ro thấp",
  MEDIUM: "Cần lưu ý",
  HIGH: "Rủi ro cao",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusTone(
  status: PayoutStatus | RefundStatus | ReconciliationStatus,
) {
  if (["PAID", "COMPLETED", "MATCHED", "RESOLVED"].includes(status)) {
    return "success";
  }
  if (status === "REJECTED") return "danger";
  if (["PROCESSING", "APPROVED"].includes(status)) return "info";
  return "warning";
}

function StatusPill({
  status,
  children,
}: {
  status: PayoutStatus | RefundStatus | ReconciliationStatus;
  children: string;
}) {
  return (
    <span className={`finance-flow-status ${statusTone(status)}`}>
      {children}
    </span>
  );
}

function FinanceHeader({
  title,
  intro,
  actions,
}: {
  title: string;
  intro: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="admin-heading finance-flow-heading">
      <div>
        <span>FINANCIAL MANAGEMENT</span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {actions ?? (
        <span className="finance-flow-live">
          <CheckCircle2 aria-hidden="true" />
          Dữ liệu đang đồng bộ
        </span>
      )}
    </header>
  );
}

export function FinanceDashboardPage() {
  const navigate = useNavigate();
  const payouts = useFinanceFlowStore((state) => state.payoutRequests);
  const refunds = useFinanceFlowStore((state) => state.refundRequests);
  const batches = useFinanceFlowStore((state) => state.reconciliationBatches);

  const pendingPayouts = payouts.filter(
    (item) => item.status === "PENDING_REVIEW",
  );
  const pendingRefunds = refunds.filter(
    (item) => item.status === "PENDING_REVIEW",
  );
  const mismatches = batches.filter((item) => item.status === "MISMATCH");
  const outgoing = payouts
    .filter((item) =>
      ["PENDING_REVIEW", "APPROVED", "PROCESSING"].includes(item.status),
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const paid = payouts
    .filter((item) => item.status === "PAID")
    .reduce((sum, item) => sum + item.amount, 0);
  const inflow = 3_282_500_000 + 450_000_000 + 125_000_000;

  const priorities = [
    ...pendingPayouts.slice(0, 2).map((item) => ({
      id: item.id,
      title: `Duyệt yêu cầu rút tiền của ${item.userName}`,
      meta: `${formatMoney(item.amount)} · ${formatDateTime(item.createdAt)}`,
      route: "/finance/settlements",
      tone: item.risk === "HIGH" ? "danger" : "warning",
    })),
    ...pendingRefunds.slice(0, 1).map((item) => ({
      id: item.id,
      title: `Kiểm tra hoàn tiền cho ${item.customer}`,
      meta: `${formatMoney(item.amount)} · ${item.paymentId}`,
      route: "/finance/refunds",
      tone: "warning",
    })),
    ...mismatches.slice(0, 1).map((item) => ({
      id: item.id,
      title: `Xử lý ${item.mismatchCount} giao dịch lệch đối soát`,
      meta: `${item.provider} · ${formatMoney(
        Math.abs(item.internalAmount - item.providerAmount),
      )}`,
      route: "/finance/reconciliation",
      tone: "danger",
    })),
  ];

  return (
    <>
      <FinanceHeader
        title="Trung tâm điều hành dòng tiền"
        intro="Theo dõi tiền vào, tiền tạm giữ, hoàn tiền và lệnh chi từ một hàng đợi nghiệp vụ thống nhất."
      />

      <section
        className="finance-flow-metrics"
        aria-label="Chỉ số vận hành tài chính"
      >
        <button type="button" onClick={() => navigate("/admin/payments")}>
          <span className="finance-flow-icon incoming">
            <ArrowDownLeft aria-hidden="true" />
          </span>
          <small>Tiền vào hôm nay</small>
          <strong>{formatMoney(inflow)}</strong>
          <em>12 giao dịch chờ xác minh</em>
        </button>
        <button type="button" onClick={() => navigate("/finance/settlements")}>
          <span className="finance-flow-icon outgoing">
            <ArrowUpRight aria-hidden="true" />
          </span>
          <small>Tiền chờ chi</small>
          <strong>{formatMoney(outgoing)}</strong>
          <em>{pendingPayouts.length} yêu cầu cần Finance duyệt</em>
        </button>
        <button type="button" onClick={() => navigate("/finance/refunds")}>
          <span className="finance-flow-icon refund">
            <ReceiptText aria-hidden="true" />
          </span>
          <small>Hoàn tiền đang mở</small>
          <strong>{pendingRefunds.length}</strong>
          <em>
            {formatMoney(
              pendingRefunds.reduce((sum, item) => sum + item.amount, 0),
            )}
          </em>
        </button>
        <button
          type="button"
          onClick={() => navigate("/finance/reconciliation")}
        >
          <span className="finance-flow-icon mismatch">
            <AlertTriangle aria-hidden="true" />
          </span>
          <small>Lệch đối soát</small>
          <strong>{mismatches.length}</strong>
          <em>Cần bổ sung bằng chứng trong ngày</em>
        </button>
      </section>

      <section className="finance-cash-position">
        <div>
          <span>Dòng tiền khả dụng</span>
          <strong>{formatMoney(4_126_800_000)}</strong>
          <small>Cập nhật lúc 09:12, 28/07/2026</small>
        </div>
        <div className="finance-cash-breakdown">
          <span>
            <i className="available" />
            Khả dụng
            <strong>4,13 tỷ</strong>
          </span>
          <span>
            <i className="reserved" />
            Đang tạm giữ
            <strong>{formatMoney(outgoing)}</strong>
          </span>
          <span>
            <i className="paid" />
            Đã chi hôm nay
            <strong>{formatMoney(paid)}</strong>
          </span>
        </div>
        <button type="button" onClick={() => navigate("/finance/reports")}>
          Xem báo cáo dòng tiền <ArrowRight aria-hidden="true" />
        </button>
      </section>

      <div className="finance-dashboard-grid">
        <section className="finance-flow-card finance-priority-card">
          <header>
            <div>
              <span>HÀNG ĐỢI ƯU TIÊN</span>
              <h2>Việc cần xử lý</h2>
            </div>
            <strong>{priorities.length}</strong>
          </header>
          <div>
            {priorities.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() =>
                  navigate(item.route, { state: { focusId: item.id } })
                }
              >
                <span className={`priority-dot ${item.tone}`} />
                <span>
                  <b>{item.id}</b>
                  <strong>{item.title}</strong>
                  <small>{item.meta}</small>
                </span>
                <ArrowRight aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section className="finance-flow-card finance-process-card">
          <header>
            <div>
              <span>LUỒNG XỬ LÝ</span>
              <h2>Payout từ người dùng</h2>
            </div>
          </header>
          <ol>
            <li className="done">
              <span>1</span>
              <div>
                <strong>Người dùng gửi yêu cầu</strong>
                <small>Số tiền được tạm giữ khỏi ví khả dụng</small>
              </div>
              <CheckCircle2 aria-hidden="true" />
            </li>
            <li className={pendingPayouts.length ? "current" : "done"}>
              <span>2</span>
              <div>
                <strong>Finance kiểm tra</strong>
                <small>KYC, tài khoản nhận, số dư và rủi ro</small>
              </div>
              <ShieldCheck aria-hidden="true" />
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Tổng hợp lệnh chi</strong>
                <small>Đưa yêu cầu đã duyệt vào lô ngân hàng</small>
              </div>
              <Landmark aria-hidden="true" />
            </li>
            <li>
              <span>4</span>
              <div>
                <strong>Đối soát & hoàn tất</strong>
                <small>Cập nhật kết quả về lịch sử người dùng</small>
              </div>
              <ClipboardCheck aria-hidden="true" />
            </li>
          </ol>
          <button
            type="button"
            className="finance-inline-link"
            onClick={() => navigate("/finance/settlements")}
          >
            Mở hàng đợi chi trả <ArrowRight aria-hidden="true" />
          </button>
        </section>
      </div>
    </>
  );
}

export function SettlementsPage() {
  const payouts = useFinanceFlowStore((state) => state.payoutRequests);
  const transitionPayout = useFinanceFlowStore(
    (state) => state.transitionPayout,
  );
  const topUpWallet = useDemoStore((state) => state.topUpWallet);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | PayoutStatus>("PENDING_REVIEW");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const selected = payouts.find((item) => item.id === selectedId);

  const filtered = payouts.filter((item) => {
    const keyword = query.trim().toLowerCase();
    return (
      (status === "ALL" || item.status === status) &&
      (!keyword ||
        `${item.id} ${item.userName} ${item.bankName} ${item.accountNumber}`
          .toLowerCase()
          .includes(keyword))
    );
  });

  const pendingAmount = payouts
    .filter((item) =>
      ["PENDING_REVIEW", "APPROVED", "PROCESSING"].includes(item.status),
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const approvedCount = payouts.filter(
    (item) => item.status === "APPROVED",
  ).length;

  function updatePayout(next: PayoutStatus) {
    if (!selected) return;
    const previousStatus = selected.status;
    const changed = transitionPayout(selected.id, next, note);
    if (!changed) return;
    if (
      next === "REJECTED" &&
      previousStatus === "PENDING_REVIEW" &&
      selected.userCode === "USR-CURRENT"
    ) {
      topUpWallet(selected.amount);
    }
    setNote("");
    setNotice(
      next === "REJECTED"
        ? `Đã từ chối ${selected.id}; khoản tạm giữ đã được hoàn lại nếu đây là yêu cầu của người dùng hiện tại.`
        : `Đã cập nhật ${selected.id}: ${payoutLabels[next]}.`,
    );
  }

  function createPaymentBatch() {
    payouts
      .filter((item) => item.status === "APPROVED")
      .forEach((item) =>
        transitionPayout(
          item.id,
          "PROCESSING",
          "Đã thêm vào lô chi trả PAYOUT-BATCH-2807.",
        ),
      );
    setNotice(
      `Đã tổng hợp ${approvedCount} lệnh vào PAYOUT-BATCH-2807 để gửi ngân hàng.`,
    );
  }

  return (
    <>
      <FinanceHeader
        title="Quyết toán & chi trả"
        intro="Tiếp nhận payout từ ví người dùng, kiểm tra người nhận và theo dõi đến khi ngân hàng xác nhận."
        actions={
          <button
            type="button"
            className="finance-primary-action"
            disabled={!approvedCount}
            onClick={createPaymentBatch}
          >
            <Landmark aria-hidden="true" />
            Tổng hợp lệnh chi ({approvedCount})
          </button>
        }
      />

      <section
        className="finance-queue-summary"
        aria-label="Tổng hợp yêu cầu chi trả"
      >
        <article>
          <small>Chờ Finance kiểm tra</small>
          <strong>
            {payouts.filter((item) => item.status === "PENDING_REVIEW").length}
          </strong>
          <span>Yêu cầu mới từ phía người dùng</span>
        </article>
        <article>
          <small>Tổng tiền đang tạm giữ</small>
          <strong>{formatMoney(pendingAmount)}</strong>
          <span>Chưa rời khỏi tài khoản thanh toán</span>
        </article>
        <article>
          <small>Đang xử lý tại ngân hàng</small>
          <strong>
            {payouts.filter((item) => item.status === "PROCESSING").length}
          </strong>
          <span>Chờ mã tham chiếu ngân hàng</span>
        </article>
      </section>

      {notice && (
        <p className="finance-flow-notice" role="status">
          <CheckCircle2 aria-hidden="true" />
          {notice}
        </p>
      )}

      <section className="finance-queue-shell">
        <nav className="finance-queue-tabs" aria-label="Trạng thái chi trả">
          {(
            [
              ["PENDING_REVIEW", "Chờ kiểm tra"],
              ["APPROVED", "Đã duyệt"],
              ["PROCESSING", "Đang chi trả"],
              ["PAID", "Hoàn tất"],
              ["REJECTED", "Từ chối"],
              ["ALL", "Tất cả"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={status === value ? "active" : ""}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {label}
              <span>
                {value === "ALL"
                  ? payouts.length
                  : payouts.filter((item) => item.status === value).length}
              </span>
            </button>
          ))}
        </nav>
        <FinanceToolbar
          query={query}
          setQuery={setQuery}
          placeholder="Tìm mã payout, người dùng hoặc ngân hàng..."
        />
        <div className="finance-table-wrap">
          <table className="finance-flow-table">
            <thead>
              <tr>
                <th>Yêu cầu</th>
                <th>Người nhận</th>
                <th>Tài khoản ngân hàng</th>
                <th>Số tiền</th>
                <th>Rủi ro</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.id}</strong>
                    <small>{formatDateTime(item.createdAt)}</small>
                  </td>
                  <td>
                    <strong>{item.userName}</strong>
                    <small>{item.userCode}</small>
                  </td>
                  <td>
                    <strong>{item.bankName}</strong>
                    <small>{item.accountNumber}</small>
                  </td>
                  <td>
                    <strong className="finance-money">
                      {formatMoney(item.amount)}
                    </strong>
                    <small>
                      {item.source === "CUSTOMER_WALLET"
                        ? "Rút từ ví"
                        : "Quyết toán phiên"}
                    </small>
                  </td>
                  <td>
                    <span className={`finance-risk ${item.risk.toLowerCase()}`}>
                      {riskLabels[item.risk]}
                    </span>
                  </td>
                  <td>
                    <StatusPill status={item.status}>
                      {payoutLabels[item.status]}
                    </StatusPill>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="finance-row-action"
                      aria-label={`Xem yêu cầu ${item.id}`}
                      onClick={() => {
                        setSelectedId(item.id);
                        setNote("");
                      }}
                    >
                      <Eye aria-hidden="true" /> Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="finance-flow-empty">
              Không có yêu cầu phù hợp với bộ lọc.
            </div>
          )}
        </div>
      </section>

      <PayoutDialog
        payout={selected}
        note={note}
        setNote={setNote}
        close={() => setSelectedId(null)}
        update={updatePayout}
      />
    </>
  );
}

function PayoutDialog({
  payout,
  note,
  setNote,
  close,
  update,
}: {
  payout?: PayoutRequest;
  note: string;
  setNote: (value: string) => void;
  close: () => void;
  update: (status: PayoutStatus) => void;
}) {
  if (!payout) return null;
  const pending = payout.status === "PENDING_REVIEW";
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && close()}
      size="lg"
      panelClassName="finance-flow-dialog"
      title={`Kiểm tra yêu cầu ${payout.id}`}
      description="Mọi thay đổi trạng thái đều được ghi vào lịch sử nghiệp vụ."
      footer={
        <>
          <button type="button" className="button secondary" onClick={close}>
            Đóng
          </button>
          {pending && (
            <>
              <button
                type="button"
                className="button secondary finance-danger-button"
                disabled={note.trim().length < 5}
                onClick={() => update("REJECTED")}
              >
                Từ chối & hoàn số dư
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => update("APPROVED")}
              >
                Duyệt yêu cầu
              </button>
            </>
          )}
          {payout.status === "APPROVED" && (
            <button
              type="button"
              className="button primary"
              onClick={() => update("PROCESSING")}
            >
              Đưa vào lệnh chi
            </button>
          )}
          {payout.status === "PROCESSING" && (
            <button
              type="button"
              className="button primary"
              onClick={() => update("PAID")}
            >
              Xác nhận ngân hàng đã chi
            </button>
          )}
        </>
      }
    >
      <div className="finance-dialog-grid">
        <section>
          <h3>Thông tin payout</h3>
          <dl className="finance-detail-list">
            <div>
              <dt>Người yêu cầu</dt>
              <dd>{payout.userName}</dd>
            </div>
            <div>
              <dt>Nguồn tiền</dt>
              <dd>
                {payout.source === "CUSTOMER_WALLET"
                  ? "Ví người dùng"
                  : "Quyết toán đấu giá"}
              </dd>
            </div>
            <div>
              <dt>Ngân hàng</dt>
              <dd>{payout.bankName}</dd>
            </div>
            <div>
              <dt>Số tài khoản</dt>
              <dd>{payout.accountNumber}</dd>
            </div>
            <div>
              <dt>Chủ tài khoản</dt>
              <dd>{payout.accountHolder}</dd>
            </div>
            <div className="total">
              <dt>Số tiền chi</dt>
              <dd>{formatMoney(payout.amount)}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h3>Kiểm soát trước chi trả</h3>
          <ul className="finance-control-list">
            <li className="passed">
              <BadgeCheck aria-hidden="true" />
              <span>
                <strong>eKYC đã xác minh</strong>
                <small>Thông tin định danh còn hiệu lực</small>
              </span>
            </li>
            <li className="passed">
              <BadgeCheck aria-hidden="true" />
              <span>
                <strong>Tài khoản nhận đã liên kết</strong>
                <small>Tên chủ tài khoản trùng hồ sơ</small>
              </span>
            </li>
            <li className="passed">
              <BadgeCheck aria-hidden="true" />
              <span>
                <strong>Số dư đã được tạm giữ</strong>
                <small>Không thể sử dụng trong yêu cầu khác</small>
              </span>
            </li>
            <li className={payout.risk === "HIGH" ? "warning" : "passed"}>
              {payout.risk === "HIGH" ? (
                <AlertTriangle aria-hidden="true" />
              ) : (
                <BadgeCheck aria-hidden="true" />
              )}
              <span>
                <strong>{riskLabels[payout.risk]}</strong>
                <small>Chấm điểm theo số tiền và tần suất payout</small>
              </span>
            </li>
          </ul>
        </section>
      </div>
      <label className="finance-note-field">
        Ghi chú xử lý
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            pending
              ? "Bắt buộc nhập ít nhất 5 ký tự nếu từ chối..."
              : "Bổ sung mã tham chiếu hoặc ghi chú đối soát..."
          }
        />
      </label>
      <FinanceTimeline events={payout.timeline} />
    </Dialog>
  );
}

export function RefundsPage() {
  const refunds = useFinanceFlowStore((state) => state.refundRequests);
  const transitionRefund = useFinanceFlowStore(
    (state) => state.transitionRefund,
  );
  const [status, setStatus] = useState<"ALL" | RefundStatus>("PENDING_REVIEW");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const selected = refunds.find((item) => item.id === selectedId);
  const filtered = refunds.filter((item) => {
    const keyword = query.trim().toLowerCase();
    return (
      (status === "ALL" || item.status === status) &&
      (!keyword ||
        `${item.id} ${item.paymentId} ${item.customer} ${item.reason}`
          .toLowerCase()
          .includes(keyword))
    );
  });

  function updateRefund(next: RefundStatus) {
    if (!selected) return;
    if (!transitionRefund(selected.id, next, note)) return;
    setNotice(`Đã cập nhật ${selected.id}: ${refundLabels[next]}.`);
    setNote("");
  }

  return (
    <>
      <FinanceHeader
        title="Hoàn tiền"
        intro="Kiểm tra giao dịch gốc, nguyên nhân, hạn mức và kiểm soát hoàn trùng trước khi ra lệnh."
      />
      <section className="finance-queue-summary compact">
        <article>
          <small>Chờ duyệt</small>
          <strong>
            {refunds.filter((item) => item.status === "PENDING_REVIEW").length}
          </strong>
          <span>Yêu cầu mới từ Support và hệ thống</span>
        </article>
        <article>
          <small>Đang hoàn tiền</small>
          <strong>
            {refunds.filter((item) => item.status === "PROCESSING").length}
          </strong>
          <span>Chờ cổng thanh toán phản hồi</span>
        </article>
        <article>
          <small>Tổng giá trị đang mở</small>
          <strong>
            {formatMoney(
              refunds
                .filter((item) =>
                  ["PENDING_REVIEW", "APPROVED", "PROCESSING"].includes(
                    item.status,
                  ),
                )
                .reduce((sum, item) => sum + item.amount, 0),
            )}
          </strong>
          <span>Không bao gồm yêu cầu đã hoàn tất</span>
        </article>
      </section>
      {notice && (
        <p className="finance-flow-notice" role="status">
          <CheckCircle2 aria-hidden="true" /> {notice}
        </p>
      )}
      <section className="finance-queue-shell">
        <nav className="finance-queue-tabs" aria-label="Trạng thái hoàn tiền">
          {(
            [
              ["PENDING_REVIEW", "Chờ duyệt"],
              ["APPROVED", "Đã duyệt"],
              ["PROCESSING", "Đang xử lý"],
              ["COMPLETED", "Hoàn tất"],
              ["REJECTED", "Từ chối"],
              ["ALL", "Tất cả"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={status === value ? "active" : ""}
              onClick={() => setStatus(value)}
            >
              {label}
              <span>
                {value === "ALL"
                  ? refunds.length
                  : refunds.filter((item) => item.status === value).length}
              </span>
            </button>
          ))}
        </nav>
        <FinanceToolbar
          query={query}
          setQuery={setQuery}
          placeholder="Tìm mã hoàn tiền, giao dịch hoặc khách hàng..."
        />
        <div className="finance-table-wrap">
          <table className="finance-flow-table">
            <thead>
              <tr>
                <th>Mã hoàn tiền</th>
                <th>Giao dịch gốc</th>
                <th>Khách hàng</th>
                <th>Lý do</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.id}</strong>
                    <small>{formatDateTime(item.createdAt)}</small>
                  </td>
                  <td>
                    <strong>{item.paymentId}</strong>
                    <small>{item.bankName}</small>
                  </td>
                  <td>{item.customer}</td>
                  <td className="finance-reason-cell">{item.reason}</td>
                  <td>
                    <strong className="finance-money">
                      {formatMoney(item.amount)}
                    </strong>
                  </td>
                  <td>
                    <StatusPill status={item.status}>
                      {refundLabels[item.status]}
                    </StatusPill>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="finance-row-action"
                      aria-label={`Xem yêu cầu hoàn tiền ${item.id}`}
                      onClick={() => {
                        setSelectedId(item.id);
                        setNote("");
                      }}
                    >
                      <Eye aria-hidden="true" /> Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <RefundDialog
        refund={selected}
        note={note}
        setNote={setNote}
        close={() => setSelectedId(null)}
        update={updateRefund}
      />
    </>
  );
}

function RefundDialog({
  refund,
  note,
  setNote,
  close,
  update,
}: {
  refund?: RefundRequest;
  note: string;
  setNote: (value: string) => void;
  close: () => void;
  update: (status: RefundStatus) => void;
}) {
  if (!refund) return null;
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && close()}
      size="lg"
      panelClassName="finance-flow-dialog"
      title={`Hồ sơ hoàn tiền ${refund.id}`}
      description="Đối chiếu với giao dịch gốc trước khi thay đổi trạng thái."
      footer={
        <>
          <button type="button" className="button secondary" onClick={close}>
            Đóng
          </button>
          {refund.status === "PENDING_REVIEW" && (
            <>
              <button
                type="button"
                className="button secondary finance-danger-button"
                disabled={note.trim().length < 5}
                onClick={() => update("REJECTED")}
              >
                Từ chối
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => update("APPROVED")}
              >
                Duyệt hoàn tiền
              </button>
            </>
          )}
          {refund.status === "APPROVED" && (
            <button
              type="button"
              className="button primary"
              onClick={() => update("PROCESSING")}
            >
              Gửi lệnh hoàn tiền
            </button>
          )}
          {refund.status === "PROCESSING" && (
            <button
              type="button"
              className="button primary"
              onClick={() => update("COMPLETED")}
            >
              Xác nhận hoàn tất
            </button>
          )}
        </>
      }
    >
      <div className="finance-dialog-highlight">
        <ReceiptText aria-hidden="true" />
        <div>
          <span>Số tiền cần hoàn</span>
          <strong>{formatMoney(refund.amount)}</strong>
        </div>
        <StatusPill status={refund.status}>
          {refundLabels[refund.status]}
        </StatusPill>
      </div>
      <dl className="finance-detail-list two-column">
        <div>
          <dt>Giao dịch gốc</dt>
          <dd>{refund.paymentId}</dd>
        </div>
        <div>
          <dt>Khách hàng</dt>
          <dd>{refund.customer}</dd>
        </div>
        <div>
          <dt>Ngân hàng nhận</dt>
          <dd>{refund.bankName}</dd>
        </div>
        <div>
          <dt>Mức rủi ro</dt>
          <dd>{riskLabels[refund.risk]}</dd>
        </div>
        <div className="wide">
          <dt>Lý do hoàn tiền</dt>
          <dd>{refund.reason}</dd>
        </div>
      </dl>
      <label className="finance-note-field">
        Ghi chú nghiệp vụ
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nhập căn cứ phê duyệt hoặc lý do từ chối..."
        />
      </label>
      <FinanceTimeline events={refund.timeline} />
    </Dialog>
  );
}

export function ReconciliationPage() {
  const batches = useFinanceFlowStore((state) => state.reconciliationBatches);
  const lastSyncAt = useFinanceFlowStore((state) => state.lastSyncAt);
  const sync = useFinanceFlowStore((state) => state.syncReconciliation);
  const resolve = useFinanceFlowStore((state) => state.resolveReconciliation);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | ReconciliationStatus>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const selected = batches.find((item) => item.id === selectedId);

  const filtered = batches.filter((item) => {
    const keyword = query.trim().toLowerCase();
    return (
      (status === "ALL" || item.status === status) &&
      (!keyword ||
        `${item.id} ${item.provider} ${item.period}`
          .toLowerCase()
          .includes(keyword))
    );
  });

  const totalDifference = batches
    .filter((item) => item.status === "MISMATCH")
    .reduce(
      (sum, item) => sum + Math.abs(item.internalAmount - item.providerAmount),
      0,
    );

  function resolveSelected() {
    if (!selected || note.trim().length < 5) return;
    if (resolve(selected.id, note)) {
      setNotice(`Đã xử lý sai lệch của ${selected.id}.`);
      setNote("");
    }
  }

  return (
    <>
      <FinanceHeader
        title="Đối soát dòng tiền"
        intro="So sánh sổ nội bộ với ngân hàng, VietQR và cổng thanh toán; xử lý sai lệch có bằng chứng."
        actions={
          <button
            type="button"
            className="finance-secondary-action"
            onClick={() => {
              sync();
              setNotice("Đã đồng bộ dữ liệu đối soát mới nhất.");
            }}
          >
            <RefreshCw aria-hidden="true" />
            Đồng bộ lại
          </button>
        }
      />
      <section className="finance-reconciliation-banner">
        <div>
          <span>Chênh lệch chưa xử lý</span>
          <strong>{formatMoney(totalDifference)}</strong>
          <small>Lần đồng bộ gần nhất: {formatDateTime(lastSyncAt)}</small>
        </div>
        <div>
          <span>
            <CheckCircle2 aria-hidden="true" />
            {batches.filter((item) => item.status === "MATCHED").length} lô đã
            khớp
          </span>
          <span>
            <AlertTriangle aria-hidden="true" />
            {batches.filter((item) => item.status === "MISMATCH").length} lô cần
            xử lý
          </span>
        </div>
      </section>
      {notice && (
        <p className="finance-flow-notice" role="status">
          <CheckCircle2 aria-hidden="true" /> {notice}
        </p>
      )}
      <section className="finance-queue-shell">
        <div className="finance-reconciliation-toolbar">
          <FinanceToolbar
            query={query}
            setQuery={setQuery}
            placeholder="Tìm mã lô hoặc đơn vị đối soát..."
          />
          <select
            aria-label="Lọc trạng thái đối soát"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "ALL" | ReconciliationStatus)
            }
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="MISMATCH">Có sai lệch</option>
            <option value="MATCHED">Đã khớp</option>
            <option value="RESOLVED">Đã xử lý</option>
          </select>
        </div>
        <div className="finance-table-wrap">
          <table className="finance-flow-table">
            <thead>
              <tr>
                <th>Lô đối soát</th>
                <th>Đơn vị</th>
                <th>Sổ nội bộ</th>
                <th>Sao kê đối tác</th>
                <th>Chênh lệch</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const difference = Math.abs(
                  item.internalAmount - item.providerAmount,
                );
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.id}</strong>
                      <small>
                        {item.period} · {item.transactionCount} giao dịch
                      </small>
                    </td>
                    <td>{item.provider}</td>
                    <td>
                      <strong>{formatMoney(item.internalAmount)}</strong>
                    </td>
                    <td>
                      <strong>{formatMoney(item.providerAmount)}</strong>
                    </td>
                    <td>
                      <strong
                        className={
                          difference
                            ? "finance-money difference"
                            : "finance-money"
                        }
                      >
                        {formatMoney(difference)}
                      </strong>
                      <small>{item.mismatchCount} giao dịch lệch</small>
                    </td>
                    <td>
                      <StatusPill status={item.status}>
                        {reconciliationLabels[item.status]}
                      </StatusPill>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="finance-row-action"
                        aria-label={`Xem lô đối soát ${item.id}`}
                        onClick={() => {
                          setSelectedId(item.id);
                          setNote("");
                        }}
                      >
                        <Eye aria-hidden="true" /> Xem
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <ReconciliationDialog
        batch={selected}
        note={note}
        setNote={setNote}
        close={() => setSelectedId(null)}
        resolve={resolveSelected}
      />
    </>
  );
}

function ReconciliationDialog({
  batch,
  note,
  setNote,
  close,
  resolve,
}: {
  batch?: ReconciliationBatch;
  note: string;
  setNote: (value: string) => void;
  close: () => void;
  resolve: () => void;
}) {
  if (!batch) return null;
  const difference = Math.abs(batch.internalAmount - batch.providerAmount);
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && close()}
      size="lg"
      panelClassName="finance-flow-dialog"
      title={`Đối soát ${batch.id}`}
      description={`${batch.provider} · Kỳ ${batch.period}`}
      footer={
        <>
          <button type="button" className="button secondary" onClick={close}>
            Đóng
          </button>
          {batch.status === "MISMATCH" && (
            <button
              type="button"
              className="button primary"
              disabled={note.trim().length < 5}
              onClick={resolve}
            >
              Xác nhận đã xử lý
            </button>
          )}
        </>
      }
    >
      <div className="finance-reconcile-comparison">
        <article>
          <span>Sổ nội bộ SGDG</span>
          <strong>{formatMoney(batch.internalAmount)}</strong>
          <small>{batch.transactionCount} giao dịch</small>
        </article>
        <ArrowRight aria-hidden="true" />
        <article>
          <span>Sao kê {batch.provider}</span>
          <strong>{formatMoney(batch.providerAmount)}</strong>
          <small>{batch.mismatchCount} giao dịch cần kiểm tra</small>
        </article>
      </div>
      <div
        className={`finance-dialog-highlight ${
          difference ? "warning" : "success"
        }`}
      >
        {difference ? (
          <AlertTriangle aria-hidden="true" />
        ) : (
          <CheckCircle2 aria-hidden="true" />
        )}
        <div>
          <span>Chênh lệch</span>
          <strong>{formatMoney(difference)}</strong>
        </div>
        <StatusPill status={batch.status}>
          {reconciliationLabels[batch.status]}
        </StatusPill>
      </div>
      {batch.status === "MISMATCH" && (
        <label className="finance-note-field">
          Căn cứ xử lý sai lệch
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ví dụ: Đã bổ sung giao dịch treo từ sao kê ngân hàng..."
          />
        </label>
      )}
      {batch.note && (
        <p className="finance-resolution-note">
          <FileCheck2 aria-hidden="true" />
          <span>
            <strong>Kết quả xử lý</strong>
            {batch.note}
          </span>
        </p>
      )}
    </Dialog>
  );
}

type ReportTab =
  "OVERVIEW" | "REVENUE" | "USERS" | "ASSETS" | "AUCTIONS" | "PAYMENTS";
type ReportGranularity = "DAY" | "WEEK" | "MONTH";

const reportTabs: Array<[ReportTab, string]> = [
  ["OVERVIEW", "Tổng quan"],
  ["REVENUE", "Doanh thu"],
  ["USERS", "Người dùng"],
  ["ASSETS", "Tài sản"],
  ["AUCTIONS", "Phiên đấu giá"],
  ["PAYMENTS", "Thanh toán"],
];

const reportGranularities: Array<[ReportGranularity, string, string]> = [
  ["DAY", "Theo ngày", "31 điểm dữ liệu"],
  ["WEEK", "Theo tuần", "5 tuần trong tháng"],
  ["MONTH", "Theo tháng", "Tổng tháng 07/2026"],
];

const reportViews: Record<
  ReportTab,
  {
    description: string;
    kpis: Array<[string, string, string, typeof CreditCard]>;
    chartTitle: string;
    chartUnit: string;
  }
> = {
  OVERVIEW: {
    description: "Bức tranh tổng hợp về doanh thu và hiệu quả vận hành.",
    kpis: [
      ["Doanh thu (VND)", "126.450.000.000", "+18,4%", CreditCard],
      ["Lợi nhuận (VND)", "18.750.000.000", "+16,2%", TrendingUp],
      ["Số phiên đấu giá", "124", "+8,3%", Gavel],
      ["Tỷ lệ thành công", "76,6%", "+3,8%", CheckCircle2],
      ["AOV (VND)", "1.245.000.000", "+12,1%", ReceiptText],
    ],
    chartTitle: "Doanh thu theo thời gian",
    chartUnit: "Đơn vị: tỷ VND",
  },
  REVENUE: {
    description: "Phân tích doanh thu thuần, phí và xu hướng theo ngày.",
    kpis: [
      ["Doanh thu gộp", "131.820.000.000", "+19,1%", CircleDollarSign],
      ["Doanh thu thuần", "126.450.000.000", "+18,4%", TrendingUp],
      ["Phí dịch vụ", "5.370.000.000", "+9,8%", ReceiptText],
      ["Hoàn tiền", "87.500.000", "-2,4%", ArrowDownLeft],
      ["Tăng trưởng", "18,4%", "+2,1%", BarChart3],
    ],
    chartTitle: "Doanh thu thuần theo ngày",
    chartUnit: "Đơn vị: tỷ VND",
  },
  USERS: {
    description: "Hành vi nạp, thanh toán và rút tiền theo nhóm người dùng.",
    kpis: [
      ["Người trả tiền", "2.846", "+12,7%", UserRound],
      ["Người rút tiền", "418", "+7,4%", WalletCards],
      ["Payout trung bình", "42.500.000", "+4,1%", Banknote],
      ["KYC hợp lệ", "98,7%", "+0,8%", ShieldCheck],
      ["Người dùng mới", "632", "+11,3%", TrendingUp],
    ],
    chartTitle: "Giá trị giao dịch theo nhóm người dùng",
    chartUnit: "Chỉ số quy đổi",
  },
  ASSETS: {
    description:
      "Đóng góp doanh thu và tỷ lệ thanh khoản theo danh mục tài sản.",
    kpis: [
      ["Tài sản đã bán", "95", "+6,7%", Gavel],
      ["Giá trị giao dịch", "118.450.000.000", "+17,9%", CreditCard],
      ["Giá bán trung bình", "1.247.000.000", "+10,2%", TrendingUp],
      ["Tỷ lệ vượt giá sàn", "22,8%", "+3,4%", BarChart3],
      ["Chờ quyết toán", "4", "-3", Clock3],
    ],
    chartTitle: "Giá trị tài sản theo ngày",
    chartUnit: "Đơn vị: tỷ VND",
  },
  AUCTIONS: {
    description: "Hiệu quả tài chính theo phiên và tỷ lệ hoàn tất thanh toán.",
    kpis: [
      ["Tổng số phiên", "124", "+8,3%", Gavel],
      ["Phiên thành công", "95", "+9,5%", CheckCircle2],
      ["Phiên không thành", "29", "-1,4%", XCircle],
      ["Tỷ lệ thanh toán", "96,8%", "+2,2%", CreditCard],
      ["Thời gian quyết toán", "1,8 ngày", "-0,4", Clock3],
    ],
    chartTitle: "Giá trị giao dịch theo phiên",
    chartUnit: "Đơn vị: tỷ VND",
  },
  PAYMENTS: {
    description: "Theo dõi tiền vào, hoàn tiền, payout và chất lượng đối soát.",
    kpis: [
      ["Giao dịch thành công", "3.568", "+14,6%", CheckCircle2],
      ["Tỷ lệ xác minh", "98,2%", "+1,5%", ShieldCheck],
      ["Payout đang mở", "4", "+1", ArrowUpRight],
      ["Hoàn tiền đang mở", "2", "-3", ReceiptText],
      ["Lệch đối soát", "2", "-1", AlertTriangle],
    ],
    chartTitle: "Luồng tiền thanh toán theo ngày",
    chartUnit: "Chỉ số quy đổi",
  },
};

export function FinanceReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("OVERVIEW");
  const [granularity, setGranularity] = useState<ReportGranularity>("DAY");
  const [notice, setNotice] = useState("");
  const view = reportViews[activeTab];
  const revenueSeries = useMemo(() => {
    const base = [
      42, 56, 31, 72, 48, 62, 39, 82, 66, 44, 76, 55, 88, 61, 47, 79, 68, 91,
      63, 52, 84, 73, 58, 87, 69, 77, 54, 86, 72, 94, 81,
    ];
    const adjustment =
      reportTabs.findIndex(([value]) => value === activeTab) * 2;
    const daily = base.map((value, index) =>
      Math.min(98, Math.max(12, value + (index % 3) * adjustment)),
    );
    if (granularity === "DAY") {
      return daily.map((value, index) => ({
        value,
        label: `${String(index + 1).padStart(2, "0")}/07`,
        showLabel: index % 5 === 0 || index === daily.length - 1,
      }));
    }
    if (granularity === "WEEK") {
      return Array.from({ length: 5 }, (_, index) => {
        const values = daily.slice(index * 7, Math.min((index + 1) * 7, 31));
        return {
          value: Math.round(
            values.reduce((total, value) => total + value, 0) / values.length,
          ),
          label: `Tuần ${index + 1}`,
          showLabel: true,
        };
      });
    }
    return [
      {
        value: Math.round(
          daily.reduce((total, value) => total + value, 0) / daily.length,
        ),
        label: "07/2026",
        showLabel: true,
      },
    ];
  }, [activeTab, granularity]);
  const granularityLabel =
    reportGranularities.find(([value]) => value === granularity)?.[1] ??
    "Theo ngày";
  const chartTitle = `${view.chartTitle.replace(/ theo ngày$/i, "").replace(/ theo thời gian$/i, "")} ${granularityLabel.toLowerCase()}`;
  const categories = [
    ["Đồng hồ", "42,5%", "#6f7f56"],
    ["Trang sức", "28,7%", "#d68a2f"],
    ["Nghệ thuật", "16,3%", "#a6b58b"],
    ["Tài sản", "9,8%", "#e8b968"],
    ["Khác", "2,7%", "#d8d2c5"],
  ] as const;
  const topAssets = [
    [
      "Rolex Submariner Date 126610LV",
      "/assets/featured-rolex-v2.png",
      "8.450.000.000 đ",
    ],
    [
      "Patek Philippe Nautilus 5711/1R",
      "/assets/patek-nautilus-v2.png",
      "7.900.000.000 đ",
    ],
    [
      "Mercedes-Benz S450L Luxury 2022",
      "/assets/catalog-mercedes-s450.png",
      "6.850.000.000 đ",
    ],
    [
      "Hermès Birkin 30 Togo Gold",
      "/assets/catalog-hermes-birkin.png",
      "5.300.000.000 đ",
    ],
    [
      "Tranh sơn dầu phong cảnh Đà Lạt",
      "/assets/catalog-dalat-painting.png",
      "3.950.000.000 đ",
    ],
  ] as const;

  return (
    <>
      <FinanceHeader
        title="Báo cáo & Phân tích"
        intro="Theo dõi dòng tiền, hiệu suất phiên và chất lượng xử lý nghiệp vụ Finance."
        actions={
          <div className="finance-report-actions">
            <div className="finance-report-period" aria-label="Kỳ báo cáo">
              <CalendarDays aria-hidden="true" />
              <span>
                <small>Kỳ dữ liệu demo</small>
                <strong>01/07/2026 - 31/07/2026</strong>
              </span>
            </div>
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setNotice(
                  `Đã tạo snapshot báo cáo ${reportTabs.find(([value]) => value === activeTab)?.[1]} ${granularityLabel.toLowerCase()} cho tháng 07/2026.`,
                )
              }
            >
              <Download aria-hidden="true" /> Xuất báo cáo
            </button>
          </div>
        }
      />
      <main className="finance-analytics">
        <nav className="finance-report-tabs" aria-label="Loại báo cáo">
          {reportTabs.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={activeTab === value ? "active" : ""}
              aria-pressed={activeTab === value}
              onClick={() => {
                setActiveTab(value);
                setNotice("");
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="finance-report-context">
          <div>
            <span>GÓC NHÌN ĐANG XEM</span>
            <strong>
              {reportTabs.find(([value]) => value === activeTab)?.[1]}
            </strong>
            <p>{view.description}</p>
          </div>
          <span>Đã khóa dữ liệu tháng 07/2026</span>
        </div>
        <section className="finance-report-granularity-panel">
          <div>
            <span>NHÓM DỮ LIỆU</span>
            <strong>Chọn cách tổng hợp cùng một tháng</strong>
            <p>
              Không đổi kỳ dữ liệu; chỉ thay đổi cách xem theo ngày, tuần hoặc
              toàn tháng.
            </p>
          </div>
          <div
            className="finance-report-granularity"
            role="group"
            aria-label="Nhóm dữ liệu báo cáo"
          >
            {reportGranularities.map(([value, label, description]) => (
              <button
                type="button"
                key={value}
                className={granularity === value ? "active" : ""}
                aria-pressed={granularity === value}
                onClick={() => {
                  setGranularity(value);
                  setNotice("");
                }}
              >
                <span>{label}</span>
                <small>{description}</small>
              </button>
            ))}
          </div>
        </section>
        {notice && (
          <p className="finance-flow-notice" role="status">
            <CheckCircle2 aria-hidden="true" /> {notice}
          </p>
        )}
        <section className="finance-report-kpis" aria-label="Chỉ số tài chính">
          {view.kpis.map(([label, value, change, Icon]) => (
            <article key={label}>
              <div>
                <span>{label}</span>
                <Icon aria-hidden="true" />
              </div>
              <strong>{value}</strong>
              <small>
                {change} <span>so với kỳ trước</span>
              </small>
            </article>
          ))}
        </section>
        <section className="finance-report-charts">
          <article className="finance-chart-card finance-revenue-chart">
            <header>
              <div>
                <h2>{chartTitle}</h2>
                <p>{view.chartUnit}</p>
              </div>
              <span>{granularityLabel} · Tháng 07/2026</span>
            </header>
            <div
              className="finance-bar-chart"
              aria-label={`Biểu đồ ${chartTitle.toLowerCase()}`}
            >
              <div className="finance-chart-axis" aria-hidden="true">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
                <span>0</span>
              </div>
              <div
                className={`finance-bars finance-bars--${granularity.toLowerCase()}`}
              >
                {revenueSeries.map(({ value, label, showLabel }, index) => (
                  <span key={`${label}-${index}`} title={`${label}: ${value}`}>
                    <i style={{ height: `${value}%` }} />
                    {showLabel && <small>{label}</small>}
                  </span>
                ))}
              </div>
            </div>
          </article>
          <article className="finance-chart-card finance-category-chart">
            <header>
              <div>
                <h2>Doanh thu theo danh mục</h2>
                <p>Tỷ trọng trên tổng giá trị</p>
              </div>
            </header>
            <div className="finance-donut-layout">
              <div
                className="finance-donut"
                role="img"
                aria-label="Tổng giá trị 126,45 tỷ VND"
              >
                <strong>126,45B</strong>
                <span>VND</span>
              </div>
              <ul>
                {categories.map(([label, value, color]) => (
                  <li key={label}>
                    <i style={{ background: color }} />
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </article>
          <article className="finance-chart-card finance-top-assets">
            <header>
              <div>
                <h2>Top tài sản có doanh thu cao</h2>
                <p>Xếp theo giá trị giao dịch</p>
              </div>
            </header>
            <ol>
              {topAssets.map(([name, image, value], index) => (
                <li key={name}>
                  <b>{index + 1}</b>
                  <img src={image} alt="" />
                  <span>{name}</span>
                  <strong>{value}</strong>
                </li>
              ))}
            </ol>
          </article>
        </section>
        <p className="finance-report-source">
          <ShieldCheck aria-hidden="true" />
          Dữ liệu đồng bộ từ Financial Management lúc 09:30, 28/07/2026.
        </p>
      </main>
    </>
  );
}

function FinanceToolbar({
  query,
  setQuery,
  placeholder,
}: {
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="finance-search">
      <Search aria-hidden="true" />
      <input
        aria-label="Tìm kiếm nghiệp vụ tài chính"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function FinanceTimeline({
  events,
}: {
  events: Array<{
    id: string;
    at: string;
    actor: string;
    label: string;
    note?: string;
  }>;
}) {
  return (
    <section className="finance-timeline">
      <h3>Lịch sử xử lý</h3>
      <ol>
        {[...events].reverse().map((event) => (
          <li key={event.id}>
            <span />
            <div>
              <strong>{event.label}</strong>
              <small>
                {event.actor} · {formatDateTime(event.at)}
              </small>
              {event.note && <p>{event.note}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
