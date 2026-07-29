import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { BlockedState } from "../../components/feedback/States";
import {
  getApprovalDecisionEvidenceValidity,
  useAuctionApprovalDecisionStore,
} from "../../store/auctionApprovalDecisionStore";
import { useAuctionConfigurationStore } from "../../store/auctionConfigurationStore";
import {
  APPROVED_DECISION_REQUIRED_MESSAGE,
  PROTOTYPE_SCHEDULE_CLASSIFICATION,
  SCHEDULE_CONFIGURATION_BLOCKER_MESSAGE,
  SCHEDULE_DRAFT_BLOCKED_BY_CONFIGURATION,
  SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE,
  SCHEDULE_DRAFT_REQUIRES_APPROVED_DECISION,
  STALE_APPROVAL_EVIDENCE_MESSAGE,
  evaluateScheduleDraftEligibility,
  type ScheduleDraftCommandResult,
  useAuctionScheduleDraftStore,
} from "../../store/auctionScheduleDraftStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import { useDemoStore } from "../../store/demoStore";
import "../../styles/auction-schedule-draft.css";

const CONTENT_STAFF_ID = "content.staff@mock.local";
type FieldState = {
  timezone: string;
  registrationOpenAt: string;
  registrationCloseAt: string;
  auctionStartAt: string;
  auctionEndAt: string;
};
const emptyFields: FieldState = {
  timezone: "",
  registrationOpenAt: "",
  registrationCloseAt: "",
  auctionStartAt: "",
  auctionEndAt: "",
};
const inputValue = (iso?: string) => (iso ? iso.slice(0, 16) : "");
const draftFields = (
  proposedSchedule: {
    timezone: string;
    registrationOpenAt?: string;
    registrationCloseAt?: string;
    auctionStartAt?: string;
    auctionEndAt?: string;
  },
): FieldState => ({
  timezone: proposedSchedule.timezone,
  registrationOpenAt: inputValue(proposedSchedule.registrationOpenAt),
  registrationCloseAt: inputValue(proposedSchedule.registrationCloseAt),
  auctionStartAt: inputValue(proposedSchedule.auctionStartAt),
  auctionEndAt: inputValue(proposedSchedule.auctionEndAt),
});
const toIso = (value: string) =>
  value ? new Date(value).toISOString() : undefined;
const resultError = (
  result: Extract<ScheduleDraftCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

export function AuctionScheduleDraftPage() {
  const { sessionId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const session = useAuctionSessionStore((state) =>
    state.sessions.find((item) => item.sessionId === sessionId),
  );
  const decision = useAuctionApprovalDecisionStore((state) =>
    state.decisions.find((item) => item.sessionId === sessionId),
  );
  const snapshot = useAuctionConfigurationStore((state) =>
    state.snapshots.find(
      (item) =>
        item.sessionId === sessionId &&
        item.snapshotId === decision?.validationEvidence.configurationSnapshotId,
    ),
  );
  const draft = useAuctionScheduleDraftStore((state) =>
    state.drafts.find((item) => item.sessionId === sessionId),
  );
  const createDraft = useAuctionScheduleDraftStore(
    (state) => state.createScheduleDraft,
  );
  const saveDraft = useAuctionScheduleDraftStore(
    (state) => state.saveScheduleDraft,
  );
  const [fields, setFields] = useState<FieldState>(() =>
    draft ? draftFields(draft.proposedSchedule) : emptyFields,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!session)
    return (
      <main className="schedule-workspace">
        <h1>Chuẩn bị lịch phiên</h1>
        <BlockedState
          title="Session not found"
          description="Không tìm thấy dynamic Auction Session."
        />
      </main>
    );
  if (actorRole !== "CONTENT_STAFF")
    return (
      <main className="schedule-workspace">
        <h1>Chuẩn bị lịch phiên</h1>
        <BlockedState
          title="Unauthorized"
          description="Only CONTENT_STAFF may prepare a Schedule Draft."
        />
      </main>
    );

  const evidenceValidity = decision
    ? getApprovalDecisionEvidenceValidity(decision)
    : undefined;
  const check = evaluateScheduleDraftEligibility({
    sessionId,
    actorRole,
    expectedSessionVersion: session.currentVersion,
    expectedApprovalDecisionId: decision?.decisionId,
    commandId: `CHECK_SCHEDULE_DRAFT:${sessionId}`,
  });
  const blocker =
    session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION"
      ? {
          code: SCHEDULE_DRAFT_BLOCKED_BY_CONFIGURATION,
          message: SCHEDULE_CONFIGURATION_BLOCKER_MESSAGE,
        }
      : !decision
        ? {
            code: SCHEDULE_DRAFT_REQUIRES_APPROVED_DECISION,
            message: APPROVED_DECISION_REQUIRED_MESSAGE,
          }
        : evidenceValidity !== "CURRENT"
          ? {
              code: SCHEDULE_DRAFT_BLOCKED_BY_STALE_APPROVAL_EVIDENCE,
              message: STALE_APPROVAL_EVIDENCE_MESSAGE,
            }
          : !check.eligible
            ? { code: check.code, message: check.message }
            : undefined;

  const create = () => {
    if (!decision) return;
    setError("");
    setSuccess("");
    const result = createDraft({
      sessionId,
      actorId: CONTENT_STAFF_ID,
      actorRole,
      expectedSessionVersion: session.currentVersion,
      expectedApprovalDecisionId: decision.decisionId,
      commandId: `CREATE_SCHEDULE_DRAFT:${sessionId}`,
    });
    if (!result.ok) return setError(resultError(result));
    setFields(draftFields(result.draft.proposedSchedule));
    setSuccess("Đã tạo Schedule Draft.");
  };
  const save = () => {
    if (!draft) return;
    setError("");
    setSuccess("");
    const result = saveDraft({
      scheduleDraftId: draft.scheduleDraftId,
      actorId: CONTENT_STAFF_ID,
      actorRole,
      expectedScheduleVersion: draft.scheduleVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: `SAVE_SCHEDULE_DRAFT:${sessionId}:V${draft.scheduleVersion}`,
      timezone: fields.timezone,
      registrationOpenAt: toIso(fields.registrationOpenAt),
      registrationCloseAt: toIso(fields.registrationCloseAt),
      auctionStartAt: toIso(fields.auctionStartAt),
      auctionEndAt: toIso(fields.auctionEndAt),
    });
    if (!result.ok) return setError(resultError(result));
    setSuccess(
      result.changed
        ? `Đã lưu Schedule Draft v${result.draft.scheduleVersion}.`
        : "Không có thay đổi để lưu.",
    );
  };
  const setField = (name: keyof FieldState, value: string) =>
    setFields((current) => ({ ...current, [name]: value }));

  return (
    <main className="schedule-workspace">
      <header>
        <p className="schedule-eyebrow">VẬN HÀNH ĐẤU GIÁ · BẢN MÔ PHỎNG</p>
        <h1>Chuẩn bị lịch phiên</h1>
        <p className="schedule-disclaimer">
          {PROTOTYPE_SCHEDULE_CLASSIFICATION}
        </p>
      </header>

      <section className="schedule-evidence" aria-label="Schedule evidence">
        <h2>Dữ liệu chính thức</h2>
        <dl>
          <div>
            <dt>Phiên đấu giá</dt>
            <dd>{session.sessionId}</dd>
          </div>
          <div>
            <dt>Trạng thái phiên</dt>
            <dd>{session.lifecycleStatus} / {session.publicationStatus}</dd>
          </div>
          <div>
            <dt>Quyết định phê duyệt</dt>
            <dd>
              {decision?.decisionId ?? "NOT RECORDED"} ·{" "}
              {decision?.outcome ?? "NOT APPROVED"}
            </dd>
          </div>
          <div>
            <dt>Hiệu lực bằng chứng</dt>
            <dd>{evidenceValidity ?? "NOT AVAILABLE"}</dd>
          </div>
          <div>
            <dt>Phòng đấu giá đã cấu hình (chỉ đọc)</dt>
            <dd>{snapshot?.roomResolution.displayName ?? "NOT RESOLVED"}</dd>
          </div>
        </dl>
      </section>

      {blocker ? (
        <BlockedState title={blocker.code} description={blocker.message} />
      ) : !draft ? (
        <section className="schedule-card">
          <h2>Bản nháp lịch phiên</h2>
          <p>Lịch phiên: CHƯA TẠO</p>
          <Button variant="primary" onClick={create}>
            Tạo Schedule Draft
          </Button>
        </section>
      ) : (
        <section className="schedule-card">
          <div className="schedule-status-row">
            <div><span>Trạng thái</span><strong>{draft.status}</strong></div>
            <div>
              <span>Mức độ hoàn thiện</span>
              <strong>
                {draft.completeness.complete ? "COMPLETE" : "INCOMPLETE"}
              </strong>
            </div>
            <div>
              <span>Phiên bản lịch</span>
              <strong>{draft.scheduleVersion}</strong>
            </div>
          </div>
          <div className="schedule-form">
            <label>
              Timezone
              <input
                name="timezone"
                value={fields.timezone}
                onChange={(event) => setField("timezone", event.target.value)}
                placeholder="Asia/Ho_Chi_Minh"
              />
            </label>
            {(
              [
                ["registrationOpenAt", "Registration open"],
                ["registrationCloseAt", "Registration close"],
                ["auctionStartAt", "Auction start"],
                ["auctionEndAt", "Auction end"],
              ] as const
            ).map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  type="datetime-local"
                  name={name}
                  value={fields[name]}
                  onChange={(event) => setField(name, event.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="schedule-findings" aria-live="polite">
            <h3>Kết quả kiểm tra mức độ hoàn thiện</h3>
            {draft.completeness.findingCodes.length ? (
              <ul>
                {draft.completeness.findingCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            ) : (
              <p>Không có vấn đề.</p>
            )}
          </div>
          <Button variant="primary" onClick={save}>
            Lưu Schedule Draft
          </Button>
          <div className="schedule-history">
            <h3>Lịch sử bản nháp</h3>
            <ol>
              {draft.history.map((entry) => (
                <li key={entry.historyId}>
                  {entry.action} · v{entry.scheduleVersion} ·{" "}
                  {entry.completeness}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
      <aside className="schedule-boundary">
        <strong>Bản nháp lịch chưa phải lịch đã xác nhận.</strong>
        <p>Việc lưu bản nháp không mở đăng ký và không xuất bản phiên đấu giá.</p>
        <p>
          Schedule Confirmation: NOT STARTED · Registration: NOT OPEN ·
          Publication: NOT STARTED
        </p>
      </aside>
    </main>
  );
}
