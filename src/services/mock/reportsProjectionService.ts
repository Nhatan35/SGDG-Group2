import type {
  ReportsProjectionFixture,
  ReportsScenario,
} from "../../types/domain";
const series = (items: Array<[string, number, string]>) =>
  items.map(([label, value, description], index) => ({
    id: `series-${index}`,
    label,
    value,
    description,
  }));
export function getReportsProjection(
  scenario: ReportsScenario,
): ReportsProjectionFixture {
  return {
    scenario,
    periodLabel: "30 ngày · 19/06–18/07/2026",
    generatedAt: "2026-07-18T15:15:00.000Z",
    projectionAsOf: "2026-07-18T15:10:00.000Z",
    stale: scenario === "stale-projection",
    disclosure:
      "Dữ liệu báo cáo mô phỏng — không sử dụng làm nguồn quyết định nghiệp vụ.",
    kpis: [
      ["Total mock sessions", 24, "Phiên trong fixture scope"],
      ["Sessions awaiting review", 4, "Chờ review mô phỏng"],
      ["Sessions published", 12, "Publication projection"],
      ["Live incidents", 1, "Sự cố mở trong projection"],
      [
        "Candidate attempts requiring attention",
        2,
        "Candidate workflow projection",
      ],
      [
        "Payment references pending review",
        3,
        "Không phải xác nhận thanh toán",
      ],
      ["Handover cases with blockers", 1, "Case có issue/hồ sơ remediation"],
      ["Completed handovers", 8, "Completion projection"],
    ].map(([label, value, description], index) => ({
      id: `kpi-${index}`,
      label: String(label),
      value: Number(value),
      description: String(description),
      authority: "NON_AUTHORITATIVE" as const,
    })),
    auctionFunnel: series([
      ["Opening Requests", 30, "Yêu cầu mở phiên"],
      ["Draft Sessions", 26, "Session draft"],
      ["Approved Sessions", 20, "Được phê duyệt"],
      ["Published Sessions", 12, "Đã công khai"],
      ["Live Sessions", 5, "Đang diễn ra"],
      ["Closed Sessions", 10, "Đã đóng"],
      ["Final Winner Confirmed", 7, "Fixture lifecycle"],
      ["Handover Completed", 8, "Projection hoàn tất"],
    ]),
    lifecycleDistribution: series([
      ["Draft", 6, "Lifecycle"],
      ["Pending Review", 4, "Lifecycle"],
      ["Pending Approval", 3, "Lifecycle"],
      ["Approved", 5, "Lifecycle"],
      ["Scheduled", 4, "Lifecycle"],
      ["Live", 5, "Lifecycle"],
      ["Closed", 10, "Lifecycle"],
      ["Cancelled", 2, "Lifecycle"],
    ]),
    publicationDistribution: series([
      ["Not Ready", 4, "Publication"],
      ["Approved Not Scheduled", 3, "Publication"],
      ["Scheduled", 5, "Publication"],
      ["Published", 12, "Publication"],
      ["Unpublished", 1, "Publication"],
      ["Retrying", 2, "Publication"],
    ]),
    candidateOutcomes: series([
      ["Active", 2, "Candidate attempt"],
      ["Expired", 3, "Candidate attempt"],
      ["Declined", 1, "Candidate attempt"],
      ["Final Winner Confirmed", 7, "Candidate outcome"],
    ]),
    paymentSummary: series([
      ["Pending", 3, "Payment reference"],
      ["Confirmed", 6, "Payment reference"],
      ["Ambiguous", 1, "Payment reference"],
      ["Failed", 1, "Payment reference"],
      ["Reversed", 1, "Payment reference"],
    ]),
    handoverSummary: series([
      ["Activated", 4, "Handover stage"],
      ["Schedule Proposed", 3, "Handover stage"],
      ["In Transit", 2, "Handover stage"],
      ["Evidence Pending", 1, "Handover stage"],
      ["Receipt Pending", 2, "Handover stage"],
      ["Completed", 8, "Handover stage"],
      ["Remediation", 1, "Handover stage"],
    ]),
  };
}
