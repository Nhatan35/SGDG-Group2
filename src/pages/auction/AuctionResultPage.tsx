import {
  CircleDollarSign,
  Clock3,
  FileCheck2,
  History,
  ShieldAlert,
} from "lucide-react";
import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { ButtonLink } from "../../components/common/Button";
import { EmptyState } from "../../components/feedback/States";
import { AUCTION_OUTCOME_TERMS } from "../../domain/auctionDisplay";
import { auctions } from "../../services/mock/auctionService";
import {
  getAuctionResultFixture,
  resultScenarios,
  type AuctionResultScenario,
} from "../../services/mock/auctionResultService";
import { formatDateTime, formatMoney } from "../../utils/format";
import { formatDuration, useDemoClock } from "../../hooks/useDemoClock";
import {
  type AuctionDepositStatus,
  useDemoStore,
} from "../../store/demoStore";
import { useFinanceFlowStore } from "../../store/financeFlowStore";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/auction-result.css";

const depositStatusLabels: Record<AuctionDepositStatus, string> = {
  ACTIVE: "Đang được giữ",
  ON_HOLD: "Tạm giữ để đối soát",
  REFUND_PENDING: "Đang chờ hoàn cọc",
  REFUNDED: "Đã hoàn vào ví",
  FORFEITED: "Đã thu cọc",
  APPLIED_TO_PAYMENT: "Đã khấu trừ thanh toán",
};

export function AuctionResultPage() {
  const { auctionId } = useParams();
  const now = useDemoClock();
  const auction = auctions.find((item) => item.id === auctionId);
  const [params, setParams] = useSearchParams();
  const requested = params.get("scenario");
  const scenario = resultScenarios.includes(requested as AuctionResultScenario)
    ? (requested as AuctionResultScenario)
    : "rank-1-invited";
  const fixture = getAuctionResultFixture(auction?.id ?? "", scenario);
  const userName = useDemoStore((state) => state.userName);
  const bankAccount = useDemoStore((state) => state.bankAccounts[0]);
  const depositRecord = useDemoStore((state) =>
    auctionId ? state.auctionDepositRecords[auctionId] : undefined,
  );
  const holdDeposit = useDemoStore((state) => state.holdAuctionDeposit);
  const releaseDepositHold = useDemoStore(
    (state) => state.releaseAuctionDepositHold,
  );
  const requestDepositRefund = useDemoStore(
    (state) => state.requestAuctionDepositRefund,
  );
  const createDepositRefund = useFinanceFlowStore(
    (state) => state.createDepositRefundRequest,
  );

  useEffect(() => {
    if (!auction || !fixture) return;

    if (scenario === "payment-ambiguous") {
      holdDeposit(auction.id);
      return;
    }

    const refundReason =
      scenario === "cancelled"
        ? ("AUCTION_CANCELLED" as const)
        : scenario === "top3-exhausted"
          ? ("AUCTION_FAILED" as const)
          : scenario === "not-top-3"
            ? ("NOT_WINNER" as const)
            : null;

    if (!refundReason) {
      releaseDepositHold(auction.id);
      return;
    }

    requestDepositRefund(auction.id, refundReason);
    const record =
      useDemoStore.getState().auctionDepositRecords[auction.id];
    if (!record || record.status !== "REFUND_PENDING") return;

    const reasonLabels = {
      NOT_WINNER: "Hoàn cọc do khách hàng không trúng đấu giá",
      AUCTION_CANCELLED: "Hoàn cọc do phiên đấu giá bị hủy",
      AUCTION_FAILED: "Hoàn cọc do phiên không hình thành người thắng hợp lệ",
    } as const;
    createDepositRefund({
      auctionId: auction.id,
      depositReference: record.reference,
      customer: userName,
      amount: record.amount,
      bankName: bankAccount?.bankName ?? "Ví SGDG",
      reason: reasonLabels[refundReason],
    });
  }, [
    auction,
    bankAccount?.bankName,
    createDepositRefund,
    fixture,
    holdDeposit,
    releaseDepositHold,
    requestDepositRefund,
    scenario,
    userName,
  ]);

  if (!auction) return <NotFoundPage />;

  if (!fixture) {
    return (
      <main className="container auction-result-page">
        <EmptyState
          title="Chưa có kết quả cho phiên này"
          description="Kết quả đóng phiên chưa được công bố trong scenario hiện tại."
          primaryAction={
            <ButtonLink variant="secondary" to={`/auctions/${auction.id}`}>
              Quay lại chi tiết phiên
            </ButtonLink>
          }
        />
      </main>
    );
  }

  const current = fixture.attempts.find((item) => item.isCurrentUser);
  const invited = current?.status === "invited";
  const cancelled = fixture.cancelled;
  const paymentAmbiguous = current?.status === "payment-ambiguous";
  const exhausted = scenario === "top3-exhausted";
  const pending = scenario === "result-pending";
  const outcomeTitle = cancelled
    ? "Phiên đấu giá đã bị hủy"
    : invited
      ? `${AUCTION_OUTCOME_TERMS.candidate} · ${AUCTION_OUTCOME_TERMS.closingRank} #${current.rank}`
      : paymentAmbiguous
        ? "Đang chờ xác nhận nghĩa vụ"
        : exhausted
          ? "Không hình thành ứng viên hợp lệ"
          : pending
            ? "Kết quả đang được xác nhận"
            : current
              ? `${AUCTION_OUTCOME_TERMS.closingRank} #${current.rank}`
              : "Bạn không thuộc Top 3 khi đóng phiên";
  const outcomeDescription = cancelled
    ? "Phiên không xác lập thứ hạng, Candidate hoặc Final Winner."
    : invited
      ? "Bạn đang được mời phản hồi tư cách Candidate. Thứ hạng khi đóng phiên chưa phải kết quả trúng đấu giá chính thức."
      : paymentAmbiguous
        ? "Financial Mock đang đối chiếu nghĩa vụ. Chưa có xác nhận Final Winner."
        : exhausted
          ? "Các lượt Candidate đã kết thúc mà chưa xác lập Final Winner."
          : pending
            ? "Snapshot đóng phiên đã có, nhưng Candidate chưa được kích hoạt."
            : current
              ? "Thứ hạng khi đóng phiên chưa phải kết quả trúng đấu giá chính thức."
              : "Bạn vẫn có thể xem lại lịch sử bid và các phiên đấu giá khác.";

  return (
    <main className="container auction-result-page">
      <header className="auction-result-heading">
        <span>KẾT QUẢ PHIÊN ĐẤU GIÁ</span>
        <h1>{auction.assetName}</h1>
        <p>
          {auction.code} · Kết quả đóng phiên và trạng thái của bạn
        </p>
      </header>

      <div className="auction-result-layout">
        <div className="auction-result-primary">
          <section className={`result-hero ${cancelled ? "is-cancelled" : ""}`}>
            <div className="result-status-row">
              <Badge tone={cancelled ? "danger" : invited ? "warning" : "info"}>
                {cancelled
                  ? "PHIÊN ĐÃ HỦY"
                  : invited
                    ? "CANDIDATE"
                    : "KẾT QUẢ ĐÓNG PHIÊN"}
              </Badge>
              <time dateTime={fixture.closedAt}>
                Đóng lúc {formatDateTime(fixture.closedAt)} (GMT+7)
              </time>
            </div>

            <FileCheck2 aria-hidden="true" />
            <h2>{cancelled ? "Phiên không xác lập kết quả" : "Giá đóng phiên"}</h2>
            {!cancelled && (
              <strong className="result-closing-price">
                {formatMoney(fixture.closingPrice)}
              </strong>
            )}
            {cancelled && (
              <p className="result-cancelled-copy">
                Không hiển thị giá đóng phiên hoặc thứ hạng cho phiên đã hủy.
              </p>
            )}

            <div className="result-user-outcome">
              <span>KẾT QUẢ CỦA BẠN</span>
              <h3>{outcomeTitle}</h3>
              <p>{outcomeDescription}</p>

              {invited && current.deadline && (
                <div className="candidate-deadline">
                  <Clock3 aria-hidden="true" />
                  <div>
                    <small>Hạn phản hồi Candidate</small>
                    <strong>
                      Còn {formatDuration(current.deadline, now)}
                    </strong>
                    <time dateTime={current.deadline}>
                      {formatDateTime(current.deadline)} (GMT+7)
                    </time>
                  </div>
                </div>
              )}

              <div className="result-primary-actions">
                {invited ? (
                  <ButtonLink
                    to={`/me/auctions/${auction.id}/candidate`}
                    fullWidth
                  >
                    Phản hồi tư cách ứng viên
                  </ButtonLink>
                ) : cancelled ? (
                  <ButtonLink
                    variant="secondary"
                    to={`/auctions/${auction.id}`}
                    fullWidth
                  >
                    Quay lại chi tiết phiên
                  </ButtonLink>
                ) : (
                  <ButtonLink
                    variant="secondary"
                    leftIcon={<History />}
                    to={`/auctions/${auction.id}/live?tab=my-bids`}
                    fullWidth
                  >
                    Xem lịch sử bid
                  </ButtonLink>
                )}
              </div>
            </div>
          </section>

          {!cancelled && (
            <section className="candidate-timeline">
              <h2>{AUCTION_OUTCOME_TERMS.candidate} timeline</h2>
              <p>Quy trình Candidate diễn ra sau khi giá đóng phiên được ghi nhận.</p>
              <ol>
                <li>
                  <time>{formatDateTime(fixture.closedAt)}</time>
                  Phiên đấu giá đóng
                </li>
                <li>
                  <time>{formatDateTime(fixture.snapshotAt)}</time>
                  Top 3 được xác lập
                </li>
                {fixture.attempts.map((item) => (
                  <li
                    className={
                      item.rank === fixture.activeCandidateRank ? "current" : ""
                    }
                    aria-current={
                      item.rank === fixture.activeCandidateRank
                        ? "step"
                        : undefined
                    }
                    key={item.rank}
                  >
                    Ứng viên hạng {item.rank}:{" "}
                    {item.status === "invited"
                      ? "Đang chờ phản hồi"
                      : item.status === "payment-ambiguous"
                        ? "Đang chờ đối chiếu nghĩa vụ"
                        : item.status === "declined"
                          ? "Lượt phản hồi đã kết thúc"
                          : "Đang chờ"}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="auction-result-supporting">
          <section className="result-asset-card">
            <img src={auction.image} alt={auction.assetName} />
            <h2>{auction.assetName}</h2>
            <p>
              {auction.code} · {auction.category}
            </p>
          </section>

          {depositRecord && (
            <section
              className={`result-deposit-card status-${depositRecord.status.toLowerCase()}`}
              aria-live="polite"
            >
              <CircleDollarSign aria-hidden="true" />
              <div>
                <span>TIỀN CỌC CỦA BẠN</span>
                <h2>{depositStatusLabels[depositRecord.status]}</h2>
              </div>
              <strong>{formatMoney(depositRecord.amount)}</strong>
              <p>
                {depositRecord.status === "REFUND_PENDING"
                  ? "Hệ thống đã chuyển yêu cầu sang Finance. Tiền sẽ được cộng lại vào ví sau khi lệnh hoàn tất."
                  : depositRecord.status === "REFUNDED"
                    ? "Khoản cọc đã được cộng lại vào số dư khả dụng trong ví."
                    : depositRecord.status === "ON_HOLD"
                      ? "Khoản cọc chưa bị thu hoặc hoàn trong thời gian đối soát nghĩa vụ."
                      : "Khoản cọc tiếp tục được xử lý theo kết quả và nghĩa vụ thanh toán."}
              </p>
              <ButtonLink
                variant="secondary"
                to="/account/deposits"
                fullWidth
              >
                Xem lịch sử tiền cọc
              </ButtonLink>
            </section>
          )}

          {!cancelled && (
            <section className="result-top-three">
              <h2>Thứ hạng khi đóng phiên</h2>
              {fixture.attempts.map((item) => (
                <div
                  className={
                    item.isCurrentUser
                      ? "result-rank-row current"
                      : "result-rank-row"
                  }
                  key={item.rank}
                >
                  <b>#{item.rank}</b>
                  <span>
                    {item.alias}
                    {item.isCurrentUser && <small>Bạn</small>}
                  </span>
                  <strong>
                    {formatMoney(
                      fixture.closingPrice - (item.rank - 1) * 25_000_000,
                    )}
                  </strong>
                </div>
              ))}
            </section>
          )}

          <section className="result-reference">
            <ShieldAlert aria-hidden="true" />
            <h2>Tham chiếu kết quả</h2>
            <p>Mã kết quả: {fixture.resultReference}</p>
            <p>Snapshot: {formatDateTime(fixture.snapshotAt)} (GMT+7)</p>
            <Badge tone="info">CHỈ ĐỌC</Badge>
            <small>
              Snapshot ghi nhận giá đóng phiên và Candidate; không phải xác
              nhận {AUCTION_OUTCOME_TERMS.finalWinner}.
            </small>
          </section>
        </aside>
      </div>

      {params.get("demo") === "1" && (
        <label className="result-demo-controls">
          Điều khiển mô phỏng
          <select
            value={scenario}
            onChange={(event) =>
              setParams((currentParams) => {
                const next = new URLSearchParams(currentParams);
                next.set("scenario", event.target.value);
                return next;
              })
            }
          >
            {resultScenarios.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      )}
    </main>
  );
}
