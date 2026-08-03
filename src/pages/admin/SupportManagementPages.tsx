import {
  AlertTriangle,
  ArrowRight,
  FileSearch,
  Headphones,
  LockKeyhole,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { useCustomerGovernanceStore } from "../../store/customerGovernanceStore";
import {
  type ComplaintStatus,
  type DisputeStatus,
  type TicketStatus,
  useSupportStore,
} from "../../store/supportStore";
const ticketLabel: Record<TicketStatus, string> = {
  OPEN: "Mới",
  IN_PROGRESS: "Đang xử lý",
  PENDING_CUSTOMER_RESPONSE: "Chờ khách hàng",
  CLOSED: "Đã đóng",
};
const complaintLabel: Record<ComplaintStatus, string> = {
  SUBMITTED: "Đã gửi",
  UNDER_REVIEW: "Đang review",
  PENDING_CUSTOMER_RESPONSE: "Chờ khách hàng",
  RESOLVED: "Đã giải quyết",
  CLOSED: "Đã đóng",
  ESCALATED_TO_DISPUTE: "Đã chuyển tranh chấp",
};
const disputeLabel: Record<DisputeStatus, string> = {
  UNDER_INVESTIGATION: "Đang điều tra",
  FINANCIAL_INVESTIGATION_PENDING: "Chờ Finance",
  ADDITIONAL_INFORMATION_REQUIRED: "Cần bổ sung",
  RESOLVED: "Đã giải quyết",
  CLOSED: "Đã đóng",
};
function tone(status: string) {
  return status.includes("CLOSED") ||
    status === "RESOLVED" ||
    status === "SUBMITTED"
    ? "success"
    : status.includes("PENDING") || status === "OPEN"
      ? "warning"
      : status.includes("REQUIRED")
        ? "danger"
        : ("info" as const);
}
function Header({
  title,
  intro,
  action,
}: {
  title: string;
  intro: string;
  action?: ReactNode;
}) {
  return (
    <header className="support-header">
      <div>
        <span>CUSTOMER SERVICE</span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {action}
    </header>
  );
}
function Timeline({
  events,
}: {
  events: Array<{
    id: string;
    label: string;
    actor: string;
    at: string;
    note?: string;
  }>;
}) {
  return (
    <ol className="case-timeline">
      {events.map((e) => (
        <li key={e.id}>
          <span />
          <div>
            <strong>{e.label}</strong>
            <p>{e.note}</p>
            <small>
              {e.actor} · {e.at}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
export function SupportDashboard() {
  const tickets = useSupportStore((s) => s.tickets),
    complaints = useSupportStore((s) => s.complaints),
    disputes = useSupportStore((s) => s.disputes),
    conversations = useSupportStore((s) => s.conversations);
  return (
    <>
      <Header
        title="Tổng quan hỗ trợ khách hàng"
        intro="Hàng đợi hợp nhất cho hội thoại, ticket, khiếu nại và tranh chấp."
      />
      <div className="support-kpis">
        {(
          [
            [
              "Handoff đang chờ",
              conversations.filter((x) => x.status === "WAITING_HANDOFF")
                .length,
              Headphones,
            ],
            [
              "Ticket đang mở",
              tickets.filter((x) => x.status !== "CLOSED").length,
              MessageCircle,
            ],
            [
              "Khiếu nại",
              complaints.filter(
                (x) => !(["CLOSED", "RESOLVED"] as string[]).includes(x.status),
              ).length,
              AlertTriangle,
            ],
            [
              "Tranh chấp",
              disputes.filter((x) => x.status !== "CLOSED").length,
              ShieldCheck,
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
      <div className="support-dashboard-grid">
        <section className="support-card">
          <h2>Ưu tiên xử lý</h2>
          {tickets
            .filter((x) => x.status !== "CLOSED")
            .slice(0, 4)
            .map((x) => (
              <Link
                className="support-queue-row"
                to={`/support/tickets/${x.id}`}
                key={x.id}
              >
                <Badge tone={x.priority === "URGENT" ? "danger" : "warning"}>
                  {x.priority}
                </Badge>
                <div>
                  <strong>{x.subject}</strong>
                  <small>
                    {x.id} · {ticketLabel[x.status]}
                  </small>
                </div>
                <ArrowRight />
              </Link>
            ))}
        </section>
        <section className="support-card">
          <h2>Cần phối hợp</h2>
          {disputes.map((x) => (
            <Link
              className="support-queue-row"
              to={`/support/disputes/${x.id}`}
              key={x.id}
            >
              <WalletCards />
              <div>
                <strong>{x.title}</strong>
                <small>{disputeLabel[x.status]}</small>
              </div>
              <ArrowRight />
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
export function ConversationInbox() {
  const items = useSupportStore((s) => s.conversations),
    accept = useSupportStore((s) => s.acceptConversation);
  return (
    <>
      <Header
        title="Hội thoại & Human Handoff"
        intro="Human Handoff chỉ chuyển hội thoại; không tự động tạo Support Ticket."
      />
      <section className="support-card">
        {items.map((x) => (
          <div className="support-list-row" key={x.id}>
            <Headphones />
            <div>
              <strong>{x.customerName}</strong>
              <span>
                {x.topic} · {x.startedAt}
              </span>
            </div>
            <Badge tone={x.status === "WAITING_HANDOFF" ? "warning" : "info"}>
              {x.status}
            </Badge>
            {x.status === "WAITING_HANDOFF" ? (
              <button className="button primary" onClick={() => accept(x.id)}>
                Nhận hội thoại
              </button>
            ) : (
              <Link
                className="button secondary"
                to={`/support/conversations/${x.id}`}
              >
                Mở chat
              </Link>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
export function ConversationWorkspace() {
  const { conversationId } = useParams(),
    item = useSupportStore((s) =>
      s.conversations.find((x) => x.id === conversationId),
    ),
    send = useSupportStore((s) => s.sendStaffMessage),
    [text, setText] = useState("");
  if (!item) return <Empty />;
  return (
    <>
      <Header
        title="Hội thoại trực tiếp"
        intro={`${item.id} · ${item.customerName}`}
      />
      <div className="conversation-layout">
        <section className="support-card chat-thread">
          {item.messages.map((m) => (
            <div
              className={`chat-message ${m.sender.toLowerCase()}`}
              key={m.id}
            >
              <strong>{m.sender}</strong>
              <p>{m.text}</p>
              <small>{m.at}</small>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) {
                send(item.id, text);
                setText("");
              }
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập phản hồi..."
            />
            <button className="button primary">
              <Send />
              Gửi
            </button>
          </form>
        </section>
        <aside className="support-card">
          <h2>Bối cảnh chỉ đọc</h2>
          <p>Customer: {item.customerId}</p>
          <p>Chủ đề: {item.topic}</p>
          <p>Handoff không tạo ticket tự động.</p>
          <Link className="button secondary" to="/support/tickets">
            Tạo ticket khi cần
          </Link>
        </aside>
      </div>
    </>
  );
}
function QueueToolbar() {
  return (
    <div className="support-toolbar">
      <Search />
      <input placeholder="Tìm theo mã, khách hàng hoặc nội dung" />
      <select>
        <option>Tất cả trạng thái</option>
        <option>Đang xử lý</option>
        <option>Chờ phản hồi</option>
      </select>
      <select>
        <option>Tất cả mức ưu tiên</option>
        <option>Urgent</option>
        <option>High</option>
      </select>
    </div>
  );
}
export function TicketQueue() {
  const items = useSupportStore((s) => s.tickets);
  return (
    <>
      <Header
        title="Support Ticket"
        intro="Phân loại, giao xử lý và theo dõi lifecycle ticket."
      />
      <QueueToolbar />
      <div className="support-table">
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Khách hàng</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Trạng thái</th>
              <th>Assignee</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{x.subject}</strong>
                  <small>
                    {x.id} · {x.createdAt}
                  </small>
                </td>
                <td>{x.customerName}</td>
                <td>{x.category}</td>
                <td>
                  <Badge tone={x.priority === "URGENT" ? "danger" : "neutral"}>
                    {x.priority}
                  </Badge>
                </td>
                <td>
                  <Badge tone={tone(x.status)}>{ticketLabel[x.status]}</Badge>
                </td>
                <td>{x.assignee || "Chưa giao"}</td>
                <td>
                  <Link to={`/support/tickets/${x.id}`}>Xử lý</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function TicketWorkspace() {
  const { ticketId } = useParams(),
    item = useSupportStore((s) => s.tickets.find((x) => x.id === ticketId)),
    assign = useSupportStore((s) => s.assignTicket),
    update = useSupportStore((s) => s.updateTicket),
    [note, setNote] = useState("");
  if (!item) return <Empty />;
  const closed = item.status === "CLOSED";
  return (
    <>
      <Header
        title={item.subject}
        intro={`${item.id} · ${item.customerName}`}
        action={
          <Badge tone={tone(item.status)}>{ticketLabel[item.status]}</Badge>
        }
      />
      <div className="case-layout">
        <main>
          <section className="support-card immutable-source">
            <LockKeyhole />
            <div>
              <h2>Nội dung Customer gửi</h2>
              <p>{item.description}</p>
              <small>Nội dung gốc không thể chỉnh sửa theo CSAI_BR_13.</small>
            </div>
          </section>
          <section className="support-card">
            <h2>Tài liệu đính kèm</h2>
            {item.attachments.length ? (
              item.attachments.map((x) => (
                <p key={x}>
                  <Paperclip /> {x}
                </p>
              ))
            ) : (
              <p>Không có tài liệu.</p>
            )}
          </section>
          <section className="support-card">
            <h2>Lịch sử xử lý</h2>
            <Timeline events={item.events} />
          </section>
        </main>
        <aside>
          <section className="support-card case-actions">
            <h2>Xử lý ticket</h2>
            <label>
              Assignee
              <select
                value={item.assignee || ""}
                disabled={closed}
                onChange={(e) => assign(item.id, e.target.value)}
              >
                <option value="">Chưa giao</option>
                <option>CS Linh</option>
                <option>CS Nam</option>
              </select>
            </label>
            <label>
              Processing note
              <textarea
                value={note}
                disabled={closed}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button
              disabled={closed}
              className="button secondary"
              onClick={() => update(item.id, "PENDING_CUSTOMER_RESPONSE", note)}
            >
              Yêu cầu bổ sung
            </button>
            <button
              disabled={closed}
              className="button primary"
              onClick={() => update(item.id, "IN_PROGRESS", note)}
            >
              Lưu xử lý
            </button>
            <button
              disabled={closed || !note.trim()}
              className="button danger"
              onClick={() => update(item.id, "CLOSED", note)}
            >
              Đóng ticket
            </button>
            {closed && (
              <p className="readonly-note">Ticket đã đóng và chỉ được xem.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
export function ComplaintQueue() {
  const items = useSupportStore((s) => s.complaints);
  return (
    <>
      <Header
        title="Khiếu nại"
        intro="Mỗi complaint phải tham chiếu một Support Ticket hợp lệ."
      />
      <QueueToolbar />
      <section className="support-card">
        {items.map((x) => (
          <Link
            className="support-list-row"
            to={`/support/complaints/${x.id}`}
            key={x.id}
          >
            <AlertTriangle />
            <div>
              <strong>{x.title}</strong>
              <span>
                {x.id} · Ticket {x.ticketId}
              </span>
            </div>
            <Badge tone={tone(x.status)}>{complaintLabel[x.status]}</Badge>
            <ArrowRight />
          </Link>
        ))}
      </section>
    </>
  );
}
export function ComplaintWorkspace() {
  const { complaintId } = useParams(),
    item = useSupportStore((s) =>
      s.complaints.find((x) => x.id === complaintId),
    ),
    ticket = useSupportStore((s) =>
      s.tickets.find((t) => t.id === item?.ticketId),
    ),
    update = useSupportStore((s) => s.updateComplaint),
    createDispute = useSupportStore((s) => s.createDispute),
    navigate = useNavigate(),
    [note, setNote] = useState("");
  if (!item) return <Empty />;
  return (
    <>
      <Header
        title={item.title}
        intro={`${item.id} · Ticket nguồn ${item.ticketId}`}
        action={
          <Badge tone={tone(item.status)}>{complaintLabel[item.status]}</Badge>
        }
      />
      <div className="case-layout">
        <main>
          <section className="support-card">
            <h2>Khiếu nại và bằng chứng</h2>
            <p>{item.details}</p>
            {item.evidence.map((x) => (
              <p key={x}>
                <Paperclip /> {x}
              </p>
            ))}
          </section>
          <section className="support-card">
            <h2>Ticket nguồn</h2>
            <p>
              <strong>{ticket?.subject}</strong>
            </p>
            <p>{ticket?.description}</p>
            <Link to={`/support/tickets/${item.ticketId}`}>Mở ticket</Link>
          </section>
          <section className="support-card">
            <h2>Nhật ký xử lý</h2>
            <Timeline events={item.events} />
          </section>
        </main>
        <aside>
          <section className="support-card case-actions">
            <h2>Phương án xử lý</h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhận xét bắt buộc"
            />
            <button
              className="button secondary"
              disabled={!note}
              onClick={() => update(item.id, "PENDING_CUSTOMER_RESPONSE", note)}
            >
              Yêu cầu evidence
            </button>
            <button
              className="button primary"
              disabled={!note}
              onClick={() => update(item.id, "RESOLVED", note)}
            >
              Đánh dấu resolved
            </button>
            <button
              className="button danger"
              disabled={!note || Boolean(item.disputeId)}
              onClick={() => {
                const id = createDispute(item.id, note);
                navigate(`/support/disputes/${id}`);
              }}
            >
              Tạo Dispute Case
            </button>
            {item.disputeId && (
              <Link to={`/support/disputes/${item.disputeId}`}>
                Mở dispute hiện có
              </Link>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
export function DisputeQueue() {
  const items = useSupportStore((s) => s.disputes);
  return (
    <>
      <Header
        title="Dispute Case"
        intro="Điều phối điều tra, retention hold và phối hợp Finance."
      />
      <QueueToolbar />
      <section className="support-card">
        {items.map((x) => (
          <Link
            className="support-list-row"
            to={`/support/disputes/${x.id}`}
            key={x.id}
          >
            <ShieldCheck />
            <div>
              <strong>{x.title}</strong>
              <span>
                {x.id} · Complaint {x.complaintId}
              </span>
            </div>
            <Badge tone={tone(x.status)}>{disputeLabel[x.status]}</Badge>
            <ArrowRight />
          </Link>
        ))}
      </section>
    </>
  );
}
export function DisputeWorkspace() {
  const { disputeId } = useParams(),
    item = useSupportStore((s) => s.disputes.find((x) => x.id === disputeId)),
    inv = useSupportStore((s) =>
      s.investigations.find((x) => x.id === item?.financialInvestigationId),
    ),
    hold = useSupportStore((s) => s.requestRetentionHold),
    requestFinance = useSupportStore((s) => s.requestFinancialInvestigation),
    provideFinanceInfo = useSupportStore(
      (s) => s.provideFinancialInvestigationInfo,
    ),
    update = useSupportStore((s) => s.updateDispute),
    [modal, setModal] = useState<"hold" | "finance" | null>(null),
    [financeType, setFinanceType] = useState<"PAYMENT" | "DEPOSIT" | "REFUND">(
      "REFUND",
    ),
    [financeReference, setFinanceReference] = useState(""),
    [note, setNote] = useState("");
  if (!item) return <Empty />;
  return (
    <>
      <Header
        title={item.title}
        intro={`${item.id} · Complaint ${item.complaintId}`}
        action={
          <Badge tone={tone(item.status)}>{disputeLabel[item.status]}</Badge>
        }
      />
      <div className="case-layout">
        <main>
          <section className="support-card">
            <h2>Thông tin điều tra</h2>
            <p>{item.investigationNote}</p>
            {item.retentionHold && (
              <div className="retention-banner">
                <LockKeyhole />
                <div>
                  <strong>
                    {item.retentionHold.status === "ACTIVE"
                      ? "Bảo toàn bằng chứng đang hoạt động"
                      : item.retentionHold.status === "REJECTED"
                        ? "Đề nghị bảo toàn bằng chứng đã bị từ chối"
                        : "Đang chờ Admin phê duyệt bảo toàn bằng chứng"}
                  </strong>
                  <p>
                    {item.retentionHold.reason} · {item.retentionHold.createdAt}
                  </p>
                  {item.retentionHold.decisionNote && (
                    <p>Căn cứ quyết định: {item.retentionHold.decisionNote}</p>
                  )}
                </div>
              </div>
            )}
          </section>
          {inv && (
            <section className="support-card">
              <h2>Điều tra tài chính</h2>
              <p>
                {inv.id} · {inv.type} · {inv.transactionReference}
              </p>
              <Badge tone={inv.status === "SUBMITTED" ? "success" : "warning"}>
                {inv.status}
              </Badge>
              <p>{inv.findings || "Đang chờ Finance trả kết quả."}</p>
            </section>
          )}
          <section className="support-card">
            <h2>Nhật ký xử lý</h2>
            <Timeline events={item.events} />
          </section>
        </main>
        <aside>
          <section className="support-card case-actions">
            <h2>Điều phối hồ sơ</h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú điều tra hoặc nội dung đề xuất xử lý"
            />
            <button
              className="button secondary"
              disabled={
                item.status !== "UNDER_INVESTIGATION" ||
                Boolean(item.retentionHold)
              }
              onClick={() => setModal("hold")}
            >
              Yêu cầu bảo toàn bằng chứng
            </button>
            <button
              className="button secondary"
              disabled={Boolean(item.financialInvestigationId)}
              onClick={() => setModal("finance")}
            >
              Yêu cầu Finance điều tra
            </button>
            {inv?.status === "MORE_INFO_REQUIRED" && (
              <button
                className="button secondary"
                disabled={!note.trim()}
                onClick={() => provideFinanceInfo(inv.id, note)}
              >
                Gửi thông tin bổ sung cho Finance
              </button>
            )}
            <button
              className="button primary"
              disabled={
                !note.trim() ||
                Boolean(inv && inv.status !== "SUBMITTED")
              }
              onClick={() => update(item.id, "RESOLVED", note)}
            >
              Xác nhận phương án xử lý
            </button>
            <button
              className="button danger"
              disabled={item.status !== "RESOLVED"}
              onClick={() => update(item.id, "CLOSED", note)}
            >
              Đóng case
            </button>
          </section>
        </aside>
      </div>
      {modal && (
        <CaseModal
          title={
            modal === "hold"
              ? "Đề nghị bảo toàn bằng chứng"
              : "Yêu cầu điều tra tài chính"
          }
          value={note}
          setValue={setNote}
          financeType={modal === "finance" ? financeType : undefined}
          setFinanceType={modal === "finance" ? setFinanceType : undefined}
          financeReference={modal === "finance" ? financeReference : undefined}
          setFinanceReference={
            modal === "finance" ? setFinanceReference : undefined
          }
          close={() => setModal(null)}
          submit={() => {
            if (modal === "hold") hold(item.id, note);
            else requestFinance(item.id, financeType, financeReference.trim());
            setModal(null);
          }}
        />
      )}
    </>
  );
}

export function RetentionHoldGovernancePage() {
  const disputes = useSupportStore((s) => s.disputes);
  const decide = useSupportStore((s) => s.decideRetentionHold);
  const pending = disputes.filter(
    (item) => item.retentionHold?.status === "PENDING_ADMIN_APPROVAL",
  );
  const history = disputes.filter(
    (item) =>
      item.retentionHold &&
      item.retentionHold.status !== "PENDING_ADMIN_APPROVAL",
  );
  const [selectedId, setSelectedId] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const selected = disputes.find((item) => item.id === selectedId);

  const finish = (approved: boolean) => {
    if (!selectedId || !decisionNote.trim()) return;
    decide(selectedId, approved, decisionNote.trim());
    setSelectedId("");
    setDecisionNote("");
  };

  return (
    <>
      <header className="support-header">
        <div>
          <span>ADMIN GOVERNANCE</span>
          <h1>Phê duyệt bảo toàn bằng chứng</h1>
          <p>
            Admin kiểm soát các đề nghị khóa dữ liệu phục vụ điều tra do CSKH
            gửi lên.
          </p>
        </div>
      </header>
      <section className="support-card">
        {pending.length === 0 ? (
          <div className="support-card">
            <h2>Không có đề nghị đang chờ</h2>
            <p>
              Yêu cầu sẽ xuất hiện khi CSKH mở hồ sơ tranh chấp và chọn
              “Yêu cầu bảo toàn bằng chứng”.
            </p>
          </div>
        ) : (
          pending.map((item) => (
            <button
              type="button"
              className="support-list-row support-decision-row"
              key={item.id}
              onClick={() => setSelectedId(item.id)}
            >
              <LockKeyhole />
              <div>
                <strong>{item.title}</strong>
                <span>
                  {item.id} · {item.retentionHold?.reason}
                </span>
              </div>
              <Badge tone="warning">Chờ phê duyệt</Badge>
              <ArrowRight />
            </button>
          ))
        )}
      </section>
      <section className="support-card">
        <h2>Lịch sử quyết định</h2>
        {history.length === 0 ? (
          <p>Chưa có yêu cầu bảo toàn bằng chứng đã xử lý.</p>
        ) : (
          history.map((item) => (
            <article className="support-list-row" key={item.id}>
              <LockKeyhole />
              <div>
                <strong>{item.title}</strong>
                <span>
                  {item.id} · {item.retentionHold?.reason}
                </span>
                {item.retentionHold?.decisionNote && (
                  <small>Căn cứ: {item.retentionHold.decisionNote}</small>
                )}
              </div>
              <Badge
                tone={
                  item.retentionHold?.status === "ACTIVE"
                    ? "success"
                    : "danger"
                }
              >
                {item.retentionHold?.status === "ACTIVE"
                  ? "Đang bảo toàn"
                  : "Đã từ chối"}
              </Badge>
            </article>
          ))
        )}
      </section>
      {selected?.retentionHold && (
        <div className="support-modal-backdrop" role="presentation">
          <section
            className="support-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="retention-hold-title"
          >
            <h2 id="retention-hold-title">Quyết định bảo toàn bằng chứng</h2>
            <p>
              <strong>{selected.id}</strong> · {selected.title}
            </p>
            <p>Lý do đề nghị: {selected.retentionHold.reason}</p>
            <textarea
              autoFocus
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder="Nhập căn cứ phê duyệt hoặc lý do từ chối"
            />
            <footer>
              <button
                className="button ghost"
                onClick={() => setSelectedId("")}
              >
                Hủy
              </button>
              <button
                className="button danger"
                disabled={!decisionNote.trim()}
                onClick={() => finish(false)}
              >
                Từ chối
              </button>
              <button
                className="button primary"
                disabled={!decisionNote.trim()}
                onClick={() => finish(true)}
              >
                Phê duyệt
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
function CaseModal({
  title,
  value,
  setValue,
  financeType,
  setFinanceType,
  financeReference,
  setFinanceReference,
  close,
  submit,
}: {
  title: string;
  value: string;
  setValue: (v: string) => void;
  financeType?: "PAYMENT" | "DEPOSIT" | "REFUND";
  setFinanceType?: (value: "PAYMENT" | "DEPOSIT" | "REFUND") => void;
  financeReference?: string;
  setFinanceReference?: (value: string) => void;
  close: () => void;
  submit: () => void;
}) {
  return (
    <div className="support-modal-backdrop">
      <section className="support-modal" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <p>Hành động sẽ được ghi vào Audit Log.</p>
        {financeType && setFinanceType && setFinanceReference && (
          <div className="support-modal-fields">
            <label>
              Loại nghiệp vụ
              <select
                value={financeType}
                onChange={(event) =>
                  setFinanceType(
                    event.target.value as "PAYMENT" | "DEPOSIT" | "REFUND",
                  )
                }
              >
                <option value="PAYMENT">Thanh toán</option>
                <option value="DEPOSIT">Tiền đặt trước</option>
                <option value="REFUND">Hoàn tiền</option>
              </select>
            </label>
            <label>
              Mã tham chiếu giao dịch
              <input
                value={financeReference}
                onChange={(event) => setFinanceReference(event.target.value)}
                placeholder="Ví dụ: REF-0214"
              />
            </label>
          </div>
        )}
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Nhập lý do hoặc phạm vi điều tra"
        />
        <footer>
          <button className="button secondary" onClick={close}>
            Hủy
          </button>
          <button
            className="button primary"
            disabled={
              !value.trim() ||
              Boolean(financeType && !financeReference?.trim())
            }
            onClick={submit}
          >
            Xác nhận
          </button>
        </footer>
      </section>
    </div>
  );
}
export function CustomerLookup() {
  const tickets = useSupportStore((s) => s.tickets);
  const accounts = useCustomerGovernanceStore((s) => s.accounts);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const selectedTickets = tickets.filter(
    (ticket) => ticket.customerId === selectedCustomer,
  );
  const selectedAccount = accounts.find(
    (account) => account.id === selectedCustomer,
  );
  return (
    <>
      <Header
        title="Tra cứu khách hàng"
        intro="Customer 360 chỉ đọc; CSKH xem trạng thái cần thiết để hỗ trợ nhưng không phê duyệt eKYC hoặc khóa tài khoản."
      />
      <QueueToolbar />
      <section className="support-card">
        {accounts.map(
          (account) => (
            <div className="support-list-row" key={account.id}>
              <UserRound />
              <div>
                <strong>{account.name}</strong>
                <span>
                  {account.id} ·{" "}
                  {tickets.filter((ticket) => ticket.customerId === account.id).length}{" "}
                  ticket
                </span>
              </div>
              <Badge
                tone={
                  account.ekycStatus === "VERIFIED"
                    ? "success"
                    : account.ekycStatus === "REJECTED"
                      ? "danger"
                      : "warning"
                }
              >
                eKYC: {account.ekycStatus.replaceAll("_", " ")}
              </Badge>
              {account.supportHandoff && (
                <Badge tone="warning">Cần CSKH hỗ trợ bổ sung</Badge>
              )}
              <button
                className="button secondary"
                onClick={() => setSelectedCustomer(account.id)}
              >
                Xem thông tin hỗ trợ
              </button>
            </div>
          ),
        )}
      </section>
      {selectedCustomer && (
        <div className="support-modal-backdrop">
          <section className="support-modal" role="dialog" aria-modal="true">
            <h2>Thông tin hỗ trợ của Customer</h2>
            <p>
              Chỉ hiển thị dữ liệu tối thiểu theo phạm vi CSKH; không cho phép
              sửa eKYC hoặc trạng thái tài chính.
            </p>
            <dl>
              <div>
                <dt>Mã Customer</dt>
                <dd>{selectedCustomer}</dd>
              </div>
              <div>
                <dt>Số ticket</dt>
                <dd>{selectedTickets.length}</dd>
              </div>
              <div>
                <dt>Ticket gần nhất</dt>
                <dd>{selectedTickets[0]?.subject || "Không có"}</dd>
              </div>
              <div>
                <dt>Trạng thái eKYC</dt>
                <dd>{selectedAccount?.ekycStatus.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Hướng xử lý</dt>
                <dd>
                  {selectedAccount?.supportHandoff
                    ? "Liên hệ Customer và hướng dẫn bổ sung hồ sơ"
                    : "Không có handoff eKYC đang chờ"}
                </dd>
              </div>
            </dl>
            <footer>
              <button
                className="button primary"
                onClick={() => setSelectedCustomer(null)}
              >
                Đóng
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
export function KnowledgeGapQueue() {
  const items = useSupportStore((s) => s.knowledgeGaps),
    forward = useSupportStore((s) => s.forwardKnowledgeGap);
  return (
    <>
      <Header
        title="Knowledge Gap"
        intro="Review và chuyển proposal sang Content Staff; Customer Support không publish Knowledge Base."
      />
      <section className="support-card">
        {items.map((x) => (
          <div className="knowledge-row" key={x.id}>
            <FileSearch />
            <div>
              <strong>{x.question}</strong>
              <span>
                {x.id} · {x.frequency} lượt gặp · confidence{" "}
                {Math.round(x.confidence * 100)}%
              </span>
            </div>
            <Badge tone={x.status === "OPEN" ? "warning" : "info"}>
              {x.status}
            </Badge>
            <button
              className="button secondary"
              disabled={
                x.status === "FORWARDED_TO_CONTENT" || x.status === "RESOLVED"
              }
              onClick={() => forward(x.id)}
            >
              Chuyển Content Staff
            </button>
            {x.proposalId && <small>Proposal {x.proposalId}</small>}
          </div>
        ))}
      </section>
    </>
  );
}
function Empty() {
  return (
    <div className="support-empty">
      <FileSearch />
      <h1>Không tìm thấy hồ sơ</h1>
      <Link to="/support">Về tổng quan</Link>
    </div>
  );
}
