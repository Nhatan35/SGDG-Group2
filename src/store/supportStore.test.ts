import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSupportStore } from "./supportStore";
const initial = useSupportStore.getState();
describe("Customer Service lifecycle rules", () => {
  beforeEach(() => useSupportStore.setState(initial, true));
  afterEach(() => useSupportStore.setState(initial, true));
  it("keeps closed tickets read-only", () => {
    useSupportStore
      .getState()
      .updateTicket("TKT-2380", "IN_PROGRESS", "attempt");
    expect(
      useSupportStore.getState().tickets.find((x) => x.id === "TKT-2380")
        ?.status,
    ).toBe("CLOSED");
  });
  it("allows at most one dispute per complaint", () => {
    const before = useSupportStore
      .getState()
      .disputes.filter((x) => x.complaintId === "CMP-173").length;
    useSupportStore.getState().createDispute("CMP-173", "duplicate escalation");
    const after = useSupportStore
      .getState()
      .disputes.filter((x) => x.complaintId === "CMP-173").length;
    expect(before).toBe(1);
    expect(after).toBe(1);
    expect(
      useSupportStore.getState().complaints.find((x) => x.id === "CMP-173")
        ?.disputeId,
    ).toBe("DSP-091");
  });
  it("applies retention hold only while under investigation", () => {
    useSupportStore
      .getState()
      .requestRetentionHold("DSP-091", "preserve evidence");
    expect(
      useSupportStore.getState().disputes.find((x) => x.id === "DSP-091")
        ?.retentionHold,
    ).toMatchObject({
      reason: "preserve evidence",
      status: "PENDING_ADMIN_APPROVAL",
    });
    useSupportStore.getState().requestRetentionHold("DSP-088", "invalid state");
    expect(
      useSupportStore.getState().disputes.find((x) => x.id === "DSP-088")
        ?.retentionHold,
    ).toBeUndefined();
  });
  it("requires an Admin decision before activating a retention hold", () => {
    useSupportStore
      .getState()
      .requestRetentionHold("DSP-091", "Bảo toàn log thanh toán");
    useSupportStore
      .getState()
      .decideRetentionHold("DSP-091", true, "Đủ căn cứ điều tra");
    expect(
      useSupportStore.getState().disputes.find((x) => x.id === "DSP-091")
        ?.retentionHold,
    ).toMatchObject({
      status: "ACTIVE",
      decisionNote: "Đủ căn cứ điều tra",
    });
  });
  it("retains a rejected retention-hold decision for audit", () => {
    useSupportStore
      .getState()
      .requestRetentionHold("DSP-091", "Bảo toàn log truy cập");
    useSupportStore
      .getState()
      .decideRetentionHold("DSP-091", false, "Không đủ căn cứ");
    expect(
      useSupportStore.getState().disputes.find((x) => x.id === "DSP-091")
        ?.retentionHold,
    ).toMatchObject({
      status: "REJECTED",
      decisionNote: "Không đủ căn cứ",
    });
  });
  it("returns a dispute to support after Finance submits findings", () => {
    useSupportStore
      .getState()
      .acceptFinancialInvestigation("FIN-INV-088");
    useSupportStore
      .getState()
      .submitFinancialInvestigation(
        "FIN-INV-088",
        "Refund matched provider record",
      );
    expect(
      useSupportStore
        .getState()
        .investigations.find((x) => x.id === "FIN-INV-088")?.status,
    ).toBe("SUBMITTED");
    expect(
      useSupportStore.getState().disputes.find((x) => x.id === "DSP-088")
        ?.status,
    ).toBe("UNDER_INVESTIGATION");
  });
  it("does not mutate a dispute when Finance submits from an invalid state", () => {
    const before = useSupportStore
      .getState()
      .disputes.find((x) => x.id === "DSP-088")?.status;
    useSupportStore
      .getState()
      .submitFinancialInvestigation("FIN-INV-088", "Kết quả không hợp lệ");
    expect(
      useSupportStore
        .getState()
        .investigations.find((x) => x.id === "FIN-INV-088")?.status,
    ).toBe("REQUESTED");
    expect(
      useSupportStore.getState().disputes.find((x) => x.id === "DSP-088")
        ?.status,
    ).toBe(before);
  });
  it("does not attach a new complaint to an unrelated dispute", () => {
    const complaintId = useSupportStore
      .getState()
      .createComplaint(
        "TKT-2398",
        "Cần xem xét hướng dẫn KYC",
        "Nội dung hướng dẫn chưa rõ",
      );
    expect(
      useSupportStore
        .getState()
        .complaints.find((item) => item.id === complaintId)?.disputeId,
    ).toBeUndefined();
  });
  it("blocks dispute resolution while Finance is still investigating", () => {
    useSupportStore
      .getState()
      .updateDispute("DSP-088", "RESOLVED", "resolve too early");
    expect(
      useSupportStore.getState().disputes.find((x) => x.id === "DSP-088")
        ?.status,
    ).toBe("FINANCIAL_INVESTIGATION_PENDING");
  });
  it("supports a more-information round trip between Finance and Support", () => {
    const store = useSupportStore.getState();
    store.acceptFinancialInvestigation("FIN-INV-088");
    useSupportStore
      .getState()
      .requestFinancialInvestigationInfo(
        "FIN-INV-088",
        "Bổ sung chứng từ ngân hàng",
      );
    expect(
      useSupportStore
        .getState()
        .investigations.find((x) => x.id === "FIN-INV-088")?.status,
    ).toBe("MORE_INFO_REQUIRED");
    useSupportStore
      .getState()
      .provideFinancialInvestigationInfo(
        "FIN-INV-088",
        "Đã bổ sung chứng từ",
      );
    expect(
      useSupportStore
        .getState()
        .investigations.find((x) => x.id === "FIN-INV-088")?.status,
    ).toBe("IN_PROGRESS");
  });
});
