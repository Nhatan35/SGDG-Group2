export type CustomerDepositStatus =
  | "CONFIRMED"
  | "PENDING"
  | "FAILED"
  | "REFUNDED"
  | "UNKNOWN";

export interface CustomerDepositEvidence {
  readonly registrationId: string;
  readonly customerId: string;
  readonly sessionId: string;
  readonly depositReference?: string;
  readonly depositStatus: CustomerDepositStatus;
  readonly confirmedAt?: string;
  readonly sourceReferenceVersion: "DEPOSIT-MOCK-V1";
  readonly sourceDomain: "FINANCIAL_MANAGEMENT";
}

const customerId = "CUS-NMA-001";
const sessionId = "linked-orq-cus-2026-001-v4";
const registrationId = `customer-registration-${sessionId}-${customerId}`;

const evidenceByRegistration = Object.freeze({
  [registrationId]: Object.freeze({
    registrationId,
    customerId,
    sessionId,
    depositReference: "DEP-CUS-NMA-001-LINKED-001",
    depositStatus: "CONFIRMED",
    confirmedAt: "2026-07-20T08:00:00.000Z",
    sourceReferenceVersion: "DEPOSIT-MOCK-V1",
    sourceDomain: "FINANCIAL_MANAGEMENT",
  }),
} as const satisfies Record<string, CustomerDepositEvidence>);

export const getCustomerDepositEvidence = ({
  registrationId: requestedRegistrationId,
  customerId: requestedCustomerId,
  sessionId: requestedSessionId,
}: {
  registrationId: string;
  customerId: string;
  sessionId: string;
}): CustomerDepositEvidence | undefined => {
  const evidence =
    evidenceByRegistration[
      requestedRegistrationId as keyof typeof evidenceByRegistration
    ];
  if (
    !evidence ||
    evidence.customerId !== requestedCustomerId ||
    evidence.sessionId !== requestedSessionId
  )
    return undefined;
  return Object.freeze({ ...evidence });
};
