import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button, ButtonLink } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import {
  evaluateSgdgManagedDraftReadiness,
  getCurrentAssetVersion,
  getSelectableAuctionAssets,
  type AssetReadinessScenario,
  type SgdgManagedSessionDraft,
} from "../../services/assetReadinessService";
import { CONTENT_STAFF_ACTOR_ID } from "../../store/openingRequestStore";
import { useAssetReadinessStore } from "../../store/assetReadinessStore";
import {
  type CreateSgdgManagedSessionResult,
  useAuctionSessionStore,
} from "../../store/auctionSessionStore";
import "../../styles/create-sgdg-session.css";

type Context = { role: "CONTENT_STAFF" | "ADMIN" };

const scenarioFromQuery = (value: string | null): AssetReadinessScenario => {
  const scenarios: AssetReadinessScenario[] = [
    "ready",
    "asset-unapproved",
    "asset-unavailable",
    "asset-restricted",
    "asset-held",
    "duplicate-active-session",
    "stale-asset-version",
  ];
  return scenarios.includes(value as AssetReadinessScenario)
    ? (value as AssetReadinessScenario)
    : "ready";
};

export function CreateSgdgManagedSessionPage() {
  const { role } = useOutletContext<Context>();
  const [params] = useSearchParams();
  const scenario = scenarioFromQuery(params.get("scenario"));
  const assets = getSelectableAuctionAssets();
  const references = useAssetReadinessStore((state) => state.references);
  const requestReference = useAssetReadinessStore(
    (state) => state.requestAssetReadinessReference,
  );
  const refreshReference = useAssetReadinessStore(
    (state) => state.refreshAssetReadinessReference,
  );
  const sessions = useAuctionSessionStore((state) => state.sessions);
  const createSession = useAuctionSessionStore(
    (state) => state.createSgdgManagedDraftSession,
  );
  const [draft, setDraft] = useState<SgdgManagedSessionDraft>({
    assetId: "",
    title: "",
    purpose: "",
    region: "",
    ownerId: CONTENT_STAFF_ACTOR_ID,
  });
  const [validated, setValidated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdSessionId, setCreatedSessionId] = useState("");

  const reference = references.find(
    (item) => item.assetId === draft.assetId,
  );
  const activeSession = sessions.find(
    (session) =>
      session.assetId === draft.assetId &&
      !["CLOSED", "CANCELLED", "REJECTED"].includes(
        session.lifecycleStatus,
      ),
  );
  const readiness = useMemo(
    () =>
      evaluateSgdgManagedDraftReadiness({
        draft,
        reference,
        currentAssetVersion: draft.assetId
          ? getCurrentAssetVersion(draft.assetId)
          : undefined,
        activeSessionId: activeSession?.sessionId,
      }),
    [activeSession?.sessionId, draft, reference],
  );
  const stale = readiness.findings.some(
    (finding) => finding.code === "ASSET_REFERENCE_STALE",
  );
  const externalBlocked = readiness.findings.some(
    (finding) =>
      finding.owner !== "CONTENT_STAFF" &&
      finding.code !== "MISSING_ASSET_REFERENCE",
  );
  const fieldErrors = validated
    ? Object.fromEntries(
        readiness.findings
          .filter(
            (finding) =>
              finding.owner === "CONTENT_STAFF" &&
              finding.field !== undefined,
          )
          .map((finding) => [finding.field!, finding.message]),
      )
    : {};

  const updateDraft = (
    field: keyof SgdgManagedSessionDraft,
    value: string,
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const selectAsset = (assetId: string) => {
    const asset = assets.find((item) => item.assetId === assetId);
    setDraft((current) => ({
      ...current,
      assetId,
      region: asset?.region ?? "",
      title: asset
        ? `${asset.assetName} — Phiên do SGDG quản lý`
        : "",
    }));
    setValidated(false);
    setError("");
    setSuccess("");
    setCreatedSessionId("");
  };

  const request = () => {
    setBusy(true);
    const result = requestReference({
      assetId: draft.assetId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: role,
      commandId: `REQUEST_ASSET_REFERENCE:${draft.assetId}:${scenario}`,
      scenario,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError("");
    setValidated(false);
  };

  const refresh = () => {
    if (!reference) return;
    setBusy(true);
    const result = refreshReference({
      assetId: reference.assetId,
      expectedAssetVersion: reference.assetVersion,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: role,
      commandId: `REFRESH_ASSET_REFERENCE:${reference.assetId}:${reference.referenceId}`,
      scenario,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError("");
    setValidated(true);
  };

  const confirmCreation = (): CreateSgdgManagedSessionResult => {
    if (!reference)
      return {
        ok: false,
        code: "ASSET_NOT_FOUND",
        message: "Chưa có Asset readiness reference.",
      };
    setBusy(true);
    const result = createSession({
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole: role,
      commandId: `CREATE_SGDG_SESSION:${draft.assetId}:${reference.referenceId}`,
      draft,
      assetReadinessReferenceId: reference.referenceId,
      expectedAssetVersion: reference.assetVersion,
      ownerId: draft.ownerId,
    });
    setBusy(false);
    if (result.ok) {
      setDialogOpen(false);
      setError("");
      setCreatedSessionId(result.session.sessionId);
      setSuccess(
        `Đã tạo ${result.session.sessionId} · ${result.session.auctionCode}. Session vẫn là DRAFT / NOT_READY.`,
      );
      return result;
    }
    setError(result.message);
    return result;
  };

  return (
    <main className="create-session-page">
      <header className="ops-heading">
        <span>QUẢN LÝ PHIÊN ĐẤU GIÁ</span>
        <h1>Tạo phiên do SGDG quản lý</h1>
        <p>
          Chuẩn bị Session Draft từ một Product/Auction Asset reference hiện
          có. Asset facts chỉ được đọc qua readiness reference.
        </p>
      </header>

      <p className="create-disclosure">
        <ShieldCheck aria-hidden="true" />
        Creation source: DIRECT_SGDG · Management mode: SGDG_MANAGED · chỉ
        tạo DRAFT / NOT_READY
      </p>

      <div className="create-grid">
        <section className="create-main">
          <div className="create-section-heading">
            <div>
              <span>BƯỚC 1</span>
              <h2>Chọn Asset reference</h2>
            </div>
            <Badge tone="info">PRODUCT_ASSET · READ ONLY</Badge>
          </div>
          <label className="create-field">
            <span>Tài sản</span>
            <select
              value={draft.assetId}
              onChange={(event) => selectAsset(event.target.value)}
            >
              <option value="">Chọn một tài sản hiện có</option>
              {assets.map((asset) => (
                <option value={asset.assetId} key={asset.assetId}>
                  {asset.assetName} · {asset.assetId}
                </option>
              ))}
            </select>
          </label>

          {draft.assetId && !reference && (
            <Button onClick={request} loading={busy}>
              Kiểm tra trạng thái tài sản
            </Button>
          )}

          {reference && (
            <section
              className="asset-readiness-reference"
              aria-labelledby="asset-reference-heading"
            >
              <div className="create-section-heading">
                <div>
                  <span>THAM CHIẾU HIỆN TẠI</span>
                  <h2 id="asset-reference-heading">
                    Asset readiness reference
                  </h2>
                </div>
                <Badge tone={externalBlocked ? "warning" : "success"}>
                  {externalBlocked ? "BLOCKED" : "CURRENT"}
                </Badge>
              </div>
              <dl>
                <div>
                  <dt>Reference ID</dt>
                  <dd>{reference.referenceId}</dd>
                </div>
                <div>
                  <dt>Asset version</dt>
                  <dd>v{reference.assetVersion}</dd>
                </div>
                <div>
                  <dt>Approval</dt>
                  <dd>{reference.approvalStatus}</dd>
                </div>
                <div>
                  <dt>Availability</dt>
                  <dd>{reference.availabilityStatus}</dd>
                </div>
                <div>
                  <dt>Restriction</dt>
                  <dd>{reference.restrictionStatus ?? "Không có"}</dd>
                </div>
                <div>
                  <dt>Hold</dt>
                  <dd>{reference.holdStatus ?? "Không có"}</dd>
                </div>
                <div>
                  <dt>Observed</dt>
                  <dd>{reference.observedAt}</dd>
                </div>
                <div>
                  <dt>Refreshed</dt>
                  <dd>{reference.refreshedAt ?? "Chưa làm mới"}</dd>
                </div>
              </dl>
              {(stale || externalBlocked) && (
                <Button
                  variant={stale ? "primary" : "secondary"}
                  onClick={refresh}
                  loading={busy}
                >
                  Làm mới tham chiếu tài sản
                </Button>
              )}
            </section>
          )}

          <div className="create-section-heading">
            <div>
              <span>BƯỚC 2</span>
              <h2>Thông tin Session Draft</h2>
            </div>
            <Badge tone="neutral">CONTENT_STAFF</Badge>
          </div>
          <label className="create-field">
            <span>Tiêu đề phiên</span>
            <input
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? "title-error" : undefined}
            />
            {fieldErrors.title && (
              <small className="field-error" id="title-error">
                {fieldErrors.title}
              </small>
            )}
          </label>
          <label className="create-field">
            <span>Mục đích đấu giá</span>
            <textarea
              aria-label="Mục đích đấu giá"
              value={draft.purpose}
              onChange={(event) => updateDraft("purpose", event.target.value)}
              aria-invalid={Boolean(fieldErrors.purpose)}
            />
            {fieldErrors.purpose && (
              <small className="field-error">{fieldErrors.purpose}</small>
            )}
          </label>
          <label className="create-field">
            <span>Khu vực</span>
            <input
              value={draft.region}
              onChange={(event) => updateDraft("region", event.target.value)}
              aria-invalid={Boolean(fieldErrors.region)}
            />
            {fieldErrors.region && (
              <small className="field-error">{fieldErrors.region}</small>
            )}
          </label>
          <label className="create-field">
            <span>Owner / Assignee</span>
            <input
              value={draft.ownerId}
              onChange={(event) => updateDraft("ownerId", event.target.value)}
              aria-invalid={Boolean(fieldErrors.ownerId)}
            />
            {fieldErrors.ownerId && (
              <small className="field-error">{fieldErrors.ownerId}</small>
            )}
          </label>

          {reference &&
            (validated || externalBlocked) &&
            readiness.findings.length > 0 && (
            <section className="readiness-findings" aria-labelledby="findings">
              <h2 id="findings">Readiness findings</h2>
              <ul>
                {readiness.findings.map((finding) => (
                  <li key={`${finding.code}-${finding.field ?? "asset"}`}>
                    <AlertTriangle aria-hidden="true" />
                    <div>
                      <strong>{finding.code}</strong>
                      <span>{finding.message}</span>
                      <small>
                        Owner: {finding.owner} ·{" "}
                        {finding.correctableInCurrentWorkspace
                          ? "Có thể sửa tại workspace"
                          : "Chỉ làm mới/chọn Asset khác"}
                      </small>
                      {finding.existingSessionId && (
                        <Link
                          to={`/ops/auctions/${finding.existingSessionId}`}
                        >
                          Mở Session hiện có
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {error && (
            <p className="ops-conflict" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="opening-review-success" aria-live="polite">
              {success}
            </p>
          )}

          <div className="create-primary-action">
            {createdSessionId ? (
              <ButtonLink
                to={`/ops/auctions/${createdSessionId}`}
                variant="primary"
              >
                Mở workspace phiên
              </ButtonLink>
            ) : !draft.assetId ? (
              <>
                <Button disabled>Chọn tài sản</Button>
                <small>Chọn một Asset reference để bắt đầu.</small>
              </>
            ) : reference && !externalBlocked && !stale && readiness.ready ? (
              <Button onClick={() => setDialogOpen(true)}>
                Tạo bản nháp phiên đấu giá
              </Button>
            ) : reference && !externalBlocked && !stale ? (
              <Button onClick={() => setValidated(true)}>
                Kiểm tra mức sẵn sàng
              </Button>
            ) : (
              <small>
                Create bị khóa cho đến khi Draft và Asset reference đều sẵn
                sàng.
              </small>
            )}
          </div>
        </section>

        <aside className="create-rail">
          <h2>Readiness</h2>
          {[
            [role === "CONTENT_STAFF", "Content Staff có authority"],
            [Boolean(reference), "Đã có Asset readiness reference"],
            [
              reference?.approvalStatus === "APPROVED",
              "Asset đã APPROVED",
            ],
            [
              reference?.availabilityStatus === "AVAILABLE",
              "Asset đang AVAILABLE",
            ],
            [!stale && Boolean(reference), "Asset reference hiện hành"],
            [!activeSession, "Không thuộc dynamic active Session"],
            [readiness.ready, "Draft và Asset đã sẵn sàng"],
          ].map(([ok, label]) => (
            <p key={String(label)}>
              {ok ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <AlertTriangle aria-hidden="true" />
              )}
              {String(label)}
            </p>
          ))}
          <h2>Execution boundary</h2>
          <p>
            Ready chỉ cho phép tạo Session DRAFT. Configuration, Content
            Review, Approval Package, Schedule và Publication chưa được tạo.
          </p>
        </aside>
      </div>

      {dialogOpen && reference && (
        <SgdgManagedCreationDialog
          draft={draft}
          referenceId={reference.referenceId}
          assetVersion={reference.assetVersion}
          busy={busy}
          onClose={() => setDialogOpen(false)}
          onConfirm={confirmCreation}
        />
      )}
    </main>
  );
}

function SgdgManagedCreationDialog({
  draft,
  referenceId,
  assetVersion,
  busy,
  onClose,
  onConfirm,
}: {
  draft: SgdgManagedSessionDraft;
  referenceId: string;
  assetVersion: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => CreateSgdgManagedSessionResult;
}) {
  const [commandError, setCommandError] = useState("");
  const confirm = () => {
    if (busy) return;
    const result = onConfirm();
    if (!result.ok) setCommandError(result.message);
  };
  return (
    <Dialog
      open
      title="Tạo SGDG-managed Session Draft"
      description="Auction System sẽ final-revalidate Draft và Asset reference trước khi tạo."
      preventClose={busy}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button onClick={confirm} loading={busy}>
            Xác nhận tạo bản nháp
          </Button>
        </>
      }
    >
      <dl className="opening-review-dialog-reference">
        <div>
          <dt>Session title</dt>
          <dd>{draft.title}</dd>
        </div>
        <div>
          <dt>Asset reference</dt>
          <dd>{draft.assetId}</dd>
        </div>
        <div>
          <dt>Asset version</dt>
          <dd>v{assetVersion}</dd>
        </div>
        <div>
          <dt>Readiness reference</dt>
          <dd>{referenceId}</dd>
        </div>
        <div>
          <dt>Management mode</dt>
          <dd>SGDG_MANAGED</dd>
        </div>
        <div>
          <dt>Target state</dt>
          <dd>DRAFT · NOT_READY</dd>
        </div>
      </dl>
      <p className="opening-review-disclosure">
        Chỉ Session Draft được tạo. Configuration, Approval, Schedule,
        Publication và Registration không xảy ra.
      </p>
      {commandError && (
        <p className="ops-conflict" role="alert">
          {commandError}
        </p>
      )}
    </Dialog>
  );
}
