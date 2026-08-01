import { beforeEach, describe, expect, it } from "vitest";
import { useFinanceFlowStore } from "./financeFlowStore";

describe("finance payout flow", () => {
  beforeEach(() => {
    localStorage.clear();
    useFinanceFlowStore.getState().resetForTests();
  });

  it("routes a customer payout to Finance and enforces its lifecycle", () => {
    const payout = useFinanceFlowStore.getState().createPayoutRequest({
      userName: "Nguyễn Minh Anh",
      bankName: "Vietcombank",
      accountNumber: "0123456789",
      accountHolder: "NGUYEN MINH ANH",
      amount: 20_000_000,
    });

    expect(payout.status).toBe("PENDING_REVIEW");
    expect(useFinanceFlowStore.getState().payoutRequests[0].id).toBe(
      payout.id,
    );

    expect(
      useFinanceFlowStore
        .getState()
        .transitionPayout(payout.id, "PAID", "Bỏ qua kiểm tra"),
    ).toBe(false);
    expect(
      useFinanceFlowStore
        .getState()
        .transitionPayout(payout.id, "APPROVED", "Đã khớp thông tin"),
    ).toBe(true);
    expect(
      useFinanceFlowStore
        .getState()
        .transitionPayout(payout.id, "PROCESSING", "Đưa vào lô chi"),
    ).toBe(true);
    expect(
      useFinanceFlowStore
        .getState()
        .transitionPayout(payout.id, "PAID", "Ngân hàng báo thành công"),
    ).toBe(true);

    const completed = useFinanceFlowStore
      .getState()
      .payoutRequests.find((item) => item.id === payout.id);
    expect(completed?.status).toBe("PAID");
    expect(completed?.timeline).toHaveLength(4);
  });

  it("resolves a mismatch only when the batch is still open", () => {
    expect(
      useFinanceFlowStore
        .getState()
        .resolveReconciliation(
          "REC-0728-GW",
          "Đã bổ sung hai giao dịch treo.",
        ),
    ).toBe(true);

    const batch = useFinanceFlowStore
      .getState()
      .reconciliationBatches.find((item) => item.id === "REC-0728-GW");
    expect(batch).toMatchObject({
      status: "RESOLVED",
      mismatchCount: 0,
      providerAmount: batch?.internalAmount,
    });
    expect(
      useFinanceFlowStore
        .getState()
        .resolveReconciliation("REC-0728-GW", "Lặp lại"),
    ).toBe(false);
  });
});
