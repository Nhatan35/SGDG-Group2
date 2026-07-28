import { beforeEach, describe, expect, it } from "vitest";
import { useAuctionApprovalDecisionStore } from "./auctionApprovalDecisionStore";
import { useAuctionContentStore } from "./auctionContentStore";
import {
  SCHEDULE_DRAFT_BLOCKED_BY_CONFIGURATION,
  SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE,
  SCHEDULE_DRAFT_REQUIRES_APPROVED_DECISION,
  evaluateScheduleDraftCompleteness,
  sanitizePersistedAuctionScheduleDraftState,
  useAuctionScheduleDraftStore,
} from "./auctionScheduleDraftStore";
import { useAuctionSessionStore } from "./auctionSessionStore";
import {
  prepareApprovedScheduleAuthority,
  resetScheduleDraftTestState,
} from "../test/scheduleDraftTestHarness";

const actorId = "content.schedule@mock.local";
const validSchedule = {
  timezone: "Asia/Ho_Chi_Minh",
  registrationOpenAt: "2026-08-01T01:00:00.000Z",
  registrationCloseAt: "2026-08-01T02:00:00.000Z",
  auctionStartAt: "2026-08-01T03:00:00.000Z",
  auctionEndAt: "2026-08-01T04:00:00.000Z",
};

function create(commandId = "create-schedule-draft") {
  const authority = prepareApprovedScheduleAuthority();
  const result = useAuctionScheduleDraftStore.getState().createScheduleDraft({
    sessionId: authority.session.sessionId,
    actorId,
    actorRole: "CONTENT_STAFF",
    expectedSessionVersion: authority.session.currentVersion,
    expectedApprovalDecisionId: authority.decision.decisionId,
    commandId,
  });
  return { authority, result };
}

describe("Schedule Draft preparation aggregate", () => {
  beforeEach(resetScheduleDraftTestState);

  it("CONTENT_STAFF creates exactly one version 1 DRAFT with exact immutable authority", () => {
    const { authority, result } = create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft).toMatchObject({
      scheduleVersion: 1,
      status: "DRAFT",
      sessionId: authority.session.sessionId,
      approvalDecisionId: authority.decision.decisionId,
      approvalDecisionVersion: authority.decision.decisionVersion,
      configurationSnapshotId:
        authority.decision.validationEvidence.configurationSnapshotId,
      completeness: { complete: false },
    });
    expect(result.draft.history).toHaveLength(1);
    expect(Object.isFrozen(result.draft)).toBe(true);
  });

  it.each(["ADMIN", "CUSTOMER", "FINANCE", "CUSTOMER_SUPPORT"] as const)(
    "rejects create by %s",
    (actorRole) => {
      const authority = prepareApprovedScheduleAuthority();
      const result =
        useAuctionScheduleDraftStore.getState().createScheduleDraft({
          sessionId: authority.session.sessionId,
          actorId,
          actorRole,
          expectedSessionVersion: authority.session.currentVersion,
          expectedApprovalDecisionId: authority.decision.decisionId,
          commandId: `deny-create-${actorRole}`,
        });
      expect(result).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
    },
  );

  it("requires an APPROVED Decision and rejects a runtime non-APPROVED Decision", () => {
    const prepared = prepareApprovedScheduleAuthority();
    useAuctionApprovalDecisionStore.setState({ decisions: [] });
    let result = useAuctionScheduleDraftStore.getState().createScheduleDraft({
      sessionId: prepared.session.sessionId,
      actorId,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: prepared.session.currentVersion,
      expectedApprovalDecisionId: prepared.decision.decisionId,
      commandId: "missing-decision",
    });
    expect(result).toMatchObject({
      ok: false,
      code: SCHEDULE_DRAFT_REQUIRES_APPROVED_DECISION,
    });
    useAuctionApprovalDecisionStore.setState({
      decisions: [{ ...prepared.decision, outcome: "REJECTED" } as never],
    });
    result = useAuctionScheduleDraftStore.getState().createScheduleDraft({
      sessionId: prepared.session.sessionId,
      actorId,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: prepared.session.currentVersion,
      expectedApprovalDecisionId: prepared.decision.decisionId,
      commandId: "non-approved-decision",
    });
    expect(result).toMatchObject({
      ok: false,
      code: SCHEDULE_DRAFT_REQUIRES_APPROVED_DECISION,
    });
  });

  it("blocks stale Decision evidence on create and save without mutation", () => {
    const { authority, result } = create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    useAuctionContentStore.setState((state) => ({
      contents: state.contents.map((content) =>
        content.sessionId === authority.session.sessionId
          ? { ...content, contentVersion: content.contentVersion + 1 }
          : content,
      ),
    }));
    const save = useAuctionScheduleDraftStore.getState().saveScheduleDraft({
      scheduleDraftId: result.draft.scheduleDraftId,
      actorId,
      actorRole: "CONTENT_STAFF",
      expectedScheduleVersion: 1,
      expectedSessionVersion: authority.session.currentVersion,
      commandId: "stale-save",
      ...validSchedule,
    });
    expect(save).toMatchObject({
      ok: false,
      code: SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE,
    });
    expect(
      useAuctionScheduleDraftStore.getState().drafts[0].scheduleVersion,
    ).toBe(1);
  });

  it("rejects fixture/missing and SGDG-managed Sessions", () => {
    const missing = useAuctionScheduleDraftStore
      .getState()
      .createScheduleDraft({
        sessionId: "fixture-session",
        actorId,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: 1,
        expectedApprovalDecisionId: "decision",
        commandId: "fixture-create",
      });
    expect(missing).toMatchObject({ ok: false, code: "SESSION_NOT_FOUND" });
    const authority = prepareApprovedScheduleAuthority();
    useAuctionSessionStore.setState((state) => ({
      sessions: state.sessions.map((session) =>
        session.sessionId === authority.session.sessionId
          ? ({ ...session, recordKind: "DYNAMIC_SGDG_MANAGED_SESSION" } as never)
          : session,
      ),
    }));
    const blocked = useAuctionScheduleDraftStore
      .getState()
      .createScheduleDraft({
        sessionId: authority.session.sessionId,
        actorId,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: authority.session.currentVersion,
        expectedApprovalDecisionId: authority.decision.decisionId,
        commandId: "sgdg-create",
      });
    expect(blocked).toMatchObject({
      ok: false,
      code: SCHEDULE_DRAFT_BLOCKED_BY_CONFIGURATION,
    });
  });

  it("is idempotent for the same create command and rejects a different duplicate", () => {
    const { authority, result } = create("same-create");
    expect(result.ok).toBe(true);
    const same = useAuctionScheduleDraftStore.getState().createScheduleDraft({
      sessionId: authority.session.sessionId,
      actorId,
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: authority.session.currentVersion,
      expectedApprovalDecisionId: authority.decision.decisionId,
      commandId: "same-create",
    });
    expect(same).toMatchObject({ ok: true, created: false, changed: false });
    const duplicate =
      useAuctionScheduleDraftStore.getState().createScheduleDraft({
        sessionId: authority.session.sessionId,
        actorId,
        actorRole: "CONTENT_STAFF",
        expectedSessionVersion: authority.session.currentVersion,
        expectedApprovalDecisionId: authority.decision.decisionId,
        commandId: "different-create",
      });
    expect(duplicate).toMatchObject({
      ok: false,
      code: "SCHEDULE_DRAFT_ALREADY_EXISTS",
    });
    expect(useAuctionScheduleDraftStore.getState().drafts).toHaveLength(1);
  });

  it("saves incomplete Drafts and increments only meaningful changes", () => {
    const { authority, result } = create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const save = useAuctionScheduleDraftStore.getState().saveScheduleDraft({
      scheduleDraftId: result.draft.scheduleDraftId,
      actorId,
      actorRole: "CONTENT_STAFF",
      expectedScheduleVersion: 1,
      expectedSessionVersion: authority.session.currentVersion,
      commandId: "save-incomplete",
      timezone: "Asia/Ho_Chi_Minh",
    });
    expect(save).toMatchObject({
      ok: true,
      changed: true,
      draft: { scheduleVersion: 2, completeness: { complete: false } },
    });
    if (!save.ok) return;
    const noop = useAuctionScheduleDraftStore.getState().saveScheduleDraft({
      scheduleDraftId: save.draft.scheduleDraftId,
      actorId,
      actorRole: "CONTENT_STAFF",
      expectedScheduleVersion: 2,
      expectedSessionVersion: authority.session.currentVersion,
      commandId: "save-noop",
      timezone: "Asia/Ho_Chi_Minh",
    });
    expect(noop).toMatchObject({ ok: true, changed: false });
    expect(noop.ok && noop.draft.scheduleVersion).toBe(2);
  });

  it("valid five-field input derives COMPLETE and repeated save command is idempotent", () => {
    const { authority, result } = create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const command = {
      scheduleDraftId: result.draft.scheduleDraftId,
      actorId,
      actorRole: "CONTENT_STAFF" as const,
      expectedScheduleVersion: 1,
      expectedSessionVersion: authority.session.currentVersion,
      commandId: "save-complete",
      ...validSchedule,
    };
    const save = useAuctionScheduleDraftStore.getState().saveScheduleDraft(command);
    expect(save).toMatchObject({
      ok: true,
      changed: true,
      draft: { scheduleVersion: 2, status: "DRAFT", completeness: { complete: true } },
    });
    const same = useAuctionScheduleDraftStore.getState().saveScheduleDraft(command);
    expect(same).toMatchObject({ ok: true, changed: false });
    expect(same.ok && same.draft.scheduleVersion).toBe(2);
  });

  it("rejects stale scheduleVersion, unsupported fields, and unauthorized saves", () => {
    const { authority, result } = create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const base = {
      scheduleDraftId: result.draft.scheduleDraftId,
      actorId,
      actorRole: "CONTENT_STAFF" as const,
      expectedScheduleVersion: 99,
      expectedSessionVersion: authority.session.currentVersion,
      commandId: "stale-version-save",
      ...validSchedule,
    };
    expect(
      useAuctionScheduleDraftStore.getState().saveScheduleDraft(base),
    ).toMatchObject({ ok: false, code: "STALE_SCHEDULE_VERSION" });
    expect(
      useAuctionScheduleDraftStore.getState().saveScheduleDraft({
        ...base,
        expectedScheduleVersion: 1,
        commandId: "unsupported-save",
        publicationId: "forbidden",
      } as never),
    ).toMatchObject({ ok: false, code: "UNSUPPORTED_FIELD" });
    expect(
      useAuctionScheduleDraftStore.getState().saveScheduleDraft({
        ...base,
        actorRole: "ADMIN",
        expectedScheduleVersion: 1,
        commandId: "admin-save",
      }),
    ).toMatchObject({ ok: false, code: "ACCESS_DENIED" });
  });

  it("reports invalid timezone, order, and past timestamps without adjusting values", () => {
    expect(
      evaluateScheduleDraftCompleteness({
        ...validSchedule,
        timezone: "Mars/Olympus",
      }).findingCodes,
    ).toContain("TIMEZONE_INVALID");
    expect(
      evaluateScheduleDraftCompleteness({
        ...validSchedule,
        registrationCloseAt: validSchedule.registrationOpenAt,
        auctionStartAt: validSchedule.registrationOpenAt,
        auctionEndAt: validSchedule.registrationOpenAt,
      }).findingCodes,
    ).toEqual(
      expect.arrayContaining([
        "REGISTRATION_CLOSE_MUST_BE_AFTER_OPEN",
        "AUCTION_START_MUST_BE_AFTER_REGISTRATION_CLOSE",
        "AUCTION_END_MUST_BE_AFTER_AUCTION_START",
      ]),
    );
    expect(
      evaluateScheduleDraftCompleteness({
        ...validSchedule,
        registrationOpenAt: "2026-07-01T01:00:00.000Z",
      }).findingCodes,
    ).toContain("REGISTRATION_OPEN_MUST_BE_FUTURE");
    expect(
      evaluateScheduleDraftCompleteness({
        ...validSchedule,
        auctionEndAt: "August 1, 2026 12:00",
      }).findingCodes,
    ).toContain("INVALID_TIMESTAMP");
  });

  it("leaves Session, Decision, Registration and Publication untouched", () => {
    const { authority, result } = create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sessionBefore = useAuctionSessionStore.getState().sessions[0];
    const decisionBefore = useAuctionApprovalDecisionStore.getState().decisions[0];
    useAuctionScheduleDraftStore.getState().saveScheduleDraft({
      scheduleDraftId: result.draft.scheduleDraftId,
      actorId,
      actorRole: "CONTENT_STAFF",
      expectedScheduleVersion: 1,
      expectedSessionVersion: authority.session.currentVersion,
      commandId: "boundary-save",
      ...validSchedule,
    });
    expect(useAuctionSessionStore.getState().sessions[0]).toBe(sessionBefore);
    expect(useAuctionApprovalDecisionStore.getState().decisions[0]).toBe(
      decisionBefore,
    );
    expect(sessionBefore).toMatchObject({
      lifecycleStatus: "DRAFT",
      publicationStatus: "NOT_READY",
    });
    expect(sessionBefore).not.toHaveProperty("registration");
    expect(sessionBefore).not.toHaveProperty("publication");
  });

  it("fails closed for malformed, duplicate, and later-phase persisted state", () => {
    const { result } = create();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      sanitizePersistedAuctionScheduleDraftState({
        drafts: [{ ...result.draft, status: "CONFIRMED" }],
      }).drafts,
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionScheduleDraftState({
        drafts: [{ ...result.draft, publicationId: "pub-1" }],
      }).drafts,
    ).toEqual([]);
    expect(
      sanitizePersistedAuctionScheduleDraftState({
        drafts: [result.draft, result.draft],
      }).drafts,
    ).toEqual([]);
  });
});
