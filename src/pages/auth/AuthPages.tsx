import {
  CheckCircle2,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
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
      <SocialLogin label="Hoặc đăng nhập với" onSelect={completeLogin} />
      <p>
        Chưa có tài khoản?{" "}
        <Link to="/auth/register" state={{ from }}>
          Đăng ký ngay
        </Link>
      </p>
    </AuthFrame>
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
      <SocialLogin label="Hoặc đăng ký nhanh với" onSelect={completeRegister} />
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
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-shell">
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
}: {
  label: string;
  onSelect: () => void;
}) {
  return (
    <div className="social-login">
      <div className="auth-divider">
        <span>{label}</span>
      </div>
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
