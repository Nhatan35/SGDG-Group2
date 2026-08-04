import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CmsStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ARCHIVED";
export type CmsContentType =
  | "WEBSITE_PAGE"
  | "BLOG"
  | "NEWS"
  | "PR_POST"
  | "BANNER"
  | "AUCTION_GUIDE"
  | "ASSET_INTRO"
  | "SESSION_INTRO"
  | "POLICY"
  | "FAQ"
  | "KNOWLEDGE_BASE";
export interface CmsContent {
  id: string;
  title: string;
  slug: string;
  type: CmsContentType;
  category: string;
  status: CmsStatus;
  author: string;
  summary: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  featuredImage: string;
  updatedAt: string;
  publishedAt?: string;
  scheduledAt?: string;
  reviewComment?: string;
  sourceProposalId?: string;
  version: number;
}
export interface CmsMedia {
  id: string;
  name: string;
  type: "IMAGE" | "PDF" | "VIDEO";
  url: string;
  size: string;
  updatedAt: string;
}
export interface CmsCategory {
  id: string;
  name: string;
  parent?: string;
  order: number;
  active: boolean;
}
export interface CmsLivestream {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  embedUrl: string;
  thumbnail: string;
  startAt: string;
  endAt: string;
  access: "PUBLIC" | "PRIVATE" | "RANKING_MEMBER";
  chatEnabled: boolean;
  status: CmsStatus;
  replayUrl?: string;
}
interface CmsState {
  contents: CmsContent[];
  media: CmsMedia[];
  categories: CmsCategory[];
  livestreams: CmsLivestream[];
  saveContent: (item: CmsContent) => void;
  duplicateContent: (id: string) => void;
  setContentStatus: (id: string, status: CmsStatus, comment?: string) => void;
  archiveContent: (id: string) => void;
  deleteDraft: (id: string) => void;
  addMedia: (media: CmsMedia) => void;
  deleteMedia: (id: string) => void;
  saveCategory: (category: CmsCategory) => void;
  deleteCategory: (id: string) => void;
  saveLivestream: (item: CmsLivestream) => void;
  setReplay: (id: string, url: string) => void;
  deleteLivestream: (id: string) => void;
}
const contents: CmsContent[] = [
  {
    id: "CMS-001",
    title: "Hướng dẫn tham gia đấu giá trực tuyến",
    slug: "huong-dan-tham-gia-dau-gia",
    type: "AUCTION_GUIDE",
    category: "Hướng dẫn",
    status: "PUBLISHED",
    author: "Content Staff",
    summary: "Quy trình chuẩn bị và tham gia phiên đấu giá.",
    body: "Chuẩn bị hồ sơ KYC, đọc quy chế, hoàn tất điều kiện tài chính và theo dõi trạng thái đăng ký trước khi đặt giá.",
    seoTitle: "Hướng dẫn đấu giá trực tuyến | SGDG",
    seoDescription: "Hướng dẫn tham gia đấu giá trực tuyến tại SGDG.",
    keywords: "đấu giá, hướng dẫn, SGDG",
    featuredImage: "/assets/patek-nautilus-v2.png",
    updatedAt: "20/07/2026 09:15",
    publishedAt: "20/07/2026 10:00",
    version: 3,
  },
  {
    id: "CMS-002",
    title: "Thông báo lịch đấu giá tháng 8",
    slug: "lich-dau-gia-thang-8",
    type: "NEWS",
    category: "Tin tức",
    status: "PENDING_REVIEW",
    author: "Content Staff",
    summary: "Tổng hợp lịch phiên sắp diễn ra.",
    body: "Danh sách các phiên đấu giá dự kiến trong tháng 8 và thời hạn đăng ký tương ứng.",
    seoTitle: "Lịch đấu giá tháng 8",
    seoDescription: "Các phiên đấu giá nổi bật tháng 8.",
    keywords: "lịch đấu giá, tháng 8",
    featuredImage: "/assets/auction-hero-background-energy.png",
    updatedAt: "20/07/2026 14:30",
    version: 1,
  },
  {
    id: "CMS-003",
    title: "Chính sách bảo vệ dữ liệu",
    slug: "chinh-sach-bao-ve-du-lieu",
    type: "POLICY",
    category: "Chính sách",
    status: "SCHEDULED",
    author: "Content Staff",
    summary: "Phiên bản chính sách có hiệu lực từ tháng 8.",
    body: "Chính sách mô tả phạm vi xử lý dữ liệu, mục đích sử dụng và quyền của khách hàng.",
    seoTitle: "Chính sách bảo vệ dữ liệu",
    seoDescription: "Chính sách dữ liệu SGDG.",
    keywords: "chính sách, dữ liệu",
    featuredImage: "",
    updatedAt: "19/07/2026 16:20",
    scheduledAt: "01/08/2026 00:00",
    version: 2,
  },
  {
    id: "CMS-004",
    title: "Cách theo dõi trạng thái hoàn tiền",
    slug: "theo-doi-hoan-tien",
    type: "KNOWLEDGE_BASE",
    category: "Thanh toán",
    status: "CHANGES_REQUESTED",
    author: "Content Staff",
    summary: "Giải thích các trạng thái hoàn tiền.",
    body: "Khách hàng có thể theo dõi yêu cầu hoàn tiền trong tài khoản cá nhân.",
    seoTitle: "Theo dõi hoàn tiền",
    seoDescription: "Giải thích trạng thái hoàn tiền.",
    keywords: "hoàn tiền, trạng thái",
    featuredImage: "",
    updatedAt: "18/07/2026 11:00",
    reviewComment:
      "Bổ sung thời gian xử lý dự kiến và nguồn trạng thái từ Financial Management.",
    version: 2,
  },
];
const media: CmsMedia[] = [
  {
    id: "MED-001",
    name: "auction-guide-cover.jpg",
    type: "IMAGE",
    url: "/assets/auction-hero-background-energy.png",
    size: "1.8 MB",
    updatedAt: "20/07/2026",
  },
  {
    id: "MED-002",
    name: "quy-che-dau-gia.pdf",
    type: "PDF",
    url: "#",
    size: "640 KB",
    updatedAt: "19/07/2026",
  },
  {
    id: "MED-003",
    name: "intro-session.mp4",
    type: "VIDEO",
    url: "#",
    size: "18.4 MB",
    updatedAt: "18/07/2026",
  },
];
const categories: CmsCategory[] = [
  { id: "CAT-01", name: "Tin tức", order: 1, active: true },
  { id: "CAT-02", name: "Hướng dẫn", order: 2, active: true },
  { id: "CAT-03", name: "Chính sách", order: 3, active: true },
  {
    id: "CAT-04",
    name: "Thanh toán",
    parent: "Knowledge Base",
    order: 1,
    active: true,
  },
  {
    id: "CAT-05",
    name: "Bàn giao",
    parent: "Knowledge Base",
    order: 2,
    active: true,
  },
];
const livestreams: CmsLivestream[] = [
  {
    id: "LIVE-CMS-01",
    title: "Giới thiệu phiên Patek Philippe 5711R",
    description: "Nội dung giới thiệu tài sản và quy trình tham gia.",
    youtubeUrl: "https://youtube.com/watch?v=demo5711r",
    embedUrl: "https://youtube.com/embed/demo5711r",
    thumbnail: "/assets/auction-hero-background-energy.png",
    startAt: "2026-07-28T19:00",
    endAt: "2026-07-28T20:00",
    access: "PUBLIC",
    chatEnabled: true,
    status: "PENDING_REVIEW",
  },
  {
    id: "LIVE-CMS-02",
    title: "Replay: Nghệ thuật sưu tầm đồng hồ",
    description: "Nội dung phát lại đã được duyệt.",
    youtubeUrl: "https://youtube.com/watch?v=replay",
    embedUrl: "https://youtube.com/embed/replay",
    thumbnail: "/assets/patek-nautilus-v2.png",
    startAt: "2026-07-10T19:00",
    endAt: "2026-07-10T20:00",
    access: "PUBLIC",
    chatEnabled: false,
    status: "PUBLISHED",
    replayUrl: "https://youtube.com/watch?v=replay",
  },
];
export const useCmsStore = create<CmsState>()(
  persist(
    (set) => ({
      contents,
      media,
      categories,
      livestreams,
      saveContent: (item) =>
        set((s) => ({
          contents: s.contents.some((x) => x.id === item.id)
            ? s.contents.map((x) => (x.id === item.id ? item : x))
            : [item, ...s.contents],
        })),
      duplicateContent: (id) =>
        set((s) => {
          const x = s.contents.find((i) => i.id === id);
          return x
            ? {
                contents: [
                  {
                    ...x,
                    id: `CMS-${Date.now()}`,
                    title: `Bản sao - ${x.title}`,
                    slug: `${x.slug}-copy`,
                    status: "DRAFT",
                    version: 1,
                    publishedAt: undefined,
                  },
                  ...s.contents,
                ],
              }
            : s;
        }),
      setContentStatus: (id, status, comment) =>
        set((s) => ({
          contents: s.contents.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status,
                  reviewComment: comment,
                  updatedAt: new Date().toLocaleString("vi-VN"),
                  version: x.version + 1,
                }
              : x,
          ),
        })),
      archiveContent: (id) =>
        set((s) => ({
          contents: s.contents.map((x) =>
            x.id === id ? { ...x, status: "ARCHIVED" } : x,
          ),
        })),
      deleteDraft: (id) =>
        set((s) => ({
          contents: s.contents.filter(
            (x) => x.id !== id || x.status !== "DRAFT",
          ),
        })),
      addMedia: (item) => set((s) => ({ media: [item, ...s.media] })),
      deleteMedia: (id) =>
        set((s) => ({ media: s.media.filter((x) => x.id !== id) })),
      saveCategory: (item) =>
        set((s) => ({
          categories: s.categories.some((x) => x.id === item.id)
            ? s.categories.map((x) => (x.id === item.id ? item : x))
            : [...s.categories, item],
        })),
      deleteCategory: (id) =>
        set((s) => ({ categories: s.categories.filter((x) => x.id !== id) })),
      saveLivestream: (item) =>
        set((s) => ({
          livestreams: s.livestreams.some((x) => x.id === item.id)
            ? s.livestreams.map((x) => (x.id === item.id ? item : x))
            : [item, ...s.livestreams],
        })),
      deleteLivestream: (id) =>
        set((s) => ({ livestreams: s.livestreams.filter((x) => x.id !== id) })),
      setReplay: (id, url) =>
        set((s) => ({
          livestreams: s.livestreams.map((x) =>
            x.id === id ? { ...x, replayUrl: url, status: "PUBLISHED" } : x,
          ),
        })),
    }),
    { name: "sgdg-cms-demo" },
  ),
);
