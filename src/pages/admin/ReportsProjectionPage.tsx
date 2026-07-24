import { AlertTriangle, BarChart3, Database } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { getReportsProjection } from "../../services/mock/reportsProjectionService";
import type { ReportSeriesItem, ReportsScenario } from "../../types/domain";
import { formatDateTime } from "../../utils/format";
import "../../styles/reports-projection.css";
const scenarios: ReportsScenario[] = [
  "default",
  "no-data",
  "loading",
  "error",
  "stale-projection",
];
export function ReportsProjectionPage() {
  const [params, setParams] = useSearchParams();
  const scenario = scenarios.includes(params.get("scenario") as ReportsScenario)
    ? (params.get("scenario") as ReportsScenario)
    : "default";
  const fixture = getReportsProjection(scenario);
  const set = (key: string, value?: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  if (params.get("view") === "loading" || scenario === "loading")
    return (
      <main className="reports-page">
        <h1>Reports Projection</h1>
        <div className="reports-skeleton">
          <i />
          <i />
          <i />
          <i />
        </div>
      </main>
    );
  if (params.get("view") === "error" || scenario === "error")
    return (
      <main className="reports-page">
        <h1>Reports Projection</h1>
        <p className="reports-error">
          Không thể tải projection. Filter hiện tại vẫn được giữ.
        </p>
        <button
          className="button primary"
          onClick={() => set("scenario", "default")}
        >
          Thử lại
        </button>
      </main>
    );
  return (
    <main className="reports-page">
      <header className="reports-header">
        <span>ADM-002 · REPORTS PROJECTION</span>
        <h1>Reports Projection</h1>
        <p>Summary mô phỏng cho Operations, Candidate, Payment và Handover.</p>
      </header>
      <p className="reports-disclosure">
        <Database />
        {fixture.disclosure}
      </p>
      {fixture.stale && (
        <p className="reports-stale">
          <AlertTriangle />
          Projection có thể đã cũ. Hãy mở workspace nguồn để xem trạng thái hiện
          tại.
        </p>
      )}
      <section className="reports-filters">
        <label>
          Period
          <select
            value={params.get("period") || "30d"}
            onChange={(event) => set("period", event.target.value)}
          >
            <option value="7d">7 ngày</option>
            <option value="30d">30 ngày</option>
            <option value="90d">90 ngày</option>
          </select>
        </label>
        <label>
          Domain
          <select
            value={params.get("domain") || "all"}
            onChange={(event) => set("domain", event.target.value)}
          >
            <option value="all">Tất cả domain</option>
            <option value="auction">Auction</option>
            <option value="candidate">Candidate</option>
            <option value="payment">Payment</option>
            <option value="handover">Handover</option>
          </select>
        </label>
        <span>{fixture.periodLabel}</span>
      </section>
      {scenario === "no-data" ? (
        <p className="reports-empty">
          Không có dữ liệu fixture cho filter này. Disclosure và filters vẫn giữ
          nguyên.
        </p>
      ) : (
        <>
          <section className="reports-kpis">
            {fixture.kpis.map((kpi) => (
              <article key={kpi.id}>
                <strong>{kpi.value}</strong>
                <h2>{kpi.label}</h2>
                <p>{kpi.description}</p>
                <small>Projection mock · non-authoritative</small>
              </article>
            ))}
          </section>
          <section className="reports-charts">
            <Chart
              title="Auction funnel"
              summary="Luồng lifecycle mô phỏng từ mở phiên đến bàn giao."
              data={fixture.auctionFunnel}
            />
            <Chart
              title="Lifecycle distribution"
              summary="Phân bố lifecycle, không gộp với publication."
              data={fixture.lifecycleDistribution}
            />
            <Chart
              title="Publication distribution"
              summary="Phân bố publication projection."
              data={fixture.publicationDistribution}
            />
            <Chart
              title="Candidate outcomes"
              summary="Kết quả workflow candidate mô phỏng."
              data={fixture.candidateOutcomes}
            />
            <Chart
              title="Payment references summary"
              summary="Projection reference; không phải xác nhận thanh toán."
              data={fixture.paymentSummary}
            />
            <Chart
              title="Handover stages"
              summary="Provider Delivered ≠ Receipt Confirmed ≠ Completed."
              data={fixture.handoverSummary}
            />
          </section>
        </>
      )}
      <footer className="reports-source">
        <BarChart3 />
        <p>
          Generated {formatDateTime(fixture.generatedAt)} GMT+7 · Projection as
          of {formatDateTime(fixture.projectionAsOf)} GMT+7. Fixture scope only;
          excluded production integrations and business authority.
        </p>
      </footer>
      {params.get("demo") === "1" && (
        <label className="reports-demo">
          Demo scenario
          <select
            value={scenario}
            onChange={(event) => set("scenario", event.target.value)}
          >
            {scenarios.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      )}
    </main>
  );
}
function Chart({
  title,
  summary,
  data,
}: {
  title: string;
  summary: string;
  data: ReportSeriesItem[];
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <article className="report-chart">
      <h2>{title}</h2>
      <p>{summary}</p>
      <ul aria-label={`${title} visual`}>
        {data.map((item) => (
          <li key={item.id}>
            <span>{item.label}</span>
            <i style={{ width: `${(item.value / max) * 100}%` }} />
            <b>{item.value}</b>
          </li>
        ))}
      </ul>
      <details>
        <summary>Bảng dữ liệu có thể truy cập</summary>
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th>Category</th>
              <th>Value</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td>{item.label}</td>
                <td>{item.value}</td>
                <td>{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </article>
  );
}
