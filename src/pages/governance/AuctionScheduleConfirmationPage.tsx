import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { BlockedState } from "../../components/feedback/States";
import {
  CONFIRMED_SCHEDULE_EVIDENCE_STALE,
  CONFIRMATION_CONFIGURATION_BLOCKER_MESSAGE,
  PROTOTYPE_SCHEDULE_CONFIRMATION_POLICY,
  SCHEDULE_CONFIRMATION_BLOCKED_BY_CONFIGURATION,
  evaluateScheduleConfirmationEligibility,
  getConfirmedScheduleEvidenceValidity,
  type ConfirmScheduleResult,
  useAuctionConfirmedScheduleStore,
} from "../../store/auctionConfirmedScheduleStore";
import {
  getApprovalDecisionEvidenceValidity,
  useAuctionApprovalDecisionStore,
} from "../../store/auctionApprovalDecisionStore";
import { useAuctionConfigurationStore } from "../../store/auctionConfigurationStore";
import {
  evaluateScheduleDraftCompleteness,
  useAuctionScheduleDraftStore,
} from "../../store/auctionScheduleDraftStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import { useDemoStore } from "../../store/demoStore";
import "../../styles/auction-approval-package.css";
import "../../styles/auction-schedule-confirmation.css";

const ADMIN_ID = "admin.schedule-confirmation@mock.local";
const commandError = (
  result: Extract<ConfirmScheduleResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

export function AuctionScheduleConfirmationPage() {
  const { sessionId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const session = useAuctionSessionStore((state) =>
    state.sessions.find((item) => item.sessionId === sessionId),
  );
  const draft = useAuctionScheduleDraftStore((state) =>
    state.drafts.find((item) => item.sessionId === sessionId),
  );
  const decision = useAuctionApprovalDecisionStore((state) =>
    state.decisions.find((item) => item.sessionId === sessionId),
  );
  const snapshot = useAuctionConfigurationStore((state) =>
    state.snapshots.find(
      (item) =>
        item.sessionId === sessionId &&
        item.snapshotId === draft?.configurationSnapshotId,
    ),
  );
  const confirmed = useAuctionConfirmedScheduleStore((state) =>
    state.confirmedSchedules.find((item) => item.sessionId === sessionId),
  );
  const confirmSchedule = useAuctionConfirmedScheduleStore(
    (state) => state.confirmSchedule,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [message, setMessage] = useState("");

  if (actorRole !== "ADMIN")
    return (
      <main className="schedule-confirmation-page">
        <h1>Schedule Confirmation</h1>
        <BlockedState
          title="Unauthorized"
          description="Only ADMIN may confirm a Schedule."
        />
      </main>
    );
  if (!session)
    return (
      <main className="schedule-confirmation-page">
        <h1>Schedule Confirmation</h1>
        <BlockedState
          title="Session not found"
          description="Không tìm thấy dynamic Auction Session."
        />
      </main>
    );

  const decisionValidity = decision
    ? getApprovalDecisionEvidenceValidity(decision)
    : "INVALID";
  const draftValidation = draft
    ? evaluateScheduleDraftCompleteness(draft.proposedSchedule)
    : undefined;
  const eligibility =
    draft && decision && snapshot
      ? evaluateScheduleConfirmationEligibility({
          sessionId,
          scheduleDraftId: draft.scheduleDraftId,
          actorId: ADMIN_ID,
          actorRole,
          expectedSessionVersion: session.currentVersion,
          expectedScheduleVersion: draft.scheduleVersion,
          expectedApprovalDecisionId: decision.decisionId,
          expectedConfigurationSnapshotId: snapshot.snapshotId,
          commandId: `CHECK_SCHEDULE_CONFIRMATION:${sessionId}`,
        })
      : undefined;
  const fallbackBlocker =
    session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION"
      ? {
          code: SCHEDULE_CONFIRMATION_BLOCKED_BY_CONFIGURATION,
          message: CONFIRMATION_CONFIGURATION_BLOCKER_MESSAGE,
        }
      : {
          code: "SCHEDULE_CONFIRMATION_REQUIRES_COMPLETE_DRAFT",
          message:
            "Schedule Draft chưa đầy đủ hoặc chưa hợp lệ. Không thể xác nhận Schedule.",
        };
  const blocker =
    !confirmed && (!eligibility || !eligibility.eligible)
      ? eligibility && !eligibility.eligible
        ? { code: eligibility.code, message: eligibility.message }
        : fallbackBlocker
      : undefined;
  const confirmedValidity = confirmed
    ? getConfirmedScheduleEvidenceValidity(confirmed)
    : undefined;

  const runConfirmation = () => {
    if (!draft || !decision || !snapshot) return;
    const result = confirmSchedule({
      sessionId,
      scheduleDraftId: draft.scheduleDraftId,
      actorId: ADMIN_ID,
      actorRole,
      expectedSessionVersion: session.currentVersion,
      expectedScheduleVersion: draft.scheduleVersion,
      expectedApprovalDecisionId: decision.decisionId,
      expectedConfigurationSnapshotId: snapshot.snapshotId,
      commandId: `CONFIRM_SCHEDULE:${sessionId}:V${draft.scheduleVersion}`,
    });
    if (!result.ok) {
      setDialogError(commandError(result));
      return;
    }
    setDialogError("");
    setDialogOpen(false);
    setMessage(
      `Confirmed Schedule ${result.confirmedSchedule.confirmedScheduleId} created.`,
    );
  };
  const values = confirmed?.schedule ?? draft?.proposedSchedule;

  return (
    <main className="schedule-confirmation-page">
      <header className="approval-package-heading">
        <span>ADMIN GOVERNANCE · IMMUTABLE CONFIRMATION</span>
        <h1>Schedule Confirmation</h1>
        <p>{PROTOTYPE_SCHEDULE_CONFIRMATION_POLICY}</p>
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
          <Badge>{confirmed ? "CONFIRMED" : "NOT STARTED"}</Badge>
        </div>
        <dl className="schedule-confirmation-evidence">
          <dt>Approval Decision</dt>
          <dd>{decision?.decisionId ?? "NOT AVAILABLE"}</dd>
          <dt>Approval evidence validity</dt>
          <dd>{decisionValidity}</dd>
          <dt>Configuration Snapshot</dt>
          <dd>{snapshot?.snapshotId ?? "NOT AVAILABLE"}</dd>
          <dt>Schedule Draft</dt>
          <dd>
            {draft
              ? `${draft.scheduleDraftId} · v${draft.scheduleVersion}`
              : "NOT AVAILABLE"}
          </dd>
          <dt>Draft completeness</dt>
          <dd>
            {draftValidation?.complete ? "COMPLETE" : "INCOMPLETE"}
          </dd>
          <dt>Temporal validation</dt>
          <dd>{draftValidation?.complete ? "VALID" : "INVALID"}</dd>
        </dl>
      </section>

      {values && (
        <section className="approval-package-card">
          <h2>
            {confirmed ? "Immutable confirmed timestamps" : "Draft timestamps"}{" "}
            · read-only
          </h2>
          <dl className="schedule-confirmation-evidence">
            <dt>Timezone</dt>
            <dd>{values.timezone || "NOT SET"}</dd>
            <dt>Registration open</dt>
            <dd>{values.registrationOpenAt ?? "NOT SET"}</dd>
            <dt>Registration close</dt>
            <dd>{values.registrationCloseAt ?? "NOT SET"}</dd>
            <dt>Auction start</dt>
            <dd>{values.auctionStartAt ?? "NOT SET"}</dd>
            <dt>Auction end</dt>
            <dd>{values.auctionEndAt ?? "NOT SET"}</dd>
          </dl>
        </section>
      )}

      {confirmed ? (
        <section className="approval-package-card">
          <h2>Confirmed Schedule · immutable</h2>
          <p>
            <strong>{confirmed.confirmedScheduleId}</strong>
          </p>
          <p>Status: {confirmed.status}</p>
          <p>
            Confirmed by/at: {confirmed.confirmedBy} · {confirmed.confirmedAt}
          </p>
          <p>Evidence validity: {confirmedValidity}</p>
          {confirmedValidity !== "CURRENT" && (
            <p className="approval-package-alert" role="alert">
              {CONFIRMED_SCHEDULE_EVIDENCE_STALE}. The immutable confirmation
              remains recorded; future Registration opening is blocked.
            </p>
          )}
        </section>
      ) : blocker ? (
        <BlockedState title={blocker.code} description={blocker.message} />
      ) : (
        <section className="approval-package-card">
          <Button onClick={() => setDialogOpen(true)}>
            Xác nhận Schedule
          </Button>
        </section>
      )}

      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
      <section className="approval-package-card approval-package-boundary">
        <p>
          Schedule Confirmation does not mutate the Draft or Auction Session.
        </p>
        <p>
          Registration: NOT OPEN · Session: DRAFT / NOT_READY · Publication:
          NOT STARTED
        </p>
      </section>

      {draft && decision && snapshot && (
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Xác nhận Schedule"
          description="Create one immutable Confirmed Schedule."
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={runConfirmation}>Confirm Schedule</Button>
            </>
          }
        >
          <dl className="schedule-confirmation-evidence">
            <dt>Session</dt>
            <dd>
              {session.sessionId} · v{session.currentVersion}
            </dd>
            <dt>Schedule Draft</dt>
            <dd>
              {draft.scheduleDraftId} · v{draft.scheduleVersion}
            </dd>
            <dt>Approval Decision</dt>
            <dd>{decision.decisionId}</dd>
            <dt>Configuration Snapshot</dt>
            <dd>{snapshot.snapshotId}</dd>
            <dt>Timezone</dt>
            <dd>{draft.proposedSchedule.timezone}</dd>
            <dt>Registration open</dt>
            <dd>{draft.proposedSchedule.registrationOpenAt}</dd>
            <dt>Registration close</dt>
            <dd>{draft.proposedSchedule.registrationCloseAt}</dd>
            <dt>Auction start</dt>
            <dd>{draft.proposedSchedule.auctionStartAt}</dd>
            <dt>Auction end</dt>
            <dd>{draft.proposedSchedule.auctionEndAt}</dd>
            <dt>Validation result</dt>
            <dd>COMPLETE · TEMPORAL ORDER VALID · APPROVAL CURRENT</dd>
          </dl>
          <p>This confirms the exact Schedule Draft version.</p>
          <p>The Schedule Draft remains unchanged.</p>
          <p>Registration remains NOT OPEN.</p>
          <p>The Session remains DRAFT / NOT_READY.</p>
          <p>No Publication is created.</p>
          {dialogError && (
            <p className="approval-package-alert" role="alert">
              {dialogError}
            </p>
          )}
        </Dialog>
      )}
    </main>
  );
}
