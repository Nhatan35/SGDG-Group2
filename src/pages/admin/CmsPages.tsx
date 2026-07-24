import {
  Archive,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  FileText,
  Filter,
  FolderTree,
  Image,
  Link2,
  Pencil,
  PlayCircle,
  Plus,
  Radio,
  Search,
  Send,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { useSupportStore } from "../../store/supportStore";
import {
  type CmsContent,
  type CmsContentType,
  type CmsLivestream,
  type CmsStatus,
  useCmsStore,
} from "../../store/cmsStore";

const statusLabels: Record<CmsStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt",
  CHANGES_REQUESTED: "Cần chỉnh sửa",
  SCHEDULED: "Đã lên lịch",
  PUBLISHED: "Đã xuất bản",
  ARCHIVED: "Đã lưu trữ",
};
const typeLabels: Record<CmsContentType, string> = {
  WEBSITE_PAGE: "Website Page",
  BLOG: "Blog",
  NEWS: "Tin tức",
  PR_POST: "PR Post",
  BANNER: "Banner",
  AUCTION_GUIDE: "Hướng dẫn đấu giá",
  ASSET_INTRO: "Giới thiệu tài sản",
  SESSION_INTRO: "Giới thiệu phiên",
  POLICY: "Chính sách",
  FAQ: "FAQ",
  KNOWLEDGE_BASE: "Knowledge Base",
};
function tone(status: CmsStatus) {
  return status === "PUBLISHED"
    ? "success"
    : status === "PENDING_REVIEW"
      ? "warning"
      : status === "CHANGES_REQUESTED"
        ? "danger"
        : status === "SCHEDULED"
          ? "info"
          : ("neutral" as const);
}
function CmsHeader({
  title,
  intro,
  action,
}: {
  title: string;
  intro: string;
  action?: ReactNode;
}) {
  return (
    <>
      <nav className="cms-breadcrumb">
        <Link to="/cms">CMS</Link>
        <ChevronRight />
        <span>{title}</span>
      </nav>
      <header className="cms-page-header">
        <div>
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        {action}
      </header>
    </>
  );
}
function Toast({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="cms-toast" role="status">
      <Check />
      {text}
      <button onClick={onClose} aria-label="Đóng">
        <X />
      </button>
    </div>
  );
}
export function CmsDashboardPage() {
  const contents = useCmsStore((s) => s.contents),
    live = useCmsStore((s) => s.livestreams);
  const counts = (s: CmsStatus) =>
    contents.filter((x) => x.status === s).length;
  return (
    <>
      <CmsHeader
        title="CMS Dashboard"
        intro="Tổng quan nội dung, lịch xuất bản và livestream."
        action={
          <div className="cms-header-actions">
            <Link className="button secondary" to="/cms/media">
              <Upload />
              Tải media
            </Link>
            <Link className="button primary" to="/cms/contents/new">
              <Plus />
              Tạo nội dung
            </Link>
          </div>
        }
      />
      <div className="cms-kpis">
        {(
          [
            ["Tổng nội dung", contents.length, FileText],
            ["Bản nháp", counts("DRAFT"), Pencil],
            ["Chờ duyệt", counts("PENDING_REVIEW"), Clock3],
            ["Đã xuất bản", counts("PUBLISHED"), Check],
            ["Đã lưu trữ", counts("ARCHIVED"), Archive],
            [
              "Livestream sắp tới",
              live.filter((x) => x.status !== "PUBLISHED").length,
              Radio,
            ],
            ["Đang hoạt động", 0, Video],
            [
              "Replay chờ cập nhật",
              live.filter((x) => x.status === "PUBLISHED" && !x.replayUrl)
                .length,
              PlayCircle,
            ],
          ] satisfies Array<[string, number, LucideIcon]>
        ).map(([label, value, Icon]) => (
          <article key={String(label)}>
            <Icon />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="cms-dashboard-grid">
        <section className="cms-card">
          <h2>Nội dung theo loại</h2>
          {Object.entries(typeLabels)
            .slice(0, 6)
            .map(([key, label]) => (
              <div className="cms-chart-row" key={key}>
                <span>{label}</span>
                <i>
                  <b
                    style={{
                      width: `${Math.max(12, contents.filter((x) => x.type === key).length * 28)}%`,
                    }}
                  />
                </i>
                <strong>{contents.filter((x) => x.type === key).length}</strong>
              </div>
            ))}
        </section>
        <section className="cms-card">
          <h2>Hoạt động gần đây</h2>
          {contents.slice(0, 4).map((x) => (
            <div className="cms-activity" key={x.id}>
              <Clock3 />
              <div>
                <strong>{x.title}</strong>
                <span>
                  {statusLabels[x.status]} · {x.updatedAt}
                </span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
export function ContentListPage() {
  const contents = useCmsStore((s) => s.contents),
    duplicate = useCmsStore((s) => s.duplicateContent),
    setStatus = useCmsStore((s) => s.setContentStatus),
    archive = useCmsStore((s) => s.archiveContent),
    deleteDraft = useCmsStore((s) => s.deleteDraft);
  const [query, setQuery] = useState(""),
    [status, setFilter] = useState("ALL"),
    [selected, setSelected] = useState<string[]>([]),
    [toast, setToast] = useState("");
  const rows = contents.filter(
    (x) =>
      (status === "ALL" || x.status === status) &&
      `${x.title} ${x.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  const act = (text: string, fn: () => void) => {
    fn();
    setToast(text);
  };
  return (
    <>
      <CmsHeader
        title="Quản lý nội dung"
        intro="Tạo, biên tập và theo dõi toàn bộ vòng đời nội dung."
        action={
          <Link className="button primary" to="/cms/contents/new">
            <Plus />
            Tạo nội dung
          </Link>
        }
      />
      <div className="cms-toolbar">
        <Search />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tiêu đề hoặc danh mục"
        />
        <select value={status} onChange={(e) => setFilter(e.target.value)}>
          <option value="ALL">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option value={k} key={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="button secondary">
          <Filter />
          Bộ lọc nâng cao
        </button>
      </div>
      {selected.length > 0 && (
        <div className="cms-bulk">
          <strong>{selected.length} nội dung đã chọn</strong>
          <button
            onClick={() => {
              selected.forEach(archive);
              setSelected([]);
            }}
          >
            Lưu trữ
          </button>
        </div>
      )}
      <div className="cms-table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  onChange={(e) =>
                    setSelected(e.target.checked ? rows.map((x) => x.id) : [])
                  }
                />
              </th>
              <th>Nội dung</th>
              <th>Danh mục / Loại</th>
              <th>Trạng thái</th>
              <th>Tác giả</th>
              <th>Cập nhật</th>
              <th>Xuất bản</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(x.id)}
                    onChange={() =>
                      setSelected((s) =>
                        s.includes(x.id)
                          ? s.filter((i) => i !== x.id)
                          : [...s, x.id],
                      )
                    }
                  />
                </td>
                <td>
                  <div className="cms-content-cell">
                    <span className="cms-thumb">
                      {x.featuredImage ? (
                        <img src={x.featuredImage} />
                      ) : (
                        <FileText />
                      )}
                    </span>
                    <div>
                      <strong>{x.title}</strong>
                      <small>
                        {x.id} · v{x.version}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  {x.category}
                  <small>{typeLabels[x.type]}</small>
                </td>
                <td>
                  <Badge tone={tone(x.status)}>{statusLabels[x.status]}</Badge>
                </td>
                <td>{x.author}</td>
                <td>{x.updatedAt}</td>
                <td>{x.publishedAt || x.scheduledAt || "—"}</td>
                <td>
                  <div className="cms-row-actions">
                    <Link title="Xem" to={`/content/${x.slug}`}>
                      <Eye />
                    </Link>
                    <Link title="Sửa" to={`/cms/contents/${x.id}/edit`}>
                      <Pencil />
                    </Link>
                    <button
                      title="Nhân bản"
                      onClick={() =>
                        act("Đã tạo bản sao", () => duplicate(x.id))
                      }
                    >
                      <Copy />
                    </button>
                    {x.status === "DRAFT" ||
                    x.status === "CHANGES_REQUESTED" ? (
                      <button
                        title="Gửi duyệt"
                        onClick={() =>
                          act("Đã gửi phê duyệt", () =>
                            setStatus(x.id, "PENDING_REVIEW"),
                          )
                        }
                      >
                        <Send />
                      </button>
                    ) : null}
                    <button
                      title="Lưu trữ"
                      onClick={() => act("Đã lưu trữ", () => archive(x.id))}
                    >
                      <Archive />
                    </button>
                    {x.status === "DRAFT" && (
                      <button
                        title="Xóa bản nháp"
                        onClick={() =>
                          act("Đã xóa bản nháp", () => deleteDraft(x.id))
                        }
                      >
                        <Trash2 />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="cms-empty">Không có nội dung phù hợp bộ lọc.</div>
        )}
      </div>
      <nav className="cms-pagination">
        <button disabled>Trước</button>
        <button className="active">1</button>
        <button>2</button>
        <button>Sau</button>
      </nav>
      {toast && <Toast text={toast} onClose={() => setToast("")} />}
    </>
  );
}
function blankContent(type: CmsContentType = "NEWS"): CmsContent {
  return {
    id: `CMS-${Date.now()}`,
    title: "",
    slug: "",
    type,
    category: "Tin tức",
    status: "DRAFT",
    author: "Content Staff",
    summary: "",
    body: "",
    seoTitle: "",
    seoDescription: "",
    keywords: "",
    featuredImage: "",
    updatedAt: new Date().toLocaleString("vi-VN"),
    version: 1,
  };
}
export function ContentEditorPage() {
  const [params] = useSearchParams();
  const { contentId } = useParams(),
    navigate = useNavigate(),
    items = useCmsStore((s) => s.contents),
    save = useCmsStore((s) => s.saveContent),
    setStatus = useCmsStore((s) => s.setContentStatus);
  const existing = items.find((x) => x.id === contentId);
  const [form, setForm] = useState<CmsContent>(
      existing ??
        blankContent((params.get("type") as CmsContentType) || "NEWS"),
    ),
    [toast, setToast] = useState("");
  const update = <K extends keyof CmsContent>(key: K, value: CmsContent[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const persist = (submit = false) => {
    const next = {
      ...form,
      status: submit ? "PENDING_REVIEW" : form.status,
      updatedAt: new Date().toLocaleString("vi-VN"),
    };
    save(next);
    if (submit) setStatus(next.id, "PENDING_REVIEW");
    setToast(submit ? "Đã gửi nội dung để Admin phê duyệt" : "Đã lưu bản nháp");
  };
  return (
    <>
      <CmsHeader
        title={existing ? "Chỉnh sửa nội dung" : "Tạo nội dung"}
        intro="Biên tập nội dung, media, SEO và phạm vi hiển thị."
        action={
          <div className="cms-header-actions">
            <Link
              className="button secondary"
              to={form.slug ? `/content/${form.slug}` : "#"}
            >
              <Eye />
              Xem trước
            </Link>
            <button className="button primary" onClick={() => persist(false)}>
              Lưu bản nháp
            </button>
          </div>
        }
      />
      {form.reviewComment && (
        <div className="cms-review-note">
          <strong>Yêu cầu chỉnh sửa từ reviewer</strong>
          <p>{form.reviewComment}</p>
        </div>
      )}
      <div className="cms-editor-layout">
        <div className="cms-editor-main">
          <section className="cms-card form-grid">
            <h2>Thông tin cơ bản</h2>
            <label className="wide">
              Tiêu đề
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </label>
            <label>
              Slug
              <input
                value={form.slug}
                onChange={(e) => update("slug", e.target.value)}
              />
            </label>
            <label>
              Danh mục
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              >
                <option>Tin tức</option>
                <option>Hướng dẫn</option>
                <option>Chính sách</option>
                <option>Thanh toán</option>
              </select>
            </label>
            <label className="wide">
              Loại nội dung
              <select
                value={form.type}
                onChange={(e) =>
                  update("type", e.target.value as CmsContentType)
                }
              >
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option value={k} key={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="cms-card">
            <h2>Nội dung</h2>
            <div className="cms-rte-toolbar">
              <button>H1</button>
              <button>
                <b>B</b>
              </button>
              <button>
                <i>I</i>
              </button>
              <button>
                <u>U</u>
              </button>
              <button>• List</button>
              <button>1. List</button>
              <button>Table</button>
              <button>Image</button>
              <button>Link</button>
              <button>Code</button>
            </div>
            <textarea
              className="cms-richtext"
              value={form.body}
              onChange={(e) => update("body", e.target.value)}
              placeholder="Nhập nội dung bài viết..."
            />
            <label>
              Tóm tắt
              <textarea
                value={form.summary}
                onChange={(e) => update("summary", e.target.value)}
              />
            </label>
          </section>
          <section className="cms-card form-grid">
            <h2>SEO</h2>
            <label className="wide">
              SEO title
              <input
                value={form.seoTitle}
                onChange={(e) => update("seoTitle", e.target.value)}
              />
            </label>
            <label className="wide">
              SEO description
              <textarea
                value={form.seoDescription}
                onChange={(e) => update("seoDescription", e.target.value)}
              />
            </label>
            <label className="wide">
              Keywords
              <input
                value={form.keywords}
                onChange={(e) => update("keywords", e.target.value)}
              />
            </label>
            <div className="cms-seo-preview wide">
              <small>Preview URL</small>
              <strong>sgdg.vn/content/{form.slug || "slug-noi-dung"}</strong>
              <span>{form.seoTitle || form.title || "SEO title"}</span>
              <p>
                {form.seoDescription || "SEO description sẽ hiển thị ở đây."}
              </p>
            </div>
          </section>
        </div>
        <aside>
          <section className="cms-card">
            <h2>Media</h2>
            <div className="cms-dropzone">
              <Upload />
              <strong>Kéo thả hoặc chọn media</strong>
              <small>Ảnh, PDF hoặc video</small>
            </div>
            <label>
              Featured image
              <input
                value={form.featuredImage}
                onChange={(e) => update("featuredImage", e.target.value)}
                placeholder="URL từ Media Library"
              />
            </label>
            <Link to="/cms/media">Mở Media Library</Link>
          </section>
          <section className="cms-card">
            <h2>Hiển thị</h2>
            <Badge tone={tone(form.status)}>{statusLabels[form.status]}</Badge>
            <label>
              Lên lịch xuất bản
              <input
                type="datetime-local"
                onChange={(e) => update("scheduledAt", e.target.value)}
              />
            </label>
            <button
              className="button primary wide-button"
              disabled={!form.title || !form.slug || !form.body}
              onClick={() => persist(true)}
            >
              <Send />
              Gửi phê duyệt
            </button>
            <button
              className="button secondary wide-button"
              onClick={() => navigate("/cms/contents")}
            >
              Hủy
            </button>
          </section>
        </aside>
      </div>
      {toast && <Toast text={toast} onClose={() => setToast("")} />}
    </>
  );
}
export function MediaLibraryPage() {
  const media = useCmsStore((s) => s.media),
    add = useCmsStore((s) => s.addMedia),
    remove = useCmsStore((s) => s.deleteMedia);
  const [view, setView] = useState<"grid" | "table">("grid"),
    [type, setType] = useState("ALL"),
    [toast, setToast] = useState("");
  const rows = media.filter((x) => type === "ALL" || x.type === type);
  function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const mediaType = f.type.startsWith("image")
      ? "IMAGE"
      : f.type.includes("pdf")
        ? "PDF"
        : "VIDEO";
    add({
      id: `MED-${Date.now()}`,
      name: f.name,
      type: mediaType,
      url: "#",
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      updatedAt: new Date().toLocaleDateString("vi-VN"),
    });
    setToast("Đã thêm media vào thư viện mô phỏng");
  }
  return (
    <>
      <CmsHeader
        title="Media Library"
        intro="Quản lý ảnh, PDF và video dùng trong nội dung."
        action={
          <label className="button primary">
            <Upload />
            Tải media
            <input
              hidden
              type="file"
              accept="image/*,video/*,.pdf"
              onChange={upload}
            />
          </label>
        }
      />
      <div className="cms-toolbar">
        <Search />
        <input placeholder="Tìm tên media" />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="ALL">Tất cả media</option>
          <option>IMAGE</option>
          <option>PDF</option>
          <option>VIDEO</option>
        </select>
        <div className="cms-view-toggle">
          <button
            className={view === "grid" ? "active" : ""}
            onClick={() => setView("grid")}
          >
            Grid
          </button>
          <button
            className={view === "table" ? "active" : ""}
            onClick={() => setView("table")}
          >
            Table
          </button>
        </div>
      </div>
      <div className={view === "grid" ? "cms-media-grid" : "cms-media-list"}>
        {rows.map((x) => (
          <article key={x.id} className="cms-media-card">
            <div>
              {x.type === "IMAGE" && x.url !== "#" ? (
                <img src={x.url} />
              ) : x.type === "VIDEO" ? (
                <Video />
              ) : x.type === "PDF" ? (
                <FileText />
              ) : (
                <Image />
              )}
            </div>
            <strong>{x.name}</strong>
            <span>
              {x.type} · {x.size}
            </span>
            <footer>
              <button onClick={() => navigator.clipboard?.writeText(x.url)}>
                <Link2 />
                Copy URL
              </button>
              <button
                onClick={() =>
                  setToast("Chức năng Replace sẵn sàng nhận tệp mới")
                }
              >
                <Upload />
                Replace
              </button>
              <button onClick={() => remove(x.id)}>
                <Trash2 />
                Delete
              </button>
            </footer>
          </article>
        ))}
      </div>
      {toast && <Toast text={toast} onClose={() => setToast("")} />}
    </>
  );
}
export function CategoryManagementPage() {
  const categories = useCmsStore((s) => s.categories),
    save = useCmsStore((s) => s.saveCategory),
    remove = useCmsStore((s) => s.deleteCategory);
  const [editing, setEditing] = useState<string | null>(null),
    [name, setName] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    save({
      id: editing ?? `CAT-${Date.now()}`,
      name,
      order: categories.length + 1,
      active: true,
    });
    setName("");
    setEditing(null);
  }
  return (
    <>
      <CmsHeader
        title="Quản lý danh mục"
        intro="Tổ chức phân cấp, thứ tự hiển thị và trạng thái danh mục."
        action={
          <button className="button primary" onClick={() => setEditing("new")}>
            <Plus />
            Tạo danh mục
          </button>
        }
      />
      <div className="cms-two-column">
        <section className="cms-card">
          <h2>
            <FolderTree />
            Cây danh mục
          </h2>
          {categories
            .filter((x) => !x.parent)
            .map((x) => (
              <div className="cms-tree" key={x.id}>
                <strong>{x.name}</strong>
                {categories
                  .filter((c) => c.parent === x.name)
                  .map((c) => (
                    <span key={c.id}>└ {c.name}</span>
                  ))}
              </div>
            ))}
        </section>
        <section className="cms-card">
          <h2>Danh sách danh mục</h2>
          {categories.map((x) => (
            <div className="cms-category-row" key={x.id}>
              <span>{x.order}</span>
              <div>
                <strong>{x.name}</strong>
                <small>{x.parent ? `Thuộc ${x.parent}` : "Danh mục gốc"}</small>
              </div>
              <Badge tone={x.active ? "success" : "neutral"}>
                {x.active ? "Hoạt động" : "Ẩn"}
              </Badge>
              <button
                onClick={() => {
                  setEditing(x.id);
                  setName(x.name);
                }}
              >
                <Pencil />
              </button>
              <button onClick={() => remove(x.id)}>
                <Trash2 />
              </button>
            </div>
          ))}
        </section>
      </div>
      {editing && (
        <div className="cms-modal-backdrop">
          <form className="cms-modal" onSubmit={submit}>
            <h2>{editing === "new" ? "Tạo danh mục" : "Sửa danh mục"}</h2>
            <label>
              Tên danh mục
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              Danh mục cha
              <select>
                <option>Không có</option>
                {categories.map((x) => (
                  <option key={x.id}>{x.name}</option>
                ))}
              </select>
            </label>
            <footer>
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                Hủy
              </button>
              <button className="button primary">Lưu</button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
function ScopedContentPage({
  title,
  intro,
  types,
}: {
  title: string;
  intro: string;
  types: CmsContentType[];
}) {
  const contents = useCmsStore((s) => s.contents).filter((x) =>
    types.includes(x.type),
  );
  return (
    <>
      <CmsHeader
        title={title}
        intro={intro}
        action={
          <Link
            className="button primary"
            to={`/cms/contents/new?type=${types[0]}`}
          >
            <Plus />
            Tạo mới
          </Link>
        }
      />
      <section className="cms-card">
        {contents.length ? (
          contents.map((x) => (
            <div className="cms-scope-row" key={x.id}>
              <FileText />
              <div>
                <strong>{x.title}</strong>
                <span>
                  {x.category} · v{x.version}
                </span>
              </div>
              <Badge tone={tone(x.status)}>{statusLabels[x.status]}</Badge>
              <Link to={`/cms/contents/${x.id}/edit`}>
                <Pencil />
                Biên tập
              </Link>
            </div>
          ))
        ) : (
          <div className="cms-empty">Chưa có nội dung trong nhóm này.</div>
        )}
      </section>
    </>
  );
}
export const PolicyManagementPage = () => (
  <ScopedContentPage
    title="Policy Management"
    intro="Quản lý chính sách có version, hiệu lực và vòng đời phê duyệt."
    types={["POLICY"]}
  />
);
export const FaqManagementPage = () => (
  <ScopedContentPage
    title="FAQ Management"
    intro="Quản lý câu hỏi thường gặp được xuất bản trên trung tâm hỗ trợ."
    types={["FAQ"]}
  />
);
export const KnowledgeBasePage = () => (
  <ScopedContentPage
    title="Knowledge Base"
    intro="Bài viết tri thức, từ khóa, tài liệu đính kèm và nội dung liên quan."
    types={["KNOWLEDGE_BASE"]}
  />
);
export function LivestreamListPage() {
  const items = useCmsStore((s) => s.livestreams);
  return (
    <>
      <CmsHeader
        title="Livestream"
        intro="Quản lý nội dung livestream YouTube, lịch, quyền xem và replay."
        action={
          <Link className="button primary" to="/cms/livestreams/new">
            <Plus />
            Tạo livestream
          </Link>
        }
      />
      <div className="cms-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Livestream</th>
              <th>YouTube URL</th>
              <th>Lịch</th>
              <th>Quyền xem</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>
                  <div className="cms-content-cell">
                    <span className="cms-thumb">
                      {x.thumbnail ? <img src={x.thumbnail} /> : <Video />}
                    </span>
                    <strong>{x.title}</strong>
                  </div>
                </td>
                <td className="cms-url">{x.youtubeUrl}</td>
                <td>{new Date(x.startAt).toLocaleString("vi-VN")}</td>
                <td>{x.access}</td>
                <td>
                  <Badge tone={tone(x.status)}>{statusLabels[x.status]}</Badge>
                </td>
                <td>
                  <div className="cms-row-actions">
                    <Link to={`/livestreams/${x.id}`}>
                      <Eye />
                    </Link>
                    <Link to={`/cms/livestreams/${x.id}/edit`}>
                      <Pencil />
                    </Link>
                    <Link to={`/cms/replays?live=${x.id}`}>
                      <PlayCircle />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function blankLive(): CmsLivestream {
  return {
    id: `LIVE-CMS-${Date.now()}`,
    title: "",
    description: "",
    youtubeUrl: "",
    embedUrl: "",
    thumbnail: "",
    startAt: "",
    endAt: "",
    access: "PUBLIC",
    chatEnabled: false,
    status: "DRAFT",
  };
}
export function LivestreamEditorPage() {
  const { liveId } = useParams(),
    items = useCmsStore((s) => s.livestreams),
    save = useCmsStore((s) => s.saveLivestream),
    navigate = useNavigate();
  const [form, setForm] = useState(
      items.find((x) => x.id === liveId) ?? blankLive(),
    ),
    [toast, setToast] = useState("");
  const update = <K extends keyof CmsLivestream>(k: K, v: CmsLivestream[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const submit = (review = false) => {
    save({ ...form, status: review ? "PENDING_REVIEW" : "DRAFT" });
    setToast(
      review ? "Đã gửi livestream để Admin phê duyệt" : "Đã lưu bản nháp",
    );
  };
  return (
    <>
      <CmsHeader
        title={liveId ? "Chỉnh sửa livestream" : "Tạo livestream"}
        intro="Thiết lập nguồn YouTube, lịch phát, quyền truy cập và chat."
      />
      <div className="cms-editor-layout">
        <div className="cms-editor-main">
          <section className="cms-card form-grid">
            <h2>Thông tin cơ bản</h2>
            <label className="wide">
              Tiêu đề
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </label>
            <label className="wide">
              Mô tả
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </label>
            <label className="wide">
              Thumbnail URL
              <input
                value={form.thumbnail}
                onChange={(e) => update("thumbnail", e.target.value)}
              />
            </label>
          </section>
          <section className="cms-card form-grid">
            <h2>YouTube</h2>
            <label>
              YouTube URL
              <input
                value={form.youtubeUrl}
                onChange={(e) => update("youtubeUrl", e.target.value)}
              />
            </label>
            <label>
              Embed URL
              <input
                value={form.embedUrl}
                onChange={(e) => update("embedUrl", e.target.value)}
              />
            </label>
          </section>
          <section className="cms-card form-grid">
            <h2>Lịch phát</h2>
            <label>
              Bắt đầu
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => update("startAt", e.target.value)}
              />
            </label>
            <label>
              Kết thúc
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => update("endAt", e.target.value)}
              />
            </label>
          </section>
        </div>
        <aside>
          <section className="cms-card">
            <h2>Quyền truy cập</h2>
            <label>
              Access mode
              <select
                value={form.access}
                onChange={(e) =>
                  update("access", e.target.value as CmsLivestream["access"])
                }
              >
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
                <option value="RANKING_MEMBER">Ranking Member Only</option>
              </select>
            </label>
            <label className="cms-check">
              <input
                type="checkbox"
                checked={form.chatEnabled}
                onChange={(e) => update("chatEnabled", e.target.checked)}
              />
              Bật live chat
            </label>
          </section>
          <section className="cms-card cms-action-stack">
            <Link className="button secondary" to={`/livestreams/${form.id}`}>
              <Eye />
              Xem trước
            </Link>
            <button className="button secondary" onClick={() => submit(false)}>
              Lưu bản nháp
            </button>
            <button
              className="button primary"
              disabled={!form.title || !form.youtubeUrl || !form.startAt}
              onClick={() => submit(true)}
            >
              <Send />
              Gửi phê duyệt
            </button>
            <button
              className="button ghost"
              onClick={() => navigate("/cms/livestreams")}
            >
              Hủy
            </button>
          </section>
        </aside>
      </div>
      {toast && <Toast text={toast} onClose={() => setToast("")} />}
    </>
  );
}
export function ReplayManagementPage() {
  const items = useCmsStore((s) => s.livestreams),
    setReplay = useCmsStore((s) => s.setReplay),
    [urls, setUrls] = useState<Record<string, string>>({}),
    [toast, setToast] = useState("");
  return (
    <>
      <CmsHeader
        title="Replay Management"
        intro="Cập nhật, thay thế và xuất bản replay cho livestream đã kết thúc."
      />
      <section className="cms-card">
        {items.map((x) => (
          <div className="cms-replay-row" key={x.id}>
            <span className="cms-thumb">
              {x.thumbnail ? <img src={x.thumbnail} /> : <PlayCircle />}
            </span>
            <div>
              <strong>{x.title}</strong>
              <small>
                {x.replayUrl ? "Replay đã xuất bản" : "Chưa có replay"}
              </small>
            </div>
            <input
              value={urls[x.id] ?? x.replayUrl ?? ""}
              onChange={(e) =>
                setUrls((s) => ({ ...s, [x.id]: e.target.value }))
              }
              placeholder="Replay URL"
            />
            <button
              className="button primary"
              onClick={() => {
                setReplay(x.id, urls[x.id] ?? x.replayUrl ?? "");
                setToast("Đã cập nhật và xuất bản replay");
              }}
            >
              {x.replayUrl ? "Thay replay" : "Xuất bản replay"}
            </button>
          </div>
        ))}
      </section>
      {toast && <Toast text={toast} onClose={() => setToast("")} />}
    </>
  );
}
export function ContentApprovalQueuePage() {
  const items = useCmsStore((s) => s.contents).filter(
    (x) => x.status === "PENDING_REVIEW",
  );
  return (
    <>
      <CmsHeader
        title="Phê duyệt nội dung"
        intro="Hàng đợi maker-checker dành cho Admin; tách biệt với phê duyệt phiên đấu giá."
      />
      <div className="cms-toolbar">
        <Search />
        <input placeholder="Tìm nội dung hoặc người gửi" />
        <select>
          <option>Tất cả danh mục</option>
          <option>Tin tức</option>
          <option>Chính sách</option>
        </select>
      </div>
      <div className="cms-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nội dung</th>
              <th>Danh mục</th>
              <th>Người gửi</th>
              <th>Ngày gửi</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{x.title}</strong>
                  <small>
                    {typeLabels[x.type]} · v{x.version}
                  </small>
                </td>
                <td>{x.category}</td>
                <td>{x.author}</td>
                <td>{x.updatedAt}</td>
                <td>
                  <Badge tone="warning">Chờ duyệt</Badge>
                </td>
                <td>
                  <Link
                    className="button secondary"
                    to={`/governance/content-approvals/${x.id}`}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <div className="cms-empty">Không có nội dung đang chờ phê duyệt.</div>
        )}
      </div>
    </>
  );
}
export function ContentApprovalDetailPage() {
  const { contentId } = useParams(),
    navigate = useNavigate(),
    item = useCmsStore((s) => s.contents.find((x) => x.id === contentId)),
    setStatus = useCmsStore((s) => s.setContentStatus),
    [comment, setComment] = useState(""),
    [toast, setToast] = useState("");
  if (!item) return <div className="cms-empty">Không tìm thấy nội dung.</div>;
  const decide = (status: CmsStatus, text: string) => {
    setStatus(item.id, status, comment);
    setToast(text);
    window.setTimeout(() => navigate("/governance/content-approvals"), 650);
  };
  return (
    <>
      <CmsHeader title="Review nội dung" intro={`${item.id} · ${item.title}`} />
      <div className="cms-approval-layout">
        <main>
          <section className="cms-card">
            <h2>Thông tin cơ bản</h2>
            <dl className="cms-detail-grid">
              <div>
                <dt>Loại</dt>
                <dd>{typeLabels[item.type]}</dd>
              </div>
              <div>
                <dt>Danh mục</dt>
                <dd>{item.category}</dd>
              </div>
              <div>
                <dt>Người gửi</dt>
                <dd>{item.author}</dd>
              </div>
              <div>
                <dt>Phiên bản</dt>
                <dd>v{item.version}</dd>
              </div>
            </dl>
          </section>
          <section className="cms-card cms-preview">
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            {item.featuredImage && <img src={item.featuredImage} />}
            <article>{item.body}</article>
          </section>
          <section className="cms-card">
            <h2>Media & SEO preview</h2>
            <p>
              <strong>{item.seoTitle}</strong>
            </p>
            <p>{item.seoDescription}</p>
            <code>/content/{item.slug}</code>
          </section>
          <section className="cms-card">
            <h2>Lịch sử phiên bản</h2>
            {Array.from({ length: item.version }, (_, i) => (
              <div className="cms-history" key={i}>
                <span>v{item.version - i}</span>
                <strong>
                  {i === 0 ? "Gửi phê duyệt" : "Cập nhật bản nháp"}
                </strong>
                <time>{item.updatedAt}</time>
              </div>
            ))}
          </section>
        </main>
        <aside>
          <section className="cms-card cms-review-panel">
            <h2>Quyết định reviewer</h2>
            <label>
              Nhận xét
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Bắt buộc khi reject hoặc trả lại chỉnh sửa"
              />
            </label>
            <button
              className="button primary"
              onClick={() =>
                decide(
                  item.scheduledAt ? "SCHEDULED" : "PUBLISHED",
                  "Đã phê duyệt nội dung",
                )
              }
            >
              <Check />
              Approve
            </button>
            <button
              className="button secondary"
              disabled={!comment.trim()}
              onClick={() =>
                decide("CHANGES_REQUESTED", "Đã trả nội dung để chỉnh sửa")
              }
            >
              <Pencil />
              Return for revision
            </button>
            <button
              className="button danger"
              disabled={!comment.trim()}
              onClick={() => decide("ARCHIVED", "Đã từ chối nội dung")}
            >
              <X />
              Reject
            </button>
            <small>
              Admin không sửa trực tiếp nội dung trong bước review để giữ
              maker-checker.
            </small>
          </section>
        </aside>
      </div>
      {toast && <Toast text={toast} onClose={() => setToast("")} />}
    </>
  );
}
export function PublicContentPage() {
  const { slug } = useParams(),
    item = useCmsStore((s) => s.contents.find((x) => x.slug === slug));
  if (!item)
    return (
      <main className="container page-shell">
        <h1>Không tìm thấy nội dung</h1>
      </main>
    );
  return (
    <main className="public-cms-page">
      <div className="public-cms-hero">
        <div className="container">
          <nav>
            <Link to="/">Trang chủ</Link>
            <ChevronRight />
            <Link to="/news">Nội dung</Link>
            <ChevronRight />
            <span>{item.category}</span>
          </nav>
          <Badge tone="info">{item.category}</Badge>
          <h1>{item.title}</h1>
          <p>{item.summary}</p>
          <div>
            {item.publishedAt || item.updatedAt} · {item.author}
          </div>
        </div>
      </div>
      <article className="container public-cms-layout">
        <main>
          {item.featuredImage && (
            <img className="public-cms-cover" src={item.featuredImage} />
          )}
          <div className="public-cms-body">{item.body}</div>
          <section>
            <h2>Tài liệu đính kèm</h2>
            <a href="#">
              <FileText />
              Tài liệu tham khảo.pdf
            </a>
          </section>
        </main>
        <aside>
          <section>
            <h2>Bài viết liên quan</h2>
            <Link to="/news">Tin tức và kiến thức</Link>
            <Link to="/help">Câu hỏi thường gặp</Link>
          </section>
          <section>
            <h2>Chia sẻ</h2>
            <button>Facebook</button>
            <button>LinkedIn</button>
            <button>Copy link</button>
          </section>
        </aside>
      </article>
    </main>
  );
}
export function PublicLivestreamPage() {
  const { liveId } = useParams(),
    item = useCmsStore((s) => s.livestreams.find((x) => x.id === liveId));
  const [now] = useState(() => Date.now());
  if (!item)
    return (
      <main className="container page-shell">
        <h1>Không tìm thấy livestream</h1>
      </main>
    );
  const upcoming = new Date(item.startAt).getTime() > now;
  return (
    <main className="public-live-page">
      <section className="public-live-banner">
        <div className="container">
          <Badge
            tone={item.replayUrl ? "info" : upcoming ? "warning" : "brand"}
          >
            {item.replayUrl ? "REPLAY" : upcoming ? "SẮP DIỄN RA" : "ĐANG PHÁT"}
          </Badge>
          <h1>{item.title}</h1>
          <p>{item.description}</p>
        </div>
      </section>
      <div className="container public-live-layout">
        <main>
          <div className="public-video-frame">
            {upcoming && !item.replayUrl ? (
              <>
                <Clock3 />
                <strong>Livestream bắt đầu lúc</strong>
                <time>{new Date(item.startAt).toLocaleString("vi-VN")}</time>
              </>
            ) : (
              <>
                <PlayCircle />
                <strong>
                  {item.replayUrl ? "Replay player" : "YouTube player"}
                </strong>
                <a href={item.replayUrl || item.youtubeUrl}>Mở trên YouTube</a>
              </>
            )}
          </div>
          <section className="cms-card">
            <h2>Thông tin livestream</h2>
            <p>{item.description}</p>
            <p>
              Quyền xem: {item.access} · Live chat:{" "}
              {item.chatEnabled ? "Bật" : "Tắt"}
            </p>
          </section>
        </main>
        <aside>
          <section className="cms-card">
            <h2>Thông tin phiên liên quan</h2>
            <p>PATEK-5711R-2026</p>
            <Link to="/auctions/patek-nautilus">Xem phiên đấu giá</Link>
          </section>
          <section className="cms-card">
            <h2>FAQ</h2>
            <p>
              Livestream cung cấp nội dung giới thiệu; trạng thái đấu giá
              authoritative nằm tại trang phiên.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

export function KnowledgeProposalInboxPage() {
  const knowledgeGaps = useSupportStore((s) => s.knowledgeGaps);
  const gaps = knowledgeGaps.filter((x) => x.status === "FORWARDED_TO_CONTENT");
  return (
    <>
      <CmsHeader
        title="Knowledge Proposals"
        intro="Đề xuất từ Customer Support; Content Staff biên tập và gửi phê duyệt trong CMS."
      />
      <section className="cms-card">
        {gaps.length ? (
          gaps.map((x) => (
            <div className="cms-scope-row" key={x.id}>
              <FileText />
              <div>
                <strong>{x.question}</strong>
                <span>
                  {x.proposalId} · {x.frequency} lượt gặp · nguồn{" "}
                  {x.conversationId}
                </span>
              </div>
              <Badge tone="warning">CHỜ CONTENT</Badge>
              <Link
                className="button secondary"
                to={`/cms/contents/new?type=KNOWLEDGE_BASE&proposal=${x.proposalId}`}
              >
                <Pencil />
                Tạo Knowledge Article
              </Link>
            </div>
          ))
        ) : (
          <div className="cms-empty">Không có proposal đang chờ.</div>
        )}
      </section>
      <p className="cms-review-note">
        Knowledge Gap chỉ được đánh dấu Resolved sau khi Knowledge Article tương
        ứng được publish.
      </p>
    </>
  );
}
