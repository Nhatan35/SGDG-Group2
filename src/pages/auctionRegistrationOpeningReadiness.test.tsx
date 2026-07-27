import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionRegistrationOpeningReadinessPage } from "./governance/AuctionRegistrationOpeningReadinessPage";
import { useAuctionRegistrationOpeningReadinessStore } from "../store/auctionRegistrationOpeningReadinessStore";
import { useAuctionSessionStore } from "../store/auctionSessionStore";
import { useDemoStore } from "../store/demoStore";
import {
  prepareConfirmedSchedule,
  resetRegistrationReadinessTestState,
  setRegistrationReadinessClock,
} from "../test/registrationReadinessTestHarness";

function renderReadiness(sessionId: string) {
  return render(
    <MemoryRouter
      initialEntries={[
        `/governance/auction-registration-readiness/${sessionId}`,
      ]}
    >
      <Routes>
        <Route
          path="/governance/auction-registration-readiness/:sessionId"
          element={<AuctionRegistrationOpeningReadinessPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Registration Opening Readiness ADMIN UI", () => {
  beforeEach(() => {
    resetRegistrationReadinessTestState();
    useDemoStore.setState({
      adminAuthenticated: true,
      actorRole: "ADMIN",
    });
  });

  it("displays the exact confirmed Registration window and deterministic time", () => {
    const prepared = prepareConfirmedSchedule();
    renderReadiness(prepared.session.sessionId);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Registration Opening Readiness",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(prepared.confirmed.confirmedScheduleId))
      .toBeInTheDocument();
    expect(
      screen.getByText(prepared.confirmed.schedule.registrationOpenAt),
    ).toBeInTheDocument();
    expect(
      screen.getByText(prepared.confirmed.schedule.registrationCloseAt),
    ).toBeInTheDocument();
    expect(screen.getByText("2026-07-30T00:00:00.000Z"))
      .toBeInTheDocument();
  });

  it("executes the real command and displays WAITING with version/history", async () => {
    const user = userEvent.setup();
    const prepared = prepareConfirmedSchedule();
    renderReadiness(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", {
        name: "Kiểm tra Registration Readiness",
      }),
    );
    expect(screen.getAllByText("WAITING_FOR_OPEN_TIME").length)
      .toBeGreaterThan(0);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/REGISTRATION_READINESS_ASSESSED/))
      .toBeInTheDocument();
    expect(
      useAuctionRegistrationOpeningReadinessStore.getState().assessments,
    ).toHaveLength(1);
  });

  it("READY remains readiness-only with no Open Registration or Publish action", async () => {
    const user = userEvent.setup();
    const prepared = prepareConfirmedSchedule();
    setRegistrationReadinessClock("2026-08-01T01:30:00.000Z");
    renderReadiness(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", {
        name: "Kiểm tra Registration Readiness",
      }),
    );
    expect(screen.getAllByText("READY_TO_OPEN_REGISTRATION").length)
      .toBeGreaterThan(0);
    for (const action of [
      "Open Registration",
      "Close Registration",
      "Publish",
      "Reschedule",
      "Cancel Auction",
    ])
      expect(screen.queryByRole("button", { name: action }))
        .not.toBeInTheDocument();
    expect(screen.getByText("Registration remains NOT OPEN."))
      .toBeInTheDocument();
    expect(
      screen.getByText(
        "No Customer Registration form or Publication is created.",
      ),
    ).toBeInTheDocument();
  });

  it("SGDG displays the configuration blocker and no readiness action", () => {
    const prepared = prepareConfirmedSchedule();
    act(() => {
      useAuctionSessionStore.setState((state) => ({
        sessions: state.sessions.map((session) =>
          session.sessionId === prepared.session.sessionId
            ? ({ ...session, recordKind: "DYNAMIC_SGDG_MANAGED_SESSION" } as never)
            : session,
        ),
      }));
    });
    renderReadiness(prepared.session.sessionId);
    expect(
      screen.getByText("REGISTRATION_READINESS_BLOCKED_BY_CONFIGURATION"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Kiểm tra Registration Readiness",
      }),
    ).not.toBeInTheDocument();
  });

  it.each(["CONTENT_STAFF", "CUSTOMER", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "blocks unauthorized role %s in UI and command",
    (actorRole) => {
      const prepared = prepareConfirmedSchedule();
      useDemoStore.setState({ actorRole });
      renderReadiness(prepared.session.sessionId);
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Registration Readiness/ }),
      ).not.toBeInTheDocument();
      expect(
        useAuctionRegistrationOpeningReadinessStore
          .getState()
          .assessRegistrationOpeningReadiness({
            sessionId: prepared.session.sessionId,
            actorId: "unauthorized",
            actorRole,
            expectedSessionVersion: prepared.session.currentVersion,
            expectedConfirmedScheduleId:
              prepared.confirmed.confirmedScheduleId,
            commandId: `ui-deny-readiness-${actorRole}`,
          }),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );

  it("keeps Session DRAFT / NOT_READY after assessment", async () => {
    const user = userEvent.setup();
    const prepared = prepareConfirmedSchedule();
    const sessionBefore = useAuctionSessionStore.getState().sessions[0];
    renderReadiness(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", {
        name: "Kiểm tra Registration Readiness",
      }),
    );
    expect(screen.getAllByText(/DRAFT \/ NOT_READY/).length)
      .toBeGreaterThan(0);
    expect(useAuctionSessionStore.getState().sessions[0]).toBe(sessionBefore);
  });
});
