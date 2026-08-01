import { useAuctionDepositCheckStore } from "../store/auctionDepositCheckStore";
import { useAuctionMembershipCheckStore } from "../store/auctionMembershipCheckStore";
import {
  prepareInitialValidRegistrationForMembership,
  resetMembershipCheckTestState,
} from "./membershipCheckTestHarness";

export function resetDepositCheckTestState() {
  resetMembershipCheckTestState();
  useAuctionDepositCheckStore
    .getState()
    .resetDeterministicDepositCheckState();
}

export function prepareValidMembershipForDeposit() {
  const prepared = prepareInitialValidRegistrationForMembership();
  const membership = useAuctionMembershipCheckStore
    .getState()
    .checkCustomerMembership({
      registrationId: prepared.registration.registrationId,
      actorId: "admin.membership-check@mock.local",
      actorRole: "ADMIN",
      expectedValidationSourceType: "REGISTRATION_VALIDATION",
      expectedValidationSourceId: prepared.finalValidation.validationId,
      commandId: "deposit-harness-membership-check",
    });
  if (!membership.ok) throw new Error(membership.message);
  return { ...prepared, membershipCheck: membership.membershipCheck };
}
