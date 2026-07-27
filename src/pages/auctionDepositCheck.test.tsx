import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionCustomerRegistrationPage } from "./customer/AuctionCustomerRegistrationPage";
import { AuctionDepositCheckPage } from "./finance/AuctionDepositCheckPage";
import {
  prepareValidMembershipForDeposit,
  resetDepositCheckTestState,
} from "../test/depositCheckTestHarness";
import { useAuctionDepositCheckStore } from "../store/auctionDepositCheckStore";
import { useDemoStore } from "../store/demoStore";

const renderDepositPage = (registrationId: string) =>
  render(
    <MemoryRouter
      initialEntries={[
        `/finance/customer-registrations/${registrationId}/deposit-check`,
      ]}
    >
      <Routes>
        <Route
          path="/finance/customer-registrations/:registrationId/deposit-check"
          element={<AuctionDepositCheckPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("Customer Deposit Check UI", () => {
  beforeEach(() => {
    resetDepositCheckTestState();
    useDemoStore.setState({
      authenticated: true,
      adminAuthenticated: true,
      actorRole: "FINANCE",
    });
  });

  it("shows eligible FINANCE user the Check Deposit action and evidence", () => {
    const prepared = prepareValidMembershipForDeposit();
    renderDepositPage(prepared.registration.registrationId);
    expect(
      screen.getByRole("button", { name: "Check Deposit" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "PROTOTYPE DEPOSIT EVIDENCE — REQUIRES STAKEHOLDER CONFIRMATION",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("CONFIRMED")).toBeInTheDocument();
    expect(
      screen.getByText(prepared.membershipCheck.membershipCheckId),
    ).toBeInTheDocument();
  });

  it("keeps ADMIN read-only without command execution", () => {
    const prepared = prepareValidMembershipForDeposit();
    useDemoStore.setState({ actorRole: "ADMIN" });
    renderDepositPage(prepared.registration.registrationId);
    expect(screen.getByText("ADMIN read-only projection")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Check Deposit" }),
    ).not.toBeInTheDocument();
  });

  it("displays SATISFIED and Ready for Eligibility Evaluation", async () => {
    const user = userEvent.setup();
    const prepared = prepareValidMembershipForDeposit();
    renderDepositPage(prepared.registration.registrationId);
    await user.click(screen.getByRole("button", { name: "Check Deposit" }));
    expect(screen.getAllByText("SATISFIED").length).toBeGreaterThan(0);
    expect(
      screen.getByText("READY_FOR_ELIGIBILITY_EVALUATION"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ready for Eligibility Evaluation"),
    ).toBeInTheDocument();
    expect(
      useAuctionDepositCheckStore.getState().depositChecks,
    ).toHaveLength(1);
  });

  it("exposes no payment mutation or Eligibility action", () => {
    const prepared = prepareValidMembershipForDeposit();
    renderDepositPage(prepared.registration.registrationId);
    for (const name of [
      /Confirm Payment/i,
      /Edit Deposit/i,
      /^Refund$/i,
      /Evaluate Eligibility/i,
      /^Approve$/i,
      /^Reject$/i,
    ])
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });

  it("shows only the owning Customer-safe Deposit outcome and next step", () => {
    const prepared = prepareValidMembershipForDeposit();
    const result = useAuctionDepositCheckStore
      .getState()
      .checkCustomerDeposit({
        registrationId: prepared.registration.registrationId,
        actorId: "finance.deposit-check@mock.local",
        actorRole: "FINANCE",
        expectedMembershipCheckId:
          prepared.membershipCheck.membershipCheckId,
        commandId: "customer-safe-deposit-check",
      });
    if (!result.ok) throw new Error(result.message);
    useDemoStore.setState({ actorRole: "CUSTOMER" });
    render(
      <MemoryRouter
        initialEntries={[
          `/customer/auctions/${prepared.session.sessionId}/registration`,
        ]}
      >
        <Routes>
          <Route
            path="/customer/auctions/:sessionId/registration"
            element={<AuctionCustomerRegistrationPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", {
        name: "Customer-safe Deposit Result",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("READY_FOR_ELIGIBILITY_EVALUATION"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(result.depositCheck.checkedBy),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/STAFF_ONLY/)).not.toBeInTheDocument();
  });
});
