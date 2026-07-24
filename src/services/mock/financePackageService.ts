import type {
  FinancePackageScenario,
  FinancePackageVersion,
} from "../../types/domain";
const validations = [
  [
    "result-exists",
    "Result reference exists",
    "PASS",
    "Result snapshot RES-PATEK-5711R is available.",
    "RES-PATEK-5711R",
  ],
  [
    "snapshot-current",
    "Result snapshot version current",
    "PASS",
    "Version 1 is the current result projection.",
    "SGD-RES-•••-5711R",
  ],
  [
    "top-three",
    "Top 3 snapshot available",
    "PASS",
    "Three ranked candidates are present.",
    "BID-5711R-101",
  ],
  [
    "candidate",
    "Candidate reference valid",
    "PASS",
    "Rank 1 candidate reference is masked and valid.",
    "CAN-•••-5711R-01",
  ],
  [
    "amount",
    "Amount matches result projection",
    "PASS",
    "Closing amount matches the immutable result projection.",
    "RES-PATEK-5711R",
  ],
  [
    "currency",
    "Currency explicit",
    "PASS",
    "VND is explicit in the package payload.",
    "VND",
  ],
  [
    "duplicate",
    "Duplicate package check",
    "WARNING",
    "Version history exists; only one accepted effective version is allowed.",
    "FIN-PKG-PATEK-5711R",
  ],
  [
    "references",
    "Required references complete",
    "PASS",
    "Result, candidate and handover references are complete.",
    "HO-5711R-2026",
  ],
] as const;
const payload = [
  ["Auction code", "SGD-260717-002"],
  ["Result reference", "RES-PATEK-5711R"],
  ["Result version", "1"],
  ["Candidate rank", "1"],
  ["Candidate reference", "CAN-•••-5711R-01"],
  ["Closing amount", "3.500.000.000 ₫"],
  ["Currency", "VND"],
  ["Package purpose", "Supporting finance handoff"],
  ["Source", "Auction Management Mock"],
].map(([label, value]) => ({ label, value }));
function version(
  id: string,
  number: 1 | 2,
  status: FinancePackageVersion["status"],
  extra: Partial<FinancePackageVersion> = {},
): FinancePackageVersion {
  return {
    packageId: id,
    packageGroupId: "FIN-PKG-PATEK-5711R",
    version: number,
    status,
    purpose: "Supporting finance handoff",
    resultReference: "RES-PATEK-5711R",
    candidateReference: "CAN-•••-5711R-01",
    auctionCode: "SGD-260717-002",
    amount: 3_500_000_000,
    currency: "VND",
    validationItems: validations.map(
      ([id, label, state, description, relatedReference]) => ({
        id,
        label,
        status: state,
        description,
        relatedReference,
      }),
    ),
    payloadSummary: payload,
    createdAt: "2026-07-18T14:32:00.000Z",
    ...extra,
    acceptedEffective: extra.acceptedEffective ?? false,
  };
}
const v1 = version("FIN-PKG-PATEK-5711R-V1", 1, "SUBMITTED", {
  submittedAt: "2026-07-18T14:35:00.000Z",
});
const v2 = version("FIN-PKG-PATEK-5711R-V2", 2, "ACCEPTED", {
  submittedAt: "2026-07-18T15:00:00.000Z",
  reviewedAt: "2026-07-18T15:10:00.000Z",
  decisionReason: "References and result amount validated.",
  supersedesVersion: 1,
  acceptedEffective: true,
});
export function getFinancePackageFixture(
  packageId: string,
  scenario: FinancePackageScenario,
): FinancePackageVersion | undefined {
  if (
    packageId !== "FIN-PKG-PATEK-5711R-V1" &&
    packageId !== "FIN-PKG-PATEK-5711R-V2"
  )
    return undefined;
  const isV2 = packageId.endsWith("V2");
  if (scenario === "accepted")
    return isV2
      ? v2
      : version(packageId, 1, "SUPERSEDED", {
          submittedAt: v1.submittedAt,
          decisionReason: "Superseded by version 2.",
          reviewedAt: "2026-07-18T15:10:00.000Z",
        });
  if (scenario === "superseded")
    return version("FIN-PKG-PATEK-5711R-V1", 1, "SUPERSEDED", {
      submittedAt: v1.submittedAt,
      decisionReason: "Correction incorporated in V2.",
    });
  if (scenario === "draft") return version(packageId, isV2 ? 2 : 1, "DRAFT");
  if (scenario === "correction-requested")
    return version("FIN-PKG-PATEK-5711R-V1", 1, "CORRECTION_REQUESTED", {
      submittedAt: v1.submittedAt,
      reviewedAt: "2026-07-18T14:45:00.000Z",
      decisionReason: "Please clarify duplicate package history.",
    });
  if (scenario === "resubmitted")
    return version("FIN-PKG-PATEK-5711R-V2", 2, "RESUBMITTED", {
      submittedAt: "2026-07-18T15:00:00.000Z",
      supersedesVersion: 1,
    });
  if (scenario === "rejected")
    return version(packageId, isV2 ? 2 : 1, "REJECTED", {
      submittedAt: v1.submittedAt,
      reviewedAt: "2026-07-18T14:45:00.000Z",
      decisionReason: "Required finance mock correction was not resolved.",
    });
  return scenario === "submitted" ? v1 : v1;
}
export function getFinancePackageVersions(groupId: string) {
  return groupId === "FIN-PKG-PATEK-5711R" ? [v1, v2] : [];
}
export function getEffectiveAcceptedPackage(groupId: string) {
  const accepted = getFinancePackageVersions(groupId).filter(
    (item) => item.acceptedEffective,
  );
  return accepted.length === 1 ? accepted[0] : undefined;
}
