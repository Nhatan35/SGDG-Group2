import { ArrowUpRight, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";

const articles = [
  {
    tag: "Quy trình",
    title: "6 bước đăng ký đủ điều kiện tham gia phiên",
    description: "Hướng dẫn từ xác minh tài khoản, nộp tiền đặt trước đến khi sẵn sàng bước vào phòng đấu giá.",
    image: "/assets/auction-hero-background-energy.png",
    readTime: "6 phút đọc",
  },
  {
    tag: "Hướng dẫn",
    title: "Manual Bid và Auto Bid khác nhau như thế nào?",
    description: "Chọn chiến lược đặt giá phù hợp và kiểm soát hạn mức an toàn trong từng phiên.",
    image: "/assets/patek-nautilus-v2.png",
    readTime: "4 phút đọc",
  },
  {
    tag: "An toàn",
    title: "Cách SGDG bảo vệ danh tính người tham gia",
    description: "Tìm hiểu cơ chế định danh, che dữ liệu và lưu vết giúp phiên đấu giá minh bạch.",
    image: "/assets/diamond-gia-v2.png",
    readTime: "5 phút đọc",
  },
  {
    tag: "Thanh toán",
    title: "Hiểu đúng nghĩa vụ thanh toán trúng đấu giá",
    description: "Các mốc thời gian, phương thức thanh toán và lưu ý quan trọng dành cho người trúng giá.",
    image: "/assets/catalog-iphone-15-pro.png",
    readTime: "5 phút đọc",
  },
  {
    tag: "Bàn giao",
    title: "Theo dõi trạng thái bàn giao tài sản",
    description: "Cách kiểm tra lịch hẹn, bằng chứng giao nhận và xác nhận hoàn tất ngay trên hệ thống.",
    image: "/assets/catalog-mercedes-s450.png",
    readTime: "4 phút đọc",
  },
  {
    tag: "Thông báo",
    title: "Xử lý reconnect và đồng bộ dữ liệu trong phiên",
    description: "Những việc cần làm khi kết nối gián đoạn để tiếp tục theo dõi phiên an toàn.",
    image: "/assets/catalog-hermes-birkin.png",
    readTime: "3 phút đọc",
  },
];

export function NewsPage() {
  return (
    <div className="container page-shell news-page">
      <div className="page-heading news-heading">
        <span className="eyebrow">TIN TỨC & KIẾN THỨC</span>
        <h1>Hiểu quy trình, tham gia tự tin</h1>
        <p>Nội dung thực tế giúp bạn chuẩn bị tốt hơn ở mọi giai đoạn của hành trình đấu giá.</p>
      </div>
      <div className="news-grid">
        {articles.map((article, index) => (
          <article className={index === 0 ? "news-card featured" : "news-card"} key={article.title}>
            <div className="news-card-media">
              <img src={article.image} alt="" loading={index === 0 ? "eager" : "lazy"} />
              <span className="news-tag">{article.tag}</span>
            </div>
            <div className="news-card-body">
              <span className="news-read-time"><Clock3 />{article.readTime}</span>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
              <Link className="news-card-link" to="/help">
                Đọc bài viết <ArrowUpRight />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
