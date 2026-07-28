import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionMembershipCheckPage } from "./governance/AuctionMembershipCheckPage";
import { AuctionCustomerRegistrationPage } from "./customer/AuctionCustomerRegistrationPage";
import {
  prepareInitialValidRegistrationForMembership,
  resetMembershipCheckTestState,
} from "../test/membershipCheckTestHarness";
import { useDemoStore } from "../store/demoStore";
import { useAuctionMembershipCheckStore } from "../store/auctionMembershipCheckStore";

const renderAdminPage = (registrationId: string) =>
  render(
    <MemoryRouter
      initialEntries={[
        `/governance/customer-registrations/${registrationId}/membership-check`,
      ]}
    >
      <Routes>
        <Route
          path="/governance/customer-registrations/:registrationId/membership-check"
          element={<AuctionMembershipCheckPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("Customer Membership Check UI", () => {
  beforeEach(() => {
    resetMembershipCheckTestState();
    useDemoStore.setState({
      authenticated: true,
      adminAuthenticated: true,
      actorRole: "ADMIN",
    });
  });

  it("shows eligible ADMIN the Check Membership action and prototype evidence", () => {
    const prepared = prepareInitialValidRegistrationForMembership();
    renderAdminPage(prepared.registration.registrationId);
    expect(
      screen.getByRole("button", { name: "Check Membership" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "PROTOTYPE MEMBERSHIP EVIDENCE — REQUIRES STAKEHOLDER CONFIRMATION",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(
      screen.getByText("REGISTRATION_VALIDATION"),
    ).toBeInTheDocument();
  });

  it("displays VALID and Ready for Deposit Check after checking", async () => {
    const user = userEvent.setup();
    const prepared = prepareInitialValidRegistrationForMembership();
    renderAdminPage(prepared.registration.registrationId);
    await user.click(
      screen.getByRole("button", { name: "Check Membership" }),
    );
    expect(screen.getAllByText("VALID").length).toBeGreaterThan(0);
    expect(
      screen.getByText("READY_FOR_DEPOSIT_CHECK"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ready for Deposit Check")).toBeInTheDocument();
    expect(
      useAuctionMembershipCheckStore.getState().membershipChecks,
    ).toHaveLength(1);
  });

  it("blocks unauthorized roles from running Membership Check", () => {
    const prepared = prepareInitialValidRegistrationForMembership();
    useDemoStore.setState({ actorRole: "CUSTOMER" });
    renderAdminPage(prepared.registration.registrationId);
    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Check Membership" }),
    ).not.toBeInTheDocument();
  });

  it("exposes no Membership editing, Deposit, Eligibility, approval, or rejection action", () => {
    const prepared = prepareInitialValidRegistrationForMembership();
    renderAdminPage(prepared.registration.registrationId);
    for (const name of [
      /Edit Membership/i,
      /Activate Membership/i,
      /Renew Membership/i,
      /Check Deposit/i,
      /Evaluate Eligibility/i,
      /^Approve$/i,
      /^Reject$/i,
    ])
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });

  it("shows only the owning Customer-safe outcome and next step", () => {
    const prepared = prepareInitialValidRegistrationForMembership();
    const result = useAuctionMembershipCheckStore
      .getState()
      .checkCustomerMembership({
        registrationId: prepared.registration.registrationId,
        actorId: "admin.membership-check@mock.local",
        actorRole: "ADMIN",
        expectedValidationSourceType: "REGISTRATION_VALIDATION",
        expectedValidationSourceId: prepared.finalValidation.validationId,
        commandId: "customer-safe-membership-check",
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
        name: "Customer-safe Membership Result",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("READY_FOR_DEPOSIT_CHECK"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(result.membershipCheck.checkedBy),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/STAFF_ONLY/)).not.toBeInTheDocument();
  });
});
