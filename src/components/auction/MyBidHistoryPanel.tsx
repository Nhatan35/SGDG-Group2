import { useState } from "react";
import { formatDateTime, formatMoney } from "../../utils/format";
import "../../styles/my-bid-history.css";

export type BidSource = "manual" | "auto";
export type BidResult = "accepted" | "rejected";
export type BidRejectionCode = "below-minimum" | "stale-price" | "duplicate" | "not-eligible" | "auction-paused" | "auction-closed" | "unknown";
export interface UserBidRecord { id: string; amount: number; source: BidSource; result: BidResult; createdAt: string; officialPriceAfterBid?: number; rejectionCode?: BidRejectionCode; rejectionReason?: string; }

export function MyBidHistoryPanel({ bids, currentRank, onBack }: { bids: UserBidRecord[]; currentRank: number; onBack: () => void }) {
  const [filter, setFilter] = useState<"all" | BidResult>("all");
  const accepted = bids.filter((bid) => bid.result === "accepted");
  const rejected = bids.filter((bid) => bid.result === "rejected");
  const visible = filter === "all" ? bids : bids.filter((bid) => bid.result === filter);
  const highest = accepted.length ? Math.max(...accepted.map((bid) => bid.amount)) : null;
  const labels = { manual: "Thủ công", auto: "Auto-bid", accepted: "Đã chấp nhận", rejected: "Bị từ chối" };
  return <section className="my-bids-panel" aria-label="Lịch sử đặt giá của tôi">
    <header className="my-bids-header"><h2>Lịch sử đặt giá của tôi</h2><div className="my-bids-summary"><span>Vị trí hiện tại<b>{currentRank > 0 ? `#${currentRank}${currentRank === 1 ? " — Đang dẫn đầu" : ""}` : "Chưa xếp hạng"}</b></span><span>Giá cao nhất<b>{highest ? formatMoney(highest) : "—"}</b></span><span>Đã chấp nhận<b>{accepted.length} lượt</b></span><span>Bị từ chối<b>{rejected.length} lượt</b></span></div></header>
    <div className="my-bids-filters" aria-label="Lọc lịch sử bid">{(["all", "accepted", "rejected"] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item === "all" ? `Tất cả (${bids.length})` : item === "accepted" ? `Đã chấp nhận (${accepted.length})` : `Bị từ chối (${rejected.length})`}</button>)}</div>
    {!bids.length ? <div className="my-bids-empty"><h3>Bạn chưa có lượt đặt giá</h3><p>Các lượt đặt giá thủ công và Auto-bid được xử lý sẽ xuất hiện tại đây.</p><button className="button secondary" onClick={onBack}>Quay lại đặt giá</button></div> : !visible.length ? <div className="my-bids-empty"><h3>Không có lượt đặt giá phù hợp</h3><p>Không có dữ liệu trong bộ lọc hiện tại.</p><button className="button secondary" onClick={() => setFilter("all")}>Xem tất cả</button></div> : <div className="my-bids-list"><table><caption>Danh sách lịch sử đặt giá của bạn</caption><thead><tr><th>Số tiền</th><th>Thời gian</th><th>Nguồn</th><th>Kết quả</th><th>Chi tiết</th></tr></thead><tbody>{visible.map((bid) => <tr key={bid.id}><td data-label="Số tiền"><strong>{formatMoney(bid.amount)}</strong></td><td data-label="Thời gian"><time dateTime={bid.createdAt}>{formatDateTime(bid.createdAt)} (GMT+7)</time></td><td data-label="Nguồn"><span className={`my-bids-source ${bid.source}`}>{labels[bid.source]}</span></td><td data-label="Kết quả"><span className={`my-bids-result ${bid.result}`}>{labels[bid.result]}</span></td><td data-label="Chi tiết">{bid.result === "accepted" ? <>Giá chính thức sau lượt: <b>{formatMoney(bid.officialPriceAfterBid ?? bid.amount)}</b></> : <><b>Lý do:</b> {bid.rejectionReason}<small>Lượt thử này không làm thay đổi giá chính thức của phiên.</small></>}</td></tr>)}</tbody></table></div>}
  </section>;
}
