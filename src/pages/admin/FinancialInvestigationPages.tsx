import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileSearch,
  Info,
  Landmark,
  MessageSquareMore,
  PlayCircle,
  Search,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge, type BadgeTone } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import {
  type FinancialInvestigation,
  useSupportStore,
} from "../../store/supportStore";
import "../../styles/finance-investigation.css";

const investigationLabels: Record<
  FinancialInvestigation["status"],
  { label: string; tone: BadgeTone }
> = {
  REQUESTED: { label: "Chờ tiếp nhận", tone: "warning" },
  IN_PROGRESS: { label: "Đang kiểm tra", tone: "info" },
  MORE_INFO_REQUIRED: { label: "Chờ bổ sung", tone: "danger" },
  SUBMITTED: { label: "Đã gửi kết luận", tone: "success" },
};

const typeLabels: Record<FinancialInvestigation["type"], string> = {
  PAYMENT: "Thanh toán",
  DEPOSIT: "Đặt cọc",
  REFUND: "Hoàn tiền",
};

export function FinancialInvestigationQueue() {
  const items = useSupportStore((state) => state.investigations);
  const disputes = useSupportStore((state) => state.disputes);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<
    "ALL" | FinancialInvestigation["status"]
  >("ALL");
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const dispute = disputes.find((entry) => entry.id === item.disputeId);
      const matchesStatus = status === "ALL" || item.status === status;
      const matchesQuery =
        !normalized ||
        [
          item.id,
          item.disputeId,
          item.transactionReference,
          dispute?.title ?? "",
        ].some((value) => value.toLowerCase().includes(normalized));
      return matchesStatus && matchesQuery;
    });
  }, [disputes, items, query, status]);

  const count = (value: FinancialInvestigation["status"]) =>
    items.filter((item) => item.status === value).length;

  return (
    <main className="finance-investigation-page">
      <header className="finance-investigation-heading">
        <div>
          <span>FINANCE · CUSTOMER SUPPORT HANDOFF</span>
          <h1>Điều tra giao dịch</h1>
          <p>
            Xác minh dữ liệu tiền và gửi kết luận có bằng chứng về cho Customer
            Support xử lý tranh chấp.
          </p>
        </div>
        <div className="finance-investigation-scope">
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>Đúng phạm vi Finance</strong>
            Không tự duyệt hoàn tiền hoặc đóng dispute
          </span>
        </div>
      </header>

      <section
        className="finance-investigation-metrics"
        aria-label="Tổng quan hàng đợi"
      >
        {(
          [
            ["REQUESTED", "Chờ tiếp nhận", Clock3],
            ["IN_PROGRESS", "Đang kiểm tra", FileSearch],
            ["MORE_INFO_REQUIRED", "Chờ CS bổ sung", MessageSquareMore],
            ["SUBMITTED", "Đã gửi kết luận", CheckCircle2],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            type="button"
            key={value}
            className={status === value ? "active" : ""}
            aria-pressed={status === value}
            onClick={() => setStatus(status === value ? "ALL" : value)}
          >
            <Icon aria-hidden="true" />
            <span>
              <strong>{count(value)}</strong>
              {label}
            </span>
          </button>
        ))}
      </section>

      <div className="finance-investigation-layout">
        <section className="finance-investigation-queue">
          <header>
            <div>
              <span>HÀNG ĐỢI ĐIỀU TRA</span>
              <h2>Hồ sơ cần Finance phản hồi</h2>
            </div>
            <strong>{filteredItems.length} hồ sơ</strong>
          </header>
          <div className="finance-investigation-toolbar">
            <label>
              <Search aria-hidden="true" />
              <input
                aria-label="Tìm hồ sơ điều tra"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm mã hồ sơ, dispute hoặc giao dịch"
              />
            </label>
            <select
              aria-label="Lọc trạng thái điều tra"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    "ALL" | FinancialInvestigation["status"],
                )
              }
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="REQUESTED">Chờ tiếp nhận</option>
              <option value="IN_PROGRESS">Đang kiểm tra</option>
              <option value="MORE_INFO_REQUIRED">Chờ bổ sung</option>
              <option value="SUBMITTED">Đã gửi kết luận</option>
            </select>
          </div>

          <div className="finance-investigation-list">
            {filteredItems.map((item) => {
              const dispute = disputes.find(
                (entry) => entry.id === item.disputeId,
              );
              const statusMeta = investigationLabels[item.status];
              return (
                <Link
                  to={`/finance/investigations/${item.id}`}
                  key={item.id}
                  aria-label={`Mở hồ sơ ${item.id}`}
                >
                  <div className="finance-investigation-icon">
                    <WalletCards aria-hidden="true" />
                  </div>
                  <div className="finance-investigation-row-main">
                    <div>
                      <span>{typeLabels[item.type]}</span>
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </div>
                    <strong>
                      {dispute?.title ?? item.transactionReference}
                    </strong>
                    <p>
                      {item.id} · {item.disputeId} · {item.transactionReference}
                    </p>
                  </div>
                  <div className="finance-investigation-row-meta">
                    <span>Tiếp nhận</span>
                    <strong>{item.requestedAt}</strong>
                    <ArrowRight aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
            {!filteredItems.length && (
              <div className="finance-investigation-empty">
                <FileSearch aria-hidden="true" />
                <strong>Không có hồ sơ phù hợp</strong>
                <span>Hãy đổi từ khóa hoặc bộ lọc trạng thái.</span>
              </div>
            )}
          </div>
        </section>

        <aside className="finance-investigation-guide">
          <div>
            <span>LUỒNG PHỐI HỢP</span>
            <h2>Một điểm trả kết luận, không trùng flow hoàn tiền</h2>
            <p>
              Màn hình này chỉ dùng khi Customer Support cần Finance kiểm chứng
              giao dịch gốc, gateway hoặc số đối soát.
            </p>
          </div>
          <ol>
            <li>
              <b>1</b>
              <span>
                <strong>Tiếp nhận yêu cầu</strong>
                Đọc dispute và phạm vi cần xác minh.
              </span>
            </li>
            <li>
              <b>2</b>
              <span>
                <strong>Đối chiếu bằng chứng</strong>
                Kiểm tra ledger, cổng thanh toán và batch đối soát.
              </span>
            </li>
            <li>
              <b>3</b>
              <span>
                <strong>Phản hồi Customer Support</strong>
                Gửi kết luận hoặc yêu cầu bổ sung tài liệu.
              </span>
            </li>
          </ol>
          <p className="finance-investigation-boundary">
            <Info aria-hidden="true" />
            Quyết định hoàn tiền và resolution cuối vẫn nằm ở workspace Hoàn
            tiền/Customer Support.
          </p>
        </aside>
      </div>
    </main>
  );
}

export function FinancialInvestigationDetail() {
  const { investigationId } = useParams();
  const item = useSupportStore((state) =>
    state.investigations.find((entry) => entry.id === investigationId),
  );
  const dispute = useSupportStore((state) =>
    state.disputes.find((entry) => entry.id === item?.disputeId),
  );
  const start = useSupportStore((state) => state.startFinancialInvestigation);
  const requestMore = useSupportStore(
    (state) => state.requestMoreFinancialInformation,
  );
  const submit = useSupportStore((state) => state.submitFinancialInvestigation);
  const [findings, setFindings] = useState(item?.findings ?? "");
  const [notice, setNotice] = useState("");

  if (!item) {
    return (
      <div className="support-empty">
        <FileSearch />
        <h1>Không tìm thấy hồ sơ điều tra</h1>
        <Link className="button secondary" to="/finance/investigations">
          Về hàng đợi
        </Link>
      </div>
    );
  }

  const statusMeta = investigationLabels[item.status];
  const submitFindings = () => {
    submit(item.id, findings);
    setNotice("Đã gửi kết luận về Customer Support.");
  };
  const requestEvidence = () => {
    requestMore(item.id, findings);
    setNotice("Đã yêu cầu Customer Support bổ sung bằng chứng.");
  };

  return (
    <main className="finance-investigation-page">
      <Link className="finance-investigation-back" to="/finance/investigations">
        <ArrowLeft aria-hidden="true" /> Quay lại hàng đợi
      </Link>
      <header className="finance-investigation-detail-heading">
        <div>
          <span>
            {typeLabels[item.type]} · {item.id}
          </span>
          <h1>{dispute?.title ?? "Kiểm tra giao dịch"}</h1>
          <p>
            Dispute {item.disputeId} · Reference {item.transactionReference}
          </p>
        </div>
        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
      </header>

      <section className="finance-investigation-case-strip">
        <div>
          <span>Giao dịch cần kiểm tra</span>
          <strong>{item.transactionReference}</strong>
        </div>
        <div>
          <span>Người yêu cầu</span>
          <strong>{dispute?.assignee ?? "Customer Support"}</strong>
        </div>
        <div>
          <span>Tiếp nhận lúc</span>
          <strong>{item.requestedAt}</strong>
        </div>
        <div>
          <span>Finance phụ trách</span>
          <strong>{item.financeStaff ?? "Chưa phân công"}</strong>
        </div>
      </section>

      <div className="finance-investigation-detail-layout">
        <div className="finance-investigation-detail-main">
          <section>
            <header>
              <MessageSquareMore aria-hidden="true" />
              <div>
                <span>YÊU CẦU TỪ CUSTOMER SUPPORT</span>
                <h2>Phạm vi cần xác minh</h2>
              </div>
            </header>
            <p className="finance-investigation-request">
              {dispute?.investigationNote ??
                "Kiểm tra trạng thái giao dịch và bằng chứng liên quan."}
            </p>
            <dl>
              <div>
                <dt>Dispute</dt>
                <dd>{item.disputeId}</dd>
              </div>
              <div>
                <dt>Loại nghiệp vụ</dt>
                <dd>{typeLabels[item.type]}</dd>
              </div>
              <div>
                <dt>Customer ID</dt>
                <dd>{dispute?.customerId ?? "—"}</dd>
              </div>
            </dl>
          </section>

          <section>
            <header>
              <ClipboardCheck aria-hidden="true" />
              <div>
                <span>CHECKLIST KIỂM CHỨNG</span>
                <h2>Ba lớp dữ liệu tài chính</h2>
              </div>
            </header>
            <ul className="finance-investigation-checklist">
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>
                  <strong>Ledger nội bộ</strong>
                  Reference tồn tại, số tiền và chủ thể khớp hồ sơ.
                </span>
                <Badge tone="success">Đã khớp</Badge>
              </li>
              <li>
                <Landmark aria-hidden="true" />
                <span>
                  <strong>Cổng thanh toán / ngân hàng</strong>
                  Kiểm tra provider reference và trạng thái cuối.
                </span>
                <Badge tone={item.status === "REQUESTED" ? "neutral" : "info"}>
                  {item.status === "REQUESTED"
                    ? "Chưa kiểm tra"
                    : "Đã kiểm tra"}
                </Badge>
              </li>
              <li>
                <FileCheck2 aria-hidden="true" />
                <span>
                  <strong>Batch đối soát</strong>
                  Đối chiếu chênh lệch và dấu thời gian ghi nhận.
                </span>
                <Badge
                  tone={item.status === "SUBMITTED" ? "success" : "warning"}
                >
                  {item.status === "SUBMITTED" ? "Hoàn tất" : "Đang rà soát"}
                </Badge>
              </li>
            </ul>
          </section>

          <section>
            <header>
              <Clock3 aria-hidden="true" />
              <div>
                <span>AUDIT TRAIL</span>
                <h2>Lịch sử phối hợp</h2>
              </div>
            </header>
            <ol className="finance-investigation-timeline">
              {item.events.map((entry) => (
                <li key={entry.id}>
                  <i />
                  <div>
                    <strong>{entry.label}</strong>
                    <span>
                      {entry.actor} · {entry.at}
                    </span>
                    {entry.note && <p>{entry.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="finance-investigation-action-card">
          <span>BƯỚC TIẾP THEO</span>
          {item.status === "REQUESTED" ? (
            <>
              <PlayCircle aria-hidden="true" />
              <h2>Tiếp nhận hồ sơ</h2>
              <p>
                Nhận hồ sơ để ghi nhận Finance phụ trách và bắt đầu kiểm chứng.
              </p>
              <Button
                fullWidth
                onClick={() => {
                  start(item.id);
                  setNotice("Đã tiếp nhận hồ sơ và bắt đầu kiểm tra.");
                }}
              >
                Bắt đầu điều tra
              </Button>
            </>
          ) : item.status === "SUBMITTED" ? (
            <>
              <CheckCircle2 aria-hidden="true" />
              <h2>Đã trả kết luận</h2>
              <p className="finance-investigation-final">{item.findings}</p>
              <Link className="button secondary" to="/finance/investigations">
                Về hàng đợi
              </Link>
            </>
          ) : (
            <>
              <UserRound aria-hidden="true" />
              <h2>Gửi phản hồi nghiệp vụ</h2>
              {item.followUpNote && (
                <p className="finance-investigation-followup">
                  Đang chờ bổ sung: {item.followUpNote}
                </p>
              )}
              <label>
                Kết luận hoặc nội dung cần bổ sung
                <textarea
                  value={findings}
                  onChange={(event) => setFindings(event.target.value)}
                  placeholder="Nêu nguồn dữ liệu đã kiểm tra, kết quả và reference bằng chứng..."
                />
              </label>
              <small>
                Nội dung này được lưu vào audit trail và chuyển về Customer
                Support.
              </small>
              <Button
                fullWidth
                disabled={!findings.trim()}
                onClick={submitFindings}
              >
                Gửi kết luận
              </Button>
              <Button
                variant="secondary"
                fullWidth
                disabled={!findings.trim()}
                onClick={requestEvidence}
              >
                Yêu cầu bổ sung bằng chứng
              </Button>
            </>
          )}
          {notice && (
            <p className="finance-investigation-notice" role="status">
              <CheckCircle2 aria-hidden="true" /> {notice}
            </p>
          )}
          <p className="finance-investigation-boundary">
            <Info aria-hidden="true" />
            Finance không quyết định resolution cuối của dispute.
          </p>
        </aside>
      </div>
    </main>
  );
}
