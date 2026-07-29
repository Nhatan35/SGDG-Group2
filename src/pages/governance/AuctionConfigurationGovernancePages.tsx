import { useMemo, useRef, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, LockKeyhole } from "lucide-react";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import type { StaffRole } from "../../config/staffRoles";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import {
  type ConfigurationListingFeeResolution,
  type ConfigurationSection,
  useAuctionConfigurationStore,
  validateConfiguration,
} from "../../store/auctionConfigurationStore";
import { NotFoundPage } from "../NotFoundPage";
import {
  AUCTION_ROOM_FEE_POLICY_DISCLAIMER,
  MP_INTERPRETATION_DISCLAIMER,
  PRICE_BAND_NORMALIZATION_DISCLAIMER,
  SGDG_MANAGED_FEE_DECISION_MESSAGE,
} from "../../services/roomValueTierPolicy";
import "../../styles/auction-configuration.css";

const adminActorId = "admin.configuration@mock.local";
const correctionSections: ConfigurationSection[] = [
  "MANAGEMENT_MODE",
  "RULES",
  "PRICE_BAND",
  "ROOM",
  "MEMBER_FEE",
  "SESSION",
];

const formatMoney = (value: number | null) =>
  value === null
    ? "Chưa nhập"
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 2,
      }).format(value);

const formatListingFee = (
  resolution: ConfigurationListingFeeResolution | undefined,
) => {
  if (!resolution) return "POLICY_RESOLUTION_REQUIRED";
  if (resolution.applicability !== "APPLICABLE")
    return resolution.applicability;
  if (resolution.fee.kind === "AMOUNT")
    return formatMoney(resolution.fee.amountVnd);
  return `MP theo bảng nguồn · ${resolution.fee.sourceLabel}`;
};

export function AuctionConfigurationGovernanceQueuePage() {
  const { role } = useOutletContext<{ role: StaffRole }>();
  const proposals = useAuctionConfigurationStore((state) => state.proposals);
  const sessions = useAuctionSessionStore((state) => state.sessions);
  const governed = proposals.filter((proposal) => proposal.status !== "DRAFT");

  if (role !== "ADMIN")
    return (
      <section className="configuration-page">
        <h1>Quản trị cấu hình phiên</h1>
        <p role="alert">Bạn không có quyền truy cập chức năng này.</p>
      </section>
    );

  return (
    <section className="configuration-page">
      <header className="ops-heading">
        <div>
          <span>QUẢN TRỊ · DÀNH CHO ADMIN</span>
          <h1>Phê duyệt cấu hình phiên</h1>
          <p>
            Hàng đợi xác nhận cấu hình do Nhân viên nội dung gửi lên. Xác nhận
            cấu hình không đồng nghĩa với phê duyệt hoặc công bố phiên.
          </p>
        </div>
      </header>
      <section className="ops-panel configuration-queue">
        <h2>Đề xuất đã gửi và lịch sử xử lý</h2>
        <div className="configuration-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cấu hình</th>
                <th>Phiên đấu giá</th>
                <th>Nguồn / chế độ</th>
                <th>Phiên bản đề xuất</th>
                <th>Ngày gửi</th>
                <th>Điều kiện cần xử lý</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {governed.map((proposal) => {
                const session = sessions.find(
                  (item) => item.sessionId === proposal.sessionId,
                );
                return (
                  <tr key={proposal.configurationId}>
                    <td data-label="Configuration">
                      <Link
                        to={`/governance/auction-configurations/${proposal.configurationId}`}
                      >
                        {proposal.configurationId}
                      </Link>
                    </td>
                    <td data-label="Session">
                      {session?.auctionCode ?? proposal.sessionId}
                    </td>
                    <td data-label="Source / mode">
                      {proposal.creationSource} · {proposal.managementMode}
                    </td>
                    <td data-label="Proposal">v{proposal.proposalVersion}</td>
                    <td data-label="Submitted">
                      {proposal.submittedAt ?? "—"}
                    </td>
                    <td data-label="Blocker">
                      {proposal.overallConfigurationResolutionState === "READY"
                        ? "Ready for final revalidation"
                        : proposal.overallConfigurationResolutionState ===
                            "BUSINESS_DECISION_REQUIRED"
                          ? "SGDG-managed Listing Fee business decision required"
                        : proposal.legacyPolicyState ===
                            "LEGACY_PROTOTYPE_POLICY"
                          ? "Legacy prototype evidence — correction required"
                          : "Room/member-fee policy resolution required"}
                    </td>
                    <td data-label="Status">
                      <Badge
                        tone={
                          proposal.status === "CONFIRMED"
                            ? "success"
                            : proposal.status === "RETURNED_FOR_CORRECTION"
                              ? "warning"
                              : "info"
                        }
                      >
                        {proposal.legacyPolicyState
                          ? "LEGACY_EVIDENCE"
                          : proposal.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!governed.length && (
          <div className="configuration-empty">
            <h3>Chưa có đề xuất cấu hình</h3>
            <p>
              Dữ liệu sẽ xuất hiện khi Nhân viên nội dung hoàn tất cấu hình
              phiên và chọn “Gửi phê duyệt”.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}

export function AuctionConfigurationGovernanceDetailPage() {
  const { configurationId } = useParams();
  const { role } = useOutletContext<{ role: StaffRole }>();
  const proposal = useAuctionConfigurationStore((state) =>
    state.proposals.find(
      (item) => item.configurationId === configurationId,
    ),
  );
  const snapshot = useAuctionConfigurationStore((state) =>
    state.snapshots.find(
      (item) => item.configurationId === configurationId,
    ),
  );
  const legacySnapshot = useAuctionConfigurationStore((state) =>
    state.legacySnapshots.find(
      (item) => item.configurationId === configurationId,
    ),
  );
  const requestCorrection = useAuctionConfigurationStore(
    (state) => state.requestConfigurationCorrection,
  );
  const confirmProposal = useAuctionConfigurationStore(
    (state) => state.confirmConfigurationProposal,
  );
  const session = useAuctionSessionStore((state) =>
    state.sessions.find((item) => item.sessionId === proposal?.sessionId),
  );
  const [dialog, setDialog] = useState<"correction" | "confirm" | null>(null);
  const [reason, setReason] = useState("");
  const [sections, setSections] = useState<ConfigurationSection[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const correctionReasonRef = useRef<HTMLTextAreaElement>(null);

  const validation = useMemo(
    () => (proposal ? validateConfiguration(proposal.rules) : undefined),
    [proposal],
  );

  if (role !== "ADMIN")
    return (
      <section className="configuration-page">
        <h1>Quản trị cấu hình phiên</h1>
        <p role="alert">Bạn không có quyền truy cập chức năng này.</p>
      </section>
    );
  if (!proposal || !session) return <NotFoundPage />;

  const closeDialog = () => {
    if (busy) return;
    setDialog(null);
    setError("");
  };

  const runCorrection = () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const result = requestCorrection({
      configurationId: proposal.configurationId,
      actorId: adminActorId,
      actorRole: role,
      expectedProposalVersion: proposal.proposalVersion,
      commandId: `REQUEST_CONFIGURATION_CORRECTION:${proposal.configurationId}:V${proposal.proposalVersion}`,
      reason,
      affectedSections: sections,
    });
    if (!result.ok) {
      setError(`${result.code}: ${result.message}`);
    } else {
      setSuccess(
        `Đã trả ${result.proposal.configurationId} v${result.proposal.proposalVersion} để chỉnh sửa.`,
      );
      setDialog(null);
      setReason("");
      setSections([]);
    }
    setBusy(false);
  };

  const runConfirm = () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const result = confirmProposal({
      configurationId: proposal.configurationId,
      actorId: adminActorId,
      actorRole: role,
      expectedProposalVersion: proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: `CONFIRM_CONFIGURATION_PROPOSAL:${proposal.configurationId}:V${proposal.proposalVersion}`,
    });
    if (!result.ok) {
      setError(`${result.code}: ${result.message}`);
    } else {
      setSuccess(
        `Đã tạo immutable snapshot ${result.snapshot?.snapshotId ?? ""}.`,
      );
      setDialog(null);
    }
    setBusy(false);
  };

  return (
    <section className="configuration-page">
      <header className="ops-heading">
        <div>
          <span>GOVERNANCE · CONFIGURATION CONFIRMATION</span>
          <h1>Chi tiết đề xuất cấu hình</h1>
          <p>{proposal.configurationId}</p>
        </div>
        <Badge
          tone={
            proposal.status === "CONFIRMED"
              ? "success"
              : proposal.status === "RETURNED_FOR_CORRECTION"
                ? "warning"
                : "info"
          }
        >
          {proposal.legacyPolicyState
            ? "LEGACY_EVIDENCE"
            : proposal.status}
        </Badge>
      </header>

      <div className="configuration-layout">
        <section className="ops-panel">
          <h2>Thông tin phiên và nguồn hình thành</h2>
          <dl className="configuration-definition-grid">
            <div>
              <dt>Session</dt>
              <dd>{session.sessionId}</dd>
            </div>
            <div>
              <dt>Auction code</dt>
              <dd>{session.auctionCode}</dd>
            </div>
            <div>
              <dt>Session version</dt>
              <dd>v{session.currentVersion}</dd>
            </div>
            <div>
              <dt>Creation source</dt>
              <dd>{proposal.creationSource}</dd>
            </div>
            <div>
              <dt>Management mode confirmation</dt>
              <dd>{proposal.managementMode} · read-only</dd>
            </div>
            <div>
              <dt>Proposal version</dt>
              <dd>v{proposal.proposalVersion}</dd>
            </div>
          </dl>
          {session.recordKind === "DYNAMIC_LINKED_SESSION" ? (
            <p>
              Opening Request: {session.openingRequestId} · v
              {session.openingRequestVersion}
            </p>
          ) : (
            <p>
              Asset: {session.assetId} · v{session.evaluatedAssetVersion} ·{" "}
              {session.assetReadinessReferenceId}
            </p>
          )}
        </section>

        <aside className="ops-panel configuration-readiness">
          <h2>Final validation</h2>
          {validation?.findings.map((finding) => (
            <article
              key={finding.code}
              className={`configuration-finding ${finding.severity.toLowerCase()}`}
            >
              {finding.owner === "BUSINESS_DECISION" ? (
                <LockKeyhole aria-hidden="true" />
              ) : finding.severity === "ERROR" ? (
                <AlertTriangle aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
              <div>
                <strong>
                  {finding.section} · {finding.owner}
                </strong>
                <p>{finding.message}</p>
              </div>
            </article>
          ))}
          <p className="configuration-policy-blocker">
            <strong>{AUCTION_ROOM_FEE_POLICY_DISCLAIMER}</strong>
            {proposal.overallConfigurationResolutionState === "READY"
              ? " Policy resolution is ready for ADMIN final revalidation."
              : proposal.overallConfigurationResolutionState ===
                  "BUSINESS_DECISION_REQUIRED"
                ? ` ${SGDG_MANAGED_FEE_DECISION_MESSAGE}`
                : " Confirmation is blocked until Content Staff resolves the current Auction Room and Member Listing Fee evidence."}
          </p>
        </aside>
      </div>

      <section className="ops-panel">
        <h2>Proposed Auction Rules</h2>
        <dl className="configuration-definition-grid">
          <div>
            <dt>Starting price</dt>
            <dd>{formatMoney(proposal.rules.startingPrice)}</dd>
          </div>
          <div>
            <dt>Minimum increment</dt>
            <dd>{formatMoney(proposal.rules.minimumIncrement)}</dd>
          </div>
          <div>
            <dt>Deposit</dt>
            <dd>{proposal.rules.depositPolicyReference}</dd>
          </div>
          <div>
            <dt>Eligibility</dt>
            <dd>{proposal.rules.eligibilityPolicyReference}</dd>
          </div>
          <div>
            <dt>Extension</dt>
            <dd>{proposal.rules.extensionPolicyReference}</dd>
          </div>
          <div>
            <dt>Fallback</dt>
            <dd>{proposal.rules.fallbackPolicyReference}</dd>
          </div>
          <div>
            <dt>Dải giá theo giá khởi điểm</dt>
            <dd>
              {proposal.priceBandResolution
                ? `${proposal.priceBandResolution.reference} · ${formatMoney(
                    proposal.priceBandResolution.evaluatedStartingPrice,
                  )}`
                : "POLICY_RESOLUTION_REQUIRED"}
            </dd>
          </div>
          <div>
            <dt>Phòng được xác định</dt>
            <dd>
              {proposal.roomResolution
                ? `${proposal.roomResolution.roomReference} · ${proposal.roomResolution.displayName}`
                : "POLICY_RESOLUTION_REQUIRED"}
            </dd>
          </div>
          <div>
            <dt>Danh hiệu thành viên</dt>
            <dd>
              {proposal.memberTitleReference
                ? `${proposal.memberTitleReference.title} · ${proposal.memberTitleReference.referenceVersion}`
                : proposal.managementMode === "SGDG_MANAGED"
                  ? "Không áp dụng cho SGDG-managed"
                  : "MEMBER_REFERENCE_REQUIRED"}
            </dd>
          </div>
          <div>
            <dt>Phí đăng 1 sản phẩm</dt>
            <dd>{formatListingFee(proposal.listingFeeResolution)}</dd>
          </div>
          <div>
            <dt>Phòng VIP / Event</dt>
            <dd>
              {proposal.specialRoomContext
                ? `${proposal.specialRoomContext.vipRoomStatus} · ${proposal.specialRoomContext.eventRoomStatus}`
                : "OUT_OF_CURRENT_CONFIGURATION_SCOPE"}
            </dd>
          </div>
          <div>
            <dt>Policy decision</dt>
            <dd className="configuration-wrap-id">
              {proposal.policyDecisionReference
                ? `${proposal.policyDecisionReference.decisionId} · v${proposal.policyDecisionReference.decisionVersion}`
                : "Resolution required"}
            </dd>
          </div>
          <div>
            <dt>Nguồn chính sách</dt>
            <dd>
              {proposal.policyDecisionReference?.sourceReference ??
                "Resolution required"}
            </dd>
          </div>
        </dl>
        <p>{PRICE_BAND_NORMALIZATION_DISCLAIMER}</p>
        {proposal.listingFeeResolution?.applicability === "APPLICABLE" &&
          proposal.listingFeeResolution.fee.kind === "MP" && (
            <p>{MP_INTERPRETATION_DISCLAIMER}</p>
          )}
        <p>
          VIP Room and Event Room are not selected in the current
          ordinary-Room configuration. Separate governed policies are required
          before either special Room can be used.
        </p>
        {proposal.overallConfigurationResolutionState ===
          "BUSINESS_DECISION_REQUIRED" && (
          <p className="ops-conflict" role="alert">
            <strong>SGDG_MANAGED_FEE_DECISION_REQUIRED</strong>{" "}
            {SGDG_MANAGED_FEE_DECISION_MESSAGE}
          </p>
        )}
        {proposal.status === "SUBMITTED" && (
          <div className="ops-actions configuration-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setError("");
                setDialog("correction");
              }}
            >
              Yêu cầu chỉnh sửa
            </Button>
            <Button
              onClick={() => {
                setError("");
                setDialog("confirm");
              }}
              disabled={
                proposal.overallConfigurationResolutionState !== "READY" ||
                proposal.managementMode !== "CUSTOMER_REQUESTED"
              }
              aria-describedby="configuration-confirm-help"
            >
              Xác nhận cấu hình
            </Button>
            <small id="configuration-confirm-help">
              {proposal.overallConfigurationResolutionState === "READY"
                ? "ADMIN will final-revalidate the current policy evidence."
                : SGDG_MANAGED_FEE_DECISION_MESSAGE}
            </small>
          </div>
        )}
        {proposal.status === "RETURNED_FOR_CORRECTION" && (
          <p>Proposal đã được trả lại Content Staff và không thể quyết định lại cho đến khi resubmit.</p>
        )}
        {proposal.status === "CONFIRMED" && snapshot && (
          <div className="configuration-immutable">
            <LockKeyhole aria-hidden="true" />
            <strong>{snapshot.snapshotId}</strong>
            <p>
              Immutable snapshot v{snapshot.snapshotVersion} · proposal v
              {snapshot.proposalVersion}
            </p>
            <p>
              {snapshot.priceBandResolution.reference} →{" "}
              {snapshot.roomResolution.roomReference} ·{" "}
              {formatListingFee(snapshot.listingFeeResolution)}
            </p>
            <p>{snapshot.policyDisclaimer}</p>
            <p>{snapshot.normalizationDisclaimer}</p>
          </div>
        )}
        {proposal.legacyPolicyState && legacySnapshot && (
          <div className="configuration-immutable">
            <LockKeyhole aria-hidden="true" />
            <strong>Legacy Configuration evidence retained</strong>
            <p>{legacySnapshot.snapshotId}</p>
            <p>
              {legacySnapshot.policyClassification} · not a current confirmed
              Configuration.
            </p>
          </div>
        )}
        {success && (
          <p className="configuration-success" aria-live="polite">
            {success}
          </p>
        )}
      </section>

      <section className="ops-panel configuration-history">
        <h2>Lịch sử gửi và xử lý cấu hình</h2>
        <ol>
          {proposal.history.map((entry) => (
            <li key={entry.historyId}>
              <strong>{entry.action}</strong>
              <span>
                v{entry.proposalVersion} · {entry.fromStatus ?? "NONE"} →{" "}
                {entry.toStatus}
              </span>
              <small>
                {entry.actorRole} · {entry.occurredAt}
              </small>
            </li>
          ))}
        </ol>
      </section>

      <Dialog
        open={dialog === "correction"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        title="Yêu cầu chỉnh sửa cấu hình"
        description={`${session.sessionId} · ${proposal.configurationId} · proposal v${proposal.proposalVersion}`}
        initialFocusRef={correctionReasonRef}
        preventClose={busy}
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={runCorrection}
              loading={busy}
              disabled={reason.trim().length < 10 || sections.length === 0}
            >
              Confirm Return
            </Button>
          </>
        }
      >
        <label className="configuration-dialog-field">
          Correction reason
          <textarea
            ref={correctionReasonRef}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <fieldset className="configuration-section-picker">
          <legend>Affected sections</legend>
          {correctionSections.map((section) => (
            <label key={section}>
              <input
                type="checkbox"
                checked={sections.includes(section)}
                onChange={(event) =>
                  setSections((current) =>
                    event.target.checked
                      ? [...current, section]
                      : current.filter((item) => item !== section),
                  )
                }
              />
              {section}
            </label>
          ))}
        </fieldset>
        <p>
          Consequence: proposal becomes RETURNED_FOR_CORRECTION and Content
          Staff may edit supported fields.
        </p>
        {error && (
          <p className="ops-conflict" role="alert">
            {error}
          </p>
        )}
      </Dialog>

      <Dialog
        open={dialog === "confirm"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        title="Xác nhận cấu hình"
        description="Chỉ xác nhận cấu hình, chưa phê duyệt hoặc công bố phiên"
        preventClose={busy}
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={runConfirm} loading={busy}>
              Xác nhận cấu hình
            </Button>
          </>
        }
      >
        <dl className="configuration-definition-grid">
          <div>
            <dt>Session</dt>
            <dd>{session.sessionId}</dd>
          </div>
          <div>
            <dt>Session version</dt>
            <dd>v{session.currentVersion}</dd>
          </div>
          <div>
            <dt>Proposal version</dt>
            <dd>v{proposal.proposalVersion}</dd>
          </div>
          <div>
            <dt>Creation source</dt>
            <dd>{proposal.creationSource}</dd>
          </div>
          <div>
            <dt>Management mode</dt>
            <dd>{proposal.managementMode}</dd>
          </div>
          <div>
            <dt>Starting price</dt>
            <dd>{formatMoney(proposal.rules.startingPrice)}</dd>
          </div>
          <div>
            <dt>Minimum increment</dt>
            <dd>{formatMoney(proposal.rules.minimumIncrement)}</dd>
          </div>
          <div>
            <dt>Policy references</dt>
            <dd>
              {proposal.rules.depositPolicyReference} ·{" "}
              {proposal.rules.eligibilityPolicyReference} ·{" "}
              {proposal.rules.extensionPolicyReference} ·{" "}
              {proposal.rules.fallbackPolicyReference}
            </dd>
          </div>
          <div>
            <dt>Dải giá</dt>
            <dd>
              {proposal.priceBandResolution
                ? `${proposal.priceBandResolution.reference} · ${formatMoney(
                    proposal.priceBandResolution.evaluatedStartingPrice,
                  )}`
                : "Resolution required"}
            </dd>
          </div>
          <div>
            <dt>Ordinary Auction Room</dt>
            <dd>
              {proposal.roomResolution
                ? `${proposal.roomResolution.roomReference} · ${proposal.roomResolution.displayName}`
                : "Resolution required"}
            </dd>
          </div>
          <div>
            <dt>Membership reference</dt>
            <dd className="configuration-wrap-id">
              {proposal.memberTitleReference
                ? `${proposal.memberTitleReference.memberId} · ${proposal.memberTitleReference.referenceVersion}`
                : proposal.managementMode === "SGDG_MANAGED"
                  ? "N/A — SGDG-managed"
                  : "MEMBER_REFERENCE_REQUIRED"}
            </dd>
          </div>
          <div>
            <dt>Member title</dt>
            <dd>
              {proposal.memberTitleReference?.title ??
                (proposal.managementMode === "SGDG_MANAGED"
                  ? "N/A — SGDG-managed"
                  : "MEMBER_REFERENCE_REQUIRED")}
            </dd>
          </div>
          <div>
            <dt>Listing fee</dt>
            <dd>{formatListingFee(proposal.listingFeeResolution)}</dd>
          </div>
          <div>
            <dt>VIP / Event</dt>
            <dd>
              {proposal.specialRoomContext
                ? `${proposal.specialRoomContext.vipRoomStatus} · ${proposal.specialRoomContext.eventRoomStatus}`
                : "Resolution required"}
            </dd>
          </div>
          <div>
            <dt>Prototype policy</dt>
            <dd className="configuration-wrap-id">
              {proposal.policyDecisionReference
                ? `${proposal.policyDecisionReference.decisionId} · v${proposal.policyDecisionReference.decisionVersion}`
                : "Resolution required"}
            </dd>
          </div>
          <div>
            <dt>Policy source</dt>
            <dd>
              {proposal.policyDecisionReference?.sourceReference ??
                "Resolution required"}
            </dd>
          </div>
        </dl>
        <p><strong>{AUCTION_ROOM_FEE_POLICY_DISCLAIMER}</strong></p>
        <p>{PRICE_BAND_NORMALIZATION_DISCLAIMER}</p>
        <p>
          VIP Room and Event Room are not selected in the current
          ordinary-Room configuration. Separate governed policies are required
          before either special Room can be used.
        </p>
        <p>Thao tác này chỉ xác nhận cấu hình.</p>
        <p>Phiên vẫn ở trạng thái bản nháp/chưa sẵn sàng.</p>
        <p>Chưa tạo hồ sơ phê duyệt, lịch hoặc bản công bố.</p>
        {error && (
          <p className="ops-conflict" role="alert">
            {error}
          </p>
        )}
      </Dialog>
    </section>
  );
}
