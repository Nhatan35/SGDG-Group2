import { auctions } from "./mock/auctionService";
import {
  getHandoverCaseFixture,
  type HandoverOverviewScenario,
} from "./mock/handoverService";

const projectionNow = new Date("2026-07-26T02:00:00.000Z").getTime();

export interface HandoverSearchItem {
  caseId: string;
  caseReference: string;
  auctionId: string;
  auctionCode: string;
  assetName: string;
  customerReferenceMasked: string;
  stage: string;
  status: string;
  blocked: boolean;
  overdue: boolean;
  nextAction: string;
  deadline?: string;
  deliveryState: string;
  evidenceReadiness: string;
  updatedAt: string;
  scenario: HandoverOverviewScenario;
}

export function getHandoverSearchProjection(): HandoverSearchItem[] {
  const fixture = getHandoverCaseFixture(
    "HO-5711R-2026",
    "schedule-proposed",
  );
  if (!fixture) return [];
  const auction = auctions.find((item) => item.id === fixture.auctionId);
  if (!auction) return [];
  return [
    {
      caseId: fixture.caseId,
      caseReference: fixture.caseReference,
      auctionId: fixture.auctionId,
      auctionCode: auction.code,
      assetName: auction.assetName,
      customerReferenceMasked: "CUS-•••-1048",
      stage:
        fixture.progress.find((item) => item.status === "current")?.label ||
        "Không xác định",
      status: fixture.status,
      blocked: Boolean(fixture.actionRequired.blockedReason),
      overdue: Boolean(
        fixture.actionRequired.deadline &&
          new Date(fixture.actionRequired.deadline).getTime() < projectionNow,
      ),
      nextAction: fixture.actionRequired.title,
      deadline: fixture.actionRequired.deadline,
      deliveryState: fixture.delivery.status,
      evidenceReadiness: `${fixture.evidence.accepted}/${fixture.evidence.required}`,
      updatedAt: fixture.updatedAt,
      scenario: fixture.scenario,
    },
  ];
}

export function filterHandoverCases(
  items: HandoverSearchItem[],
  query: string,
  status: string,
  flag: "ALL" | "BLOCKED" | "OVERDUE",
) {
  const normalized = query.trim().toLowerCase();
  return items.filter(
    (item) =>
      (!normalized ||
        [
          item.caseId,
          item.caseReference,
          item.auctionId,
          item.auctionCode,
          item.assetName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized)) &&
      (status === "ALL" || item.status === status) &&
      (flag === "ALL" ||
        (flag === "BLOCKED" && item.blocked) ||
        (flag === "OVERDUE" && item.overdue)),
  );
}
