import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";

const INITIAL_WALLET_BALANCE = 125_000_000;

export type KycState =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "NEED_SUPPLEMENT";
export interface LinkedBankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  isDefault?: boolean;
}

export type AuctionDepositStatus =
  | "ACTIVE"
  | "ON_HOLD"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "FORFEITED"
  | "APPLIED_TO_PAYMENT";

export type AuctionDepositReason =
  | "NOT_WINNER"
  | "AUCTION_CANCELLED"
  | "AUCTION_FAILED"
  | "PAYMENT_AMBIGUOUS"
  | "PAYMENT_DEFAULT"
  | "WINNER_PAYMENT";

export interface AuctionDepositTimelineEvent {
  id: string;
  at: string;
  status: AuctionDepositStatus;
  label: string;
  note?: string;
}

export interface AuctionDepositRecord {
  auctionId: string;
  reference: string;
  amount: number;
  status: AuctionDepositStatus;
  reason?: AuctionDepositReason;
  createdAt: string;
  updatedAt: string;
  timeline: AuctionDepositTimelineEvent[];
}

interface DemoState {
  authenticated: boolean;
  adminAuthenticated: boolean;
  actorRole: ActorRole;
  staffEmail: string;
  userName: string;
  walletBalance: number;
  auctionDeposits: Record<string, number>;
  auctionDepositRecords: Record<string, AuctionDepositRecord>;
  bankAccounts: LinkedBankAccount[];
  kyc: KycState;
  watchlist: string[];
  unreadNotifications: number;
  login: (name?: string) => void;
  logout: () => void;
  topUpWallet: (amount: number) => void;
  payAuctionDeposit: (auctionId: string, amount: number) => void;
  holdAuctionDeposit: (auctionId: string) => void;
  releaseAuctionDepositHold: (auctionId: string) => void;
  requestAuctionDepositRefund: (
    auctionId: string,
    reason: Extract<
      AuctionDepositReason,
      "NOT_WINNER" | "AUCTION_CANCELLED" | "AUCTION_FAILED"
    >,
  ) => void;
  completeAuctionDepositRefund: (auctionId: string) => void;
  rejectAuctionDepositRefund: (auctionId: string, note?: string) => void;
  forfeitAuctionDeposit: (auctionId: string) => void;
  applyAuctionDepositToPayment: (auctionId: string) => void;
  addBankAccount: (account: Omit<LinkedBankAccount, "id">) => void;
  withdrawFromWallet: (amount: number) => void;
  adminLogin: (
    role?: Exclude<ActorRole, "CUSTOMER">,
    staffEmail?: string,
  ) => void;
  adminLogout: () => void;
  setKyc: (state: KycState) => void;
  toggleWatch: (id: string) => void;
  markAllRead: () => void;
}
export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      authenticated: false,
      adminAuthenticated: false,
      actorRole: "CUSTOMER",
      staffEmail: "",
      userName: "Nguyễn Minh Anh",
      walletBalance: INITIAL_WALLET_BALANCE,
      auctionDeposits: {},
      auctionDepositRecords: {},
      bankAccounts: [
        {
          id: "bank-vcb-001",
          bankName: "Vietcombank",
          accountNumber: "0123456789",
          accountHolder: "NGUYEN MINH ANH",
          branch: "TP. Hồ Chí Minh",
          isDefault: true,
        },
      ],
      kyc: "VERIFIED",
      watchlist: ["rolex-126610lv", "diamond-gia"],
      unreadNotifications: 4,
      login: (name) =>
        set((state) => ({
          authenticated: true,
          actorRole: "CUSTOMER",
          userName: name || state.userName,
          walletBalance: state.walletBalance || INITIAL_WALLET_BALANCE,
        })),
      logout: () => set({ authenticated: false }),
      topUpWallet: (amount) =>
        set((state) => ({
          walletBalance: state.walletBalance + Math.max(0, amount),
        })),
      payAuctionDeposit: (auctionId, amount) =>
        set((state) => {
          if (state.auctionDeposits[auctionId]) return state;
          const depositAmount = Math.max(0, amount);
          const now = new Date().toISOString();
          const reference = `DEP-${auctionId.toUpperCase()}-${Date.now()}`;
          return {
            walletBalance: Math.max(0, state.walletBalance - depositAmount),
            auctionDeposits: {
              ...state.auctionDeposits,
              [auctionId]: depositAmount,
            },
            auctionDepositRecords: {
              ...state.auctionDepositRecords,
              [auctionId]: {
                auctionId,
                reference,
                amount: depositAmount,
                status: "ACTIVE",
                createdAt: now,
                updatedAt: now,
                timeline: [
                  {
                    id: `${reference}-ACTIVE`,
                    at: now,
                    status: "ACTIVE",
                    label: "Đã xác nhận đặt cọc",
                    note: "Khoản cọc đang được giữ cho phiên đấu giá.",
                  },
                ],
              },
            },
          };
        }),
      holdAuctionDeposit: (auctionId) =>
        set((state) => {
          const amount = state.auctionDeposits[auctionId] ?? 0;
          const current = state.auctionDepositRecords[auctionId];
          if (!amount || current?.status === "ON_HOLD") return state;
          if (
            current &&
            !["ACTIVE", "REFUND_PENDING"].includes(current.status)
          )
            return state;
          const now = new Date().toISOString();
          const reference =
            current?.reference ??
            `DEP-${auctionId.toUpperCase()}-${Date.now()}`;
          const baseTimeline = current?.timeline ?? [
            {
              id: `${reference}-ACTIVE`,
              at: now,
              status: "ACTIVE" as const,
              label: "Đã xác nhận đặt cọc",
            },
          ];
          return {
            auctionDepositRecords: {
              ...state.auctionDepositRecords,
              [auctionId]: {
                auctionId,
                reference,
                amount,
                createdAt: current?.createdAt ?? now,
                status: "ON_HOLD",
                reason: "PAYMENT_AMBIGUOUS",
                updatedAt: now,
                timeline: [
                  ...baseTimeline,
                  {
                    id: `${reference}-ON_HOLD-${Date.now()}`,
                    at: now,
                    status: "ON_HOLD",
                    label: "Tạm giữ cọc để đối soát",
                    note: "Chưa hoàn hoặc khấu trừ trong khi nghĩa vụ thanh toán chưa rõ ràng.",
                  },
                ],
              },
            },
          };
        }),
      releaseAuctionDepositHold: (auctionId) =>
        set((state) => {
          const current = state.auctionDepositRecords[auctionId];
          if (!current || current.status !== "ON_HOLD") return state;
          const now = new Date().toISOString();
          return {
            auctionDepositRecords: {
              ...state.auctionDepositRecords,
              [auctionId]: {
                ...current,
                status: "ACTIVE",
                reason: undefined,
                updatedAt: now,
                timeline: [
                  ...current.timeline,
                  {
                    id: `${current.reference}-ACTIVE-${Date.now()}`,
                    at: now,
                    status: "ACTIVE",
                    label: "Đã gỡ trạng thái tạm giữ",
                    note: "Khoản cọc tiếp tục được giữ theo nghĩa vụ hiện tại.",
                  },
                ],
              },
            },
          };
        }),
      requestAuctionDepositRefund: (auctionId, reason) =>
        set((state) => {
          const amount = state.auctionDeposits[auctionId] ?? 0;
          const current = state.auctionDepositRecords[auctionId];
          if (!amount || current?.status === "REFUND_PENDING") return state;
          if (
            current &&
            ["REFUNDED", "FORFEITED", "APPLIED_TO_PAYMENT"].includes(
              current.status,
            )
          )
            return state;
          const now = new Date().toISOString();
          const reference =
            current?.reference ??
            `DEP-${auctionId.toUpperCase()}-${Date.now()}`;
          const reasonLabels: Record<
            Extract<
              AuctionDepositReason,
              "NOT_WINNER" | "AUCTION_CANCELLED" | "AUCTION_FAILED"
            >,
            string
          > = {
            NOT_WINNER: "Không trúng đấu giá",
            AUCTION_CANCELLED: "Phiên đấu giá bị hủy",
            AUCTION_FAILED: "Phiên đấu giá không hình thành người thắng hợp lệ",
          };
          return {
            auctionDepositRecords: {
              ...state.auctionDepositRecords,
              [auctionId]: {
                auctionId,
                reference,
                amount,
                createdAt: current?.createdAt ?? now,
                status: "REFUND_PENDING",
                reason,
                updatedAt: now,
                timeline: [
                  ...(current?.timeline ?? [
                    {
                      id: `${reference}-ACTIVE`,
                      at: now,
                      status: "ACTIVE" as const,
                      label: "Đã xác nhận đặt cọc",
                    },
                  ]),
                  {
                    id: `${reference}-REFUND_PENDING-${Date.now()}`,
                    at: now,
                    status: "REFUND_PENDING",
                    label: "Đã tạo yêu cầu hoàn cọc",
                    note: reasonLabels[reason],
                  },
                ],
              },
            },
          };
        }),
      completeAuctionDepositRefund: (auctionId) =>
        set((state) => {
          const current = state.auctionDepositRecords[auctionId];
          if (!current || current.status !== "REFUND_PENDING") return state;
          const now = new Date().toISOString();
          const nextDeposits = { ...state.auctionDeposits };
          delete nextDeposits[auctionId];
          return {
            walletBalance: state.walletBalance + current.amount,
            auctionDeposits: nextDeposits,
            auctionDepositRecords: {
              ...state.auctionDepositRecords,
              [auctionId]: {
                ...current,
                status: "REFUNDED",
                updatedAt: now,
                timeline: [
                  ...current.timeline,
                  {
                    id: `${current.reference}-REFUNDED-${Date.now()}`,
                    at: now,
                    status: "REFUNDED",
                    label: "Hoàn cọc thành công",
                    note: "Tiền cọc đã được cộng lại vào số dư ví.",
                  },
                ],
              },
            },
          };
        }),
      rejectAuctionDepositRefund: (auctionId, note) =>
        set((state) => {
          const current = state.auctionDepositRecords[auctionId];
          if (!current || current.status !== "REFUND_PENDING") return state;
          const now = new Date().toISOString();
          return {
            auctionDepositRecords: {
              ...state.auctionDepositRecords,
              [auctionId]: {
                ...current,
                status: "ACTIVE",
                reason: undefined,
                updatedAt: now,
                timeline: [
                  ...current.timeline,
                  {
                    id: `${current.reference}-ACTIVE-${Date.now()}`,
                    at: now,
                    status: "ACTIVE",
                    label: "Yêu cầu hoàn cọc cần kiểm tra lại",
                    note:
                      note?.trim() ||
                      "Finance chưa thể xác nhận điều kiện hoàn cọc.",
                  },
                ],
              },
            },
          };
        }),
      forfeitAuctionDeposit: (auctionId) =>
        set((state) => {
          const amount = state.auctionDeposits[auctionId] ?? 0;
          const current = state.auctionDepositRecords[auctionId];
          if (!amount || current?.status === "FORFEITED") return state;
          if (
            current &&
            ["REFUNDED", "APPLIED_TO_PAYMENT"].includes(current.status)
          )
            return state;
          const now = new Date().toISOString();
          const reference =
            current?.reference ??
            `DEP-${auctionId.toUpperCase()}-${Date.now()}`;
          const nextDeposits = { ...state.auctionDeposits };
          delete nextDeposits[auctionId];
          return {
            auctionDeposits: nextDeposits,
            auctionDepositRecords: {
              ...state.auctionDepositRecords,
              [auctionId]: {
                auctionId,
                reference,
                amount,
                createdAt: current?.createdAt ?? now,
                status: "FORFEITED",
                reason: "PAYMENT_DEFAULT",
                updatedAt: now,
                timeline: [
                  ...(current?.timeline ?? [
                    {
                      id: `${reference}-ACTIVE`,
                      at: now,
                      status: "ACTIVE" as const,
                      label: "Đã xác nhận đặt cọc",
                    },
                  ]),
                  {
                    id: `${reference}-FORFEITED-${Date.now()}`,
                    at: now,
                    status: "FORFEITED",
                    label: "Đã thu cọc do quá hạn thanh toán",
                    note: "Khoản cọc không được hoàn lại theo nghĩa vụ của người trúng đấu giá.",
                  },
                ],
              },
            },
          };
        }),
      applyAuctionDepositToPayment: (auctionId) =>
        set((state) => {
          const amount = state.auctionDeposits[auctionId] ?? 0;
          const current = state.auctionDepositRecords[auctionId];
          if (!amount || current?.status === "APPLIED_TO_PAYMENT") return state;
          if (current && ["REFUNDED", "FORFEITED"].includes(current.status))
            return state;
          const now = new Date().toISOString();
          const reference =
            current?.reference ??
            `DEP-${auctionId.toUpperCase()}-${Date.now()}`;
          const nextDeposits = { ...state.auctionDeposits };
          delete nextDeposits[auctionId];
          return {
            auctionDeposits: nextDeposits,
            auctionDepositRecords: {
              ...state.auctionDepositRecords,
              [auctionId]: {
                auctionId,
                reference,
                amount,
                createdAt: current?.createdAt ?? now,
                status: "APPLIED_TO_PAYMENT",
                reason: "WINNER_PAYMENT",
                updatedAt: now,
                timeline: [
                  ...(current?.timeline ?? [
                    {
                      id: `${reference}-ACTIVE`,
                      at: now,
                      status: "ACTIVE" as const,
                      label: "Đã xác nhận đặt cọc",
                    },
                  ]),
                  {
                    id: `${reference}-APPLIED-${Date.now()}`,
                    at: now,
                    status: "APPLIED_TO_PAYMENT",
                    label: "Đã khấu trừ cọc vào thanh toán",
                    note: "Khoản cọc được trừ khỏi nghĩa vụ thanh toán cuối cùng.",
                  },
                ],
              },
            },
          };
        }),
      addBankAccount: (account) =>
        set((state) => ({
          bankAccounts: [
            ...(state.bankAccounts ?? []),
            {
              ...account,
              id: `bank-${Date.now()}`,
              isDefault:
                (state.bankAccounts ?? []).length === 0 || account.isDefault,
            },
          ].map((item, _, all) =>
            account.isDefault && item.accountNumber !== account.accountNumber
              ? { ...item, isDefault: false }
              : all.length === 1
                ? { ...item, isDefault: true }
                : item,
          ),
        })),
      withdrawFromWallet: (amount) =>
        set((state) => ({
          walletBalance: Math.max(0, state.walletBalance - Math.max(0, amount)),
        })),
      adminLogin: (role = "ADMIN", staffEmail = "admin@sgdg.demo") =>
        set({ adminAuthenticated: true, actorRole: role, staffEmail }),
      adminLogout: () =>
        set({ adminAuthenticated: false, actorRole: "CUSTOMER", staffEmail: "" }),
      setKyc: (kyc) => set({ kyc }),
      toggleWatch: (id) =>
        set((state) => ({
          watchlist: state.watchlist.includes(id)
            ? state.watchlist.filter((x) => x !== id)
            : [...state.watchlist, id],
        })),
      markAllRead: () => set({ unreadNotifications: 0 }),
    }),
    {
      name: "sgdg-demo-state",
      version: 3,
      migrate: (persistedState, persistedVersion) => {
        const persisted =
          typeof persistedState === "object" && persistedState !== null
            ? (persistedState as Partial<DemoState>)
            : {};
        return {
          ...persisted,
          walletBalance:
            typeof persisted.walletBalance === "number"
              ? persisted.walletBalance
              : INITIAL_WALLET_BALANCE,
          auctionDeposits:
            persistedVersion < 3 ? {} : (persisted.auctionDeposits ?? {}),
          auctionDepositRecords:
            persistedVersion < 3
              ? {}
              : (persisted.auctionDepositRecords ?? {}),
          staffEmail:
            typeof persisted.staffEmail === "string"
              ? persisted.staffEmail
              : "",
        } as DemoState;
      },
    },
  ),
);
