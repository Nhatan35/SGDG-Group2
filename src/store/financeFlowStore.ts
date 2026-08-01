import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useDemoStore } from "./demoStore";

export type PayoutStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "PROCESSING"
  | "PAID"
  | "REJECTED";

export type RefundStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED";

export type ReconciliationStatus = "MATCHED" | "MISMATCH" | "RESOLVED";
export type FinanceRisk = "LOW" | "MEDIUM" | "HIGH";

export interface FinanceTimelineEvent {
  id: string;
  at: string;
  actor: string;
  label: string;
  note?: string;
}

export interface PayoutRequest {
  id: string;
  userName: string;
  userCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  fee: number;
  createdAt: string;
  status: PayoutStatus;
  risk: FinanceRisk;
  kycStatus: "VERIFIED" | "PENDING_REVIEW";
  source: "CUSTOMER_WALLET" | "AUCTION_SETTLEMENT";
  timeline: FinanceTimelineEvent[];
}

export interface RefundRequest {
  id: string;
  paymentId: string;
  customer: string;
  reason: string;
  amount: number;
  bankName: string;
  createdAt: string;
  status: RefundStatus;
  risk: FinanceRisk;
  source?: "PAYMENT_REFUND" | "AUCTION_DEPOSIT";
  auctionId?: string;
  depositReference?: string;
  timeline: FinanceTimelineEvent[];
}

export interface ReconciliationBatch {
  id: string;
  provider: string;
  period: string;
  internalAmount: number;
  providerAmount: number;
  transactionCount: number;
  mismatchCount: number;
  status: ReconciliationStatus;
  updatedAt: string;
  note?: string;
}

interface CreatePayoutInput {
  userName: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
}

interface CreateDepositRefundInput {
  auctionId: string;
  depositReference: string;
  customer: string;
  amount: number;
  bankName: string;
  reason: string;
}

interface FinanceFlowState {
  payoutRequests: PayoutRequest[];
  refundRequests: RefundRequest[];
  reconciliationBatches: ReconciliationBatch[];
  lastSyncAt: string;
  createPayoutRequest: (input: CreatePayoutInput) => PayoutRequest;
  createDepositRefundRequest: (
    input: CreateDepositRefundInput,
  ) => RefundRequest;
  transitionPayout: (
    id: string,
    status: PayoutStatus,
    note?: string,
  ) => boolean;
  transitionRefund: (
    id: string,
    status: RefundStatus,
    note?: string,
  ) => boolean;
  resolveReconciliation: (id: string, note: string) => boolean;
  syncReconciliation: () => void;
  resetForTests: () => void;
}

const at = (value: string) => `2026-07-${value}:00.000Z`;

const timelineEvent = (
  id: string,
  atValue: string,
  actor: string,
  label: string,
  note?: string,
): FinanceTimelineEvent => ({
  id,
  at: atValue,
  actor,
  label,
  note,
});

function seedPayouts(): PayoutRequest[] {
  return [
    {
      id: "OUT-260728-001",
      userName: "Phạm Quốc Huy",
      userCode: "USR-1088",
      bankName: "BIDV",
      accountNumber: "**** 7821",
      accountHolder: "PHAM QUOC HUY",
      amount: 25_000_000,
      fee: 0,
      createdAt: at("28T08:42"),
      status: "PENDING_REVIEW",
      risk: "MEDIUM",
      kycStatus: "VERIFIED",
      source: "CUSTOMER_WALLET",
      timeline: [
        timelineEvent(
          "EV-OUT-001",
          at("28T08:42"),
          "Khách hàng",
          "Đã gửi yêu cầu rút tiền",
        ),
      ],
    },
    {
      id: "OUT-260727-014",
      userName: "Lê Hà My",
      userCode: "USR-1042",
      bankName: "Vietcombank",
      accountNumber: "**** 4196",
      accountHolder: "LE HA MY",
      amount: 80_000_000,
      fee: 0,
      createdAt: at("27T15:18"),
      status: "APPROVED",
      risk: "LOW",
      kycStatus: "VERIFIED",
      source: "CUSTOMER_WALLET",
      timeline: [
        timelineEvent(
          "EV-OUT-014-A",
          at("27T15:18"),
          "Khách hàng",
          "Đã gửi yêu cầu rút tiền",
        ),
        timelineEvent(
          "EV-OUT-014-B",
          at("27T15:36"),
          "Finance Demo",
          "Đã duyệt yêu cầu",
          "Thông tin người nhận và số dư đã khớp.",
        ),
      ],
    },
    {
      id: "SET-5711R-2026",
      userName: "Nguyễn Hoàng Long",
      userCode: "SLR-0057",
      bankName: "Techcombank",
      accountNumber: "**** 8866",
      accountHolder: "NGUYEN HOANG LONG",
      amount: 2_840_000_000,
      fee: 32_500_000,
      createdAt: at("27T10:05"),
      status: "PROCESSING",
      risk: "LOW",
      kycStatus: "VERIFIED",
      source: "AUCTION_SETTLEMENT",
      timeline: [
        timelineEvent(
          "EV-SET-5711R-A",
          at("27T10:05"),
          "Hệ thống",
          "Đã tạo quyết toán phiên đấu giá",
        ),
        timelineEvent(
          "EV-SET-5711R-B",
          at("27T10:40"),
          "Finance Demo",
          "Đã chuyển sang ngân hàng",
        ),
      ],
    },
    {
      id: "OUT-260726-022",
      userName: "Trần Minh Khoa",
      userCode: "USR-1017",
      bankName: "ACB",
      accountNumber: "**** 3310",
      accountHolder: "TRAN MINH KHOA",
      amount: 35_000_000,
      fee: 0,
      createdAt: at("26T09:14"),
      status: "PAID",
      risk: "LOW",
      kycStatus: "VERIFIED",
      source: "CUSTOMER_WALLET",
      timeline: [
        timelineEvent(
          "EV-OUT-022-A",
          at("26T09:14"),
          "Khách hàng",
          "Đã gửi yêu cầu rút tiền",
        ),
        timelineEvent(
          "EV-OUT-022-B",
          at("26T11:20"),
          "Finance Demo",
          "Ngân hàng xác nhận chi trả thành công",
        ),
      ],
    },
  ];
}

function seedRefunds(): RefundRequest[] {
  return [
    {
      id: "REF-0214",
      paymentId: "PAY-2024-0528-001",
      customer: "Nguyễn Minh Anh",
      reason: "Hoàn tiền đặt cọc sau khi không trúng đấu giá",
      amount: 25_000_000,
      bankName: "Vietcombank",
      createdAt: at("28T08:20"),
      status: "PENDING_REVIEW",
      risk: "LOW",
      timeline: [
        timelineEvent(
          "EV-REF-214",
          at("28T08:20"),
          "Customer Support",
          "Đã chuyển yêu cầu sang Finance",
        ),
      ],
    },
    {
      id: "REF-0211",
      paymentId: "PAY-2024-0519-045",
      customer: "Trần Quốc Huy",
      reason: "Giao dịch thanh toán bị ghi nhận hai lần",
      amount: 50_000_000,
      bankName: "Techcombank",
      createdAt: at("27T13:05"),
      status: "PROCESSING",
      risk: "MEDIUM",
      timeline: [
        timelineEvent(
          "EV-REF-211-A",
          at("27T13:05"),
          "Customer Support",
          "Đã chuyển yêu cầu sang Finance",
        ),
        timelineEvent(
          "EV-REF-211-B",
          at("27T14:30"),
          "Finance Demo",
          "Đã duyệt và gửi yêu cầu hoàn tiền",
        ),
      ],
    },
    {
      id: "REF-0208",
      paymentId: "PAY-2024-0516-006",
      customer: "Lê Hà My",
      reason: "Hoàn số dư thừa sau quyết toán",
      amount: 12_500_000,
      bankName: "BIDV",
      createdAt: at("26T10:42"),
      status: "COMPLETED",
      risk: "LOW",
      timeline: [
        timelineEvent(
          "EV-REF-208",
          at("26T12:10"),
          "Finance Demo",
          "Hoàn tiền thành công",
        ),
      ],
    },
  ];
}

function seedReconciliation(): ReconciliationBatch[] {
  return [
    {
      id: "REC-0728-GW",
      provider: "Cổng thanh toán Napas",
      period: "28/07/2026",
      internalAmount: 4_285_500_000,
      providerAmount: 4_260_500_000,
      transactionCount: 184,
      mismatchCount: 2,
      status: "MISMATCH",
      updatedAt: at("28T09:10"),
    },
    {
      id: "REC-0728-BANK",
      provider: "Techcombank",
      period: "28/07/2026",
      internalAmount: 3_282_500_000,
      providerAmount: 3_282_500_000,
      transactionCount: 67,
      mismatchCount: 0,
      status: "MATCHED",
      updatedAt: at("28T09:12"),
    },
    {
      id: "REC-0727-VQR",
      provider: "VietQR",
      period: "27/07/2026",
      internalAmount: 1_845_000_000,
      providerAmount: 1_845_000_000,
      transactionCount: 92,
      mismatchCount: 0,
      status: "MATCHED",
      updatedAt: at("27T23:45"),
    },
  ];
}

const payoutTransitions: Record<PayoutStatus, PayoutStatus[]> = {
  PENDING_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["PROCESSING"],
  PROCESSING: ["PAID"],
  PAID: [],
  REJECTED: [],
};

const refundTransitions: Record<RefundStatus, RefundStatus[]> = {
  PENDING_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["PROCESSING"],
  PROCESSING: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
};

const createInitialState = () => ({
  payoutRequests: seedPayouts(),
  refundRequests: seedRefunds(),
  reconciliationBatches: seedReconciliation(),
  lastSyncAt: at("28T09:12"),
});

export const useFinanceFlowStore = create<FinanceFlowState>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      createPayoutRequest: (input) => {
        const now = new Date().toISOString();
        let created!: PayoutRequest;
        set((state) => {
          const date = now.slice(2, 10).replaceAll("-", "");
          const sequence = String(state.payoutRequests.length + 1).padStart(
            3,
            "0",
          );
          created = {
            id: `OUT-${date}-${sequence}`,
            userName: input.userName,
            userCode: "USR-CURRENT",
            bankName: input.bankName,
            accountNumber: input.accountNumber,
            accountHolder: input.accountHolder,
            amount: Math.max(0, input.amount),
            fee: 0,
            createdAt: now,
            status: "PENDING_REVIEW",
            risk: input.amount >= 100_000_000 ? "MEDIUM" : "LOW",
            kycStatus: "VERIFIED",
            source: "CUSTOMER_WALLET",
            timeline: [
              {
                id: `EV-${Date.now()}`,
                at: now,
                actor: "Khách hàng",
                label: "Đã gửi yêu cầu rút tiền",
                note: "Số tiền được tạm giữ trong thời gian Finance kiểm tra.",
              },
            ],
          };
          return { payoutRequests: [created, ...state.payoutRequests] };
        });
        return created;
      },
      createDepositRefundRequest: (input) => {
        const existing = get().refundRequests.find(
          (item) =>
            item.auctionId === input.auctionId &&
            item.depositReference === input.depositReference &&
            item.status !== "REJECTED",
        );
        if (existing) return existing;

        const now = new Date().toISOString();
        let created!: RefundRequest;
        set((state) => {
          const sequence = String(state.refundRequests.length + 1).padStart(
            4,
            "0",
          );
          created = {
            id: `REF-DEP-${sequence}`,
            paymentId: input.depositReference,
            customer: input.customer,
            reason: input.reason,
            amount: Math.max(0, input.amount),
            bankName: input.bankName,
            createdAt: now,
            status: "PENDING_REVIEW",
            risk: input.amount >= 500_000_000 ? "MEDIUM" : "LOW",
            source: "AUCTION_DEPOSIT",
            auctionId: input.auctionId,
            depositReference: input.depositReference,
            timeline: [
              {
                id: `EV-REF-DEP-${Date.now()}`,
                at: now,
                actor: "Hệ thống đấu giá",
                label: "Tự động tạo yêu cầu hoàn cọc",
                note: input.reason,
              },
            ],
          };
          return { refundRequests: [created, ...state.refundRequests] };
        });
        return created;
      },
      transitionPayout: (id, status, note) => {
        let changed = false;
        set((state) => ({
          payoutRequests: state.payoutRequests.map((item) => {
            if (
              item.id !== id ||
              !payoutTransitions[item.status].includes(status)
            ) {
              return item;
            }
            changed = true;
            const labels: Record<PayoutStatus, string> = {
              PENDING_REVIEW: "Chờ Finance kiểm tra",
              APPROVED: "Finance đã duyệt yêu cầu",
              PROCESSING: "Đã gửi lệnh chi sang ngân hàng",
              PAID: "Ngân hàng xác nhận chi trả thành công",
              REJECTED: "Finance từ chối yêu cầu",
            };
            return {
              ...item,
              status,
              timeline: [
                ...item.timeline,
                {
                  id: `EV-${Date.now()}-${status}`,
                  at: new Date().toISOString(),
                  actor: "Finance Demo",
                  label: labels[status],
                  note: note?.trim() || undefined,
                },
              ],
            };
          }),
        }));
        return changed;
      },
      transitionRefund: (id, status, note) => {
        let changed = false;
        let linkedAuctionId: string | undefined;
        set((state) => ({
          refundRequests: state.refundRequests.map((item) => {
            if (
              item.id !== id ||
              !refundTransitions[item.status].includes(status)
            ) {
              return item;
            }
            changed = true;
            linkedAuctionId = item.auctionId;
            const labels: Record<RefundStatus, string> = {
              PENDING_REVIEW: "Chờ Finance kiểm tra",
              APPROVED: "Đã duyệt hoàn tiền",
              PROCESSING: "Đã gửi lệnh hoàn tiền",
              COMPLETED: "Hoàn tiền thành công",
              REJECTED: "Đã từ chối hoàn tiền",
            };
            return {
              ...item,
              status,
              timeline: [
                ...item.timeline,
                {
                  id: `EV-${Date.now()}-${status}`,
                  at: new Date().toISOString(),
                  actor: "Finance Demo",
                  label: labels[status],
                  note: note?.trim() || undefined,
                },
              ],
            };
          }),
        }));
        if (changed && linkedAuctionId && status === "COMPLETED")
          useDemoStore
            .getState()
            .completeAuctionDepositRefund(linkedAuctionId);
        if (changed && linkedAuctionId && status === "REJECTED")
          useDemoStore
            .getState()
            .rejectAuctionDepositRefund(linkedAuctionId, note);
        return changed;
      },
      resolveReconciliation: (id, note) => {
        let changed = false;
        set((state) => ({
          reconciliationBatches: state.reconciliationBatches.map((batch) => {
            if (batch.id !== id || batch.status !== "MISMATCH") return batch;
            changed = true;
            return {
              ...batch,
              status: "RESOLVED",
              mismatchCount: 0,
              providerAmount: batch.internalAmount,
              note: note.trim(),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
        return changed;
      },
      syncReconciliation: () =>
        set({ lastSyncAt: new Date().toISOString() }),
      resetForTests: () => set(createInitialState()),
    }),
    {
      name: "sgdg-finance-flow-v1",
      version: 1,
      partialize: (state) => ({
        payoutRequests: state.payoutRequests,
        refundRequests: state.refundRequests,
        reconciliationBatches: state.reconciliationBatches,
        lastSyncAt: state.lastSyncAt,
      }),
    },
  ),
);
