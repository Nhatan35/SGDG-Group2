import { useAuctionCustomerRegistrationStore } from "../store/auctionCustomerRegistrationStore";
import {
  getCustomerRegistrationSubmissionRecordId,
  useAuctionRegistrationValidationStore,
} from "../store/auctionRegistrationValidationStore";
import { useAuctionRegistrationCorrectionDraftStore } from "../store/auctionRegistrationCorrectionDraftStore";
import {
  prepareSubmittedCustomerRegistration,
  resetRegistrationValidationTestState,
} from "./registrationValidationTestHarness";

export function resetRegistrationCorrectionTestState() {
  resetRegistrationValidationTestState();
  useAuctionRegistrationCorrectionDraftStore
    .getState()
    .resetDeterministicRegistrationCorrectionDraftState();
}

export function prepareCorrectableRegistrationValidation() {
  const prepared = prepareSubmittedCustomerRegistration();
  const history = prepared.registration.history.map((entry, index) =>
    index === prepared.registration.history.length - 1
      ? Object.freeze({ ...entry, rulesAccepted: false })
      : entry,
  );
  const correctableRegistration = Object.freeze({
    ...prepared.registration,
    rulesAccepted: false,
    history: Object.freeze(history),
  });
  useAuctionCustomerRegistrationStore.setState({
    registrations: [correctableRegistration],
  });
  const validation = useAuctionRegistrationValidationStore
    .getState()
    .validateCustomerRegistration({
      registrationId: correctableRegistration.registrationId,
      actorId: "admin.registration-validation@mock.local",
      actorRole: "ADMIN",
      expectedRegistrationVersion:
        correctableRegistration.registrationVersion,
      expectedSubmissionRecordId:
        getCustomerRegistrationSubmissionRecordId(
          correctableRegistration.registrationId,
        ),
      commandId: "registration-correction-harness-validation",
    });
  if (!validation.ok) throw new Error(validation.message);
  return {
    ...prepared,
    registration: correctableRegistration,
    validation: validation.validation,
  };
}
