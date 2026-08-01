import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button, ButtonLink } from "../../components/common/Button";
import { Badge } from "../../components/common/Badge";
import { BlockedState } from "../../components/feedback/States";
import {
  PROTOTYPE_CUSTOMER_REGISTRATION_MODEL,
  evaluateCustomerRegistrationEligibility,
  type CustomerRegistrationCommandResult,
  useAuctionCustomerRegistrationStore,
} from "../../store/auctionCustomerRegistrationStore";
import { useAuctionContentStore } from "../../store/auctionContentStore";
import { getRegistrationReadinessDeterministicNow } from "../../store/auctionRegistrationOpeningReadinessStore";
import { useAuctionRegistrationWindowStore } from "../../store/auctionRegistrationWindowStore";
import { useAuctionRegistrationValidationStore } from "../../store/auctionRegistrationValidationStore";
import { useAuctionMembershipCheckStore } from "../../store/auctionMembershipCheckStore";
import { useAuctionDepositCheckStore } from "../../store/auctionDepositCheckStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import { useDemoStore } from "../../store/demoStore";
import { CURRENT_CUSTOMER_ID } from "../../store/openingRequestStore";
import "../../styles/auction-schedule-confirmation.css";
import "../../styles/auction-approval-package.css";

const commandError = (
  result: Extract<CustomerRegistrationCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

export function AuctionCustomerRegistrationPage() {
  const { sessionId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const session = useAuctionSessionStore((state) =>
    state.sessions.find((item) => item.sessionId === sessionId),
  );
  const content = useAuctionContentStore((state) =>
    state.contents.find((item) => item.sessionId === sessionId),
  );
  const registrationWindow = useAuctionRegistrationWindowStore((state) =>
    state.registrationWindows.find((item) => item.sessionId === sessionId),
  );
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
  const createDraft = useAuctionCustomerRegistrationStore(
    (state) => state.createRegistrationDraft,
  );
  const saveDraft = useAuctionCustomerRegistrationStore(
    (state) => state.saveRegistrationDraft,
  );
  const submit = useAuctionCustomerRegistrationStore(
    (state) => state.submitRegistration,
  );
  const [rulesAccepted, setRulesAccepted] = useState(
    registration?.rulesAccepted ?? false,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (actorRole !== "CUSTOMER")
    return (
      <main className="schedule-confirmation-page">
        <h1>Auction Registration</h1>
        <BlockedState
          title="Unauthorized"
          description="Only the authenticated CUSTOMER may access Customer Registration."
        />
      </main>
    );

  if (!session)
    return (
      <main className="schedule-confirmation-page">
        <h1>Auction Registration</h1>
        <BlockedState
          title="Session not found"
          description="The requested dynamic Auction Session does not exist."
        />
      </main>
    );

  const now = getRegistrationReadinessDeterministicNow();
  const eligibility =
    registrationWindow &&
    evaluateCustomerRegistrationEligibility({
      sessionId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedSessionVersion: session.currentVersion,
      expectedRegistrationWindowId:
        registrationWindow.registrationWindowId,
      commandId: `CHECK_CUSTOMER_REGISTRATION:${sessionId}:${now}`,
    });

  const create = () => {
    if (!registrationWindow) return;
    setError("");
    setMessage("");
    const result = createDraft({
      sessionId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedSessionVersion: session.currentVersion,
      expectedRegistrationWindowId:
        registrationWindow.registrationWindowId,
      commandId: `CREATE_CUSTOMER_REGISTRATION:${sessionId}:${CURRENT_CUSTOMER_ID}`,
    });
    if (!result.ok) return setError(commandError(result));
    setMessage("Registration Draft created.");
  };

  const save = () => {
    if (!registration) return;
    setError("");
    setMessage("");
    const result = saveDraft({
      registrationId: registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedRegistrationVersion: registration.registrationVersion,
      rulesAccepted,
      commandId: `SAVE_CUSTOMER_REGISTRATION:${registration.registrationId}:v${registration.registrationVersion}:${rulesAccepted}`,
    });
    if (!result.ok) return setError(commandError(result));
    setMessage(
      result.changed ? "Registration Draft saved." : "Draft is unchanged.",
    );
  };

  const submitRegistration = () => {
    if (!registration || !registrationWindow) return;
    setError("");
    setMessage("");
    const result = submit({
      registrationId: registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedRegistrationVersion: registration.registrationVersion,
      expectedRegistrationWindowId:
        registrationWindow.registrationWindowId,
      commandId: `SUBMIT_CUSTOMER_REGISTRATION:${registration.registrationId}:v${registration.registrationVersion}`,
    });
    if (!result.ok) return setError(commandError(result));
    setMessage("Registration submitted.");
  };

  return (
    <main className="schedule-confirmation-page">
      <header className="approval-package-heading">
        <span>AUTHENTICATED DIRECT CUSTOMER ROUTE</span>
        <h1>Auction Registration</h1>
        <p>{PROTOTYPE_CUSTOMER_REGISTRATION_MODEL}</p>
      </header>

      <section className="approval-package-card" aria-labelledby="session-data">
        <h2 id="session-data">Session</h2>
        <dl className="schedule-confirmation-evidence">
          <dt>Session ID/code</dt>
          <dd>{session.sessionId}</dd>
          <dt>Auction title</dt>
          <dd>{content?.workingContent.auctionTitle || "Not available"}</dd>
          <dt>Registration closes</dt>
          <dd>
            {registrationWindow?.window.registrationCloseAt ??
              "Registration Window not open"}
          </dd>
          <dt>Customer identity</dt>
          <dd>{CURRENT_CUSTOMER_ID}</dd>
          <dt>Registration status/version</dt>
          <dd>
            {registration
              ? `${registration.status} / v${registration.registrationVersion}`
              : "NONE"}
          </dd>
          {registration?.submittedAt && (
            <>
              <dt>Submitted at</dt>
              <dd>{registration.submittedAt}</dd>
            </>
          )}
          {registration?.status === "SUBMITTED" && (
            <>
              <dt>Registration validation</dt>
              <dd>
                {!validation
                  ? "VALIDATION_NOT_STARTED"
                  : validation.nextStep}
              </dd>
            </>
          )}
        </dl>
      </section>

      {!registration && (
        <section className="approval-package-card">
          <h2>Create Registration Draft</h2>
          {!registrationWindow ? (
            <p role="alert">CUSTOMER_REGISTRATION_WINDOW_NOT_OPEN: Registration Window chưa được mở.</p>
          ) : eligibility && !eligibility.eligible ? (
            <p role="alert">{eligibility.code}: {eligibility.message}</p>
          ) : (
            <Button onClick={create}>Tạo Registration Draft</Button>
          )}
        </section>
      )}

      {registration && (
        <section className="approval-package-card">
          <div className="schedule-confirmation-title">
            <h2>Rules acceptance</h2>
            <Badge
              tone={registration.status === "SUBMITTED" ? "success" : "warning"}
            >
              {registration.status}
            </Badge>
          </div>
          <label>
            <input
              type="checkbox"
              checked={rulesAccepted}
              disabled={registration.status === "SUBMITTED"}
              onChange={(event) => setRulesAccepted(event.target.checked)}
            />{" "}
            I accept the Auction rules
          </label>
          {registration.status === "DRAFT" && (
            <div className="approval-package-actions">
              <Button variant="secondary" onClick={save}>
                Lưu Draft
              </Button>
              <Button
                onClick={submitRegistration}
                disabled={!rulesAccepted || !registration.rulesAccepted}
              >
                Gửi Registration
              </Button>
            </div>
          )}
        </section>
      )}

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      {validation?.nextStep === "CORRECTION_REQUIRED" && (
        <section className="approval-package-card">
          <h2>Registration correction</h2>
          <p>
            Validation requires a Customer-owned Correction Draft. The
            original submitted Registration remains immutable.
          </p>
          <ButtonLink
            to={`/customer/auctions/${sessionId}/registration/correction`}
          >
            Open Registration Correction
          </ButtonLink>
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

      <section className="approval-package-card">
        <h2>Submission boundary</h2>
        <p>Submitting Registration does not confirm eligibility.</p>
        {registration?.status === "SUBMITTED" && (
          <p>
            Validation projection:{" "}
            {!validation
              ? "VALIDATION_NOT_STARTED"
              : validation.nextStep}
            .
          </p>
        )}
        {membershipCheck ? (
          <>
            <p>Membership: {membershipCheck.outcome}.</p>
            <p>
              Deposit: {depositCheck ? depositCheck.outcome : "NOT CHECKED"}.
              Eligibility: NOT EVALUATED.
            </p>
          </>
        ) : (
          <p>Membership, Deposit, and Eligibility checks have not started.</p>
        )}
        <p>The Auction is not publicly published by this action.</p>
      </section>
    </main>
  );
}
