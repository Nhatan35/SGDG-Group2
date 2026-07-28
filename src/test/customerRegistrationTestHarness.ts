import { useAuctionCustomerRegistrationStore } from "../store/auctionCustomerRegistrationStore";
import { useAuctionRegistrationWindowStore } from "../store/auctionRegistrationWindowStore";
import {
  prepareReadyRegistrationAssessment,
  resetRegistrationWindowTestState,
} from "./registrationWindowTestHarness";

export function resetCustomerRegistrationTestState() {
  resetRegistrationWindowTestState();
  useAuctionCustomerRegistrationStore
    .getState()
    .resetDeterministicCustomerRegistrationState();
}

export function prepareOpenRegistrationWindow() {
  const prepared = prepareReadyRegistrationAssessment();
  const result = useAuctionRegistrationWindowStore
    .getState()
    .openRegistrationWindow({
      sessionId: prepared.session.sessionId,
      actorId: "admin.registration-opening@mock.local",
      actorRole: "ADMIN",
      expectedSessionVersion: prepared.session.currentVersion,
      expectedConfirmedScheduleId: prepared.confirmed.confirmedScheduleId,
      expectedAssessmentId: prepared.assessment.assessmentId,
      expectedAssessmentVersion: prepared.assessment.assessmentVersion,
      commandId: "customer-registration-harness-open-window",
    });
  if (!result.ok) throw new Error(result.message);
  return { ...prepared, registrationWindow: result.registrationWindow };
}
