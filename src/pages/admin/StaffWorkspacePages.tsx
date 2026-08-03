import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Gavel,
  Headphones,
  ReceiptText,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

const workspaceData = {
  support: {
    eyebrow: "CUSTOMER SERVICE",
    title: "Tổng quan hỗ trợ khách hàng",
    intro:
      "Quản lý ticket, khiếu nại, tranh chấp và các yêu cầu cần chuyển cấp.",
    metrics: [
      ["Ticket đang mở", "24"],
      ["Sắp quá SLA", "3"],
      ["Tranh chấp", "6"],
      ["Chờ phản hồi", "11"],
    ],
    queue: [
      ["CS-2407 · Không nhận được thông báo kết quả", "/support/tickets"],
      ["CS-2404 · Yêu cầu kiểm tra hoàn tiền", "/support/tickets"],
      ["DSP-091 · Khiếu nại bằng chứng bàn giao", "/support/disputes"],
    ],
  },
  finance: {
    eyebrow: "FINANCIAL MANAGEMENT",
    title: "Tổng quan tài chính",
    intro:
      "Không gian nghiệp vụ tiền tệ có thẩm quyền: thanh toán, hoàn tiền, đối soát và quyết toán.",
    metrics: [
      ["Chờ xác minh", "5"],
      ["Chờ hoàn tiền", "8"],
      ["Lệch đối soát", "2"],
      ["Chờ quyết toán", "4"],
    ],
    queue: [
      ["PAY-1028 · Xác minh giao dịch ứng viên", "/finance/payments"],
      ["REF-0214 · Duyệt hoàn tiền", "/finance/refunds"],
      ["REC-0718 · Sai lệch cổng thanh toán", "/finance/reconciliation"],
    ],
  },
} as const;
export function SupportDashboardPage() {
  return <Workspace kind="support" />;
}
export function FinanceDashboardPage() {
  return <Workspace kind="finance" />;
}
export function SupportTicketsPage() {
  return (
    <ListPage
      title="Ticket hỗ trợ"
      intro="Tiếp nhận, phân loại, giao xử lý, theo dõi SLA và ghi nhận kết quả."
      items={[
        "CS-2407 · Auction result notification",
        "CS-2404 · Refund status inquiry",
        "CS-2398 · KYC document guidance",
      ]}
    />
  );
}
export function SupportDisputesPage() {
  return (
    <ListPage
      title="Khiếu nại & tranh chấp"
      intro="Điều phối điều tra; chuyển Finance khi có yếu tố tiền tệ và chuyển Admin khi cần quyết định quản trị."
      items={[
        "DSP-091 · Bằng chứng bàn giao",
        "DSP-088 · Giao dịch bị đảo ngược",
        "CMP-173 · Khiếu nại kết quả",
      ]}
    />
  );
}
export function SupportCustomersPage() {
  return (
    <ListPage
      title="Tra cứu khách hàng"
      intro="Chỉ hiển thị dữ liệu tối thiểu cần thiết cho case hỗ trợ; không cho phép sửa KYC hoặc trạng thái tài chính."
      items={[
        "ng***@mail.vn · VERIFIED",
        "tr***@mail.vn · PENDING REVIEW",
        "le***@mail.vn · NEED SUPPLEMENT",
      ]}
    />
  );
}
export function KnowledgeGapsPage() {
  return (
    <ListPage
      title="Khoảng trống tri thức"
      intro="Ghi nhận câu hỏi chưa có nội dung chuẩn và chuyển Content Staff cập nhật Knowledge Base."
      items={[
        "KG-032 · Quy trình nhận tài sản qua đơn vị giao hàng",
        "KG-029 · Thời gian hoàn tiền đặt cọc",
      ]}
    />
  );
}
export function RefundsPage() {
  return (
    <ListPage
      title="Hoàn tiền"
      intro="Kiểm tra giao dịch gốc, hạn mức hoàn, bằng chứng và kiểm soát trùng lặp."
      items={[
        "REF-0214 · 25.000.000 đ · Chờ duyệt",
        "REF-0211 · 50.000.000 đ · Đang xử lý",
      ]}
    />
  );
}
export function ReconciliationPage() {
  return (
    <ListPage
      title="Đối soát"
      intro="Đối chiếu sổ nội bộ với cổng thanh toán và xử lý sai lệch có bằng chứng."
      items={["REC-0718-GW · 2 sai lệch", "REC-0717-BANK · Đã khớp"]}
    />
  );
}
export function SettlementsPage() {
  return (
    <ListPage
      title="Quyết toán & chi trả"
      intro="Rà soát phí, điều chỉnh, tài khoản nhận và bằng chứng trước khi chi trả."
      items={["SET-5711R · Chờ kiểm tra", "SET-DIA301 · Đủ điều kiện"]}
    />
  );
}
export function FinanceReportsPage() {
  const [period, setPeriod] = useState("05/2026");
  const [activeTab, setActiveTab] = useState("Tổng quan");
  const [exported, setExported] = useState(false);
  const kpis = [
    ["Doanh thu (VND)", "126.450.000.000", "+18,4%", CreditCard],
    ["Lợi nhuận (VND)", "18.750.000.000", "+16,2%", TrendingUp],
    ["Số phiên đấu giá", "124", "+8,3%", Gavel],
    ["Tỷ lệ thành công", "76,6%", "+3,8%", CheckCircle2],
    ["AOV (VND)", "1.245.000.000", "+12,1%", ReceiptText],
  ] as const;
  const revenueSeries = [42, 56, 31, 72, 48, 62, 39, 82, 66, 44, 76, 55, 88, 61, 47, 79, 68, 91, 63, 52, 84, 73, 58, 87];
  const categories = [
    ["Đồng hồ", "42,5%", "#6f7f56"],
    ["Trang sức", "28,7%", "#d68a2f"],
    ["Nghệ thuật", "16,3%", "#a6b58b"],
    ["Tài sản", "9,8%", "#e8b968"],
    ["Nghệ thuật khác", "2,7%", "#d8d2c5"],
  ] as const;
  const topAssets = [
    ["Rolex Submariner Date 126610LV", "/assets/featured-rolex-v2.png", "8.450.000.000 đ"],
    ["Patek Philippe Nautilus 5711/1R", "/assets/patek-nautilus-v2.png", "7.900.000.000 đ"],
    ["Mercedes-Benz S450L Luxury 2022", "/assets/catalog-mercedes-s450.png", "6.850.000.000 đ"],
    ["Hermès Birkin 30 Togo Gold", "/assets/catalog-hermes-birkin.png", "5.300.000.000 đ"],
    ["Tranh sơn dầu phong cảnh Đà Lạt", "/assets/catalog-dalat-painting.png", "3.950.000.000 đ"],
  ] as const;
  return (
    <>
      <header className="admin-heading finance-report-heading">
        <div>
          <span>FINANCIAL MANAGEMENT</span>
          <h1>Báo cáo & Phân tích</h1>
          <p>Theo dõi doanh thu, hiệu suất phiên và cơ cấu tài sản đấu giá.</p>
        </div>
        <div className="finance-report-actions">
          <label>
            <CalendarDays aria-hidden="true" />
            <select aria-label="Khoảng thời gian báo cáo" value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="05/2026">01/05/2026 - 30/05/2026</option>
              <option value="04/2026">01/04/2026 - 30/04/2026</option>
            </select>
          </label>
          <button type="button" className="button secondary" onClick={() => setExported(true)}>
            <Download aria-hidden="true" /> {exported ? "Đã tạo bản xuất demo" : "Xuất báo cáo"}
          </button>
        </div>
      </header>
      <main className="finance-analytics">
        <nav className="finance-report-tabs" aria-label="Loại báo cáo">
          {["Tổng quan", "Doanh thu", "Người dùng", "Tài sản", "Phiên đấu giá", "Thanh toán"].map((tab) => <button type="button" key={tab} className={activeTab === tab ? "active" : ""} aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}
        </nav>

        <section className="finance-report-kpis" aria-label="Chỉ số tài chính">
          {kpis.map(([label, value, change, Icon]) => (
            <article key={label}>
              <div>
                <span>{label}</span>
                <Icon aria-hidden="true" />
              </div>
              <strong>{value}</strong>
              <small>{change} <span>so với kỳ trước</span></small>
            </article>
          ))}
        </section>

        <section className="finance-report-charts">
          <article className="finance-chart-card finance-revenue-chart">
            <header>
              <div>
                <h2>Doanh thu theo thời gian</h2>
                <p>Đơn vị: tỷ VND</p>
              </div>
              <span>Tháng {period}</span>
            </header>
            <div className="finance-bar-chart" aria-label="Biểu đồ doanh thu tháng 5">
              <div className="finance-chart-axis" aria-hidden="true">
                <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
              </div>
              <div className="finance-bars">
                {revenueSeries.map((value, index) => (
                  <span key={`${value}-${index}`}>
                    <i style={{ height: `${value}%` }} />
                    {index % 5 === 0 && <small>{String(index + 1).padStart(2, "0")}/05</small>}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <article className="finance-chart-card finance-category-chart">
            <header>
              <div>
                <h2>Doanh thu theo danh mục</h2>
                <p>Tỷ trọng trên tổng doanh thu</p>
              </div>
            </header>
            <div className="finance-donut-layout">
              <div className="finance-donut" role="img" aria-label="Doanh thu 126,45 tỷ VND">
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
          <ShieldCheck aria-hidden="true" /> Dữ liệu mô phỏng cho tab {activeTab}, kỳ {period}; đồng bộ từ Financial Management lúc 09:30, 21/07/2026.
        </p>
      </main>
    </>
  );
}
export function AdminSettingsPage() {
  return (
    <ListPage
      title="Cấu hình hệ thống"
      intro="Quản lý cấu hình có phiên bản, phân quyền và kiểm soát maker-checker."
      items={[
        "Vai trò & quyền truy cập",
        "Chính sách phê duyệt",
        "Ngưỡng và thời hạn nghiệp vụ",
      ]}
    />
  );
}
function Workspace({ kind }: { kind: keyof typeof workspaceData }) {
  const d = workspaceData[kind];
  return (
    <>
      <header className="admin-heading">
        <div>
          <span>{d.eyebrow}</span>
          <h1>{d.title}</h1>
          <p>{d.intro}</p>
        </div>
        <span className="workspace-status">
          <CheckCircle2 />
          Hệ thống ổn định
        </span>
      </header>
      <div className="admin-metrics">
        {d.metrics.map(([label, value], i) => (
          <article key={label}>
            {[Headphones, Clock3, AlertTriangle, CreditCard].map(
              (I, j) => j === i && <I key={j} />,
            )}
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </article>
        ))}
      </div>
      <section className="admin-panel">
        <h2>Hàng đợi ưu tiên</h2>
        {d.queue.map(([label, route]) => (
          <div className="queue-row" key={label}>
            <Clock3 />
            <strong>{label}</strong>
            <Link className="button ghost" to={route}>
              Mở
            </Link>
          </div>
        ))}
      </section>
    </>
  );
}
function ListPage({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: string[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = items.filter((item) =>
    item.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <header className="admin-heading">
        <div>
          <span>ROLE WORKSPACE</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
      </header>
      <div className="filter-bar">
        <Search />
        <input
          aria-label="Tìm kiếm"
          placeholder="Tìm theo mã hoặc nội dung"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <section className="admin-panel">
        {filtered.map((x, i) => (
          <div className="queue-row" key={x}>
            {iconFor(i)}
            <strong>{x}</strong>
            <button
              type="button"
              className="button ghost"
              onClick={() => setSelected(x)}
            >
              Xem chi tiết
            </button>
          </div>
        ))}
        {!filtered.length && <p>Không có dữ liệu phù hợp với từ khóa.</p>}
      </section>
      {selected && (
        <div className="modal-backdrop">
          <section className="audit-dialog" role="dialog" aria-modal="true">
            <ReceiptText />
            <h2>Chi tiết nghiệp vụ</h2>
            <p>{selected}</p>
            <p>
              Đây là dữ liệu mô phỏng. Mọi thay đổi tài chính phải được thực
              hiện tại workspace có thẩm quyền và được ghi nhận audit.
            </p>
            <button
              className="button primary"
              onClick={() => setSelected(null)}
            >
              Đóng
            </button>
          </section>
        </div>
      )}
    </>
  );
}
function iconFor(i: number): ReactNode {
  const I = [ReceiptText, ShieldCheck, BarChart3][i % 3];
  return <I />;
}
