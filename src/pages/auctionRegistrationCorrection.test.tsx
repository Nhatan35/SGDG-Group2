import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionCustomerRegistrationPage } from "./customer/AuctionCustomerRegistrationPage";
import { AuctionRegistrationCorrectionPage } from "./customer/AuctionRegistrationCorrectionPage";
import {
  prepareCorrectableRegistrationValidation,
  resetRegistrationCorrectionTestState,
} from "../test/registrationCorrectionTestHarness";
import { useAuctionCustomerRegistrationStore } from "../store/auctionCustomerRegistrationStore";
import { useAuctionRegistrationValidationStore } from "../store/auctionRegistrationValidationStore";
import { useAuctionRegistrationCorrectionDraftStore } from "../store/auctionRegistrationCorrectionDraftStore";
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

describe("Registration Correction Draft Customer UI", () => {
  beforeEach(() => {
    resetRegistrationCorrectionTestState();
    useDemoStore.setState({
      authenticated: true,
      actorRole: "CUSTOMER",
    });
  });

  it("shows correction access when the owned Validation requires correction", () => {
    const prepared = prepareCorrectableRegistrationValidation();
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
      screen.getAllByText(/CORRECTION_REQUIRED/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", {
        name: "Open Registration Correction",
      }),
    ).toHaveAttribute(
      "href",
      `/customer/auctions/${prepared.session.sessionId}/registration/correction`,
    );
  });

  it("creates and saves rulesAccepted while source records remain unchanged", async () => {
    const user = userEvent.setup();
    const prepared = prepareCorrectableRegistrationValidation();
    const registrationBefore = JSON.stringify(
      useAuctionCustomerRegistrationStore.getState().registrations,
    );
    const validationBefore = JSON.stringify(
      useAuctionRegistrationValidationStore.getState().validations,
    );
    renderCorrection(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Create Correction Draft" }),
    );
    expect(screen.getByText("DRAFT / v1")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /accept/i }));
    await user.click(
      screen.getByRole("button", { name: "Save Correction Draft" }),
    );
    expect(screen.getByText("DRAFT / v2")).toBeInTheDocument();
    expect(
      useAuctionRegistrationCorrectionDraftStore.getState().correctionDrafts[0],
    ).toMatchObject({
      correctionVersion: 2,
      status: "DRAFT",
      rulesAccepted: true,
    });
    expect(
      JSON.stringify(
        useAuctionCustomerRegistrationStore.getState().registrations,
      ),
    ).toBe(registrationBefore);
    expect(
      JSON.stringify(
        useAuctionRegistrationValidationStore.getState().validations,
      ),
    ).toBe(validationBefore);
  });

  it("shows a controlled blocker for an unsupported correctable finding", () => {
    const prepared = prepareCorrectableRegistrationValidation();
    useAuctionRegistrationValidationStore.setState({
      validations: [
        {
          ...prepared.validation,
          findings: [
            {
              code: "CORRECTABLE_REGISTRATION_DATA_MISSING",
              severity: "CORRECTABLE",
              message: "Unsupported Customer field is missing.",
            },
          ],
          validationEvidence: {
            ...prepared.validation.validationEvidence,
            findingCodes: ["CORRECTABLE_REGISTRATION_DATA_MISSING"],
          },
        },
      ],
    });
    renderCorrection(prepared.session.sessionId);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "REGISTRATION_CORRECTION_FIELD_NOT_SUPPORTED",
    );
    expect(
      screen.queryByRole("button", { name: "Create Correction Draft" }),
    ).not.toBeInTheDocument();
  });

  it("keeps Customer identity read-only and exposes no later-phase action", async () => {
    const user = userEvent.setup();
    const prepared = prepareCorrectableRegistrationValidation();
    renderCorrection(prepared.session.sessionId);
    expect(screen.getByText(CURRENT_CUSTOMER_ID)).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: /Customer identity/i }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Create Correction Draft" }),
    );
    expect(
      screen.getByText("This saves a correction draft only."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The original submitted Registration remains unchanged.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Resubmission has not started."),
    ).toBeInTheDocument();
    for (const name of [
      /Check Membership/i,
      /Check Deposit/i,
      /Evaluate Eligibility/i,
      /^Approve$/i,
      /^Reject$/i,
    ])
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });
});
