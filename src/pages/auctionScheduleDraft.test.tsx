import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuctionScheduleDraftPage } from "./ops/AuctionScheduleDraftPage";
import { useAuctionContentStore } from "../store/auctionContentStore";
import { useAuctionScheduleDraftStore } from "../store/auctionScheduleDraftStore";
import { useAuctionSessionStore } from "../store/auctionSessionStore";
import { useDemoStore } from "../store/demoStore";
import {
  prepareApprovedScheduleAuthority,
  resetScheduleDraftTestState,
} from "../test/scheduleDraftTestHarness";

function renderSchedule(sessionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/ops/auctions/${sessionId}/schedule`]}>
      <Routes>
        <Route
          path="/ops/auctions/:sessionId/schedule"
          element={<AuctionScheduleDraftPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Schedule Draft preparation UI", () => {
  beforeEach(() => {
    resetScheduleDraftTestState();
    useDemoStore.setState({
      adminAuthenticated: true,
      actorRole: "CONTENT_STAFF",
    });
  });

  it("shows one eligible create action, evidence, and no later-phase controls", async () => {
    const authority = prepareApprovedScheduleAuthority();
    renderSchedule(authority.session.sessionId);
    expect(
      screen.getByRole("heading", { level: 1, name: "Schedule Preparation" }),
    ).toBeInTheDocument();
    expect(screen.getByText(authority.decision.decisionId, { exact: false }))
      .toBeInTheDocument();
    expect(screen.getByText("CURRENT")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tạo Schedule Draft" }),
    ).toBeInTheDocument();
    for (const action of ["Confirm Schedule", "Open Registration", "Publish"])
      expect(screen.queryByRole("button", { name: action })).not.toBeInTheDocument();
  });

  it("creates an incomplete Draft, displays findings, and preserves DRAFT / NOT_READY", async () => {
    const user = userEvent.setup();
    const authority = prepareApprovedScheduleAuthority();
    renderSchedule(authority.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Tạo Schedule Draft" }),
    );
    expect(screen.getByText("INCOMPLETE")).toBeInTheDocument();
    expect(screen.getByText("TIMEZONE_REQUIRED")).toBeInTheDocument();
    expect(screen.getByText("REGISTRATION_OPEN_REQUIRED")).toBeInTheDocument();
    expect(screen.getByText("DRAFT / NOT_READY")).toBeInTheDocument();
    expect(screen.getByText(/Schedule Confirmation: NOT STARTED/))
      .toBeInTheDocument();
  });

  it("saves a valid five-field Draft as COMPLETE version 2 without confirmation", async () => {
    const user = userEvent.setup();
    const authority = prepareApprovedScheduleAuthority();
    renderSchedule(authority.session.sessionId);
    await user.click(
      screen.getByRole("button", { name: "Tạo Schedule Draft" }),
    );
    await user.type(screen.getByLabelText("Timezone"), "Asia/Ho_Chi_Minh");
    await user.type(
      screen.getByLabelText("Registration open"),
      "2026-08-01T09:00",
    );
    await user.type(
      screen.getByLabelText("Registration close"),
      "2026-08-01T10:00",
    );
    await user.type(
      screen.getByLabelText("Auction start"),
      "2026-08-01T11:00",
    );
    await user.type(
      screen.getByLabelText("Auction end"),
      "2026-08-01T12:00",
    );
    await user.click(
      screen.getByRole("button", { name: "Lưu Schedule Draft" }),
    );
    expect(screen.getByText("COMPLETE")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Không có finding.")).toBeInTheDocument();
    expect(screen.getByText(/Registration: NOT OPEN/)).toBeInTheDocument();
    expect(screen.queryByText("CONFIRMED")).not.toBeInTheDocument();
  });

  it("stale approval evidence removes create action and command bypass fails", () => {
    const authority = prepareApprovedScheduleAuthority();
    act(() => {
      useAuctionContentStore.setState((state) => ({
        contents: state.contents.map((content) =>
          content.sessionId === authority.session.sessionId
            ? { ...content, contentVersion: content.contentVersion + 1 }
            : content,
        ),
      }));
    });
    renderSchedule(authority.session.sessionId);
    expect(
      screen.getByText("SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Tạo Schedule Draft" }),
    ).not.toBeInTheDocument();
    const result = useAuctionScheduleDraftStore.getState().createScheduleDraft({
      sessionId: authority.session.sessionId,
      actorId: "bypass",
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: authority.session.currentVersion,
      expectedApprovalDecisionId: authority.decision.decisionId,
      commandId: "stale-ui-bypass",
    });
    expect(result).toMatchObject({
      ok: false,
      code: "SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE",
    });
    expect(useAuctionScheduleDraftStore.getState().drafts).toEqual([]);
  });

  it("shows the SGDG configuration blocker and does not offer a Schedule action", () => {
    const authority = prepareApprovedScheduleAuthority();
    act(() => {
      useAuctionSessionStore.setState((state) => ({
        sessions: state.sessions.map((session) =>
          session.sessionId === authority.session.sessionId
            ? ({ ...session, recordKind: "DYNAMIC_SGDG_MANAGED_SESSION" } as never)
            : session,
        ),
      }));
    });
    renderSchedule(authority.session.sessionId);
    expect(
      screen.getByText("SCHEDULE_DRAFT_BLOCKED_BY_CONFIGURATION"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Schedule Draft/ }),
    ).not.toBeInTheDocument();
  });

  it.each(["ADMIN", "CUSTOMER", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "blocks unauthorized role %s in UI and command",
    (actorRole) => {
      const authority = prepareApprovedScheduleAuthority();
      useDemoStore.setState({ actorRole });
      renderSchedule(authority.session.sessionId);
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Schedule Draft/ }),
      ).not.toBeInTheDocument();
      const result =
        useAuctionScheduleDraftStore.getState().createScheduleDraft({
          sessionId: authority.session.sessionId,
          actorId: "unauthorized",
          actorRole,
          expectedSessionVersion: authority.session.currentVersion,
          expectedApprovalDecisionId: authority.decision.decisionId,
          commandId: `ui-denied-${actorRole}`,
        });
      expect(result).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );
});
