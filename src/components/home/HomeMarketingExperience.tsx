import {
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  FileCheck2,
  Gem,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Watch,
} from "lucide-react";
import { Link } from "react-router-dom";
import { auctions } from "../../services/mock/auctionService";
import { formatMoney } from "../../utils/format";

const featuredCollections = [
  {
    title: "Biểu tượng thời gian",
    description:
      "Những cỗ máy cơ khí danh tiếng, được tuyển chọn theo độ hiếm, tình trạng và giá trị lưu giữ.",
    category: "Đồng hồ",
    image: "/assets/featured-rolex-angle-hd.png",
    meta: "20 tài sản tuyển chọn",
    Icon: Watch,
  },
  {
    title: "Sắc màu vĩnh cửu",
    description:
      "Kim cương và đá quý có chứng thư, nơi vẻ đẹp tinh tuyển gặp tiêu chuẩn thẩm định nghiêm ngặt.",
    category: "Trang sức",
    image: "/assets/diamond-gia-v2.png",
    meta: "Bộ sưu tập đá quý",
    Icon: Gem,
  },
  {
    title: "Di sản trong từng nét",
    description:
      "Tác phẩm nghệ thuật và cổ vật mang dấu ấn thời đại, được kể lại bằng hồ sơ nguồn gốc rõ ràng.",
    category: "Nghệ thuật",
    image: "/assets/catalog-dalat-painting.png",
    meta: "Tuyển tập giàu bản sắc",
    Icon: Sparkles,
  },
] as const;

const curatedAuctionIds = [
  "patek-nautilus",
  "diamond-gia",
  "painting-dalat",
] as const;

const curatedAuctions = curatedAuctionIds.flatMap((auctionId) => {
  const auction = auctions.find((item) => item.id === auctionId);
  return auction ? [auction] : [];
});

const conditionLevels = [
  "Cần phục chế",
  "Trung bình",
  "Tốt",
  "Rất tốt",
  "Gần như mới",
] as const;

const assetSpecifications = [
  ["Năm chế tác", "2020"],
  ["Số tham chiếu", "126610LV"],
  ["Dòng sản phẩm", "Submariner Date"],
  ["Chức năng", "Giờ, phút, giây và lịch ngày"],
  ["Đối tượng", "Nam / Phi giới tính"],
  ["Màu mặt số", "Xanh lá"],
  ["Cọc số", "Dạ quang hình học"],
  ["Bộ máy", "Tự động, Calibre 3235"],
  ["Chất liệu vỏ", "Thép Oystersteel"],
  ["Đường kính", "41 mm"],
  ["Dây đeo", "Oystersteel, khóa Oysterlock"],
  ["Khả năng chống nước", "300 mét"],
] as const;

const assetFaqs = [
  {
    question: "Điều gì tạo nên giá trị sưu tầm của mẫu đồng hồ này?",
    answer:
      "Submariner Date 126610LV kết hợp thiết kế biểu tượng, mặt số xanh đặc trưng, bộ máy thế hệ mới và nhu cầu ổn định từ cộng đồng sưu tầm. Tình trạng nguyên bản cùng bộ phụ kiện đầy đủ giúp củng cố giá trị dài hạn.",
  },
  {
    question: "Mức tình trạng “Rất tốt” được hiểu như thế nào?",
    answer:
      "Tài sản vận hành và trình bày tốt, có thể xuất hiện dấu vết sử dụng rất nhẹ khi quan sát gần nhưng không ảnh hưởng đáng kể đến thẩm mỹ tổng thể. Báo cáo tình trạng phản ánh kết quả kiểm tra tại thời điểm lập hồ sơ.",
  },
  {
    question: "Nguồn gốc tài sản được SGDG xác minh ra sao?",
    answer:
      "SGDG đối chiếu thông tin chủ sở hữu, số tham chiếu, số sê-ri, chứng từ và phụ kiện đi kèm. Các dấu mốc kiểm tra được lưu trong hồ sơ phiên để hỗ trợ tính minh bạch cho người tham gia.",
  },
  {
    question: "Tôi có thể xem tài sản trước khi tham gia đấu giá không?",
    answer:
      "Có. Người đủ điều kiện có thể đăng ký lịch xem tài sản hoặc yêu cầu chuyên viên cung cấp thêm hình ảnh chi tiết trước thời hạn đóng đăng ký của phiên.",
  },
] as const;

function getStatusLabel(status: string) {
  switch (status) {
    case "LIVE":
      return "Đang diễn ra";
    case "REGISTRATION_OPEN":
      return "Đang mở đăng ký";
    case "PUBLISHED":
      return "Sắp mở phiên";
    case "COMPLETED":
      return "Đã hoàn tất";
    case "CLOSED":
      return "Đã khép lại";
    default:
      return "Đã được tuyển chọn";
  }
}

function getDisplayPrice(auction: (typeof auctions)[number]) {
  if (
    auction.status === "LIVE" ||
    auction.status === "CLOSED" ||
    auction.status === "COMPLETED"
  ) {
    return {
      label: auction.status === "LIVE" ? "Giá hiện tại" : "Giá chốt",
      value: auction.currentPrice,
    };
  }

  return { label: "Giá khởi điểm", value: auction.startPrice };
}

function formatAuctionDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function HomeMarketingExperience({
  showAssetStory = false,
}: {
  showAssetStory?: boolean;
}) {
  return (
    <div className="home-marketing-experience">
      <section
        className="home-marketing-section home-collections"
        aria-labelledby="home-collections-title"
      >
        <div className="container">
          <header className="home-marketing-heading">
            <div>
              <span className="home-marketing-eyebrow">
                <Sparkles aria-hidden="true" />
                Khám phá theo gu
              </span>
              <h2 id="home-collections-title">Bộ sưu tập nổi bật</h2>
              <p>
                Những tuyển tập được biên soạn để bạn tìm thấy tài sản phù hợp
                với phong cách, niềm đam mê và giá trị muốn gìn giữ.
              </p>
            </div>
            <Link className="home-marketing-all-link" to="/auctions">
              Khám phá tất cả
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          <div className="home-collection-grid">
            {featuredCollections.map(
              ({ title, description, category, image, meta, Icon }, index) => (
                <Link
                  className={`home-collection-card home-collection-card--${index + 1}`}
                  key={title}
                  to={`/auctions?category=${encodeURIComponent(category)}`}
                >
                  <img src={image} alt="" />
                  <span className="home-collection-shade" aria-hidden="true" />
                  <span className="home-collection-index" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <span className="home-collection-content">
                    <span className="home-collection-meta">
                      <Icon aria-hidden="true" />
                      {meta}
                    </span>
                    <strong>{title}</strong>
                    <span>{description}</span>
                    <span className="home-collection-cta">
                      Xem bộ sưu tập
                      <ArrowRight aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      {showAssetStory && (
        <section
          className="home-marketing-section home-story"
          aria-labelledby="home-story-title"
        >
        <div className="container home-story-shell">
          <div className="home-story-visual">
            <img
              src="/assets/featured-rolex-angle-hd.png"
              alt="Đồng hồ Rolex Submariner Date 126610LV"
            />
            <div className="home-story-visual__stamp">
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>Đã thẩm định</strong>
                Hồ sơ minh bạch
              </span>
            </div>
            <span className="home-story-visual__caption">
              Bộ máy cơ khí · Mặt số xanh · Thép Oystersteel
            </span>
          </div>

          <div className="home-story-copy">
            <span className="home-marketing-eyebrow">
              <BookOpenText aria-hidden="true" />
              Câu chuyện tài sản
            </span>
            <h2 id="home-story-title">
              Giá trị thật bắt đầu từ một câu chuyện được kiểm chứng
            </h2>
            <p className="home-story-lead">
              Không chỉ là một chiếc đồng hồ, Rolex Submariner Date 126610LV là
              dấu ấn của kỹ nghệ chế tác, hành trình sở hữu và phong cách vượt
              thời gian.
            </p>

            <div className="home-story-chapters">
              <div>
                <span>01</span>
                <p>
                  <strong>Nguồn gốc rõ ràng</strong>
                  Mã tài sản, lịch sử sở hữu và hồ sơ phiên đấu giá được ghi
                  nhận minh bạch.
                </p>
              </div>
              <div>
                <span>02</span>
                <p>
                  <strong>Giá trị được thẩm định</strong>
                  Tình trạng, số sê-ri và đặc điểm nguyên bản được chuyên gia
                  kiểm tra trước khi công bố.
                </p>
              </div>
              <div>
                <span>03</span>
                <p>
                  <strong>Hành trình được tiếp nối</strong>
                  Mỗi lượt trả giá mở ra một chương mới cho tài sản xứng đáng
                  được gìn giữ.
                </p>
              </div>
            </div>

            <div className="home-story-actions">
              <Link
                className="home-story-primary"
                to="/auctions/rolex-126610lv"
              >
                Khám phá câu chuyện
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link className="home-story-secondary" to="/auctions">
                Xem thêm tài sản tuyển chọn
              </Link>
            </div>
          </div>
        </div>

        <div className="container home-story-dossier">
          <header className="home-story-dossier__header">
            <div>
              <span className="home-marketing-eyebrow">
                <FileCheck2 aria-hidden="true" />
                Hồ sơ chuyên gia
              </span>
              <h3>Chi tiết tài sản</h3>
              <p>
                Những thông tin quan trọng giúp người sưu tầm đánh giá tài sản
                trước khi đưa ra quyết định.
              </p>
            </div>
            <span className="home-story-dossier__reference">
              <small>Mã hồ sơ</small>
              SGD-260717-001
            </span>
          </header>

          <nav
            className="home-story-dossier__nav"
            aria-label="Điều hướng hồ sơ tài sản"
          >
            <a href="#mo-ta-tai-san">Mô tả</a>
            <a href="#tinh-trang-tai-san">Tình trạng</a>
            <a href="#thong-so-tai-san">Thông số</a>
            <a href="#gia-tri-suu-tam">Giá trị sưu tầm</a>
          </nav>

          <div className="home-story-dossier__content">
            <article
              className="home-story-description"
              id="mo-ta-tai-san"
            >
              <span className="home-story-section-number">01</span>
              <div>
                <h4>Mô tả</h4>
                <p>
                  Rolex Submariner Date 126610LV với mặt số xanh lá, vành bezel
                  Cerachrom đồng màu và vỏ Oystersteel 41 mm. Tài sản đi kèm
                  hộp Rolex, thẻ bảo hành, bao đựng thẻ, thẻ treo, sổ hướng dẫn
                  và bộ mắt dây dự phòng.
                </p>
                <div className="home-story-included">
                  <CircleCheck aria-hidden="true" />
                  <span>
                    <strong>Bộ phụ kiện đi kèm</strong>
                    Hộp · Thẻ bảo hành · Thẻ treo · Sổ hướng dẫn · Mắt dây
                  </span>
                </div>
              </div>
            </article>

            <article
              className="home-story-condition"
              id="tinh-trang-tai-san"
            >
              <span className="home-story-section-number">02</span>
              <div>
                <div className="home-story-condition__title">
                  <div>
                    <h4>Báo cáo tình trạng</h4>
                    <p>Đánh giá bởi chuyên viên thẩm định SGDG</p>
                  </div>
                  <span>
                    <Star aria-hidden="true" />
                    Rất tốt
                  </span>
                </div>

                <div
                  className="home-story-condition-scale"
                  aria-label="Tình trạng tài sản: Rất tốt"
                >
                  {conditionLevels.map((level, index) => (
                    <div
                      className={index === 3 ? "is-active" : ""}
                      key={level}
                    >
                      <span className="home-story-condition-scale__mark">
                        {index === 3 ? <Star aria-hidden="true" /> : null}
                      </span>
                      <strong>{level}</strong>
                    </div>
                  ))}
                </div>

                <div className="home-story-condition__report">
                  <p>
                    Tài sản có tổng thể rất tốt và giữ được vẻ ngoài cân đối.
                    Bề mặt vỏ cùng dây đeo có một số vết xước mảnh phù hợp với
                    quá trình sử dụng thông thường; không ghi nhận vết móp rõ
                    rệt khi quan sát trực tiếp.
                  </p>
                  <p>
                    Mặt kính, mặt số và vành bezel trình bày đẹp. Bộ máy đang
                    hoạt động tại thời điểm lập hồ sơ; độ chính xác và thời
                    lượng trữ cót chưa được kiểm nghiệm trong thời gian dài.
                    Người mua nên thực hiện bảo dưỡng định kỳ theo khuyến nghị
                    của nhà sản xuất.
                  </p>
                  <span>
                    Toàn bộ hình ảnh trong hồ sơ thể hiện tài sản dùng cho
                    phiên đấu giá này.
                  </span>
                </div>
              </div>
            </article>

            <article
              className="home-story-specifications"
              id="thong-so-tai-san"
            >
              <span className="home-story-section-number">03</span>
              <div>
                <h4>Thông số kỹ thuật</h4>
                <dl>
                  {assetSpecifications.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </article>

            <article className="home-story-provenance">
              <span className="home-story-section-number">04</span>
              <div>
                <h4>Nguồn gốc và hành trình</h4>
                <div className="home-story-provenance__grid">
                  <div>
                    <span>2020</span>
                    <strong>Khởi đầu hành trình</strong>
                    <p>
                      Tài sản được mua mới qua kênh phân phối chính thức và lưu
                      giữ cùng bộ phụ kiện.
                    </p>
                  </div>
                  <div>
                    <span>2024</span>
                    <strong>Ghi nhận sở hữu</strong>
                    <p>
                      Hồ sơ chủ sở hữu và thông tin nhận diện tài sản được đối
                      chiếu, bổ sung.
                    </p>
                  </div>
                  <div>
                    <span>2026</span>
                    <strong>Thẩm định tại SGDG</strong>
                    <p>
                      Tình trạng, thông số và phụ kiện được kiểm tra trước khi
                      đưa vào phiên tuyển chọn.
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div className="container home-story-editorial" id="gia-tri-suu-tam">
          <div className="home-story-editorial__intro">
            <span className="home-marketing-eyebrow">
              <BookOpenText aria-hidden="true" />
              Góc nhìn nhà sưu tầm
            </span>
            <h3>
              Một biểu tượng được tạo nên bởi công năng, thiết kế và thời gian
            </h3>
          </div>

          <div className="home-story-editorial__copy">
            <p>
              Ra đời từ nhu cầu của những thợ lặn chuyên nghiệp, dòng
              Submariner đã vượt khỏi giới hạn của một chiếc đồng hồ công cụ để
              trở thành một trong những thiết kế thể thao dễ nhận biết nhất.
              Tỷ lệ cân đối, vành xoay một chiều và ngôn ngữ mặt số rõ ràng tạo
              nên bản sắc gần như không bị chi phối bởi xu hướng.
            </p>
            <p>
              Phiên bản 126610LV tiếp nối di sản đó bằng vỏ 41 mm, bộ máy
              Calibre 3235 và sắc xanh đặc trưng trên vành bezel. Sự kết hợp
              giữa độ bền, khả năng nhận diện và nguồn cung có kiểm soát khiến
              mẫu đồng hồ này luôn nhận được sự quan tâm của cả người mới bắt
              đầu lẫn nhà sưu tầm lâu năm.
            </p>
            <p>
              Với một tài sản sưu tầm, giá trị không chỉ nằm ở thương hiệu.
              Tình trạng nguyên bản, hồ sơ sở hữu, phụ kiện đồng bộ và chất
              lượng bảo quản là những yếu tố cùng nhau tạo nên sức hấp dẫn khi
              tài sản bước sang chương tiếp theo.
            </p>
          </div>
        </div>

        <div className="container home-story-faq">
          <header>
            <span className="home-marketing-eyebrow">
              <BadgeCheck aria-hidden="true" />
              Thông tin dành cho người mua
            </span>
            <h3>Câu hỏi thường gặp</h3>
          </header>
          <div className="home-story-faq__list">
            {assetFaqs.map(({ question, answer }, index) => (
              <details key={question} open={index === 0}>
                <summary>
                  <span>{question}</span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
        </section>
      )}

      <section
        className="home-marketing-section home-curated"
        aria-labelledby="home-curated-title"
      >
        <div className="container">
          <header className="home-marketing-heading home-marketing-heading--light">
            <div>
              <span className="home-marketing-eyebrow">
                <BadgeCheck aria-hidden="true" />
                Lựa chọn của chuyên gia
              </span>
              <h2 id="home-curated-title">Phiên đấu giá tuyển chọn</h2>
              <p>
                Mỗi phiên được đội ngũ SGDG lựa chọn dựa trên độ hiếm, hồ sơ
                nguồn gốc và sức hút đối với cộng đồng sưu tầm.
              </p>
            </div>
            <Link className="home-marketing-all-link" to="/auctions">
              Xem lịch đấu giá
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          <div className="home-curated-grid">
            {curatedAuctions.map((auction, index) => {
              const price = getDisplayPrice(auction);

              return (
                <article className="home-curated-card" key={auction.id}>
                  <Link
                    className="home-curated-card__media"
                    to={`/auctions/${auction.id}`}
                    aria-label={`Xem ${auction.assetName}`}
                  >
                    <img src={auction.image} alt={auction.assetName} />
                    <span className="home-curated-card__rank">
                      Tuyển chọn 0{index + 1}
                    </span>
                    <span
                      className={`home-curated-card__status home-curated-card__status--${auction.status.toLowerCase()}`}
                    >
                      {getStatusLabel(auction.status)}
                    </span>
                  </Link>
                  <div className="home-curated-card__body">
                    <span className="home-curated-card__category">
                      {auction.category}
                    </span>
                    <h3>
                      <Link to={`/auctions/${auction.id}`}>
                        {auction.assetName}
                      </Link>
                    </h3>
                    <div className="home-curated-card__facts">
                      <span>
                        <MapPin aria-hidden="true" />
                        {auction.region}
                      </span>
                      <span>
                        <CalendarDays aria-hidden="true" />
                        {formatAuctionDate(auction.startsAt)}
                      </span>
                    </div>
                    <div className="home-curated-card__price">
                      <span>{price.label}</span>
                      <strong>{formatMoney(price.value)}</strong>
                    </div>
                    <Link
                      className="home-curated-card__link"
                      to={`/auctions/${auction.id}`}
                    >
                      Khám phá phiên đấu giá
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
