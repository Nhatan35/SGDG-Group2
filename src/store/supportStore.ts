import { create } from "zustand";
import { persist } from "zustand/middleware";
export type TicketStatus =
  "OPEN" | "IN_PROGRESS" | "PENDING_CUSTOMER_RESPONSE" | "CLOSED";
export type ComplaintStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "PENDING_CUSTOMER_RESPONSE"
  | "RESOLVED"
  | "CLOSED"
  | "ESCALATED_TO_DISPUTE";
export type DisputeStatus =
  | "UNDER_INVESTIGATION"
  | "FINANCIAL_INVESTIGATION_PENDING"
  | "ADDITIONAL_INFORMATION_REQUIRED"
  | "RESOLVED"
  | "CLOSED";
export interface CaseEvent {
  id: string;
  label: string;
  actor: string;
  at: string;
  note?: string;
}
export interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  subject: string;
  description: string;
  category:
    "ACCOUNT" | "AUCTION" | "PAYMENT" | "REFUND" | "LIVESTREAM" | "HANDOVER";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: TicketStatus;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  attachments: string[];
  processingNote?: string;
  events: CaseEvent[];
}
export interface Complaint {
  id: string;
  ticketId: string;
  customerId: string;
  title: string;
  details: string;
  category: SupportTicket["category"];
  status: ComplaintStatus;
  assignee?: string;
  createdAt: string;
  evidence: string[];
  resolution?: string;
  disputeId?: string;
  events: CaseEvent[];
}
export interface FinancialInvestigation {
  id: string;
  disputeId: string;
  transactionReference: string;
  type: "PAYMENT" | "DEPOSIT" | "REFUND";
  status: "REQUESTED" | "IN_PROGRESS" | "MORE_INFO_REQUIRED" | "SUBMITTED";
  requestedAt: string;
  findings?: string;
  financeStaff?: string;
  events: CaseEvent[];
}
export interface DisputeCase {
  id: string;
  complaintId: string;
  customerId: string;
  title: string;
  status: DisputeStatus;
  assignee: string;
  createdAt: string;
  investigationNote: string;
  resolution?: string;
  retentionHold?: { reason: string; createdAt: string };
  financialInvestigationId?: string;
  events: CaseEvent[];
}
export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  topic: string;
  status: "AI_ACTIVE" | "WAITING_HANDOFF" | "STAFF_ACTIVE" | "ENDED";
  startedAt: string;
  assignedStaff?: string;
  messages: Array<{
    id: string;
    sender: "CUSTOMER" | "AI" | "STAFF";
    text: string;
    at: string;
  }>;
}
export interface KnowledgeGap {
  id: string;
  question: string;
  conversationId: string;
  frequency: number;
  confidence: number;
  status: "OPEN" | "REVIEWED" | "FORWARDED_TO_CONTENT" | "RESOLVED";
  createdAt: string;
  proposalId?: string;
  relatedArticle?: string;
}
interface SupportState {
  tickets: SupportTicket[];
  complaints: Complaint[];
  disputes: DisputeCase[];
  investigations: FinancialInvestigation[];
  conversations: Conversation[];
  knowledgeGaps: KnowledgeGap[];
  createTicket: (
    input: Pick<
      SupportTicket,
      "subject" | "description" | "category" | "attachments"
    >,
  ) => string;
  updateTicket: (id: string, status: TicketStatus, note: string) => void;
  assignTicket: (id: string, staff: string) => void;
  createComplaint: (ticketId: string, title: string, details: string) => string;
  updateComplaint: (id: string, status: ComplaintStatus, note: string) => void;
  createDispute: (complaintId: string, note: string) => string;
  updateDispute: (id: string, status: DisputeStatus, note: string) => void;
  requestRetentionHold: (id: string, reason: string) => void;
  requestFinancialInvestigation: (
    id: string,
    type: FinancialInvestigation["type"],
    reference: string,
  ) => void;
  submitFinancialInvestigation: (id: string, findings: string) => void;
  acceptConversation: (id: string) => void;
  sendStaffMessage: (id: string, text: string) => void;
  forwardKnowledgeGap: (id: string) => void;
}
const now = "20/07/2026 19:30";
const event = (
  id: string,
  label: string,
  actor: string,
  note?: string,
): CaseEvent => ({ id, label, actor, at: now, note });
const tickets: SupportTicket[] = [
  {
    id: "TKT-2407",
    customerId: "CUS-001",
    customerName: "Nguyễn Minh Anh",
    subject: "Không nhận được thông báo kết quả",
    description: "Tôi chưa nhận được email sau khi phiên Patek kết thúc.",
    category: "AUCTION",
    priority: "HIGH",
    status: "OPEN",
    createdAt: "20/07/2026 08:15",
    updatedAt: "20/07/2026 08:15",
    attachments: [],
    events: [event("EV-T1", "Ticket được tạo", "Customer")],
  },
  {
    id: "TKT-2404",
    customerId: "CUS-002",
    customerName: "Trần Quốc Huy",
    subject: "Kiểm tra trạng thái hoàn tiền",
    description: "Khoản đặt cọc chưa hiển thị trạng thái hoàn tiền.",
    category: "REFUND",
    priority: "URGENT",
    status: "IN_PROGRESS",
    assignee: "CS Linh",
    createdAt: "19/07/2026 14:20",
    updatedAt: "20/07/2026 09:00",
    attachments: ["bien-nhan.pdf"],
    processingNote: "Đang kiểm tra reference với Finance.",
    events: [
      event("EV-T2", "Ticket được tạo", "Customer"),
      event("EV-T3", "Đã nhận xử lý", "CS Linh"),
    ],
  },
  {
    id: "TKT-2398",
    customerId: "CUS-003",
    customerName: "Lê Hà My",
    subject: "Bổ sung tài liệu KYC",
    description: "Cần hướng dẫn loại tài liệu được chấp nhận.",
    category: "ACCOUNT",
    priority: "MEDIUM",
    status: "PENDING_CUSTOMER_RESPONSE",
    assignee: "CS Nam",
    createdAt: "18/07/2026 10:10",
    updatedAt: "19/07/2026 16:00",
    attachments: [],
    events: [event("EV-T4", "Yêu cầu bổ sung thông tin", "CS Nam")],
  },
  {
    id: "TKT-2380",
    customerId: "CUS-001",
    customerName: "Nguyễn Minh Anh",
    subject: "Thay đổi lịch bàn giao",
    description: "Yêu cầu đổi lịch đã được xử lý.",
    category: "HANDOVER",
    priority: "LOW",
    status: "CLOSED",
    assignee: "CS Linh",
    createdAt: "10/07/2026 09:00",
    updatedAt: "11/07/2026 15:20",
    attachments: [],
    processingNote: "Customer đã xác nhận lịch mới.",
    events: [event("EV-T5", "Ticket đã đóng", "CS Linh")],
  },
];
const complaints: Complaint[] = [
  {
    id: "CMP-173",
    ticketId: "TKT-2407",
    customerId: "CUS-001",
    title: "Khiếu nại việc không nhận thông báo kết quả",
    details: "Thông báo chậm ảnh hưởng đến thời gian phản hồi.",
    category: "AUCTION",
    status: "ESCALATED_TO_DISPUTE",
    assignee: "CS Linh",
    createdAt: "20/07/2026 10:00",
    evidence: [],
    disputeId: "DSP-091",
    events: [
      event("EV-C1", "Complaint được gửi", "Customer"),
      event("EV-C2", "Bắt đầu review", "CS Linh"),
    ],
  },
  {
    id: "CMP-168",
    ticketId: "TKT-2404",
    customerId: "CUS-002",
    title: "Khiếu nại hoàn tiền chậm",
    details: "Yêu cầu điều tra giao dịch hoàn tiền.",
    category: "REFUND",
    status: "ESCALATED_TO_DISPUTE",
    assignee: "CS Nam",
    createdAt: "19/07/2026 16:30",
    evidence: ["refund-reference.pdf"],
    disputeId: "DSP-088",
    events: [event("EV-C3", "Escalated to dispute", "CS Nam")],
  },
];
const disputes: DisputeCase[] = [
  {
    id: "DSP-088",
    complaintId: "CMP-168",
    customerId: "CUS-002",
    title: "Điều tra hoàn tiền REF-0214",
    status: "FINANCIAL_INVESTIGATION_PENDING",
    assignee: "CS Nam",
    createdAt: "19/07/2026 17:00",
    investigationNote: "Cần xác minh trạng thái transaction và reconciliation.",
    financialInvestigationId: "FIN-INV-088",
    events: [
      event("EV-D1", "Dispute được tạo", "CS Nam"),
      event("EV-D2", "Yêu cầu Finance điều tra", "CS Nam"),
    ],
  },
  {
    id: "DSP-091",
    complaintId: "CMP-173",
    customerId: "CUS-001",
    title: "Tranh chấp bằng chứng bàn giao",
    status: "UNDER_INVESTIGATION",
    assignee: "CS Linh",
    createdAt: "20/07/2026 11:15",
    investigationNote: "Đang tổng hợp evidence và lịch sử thông báo.",
    events: [event("EV-D3", "Bắt đầu điều tra", "CS Linh")],
  },
];
const investigations: FinancialInvestigation[] = [
  {
    id: "FIN-INV-088",
    disputeId: "DSP-088",
    transactionReference: "REF-0214",
    type: "REFUND",
    status: "REQUESTED",
    requestedAt: "20/07/2026 09:30",
    events: [event("EV-F1", "Yêu cầu điều tra tài chính", "CS Nam")],
  },
];
const conversations: Conversation[] = [
  {
    id: "CHAT-301",
    customerId: "CUS-004",
    customerName: "Phạm Tuấn Khang",
    topic: "Không tìm thấy trạng thái đặt cọc",
    status: "WAITING_HANDOFF",
    startedAt: "20/07/2026 19:22",
    messages: [
      {
        id: "M1",
        sender: "CUSTOMER",
        text: "Tôi muốn kiểm tra tiền đặt cọc.",
        at: "19:22",
      },
      {
        id: "M2",
        sender: "AI",
        text: "Tôi chưa tìm thấy reference phù hợp. Bạn có muốn gặp nhân viên hỗ trợ?",
        at: "19:23",
      },
    ],
  },
  {
    id: "CHAT-298",
    customerId: "CUS-001",
    customerName: "Nguyễn Minh Anh",
    topic: "Hướng dẫn bàn giao",
    status: "STAFF_ACTIVE",
    startedAt: "20/07/2026 18:40",
    assignedStaff: "CS Linh",
    messages: [
      {
        id: "M3",
        sender: "CUSTOMER",
        text: "Tôi cần đổi lịch nhận tài sản.",
        at: "18:40",
      },
      {
        id: "M4",
        sender: "STAFF",
        text: "Tôi đang kiểm tra lịch hiện tại của hồ sơ.",
        at: "18:42",
      },
    ],
  },
];
const knowledgeGaps: KnowledgeGap[] = [
  {
    id: "KG-032",
    question: "Khi provider báo đã giao nhưng chưa đủ evidence thì tôi làm gì?",
    conversationId: "CHAT-280",
    frequency: 8,
    confidence: 0.32,
    status: "OPEN",
    createdAt: "20/07/2026 08:00",
  },
  {
    id: "KG-029",
    question: "Thời gian hoàn tiền đặt cọc theo từng phương thức?",
    conversationId: "CHAT-271",
    frequency: 15,
    confidence: 0.21,
    status: "REVIEWED",
    createdAt: "18/07/2026 10:00",
  },
];
export const useSupportStore = create<SupportState>()(
  persist(
    (set) => ({
      tickets,
      complaints,
      disputes,
      investigations,
      conversations,
      knowledgeGaps,
      createTicket: (input) => {
        const id = `TKT-${Date.now()}`;
        set((s) => ({
          tickets: [
            {
              ...input,
              id,
              customerId: "CUS-001",
              customerName: "Nguyễn Minh Anh",
              priority: "MEDIUM",
              status: "OPEN",
              createdAt: now,
              updatedAt: now,
              events: [event(`EV-${id}`, "Ticket được tạo", "Customer")],
            },
            ...s.tickets,
          ],
        }));
        return id;
      },
      updateTicket: (id, status, note) =>
        set((s) => ({
          tickets: s.tickets.map((x) =>
            x.id === id && x.status !== "CLOSED"
              ? {
                  ...x,
                  status,
                  processingNote: note,
                  updatedAt: now,
                  events: [
                    ...x.events,
                    event(
                      `EV-${Date.now()}`,
                      `Status → ${status}`,
                      "Customer Support",
                      note,
                    ),
                  ],
                }
              : x,
          ),
        })),
      assignTicket: (id, staff) =>
        set((s) => ({
          tickets: s.tickets.map((x) =>
            x.id === id
              ? {
                  ...x,
                  assignee: staff,
                  status: x.status === "OPEN" ? "IN_PROGRESS" : x.status,
                }
              : x,
          ),
        })),
      createComplaint: (ticketId, title, details) => {
        const id = `CMP-${Date.now()}`;
        set((s) => {
          const t = s.tickets.find((x) => x.id === ticketId);
          if (
            !t ||
            s.complaints.some(
              (x) =>
                x.ticketId === ticketId &&
                !["CLOSED", "RESOLVED"].includes(x.status),
            )
          )
            return s;
          return {
            complaints: [
              {
                id,
                ticketId,
                customerId: t.customerId,
                title,
                details,
                category: t.category,
                status: "SUBMITTED",
                createdAt: now,
                evidence: [],
                disputeId: "DSP-091",
                events: [event(`EV-${id}`, "Complaint được gửi", "Customer")],
              },
              ...s.complaints,
            ],
          };
        });
        return id;
      },
      updateComplaint: (id, status, note) =>
        set((s) => ({
          complaints: s.complaints.map((x) =>
            x.id === id && x.status !== "CLOSED"
              ? {
                  ...x,
                  status,
                  resolution: note,
                  events: [
                    ...x.events,
                    event(
                      `EV-${Date.now()}`,
                      `Status → ${status}`,
                      "Customer Support",
                      note,
                    ),
                  ],
                }
              : x,
          ),
        })),
      createDispute: (complaintId, note) => {
        const id = `DSP-${Date.now()}`;
        set((s) => {
          const c = s.complaints.find((x) => x.id === complaintId);
          if (!c || c.disputeId) return s;
          return {
            complaints: s.complaints.map((x) =>
              x.id === complaintId
                ? { ...x, status: "ESCALATED_TO_DISPUTE", disputeId: id }
                : x,
            ),
            disputes: [
              {
                id,
                complaintId,
                customerId: c.customerId,
                title: `Điều tra ${c.title}`,
                status: "UNDER_INVESTIGATION",
                assignee: "CS hiện tại",
                createdAt: now,
                investigationNote: note,
                events: [
                  event(
                    `EV-${id}`,
                    "Dispute được tạo",
                    "Customer Support",
                    note,
                  ),
                ],
              },
              ...s.disputes,
            ],
          };
        });
        return id;
      },
      updateDispute: (id, status, note) =>
        set((s) => ({
          disputes: s.disputes.map((x) =>
            x.id === id && x.status !== "CLOSED"
              ? {
                  ...x,
                  status,
                  investigationNote: note,
                  resolution: ["RESOLVED", "CLOSED"].includes(status)
                    ? note
                    : x.resolution,
                  events: [
                    ...x.events,
                    event(
                      `EV-${Date.now()}`,
                      `Status → ${status}`,
                      "Customer Support",
                      note,
                    ),
                  ],
                }
              : x,
          ),
        })),
      requestRetentionHold: (id, reason) =>
        set((s) => ({
          disputes: s.disputes.map((x) =>
            x.id === id &&
            x.status === "UNDER_INVESTIGATION" &&
            !x.retentionHold
              ? {
                  ...x,
                  retentionHold: { reason, createdAt: now },
                  events: [
                    ...x.events,
                    event(
                      `EV-${Date.now()}`,
                      "Retention Hold activated",
                      "Customer Support",
                      reason,
                    ),
                  ],
                }
              : x,
          ),
        })),
      requestFinancialInvestigation: (id, type, reference) =>
        set((s) => {
          const d = s.disputes.find((x) => x.id === id);
          if (!d || d.financialInvestigationId) return s;
          const invId = `FIN-INV-${Date.now()}`;
          return {
            disputes: s.disputes.map((x) =>
              x.id === id
                ? {
                    ...x,
                    status: "FINANCIAL_INVESTIGATION_PENDING",
                    financialInvestigationId: invId,
                  }
                : x,
            ),
            investigations: [
              {
                id: invId,
                disputeId: id,
                transactionReference: reference,
                type,
                status: "REQUESTED",
                requestedAt: now,
                events: [
                  event(
                    `EV-${invId}`,
                    "Finance investigation requested",
                    "Customer Support",
                  ),
                ],
              },
              ...s.investigations,
            ],
          };
        }),
      submitFinancialInvestigation: (id, findings) =>
        set((s) => ({
          investigations: s.investigations.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "SUBMITTED",
                  findings,
                  financeStaff: "Finance Demo",
                  events: [
                    ...x.events,
                    event(
                      `EV-${Date.now()}`,
                      "Investigation result submitted",
                      "Finance",
                      findings,
                    ),
                  ],
                }
              : x,
          ),
          disputes: s.disputes.map((x) =>
            x.financialInvestigationId === id
              ? {
                  ...x,
                  status: "UNDER_INVESTIGATION",
                  events: [
                    ...x.events,
                    event(
                      `EV-${Date.now()}`,
                      "Finance result received",
                      "Finance",
                    ),
                  ],
                }
              : x,
          ),
        })),
      acceptConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.map((x) =>
            x.id === id && x.status === "WAITING_HANDOFF"
              ? { ...x, status: "STAFF_ACTIVE", assignedStaff: "CS Demo" }
              : x,
          ),
        })),
      sendStaffMessage: (id, text) =>
        set((s) => ({
          conversations: s.conversations.map((x) =>
            x.id === id
              ? {
                  ...x,
                  messages: [
                    ...x.messages,
                    {
                      id: `M-${Date.now()}`,
                      sender: "STAFF",
                      text,
                      at: new Date().toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    },
                  ],
                }
              : x,
          ),
        })),
      forwardKnowledgeGap: (id) =>
        set((s) => ({
          knowledgeGaps: s.knowledgeGaps.map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "FORWARDED_TO_CONTENT",
                  proposalId: `KBP-${Date.now()}`,
                }
              : x,
          ),
        })),
    }),
    { name: "sgdg-support-demo" },
  ),
);
