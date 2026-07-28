import { useAuctionRegistrationResubmissionStore } from "../store/auctionRegistrationResubmissionStore";
import { useAuctionRegistrationRevalidationStore } from "../store/auctionRegistrationRevalidationStore";
import { CURRENT_CUSTOMER_ID } from "../store/openingRequestStore";
import {
  prepareAcceptedRegistrationCorrectionDraft,
  resetRegistrationResubmissionTestState,
} from "./registrationResubmissionTestHarness";

export function resetRegistrationRevalidationTestState() {
  resetRegistrationResubmissionTestState();
  useAuctionRegistrationRevalidationStore
    .getState()
    .resetDeterministicRegistrationRevalidationState();
}

export function prepareCorrectedRegistrationResubmission() {
  const prepared = prepareAcceptedRegistrationCorrectionDraft();
  const result = useAuctionRegistrationResubmissionStore
    .getState()
    .resubmitCorrectedRegistration({
      registrationId: prepared.registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedRegistrationVersion:
        prepared.registration.registrationVersion,
      expectedValidationId: prepared.validation.validationId,
      expectedCorrectionDraftId:
        prepared.correctionDraft.correctionDraftId,
      expectedCorrectionDraftVersion:
        prepared.correctionDraft.correctionVersion,
      commandId: "revalidation-harness-resubmission",
    });
  if (!result.ok) throw new Error(result.message);
  return { ...prepared, resubmission: result.resubmission };
}
