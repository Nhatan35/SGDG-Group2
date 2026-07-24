import type { ActorRole } from "../types/domain";

export type StaffRole = Exclude<ActorRole, "CUSTOMER">;
export const staffRoleMeta: Record<
  StaffRole,
  { label: string; workspace: string; eyebrow: string; description: string }
> = {
  ADMIN: {
    label: "Admin",
    workspace: "/admin",
    eyebrow: "ADMINISTRATION & GOVERNANCE",
    description: "Quản trị truy cập, phê duyệt, cấu hình, audit và báo cáo.",
  },
  CUSTOMER_SUPPORT: {
    label: "Customer Support",
    workspace: "/support",
    eyebrow: "CUSTOMER SERVICE",
    description:
      "Ticket, khiếu nại, tranh chấp, tra cứu được phép và chuyển cấp.",
  },
  CONTENT_STAFF: {
    label: "Content Staff",
    workspace: "/ops",
    eyebrow: "AUCTION OPERATIONS",
    description: "Tài sản, nội dung, chuẩn bị phiên, vận hành và bàn giao.",
  },
  FINANCE: {
    label: "Finance",
    workspace: "/finance",
    eyebrow: "FINANCIAL MANAGEMENT",
    description:
      "Thanh toán, hoàn tiền, đối soát, quyết toán và ngoại lệ tài chính.",
  },
};
export function isStaffRole(role: ActorRole): role is StaffRole {
  return role !== "CUSTOMER";
}
export function workspaceForRole(role: ActorRole): string {
  return isStaffRole(role) ? staffRoleMeta[role].workspace : "/";
}
export const demoStaffAccounts: Record<string, StaffRole> = {
  "admin@sgdg.demo": "ADMIN",
  "support@sgdg.demo": "CUSTOMER_SUPPORT",
  "content@sgdg.demo": "CONTENT_STAFF",
  "finance@sgdg.demo": "FINANCE",
};

export function canVisitStaffPath(role: StaffRole, path: string): boolean {
  if (role === "ADMIN")
    return (
      path === "/admin" ||
      path.startsWith("/admin/") ||
      path.startsWith("/governance/")
    );
  if (role === "CUSTOMER_SUPPORT")
    return path === "/support" || path.startsWith("/support/");
  if (role === "CONTENT_STAFF")
    return (
      path === "/ops" ||
      path.startsWith("/ops/") ||
      path.startsWith("/admin/assets") ||
      path.startsWith("/cms")
    );
  return (
    path === "/finance" ||
    path.startsWith("/finance/") ||
    path.startsWith("/admin/payments") ||
    path.startsWith("/ops/finance-packages/")
  );
}
