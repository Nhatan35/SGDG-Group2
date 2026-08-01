import {
  Activity,
  ArrowDownToLine,
  Bell,
  Building2,
  CircleDollarSign,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileCheck2,
  Flame,
  Gavel,
  Heart,
  KeyRound,
  Landmark,
  LockKeyhole,
  MonitorCheck,
  PackageCheck,
  Plus,
  ShieldCheck,
  Smartphone,
  Trophy,
  Wallet,
} from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AuctionStatus } from "../../components/auction/AuctionStatus";
import { Badge } from "../../components/common/Badge";
import { ButtonLink } from "../../components/common/Button";
import { FormField } from "../../components/common/FormField";
import { EmptyState } from "../../components/feedback/States";
import { auctions, type Auction } from "../../services/mock/auctionService";
import {
  type AuctionDepositReason,
  type AuctionDepositStatus,
  type KycState,
  useDemoStore,
} from "../../store/demoStore";
import {
  type PayoutStatus,
  useFinanceFlowStore,
} from "../../store/financeFlowStore";
import { formatMoney } from "../../utils/format";

const profile = {
  name: "Nguyễn Minh Anh",
  email: "nguyenminhanh@gmail.com",
  phone: "090 123 4567",
  dob: "12/05/1990",
  gender: "Nam",
  identity: "079200123456",
  issueDate: "01/01/2020",
  issuePlace: "Cục CS QLHC về TTXH",
  address: "123 Nguyễn Huệ, Quận 1, TP. HCM",
  joinedAt: "05/2024",
};

const kycLabels: Record<KycState, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  PENDING_REVIEW: "Chờ xét duyệt",
  VERIFIED: "Đã xác minh",
  REJECTED: "Bị từ chối",
  NEED_SUPPLEMENT: "Cần bổ sung",
};

const membershipLevels = [
  {
    name: "Basic",
    threshold: 0,
    condition: "Vừa đăng ký tài khoản",
    successfulAuctions: 0,
  },
  {
    name: "Verified",
    threshold: 0,
    condition: "Đã xác minh email, số điện thoại và eKYC",
    successfulAuctions: 0,
  },
  {
    name: "Silver",
    threshold: 5_000_000,
    condition: "Có ít nhất 3 giao dịch thành công",
    successfulAuctions: 3,
  },
  {
    name: "Gold",
    threshold: 30_000_000,
    condition: "Có ít nhất 10 giao dịch thành công, không vi phạm",
    successfulAuctions: 10,
  },
  {
    name: "Platinum",
    threshold: 100_000_000,
    condition: "Có ít nhất 25 giao dịch thành công, thanh toán đúng hạn",
    successfulAuctions: 25,
  },
  {
    name: "Diamond / VIP",
    threshold: 300_000_000,
    condition:
      "Lịch sử giao dịch tốt, không bỏ cọc, không tranh chấp nghiêm trọng",
    successfulAuctions: 40,
  },
];
export function DashboardPage() {
  const { userName, kyc, watchlist, unreadNotifications } = useDemoStore();

  return (
    <AccountPage
      eyebrow="TỔNG QUAN"
      title={`Xin chào, ${userName}`}
      intro="Theo dõi điều kiện tham gia, hồ sơ tài khoản và các nghĩa vụ đang cần xử lý."
    >
      <div className="account-metrics">
        <Metric
          icon={<FileCheck2 />}
          value={kyc === "VERIFIED" ? "Đã xác minh" : "Cần xử lý"}
          label="Trạng thái KYC"
        />
        <Metric icon={<Gavel />} value="3" label="Phiên đã tham gia" />
        <Metric
          icon={<Heart />}
          value={String(watchlist.length)}
          label="Đang theo dõi"
        />
        <Metric
          icon={<Bell />}
          value={String(unreadNotifications)}
          label="Thông báo chưa đọc"
        />
      </div>

      <div className="dashboard-grid account-dashboard-polish">
        <section className="panel">
          <div className="panel-title">
            <h2>Việc cần làm</h2>
            <Badge tone="warning">2 mục</Badge>
          </div>
          <Task
            icon={<CreditCard />}
            title="Nghĩa vụ thanh toán SGD-PAY-1028"
            text="Còn 22 giờ để hoàn tất."
            to="/account/winner/rolex-126610lv/payment"
          />
          <Task
            icon={<PackageCheck />}
            title="Xác nhận đã nhận tài sản"
            text="Hồ sơ bàn giao HD-204 đang chờ."
            to="/account/handover/HD-204"
          />
        </section>

        <section className="panel">
          <h2>Hoạt động gần đây</h2>
          <ActivityItem
            text="Auto Bid đã được kích hoạt"
            time="10 phút trước"
          />
          <ActivityItem
            text="Bạn đang dẫn đầu phiên SGD-260717-001"
            time="18 phút trước"
          />
          <ActivityItem text="Hồ sơ KYC đã được xác minh" time="Hôm qua" />
        </section>
      </div>
    </AccountPage>
  );
}

export function ProfilePage() {
  const [searchParams] = useSearchParams();
  const [saved, setSaved] = useState(false);
  const section = searchParams.get("section");

  function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  if (section === "security") return <SecuritySettingsView />;

  return (
    <AccountPage
      eyebrow="HỒ SƠ CÁ NHÂN"
      title="Thông tin tài khoản"
      intro="Quản lý thông tin định danh, liên hệ và thống kê hoạt động của tài khoản."
    >
      <section className="profile-template-card">
        <header className="profile-template-head">
          <div className="profile-avatar">
            <span aria-hidden="true">NA</span>
          </div>
          <div>
            <h2>{profile.name}</h2>
            <span>Thành viên từ {profile.joinedAt}</span>
          </div>
          <Badge tone="success">
            <CheckCircle2 /> Đã xác minh
          </Badge>
        </header>

        <div className="profile-info-panel">
          <h3>Thông tin cá nhân</h3>
          <dl>
            <InfoItem label="Họ và tên" value={profile.name} />
            <InfoItem label="Ngày sinh" value={profile.dob} />
            <InfoItem label="Email" value={profile.email} />
            <InfoItem label="Giới tính" value={profile.gender} />
            <InfoItem label="Số điện thoại" value={profile.phone} />
            <InfoItem label="Địa chỉ" value={profile.address} />
          </dl>
        </div>
      </section>

      <section className="profile-stats-grid" aria-label="Thống kê tài khoản">
        <StatCard label="Tổng số đơn mua" value="12" />
        <StatCard label="Tổng giá trị giao dịch" value="2.450.000.000 đ" />
        <StatCard label="Sản phẩm đang theo dõi" value="18" />
        <StatCard label="Đấu giá đã tham gia" value="32" />
      </section>

      <form className="panel profile-form profile-edit-panel" onSubmit={submit}>
        <div className="panel-title">
          <h2>Cập nhật thông tin liên hệ</h2>
          {saved && (
            <span className="save-success">
              <CheckCircle2 /> Đã lưu thay đổi
            </span>
          )}
        </div>
        <div className="form-grid">
          <FormField
            label="Họ và tên"
            name="name"
            defaultValue={profile.name}
            required
          />
          <FormField
            label="Ngày sinh"
            name="dob"
            type="date"
            defaultValue="1990-05-12"
          />
          <FormField
            label="Email"
            name="email"
            type="email"
            defaultValue="customer@sgdg.demo"
            required
          />
          <FormField
            label="Số điện thoại"
            name="phone"
            defaultValue={profile.phone}
            required
          />
          <FormField
            label="Số CCCD"
            name="identity"
            defaultValue="079***456"
            disabled
            hint="Chỉ thay đổi qua quy trình hỗ trợ."
          />
          <FormField
            label="Địa chỉ liên hệ"
            name="address"
            defaultValue={profile.address}
          />
        </div>
        <div className="form-actions">
          <button className="button primary">Lưu hồ sơ</button>
        </div>
      </form>
    </AccountPage>
  );
}

function SecuritySettingsView() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [loginAlertEnabled, setLoginAlertEnabled] = useState(true);

  return (
    <AccountPage
      eyebrow="CÀI ĐẶT BẢO MẬT"
      title="Bảo vệ tài khoản"
      intro="Quản lý mật khẩu, xác thực 2 lớp, thiết bị tin cậy và cảnh báo bảo mật cho tài khoản đấu giá."
    >
      <section className="security-hero-card">
        <div>
          <span>
            <LockKeyhole /> Điểm bảo mật
          </span>
          <h2>Rất tốt</h2>
          <p>
            Tài khoản đã xác minh KYC, bật xác thực 2 lớp và nhận cảnh báo khi
            có đăng nhập bất thường.
          </p>
        </div>
        <strong>92%</strong>
      </section>

      <div className="security-grid">
        <section className="security-panel">
          <div className="security-panel-head">
            <div>
              <span className="security-icon">
                <Smartphone />
              </span>
              <h2>Xác thực 2 lớp</h2>
              <p>Yêu cầu mã OTP khi đăng nhập hoặc đặt giá trị cao.</p>
            </div>
            <button
              className={
                twoFactorEnabled ? "security-toggle enabled" : "security-toggle"
              }
              type="button"
              aria-pressed={twoFactorEnabled}
              onClick={() => setTwoFactorEnabled((value) => !value)}
            >
              <span />
            </button>
          </div>
          <div className="security-method-list">
            <SecurityMethod
              title="Ứng dụng xác thực"
              text="Đã liên kết với SGDG Authenticator"
              status="Đang bật"
            />
            <SecurityMethod
              title="SMS OTP"
              text="Gửi đến 090 *** 4567"
              status="Dự phòng"
            />
            <SecurityMethod
              title="Email OTP"
              text="Gửi đến nguyenminhanh@gmail.com"
              status="Dự phòng"
            />
          </div>
        </section>

        <section className="security-panel">
          <div className="security-panel-head">
            <div>
              <span className="security-icon">
                <KeyRound />
              </span>
              <h2>Mật khẩu</h2>
              <p>Cập nhật định kỳ để bảo vệ ví và phiên đấu giá.</p>
            </div>
            <Badge tone="success">Mạnh</Badge>
          </div>
          <div className="security-password-box">
            <span>Lần đổi gần nhất</span>
            <strong>18/07/2026</strong>
            <small>Khuyến nghị đổi mật khẩu sau mỗi 90 ngày.</small>
          </div>
          <button className="button secondary">Đổi mật khẩu</button>
        </section>
      </div>

      <section className="security-panel security-full-panel">
        <div className="security-panel-head">
          <div>
            <span className="security-icon">
              <MonitorCheck />
            </span>
            <h2>Thiết bị và phiên đăng nhập</h2>
            <p>Kiểm tra thiết bị đang truy cập tài khoản của bạn.</p>
          </div>
          <button className="button secondary">Đăng xuất thiết bị khác</button>
        </div>
        <div className="security-device-list">
          <SecurityDevice
            name="Chrome trên Windows"
            meta="TP. Hồ Chí Minh · Đang hoạt động"
            current
          />
          <SecurityDevice
            name="Safari trên iPhone"
            meta="Đăng nhập 2 ngày trước"
          />
          <SecurityDevice
            name="Chrome trên Android"
            meta="Đăng nhập 12 ngày trước"
          />
        </div>
      </section>

      <section className="security-panel security-alert-panel">
        <div>
          <h2>Cảnh báo bảo mật</h2>
          <p>
            Gửi thông báo khi có đăng nhập mới, đổi mật khẩu, rút tiền hoặc đặt
            cọc đấu giá.
          </p>
        </div>
        <button
          className={
            loginAlertEnabled ? "security-toggle enabled" : "security-toggle"
          }
          type="button"
          aria-pressed={loginAlertEnabled}
          onClick={() => setLoginAlertEnabled((value) => !value)}
        >
          <span />
        </button>
      </section>
    </AccountPage>
  );
}

export function KycPage() {
  const { kyc, setKyc } = useDemoStore();
  const states: KycState[] = [
    "NOT_STARTED",
    "IN_PROGRESS",
    "PENDING_REVIEW",
    "VERIFIED",
    "REJECTED",
    "NEED_SUPPLEMENT",
  ];
  const completedStep = kyc === "VERIFIED" ? 5 : kyc === "NOT_STARTED" ? 1 : 3;

  return (
    <AccountPage
      eyebrow="XÁC MINH KYC"
      title="Xác minh danh tính"
      intro="Hoàn tất thông tin định danh để đủ điều kiện đăng ký và đặt cọc cho phiên đấu giá."
    >
      <div className="kyc-template-grid">
        <aside className="kyc-process-list" aria-label="Tiến trình KYC">
          {[
            ["Thông tin cá nhân", "Bước 1"],
            ["Giấy tờ tùy thân", "Bước 2"],
            ["Xác thực khuôn mặt", "Bước 3"],
            ["Xác minh địa chỉ", "Bước 4"],
            ["Hoàn tất", "Bước 5"],
          ].map(([label, step], index) => (
            <div
              className={index + 1 <= completedStep ? "done" : ""}
              key={label}
            >
              <span>
                {index + 1 <= completedStep ? <CheckCircle2 /> : index + 1}
              </span>
              <strong>{step}</strong>
              <small>{label}</small>
            </div>
          ))}
        </aside>

        <section className="kyc-form-card">
          <span className="eyebrow">THÔNG TIN CÁ NHÂN</span>
          <h2>Xác minh danh tính (KYC)</h2>
          <p>
            Vui lòng cung cấp thông tin rõ ràng, chính xác để xét duyệt nhanh
            hơn.
          </p>
          <form>
            <FormField
              label="Họ và tên"
              name="name"
              defaultValue={profile.name}
              required
            />
            <FormField
              label="Ngày sinh"
              name="dob"
              type="date"
              defaultValue="1990-05-12"
              required
            />
            <FormField
              label="Số CMND/CCCD"
              name="identity"
              defaultValue={profile.identity}
              required
            />
            <FormField
              label="Ngày cấp"
              name="issuedAt"
              type="date"
              defaultValue="2020-01-01"
              required
            />
            <FormField
              label="Nơi cấp"
              name="issuedPlace"
              defaultValue={profile.issuePlace}
              required
            />
            <label className="kyc-demo-select">
              Trạng thái demo
              <select
                value={kyc}
                onChange={(e) => setKyc(e.target.value as KycState)}
              >
                {states.map((state) => (
                  <option value={state} key={state}>
                    {kycLabels[state]}
                  </option>
                ))}
              </select>
            </label>
            <button className="button primary" type="button">
              Tiếp tục
            </button>
          </form>
        </section>

        <aside className="kyc-guide-card">
          <h3>Hướng dẫn</h3>
          <ol>
            <li>Chuẩn bị CMND/CCCD còn hiệu lực.</li>
            <li>Chụp rõ mặt trước và mặt sau giấy tờ.</li>
            <li>Thông tin phải trùng khớp với hồ sơ đăng ký.</li>
            <li>Dùng đúng số điện thoại để nhận OTP.</li>
          </ol>
          <div className="kyc-id-preview" aria-hidden="true">
            <div>
              <span />
              <strong>CĂN CƯỚC CÔNG DÂN</strong>
              <small>{profile.name}</small>
            </div>
            <ShieldCheck />
          </div>
          <Badge tone={kyc === "VERIFIED" ? "success" : "warning"}>
            {kycLabels[kyc]}
          </Badge>
        </aside>
      </div>
    </AccountPage>
  );
}

export function WatchlistPage() {
  const { watchlist, toggleWatch } = useDemoStore();
  const [filter, setFilter] = useState("Tất cả");
  const items = useMemo(
    () => auctions.filter((auction) => watchlist.includes(auction.id)),
    [watchlist],
  );
  const visibleItems = items.filter((auction) => {
    if (filter === "Đang đấu giá") return auction.status === "LIVE";
    if (filter === "Sắp đấu giá") {
      return ["PUBLISHED", "REGISTRATION_OPEN"].includes(auction.status);
    }
    if (filter === "Đã kết thúc") {
      return ["CLOSED", "COMPLETED"].includes(auction.status);
    }
    return true;
  });

  return (
    <AccountPage
      eyebrow="DANH SÁCH THEO DÕI"
      title="Phiên bạn quan tâm"
      intro="Theo dõi sản phẩm, giá hiện tại và thời gian còn lại của các phiên đấu giá."
    >
      <section className="watchlist-template">
        <div className="watchlist-tabs">
          {[
            ["Tất cả", items.length],
            [
              "Đang đấu giá",
              items.filter((item) => item.status === "LIVE").length,
            ],
            [
              "Sắp đấu giá",
              items.filter((item) =>
                ["PUBLISHED", "REGISTRATION_OPEN"].includes(item.status),
              ).length,
            ],
            [
              "Đã kết thúc",
              items.filter((item) =>
                ["CLOSED", "COMPLETED"].includes(item.status),
              ).length,
            ],
          ].map(([label, count]) => (
            <button
              className={filter === label ? "active" : ""}
              key={label}
              onClick={() => setFilter(String(label))}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {visibleItems.length ? (
          <div className="watchlist-list">
            {visibleItems.map((auction) => (
              <WatchlistRow
                key={auction.id}
                auction={auction}
                onRemove={() => toggleWatch(auction.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Heart aria-hidden="true" />}
            title="Chưa có phiên phù hợp"
            description="Thử chọn bộ lọc khác hoặc khám phá thêm các phiên đang mở."
            primaryAction={
              <ButtonLink to="/auctions">Khám phá phiên</ButtonLink>
            }
          />
        )}

        <Link className="button secondary watchlist-more" to="/auctions">
          Xem tất cả
        </Link>
      </section>
    </AccountPage>
  );
}

export function MembershipPage() {
  const totalSuccessfulValue = 42_500_000;
  const successfulAuctions = 12;
  const memberPoints =
    Math.floor(totalSuccessfulValue / 100_000) + successfulAuctions * 50;
  const currentLevel = membershipLevels[3];
  const nextLevel = membershipLevels[4];
  const valueProgress = Math.min(
    100,
    (totalSuccessfulValue / nextLevel.threshold) * 100,
  );
  const transactionProgress = Math.min(
    100,
    (successfulAuctions / nextLevel.successfulAuctions) * 100,
  );
  const remainingValue = Math.max(
    0,
    nextLevel.threshold - totalSuccessfulValue,
  );
  const remainingAuctions = Math.max(
    0,
    nextLevel.successfulAuctions - successfulAuctions,
  );

  return (
    <AccountPage
      eyebrow="ĐIỂM THÀNH VIÊN"
      title="Membership đấu giá"
      intro="Điểm và hạng thành viên được cộng từ các phiên đấu giá thành công, lịch sử thanh toán và mức độ uy tín khi tham gia."
    >
      <section className="membership-hero-card">
        <div>
          <span className="membership-current">Hạng hiện tại</span>
          <h2>{currentLevel.name}</h2>
          <p>{currentLevel.condition}</p>
        </div>
        <div className="membership-points">
          <Trophy />
          <strong>{memberPoints.toLocaleString("vi-VN")}</strong>
          <span>điểm thành viên</span>
        </div>
      </section>

      <section className="membership-progress-card">
        <div className="panel-title">
          <div>
            <h2>Duy trì và lên hạng {nextLevel.name}</h2>
            <p>
              Cập nhật tự động sau khi phiên đấu giá hoàn tất thanh toán và bàn
              giao thành công.
            </p>
          </div>
          <Badge tone="warning">Đấu giá uy tín</Badge>
        </div>
        <div className="membership-progress-grid">
          <MembershipProgress
            label="Tổng giá trị giao dịch"
            current={formatMoney(totalSuccessfulValue)}
            target={formatMoney(nextLevel.threshold)}
            progress={valueProgress}
            note={`Cần thêm ${formatMoney(remainingValue)}`}
          />
          <MembershipProgress
            label="Giao dịch thành công"
            current={`${successfulAuctions}`}
            target={`${nextLevel.successfulAuctions}`}
            progress={transactionProgress}
            note={`Cần thêm ${remainingAuctions} phiên thành công`}
          />
        </div>
      </section>

      <section className="membership-level-panel">
        <h2>Bảng hạng Membership</h2>
        <div className="membership-level-list">
          {membershipLevels.map((level) => (
            <article
              className={level.name === currentLevel.name ? "active" : ""}
              key={level.name}
            >
              <div>
                <strong>{level.name}</strong>
                <span>
                  {level.threshold === 0
                    ? "0 VND"
                    : `Từ ${formatMoney(level.threshold)}`}
                </span>
              </div>
              <p>{level.condition}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="membership-point-rules">
        <h2>Cách cộng điểm trong đấu giá</h2>
        <div>
          <span>+50 điểm</span>
          <p>Mỗi phiên đấu giá thanh toán thành công.</p>
        </div>
        <div>
          <span>+1 điểm</span>
          <p>Mỗi 100.000 VND giá trị giao dịch thành công.</p>
        </div>
        <div>
          <span>Không cộng</span>
          <p>Phiên bỏ cọc, tranh chấp nghiêm trọng hoặc thanh toán quá hạn.</p>
        </div>
      </section>
    </AccountPage>
  );
}

export function WalletPage() {
  const {
    userName,
    walletBalance,
    bankAccounts: linkedBankAccounts,
    addBankAccount,
    withdrawFromWallet,
  } = useDemoStore();
  const payoutRequests = useFinanceFlowStore(
    (state) => state.payoutRequests,
  );
  const createPayoutRequest = useFinanceFlowStore(
    (state) => state.createPayoutRequest,
  );
  const bankAccounts = linkedBankAccounts ?? [];
  const [showBankForm, setShowBankForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedBankId, setSelectedBankId] = useState(
    bankAccounts[0]?.id ?? "",
  );
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const activeBankId = selectedBankId || bankAccounts[0]?.id || "";
  const selectedBank =
    bankAccounts.find((item) => item.id === activeBankId) ?? bankAccounts[0];
  const amount = Number(withdrawAmount);
  const canWithdraw =
    Boolean(selectedBank) && amount > 0 && amount <= walletBalance;

  function addBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    addBankAccount({
      bankName: String(data.get("bankName") || "").trim(),
      accountNumber: String(data.get("accountNumber") || "").trim(),
      accountHolder: String(data.get("accountHolder") || "")
        .trim()
        .toUpperCase(),
      branch: String(data.get("branch") || "").trim(),
      isDefault: bankAccounts.length === 0,
    });
    event.currentTarget.reset();
    setShowBankForm(false);
    setMessage("Đã liên kết tài khoản ngân hàng mới.");
  }

  function requestWithdraw(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!selectedBank) {
      setMessage("Vui lòng liên kết hoặc chọn tài khoản ngân hàng.");
      return;
    }
    if (!amount || amount <= 0) {
      setMessage("Nhập số tiền cần rút hợp lệ.");
      return;
    }
    if (amount > walletBalance) {
      setMessage("Số dư ví không đủ để thực hiện lệnh rút.");
      return;
    }
    setConfirming(true);
  }

  function confirmWithdraw() {
    if (!selectedBank || !canWithdraw) return;
    const payout = createPayoutRequest({
      userName,
      bankName: selectedBank.bankName,
      accountNumber: selectedBank.accountNumber,
      accountHolder: selectedBank.accountHolder,
      amount,
    });
    withdrawFromWallet(amount);
    setConfirming(false);
    setMessage(
      `Đã gửi ${payout.id} tới Finance. Số tiền ${formatMoney(amount)} đang được tạm giữ để kiểm tra.`,
    );
    setWithdrawAmount("");
  }

  const userPayouts = payoutRequests.filter(
    (item) => item.userCode === "USR-CURRENT" || item.userName === userName,
  );
  const payoutStatusLabels: Record<PayoutStatus, string> = {
    PENDING_REVIEW: "Finance đang kiểm tra",
    APPROVED: "Đã được duyệt",
    PROCESSING: "Ngân hàng đang xử lý",
    PAID: "Đã chuyển tiền",
    REJECTED: "Đã từ chối",
  };

  return (
    <AccountPage
      eyebrow="VÍ SGD"
      title="Quản lý ví & tài khoản ngân hàng"
      intro="Theo dõi số dư, liên kết nhiều tài khoản ngân hàng và xác nhận thông tin trước khi rút tiền."
    >
      <div className="wallet-grid">
        <section className="wallet-balance-card">
          <span>
            <Wallet />
            Số dư khả dụng
          </span>
          <strong>{formatMoney(walletBalance)}</strong>
          <small>
            Tiền trong ví dùng để đặt cọc đấu giá, nạp thêm và rút về tài khoản
            ngân hàng đã liên kết.
          </small>
        </section>

        <section className="panel wallet-withdraw-panel">
          <h2>
            <ArrowDownToLine />
            Rút tiền
          </h2>
          <form onSubmit={requestWithdraw}>
            <label>
              Tài khoản nhận tiền
              <select
                value={activeBankId}
                onChange={(event) => setSelectedBankId(event.target.value)}
              >
                {bankAccounts.length ? (
                  bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} - {account.accountNumber}
                    </option>
                  ))
                ) : (
                  <option value="">Chưa có tài khoản liên kết</option>
                )}
              </select>
            </label>
            <label>
              Số tiền muốn rút
              <input
                inputMode="numeric"
                value={withdrawAmount}
                onChange={(event) =>
                  setWithdrawAmount(event.target.value.replace(/\D/g, ""))
                }
                placeholder="Nhập số tiền VND"
              />
            </label>
            <button className="button primary" disabled={!canWithdraw}>
              Tiếp tục xác nhận
            </button>
          </form>
          {message && <p className="wallet-message">{message}</p>}
        </section>
      </div>

      <section className="panel wallet-bank-panel">
        <div className="panel-title">
          <h2>
            <Landmark />
            Tài khoản ngân hàng liên kết
          </h2>
          <button
            className="button secondary"
            onClick={() => setShowBankForm((value) => !value)}
          >
            <Plus />
            Thêm ngân hàng
          </button>
        </div>

        {showBankForm && (
          <form className="bank-add-form" onSubmit={addBank}>
            <FormField
              name="bankName"
              label="Ngân hàng"
              defaultValue="Techcombank"
              required
            />
            <FormField
              name="accountNumber"
              label="Số tài khoản"
              inputMode="numeric"
              required
            />
            <FormField
              name="accountHolder"
              label="Tên chủ tài khoản"
              defaultValue="NGUYEN MINH ANH"
              required
            />
            <FormField
              name="branch"
              label="Chi nhánh"
              defaultValue="TP. Hồ Chí Minh"
            />
            <button className="button primary">Liên kết tài khoản</button>
          </form>
        )}

        <div className="bank-account-list">
          {bankAccounts.map((account) => (
            <article key={account.id}>
              <Building2 />
              <div>
                <strong>{account.bankName}</strong>
                <span>{account.accountNumber}</span>
                <small>
                  {account.accountHolder}
                  {account.branch ? ` - ${account.branch}` : ""}
                </small>
              </div>
              {account.isDefault && <Badge tone="success">Mặc định</Badge>}
            </article>
          ))}
        </div>
      </section>

      <section className="panel wallet-payout-history">
        <div className="panel-title">
          <div>
            <h2>
              <ClipboardCheck />
              Yêu cầu rút tiền gần đây
            </h2>
            <p>
              Trạng thái được cập nhật trực tiếp sau khi Finance kiểm tra và
              xử lý lệnh chi.
            </p>
          </div>
          <span>{userPayouts.length} yêu cầu</span>
        </div>
        {userPayouts.length ? (
          <div className="wallet-payout-list">
            {userPayouts.map((payout) => (
              <article key={payout.id}>
                <span
                  className={`wallet-payout-icon ${payout.status.toLowerCase()}`}
                >
                  <ArrowDownToLine aria-hidden="true" />
                </span>
                <div>
                  <strong>{payout.id}</strong>
                  <small>
                    {payout.bankName} · {payout.accountNumber}
                  </small>
                  <time>
                    {new Date(payout.createdAt).toLocaleString("vi-VN")}
                  </time>
                </div>
                <strong>{formatMoney(payout.amount)}</strong>
                <span
                  className={`wallet-payout-status ${payout.status.toLowerCase()}`}
                >
                  {payoutStatusLabels[payout.status]}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="wallet-payout-empty">
            Bạn chưa có yêu cầu rút tiền nào được gửi tới Finance.
          </p>
        )}
      </section>

      {confirming && selectedBank && (
        <div
          className="wallet-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-confirm-title"
        >
          <section className="wallet-confirm-modal">
            <h2 id="withdraw-confirm-title">Xác nhận thông tin rút tiền</h2>
            <p>
              Vui lòng kiểm tra kỹ tài khoản ngân hàng nhận tiền trước khi xác
              nhận.
            </p>
            <dl>
              <InfoItem label="Ngân hàng" value={selectedBank.bankName} />
              <InfoItem
                label="Số tài khoản"
                value={selectedBank.accountNumber}
              />
              <InfoItem
                label="Chủ tài khoản"
                value={selectedBank.accountHolder}
              />
              <InfoItem label="Số tiền rút" value={formatMoney(amount)} />
              <InfoItem
                label="Số dư sau rút"
                value={formatMoney(walletBalance - amount)}
              />
            </dl>
            <div className="modal-actions">
              <button
                className="button secondary"
                onClick={() => setConfirming(false)}
              >
                Kiểm tra lại
              </button>
              <button className="button primary" onClick={confirmWithdraw}>
                Xác nhận rút tiền
              </button>
            </div>
          </section>
        </div>
      )}
    </AccountPage>
  );
}

export function MyAuctionsPage() {
  const records = [
    {
      auction: auctions.find((item) => item.id === "rolex-126610lv"),
      status: "Đang diễn ra",
      tone: "live",
      detail: `Giá đã trả: ${formatMoney(450_000_000)}`,
      meta: "SBD 018 · Đã đặt cọc",
      to: "/auctions/rolex-126610lv/live",
      action: "Vào phòng đấu giá",
    },
    {
      auction: auctions.find((item) => item.id === "patek-nautilus"),
      status: "Đã thắng",
      tone: "success",
      detail: `Giá trúng: ${formatMoney(3_250_000_000)}`,
      meta: "Đang chờ hoàn tất thanh toán",
      to: "/me/auctions/patek-nautilus/result",
      action: "Xem kết quả",
    },
    {
      auction: auctions.find((item) => item.id === "diamond-gia"),
      status: "Đã đăng ký",
      tone: "pending",
      detail: "Hồ sơ tham gia đã được ghi nhận",
      meta: "Chờ phiên đấu giá bắt đầu",
      to: "/auctions/diamond-gia",
      action: "Xem phiên",
    },
  ].filter((record) => record.auction);

  return (
    <AccountPage
      eyebrow="HOẠT ĐỘNG ĐẤU GIÁ"
      title="Phiên đấu giá của tôi"
      intro="Theo dõi các phiên bạn đã đăng ký, đang tham gia hoặc đã có kết quả."
    >
      <div className="account-collection-stats">
        <StatCard label="Tổng số phiên" value={String(records.length)} />
        <StatCard label="Đang tham gia" value="1" />
        <StatCard label="Đã thắng" value="1" />
      </div>
      <div className="account-record-list">
        {records.map(({ auction, status, tone, detail, meta, to, action }) => (
          <article className="account-record-card" key={auction!.id}>
            <img src={auction!.image} alt={auction!.assetName} />
            <div className="account-record-copy">
              <div className="account-record-heading">
                <div>
                  <small>{auction!.code}</small>
                  <h2>{auction!.assetName}</h2>
                </div>
                <span className={`account-record-status is-${tone}`}>
                  {status}
                </span>
              </div>
              <strong>{detail}</strong>
              <p>{meta}</p>
            </div>
            <Link className="button secondary" to={to}>
              {action}
            </Link>
          </article>
        ))}
      </div>
    </AccountPage>
  );
}

export function MyPaymentsPage() {
  const patek = auctions.find((item) => item.id === "patek-nautilus");

  return (
    <AccountPage
      eyebrow="TÀI CHÍNH CÁ NHÂN"
      title="Thanh toán của tôi"
      intro="Quản lý tiền cọc, khoản phải thanh toán và trạng thái đối soát của từng phiên."
    >
      <div className="account-collection-stats">
        <StatCard label="Chờ thanh toán" value="1" />
        <StatCard label="Đã hoàn tất" value="1" />
        <StatCard label="Tổng tiền cọc" value={formatMoney(38_000_000)} />
      </div>
      <div className="account-record-list">
        <article className="account-record-card account-record-card--compact">
          <span className="account-record-icon">
            <CreditCard aria-hidden="true" />
          </span>
          <div className="account-record-copy">
            <div className="account-record-heading">
              <div>
                <small>SGD-260717-002</small>
                <h2>{patek?.assetName ?? "Patek Philippe Nautilus 5711/1R"}</h2>
              </div>
              <span className="account-record-status is-pending">
                Chờ thanh toán
              </span>
            </div>
            <strong>{formatMoney(3_250_000_000)}</strong>
            <p>Hạn thanh toán: 17:00, 20/07/2026</p>
          </div>
          <Link
            className="button primary"
            to="/me/auctions/patek-nautilus/payment"
          >
            Thanh toán ngay
          </Link>
        </article>
        <article className="account-record-card account-record-card--compact">
          <span className="account-record-icon">
            <CircleDollarSign aria-hidden="true" />
          </span>
          <div className="account-record-copy">
            <div className="account-record-heading">
              <div>
                <small>SGD-260717-001</small>
                <h2>Tiền cọc phiên Rolex Submariner Date</h2>
              </div>
              <span className="account-record-status is-success">
                Đã ghi nhận
              </span>
            </div>
            <strong>{formatMoney(38_000_000)}</strong>
            <p>Khoản cọc đang được giữ cho phiên đấu giá trực tiếp.</p>
          </div>
          <Link className="button secondary" to="/account/deposits">
            Xem tiền cọc
          </Link>
        </article>
      </div>
    </AccountPage>
  );
}

export function MyDeliveriesPage() {
  const patek = auctions.find((item) => item.id === "patek-nautilus");

  return (
    <AccountPage
      eyebrow="BÀN GIAO TÀI SẢN"
      title="Bàn giao của tôi"
      intro="Theo dõi lịch hẹn, quá trình vận chuyển và xác nhận nhận tài sản."
    >
      <div className="account-collection-stats">
        <StatCard label="Đang xử lý" value="1" />
        <StatCard label="Đang vận chuyển" value="0" />
        <StatCard label="Đã hoàn tất" value="0" />
      </div>
      <div className="account-record-list">
        <article className="account-record-card account-record-card--compact">
          <span className="account-record-icon">
            <PackageCheck aria-hidden="true" />
          </span>
          <div className="account-record-copy">
            <div className="account-record-heading">
              <div>
                <small>Hồ sơ HO-5711R-2026</small>
                <h2>{patek?.assetName ?? "Patek Philippe Nautilus 5711/1R"}</h2>
              </div>
              <span className="account-record-status is-live">
                Đang chuẩn bị
              </span>
            </div>
            <strong>Chờ xác nhận lịch bàn giao</strong>
            <p>Địa điểm dự kiến: Trung tâm bàn giao SGDG, TP. Hồ Chí Minh</p>
          </div>
          <Link
            className="button secondary"
            to="/me/handover/HO-5711R-2026"
          >
            Theo dõi bàn giao
          </Link>
        </article>
      </div>
    </AccountPage>
  );
}

const depositStatusLabels: Record<AuctionDepositStatus, string> = {
  ACTIVE: "Đang được giữ",
  ON_HOLD: "Tạm giữ để đối soát",
  REFUND_PENDING: "Đang chờ Finance hoàn cọc",
  REFUNDED: "Đã hoàn vào ví",
  FORFEITED: "Đã thu cọc",
  APPLIED_TO_PAYMENT: "Đã khấu trừ thanh toán",
};

const depositReasonLabels: Record<AuctionDepositReason, string> = {
  NOT_WINNER: "Không trúng đấu giá",
  AUCTION_CANCELLED: "Phiên đấu giá bị hủy",
  AUCTION_FAILED: "Phiên không hình thành người thắng hợp lệ",
  PAYMENT_AMBIGUOUS: "Đang đối soát nghĩa vụ thanh toán",
  PAYMENT_DEFAULT: "Không hoàn tất thanh toán đúng hạn",
  WINNER_PAYMENT: "Khấu trừ vào thanh toán trúng đấu giá",
};

export function DepositsPage() {
  const records = useDemoStore((state) =>
    Object.values(state.auctionDepositRecords).sort(
      (first, second) =>
        new Date(second.updatedAt).getTime() -
        new Date(first.updatedAt).getTime(),
    ),
  );

  return (
    <AccountPage
      eyebrow="TIỀN CỌC ĐẤU GIÁ"
      title="Theo dõi tiền cọc"
      intro="Xem khoản cọc đang giữ, lệnh hoàn tiền, khoản đã khấu trừ và các trường hợp bị thu do không hoàn tất nghĩa vụ."
    >
      <section className="deposit-policy-summary">
        <CircleDollarSign aria-hidden="true" />
        <div>
          <h2>Nguyên tắc xử lý tiền cọc</h2>
          <p>
            Không trúng hoặc phiên thất bại sẽ được hoàn cọc; thanh toán thành
            công sẽ khấu trừ cọc; quá hạn thanh toán có thể làm mất cọc.
          </p>
        </div>
      </section>

      {records.length ? (
        <div className="deposit-record-list">
          {records.map((record) => {
            const auction = auctions.find(
              (item) => item.id === record.auctionId,
            );
            const tone =
              record.status === "REFUNDED" ||
              record.status === "APPLIED_TO_PAYMENT"
                ? "success"
                : record.status === "FORFEITED"
                  ? "danger"
                  : record.status === "ON_HOLD" ||
                      record.status === "REFUND_PENDING"
                    ? "warning"
                    : "info";
            return (
              <article
                className={`deposit-record status-${record.status.toLowerCase()}`}
                key={record.reference}
              >
                <header>
                  <div>
                    <small>{record.reference}</small>
                    <h2>{auction?.assetName ?? record.auctionId}</h2>
                    <p>{auction?.code ?? record.auctionId}</p>
                  </div>
                  <Badge tone={tone}>{depositStatusLabels[record.status]}</Badge>
                </header>
                <strong className="deposit-record-amount">
                  {formatMoney(record.amount)}
                </strong>
                {record.reason && (
                  <p className="deposit-record-reason">
                    {depositReasonLabels[record.reason]}
                  </p>
                )}
                <ol className="deposit-record-timeline">
                  {record.timeline.map((event) => (
                    <li key={event.id}>
                      <CheckCircle2 aria-hidden="true" />
                      <div>
                        <strong>{event.label}</strong>
                        {event.note && <span>{event.note}</span>}
                        <time dateTime={event.at}>
                          {new Date(event.at).toLocaleString("vi-VN")}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
                {auction && (
                  <ButtonLink
                    variant="secondary"
                    to={`/auctions/${auction.id}`}
                  >
                    Xem phiên đấu giá
                  </ButtonLink>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Bạn chưa có khoản cọc nào"
          description="Sau khi đặt cọc tham gia phiên, trạng thái xử lý sẽ được hiển thị tại đây."
          primaryAction={<ButtonLink to="/auctions">Khám phá phiên đấu giá</ButtonLink>}
        />
      )}
    </AccountPage>
  );
}

const notifications = [
  [
    "BID",
    "Bạn đang dẫn đầu",
    "Bid 450.000.000 đ đã được chấp nhận.",
    "2 phút trước",
  ],
  [
    "OUTBID",
    "Bạn vừa bị vượt giá",
    "Kiểm tra phiên Rolex Submariner để đặt mức giá mới.",
    "8 phút trước",
  ],
  [
    "AUTO BID",
    "Auto Bid đã hoạt động",
    "Hệ thống đã đặt một bid hợp lệ thay bạn.",
    "12 phút trước",
  ],
  [
    "ELIGIBILITY",
    "Đủ điều kiện tham gia",
    "Hồ sơ phiên SGD-260719-004 đã hợp lệ.",
    "Hôm qua",
  ],
  [
    "PAYMENT",
    "Sắp đến hạn thanh toán",
    "Nghĩa vụ SGD-PAY-1028 còn 22 giờ.",
    "Hôm qua",
  ],
];

export function NotificationsPage() {
  const { unreadNotifications, markAllRead } = useDemoStore();
  const [category, setCategory] = useState("Tất cả");
  const filtered =
    category === "Tất cả"
      ? notifications
      : notifications.filter((item) => item[0] === category);

  return (
    <AccountPage
      eyebrow="TRUNG TÂM THÔNG BÁO"
      title="Thông báo"
      intro="Cập nhật bid, điều kiện, kết quả, thanh toán và bàn giao."
    >
      <div className="notification-toolbar">
        <div>
          {[
            "Tất cả",
            "BID",
            "OUTBID",
            "AUTO BID",
            "ELIGIBILITY",
            "PAYMENT",
          ].map((item) => (
            <button
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <button className="button ghost" onClick={markAllRead}>
          Đánh dấu đã đọc ({unreadNotifications})
        </button>
      </div>
      <div className="notification-list">
        {filtered.map(([type, title, text, time]) => (
          <article key={title}>
            <span className="notification-icon">
              <Bell />
            </span>
            <div>
              <Badge
                tone={
                  type === "OUTBID"
                    ? "danger"
                    : type === "PAYMENT"
                      ? "warning"
                      : "info"
                }
              >
                {type}
              </Badge>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
            <time>{time}</time>
          </article>
        ))}
      </div>
    </AccountPage>
  );
}

function WatchlistRow({
  auction,
  onRemove,
}: {
  auction: Auction;
  onRemove: () => void;
}) {
  const liveOrSettled = ["LIVE", "CLOSED", "COMPLETED"].includes(
    auction.status,
  );
  const displayPrice = liveOrSettled
    ? auction.currentPrice
    : auction.startPrice;

  return (
    <article className="watchlist-row">
      <Link to={`/auctions/${auction.id}`} className="watchlist-asset">
        <img src={auction.image} alt={auction.assetName} />
        <div>
          <strong>{auction.assetName}</strong>
          <small>{auction.category}</small>
          <span>
            <Eye /> {auction.watcherCount} lượt theo dõi
          </span>
        </div>
      </Link>
      <div>
        <small>Giá hiện tại</small>
        <strong>{formatMoney(displayPrice)}</strong>
      </div>
      <div>
        <small>Trạng thái</small>
        <AuctionStatus auction={auction} compact />
      </div>
      <div>
        <small>Độ nóng</small>
        <strong className="watchlist-heat">
          <Flame /> {auction.heatScore}%
        </strong>
      </div>
      <button
        className="watchlist-heart"
        type="button"
        aria-label={`Bỏ theo dõi ${auction.assetName}`}
        onClick={onRemove}
      >
        <Heart fill="currentColor" />
      </button>
    </article>
  );
}

function SecurityMethod({
  title,
  text,
  status,
}: {
  title: string;
  text: string;
  status: string;
}) {
  return (
    <article>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      <small>{status}</small>
    </article>
  );
}

function SecurityDevice({
  name,
  meta,
  current = false,
}: {
  name: string;
  meta: string;
  current?: boolean;
}) {
  return (
    <article>
      <span className="security-device-icon">
        <MonitorCheck />
      </span>
      <div>
        <strong>{name}</strong>
        <small>{meta}</small>
      </div>
      {current ? <Badge tone="success">Thiết bị hiện tại</Badge> : null}
    </article>
  );
}

function MembershipProgress({
  label,
  current,
  target,
  progress,
  note,
}: {
  label: string;
  current: string;
  target: string;
  progress: number;
  note: string;
}) {
  return (
    <article>
      <div>
        <span>{label}</span>
        <strong>
          {current}
          <small>/{target}</small>
        </strong>
      </div>
      <div className="membership-progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <p>{note}</p>
    </article>
  );
}

function AccountPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="page-heading account-page-heading">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {children}
    </>
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
    <div>
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Task({
  icon,
  title,
  text,
  to,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  to: string;
}) {
  return (
    <Link className="task-row" to={to}>
      {icon}
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
      <ClipboardCheck />
    </Link>
  );
}

function ActivityItem({ text, time }: { text: string; time: string }) {
  return (
    <div className="activity-row">
      <Activity />
      <div>
        <strong>{text}</strong>
        <span>{time}</span>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
