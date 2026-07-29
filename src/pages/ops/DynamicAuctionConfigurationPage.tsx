import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, LockKeyhole } from "lucide-react";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import type { StaffRole } from "../../config/staffRoles";
import type { PersistedAuctionSession } from "../../store/auctionSessionStore";
import {
  type AuctionConfigurationRules,
  useAuctionConfigurationStore,
  validateConfiguration,
} from "../../store/auctionConfigurationStore";
import { CONTENT_STAFF_ACTOR_ID } from "../../store/openingRequestStore";
import {
  AUCTION_ROOM_FEE_POLICY_DISCLAIMER,
  deriveOrdinaryRoom,
  getAuctionRoomFeePolicy,
  MP_INTERPRETATION_DISCLAIMER,
  PRICE_BAND_NORMALIZATION_DISCLAIMER,
  SGDG_MANAGED_FEE_DECISION_MESSAGE,
} from "../../services/roomValueTierPolicy";

type DraftInputs = {
  startingPrice: string;
  minimumIncrement: string;
  depositPolicyReference: string;
  eligibilityPolicyReference: string;
  extensionPolicyReference: string;
  fallbackPolicyReference: string;
};

const emptyInputs: DraftInputs = {
  startingPrice: "",
  minimumIncrement: "",
  depositPolicyReference: "",
  eligibilityPolicyReference: "",
  extensionPolicyReference: "",
  fallbackPolicyReference: "",
};

const inputsFromRules = (rules: AuctionConfigurationRules): DraftInputs => ({
  startingPrice: rules.startingPrice === null ? "" : String(rules.startingPrice),
  minimumIncrement:
    rules.minimumIncrement === null ? "" : String(rules.minimumIncrement),
  depositPolicyReference: rules.depositPolicyReference,
  eligibilityPolicyReference: rules.eligibilityPolicyReference,
  extensionPolicyReference: rules.extensionPolicyReference,
  fallbackPolicyReference: rules.fallbackPolicyReference,
});

const numberFromInput = (value: string) =>
  value.trim() === "" ? null : Number(value);

const rulesFromInputs = (inputs: DraftInputs): AuctionConfigurationRules => ({
  startingPrice: numberFromInput(inputs.startingPrice),
  minimumIncrement: numberFromInput(inputs.minimumIncrement),
  depositPolicyReference: inputs.depositPolicyReference,
  eligibilityPolicyReference: inputs.eligibilityPolicyReference,
  extensionPolicyReference: inputs.extensionPolicyReference,
  fallbackPolicyReference: inputs.fallbackPolicyReference,
});

const policyOptions = {
  depositPolicyReference: ["DEP-STD-01"],
  eligibilityPolicyReference: ["ELG-STD-01"],
  extensionPolicyReference: ["EXT-02"],
  fallbackPolicyReference: ["FB-READONLY"],
} as const;

const formatMoney = (value: number | null) =>
  value === null
    ? "Chưa nhập"
    : new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 2,
      }).format(value);

export function DynamicAuctionConfigurationPage({
  session,
  role,
}: {
  session: PersistedAuctionSession;
  role: StaffRole;
}) {
  const [searchParams] = useSearchParams();
  const proposal = useAuctionConfigurationStore((state) =>
    state.proposals.find((item) => item.sessionId === session.sessionId),
  );
  const snapshot = useAuctionConfigurationStore((state) =>
    state.snapshots.find((item) => item.sessionId === session.sessionId),
  );
  const legacySnapshot = useAuctionConfigurationStore((state) =>
    state.legacySnapshots.find(
      (item) => item.sessionId === session.sessionId,
    ),
  );
  const createDraft = useAuctionConfigurationStore(
    (state) => state.createConfigurationDraft,
  );
  const saveDraft = useAuctionConfigurationStore(
    (state) => state.saveConfigurationDraft,
  );
  const submitProposal = useAuctionConfigurationStore(
    (state) => state.submitConfigurationProposal,
  );
  const applyPolicyResolution = useAuctionConfigurationStore(
    (state) => state.applyAuctionRoomMemberFeeResolution,
  );
  const [inputs, setInputs] = useState<DraftInputs>(
    proposal ? inputsFromRules(proposal.rules) : emptyInputs,
  );
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof AuctionConfigurationRules, string>>
  >({});
  const [busy, setBusy] = useState(false);

  const localRules = useMemo(() => rulesFromInputs(inputs), [inputs]);
  const validation = useMemo(
    () => validateConfiguration(localRules),
    [localRules],
  );
  const dirty = proposal
    ? JSON.stringify(inputsFromRules(proposal.rules)) !== JSON.stringify(inputs)
    : false;
  const editable =
    role === "CONTENT_STAFF" &&
    (proposal?.status === "DRAFT" ||
      proposal?.status === "RETURNED_FOR_CORRECTION");
  const policy = getAuctionRoomFeePolicy();
  const policyPreview = useMemo(
    () => deriveOrdinaryRoom(localRules.startingPrice),
    [localRules.startingPrice],
  );
  const policyReadyForSubmission =
    proposal?.overallConfigurationResolutionState === "READY" &&
    proposal.priceBandResolution?.evaluatedStartingPrice ===
      proposal.rules.startingPrice;

  if (searchParams.get("scenario") === "loading")
    return (
      <section className="configuration-page" aria-busy="true">
        <header className="ops-heading">
          <div>
            <span>CẤU HÌNH ĐẤU GIÁ</span>
            <h1>Cấu hình phiên đấu giá</h1>
          </div>
        </header>
        <p role="status">Đang tải Configuration Proposal…</p>
      </section>
    );
  if (searchParams.get("scenario") === "error")
    return (
      <section className="configuration-page">
        <header className="ops-heading">
          <div>
            <span>CẤU HÌNH ĐẤU GIÁ</span>
            <h1>Cấu hình phiên đấu giá</h1>
          </div>
        </header>
        <p className="ops-conflict" role="alert">
          Không thể tải Configuration Proposal. Vui lòng thử lại.
        </p>
      </section>
    );

  const update = (field: keyof DraftInputs, value: string) => {
    setInputs((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
    setNotice("");
  };

  const run = (
    action: "create" | "save" | "submit",
  ) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    setFieldErrors({});
    const result =
      action === "create"
        ? createDraft({
            sessionId: session.sessionId,
            actorId: CONTENT_STAFF_ACTOR_ID,
            actorRole: role,
            expectedSessionVersion: session.currentVersion,
            commandId: `CREATE_CONFIGURATION_DRAFT:${session.sessionId}:V${session.currentVersion}`,
          })
        : action === "save" && proposal
          ? saveDraft({
              configurationId: proposal.configurationId,
              actorId: CONTENT_STAFF_ACTOR_ID,
              actorRole: role,
              expectedProposalVersion: proposal.proposalVersion,
              commandId: `SAVE_CONFIGURATION_DRAFT:${proposal.configurationId}:V${proposal.proposalVersion}`,
              values: localRules,
            })
          : proposal
            ? submitProposal({
                configurationId: proposal.configurationId,
                actorId: CONTENT_STAFF_ACTOR_ID,
                actorRole: role,
                expectedProposalVersion: proposal.proposalVersion,
                expectedSessionVersion: session.currentVersion,
                commandId: `SUBMIT_CONFIGURATION_PROPOSAL:${proposal.configurationId}:V${proposal.proposalVersion}`,
              })
            : undefined;
    if (!result) {
      setError("Không có proposal hiện hành.");
    } else if (!result.ok) {
      setError(`${result.code}: ${result.message}`);
      setFieldErrors(result.fieldErrors ?? {});
    } else {
      setInputs(inputsFromRules(result.proposal.rules));
      setNotice(
        action === "create"
          ? "Đã tạo Configuration Draft. Session vẫn DRAFT / NOT_READY."
          : action === "save"
            ? "Đã lưu Configuration Draft trong frontend persistence."
            : "Đã gửi Configuration Proposal cho ADMIN xác nhận.",
      );
    }
    setBusy(false);
  };

  const runPolicyResolution = () => {
    if (busy || !proposal || dirty) return;
    setBusy(true);
    setError("");
    setNotice("");
    const result = applyPolicyResolution({
      configurationId: proposal.configurationId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: role,
      expectedProposalVersion: proposal.proposalVersion,
      expectedSessionVersion: session.currentVersion,
      expectedPolicyVersion: policy.decisionVersion,
      commandId: `APPLY_ROOM_MEMBER_FEE_POLICY:${proposal.configurationId}:V${proposal.proposalVersion}:P${policy.decisionVersion}`,
    });
    if (!result.ok) setError(`${result.code}: ${result.message}`);
    else
      setNotice(
        result.proposal.overallConfigurationResolutionState === "READY"
          ? `Auction Room and Member Listing Fee resolution completed under ${policy.decisionId} v${policy.decisionVersion}. Proposal v${result.proposal.proposalVersion}.`
          : `Ordinary Auction Room resolved. ${SGDG_MANAGED_FEE_DECISION_MESSAGE} Proposal v${result.proposal.proposalVersion}.`,
      );
    setBusy(false);
  };

  const statusTone =
    proposal?.status === "CONFIRMED"
      ? "success"
      : proposal?.status === "SUBMITTED"
        ? "info"
        : proposal?.status === "RETURNED_FOR_CORRECTION"
          ? "warning"
          : "neutral";

  return (
    <section className="configuration-page">
      <header className="ops-heading">
        <div>
          <span>CẤU HÌNH ĐẤU GIÁ · NHÂN VIÊN NỘI DUNG</span>
          <h1>Cấu hình phiên đấu giá</h1>
          <p>
            Configuration confirmation không phải Session Approval, Schedule
            hoặc Publication.
          </p>
        </div>
        <div className="configuration-statuses">
          <Badge tone="neutral">{session.lifecycleStatus}</Badge>
          <Badge tone="warning">{session.publicationStatus}</Badge>
          <Badge tone={statusTone}>
            {proposal?.legacyPolicyState
              ? "LEGACY_EVIDENCE"
              : proposal?.status ?? "NOT_STARTED"}
          </Badge>
        </div>
      </header>

      <div className="configuration-layout">
        <section className="ops-panel configuration-context">
          <h2>Phiên đấu giá và nguồn dữ liệu</h2>
          <dl className="configuration-definition-grid">
            <div>
              <dt>Phiên đấu giá</dt>
              <dd>{session.sessionId}</dd>
            </div>
            <div>
              <dt>Mã đấu giá</dt>
              <dd>{session.auctionCode}</dd>
            </div>
            <div>
              <dt>Nguồn tạo</dt>
              <dd>{session.creationSource}</dd>
            </div>
            <div>
              <dt>Chế độ quản lý</dt>
              <dd>{session.managementMode} · governed read-only</dd>
            </div>
            <div>
              <dt>Phiên bản</dt>
              <dd>v{session.currentVersion}</dd>
            </div>
            <div>
              <dt>Cấu hình</dt>
              <dd>
                {proposal
                  ? `${proposal.configurationId} · proposal v${proposal.proposalVersion}`
                  : "Chưa bắt đầu"}
              </dd>
            </div>
          </dl>
          {session.recordKind === "DYNAMIC_LINKED_SESSION" ? (
            <p>
              Opening Request lineage: {session.openingRequestId} · accepted v
              {session.openingRequestVersion}
            </p>
          ) : (
            <p>
              Asset lineage: {session.assetId} · Asset v
              {session.evaluatedAssetVersion} ·{" "}
              {session.assetReadinessReferenceId}
            </p>
          )}
        </section>

        <aside className="ops-panel configuration-readiness">
          <h2>Mức độ sẵn sàng</h2>
          {!proposal ? (
            <p>Chưa bắt đầu cấu hình.</p>
          ) : (
            validation.findings.map((finding) => (
              <article
                key={finding.code}
                className={`configuration-finding ${finding.severity.toLowerCase()}`}
              >
                {finding.severity === "ERROR" ? (
                  <AlertTriangle aria-hidden="true" />
                ) : (
                  <LockKeyhole aria-hidden="true" />
                )}
                <div>
                  <strong>{finding.section}</strong>
                  <p>{finding.message}</p>
                  <small>
                    Owner: {finding.owner} ·{" "}
                    {finding.correctableInCurrentWorkspace
                      ? "Có thể sửa tại workspace này"
                      : "Không thể sửa tại workspace này"}
                  </small>
                </div>
              </article>
            ))
          )}
          {proposal && validation.validForSubmission && (
            <p className="configuration-ready">
              <CheckCircle2 aria-hidden="true" /> Rules đủ điều kiện gửi ADMIN.
            </p>
          )}
          <p className="configuration-policy-blocker">
            <strong>{AUCTION_ROOM_FEE_POLICY_DISCLAIMER}</strong>
            Room: {proposal?.roomResolutionState ?? "REQUIRED"} · Member
            Listing Fee: {proposal?.listingFeeResolutionState ?? "REQUIRED"} ·
            Overall:{" "}
            {proposal?.overallConfigurationResolutionState ?? "INCOMPLETE"}.
          </p>
        </aside>
      </div>

      {proposal?.correctionContext && (
        <section className="ops-panel configuration-correction" role="alert">
          <h2>Admin yêu cầu chỉnh sửa</h2>
          <p>{proposal.correctionContext.reason}</p>
          <p>
            Phần bị ảnh hưởng:{" "}
            {proposal.correctionContext.affectedSections.join(", ")}
          </p>
        </section>
      )}

      {proposal && (
        <section className="ops-panel configuration-policy-panel">
          <h2>Phòng đấu giá và phí niêm yết thành viên</h2>
          <p className="configuration-policy-disclaimer">
            <strong>{AUCTION_ROOM_FEE_POLICY_DISCLAIMER}</strong>
          </p>
          <p>
            Dữ liệu dựa trên tài liệu dự án SGDG năm 2017 và cần stakeholder
            tái xác nhận.
          </p>
          <p>{PRICE_BAND_NORMALIZATION_DISCLAIMER}</p>
          <dl className="configuration-definition-grid">
            <div>
              <dt>Quyết định</dt>
              <dd className="configuration-wrap-id">
                {policy.decisionId} · v{policy.decisionVersion}
              </dd>
            </div>
            <div>
              <dt>Thẩm quyền</dt>
              <dd>{policy.authorityType}</dd>
            </div>
            <div>
              <dt>Nguồn chính sách</dt>
              <dd>{policy.sourceReference}</dd>
            </div>
            <div>
              <dt>Giá khởi điểm</dt>
              <dd>{formatMoney(localRules.startingPrice)}</dd>
            </div>
            <div>
              <dt>Đã xác định đủ phòng đấu giá và phí niêm yết?</dt>
              <dd>{proposal.overallConfigurationResolutionState}</dd>
            </div>
            <div>
              <dt>Dải giá theo giá khởi điểm</dt>
              <dd>
                {policyPreview
                  ? `${policyPreview.priceBand.reference} · ${policyPreview.priceBand.displayName}`
                  : "INVALID_STARTING_PRICE"}
              </dd>
            </div>
            <div>
              <dt>Phòng được xác định</dt>
              <dd>
                {policyPreview
                  ? `${policyPreview.room.reference} · ${policyPreview.room.displayName}`
                  : "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>Mã tham chiếu thành viên</dt>
              <dd>
                {proposal.memberTitleReference
                  ? proposal.memberTitleReference.memberId
                  : session.managementMode === "SGDG_MANAGED"
                    ? "Không áp dụng cho SGDG-managed"
                    : "MEMBER_REFERENCE_REQUIRED"}
              </dd>
            </div>
            <div>
              <dt>Phiên bản tham chiếu thành viên</dt>
              <dd>
                {proposal.memberTitleReference?.referenceVersion ??
                  (session.managementMode === "SGDG_MANAGED"
                    ? "Không áp dụng"
                    : "MEMBER_REFERENCE_REQUIRED")}
              </dd>
            </div>
            <div>
              <dt>Hạng thành viên</dt>
              <dd>
                {proposal.memberTitleReference?.title ??
                  (session.managementMode === "SGDG_MANAGED"
                    ? "Không áp dụng"
                    : "MEMBER_REFERENCE_REQUIRED")}
              </dd>
            </div>
            <div>
              <dt>Phí đăng 1 sản phẩm</dt>
              <dd>
                {proposal.listingFeeResolution?.applicability === "APPLICABLE"
                  ? proposal.listingFeeResolution.fee.kind === "AMOUNT"
                    ? formatMoney(
                        proposal.listingFeeResolution.fee.amountVnd,
                      )
                    : `MP theo bảng nguồn · ${proposal.listingFeeResolution.fee.sourceLabel}`
                  : proposal.listingFeeResolution?.applicability ===
                      "BUSINESS_DECISION_REQUIRED"
                    ? "Chưa áp dụng — cần xác nhận phạm vi áp dụng cho phiên do SGDG quản lý"
                    : "Policy resolution required"}
              </dd>
            </div>
            <div>
              <dt>Phòng VIP</dt>
              <dd>
                {proposal.specialRoomContext?.vipRoomStatus ??
                  "OUT_OF_CURRENT_CONFIGURATION_SCOPE"}
              </dd>
            </div>
            <div>
              <dt>Phòng Event</dt>
              <dd>
                {proposal.specialRoomContext?.eventRoomStatus ??
                  "OUT_OF_CURRENT_CONFIGURATION_SCOPE"}
              </dd>
            </div>
          </dl>
          {proposal.listingFeeResolution?.applicability === "APPLICABLE" &&
            proposal.listingFeeResolution.fee.kind === "MP" && (
              <p>{MP_INTERPRETATION_DISCLAIMER}</p>
            )}
          <p>
            VIP Room and Event Room are not selected in the current
            ordinary-Room configuration. Separate governed policies are
            required before either special Room can be used.
          </p>
          {proposal.overallConfigurationResolutionState ===
            "BUSINESS_DECISION_REQUIRED" && (
            <p className="ops-conflict" role="alert">
              <strong>SGDG_MANAGED_FEE_DECISION_REQUIRED</strong>{" "}
              {SGDG_MANAGED_FEE_DECISION_MESSAGE}
            </p>
          )}
          {editable && (
            <div className="ops-actions configuration-actions">
              <Button
                onClick={runPolicyResolution}
                loading={busy}
                disabled={dirty || !policyPreview || busy}
                aria-describedby="policy-resolution-help"
              >
                Resolve Auction Room and Member Listing Fee
              </Button>
              <small id="policy-resolution-help">
                {dirty
                  ? "Lưu Starting Price trước khi áp dụng chính sách."
                  : "Phòng và phí được dẫn xuất tự động; không có manual override."}
              </small>
            </div>
          )}
          {proposal.status === "SUBMITTED" && (
            <p role="status">Đã gửi để ADMIN xác nhận · read-only.</p>
          )}
          {proposal.status === "CONFIRMED" && snapshot && (
            <p role="status">Bằng chứng chính sách đã xác nhận không thể chỉnh sửa.</p>
          )}
          {proposal.legacyPolicyState && legacySnapshot && (
            <p role="status">
              Legacy Configuration evidence retained — SGDG-managed Listing
              Fee decision required. {legacySnapshot.snapshotId}
            </p>
          )}
        </section>
      )}

      <section className="ops-panel ops-config-form">
        <h2>
          {proposal?.status === "CONFIRMED"
            ? "Confirmed Configuration Snapshot"
            : "Proposed Auction Rules"}
        </h2>
        {!proposal ? (
          <Button onClick={() => run("create")} loading={busy}>
            Tạo đề xuất cấu hình
          </Button>
        ) : (
          <>
            <div className="configuration-rule-grid">
              <label>
                Giá khởi điểm
                <input
                  inputMode="decimal"
                  disabled={!editable}
                  value={inputs.startingPrice}
                  aria-invalid={Boolean(fieldErrors.startingPrice)}
                  aria-describedby={
                    fieldErrors.startingPrice
                      ? "starting-price-error"
                      : undefined
                  }
                  onChange={(event) =>
                    update("startingPrice", event.target.value)
                  }
                />
                {fieldErrors.startingPrice && (
                  <small id="starting-price-error" role="alert">
                    {fieldErrors.startingPrice}
                  </small>
                )}
              </label>
              <label>
                Bước giá tối thiểu
                <input
                  inputMode="decimal"
                  disabled={!editable}
                  value={inputs.minimumIncrement}
                  aria-invalid={Boolean(fieldErrors.minimumIncrement)}
                  aria-describedby={
                    fieldErrors.minimumIncrement
                      ? "minimum-increment-error"
                      : undefined
                  }
                  onChange={(event) =>
                    update("minimumIncrement", event.target.value)
                  }
                />
                {fieldErrors.minimumIncrement && (
                  <small id="minimum-increment-error" role="alert">
                    {fieldErrors.minimumIncrement}
                  </small>
                )}
              </label>
              {(
                Object.entries(policyOptions) as [
                  keyof typeof policyOptions,
                  readonly string[],
                ][]
              ).map(([field, options]) => (
                <label key={field}>
                  {field
                    .replace("PolicyReference", " policy reference")
                    .replace(/([A-Z])/g, " $1")}
                  <select
                    disabled={!editable}
                    value={inputs[field]}
                    aria-invalid={Boolean(fieldErrors[field])}
                    onChange={(event) => update(field, event.target.value)}
                  >
                    <option value="">Chọn reference</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {fieldErrors[field] && (
                    <small role="alert">{fieldErrors[field]}</small>
                  )}
                </label>
              ))}
            </div>
            <dl className="configuration-definition-grid">
              <div>
                <dt>Giá khởi điểm đề xuất</dt>
                <dd>{formatMoney(localRules.startingPrice)}</dd>
              </div>
              <div>
                <dt>Bước giá tối thiểu đề xuất</dt>
                <dd>{formatMoney(localRules.minimumIncrement)}</dd>
              </div>
              <div>
                <dt>Dải giá đã áp dụng</dt>
                <dd>
                  {proposal.priceBandResolution?.reference ??
                    "POLICY_RESOLUTION_REQUIRED"}
                </dd>
              </div>
              <div>
                <dt>Phòng đã áp dụng</dt>
                <dd>
                  {proposal.roomResolution?.roomReference ??
                    "POLICY_RESOLUTION_REQUIRED"}
                </dd>
              </div>
              <div>
                <dt>Phí đăng sản phẩm</dt>
                <dd>
                  {proposal.listingFeeResolution?.applicability === "APPLICABLE"
                    ? proposal.listingFeeResolution.fee.kind === "AMOUNT"
                      ? formatMoney(proposal.listingFeeResolution.fee.amountVnd)
                      : proposal.listingFeeResolution.fee.sourceLabel
                    : proposal.listingFeeResolution?.applicability ??
                      "POLICY_RESOLUTION_REQUIRED"}
                </dd>
              </div>
            </dl>
            {proposal.status === "SUBMITTED" && (
              <p className="configuration-immutable">
                <LockKeyhole aria-hidden="true" /> Đang chờ ADMIN xác nhận.
                Submitted proposal là read-only.
              </p>
            )}
            {proposal.status === "CONFIRMED" && snapshot && (
              <div className="configuration-immutable">
                <strong>{snapshot.snapshotId}</strong>
                <p>
                  Immutable snapshot v{snapshot.snapshotVersion} · proposal v
                  {snapshot.proposalVersion}
                </p>
              </div>
            )}
            {editable && (
              <div className="ops-actions configuration-actions">
                <Button
                  variant="secondary"
                  onClick={() => run("save")}
                  loading={busy}
                >
                  Lưu bản nháp
                </Button>
                <Button
                  onClick={() => run("submit")}
                  loading={busy}
                  disabled={
                    dirty ||
                    !validation.validForSubmission ||
                    !policyReadyForSubmission ||
                    busy
                  }
                  aria-describedby="configuration-submit-help"
                >
                  {proposal.status === "RETURNED_FOR_CORRECTION"
                    ? "Gửi lại xác nhận"
                    : "Gửi xác nhận"}
                </Button>
                <small id="configuration-submit-help">
                  {dirty
                    ? "Lưu thay đổi trước khi gửi."
                    : proposal.overallConfigurationResolutionState ===
                        "BUSINESS_DECISION_REQUIRED"
                      ? SGDG_MANAGED_FEE_DECISION_MESSAGE
                      : validation.validForSubmission &&
                        policyReadyForSubmission
                      ? "ADMIN chỉ xác nhận Configuration; Session vẫn DRAFT / NOT_READY."
                      : "Hoàn tất các Rules bắt buộc trước khi gửi."}
                </small>
              </div>
            )}
          </>
        )}
        {notice && (
          <p className="configuration-success" aria-live="polite">
            {notice}
          </p>
        )}
        {error && (
          <div className="ops-conflict" role="alert">
            <p>{error}</p>
            {(error.includes("STALE_") || error.includes("VERSION")) && (
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Tải lại trạng thái hiện hành
              </Button>
            )}
          </div>
        )}
      </section>

      {proposal && (
        <section className="ops-panel configuration-history">
          <h2>Lịch sử cấu hình</h2>
          <ol>
            {proposal.history.map((entry) => (
              <li key={entry.historyId}>
                <strong>{entry.action}</strong>
                <span>
                  Proposal v{entry.proposalVersion} · {entry.fromStatus ?? "NONE"}{" "}
                  → {entry.toStatus}
                </span>
                <small>
                  {entry.actorRole} · {entry.occurredAt}
                </small>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}
