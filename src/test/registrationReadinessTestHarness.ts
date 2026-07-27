import { useAuctionConfirmedScheduleStore } from "../store/auctionConfirmedScheduleStore";
import {
  REGISTRATION_READINESS_DEMO_CLOCK_KEY,
  useAuctionRegistrationOpeningReadinessStore,
} from "../store/auctionRegistrationOpeningReadinessStore";
import {
  prepareCompleteScheduleDraft,
  resetConfirmedScheduleTestState,
} from "./confirmedScheduleTestHarness";

export function resetRegistrationReadinessTestState() {
  resetConfirmedScheduleTestState();
  useAuctionRegistrationOpeningReadinessStore
    .getState()
    .resetDeterministicRegistrationReadinessState();
  localStorage.removeItem(REGISTRATION_READINESS_DEMO_CLOCK_KEY);
}

export function prepareConfirmedSchedule() {
  const prepared = prepareCompleteScheduleDraft();
  const result = useAuctionConfirmedScheduleStore
    .getState()
    .confirmSchedule({
      sessionId: prepared.session.sessionId,
      scheduleDraftId: prepared.draft.scheduleDraftId,
      actorId: "admin.readiness@mock.local",
      actorRole: "ADMIN",
      expectedSessionVersion: prepared.session.currentVersion,
      expectedScheduleVersion: prepared.draft.scheduleVersion,
      expectedApprovalDecisionId: prepared.decision.decisionId,
      expectedConfigurationSnapshotId:
        prepared.draft.configurationSnapshotId,
      commandId: "readiness-harness-confirm-schedule",
    });
  if (!result.ok) throw new Error(result.message);
  return { ...prepared, confirmed: result.confirmedSchedule };
}

export function setRegistrationReadinessClock(value: string) {
  localStorage.setItem(REGISTRATION_READINESS_DEMO_CLOCK_KEY, value);
}
