import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  Headphones,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { type SupportTicket, useSupportStore } from "../../store/supportStore";
function CustomerHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="customer-support-header">
      <span>TRUNG TÂM HỖ TRỢ</span>
      <h1>{title}</h1>
      <p>{intro}</p>
    </header>
  );
}
export function CustomerSupportHome() {
  const allTickets = useSupportStore((s) => s.tickets),
    allComplaints = useSupportStore((s) => s.complaints);
  const tickets = allTickets.filter((x) => x.customerId === "CUS-001"),
    complaints = allComplaints.filter((x) => x.customerId === "CUS-001");
  return (
    <>
      <CustomerHeader
        title="Hỗ trợ của tôi"
        intro="Chat với AI, tạo yêu cầu hỗ trợ và theo dõi hồ sơ của bạn."
      />
      <div className="customer-support-actions">
        <Link to="/account/support/chat">
          <Bot />
          <strong>Hỏi AI Chatbot</strong>
          <span>FAQ, hướng dẫn và tra cứu trạng thái chỉ đọc</span>
        </Link>
        <Link to="/account/support/tickets/new">
          <Plus />
          <strong>Tạo Support Ticket</strong>
          <span>Gửi yêu cầu cần Customer Service xử lý</span>
        </Link>
        <Link to="/account/support/complaints/new">
          <AlertTriangle />
          <strong>Gửi khiếu nại</strong>
          <span>Complaint phải liên kết một ticket hợp lệ</span>
        </Link>
      </div>
      <div className="customer-case-grid">
        <section>
          <h2>Ticket gần đây</h2>
          {tickets.map((x) => (
            <Link to={`/account/support/tickets/${x.id}`} key={x.id}>
              <MessageCircle />
              <div>
                <strong>{x.subject}</strong>
                <span>
                  {x.id} · {x.status}
                </span>
              </div>
              <ArrowRight />
            </Link>
          ))}
        </section>
        <section>
          <h2>Khiếu nại</h2>
          {complaints.map((x) => (
            <div className="customer-case-row" key={x.id}>
              <ShieldCheck />
              <div>
                <strong>{x.title}</strong>
                <span>
                  {x.id} · {x.status}
                </span>
              </div>
            </div>
          ))}
          {!complaints.length && <p>Chưa có khiếu nại.</p>}
        </section>
      </div>
    </>
  );
}
export function CustomerChatPage() {
  const [messages, setMessages] = useState([
      {
        sender: "AI",
        text: "Xin chào! Tôi có thể hỗ trợ FAQ, hướng dẫn hoặc tra cứu trạng thái chỉ đọc.",
      },
    ]),
    [text, setText] = useState(""),
    [handoff, setHandoff] = useState(false);
  function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const q = text;
    setMessages((m) => [
      ...m,
      { sender: "CUSTOMER", text: q },
      {
        sender: "AI",
        text: q.toLowerCase().includes("hoàn tiền")
          ? "Tôi chưa có đủ reference để trả lời chính xác. Tôi đã ghi nhận Knowledge Gap và đề xuất Human Handoff."
          : "Theo Knowledge Base, bạn có thể kiểm tra trạng thái tương ứng trong tài khoản hoặc tạo Support Ticket nếu cần xử lý.",
      },
    ]);
    setText("");
  }
  return (
    <>
      <CustomerHeader
        title="AI Chatbot"
        intro="Chatbot không thể duyệt KYC, xác nhận thanh toán, hoàn tiền hay thay đổi kết quả đấu giá."
      />
      <div className="customer-chat-layout">
        <section className="customer-chat-thread">
          {messages.map((m, i) => (
            <div
              className={`customer-chat-message ${m.sender.toLowerCase()}`}
              key={i}
            >
              <strong>{m.sender}</strong>
              <p>{m.text}</p>
            </div>
          ))}
          <form onSubmit={send}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập câu hỏi..."
            />
            <button className="button primary">
              <Send />
              Gửi
            </button>
          </form>
        </section>
        <aside>
          <h2>Cần hỗ trợ trực tiếp?</h2>
          <p>Human Handoff chỉ chuyển hội thoại và không tự tạo ticket.</p>
          <button className="button secondary" onClick={() => setHandoff(true)}>
            <Headphones />
            Yêu cầu Human Handoff
          </button>
          <Link className="button secondary" to="/account/support/tickets/new">
            Tạo Support Ticket
          </Link>
          {handoff && (
            <div className="handoff-state">
              <CheckCircle2 />
              <strong>Đang tìm nhân viên hỗ trợ</strong>
              <p>Nếu chưa có nhân viên, bạn vẫn có thể tạo ticket.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
export function CustomerTicketList() {
  const tickets = useSupportStore((s) => s.tickets);
  const items = tickets.filter((x) => x.customerId === "CUS-001");
  return (
    <>
      <CustomerHeader
        title="Support Ticket của tôi"
        intro="Bạn chỉ có thể xem các ticket thuộc tài khoản hiện tại."
      />
      <div className="customer-list-header">
        <span>{items.length} ticket</span>
        <Link className="button primary" to="/account/support/tickets/new">
          <Plus />
          Tạo ticket
        </Link>
      </div>
      <section className="customer-ticket-list">
        {items.map((x) => (
          <Link to={`/account/support/tickets/${x.id}`} key={x.id}>
            <MessageCircle />
            <div>
              <strong>{x.subject}</strong>
              <span>
                {x.id} · {x.category} · {x.updatedAt}
              </span>
            </div>
            <Badge tone={x.status === "CLOSED" ? "success" : "warning"}>
              {x.status}
            </Badge>
            <ArrowRight />
          </Link>
        ))}
      </section>
    </>
  );
}
export function CustomerCreateTicket() {
  const create = useSupportStore((s) => s.createTicket),
    navigate = useNavigate(),
    [subject, setSubject] = useState(""),
    [description, setDescription] = useState(""),
    [category, setCategory] = useState<SupportTicket["category"]>("ACCOUNT"),
    [file, setFile] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const id = create({
      subject,
      description,
      category,
      attachments: file ? [file] : [],
    });
    navigate(`/account/support/tickets/${id}`);
  }
  return (
    <>
      <CustomerHeader
        title="Tạo Support Ticket"
        intro="Cung cấp đủ thông tin để yêu cầu được phân loại chính xác."
      />
      <form className="customer-support-form" onSubmit={submit}>
        <label>
          Chủ đề
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label>
          Danh mục
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as SupportTicket["category"])
            }
          >
            <option value="ACCOUNT">Tài khoản/KYC</option>
            <option value="AUCTION">Đấu giá</option>
            <option value="PAYMENT">Thanh toán</option>
            <option value="REFUND">Hoàn tiền</option>
            <option value="LIVESTREAM">Livestream</option>
            <option value="HANDOVER">Bàn giao</option>
          </select>
        </label>
        <label className="wide">
          Mô tả
          <textarea
            required
            minLength={20}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="wide file-field">
          <Upload />
          Tài liệu hỗ trợ
          <input
            type="file"
            accept="image/png,image/jpeg,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0]?.name || "")}
          />
          <small>PNG, JPG hoặc PDF; tối đa 5 MB trong prototype.</small>
        </label>
        <footer>
          <Link className="button secondary" to="/account/support">
            Hủy
          </Link>
          <button className="button primary">Gửi ticket</button>
        </footer>
      </form>
    </>
  );
}
export function CustomerTicketDetail() {
  const { ticketId } = useParams(),
    item = useSupportStore((s) =>
      s.tickets.find((x) => x.id === ticketId && x.customerId === "CUS-001"),
    );
  if (!item) return <NotFound />;
  return (
    <>
      <CustomerHeader
        title={item.subject}
        intro={`${item.id} · ${item.category}`}
      />
      <div className="customer-ticket-detail">
        <main>
          <section>
            <h2>Nội dung đã gửi</h2>
            <p>{item.description}</p>
            {item.attachments.map((x) => (
              <p key={x}>
                <Paperclip /> {x}
              </p>
            ))}
          </section>
          <section>
            <h2>Lịch sử xử lý</h2>
            {item.events.map((x) => (
              <div className="customer-event" key={x.id}>
                <span />
                <div>
                  <strong>{x.label}</strong>
                  <p>{x.note}</p>
                  <small>{x.at}</small>
                </div>
              </div>
            ))}
          </section>
        </main>
        <aside>
          <Badge tone={item.status === "CLOSED" ? "success" : "warning"}>
            {item.status}
          </Badge>
          <p>Nhân viên xử lý: {item.assignee || "Chưa được giao"}</p>
          {item.processingNote && <p>{item.processingNote}</p>}
          {item.status === "CLOSED" ? (
            <p>Ticket đã đóng và chỉ được xem.</p>
          ) : (
            <button className="button secondary">Bổ sung thông tin</button>
          )}
          <Link
            className="button secondary"
            to={`/account/support/complaints/new?ticket=${item.id}`}
          >
            Gửi khiếu nại
          </Link>
        </aside>
      </div>
    </>
  );
}
export function CustomerCreateComplaint() {
  const allTickets = useSupportStore((s) => s.tickets);
  const create = useSupportStore((s) => s.createComplaint);
  const navigate = useNavigate();
  const tickets = allTickets.filter((x) => x.customerId === "CUS-001");
  const [ticketId, setTicket] = useState(tickets[0]?.id || ""),
    [title, setTitle] = useState(""),
    [details, setDetails] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    create(ticketId, title, details);
    navigate("/account/support");
  }
  return (
    <>
      <CustomerHeader
        title="Gửi khiếu nại"
        intro="Mỗi Complaint phải liên kết với một Support Ticket hợp lệ."
      />
      <form className="customer-support-form" onSubmit={submit}>
        <label className="wide">
          Support Ticket
          <select value={ticketId} onChange={(e) => setTicket(e.target.value)}>
            {tickets.map((x) => (
              <option value={x.id} key={x.id}>
                {x.id} · {x.subject}
              </option>
            ))}
          </select>
        </label>
        <label className="wide">
          Tiêu đề
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="wide">
          Nội dung khiếu nại
          <textarea
            required
            minLength={20}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </label>
        <label className="wide file-field">
          <Paperclip />
          Evidence
          <input type="file" accept="image/png,image/jpeg,application/pdf" />
        </label>
        <footer>
          <Link className="button secondary" to="/account/support">
            Hủy
          </Link>
          <button className="button primary">Gửi complaint</button>
        </footer>
      </form>
    </>
  );
}
function NotFound() {
  return (
    <div className="customer-support-empty">
      <FileText />
      <h1>Không tìm thấy hồ sơ</h1>
      <Link to="/account/support">Về trung tâm hỗ trợ</Link>
    </div>
  );
}
