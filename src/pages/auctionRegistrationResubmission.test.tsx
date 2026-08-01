import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionRegistrationCorrectionPage } from "./customer/AuctionRegistrationCorrectionPage";
import {
  prepareAcceptedRegistrationCorrectionDraft,
  resetRegistrationResubmissionTestState,
} from "../test/registrationResubmissionTestHarness";
import { useAuctionCustomerRegistrationStore } from "../store/auctionCustomerRegistrationStore";
import { useAuctionRegistrationCorrectionDraftStore } from "../store/auctionRegistrationCorrectionDraftStore";
import { useAuctionRegistrationResubmissionStore } from "../store/auctionRegistrationResubmissionStore";
import { useAuctionRegistrationValidationStore } from "../store/auctionRegistrationValidationStore";
import { useDemoStore } from "../store/demoStore";
import { CURRENT_CUSTOMER_ID } from "../store/openingRequestStore";

const renderCorrection = (sessionId: string) =>
  render(
    <MemoryRouter
      initialEntries={[
        `/customer/auctions/${sessionId}/registration/correction`,
      ]}
    >
      <Routes>
        <Route
          path="/customer/auctions/:sessionId/registration/correction"
          element={<AuctionRegistrationCorrectionPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe("Corrected Registration Resubmission Customer UI", () => {
  beforeEach(() => {
    resetRegistrationResubmissionTestState();
    useDemoStore.setState({
      authenticated: true,
      actorRole: "CUSTOMER",
    });
  });

  it("shows the Resubmit action for an eligible accepted Draft", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    renderCorrection(prepared.session.sessionId);
    expect(
      screen.getByRole("button", {
        name: "Resubmit Corrected Registration",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Correction Draft: DRAFT")).toBeInTheDocument();
    expect(screen.getByText("Resubmission: NOT STARTED")).toBeInTheDocument();
  });

  it("shows evidence, prototype policy, and required boundaries in confirmation", async () => {
    const user = userEvent.setup();
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    renderCorrection(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", {
        name: "Resubmit Corrected Registration",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Confirm Corrected Registration Resubmission",
    });
    expect(dialog).toHaveTextContent(prepared.registration.registrationId);
    expect(dialog).toHaveTextContent(prepared.validation.validationId);
    expect(dialog).toHaveTextContent(
      prepared.correctionDraft.correctionDraftId,
    );
    expect(dialog).toHaveTextContent("ACCEPTED");
    expect(dialog).toHaveTextContent(CURRENT_CUSTOMER_ID);
    expect(dialog).toHaveTextContent("Requires stakeholder confirmation");
    expect(dialog).toHaveTextContent(
      "This creates a corrected Resubmission Record.",
    );
    expect(dialog).toHaveTextContent(
      "The original Registration and previous Validation remain unchanged.",
    );
    expect(dialog).toHaveTextContent(
      "Membership, Deposit, and Eligibility checks do not start.",
    );
  });

  it("displays SUBMITTED and REVALIDATION_REQUIRED without mutating sources", async () => {
    const user = userEvent.setup();
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    const sourceBefore = {
      registration: JSON.stringify(
        useAuctionCustomerRegistrationStore.getState().registrations,
      ),
      validation: JSON.stringify(
        useAuctionRegistrationValidationStore.getState().validations,
      ),
      draft: JSON.stringify(
        useAuctionRegistrationCorrectionDraftStore.getState()
          .correctionDrafts,
      ),
    };
    renderCorrection(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", {
        name: "Resubmit Corrected Registration",
      }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Confirm Resubmission",
      }),
    );
    const outcome = screen
      .getByRole("heading", { name: "Resubmission outcome" })
      .closest("section");
    expect(outcome).not.toBeNull();
    expect(within(outcome!).getAllByText("SUBMITTED")).toHaveLength(2);
    expect(
      within(outcome!).getByText("REVALIDATION_REQUIRED"),
    ).toBeInTheDocument();
    expect(
      useAuctionRegistrationResubmissionStore.getState().resubmissions,
    ).toHaveLength(1);
    expect(
      JSON.stringify(
        useAuctionCustomerRegistrationStore.getState().registrations,
      ),
    ).toBe(sourceBefore.registration);
    expect(
      JSON.stringify(
        useAuctionRegistrationValidationStore.getState().validations,
      ),
    ).toBe(sourceBefore.validation);
    expect(
      JSON.stringify(
        useAuctionRegistrationCorrectionDraftStore.getState()
          .correctionDrafts,
      ),
    ).toBe(sourceBefore.draft);
  });

  it("exposes no validation or later-phase actions", () => {
    const prepared = prepareAcceptedRegistrationCorrectionDraft();
    renderCorrection(prepared.session.sessionId);
    for (const name of [
      /Validate Resubmission/i,
      /Check Membership/i,
      /Check Deposit/i,
      /Evaluate Eligibility/i,
      /^Approve$/i,
      /^Reject$/i,
    ])
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });
});
