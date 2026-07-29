import {
  Activity,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Eye,
  FileCheck2,
  Gavel,
  LockKeyhole,
  Pause,
  Pencil,
  Play,
  Plus,
  Radio,
  Search,
  ShieldAlert,
  UserPlus,
  UserRoundCheck,
  Users,
  Wifi,
  XCircle,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { AdminRole } from "../../app/layouts/AdminLayout";
import { Badge } from "../../components/common/Badge";
import { FormField } from "../../components/common/FormField";
import { auctions } from "../../services/mock/auctionService";
import { formatMoney } from "../../utils/format";
import { useDemoStore } from "../../store/demoStore";
import { demoStaffAccounts, staffRoleMeta } from "../../config/staffRoles";
type Context = { role: AdminRole };
const users = [
  ["Nguyễn Minh Anh", "ng***@mail.vn", "VERIFIED"],
  ["Trần Quốc Huy", "tr***@mail.vn", "PENDING_REVIEW"],
  ["Lê Hà My", "le***@mail.vn", "NEED_SUPPLEMENT"],
  ["Phạm Tuấn Khang", "ph***@mail.vn", "REJECTED"],
];
const assets = [
  ["TS-1021", "Rolex Submariner Date", "PUBLISHED"],
  ["TS-1022", "Nhẫn kim cương 3.01ct", "APPROVED"],
  ["TS-1023", "Mercedes-Benz S450L", "UNDER_REVIEW"],
  ["TS-1024", "Hermès Birkin 30", "DRAFT"],
];
export function AdminLoginPage() {
  const navigate = useNavigate();
  const adminLogin = useDemoStore((s) => s.adminLogin);
  const [email, setEmail] = useState("admin@sgdg.demo");
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const role = demoStaffAccounts[email.trim().toLowerCase()];
    if (!role) {
      setError(
        "Tài khoản không thuộc một trong bốn vai trò nội bộ được cấp quyền.",
      );
      return;
    }
    adminLogin(role, email.trim().toLowerCase());
    navigate(staffRoleMeta[role].workspace, { replace: true });
  }
  return (
    <main className="admin-login">
      <section className="admin-login-shell">
        <aside className="admin-login-brand">
          <div>
            <img src="/assets/logo-transparent.png" alt="SGDG" />
            <span>Back-office Portal</span>
            <h1>
              Mỗi tài khoản được gắn cố định với một vai trò và một workspace
              nghiệp vụ.
            </h1>
            <p>
              Quyền truy cập được xác định khi đăng nhập; nhân sự không thể tự
              chuyển vai trò trong phiên làm việc.
            </p>
          </div>
          <ul>
            <li>
              <CheckCircle2 />
              Phân tách nhiệm vụ theo SRS
            </li>
            <li>
              <CheckCircle2 />
              Kiểm soát truy cập theo vai trò
            </li>
            <li>
              <CheckCircle2 />
              Mọi hành động nhạy cảm có audit
            </li>
          </ul>
        </aside>
        <section className="admin-login-panel">
          <header>
            <Badge tone="info">SGDG STAFF</Badge>
            <h2>Đăng nhập hệ thống nội bộ</h2>
            <p>Sử dụng tài khoản đã được Admin cấp đúng vai trò</p>
          </header>
          <form onSubmit={submit}>
            <FormField
              label="Email công việc"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
            />
            <FormField
              label="Mật khẩu"
              name="password"
              type="password"
              defaultValue="Demo@123"
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary">Đăng nhập</button>
            <small>
              Kiểm thử maker–checker: admin@sgdg.demo và
              admin.checker@sgdg.demo.
            </small>
          </form>
        </section>
      </section>
    </main>
  );
}
export function AdminDashboardPage() {
  const { role } = useOutletContext<Context>();
  return (
    <AdminPage title="Tổng quan vận hành" intro={`Hàng đợi dành cho ${role}.`}>
      <Metrics />
      <div className="admin-grid">
        <Panel title="Hàng đợi công việc">
          {[
            "12 hồ sơ KYC đang chờ",
            "1 nghĩa vụ sắp quá hạn",
            "Tài sản TS-1023 thiếu hồ sơ",
            "Phiên LIVE cần theo dõi",
          ].map((x, i) => (
            <div className="queue-row" key={x}>
              <Badge tone={i === 1 ? "danger" : "warning"}>
                {i === 1 ? "ƯU TIÊN" : "XỬ LÝ"}
              </Badge>
              <strong>{x}</strong>
              <button className="button ghost" disabled title="Hàng đợi minh họa">
                Mở
              </button>
            </div>
          ))}
        </Panel>
        <Panel title="System health">
          <Health label="Realtime gateway" value="Healthy" />
          <Health label="Payment provider" value="Healthy" />
          <Health label="Notification queue" value="99,8%" />
          <Health label="Read model freshness" value="1,2s" />
        </Panel>
      </div>
    </AdminPage>
  );
}
export function AdminUsersPage() {
  const { role } = useOutletContext<Context>();
  const [dialog, setDialog] = useState<{
    title: string;
    mode: "view" | "create" | "kyc" | "access";
    accountId?: string;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [accountRows, setAccountRows] = useState(() => [
    { id: "USR-1025", name: "Nguyễn Văn A", email: "nguyenvana@gmail.com", phone: "0909***125", userRole: "Người mua", kyc: "KYC 2", kycNote: "Đã xác minh", state: "ACTIVE", date: "20/05/2026" },
    { id: "USR-1024", name: "Trần Thị B", email: "tranb@gmail.com", phone: "0918***456", userRole: "Người bán", kyc: "KYC 1", kycNote: "Chờ duyệt", state: "PENDING", date: "20/05/2026" },
    { id: "USR-1023", name: "Lê Minh C", email: "leminhc@gmail.com", phone: "0933***789", userRole: "Người mua", kyc: "KYC 2", kycNote: "Đã xác minh", state: "ACTIVE", date: "19/05/2026" },
    { id: "USR-1022", name: "Phạm Hoàng D", email: "phamhoangd@gmail.com", phone: "0945***321", userRole: "Quản trị viên", kyc: "KYC 3", kycNote: "Đã xác minh", state: "ACTIVE", date: "18/05/2026" },
    { id: "USR-1021", name: "Đỗ Thùy E", email: "dothuye@gmail.com", phone: "0977***654", userRole: "Người mua", kyc: "KYC 1", kycNote: "Chờ bổ sung", state: "LOCKED", date: "18/05/2026" },
  ]);
  const filteredAccounts = accountRows.filter((account) => {
    const keyword = query.trim().toLowerCase();
    return (
      (status === "ALL" || account.state === status) &&
      (!keyword ||
        `${account.name} ${account.email} ${account.phone} ${account.id}`
          .toLowerCase()
          .includes(keyword))
    );
  });
  const stateLabel = {
    ACTIVE: "Hoạt động",
    PENDING: "Chờ duyệt",
    LOCKED: "Tạm khóa",
  } as const;
  return (
    <AdminPage
      eyebrow="ADMINISTRATION & GOVERNANCE"
      title="Quản lý người dùng & eKYC"
      intro="Theo dõi tài khoản, cấp độ định danh và trạng thái truy cập trên một màn hình."
    >
      <section className="admin-management-shell account-management-shell">
        <div className="management-toolbar">
          <label className="management-search">
            <Search aria-hidden="true" />
            <input
              aria-label="Tìm kiếm người dùng"
              placeholder="Tìm kiếm người dùng, email, số điện thoại..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            className="management-filter-select"
            aria-label="Lọc trạng thái người dùng"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="LOCKED">Tạm khóa</option>
          </select>
          <button
            type="button"
            className="management-create-button"
            onClick={() =>
              setDialog({ title: "Thêm người dùng mô phỏng", mode: "create" })
            }
          >
            <UserPlus aria-hidden="true" /> Thêm người dùng
          </button>
        </div>

        <div className="management-table-wrap">
          <table className="management-table account-management-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email / SĐT</th>
                <th>Vai trò</th>
                <th>eKYC</th>
                <th>Trạng thái</th>
                <th>Ngày đăng ký</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account, index) => (
                <tr key={account.id}>
                  <td>
                    <div className="management-user-cell">
                      <span className={`management-avatar avatar-${index + 1}`}>
                        {account.name.split(" ").at(-1)?.slice(0, 1)}
                      </span>
                      <div><strong>{account.name}</strong><small>{account.phone}</small></div>
                    </div>
                  </td>
                  <td>{role === "CONTENT_STAFF" ? "Đã ẩn theo quyền" : account.email}</td>
                  <td><span className="management-role">{account.userRole}</span></td>
                  <td>
                    <div className="management-kyc-cell">
                      <strong>{account.kyc}</strong>
                      <small>{account.kycNote}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`management-status ${account.state.toLowerCase()}`}>
                      {stateLabel[account.state as keyof typeof stateLabel]}
                    </span>
                  </td>
                  <td>{account.date}</td>
                  <td>
                    <div className="management-row-actions">
                      <button type="button" aria-label={`Xem ${account.name}`} title="Xem hồ sơ" onClick={() => setDialog({ title: `Xem hồ sơ ${account.name}`, mode: "view", accountId: account.id })}><Eye aria-hidden="true" /></button>
                      <button type="button" aria-label={`Duyệt eKYC ${account.name}`} title="Duyệt eKYC" disabled={account.kycNote === "Đã xác minh"} onClick={() => setDialog({ title: `Duyệt eKYC ${account.name}`, mode: "kyc", accountId: account.id })}><FileCheck2 aria-hidden="true" /></button>
                      <button type="button" className={account.state === "LOCKED" ? "warning" : ""} aria-label={`${account.state === "LOCKED" ? "Mở khóa" : "Khóa"} ${account.name}`} title="Quản lý truy cập" onClick={() => setDialog({ title: `${account.state === "LOCKED" ? "Mở khóa" : "Khóa tài khoản"} ${account.name}`, mode: "access", accountId: account.id })}><LockKeyhole aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredAccounts.length && <div className="management-empty">Không tìm thấy người dùng phù hợp.</div>}
        </div>
        <ManagementFooter shown={filteredAccounts.length} total={3526} />
      </section>
      {dialog && (
        <AuditDialog
          title={dialog.title}
          readOnly={dialog.mode === "view"}
          onConfirm={() => {
            if (dialog.mode === "create") {
              const id = `USR-${Date.now()}`;
              setAccountRows((current) => [
                {
                  id,
                  name: "Customer demo mới",
                  email: "customer.new@sgdg.demo",
                  phone: "09** *** ***",
                  userRole: "Người mua",
                  kyc: "KYC 0",
                  kycNote: "Chưa bắt đầu",
                  state: "PENDING",
                  date: new Date().toLocaleDateString("vi-VN"),
                },
                ...current,
              ]);
            }
            if (dialog.mode === "kyc") {
              setAccountRows((current) =>
                current.map((account) =>
                  account.id === dialog.accountId
                    ? {
                        ...account,
                        kyc: "KYC 2",
                        kycNote: "Đã xác minh",
                        state: "ACTIVE",
                      }
                    : account,
                ),
              );
            }
            if (dialog.mode === "access") {
              setAccountRows((current) =>
                current.map((account) =>
                  account.id === dialog.accountId
                    ? {
                        ...account,
                        state:
                          account.state === "LOCKED" ? "ACTIVE" : "LOCKED",
                      }
                    : account,
                ),
              );
            }
          }}
          close={() => setDialog(null)}
        />
      )}
    </AdminPage>
  );
}
export function AdminAssetsPage() {
  const { role } = useOutletContext<Context>();
  const edit = role === "ADMIN" || role === "CONTENT_STAFF";
  const [assetRows, setAssetRows] = useState(() =>
    assets.map(([id, name, status], index) => ({
      id,
      name,
      status,
      files: index === 2 ? "Thiếu 1 tệp" : "Đầy đủ",
    })),
  );
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  return (
    <AdminPage
      title="Quản lý tài sản"
      intro="Workflow draft, review, approved, rejected và published."
    >
      <Filters />
      <Table headers={["Mã", "Tài sản", "Trạng thái", "Hồ sơ", "Thao tác"]}>
        {assetRows.map((x, i) => (
          <tr key={x.id}>
            <td>{x.id}</td>
            <td>
              <strong>{x.name}</strong>
            </td>
            <td><Badge tone={i < 2 ? "success" : "warning"}>{x.status}</Badge></td>
            <td>{x.files}</td>
            <td>
              <button disabled={!edit} className="button ghost" onClick={() => setSelectedAsset(x.id)}>
                {edit ? "Biên tập" : "Chỉ xem"}
              </button>
            </td>
          </tr>
        ))}
      </Table>
      {selectedAsset && (
        <AuditDialog
          title={`Cập nhật hồ sơ tài sản ${selectedAsset}`}
          onConfirm={() =>
            setAssetRows((current) =>
              current.map((asset) =>
                asset.id === selectedAsset
                  ? {
                      ...asset,
                      files: "Đầy đủ",
                      status:
                        asset.status === "DRAFT"
                          ? "UNDER_REVIEW"
                          : asset.status,
                    }
                  : asset,
              ),
            )
          }
          close={() => setSelectedAsset(null)}
        />
      )}
    </AdminPage>
  );
}
export function AdminAuctionsPage() {
  const [dialog, setDialog] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const imageById: Record<string, string> = {
    "rolex-126610lv": "/assets/featured-rolex-v2.png",
    "patek-nautilus": "/assets/patek-nautilus-v2.png",
    "diamond-gia": "/assets/diamond-gia-v2.png",
    "iphone-15-pro": "/assets/catalog-iphone-15-pro.png",
    "painting-dalat": "/assets/catalog-dalat-painting.png",
  };
  const auctionRows = ["rolex-126610lv", "patek-nautilus", "diamond-gia", "iphone-15-pro", "painting-dalat"]
    .map((id) => auctions.find((auction) => auction.id === id))
    .filter((auction): auction is (typeof auctions)[number] => Boolean(auction));
  const statusLabel: Record<string, string> = {
    LIVE: "Đang diễn ra",
    REGISTRATION_OPEN: "Sắp diễn ra",
    PUBLISHED: "Đã lên lịch",
    CLOSED: "Đã kết thúc",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã hủy",
  };
  const filteredAuctions = auctionRows.filter((auction) => {
    const keyword = query.trim().toLowerCase();
    return (
      (status === "ALL" || auction.status === status) &&
      (category === "ALL" || auction.category === category) &&
      (!keyword || `${auction.code} ${auction.assetName}`.toLowerCase().includes(keyword))
    );
  });
  const summary = [
    ["Tổng phiên", "124", Gavel, "sage"],
    ["Đang diễn ra", "18", CircleDollarSign, "orange"],
    ["Sắp diễn ra", "12", Clock3, "gold"],
    ["Đã kết thúc", "94", UserRoundCheck, "rose"],
    ["Đã hủy", "0", XCircle, "sand"],
  ] as const;
  return (
    <AdminPage
      eyebrow="AUCTION OPERATIONS"
      title="Quản lý phiên đấu giá"
      intro="Theo dõi lịch phiên, tài sản, trạng thái vận hành và lượt quan tâm."
    >
      <section className="admin-management-shell auction-management-shell">
        <div className="management-toolbar auction-management-toolbar">
          <label className="management-search">
            <Search aria-hidden="true" />
            <input aria-label="Tìm kiếm phiên đấu giá" placeholder="Tìm kiếm phiên đấu giá, tài sản..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <select className="management-filter-select" aria-label="Lọc trạng thái phiên" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="LIVE">Đang diễn ra</option>
            <option value="REGISTRATION_OPEN">Sắp diễn ra</option>
            <option value="PUBLISHED">Đã lên lịch</option>
            <option value="CLOSED">Đã kết thúc</option>
          </select>
          <select className="management-filter-select" aria-label="Lọc danh mục phiên" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="ALL">Tất cả danh mục</option>
            <option value="Đồng hồ">Đồng hồ</option>
            <option value="Trang sức">Trang sức</option>
            <option value="Điện thoại">Công nghệ</option>
            <option value="Nghệ thuật">Nghệ thuật</option>
          </select>
          <span className="management-date-filter"><CalendarDays aria-hidden="true" /> 01/07/2026 - 31/07/2026</span>
          <button type="button" className="management-create-button" onClick={() => setDialog("Tạo phiên đấu giá mới")}><Plus aria-hidden="true" /> Tạo phiên đấu giá</button>
        </div>

        <section className="management-summary-grid" aria-label="Tổng quan phiên đấu giá">
          {summary.map(([label, value, Icon, tone]) => (
            <article key={label}>
              <span className={`management-summary-icon ${tone}`}><Icon aria-hidden="true" /></span>
              <div><small>{label}</small><strong>{value}</strong></div>
            </article>
          ))}
        </section>

        <div className="management-table-wrap">
          <table className="management-table auction-management-table">
            <thead><tr><th>Phiên đấu giá</th><th>Tài sản</th><th>Danh mục</th><th>Thời gian</th><th>Giá khởi điểm</th><th>Trạng thái</th><th>Lượt xem</th><th>Thao tác</th></tr></thead>
            <tbody>
              {filteredAuctions.map((auction) => (
                <tr key={auction.id}>
                  <td><strong className="management-code">#{auction.code}</strong></td>
                  <td>
                    <div className="management-asset-cell">
                      <img src={imageById[auction.id] ?? auction.image} alt="" />
                      <strong>{auction.assetName}</strong>
                    </div>
                  </td>
                  <td><span className="management-category">{auction.category === "Điện thoại" ? "Công nghệ" : auction.category}</span></td>
                  <td><ManagementDate start={auction.startsAt} end={auction.endsAt} /></td>
                  <td><strong className="management-money">{formatMoney(auction.startPrice)}</strong></td>
                  <td><span className={`management-status auction-${auction.status.toLowerCase()}`}>{statusLabel[auction.status] ?? auction.status}</span></td>
                  <td>{auction.watcherCount.toLocaleString("vi-VN")}</td>
                  <td>
                    <div className="management-row-actions">
                      <button type="button" aria-label={`Xem ${auction.code}`} title="Xem phiên" onClick={() => setDialog(`Xem chi tiết phiên ${auction.code}`)}><Eye aria-hidden="true" /></button>
                      <button type="button" aria-label={`Cập nhật ${auction.code}`} title="Đổi trạng thái" onClick={() => setDialog(`Thay đổi trạng thái phiên ${auction.code}`)}><Pencil aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredAuctions.length && <div className="management-empty">Không có phiên đấu giá phù hợp với bộ lọc.</div>}
        </div>
        <ManagementFooter shown={filteredAuctions.length} total={124} />
      </section>
      {dialog && (
        <AuditDialog
          title={dialog}
          close={() => setDialog(null)}
        />
      )}
    </AdminPage>
  );
}
export function LiveOpsPage() {
  const { auctionId } = useParams();
  const auction = auctions.find((x) => x.id === auctionId) ?? auctions[0];
  const [state, setState] = useState<"LIVE" | "PAUSED" | "CLOSED">("LIVE");
  const [dialog, setDialog] = useState(false);
  return (
    <AdminPage
      title="Live Operations Console"
      intro={`${auction.code} · điều hành phiên có audit.`}
    >
      <div className={`ops-banner ${state.toLowerCase()}`}>
        <div>
          <Radio />
          <strong>{state}</strong>
          <span>Server {new Date().toLocaleTimeString("vi-VN")}</span>
        </div>
        <div>
          {state === "LIVE" ? (
            <button onClick={() => setState("PAUSED")}>
              <Pause />
              Tạm dừng
            </button>
          ) : (
            <button onClick={() => setState("LIVE")}>
              <Play />
              Tiếp tục
            </button>
          )}
          <button onClick={() => setDialog(true)}>Đóng phiên</button>
        </div>
      </div>
      <Metrics />
      <div className="admin-grid">
        <Panel title="Accepted / Rejected bid stream">
          {Array.from({ length: 7 }, (_, i) => (
            <div className="stream-row" key={i}>
              <Badge tone={i === 3 ? "danger" : "success"}>
                {i === 3 ? "REJECTED" : "ACCEPTED"}
              </Badge>
              <strong>Mi***{String.fromCharCode(65 + i)}</strong>
              <span>{formatMoney(450000000 - i * 5000000)}</span>
              <time>10:{42 - i}:18</time>
            </div>
          ))}
        </Panel>
        <Panel title="Top participants">
          {users.map((x, i) => (
            <Health
              key={x[0]}
              label={`#${i + 1} ${x[0].slice(0, 2)}***`}
              value={`${18 - i * 3} bid`}
            />
          ))}
        </Panel>
      </div>
      {dialog && (
        <AuditDialog
          title="Đóng phiên đấu giá"
          close={() => {
            setState("CLOSED");
            setDialog(false);
          }}
        />
      )}
    </AdminPage>
  );
}
export function AdminPaymentsPage() {
  const { role } = useOutletContext<Context>();
  const verify = role === "ADMIN" || role === "FINANCE";
  const [dialog, setDialog] = useState<{
    id: string;
    mode: "view" | "verify";
  } | null>(null);
  const [activeStatus, setActiveStatus] = useState<
    "ALL" | "PENDING" | "VERIFIED" | "REJECTED"
  >("PENDING");
  const [query, setQuery] = useState("");
  const [bank, setBank] = useState("ALL");
  const [transactions, setTransactions] = useState(() => [
    ["PAY-2024-0528-001", "anh***28@gmail.com", "BIDV", "7921", 450_000_000, "Thanh toán phiên #AUC-2024-0528-001", "PENDING"],
    ["PAY-2024-0530-002", "minh***89@gmail.com", "Vietcombank", "1234", 3_250_000_000, "Thanh toán phiên #AUC-2024-0530-045", "PENDING"],
    ["PAY-2024-0526-003", "lan***86@gmail.com", "Techcombank", "5678", 650_000_000, "Thanh toán đặt cọc #AUC-2024-0519-045", "VERIFIED"],
    ["PAY-2024-0520-004", "thuy***10@gmail.com", "ACB", "2468", 30_500_000, "Thanh toán phiên #AUC-2024-0518-014", "REJECTED"],
    ["PAY-2024-0518-005", "bao***77@gmail.com", "MB Bank", "8856", 590_000_000, "Thanh toán phiên #AUC-2024-0517-008", "PENDING"],
    ["PAY-2024-0516-006", "hoang***15@gmail.com", "VietinBank", "3091", 777_000_000, "Thanh toán phiên #AUC-2024-0516-031", "VERIFIED"],
  ].map(([id, user, bankName, account, amount, content, status]) => ({
    id: String(id),
    user: String(user),
    bank: String(bankName),
    account: String(account),
    amount: Number(amount),
    content: String(content),
    status: status as "PENDING" | "VERIFIED" | "REJECTED",
  })));
  const statusTabs = [
    ["ALL", "Tất cả"],
    ["PENDING", "Chờ xác minh"],
    ["VERIFIED", "Đã xác minh"],
    ["REJECTED", "Từ chối"],
  ] as const;
  const statusLabel = {
    PENDING: "Chờ xác minh",
    VERIFIED: "Đã xác minh",
    REJECTED: "Từ chối",
  } as const;
  const filteredTransactions = transactions.filter((transaction) => {
    const search = query.trim().toLowerCase();
    return (
      (activeStatus === "ALL" || transaction.status === activeStatus) &&
      (bank === "ALL" || transaction.bank === bank) &&
      (!search ||
        `${transaction.id} ${transaction.user} ${transaction.content}`
          .toLowerCase()
          .includes(search))
    );
  });
  return (
    <AdminPage
      eyebrow="FINANCIAL MANAGEMENT"
      title="Xác minh thanh toán"
      intro="Đối soát giao dịch ngân hàng, chứng từ và kích hoạt quy trình bàn giao."
    >
      <section className="finance-payment-verification">
        <nav className="finance-payment-tabs" aria-label="Trạng thái giao dịch">
          {statusTabs.map(([status, label]) => (
            <button
              type="button"
              className={activeStatus === status ? "active" : ""}
              aria-pressed={activeStatus === status}
              key={status}
              onClick={() => setActiveStatus(status)}
            >
              {label}
              <span>
                {status === "ALL"
                  ? transactions.length
                  : transactions.filter((item) => item.status === status).length}
              </span>
            </button>
          ))}
        </nav>
        <div className="finance-payment-toolbar">
          <label>
            <Search aria-hidden="true" />
            <input
              aria-label="Tìm kiếm giao dịch"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm giao dịch, người dùng..."
            />
          </label>
          <select
            aria-label="Lọc theo ngân hàng"
            value={bank}
            onChange={(event) => setBank(event.target.value)}
          >
            <option value="ALL">Tất cả ngân hàng</option>
            {[...new Set(transactions.map((item) => item.bank))].map((item) => (
              <option value={item} key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="finance-payment-table-wrap">
          <table className="finance-payment-table">
            <thead>
              <tr>
                <th>Mã giao dịch</th>
                <th>Người dùng</th>
                <th>Ngân hàng</th>
                <th>Số tiền</th>
                <th>Nội dung</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td><strong>{transaction.id}</strong></td>
                  <td>{transaction.user}</td>
                  <td><span className="finance-bank-cell">{transaction.bank} · {transaction.account}</span></td>
                  <td><strong className="finance-payment-amount">{formatMoney(transaction.amount)}</strong></td>
                  <td>{transaction.content}</td>
                  <td>
                    <span className={`finance-payment-status ${transaction.status.toLowerCase()}`}>
                      {statusLabel[transaction.status]}
                    </span>
                  </td>
                  <td>
                    <div className="finance-payment-actions">
                      <button
                        type="button"
                        className={transaction.status === "PENDING" ? "verify" : ""}
                        disabled={!verify}
                        aria-label={`Xác minh ${transaction.id}`}
                        title={verify ? "Xác minh giao dịch" : "Không có quyền"}
                        onClick={() =>
                          setDialog({ id: transaction.id, mode: "verify" })
                        }
                      ><FileCheck2 aria-hidden="true" /></button>
                      <button
                        type="button"
                        aria-label={`Xem ${transaction.id}`}
                        title="Xem chi tiết"
                        onClick={() =>
                          setDialog({ id: transaction.id, mode: "view" })
                        }
                      ><Eye aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredTransactions.length && (
            <div className="finance-payment-empty">Không có giao dịch phù hợp với bộ lọc.</div>
          )}
        </div>
        <footer className="finance-payment-footer">
          <span>Hiển thị {filteredTransactions.length} / {transactions.length} giao dịch mới nhất</span>
          <nav aria-label="Phân trang giao dịch">
            <button type="button" disabled>‹</button>
            <button type="button" className="active" disabled>1</button>
            <button type="button" disabled title="Dữ liệu demo chỉ có một trang">2</button>
            <button type="button" disabled title="Dữ liệu demo chỉ có một trang">3</button>
            <button type="button" disabled>›</button>
          </nav>
        </footer>
      </section>
      {dialog && (
        <AuditDialog
          title={
            dialog.mode === "verify"
              ? `Xác minh thanh toán ${dialog.id}`
              : `Chi tiết thanh toán ${dialog.id}`
          }
          readOnly={dialog.mode === "view"}
          onConfirm={
            dialog.mode === "verify"
              ? () =>
                  setTransactions((current) =>
                    current.map((transaction) =>
                      transaction.id === dialog.id &&
                      transaction.status === "PENDING"
                        ? { ...transaction, status: "VERIFIED" as const }
                        : transaction,
                    ),
                  )
              : undefined
          }
          close={() => setDialog(null)}
        />
      )}
    </AdminPage>
  );
}
export function AdminReportsPage() {
  const [exported, setExported] = useState(false);
  const reports = [
    ["Khối lượng phiên", 78],
    ["Tỷ lệ hoàn tất", 91],
    ["Xác nhận thanh toán", 86],
    ["Hoàn tất bàn giao", 82],
    ["Giao thông báo", 98],
    ["Tăng trưởng người dùng", 67],
  ];
  return (
    <AdminPage
      title="Báo cáo & phân tích"
      intro="Dữ liệu aggregate theo kỳ, không có lịch sử giá đơn phiên."
    >
      <div className="report-filters">
        <select>
          <option>30 ngày gần nhất</option>
          <option>Quý hiện tại</option>
        </select>
        <button
          className="button secondary"
          onClick={() => setExported(true)}
        >
          {exported ? "Đã chuẩn bị bản xuất mô phỏng" : "Xuất báo cáo"}
        </button>
      </div>
      <div className="report-grid">
        {reports.map(([label, value], i) => (
          <Panel key={String(label)} title={String(label)}>
            <div className="report-value">
              {[BarChart3, CheckCircle2, CreditCard, Boxes, Radio, Users].map(
                (Icon, j) => j === i && <Icon key={j} />,
              )}
              <strong>{value}%</strong>
            </div>
            <div className="bar-chart">
              <span style={{ width: `${value}%` }} />
            </div>
            <small>So với kỳ trước: +{i + 2}%</small>
          </Panel>
        ))}
      </div>
    </AdminPage>
  );
}
function AdminPage({
  eyebrow = "OPERATIONS",
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="admin-heading">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        <Badge tone="success">
          <Wifi /> Hệ thống ổn định
        </Badge>
      </div>
      {children}
    </>
  );
}
function Metrics() {
  return (
    <div className="admin-metrics">
      <Metric icon={<Gavel />} value="8" label="Phiên quản lý" />
      <Metric icon={<Users />} value="126" label="Người tham gia" />
      <Metric icon={<CreditCard />} value="5" label="Chờ đối soát" />
      <Metric icon={<Activity />} value="99,96%" label="Realtime health" />
    </div>
  );
}
function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <article>
      {icon}
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="admin-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Health({ label, value }: { label: string; value: string }) {
  return (
    <div className="health-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function ManagementDate({ start, end }: { start: string; end: string }) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const date = startDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const startTime = startDate.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = endDate.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return <span className="management-session-date"><strong>{date}</strong><small>{startTime} - {endTime}</small></span>;
}
function ManagementFooter({ shown, total }: { shown: number; total: number }) {
  return (
    <footer className="management-footer">
      <span>Hiển thị {shown ? `1 - ${shown}` : "0"} / {total.toLocaleString("vi-VN")} kết quả</span>
      <nav aria-label="Phân trang danh sách">
        <button type="button" disabled>‹</button>
        <button type="button" className="active" disabled>1</button>
        <button type="button" disabled title="Dữ liệu demo chỉ có một trang">2</button>
        <button type="button" disabled title="Dữ liệu demo chỉ có một trang">3</button>
        <span>…</span>
        <button type="button" disabled title="Dữ liệu demo chỉ có một trang">26</button>
        <button type="button" disabled>›</button>
      </nav>
    </footer>
  );
}
function Filters() {
  return (
    <div className="filter-bar">
      <Search />
      <input aria-label="Tìm kiếm" placeholder="Tìm mã, tên hoặc trạng thái" />
      <select>
        <option>Tất cả trạng thái</option>
        <option>Chờ xử lý</option>
      </select>
    </div>
  );
}
function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function AuditDialog({
  title,
  close,
  onConfirm,
  readOnly = false,
}: {
  title: string;
  close: () => void;
  onConfirm?: () => void;
  readOnly?: boolean;
}) {
  const [reason, setReason] = useState("");
  const isReadOnly = readOnly || title.startsWith("Xem ");
  return (
    <div className="modal-backdrop">
      <section role="dialog" aria-modal="true" className="audit-dialog">
        <ShieldAlert />
        <h2>{title}</h2>
        <p>{isReadOnly ? "Thông tin chỉ đọc từ dữ liệu mô phỏng." : "Hành động sẽ được ghi vào nhật ký audit."}</p>
        {!isReadOnly && <label>
          Lý do bắt buộc
          <textarea
            autoFocus
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>}
        <div>
          {!isReadOnly && <button className="button secondary" onClick={close}>Hủy</button>}
          <button
            disabled={!isReadOnly && !reason.trim()}
            className="button primary"
            onClick={() => {
              onConfirm?.();
              close();
            }}
          >
            {isReadOnly ? "Đóng" : "Xác nhận"}
          </button>
        </div>
      </section>
    </div>
  );
}
