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
        ?.retentionHold?.reason,
    ).toBe("preserve evidence");
    useSupportStore.getState().requestRetentionHold("DSP-088", "invalid state");
    expect(
      useSupportStore.getState().disputes.find((x) => x.id === "DSP-088")
        ?.retentionHold,
    ).toBeUndefined();
  });
  it("returns a dispute to support after Finance submits findings", () => {
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
});
