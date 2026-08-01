import { beforeEach, describe, expect, it } from "vitest";
import { useDemoStore } from "./demoStore";
import { useFinanceFlowStore } from "./financeFlowStore";

const auctionId = "patek-nautilus";
const depositAmount = 50_000_000;

describe("auction deposit lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    useDemoStore.setState({
      walletBalance: 100_000_000,
      auctionDeposits: {},
      auctionDepositRecords: {},
    });
    useFinanceFlowStore.getState().resetForTests();
  });

  it("returns the deposit through the Finance refund lifecycle", () => {
    useDemoStore.getState().payAuctionDeposit(auctionId, depositAmount);
    useDemoStore
      .getState()
      .requestAuctionDepositRefund(auctionId, "AUCTION_FAILED");

    const record =
      useDemoStore.getState().auctionDepositRecords[auctionId];
    const refund = useFinanceFlowStore
      .getState()
      .createDepositRefundRequest({
        auctionId,
        depositReference: record.reference,
        customer: "Nguyễn Minh Anh",
        amount: record.amount,
        bankName: "Ví SGDG",
        reason: "Phiên đấu giá thất bại",
      });

    expect(useDemoStore.getState().walletBalance).toBe(50_000_000);
    expect(record.status).toBe("REFUND_PENDING");
    expect(refund.status).toBe("PENDING_REVIEW");

    expect(
      useFinanceFlowStore
        .getState()
        .transitionRefund(refund.id, "APPROVED"),
    ).toBe(true);
    expect(
      useFinanceFlowStore
        .getState()
        .transitionRefund(refund.id, "PROCESSING"),
    ).toBe(true);
    expect(
      useFinanceFlowStore
        .getState()
        .transitionRefund(refund.id, "COMPLETED"),
    ).toBe(true);

    expect(useDemoStore.getState().walletBalance).toBe(100_000_000);
    expect(
      useDemoStore.getState().auctionDepositRecords[auctionId]?.status,
    ).toBe("REFUNDED");
    expect(useDemoStore.getState().auctionDeposits[auctionId]).toBeUndefined();
    expect(
      useFinanceFlowStore
        .getState()
        .transitionRefund(refund.id, "COMPLETED"),
    ).toBe(false);
    expect(useDemoStore.getState().walletBalance).toBe(100_000_000);
  });

  it("forfeits the deposit without crediting the wallet after payment default", () => {
    useDemoStore.getState().payAuctionDeposit(auctionId, depositAmount);

    useDemoStore.getState().forfeitAuctionDeposit(auctionId);

    const state = useDemoStore.getState();
    expect(state.walletBalance).toBe(50_000_000);
    expect(state.auctionDeposits[auctionId]).toBeUndefined();
    expect(state.auctionDepositRecords[auctionId]).toMatchObject({
      amount: depositAmount,
      status: "FORFEITED",
      reason: "PAYMENT_DEFAULT",
    });
  });

  it("holds an ambiguous deposit and releases it after reconciliation", () => {
    useDemoStore.getState().payAuctionDeposit(auctionId, depositAmount);

    useDemoStore.getState().holdAuctionDeposit(auctionId);
    expect(
      useDemoStore.getState().auctionDepositRecords[auctionId]?.status,
    ).toBe("ON_HOLD");

    useDemoStore.getState().releaseAuctionDepositHold(auctionId);
    expect(
      useDemoStore.getState().auctionDepositRecords[auctionId]?.status,
    ).toBe("ACTIVE");
    expect(useDemoStore.getState().auctionDeposits[auctionId]).toBe(
      depositAmount,
    );
  });
});
