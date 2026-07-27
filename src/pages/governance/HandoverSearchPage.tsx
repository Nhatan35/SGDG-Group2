import { Link, useSearchParams } from "react-router-dom";
import { Card } from "../../components/common/Card";
import { EmptyState, ErrorState, LoadingState } from "../../components/feedback/States";
import {
  filterHandoverCases,
  getHandoverSearchProjection,
} from "../../services/handoverSearchProjection";
import "../../styles/handover-search.css";

export function HandoverSearchPage() {
  const [params, setParams] = useSearchParams();
  const scenario = params.get("scenario");
  if (scenario === "loading") return <LoadingState label="Đang tải hồ sơ bàn giao…" />;
  if (scenario === "error") return <ErrorState title="Không thể tải tìm kiếm bàn giao" description="Projection tạm thời chưa sẵn sàng." />;
  const source = scenario === "no-data" ? [] : getHandoverSearchProjection();
  const query = params.get("q") || "";
  const status = params.get("status") || "ALL";
  const flag = (params.get("flag") || "ALL") as "ALL" | "BLOCKED" | "OVERDUE";
  const rows = filterHandoverCases(source, query, status, flag);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  return (
    <main className="handover-search-page">
      <header className="ops-heading">
        <div><span>HANDOVER GOVERNANCE</span><h1>Tra cứu hồ sơ bàn giao</h1></div>
        <p>ADMIN · projection chỉ đọc</p>
      </header>
      <section className="ops-kpis">
        <article><strong>{source.length}</strong><span>Đang theo dõi</span></article>
        <article><strong>{source.filter((item) => item.overdue).length}</strong><span>Quá hạn</span></article>
        <article><strong>{source.filter((item) => item.blocked).length}</strong><span>Đang bị chặn</span></article>
      </section>
      <Card className="handover-search-filters">
        <label>Tìm kiếm
          <input value={query} onChange={(event) => update("q", event.target.value)} placeholder="Case, auction, asset" />
        </label>
        <label>Trạng thái
          <select value={status} onChange={(event) => update("status", event.target.value)}>
            <option value="ALL">Tất cả</option>
            <option value="SCHEDULE_PROPOSED">Chờ phản hồi lịch</option>
            <option value="COMPLETED">Hoàn tất</option>
            <option value="REMEDIATION">Remediation</option>
          </select>
        </label>
        <label>Cờ vận hành
          <select value={flag} onChange={(event) => update("flag", event.target.value)}>
            <option value="ALL">Tất cả</option>
            <option value="OVERDUE">Quá hạn</option>
            <option value="BLOCKED">Bị chặn</option>
          </select>
        </label>
      </Card>
      {!rows.length ? (
        <EmptyState title={source.length ? "Không có hồ sơ phù hợp bộ lọc" : "Chưa có hồ sơ bàn giao"} description={source.length ? "Thử thay đổi từ khóa hoặc bộ lọc." : "Projection hiện chưa có case nào."} />
      ) : (
        <section className="handover-search-results">
          {rows.map((item) => (
            <Card key={item.caseId}>
              <small>{item.status} · {item.stage}</small>
              <h2>{item.caseReference}</h2>
              <p><strong>{item.auctionCode}</strong> · {item.assetName}</p>
              <dl>
                <div><dt>Khách hàng</dt><dd>{item.customerReferenceMasked}</dd></div>
                <div><dt>Tiếp theo</dt><dd>{item.nextAction}</dd></div>
                <div><dt>Delivery</dt><dd>{item.deliveryState}</dd></div>
                <div><dt>Evidence</dt><dd>{item.evidenceReadiness}</dd></div>
                <div><dt>Cập nhật</dt><dd>{new Date(item.updatedAt).toLocaleString("vi-VN")}</dd></div>
              </dl>
              <Link className="button secondary" to={`/governance/handover-cases/${item.caseId}?scenario=${item.scenario}`}>Mở hồ sơ</Link>
            </Card>
          ))}
        </section>
      )}
    </main>
  );
}
