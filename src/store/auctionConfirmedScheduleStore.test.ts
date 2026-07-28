import { beforeEach, describe, expect, it } from "vitest";
import { useAuctionApprovalDecisionStore } from "./auctionApprovalDecisionStore";
import {
  CONFIRMED_SCHEDULE_EVIDENCE_STALE,
  SCHEDULE_ALREADY_CONFIRMED,
  SCHEDULE_CONFIRMATION_BLOCKED_BY_CONFIGURATION,
  SCHEDULE_CONFIRMATION_BLOCKED_BY_STALE_APPROVAL,
  SCHEDULE_CONFIRMATION_REQUIRES_COMPLETE_DRAFT,
  getConfirmedScheduleEvidenceValidity,
  sanitizePersistedAuctionConfirmedScheduleState,
  useAuctionConfirmedScheduleStore,
} from "./auctionConfirmedScheduleStore";
import { useAuctionConfigurationStore } from "./auctionConfigurationStore";
import { useAuctionContentStore } from "./auctionContentStore";
import { useAuctionScheduleDraftStore } from "./auctionScheduleDraftStore";
import { useAuctionSessionStore } from "./auctionSessionStore";
import {
  completeScheduleValues,
  prepareCompleteScheduleDraft,
  resetConfirmedScheduleTestState,
} from "../test/confirmedScheduleTestHarness";
import { prepareApprovedScheduleAuthority } from "../test/scheduleDraftTestHarness";

const adminId = "admin.confirmation@mock.local";

function command(
  prepared: ReturnType<typeof prepareCompleteScheduleDraft>,
  commandId = "confirm-complete-schedule",
) {
  return {
    sessionId: prepared.session.sessionId,
    scheduleDraftId: prepared.draft.scheduleDraftId,
    actorId: adminId,
    actorRole: "ADMIN" as const,
    expectedSessionVersion: prepared.session.currentVersion,
    expectedScheduleVersion: prepared.draft.scheduleVersion,
    expectedApprovalDecisionId: prepared.decision.decisionId,
    expectedConfigurationSnapshotId: prepared.draft.configurationSnapshotId,
    commandId,
  };
}

describe("Immutable Confirmed Schedule aggregate", () => {
  beforeEach(resetConfirmedScheduleTestState);

  it("ADMIN confirms one complete Draft with exact values and authority", () => {
    const prepared = prepareCompleteScheduleDraft();
    const result =
      useAuctionConfirmedScheduleStore.getState().confirmSchedule(
        command(prepared),
      );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.confirmedSchedule).toMatchObject({
      confirmedScheduleId: `confirmed-schedule-${prepared.session.sessionId}`,
      recordVersion: 1,
      status: "CONFIRMED",
      scheduleDraftId: prepared.draft.scheduleDraftId,
      scheduleDraftVersion: prepared.draft.scheduleVersion,
      approvalDecisionId: prepared.decision.decisionId,
      approvalDecisionVersion: prepared.decision.decisionVersion,
      configurationSnapshotId: prepared.draft.configurationSnapshotId,
      schedule: completeScheduleValues,
      validationEvidence: {
        scheduleComplete: true,
        temporalOrderValid: true,
        approvalEvidenceValidity: "CURRENT",
        findingCodes: [],
      },
    });
    expect(useAuctionConfirmedScheduleStore.getState().confirmedSchedules)
      .toHaveLength(1);
  });

  it.each(["CONTENT_STAFF", "CUSTOMER", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "rejects non-ADMIN role %s",
    (actorRole) => {
      const prepared = prepareCompleteScheduleDraft();
      expect(
        useAuctionConfirmedScheduleStore.getState().confirmSchedule({
          ...command(prepared, `deny-confirm-${actorRole}`),
          actorRole,
        }),
      ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );

  it("rejects an incomplete Draft", () => {
    const authority = prepareApprovedScheduleAuthority();
    const created =
      useAuctionScheduleDraftStore.getState().createScheduleDraft({
        sessionId: authority.session.sessionId,
        actorId: "content",
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: authority.session.currentVersion,
        expectedApprovalDecisionId: authority.decision.decisionId,
        commandId: "create-incomplete-confirmation-draft",
      });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const result =
      useAuctionConfirmedScheduleStore.getState().confirmSchedule({
        sessionId: authority.session.sessionId,
        scheduleDraftId: created.draft.scheduleDraftId,
        actorId: adminId,
        actorRole: "ADMIN",
        expectedSessionVersion: authority.session.currentVersion,
        expectedScheduleVersion: created.draft.scheduleVersion,
        expectedApprovalDecisionId: authority.decision.decisionId,
        expectedConfigurationSnapshotId:
          created.draft.configurationSnapshotId,
        commandId: "reject-incomplete-confirmation",
      });
    expect(result).toMatchObject({
      ok: false,
      code: SCHEDULE_CONFIRMATION_REQUIRES_COMPLETE_DRAFT,
    });
  });

  it("final-revalidates temporal order instead of trusting stored completeness", () => {
    const prepared = prepareCompleteScheduleDraft();
    useAuctionScheduleDraftStore.setState({
      drafts: [
        {
          ...prepared.draft,
          proposedSchedule: {
            ...prepared.draft.proposedSchedule,
            auctionEndAt: prepared.draft.proposedSchedule.auctionStartAt,
          },
          completeness: { complete: true, findingCodes: [] },
        },
      ],
    });
    expect(
      useAuctionConfirmedScheduleStore
        .getState()
        .confirmSchedule(command(prepared, "invalid-order-confirmation")),
    ).toMatchObject({
      ok: false,
      code: SCHEDULE_CONFIRMATION_REQUIRES_COMPLETE_DRAFT,
    });
  });

  it("blocks stale approval evidence", () => {
    const prepared = prepareCompleteScheduleDraft();
    useAuctionContentStore.setState((state) => ({
      contents: state.contents.map((content) =>
        content.sessionId === prepared.session.sessionId
          ? { ...content, contentVersion: content.contentVersion + 1 }
          : content,
      ),
    }));
    expect(
      useAuctionConfirmedScheduleStore
        .getState()
        .confirmSchedule(command(prepared, "stale-approval-confirmation")),
    ).toMatchObject({
      ok: false,
      code: SCHEDULE_CONFIRMATION_BLOCKED_BY_STALE_APPROVAL,
    });
  });

  it("rejects stale Draft version", () => {
    const prepared = prepareCompleteScheduleDraft();
    expect(
      useAuctionConfirmedScheduleStore.getState().confirmSchedule({
        ...command(prepared, "stale-draft-version-confirmation"),
        expectedScheduleVersion: prepared.draft.scheduleVersion - 1,
      }),
    ).toMatchObject({ ok: false, code: "STALE_SCHEDULE_VERSION" });
  });

  it("rejects fixture/missing and SGDG-managed Sessions", () => {
    const prepared = prepareCompleteScheduleDraft();
    expect(
      useAuctionConfirmedScheduleStore.getState().confirmSchedule({
        ...command(prepared, "missing-session-confirmation"),
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
      useAuctionConfirmedScheduleStore
        .getState()
        .confirmSchedule(command(prepared, "sgdg-confirmation")),
    ).toMatchObject({
      ok: false,
      code: SCHEDULE_CONFIRMATION_BLOCKED_BY_CONFIGURATION,
    });
  });

  it("freezes the record, nested evidence, schedule, and history", () => {
    const prepared = prepareCompleteScheduleDraft();
    const result =
      useAuctionConfirmedScheduleStore.getState().confirmSchedule(
        command(prepared),
      );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.confirmedSchedule)).toBe(true);
    expect(Object.isFrozen(result.confirmedSchedule.schedule)).toBe(true);
    expect(Object.isFrozen(result.confirmedSchedule.validationEvidence))
      .toBe(true);
    expect(Object.isFrozen(result.confirmedSchedule.history)).toBe(true);
    expect(Object.isFrozen(result.confirmedSchedule.history[0])).toBe(true);
  });

  it("is idempotent for the same command and prevents a different duplicate", () => {
    const prepared = prepareCompleteScheduleDraft();
    const first =
      useAuctionConfirmedScheduleStore.getState().confirmSchedule(
        command(prepared, "same-confirmation-command"),
      );
    const same =
      useAuctionConfirmedScheduleStore.getState().confirmSchedule(
        command(prepared, "same-confirmation-command"),
      );
    expect(first).toMatchObject({ ok: true, created: true });
    expect(same).toMatchObject({ ok: true, created: false });
    expect(
      useAuctionConfirmedScheduleStore
        .getState()
        .confirmSchedule(command(prepared, "different-confirmation-command")),
    ).toMatchObject({ ok: false, code: SCHEDULE_ALREADY_CONFIRMED });
    expect(useAuctionConfirmedScheduleStore.getState().confirmedSchedules)
      .toHaveLength(1);
  });

  it("does not mutate Draft, Decision, Configuration, Session, Registration, or Publication", () => {
    const prepared = prepareCompleteScheduleDraft();
    const draftBefore = useAuctionScheduleDraftStore.getState().drafts[0];
    const decisionBefore =
      useAuctionApprovalDecisionStore.getState().decisions[0];
    const snapshotBefore =
      useAuctionConfigurationStore.getState().snapshots[0];
    const sessionBefore = useAuctionSessionStore.getState().sessions[0];
    const result =
      useAuctionConfirmedScheduleStore.getState().confirmSchedule(
        command(prepared),
      );
    expect(result.ok).toBe(true);
    expect(useAuctionScheduleDraftStore.getState().drafts[0]).toBe(draftBefore);
    expect(useAuctionApprovalDecisionStore.getState().decisions[0]).toBe(
      decisionBefore,
    );
    expect(useAuctionConfigurationStore.getState().snapshots[0]).toBe(
      snapshotBefore,
    );
    expect(useAuctionSessionStore.getState().sessions[0]).toBe(sessionBefore);
    expect(sessionBefore).toMatchObject({
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
    });
    expect(sessionBefore).not.toHaveProperty("registration");
    expect(sessionBefore).not.toHaveProperty("publication");
  });

  it("derives stale evidence after post-confirmation upstream drift without mutation", () => {
    const prepared = prepareCompleteScheduleDraft();
    const result =
      useAuctionConfirmedScheduleStore.getState().confirmSchedule(
        command(prepared),
      );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const confirmedBefore = result.confirmedSchedule;
    useAuctionContentStore.setState((state) => ({
      contents: state.contents.map((content) =>
        content.sessionId === prepared.session.sessionId
          ? { ...content, contentVersion: content.contentVersion + 1 }
          : content,
      ),
    }));
    expect(getConfirmedScheduleEvidenceValidity(confirmedBefore)).toBe(
      CONFIRMED_SCHEDULE_EVIDENCE_STALE,
    );
    expect(useAuctionConfirmedScheduleStore.getState().confirmedSchedules[0])
      .toBe(confirmedBefore);
    expect(
      sanitizePersistedAuctionConfirmedScheduleState({
        confirmedSchedules: [confirmedBefore],
      }).confirmedSchedules,
    ).toHaveLength(1);
  });

  it("fails closed for malformed, duplicate, edited, and later-phase persistence", () => {
    const prepared = prepareCompleteScheduleDraft();
    const result =
      useAuctionConfirmedScheduleStore.getState().confirmSchedule(
        command(prepared),
      );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const confirmed = result.confirmedSchedule;
    expect(
      sanitizePersistedAuctionConfirmedScheduleState({
        confirmedSchedules: [{ ...confirmed, status: "PUBLISHED" }],
      }).confirmedSchedules,
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionConfirmedScheduleState({
        confirmedSchedules: [
          {
            ...confirmed,
            schedule: {
              ...confirmed.schedule,
              auctionEndAt: "2026-08-02T04:00:00.000Z",
            },
          },
        ],
      }).confirmedSchedules,
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionConfirmedScheduleState({
        confirmedSchedules: [
          { ...confirmed, publicationId: "forbidden-publication" },
        ],
      }).confirmedSchedules,
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionConfirmedScheduleState({
        confirmedSchedules: [confirmed, confirmed],
      }).confirmedSchedules,
    ).toEqual([]);
  });
});
