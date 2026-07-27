import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { BlockedState } from "../../components/feedback/States";
import {
  PROTOTYPE_MEMBERSHIP_EVIDENCE,
  resolveFinalRegistrationValidationSource,
  type MembershipCheckCommandResult,
  useAuctionMembershipCheckStore,
} from "../../store/auctionMembershipCheckStore";
import { useAuctionCustomerRegistrationStore } from "../../store/auctionCustomerRegistrationStore";
import { getCustomerMembershipEvidence } from "../../services/membershipAccountReference";
import { useDemoStore } from "../../store/demoStore";
import "../../styles/auction-schedule-confirmation.css";
import "../../styles/auction-approval-package.css";

const ADMIN_MEMBERSHIP_CHECKER_ID =
  "admin.membership-check@mock.local";

const commandError = (
  result: Extract<MembershipCheckCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

const safeNextStep = (
  nextStep:
    | "READY_FOR_DEPOSIT_CHECK"
    | "MEMBERSHIP_INELIGIBLE"
    | "MEMBERSHIP_REVIEW_REQUIRED",
) =>
  nextStep === "READY_FOR_DEPOSIT_CHECK"
    ? "Ready for Deposit Check"
    : nextStep === "MEMBERSHIP_INELIGIBLE"
      ? "Membership Ineligible"
      : "Membership Review Required";

export function AuctionMembershipCheckPage() {
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
  const checkMembership = useAuctionMembershipCheckStore(
    (state) => state.checkCustomerMembership,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (actorRole !== "ADMIN")
    return (
      <main className="schedule-confirmation-page">
        <h1>Customer Membership Check</h1>
        <BlockedState
          title="Unauthorized"
          description="Only ADMIN can run Customer Membership Check."
        />
      </main>
    );

  if (!registration)
    return (
      <main className="schedule-confirmation-page">
        <h1>Customer Membership Check</h1>
        <BlockedState
          title="Registration not found"
          description="The submitted Customer Registration does not exist."
        />
      </main>
    );

  const finalValidation = resolveFinalRegistrationValidationSource(
    registration.registrationId,
  );
  const membershipEvidence = getCustomerMembershipEvidence(
    registration.customerId,
  );

  const runCheck = () => {
    if (!finalValidation.ok) return;
    setMessage("");
    setError("");
    const result = checkMembership({
      registrationId: registration.registrationId,
      actorId: ADMIN_MEMBERSHIP_CHECKER_ID,
      actorRole,
      expectedValidationSourceType:
        finalValidation.finalValidation.sourceType,
      expectedValidationSourceId:
        finalValidation.finalValidation.sourceId,
      commandId: `CHECK_CUSTOMER_MEMBERSHIP:${registration.registrationId}:${finalValidation.finalValidation.sourceId}`,
    });
    if (!result.ok) return setError(commandError(result));
    setMessage(
      result.created
        ? "Immutable Membership Check Record created."
        : "Existing Membership Check Record returned.",
    );
  };

  return (
    <main className="schedule-confirmation-page">
      <header className="approval-package-heading">
        <span>ADMIN · READ-ONLY MEMBERSHIP CHECK</span>
        <h1>Customer Membership Check</h1>
        <p>{PROTOTYPE_MEMBERSHIP_EVIDENCE}</p>
      </header>

      <section className="approval-package-card">
        <h2>Membership Check Sources</h2>
        <dl className="schedule-confirmation-evidence">
          <dt>Registration ID</dt>
          <dd>{registration.registrationId}</dd>
          <dt>Customer ID</dt>
          <dd>{registration.customerId}</dd>
          <dt>Session ID</dt>
          <dd>{registration.sessionId}</dd>
          <dt>Validation source type</dt>
          <dd>
            {finalValidation.ok
              ? finalValidation.finalValidation.sourceType
              : "NOT AVAILABLE"}
          </dd>
          <dt>Validation source ID</dt>
          <dd>
            {finalValidation.ok
              ? finalValidation.finalValidation.sourceId
              : "NOT AVAILABLE"}
          </dd>
          <dt>Membership ID</dt>
          <dd>{membershipEvidence?.membershipId ?? "MISSING"}</dd>
          <dt>Membership status</dt>
          <dd>{membershipEvidence?.membershipStatus ?? "MISSING"}</dd>
          <dt>Membership valid until</dt>
          <dd>{membershipEvidence?.membershipValidUntil ?? "NOT PROVIDED"}</dd>
        </dl>
      </section>

      {!membershipCheck && finalValidation.ok && (
        <section className="approval-package-card">
          <h2>Membership Action</h2>
          <p>Membership: NOT CHECKED</p>
          <Button onClick={runCheck}>Check Membership</Button>
        </section>
      )}

      {!membershipCheck && !finalValidation.ok && (
        <p role="alert">
          {finalValidation.code}: {finalValidation.message}
        </p>
      )}

      {membershipCheck && (
        <section className="approval-package-card">
          <div className="schedule-confirmation-title">
            <h2>Immutable Membership Check Result</h2>
            <Badge
              tone={
                membershipCheck.outcome === "VALID"
                  ? "success"
                  : "warning"
              }
            >
              {membershipCheck.outcome}
            </Badge>
          </div>
          <dl className="schedule-confirmation-evidence">
            <dt>Membership Check ID / version</dt>
            <dd>
              {membershipCheck.membershipCheckId} / v
              {membershipCheck.recordVersion}
            </dd>
            <dt>Outcome</dt>
            <dd>{membershipCheck.outcome}</dd>
            <dt>Next Step</dt>
            <dd>{membershipCheck.nextStep}</dd>
            <dt>Safe result</dt>
            <dd>{safeNextStep(membershipCheck.nextStep)}</dd>
          </dl>
          <h3>Findings</h3>
          {membershipCheck.findings.length === 0 ? (
            <p>No Membership findings.</p>
          ) : (
            <ul>
              {membershipCheck.findings.map((finding) => (
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
        <h2>Membership Boundary</h2>
        <p>Membership evidence remains read-only and unchanged.</p>
        <p>Deposit remains NOT CHECKED.</p>
        <p>Eligibility remains NOT EVALUATED.</p>
        <p>No activation, renewal, approval, rejection, or Publication action occurs.</p>
      </section>
    </main>
  );
}
