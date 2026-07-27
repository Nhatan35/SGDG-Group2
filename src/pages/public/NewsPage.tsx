import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  ChevronRight,
  Clock3,
  Eye,
  Flame,
  Gavel,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

type NewsArticle = {
  id: string;
  tag: string;
  title: string;
  summary: string;
  image: string;
  author: string;
  publishedAt: string;
  readTime: string;
  views: string;
  href: string;
};

const articles: NewsArticle[] = [
  {
    id: "luxury-watch-market",
    tag: "Thị trường",
    title: "Đồng hồ cao cấp tiếp tục dẫn nhịp thị trường đấu giá trực tuyến",
    summary:
      "Những mẫu đồng hồ biểu tượng đang thu hút lượng theo dõi lớn nhờ hồ sơ minh bạch, định giá rõ ràng và sức thanh khoản ổn định.",
    image: "/assets/featured-rolex-angle-hd.png",
    author: "Ban biên tập SGDG",
    publishedAt: "27/07/2026",
    readTime: "6 phút đọc",
    views: "2,4K",
    href: "/auctions/SGD-260717-001",
  },
  {
    id: "diamond-gia-guide",
    tag: "Trang sức",
    title: "Đọc chứng thư GIA: 5 thông số cần kiểm tra trước khi trả giá",
    summary:
      "Từ giác cắt, màu sắc đến độ tinh khiết, mỗi thông số đều tác động trực tiếp tới mức giá phù hợp của viên kim cương.",
    image: "/assets/diamond-gia-v2.png",
    author: "Minh Anh",
    publishedAt: "26/07/2026",
    readTime: "5 phút đọc",
    views: "1,8K",
    href: "/help",
  },
  {
    id: "patek-collecting",
    tag: "Đồng hồ",
    title: "Vì sao Patek Philippe Nautilus luôn được giới sưu tầm săn đón?",
    summary:
      "Thiết kế mang tính biểu tượng, nguồn cung giới hạn và lịch sử sở hữu là ba yếu tố tạo nên sức hút bền vững.",
    image: "/assets/patek-nautilus-v2.png",
    author: "Hoàng Nam",
    publishedAt: "26/07/2026",
    readTime: "7 phút đọc",
    views: "3,1K",
    href: "/auctions",
  },
  {
    id: "property-documents",
    tag: "Hướng dẫn",
    title: "Bộ hồ sơ nào cần có khi tham gia đấu giá bất động sản?",
    summary:
      "Danh sách giấy tờ và các mốc kiểm tra quan trọng giúp người tham gia chủ động hơn trước thời điểm đăng ký.",
    image: "/assets/catalog-real-estate-01-hd.png",
    author: "Ngọc Hà",
    publishedAt: "25/07/2026",
    readTime: "8 phút đọc",
    views: "1,5K",
    href: "/help",
  },
  {
    id: "safe-bidding",
    tag: "An toàn",
    title: "7 nguyên tắc bảo mật tài khoản trong phiên đấu giá trực tiếp",
    summary:
      "Những thao tác đơn giản giúp bảo vệ ví, thông tin định danh và quyền đặt giá của bạn trong suốt phiên.",
    image: "/assets/auction-hero-background-energy.png",
    author: "Đội ngũ An toàn SGDG",
    publishedAt: "25/07/2026",
    readTime: "4 phút đọc",
    views: "2,2K",
    href: "/help",
  },
  {
    id: "birkin-value",
    tag: "Thị trường",
    title: "Túi Hermès Birkin và câu chuyện giữ giá trên thị trường thứ cấp",
    summary:
      "Tình trạng sản phẩm, phụ kiện đi kèm và độ hiếm màu sắc là các biến số lớn trong quá trình thẩm định.",
    image: "/assets/catalog-hermes-birkin.png",
    author: "Thu Phương",
    publishedAt: "24/07/2026",
    readTime: "6 phút đọc",
    views: "1,9K",
    href: "/auctions",
  },
  {
    id: "car-inspection",
    tag: "Xe cộ",
    title: "Checklist kiểm tra xe sang trước khi bước vào phiên đấu giá",
    summary:
      "Lịch sử bảo dưỡng, số khung, số máy và hồ sơ pháp lý là những hạng mục không nên bỏ qua.",
    image: "/assets/catalog-mercedes-s450.png",
    author: "Quốc Bảo",
    publishedAt: "23/07/2026",
    readTime: "7 phút đọc",
    views: "1,6K",
    href: "/help",
  },
  {
    id: "art-valuation",
    tag: "Nghệ thuật",
    title: "Một tác phẩm hội họa được định giá như thế nào?",
    summary:
      "Nguồn gốc, tình trạng bảo quản, triển lãm từng tham dự và dấu ấn nghệ sĩ cùng tạo nên giá trị tác phẩm.",
    image: "/assets/catalog-dalat-painting.png",
    author: "Mai Chi",
    publishedAt: "22/07/2026",
    readTime: "9 phút đọc",
    views: "2,7K",
    href: "/help",
  },
  {
    id: "deposit-flow",
    tag: "Hướng dẫn",
    title: "Đặt cọc tham gia đấu giá: quy trình mới và những điều cần biết",
    summary:
      "Khoản bảo đảm được xác nhận ngay trong bước đăng ký để người dùng chủ động kiểm tra trước khi gửi hồ sơ.",
    image: "/assets/catalog-jewelry-02-hd.png",
    author: "Hỗ trợ SGDG",
    publishedAt: "21/07/2026",
    readTime: "5 phút đọc",
    views: "3,5K",
    href: "/help",
  },
  {
    id: "phone-auction",
    tag: "Công nghệ",
    title: "Điện thoại phiên bản giới hạn bắt đầu xuất hiện nhiều hơn tại đấu giá",
    summary:
      "Hộp nguyên bản, dung lượng, màu sắc và lịch sử kích hoạt là các tiêu chí được người mua quan tâm.",
    image: "/assets/catalog-iphone-15-pro.png",
    author: "Đức Huy",
    publishedAt: "20/07/2026",
    readTime: "4 phút đọc",
    views: "1,3K",
    href: "/auctions",
  },
];

const topics = [
  { label: "Tất cả", image: "/assets/auction-hero-background-v1.png" },
  { label: "Thị trường", image: "/assets/catalog-hermes-birkin.png" },
  { label: "Đồng hồ", image: "/assets/catalog-watch-07-hd.png" },
  { label: "Trang sức", image: "/assets/catalog-jewelry-07-hd.png" },
  { label: "Xe cộ", image: "/assets/catalog-vehicle-07-hd.png" },
  { label: "Nghệ thuật", image: "/assets/catalog-art-07-hd.png" },
  { label: "Hướng dẫn", image: "/assets/catalog-antique-01-hd.png" },
];

const compactArticles = articles.slice(1, 4);
const popularArticles = [articles[5], articles[7], articles[6], articles[8], articles[9]];

function ArticleMeta({ article, light = false }: { article: NewsArticle; light?: boolean }) {
  return (
    <div className={`news-portal__meta${light ? " news-portal__meta--light" : ""}`}>
      <span>{article.author}</span>
      <span aria-hidden="true">•</span>
      <span>
        <Clock3 aria-hidden="true" />
        {article.readTime}
      </span>
    </div>
  );
}

function SectionHeading({
  title,
  icon,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="news-portal__section-heading">
      <h2>
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function NewsPage() {
  const [activeTopic, setActiveTopic] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredArticles = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLocaleLowerCase("vi");

    return articles.filter((article) => {
      const matchesTopic =
        activeTopic === "Tất cả" ||
        article.tag === activeTopic ||
        (activeTopic === "Thị trường" && article.tag === "Công nghệ");
      const matchesQuery =
        !normalizedQuery ||
        [article.title, article.summary, article.tag, article.author]
          .join(" ")
          .toLocaleLowerCase("vi")
          .includes(normalizedQuery);

      return matchesTopic && matchesQuery;
    });
  }, [activeTopic, searchTerm]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(query);
  };

  return (
    <main className="news-portal">
      <section className="news-portal__masthead">
        <div className="container news-portal__masthead-inner">
          <div>
            <span className="news-portal__eyebrow">
              <Sparkles aria-hidden="true" />
              Góc nhìn SGDG
            </span>
            <h1>Tin tức &amp; kiến thức đấu giá</h1>
            <p>
              Cập nhật thị trường, kinh nghiệm thẩm định và hướng dẫn tham gia đấu giá
              minh bạch dành cho mọi nhà sưu tầm.
            </p>
          </div>

          <form className="news-portal__search" role="search" onSubmit={handleSearch}>
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor="news-search">
              Tìm kiếm bài viết
            </label>
            <input
              id="news-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm chủ đề bạn quan tâm..."
            />
            <button type="submit">Tìm kiếm</button>
          </form>
        </div>
      </section>

      <div className="container news-portal__content">
        <section aria-labelledby="hot-topics-title">
          <SectionHeading
            title="Chủ đề nổi bật"
            icon={<Flame aria-hidden="true" />}
            action={<span className="news-portal__heading-note">Khám phá theo sở thích</span>}
          />
          <div className="news-portal__topics">
            {topics.map((topic) => (
              <button
                className={`news-portal__topic${
                  activeTopic === topic.label ? " news-portal__topic--active" : ""
                }`}
                key={topic.label}
                type="button"
                aria-pressed={activeTopic === topic.label}
                onClick={() => {
                  setActiveTopic(topic.label);
                  setSearchTerm("");
                  setQuery("");
                }}
              >
                <img src={topic.image} alt="" />
                <span>{topic.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="news-portal__featured" aria-labelledby="featured-news-title">
          <SectionHeading
            title="Nổi bật nhất"
            icon={<TrendingUp aria-hidden="true" />}
            action={
              <Link to="/auctions">
                Xem phiên đấu giá
                <ArrowRight aria-hidden="true" />
              </Link>
            }
          />

          <div className="news-portal__featured-grid">
            <Link className="news-portal__lead-card" to={articles[0].href}>
              <img src={articles[0].image} alt="" />
              <div className="news-portal__lead-overlay">
                <span className="news-portal__tag">{articles[0].tag}</span>
                <h3>{articles[0].title}</h3>
                <p>{articles[0].summary}</p>
                <ArticleMeta article={articles[0]} light />
              </div>
            </Link>

            <div className="news-portal__quick-list">
              {compactArticles.map((article) => (
                <Link className="news-portal__quick-card" to={article.href} key={article.id}>
                  <img src={article.image} alt="" />
                  <div>
                    <span className="news-portal__text-tag">{article.tag}</span>
                    <h3>{article.title}</h3>
                    <ArticleMeta article={article} />
                  </div>
                  <ChevronRight className="news-portal__quick-arrow" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="popular-news-title">
          <SectionHeading
            title="Được quan tâm tuần qua"
            icon={<Flame aria-hidden="true" />}
            action={<span className="news-portal__heading-note">Lựa chọn của cộng đồng</span>}
          />
          <div className="news-portal__popular-grid">
            {popularArticles.map((article, index) => (
              <Link className="news-portal__popular-card" to={article.href} key={article.id}>
                <div className="news-portal__popular-image">
                  <img src={article.image} alt="" />
                  <span>0{index + 1}</span>
                </div>
                <strong>{article.title}</strong>
                <div className="news-portal__popular-meta">
                  <span>{article.tag}</span>
                  <span>
                    <Eye aria-hidden="true" />
                    {article.views}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="news-portal__campaign" aria-label="Tham gia đấu giá cùng SGDG">
          <div>
            <span>
              <Gavel aria-hidden="true" />
              Bắt đầu hành trình đấu giá
            </span>
            <h2>Tài sản chọn lọc. Hồ sơ rõ ràng. Trải nghiệm minh bạch.</h2>
            <p>Khám phá các phiên đang mở đăng ký và chủ động chuẩn bị trước khi ra giá.</p>
          </div>
          <Link to="/auctions">
            Khám phá ngay
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>

        <div className="news-portal__main-grid">
          <section aria-labelledby="latest-news-title">
            <SectionHeading
              title="Tin tức mới nhất"
              icon={<Clock3 aria-hidden="true" />}
              action={
                activeTopic !== "Tất cả" || searchTerm ? (
                  <button
                    className="news-portal__clear-filter"
                    type="button"
                    onClick={() => {
                      setActiveTopic("Tất cả");
                      setQuery("");
                      setSearchTerm("");
                    }}
                  >
                    Xóa bộ lọc
                  </button>
                ) : null
              }
            />

            <div className="news-portal__latest-list" aria-live="polite">
              {filteredArticles.length > 0 ? (
                filteredArticles.slice(0, 7).map((article) => (
                  <article className="news-portal__latest-card" key={article.id}>
                    <Link className="news-portal__latest-image" to={article.href}>
                      <img src={article.image} alt="" />
                    </Link>
                    <div>
                      <span className="news-portal__text-tag">{article.tag}</span>
                      <h3>
                        <Link to={article.href}>{article.title}</Link>
                      </h3>
                      <p>{article.summary}</p>
                      <div className="news-portal__latest-footer">
                        <ArticleMeta article={article} />
                        <Link className="news-portal__read-link" to={article.href}>
                          Đọc tiếp
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="news-portal__empty">
                  <Search aria-hidden="true" />
                  <h3>Chưa tìm thấy bài viết phù hợp</h3>
                  <p>Hãy thử một từ khóa khác hoặc chọn lại chủ đề “Tất cả”.</p>
                </div>
              )}
            </div>

            {filteredArticles.length > 7 && (
              <button className="news-portal__load-more" type="button">
                Xem thêm bài viết
                <ChevronRight aria-hidden="true" />
              </button>
            )}
          </section>

          <aside className="news-portal__sidebar" aria-label="Nội dung đề xuất">
            <section className="news-portal__side-panel">
              <SectionHeading
                title="Góc chọn & mua"
                icon={<Bookmark aria-hidden="true" />}
              />
              <div className="news-portal__editor-pick">
                {articles.slice(1, 4).map((article) => (
                  <Link to={article.href} key={`pick-${article.id}`}>
                    <img src={article.image} alt="" />
                    <div>
                      <span>{article.tag}</span>
                      <strong>{article.title}</strong>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="news-portal__side-panel">
              <SectionHeading
                title="Đọc nhiều nhất"
                icon={<TrendingUp aria-hidden="true" />}
              />
              <ol className="news-portal__ranking">
                {popularArticles.slice(0, 4).map((article, index) => (
                  <li key={`rank-${article.id}`}>
                    <span>{index + 1}</span>
                    <Link to={article.href}>
                      <strong>{article.title}</strong>
                      <small>
                        <Eye aria-hidden="true" />
                        {article.views} lượt xem
                      </small>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>

            <section className="news-portal__newsletter">
              <div className="news-portal__newsletter-icon">
                <Mail aria-hidden="true" />
              </div>
              <span>Bản tin SGDG</span>
              <h2>Không bỏ lỡ phiên đáng chú ý</h2>
              <p>Nhận tin thị trường, lịch mở đăng ký và hướng dẫn mới nhất từ SGDG.</p>
              <Link to="/register">
                Đăng ký nhận tin
                <ArrowRight aria-hidden="true" />
              </Link>
              <small>
                <ShieldCheck aria-hidden="true" />
                Nội dung chọn lọc, không làm phiền.
              </small>
            </section>
          </aside>
        </div>

        <section className="news-portal__guides" aria-labelledby="guide-title">
          <SectionHeading
            title="Cẩm nang đấu giá"
            icon={<Gavel aria-hidden="true" />}
            action={
              <Link to="/help">
                Xem tất cả hướng dẫn
                <ArrowRight aria-hidden="true" />
              </Link>
            }
          />
          <div className="news-portal__guide-grid">
            {[
              {
                number: "01",
                title: "Chuẩn bị trước phiên",
                text: "Kiểm tra KYC, điều kiện tham gia, quy chế và khoản bảo đảm.",
              },
              {
                number: "02",
                title: "Ra giá có chiến lược",
                text: "Xác định ngân sách, theo dõi bước giá và giữ quyết định tỉnh táo.",
              },
              {
                number: "03",
                title: "Hoàn tất sau đấu giá",
                text: "Nắm rõ thanh toán, chứng từ, bàn giao và quyền lợi người trúng.",
              },
            ].map((guide) => (
              <Link to="/help" key={guide.number}>
                <span>{guide.number}</span>
                <div>
                  <h3>{guide.title}</h3>
                  <p>{guide.text}</p>
                </div>
                <ChevronRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
