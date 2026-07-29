import { FileSearch, Search, WalletCards } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { useSupportStore } from "../../store/supportStore";
const investigationStatusLabel = {
  REQUESTED: "Chờ tiếp nhận",
  IN_PROGRESS: "Đang điều tra",
  MORE_INFO_REQUIRED: "Chờ CSKH bổ sung",
  SUBMITTED: "Đã gửi kết quả",
} as const;
const investigationTypeLabel = {
  PAYMENT: "Thanh toán",
  DEPOSIT: "Tiền đặt trước",
  REFUND: "Hoàn tiền",
} as const;
export function FinancialInvestigationQueue() {
  const items = useSupportStore((s) => s.investigations);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const filteredItems = items.filter(
    (item) =>
      (status === "ALL" || item.status === status) &&
      `${item.id} ${item.disputeId} ${item.transactionReference}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <header className="support-header">
        <div>
          <span>FINANCIAL MANAGEMENT</span>
          <h1>Điều tra tài chính</h1>
          <p>Yêu cầu điều tra tài chính do Customer Support chuyển sang.</p>
        </div>
      </header>
      <div className="support-toolbar">
        <Search />
        <input placeholder="Tìm mã dispute hoặc giao dịch" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">Tất cả trạng thái</option>
          <option value="REQUESTED">Chờ tiếp nhận</option>
          <option value="IN_PROGRESS">Đang điều tra</option>
          <option value="MORE_INFO_REQUIRED">Chờ bổ sung</option>
          <option value="SUBMITTED">Đã gửi kết quả</option>
        </select>
      </div>
      <section className="support-card">
        {filteredItems.map((x) => (
          <Link
            className="support-list-row"
            to={`/finance/investigations/${x.id}`}
            key={x.id}
          >
            <WalletCards />
            <div>
              <strong>
                {investigationTypeLabel[x.type]} · {x.transactionReference}
              </strong>
              <span>
                {x.id} · Dispute {x.disputeId}
              </span>
            </div>
            <Badge tone={x.status === "SUBMITTED" ? "success" : "warning"}>
              {investigationStatusLabel[x.status]}
            </Badge>
          </Link>
        ))}
        {!filteredItems.length && <p>Không có yêu cầu điều tra phù hợp.</p>}
      </section>
    </>
  );
}
export function FinancialInvestigationDetail() {
  const { investigationId } = useParams(),
    item = useSupportStore((s) =>
      s.investigations.find((x) => x.id === investigationId),
    ),
    dispute = useSupportStore((s) =>
      s.disputes.find((x) => x.id === item?.disputeId),
    ),
    submit = useSupportStore((s) => s.submitFinancialInvestigation),
    accept = useSupportStore((s) => s.acceptFinancialInvestigation),
    requestInfo = useSupportStore(
      (s) => s.requestFinancialInvestigationInfo,
    ),
    [findings, setFindings] = useState(item?.findings || "");
  if (!item)
    return (
      <div className="support-empty">
        <FileSearch />
          <h1>Không tìm thấy hồ sơ điều tra</h1>
      </div>
    );
  return (
    <>
      <header className="support-header">
        <div>
          <span>FINANCIAL MANAGEMENT</span>
          <h1>Điều tra {investigationTypeLabel[item.type].toLowerCase()}</h1>
          <p>
            {item.id} · Dispute {item.disputeId}
          </p>
        </div>
        <Badge tone={item.status === "SUBMITTED" ? "success" : "warning"}>
          {investigationStatusLabel[item.status]}
        </Badge>
      </header>
      <div className="case-layout">
        <main>
          <section className="support-card">
            <h2>Yêu cầu từ Customer Support</h2>
            <p>{dispute?.title}</p>
            <p>{dispute?.investigationNote}</p>
          </section>
          <section className="support-card">
            <h2>Tham chiếu tài chính</h2>
            <dl className="financial-reference">
              <div>
                <dt>Giao dịch</dt>
                <dd>{item.transactionReference}</dd>
              </div>
              <div>
                <dt>Loại nghiệp vụ</dt>
                <dd>{investigationTypeLabel[item.type]}</dd>
              </div>
              <div>
                <dt>Thời điểm yêu cầu</dt>
                <dd>{item.requestedAt}</dd>
              </div>
            </dl>
          </section>
        </main>
        <aside>
          <section className="support-card case-actions">
            <h2>Kết quả điều tra</h2>
            <textarea
              value={findings}
              disabled={
                item.status === "REQUESTED" ||
                item.status === "MORE_INFO_REQUIRED" ||
                item.status === "SUBMITTED"
              }
              onChange={(e) => setFindings(e.target.value)}
              placeholder="Ghi nhận kết quả kiểm tra giao dịch và bằng chứng"
            />
            {item.status === "REQUESTED" && (
              <button
                className="button primary"
                onClick={() => accept(item.id)}
              >
                Tiếp nhận điều tra
              </button>
            )}
            {item.status === "IN_PROGRESS" && (
              <>
                <button
                  className="button secondary"
                  disabled={!findings.trim()}
                  onClick={() => requestInfo(item.id, findings)}
                >
                  Yêu cầu CSKH bổ sung
                </button>
                <button
                  className="button primary"
                  disabled={!findings.trim()}
                  onClick={() => submit(item.id, findings)}
                >
                  Gửi kết quả điều tra
                </button>
              </>
            )}
            {item.status === "MORE_INFO_REQUIRED" && (
              <p className="field-hint">
                Đang chờ Customer Support bổ sung thông tin cho yêu cầu này.
              </p>
            )}
            <small>
              Finance cung cấp kết quả điều tra; Customer Support quyết định
              resolution cuối.
            </small>
          </section>
        </aside>
      </div>
    </>
  );
}
