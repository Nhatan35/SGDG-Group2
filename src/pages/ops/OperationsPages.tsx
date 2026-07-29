import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  getApprovalPackageFixture,
  getApprovalQueueFixture,
  getAuctionRuleFixture,
  getAuctionScheduleFixture,
  getAuctionSessionWorkspaceFixture,
  getOpeningRequestWorkspaceFixture,
  getOpeningRequests,
  getOperationsDashboardFixture,
} from "../../services/mock/operationsService";
import {
  CONTENT_STAFF_ACTOR_ID,
  openingRequestStatusLabel,
  type OpeningRequestCommandResult,
  useOpeningRequestStore,
} from "../../store/openingRequestStore";
import { Badge as CommonBadge } from "../../components/common/Badge";
import { Button, ButtonLink } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { useDemoStore } from "../../store/demoStore";
import {
  getAuctionSessionReadModel,
  type CreateLinkedSessionResult,
  type PersistedAuctionSession,
  type PersistedSgdgManagedSession,
  useAuctionSessionStore,
} from "../../store/auctionSessionStore";
import { useAuctionConfigurationStore } from "../../store/auctionConfigurationStore";
import {
  PROTOTYPE_CONTENT_POLICY,
  useAuctionContentStore,
} from "../../store/auctionContentStore";
import {
  CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION,
  SGDG_CONTENT_REVIEW_BLOCKER_MESSAGE,
  getSessionPackageProjection,
  useAuctionContentReviewStore,
} from "../../store/auctionContentReviewStore";
import {
  APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION,
  SGDG_APPROVAL_PACKAGE_BLOCKER_MESSAGE,
  getApprovalPackageEvidenceValidity,
  useAuctionApprovalPackageStore,
} from "../../store/auctionApprovalPackageStore";
import {
  APPROVAL_REVIEW_BLOCKED_BY_CONFIGURATION,
  REVIEW_CONFIGURATION_BLOCKER_MESSAGE,
  useAuctionApprovalReviewStore,
} from "../../store/auctionApprovalReviewStore";
import {
  getApprovalDecisionQueue,
  getSessionApprovalProjection,
  useAuctionApprovalDecisionStore,
} from "../../store/auctionApprovalDecisionStore";
import { useAuctionScheduleDraftStore } from "../../store/auctionScheduleDraftStore";
import { useAuctionConfirmedScheduleStore } from "../../store/auctionConfirmedScheduleStore";
import { useAuctionRegistrationOpeningReadinessStore } from "../../store/auctionRegistrationOpeningReadinessStore";
import { useAuctionRegistrationWindowStore } from "../../store/auctionRegistrationWindowStore";
import { useAuctionCustomerRegistrationStore } from "../../store/auctionCustomerRegistrationStore";
import { useAuctionRegistrationValidationStore } from "../../store/auctionRegistrationValidationStore";
import { useAuctionRegistrationCorrectionDraftStore } from "../../store/auctionRegistrationCorrectionDraftStore";
import { useAuctionRegistrationResubmissionStore } from "../../store/auctionRegistrationResubmissionStore";
import { useAuctionRegistrationRevalidationStore } from "../../store/auctionRegistrationRevalidationStore";
import { useAuctionMembershipCheckStore } from "../../store/auctionMembershipCheckStore";
import { useAuctionDepositCheckStore } from "../../store/auctionDepositCheckStore";
import {
  AUCTION_ROOM_FEE_POLICY_DISCLAIMER,
  SGDG_MANAGED_FEE_DECISION_MESSAGE,
} from "../../services/roomValueTierPolicy";
import {
  configurationErrors,
  saveConfiguration,
  submitConfiguration,
  type AuctionConfiguration,
} from "../../services/auctionConfigurationCommands";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/operations-foundation.css";
import "../../styles/auction-configuration.css";
import "../../styles/opening-request-lifecycle.css";
import { DynamicAuctionConfigurationPage } from "./DynamicAuctionConfigurationPage";
type Context = { role: "CONTENT_STAFF" | "ADMIN" };
function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <header className="ops-heading">
        <span>NỀN TẢNG VẬN HÀNH</span>
        <h1>{title}</h1>
        <p>Dữ liệu mô phỏng · Quản lý vận hành đấu giá</p>
      </header>
      {children}
    </>
  );
}
const scenario = (p: URLSearchParams, base: string) =>
  p.get("scenario") || base;
const openingHistoryActionLabel: Record<string, string> = {
  CREATE_DRAFT: "Tạo bản nháp",
  SAVE_DRAFT: "Lưu bản nháp",
  SUBMIT: "Gửi yêu cầu",
  START_REVIEW: "Bắt đầu thẩm định",
  RETURN_FOR_CORRECTION: "Yêu cầu cập nhật",
  RESUBMIT: "Gửi lại yêu cầu",
  REJECT: "Từ chối yêu cầu",
  ACCEPT_FOR_DRAFT: "Tiếp nhận để chuẩn bị",
  ROUTE_TO_GOVERNED_REVIEW: "Chuyển xem xét quản trị",
};
const actorRoleLabel: Record<string, string> = {
  CUSTOMER: "Khách hàng",
  CONTENT_STAFF: "Nhân viên nội dung",
  ADMIN: "Admin",
  CUSTOMER_SUPPORT: "Chăm sóc khách hàng",
  FINANCE: "Tài chính",
};
const historyVisibilityLabel: Record<string, string> = {
  CUSTOMER_SAFE: "Khách hàng có thể xem",
  STAFF_ONLY: "Chỉ nhân viên",
  GOVERNANCE_ONLY: "Chỉ quản trị",
};
const replaceView = (set: ReturnType<typeof useSearchParams>[1]) =>
  set((current) => {
    const n = new URLSearchParams(current);
    n.delete("view");
    return n;
  });
export function OperationsDashboardPage() {
  const fixture = getOperationsDashboardFixture();
  return (
    <Shell title="Tổng quan vận hành">
      <div className="ops-kpis">
        {fixture.kpis.map(([v, l]) => (
          <article key={l}>
            <strong>{v}</strong>
            <span>{l}</span>
          </article>
        ))}
      </div>
    </Shell>
  );
}
export function OpeningRequestQueuePage() {
  const customerRequests = useOpeningRequestStore((state) => state.records);
  const sharedIds = new Set(customerRequests.map((item) => item.requestId));
  const rows = [
    ...getOpeningRequests()
      .filter((item) => !sharedIds.has(item.requestId))
      .map((item) => ({
        requestId: item.requestId,
        assetName: item.assetName,
        status: item.status,
      })),
    ...customerRequests
      .filter((item) => item.status !== "DRAFT")
      .map((item) => ({
        requestId: item.requestId,
        assetName: item.title || item.assetReference,
        status: openingRequestStatusLabel[item.status],
      })),
  ];
  return (
    <Shell title="Yêu cầu mở phiên">
      <Table headers={["Yêu cầu", "Tài sản", "Trạng thái", "Thao tác"]}>
        {rows.map((x) => (
          <tr key={x.requestId}>
            <td data-label="Yêu cầu">{x.requestId}</td>
            <td data-label="Tài sản">{x.assetName}</td>
            <td data-label="Trạng thái">
              <CommonBadge tone="warning">{x.status}</CommonBadge>
            </td>
            <td data-label="Thao tác">
              <Link to={`/ops/opening-requests/${x.requestId}`}>
                Mở review
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
export function OpeningRequestWorkspacePage() {
  const { requestId } = useParams();
  const [p, setP] = useSearchParams();
  const record = useOpeningRequestStore((state) =>
    state.records.find((item) => item.requestId === requestId),
  );
  const actorRole = useDemoStore((state) => state.actorRole);
  const startReview = useOpeningRequestStore((state) => state.startReview);
  const returnForCorrection = useOpeningRequestStore(
    (state) => state.returnForCorrection,
  );
  const rejectOpeningRequest = useOpeningRequestStore(
    (state) => state.rejectOpeningRequest,
  );
  const acceptForDraftPreparation = useOpeningRequestStore(
    (state) => state.acceptForDraftPreparation,
  );
  const recordGovernanceConcern = useOpeningRequestStore(
    (state) => state.recordGovernanceConcern,
  );
  const dynamicSessions = useAuctionSessionStore((state) => state.sessions);
  const createLinkedSessionFromAcceptedRequest = useAuctionSessionStore(
    (state) => state.createLinkedSessionFromAcceptedRequest,
  );
  const [decision, setDecision] = useState<ReviewDecision>();
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [createSessionVersion, setCreateSessionVersion] = useState<number>();
  const [message, setMessage] = useState("");
  const [commandError, setCommandError] = useState("");

  if (p.get("view") === "loading")
    return (
      <Shell title="Thẩm định yêu cầu mở phiên">
        <p className="ops-panel" aria-busy="true">
          Đang tải review workspace…
        </p>
      </Shell>
    );
  if (p.get("view") === "error")
    return (
      <Shell title="Thẩm định yêu cầu mở phiên">
        <p className="ops-conflict">
          Không thể tải fixture.
          <button
            className="button secondary"
            onClick={() => replaceView(setP)}
          >
            Thử lại
          </button>
        </p>
      </Shell>
    );
  const compatibilityScenario = p.get("scenario");
  const compatibilityFixture =
    requestId &&
    compatibilityScenario &&
    compatibilityScenario !== "request-under-review"
      ? getOpeningRequestWorkspaceFixture(requestId, compatibilityScenario)
      : undefined;
  if (compatibilityFixture)
    return (
      <Shell title="Thẩm định yêu cầu mở phiên">
        <section className="ops-panel opening-review-record">
          <CommonBadge tone="warning">
            {compatibilityFixture.request.status}
          </CommonBadge>
          <h2>
            {compatibilityFixture.request.requestId} ·{" "}
            {compatibilityFixture.request.assetName}
          </h2>
          <p>
            Scenario fixture tương thích chỉ đọc · phiên bản{" "}
            {compatibilityFixture.request.currentVersion}
          </p>
          <p>
            Scenario URL được giữ để regression; mọi quyết định lifecycle mới
            phải thực hiện trên hồ sơ yêu cầu mở phiên dùng chung.
          </p>
        </section>
      </Shell>
    );
  if (!record) {
    const fixture =
      requestId &&
      getOpeningRequestWorkspaceFixture(
        requestId,
        scenario(p, "request-under-review"),
      );
    if (!fixture) return <NotFoundPage />;
    return (
      <Shell title="Thẩm định yêu cầu mở phiên">
        <section className="ops-panel">
          <h2>{fixture.request.requestId}</h2>
          <p>
            Dữ liệu tương thích chỉ đọc · {fixture.request.status} · phiên bản{" "}
            {fixture.request.currentVersion}
          </p>
        </section>
      </Shell>
    );
  }

  const beginReview = () => {
    const result = startReview({
      requestId: record.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole,
      expectedVersion: record.version,
      commandId: `start-review-${record.requestId}-v${record.version}`,
    });
    if (!result.ok) {
      setCommandError(result.message);
      return;
    }
    setCommandError("");
    setMessage(
      `Đã bắt đầu thẩm định ${result.data.requestId} ở phiên bản ${result.data.version}.`,
    );
  };

  const decide = (
    kind: ReviewDecision,
    reason: string,
    affectedSections: string[],
    evidenceReferenceIds: string[],
  ) => {
    const base = {
      requestId: record.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole,
      expectedVersion: record.version,
      commandId: `${kind}-${record.requestId}-v${record.version}`,
    };
    const result =
      kind === "return"
        ? returnForCorrection({
            ...base,
            reason,
            affectedSections,
          })
        : kind === "reject"
          ? rejectOpeningRequest({ ...base, reason })
          : kind === "accept"
            ? acceptForDraftPreparation({ ...base, reason })
            : recordGovernanceConcern({
                ...base,
                concernReason: reason,
                evidenceReferenceIds,
              });
    if (!result.ok) return result;
    setDecision(undefined);
    setCommandError("");
    setMessage(
      kind === "accept"
        ? "Đã tiếp nhận yêu cầu để chuẩn bị bản nháp. Chưa tạo phiên đấu giá."
        : kind === "governance"
          ? "Đã chuyển yêu cầu sang xem xét quản trị và tạm dừng thẩm định thông thường."
          : kind === "reject"
            ? "Đã từ chối yêu cầu. Hồ sơ hiện chỉ đọc."
            : "Đã trả yêu cầu cho khách hàng cập nhật.",
    );
    return result;
  };

  const reviewOpen = record.status === "UNDER_REVIEW";
  const linkedSession = record.acceptedOpeningRequestVersion
    ? dynamicSessions.find(
        (session) =>
          session.openingRequestId === record.requestId &&
          session.openingRequestVersion ===
            record.acceptedOpeningRequestVersion,
      )
    : undefined;
  const createLinkedSession = (expectedRequestVersion: number) => {
    const result = createLinkedSessionFromAcceptedRequest({
      requestId: record.requestId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole,
      expectedRequestVersion,
      commandId: `CREATE_LINKED_SESSION:${record.requestId}:${expectedRequestVersion}`,
      ownerId: CONTENT_STAFF_ACTOR_ID,
    });
    if (result.ok) {
      setCreateSessionOpen(false);
      setCommandError("");
      setMessage(
        `Đã tạo bản nháp phiên ${result.session.sessionId}. Chưa phê duyệt, lập lịch hoặc xuất bản.`,
      );
    }
    return result;
  };
  return (
    <Shell title="Thẩm định yêu cầu mở phiên">
      <div className="opening-review-layout">
        <section className="ops-panel opening-review-record">
          <div className="opening-review-identity">
            <div>
              <span>YÊU CẦU MỞ PHIÊN</span>
              <h2>{record.requestId}</h2>
            </div>
            <CommonBadge
              tone={
                record.status === "REJECTED"
                  ? "danger"
                  : record.status === "ACCEPTED_FOR_DRAFT"
                    ? "success"
                    : record.status === "GOVERNANCE_REVIEW"
                      ? "info"
                      : "warning"
              }
            >
              {openingRequestStatusLabel[record.status]}
            </CommonBadge>
          </div>
          <p>
            Khách hàng {record.ownerId} · Tài sản {record.assetReference} · phiên
            bản {record.version}
          </p>
          <h3>Thông tin thẩm định</h3>
          <dl>
            <dt>Tên yêu cầu</dt>
            <dd>{record.title}</dd>
            <dt>Mục đích</dt>
            <dd>{record.purpose}</dd>
            <dt>Giá đề xuất</dt>
            <dd>
              {record.proposedStartPrice?.toLocaleString("vi-VN") ?? "—"} ₫
            </dd>
            <dt>Ghi chú của khách hàng</dt>
            <dd>{record.customerNotes || "—"}</dd>
            <dt>Thời điểm gửi</dt>
            <dd>{record.submittedAt ?? "—"}</dd>
          </dl>
          {record.status === "RETURNED_FOR_CORRECTION" && (
            <div className="opening-review-context">
              <strong>Đã trả để cập nhật</strong>
              <p>{record.reviewerComment}</p>
            </div>
          )}
          {record.status === "GOVERNANCE_REVIEW" && (
            <div className="opening-review-context">
              <strong>Quy trình thẩm định thông thường đang tạm dừng</strong>
              <p>Hồ sơ đang chờ Admin xem xét trong ngữ cảnh quản trị.</p>
            </div>
          )}
          {linkedSession ? (
            <div className="opening-review-context linked-session-context">
              <strong>Bản nháp phiên đã được tạo</strong>
              <p>
                {linkedSession.sessionId} · {linkedSession.auctionCode} · Bản nháp
              </p>
              <p>Chưa phê duyệt, chưa lập lịch và chưa xuất bản.</p>
            </div>
          ) : (
            <p className="opening-review-disclosure">
              Tiếp nhận yêu cầu mở phiên không đồng nghĩa phiên đấu giá đã
              được tạo, phê duyệt, lên lịch hoặc xuất bản.
            </p>
          )}
        </section>

        <aside className="ops-decision opening-review-actions">
          <h2>Hành động thẩm định</h2>
          {record.status === "SUBMITTED" && (
            <Button onClick={beginReview}>Bắt đầu thẩm định</Button>
          )}
          {reviewOpen && (
            <>
              <Button
                variant="primary"
                onClick={() => setDecision("accept")}
              >
                Tiếp nhận để chuẩn bị
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDecision("return")}
              >
                Yêu cầu cập nhật
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDecision("governance")}
              >
                Chuyển xem xét quản trị
              </Button>
              <Button variant="danger" onClick={() => setDecision("reject")}>
                Từ chối
              </Button>
            </>
          )}
          {record.status === "ACCEPTED_FOR_DRAFT" && !linkedSession && (
            <Button
              variant="primary"
              onClick={() => {
                setCreateSessionVersion(record.version);
                setCreateSessionOpen(true);
              }}
            >
              Tạo bản nháp phiên đấu giá
            </Button>
          )}
          {linkedSession && (
            <>
              <p>
                Phiên hiện có: <strong>{linkedSession.sessionId}</strong>
              </p>
              <ButtonLink
                variant="primary"
                to={`/ops/auctions/${linkedSession.sessionId}`}
              >
                Mở không gian phiên
              </ButtonLink>
            </>
          )}
          {!reviewOpen && record.status !== "SUBMITTED" && (
            <p>
              {record.status === "ACCEPTED_FOR_DRAFT"
                ? "Yêu cầu mở phiên giữ nguyên trạng thái đã tiếp nhận."
                : "Không có hành động thẩm định thông thường cho trạng thái này."}
            </p>
          )}
          {commandError && (
            <p className="ops-conflict" role="alert">
              {commandError}
            </p>
          )}
        </aside>
      </div>

      {message && (
        <p className="opening-review-success" aria-live="polite">
          {message}
        </p>
      )}

      <section className="ops-panel opening-review-history">
        <h2>Lịch sử quyết định</h2>
        {record.history.length ? (
          <ol>
            {record.history
              .slice()
              .reverse()
              .map((entry) => (
                <li key={entry.id}>
                  <strong>{openingHistoryActionLabel[entry.action]}</strong>
                  <span>
                    {openingRequestStatusLabel[entry.fromStatus]} →{" "}
                    {openingRequestStatusLabel[entry.toStatus]} · v
                    {entry.requestVersion}
                  </span>
                  <small>
                    {actorRoleLabel[entry.actorRole]} · {entry.createdAt} ·{" "}
                    {historyVisibilityLabel[entry.visibility]}
                  </small>
                  {entry.reason && <p>{entry.reason}</p>}
                </li>
              ))}
          </ol>
        ) : (
          <p>Chưa có sự kiện quyết định.</p>
        )}
      </section>

      {decision && (
        <OpeningRequestDecisionDialog
          decision={decision}
          requestId={record.requestId}
          version={record.version}
          onClose={() => setDecision(undefined)}
          onConfirm={(reason, sections, evidence) =>
            decide(decision, reason, sections, evidence)
          }
        />
      )}
      {createSessionOpen && (
        <LinkedSessionCreationDialog
          requestId={record.requestId}
          acceptedVersion={createSessionVersion ?? record.version}
          assetReference={record.assetReference}
          onClose={() => setCreateSessionOpen(false)}
          onConfirm={() =>
            createLinkedSession(createSessionVersion ?? record.version)
          }
          onRefresh={() => setCreateSessionVersion(record.version)}
        />
      )}
    </Shell>
  );
}

type ReviewDecision = "return" | "reject" | "accept" | "governance";

const decisionCopy: Record<
  ReviewDecision,
  { title: string; consequence: string; confirm: string }
> = {
  return: {
    title: "Trả yêu cầu để cập nhật",
    consequence:
      "Khách hàng sẽ thấy lý do và các phần cần cập nhật, sau đó có thể gửi lại cùng yêu cầu.",
    confirm: "Xác nhận trả lại",
  },
  reject: {
    title: "Từ chối yêu cầu mở phiên",
    consequence:
      "Yêu cầu sẽ trở thành kết quả chỉ đọc và không thể chỉnh sửa hoặc gửi lại.",
    confirm: "Xác nhận từ chối",
  },
  accept: {
    title: "Tiếp nhận để chuẩn bị bản nháp",
    consequence:
      "Chỉ ghi nhận trạng thái đã tiếp nhận để chuẩn bị. Hành động này không tạo, phê duyệt, lên lịch hoặc xuất bản phiên đấu giá.",
    confirm: "Tiếp nhận để chuẩn bị",
  },
  governance: {
    title: "Chuyển sang xem xét quản trị",
    consequence:
      "Quy trình thẩm định thông thường sẽ tạm dừng. Admin chỉ có quyền xem ngữ cảnh; chưa áp dụng quyết định giữ quản trị.",
    confirm: "Chuyển xem xét quản trị",
  },
};

function OpeningRequestDecisionDialog({
  decision,
  requestId,
  version,
  onClose,
  onConfirm,
}: {
  decision: ReviewDecision;
  requestId: string;
  version: number;
  onClose: () => void;
  onConfirm: (
    reason: string,
    affectedSections: string[],
    evidenceReferenceIds: string[],
  ) => OpeningRequestCommandResult | undefined;
}) {
  const [reason, setReason] = useState("");
  const [affectedSections, setAffectedSections] = useState<string[]>([]);
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const copy = decisionCopy[decision];
  const toggleSection = (section: string) =>
    setAffectedSections((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    );
  const confirm = () => {
    const result = onConfirm(
      reason,
      affectedSections,
      evidence
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
    if (result && !result.ok) {
      setError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={copy.title}
      description={copy.consequence}
      initialFocusRef={reasonRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            variant={decision === "reject" ? "danger" : "primary"}
            onClick={confirm}
          >
            {copy.confirm}
          </Button>
        </>
      }
    >
      <dl className="opening-review-dialog-reference">
        <div>
          <dt>Yêu cầu mở phiên</dt>
          <dd>{requestId}</dd>
        </div>
        <div>
          <dt>Phiên bản hiện tại</dt>
          <dd>{version}</dd>
        </div>
      </dl>
      <label className="opening-review-field">
        <span>
          {decision === "governance"
            ? "Mô tả quan ngại quản trị"
            : decision === "accept"
              ? "Căn cứ tiếp nhận"
              : "Lý do"}
        </span>
        <textarea
          ref={reasonRef}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={Boolean(
            fieldErrors.reason || fieldErrors.concernReason,
          )}
        />
        {(fieldErrors.reason || fieldErrors.concernReason) && (
          <small className="field-error">
            {fieldErrors.reason || fieldErrors.concernReason}
          </small>
        )}
      </label>
      {decision === "return" && (
        <fieldset className="opening-review-sections">
          <legend>Phần cần cập nhật</legend>
          {["Tên yêu cầu", "Tham chiếu tài sản", "Mục đích đấu giá", "Giá đề xuất"].map(
            (section) => (
              <label key={section}>
                <input
                  type="checkbox"
                  checked={affectedSections.includes(section)}
                  onChange={() => toggleSection(section)}
                />
                <span>{section}</span>
              </label>
            ),
          )}
          {fieldErrors.affectedSections && (
            <small className="field-error">
              {fieldErrors.affectedSections}
            </small>
          )}
        </fieldset>
      )}
      {decision === "governance" && (
        <label className="opening-review-field">
          <span>Tham chiếu bằng chứng nội bộ (phân tách bằng dấu phẩy)</span>
          <input
            value={evidence}
            onChange={(event) => setEvidence(event.target.value)}
          />
        </label>
      )}
      {error && (
        <p className="ops-conflict" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}

function LinkedSessionCreationDialog({
  requestId,
  acceptedVersion,
  assetReference,
  onClose,
  onConfirm,
  onRefresh,
}: {
  requestId: string;
  acceptedVersion: number;
  assetReference: string;
  onClose: () => void;
  onConfirm: () => CreateLinkedSessionResult;
  onRefresh: () => void;
}) {
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const confirm = () => {
    if (creating) return;
    setCreating(true);
    const result = onConfirm();
    if (!result.ok) {
      setError(
        result.code === "ALREADY_LINKED" && result.existingSessionId
          ? `${result.message} Session: ${result.existingSessionId}.`
          : result.message,
      );
      setCreating(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !creating) onClose();
      }}
      title="Tạo bản nháp phiên đấu giá"
      description="Hệ thống đấu giá sẽ tạo đúng một phiên bản nháp từ yêu cầu mở phiên đã được tiếp nhận."
      preventClose={creating}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={creating}>
            Hủy
          </Button>
          <Button
            onClick={confirm}
            loading={creating}
            loadingText="Đang tạo bản nháp"
          >
            Xác nhận tạo bản nháp
          </Button>
        </>
      }
    >
      <dl className="opening-review-dialog-reference">
        <div>
          <dt>Yêu cầu mở phiên</dt>
          <dd>{requestId}</dd>
        </div>
        <div>
          <dt>Phiên bản đã tiếp nhận</dt>
          <dd>{acceptedVersion}</dd>
        </div>
        <div>
          <dt>Tham chiếu tài sản</dt>
          <dd>{assetReference}</dd>
        </div>
        <div>
          <dt>Trạng thái phiên mới</dt>
          <dd>DRAFT · NOT_READY</dd>
        </div>
      </dl>
      <p className="opening-review-disclosure">
        Hành động này không phê duyệt phiên, không tạo hồ sơ phê duyệt,
        không lập lịch và không xuất bản.
      </p>
      {error && (
        <div className="ops-conflict" role="alert">
          <p>{error}</p>
          <Button
            variant="secondary"
            onClick={() => {
              onRefresh();
              setError("");
            }}
          >
            Tải lại phiên bản
          </Button>
        </div>
      )}
    </Dialog>
  );
}
export function AuctionSessionListPage() {
  const { role } = useOutletContext<Context>();
  const dynamicSessions = useAuctionSessionStore((state) => state.sessions);
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const sessions = getAuctionSessionReadModel(dynamicSessions).filter(
    (session) =>
      `${session.sessionId} ${session.code} ${session.assetName} ${session.openingRequestId ?? ""}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <Shell title="Phiên đấu giá">
      {role === "CONTENT_STAFF" && (
        <Link className="button primary" to="/ops/auctions/new">
          Tạo phiên do SGDG quản lý
        </Link>
      )}
      <label className="session-search-field">
        <span>Tìm kiếm phiên</span>
        <input
          value={query}
          placeholder="Mã phiên, tài sản hoặc yêu cầu mở phiên"
          onChange={(event) =>
            setParams((current) => {
              const next = new URLSearchParams(current);
              if (event.target.value) next.set("q", event.target.value);
              else next.delete("q");
              return next;
            })
          }
        />
      </label>
      <Table
        headers={[
          "Phiên",
          "Tài sản",
          "Nguồn",
          "Chế độ",
          "Vòng đời",
          "Công bố",
          "Nguồn hình thành",
          "Cập nhật",
        ]}
      >
        {sessions.map((x) => {
          const dynamicSession = dynamicSessions.find(
            (session) => session.sessionId === x.sessionId,
          );
          const dynamic = Boolean(dynamicSession);
          return (
          <tr key={x.sessionId}>
            <td data-label="Session">
              <Link
                to={
                  dynamic
                    ? `/ops/auctions/${x.sessionId}`
                    : `/ops/auctions/${x.sessionId}?scenario=session-draft`
                }
              >
                {x.code}
              </Link>
            </td>
            <td data-label="Tài sản">
              {x.assetName} · {x.assetId}
            </td>
            <td data-label="Nguồn">{x.creationSource}</td>
            <td data-label="Mode">{x.managementMode}</td>
            <td data-label="Lifecycle">{x.lifecycleStatus}</td>
            <td data-label="Publication">{x.publicationStatus}</td>
            <td data-label="Lineage">
              {dynamicSession?.recordKind ===
              "DYNAMIC_SGDG_MANAGED_SESSION"
                ? `SGDG-managed · Asset v${dynamicSession.evaluatedAssetVersion}`
                : x.openingRequestId
                ? `${x.openingRequestId} · v${x.openingRequestVersion}`
                : "Direct SGDG"}
            </td>
            <td data-label="Cập nhật">{x.updatedAt}</td>
          </tr>
          );
        })}
      </Table>
      {!sessions.length && (
        <p className="ops-panel">Không có phiên khớp điều kiện tìm kiếm.</p>
      )}
    </Shell>
  );
}
export function AuctionSessionWorkspacePage() {
  const { sessionId } = useParams();
  const [p] = useSearchParams();
  const [saveNotice, setSaveNotice] = useState("");
  const dynamicSession = useAuctionSessionStore((state) =>
    state.sessions.find((session) => session.sessionId === sessionId),
  );
  if (dynamicSession)
    return <DynamicAuctionSessionWorkspace session={dynamicSession} />;
  const f =
    sessionId &&
    getAuctionSessionWorkspaceFixture(sessionId, scenario(p, "session-draft"));
  if (!f) return <NotFoundPage />;
  const ready = f.readiness.every((x) => x.passed);
  return (
    <Shell title="Không gian phiên đấu giá">
      <div className="ops-workspace">
        <section className="ops-panel">
          <Badge>{f.session.lifecycleStatus}</Badge>
          <Badge>{f.session.publicationStatus}</Badge>
          <h2>{f.session.assetName}</h2>
          <p>
            Creation: {f.session.creationSource} · Management:{" "}
            {f.session.managementMode}
          </p>
          {f.session.openingRequestId ? (
            <p>Request lineage: {f.session.openingRequestId}</p>
          ) : (
            <p>Phiên do SGDG tạo trực tiếp — không có yêu cầu mở phiên.</p>
          )}
          <button
            className="button secondary"
            onClick={() =>
              setSaveNotice(
                `Đã lưu bản nháp phiên ${f.session.sessionId} lúc ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}.`,
              )
            }
          >
            Lưu bản nháp
          </button>
          {saveNotice && <small role="status">{saveNotice}</small>}
          {f.session.lifecycleStatus === "DRAFT" && (
            <Link
              className="button primary"
              to={`/governance/approvals/APR-ROYAL-OAK-001?scenario=ready&role=admin&user=admin.checker@mock.local`}
            >
              Gửi phê duyệt
            </Link>
          )}
          <p>
            Mức sẵn sàng gửi: {ready ? "Đạt" : "Bị chặn"}; hồ sơ chỉ được tạo
            sau khi gửi.
          </p>
          <Link
            to={`/ops/auctions/${f.session.sessionId}/rules?scenario=draft`}
          >
            Chuẩn bị rules
          </Link>{" "}
          ·{" "}
          <Link
            to={`/ops/auctions/${f.session.sessionId}/schedule-publication?scenario=draft`}
          >
            Chuẩn bị schedule
          </Link>
        </section>
        <aside className="ops-decision">
          <h2>Mức độ sẵn sàng</h2>
          {f.readiness.map((x) => (
            <p key={x.id}>
              {x.passed ? <CheckCircle2 /> : <AlertTriangle />}
              {x.label}
            </p>
          ))}
        </aside>
      </div>
    </Shell>
  );
}

function DynamicAuctionSessionWorkspace({
  session,
}: {
  session: PersistedAuctionSession;
}) {
  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return <DynamicSgdgManagedAuctionSessionWorkspace session={session} />;
  return (
    <Shell title="Không gian phiên đấu giá">
      <div className="ops-workspace dynamic-session-workspace">
        <section className="ops-panel">
          <div className="opening-review-identity">
            <div>
              <span>BẢN NHÁP PHIÊN</span>
              <h2>{session.auctionCode}</h2>
              <p>{session.sessionId}</p>
            </div>
            <div className="dynamic-session-statuses">
              <CommonBadge tone="neutral">
                {session.lifecycleStatus}
              </CommonBadge>
              <CommonBadge tone="warning">
                {session.publicationStatus}
              </CommonBadge>
            </div>
          </div>
          <h3>Thông tin nguồn</h3>
          <dl>
            <dt>Tài sản</dt>
            <dd>
              {session.assetName} · {session.assetId}
            </dd>
            <dt>Nguồn tạo</dt>
            <dd>Được tạo từ yêu cầu mở phiên · {session.creationSource}</dd>
            <dt>Chế độ quản lý</dt>
            <dd>{session.managementMode}</dd>
            <dt>Yêu cầu mở phiên</dt>
            <dd>{session.openingRequestId}</dd>
            <dt>Phiên bản đã tiếp nhận</dt>
            <dd>{session.openingRequestVersion}</dd>
            <dt>Đơn vị phụ trách</dt>
            <dd>{session.ownerId}</dd>
            <dt>Người tạo</dt>
            <dd>{session.creatorId}</dd>
            <dt>Phiên bản</dt>
            <dd>{session.currentVersion}</dd>
          </dl>
          <div className="opening-review-disclosure">
            <strong>Chưa phê duyệt · Chưa lập lịch · Chưa xuất bản</strong>
            <p>
              Phiên đang ở trạng thái bản nháp. Giai đoạn này không tạo hồ sơ phê duyệt và
              không mở đăng ký.
            </p>
          </div>
        </section>
        <aside className="ops-decision">
          <h2>Bước chuẩn bị tiếp theo</h2>
          <DynamicConfigurationProjection sessionId={session.sessionId} />
          <DynamicAuctionContentProjection session={session} />
          <DynamicContentReviewProjection session={session} />
          <DynamicApprovalPackageProjection session={session} />
          <small id="dynamic-session-next-step">
            Việc gửi hồ sơ chỉ đưa yêu cầu vào hàng đợi thẩm định của Admin.
            Phê duyệt phiên, lập lịch và công bố chưa được bắt đầu.
          </small>
        </aside>
      </div>
      <section className="ops-panel opening-review-history">
        <h2>Lịch sử phiên</h2>
        <ol>
          {session.history.map((entry) => (
            <li key={entry.id}>
              <strong>ĐÃ TẠO PHIÊN LIÊN KẾT</strong>
              <span>
                {entry.requestId} · đã tiếp nhận v{entry.acceptedRequestVersion} →{" "}
                {entry.sessionId}
              </span>
              <small>
                {entry.actorRole} · {entry.createdAt} · {entry.visibility}
              </small>
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  );
}

function DynamicSgdgManagedAuctionSessionWorkspace({
  session,
}: {
  session: PersistedSgdgManagedSession;
}) {
  return (
    <Shell title="Không gian phiên đấu giá">
      <div className="ops-workspace dynamic-session-workspace">
        <section className="ops-panel">
          <div className="opening-review-identity">
            <div>
              <span>BẢN NHÁP PHIÊN · SGDG-MANAGED INITIATION</span>
              <h2>{session.auctionCode}</h2>
              <p>{session.sessionId}</p>
            </div>
            <div className="dynamic-session-statuses">
              <CommonBadge tone="neutral">
                {session.lifecycleStatus}
              </CommonBadge>
              <CommonBadge tone="warning">
                {session.publicationStatus}
              </CommonBadge>
            </div>
          </div>
          <h3>Nguồn SGDG quản lý và thông tin tài sản</h3>
          <dl>
            <dt>Tên phiên</dt>
            <dd>{session.assetName}</dd>
            <dt>Tham chiếu tài sản</dt>
            <dd>{session.assetId}</dd>
            <dt>Nguồn tạo</dt>
            <dd>SGDG-managed initiation · {session.creationSource}</dd>
            <dt>Chế độ quản lý</dt>
            <dd>{session.managementMode}</dd>
            <dt>Phiên bản tài sản đã đánh giá</dt>
            <dd>v{session.evaluatedAssetVersion}</dd>
            <dt>Tham chiếu mức sẵn sàng</dt>
            <dd>{session.assetReadinessReferenceId}</dd>
            <dt>Thời điểm ghi nhận</dt>
            <dd>{session.readinessObservedAt}</dd>
            <dt>Mục đích bản nháp</dt>
            <dd>{session.draftPurpose}</dd>
            <dt>Khu vực</dt>
            <dd>{session.operatingRegion}</dd>
            <dt>Đơn vị phụ trách</dt>
            <dd>{session.ownerId}</dd>
            <dt>Người tạo</dt>
            <dd>{session.creatorId}</dd>
            <dt>Phiên bản</dt>
            <dd>{session.currentVersion}</dd>
          </dl>
          <div className="opening-review-disclosure">
            <strong>Chưa phê duyệt · Chưa lập lịch · Chưa xuất bản</strong>
            <p>
              Tham chiếu sẵn sàng tại thời điểm tạo không bảo đảm điều kiện
              cho các giai đoạn sau. Phiên vẫn là bản nháp/chưa sẵn sàng.
            </p>
          </div>
        </section>
        <aside className="ops-decision">
          <h2>Bước chuẩn bị tiếp theo</h2>
          <DynamicConfigurationProjection sessionId={session.sessionId} />
          <DynamicAuctionContentProjection session={session} />
          <DynamicContentReviewProjection session={session} />
          <DynamicApprovalPackageProjection session={session} />
          <small id="sgdg-session-next-step">
            Hồ sơ phê duyệt vẫn đang bị chặn. Chưa có yêu cầu trong hàng đợi
            Admin, chưa có lịch và chưa công bố.
          </small>
        </aside>
      </div>
      <section className="ops-panel opening-review-history">
        <h2>Lịch sử phiên</h2>
        <ol>
          {session.history.map((entry) => (
            <li key={entry.id}>
              <strong>SGDG MANAGED SESSION CREATED</strong>
              <span>
                {entry.assetId} · readiness v
                {entry.evaluatedAssetVersion} → {entry.sessionId}
              </span>
              <small>
                {entry.actorRole} · {entry.createdAt} · {entry.visibility}
              </small>
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  );
}

function DynamicConfigurationProjection({
  sessionId,
}: {
  sessionId: string;
}) {
  const proposal = useAuctionConfigurationStore((state) =>
    state.proposals.find((item) => item.sessionId === sessionId),
  );
  const snapshot = useAuctionConfigurationStore((state) =>
    state.snapshots.find((item) => item.sessionId === sessionId),
  );
  const legacySnapshot = useAuctionConfigurationStore((state) =>
    state.legacySnapshots.find((item) => item.sessionId === sessionId),
  );
  const label =
    proposal?.legacyPolicyState
      ? proposal.legacyPolicyState === "LEGACY_SGDG_FEE_UNRESOLVED"
        ? "Đang giữ bằng chứng cấu hình cũ — cần quyết định về phí đăng của phiên do SGDG quản lý. Đây chưa phải cấu hình hiện hành đã xác nhận."
        : "Đang giữ bằng chứng cấu hình cũ — cần thẩm định lại theo quản trị. Đây chưa phải cấu hình hiện hành đã xác nhận."
      : proposal?.status === "DRAFT"
      ? proposal.overallConfigurationResolutionState === "READY"
        ? "Bản nháp cấu hình: phòng đấu giá và phí đăng của thành viên đã sẵn sàng."
        : proposal.overallConfigurationResolutionState ===
            "BUSINESS_DECISION_REQUIRED"
          ? "Cấu hình: cần quyết định nghiệp vụ."
          : "Cấu hình: cần xác định phòng đấu giá và phí đăng của thành viên."
      : proposal?.status === "SUBMITTED"
        ? proposal.overallConfigurationResolutionState ===
            "BUSINESS_DECISION_REQUIRED"
          ? "SUBMITTED — BUSINESS DECISION REQUIRED. ADMIN confirmation is blocked."
          : "Cấu hình đang chờ Admin xác nhận."
        : proposal?.status === "RETURNED_FOR_CORRECTION"
          ? "Cấu hình cần Nhân viên nội dung chỉnh sửa."
          : proposal?.status === "CONFIRMED" && snapshot
            ? `Cấu hình đã xác nhận · ${snapshot.snapshotId} · đề xuất v${snapshot.proposalVersion}.`
            : "Cấu hình chưa bắt đầu.";
  return (
    <div className="dynamic-configuration-projection">
      <p>{label}</p>
      {proposal?.roomResolution && (
        <p>
          Phòng đấu giá thường: {proposal.priceBandResolution?.reference} →{" "}
          {proposal.roomResolution.roomReference}
        </p>
      )}
      {proposal?.overallConfigurationResolutionState ===
        "BUSINESS_DECISION_REQUIRED" && (
        <p role="alert">
          Member Listing Fee: BUSINESS_DECISION_REQUIRED.{" "}
          {SGDG_MANAGED_FEE_DECISION_MESSAGE}
        </p>
      )}
      {legacySnapshot && (
        <p>
          Legacy evidence: {legacySnapshot.snapshotId} ·{" "}
          {legacySnapshot.policyClassification}. No current Snapshot.
        </p>
      )}
      {proposal?.status === "CONFIRMED" && snapshot && (
        <>
          <p>
            Chế độ đã xác nhận: {snapshot.managementMode} · {snapshot.confirmedAt}
          </p>
          <p>
            Chính sách {snapshot.policyDecisionReference.decisionId} · v
            {snapshot.policyDecisionReference.decisionVersion} ·{" "}
            {snapshot.priceBandResolution.reference} →{" "}
            {snapshot.roomResolution.roomReference} · fee{" "}
            {snapshot.listingFeeResolution.applicability === "APPLICABLE"
              ? snapshot.listingFeeResolution.fee.kind === "AMOUNT"
                ? `${snapshot.listingFeeResolution.fee.amountVnd.toLocaleString(
                    "vi-VN",
                  )} VND`
                : snapshot.listingFeeResolution.fee.sourceLabel
              : snapshot.listingFeeResolution.applicability}
          </p>
          <p>{snapshot.policyDisclaimer}</p>
          <p>{snapshot.normalizationDisclaimer}</p>
        </>
      )}
      {proposal && !snapshot && (
        <p>{AUCTION_ROOM_FEE_POLICY_DISCLAIMER}</p>
      )}
      <p>
        Phiên vẫn là bản nháp/chưa sẵn sàng. Việc xác nhận cấu hình riêng lẻ
        không đồng nghĩa phê duyệt hoặc xuất bản phiên.
      </p>
      <Link to={`/ops/auctions/${sessionId}/rules`}>
        Mở không gian cấu hình
      </Link>
    </div>
  );
}

function DynamicAuctionContentProjection({
  session,
}: {
  session: PersistedAuctionSession;
}) {
  const content = useAuctionContentStore((state) =>
    state.contents.find((item) => item.sessionId === session.sessionId),
  );
  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return (
      <div className="dynamic-auction-content-projection">
        <strong>Nội dung đấu giá</strong>
        <p>Dynamic Content foundation deferred for this branch.</p>
        <p>
          Tên, mục đích và khu vực do SGDG tạo trực tiếp vẫn ở phiên hiện tại để tránh
          tạo duplicate content authority.
        </p>
        <Link to={`/ops/auctions/${session.sessionId}/content`}>
          Xem deferred content boundary
        </Link>
      </div>
    );
  return (
    <div className="dynamic-auction-content-projection">
      <strong>Nội dung đấu giá</strong>
      <p>
        {content
          ? content.status === "COMPLETE"
            ? "CONTENT DRAFT COMPLETE"
            : content.status
          : "CHƯA KHỞI TẠO"}
      </p>
      {content && (
        <>
          <p>
            Phiên bản nội dung: v{content.contentVersion} · Tiêu đề:{" "}
            {content.workingContent.auctionTitle || "Chưa có"}
          </p>
          <p>
            Tóm tắt:{" "}
            {content.workingContent.auctionSummary
              ? "Đã có"
              : "Chưa hoàn chỉnh"}
          </p>
          <p>
            Nguồn: {content.sourceLineage.openingRequestId} · v
            {content.sourceLineage.openingRequestVersion}
          </p>
        </>
      )}
      <small>{PROTOTYPE_CONTENT_POLICY.classification}</small>
      <ButtonLink
        variant={content ? "secondary" : "primary"}
        to={`/ops/auctions/${session.sessionId}/content`}
      >
        {content ? "Mở nội dung đấu giá" : "Khởi tạo hoặc mở khu vực nội dung"}
      </ButtonLink>
    </div>
  );
}

function DynamicContentReviewProjection({
  session,
}: {
  session: PersistedAuctionSession;
}) {
  const review = useAuctionContentReviewStore((state) =>
    state.reviews.find((item) => item.sessionId === session.sessionId),
  );
  const completionRecord = useAuctionContentReviewStore((state) =>
    state.completionRecords.find((item) => item.reviewId === review?.reviewId),
  );
  const projection = getSessionPackageProjection(session.sessionId);
  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return (
      <div className="dynamic-content-review-projection">
        <strong>Thẩm định nội dung phiên</strong>
        <p role="alert">
          {CONTENT_REVIEW_BLOCKED_BY_CONFIGURATION}:{" "}
          {SGDG_CONTENT_REVIEW_BLOCKER_MESSAGE}
        </p>
        <p>Hồ sơ phiên: chưa sẵn sàng · Chưa có biên bản hoàn tất.</p>
        <p>{PROTOTYPE_CONTENT_POLICY.classification}</p>
        <ButtonLink
          variant="secondary"
          to={`/ops/auctions/${session.sessionId}/content-review`}
        >
          Xem điều kiện cấu hình đang chặn
        </ButtonLink>
      </div>
    );
  return (
    <div className="dynamic-content-review-projection">
      <strong>Thẩm định nội dung phiên</strong>
      <p>{review?.status ?? "NOT STARTED"}</p>
      <p>
        Hồ sơ phiên:{" "}
        {projection === "READY_FOR_APPROVAL_PACKAGE_PREPARATION"
          ? "Sẵn sàng chuẩn bị hồ sơ phê duyệt"
          : projection}
      </p>
      <p>
        Biên bản hoàn tất:{" "}
        {completionRecord?.completionRecordId ?? "NOT CREATED"}
      </p>
      <p>
        Phiên: {session.lifecycleStatus} · Công bố:{" "}
        {session.publicationStatus}
      </p>
      <small>{PROTOTYPE_CONTENT_POLICY.classification}</small>
      <ButtonLink
        variant={review ? "secondary" : "primary"}
        to={`/ops/auctions/${session.sessionId}/content-review`}
      >
        {review ? "Mở thẩm định nội dung" : "Chuẩn bị thẩm định nội dung"}
      </ButtonLink>
    </div>
  );
}

function DynamicApprovalPackageProjection({
  session,
}: {
  session: PersistedAuctionSession;
}) {
  const review = useAuctionContentReviewStore((state) =>
    state.reviews.find((item) => item.sessionId === session.sessionId),
  );
  const completionRecord = useAuctionContentReviewStore((state) =>
    state.completionRecords.find((item) => item.reviewId === review?.reviewId),
  );
  const packageValue = useAuctionApprovalPackageStore((state) =>
    state.packages.find((item) => item.sessionId === session.sessionId),
  );
  const submissionRecord = useAuctionApprovalPackageStore((state) =>
    state.submissionRecords.find(
      (item) => item.packageId === packageValue?.packageId,
    ),
  );
  const approvalReview = useAuctionApprovalReviewStore((state) =>
    state.reviews.find((item) => item.packageId === packageValue?.packageId),
  );
  const approvalDecision = useAuctionApprovalDecisionStore((state) =>
    state.decisions.find((item) => item.packageId === packageValue?.packageId),
  );
  const scheduleDraft = useAuctionScheduleDraftStore((state) =>
    state.drafts.find((item) => item.sessionId === session.sessionId),
  );
  const confirmedSchedule = useAuctionConfirmedScheduleStore((state) =>
    state.confirmedSchedules.find(
      (item) => item.sessionId === session.sessionId,
    ),
  );
  const registrationReadiness =
    useAuctionRegistrationOpeningReadinessStore((state) =>
      state.assessments.find(
        (item) => item.sessionId === session.sessionId,
      ),
    );
  const registrationWindow = useAuctionRegistrationWindowStore((state) =>
    state.registrationWindows.find(
      (item) => item.sessionId === session.sessionId,
    ),
  );
  const allCustomerRegistrations = useAuctionCustomerRegistrationStore(
    (state) => state.registrations,
  );
  const customerRegistrations = allCustomerRegistrations.filter(
    (item) => item.sessionId === session.sessionId,
  );
  const registrationValidations = useAuctionRegistrationValidationStore(
    (state) => state.validations,
  );
  const registrationCorrectionDrafts =
    useAuctionRegistrationCorrectionDraftStore(
      (state) => state.correctionDrafts,
    );
  const registrationResubmissions =
    useAuctionRegistrationResubmissionStore(
      (state) => state.resubmissions,
    );
  const registrationRevalidations =
    useAuctionRegistrationRevalidationStore(
      (state) => state.revalidations,
    );
  const membershipChecks = useAuctionMembershipCheckStore(
    (state) => state.membershipChecks,
  );
  const depositChecks = useAuctionDepositCheckStore(
    (state) => state.depositChecks,
  );
  const queueItem = packageValue
    ? getApprovalDecisionQueue().find(
        (item) => item.packageId === packageValue.packageId,
      )
    : undefined;
  if (session.recordKind === "DYNAMIC_SGDG_MANAGED_SESSION")
    return (
      <div className="dynamic-content-review-projection">
        <strong>Hồ sơ phê duyệt</strong>
        <p role="alert">
          {APPROVAL_PACKAGE_BLOCKED_BY_CONFIGURATION}:{" "}
          {SGDG_APPROVAL_PACKAGE_BLOCKER_MESSAGE}
        </p>
        <p>Hồ sơ phê duyệt chưa được tạo.</p>
        <p>Hồ sơ phê duyệt đang bị cấu hình chặn.</p>
        <p>
          {APPROVAL_REVIEW_BLOCKED_BY_CONFIGURATION}:{" "}
          {REVIEW_CONFIGURATION_BLOCKER_MESSAGE}
        </p>
        <p>Thẩm định hồ sơ đang bị cấu hình chặn.</p>
        <p>Quyết định phê duyệt đang bị cấu hình chặn.</p>
        <p>Lịch đang bị cấu hình chặn.</p>
        <p>Xác nhận lịch đang bị cấu hình chặn.</p>
        <p>Kiểm tra mở đăng ký đang bị cấu hình chặn.</p>
        <p>Đăng ký đang bị cấu hình chặn.</p>
        <p>Hàng đợi: chưa có · Phê duyệt phiên: chưa bắt đầu.</p>
        <small>{PROTOTYPE_CONTENT_POLICY.classification}</small>
        <ButtonLink
          variant="secondary"
          to={`/ops/auctions/${session.sessionId}/approval-package`}
        >
          Xem điều kiện đang chặn hồ sơ
        </ButtonLink>
      </div>
    );
  const packageLabel =
    !completionRecord || review?.status !== "COMPLETED"
      ? "NOT AVAILABLE"
      : !packageValue
        ? "NOT CREATED"
        : packageValue.status === "READY_TO_SUBMIT"
          ? "READY TO SUBMIT"
          : packageValue.status;
  return (
    <div className="dynamic-content-review-projection">
      <strong>Hồ sơ phê duyệt</strong>
      <p>Hồ sơ phê duyệt: {packageLabel}</p>
      {!completionRecord && (
        <>
          <p>Hồ sơ phê duyệt chưa được tạo.</p>
          <p>Lý do: bước thẩm định nội dung chưa hoàn tất.</p>
        </>
      )}
      {completionRecord && !packageValue && (
        <p>
          Hồ sơ phiên đã sẵn sàng để chuẩn bị phê duyệt.
        </p>
      )}
      {packageValue && (
        <p>
          {packageValue.packageId} · hồ sơ v{packageValue.packageVersion}
        </p>
      )}
      {packageValue?.status === "SUBMITTED" && (
        <>
          <p>
            Hàng đợi Admin:{" "}
            {queueItem?.queueState ??
              submissionRecord?.queueState ??
              "INVALID"}{" "}
            · Bằng chứng:{" "}
            {getApprovalPackageEvidenceValidity(packageValue)}
          </p>
          <p>
            Thẩm định hồ sơ:{" "}
            {approvalDecision
              ? "DECISION RECORDED"
              : approvalReview
              ? approvalReview.status === "STALE"
                ? "IN_REVIEW — EVIDENCE STALE"
                : approvalReview.status
              : "NOT STARTED"}
          </p>
          <p>
            Quyết định phê duyệt:{" "}
            {approvalDecision?.outcome ?? "NOT MADE"}.
          </p>
          <p>
            Phê duyệt phiên:{" "}
            {getSessionApprovalProjection(session.sessionId)}.
          </p>
          {approvalDecision && (
            <>
              <p>Lịch: {scheduleDraft ? "Bản nháp" : "Chưa tạo"}.</p>
              {scheduleDraft && (
                <p>
                  Mức hoàn thiện lịch:{" "}
                  {scheduleDraft.completeness.complete
                    ? "COMPLETE"
                    : "INCOMPLETE"}.
                </p>
              )}
              <p>
                Xác nhận lịch:{" "}
                {confirmedSchedule ? "CONFIRMED" : "NOT STARTED"}.
              </p>
              {confirmedSchedule && (
                <>
                  <p>Bản nháp lịch: hoàn tất.</p>
                  <p>Lịch đã xác nhận.</p>
                  <p>
                    Mức sẵn sàng mở đăng ký:{" "}
                    {registrationReadiness
                      ? registrationReadiness.status
                          .replaceAll("_", " ")
                          .replace("READY TO OPEN REGISTRATION", "READY TO OPEN")
                      : "NOT ASSESSED"}.
                  </p>
                  <p>
                    Bước tiếp theo: chuẩn bị mở đăng ký.
                  </p>
                </>
              )}
              {registrationWindow ? (
                <>
                  <p>Registration Window: OPEN.</p>
                  {customerRegistrations.length === 0 ? (
                    <p>Chưa có đăng ký của khách hàng.</p>
                  ) : (
                    customerRegistrations.map((registration) => {
                      const validation = registrationValidations.find(
                        (item) =>
                          item.registrationId === registration.registrationId,
                      );
                      const correctionDraft =
                        registrationCorrectionDrafts.find(
                          (item) =>
                            item.registrationId ===
                            registration.registrationId,
                        );
                      const resubmission =
                        registrationResubmissions.find(
                          (item) =>
                            item.registrationId ===
                            registration.registrationId,
                        );
                      const revalidation =
                        registrationRevalidations.find(
                          (item) =>
                            item.resubmissionId ===
                            resubmission?.resubmissionId,
                        );
                      const membershipCheck = membershipChecks.find(
                        (item) =>
                          item.registrationId ===
                          registration.registrationId,
                      );
                      const depositCheck = depositChecks.find(
                        (item) =>
                          item.registrationId ===
                          registration.registrationId,
                      );
                      const validationLabel = !validation
                        ? "NOT STARTED"
                        : validation.outcome === "VALID"
                          ? "VALID"
                          : validation.correctability === "CORRECTABLE"
                            ? "INVALID — CORRECTABLE"
                            : "INVALID — BLOCKING";
                      const nextStep = depositCheck
                        ? depositCheck.nextStep
                        : membershipCheck
                        ? membershipCheck.nextStep
                        : revalidation
                        ? revalidation.nextStep
                        : resubmission
                        ? resubmission.nextStep
                        : !validation
                        ? "NOT STARTED"
                        : validation.nextStep ===
                            "READY_FOR_MEMBERSHIP_CHECK"
                          ? "READY FOR MEMBERSHIP CHECK"
                          : validation.nextStep === "CORRECTION_REQUIRED"
                            ? "CORRECTION REQUIRED"
                            : "STOPPED";
                      return (
                        <div key={registration.registrationId}>
                          <p>
                            Đăng ký của khách hàng: {registration.status}.
                          </p>
                          <p>
                            Registration Validation: {validationLabel}.
                          </p>
                          <p>Next Step: {nextStep}.</p>
                          <p>
                            Membership Check:{" "}
                            {membershipCheck
                              ? `${membershipCheck.outcome} / ${membershipCheck.nextStep}`
                              : "NOT CHECKED"}
                            .
                          </p>
                          <p>
                            Deposit Check:{" "}
                            {depositCheck
                              ? `${depositCheck.outcome} / ${depositCheck.nextStep}`
                              : "NOT CHECKED"}
                            .
                          </p>
                          {validation?.nextStep ===
                            "CORRECTION_REQUIRED" && (
                            <>
                              <p>
                                Original Registration:{" "}
                                {registration.status}.
                              </p>
                              <p>
                                Previous Validation:{" "}
                                {validation.nextStep}.
                              </p>
                              <p>
                                Bản nháp chỉnh sửa:{" "}
                                {correctionDraft?.status ??
                                  "NOT STARTED"}.
                              </p>
                              <p>
                                Corrected Resubmission:{" "}
                                {resubmission?.status ??
                                  "NOT STARTED"}.
                              </p>
                              <p>
                                Revalidation:{" "}
                                {revalidation
                                  ? `${revalidation.outcome} / ${revalidation.correctability}`
                                  : "NOT STARTED"}
                                .
                              </p>
                              <p>
                                Phiên: {session.lifecycleStatus} /{" "}
                                {session.publicationStatus}.
                              </p>
                              <p>Công bố: chưa bắt đầu.</p>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                  <p>
                    Membership:{" "}
                    {membershipChecks.some((item) =>
                      customerRegistrations.some(
                        (registration) =>
                          registration.registrationId ===
                          item.registrationId,
                      ),
                    )
                      ? "CHECKED"
                      : "NOT CHECKED"}
                    .
                  </p>
                  <p>
                    Deposit:{" "}
                    {depositChecks.some((item) =>
                      customerRegistrations.some(
                        (registration) =>
                          registration.registrationId ===
                          item.registrationId,
                      ),
                    )
                      ? "CHECKED"
                      : "NOT CHECKED"}
                    .
                  </p>
                  <p>Eligibility: NOT EVALUATED.</p>
                </>
              ) : (
                <p>Registration: NOT OPEN.</p>
              )}
              {!confirmedSchedule && <p>Bước tiếp theo: chuẩn bị lịch.</p>}
            </>
          )}
        </>
      )}
      {packageValue && (
        <p>
          Phiên: {session.lifecycleStatus} · Công bố:{" "}
          {session.publicationStatus}
        </p>
      )}
      <small>{PROTOTYPE_CONTENT_POLICY.classification}</small>
      {completionRecord && (
        <ButtonLink
          variant={packageValue ? "secondary" : "primary"}
          to={`/ops/auctions/${session.sessionId}/approval-package`}
        >
          {packageValue
            ? "Mở hồ sơ phê duyệt"
            : "Chuẩn bị hồ sơ phê duyệt"}
        </ButtonLink>
      )}
      {approvalDecision && (
        <ButtonLink
          variant={scheduleDraft ? "secondary" : "primary"}
          to={`/ops/auctions/${session.sessionId}/schedule`}
        >
          {scheduleDraft ? "Mở bản nháp lịch" : "Chuẩn bị lịch"}
        </ButtonLink>
      )}
    </div>
  );
}

export function RuleConfigurationPage() {
  const { sessionId } = useParams();
  const { role } = useOutletContext<Context>();
  const dynamicSession = useAuctionSessionStore((state) =>
    state.sessions.find((session) => session.sessionId === sessionId),
  );
  if (dynamicSession)
    return (
      <DynamicAuctionConfigurationPage
        session={dynamicSession}
        role={role}
      />
    );
  return <FixtureRuleConfigurationPage />;
}

function FixtureRuleConfigurationPage() {
  const { sessionId } = useParams();
  const [p] = useSearchParams();
  const { role } = useOutletContext<Context>();
  const currentScenario = scenario(p, "draft");
  const f = sessionId && getAuctionRuleFixture(sessionId, currentScenario);
  const [price, setPrice] = useState(2900000000);
  const [increment, setIncrement] = useState(25000000);
  const [notice, setNotice] = useState("");
  if (currentScenario === "loading")
    return <Shell title="Cấu hình phiên đấu giá"><p>Đang tải cấu hình…</p></Shell>;
  if (currentScenario === "error")
    return <Shell title="Cấu hình phiên đấu giá"><p className="ops-conflict">Không thể tải cấu hình. Vui lòng thử lại.</p></Shell>;
  if (!f) return <NotFoundPage />;
  if (f.sensitiveChange)
    return (
      <Shell title="Cấu hình phiên đấu giá">
        <section className="ops-panel">
          <h2>Yêu cầu thay đổi nhạy cảm đang chờ duyệt</h2>
          <p className="ops-conflict">
            Snapshot đã duyệt vẫn giữ nguyên; đề xuất mới không ghi đè trực tiếp.
          </p>
          <div className="ops-definition">
            <div><dt>Giá trị cũ</dt><dd>2.900.000.000 ₫</dd></div>
            <div><dt>Giá trị đề xuất</dt><dd>3.000.000.000 ₫</dd></div>
            <div><dt>Expected version</dt><dd>v{f.version}</dd></div>
          </div>
          <Link className="button primary" to="/governance/changes/CHG-ROYAL-OAK-001">
            Mở hồ sơ governance
          </Link>
        </section>
      </Shell>
    );
  const configuration: AuctionConfiguration = {
    ruleVersionId: f.ruleVersionId,
    version: f.version,
    status: f.status as AuctionConfiguration["status"],
    startingPrice: price,
    minimumIncrement: increment,
    depositPolicyReference: f.depositPolicyReference,
    eligibilityPolicyReference: f.eligibilityPolicyReference,
    extensionPolicyReference: f.extensionPolicyReference,
    fallbackPolicyReference: f.fallbackPolicyReference,
  };
  const errors = configurationErrors(configuration);
  const editable = !f.immutableSnapshot && role === "CONTENT_STAFF";
  const runCommand = (kind: "save" | "submit") => {
    const command = kind === "save" ? saveConfiguration : submitConfiguration;
    const result = command(configuration, role, f.version);
    setNotice(
      result.ok
        ? kind === "save"
          ? "Đã lưu đề xuất. Lịch và publication không thay đổi."
          : "Đã gửi đề xuất để duyệt; cấu hình chưa được phê duyệt."
        : `Không thể thực hiện: ${result.reason}.`,
    );
  };
  return (
    <Shell title="Cấu hình phiên đấu giá">
      <div className="ops-workspace">
        <section className="ops-panel">
          <h2>{f.auctionCode} · {f.status}</h2>
          <div className="ops-definition">
            <div><dt>Session</dt><dd>{f.sessionId}</dd></div>
            <div><dt>Tài sản</dt><dd>{f.assetId}</dd></div>
            <div><dt>Lifecycle</dt><dd>{f.lifecycleStatus}</dd></div>
            <div><dt>Phiên bản</dt><dd>v{f.version}</dd></div>
            <div><dt>Cập nhật</dt><dd>{new Date(f.updatedAt).toLocaleString("vi-VN")}</dd></div>
          </div>
          <h3>Phạm vi quản lý</h3>
          <p><strong>{f.managementMode}</strong> — nguồn yêu cầu từ khách hàng không chuyển quyền cấu hình nội bộ ra khỏi SGDG.</p>
        </section>
        <aside className="ops-panel">
          <h2>{errors.length ? "Chưa sẵn sàng" : "Sẵn sàng gửi duyệt"}</h2>
          {errors.length ? errors.map((error) => <p className="ops-conflict" key={error}>{error}</p>) : <p>Mọi kiểm tra cấu hình đã đạt.</p>}
          <p>Readiness không đồng nghĩa đã duyệt, đã lên lịch hoặc đã công bố.</p>
          <p>
            <strong>Legacy fixture Configuration.</strong> This fixture is not
            governed by the current dynamic Auction Room and Member Listing Fee
            policy.
          </p>
        </aside>
      </div>
      <section className="ops-panel ops-config-form">
        <h2>{f.immutableSnapshot ? "Snapshot cấu hình" : "Đề xuất quy tắc"}</h2>
        <label>Giá khởi điểm
          <input type="number" disabled={!editable} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </label>
        <label>Bước giá
          <input type="number" disabled={!editable} value={increment} onChange={(e) => setIncrement(Number(e.target.value))} />
        </label>
        <div className="ops-definition">
          <div><dt>Deposit</dt><dd>{f.depositPolicyReference || "Thiếu tham chiếu"}</dd></div>
          <div><dt>Eligibility</dt><dd>{f.eligibilityPolicyReference}</dd></div>
          <div><dt>Extension</dt><dd>{f.extensionPolicyReference}</dd></div>
          <div><dt>Fallback</dt><dd>{f.fallbackPolicyReference}</dd></div>
        </div>
        {notice && <p role="status">{notice}</p>}
        {f.status === "APPROVED_SNAPSHOT" ? (
          <>
            <p className="ops-conflict">Snapshot đã duyệt là bất biến. Thay đổi nhạy cảm phải tạo hồ sơ governance mới.</p>
            {role === "CONTENT_STAFF" && (
              <Link className="button primary" to="?scenario=sensitive-change-pending">
                Tạo yêu cầu thay đổi nhạy cảm
              </Link>
            )}
          </>
        ) : f.status === "PENDING_REVIEW" ? (
          <p>Đề xuất đang chờ duyệt và chỉ đọc.</p>
        ) : editable ? (
          <div className="ops-actions">
            <button className="button secondary" onClick={() => runCommand("save")}>Lưu đề xuất cấu hình</button>
            <button className="button primary" disabled={errors.length > 0} onClick={() => runCommand("submit")}>Gửi phê duyệt</button>
          </div>
        ) : (
          <p className="ops-conflict">Vai trò hiện tại không được phép commit cấu hình.</p>
        )}
      </section>
    </Shell>
  );
}
export function SchedulePublicationPage() {
  const { sessionId } = useParams();
  const [p] = useSearchParams();
  const { role } = useOutletContext<Context>();
  const s = scenario(p, "draft");
  const f = sessionId && getAuctionScheduleFixture(sessionId, s);
  if (!f) return <NotFoundPage />;
  const invalid = s === "invalid-chronology";
  const canCommit = role === "ADMIN";
  return (
    <Shell title="Lịch & publication">
      <section className="ops-panel">
        <h2>Schedule proposal · {f.timezone}</h2>
        {[
          ["Registration open", f.registrationOpenAt],
          ["Registration close", f.registrationCloseAt],
          ["Eligibility checkpoint", f.eligibilityCheckpointAt],
          ["Bidding start", f.biddingStartAt],
          ["Bidding end", f.biddingEndAt],
        ].map(([l, v]) => (
          <label key={l}>
            {l}
            <input value={v} readOnly />
          </label>
        ))}
        {invalid && (
          <p className="ops-conflict">
            Invalid chronology: không tạo Schedule Version.
          </p>
        )}
        <p>
          Lifecycle{" "}
          {s === "approved-not-scheduled"
            ? "APPROVED"
            : s === "scheduled" || s === "published"
              ? "SCHEDULED"
              : "DRAFT"}{" "}
          · Publication{" "}
          {s === "published"
            ? "PUBLISHED"
            : s === "scheduled"
              ? "SCHEDULED_FOR_PUBLICATION"
              : "NOT_PUBLISHED"}
        </p>
        {canCommit && !invalid && s === "approved-not-scheduled" && (
          <Link className="button primary" to="?scenario=scheduled">
            Create Schedule
          </Link>
        )}
        {canCommit && s === "scheduled" && (
          <Link className="button primary" to="?scenario=published">
            Publish separately
          </Link>
        )}
        <p>APPROVED ≠ SCHEDULED ≠ PUBLISHED.</p>
      </section>
    </Shell>
  );
}
export function ApprovalQueuePage() {
  const [p] = useSearchParams();
  const { role } = useOutletContext<Context>();
  if (role === "CONTENT_STAFF") return <Navigate to="/ops" replace />;
  const rows = getApprovalQueueFixture(scenario(p, "session-pending-approval"));
  return (
    <Shell title="Hàng đợi phê duyệt">
      <section className="ops-panel">
        <strong>Dữ liệu mẫu phục vụ kiểm tra tương thích.</strong>
        <p>
          Hàng đợi cũ này tách biệt với các hồ sơ phê duyệt được gửi từ
          luồng dữ liệu hiện hành.
        </p>
      </section>
      <Table headers={["Hồ sơ", "Phiên", "Người lập", "Mức sẵn sàng", "Thao tác"]}>
        {rows.map((x) => (
          <tr key={x.approvalId}>
            <td>{x.approvalId}</td>
            <td>{x.sessionId}</td>
            <td>{x.makerUserId}</td>
            <td>{x.readinessPassed ? "Đạt" : "Thiếu dữ liệu"}</td>
            <td>
              <Link
                to={`/governance/approvals/${x.approvalId}?scenario=ready&role=admin&user=admin.checker@mock.local`}
              >
                Xem xét hồ sơ
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
export function ApprovalPackagePage() {
  const { approvalId } = useParams();
  const [p] = useSearchParams();
  const { role } = useOutletContext<Context>();
  const f =
    approvalId &&
    getApprovalPackageFixture(
      approvalId,
      scenario(p, "ready"),
      p.get("user") || "admin.checker@mock.local",
      role,
    );
  const [decision, setDecision] = useState<string>();
  if (!f) return <NotFoundPage />;
  const blocked = f.stale || !f.canApprove;
  return (
    <Shell title="Hồ sơ phê duyệt">
      <section className="ops-panel">
        <strong>Dữ liệu mẫu phục vụ kiểm tra tương thích.</strong>
        <p>
          Các nút quyết định của dữ liệu mẫu không có hiệu lực đối với hồ sơ
          phê duyệt thuộc luồng hiện hành.
        </p>
      </section>
      <div className="ops-workspace">
        <section className="ops-panel">
          <Badge>{f.item.status}</Badge>
          <h2>{f.item.approvalId}</h2>
          <p>
            Người lập {f.item.makerUserId} · người đang xử lý {f.currentUserId} ·
            phiên bản {f.item.submittedVersion}
          </p>
          <p>
            {f.makerConflict
              ? "Xung đột người lập - người duyệt: hai tài khoản trùng nhau."
              : f.stale
                ? "Phiên bản đã cũ nên chưa thể ra quyết định."
                : "Đã sẵn sàng để người duyệt quyết định."}
          </p>
          <p>
            Phê duyệt chỉ chuyển hồ sơ sang trạng thái ĐÃ PHÊ DUYỆT; chưa lập
            lịch và chưa xuất bản.
          </p>
        </section>
        <aside className="ops-decision">
          <h2>Quyết định</h2>
          <button
            className="button primary"
            disabled={blocked}
            onClick={() => setDecision("approve")}
          >
            Phê duyệt
          </button>
          <button
            className="button secondary"
            disabled={f.stale}
            onClick={() => setDecision("correction")}
          >
            Yêu cầu chỉnh sửa
          </button>
          <button
            className="button ops-destructive"
            disabled={f.stale}
            onClick={() => setDecision("reject")}
          >
            Từ chối
          </button>
        </aside>
      </div>
      {decision && (
        <Decision
          title={`Xác nhận ${
            decision === "approve"
              ? "phê duyệt"
              : decision === "correction"
                ? "yêu cầu chỉnh sửa"
                : "từ chối"
          }`}
          onClose={() => setDecision(undefined)}
          onConfirm={() => setDecision(undefined)}
          link={
            decision === "approve"
              ? `/ops/auctions/${f.item.sessionId}/schedule-publication?scenario=approved-not-scheduled`
              : undefined
          }
        />
      )}
    </Shell>
  );
}
function Badge({ children }: { children: ReactNode }) {
  return <span className="badge warning">{children}</span>;
}
function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="ops-table-wrap">
      <table>
        <caption className="sr-only">Dữ liệu vận hành</caption>
        <thead>
          <tr>
            {headers.map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Decision({
  title,
  onClose,
  onConfirm,
  link,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  link?: string;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="ops-dialog-overlay">
      <section className="ops-dialog" role="dialog" aria-modal="true">
        <h2>{title}</h2>
        <label>
          Lý do
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        {link ? (
          <Link className="button primary" to={link}>
            Confirm
          </Link>
        ) : (
          <button
            className="button primary"
            disabled={!reason.trim()}
            onClick={onConfirm}
          >
            Confirm
          </button>
        )}
      </section>
    </div>
  );
}
