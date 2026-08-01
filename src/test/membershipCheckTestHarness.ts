import { useAuctionMembershipCheckStore } from "../store/auctionMembershipCheckStore";
import {
  getCustomerRegistrationSubmissionRecordId,
  useAuctionRegistrationValidationStore,
} from "../store/auctionRegistrationValidationStore";
import { useAuctionRegistrationRevalidationStore } from "../store/auctionRegistrationRevalidationStore";
import {
  prepareCorrectedRegistrationResubmission,
  resetRegistrationRevalidationTestState,
} from "./registrationRevalidationTestHarness";
import { prepareSubmittedCustomerRegistration } from "./registrationValidationTestHarness";

export function resetMembershipCheckTestState() {
  resetRegistrationRevalidationTestState();
  useAuctionMembershipCheckStore
    .getState()
    .resetDeterministicMembershipCheckState();
}

export function prepareInitialValidRegistrationForMembership() {
  const prepared = prepareSubmittedCustomerRegistration();
  const validation = useAuctionRegistrationValidationStore
    .getState()
    .validateCustomerRegistration({
      registrationId: prepared.registration.registrationId,
      actorId: "admin.registration-validation@mock.local",
      actorRole: "ADMIN",
      expectedRegistrationVersion:
        prepared.registration.registrationVersion,
      expectedSubmissionRecordId:
        getCustomerRegistrationSubmissionRecordId(
          prepared.registration.registrationId,
        ),
      commandId: "membership-harness-initial-validation",
    });
  if (!validation.ok) throw new Error(validation.message);
  return { ...prepared, finalValidation: validation.validation };
}

export function prepareCorrectedValidRegistrationForMembership() {
  const prepared = prepareCorrectedRegistrationResubmission();
  const revalidation = useAuctionRegistrationRevalidationStore
    .getState()
    .revalidateCorrectedRegistration({
      resubmissionId: prepared.resubmission.resubmissionId,
      actorId: "admin.registration-revalidation@mock.local",
      actorRole: "ADMIN",
      expectedRegistrationId: prepared.registration.registrationId,
      expectedPreviousValidationId: prepared.validation.validationId,
      expectedCorrectionDraftId:
        prepared.correctionDraft.correctionDraftId,
      expectedCorrectionDraftVersion:
        prepared.correctionDraft.correctionVersion,
      commandId: "membership-harness-revalidation",
    });
  if (!revalidation.ok) throw new Error(revalidation.message);
  return { ...prepared, finalValidation: revalidation.revalidation };
}
