import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { BlockedState } from "../../components/feedback/States";
import { useAuctionCustomerRegistrationStore } from "../../store/auctionCustomerRegistrationStore";
import {
  PROTOTYPE_REGISTRATION_CORRECTION_MODEL,
  evaluateRegistrationCorrectionEligibility,
  type RegistrationCorrectionCommandResult,
  useAuctionRegistrationCorrectionDraftStore,
} from "../../store/auctionRegistrationCorrectionDraftStore";
import {
  PROTOTYPE_REGISTRATION_RESUBMISSION_POLICY,
  evaluateRegistrationResubmissionEligibility,
  type RegistrationResubmissionCommandResult,
  useAuctionRegistrationResubmissionStore,
} from "../../store/auctionRegistrationResubmissionStore";
import { useAuctionRegistrationRevalidationStore } from "../../store/auctionRegistrationRevalidationStore";
import { useAuctionMembershipCheckStore } from "../../store/auctionMembershipCheckStore";
import { useAuctionDepositCheckStore } from "../../store/auctionDepositCheckStore";
import { useAuctionRegistrationValidationStore } from "../../store/auctionRegistrationValidationStore";
import { useDemoStore } from "../../store/demoStore";
import { CURRENT_CUSTOMER_ID } from "../../store/openingRequestStore";
import "../../styles/auction-schedule-confirmation.css";
import "../../styles/auction-approval-package.css";

const correctionError = (
  result: Extract<RegistrationCorrectionCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

const resubmissionError = (
  result: Extract<RegistrationResubmissionCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

export function AuctionRegistrationCorrectionPage() {
  const { sessionId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const registration = useAuctionCustomerRegistrationStore((state) =>
    state.registrations.find(
      (item) =>
        item.sessionId === sessionId &&
        item.customerId === CURRENT_CUSTOMER_ID,
    ),
  );
  const validation = useAuctionRegistrationValidationStore((state) =>
    state.validations.find(
      (item) =>
        item.registrationId === registration?.registrationId &&
        item.customerId === CURRENT_CUSTOMER_ID,
    ),
  );
  const correctionDraft = useAuctionRegistrationCorrectionDraftStore(
    (state) =>
      state.correctionDrafts.find(
        (item) =>
          item.registrationId === registration?.registrationId &&
          item.customerId === CURRENT_CUSTOMER_ID,
      ),
  );
  const resubmission = useAuctionRegistrationResubmissionStore((state) =>
    state.resubmissions.find(
      (item) =>
        item.registrationId === registration?.registrationId &&
        item.customerId === CURRENT_CUSTOMER_ID,
    ),
  );
  const revalidation = useAuctionRegistrationRevalidationStore((state) =>
    state.revalidations.find(
      (item) =>
        item.resubmissionId === resubmission?.resubmissionId &&
        item.customerId === CURRENT_CUSTOMER_ID,
    ),
  );
  const membershipCheck = useAuctionMembershipCheckStore((state) =>
    state.membershipChecks.find(
      (item) =>
        item.registrationId === registration?.registrationId &&
        item.customerId === CURRENT_CUSTOMER_ID,
    ),
  );
  const depositCheck = useAuctionDepositCheckStore((state) =>
    state.depositChecks.find(
      (item) =>
        item.registrationId === registration?.registrationId &&
        item.customerId === CURRENT_CUSTOMER_ID,
    ),
  );
  const createDraft = useAuctionRegistrationCorrectionDraftStore(
    (state) => state.createRegistrationCorrectionDraft,
  );
  const saveDraft = useAuctionRegistrationCorrectionDraftStore(
    (state) => state.saveRegistrationCorrectionDraft,
  );
  const resubmitCorrectedRegistration =
    useAuctionRegistrationResubmissionStore(
      (state) => state.resubmitCorrectedRegistration,
    );
  const [rulesAccepted, setRulesAccepted] = useState(
    correctionDraft?.rulesAccepted ?? registration?.rulesAccepted ?? false,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  if (actorRole !== "CUSTOMER")
    return (
      <main className="schedule-confirmation-page">
        <h1>Registration Correction Draft</h1>
        <BlockedState
          title="Unauthorized"
          description="Only the owning CUSTOMER can access Registration correction."
        />
      </main>
    );

  if (!registration || !validation)
    return (
      <main className="schedule-confirmation-page">
        <h1>Registration Correction Draft</h1>
        <BlockedState
          title="Correction unavailable"
          description="A submitted owned Registration and Validation Record are required."
        />
      </main>
    );

  const correctionEligibility =
    evaluateRegistrationCorrectionEligibility({
      registrationId: registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedRegistrationVersion: registration.registrationVersion,
      expectedValidationId: validation.validationId,
      commandId: `CHECK_REGISTRATION_CORRECTION:${registration.registrationId}`,
    });

  const resubmissionEligibility = correctionDraft
    ? evaluateRegistrationResubmissionEligibility({
        registrationId: registration.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole,
        expectedRegistrationVersion: registration.registrationVersion,
        expectedValidationId: validation.validationId,
        expectedCorrectionDraftId: correctionDraft.correctionDraftId,
        expectedCorrectionDraftVersion:
          correctionDraft.correctionVersion,
        commandId: `CHECK_REGISTRATION_RESUBMISSION:${registration.registrationId}`,
      })
    : undefined;

  const create = () => {
    setError("");
    setMessage("");
    const result = createDraft({
      registrationId: registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedRegistrationVersion: registration.registrationVersion,
      expectedValidationId: validation.validationId,
      commandId: `CREATE_REGISTRATION_CORRECTION:${registration.registrationId}:v${registration.registrationVersion}`,
    });
    if (!result.ok) return setError(correctionError(result));
    setRulesAccepted(result.correctionDraft.rulesAccepted);
    setMessage("Correction Draft created.");
  };

  const save = () => {
    if (!correctionDraft || resubmission) return;
    setError("");
    setMessage("");
    const result = saveDraft({
      correctionDraftId: correctionDraft.correctionDraftId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedCorrectionVersion: correctionDraft.correctionVersion,
      rulesAccepted,
      commandId: `SAVE_REGISTRATION_CORRECTION:${correctionDraft.correctionDraftId}:v${correctionDraft.correctionVersion}:${rulesAccepted}`,
    });
    if (!result.ok) return setError(correctionError(result));
    setMessage(
      result.changed
        ? "Correction Draft saved."
        : "Correction Draft is unchanged.",
    );
  };

  const resubmit = () => {
    if (!correctionDraft) return;
    setError("");
    setMessage("");
    const result = resubmitCorrectedRegistration({
      registrationId: registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedRegistrationVersion: registration.registrationVersion,
      expectedValidationId: validation.validationId,
      expectedCorrectionDraftId: correctionDraft.correctionDraftId,
      expectedCorrectionDraftVersion:
        correctionDraft.correctionVersion,
      commandId: `RESUBMIT_CORRECTED_REGISTRATION:${registration.registrationId}:draft-v${correctionDraft.correctionVersion}`,
    });
    if (!result.ok) return setError(resubmissionError(result));
    setConfirmationOpen(false);
    setMessage(
      result.created
        ? "Corrected Registration resubmitted."
        : "Corrected Resubmission already recorded.",
    );
  };

  return (
    <main className="schedule-confirmation-page">
      <header className="approval-package-heading">
        <span>AUTHENTICATED CUSTOMER · CORRECTION AND RESUBMISSION</span>
        <h1>Registration Correction Draft</h1>
        <p>{PROTOTYPE_REGISTRATION_CORRECTION_MODEL}</p>
      </header>

      <section
        className="approval-package-card"
        aria-labelledby="correction-source"
      >
        <div className="schedule-confirmation-title">
          <h2 id="correction-source">Immutable Source Evidence</h2>
          <Badge tone="warning">CORRECTION REQUIRED</Badge>
        </div>
        <dl className="schedule-confirmation-evidence">
          <dt>Original Registration ID / version</dt>
          <dd>
            {registration.registrationId} / v
            {registration.registrationVersion}
          </dd>
          <dt>Original Registration status</dt>
          <dd>{registration.status}</dd>
          <dt>Validation result</dt>
          <dd>
            {validation.outcome} / {validation.correctability} /{" "}
            {validation.nextStep}
          </dd>
          <dt>Validation ID</dt>
          <dd>{validation.validationId}</dd>
          <dt>Customer identity</dt>
          <dd>{CURRENT_CUSTOMER_ID}</dd>
          <dt>Correction Draft status / version</dt>
          <dd>
            {correctionDraft
              ? `${correctionDraft.status} / v${correctionDraft.correctionVersion}`
              : "NOT CREATED"}
          </dd>
        </dl>
        <h3>Correctable findings</h3>
        <ul>
          {validation.findings.map((item) => (
            <li key={item.code}>
              <strong>{item.code}</strong>: {item.message}
            </li>
          ))}
        </ul>
      </section>

      {!correctionDraft && !correctionEligibility.eligible && (
        <section className="approval-package-card">
          <h2>Correction blocked</h2>
          <p role="alert">
            {correctionEligibility.code}: {correctionEligibility.message}
          </p>
        </section>
      )}

      {!correctionDraft && correctionEligibility.eligible && (
        <section className="approval-package-card">
          <h2>Create Correction Draft</h2>
          <Button onClick={create}>Create Correction Draft</Button>
        </section>
      )}

      {correctionDraft && (
        <section className="approval-package-card">
          <h2>Supported correction data</h2>
          <label>
            <input
              type="checkbox"
              checked={rulesAccepted}
              disabled={Boolean(resubmission)}
              onChange={(event) => setRulesAccepted(event.target.checked)}
            />{" "}
            I accept the Auction rules
          </label>
          {!resubmission && (
            <div className="approval-package-actions">
              <Button onClick={save}>Save Correction Draft</Button>
            </div>
          )}
        </section>
      )}

      {correctionDraft &&
        !resubmission &&
        resubmissionEligibility?.eligible && (
          <section className="approval-package-card">
            <h2>Corrected Resubmission</h2>
            <p>Correction Draft: {correctionDraft.status}</p>
            <p>Resubmission: NOT STARTED</p>
            <Button onClick={() => setConfirmationOpen(true)}>
              Resubmit Corrected Registration
            </Button>
          </section>
        )}

      {correctionDraft &&
        !resubmission &&
        resubmissionEligibility &&
        !resubmissionEligibility.eligible &&
        correctionDraft.rulesAccepted && (
          <p role="alert">
            {resubmissionEligibility.code}:{" "}
            {resubmissionEligibility.message}
          </p>
        )}

      {resubmission && (
        <section className="approval-package-card">
          <h2>Resubmission outcome</h2>
          <dl className="schedule-confirmation-evidence">
            <dt>Original Registration</dt>
            <dd>{registration.status}</dd>
            <dt>Previous Validation</dt>
            <dd>{validation.nextStep}</dd>
            <dt>Correction Draft</dt>
            <dd>{correctionDraft?.status ?? "NOT CREATED"}</dd>
            <dt>Corrected Resubmission</dt>
            <dd>{resubmission.status}</dd>
            <dt>Next Step</dt>
            <dd>{resubmission.nextStep}</dd>
            <dt>Membership</dt>
            <dd>NOT CHECKED</dd>
            <dt>Deposit</dt>
            <dd>NOT CHECKED</dd>
            <dt>Eligibility</dt>
            <dd>NOT EVALUATED</dd>
          </dl>
        </section>
      )}

      {revalidation && (
        <section className="approval-package-card">
          <h2>Customer-safe Revalidation Result</h2>
          <dl className="schedule-confirmation-evidence">
            <dt>Revalidation</dt>
            <dd>{revalidation.outcome}</dd>
            <dt>Next Step</dt>
            <dd>{revalidation.nextStep}</dd>
            <dt>Safe result</dt>
            <dd>
              {revalidation.nextStep === "READY_FOR_MEMBERSHIP_CHECK"
                ? "Ready for Membership Check"
                : revalidation.nextStep === "CORRECTION_REQUIRED_AGAIN"
                  ? "Correction Required Again"
                  : "Stopped"}
            </dd>
          </dl>
        </section>
      )}

      {membershipCheck && (
        <section className="approval-package-card">
          <h2>Customer-safe Membership Result</h2>
          <dl className="schedule-confirmation-evidence">
            <dt>Membership outcome</dt>
            <dd>{membershipCheck.outcome}</dd>
            <dt>Next Step</dt>
            <dd>{membershipCheck.nextStep}</dd>
            <dt>Safe result</dt>
            <dd>
              {membershipCheck.nextStep === "READY_FOR_DEPOSIT_CHECK"
                ? "Ready for Deposit Check"
                : membershipCheck.nextStep === "MEMBERSHIP_INELIGIBLE"
                  ? "Membership Ineligible"
                  : "Membership Review Required"}
            </dd>
          </dl>
        </section>
      )}

      {depositCheck && (
        <section className="approval-package-card">
          <h2>Customer-safe Deposit Result</h2>
          <dl className="schedule-confirmation-evidence">
            <dt>Deposit outcome</dt>
            <dd>{depositCheck.outcome}</dd>
            <dt>Next Step</dt>
            <dd>{depositCheck.nextStep}</dd>
            <dt>Safe result</dt>
            <dd>
              {depositCheck.nextStep ===
              "READY_FOR_ELIGIBILITY_EVALUATION"
                ? "Ready for Eligibility Evaluation"
                : depositCheck.nextStep === "DEPOSIT_NOT_SATISFIED"
                  ? "Deposit Not Satisfied"
                  : "Deposit Review Required"}
            </dd>
          </dl>
        </section>
      )}

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      <section className="approval-package-card">
        <h2>Correction boundary</h2>
        {!resubmission && <p>This saves a correction draft only.</p>}
        <p>The original submitted Registration remains unchanged.</p>
        {!resubmission && <p>Resubmission has not started.</p>}
        <p>Membership, Deposit, and Eligibility processing has not started.</p>
      </section>

      <Dialog
        open={confirmationOpen}
        onOpenChange={setConfirmationOpen}
        title="Confirm Corrected Registration Resubmission"
        description={PROTOTYPE_REGISTRATION_RESUBMISSION_POLICY}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmationOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={resubmit}>
              Confirm Resubmission
            </Button>
          </>
        }
      >
        <dl className="schedule-confirmation-evidence">
          <dt>Original Registration ID / version</dt>
          <dd>
            {registration.registrationId} / v
            {registration.registrationVersion}
          </dd>
          <dt>Previous Validation ID</dt>
          <dd>{validation.validationId}</dd>
          <dt>Correction Draft ID / version</dt>
          <dd>
            {correctionDraft?.correctionDraftId ?? "NOT CREATED"} / v
            {correctionDraft?.correctionVersion ?? 0}
          </dd>
          <dt>Corrected rules acceptance</dt>
          <dd>
            {correctionDraft?.rulesAccepted ? "ACCEPTED" : "NOT ACCEPTED"}
          </dd>
          <dt>Customer identity</dt>
          <dd>{CURRENT_CUSTOMER_ID}</dd>
        </dl>
        <p>This creates a corrected Resubmission Record.</p>
        <p>
          The original Registration and previous Validation remain unchanged.
        </p>
        <p>Membership, Deposit, and Eligibility checks do not start.</p>
      </Dialog>
    </main>
  );
}
