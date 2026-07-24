import { create } from "zustand";

export type AccessRequestStatus = "PENDING_REVIEW" | "RETURNED" | "APPROVED" | "REJECTED";
export type TaskStatus = "ASSIGNED" | "IN_REVIEW" | "RETURNED" | "REJECTED" | "APPROVED" | "AWAITING_DOMAIN" | "COMPLETED" | "FAILED";
export type ConfigStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SCHEDULED" | "ACTIVE" | "SUPERSEDED";

export interface WorkforceProfile {
  id: string; name: string; email: string; department: string; role: string;
  status: "ACTIVE" | "SUSPENDED"; lastAccess: string; scope: string;
}
export interface AccessRequest {
  id: string; requester: string; targetId: string; requestedRole: string; scope: string;
  reason: string; submittedAt: string; status: AccessRequestStatus; risk: "LOW" | "MEDIUM" | "HIGH";
}
export interface ApprovalTask {
  id: string; requestType: string; domain: string; objectRef: string; requester: string;
  assignee: string; dueAt: string; status: TaskStatus; correlationId: string; summary: string;
}
export interface ConfigurationItem {
  id: string; category: string; name: string; scope: string; version: number;
  status: ConfigStatus; valueSummary: string; effectiveAt: string; maker: string; checker?: string;
}
export interface ReportSnapshot {
  id: string; report: string; period: string; createdAt: string; actor: string;
  freshness: string; completeness: string;
}

interface AdministrationState {
  workforce: WorkforceProfile[];
  accessRequests: AccessRequest[];
  approvalTasks: ApprovalTask[];
  configurations: ConfigurationItem[];
  snapshots: ReportSnapshot[];
  decideAccess: (id: string, decision: "APPROVED" | "REJECTED" | "RETURNED") => void;
  decideTask: (id: string, decision: "APPROVED" | "REJECTED" | "RETURNED") => void;
  confirmDomain: (id: string, success: boolean) => void;
  submitConfiguration: (id: string) => void;
  approveConfiguration: (id: string) => void;
  saveSnapshot: () => void;
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
    { id: "CFG-NOTIFY-01", category: "Notification", name: "Escalation & fallback routing", scope: "Customer Service", version: 4, status: "ACTIVE", valueSummary: "Email → SMS sau 10 phút; escalation sau 30 phút", effectiveAt: "01/07/2026 00:00", maker: "Admin Platform", checker: "Admin Governance" },
    { id: "CFG-SEARCH-02", category: "Search", name: "Back-office indexed fields", scope: "Internal", version: 3, status: "PENDING_APPROVAL", valueSummary: "Masked email, object reference, correlation ID", effectiveAt: "21/07/2026 00:00", maker: "Admin Platform" },
    { id: "CFG-WORKFLOW-07", category: "Workflow", name: "High-value refund approval", scope: "Finance", version: 2, status: "DRAFT", valueSummary: "Maker → Finance checker → Admin governance", effectiveAt: "Chưa thiết lập", maker: "Nguyễn Hoàng Nam" },
  ],
  snapshots: [
    { id: "RPS-20260719-01", report: "Governance Operations Daily", period: "19/07/2026", createdAt: "20/07/2026 00:10", actor: "Nguyễn Hoàng Nam", freshness: "19/07/2026 23:59", completeness: "100%" },
    { id: "RPS-2026Q2-03", report: "Quarterly Access Review", period: "Q2/2026", createdAt: "05/07/2026 09:30", actor: "Admin Governance", freshness: "30/06/2026 23:59", completeness: "100%" },
  ],
  decideAccess: (id, decision) => set((s) => ({
    accessRequests: s.accessRequests.map((r) => r.id === id ? { ...r, status: decision } : r),
    workforce: decision === "APPROVED" ? s.workforce.map((w) => {
      const request = s.accessRequests.find((r) => r.id === id);
      return request?.targetId === w.id ? { ...w, role: request.requestedRole, scope: request.scope, status: "ACTIVE" as const } : w;
    }) : s.workforce,
  })),
  decideTask: (id, decision) => set((s) => ({ approvalTasks: s.approvalTasks.map((t) => t.id === id ? { ...t, status: decision === "APPROVED" ? "AWAITING_DOMAIN" : decision } : t) })),
  confirmDomain: (id, success) => set((s) => ({ approvalTasks: s.approvalTasks.map((t) => t.id === id ? { ...t, status: success ? "COMPLETED" : "FAILED" } : t) })),
  submitConfiguration: (id) => set((s) => ({ configurations: s.configurations.map((c) => c.id === id && c.status === "DRAFT" ? { ...c, status: "PENDING_APPROVAL" } : c) })),
  approveConfiguration: (id) => set((s) => ({ configurations: s.configurations.map((c) => c.id === id && c.status === "PENDING_APPROVAL" ? { ...c, status: "SCHEDULED", checker: "Admin Governance" } : c) })),
  saveSnapshot: () => set((s) => ({ snapshots: [{ id: `RPS-${Date.now()}`, report: "Administration Service Overview", period: "20/07/2026", createdAt: "20/07/2026 23:45", actor: "Nguyễn Hoàng Nam", freshness: "20/07/2026 23:40", completeness: "98,7%" }, ...s.snapshots] })),
}));
