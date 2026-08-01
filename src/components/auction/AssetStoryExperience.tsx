import {
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  ChevronDown,
  CircleCheck,
  FileCheck2,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Auction } from "../../services/mock/auctionService";
import { formatMoney } from "../../utils/format";

const conditionLevels = [
  "Cần phục chế",
  "Trung bình",
  "Tốt",
  "Rất tốt",
  "Gần như mới",
] as const;

interface CategoryStoryProfile {
  headline: string;
  caption: string;
  craft: string;
  conditionFocus: string;
  included: string;
  collectorView: string;
  legacy: string;
}

interface StoryOverride {
  headline?: string;
  caption?: string;
  description?: string;
  included?: string;
  specifications?: Array<[string, string]>;
}

const categoryStories: Record<string, CategoryStoryProfile> = {
  "Đồng hồ": {
    headline: "Kỹ nghệ đo thời gian, được gìn giữ qua nhiều thế hệ",
    caption: "Cơ khí chính xác · Dấu hiệu nhận diện · Hồ sơ vận hành",
    craft:
      "Kết cấu bộ máy, tỷ lệ thiết kế và các dấu hiệu nhận diện được đặt trong cùng một hồ sơ thẩm định.",
    conditionFocus:
      "vỏ, mặt số, kính, dây đeo, bộ máy và dấu vết sử dụng",
    included: "Hộp · Thẻ hoặc giấy tờ · Phụ kiện theo hồ sơ công bố",
    collectorView:
      "độ nguyên bản, tình trạng vận hành và tính đầy đủ của bộ phụ kiện",
    legacy:
      "Một chiếc đồng hồ đáng sưu tầm không chỉ ghi thời gian; nó lưu lại kỹ nghệ, thói quen sử dụng và gu thẩm mỹ của người sở hữu.",
  },
  "Trang sức": {
    headline: "Ánh sáng được định hình bởi tay nghề và nguồn gốc",
    caption: "Vật liệu quý · Chứng thư · Nghệ thuật chế tác",
    craft:
      "Vật liệu, giác cắt, kết cấu ổ chấu và chứng thư được đối chiếu để làm rõ vẻ đẹp lẫn giá trị của món trang sức.",
    conditionFocus:
      "viên chủ, bề mặt kim loại, ổ chấu, khóa cài và dấu hiệu sửa chữa",
    included: "Chứng thư · Hộp bảo quản · Biên bản thẩm định vật liệu",
    collectorView:
      "chất lượng vật liệu, độ cân đối của chế tác và hồ sơ chứng nhận",
    legacy:
      "Trang sức là nghệ thuật có thể được mang theo: ánh sáng, tỷ lệ và dấu ấn thủ công cùng tồn tại trong một vật thể nhỏ bé.",
  },
  "Điện thoại": {
    headline: "Một dấu mốc công nghệ trong hình hài nguyên bản",
    caption: "Thiết kế công nghiệp · Cấu hình · Hồ sơ thiết bị",
    craft:
      "Cấu hình, số nhận diện thiết bị và tình trạng linh kiện được ghi nhận để bảo toàn câu chuyện công nghệ của sản phẩm.",
    conditionFocus:
      "khung máy, màn hình, pin, camera, cổng kết nối và chức năng chính",
    included: "Hộp · Cáp sạc · Phụ kiện và hồ sơ thiết bị được công bố",
    collectorView:
      "độ nguyên bản, cấu hình hiếm và mức độ đầy đủ của bộ sản phẩm",
    legacy:
      "Những thiết bị tiêu biểu kể lại cách công nghệ đã thay đổi đời sống, thiết kế và thói quen giao tiếp của một thời kỳ.",
  },
  "Xe cộ": {
    headline: "Di sản chuyển động tìm thấy người cầm lái tiếp theo",
    caption: "Kỹ thuật · Lịch sử bảo dưỡng · Trải nghiệm vận hành",
    craft:
      "Hồ sơ pháp lý, lịch sử bảo dưỡng và đặc điểm cấu hình được đặt cạnh trải nghiệm vận hành để tạo nên chân dung đầy đủ.",
    conditionFocus:
      "ngoại thất, nội thất, hệ truyền động, khung gầm và lịch sử bảo dưỡng",
    included: "Hồ sơ xe · Chìa khóa · Sổ bảo dưỡng và phụ kiện công bố",
    collectorView:
      "cấu hình, lịch sử sử dụng, tình trạng kỹ thuật và độ minh bạch pháp lý",
    legacy:
      "Một chiếc xe đáng nhớ là sự gặp gỡ giữa kỹ thuật và cảm xúc—nơi từng quãng đường trở thành một phần của hồ sơ.",
  },
  "Nghệ thuật": {
    headline: "Một lát cắt ký ức tìm thấy người gìn giữ mới",
    caption: "Ngôn ngữ tạo hình · Chất liệu · Nguồn gốc tác phẩm",
    craft:
      "Bút pháp, chất liệu, bối cảnh sáng tác và dấu vết lưu truyền được đọc như những lớp nghĩa của tác phẩm.",
    conditionFocus:
      "bề mặt tác phẩm, lớp màu, nền, khung và dấu hiệu can thiệp",
    included: "Hồ sơ tác phẩm · Biên bản tình trạng · Tài liệu nguồn gốc",
    collectorView:
      "ngôn ngữ nghệ thuật, nguồn gốc, tình trạng và vị trí trong hành trình sáng tác",
    legacy:
      "Tác phẩm nghệ thuật sống bằng những cuộc đối thoại mới. Mỗi lần chuyển giao là một lần ý nghĩa của nó được mở rộng.",
  },
  "Đồ cổ": {
    headline: "Dấu vết thời gian trở thành một phần của vẻ đẹp",
    caption: "Niên đại · Kỹ thuật thủ công · Lịch sử lưu truyền",
    craft:
      "Chất liệu, kỹ thuật chế tác, dấu vết niên đại và lịch sử lưu truyền được đối chiếu trước khi tài sản xuất hiện trong phiên.",
    conditionFocus:
      "bề mặt, men hoặc patina, cấu trúc, dấu vết phục chế và độ ổn định",
    included: "Biên bản giám định · Hồ sơ nguồn gốc · Khuyến nghị bảo quản",
    collectorView:
      "niên đại, độ hiếm, tính nguyên bản và chất lượng của lịch sử lưu truyền",
    legacy:
      "Đồ cổ mang vẻ đẹp không thể tái tạo: thời gian đã trở thành một phần vật chất của chính hiện vật.",
  },
  "Thời trang": {
    headline: "Thiết kế biểu tượng vượt ra ngoài một mùa mốt",
    caption: "Tay nghề thủ công · Chất liệu · Dấu ấn nhà mốt",
    craft:
      "Cấu trúc, chất liệu, phụ kiện kim loại và dấu hiệu xác thực được xem xét như một tổng thể thiết kế.",
    conditionFocus:
      "bề mặt chất liệu, đường may, phom dáng, phần cứng và góc cạnh",
    included: "Túi hoặc hộp · Thẻ · Phụ kiện theo bộ sản phẩm công bố",
    collectorView:
      "tính biểu tượng của thiết kế, độ hiếm, chất liệu và tình trạng bảo quản",
    legacy:
      "Thời trang lưu giữ tinh thần của một thời đại bằng tỷ lệ, chất liệu và những chi tiết chỉ có thể được tạo nên bởi tay nghề.",
  },
  "Đồ sưu tầm": {
    headline: "Độ hiếm có ý nghĩa khi câu chuyện còn nguyên vẹn",
    caption: "Phiên bản · Tính nguyên bản · Văn hóa sưu tầm",
    craft:
      "Phiên bản, số lượng phát hành, dấu hiệu nguyên bản và lịch sử sở hữu được kết nối thành hồ sơ nhận diện.",
    conditionFocus:
      "độ nguyên bản, bề mặt, tem nhãn, bao bì và dấu hiệu thay thế",
    included: "Bao bì · Chứng nhận · Phụ kiện theo phiên bản công bố",
    collectorView:
      "độ hiếm, tính nguyên bản, bối cảnh văn hóa và mức độ hoàn chỉnh",
    legacy:
      "Một vật phẩm sưu tầm có thể nhỏ bé, nhưng nó cô đọng ký ức của cả một cộng đồng và một giai đoạn văn hóa.",
  },
  "Bất động sản": {
    headline: "Một không gian sống được kể bằng vị trí và ký ức",
    caption: "Vị trí · Kiến trúc · Hồ sơ pháp lý",
    craft:
      "Không gian, quy hoạch, hiện trạng sử dụng và hồ sơ pháp lý được trình bày để làm rõ giá trị hữu hình lẫn tiềm năng.",
    conditionFocus:
      "hiện trạng công trình, hệ thống kỹ thuật, ranh giới và hồ sơ pháp lý",
    included: "Hồ sơ pháp lý · Bản vẽ · Biên bản hiện trạng và bàn giao",
    collectorView:
      "vị trí, chất lượng không gian, tính pháp lý và khả năng tiếp nối công năng",
    legacy:
      "Bất động sản không chỉ là diện tích. Đó là mối quan hệ giữa kiến trúc, cảnh quan và những đời sống từng diễn ra bên trong.",
  },
};

const storyOverrides: Record<string, StoryOverride> = {
  "rolex-126610lv": {
    headline: "Một biểu tượng lặn biển được viết tiếp bằng sắc xanh",
    caption: "Calibre 3235 · Bezel xanh · Thép Oystersteel",
    description:
      "Rolex Submariner Date 126610LV kết hợp ngôn ngữ đồng hồ công cụ với sắc xanh đặc trưng, tạo nên một phiên bản giàu nhận diện trong dòng Submariner hiện đại.",
    included: "Hộp Rolex · Thẻ bảo hành · Thẻ treo · Sổ hướng dẫn · Mắt dây",
    specifications: [
      ["Số tham chiếu", "126610LV"],
      ["Dòng sản phẩm", "Submariner Date"],
      ["Bộ máy", "Tự động, Calibre 3235"],
      ["Chất liệu vỏ", "Thép Oystersteel"],
      ["Đường kính", "41 mm"],
      ["Khả năng chống nước", "300 mét"],
    ],
  },
  "patek-nautilus": {
    headline: "Sự thanh lịch thể thao trong tỷ lệ của Nautilus",
    caption: "Vàng hồng · Mặt số tương phản · Kiến trúc Nautilus",
    description:
      "Patek Philippe Nautilus 5711/1R là sự cân bằng giữa đường nét thể thao và chất liệu vàng hồng, một cách diễn giải tinh tế về đồng hồ xa xỉ đương đại.",
    included: "Hộp · Tài liệu tham chiếu · Phụ kiện theo hồ sơ phiên",
    specifications: [
      ["Số tham chiếu", "5711/1R"],
      ["Dòng sản phẩm", "Nautilus"],
      ["Chất liệu", "Vàng hồng 18K"],
      ["Bộ máy", "Cơ tự động"],
      ["Dây đeo", "Vàng hồng tích hợp"],
      ["Chức năng", "Giờ, phút, giây và lịch ngày"],
    ],
  },
  "diamond-gia": {
    headline: "Một viên kim cương được định nghĩa bằng ánh sáng tinh khiết",
    caption: "3.01 carat · Màu D · Độ tinh khiết IF · GIA",
    description:
      "Viên kim cương chủ 3.01 carat kết hợp cấp màu D và độ tinh khiết IF, tạo nên một cấu hình chú trọng sự trong trẻo và khả năng phản xạ ánh sáng.",
    included: "Chứng thư GIA · Hộp bảo quản · Biên bản kiểm tra ổ chấu",
  },
  "painting-dalat": {
    headline: "Đà Lạt được lưu lại trong một miền ký ức bằng sơn dầu",
    caption: "Sơn dầu · Phong cảnh cao nguyên · Hồ sơ tác phẩm",
    description:
      "Tác phẩm gợi lại nhịp điệu trầm của cảnh quan Đà Lạt qua lớp màu, không khí và chiều sâu không gian đặc trưng của chất liệu sơn dầu.",
    included: "Hồ sơ tác phẩm · Biên bản tình trạng · Khung hiện hữu",
  },
  "antique-01": {
    headline: "Men lam và dấu vết lò nung kể lại một thời thủ công",
    caption: "Gốm men lam · Dấu vết niên đại · Hồ sơ giám định",
  },
  "collectible-01": {
    headline: "Một chiếc máy ảnh cơ lưu giữ văn hóa của khoảnh khắc",
    caption: "Cơ khí quang học · Phiên bản sưu tầm · Tính nguyên bản",
  },
  "real-estate-01": {
    headline: "Một tầm nhìn ven sông được định hình thành không gian sống",
    caption: "Thảo Điền · Hai phòng ngủ · Góc nhìn sông",
  },
};

function hashId(value: string) {
  return [...value].reduce((total, character) => {
    return (total * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function getProfile(auction: Auction) {
  return categoryStories[auction.category] ?? categoryStories["Đồ sưu tầm"];
}

function getCondition(auction: Auction) {
  const activeIndex = 2 + (hashId(auction.id) % 3);
  return {
    activeIndex,
    label: conditionLevels[activeIndex],
  };
}

function getSpecifications(
  auction: Auction,
  override: StoryOverride | undefined,
): Array<[string, string]> {
  const categorySpecific: Record<string, Array<[string, string]>> = {
    "Đồng hồ": [
      ["Cơ chế", "Bộ máy cơ khí theo hồ sơ thẩm định"],
      ["Dấu hiệu nhận diện", "Số tham chiếu và đặc điểm vỏ/mặt số"],
    ],
    "Trang sức": [
      ["Vật liệu", "Theo chứng thư và biên bản thẩm định"],
      ["Kết cấu", "Viên chủ, ổ chấu và phần kim loại"],
    ],
    "Điện thoại": [
      ["Nhận diện", "Số series/IMEI theo hồ sơ thiết bị"],
      ["Kiểm tra", "Ngoại hình, pin và chức năng chính"],
    ],
    "Xe cộ": [
      ["Pháp lý", "Hồ sơ đăng ký được đối chiếu"],
      ["Kỹ thuật", "Theo biên bản kiểm tra vận hành"],
    ],
    "Nghệ thuật": [
      ["Chất liệu", "Theo hồ sơ tác phẩm"],
      ["Bảo quản", "Bề mặt, nền và khung được kiểm tra"],
    ],
    "Đồ cổ": [
      ["Niên đại", "Theo hồ sơ giám định tham chiếu"],
      ["Bảo quản", "Theo khuyến nghị trong biên bản tình trạng"],
    ],
    "Thời trang": [
      ["Xác thực", "Dấu hiệu thương hiệu được đối chiếu"],
      ["Chất liệu", "Theo hồ sơ sản phẩm công bố"],
    ],
    "Đồ sưu tầm": [
      ["Phiên bản", "Theo thông tin phát hành tham chiếu"],
      ["Nguyên bản", "Tem nhãn và phụ kiện được đối chiếu"],
    ],
    "Bất động sản": [
      ["Vị trí", auction.region],
      ["Pháp lý", "Hồ sơ được rà soát trước khi công bố"],
    ],
  };

  return [
    ...(override?.specifications ?? categorySpecific[auction.category] ?? []),
    ["Danh mục", auction.category],
    ["Khu vực", auction.region],
    ["Mã hồ sơ", auction.code],
    ["Giá khởi điểm", formatMoney(auction.startPrice)],
  ];
}

export function AssetStoryExperience({ auction }: { auction: Auction }) {
  const profile = getProfile(auction);
  const override = storyOverrides[auction.id];
  const condition = getCondition(auction);
  const hash = hashId(auction.id);
  const originYear = String(2017 + (hash % 7));
  const dossierId = `asset-dossier-${auction.id}`;
  const descriptionId = `asset-description-${auction.id}`;
  const conditionId = `asset-condition-${auction.id}`;
  const specificationsId = `asset-specifications-${auction.id}`;
  const collectorId = `asset-collector-${auction.id}`;
  const description =
    override?.description ??
    `${auction.assetName} được SGDG tiếp cận như một tài sản có bản sắc riêng. ${profile.craft}`;
  const included = override?.included ?? profile.included;
  const specifications = getSpecifications(auction, override);

  return (
    <div className="home-marketing-experience auction-detail-story-experience">
      <section
        className="home-marketing-section home-story"
        aria-labelledby={`asset-story-title-${auction.id}`}
      >
        <div className="container home-story-shell">
          <div className="home-story-visual">
            <img src={auction.image} alt={auction.assetName} loading="lazy" />
            <div className="home-story-visual__stamp">
              <ShieldCheck aria-hidden="true" />
              <span>
                <strong>Đã thẩm định</strong>
                Hồ sơ riêng · {auction.code}
              </span>
            </div>
            <span className="home-story-visual__caption">
              {override?.caption ?? profile.caption}
            </span>
          </div>

          <div className="home-story-copy">
            <span className="home-marketing-eyebrow">
              <BookOpenText aria-hidden="true" />
              Câu chuyện tài sản
            </span>
            <h2 id={`asset-story-title-${auction.id}`}>
              {override?.headline ?? profile.headline}
            </h2>
            <p className="home-story-lead">{description}</p>

            <div className="home-story-chapters">
              <div>
                <span>01</span>
                <p>
                  <strong>Dấu hiệu nhận diện riêng</strong>
                  {auction.assetName} được ghi nhận bằng mã {auction.code}, hình
                  ảnh thực tế và các đặc điểm thuộc danh mục{" "}
                  {auction.category.toLowerCase()}.
                </p>
              </div>
              <div>
                <span>02</span>
                <p>
                  <strong>Giá trị được kiểm chứng</strong>
                  Hồ sơ tập trung vào {profile.conditionFocus}, cùng những dữ
                  liệu ảnh hưởng trực tiếp đến quyết định sưu tầm.
                </p>
              </div>
              <div>
                <span>03</span>
                <p>
                  <strong>Hành trình được tiếp nối</strong>
                  Từ {auction.region}, tài sản bước vào phiên SGDG để tìm người
                  gìn giữ chương tiếp theo của câu chuyện.
                </p>
              </div>
            </div>

            <div className="home-story-actions">
              <a className="home-story-primary" href={`#${dossierId}`}>
                Xem hồ sơ chi tiết
                <ArrowRight aria-hidden="true" />
              </a>
              <Link className="home-story-secondary" to="/auctions">
                Khám phá tài sản khác
              </Link>
            </div>
          </div>
        </div>

        <div className="container home-story-dossier" id={dossierId}>
          <header className="home-story-dossier__header">
            <div>
              <span className="home-marketing-eyebrow">
                <FileCheck2 aria-hidden="true" />
                Hồ sơ chuyên gia
              </span>
              <h3>Chi tiết tài sản</h3>
              <p>
                Hồ sơ riêng của {auction.assetName}, phục vụ việc đánh giá trước
                khi người sưu tầm đưa ra quyết định.
              </p>
            </div>
            <span className="home-story-dossier__reference">
              <small>Mã hồ sơ</small>
              {auction.code}
            </span>
          </header>

          <nav
            className="home-story-dossier__nav"
            aria-label={`Điều hướng hồ sơ ${auction.assetName}`}
          >
            <a href={`#${descriptionId}`}>Mô tả</a>
            <a href={`#${conditionId}`}>Tình trạng</a>
            <a href={`#${specificationsId}`}>Thông số</a>
            <a href={`#${collectorId}`}>Giá trị sưu tầm</a>
          </nav>

          <div className="home-story-dossier__content">
            <article className="home-story-description" id={descriptionId}>
              <span className="home-story-section-number">01</span>
              <div>
                <h4>Mô tả</h4>
                <p>{description}</p>
                <div className="home-story-included">
                  <CircleCheck aria-hidden="true" />
                  <span>
                    <strong>Hồ sơ và phụ kiện đi kèm</strong>
                    {included}
                  </span>
                </div>
              </div>
            </article>

            <article className="home-story-condition" id={conditionId}>
              <span className="home-story-section-number">02</span>
              <div>
                <div className="home-story-condition__title">
                  <div>
                    <h4>Báo cáo tình trạng</h4>
                    <p>Đánh giá riêng cho hồ sơ {auction.code}</p>
                  </div>
                  <span>
                    <Star aria-hidden="true" />
                    {condition.label}
                  </span>
                </div>

                <div
                  className="home-story-condition-scale"
                  aria-label={`Tình trạng tài sản: ${condition.label}`}
                >
                  {conditionLevels.map((level, index) => (
                    <div
                      className={
                        index === condition.activeIndex ? "is-active" : ""
                      }
                      key={level}
                    >
                      <span className="home-story-condition-scale__mark">
                        {index === condition.activeIndex ? (
                          <Star aria-hidden="true" />
                        ) : null}
                      </span>
                      <strong>{level}</strong>
                    </div>
                  ))}
                </div>

                <div className="home-story-condition__report">
                  <p>
                    Chuyên viên tập trung kiểm tra {profile.conditionFocus}.
                    Kết quả tổng thể của tài sản được xếp mức{" "}
                    {condition.label.toLowerCase()} tại thời điểm lập hồ sơ.
                  </p>
                  <p>
                    Các dấu vết sử dụng hoặc biến đổi tự nhiên, nếu có, được
                    đối chiếu cùng ảnh thực tế. Người mua nên xem toàn bộ thư
                    viện ảnh và yêu cầu kiểm tra trực tiếp trước phiên.
                  </p>
                  <span>
                    Báo cáo này chỉ áp dụng cho {auction.assetName}, mã{" "}
                    {auction.code}.
                  </span>
                </div>
              </div>
            </article>

            <article
              className="home-story-specifications"
              id={specificationsId}
            >
              <span className="home-story-section-number">03</span>
              <div>
                <h4>Thông số và dữ liệu hồ sơ</h4>
                <dl>
                  {specifications.map(([label, value]) => (
                    <div key={`${label}-${value}`}>
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
                    <span>{originYear}</span>
                    <strong>Dấu mốc đầu tiên</strong>
                    <p>
                      Hồ sơ ban đầu của tài sản được thiết lập từ các dữ liệu
                      nhận diện và tài liệu đi kèm.
                    </p>
                  </div>
                  <div>
                    <span>2025</span>
                    <strong>Đối chiếu sở hữu</strong>
                    <p>
                      Thông tin lưu giữ và tình trạng được bổ sung trước khi tài
                      sản bước vào quy trình tuyển chọn.
                    </p>
                  </div>
                  <div>
                    <span>2026</span>
                    <strong>Thẩm định tại SGDG</strong>
                    <p>
                      Hồ sơ {auction.code} được hoàn thiện và gắn với phiên đấu
                      giá tại {auction.region}.
                    </p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div className="container home-story-editorial" id={collectorId}>
          <div className="home-story-editorial__intro">
            <span className="home-marketing-eyebrow">
              <BookOpenText aria-hidden="true" />
              Góc nhìn nhà sưu tầm
            </span>
            <h3>{profile.headline}</h3>
          </div>
          <div className="home-story-editorial__copy">
            <p>{profile.legacy}</p>
            <p>
              Với {auction.assetName}, giá trị nên được đọc qua{" "}
              {profile.collectorView}. Những yếu tố này tạo nên khác biệt giữa
              một món đồ đơn thuần và một tài sản có khả năng tiếp tục được
              gìn giữ.
            </p>
            <p>
              Giá khởi điểm {formatMoney(auction.startPrice)} là mốc công bố
              của phiên, không thay thế việc người mua tự đánh giá hồ sơ, tình
              trạng và mức độ phù hợp với bộ sưu tập cá nhân.
            </p>
          </div>
        </div>

        <div className="container home-story-faq">
          <header>
            <span className="home-marketing-eyebrow">
              <BadgeCheck aria-hidden="true" />
              Thông tin dành cho người mua
            </span>
            <h3>Câu hỏi về {auction.assetName}</h3>
          </header>
          <div className="home-story-faq__list">
            <details open>
              <summary>
                <span>Điều gì tạo nên giá trị sưu tầm của tài sản này?</span>
                <ChevronDown aria-hidden="true" />
              </summary>
              <p>
                Giá trị được xem xét qua {profile.collectorView}, kết hợp với
                nhu cầu thị trường và tính minh bạch của hồ sơ {auction.code}.
              </p>
            </details>
            <details>
              <summary>
                <span>Tình trạng được SGDG ghi nhận như thế nào?</span>
                <ChevronDown aria-hidden="true" />
              </summary>
              <p>
                Tài sản đang được ghi nhận ở mức {condition.label}. Kết luận dựa
                trên việc kiểm tra {profile.conditionFocus} tại thời điểm lập
                hồ sơ.
              </p>
            </details>
            <details>
              <summary>
                <span>Tôi có thể xem tài sản trước phiên không?</span>
                <ChevronDown aria-hidden="true" />
              </summary>
              <p>
                Người đủ điều kiện có thể liên hệ SGDG để yêu cầu thêm hình ảnh
                hoặc đăng ký lịch xem tài sản tại khu vực {auction.region}.
              </p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
