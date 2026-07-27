import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionScheduleConfirmationPage } from "./governance/AuctionScheduleConfirmationPage";
import { useAuctionConfirmedScheduleStore } from "../store/auctionConfirmedScheduleStore";
import { useAuctionContentStore } from "../store/auctionContentStore";
import { useAuctionScheduleDraftStore } from "../store/auctionScheduleDraftStore";
import { useAuctionSessionStore } from "../store/auctionSessionStore";
import { useDemoStore } from "../store/demoStore";
import {
  prepareCompleteScheduleDraft,
  resetConfirmedScheduleTestState,
} from "../test/confirmedScheduleTestHarness";
import { prepareApprovedScheduleAuthority } from "../test/scheduleDraftTestHarness";

function renderConfirmation(sessionId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/governance/auction-schedules/${sessionId}`]}
    >
      <Routes>
        <Route
          path="/governance/auction-schedules/:sessionId"
          element={<AuctionScheduleConfirmationPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Schedule Confirmation ADMIN UI", () => {
  beforeEach(() => {
    resetConfirmedScheduleTestState();
    useDemoStore.setState({
      adminAuthenticated: true,
      actorRole: "ADMIN",
    });
  });

  it("shows one Confirm action for an eligible complete Draft", () => {
    const prepared = prepareCompleteScheduleDraft();
    renderConfirmation(prepared.session.sessionId);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Schedule Confirmation",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(prepared.draft.scheduleDraftId, { exact: false }))
      .toBeInTheDocument();
    expect(screen.getAllByText("COMPLETE").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Xác nhận Schedule" }),
    ).toBeInTheDocument();
  });

  it("does not expose editable Schedule fields to ADMIN", () => {
    const prepared = prepareCompleteScheduleDraft();
    renderConfirmation(prepared.session.sessionId);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Asia/Ho_Chi_Minh"))
      .not.toBeInTheDocument();
    expect(screen.getByText("Asia/Ho_Chi_Minh")).toBeInTheDocument();
  });

  it("shows no Confirm action for an incomplete Draft", () => {
    const authority = prepareApprovedScheduleAuthority();
    const created =
      useAuctionScheduleDraftStore.getState().createScheduleDraft({
        sessionId: authority.session.sessionId,
        actorId: "content",
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: authority.session.currentVersion,
        expectedApprovalDecisionId: authority.decision.decisionId,
        commandId: "ui-create-incomplete-confirmation-draft",
      });
    expect(created.ok).toBe(true);
    renderConfirmation(authority.session.sessionId);
    expect(
      screen.getByText("SCHEDULE_CONFIRMATION_REQUIRES_COMPLETE_DRAFT"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Xác nhận Schedule" }),
    ).not.toBeInTheDocument();
  });

  it("shows no Confirm action when approval evidence is stale", () => {
    const prepared = prepareCompleteScheduleDraft();
    act(() => {
      useAuctionContentStore.setState((state) => ({
        contents: state.contents.map((content) =>
          content.sessionId === prepared.session.sessionId
            ? { ...content, contentVersion: content.contentVersion + 1 }
            : content,
        ),
      }));
    });
    renderConfirmation(prepared.session.sessionId);
    expect(
      screen.getByText("SCHEDULE_CONFIRMATION_BLOCKED_BY_STALE_APPROVAL"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Xác nhận Schedule" }),
    ).not.toBeInTheDocument();
  });

  it("Dialog contains exact evidence and all boundary statements", async () => {
    const user = userEvent.setup();
    const prepared = prepareCompleteScheduleDraft();
    renderConfirmation(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Xác nhận Schedule" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Xác nhận Schedule",
    });
    expect(dialog).toHaveTextContent(prepared.session.sessionId);
    expect(dialog).toHaveTextContent(prepared.draft.scheduleDraftId);
    expect(dialog).toHaveTextContent(prepared.decision.decisionId);
    expect(dialog).toHaveTextContent(prepared.draft.configurationSnapshotId);
    for (const statement of [
      "This confirms the exact Schedule Draft version.",
      "The Schedule Draft remains unchanged.",
      "Registration remains NOT OPEN.",
      "The Session remains DRAFT / NOT_READY.",
      "No Publication is created.",
    ])
      expect(dialog).toHaveTextContent(statement);
  });

  it("success displays one CONFIRMED immutable record and preserves boundaries", async () => {
    const user = userEvent.setup();
    const prepared = prepareCompleteScheduleDraft();
    const sessionBefore = useAuctionSessionStore.getState().sessions[0];
    renderConfirmation(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Xác nhận Schedule" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Confirm Schedule",
      }),
    );
    expect(
      screen.getByText(`confirmed-schedule-${prepared.session.sessionId}`),
    ).toBeInTheDocument();
    expect(screen.getByText("Status: CONFIRMED")).toBeInTheDocument();
    expect(screen.getByText(/Registration: NOT OPEN/)).toBeInTheDocument();
    expect(screen.getByText(/Session: DRAFT \/ NOT_READY/))
      .toBeInTheDocument();
    expect(screen.getByText(/Publication: NOT STARTED/)).toBeInTheDocument();
    expect(useAuctionConfirmedScheduleStore.getState().confirmedSchedules)
      .toHaveLength(1);
    expect(useAuctionSessionStore.getState().sessions[0]).toBe(sessionBefore);
  });

  it("keeps the Dialog open and creates nothing when authority becomes stale", async () => {
    const user = userEvent.setup();
    const prepared = prepareCompleteScheduleDraft();
    renderConfirmation(prepared.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Xác nhận Schedule" }),
    );
    act(() => {
      useAuctionContentStore.setState((state) => ({
        contents: state.contents.map((content) =>
          content.sessionId === prepared.session.sessionId
            ? { ...content, contentVersion: content.contentVersion + 1 }
            : content,
        ),
      }));
    });
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Confirm Schedule",
      }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(screen.getByRole("dialog")).getByText(
        /SCHEDULE_CONFIRMATION_BLOCKED_BY_STALE_APPROVAL/,
      ),
    ).toBeInTheDocument();
    expect(useAuctionConfirmedScheduleStore.getState().confirmedSchedules)
      .toEqual([]);
  });

  it.each(["CONTENT_STAFF", "CUSTOMER", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "blocks unauthorized role %s in UI and command",
    (actorRole) => {
      const prepared = prepareCompleteScheduleDraft();
      useDemoStore.setState({ actorRole });
      renderConfirmation(prepared.session.sessionId);
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Confirm|Xác nhận/ }),
      ).not.toBeInTheDocument();
      expect(
        useAuctionConfirmedScheduleStore.getState().confirmSchedule({
          sessionId: prepared.session.sessionId,
          scheduleDraftId: prepared.draft.scheduleDraftId,
          actorId: "unauthorized",
          actorRole,
          expectedSessionVersion: prepared.session.currentVersion,
          expectedScheduleVersion: prepared.draft.scheduleVersion,
          expectedApprovalDecisionId: prepared.decision.decisionId,
          expectedConfigurationSnapshotId:
            prepared.draft.configurationSnapshotId,
          commandId: `ui-denied-confirm-${actorRole}`,
        }),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );
});
