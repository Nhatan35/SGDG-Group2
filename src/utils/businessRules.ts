import type {
  ActorRole,
  AuctionStatus,
  HandoverState,
  PaymentState,
  RegistrationStatus,
} from "../types/domain";
const auctionTransitions: Record<AuctionStatus, AuctionStatus[]> = {
  DRAFT: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["DRAFT", "PUBLISHED"],
  PUBLISHED: ["REGISTRATION_OPEN", "CANCELLED"],
  REGISTRATION_OPEN: ["REGISTRATION_CLOSED", "CANCELLED"],
  REGISTRATION_CLOSED: ["LIVE", "CANCELLED"],
  LIVE: ["PAUSED", "CLOSED", "CANCELLED"],
  PAUSED: ["LIVE", "CLOSED", "CANCELLED"],
  CLOSED: ["RESULT_PENDING"],
  RESULT_PENDING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
const paymentTransitions: Record<PaymentState, PaymentState[]> = {
  CREATED: ["PENDING", "CANCELLED"],
  PENDING: ["PROCESSING", "EXPIRED", "CANCELLED"],
  PROCESSING: ["RECONCILING", "FAILED"],
  RECONCILING: ["CONFIRMED", "FAILED"],
  CONFIRMED: [],
  FAILED: ["PENDING", "CANCELLED"],
  EXPIRED: [],
  CANCELLED: [],
};
const handoverTransitions: Record<HandoverState, HandoverState[]> = {
  NOT_READY: ["PREPARING"],
  PREPARING: ["READY_FOR_PICKUP", "IN_TRANSIT", "DISPUTED"],
  READY_FOR_PICKUP: ["CUSTOMER_CONFIRMED", "DISPUTED"],
  IN_TRANSIT: ["DELIVERED", "DISPUTED"],
  DELIVERED: ["CUSTOMER_CONFIRMED", "DISPUTED"],
  CUSTOMER_CONFIRMED: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  DISPUTED: ["PREPARING", "COMPLETED"],
};
export const canTransitionAuction = (from: AuctionStatus, to: AuctionStatus) =>
  auctionTransitions[from].includes(to);
export const canTransitionPayment = (from: PaymentState, to: PaymentState) =>
  paymentTransitions[from].includes(to);
export const canTransitionHandover = (from: HandoverState, to: HandoverState) =>
  handoverTransitions[from].includes(to);
export const registrationEligible = (status: RegistrationStatus) =>
  status === "ELIGIBLE";
export function canAccess(
  role: ActorRole,
  area: "ACCOUNT" | "USERS" | "ASSETS" | "LIVE_OPS" | "PAYMENTS" | "REPORTS",
) {
  if (role === "CUSTOMER") return area === "ACCOUNT";
  if (role === "ADMIN") return area !== "ACCOUNT";
  if (role === "CUSTOMER_SUPPORT")
    return ["USERS", "LIVE_OPS", "REPORTS"].includes(area);
  if (role === "CONTENT_STAFF") return ["ASSETS", "REPORTS"].includes(area);
  return ["PAYMENTS", "REPORTS"].includes(area);
}
