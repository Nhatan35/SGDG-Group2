import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionRegistrationCorrectionPage } from "./customer/AuctionRegistrationCorrectionPage";
import { AuctionRegistrationRevalidationPage } from "./governance/AuctionRegistrationRevalidationPage";
import {
  prepareCorrectedRegistrationResubmission,
  resetRegistrationRevalidationTestState,
} from "../test/registrationRevalidationTestHarness";
import { useAuctionRegistrationRevalidationStore } from "../store/auctionRegistrationRevalidationStore";
import { useAuctionRegistrationResubmissionStore } from "../store/auctionRegistrationResubmissionStore";
import { useDemoStore } from "../store/demoStore";

type Prepared = ReturnType<
  typeof prepareCorrectedRegistrationResubmission
>;

const renderAdminPage = (resubmissionId: string) =>
  render(
    <MemoryRouter
      initialEntries={[
        `/governance/customer-registration-resubmissions/${resubmissionId}/revalidation`,
      ]}
    >
      <Routes>
        <Route
          path="/governance/customer-registration-resubmissions/:resubmissionId/revalidation"
          element={<AuctionRegistrationRevalidationPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

const commandFor = (prepared: Prepared, commandId: string) => ({
  resubmissionId: prepared.resubmission.resubmissionId,
  actorId: "admin.registration-revalidation@mock.local",
  actorRole: "ADMIN" as const,
  expectedRegistrationId: prepared.registration.registrationId,
  expectedPreviousValidationId: prepared.validation.validationId,
  expectedCorrectionDraftId:
    prepared.correctionDraft.correctionDraftId,
  expectedCorrectionDraftVersion:
    prepared.correctionDraft.correctionVersion,
  commandId,
});

describe("Corrected Registration Revalidation UI", () => {
  beforeEach(() => {
    resetRegistrationRevalidationTestState();
    useDemoStore.setState({
      authenticated: true,
      actorRole: "ADMIN",
    });
  });

  it("shows the ADMIN Revalidate action with the complete source evidence", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    renderAdminPage(prepared.resubmission.resubmissionId);
    expect(
      screen.getByRole("button", {
        name: "Revalidate Corrected Registration",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(prepared.registration.registrationId),
    ).toBeInTheDocument();
    expect(
      screen.getByText(prepared.validation.validationId),
    ).toBeInTheDocument();
    expect(
      screen.getByText(prepared.resubmission.resubmissionId, {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it("displays VALID and READY_FOR_MEMBERSHIP_CHECK after revalidation", async () => {
    const user = userEvent.setup();
    const prepared = prepareCorrectedRegistrationResubmission();
    renderAdminPage(prepared.resubmission.resubmissionId);
    await user.click(
      screen.getByRole("button", {
        name: "Revalidate Corrected Registration",
      }),
    );
    expect(screen.getAllByText("VALID").length).toBeGreaterThan(0);
    expect(
      screen.getByText("READY_FOR_MEMBERSHIP_CHECK"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ready for Membership Check"),
    ).toBeInTheDocument();
  });

  it.each([
    {
      kind: "correctable",
      expectedNextStep: "CORRECTION_REQUIRED_AGAIN",
      expectedLabel: "Correction Required Again",
    },
    {
      kind: "blocking",
      expectedNextStep: "INVALID_BLOCKING",
      expectedLabel: "Stopped",
    },
  ])(
    "displays the $kind invalid result and safe next step",
    ({ kind, expectedNextStep, expectedLabel }) => {
      const prepared = prepareCorrectedRegistrationResubmission();
      const source =
        kind === "correctable"
          ? ({
              ...prepared.resubmission,
              correctedEvidence: {
                ...prepared.resubmission.correctedEvidence,
                rulesAccepted: false,
              },
            } as unknown as typeof prepared.resubmission)
          : ({ ...prepared.resubmission, submittedAt: "" } as typeof prepared.resubmission);
      useAuctionRegistrationResubmissionStore.setState({
        resubmissions: [source],
      });
      const result = useAuctionRegistrationRevalidationStore
        .getState()
        .revalidateCorrectedRegistration(
          commandFor(
            prepared,
            `ui-${kind}-registration-revalidation`,
          ),
        );
      if (!result.ok) throw new Error(result.message);
      renderAdminPage(prepared.resubmission.resubmissionId);
      expect(screen.getByText(expectedNextStep)).toBeInTheDocument();
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    },
  );

  it("exposes no correction, resubmission, or downstream action", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    renderAdminPage(prepared.resubmission.resubmissionId);
    for (const name of [
      /Create Correction Draft/i,
      /^Resubmit/i,
      /Check Membership/i,
      /Check Deposit/i,
      /Evaluate Eligibility/i,
      /^Approve$/i,
      /^Reject$/i,
    ])
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });

  it("shows only the owning Customer-safe result on the Customer page", () => {
    const prepared = prepareCorrectedRegistrationResubmission();
    const result = useAuctionRegistrationRevalidationStore
      .getState()
      .revalidateCorrectedRegistration(
        commandFor(prepared, "customer-safe-revalidation"),
      );
    if (!result.ok) throw new Error(result.message);
    useDemoStore.setState({ actorRole: "CUSTOMER" });
    render(
      <MemoryRouter
        initialEntries={[
          `/customer/auctions/${prepared.session.sessionId}/registration/correction`,
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
    expect(
      screen.getByRole("heading", {
        name: "Customer-safe Revalidation Result",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("READY_FOR_MEMBERSHIP_CHECK"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(result.revalidation.validatedBy),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/STAFF_ONLY/)).not.toBeInTheDocument();
  });
});
