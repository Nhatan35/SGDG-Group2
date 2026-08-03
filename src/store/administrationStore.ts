import { create } from "zustand";

export type AccessRequestStatus = "PENDING_REVIEW" | "RETURNED" | "APPROVED" | "REJECTED";
export type TaskStatus = "ASSIGNED" | "IN_REVIEW" | "RETURNED" | "REJECTED" | "APPROVED" | "AWAITING_DOMAIN" | "COMPLETED" | "FAILED";
export type ConfigStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "RETURNED"
  | "REJECTED"
  | "APPROVED"
  | "SCHEDULED"
  | "ACTIVE"
  | "INACTIVE"
  | "SUPERSEDED";

export interface WorkforceProfile {
  id: string; name: string; email: string; department: string; role: string;
  status: "ACTIVE" | "SUSPENDED"; lastAccess: string; scope: string;
}
export interface AccessRequest {
  id: string; requester: string; targetId: string; requestedRole: string; scope: string;
  reason: string; submittedAt: string; status: AccessRequestStatus; risk: "LOW" | "MEDIUM" | "HIGH";
  decisionReason?: string; decidedBy?: string;
}
export interface ApprovalTask {
  id: string; requestType: string; domain: string; objectRef: string; requester: string;
  assignee: string; dueAt: string; status: TaskStatus; correlationId: string; summary: string;
  decisionReason?: string; decidedBy?: string;
}
export interface ConfigurationItem {
  id: string; category: string; name: string; scope: string; version: number;
  status: ConfigStatus; valueSummary: string; effectiveAt: string; maker: string;
  makerEmail: string; checker?: string; checkerEmail?: string;
  submissionReason?: string; decisionReason?: string;
}
export interface ReportSnapshot {
  id: string; report: string; period: string; createdAt: string; actor: string;
  freshness: string; completeness: string; filters?: string; values?: string;
}

interface AdministrationState {
  workforce: WorkforceProfile[];
  accessRequests: AccessRequest[];
  approvalTasks: ApprovalTask[];
  configurations: ConfigurationItem[];
  snapshots: ReportSnapshot[];
  decideAccess: (id: string, decision: "APPROVED" | "REJECTED" | "RETURNED", actor: string, reason: string) => void;
  decideTask: (id: string, decision: "APPROVED" | "REJECTED" | "RETURNED", actor: string, reason: string) => void;
  confirmDomain: (id: string, success: boolean) => void;
  submitConfiguration: (id: string, actorEmail: string, actorName: string, reason: string) => void;
  setConfigurationEffectiveAt: (id: string, effectiveAt: string) => void;
  approveConfiguration: (id: string, actorEmail: string, actorName: string, reason: string) => void;
  returnConfiguration: (id: string, actorEmail: string, actorName: string, reason: string) => void;
  rejectConfiguration: (id: string, actorEmail: string, actorName: string, reason: string) => void;
  reviseConfiguration: (id: string, actorEmail: string) => void;
  activateConfiguration: (id: string, actorEmail: string, reason: string) => void;
  deactivateConfiguration: (id: string, actorEmail: string, reason: string) => void;
  saveSnapshot: (input?: Partial<Omit<ReportSnapshot, "id">>) => void;
}

export const useAdministrationStore = create<AdministrationState>((set) => ({
  workforce: [
    { id: "WF-001", name: "Nguyễn Hoàng Nam", email: "nam.nguyen@sgdg.vn", department: "Administration", role: "ADMIN", status: "ACTIVE", lastAccess: "20/07/2026 21:42", scope: "TOÀN HỆ THỐNG" },
    { id: "WF-014", name: "Trần Minh Châu", email: "chau.tran@sgdg.vn", department: "Customer Service", role: "CUSTOMER_SUPPORT", status: "ACTIVE", lastAccess: "20/07/2026 20:18", scope: "CUSTOMER SERVICE" },
    { id: "WF-021", name: "Lê Thu Hà", email: "ha.le@sgdg.vn", department: "Content Operations", role: "CONTENT_STAFF", status: "ACTIVE", lastAccess: "20/07/2026 19:55", scope: "CMS & AUCTION OPS" },
    { id: "WF-032", name: "Phạm Quang Minh", email: "minh.pham@sgdg.vn", department: "Finance", role: "FINANCE", status: "SUSPENDED", lastAccess: "18/07/2026 17:20", scope: "FINANCIAL MANAGEMENT" },
  ],
  accessRequests: [
    { id: "AR-2026-041", requester: "Trưởng bộ phận CS", targetId: "WF-014", requestedRole: "CUSTOMER_SUPPORT_LEAD", scope: "Customer Service / Complaint", reason: "Điều phối escalation ca tối", submittedAt: "20/07/2026 20:05", status: "PENDING_REVIEW", risk: "MEDIUM" },
    { id: "AR-2026-039", requester: "Finance Manager", targetId: "WF-032", requestedRole: "FINANCE", scope: "Refund / Reconciliation", reason: "Khôi phục quyền sau rà soát", submittedAt: "20/07/2026 15:40", status: "PENDING_REVIEW", risk: "HIGH" },
    { id: "AR-2026-036", requester: "Content Lead", targetId: "WF-021", requestedRole: "CONTENT_STAFF", scope: "CMS / Publish", reason: "Bổ sung phạm vi xuất bản", submittedAt: "19/07/2026 09:12", status: "RETURNED", risk: "LOW" },
  ],
  approvalTasks: [
    { id: "AT-7102", requestType: "CONTENT_PUBLICATION", domain: "CMS", objectRef: "CNT-NEWS-042", requester: "Lê Thu Hà", assignee: "Nguyễn Hoàng Nam", dueAt: "21/07/2026 10:00", status: "ASSIGNED", correlationId: "COR-CMS-07102", summary: "Phê duyệt bài công bố kết quả phiên Patek 5711R" },
    { id: "AT-7098", requestType: "FINANCE_REFUND_EXCEPTION", domain: "Finance", objectRef: "REF-0214", requester: "Finance Operations", assignee: "Nguyễn Hoàng Nam", dueAt: "20/07/2026 23:30", status: "IN_REVIEW", correlationId: "COR-FIN-07098", summary: "Ngoại lệ hoàn tiền vượt ngưỡng kiểm soát" },
    { id: "AT-7089", requestType: "AUCTION_RULE_CHANGE", domain: "Auction", objectRef: "AUC-5711R", requester: "Auction Operations", assignee: "Nguyễn Hoàng Nam", dueAt: "20/07/2026 18:00", status: "AWAITING_DOMAIN", correlationId: "COR-AUC-07089", summary: "Thay đổi lịch và bước giá trước khi công bố" },
  ],
  configurations: [
    { id: "CFG-NOTIFY-01", category: "Notification", name: "Escalation & fallback routing", scope: "Customer Service", version: 4, status: "ACTIVE", valueSummary: "Email → SMS sau 10 phút; escalation sau 30 phút", effectiveAt: "01/07/2026 00:00", maker: "Admin Platform", makerEmail: "admin@sgdg.demo", checker: "Admin Governance", checkerEmail: "admin.checker@sgdg.demo" },
    { id: "CFG-SEARCH-02", category: "Search", name: "Back-office indexed fields", scope: "Internal", version: 3, status: "PENDING_APPROVAL", valueSummary: "Masked email, object reference, correlation ID", effectiveAt: "21/07/2026 00:00", maker: "Admin Platform", makerEmail: "admin@sgdg.demo", submissionReason: "Cập nhật trường tìm kiếm có masking" },
    { id: "CFG-WORKFLOW-07", category: "Workflow", name: "High-value refund approval", scope: "Finance", version: 2, status: "DRAFT", valueSummary: "Maker → Finance checker → Admin governance", effectiveAt: "Chưa thiết lập", maker: "Nguyễn Hoàng Nam", makerEmail: "admin@sgdg.demo" },
  ],
  snapshots: [
    { id: "RPS-20260719-01", report: "Governance Operations Daily", period: "19/07/2026", createdAt: "20/07/2026 00:10", actor: "Nguyễn Hoàng Nam", freshness: "19/07/2026 23:59", completeness: "100%" },
    { id: "RPS-2026Q2-03", report: "Quarterly Access Review", period: "Q2/2026", createdAt: "05/07/2026 09:30", actor: "Admin Governance", freshness: "30/06/2026 23:59", completeness: "100%" },
  ],
  decideAccess: (id, decision, actor, reason) => set((s) => {
    const request = s.accessRequests.find((item) => item.id === id);
    const valid = Boolean(
      request &&
        request.status === "PENDING_REVIEW" &&
        reason.trim() &&
        request.requester !== actor,
    );
    if (!valid) return s;
    return {
    accessRequests: s.accessRequests.map((r) =>
      r.id === id && reason.trim() && r.requester !== actor
        ? { ...r, status: decision, decisionReason: reason.trim(), decidedBy: actor }
        : r,
    ),
    workforce: decision === "APPROVED" ? s.workforce.map((w) => {
      return request?.targetId === w.id ? { ...w, role: request.requestedRole, scope: request.scope, status: "ACTIVE" as const } : w;
    }) : s.workforce,
  };
  }),
  decideTask: (id, decision, actor, reason) => set((s) => ({
    approvalTasks: s.approvalTasks.map((t) =>
      t.id === id &&
      ["ASSIGNED", "IN_REVIEW", "RETURNED"].includes(t.status) &&
      reason.trim() &&
      t.requester !== actor
        ? {
            ...t,
            status: decision === "APPROVED" ? "AWAITING_DOMAIN" : decision,
            decisionReason: reason.trim(),
            decidedBy: actor,
          }
        : t,
    ),
  })),
  confirmDomain: (id, success) => set((s) => ({ approvalTasks: s.approvalTasks.map((t) => t.id === id ? { ...t, status: success ? "COMPLETED" : "FAILED" } : t) })),
  submitConfiguration: (id, actorEmail, actorName, reason) => set((s) => ({
    configurations: s.configurations.map((c) =>
      c.id === id && c.status === "DRAFT" && reason.trim()
        ? {
            ...c,
            status: "PENDING_APPROVAL",
            maker: actorName,
            makerEmail: actorEmail,
            submissionReason: reason.trim(),
          }
        : c,
    ),
  })),
  setConfigurationEffectiveAt: (id, effectiveAt) =>
    set((s) => ({
      configurations: s.configurations.map((configuration) =>
        configuration.id === id && configuration.status === "DRAFT"
          ? { ...configuration, effectiveAt }
          : configuration,
      ),
    })),
  approveConfiguration: (id, actorEmail, actorName, reason) => set((s) => ({
    configurations: s.configurations.map((c) =>
      c.id === id &&
      c.status === "PENDING_APPROVAL" &&
      c.makerEmail !== actorEmail &&
      reason.trim()
        ? {
            ...c,
            status: "SCHEDULED",
            checker: actorName,
            checkerEmail: actorEmail,
            decisionReason: reason.trim(),
          }
        : c,
    ),
  })),
  returnConfiguration: (id, actorEmail, actorName, reason) =>
    set((s) => ({
      configurations: s.configurations.map((configuration) =>
        configuration.id === id &&
        configuration.status === "PENDING_APPROVAL" &&
        configuration.makerEmail !== actorEmail &&
        reason.trim()
          ? {
              ...configuration,
              status: "RETURNED",
              checker: actorName,
              checkerEmail: actorEmail,
              decisionReason: reason.trim(),
            }
          : configuration,
      ),
    })),
  rejectConfiguration: (id, actorEmail, actorName, reason) =>
    set((s) => ({
      configurations: s.configurations.map((configuration) =>
        configuration.id === id &&
        configuration.status === "PENDING_APPROVAL" &&
        configuration.makerEmail !== actorEmail &&
        reason.trim()
          ? {
              ...configuration,
              status: "REJECTED",
              checker: actorName,
              checkerEmail: actorEmail,
              decisionReason: reason.trim(),
            }
          : configuration,
      ),
    })),
  reviseConfiguration: (id, actorEmail) =>
    set((s) => ({
      configurations: s.configurations.map((configuration) =>
        configuration.id === id &&
        configuration.status === "RETURNED" &&
        configuration.makerEmail === actorEmail
          ? {
              ...configuration,
              status: "DRAFT",
              checker: undefined,
              checkerEmail: undefined,
              decisionReason: undefined,
            }
          : configuration,
      ),
    })),
  activateConfiguration: (id, actorEmail, reason) =>
    set((s) => ({
      configurations: s.configurations.map((configuration) =>
        configuration.id === id &&
        configuration.status === "SCHEDULED" &&
        configuration.checkerEmail === actorEmail &&
        reason.trim()
          ? {
              ...configuration,
              status: "ACTIVE",
              decisionReason: `${configuration.decisionReason ?? ""} · Kích hoạt: ${reason.trim()}`,
            }
          : configuration,
      ),
    })),
  deactivateConfiguration: (id, actorEmail, reason) =>
    set((s) => ({
      configurations: s.configurations.map((configuration) =>
        configuration.id === id &&
        configuration.status === "ACTIVE" &&
        configuration.checkerEmail === actorEmail &&
        reason.trim()
          ? {
              ...configuration,
              status: "INACTIVE",
              decisionReason: `${configuration.decisionReason ?? ""} · Ngừng hiệu lực: ${reason.trim()}`,
            }
          : configuration,
      ),
    })),
  saveSnapshot: (input) => set((s) => ({ snapshots: [{ id: `RPS-${Date.now()}`, report: input?.report ?? "Administration Service Overview", period: input?.period ?? "20/07/2026", createdAt: input?.createdAt ?? new Date().toLocaleString("vi-VN"), actor: input?.actor ?? "Nguyễn Hoàng Nam", freshness: input?.freshness ?? "20/07/2026 23:40", completeness: input?.completeness ?? "98,7%", filters: input?.filters, values: input?.values }, ...s.snapshots] })),
}));
