import { getAuctionResultFixture } from "./auctionResultService";
import { getPaymentReferenceFixture } from "./paymentReferenceService";

export type FinalWinnerScenario = "final-winner-confirmed" | "handover-pending" | "handover-ready" | "blocking-hold" | "remediation-required" | "not-confirmed";
export type FinalWinnerConfirmationStatus = "FINAL_WINNER_CONFIRMED" | "NOT_CONFIRMED" | "BLOCKED" | "REMEDIATION_REQUIRED";
export type HandoverCaseStatus = "NOT_CREATED" | "PENDING_ACTIVATION" | "READY" | "BLOCKED" | "REMEDIATION";

export interface FinalWinnerMilestone {
  id: string;
  occurredAt?: string;
  title: string;
  description?: string;
  source: "Auction Management Mock" | "Financial Management Mock" | "Handover Mock";
  status: "completed" | "current" | "waiting" | "blocked" | "error";
}

export interface FinalWinnerFixture {
  auctionId: string;
  scenario: FinalWinnerScenario;
  status: FinalWinnerConfirmationStatus;
  winnerRank: 1;
  winnerAlias: "Bạn";
  closingPrice: number;
  confirmedPaymentAmount: number;
  paymentStatus: "CONFIRMED";
  paymentReference: string;
  paymentConfirmedAt: string;
  paymentSource: "Financial Management Mock";
  finalWinnerTransition: "FINAL_WINNER_CONFIRMED" | "NOT_CONFIRMED" | "BLOCKED";
  finalWinnerReference: string;
  finalWinnerConfirmedAt?: string;
  finalWinnerSource: "Auction Management Mock";
  handoverCaseStatus: HandoverCaseStatus;
  handoverCaseId?: string;
  holdReason?: string;
  remediationReason?: string;
  nextActionDescription?: string;
  milestones: FinalWinnerMilestone[];
}

export const finalWinnerScenarios: FinalWinnerScenario[] = ["final-winner-confirmed", "handover-pending", "handover-ready", "blocking-hold", "remediation-required", "not-confirmed"];

export function getFinalWinnerFixture(auctionId: string, scenario: FinalWinnerScenario): FinalWinnerFixture | undefined {
  const result = getAuctionResultFixture(auctionId, "rank-1-invited");
  const payment = getPaymentReferenceFixture(auctionId, scenario === "remediation-required" ? "reversed" : "confirmed", "final-winner-confirmed");
  if (!result || !payment) return undefined;
  const remediation = scenario === "remediation-required";
  const notConfirmed = scenario === "not-confirmed";
  const handoverCaseStatus: HandoverCaseStatus = scenario === "handover-ready" ? "READY" : scenario === "handover-pending" ? "PENDING_ACTIVATION" : scenario === "blocking-hold" ? "BLOCKED" : remediation ? "REMEDIATION" : "NOT_CREATED";
  const confirmedAt = "2026-07-20T07:26:00.000Z";
  return {
    auctionId,
    scenario,
    status: remediation ? "REMEDIATION_REQUIRED" : notConfirmed ? "NOT_CONFIRMED" : scenario === "blocking-hold" ? "BLOCKED" : "FINAL_WINNER_CONFIRMED",
    winnerRank: 1,
    winnerAlias: "Bạn",
    closingPrice: result.closingPrice,
    confirmedPaymentAmount: payment.amountDue,
    paymentStatus: "CONFIRMED",
    paymentReference: payment.providerReference,
    paymentConfirmedAt: "2026-07-20T07:25:00.000Z",
    paymentSource: payment.source,
    finalWinnerTransition: notConfirmed ? "NOT_CONFIRMED" : remediation ? "BLOCKED" : "FINAL_WINNER_CONFIRMED",
    finalWinnerReference: "SGD-WIN-•••-5711R",
    finalWinnerConfirmedAt: notConfirmed ? undefined : confirmedAt,
    finalWinnerSource: "Auction Management Mock",
    handoverCaseStatus,
    handoverCaseId: handoverCaseStatus === "NOT_CREATED" ? undefined : "HO-5711R-2026",
    holdReason: scenario === "blocking-hold" ? "Hồ sơ bàn giao đang chờ xác minh thông tin nhận tài sản." : undefined,
    remediationReason: remediation ? "Xác nhận thanh toán đã được đảo ngược sau mốc FinalWinnerConfirmed; Financial Management Mock cần xử lý bổ sung." : undefined,
    nextActionDescription: handoverCaseStatus === "READY" ? "Xem và hoàn thành các bước bàn giao." : handoverCaseStatus === "PENDING_ACTIVATION" ? "Chờ hồ sơ bàn giao được kích hoạt." : handoverCaseStatus === "BLOCKED" ? "Chờ xử lý trạng thái tạm giữ." : handoverCaseStatus === "REMEDIATION" ? "Xem trạng thái cần xử lý bổ sung." : "Bắt đầu quy trình bàn giao.",
    milestones: [
      { id: "closed", occurredAt: result.closedAt, title: "Phiên đấu giá đã đóng", source: "Auction Management Mock", status: "completed" },
      { id: "candidate", occurredAt: "2026-07-19T03:00:00.000Z", title: "Ứng viên ưu tiên hạng 1 chấp nhận nghĩa vụ", source: "Auction Management Mock", status: "completed" },
      { id: "payment", occurredAt: "2026-07-20T07:25:00.000Z", title: "Thanh toán được xác nhận", source: "Financial Management Mock", status: "completed" },
      { id: "winner", occurredAt: confirmedAt, title: "FinalWinnerConfirmed được áp dụng", source: "Auction Management Mock", status: notConfirmed ? "waiting" : "completed" },
      { id: "handover", occurredAt: handoverCaseStatus === "NOT_CREATED" ? undefined : "2026-07-20T07:27:00.000Z", title: handoverCaseStatus === "READY" ? "Hồ sơ bàn giao đã sẵn sàng" : handoverCaseStatus === "BLOCKED" ? "Hồ sơ bàn giao đang tạm giữ" : handoverCaseStatus === "REMEDIATION" ? "Quy trình bàn giao cần xử lý bổ sung" : "Đang chuẩn bị hồ sơ bàn giao", source: "Handover Mock", status: handoverCaseStatus === "READY" ? "current" : handoverCaseStatus === "BLOCKED" ? "blocked" : handoverCaseStatus === "REMEDIATION" ? "error" : "waiting" },
    ],
  };
}
