import { beforeEach, describe, expect, it } from "vitest";
import { useAuctionConfirmedScheduleStore } from "./auctionConfirmedScheduleStore";
import { useAuctionContentStore } from "./auctionContentStore";
import {
  REGISTRATION_READINESS_BLOCKED_BY_CONFIGURATION,
  REGISTRATION_READINESS_REQUIRES_CONFIRMED_SCHEDULE,
  evaluateRegistrationOpeningReadiness,
  sanitizePersistedRegistrationReadinessState,
  useAuctionRegistrationOpeningReadinessStore,
} from "./auctionRegistrationOpeningReadinessStore";
import { useAuctionSessionStore } from "./auctionSessionStore";
import {
  prepareConfirmedSchedule,
  resetRegistrationReadinessTestState,
  setRegistrationReadinessClock,
} from "../test/registrationReadinessTestHarness";
import { prepareCompleteScheduleDraft } from "../test/confirmedScheduleTestHarness";

const adminId = "admin.readiness@mock.local";
function command(
  prepared: ReturnType<typeof prepareConfirmedSchedule>,
  commandId = "assess-registration-readiness",
  expectedAssessmentVersion?: number,
) {
  return {
    sessionId: prepared.session.sessionId,
    actorId: adminId,
    actorRole: "ADMIN" as const,
    expectedSessionVersion: prepared.session.currentVersion,
    expectedConfirmedScheduleId: prepared.confirmed.confirmedScheduleId,
    ...(expectedAssessmentVersion !== undefined
      ? { expectedAssessmentVersion }
      : {}),
    commandId,
  };
}

describe("Registration Opening Readiness aggregate", () => {
  beforeEach(resetRegistrationReadinessTestState);

  it("ADMIN creates a version 1 WAITING assessment before opening time", () => {
    const prepared = prepareConfirmedSchedule();
    const result =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(command(prepared));
    expect(result).toMatchObject({
      ok: true,
      created: true,
      changed: true,
      assessment: {
        assessmentVersion: 1,
        status: "WAITING_FOR_OPEN_TIME",
        sessionId: prepared.session.sessionId,
        confirmedScheduleId: prepared.confirmed.confirmedScheduleId,
        confirmedScheduleRecordVersion: 1,
        approvalDecisionId: prepared.decision.decisionId,
      },
    });
    expect(result.ok && result.assessment.history).toHaveLength(1);
  });

  it.each(["CONTENT_STAFF", "CUSTOMER", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "rejects non-ADMIN role %s",
    (actorRole) => {
      const prepared = prepareConfirmedSchedule();
      expect(
        useAuctionRegistrationOpeningReadinessStore
          .getState()
          .assessRegistrationOpeningReadiness({
            ...command(prepared, `deny-readiness-${actorRole}`),
            actorRole,
          }),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );

  it("rejects a missing Confirmed Schedule", () => {
    const prepared = prepareCompleteScheduleDraft();
    expect(
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness({
          sessionId: prepared.session.sessionId,
          actorId: adminId,
          actorRole: "ADMIN",
          expectedSessionVersion: prepared.session.currentVersion,
          expectedConfirmedScheduleId: "missing-confirmed-schedule",
          commandId: "missing-confirmed-readiness",
        }),
    ).toMatchObject({
      ok: false,
      code: REGISTRATION_READINESS_REQUIRES_CONFIRMED_SCHEDULE,
    });
  });

  it("creates or updates BLOCKED after explicit stale-evidence assessment", () => {
    const prepared = prepareConfirmedSchedule();
    const first =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(
          command(prepared, "readiness-before-drift"),
        );
    expect(first.ok).toBe(true);
    useAuctionContentStore.setState((state) => ({
      contents: state.contents.map((content) =>
        content.sessionId === prepared.session.sessionId
          ? { ...content, contentVersion: content.contentVersion + 1 }
          : content,
      ),
    }));
    const blocked =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(
          command(
            prepared,
            "readiness-after-drift",
            first.ok ? first.assessment.assessmentVersion : undefined,
          ),
        );
    expect(blocked).toMatchObject({
      ok: true,
      changed: true,
      assessment: {
        assessmentVersion: 2,
        status: "BLOCKED",
        evaluation: {
          findingCodes: expect.arrayContaining([
            "APPROVAL_EVIDENCE_STALE",
            "CONFIRMED_SCHEDULE_EVIDENCE_STALE",
          ]),
        },
      },
    });
  });

  it("rejects fixture/missing and SGDG-managed Sessions", () => {
    const prepared = prepareConfirmedSchedule();
    expect(
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness({
          ...command(prepared, "fixture-readiness"),
          sessionId: "fixture-session",
        }),
    ).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
    useAuctionSessionStore.setState((state) => ({
      sessions: state.sessions.map((session) =>
        session.sessionId === prepared.session.sessionId
          ? ({ ...session, recordKind: "DYNAMIC_SGDG_MANAGED_SESSION" } as never)
          : session,
      ),
    }));
    expect(
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(
          command(prepared, "sgdg-readiness"),
        ),
    ).toMatchObject({
      ok: false,
      code: REGISTRATION_READINESS_BLOCKED_BY_CONFIGURATION,
    });
  });

  it("purely evaluates before, inside, and at/after the confirmed window", () => {
    const window = {
      timezone: "Asia/Ho_Chi_Minh",
      registrationOpenAt: "2026-08-01T01:00:00.000Z",
      registrationCloseAt: "2026-08-01T02:00:00.000Z",
    };
    expect(
      evaluateRegistrationOpeningReadiness({
        window,
        now: "2026-08-01T00:59:59.999Z",
        approvalEvidenceCurrent: true,
        confirmedScheduleEvidenceCurrent: true,
      }).status,
    ).toBe("WAITING_FOR_OPEN_TIME");
    expect(
      evaluateRegistrationOpeningReadiness({
        window,
        now: "2026-08-01T01:30:00.000Z",
        approvalEvidenceCurrent: true,
        confirmedScheduleEvidenceCurrent: true,
      }).status,
    ).toBe("READY_TO_OPEN_REGISTRATION");
    expect(
      evaluateRegistrationOpeningReadiness({
        window,
        now: window.registrationCloseAt,
        approvalEvidenceCurrent: true,
        confirmedScheduleEvidenceCurrent: true,
      }).status,
    ).toBe("WINDOW_EXPIRED");
  });

  it("command derives READY inside the window and EXPIRED at close", () => {
    const prepared = prepareConfirmedSchedule();
    setRegistrationReadinessClock("2026-08-01T01:30:00.000Z");
    const ready =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(
          command(prepared, "ready-readiness"),
        );
    expect(ready).toMatchObject({
      ok: true,
      assessment: { status: "READY_TO_OPEN_REGISTRATION" },
    });
    setRegistrationReadinessClock(
      prepared.confirmed.schedule.registrationCloseAt,
    );
    const expired =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(
          command(
            prepared,
            "expired-readiness",
            ready.ok ? ready.assessment.assessmentVersion : undefined,
          ),
        );
    expect(expired).toMatchObject({
      ok: true,
      changed: true,
      assessment: { assessmentVersion: 2, status: "WINDOW_EXPIRED" },
    });
  });

  it("increments only for meaningful changes and rejects stale expected version", () => {
    const prepared = prepareConfirmedSchedule();
    const first =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(
          command(prepared, "first-readiness"),
        );
    expect(first.ok).toBe(true);
    setRegistrationReadinessClock("2026-07-31T00:00:00.000Z");
    const unchanged =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(
          command(prepared, "unchanged-readiness", 1),
        );
    expect(unchanged).toMatchObject({
      ok: true,
      changed: false,
      assessment: { assessmentVersion: 1 },
    });
    setRegistrationReadinessClock("2026-08-01T01:30:00.000Z");
    const changed =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(
          command(prepared, "changed-readiness", 1),
        );
    expect(changed).toMatchObject({
      ok: true,
      changed: true,
      assessment: { assessmentVersion: 2 },
    });
    expect(
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(
          command(prepared, "stale-version-readiness", 1),
        ),
    ).toMatchObject({ ok: false, code: "STALE_ASSESSMENT_VERSION" });
  });

  it("is idempotent for the same command even after clock movement", () => {
    const prepared = prepareConfirmedSchedule();
    const sameCommand = command(prepared, "same-readiness-command");
    const first =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(sameCommand);
    setRegistrationReadinessClock("2026-08-01T01:30:00.000Z");
    const repeated =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(sameCommand);
    expect(first).toMatchObject({ ok: true, changed: true });
    expect(repeated).toMatchObject({
      ok: true,
      changed: false,
      assessment: { assessmentVersion: 1, status: "WAITING_FOR_OPEN_TIME" },
    });
  });

  it("leaves Session and Confirmed Schedule unchanged and creates no later phase state", () => {
    const prepared = prepareConfirmedSchedule();
    const sessionBefore = useAuctionSessionStore.getState().sessions[0];
    const confirmedBefore =
      useAuctionConfirmedScheduleStore.getState().confirmedSchedules[0];
    const result =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(command(prepared));
    expect(result.ok).toBe(true);
    expect(useAuctionSessionStore.getState().sessions[0]).toBe(sessionBefore);
    expect(
      useAuctionConfirmedScheduleStore.getState().confirmedSchedules[0],
    ).toBe(confirmedBefore);
    expect(sessionBefore).toMatchObject({
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
    });
    expect(sessionBefore).not.toHaveProperty("registration");
    expect(sessionBefore).not.toHaveProperty("customerRegistration");
    expect(sessionBefore).not.toHaveProperty("publication");
  });

  it("fails closed for malformed, duplicate, ready-with-stale, and forbidden persistence", () => {
    const prepared = prepareConfirmedSchedule();
    setRegistrationReadinessClock("2026-08-01T01:30:00.000Z");
    const result =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness(command(prepared));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const assessment = result.assessment;
    expect(
      sanitizePersistedRegistrationReadinessState({
        assessments: [{ ...assessment, status: "REGISTRATION_OPEN" }],
      }).assessments,
    ).toEqual([]);
    expect(
      sanitizePersistedRegistrationReadinessState({
        assessments: [{ ...assessment, publicationId: "forbidden" }],
      }).assessments,
    ).toEqual([]);
    expect(
      sanitizePersistedRegistrationReadinessState({
        assessments: [assessment, assessment],
      }).assessments,
    ).toEqual([]);
    useAuctionContentStore.setState((state) => ({
      contents: state.contents.map((content) =>
        content.sessionId === prepared.session.sessionId
          ? { ...content, contentVersion: content.contentVersion + 1 }
          : content,
      ),
    }));
    expect(
      sanitizePersistedRegistrationReadinessState({
        assessments: [assessment],
      }).assessments,
    ).toEqual([]);
  });
});
