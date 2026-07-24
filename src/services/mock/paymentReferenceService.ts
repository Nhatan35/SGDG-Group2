export type PaymentReferenceScenario = "pending" | "confirmed" | "expired" | "failed" | "ambiguous" | "reversed" | "simulated-timeout";
export type FinalWinnerTransition = "PENDING" | "FINAL_WINNER_CONFIRMED" | "BLOCKED";

export interface PaymentReferenceFixture {
  auctionId: string;
  scenario: PaymentReferenceScenario;
  status: "PENDING" | "CONFIRMED" | "EXPIRED" | "FAILED" | "AMBIGUOUS" | "REVERSED" | "TIMEOUT";
  closingPrice: number;
  amountDue: number;
  paymentReference: string;
  providerReference: string;
  paymentConfirmedAt?: string;
  source: "Financial Management Mock";
  finalWinnerTransition: FinalWinnerTransition;
}

export function getPaymentReferenceFixture(
  auctionId: string,
  scenario: PaymentReferenceScenario = "pending",
  transition: "pending" | "final-winner-confirmed" = "pending",
): PaymentReferenceFixture | undefined {
  if (auctionId !== "patek-nautilus") return undefined;
  const status = scenario === "simulated-timeout" ? "TIMEOUT" : scenario.toUpperCase() as PaymentReferenceFixture["status"];
  return {
    auctionId,
    scenario,
    status,
    closingPrice: 3_500_000_000,
    amountDue: 3_459_000_000,
    paymentReference: "SGD-PAY-1028",
    providerReference: "PAY-••••-5711R",
    paymentConfirmedAt: scenario === "confirmed" || scenario === "reversed" ? "2026-07-20T07:25:00.000Z" : undefined,
    source: "Financial Management Mock",
    finalWinnerTransition: scenario === "confirmed" ? transition === "final-winner-confirmed" ? "FINAL_WINNER_CONFIRMED" : "PENDING" : scenario === "reversed" ? "BLOCKED" : "PENDING",
  };
}
