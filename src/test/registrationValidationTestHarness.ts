import { useAuctionCustomerRegistrationStore } from "../store/auctionCustomerRegistrationStore";
import {
  useAuctionRegistrationValidationStore,
} from "../store/auctionRegistrationValidationStore";
import { CURRENT_CUSTOMER_ID } from "../store/openingRequestStore";
import {
  prepareOpenRegistrationWindow,
  resetCustomerRegistrationTestState,
} from "./customerRegistrationTestHarness";

export function resetRegistrationValidationTestState() {
  resetCustomerRegistrationTestState();
  useAuctionRegistrationValidationStore
    .getState()
    .resetDeterministicRegistrationValidationState();
}

export function prepareSubmittedCustomerRegistration() {
  const prepared = prepareOpenRegistrationWindow();
  const create = useAuctionCustomerRegistrationStore
    .getState()
    .createRegistrationDraft({
      sessionId: prepared.session.sessionId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedSessionVersion: prepared.session.currentVersion,
      expectedRegistrationWindowId:
        prepared.registrationWindow.registrationWindowId,
      commandId: "registration-validation-harness-create",
    });
  if (!create.ok) throw new Error(create.message);
  const save = useAuctionCustomerRegistrationStore
    .getState()
    .saveRegistrationDraft({
      registrationId: create.registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedRegistrationVersion:
        create.registration.registrationVersion,
      rulesAccepted: true,
      commandId: "registration-validation-harness-save",
    });
  if (!save.ok) throw new Error(save.message);
  const submit = useAuctionCustomerRegistrationStore
    .getState()
    .submitRegistration({
      registrationId: save.registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedRegistrationVersion: save.registration.registrationVersion,
      expectedRegistrationWindowId:
        prepared.registrationWindow.registrationWindowId,
      commandId: "registration-validation-harness-submit",
    });
  if (!submit.ok) throw new Error(submit.message);
  return { ...prepared, registration: submit.registration };
}
