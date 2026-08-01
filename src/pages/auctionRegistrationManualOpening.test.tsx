import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionRegistrationOpeningReadinessPage } from "./governance/AuctionRegistrationOpeningReadinessPage";
import { useAuctionContentStore } from "../store/auctionContentStore";
import { useAuctionRegistrationOpeningReadinessStore } from "../store/auctionRegistrationOpeningReadinessStore";
import { useAuctionRegistrationWindowStore } from "../store/auctionRegistrationWindowStore";
import { useAuctionSessionStore } from "../store/auctionSessionStore";
import { useDemoStore } from "../store/demoStore";
import {
  prepareReadyRegistrationAssessment,
  resetRegistrationWindowTestState,
} from "../test/registrationWindowTestHarness";
import {
  prepareConfirmedSchedule,
  setRegistrationReadinessClock,
} from "../test/registrationReadinessTestHarness";

function renderOpening(sessionId: string) {
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

describe("Manual Registration Opening ADMIN UI", () => {
  beforeEach(() => {
    resetRegistrationWindowTestState();
    useDemoStore.setState({
      adminAuthenticated: true,
      actorRole: "ADMIN",
    });
  });

  it("READY assessment shows one Open Registration action", () => {
    const prepared = prepareReadyRegistrationAssessment();
    renderOpening(prepared.session.sessionId);
    expect(
      screen.getByRole("button", { name: "Mở Registration" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("READY_TO_OPEN_REGISTRATION").length,
    ).toBeGreaterThan(0);
  });

  it.each([
    "WAITING_FOR_OPEN_TIME",
    "BLOCKED",
    "WINDOW_EXPIRED",
  ] as const)(
    "%s shows no Open action and displays the ready-assessment blocker",
    (targetStatus) => {
      const prepared = prepareConfirmedSchedule();
      if (targetStatus === "BLOCKED")
        useAuctionContentStore.setState((state) => ({
          contents: state.contents.map((content) =>
            content.sessionId === prepared.session.sessionId
              ? { ...content, contentVersion: content.contentVersion + 1 }
              : content,
          ),
        }));
      if (targetStatus === "WINDOW_EXPIRED")
        setRegistrationReadinessClock(
          prepared.confirmed.schedule.registrationCloseAt,
        );
      const assessed =
        useAuctionRegistrationOpeningReadinessStore
          .getState()
          .assessRegistrationOpeningReadiness({
            sessionId: prepared.session.sessionId,
            actorId: "admin",
            actorRole: "ADMIN",
            expectedSessionVersion: prepared.session.currentVersion,
            expectedConfirmedScheduleId:
              prepared.confirmed.confirmedScheduleId,
            commandId: `ui-assess-${targetStatus}`,
          });
      expect(assessed).toMatchObject({
        ok: true,
        assessment: { status: targetStatus },
      });
      renderOpening(prepared.session.sessionId);
      expect(
        screen.queryByRole("button", { name: "Mở Registration" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("REGISTRATION_OPEN_REQUIRES_READY_ASSESSMENT", {
          exact: false,
        }),
      ).toBeInTheDocument();
    },
  );

  it("Dialog contains exact references and all phase-boundary statements", async () => {
    const user = userEvent.setup();
    const prepared = prepareReadyRegistrationAssessment();
    renderOpening(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Mở Registration" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Mở Registration",
    });
    expect(dialog).toHaveTextContent(prepared.session.sessionId);
    expect(dialog).toHaveTextContent(prepared.confirmed.confirmedScheduleId);
    expect(dialog).toHaveTextContent(prepared.assessment.assessmentId);
    for (const statement of [
      "This opens the internal Registration Window.",
      "It does not create Customer Registration forms.",
      "It does not publish the Auction.",
      "The Session remains DRAFT / NOT_READY.",
      "Registration closing is not included in this task.",
    ])
      expect(dialog).toHaveTextContent(statement);
  });

  it("successful confirmation displays one immutable OPEN Window", async () => {
    const user = userEvent.setup();
    const prepared = prepareReadyRegistrationAssessment();
    renderOpening(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Mở Registration" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Open Registration",
      }),
    );
    expect(
      screen.getByText(
        `registration-window-${prepared.session.sessionId}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Status: OPEN")).toBeInTheDocument();
    expect(screen.getByText("Internal Registration Window: OPEN."))
      .toBeInTheDocument();
    expect(useAuctionRegistrationWindowStore.getState().registrationWindows)
      .toHaveLength(1);
  });

  it("OPEN state has no Customer form, Close, Extend, Publish, or destructive controls", async () => {
    const user = userEvent.setup();
    const prepared = prepareReadyRegistrationAssessment();
    renderOpening(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Mở Registration" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Open Registration",
      }),
    );
    expect(
      screen.getByText(
        "No Customer Registration form or Publication is created.",
      ),
    ).toBeInTheDocument();
    for (const action of [
      "Close Registration",
      "Extend Registration",
      "Publish",
      "Reschedule",
      "Cancel Auction",
    ])
      expect(screen.queryByRole("button", { name: action }))
        .not.toBeInTheDocument();
  });

  it("keeps Dialog open and creates nothing when time moves outside the window", async () => {
    const user = userEvent.setup();
    const prepared = prepareReadyRegistrationAssessment();
    renderOpening(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Mở Registration" }),
    );
    setRegistrationReadinessClock(
      prepared.confirmed.schedule.registrationCloseAt,
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Open Registration",
      }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByText(
        /REGISTRATION_OPEN_OUTSIDE_CONFIRMED_WINDOW/,
      ),
    ).toBeInTheDocument();
    expect(useAuctionRegistrationWindowStore.getState().registrationWindows)
      .toEqual([]);
  });

  it("Session remains DRAFT / NOT_READY after opening", async () => {
    const user = userEvent.setup();
    const prepared = prepareReadyRegistrationAssessment();
    const sessionBefore = useAuctionSessionStore.getState().sessions[0];
    renderOpening(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Mở Registration" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Open Registration",
      }),
    );
    expect(screen.getAllByText(/DRAFT \/ NOT_READY/).length)
      .toBeGreaterThan(0);
    expect(useAuctionSessionStore.getState().sessions[0]).toBe(sessionBefore);
  });

  it("SGDG displays blocker and no Open action", () => {
    const prepared = prepareReadyRegistrationAssessment();
    act(() => {
      useAuctionSessionStore.setState((state) => ({
        sessions: state.sessions.map((session) =>
          session.sessionId === prepared.session.sessionId
            ? ({ ...session, recordKind: "DYNAMIC_SGDG_MANAGED_SESSION" } as never)
            : session,
        ),
      }));
    });
    renderOpening(prepared.session.sessionId);
    expect(
      screen.getByText("REGISTRATION_READINESS_BLOCKED_BY_CONFIGURATION"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("REGISTRATION_OPEN_BLOCKED_BY_CONFIGURATION"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mở Registration" }),
    ).not.toBeInTheDocument();
  });

  it.each(["CONTENT_STAFF", "CUSTOMER", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "blocks unauthorized role %s in UI and command",
    (actorRole) => {
      const prepared = prepareReadyRegistrationAssessment();
      useDemoStore.setState({ actorRole });
      renderOpening(prepared.session.sessionId);
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Mở Registration" }),
      ).not.toBeInTheDocument();
      expect(
        useAuctionRegistrationWindowStore
          .getState()
          .openRegistrationWindow({
            ...{
              sessionId: prepared.session.sessionId,
              actorId: "unauthorized",
              actorRole,
              expectedSessionVersion: prepared.session.currentVersion,
              expectedConfirmedScheduleId:
                prepared.confirmed.confirmedScheduleId,
              expectedAssessmentId: prepared.assessment.assessmentId,
              expectedAssessmentVersion:
                prepared.assessment.assessmentVersion,
              commandId: `ui-deny-window-${actorRole}`,
            },
          }),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );
});
