import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { BlockedState } from "../../components/feedback/States";
import { useAuctionCustomerRegistrationStore } from "../../store/auctionCustomerRegistrationStore";
import { useAuctionRegistrationCorrectionDraftStore } from "../../store/auctionRegistrationCorrectionDraftStore";
import {
  PROTOTYPE_REGISTRATION_REVALIDATION_MODEL,
  type RegistrationRevalidationCommandResult,
  useAuctionRegistrationRevalidationStore,
} from "../../store/auctionRegistrationRevalidationStore";
import { useAuctionRegistrationResubmissionStore } from "../../store/auctionRegistrationResubmissionStore";
import { useAuctionRegistrationValidationStore } from "../../store/auctionRegistrationValidationStore";
import { useDemoStore } from "../../store/demoStore";
import "../../styles/auction-schedule-confirmation.css";
import "../../styles/auction-approval-package.css";

const ADMIN_REVALIDATOR_ID =
  "admin.registration-revalidation@mock.local";

const commandError = (
  result: Extract<RegistrationRevalidationCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

const resultLabel = (
  outcome: "VALID" | "INVALID",
  correctability: "NOT_APPLICABLE" | "CORRECTABLE" | "BLOCKING",
) =>
  outcome === "VALID"
    ? "VALID"
    : correctability === "CORRECTABLE"
      ? "INVALID / CORRECTABLE"
      : "INVALID / BLOCKING";

const nextStepLabel = (
  nextStep:
    | "READY_FOR_MEMBERSHIP_CHECK"
    | "CORRECTION_REQUIRED_AGAIN"
    | "INVALID_BLOCKING",
) =>
  nextStep === "READY_FOR_MEMBERSHIP_CHECK"
    ? "Ready for Membership Check"
    : nextStep === "CORRECTION_REQUIRED_AGAIN"
      ? "Correction Required Again"
      : "Stopped";

export function AuctionRegistrationRevalidationPage() {
  const { resubmissionId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const resubmission = useAuctionRegistrationResubmissionStore((state) =>
    state.resubmissions.find(
      (item) => item.resubmissionId === resubmissionId,
    ),
  );
  const registration = useAuctionCustomerRegistrationStore((state) =>
    state.registrations.find(
      (item) => item.registrationId === resubmission?.registrationId,
    ),
  );
  const previousValidation = useAuctionRegistrationValidationStore(
    (state) =>
      state.validations.find(
        (item) =>
          item.validationId === resubmission?.previousValidationId,
      ),
  );
  const correctionDraft = useAuctionRegistrationCorrectionDraftStore(
    (state) =>
      state.correctionDrafts.find(
        (item) =>
          item.correctionDraftId === resubmission?.correctionDraftId,
      ),
  );
  const revalidation = useAuctionRegistrationRevalidationStore((state) =>
    state.revalidations.find(
      (item) => item.resubmissionId === resubmissionId,
    ),
  );
  const revalidate = useAuctionRegistrationRevalidationStore(
    (state) => state.revalidateCorrectedRegistration,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (actorRole !== "ADMIN")
    return (
      <main className="schedule-confirmation-page">
        <h1>Corrected Registration Revalidation</h1>
        <BlockedState
          title="Unauthorized"
          description="Only ADMIN can revalidate a corrected Registration."
        />
      </main>
    );

  if (
    !resubmission ||
    !registration ||
    !previousValidation ||
    !correctionDraft
  )
    return (
      <main className="schedule-confirmation-page">
        <h1>Corrected Registration Revalidation</h1>
        <BlockedState
          title="Revalidation unavailable"
          description="The complete corrected Registration source chain is required."
        />
      </main>
    );

  const runRevalidation = () => {
    setMessage("");
    setError("");
    const result = revalidate({
      resubmissionId: resubmission.resubmissionId,
      actorId: ADMIN_REVALIDATOR_ID,
      actorRole,
      expectedRegistrationId: registration.registrationId,
      expectedPreviousValidationId: previousValidation.validationId,
      expectedCorrectionDraftId: correctionDraft.correctionDraftId,
      expectedCorrectionDraftVersion:
        correctionDraft.correctionVersion,
      commandId: `REVALIDATE_CORRECTED_REGISTRATION:${resubmission.resubmissionId}:v${resubmission.recordVersion}`,
    });
    if (!result.ok) return setError(commandError(result));
    setMessage(
      result.created
        ? "Corrected Registration Revalidation Record created."
        : "Existing Revalidation Record returned.",
    );
  };

  return (
    <main className="schedule-confirmation-page">
      <header className="approval-package-heading">
        <span>ADMIN · DETERMINISTIC REVALIDATION</span>
        <h1>Corrected Registration Revalidation</h1>
        <p>{PROTOTYPE_REGISTRATION_REVALIDATION_MODEL}</p>
      </header>

      <section className="approval-package-card">
        <h2>Immutable Corrected Registration Evidence</h2>
        <dl className="schedule-confirmation-evidence">
          <dt>Registration ID</dt>
          <dd>{registration.registrationId}</dd>
          <dt>Previous Validation ID</dt>
          <dd>{previousValidation.validationId}</dd>
          <dt>Correction Draft ID / version</dt>
          <dd>
            {correctionDraft.correctionDraftId} / v
            {correctionDraft.correctionVersion}
          </dd>
          <dt>Resubmission ID / version</dt>
          <dd>
            {resubmission.resubmissionId} / v
            {resubmission.recordVersion}
          </dd>
          <dt>Customer ID</dt>
          <dd>{resubmission.customerId}</dd>
          <dt>Session ID</dt>
          <dd>{resubmission.sessionId}</dd>
          <dt>Corrected rules accepted</dt>
          <dd>
            {resubmission.correctedEvidence.rulesAccepted ? "YES" : "NO"}
          </dd>
          <dt>Corrected rules accepted at</dt>
          <dd>{resubmission.correctedEvidence.rulesAcceptedAt}</dd>
          <dt>Resubmitted at</dt>
          <dd>{resubmission.submittedAt}</dd>
        </dl>
      </section>

      {!revalidation && (
        <section className="approval-package-card">
          <h2>Revalidation Action</h2>
          <p>Revalidation: NOT STARTED</p>
          <Button onClick={runRevalidation}>
            Revalidate Corrected Registration
          </Button>
        </section>
      )}

      {revalidation && (
        <section className="approval-package-card">
          <div className="schedule-confirmation-title">
            <h2>Immutable Revalidation Result</h2>
            <Badge
              tone={
                revalidation.outcome === "VALID" ? "success" : "warning"
              }
            >
              {resultLabel(
                revalidation.outcome,
                revalidation.correctability,
              )}
            </Badge>
          </div>
          <dl className="schedule-confirmation-evidence">
            <dt>Revalidation ID / version</dt>
            <dd>
              {revalidation.revalidationId} / v
              {revalidation.recordVersion}
            </dd>
            <dt>Outcome</dt>
            <dd>{revalidation.outcome}</dd>
            <dt>Correctability</dt>
            <dd>{revalidation.correctability}</dd>
            <dt>Next Step</dt>
            <dd>{revalidation.nextStep}</dd>
            <dt>Safe result</dt>
            <dd>{nextStepLabel(revalidation.nextStep)}</dd>
          </dl>
          <h3>Findings</h3>
          {revalidation.findings.length === 0 ? (
            <p>No revalidation findings.</p>
          ) : (
            <ul>
              {revalidation.findings.map((finding) => (
                <li key={finding.code}>
                  <strong>{finding.code}</strong> — {finding.severity}:{" "}
                  {finding.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      <section className="approval-package-card">
        <h2>Revalidation Boundary</h2>
        <p>All Registration source records remain unchanged.</p>
        <p>Membership and Deposit checks remain NOT STARTED.</p>
        <p>Eligibility remains NOT EVALUATED.</p>
        <p>No correction, resubmission, approval, rejection, or Publication action occurs.</p>
      </section>
    </main>
  );
}
