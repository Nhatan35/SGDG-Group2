import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { BlockedState } from "../../components/feedback/States";
import { useAuctionCustomerRegistrationStore } from "../../store/auctionCustomerRegistrationStore";
import { useAuctionRegistrationWindowStore } from "../../store/auctionRegistrationWindowStore";
import {
  PROTOTYPE_REGISTRATION_VALIDATION_MODEL,
  getCustomerRegistrationSubmissionRecordId,
  type ValidateCustomerRegistrationResult,
  useAuctionRegistrationValidationStore,
} from "../../store/auctionRegistrationValidationStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import { useDemoStore } from "../../store/demoStore";
import "../../styles/auction-schedule-confirmation.css";
import "../../styles/auction-approval-package.css";

const ADMIN_VALIDATOR_ID = "admin.registration-validation@mock.local";

const resultLabel = (
  outcome: "VALID" | "INVALID",
  correctability: "NOT_APPLICABLE" | "CORRECTABLE" | "BLOCKING",
) => {
  if (outcome === "VALID") return "VALID";
  return correctability === "CORRECTABLE"
    ? "INVALID — CORRECTABLE"
    : "INVALID — BLOCKING";
};

const nextStepLabel = (
  nextStep:
    | "READY_FOR_MEMBERSHIP_CHECK"
    | "CORRECTION_REQUIRED"
    | "INVALID_BLOCKING",
) => {
  if (nextStep === "READY_FOR_MEMBERSHIP_CHECK")
    return "Ready for Membership Check";
  if (nextStep === "CORRECTION_REQUIRED") return "Correction Required";
  return "Invalid — Blocking Issue";
};

const commandError = (
  result: Extract<ValidateCustomerRegistrationResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

export function AuctionRegistrationValidationPage() {
  const { registrationId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const registration = useAuctionCustomerRegistrationStore((state) =>
    state.registrations.find(
      (item) => item.registrationId === registrationId,
    ),
  );
  const registrationWindow = useAuctionRegistrationWindowStore((state) =>
    state.registrationWindows.find(
      (item) =>
        item.registrationWindowId === registration?.registrationWindowId,
    ),
  );
  const session = useAuctionSessionStore((state) =>
    state.sessions.find((item) => item.sessionId === registration?.sessionId),
  );
  const validation = useAuctionRegistrationValidationStore((state) =>
    state.validations.find(
      (item) => item.registrationId === registrationId,
    ),
  );
  const validate = useAuctionRegistrationValidationStore(
    (state) => state.validateCustomerRegistration,
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (actorRole !== "ADMIN")
    return (
      <main className="schedule-confirmation-page">
        <h1>Registration Validation</h1>
        <BlockedState
          title="Unauthorized"
          description="Only ADMIN can validate a submitted Customer Registration."
        />
      </main>
    );

  if (!registration)
    return (
      <main className="schedule-confirmation-page">
        <h1>Registration Validation</h1>
        <BlockedState
          title="Registration not found"
          description="The requested submitted Customer Registration does not exist."
        />
      </main>
    );

  const runValidation = () => {
    setError("");
    setMessage("");
    const result = validate({
      registrationId: registration.registrationId,
      actorId: ADMIN_VALIDATOR_ID,
      actorRole,
      expectedRegistrationVersion: registration.registrationVersion,
      expectedSubmissionRecordId:
        getCustomerRegistrationSubmissionRecordId(
          registration.registrationId,
        ),
      commandId: `VALIDATE_CUSTOMER_REGISTRATION:${registration.registrationId}:v${registration.registrationVersion}`,
    });
    if (!result.ok) return setError(commandError(result));
    setMessage(
      result.created
        ? "Registration Validation Record created."
        : "Existing Registration Validation Record returned.",
    );
  };

  return (
    <main className="schedule-confirmation-page">
      <header className="approval-package-heading">
        <span>ADMIN · DETERMINISTIC SYSTEM VALIDATION</span>
        <h1>Registration Validation</h1>
        <p>{PROTOTYPE_REGISTRATION_VALIDATION_MODEL}</p>
      </header>

      <section className="approval-package-card" aria-labelledby="registration-evidence">
        <div className="schedule-confirmation-title">
          <h2 id="registration-evidence">Submitted Registration Evidence</h2>
          <Badge tone={registration.status === "SUBMITTED" ? "success" : "warning"}>
            {registration.status}
          </Badge>
        </div>
        <dl className="schedule-confirmation-evidence">
          <dt>Registration ID / version / status</dt>
          <dd>
            {registration.registrationId} / v{registration.registrationVersion} /{" "}
            {registration.status}
          </dd>
          <dt>Submission Record</dt>
          <dd>
            {getCustomerRegistrationSubmissionRecordId(
              registration.registrationId,
            )}
          </dd>
          <dt>Customer ID</dt>
          <dd>{registration.customerId}</dd>
          <dt>Session ID</dt>
          <dd>{registration.sessionId}</dd>
          <dt>Session state</dt>
          <dd>
            {session?.lifecycleStatus ?? "MISSING"} /{" "}
            {session?.publicationStatus ?? "MISSING"}
          </dd>
          <dt>Registration Window</dt>
          <dd>{registration.registrationWindowId}</dd>
          <dt>Confirmed window</dt>
          <dd>
            {registrationWindow
              ? `${registrationWindow.window.registrationOpenAt} ≤ submittedAt < ${registrationWindow.window.registrationCloseAt}`
              : "MISSING"}
          </dd>
          <dt>submittedAt</dt>
          <dd>{registration.submittedAt ?? "MISSING"}</dd>
          <dt>Rules accepted</dt>
          <dd>{registration.rulesAccepted ? "YES" : "NO"}</dd>
          <dt>Rules accepted at</dt>
          <dd>{registration.rulesAcceptedAt ?? "MISSING"}</dd>
        </dl>
      </section>

      {!validation && (
        <section className="approval-package-card">
          <h2>Validation Action</h2>
          <p>
            Registration Validation: NOT STARTED. This action evaluates
            immutable submitted evidence only.
          </p>
          {registration.status === "SUBMITTED" ? (
            <Button onClick={runValidation}>Validate Registration</Button>
          ) : (
            <p role="alert">
              REGISTRATION_NOT_SUBMITTED: Only a SUBMITTED Registration can be
              validated.
            </p>
          )}
        </section>
      )}

      {validation && (
        <section className="approval-package-card" aria-labelledby="validation-result">
          <div className="schedule-confirmation-title">
            <h2 id="validation-result">Immutable Validation Result</h2>
            <Badge tone={validation.outcome === "VALID" ? "success" : "warning"}>
              {resultLabel(
                validation.outcome,
                validation.correctability,
              )}
            </Badge>
          </div>
          <dl className="schedule-confirmation-evidence">
            <dt>Validation ID / record version</dt>
            <dd>
              {validation.validationId} / v{validation.recordVersion}
            </dd>
            <dt>Result</dt>
            <dd>
              {resultLabel(
                validation.outcome,
                validation.correctability,
              )}
            </dd>
            <dt>Correctability</dt>
            <dd>{validation.correctability}</dd>
            <dt>Next step</dt>
            <dd>{nextStepLabel(validation.nextStep)}</dd>
            <dt>Validated by / at</dt>
            <dd>
              {validation.validatedBy} / {validation.validatedAt}
            </dd>
          </dl>
          <h3>Validation findings</h3>
          {validation.findings.length === 0 ? (
            <p>No validation findings.</p>
          ) : (
            <ul>
              {validation.findings.map((item) => (
                <li key={item.code}>
                  <strong>{item.code}</strong> — {item.severity}: {item.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      <section className="approval-package-card">
        <h2>Validation Boundary</h2>
        <p>Registration remains SUBMITTED and immutable.</p>
        <p>Membership and Deposit checks remain NOT STARTED.</p>
        <p>Eligibility remains NOT EVALUATED.</p>
        <p>No correction, approval, rejection, or Publication action occurs.</p>
      </section>
    </main>
  );
}
