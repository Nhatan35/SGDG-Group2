import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CustomerAccountStatus = "ACTIVE" | "LOCKED" | "SUSPENDED";
export type EkycStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "VERIFIED"
  | "NEEDS_ADDITIONAL_INFO"
  | "EXCEPTION_REVIEW"
  | "REJECTED";

export interface CustomerGovernanceEvent {
  id: string;
  actor: string;
  action: string;
  reason: string;
  at: string;
}

export interface GovernedCustomerAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  customerType: "Người mua" | "Người bán";
  accountStatus: CustomerAccountStatus;
  ekycStatus: EkycStatus;
  ekycLevel: string;
  verificationSource: string;
  faceMatchScore?: number;
  exceptionReason?: string;
  registeredAt: string;
  supportHandoff?: boolean;
  events: CustomerGovernanceEvent[];
}

interface CustomerGovernanceState {
  accounts: GovernedCustomerAccount[];
  decideEkycException: (
    id: string,
    decision: "VERIFY" | "REQUEST_INFO" | "REJECT",
    actor: string,
    reason: string,
  ) => void;
  changeAccountAccess: (
    id: string,
    status: CustomerAccountStatus,
    actor: string,
    reason: string,
  ) => void;
}

const accounts: GovernedCustomerAccount[] = [
  {
    id: "CUS-001",
    name: "Nguyễn Minh Anh",
    email: "ng***@mail.vn",
    phone: "0909***125",
    customerType: "Người mua",
    accountStatus: "ACTIVE",
    ekycStatus: "VERIFIED",
    ekycLevel: "Mức 2",
    verificationSource: "VNeID",
    faceMatchScore: 97.8,
    registeredAt: "20/05/2026",
    events: [],
  },
  {
    id: "CUS-002",
    name: "Trần Quốc Huy",
    email: "tr***@mail.vn",
    phone: "0918***456",
    customerType: "Người bán",
    accountStatus: "ACTIVE",
    ekycStatus: "EXCEPTION_REVIEW",
    ekycLevel: "Mức 1",
    verificationSource: "VNeID",
    faceMatchScore: 71.2,
    exceptionReason: "Face Match thấp hơn ngưỡng; cần thẩm định thủ công.",
    registeredAt: "20/05/2026",
    events: [],
  },
  {
    id: "CUS-003",
    name: "Lê Hà My",
    email: "le***@mail.vn",
    phone: "0933***789",
    customerType: "Người mua",
    accountStatus: "ACTIVE",
    ekycStatus: "NEEDS_ADDITIONAL_INFO",
    ekycLevel: "Mức 1",
    verificationSource: "VNeID",
    exceptionReason: "Thiếu bằng chứng địa chỉ hiện tại.",
    registeredAt: "19/05/2026",
    supportHandoff: true,
    events: [],
  },
  {
    id: "CUS-004",
    name: "Đỗ Thùy E",
    email: "do***@mail.vn",
    phone: "0977***654",
    customerType: "Người mua",
    accountStatus: "LOCKED",
    ekycStatus: "REJECTED",
    ekycLevel: "Mức 1",
    verificationSource: "VNeID",
    faceMatchScore: 42.6,
    exceptionReason: "Thông tin định danh không khớp.",
    registeredAt: "18/05/2026",
    events: [],
  },
];

const createEvent = (actor: string, action: string, reason: string) => ({
  id: `CGE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  actor,
  action,
  reason,
  at: new Date().toLocaleString("vi-VN"),
});

export const useCustomerGovernanceStore = create<CustomerGovernanceState>()(
  persist(
    (set) => ({
      accounts,
      decideEkycException: (id, decision, actor, reason) =>
        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.id !== id ||
            account.ekycStatus !== "EXCEPTION_REVIEW" ||
            !reason.trim()
              ? account
              : {
                  ...account,
                  ekycStatus:
                    decision === "VERIFY"
                      ? "VERIFIED"
                      : decision === "REQUEST_INFO"
                        ? "NEEDS_ADDITIONAL_INFO"
                        : "REJECTED",
                  ekycLevel:
                    decision === "VERIFY" ? "Mức 2" : account.ekycLevel,
                  supportHandoff: decision === "REQUEST_INFO",
                  events: [
                    ...account.events,
                    createEvent(actor, `EKYC_${decision}`, reason.trim()),
                  ],
                },
          ),
        })),
      changeAccountAccess: (id, status, actor, reason) =>
        set((state) => ({
          accounts: state.accounts.map((account) =>
            account.id !== id || !reason.trim()
              ? account
              : {
                  ...account,
                  accountStatus: status,
                  events: [
                    ...account.events,
                    createEvent(actor, `ACCOUNT_${status}`, reason.trim()),
                  ],
                },
          ),
        })),
    }),
    { name: "sgdg-customer-governance-v1" },
  ),
);
