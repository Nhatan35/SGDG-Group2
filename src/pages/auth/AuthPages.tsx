import {
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  LockKeyhole,
  LogIn,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Star,
  UserPlus,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FormField } from "../../components/common/FormField";
import { useDemoStore } from "../../store/demoStore";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useDemoStore((s) => s.login);
  const from =
    (location.state as { from?: string } | null)?.from || "/account/dashboard";

  function completeLogin() {
    login();
    navigate(from, { replace: true });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    completeLogin();
  }

  return (
    <AuthFrame
      icon={<LogIn />}
      title="Chào mừng trở lại!"
      subtitle="Đăng nhập để tiếp tục trải nghiệm đấu giá minh bạch."
    >
      <form onSubmit={submit}>
        <FormField
          name="email"
          label="Email hoặc số điện thoại"
          type="email"
          defaultValue="customer@sgdg.demo"
          required
        />
        <FormField
          name="password"
          label="Mật khẩu"
          type="password"
          defaultValue="Demo@123"
          required
        />
        <div className="auth-form-under">
          <Link to="/auth/recovery">Quên mật khẩu?</Link>
        </div>
        <button className="button primary" type="submit">
          Đăng nhập
        </button>
      </form>
      <SocialLogin
        label="Hoặc đăng nhập với"
        onSelect={completeLogin}
        vneidTo="/auth/vneid"
        returnTo={from}
      />
      <p>
        Chưa có tài khoản?{" "}
        <Link to="/auth/register" state={{ from }}>
          Đăng ký ngay
        </Link>
      </p>
    </AuthFrame>
  );
}

type VneidStep =
  | "credentials"
  | "consent"
  | "face-ready"
  | "face-scanning"
  | "face-failed"
  | "declined"
  | "expired"
  | "success";

const VNEID_SHARED_FIELDS = [
  ["Số định danh cá nhân", "079204001234"],
  ["Họ và tên", "Nguyễn Minh Anh"],
  ["Ngày sinh", "18/04/2004"],
  ["Mức tài khoản định danh điện tử", "Mức 2"],
  ["Loại tài khoản", "Công dân Việt Nam"],
] as const;

export function VneidLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useDemoStore((s) => s.login);
  const from =
    (location.state as { from?: string } | null)?.from || "/account/dashboard";
  const expiredFromScenario = useMemo(
    () => new URLSearchParams(location.search).get("scenario") === "expired",
    [location.search],
  );
  const isRegistration = useMemo(
    () => new URLSearchParams(location.search).get("mode") === "register",
    [location.search],
  );
  const [step, setStep] = useState<VneidStep>(
    expiredFromScenario ? "expired" : "credentials",
  );
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [consented, setConsented] = useState(false);
  const [showData, setShowData] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (step !== "consent") return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setStep("expired");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step !== "face-scanning") return;
    const timer = window.setTimeout(() => {
      const shouldFail =
        new URLSearchParams(location.search).get("scenario") === "face-failed";
      if (shouldFail) {
        setStep("face-failed");
        return;
      }
      login("Nguyễn Minh Anh");
      setStep("success");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [location.search, login, step]);

  const timeLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(
    secondsLeft % 60,
  ).padStart(2, "0")}`;

  function restart() {
    setStep("credentials");
    setSecondsLeft(300);
    setConsented(false);
    setShowData(false);
  }

  return (
    <main className="vneid-page">
      <header className="vneid-topbar">
        <Link
          to={isRegistration ? "/auth/register" : "/auth/login"}
          state={{ from }}
          aria-label={
            isRegistration ? "Quay lại đăng ký SGDG" : "Quay lại đăng nhập SGDG"
          }
        >
          <ArrowLeft />
        </Link>
        <Link className="vneid-sgdg-brand" to="/">
          <img src="/assets/logo.png" alt="SGDG" />
        </Link>
        <span className="vneid-country">
          <span aria-hidden="true">★</span>
          VN
        </span>
      </header>

      <section className="vneid-flow-shell">
        <div className="vneid-flow-intro">
          <VneidMark />
          <div>
            <span>Đăng nhập định danh điện tử</span>
            <h1>
              {step === "credentials" && "Tiếp tục với tài khoản VNeID"}
              {step === "consent" &&
                (isRegistration
                  ? "Xác nhận thông tin tạo tài khoản"
                  : "Xác nhận chia sẻ thông tin")}
              {(step === "face-ready" || step === "face-scanning") &&
                "Xác thực khuôn mặt"}
              {step === "face-failed" && "Chưa thể xác thực khuôn mặt"}
              {step === "declined" && "Bạn đã từ chối chia sẻ"}
              {step === "expired" && "Yêu cầu đăng nhập đã hết hạn"}
              {step === "success" &&
                (isRegistration ? "Đăng ký thành công" : "Đăng nhập thành công")}
            </h1>
            <p>
              {step === "credentials" &&
                (isRegistration
                  ? "Xác thực danh tính để tạo tài khoản SGDG nhanh chóng và an toàn."
                  : "Xác thực danh tính để đăng nhập SGDG nhanh chóng và an toàn.")}
              {step === "consent" &&
                (isRegistration
                  ? "Kiểm tra dữ liệu sẽ được dùng để khởi tạo hồ sơ Customer SGDG."
                  : "Kiểm tra phạm vi dữ liệu trước khi đồng ý chia sẻ cho SGDG.")}
              {step === "face-ready" &&
                "Đối chiếu người đang thao tác với ảnh chân dung trong dữ liệu định danh."}
              {step === "face-scanning" &&
                "Giữ khuôn mặt trong khung hình và nhìn thẳng vào camera."}
              {step === "face-failed" &&
                "Hình ảnh chưa đủ rõ để đối chiếu. Bạn có thể thực hiện lại."}
              {step === "declined" &&
                "SGDG chưa nhận dữ liệu định danh và không tạo phiên đăng nhập."}
              {step === "expired" &&
                "Phiên xác nhận đã vượt quá thời gian cho phép. Vui lòng thử lại."}
              {step === "success" &&
                (isRegistration
                  ? "Tài khoản SGDG đã được khởi tạo từ thông tin bạn cho phép chia sẻ."
                  : "Thông tin định danh đã được chia sẻ theo đúng phạm vi bạn chấp thuận.")}
            </p>
          </div>
        </div>

        <div className="vneid-progress" aria-label="Tiến trình đăng nhập VNeID">
          {[
            ["1", "Xác thực"],
            ["2", "Chia sẻ"],
            ["3", "Khuôn mặt"],
            ["4", "Hoàn tất"],
          ].map(([number, label], index) => {
            const activeIndex =
              step === "credentials"
                ? 0
                : step === "consent"
                  ? 1
                  : step === "face-ready" ||
                      step === "face-scanning" ||
                      step === "face-failed"
                    ? 2
                  : step === "success"
                    ? 3
                    : 1;
            return (
              <div
                key={number}
                className={index <= activeIndex ? "is-active" : ""}
              >
                <span>{index < activeIndex ? <CheckCircle2 /> : number}</span>
                <small>{label}</small>
              </div>
            );
          })}
        </div>

        {step === "credentials" && (
          <form
            className="vneid-panel vneid-credentials"
            onSubmit={(event) => {
              event.preventDefault();
              setStep("consent");
            }}
          >
            <div className="vneid-panel-heading">
              <IdCard />
              <div>
                <h2>Nhập thông tin đăng nhập</h2>
                <p>Sử dụng tài khoản định danh điện tử cá nhân của bạn.</p>
              </div>
            </div>
            <label>
              Số định danh cá nhân
              <span className="vneid-input">
                <IdCard aria-hidden="true" />
                <input
                  name="personalId"
                  inputMode="numeric"
                  pattern="[0-9]{12}"
                  maxLength={12}
                  defaultValue="079204001234"
                  placeholder="Nhập 12 số định danh cá nhân"
                  autoComplete="username"
                  required
                />
              </span>
            </label>
            <label>
              Mật khẩu
              <span className="vneid-input">
                <LockKeyhole aria-hidden="true" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  defaultValue="VNeID@123"
                  placeholder="Nhập mật khẩu VNeID"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </label>
            <div className="vneid-form-links">
              <span>Thông tin được điền sẵn để phục vụ bản demo.</span>
              <Link to="/help">Cần hỗ trợ?</Link>
            </div>
            <button className="vneid-primary" type="submit">
              Đăng nhập
            </button>
            <button
              className="vneid-text-button"
              type="button"
              onClick={() =>
                navigate(
                  isRegistration ? "/auth/register" : "/auth/login",
                  { state: { from } },
                )
              }
            >
              Sử dụng phương thức {isRegistration ? "đăng ký" : "đăng nhập"} khác
            </button>
          </form>
        )}

        {step === "consent" && (
          <section className="vneid-panel vneid-consent">
            <div
              className="vneid-partner-flow"
              aria-label="VNeID chia sẻ dữ liệu cho SGDG"
            >
              <VneidMark compact />
              <span className="vneid-secure-transfer">
                <ShieldCheck />
                <i />
              </span>
              <div className="vneid-partner-logo">
                <img src="/assets/logo.png" alt="SGDG" />
              </div>
            </div>
            <h2>Ứng dụng Sài Gòn Đấu Giá</h2>
            <div className="vneid-expiry" role="timer" aria-live="polite">
              <Clock3 />
              Thời gian xác nhận còn lại <strong>{timeLabel}</strong>
            </div>
            <div className="vneid-sharing-heading">
              <div>
                <ShieldCheck />
                <span>
                  Hệ thống định danh điện tử sẽ chia sẻ các thông tin bắt buộc:
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowData((current) => !current)}
              >
                {showData ? <EyeOff /> : <Eye />}
                {showData ? "Ẩn thông tin" : "Hiện thông tin"}
              </button>
            </div>
            <dl className="vneid-data-list">
              {VNEID_SHARED_FIELDS.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{showData ? value : "••••••"}</dd>
                </div>
              ))}
            </dl>
            <div className="vneid-purpose">
              <strong>Mục đích chia sẻ, xử lý dữ liệu</strong>
              <p>
                {isRegistration
                  ? "Xác thực danh tính, khởi tạo tài khoản Customer SGDG và điền trước các trường hồ sơ cơ bản mà bạn cho phép."
                  : "Xác thực danh tính, đăng nhập tài khoản SGDG và đồng bộ các trường hồ sơ cơ bản mà bạn cho phép."}{" "}
                SGDG không nhận mật khẩu VNeID.
              </p>
            </div>
            <label className="vneid-consent-check">
              <input
                type="checkbox"
                checked={consented}
                onChange={(event) => setConsented(event.target.checked)}
              />
              <span>
                Tôi đã đọc, hiểu mục đích xử lý dữ liệu và đồng ý chia sẻ các
                thông tin được liệt kê ở trên.
              </span>
            </label>
            <div className="vneid-consent-actions">
              <button
                className="vneid-primary"
                type="button"
                disabled={!consented}
                onClick={() => setStep("face-ready")}
              >
                Xác nhận chia sẻ
              </button>
              <button
                className="vneid-secondary"
                type="button"
                onClick={() => setStep("declined")}
              >
                Xác nhận không chia sẻ
              </button>
            </div>
          </section>
        )}

        {(step === "face-ready" ||
          step === "face-scanning" ||
          step === "face-failed") && (
          <section className="vneid-panel vneid-face-panel">
            <div
              className={`vneid-face-camera ${
                step === "face-scanning" ? "is-scanning" : ""
              } ${step === "face-failed" ? "is-failed" : ""}`}
              aria-label="Khung mô phỏng camera xác thực khuôn mặt"
            >
              <span className="vneid-face-grid" aria-hidden="true" />
              <span className="vneid-face-oval" aria-hidden="true">
                <ScanFace />
              </span>
              {step === "face-scanning" && (
                <span className="vneid-scan-line" aria-hidden="true" />
              )}
              <span className="vneid-camera-status">
                {step === "face-ready" && (
                  <>
                    <Camera /> Camera sẵn sàng
                  </>
                )}
                {step === "face-scanning" && (
                  <>
                    <RefreshCw /> Đang kiểm tra sống và đối chiếu...
                  </>
                )}
                {step === "face-failed" && (
                  <>
                    <XCircle /> Chưa nhận diện đủ rõ
                  </>
                )}
              </span>
            </div>

            <div className="vneid-face-copy" aria-live="polite">
              <h2>
                {step === "face-failed"
                  ? "Vui lòng thử lại"
                  : "Đưa khuôn mặt vào giữa khung hình"}
              </h2>
              <p>
                {step === "face-failed"
                  ? "Đảm bảo khuôn mặt không bị che, camera sạch và khu vực đủ ánh sáng."
                  : "Bỏ khẩu trang, kính râm và giữ thiết bị ngang tầm mắt trong khu vực đủ sáng."}
              </p>
            </div>

            <ul className="vneid-face-guidance">
              <li>
                <CheckCircle2 /> Chỉ dùng để xác minh đúng chủ thể danh tính
              </li>
              <li>
                <ShieldCheck /> Không lưu ảnh camera trong bản wireframe
              </li>
            </ul>

            {step !== "face-scanning" && (
              <button
                className="vneid-primary"
                type="button"
                onClick={() => setStep("face-scanning")}
              >
                {step === "face-failed" ? "Thử xác thực lại" : "Bắt đầu xác thực"}
              </button>
            )}
            {step === "face-ready" && (
              <button
                className="vneid-text-button"
                type="button"
                onClick={() => setStep("consent")}
              >
                Quay lại bước chia sẻ
              </button>
            )}
          </section>
        )}

        {(step === "declined" || step === "expired") && (
          <section className="vneid-panel vneid-result is-negative">
            <span className="vneid-result-icon">
              {step === "declined" ? <XCircle /> : <Clock3 />}
            </span>
            <h2>
              {step === "declined"
                ? "Không có dữ liệu nào được chia sẻ"
                : "Phiên xác nhận không còn hiệu lực"}
            </h2>
            <p>
              Bạn có thể bắt đầu lại VNeID hoặc quay về sử dụng tài khoản SGDG.
            </p>
            <button className="vneid-primary" type="button" onClick={restart}>
              Thử lại với VNeID
            </button>
            <Link
              className="vneid-secondary"
              to={isRegistration ? "/auth/register" : "/auth/login"}
              state={{ from }}
            >
              Quay lại {isRegistration ? "đăng ký" : "đăng nhập"} SGDG
            </Link>
          </section>
        )}

        {step === "success" && (
          <section className="vneid-panel vneid-result is-success">
            <span className="vneid-result-icon">
              <UserRoundCheck />
            </span>
            <BadgeCheck className="vneid-result-badge" />
            <h2>
              {isRegistration
                ? "Tài khoản SGDG đã được khởi tạo"
                : "Danh tính đã được xác thực"}
            </h2>
            <p>
              Xin chào <strong>Nguyễn Minh Anh</strong>.{" "}
              {isRegistration
                ? "Hãy kiểm tra và hoàn thiện thông tin hồ sơ trước khi tham gia đấu giá."
                : "Bạn có thể tiếp tục đến nội dung đã yêu cầu trên SGDG."}
            </p>
            <div className="vneid-assurance">
              <ShieldCheck />
              Phiên demo chỉ lưu trạng thái đăng nhập trên thiết bị này.
            </div>
            <button
              className="vneid-primary"
              type="button"
              onClick={() => navigate("/", { replace: true })}
            >
              Vào trang chủ SGDG
            </button>
          </section>
        )}

        <p className="vneid-demo-note">
          <ShieldCheck />
          Mô phỏng kết nối VNeID cho wireframe — không truyền dữ liệu đến hệ
          thống định danh thật.
        </p>
      </section>
    </main>
  );
}

function VneidMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={compact ? "vneid-mark is-compact" : "vneid-mark"}
      aria-label="VNeID"
    >
      <span>
        <Star fill="currentColor" />
      </span>
      {!compact && (
        <div>
          <strong>VNeID</strong>
          <small>Định danh điện tử</small>
        </div>
      )}
    </div>
  );
}

export function RegisterPage() {
  const location = useLocation();
  const login = useDemoStore((s) => s.login);
  const [done, setDone] = useState(false);
  const from =
    (location.state as { from?: string } | null)?.from || "/account/profile";

  function completeRegister() {
    login();
    setDone(true);
  }

  if (done) {
    return (
      <AuthFrame icon={<CheckCircle2 />} title="Tạo tài khoản thành công">
        <p>
          Mã OTP đã được xác minh. Tài khoản demo đã đăng nhập, bạn có thể tiếp
          tục phiên đang mở.
        </p>
        <Link className="button primary" to={from} replace>
          Tiếp tục
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      icon={<UserPlus />}
      title="Tạo tài khoản SGDG"
      subtitle="Mở ví, đặt cọc và tham gia những phiên đấu giá đáng tin cậy."
      variant="register"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          completeRegister();
        }}
      >
        <FormField name="name" label="Họ và tên" required />
        <FormField name="email" label="Email" type="email" required />
        <FormField name="phone" label="Số điện thoại" type="tel" required />
        <FormField
          name="password"
          label="Mật khẩu"
          type="password"
          hint="Tối thiểu 8 ký tự, có chữ hoa và số."
          required
        />
        <label className="check-row">
          <input type="checkbox" required /> Tôi đồng ý điều khoản sử dụng và
          chính sách bảo mật.
        </label>
        <button className="button primary" type="submit">
          Gửi mã OTP
        </button>
      </form>
      <SocialLogin
        label="Hoặc đăng ký nhanh với"
        onSelect={completeRegister}
        vneidTo="/auth/vneid?mode=register"
        returnTo={from}
        vneidMode="register"
      />
      <p>
        Đã có tài khoản? <Link to="/auth/login">Đăng nhập</Link>
      </p>
    </AuthFrame>
  );
}

export function RecoveryPage() {
  const [step, setStep] = useState(0);
  const steps = [
    ["Khôi phục mật khẩu", "Nhập email hoặc số điện thoại đã đăng ký."],
    ["Xác minh OTP", "Nhập mã OTP gồm 6 chữ số được gửi đến bạn."],
    ["Đặt mật khẩu mới", "Tạo mật khẩu mới an toàn cho tài khoản."],
    ["Hoàn tất", "Mật khẩu đã được cập nhật thành công."],
  ];

  return (
    <AuthFrame
      icon={step === 3 ? <CheckCircle2 /> : <KeyRound />}
      title={steps[step][0]}
      subtitle={steps[step][1]}
    >
      {step < 3 ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep((x) => x + 1);
          }}
        >
          {step === 0 && (
            <FormField
              name="identity"
              label="Email hoặc số điện thoại"
              required
            />
          )}
          {step === 1 && (
            <FormField
              name="otp"
              label="Mã OTP"
              inputMode="numeric"
              maxLength={6}
              required
            />
          )}
          {step === 2 && (
            <>
              <FormField
                name="password"
                label="Mật khẩu mới"
                type="password"
                required
              />
              <FormField
                name="confirm"
                label="Nhập lại mật khẩu"
                type="password"
                required
              />
            </>
          )}
          <button className="button primary">Tiếp tục</button>
        </form>
      ) : (
        <Link className="button primary" to="/auth/login">
          Đăng nhập lại
        </Link>
      )}
    </AuthFrame>
  );
}

function AuthFrame({
  icon,
  title,
  subtitle,
  children,
  variant = "default",
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  variant?: "default" | "register";
}) {
  return (
    <main className="auth-page">
      <section
        className={
          variant === "register"
            ? "auth-shell auth-shell-register"
            : "auth-shell"
        }
      >
        <aside className="auth-visual">
          <img src="/assets/auth-auction-hero.png" alt="" />
          <div className="auth-visual-copy">
            <span>Nền tảng đấu giá trực tuyến</span>
            <h2>Minh bạch, nhanh chóng và an toàn</h2>
            <ul>
              <li>
                <CheckCircle2 /> Bảo vệ người mua và người bán
              </li>
              <li>
                <CheckCircle2 /> Đặt cọc, ví và thanh toán rõ ràng
              </li>
              <li>
                <CheckCircle2 /> Hỗ trợ phiên đấu giá theo thời gian thực
              </li>
            </ul>
          </div>
        </aside>
        <div className="auth-card">
          <Link className="auth-logo" to="/">
            <img src="/assets/logo.png" alt="SGDG" />
          </Link>
          <div className="auth-icon">{icon}</div>
          <h1>{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
          <div className="auth-trust">
            <ShieldCheck /> Dữ liệu demo được lưu cục bộ trên thiết bị.
          </div>
        </div>
      </section>
    </main>
  );
}

function SocialLogin({
  label,
  onSelect,
  vneidTo,
  returnTo,
  vneidMode = "login",
}: {
  label: string;
  onSelect: () => void;
  vneidTo?: string;
  returnTo?: string;
  vneidMode?: "login" | "register";
}) {
  return (
    <div className="social-login">
      <div className="auth-divider">
        <span>{label}</span>
      </div>
      {vneidTo && (
        <Link
          className="vneid-login-choice"
          to={vneidTo}
          state={{ from: returnTo }}
        >
          <span className="vneid-login-choice-mark">
            <Star fill="currentColor" />
          </span>
          <span>
            <strong>
              {vneidMode === "register"
                ? "Đăng ký bằng VNeID"
                : "Đăng nhập bằng VNeID"}
            </strong>
            <small>
              {vneidMode === "register"
                ? "Tạo tài khoản từ định danh điện tử"
                : "Xác thực bằng tài khoản định danh điện tử"}
            </small>
          </span>
          <ShieldCheck />
        </Link>
      )}
      {vneidTo && (
        <div className="auth-divider auth-divider-secondary">
          <span>Hoặc tiếp tục với</span>
        </div>
      )}
      <div className="social-login-grid">
        <button
          type="button"
          onClick={onSelect}
          aria-label="Tiếp tục với Google"
        >
          <span className="social-mark google">G</span>
          Google
        </button>
        <button
          type="button"
          onClick={onSelect}
          aria-label="Tiếp tục với Facebook"
        >
          <span className="social-mark facebook">f</span>
          Facebook
        </button>
        <button
          type="button"
          onClick={onSelect}
          aria-label="Tiếp tục với Apple"
        >
          <span className="social-mark apple">A</span>
          Apple
        </button>
      </div>
    </div>
  );
}
