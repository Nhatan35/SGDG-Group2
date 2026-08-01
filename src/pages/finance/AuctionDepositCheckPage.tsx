import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { BlockedState } from "../../components/feedback/States";
import { getCustomerDepositEvidence } from "../../services/depositEvidenceReference";
import {
  PROTOTYPE_DEPOSIT_EVIDENCE,
  type DepositCheckCommandResult,
  useAuctionDepositCheckStore,
} from "../../store/auctionDepositCheckStore";
import { useAuctionCustomerRegistrationStore } from "../../store/auctionCustomerRegistrationStore";
import { useAuctionMembershipCheckStore } from "../../store/auctionMembershipCheckStore";
import { useDemoStore } from "../../store/demoStore";
import "../../styles/auction-schedule-confirmation.css";
import "../../styles/auction-approval-package.css";

const FINANCE_DEPOSIT_CHECKER_ID = "finance.deposit-check@mock.local";

const commandError = (
  result: Extract<DepositCheckCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

const safeNextStep = (
  nextStep:
    | "READY_FOR_ELIGIBILITY_EVALUATION"
    | "DEPOSIT_NOT_SATISFIED"
    | "DEPOSIT_REVIEW_REQUIRED",
) =>
  nextStep === "READY_FOR_ELIGIBILITY_EVALUATION"
    ? "Ready for Eligibility Evaluation"
    : nextStep === "DEPOSIT_NOT_SATISFIED"
      ? "Deposit Not Satisfied"
      : "Deposit Review Required";

export function AuctionDepositCheckPage() {
  const { registrationId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const registration = useAuctionCustomerRegistrationStore((state) =>
    state.registrations.find(
      (item) => item.registrationId === registrationId,
    ),
  );
  const membershipCheck = useAuctionMembershipCheckStore((state) =>
    state.membershipChecks.find(
      (item) => item.registrationId === registrationId,
    ),
  );
  const depositCheck = useAuctionDepositCheckStore((state) =>
    state.depositChecks.find(
      (item) => item.registrationId === registrationId,
    ),
  );
  const checkDeposit = useAuctionDepositCheckStore(
    (state) => state.checkCustomerDeposit,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (actorRole !== "FINANCE" && actorRole !== "ADMIN")
    return (
      <main className="schedule-confirmation-page">
        <h1>Customer Deposit Check</h1>
        <BlockedState
          title="Unauthorized"
          description="Only FINANCE may execute Deposit Check; ADMIN has read-only access."
        />
      </main>
    );

  if (!registration || !membershipCheck)
    return (
      <main className="schedule-confirmation-page">
        <h1>Customer Deposit Check</h1>
        <BlockedState
          title="Deposit Check unavailable"
          description="A submitted Registration and Membership Check are required."
        />
      </main>
    );

  const depositEvidence = getCustomerDepositEvidence({
    registrationId: registration.registrationId,
    customerId: registration.customerId,
    sessionId: registration.sessionId,
  });

  const runCheck = () => {
    setMessage("");
    setError("");
    const result = checkDeposit({
      registrationId: registration.registrationId,
      actorId: FINANCE_DEPOSIT_CHECKER_ID,
      actorRole,
      expectedMembershipCheckId: membershipCheck.membershipCheckId,
      commandId: `CHECK_CUSTOMER_DEPOSIT:${registration.registrationId}:${membershipCheck.membershipCheckId}`,
    });
    if (!result.ok) return setError(commandError(result));
    setMessage(
      result.created
        ? "Immutable Deposit Check Record created."
        : "Existing Deposit Check Record returned.",
    );
  };

  return (
    <main className="schedule-confirmation-page">
      <header className="approval-package-heading">
        <span>
          {actorRole === "FINANCE"
            ? "FINANCE · READ-ONLY DEPOSIT CHECK"
            : "ADMIN · READ-ONLY DEPOSIT PROJECTION"}
        </span>
        <h1>Customer Deposit Check</h1>
        <p>{PROTOTYPE_DEPOSIT_EVIDENCE}</p>
      </header>

      <section className="approval-package-card">
        <h2>Deposit Check Sources</h2>
        <dl className="schedule-confirmation-evidence">
          <dt>Registration ID</dt>
          <dd>{registration.registrationId}</dd>
          <dt>Customer ID</dt>
          <dd>{registration.customerId}</dd>
          <dt>Session ID</dt>
          <dd>{registration.sessionId}</dd>
          <dt>Membership Check ID</dt>
          <dd>{membershipCheck.membershipCheckId}</dd>
          <dt>Membership result / next step</dt>
          <dd>
            {membershipCheck.outcome} / {membershipCheck.nextStep}
          </dd>
          <dt>Deposit status</dt>
          <dd>{depositEvidence?.depositStatus ?? "MISSING"}</dd>
          <dt>Deposit reference</dt>
          <dd>{depositEvidence?.depositReference ?? "MISSING"}</dd>
          <dt>Confirmed at</dt>
          <dd>{depositEvidence?.confirmedAt ?? "NOT CONFIRMED"}</dd>
        </dl>
      </section>

      {!depositCheck && actorRole === "FINANCE" && (
        <section className="approval-package-card">
          <h2>Deposit Action</h2>
          <p>Deposit: NOT CHECKED</p>
          <Button onClick={runCheck}>Check Deposit</Button>
        </section>
      )}

      {!depositCheck && actorRole === "ADMIN" && (
        <section className="approval-package-card">
          <h2>ADMIN read-only projection</h2>
          <p>Deposit Check: NOT STARTED</p>
          <p>Only FINANCE may execute the Deposit Check command.</p>
        </section>
      )}

      {depositCheck && (
        <section className="approval-package-card">
          <div className="schedule-confirmation-title">
            <h2>Immutable Deposit Check Result</h2>
            <Badge
              tone={
                depositCheck.outcome === "SATISFIED"
                  ? "success"
                  : "warning"
              }
            >
              {depositCheck.outcome}
            </Badge>
          </div>
          <dl className="schedule-confirmation-evidence">
            <dt>Deposit Check ID / version</dt>
            <dd>
              {depositCheck.depositCheckId} / v{depositCheck.recordVersion}
            </dd>
            <dt>Outcome</dt>
            <dd>{depositCheck.outcome}</dd>
            <dt>Next Step</dt>
            <dd>{depositCheck.nextStep}</dd>
            <dt>Safe result</dt>
            <dd>{safeNextStep(depositCheck.nextStep)}</dd>
          </dl>
          <h3>Findings</h3>
          {depositCheck.findings.length === 0 ? (
            <p>No Deposit findings.</p>
          ) : (
            <ul>
              {depositCheck.findings.map((finding) => (
                <li key={finding.code}>
                  <strong>{finding.code}</strong>: {finding.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      <section className="approval-package-card">
        <h2>Deposit Boundary</h2>
        <p>Deposit evidence remains read-only and unchanged.</p>
        <p>Eligibility remains NOT EVALUATED.</p>
        <p>No payment confirmation, refund, approval, rejection, or Publication action occurs.</p>
      </section>
    </main>
  );
}
