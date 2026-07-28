import type { AuctionSummary, AuctionStatus } from "../../types/domain";

export interface Auction extends AuctionSummary {
  category: string;
  region: string;
  image: string;
  startPrice: number;
  startsAt: string;
  registrationDeadline: string;
  eligible: boolean;
  autoBid: boolean;
  description: string;
  cancellationNotice?: string;
  postedBy?: { type: "PLATFORM" | "MEMBER"; name?: string };
}

export const auctionCategories = [
  "Đồng hồ",
  "Trang sức",
  "Điện thoại",
  "Xe cộ",
  "Nghệ thuật",
  "Đồ cổ",
  "Thời trang",
  "Đồ sưu tầm",
  "Bất động sản",
] as const;

type AuctionCategory = (typeof auctionCategories)[number];

interface ProductSeed {
  id?: string;
  name: string;
  startPrice?: number;
  currentPrice?: number;
  minimumIncrement?: number;
  status?: AuctionStatus;
  cancellationNotice?: string;
}

interface CategoryConfig {
  category: AuctionCategory;
  slug: string;
  basePrice: number;
  priceStep: number;
  incrementRate: number;
  regions: string[];
  description: string;
  products: ProductSeed[];
}

const featuredProductImages: Record<string, string> = {
  "rolex-126610lv": "/assets/featured-rolex-v2.png",
  "patek-nautilus": "/assets/patek-nautilus-v2.png",
  "diamond-gia": "/assets/diamond-gia-v2.png",
  "iphone-15-pro": "/assets/catalog-iphone-15-pro.png",
  "mercedes-s450": "/assets/catalog-mercedes-s450.png",
  "painting-dalat": "/assets/catalog-dalat-painting.png",
  "hermes-birkin": "/assets/catalog-hermes-birkin.png",
  "antique-01": "/assets/catalog-antique-01-hd.png",
  "collectible-01": "/assets/catalog-collectible-01-hd.png",
  "real-estate-01": "/assets/catalog-real-estate-01-hd.png",
  "jewelry-02": "/assets/catalog-jewelry-02-hd.png",
  "watch-07": "/assets/catalog-watch-07-hd.png",
  "jewelry-07": "/assets/catalog-jewelry-07-hd.png",
  "phone-07": "/assets/catalog-phone-07-hd.png",
  "vehicle-07": "/assets/catalog-vehicle-07-hd.png",
  "art-07": "/assets/catalog-art-07-hd.png",
};

const statusPattern: AuctionStatus[] = [
  "LIVE",
  "LIVE",
  "REGISTRATION_OPEN",
  "REGISTRATION_OPEN",
  "PUBLISHED",
  "PUBLISHED",
  "CLOSED",
  "COMPLETED",
  "CANCELLED",
  "PUBLISHED",
  "REGISTRATION_OPEN",
  "LIVE",
  "CLOSED",
  "PUBLISHED",
  "REGISTRATION_OPEN",
  "COMPLETED",
  "PUBLISHED",
  "LIVE",
  "REGISTRATION_OPEN",
  "CLOSED",
];

const priceMultipliers = [
  1, 1.18, 0.72, 1.45, 0.86, 1.72, 2.15, 0.58, 1.34, 0.94, 1.08, 1.56, 0.66,
  1.88, 1.24, 0.8, 2.35, 1.12, 1.64, 0.9,
];

const categoryConfigs: CategoryConfig[] = [
  {
    category: "Đồng hồ",
    slug: "watch",
    basePrice: 180_000_000,
    priceStep: 28_000_000,
    incrementRate: 0.014,
    regions: ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng"],
    description:
      "Đồng hồ được kiểm định tình trạng, số series và hồ sơ nguồn gốc trước khi công bố phiên.",
    products: [
      {
        id: "rolex-126610lv",
        name: "Rolex Submariner Date 126610LV",
        startPrice: 380_000_000,
        currentPrice: 450_000_000,
        minimumIncrement: 5_000_000,
        status: "LIVE",
      },
      {
        id: "patek-nautilus",
        name: "Patek Philippe Nautilus 5711/1R",
        startPrice: 2_900_000_000,
        currentPrice: 3_250_000_000,
        minimumIncrement: 25_000_000,
        status: "LIVE",
      },
      {
        id: "vintage-watch",
        name: "Omega Speedmaster Vintage 1969",
        startPrice: 220_000_000,
        status: "REGISTRATION_OPEN",
      },
      { name: "Audemars Piguet Royal Oak 15500ST" },
      { name: "Vacheron Constantin Overseas Blue Dial" },
      { name: "Cartier Santos de Cartier Large" },
      { name: "IWC Portugieser Chronograph" },
      { name: "Jaeger-LeCoultre Reverso Tribute" },
      { name: "Tudor Black Bay Fifty-Eight Bronze" },
      { name: "Grand Seiko Snowflake SBGA211" },
      { name: "Hublot Big Bang Unico Titanium" },
      { name: "Panerai Luminor Marina PAM01312" },
      { name: "Zenith Chronomaster El Primero" },
      { name: "Breitling Navitimer B01" },
      { name: "TAG Heuer Monaco Gulf Edition" },
      { name: "Longines Legend Diver Bronze" },
      { name: "Oris Aquis Date Calibre 400" },
      { name: "Nomos Tangente Neomatik" },
      { name: "Chopard Alpine Eagle XL" },
      { name: "Breguet Classique 5177" },
    ],
  },
  {
    category: "Trang sức",
    slug: "jewelry",
    basePrice: 95_000_000,
    priceStep: 18_000_000,
    incrementRate: 0.018,
    regions: ["Đà Nẵng", "TP. Hồ Chí Minh", "Hà Nội"],
    description:
      "Trang sức có chứng thư thẩm định, biên bản kiểm tra tình trạng và thông tin vật liệu.",
    products: [
      {
        id: "diamond-gia",
        name: "Nhẫn kim cương 3.01ct D IF GIA",
        startPrice: 680_000_000,
        status: "REGISTRATION_OPEN",
      },
      {
        id: "diamond-pendant-cancelled",
        name: "Mặt dây kim cương cổ điển",
        startPrice: 145_000_000,
        status: "CANCELLED",
        cancellationNotice:
          "Phiên được hủy trước giờ mở do cập nhật hồ sơ tài sản.",
      },
      { name: "Vòng cổ sapphire xanh hoàng gia" },
      { name: "Đôi hoa tai emerald Colombia" },
      { name: "Lắc tay ruby Burmese cổ điển" },
      { name: "Nhẫn vàng trắng kim cương Halo" },
      { name: "Bộ trang sức ngọc trai Akoya" },
      { name: "Mặt dây tourmaline Paraiba" },
      { name: "Nhẫn cưới platinum pavé" },
      { name: "Dây chuyền vàng Ý 18K" },
      { name: "Vòng tay Cartier Love 18K" },
      { name: "Bông tai Chopard Happy Diamonds" },
      { name: "Nhẫn Tanzanite Oval Cut" },
      { name: "Vòng cổ ruby và kim cương" },
      { name: "Bộ charm vàng hồng cao cấp" },
      { name: "Nhẫn aquamarine cushion cut" },
      { name: "Kiềng vàng truyền thống 24K" },
      { name: "Trâm cài áo vintage diamond" },
      { name: "Dây chuyền emerald Art Deco" },
      { name: "Nhẫn solitaire 2.2ct GIA" },
    ],
  },
  {
    category: "Điện thoại",
    slug: "phone",
    basePrice: 14_000_000,
    priceStep: 2_800_000,
    incrementRate: 0.035,
    regions: ["Hà Nội", "TP. Hồ Chí Minh", "Cần Thơ"],
    description:
      "Thiết bị nguyên bản, có biên bản kiểm tra ngoại hình, pin, linh kiện và phụ kiện kèm theo.",
    products: [
      {
        id: "iphone-15-pro",
        name: "iPhone 15 Pro Max 512GB Titanium",
        startPrice: 28_000_000,
        status: "PUBLISHED",
      },
      { name: "Samsung Galaxy S25 Ultra 1TB" },
      { name: "Google Pixel 10 Pro Fold" },
      { name: "Xiaomi 15 Ultra Photography Kit" },
      { name: "OPPO Find X8 Pro Ceramic" },
      { name: "Vivo X200 Pro Zeiss Edition" },
      { name: "Sony Xperia 1 VI Creator Set" },
      { name: "Asus ROG Phone 9 Pro" },
      { name: "Huawei Mate XT Ultimate" },
      { name: "OnePlus 13 Hasselblad Green" },
      { name: "iPhone 14 Pro Max Deep Purple" },
      { name: "Samsung Z Fold6 Navy 512GB" },
      { name: "Honor Magic V3 Black" },
      { name: "Nothing Phone 3 Collector Kit" },
      { name: "Motorola Razr 50 Ultra" },
      { name: "Realme GT7 Pro Racing Edition" },
      { name: "Nubia RedMagic 10 Pro" },
      { name: "Meizu 21 Pro Titanium" },
      { name: "Sharp Aquos R9 Pro Leica" },
      { name: "iPhone SE Prototype Collector" },
    ],
  },
  {
    category: "Xe cộ",
    slug: "vehicle",
    basePrice: 520_000_000,
    priceStep: 95_000_000,
    incrementRate: 0.012,
    regions: ["TP. Hồ Chí Minh", "Hà Nội", "Bình Dương"],
    description:
      "Xe đã được kiểm tra pháp lý, lịch sử bảo dưỡng, đăng kiểm và tình trạng vận hành.",
    products: [
      {
        id: "mercedes-s450",
        name: "Mercedes-Benz S450L Luxury 2022",
        startPrice: 1_980_000_000,
        status: "REGISTRATION_OPEN",
      },
      { name: "Porsche 911 Carrera S 2020" },
      { name: "BMW 740Li Pure Excellence" },
      { name: "Lexus LX600 Urban Edition" },
      { name: "Range Rover Autobiography 2021" },
      { name: "Tesla Model S Plaid 2024" },
      { name: "Audi Q8 e-tron S Line" },
      { name: "Toyota Land Cruiser VX" },
      { name: "Ford Mustang GT Premium" },
      { name: "Mini Cooper S Convertible" },
      { name: "VinFast VF9 Plus AWD" },
      { name: "Mercedes-AMG G63 Edition" },
      { name: "Honda Gold Wing Tour DCT" },
      { name: "Ducati Panigale V4 S" },
      { name: "Vespa 946 Christian Dior" },
      { name: "Yamaha YZF-R1M Track Set" },
      { name: "Harley-Davidson Fat Boy 114" },
      { name: "Bentley Continental GT V8" },
      { name: "Maserati Levante Trofeo" },
      { name: "Kia Carnival Signature 2024" },
    ],
  },
  {
    category: "Nghệ thuật",
    slug: "art",
    basePrice: 48_000_000,
    priceStep: 12_000_000,
    incrementRate: 0.025,
    regions: ["Đà Lạt", "Hà Nội", "Huế"],
    description:
      "Tác phẩm có hồ sơ thẩm định, thông tin xuất xứ, chất liệu và tình trạng bảo quản.",
    products: [
      {
        id: "painting-dalat",
        name: "Tranh sơn dầu Phong cảnh Đà Lạt",
        startPrice: 85_000_000,
        currentPrice: 120_000_000,
        status: "CLOSED",
      },
      { name: "Sơn mài Sen Đêm khổ lớn" },
      { name: "Tranh lụa Thiếu nữ bên hồ" },
      { name: "Tượng đồng Người gánh nước" },
      { name: "Bộ ký họa phố cổ Hà Nội" },
      { name: "Tranh acrylic Biển sáng" },
      { name: "Tác phẩm gốm nghệ thuật Raku" },
      { name: "Ảnh fine art Sài Gòn 1975" },
      { name: "Tranh thủy mặc Núi mây" },
      { name: "Điêu khắc gỗ Mẹ và con" },
      { name: "Tranh trừu tượng Dòng chảy" },
      { name: "Bộ tranh tứ bình mùa xuân" },
      { name: "Sơn dầu Chợ nổi Cái Răng" },
      { name: "Tượng đá cẩm thạch nhỏ" },
      { name: "Tranh Đông Hồ bản giới hạn" },
      { name: "Canvas Đường phố mưa" },
      { name: "Tác phẩm mixed media Đô thị" },
      { name: "Bình phong vẽ tay sáu tấm" },
      { name: "Tranh chân dung than chì" },
      { name: "Phác thảo kiến trúc Đông Dương" },
    ],
  },
  {
    category: "Đồ cổ",
    slug: "antique",
    basePrice: 36_000_000,
    priceStep: 8_000_000,
    incrementRate: 0.03,
    regions: ["Huế", "Hà Nội", "Nam Định"],
    description:
      "Đồ cổ có hồ sơ nguồn gốc, biên bản tình trạng và khuyến nghị bảo quản đi kèm.",
    products: [
      { name: "Bình gốm men lam triều Nguyễn" },
      { name: "Bình sứ ký kiểu thế kỷ XIX" },
      { name: "Chóe gốm cổ Biên Hòa" },
      { name: "Tượng Phật gỗ sơn son" },
      { name: "Bộ ấm trà tử sa cổ" },
      { name: "Đĩa pháp lam Huế hoa sen" },
      { name: "Hộp trầu bạc chạm rồng" },
      { name: "Bình đồng khảm tam khí" },
      { name: "Bộ tiền xu Đông Dương" },
      { name: "Quạt giấy cung đình Huế" },
      { name: "Tủ chè gỗ gụ Bắc Bộ" },
      { name: "Đèn dầu Pháp cổ" },
      { name: "Bình vôi men rạn" },
      { name: "Khánh đồng chạm mây" },
      { name: "Tráp gỗ khảm trai cổ" },
      { name: "Lọ độc bình men ngọc" },
      { name: "Bộ đĩa sứ hoa lam" },
      { name: "Rương gỗ lim cổ" },
      { name: "Ấn đồng triện thư" },
      { name: "Bình phong cổ khảm ốc" },
    ],
  },
  {
    category: "Thời trang",
    slug: "fashion",
    basePrice: 58_000_000,
    priceStep: 11_000_000,
    incrementRate: 0.025,
    regions: ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"],
    description:
      "Tài sản thời trang được xác thực thương hiệu, mô tả chất liệu và tình trạng sử dụng.",
    products: [
      {
        id: "hermes-birkin",
        name: "Hermès Birkin 30 Togo Gold",
        startPrice: 590_000_000,
        status: "PUBLISHED",
      },
      { name: "Chanel Classic Flap Lambskin" },
      { name: "Louis Vuitton Capucines MM" },
      { name: "Dior Lady Dior Cannage" },
      { name: "Gucci Bamboo 1947 Top Handle" },
      { name: "Prada Galleria Saffiano" },
      { name: "Fendi Peekaboo Selleria" },
      { name: "Celine Triomphe Shoulder Bag" },
      { name: "Bottega Veneta Cabat Tote" },
      { name: "Balenciaga Hourglass Croc" },
      { name: "Rolex x Supreme Jacket Archive" },
      { name: "Hermès Silk Scarf Collection" },
      { name: "Chanel Tweed Jacket Vintage" },
      { name: "Dior Saddle Bag Oblique" },
      { name: "Louis Vuitton Trunk Soft" },
      { name: "YSL Le 5 à 7 Patent" },
      { name: "Burberry Trench Heritage" },
      { name: "Moncler Genius Down Jacket" },
      { name: "Rimowa x Off-White Cabin" },
      { name: "Nike Air Dior High" },
    ],
  },
  {
    category: "Đồ sưu tầm",
    slug: "collectible",
    basePrice: 24_000_000,
    priceStep: 5_500_000,
    incrementRate: 0.035,
    regions: ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng"],
    description:
      "Vật phẩm sưu tầm có hồ sơ xác thực, tình trạng bảo quản và số lượng phát hành rõ ràng.",
    products: [
      { name: "Máy ảnh Leica M6 Titanium" },
      { name: "Bộ tem Đông Dương 1931" },
      { name: "Tượng Bearbrick 1000% Artist" },
      { name: "Thẻ bóng rổ rookie graded" },
      { name: "Đĩa than The Beatles first press" },
      { name: "Bút Montblanc Writers Edition" },
      { name: "Mô hình Ferrari 1:8 Limited" },
      { name: "Bộ truyện tranh bản in đầu" },
      { name: "Máy chơi game Nintendo Famicom" },
      { name: "Bộ quân cờ Staunton cổ" },
      { name: "Zippo Vietnam War Collection" },
      { name: "Poster phim Việt Nam thập niên 80" },
      { name: "Huy chương thể thao SEA Games" },
      { name: "Robot tin toy Nhật Bản" },
      { name: "Bộ card Pokémon PSA cao cấp" },
      { name: "Ống kính Leica Summilux 35mm" },
      { name: "Bộ mô hình Gundam Perfect Grade" },
      { name: "Sách ảnh Sài Gòn bản giới hạn" },
      { name: "Bộ tiền giấy polymer lỗi in" },
      { name: "Đồng hồ để bàn Jaeger vintage" },
    ],
  },
  {
    category: "Bất động sản",
    slug: "real-estate",
    basePrice: 2_400_000_000,
    priceStep: 420_000_000,
    incrementRate: 0.008,
    regions: ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng"],
    description:
      "Bất động sản có hồ sơ pháp lý, vị trí, diện tích và tình trạng tài sản được mô phỏng rõ ràng.",
    products: [
      { name: "Căn hộ 2PN Thảo Điền River View" },
      { name: "Nhà phố Quận 3 hẻm xe hơi" },
      { name: "Biệt thự nghỉ dưỡng Hồ Tràm" },
      { name: "Shophouse trung tâm Đà Nẵng" },
      { name: "Đất nền ven biển Phú Quốc" },
      { name: "Penthouse West Lake Panorama" },
      { name: "Căn hộ studio Bình Thạnh" },
      { name: "Nhà vườn Đà Lạt view thông" },
      { name: "Kho xưởng Bình Dương 1.200m2" },
      { name: "Mặt bằng thương mại Quận 1" },
      { name: "Nhà phố Hội An gần sông" },
      { name: "Căn hộ duplex Sala Đại Quang Minh" },
      { name: "Đất thổ cư Long Thành" },
      { name: "Biệt thự song lập Ecopark" },
      { name: "Căn hộ biển Nha Trang tầng cao" },
      { name: "Nhà phố liền kề Vạn Phúc" },
      { name: "Lô đất nghỉ dưỡng Bảo Lộc" },
      { name: "Office-tel Phú Mỹ Hưng" },
      { name: "Căn hộ 3PN Landmark view sông" },
      { name: "Khu homestay Mộc Châu" },
    ],
  },
];

function createAuction(
  config: CategoryConfig,
  product: ProductSeed,
  itemIndex: number,
  categoryIndex: number,
): Auction {
  const status =
    product.status ?? statusPattern[itemIndex % statusPattern.length];
  const startPrice =
    product.startPrice ??
    roundMoney(
      config.basePrice * priceMultipliers[itemIndex % priceMultipliers.length] +
        config.priceStep * itemIndex,
    );
  const minimumIncrement =
    product.minimumIncrement ??
    roundMoney(Math.max(500_000, startPrice * config.incrementRate), 500_000);
  const currentPrice =
    product.currentPrice ??
    (isSettledOrLive(status)
      ? startPrice + minimumIncrement * (4 + ((itemIndex + categoryIndex) % 9))
      : startPrice);
  const schedule = scheduleFor(status, itemIndex, product.id);
  const participantCount = 12 + ((itemIndex * 7 + categoryIndex * 11) % 116);
  const acceptedBidCount = isSettledOrLive(status)
    ? Math.max(8, Math.round(participantCount * 0.36))
    : 0;
  const auctionId =
    product.id ?? `${config.slug}-${String(itemIndex + 1).padStart(2, "0")}`;

  return {
    id: auctionId,
    code: codeFor(categoryIndex, itemIndex),
    assetName: product.name,
    category: config.category,
    region: config.regions[itemIndex % config.regions.length],
    image:
      featuredProductImages[auctionId] ??
      `/assets/catalog-generated/${config.slug}-${String(itemIndex + 1).padStart(2, "0")}.jpg`,
    status,
    startPrice,
    currentPrice,
    minimumIncrement,
    participantCount,
    watcherCount: participantCount * (4 + (itemIndex % 5)) + 38,
    acceptedBidCount,
    heatScore: Math.min(98, 42 + ((itemIndex * 5 + categoryIndex * 7) % 54)),
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    registrationDeadline: schedule.registrationDeadline,
    eligible: itemIndex % 3 !== 1,
    autoBid: itemIndex % 4 !== 0,
    postedBy:
      itemIndex % 5 === 0
        ? {
            type: "MEMBER",
            name: ["Minh Anh", "Gia Bảo", "Hoàng Nam"][categoryIndex % 3],
          }
        : { type: "PLATFORM" },
    description: config.description,
    cancellationNotice: product.cancellationNotice,
  };
}

function codeFor(categoryIndex: number, itemIndex: number) {
  return `SGD-${260700 + categoryIndex + 17}-${String(itemIndex + 1).padStart(3, "0")}`;
}

function roundMoney(value: number, unit = 1_000_000) {
  return Math.round(value / unit) * unit;
}

function isSettledOrLive(status: AuctionStatus) {
  return status === "LIVE" || status === "CLOSED" || status === "COMPLETED";
}

function scheduleFor(status: AuctionStatus, index: number, id?: string) {
  if (id === "rolex-126610lv") {
    return {
      startsAt: "2026-07-18T09:00:00.000Z",
      endsAt: "2026-07-18T10:42:00.000Z",
      registrationDeadline: "2026-07-17T10:00:00.000Z",
    };
  }
  if (id === "patek-nautilus") {
    return {
      startsAt: "2026-07-18T08:00:00.000Z",
      endsAt: "2026-07-18T11:15:00.000Z",
      registrationDeadline: "2026-07-17T10:00:00.000Z",
    };
  }

  const base =
    status === "CLOSED" || status === "COMPLETED"
      ? Date.UTC(2026, 6, 16 + (index % 2), 9 + (index % 5), 0, 0)
      : status === "LIVE"
        ? Date.UTC(2026, 6, 18, 10 + (index % 3), 0, 0)
        : Date.UTC(2026, 6, 19 + (index % 10), 9 + (index % 7), 0, 0);
  const durationMinutes = status === "LIVE" ? 180 + (index % 4) * 15 : 60;
  const startsAt = new Date(base);
  const endsAt = new Date(base + durationMinutes * 60_000);
  const registrationDeadline = new Date(base - 12 * 60 * 60_000);

  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    registrationDeadline: registrationDeadline.toISOString(),
  };
}

export const auctions: Auction[] = Array.from({ length: 20 }, (_, itemIndex) =>
  categoryConfigs.map((config, categoryIndex) =>
    createAuction(config, config.products[itemIndex], itemIndex, categoryIndex),
  ),
).flat();

export const catalogAuctions: Auction[] = auctions;

export async function listAuctions(status?: AuctionStatus) {
  await Promise.resolve();
  return status
    ? auctions.filter((auction) => auction.status === status)
    : auctions;
}

export async function getAuction(id: string) {
  await Promise.resolve();
  return auctions.find((auction) => auction.id === id);
}
