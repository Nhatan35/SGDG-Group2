import type { ActorRole } from "../types/domain";

export type StaffRole = Exclude<ActorRole, "CUSTOMER">;
export const staffRoleMeta: Record<
  StaffRole,
  { label: string; workspace: string; eyebrow: string; description: string }
> = {
  ADMIN: {
    label: "Admin",
    workspace: "/admin",
    eyebrow: "QUẢN TRỊ & ĐIỀU PHỐI",
    description: "Quản trị truy cập, phê duyệt, cấu hình, nhật ký và báo cáo.",
  },
  CUSTOMER_SUPPORT: {
    label: "Chăm sóc khách hàng",
    workspace: "/support",
    eyebrow: "CHĂM SÓC KHÁCH HÀNG",
    description:
      "Ticket, khiếu nại, tranh chấp, tra cứu được phép và chuyển cấp.",
  },
  CONTENT_STAFF: {
    label: "Nhân viên nội dung",
    workspace: "/ops",
    eyebrow: "NỘI DUNG & VẬN HÀNH ĐẤU GIÁ",
    description: "Tài sản, nội dung, chuẩn bị phiên, vận hành và bàn giao.",
  },
  FINANCE: {
    label: "Finance",
    workspace: "/finance",
    eyebrow: "QUẢN LÝ TÀI CHÍNH",
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
  "admin.checker@sgdg.demo": "ADMIN",
  "support@sgdg.demo": "CUSTOMER_SUPPORT",
  "content@sgdg.demo": "CONTENT_STAFF",
  "finance@sgdg.demo": "FINANCE",
};

export const demoStaffNames: Record<string, string> = {
  "admin@sgdg.demo": "Nguyễn Hoàng Nam",
  "admin.checker@sgdg.demo": "Trần Ngọc Anh",
  "support@sgdg.demo": "Chuyên viên CSKH",
  "content@sgdg.demo": "Lê Thu Hà",
  "finance@sgdg.demo": "Chuyên viên Finance",
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
      path === "/admin/assets" ||
      path.startsWith("/cms")
    );
  return (
    path === "/finance" ||
    path.startsWith("/finance/") ||
    path === "/admin/payments" ||
    path.startsWith("/ops/finance-packages/")
  );
}
