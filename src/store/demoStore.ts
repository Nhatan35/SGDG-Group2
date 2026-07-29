import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActorRole } from "../types/domain";

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
interface DemoState {
  authenticated: boolean;
  adminAuthenticated: boolean;
  actorRole: ActorRole;
  staffEmail: string;
  userName: string;
  walletBalance: number;
  auctionDeposits: Record<string, number>;
  bankAccounts: LinkedBankAccount[];
  kyc: KycState;
  watchlist: string[];
  unreadNotifications: number;
  login: (name?: string) => void;
  logout: () => void;
  topUpWallet: (amount: number) => void;
  payAuctionDeposit: (auctionId: string, amount: number) => void;
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
      walletBalance: 125000000,
      auctionDeposits: {},
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
          walletBalance: state.walletBalance || 125000000,
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
          return {
            walletBalance: Math.max(0, state.walletBalance - depositAmount),
            auctionDeposits: {
              ...state.auctionDeposits,
              [auctionId]: depositAmount,
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
        set({
          adminAuthenticated: false,
          actorRole: "CUSTOMER",
          staffEmail: "",
        }),
      setKyc: (kyc) => set({ kyc }),
      toggleWatch: (id) =>
        set((state) => ({
          watchlist: state.watchlist.includes(id)
            ? state.watchlist.filter((x) => x !== id)
            : [...state.watchlist, id],
        })),
      markAllRead: () => set({ unreadNotifications: 0 }),
    }),
    { name: "sgdg-demo-state" },
  ),
);
