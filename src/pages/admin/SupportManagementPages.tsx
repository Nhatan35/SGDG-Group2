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
          <h2>Context chỉ đọc</h2>
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
            <h2>Complaint & evidence</h2>
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
            <h2>Timeline</h2>
            <Timeline events={item.events} />
          </section>
        </main>
        <aside>
          <section className="support-card case-actions">
            <h2>Resolution</h2>
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
    update = useSupportStore((s) => s.updateDispute),
    [modal, setModal] = useState<"hold" | "finance" | null>(null),
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
            <h2>Investigation</h2>
            <p>{item.investigationNote}</p>
            {item.retentionHold && (
              <div className="retention-banner">
                <LockKeyhole />
                <div>
                  <strong>Retention Hold đang hoạt động</strong>
                  <p>
                    {item.retentionHold.reason} · {item.retentionHold.createdAt}
                  </p>
                </div>
              </div>
            )}
          </section>
          {inv && (
            <section className="support-card">
              <h2>Financial Investigation</h2>
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
            <h2>Audit timeline</h2>
            <Timeline events={item.events} />
          </section>
        </main>
        <aside>
          <section className="support-card case-actions">
            <h2>Điều phối case</h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Investigation note / final resolution"
            />
            <button
              className="button secondary"
              disabled={
                item.status !== "UNDER_INVESTIGATION" ||
                Boolean(item.retentionHold)
              }
              onClick={() => setModal("hold")}
            >
              Request Retention Hold
            </button>
            <button
              className="button secondary"
              disabled={Boolean(item.financialInvestigationId)}
              onClick={() => setModal("finance")}
            >
              Yêu cầu Finance điều tra
            </button>
            <button
              className="button primary"
              disabled={!note}
              onClick={() => update(item.id, "RESOLVED", note)}
            >
              Xác nhận resolution
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
              ? "Request Retention Hold"
              : "Yêu cầu Financial Investigation"
          }
          value={note}
          setValue={setNote}
          close={() => setModal(null)}
          submit={() => {
            if (modal === "hold") hold(item.id, note);
            else requestFinance(item.id, "REFUND", "REF-0214");
            setModal(null);
          }}
        />
      )}
    </>
  );
}
function CaseModal({
  title,
  value,
  setValue,
  close,
  submit,
}: {
  title: string;
  value: string;
  setValue: (v: string) => void;
  close: () => void;
  submit: () => void;
}) {
  return (
    <div className="support-modal-backdrop">
      <section className="support-modal" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <p>Hành động sẽ được ghi vào Audit Log.</p>
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
            disabled={!value.trim()}
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
  return (
    <>
      <Header
        title="Tra cứu khách hàng"
        intro="Customer 360 chỉ đọc, giới hạn dữ liệu cần thiết cho case hỗ trợ."
      />
      <QueueToolbar />
      <section className="support-card">
        {[...new Map(tickets.map((x) => [x.customerId, x])).values()].map(
          (x) => (
            <div className="support-list-row" key={x.customerId}>
              <UserRound />
              <div>
                <strong>{x.customerName}</strong>
                <span>
                  {x.customerId} ·{" "}
                  {tickets.filter((t) => t.customerId === x.customerId).length}{" "}
                  ticket
                </span>
              </div>
              <Badge tone="success">KYC: VERIFIED</Badge>
              <button className="button secondary">Xem context</button>
            </div>
          ),
        )}
      </section>
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
