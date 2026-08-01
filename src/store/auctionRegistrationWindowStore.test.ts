import { beforeEach, describe, expect, it } from "vitest";
import { useAuctionConfirmedScheduleStore } from "./auctionConfirmedScheduleStore";
import { useAuctionContentStore } from "./auctionContentStore";
import { useAuctionRegistrationOpeningReadinessStore } from "./auctionRegistrationOpeningReadinessStore";
import {
  OPEN_REGISTRATION_EVIDENCE_STALE,
  OPEN_REGISTRATION_WINDOW_EXPIRED,
  REGISTRATION_ALREADY_OPEN,
  REGISTRATION_OPEN_BLOCKED_BY_CONFIGURATION,
  REGISTRATION_OPEN_BLOCKED_BY_STALE_EVIDENCE,
  REGISTRATION_OPEN_OUTSIDE_CONFIRMED_WINDOW,
  REGISTRATION_OPEN_REQUIRES_READY_ASSESSMENT,
  getOpenRegistrationWindowValidity,
  sanitizePersistedAuctionRegistrationWindowState,
  useAuctionRegistrationWindowStore,
} from "./auctionRegistrationWindowStore";
import { useAuctionSessionStore } from "./auctionSessionStore";
import {
  prepareReadyRegistrationAssessment,
  resetRegistrationWindowTestState,
} from "../test/registrationWindowTestHarness";
import {
  prepareConfirmedSchedule,
  setRegistrationReadinessClock,
} from "../test/registrationReadinessTestHarness";

const adminId = "admin.registration-opening@mock.local";
function command(
  prepared: ReturnType<typeof prepareReadyRegistrationAssessment>,
  commandId = "open-registration-window",
) {
  return {
    sessionId: prepared.session.sessionId,
    actorId: adminId,
    actorRole: "ADMIN" as const,
    expectedSessionVersion: prepared.session.currentVersion,
    expectedConfirmedScheduleId: prepared.confirmed.confirmedScheduleId,
    expectedAssessmentId: prepared.assessment.assessmentId,
    expectedAssessmentVersion: prepared.assessment.assessmentVersion,
    commandId,
  };
}

describe("Immutable Registration Window aggregate", () => {
  beforeEach(resetRegistrationWindowTestState);

  it("ADMIN opens exactly one immutable version-1 OPEN record with exact references", () => {
    const prepared = prepareReadyRegistrationAssessment();
    const result =
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow(command(prepared));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.registrationWindow).toMatchObject({
      registrationWindowId: `registration-window-${prepared.session.sessionId}`,
      recordVersion: 1,
      status: "OPEN",
      sessionId: prepared.session.sessionId,
      sessionVersion: prepared.session.currentVersion,
      approvalDecisionId: prepared.decision.decisionId,
      confirmedScheduleId: prepared.confirmed.confirmedScheduleId,
      confirmedScheduleRecordVersion: 1,
      readinessAssessmentId: prepared.assessment.assessmentId,
      readinessAssessmentVersion: prepared.assessment.assessmentVersion,
      window: {
        timezone: prepared.confirmed.schedule.timezone,
        registrationOpenAt:
          prepared.confirmed.schedule.registrationOpenAt,
        registrationCloseAt:
          prepared.confirmed.schedule.registrationCloseAt,
      },
      openingEvidence: {
        readinessStatus: "READY_TO_OPEN_REGISTRATION",
        approvalEvidenceValidity: "CURRENT",
        scheduleEvidenceValidity: "CURRENT",
        findingCodes: [],
      },
    });
    expect(Object.isFrozen(result.registrationWindow)).toBe(true);
    expect(Object.isFrozen(result.registrationWindow.window)).toBe(true);
    expect(Object.isFrozen(result.registrationWindow.openingEvidence))
      .toBe(true);
    expect(Object.isFrozen(result.registrationWindow.history)).toBe(true);
    expect(useAuctionRegistrationWindowStore.getState().registrationWindows)
      .toHaveLength(1);
  });

  it.each(["CONTENT_STAFF", "CUSTOMER", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "rejects non-ADMIN role %s",
    (actorRole) => {
      const prepared = prepareReadyRegistrationAssessment();
      expect(
        useAuctionRegistrationWindowStore
          .getState()
          .openRegistrationWindow({
            ...command(prepared, `deny-open-${actorRole}`),
            actorRole,
          }),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );

  it("rejects a non-ready assessment", () => {
    const prepared = prepareConfirmedSchedule();
    const waiting =
      useAuctionRegistrationOpeningReadinessStore
        .getState()
        .assessRegistrationOpeningReadiness({
          sessionId: prepared.session.sessionId,
          actorId: adminId,
          actorRole: "ADMIN",
          expectedSessionVersion: prepared.session.currentVersion,
          expectedConfirmedScheduleId:
            prepared.confirmed.confirmedScheduleId,
          commandId: "waiting-before-open",
        });
    expect(waiting.ok).toBe(true);
    if (!waiting.ok) return;
    expect(
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow({
          sessionId: prepared.session.sessionId,
          actorId: adminId,
          actorRole: "ADMIN",
          expectedSessionVersion: prepared.session.currentVersion,
          expectedConfirmedScheduleId:
            prepared.confirmed.confirmedScheduleId,
          expectedAssessmentId: waiting.assessment.assessmentId,
          expectedAssessmentVersion: waiting.assessment.assessmentVersion,
          commandId: "reject-waiting-open",
        }),
    ).toMatchObject({
      ok: false,
      code: REGISTRATION_OPEN_REQUIRES_READY_ASSESSMENT,
    });
  });

  it("enforces the exact latest assessment version", () => {
    const prepared = prepareReadyRegistrationAssessment();
    expect(
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow({
          ...command(prepared, "stale-assessment-open"),
          expectedAssessmentVersion: prepared.assessment.assessmentVersion + 1,
        }),
    ).toMatchObject({ ok: false, code: "STALE_ASSESSMENT_VERSION" });
  });

  it("final-rejects time before open and at/after close despite READY status", () => {
    const prepared = prepareReadyRegistrationAssessment();
    setRegistrationReadinessClock("2026-08-01T00:59:59.999Z");
    expect(
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow(command(prepared, "before-window-open")),
    ).toMatchObject({
      ok: false,
      code: REGISTRATION_OPEN_OUTSIDE_CONFIRMED_WINDOW,
    });
    setRegistrationReadinessClock(
      prepared.confirmed.schedule.registrationCloseAt,
    );
    expect(
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow(command(prepared, "after-window-open")),
    ).toMatchObject({
      ok: false,
      code: REGISTRATION_OPEN_OUTSIDE_CONFIRMED_WINDOW,
    });
  });

  it("blocks stale approval or Confirmed Schedule evidence", () => {
    const prepared = prepareReadyRegistrationAssessment();
    useAuctionContentStore.setState((state) => ({
      contents: state.contents.map((content) =>
        content.sessionId === prepared.session.sessionId
          ? { ...content, contentVersion: content.contentVersion + 1 }
          : content,
      ),
    }));
    expect(
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow(command(prepared, "stale-evidence-open")),
    ).toMatchObject({
      ok: false,
      code: REGISTRATION_OPEN_BLOCKED_BY_STALE_EVIDENCE,
    });
  });

  it("rejects fixture/missing and SGDG-managed workflows", () => {
    const prepared = prepareReadyRegistrationAssessment();
    expect(
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow({
          ...command(prepared, "fixture-window-open"),
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
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow(command(prepared, "sgdg-window-open")),
    ).toMatchObject({
      ok: false,
      code: REGISTRATION_OPEN_BLOCKED_BY_CONFIGURATION,
    });
  });

  it("is idempotent for the same command and prevents a different duplicate", () => {
    const prepared = prepareReadyRegistrationAssessment();
    const sameCommand = command(prepared, "same-window-open");
    const first =
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow(sameCommand);
    const same =
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow(sameCommand);
    expect(first).toMatchObject({ ok: true, created: true });
    expect(same).toMatchObject({ ok: true, created: false });
    expect(
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow(
          command(prepared, "different-window-open"),
        ),
    ).toMatchObject({ ok: false, code: REGISTRATION_ALREADY_OPEN });
    expect(useAuctionRegistrationWindowStore.getState().registrationWindows)
      .toHaveLength(1);
  });

  it("leaves Session, Schedule, and readiness unchanged with no Customer or Publication state", () => {
    const prepared = prepareReadyRegistrationAssessment();
    const sessionBefore = useAuctionSessionStore.getState().sessions[0];
    const confirmedBefore =
      useAuctionConfirmedScheduleStore.getState().confirmedSchedules[0];
    const assessmentBefore =
      useAuctionRegistrationOpeningReadinessStore.getState().assessments[0];
    const result =
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow(command(prepared));
    expect(result.ok).toBe(true);
    expect(useAuctionSessionStore.getState().sessions[0]).toBe(sessionBefore);
    expect(
      useAuctionConfirmedScheduleStore.getState().confirmedSchedules[0],
    ).toBe(confirmedBefore);
    expect(
      useAuctionRegistrationOpeningReadinessStore.getState().assessments[0],
    ).toBe(assessmentBefore);
    expect(sessionBefore).toMatchObject({
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
    });
    for (const field of [
      "customerRegistration",
      "registrationSubmissions",
      "membershipResult",
      "depositResult",
      "eligibilityResult",
      "publication",
    ])
      expect(sessionBefore).not.toHaveProperty(field);
  });

  it("derives expiry and stale evidence warnings without changing OPEN", () => {
    const prepared = prepareReadyRegistrationAssessment();
    const result =
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow(command(prepared));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    setRegistrationReadinessClock(
      prepared.confirmed.schedule.registrationCloseAt,
    );
    expect(getOpenRegistrationWindowValidity(result.registrationWindow)).toBe(
      OPEN_REGISTRATION_WINDOW_EXPIRED,
    );
    useAuctionContentStore.setState((state) => ({
      contents: state.contents.map((content) =>
        content.sessionId === prepared.session.sessionId
          ? { ...content, contentVersion: content.contentVersion + 1 }
          : content,
      ),
    }));
    expect(getOpenRegistrationWindowValidity(result.registrationWindow)).toBe(
      OPEN_REGISTRATION_EVIDENCE_STALE,
    );
    expect(result.registrationWindow.status).toBe("OPEN");
  });

  it("fails closed for malformed, duplicate, edited, and later-phase persistence", () => {
    const prepared = prepareReadyRegistrationAssessment();
    const result =
      useAuctionRegistrationWindowStore
        .getState()
        .openRegistrationWindow(command(prepared));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const registrationWindow = result.registrationWindow;
    expect(
      sanitizePersistedAuctionRegistrationWindowState({
        registrationWindows: [
          { ...registrationWindow, status: "CLOSED" },
        ],
      }).registrationWindows,
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionRegistrationWindowState({
        registrationWindows: [
          {
            ...registrationWindow,
            window: {
              ...registrationWindow.window,
              registrationCloseAt: "2026-08-02T02:00:00.000Z",
            },
          },
        ],
      }).registrationWindows,
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionRegistrationWindowState({
        registrationWindows: [
          { ...registrationWindow, registrationSubmissions: [] },
        ],
      }).registrationWindows,
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionRegistrationWindowState({
        registrationWindows: [registrationWindow, registrationWindow],
      }).registrationWindows,
    ).toEqual([]);
  });
});
