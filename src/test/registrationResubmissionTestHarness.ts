import { useAuctionRegistrationCorrectionDraftStore } from "../store/auctionRegistrationCorrectionDraftStore";
import { useAuctionRegistrationResubmissionStore } from "../store/auctionRegistrationResubmissionStore";
import { CURRENT_CUSTOMER_ID } from "../store/openingRequestStore";
import {
  prepareCorrectableRegistrationValidation,
  resetRegistrationCorrectionTestState,
} from "./registrationCorrectionTestHarness";

export function resetRegistrationResubmissionTestState() {
  resetRegistrationCorrectionTestState();
  useAuctionRegistrationResubmissionStore
    .getState()
    .resetDeterministicRegistrationResubmissionState();
}

export function prepareAcceptedRegistrationCorrectionDraft() {
  const prepared = prepareCorrectableRegistrationValidation();
  const created = useAuctionRegistrationCorrectionDraftStore
    .getState()
    .createRegistrationCorrectionDraft({
      registrationId: prepared.registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedRegistrationVersion:
        prepared.registration.registrationVersion,
      expectedValidationId: prepared.validation.validationId,
      commandId: "resubmission-harness-create-correction",
    });
  if (!created.ok) throw new Error(created.message);
  const saved = useAuctionRegistrationCorrectionDraftStore
    .getState()
    .saveRegistrationCorrectionDraft({
      correctionDraftId: created.correctionDraft.correctionDraftId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedCorrectionVersion:
        created.correctionDraft.correctionVersion,
      rulesAccepted: true,
      commandId: "resubmission-harness-accept-rules",
    });
  if (!saved.ok) throw new Error(saved.message);
  return { ...prepared, correctionDraft: saved.correctionDraft };
}
