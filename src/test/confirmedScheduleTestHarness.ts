import { useAuctionConfirmedScheduleStore } from "../store/auctionConfirmedScheduleStore";
import { useAuctionScheduleDraftStore } from "../store/auctionScheduleDraftStore";
import {
  prepareApprovedScheduleAuthority,
  resetScheduleDraftTestState,
} from "./scheduleDraftTestHarness";

export const completeScheduleValues = {
  timezone: "Asia/Ho_Chi_Minh",
  registrationOpenAt: "2026-08-01T01:00:00.000Z",
  registrationCloseAt: "2026-08-01T02:00:00.000Z",
  auctionStartAt: "2026-08-01T03:00:00.000Z",
  auctionEndAt: "2026-08-01T04:00:00.000Z",
};

export function resetConfirmedScheduleTestState() {
  resetScheduleDraftTestState();
  useAuctionConfirmedScheduleStore
    .getState()
    .resetDeterministicConfirmedScheduleState();
}

export function prepareCompleteScheduleDraft() {
  const authority = prepareApprovedScheduleAuthority();
  const created =
    useAuctionScheduleDraftStore.getState().createScheduleDraft({
      sessionId: authority.session.sessionId,
      actorId: "content.confirmation@mock.local",
      actorRole: "CONTENT_STAFF",
      expectedSessionVersion: authority.session.currentVersion,
      expectedApprovalDecisionId: authority.decision.decisionId,
      commandId: "confirmation-harness-create-draft",
    });
  if (!created.ok) throw new Error(created.message);
  const saved = useAuctionScheduleDraftStore.getState().saveScheduleDraft({
    scheduleDraftId: created.draft.scheduleDraftId,
    actorId: "content.confirmation@mock.local",
    actorRole: "CONTENT_STAFF",
    expectedScheduleVersion: created.draft.scheduleVersion,
    expectedSessionVersion: authority.session.currentVersion,
    commandId: "confirmation-harness-save-complete-draft",
    ...completeScheduleValues,
  });
  if (!saved.ok) throw new Error(saved.message);
  return { ...authority, draft: saved.draft };
}
