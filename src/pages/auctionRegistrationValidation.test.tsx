import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionRegistrationValidationPage } from "./governance/AuctionRegistrationValidationPage";
import { AuctionCustomerRegistrationPage } from "./customer/AuctionCustomerRegistrationPage";
import { AuctionSessionWorkspacePage } from "./ops/OperationsPages";
import {
  prepareSubmittedCustomerRegistration,
  resetRegistrationValidationTestState,
} from "../test/registrationValidationTestHarness";
import { useAuctionCustomerRegistrationStore } from "../store/auctionCustomerRegistrationStore";
import {
  getCustomerRegistrationSubmissionRecordId,
  useAuctionRegistrationValidationStore,
} from "../store/auctionRegistrationValidationStore";
import { useDemoStore } from "../store/demoStore";

const renderValidation = (registrationId: string) =>
  render(
    <MemoryRouter
      initialEntries={[
        `/governance/customer-registrations/${registrationId}/validation`,
      ]}
    >
      <Routes>
        <Route
          path="/governance/customer-registrations/:registrationId/validation"
          element={<AuctionRegistrationValidationPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

const validatePrepared = (
  prepared: ReturnType<typeof prepareSubmittedCustomerRegistration>,
) =>
  useAuctionRegistrationValidationStore
    .getState()
    .validateCustomerRegistration({
      registrationId: prepared.registration.registrationId,
      actorId: "admin.registration-validation@mock.local",
      actorRole: "ADMIN",
      expectedRegistrationVersion:
        prepared.registration.registrationVersion,
      expectedSubmissionRecordId:
        getCustomerRegistrationSubmissionRecordId(
          prepared.registration.registrationId,
        ),
      commandId: "ui-validate-customer-registration",
    });

describe("Registration Validation screens and projections", () => {
  beforeEach(() => {
    resetRegistrationValidationTestState();
    useDemoStore.setState({
      adminAuthenticated: true,
      actorRole: "ADMIN",
    });
  });

  it("shows one Validate action for a submitted Registration and creates VALID", async () => {
    const user = userEvent.setup();
    const prepared = prepareSubmittedCustomerRegistration();
    renderValidation(prepared.registration.registrationId);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Registration Validation",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/SUBMITTED/).length).toBeGreaterThan(0);
    const action = screen.getByRole("button", {
      name: "Validate Registration",
    });
    expect(action).toBeInTheDocument();
    await user.click(action);
    expect(
      screen.getAllByText("VALID", { exact: true }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Ready for Membership Check"),
    ).toBeInTheDocument();
    expect(
      useAuctionRegistrationValidationStore.getState().validations,
    ).toHaveLength(1);
  });

  it("blocks CUSTOMER from running or inspecting internal validation", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    useDemoStore.setState({ actorRole: "CUSTOMER" });
    renderValidation(prepared.registration.registrationId);
    expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Validate Registration" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/commandId/i)).not.toBeInTheDocument();
  });

  it("displays CORRECTION REQUIRED for correctable evidence", async () => {
    const user = userEvent.setup();
    const prepared = prepareSubmittedCustomerRegistration();
    useAuctionCustomerRegistrationStore.setState({
      registrations: [
        {
          ...prepared.registration,
          rulesAccepted: false,
          rulesAcceptedAt: undefined,
        },
      ],
    });
    renderValidation(prepared.registration.registrationId);
    await user.click(
      screen.getByRole("button", { name: "Validate Registration" }),
    );
    expect(
      screen.getAllByText("INVALID — CORRECTABLE", { exact: true }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Correction Required")).toBeInTheDocument();
  });

  it("displays INVALID — BLOCKING for submission outside the Window", async () => {
    const user = userEvent.setup();
    const prepared = prepareSubmittedCustomerRegistration();
    const submittedAt = new Date(
      Date.parse(
        prepared.registrationWindow.window.registrationCloseAt,
      ) + 1,
    ).toISOString();
    useAuctionCustomerRegistrationStore.setState({
      registrations: [
        {
          ...prepared.registration,
          submittedAt,
          submissionRecord: {
            recordVersion: 1,
            submittedBy: prepared.registration.customerId,
            submittedAt,
          },
        },
      ],
    });
    renderValidation(prepared.registration.registrationId);
    await user.click(
      screen.getByRole("button", { name: "Validate Registration" }),
    );
    expect(
      screen.getAllByText("INVALID — BLOCKING", { exact: true }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Invalid — Blocking Issue")).toBeInTheDocument();
    expect(
      screen.getByText("SUBMITTED_OUTSIDE_CONFIRMED_WINDOW"),
    ).toBeInTheDocument();
  });

  it("exposes no correction, downstream check, approval, or rejection action", async () => {
    const user = userEvent.setup();
    const prepared = prepareSubmittedCustomerRegistration();
    renderValidation(prepared.registration.registrationId);
    await user.click(
      screen.getByRole("button", { name: "Validate Registration" }),
    );
    for (const name of [
      /Correct Registration/i,
      /Resubmit/i,
      /Check Membership/i,
      /Check Deposit/i,
      /Evaluate Eligibility/i,
      /^Approve$/i,
      /^Reject$/i,
    ])
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });

  it("shows only the safe result on the owning Customer route", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    expect(validatePrepared(prepared).ok).toBe(true);
    useDemoStore.setState({
      authenticated: true,
      actorRole: "CUSTOMER",
    });
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
      screen.getAllByText(/READY_FOR_MEMBERSHIP_CHECK/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText(/admin\.registration-validation/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/history/i)).not.toBeInTheDocument();
  });

  it("projects VALID while Membership, Deposit, Eligibility, and Session stay unchanged", () => {
    const prepared = prepareSubmittedCustomerRegistration();
    expect(validatePrepared(prepared).ok).toBe(true);
    useDemoStore.setState({ actorRole: "CONTENT_STAFF" });
    render(
      <MemoryRouter
        initialEntries={[`/ops/auctions/${prepared.session.sessionId}`]}
      >
        <Routes>
          <Route
            path="/ops/auctions/:sessionId"
            element={<AuctionSessionWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByText("Registration Validation: VALID."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Next Step: READY FOR MEMBERSHIP CHECK."),
    ).toBeInTheDocument();
    expect(screen.getByText("Membership: NOT CHECKED.")).toBeInTheDocument();
    expect(screen.getByText("Deposit: NOT CHECKED.")).toBeInTheDocument();
    expect(screen.getByText("Eligibility: NOT EVALUATED.")).toBeInTheDocument();
    expect(screen.getAllByText(/Phiên: DRAFT/).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Công bố: NOT_READY/).length,
    ).toBeGreaterThan(0);
  });
});
