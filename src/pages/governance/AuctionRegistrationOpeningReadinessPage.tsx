import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { BlockedState } from "../../components/feedback/States";
import {
  CONFIRMED_SCHEDULE_REQUIRED_MESSAGE,
  REGISTRATION_CONFIGURATION_BLOCKER_MESSAGE,
  REGISTRATION_READINESS_BLOCKED_BY_CONFIGURATION,
  REGISTRATION_READINESS_REQUIRES_CONFIRMED_SCHEDULE,
  getRegistrationReadinessDeterministicNow,
  type RegistrationReadinessCommandResult,
  useAuctionRegistrationOpeningReadinessStore,
} from "../../store/auctionRegistrationOpeningReadinessStore";
import {
  getApprovalDecisionEvidenceValidity,
  useAuctionApprovalDecisionStore,
} from "../../store/auctionApprovalDecisionStore";
import {
  getConfirmedScheduleEvidenceValidity,
  useAuctionConfirmedScheduleStore,
} from "../../store/auctionConfirmedScheduleStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import { useDemoStore } from "../../store/demoStore";
import {
  PROTOTYPE_MANUAL_REGISTRATION_OPENING_POLICY,
  READY_ASSESSMENT_REQUIRED_MESSAGE,
  REGISTRATION_OPEN_BLOCKED_BY_CONFIGURATION,
  REGISTRATION_OPEN_REQUIRES_READY_ASSESSMENT,
  getOpenRegistrationWindowValidity,
  type OpenRegistrationWindowResult,
  useAuctionRegistrationWindowStore,
} from "../../store/auctionRegistrationWindowStore";
import "../../styles/auction-approval-package.css";
import "../../styles/auction-schedule-confirmation.css";

const ADMIN_ID = "admin.registration-readiness@mock.local";
const resultError = (
  result: Extract<RegistrationReadinessCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;
const openingError = (
  result: Extract<OpenRegistrationWindowResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

export function AuctionRegistrationOpeningReadinessPage() {
  const { sessionId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const session = useAuctionSessionStore((state) =>
    state.sessions.find((item) => item.sessionId === sessionId),
  );
  const confirmed = useAuctionConfirmedScheduleStore((state) =>
    state.confirmedSchedules.find((item) => item.sessionId === sessionId),
  );
  const decision = useAuctionApprovalDecisionStore((state) =>
    state.decisions.find(
      (item) => item.decisionId === confirmed?.approvalDecisionId,
    ),
  );
  const assessment = useAuctionRegistrationOpeningReadinessStore((state) =>
    state.assessments.find((item) => item.sessionId === sessionId),
  );
  const assess = useAuctionRegistrationOpeningReadinessStore(
    (state) => state.assessRegistrationOpeningReadiness,
  );
  const registrationWindow = useAuctionRegistrationWindowStore((state) =>
    state.registrationWindows.find((item) => item.sessionId === sessionId),
  );
  const openRegistrationWindow = useAuctionRegistrationWindowStore(
    (state) => state.openRegistrationWindow,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [openingDialogOpen, setOpeningDialogOpen] = useState(false);
  const [openingDialogError, setOpeningDialogError] = useState("");

  if (actorRole !== "ADMIN")
    return (
      <main className="schedule-confirmation-page">
        <h1>Registration Opening Readiness</h1>
        <BlockedState
          title="Unauthorized"
          description="Only ADMIN may assess Registration readiness."
        />
      </main>
    );
  if (!session)
    return (
      <main className="schedule-confirmation-page">
        <h1>Registration Opening Readiness</h1>
        <BlockedState
          title="Session not found"
          description="Không tìm thấy dynamic Auction Session."
        />
      </main>
    );

  const sgdgBlocked =
    session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION";
  const now = getRegistrationReadinessDeterministicNow();
  const approvalValidity = decision
    ? getApprovalDecisionEvidenceValidity(decision)
    : "INVALID";
  const confirmedValidity = confirmed
    ? getConfirmedScheduleEvidenceValidity(confirmed)
    : "INVALID";
  const registrationWindowValidity = registrationWindow
    ? getOpenRegistrationWindowValidity(registrationWindow)
    : undefined;

  const runAssessment = () => {
    if (!confirmed) return;
    setError("");
    setMessage("");
    const result = assess({
      sessionId,
      actorId: ADMIN_ID,
      actorRole,
      expectedSessionVersion: session.currentVersion,
      expectedConfirmedScheduleId: confirmed.confirmedScheduleId,
      expectedAssessmentVersion: assessment?.assessmentVersion,
      commandId: `ASSESS_REGISTRATION_READINESS:${sessionId}:A${
        assessment?.assessmentVersion ?? 0
      }:${now}`,
    });
    if (!result.ok) {
      setError(resultError(result));
      return;
    }
    setMessage(
      result.changed
        ? `Registration readiness assessed: ${result.assessment.status}.`
        : "Readiness is unchanged.",
    );
  };
  const runOpening = () => {
    if (!confirmed || !assessment) return;
    const result = openRegistrationWindow({
      sessionId,
      actorId: ADMIN_ID,
      actorRole,
      expectedSessionVersion: session.currentVersion,
      expectedConfirmedScheduleId: confirmed.confirmedScheduleId,
      expectedAssessmentId: assessment.assessmentId,
      expectedAssessmentVersion: assessment.assessmentVersion,
      commandId: `OPEN_REGISTRATION_WINDOW:${sessionId}:A${assessment.assessmentVersion}`,
    });
    if (!result.ok) {
      setOpeningDialogError(openingError(result));
      return;
    }
    setOpeningDialogError("");
    setOpeningDialogOpen(false);
    setMessage(
      `Registration Window ${result.registrationWindow.registrationWindowId} opened.`,
    );
  };
  const readyToOpen =
    !sgdgBlocked &&
    assessment?.status === "READY_TO_OPEN_REGISTRATION" &&
    !registrationWindow;

  return (
    <main className="schedule-confirmation-page">
      <header className="approval-package-heading">
        <span>ADMIN GOVERNANCE · READINESS ONLY</span>
        <h1>Registration Opening Readiness</h1>
        <p>
          Manual prototype assessment. No timer or Registration transition is
          executed.
        </p>
      </header>

      <section className="approval-package-card">
        <div className="schedule-confirmation-title">
          <div>
            <h2>{session.sessionId}</h2>
            <p>
              Session v{session.currentVersion} · {session.lifecycleStatus} /{" "}
              {session.publicationStatus}
            </p>
          </div>
          <Badge>{assessment?.status ?? "NOT ASSESSED"}</Badge>
        </div>
        <dl className="schedule-confirmation-evidence">
          <dt>Approval Decision</dt>
          <dd>{decision?.decisionId ?? "NOT AVAILABLE"}</dd>
          <dt>Approval evidence validity</dt>
          <dd>{approvalValidity}</dd>
          <dt>Confirmed Schedule</dt>
          <dd>{confirmed?.confirmedScheduleId ?? "NOT AVAILABLE"}</dd>
          <dt>Confirmed Schedule evidence</dt>
          <dd>{confirmedValidity}</dd>
          <dt>Timezone</dt>
          <dd>{confirmed?.schedule.timezone ?? "NOT AVAILABLE"}</dd>
          <dt>Registration open</dt>
          <dd>{confirmed?.schedule.registrationOpenAt ?? "NOT AVAILABLE"}</dd>
          <dt>Registration close</dt>
          <dd>{confirmed?.schedule.registrationCloseAt ?? "NOT AVAILABLE"}</dd>
          <dt>Current deterministic time</dt>
          <dd>{now}</dd>
        </dl>
      </section>

      {sgdgBlocked ? (
        <>
          <BlockedState
            title={REGISTRATION_READINESS_BLOCKED_BY_CONFIGURATION}
            description={REGISTRATION_CONFIGURATION_BLOCKER_MESSAGE}
          />
          <p className="approval-package-alert" role="alert">
            {REGISTRATION_OPEN_BLOCKED_BY_CONFIGURATION}
          </p>
        </>
      ) : !confirmed ? (
        <BlockedState
          title={REGISTRATION_READINESS_REQUIRES_CONFIRMED_SCHEDULE}
          description={CONFIRMED_SCHEDULE_REQUIRED_MESSAGE}
        />
      ) : !registrationWindow ? (
        <section className="approval-package-card">
          <Button
            variant={readyToOpen ? "secondary" : "primary"}
            onClick={runAssessment}
          >
            Kiểm tra Registration Readiness
          </Button>
        </section>
      ) : null}

      {assessment && (
        <section className="approval-package-card">
          <h2>Current readiness assessment</h2>
          <dl className="schedule-confirmation-evidence">
            <dt>Assessment</dt>
            <dd>{assessment.assessmentId}</dd>
            <dt>Status</dt>
            <dd>{assessment.status}</dd>
            <dt>assessmentVersion</dt>
            <dd>{assessment.assessmentVersion}</dd>
            <dt>Evaluated at</dt>
            <dd>{assessment.evaluation.evaluatedAt}</dd>
          </dl>
          <h3>Findings</h3>
          {assessment.evaluation.findingCodes.length ? (
            <ul>
              {assessment.evaluation.findingCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          ) : (
            <p>No findings.</p>
          )}
          <h3>Assessment history</h3>
          <ol>
            {assessment.history.map((entry) => (
              <li key={entry.historyId}>
                {entry.action} · v{entry.assessmentVersion} ·{" "}
                {entry.resultingStatus} · {entry.occurredAt}
              </li>
            ))}
          </ol>
        </section>
      )}

      {readyToOpen && (
        <section className="approval-package-card">
          <p>{PROTOTYPE_MANUAL_REGISTRATION_OPENING_POLICY}</p>
          <Button onClick={() => setOpeningDialogOpen(true)}>
            Mở Registration
          </Button>
        </section>
      )}
      {assessment &&
        assessment.status !== "READY_TO_OPEN_REGISTRATION" &&
        !registrationWindow && (
          <p className="approval-package-alert" role="alert">
            {REGISTRATION_OPEN_REQUIRES_READY_ASSESSMENT}:{" "}
            {READY_ASSESSMENT_REQUIRED_MESSAGE}
          </p>
        )}

      {registrationWindow && (
        <section className="approval-package-card">
          <h2>Registration Window · immutable</h2>
          <p>
            <strong>{registrationWindow.registrationWindowId}</strong>
          </p>
          <p>Status: {registrationWindow.status}</p>
          <p>
            Opened by/at: {registrationWindow.openedBy} ·{" "}
            {registrationWindow.openedAt}
          </p>
          <dl className="schedule-confirmation-evidence">
            <dt>Confirmed Schedule</dt>
            <dd>{registrationWindow.confirmedScheduleId}</dd>
            <dt>Readiness assessment</dt>
            <dd>
              {registrationWindow.readinessAssessmentId} · v
              {registrationWindow.readinessAssessmentVersion}
            </dd>
            <dt>Registration open</dt>
            <dd>{registrationWindow.window.registrationOpenAt}</dd>
            <dt>Registration close</dt>
            <dd>{registrationWindow.window.registrationCloseAt}</dd>
            <dt>Derived validity</dt>
            <dd>{registrationWindowValidity}</dd>
          </dl>
          {registrationWindowValidity !== "CURRENT" && (
            <p className="approval-package-alert" role="alert">
              {registrationWindowValidity}. The immutable Registration Window
              remains OPEN; future Customer Registration behavior is blocked.
            </p>
          )}
        </section>
      )}

      {error && <p role="alert">{error}</p>}
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}

      <section className="approval-package-card approval-package-boundary">
        {!registrationWindow && (
          <>
            <p>This assessment does not open Registration.</p>
            <p>Registration remains NOT OPEN.</p>
          </>
        )}
        {registrationWindow && (
          <p>Internal Registration Window: OPEN.</p>
        )}
        <p>No Customer Registration form or Publication is created.</p>
        <p>Session remains DRAFT / NOT_READY.</p>
      </section>

      {confirmed && assessment && readyToOpen && (
        <Dialog
          open={openingDialogOpen}
          onOpenChange={setOpeningDialogOpen}
          title="Mở Registration"
          description="Create one immutable internal Registration Window."
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setOpeningDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={runOpening}>Open Registration</Button>
            </>
          }
        >
          <dl className="schedule-confirmation-evidence">
            <dt>Session</dt>
            <dd>
              {session.sessionId} · v{session.currentVersion}
            </dd>
            <dt>Confirmed Schedule</dt>
            <dd>{confirmed.confirmedScheduleId}</dd>
            <dt>Readiness assessment</dt>
            <dd>
              {assessment.assessmentId} · v{assessment.assessmentVersion}
            </dd>
            <dt>Timezone</dt>
            <dd>{confirmed.schedule.timezone}</dd>
            <dt>Registration open</dt>
            <dd>{confirmed.schedule.registrationOpenAt}</dd>
            <dt>Registration close</dt>
            <dd>{confirmed.schedule.registrationCloseAt}</dd>
            <dt>Current deterministic time</dt>
            <dd>{now}</dd>
            <dt>Approval evidence</dt>
            <dd>{approvalValidity}</dd>
            <dt>Confirmed Schedule evidence</dt>
            <dd>{confirmedValidity}</dd>
          </dl>
          <p>This opens the internal Registration Window.</p>
          <p>It does not create Customer Registration forms.</p>
          <p>It does not publish the Auction.</p>
          <p>The Session remains DRAFT / NOT_READY.</p>
          <p>Registration closing is not included in this task.</p>
          {openingDialogError && (
            <p className="approval-package-alert" role="alert">
              {openingDialogError}
            </p>
          )}
        </Dialog>
      )}
    </main>
  );
}
