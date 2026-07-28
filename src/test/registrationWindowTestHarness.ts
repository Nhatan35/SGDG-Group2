import { useAuctionRegistrationOpeningReadinessStore } from "../store/auctionRegistrationOpeningReadinessStore";
import { useAuctionRegistrationWindowStore } from "../store/auctionRegistrationWindowStore";
import {
  prepareConfirmedSchedule,
  resetRegistrationReadinessTestState,
  setRegistrationReadinessClock,
} from "./registrationReadinessTestHarness";

export function resetRegistrationWindowTestState() {
  resetRegistrationReadinessTestState();
  useAuctionRegistrationWindowStore
    .getState()
    .resetDeterministicRegistrationWindowState();
}

export function prepareReadyRegistrationAssessment() {
  const prepared = prepareConfirmedSchedule();
  setRegistrationReadinessClock("2026-08-01T01:30:00.000Z");
  const result = useAuctionRegistrationOpeningReadinessStore
    .getState()
    .assessRegistrationOpeningReadiness({
      sessionId: prepared.session.sessionId,
      actorId: "admin.registration-opening@mock.local",
      actorRole: "ADMIN",
      expectedSessionVersion: prepared.session.currentVersion,
      expectedConfirmedScheduleId: prepared.confirmed.confirmedScheduleId,
      commandId: "registration-window-harness-ready-assessment",
    });
  if (!result.ok) throw new Error(result.message);
  if (result.assessment.status !== "READY_TO_OPEN_REGISTRATION")
    throw new Error("Harness did not produce READY readiness");
  return { ...prepared, assessment: result.assessment };
}
