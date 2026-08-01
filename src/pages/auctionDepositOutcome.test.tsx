import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionResultPage } from "./auction/AuctionResultPage";
import { useDemoStore } from "../store/demoStore";
import { useFinanceFlowStore } from "../store/financeFlowStore";

describe("auction result deposit outcome", () => {
  beforeEach(() => {
    localStorage.clear();
    useDemoStore.setState({
      walletBalance: 500_000_000,
      auctionDeposits: {},
      auctionDepositRecords: {},
    });
    useFinanceFlowStore.getState().resetForTests();
    useDemoStore
      .getState()
      .payAuctionDeposit("patek-nautilus", 325_000_000);
  });

  it("automatically creates a refund when the auction has no valid winner", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/me/auctions/patek-nautilus/result?scenario=top3-exhausted",
        ]}
      >
        <Routes>
          <Route
            path="/me/auctions/:auctionId/result"
            element={<AuctionResultPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Đang chờ hoàn cọc",
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        useDemoStore.getState().auctionDepositRecords["patek-nautilus"]
          ?.status,
      ).toBe("REFUND_PENDING"),
    );
    expect(
      useFinanceFlowStore
        .getState()
        .refundRequests.some(
          (item) =>
            item.auctionId === "patek-nautilus" &&
            item.source === "AUCTION_DEPOSIT",
        ),
    ).toBe(true);
  });
});
