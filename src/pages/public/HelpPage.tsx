import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileCheck2,
  Gavel,
  Headphones,
  HelpCircle,
  Landmark,
  LockKeyhole,
  Mail,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";

type Faq = {
  question: string;
  answer: string;
  keywords: string;
};

const guideSteps = [
  {
    id: "tao-tai-khoan",
    number: "01",
    title: "Tạo tài khoản",
    description: "Đăng ký thông tin cơ bản và thiết lập mật khẩu bảo mật.",
  },
  {
    id: "chon-phien",
    number: "02",
    title: "Chọn phiên phù hợp",
    description: "Xem hồ sơ tài sản, thời gian và điều kiện tham gia.",
  },
  {
    id: "kiem-tra-dieu-kien",
    number: "03",
    title: "Kiểm tra điều kiện",
    description: "Hoàn tất KYC, xác nhận quy chế và khoản bảo đảm.",
  },
  {
    id: "gui-dang-ky",
    number: "04",
    title: "Gửi đăng ký",
    description: "Kiểm tra toàn bộ thông tin trước khi gửi hồ sơ.",
  },
  {
    id: "tham-gia-dau-gia",
    number: "05",
    title: "Tham gia đấu giá",
    description: "Theo dõi thời gian thực và đặt giá theo đúng bước giá.",
  },
  {
    id: "hoan-tat",
    number: "06",
    title: "Hoàn tất giao dịch",
    description: "Thanh toán, nhận chứng từ và theo dõi bàn giao.",
  },
];

const faqs: Faq[] = [
  {
    question: "Tôi cần chuẩn bị gì trước khi đăng ký một phiên đấu giá?",
    answer:
      "Bạn cần tài khoản đã xác minh KYC, số dư ví đủ cho khoản bảo đảm, đọc đầy đủ quy chế phiên và kiểm tra thời hạn đăng ký. Một số phiên đặc thù có thể yêu cầu thêm hồ sơ chứng minh năng lực hoặc giấy tờ pháp lý.",
    keywords: "đăng ký kyc hồ sơ chuẩn bị",
  },
  {
    question: "Khoản đặt cọc được xác nhận ở bước nào?",
    answer:
      "Khoản đặt cọc được trình bày và xác nhận trong quy trình đăng ký, trước khi bạn gửi hồ sơ. Hệ thống hiển thị rõ số tiền cọc, số dư hiện tại và số dư còn lại để bạn kiểm tra lần cuối.",
    keywords: "đặt cọc bảo đảm số dư ví",
  },
  {
    question: "Tôi có thể rút lại giá đã đặt không?",
    answer:
      "Không. Giá hợp lệ đã được hệ thống xác nhận không thể thu hồi. Vì vậy, hãy kiểm tra mức giá và ngân sách thật kỹ trước khi nhấn xác nhận đặt giá.",
    keywords: "rút giá đặt giá xác nhận",
  },
  {
    question: "Nếu bị người khác vượt giá thì tôi được thông báo thế nào?",
    answer:
      "SGDG hiển thị thông báo nổi ngay trên màn hình, đồng thời cập nhật bảng xếp hạng và mức giá tối thiểu tiếp theo. Khi bật thông báo tài khoản, bạn cũng có thể nhận cảnh báo theo kênh đã đăng ký.",
    keywords: "vượt giá thông báo bảng xếp hạng",
  },
  {
    question: "Điều gì xảy ra khi kết nối mạng bị gián đoạn?",
    answer:
      "Nút đặt giá sẽ tạm khóa trong lúc hệ thống kết nối lại và đồng bộ dữ liệu. Chỉ tiếp tục đặt giá khi trạng thái trực tuyến đã được khôi phục và mức giá hiện tại hiển thị đầy đủ.",
    keywords: "mất mạng kết nối đồng bộ",
  },
  {
    question: "Người trúng đấu giá thanh toán và nhận tài sản ra sao?",
    answer:
      "Sau khi kết quả được xác nhận, hệ thống tạo nghĩa vụ thanh toán với số tiền, khoản khấu trừ và thời hạn rõ ràng. Khi thanh toán hoàn tất, bạn theo dõi lịch bàn giao, chứng từ và xác nhận nhận tài sản trong khu vực tài khoản.",
    keywords: "thanh toán trúng đấu giá bàn giao tài sản",
  },
];

const relatedGuides = [
  {
    title: "Cách đọc chứng thư GIA trước khi trả giá",
    tag: "Thẩm định",
    image: "/assets/diamond-gia-v2.png",
  },
  {
    title: "Checklist kiểm tra tài sản và hồ sơ phiên",
    tag: "Chuẩn bị",
    image: "/assets/catalog-antique-01-hd.png",
  },
  {
    title: "Quản lý ngân sách khi đấu giá trực tiếp",
    tag: "Kinh nghiệm",
    image: "/assets/featured-rolex-angle-hd.png",
  },
];

export function HelpPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const filteredFaqs = useMemo(() => {
    const normalized = submittedQuery.trim().toLocaleLowerCase("vi");
    if (!normalized) return faqs;

    return faqs.filter((faq) =>
      `${faq.question} ${faq.answer} ${faq.keywords}`
        .toLocaleLowerCase("vi")
        .includes(normalized),
    );
  }, [submittedQuery]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(query);
    requestAnimationFrame(() => {
      document.getElementById("cau-hoi")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  return (
    <main className="help-center">
      <section className="help-center__hero">
        <div className="container help-center__hero-inner">
          <div className="help-center__breadcrumbs">
            <Link to="/">Trang chủ</Link>
            <span>/</span>
            <strong>Hướng dẫn</strong>
          </div>

          <div className="help-center__hero-grid">
            <div>
              <span className="help-center__eyebrow">
                <Sparkles aria-hidden="true" />
                Trung tâm hướng dẫn SGDG
              </span>
              <h1>Tham gia đấu giá dễ dàng, an toàn từ bước đầu tiên</h1>
              <p>
                Hướng dẫn trực quan toàn bộ hành trình: tạo tài khoản, đăng ký phiên,
                đặt giá, thanh toán và nhận tài sản.
              </p>
            </div>

            <form className="help-center__search" role="search" onSubmit={handleSearch}>
              <Search aria-hidden="true" />
              <label className="sr-only" htmlFor="help-search">
                Tìm kiếm hướng dẫn
              </label>
              <input
                id="help-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Bạn cần hỗ trợ nội dung gì?"
              />
              <button type="submit">Tìm hướng dẫn</button>
            </form>
          </div>

          <div className="help-center__hero-trust">
            <span>
              <ShieldCheck aria-hidden="true" />
              Quy trình minh bạch
            </span>
            <span>
              <LockKeyhole aria-hidden="true" />
              Dữ liệu được bảo vệ
            </span>
            <span>
              <Headphones aria-hidden="true" />
              Hỗ trợ khi cần
            </span>
          </div>
        </div>
      </section>

      <div className="container help-center__body">
        <nav className="help-center__quick-nav" aria-label="Nhóm hướng dẫn">
          <a href="#tao-tai-khoan">
            <span>
              <UserCheck aria-hidden="true" />
            </span>
            <div>
              <strong>Người mới bắt đầu</strong>
              <small>Tài khoản và xác minh</small>
            </div>
            <ArrowRight aria-hidden="true" />
          </a>
          <a href="#kiem-tra-dieu-kien">
            <span>
              <WalletCards aria-hidden="true" />
            </span>
            <div>
              <strong>Đăng ký &amp; đặt cọc</strong>
              <small>Điều kiện tham gia</small>
            </div>
            <ArrowRight aria-hidden="true" />
          </a>
          <a href="#tham-gia-dau-gia">
            <span>
              <Gavel aria-hidden="true" />
            </span>
            <div>
              <strong>Đấu giá trực tiếp</strong>
              <small>Đặt giá và theo dõi</small>
            </div>
            <ArrowRight aria-hidden="true" />
          </a>
          <a href="#hoan-tat">
            <span>
              <PackageCheck aria-hidden="true" />
            </span>
            <div>
              <strong>Sau đấu giá</strong>
              <small>Thanh toán và bàn giao</small>
            </div>
            <ArrowRight aria-hidden="true" />
          </a>
        </nav>

        <div className="help-center__layout">
          <article className="help-article">
            <header className="help-article__header">
              <span className="help-article__category">
                <BookOpen aria-hidden="true" />
                Hướng dẫn dành cho người tham gia
              </span>
              <h2>Quy trình tham gia đấu giá trực tuyến SGDG từ A–Z</h2>
              <p>
                Bài viết này giúp bạn hoàn tất đúng từng bước và biết trước những thông
                tin cần kiểm tra ở mỗi giai đoạn.
              </p>
              <div className="help-article__meta">
                <span>Cập nhật ngày 27/07/2026</span>
                <span>•</span>
                <span>
                  <Clock3 aria-hidden="true" />
                  Khoảng 10 phút đọc
                </span>
              </div>
            </header>

            <section className="help-article__intro">
              <ShieldCheck aria-hidden="true" />
              <div>
                <strong>Trước khi bắt đầu</strong>
                <p>
                  Hãy chuẩn bị giấy tờ định danh còn hiệu lực, số điện thoại chính chủ và
                  bảo đảm thiết bị có kết nối ổn định. Luôn kiểm tra đúng tên miền SGDG
                  trước khi nhập thông tin tài khoản.
                </p>
              </div>
            </section>

            <section className="help-section" id="tong-quan">
              <div className="help-section__heading">
                <span>Tổng quan</span>
                <h2>6 bước trong hành trình đấu giá</h2>
                <p>
                  Bạn có thể theo dõi tiến độ ngay trong tài khoản. Bước hoàn tất sẽ được
                  đánh dấu rõ ràng trước khi chuyển sang giai đoạn tiếp theo.
                </p>
              </div>

              <div className="help-process">
                {guideSteps.map((step) => (
                  <a href={`#${step.id}`} key={step.id}>
                    <span>{step.number}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <small>{step.description}</small>
                    </div>
                    <ArrowRight aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>

            <section className="help-section" id="tao-tai-khoan">
              <div className="help-step-heading">
                <span>01</span>
                <div>
                  <small>Bước 1</small>
                  <h2>Tạo tài khoản và xác minh danh tính</h2>
                </div>
              </div>
              <p className="help-section__lead">
                Chọn <strong>Đăng ký</strong> trên thanh điều hướng, điền thông tin liên hệ
                và tạo mật khẩu. Sau khi xác nhận email, hoàn tất KYC để mở quyền đăng ký
                phiên.
              </p>

              <ol className="help-instruction-list">
                <li>Nhập họ tên đúng như giấy tờ định danh.</li>
                <li>Xác thực số điện thoại và địa chỉ email đang sử dụng.</li>
                <li>Tải ảnh giấy tờ rõ nét và thực hiện nhận diện khuôn mặt.</li>
              </ol>

              <div className="help-visual help-visual--account" aria-label="Minh họa tạo tài khoản SGDG">
                <div className="help-visual__topbar">
                  <span className="help-visual__brand">SGDG</span>
                  <span>Bảo mật &amp; minh bạch</span>
                </div>
                <div className="help-account-mock">
                  <div className="help-account-mock__aside">
                    <span>
                      <ShieldCheck aria-hidden="true" />
                    </span>
                    <h3>Xác minh một lần</h3>
                    <p>Mở quyền tham gia các phiên phù hợp với hồ sơ của bạn.</p>
                    <ul>
                      <li>
                        <Check aria-hidden="true" />
                        Bảo vệ tài khoản
                      </li>
                      <li>
                        <Check aria-hidden="true" />
                        Tuân thủ quy định
                      </li>
                      <li>
                        <Check aria-hidden="true" />
                        Rút ngắn thời gian đăng ký
                      </li>
                    </ul>
                  </div>
                  <div className="help-mock-form">
                    <span>BƯỚC 1 / 3</span>
                    <h3>Thông tin tài khoản</h3>
                    <label>
                      Họ và tên
                      <i>Nguyễn Minh Anh</i>
                    </label>
                    <label>
                      Số điện thoại
                      <i>09•• ••• •68</i>
                    </label>
                    <label>
                      Email
                      <i>minhanh@example.com</i>
                    </label>
                    <b>Tiếp tục xác minh</b>
                  </div>
                </div>
              </div>

              <div className="help-note help-note--success">
                <BadgeCheck aria-hidden="true" />
                <div>
                  <strong>Mẹo bảo mật</strong>
                  <p>
                    Sử dụng mật khẩu riêng cho SGDG và không cung cấp mã OTP cho bất kỳ
                    ai, kể cả người tự xưng là nhân viên hỗ trợ.
                  </p>
                </div>
              </div>
            </section>

            <section className="help-section" id="chon-phien">
              <div className="help-step-heading">
                <span>02</span>
                <div>
                  <small>Bước 2</small>
                  <h2>Tìm và lựa chọn phiên đấu giá phù hợp</h2>
                </div>
              </div>
              <p className="help-section__lead">
                Truy cập <strong>Phiên đấu giá</strong>, sau đó lọc theo danh mục, vị trí,
                khoảng giá hoặc trạng thái. Chỉ các phiên đang mở đăng ký và đang diễn ra
                được ưu tiên hiển thị.
              </p>

              <div className="help-visual help-visual--catalog" aria-label="Minh họa lựa chọn phiên đấu giá">
                <div className="help-visual__topbar">
                  <span className="help-visual__brand">SGDG</span>
                  <div className="help-browser-search">
                    <Search aria-hidden="true" />
                    Tìm kiếm tài sản...
                  </div>
                  <span>Tài khoản</span>
                </div>
                <div className="help-catalog-mock">
                  <div className="help-catalog-mock__filters">
                    <strong>Bộ lọc phiên</strong>
                    <span>Danh mục</span>
                    <b>Tất cả danh mục</b>
                    <span>Khoảng giá</span>
                    <b>100 triệu – 1 tỷ</b>
                    <span>Trạng thái</span>
                    <b>Đang mở đăng ký</b>
                  </div>
                  <div className="help-auction-preview">
                    <div className="help-auction-preview__image">
                      <img src="/assets/featured-rolex-angle-hd.png" alt="" />
                      <span>ĐANG MỞ ĐĂNG KÝ</span>
                    </div>
                    <div>
                      <small>SGD-260717-001 · ĐỒNG HỒ</small>
                      <h3>Rolex Submariner Date 126610LV</h3>
                      <p>Giá khởi điểm</p>
                      <strong>450.000.000 ₫</strong>
                      <b>Xem chi tiết phiên</b>
                    </div>
                  </div>
                </div>
              </div>

              <div className="help-check-grid">
                <article>
                  <FileCheck2 aria-hidden="true" />
                  <div>
                    <strong>Đọc hồ sơ tài sản</strong>
                    <p>Kiểm tra mô tả, tình trạng, chứng thư và ảnh thẩm định.</p>
                  </div>
                </article>
                <article>
                  <Clock3 aria-hidden="true" />
                  <div>
                    <strong>Ghi nhớ thời gian</strong>
                    <p>Chú ý hạn đăng ký, giờ bắt đầu và múi giờ hiển thị.</p>
                  </div>
                </article>
              </div>
            </section>

            <section className="help-section" id="kiem-tra-dieu-kien">
              <div className="help-step-heading">
                <span>03</span>
                <div>
                  <small>Bước 3</small>
                  <h2>Kiểm tra điều kiện và khoản đặt cọc</h2>
                </div>
              </div>
              <p className="help-section__lead">
                Hệ thống kiểm tra tư cách thành viên, KYC, hạn chế tài khoản và khoản bảo
                đảm. Nếu đủ điều kiện, bạn sẽ thấy số tiền đặt cọc ngay trong quy trình
                đăng ký.
              </p>

              <div className="help-visual help-visual--eligibility" aria-label="Minh họa kiểm tra điều kiện và đặt cọc">
                <div className="help-eligibility-mock">
                  <span className="help-mock-caption">ĐIỀU KIỆN THAM GIA</span>
                  <h3>Trạng thái hồ sơ của bạn</h3>
                  <ul>
                    <li>
                      <span>
                        <UserCheck aria-hidden="true" />
                        Tài khoản thành viên
                      </span>
                      <b>
                        <CheckCircle2 aria-hidden="true" />
                        Đạt
                      </b>
                    </li>
                    <li>
                      <span>
                        <ShieldCheck aria-hidden="true" />
                        Xác minh KYC
                      </span>
                      <b>
                        <CheckCircle2 aria-hidden="true" />
                        Đạt
                      </b>
                    </li>
                    <li>
                      <span>
                        <FileCheck2 aria-hidden="true" />
                        Quy chế phiên
                      </span>
                      <b>
                        <CheckCircle2 aria-hidden="true" />
                        Sẵn sàng
                      </b>
                    </li>
                  </ul>
                </div>
                <div className="help-deposit-mock">
                  <span className="help-mock-caption">XÁC NHẬN ĐẶT CỌC</span>
                  <h3>Rolex Submariner Date 126610LV</h3>
                  <dl>
                    <div>
                      <dt>Giá khởi điểm</dt>
                      <dd>450.000.000 ₫</dd>
                    </div>
                    <div>
                      <dt>Tiền cọc 10%</dt>
                      <dd>45.000.000 ₫</dd>
                    </div>
                    <div>
                      <dt>Số dư hiện tại</dt>
                      <dd>85.100.000 ₫</dd>
                    </div>
                    <div>
                      <dt>Số dư sau khi cọc</dt>
                      <dd>40.100.000 ₫</dd>
                    </div>
                  </dl>
                  <b>Đồng ý đặt cọc</b>
                </div>
              </div>

              <div className="help-note help-note--warning">
                <AlertTriangle aria-hidden="true" />
                <div>
                  <strong>Kiểm tra trước khi xác nhận</strong>
                  <p>
                    Khoản cọc, thời hạn hoàn trả và trường hợp bị xử lý được quy định cụ
                    thể trong quy chế từng phiên. Hãy đọc kỹ trước khi tiếp tục.
                  </p>
                </div>
              </div>
            </section>

            <section className="help-section" id="gui-dang-ky">
              <div className="help-step-heading">
                <span>04</span>
                <div>
                  <small>Bước 4</small>
                  <h2>Xác nhận quy chế và gửi đăng ký</h2>
                </div>
              </div>
              <p className="help-section__lead">
                Quy trình gồm bốn màn hình ngắn. Ở bước cuối, kiểm tra lại thông tin phiên,
                điều kiện, quy chế đã xác nhận và khoản cọc trước khi gửi.
              </p>

              <div className="help-visual help-visual--registration" aria-label="Minh họa hoàn tất đăng ký">
                <div className="help-registration-progress">
                  {["Tóm tắt phiên", "Điều kiện", "Xác nhận quy tắc", "Kiểm tra & gửi"].map(
                    (label, index) => (
                      <span className={index === 3 ? "active" : "done"} key={label}>
                        <i>{index < 3 ? <Check aria-hidden="true" /> : index + 1}</i>
                        {label}
                      </span>
                    ),
                  )}
                </div>
                <div className="help-registration-review">
                  <span className="help-mock-caption">BƯỚC 4 / 4</span>
                  <h3>Kiểm tra đăng ký trước khi gửi</h3>
                  <div>
                    <strong>Phiên đấu giá</strong>
                    <p>Rolex Submariner Date · SGD-260717-001</p>
                    <b>Đã kiểm tra</b>
                  </div>
                  <div>
                    <strong>Điều kiện tham gia</strong>
                    <p>Thành viên, KYC, hạn chế và khoản bảo đảm đều đạt.</p>
                    <b>Đủ điều kiện</b>
                  </div>
                  <div>
                    <strong>Quy tắc đã xác nhận</strong>
                    <p>QD–2026.07 · Snapshot chấp thuận đã được lưu.</p>
                    <b>Đã xác nhận</b>
                  </div>
                  <label>
                    <span>
                      <Check aria-hidden="true" />
                    </span>
                    Tôi xác nhận các thông tin trên là chính xác.
                  </label>
                  <button type="button">Gửi đăng ký</button>
                </div>
              </div>
            </section>

            <section className="help-section" id="tham-gia-dau-gia">
              <div className="help-step-heading">
                <span>05</span>
                <div>
                  <small>Bước 5</small>
                  <h2>Tham gia phòng đấu giá trực tiếp</h2>
                </div>
              </div>
              <p className="help-section__lead">
                Vào phòng đấu giá sớm để kiểm tra kết nối. Mức giá tiếp theo đã bao gồm
                bước giá tối thiểu; bạn chỉ cần kiểm tra và xác nhận.
              </p>

              <div className="help-visual help-visual--live" aria-label="Minh họa phòng đấu giá trực tiếp">
                <div className="help-live-mock">
                  <div className="help-live-mock__asset">
                    <span>LIVE AUCTION</span>
                    <img src="/assets/featured-rolex-angle-hd.png" alt="" />
                    <div>
                      <strong>Rolex Submariner Date 126610LV</strong>
                      <small>SGD-260717-001</small>
                    </div>
                  </div>
                  <div className="help-live-mock__bid">
                    <span>
                      <FlameIcon />
                      THỜI GIAN CÒN LẠI
                    </span>
                    <strong>00 : 41 : 56</strong>
                    <div>
                      <small>ĐẶT GIÁ TIẾP THEO</small>
                      <b>455.000.000 ₫</b>
                    </div>
                    <button type="button">
                      <Gavel aria-hidden="true" />
                      Đấu giá ngay
                    </button>
                  </div>
                  <div className="help-live-mock__ranking">
                    <strong>Bảng xếp hạng</strong>
                    <ol>
                      <li>
                        <span>#1 Bạn</span>
                        <b>450.000.000 ₫</b>
                      </li>
                      <li>
                        <span>#2 Mi***A</span>
                        <b>445.000.000 ₫</b>
                      </li>
                      <li>
                        <span>#3 An***B</span>
                        <b>440.000.000 ₫</b>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="help-note help-note--energy">
                <Gavel aria-hidden="true" />
                <div>
                  <strong>Khi bạn bị vượt giá</strong>
                  <p>
                    Thông báo nổi sẽ xuất hiện ngay trên màn hình cùng mức giá tối thiểu
                    mới. Không cần tải lại trang; bảng xếp hạng được cập nhật tự động.
                  </p>
                </div>
              </div>
            </section>

            <section className="help-section" id="hoan-tat">
              <div className="help-step-heading">
                <span>06</span>
                <div>
                  <small>Bước 6</small>
                  <h2>Thanh toán và theo dõi bàn giao</h2>
                </div>
              </div>
              <p className="help-section__lead">
                Khi kết quả được xác nhận, người trúng nhận thông báo trong tài khoản.
                Hoàn tất thanh toán đúng hạn rồi theo dõi từng mốc bàn giao.
              </p>

              <div className="help-visual help-visual--completion" aria-label="Minh họa thanh toán và bàn giao">
                <div className="help-payment-mock">
                  <span className="help-mock-caption">NGHĨA VỤ THANH TOÁN</span>
                  <h3>Thông tin giao dịch</h3>
                  <dl>
                    <div>
                      <dt>Giá trúng</dt>
                      <dd>475.000.000 ₫</dd>
                    </div>
                    <div>
                      <dt>Đã khấu trừ tiền cọc</dt>
                      <dd>−45.000.000 ₫</dd>
                    </div>
                    <div>
                      <dt>Còn phải thanh toán</dt>
                      <dd>430.000.000 ₫</dd>
                    </div>
                  </dl>
                  <span className="help-payment-mock__deadline">
                    <Clock3 aria-hidden="true" />
                    Hoàn tất trước 17:00, 30/07/2026
                  </span>
                  <b>Thanh toán ngay</b>
                </div>
                <div className="help-handover-mock">
                  <span className="help-mock-caption">TIẾN ĐỘ BÀN GIAO</span>
                  <h3>Tài sản của bạn</h3>
                  <ol>
                    <li className="done">
                      <span>
                        <Check aria-hidden="true" />
                      </span>
                      <div>
                        <strong>Đã xác nhận kết quả</strong>
                        <small>27/07/2026 · 10:20</small>
                      </div>
                    </li>
                    <li className="done">
                      <span>
                        <Check aria-hidden="true" />
                      </span>
                      <div>
                        <strong>Đã thanh toán</strong>
                        <small>28/07/2026 · 09:15</small>
                      </div>
                    </li>
                    <li className="active">
                      <span>
                        <PackageCheck aria-hidden="true" />
                      </span>
                      <div>
                        <strong>Đang chuẩn bị bàn giao</strong>
                        <small>Dự kiến 30/07/2026</small>
                      </div>
                    </li>
                    <li>
                      <span>
                        <MapPin aria-hidden="true" />
                      </span>
                      <div>
                        <strong>Nhận tài sản</strong>
                        <small>Chờ cập nhật</small>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>

              <div className="help-check-grid help-check-grid--three">
                <article>
                  <CreditCard aria-hidden="true" />
                  <div>
                    <strong>Thanh toán đúng hạn</strong>
                    <p>Kiểm tra nội dung chuyển khoản và mã giao dịch.</p>
                  </div>
                </article>
                <article>
                  <FileCheck2 aria-hidden="true" />
                  <div>
                    <strong>Nhận đủ chứng từ</strong>
                    <p>Đối chiếu biên bản, hóa đơn và hồ sơ tài sản.</p>
                  </div>
                </article>
                <article>
                  <PackageCheck aria-hidden="true" />
                  <div>
                    <strong>Xác nhận bàn giao</strong>
                    <p>Kiểm tra tình trạng tài sản trước khi ký nhận.</p>
                  </div>
                </article>
              </div>
            </section>

            <section className="help-section help-faq" id="cau-hoi">
              <div className="help-section__heading">
                <span>Hỗ trợ nhanh</span>
                <h2>Câu hỏi thường gặp</h2>
                {submittedQuery && (
                  <p>
                    Kết quả tìm kiếm cho: <strong>“{submittedQuery}”</strong>
                  </p>
                )}
              </div>

              <div className="help-faq__list" aria-live="polite">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq, index) => {
                    const isOpen = openFaq === index;
                    return (
                      <article key={faq.question}>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpenFaq(isOpen ? -1 : index)}
                        >
                          <span>{faq.question}</span>
                          <ChevronDown aria-hidden="true" />
                        </button>
                        {isOpen && <p>{faq.answer}</p>}
                      </article>
                    );
                  })
                ) : (
                  <div className="help-faq__empty">
                    <HelpCircle aria-hidden="true" />
                    <strong>Chưa tìm thấy nội dung phù hợp</strong>
                    <p>Hãy thử từ khóa ngắn hơn hoặc liên hệ đội ngũ hỗ trợ SGDG.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setSubmittedQuery("");
                      }}
                    >
                      Xem toàn bộ câu hỏi
                    </button>
                  </div>
                )}
              </div>
            </section>
          </article>

          <aside className="help-sidebar">
            <nav className="help-sidebar__toc" aria-label="Mục lục bài hướng dẫn">
              <span>MỤC LỤC</span>
              <strong>Trong bài viết này</strong>
              <a href="#tong-quan">Tổng quan quy trình</a>
              {guideSteps.map((step) => (
                <a href={`#${step.id}`} key={`toc-${step.id}`}>
                  <i>{step.number}</i>
                  {step.title}
                </a>
              ))}
              <a href="#cau-hoi">
                <i>?</i>
                Câu hỏi thường gặp
              </a>
            </nav>

            <section className="help-sidebar__support">
              <span>
                <Headphones aria-hidden="true" />
              </span>
              <small>CẦN HỖ TRỢ THÊM?</small>
              <h2>SGDG luôn sẵn sàng đồng hành</h2>
              <p>Trao đổi với đội ngũ hỗ trợ trong giờ làm việc.</p>
              <a href="tel:1900888866">
                1900 8888 66
                <ArrowRight aria-hidden="true" />
              </a>
              <a href="mailto:support@sigondaugia.vn">
                <Mail aria-hidden="true" />
                support@sigondaugia.vn
              </a>
            </section>

            <section className="help-sidebar__security">
              <ShieldCheck aria-hidden="true" />
              <div>
                <strong>Lưu ý an toàn</strong>
                <p>SGDG không yêu cầu chuyển tiền vào tài khoản cá nhân.</p>
              </div>
            </section>
          </aside>
        </div>

        <section className="help-related" aria-labelledby="related-guides-title">
          <div className="help-related__heading">
            <div>
              <span>Khám phá thêm</span>
              <h2 id="related-guides-title">Hướng dẫn có thể bạn quan tâm</h2>
            </div>
            <Link to="/news">
              Xem thư viện tin tức
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <div className="help-related__grid">
            {relatedGuides.map((guide) => (
              <Link to="/news" key={guide.title}>
                <img src={guide.image} alt="" />
                <div>
                  <span>{guide.tag}</span>
                  <h3>{guide.title}</h3>
                  <small>
                    Đọc hướng dẫn
                    <ArrowRight aria-hidden="true" />
                  </small>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="help-center__closing">
          <div>
            <span>
              <Landmark aria-hidden="true" />
              Sẵn sàng tham gia?
            </span>
            <h2>Khám phá các phiên đang mở đăng ký</h2>
            <p>Hồ sơ minh bạch, điều kiện rõ ràng và hỗ trợ xuyên suốt quy trình.</p>
          </div>
          <Link to="/auctions">
            Xem phiên đấu giá
            <Gavel aria-hidden="true" />
          </Link>
        </section>
      </div>
    </main>
  );
}

function FlameIcon() {
  return <CircleDollarSign aria-hidden="true" />;
}
