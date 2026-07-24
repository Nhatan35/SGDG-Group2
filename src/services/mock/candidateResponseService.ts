import { getAuctionResultFixture, type AuctionResultScenario } from "./auctionResultService";

export type CandidateRank = 1 | 2 | 3;
export type CandidateResponseScenario =
  | "rank-1-invited"
  | "rank-2-invited"
  | "rank-3-invited"
  | "accepted"
  | "declined"
  | "expired"
  | "skipped"
  | "manual-review"
  | "loading"
  | "error";

export type CandidateResponseStatus =
  | "INVITED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "SKIPPED"
  | "MANUAL_REVIEW";

export interface CandidateResponseFixture {
  auctionId: string;
  scenario: CandidateResponseScenario;
  rank: CandidateRank;
  status: CandidateResponseStatus;
  activeCandidateRank: CandidateRank | null;
  closingPrice: number;
  invitedAt?: string;
  responseDeadline?: string;
  respondedAt?: string;
  candidateReference: string;
  source: "Auction Management Mock";
  consequenceCopy?: string;
  skipReason?: string;
  manualReviewReason?: string;
}

export const candidateResponseScenarios: CandidateResponseScenario[] = [
  "rank-1-invited", "rank-2-invited", "rank-3-invited", "accepted", "declined",
  "expired", "skipped", "manual-review", "loading", "error",
];

const rankFromScenario = (scenario: CandidateResponseScenario): CandidateRank =>
  scenario.includes("rank-2") ? 2 : scenario.includes("rank-3") ? 3 : 1;

const statusFromScenario = (scenario: CandidateResponseScenario): CandidateResponseStatus => {
  if (scenario.includes("invited")) return "INVITED";
  if (scenario === "accepted") return "ACCEPTED";
  if (scenario === "declined") return "DECLINED";
  if (scenario === "expired") return "EXPIRED";
  if (scenario === "skipped") return "SKIPPED";
  return "MANUAL_REVIEW";
};

export function getCandidateResponseFixture(
  auctionId: string,
  scenario: CandidateResponseScenario,
): CandidateResponseFixture | undefined {
  if (auctionId !== "patek-nautilus" || scenario === "loading" || scenario === "error") return undefined;

  const rank = rankFromScenario(scenario);
  const resultScenario: AuctionResultScenario = rank === 2 ? "rank-2-invited" : rank === 3 ? "rank-3-invited" : "rank-1-invited";
  const result = getAuctionResultFixture(auctionId, resultScenario);
  if (!result) return undefined;

  const deadline = rank === 1
    ? "2026-07-19T03:00:00.000Z"
    : rank === 2 ? "2026-07-19T05:00:00.000Z" : "2026-07-19T07:00:00.000Z";

  return {
    auctionId,
    scenario,
    rank,
    status: statusFromScenario(scenario),
    activeCandidateRank: scenario.includes("invited") ? rank : null,
    closingPrice: result.closingPrice,
    invitedAt: "2026-07-18T14:32:00.000Z",
    responseDeadline: deadline,
    respondedAt: scenario === "accepted" || scenario === "declined" ? "2026-07-18T15:05:00.000Z" : undefined,
    candidateReference: `SGD-CAND-•••-R${rank}-5711R`,
    source: "Auction Management Mock",
    consequenceCopy: "Chấp nhận lời mời chỉ ghi nhận lựa chọn của ứng viên; trạng thái tài chính vẫn do Financial Mock theo dõi.",
    skipReason: "Điều kiện tại thời điểm chuyển lượt không còn phù hợp, nên CandidateAttempt này không được kích hoạt.",
    manualReviewReason: "Hệ thống mô phỏng cần làm rõ dữ liệu trước khi tiếp tục CandidateAttempt này.",
  };
}
