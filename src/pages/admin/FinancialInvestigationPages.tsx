import { FileSearch, Search, WalletCards } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { useSupportStore } from "../../store/supportStore";
export function FinancialInvestigationQueue() {
  const items = useSupportStore((s) => s.investigations);
  return (
    <>
      <header className="support-header">
        <div>
          <span>FINANCIAL MANAGEMENT</span>
          <h1>Financial Investigation</h1>
          <p>Yêu cầu điều tra tài chính do Customer Support chuyển sang.</p>
        </div>
      </header>
      <div className="support-toolbar">
        <Search />
        <input placeholder="Tìm mã dispute hoặc transaction" />
        <select>
          <option>Tất cả trạng thái</option>
          <option>Requested</option>
          <option>Submitted</option>
        </select>
      </div>
      <section className="support-card">
        {items.map((x) => (
          <Link
            className="support-list-row"
            to={`/finance/investigations/${x.id}`}
            key={x.id}
          >
            <WalletCards />
            <div>
              <strong>
                {x.type} · {x.transactionReference}
              </strong>
              <span>
                {x.id} · Dispute {x.disputeId}
              </span>
            </div>
            <Badge tone={x.status === "SUBMITTED" ? "success" : "warning"}>
              {x.status}
            </Badge>
          </Link>
        ))}
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
    [findings, setFindings] = useState(item?.findings || "");
  if (!item)
    return (
      <div className="support-empty">
        <FileSearch />
        <h1>Không tìm thấy investigation</h1>
      </div>
    );
  return (
    <>
      <header className="support-header">
        <div>
          <span>FINANCIAL MANAGEMENT</span>
          <h1>{item.type} Investigation</h1>
          <p>
            {item.id} · Dispute {item.disputeId}
          </p>
        </div>
        <Badge tone={item.status === "SUBMITTED" ? "success" : "warning"}>
          {item.status}
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
            <h2>Financial reference</h2>
            <dl className="financial-reference">
              <div>
                <dt>Transaction</dt>
                <dd>{item.transactionReference}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{item.type}</dd>
              </div>
              <div>
                <dt>Requested</dt>
                <dd>{item.requestedAt}</dd>
              </div>
            </dl>
          </section>
        </main>
        <aside>
          <section className="support-card case-actions">
            <h2>Investigation findings</h2>
            <textarea
              value={findings}
              disabled={item.status === "SUBMITTED"}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="Ghi nhận kết quả kiểm tra giao dịch và evidence"
            />
            <button
              className="button primary"
              disabled={!findings.trim() || item.status === "SUBMITTED"}
              onClick={() => submit(item.id, findings)}
            >
              Submit result
            </button>
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
