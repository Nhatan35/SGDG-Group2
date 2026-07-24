import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Navigate, useOutletContext, useSearchParams } from "react-router-dom";
import {
  canCreateDirectSgdgSession,
  canUseAssetForNewSession,
  getAssetCreationBlockReason,
  getDirectSgdgSessionCreationFixture,
  validateDirectSessionDraft,
} from "../../services/mock/operationsService";
import "../../styles/create-sgdg-session.css";

type Context = { role: "CONTENT_STAFF" | "ADMIN" };
export function CreateSgdgManagedSessionPage() {
  const { role } = useOutletContext<Context>();
  const [params] = useSearchParams();
  const scenario = params.get("scenario") || undefined;
  const { asset, session } = getDirectSgdgSessionCreationFixture(scenario);
  const [created, setCreated] = useState(false);
  const [form, setForm] = useState({
    title: "Omega Speedmaster Moonwatch Professional — Phiên tháng 8",
    purpose: "Đấu giá tài sản đã được phê duyệt",
    region: asset.region,
    owner: "content.staff@mock.local",
  });
  const errors = validateDirectSessionDraft(form, asset, role);
  const valid = !Object.values(errors).some(Boolean);
  if (created)
    return <Navigate replace to={`/ops/auctions/${session.sessionId}`} />;
  return (
    <main className="create-session-page">
      <header className="ops-heading">
        <span>QUẢN LÝ PHIÊN ĐẤU GIÁ</span>
        <h1>Tạo phiên do SGDG quản lý</h1>
        <p>
          Tạo Auction Session bản nháp trực tiếp từ tài sản đã được phê duyệt.
          Thao tác này không tạo Customer Opening Request và không phê duyệt
          phiên.
        </p>
      </header>
      <p className="create-disclosure">
        <ShieldCheck /> Vai trò: {role} · Creation source: DIRECT_SGDG ·
        Management mode: SGDG_MANAGED · Auction Management Mock
      </p>
      <div className="create-grid">
        <section className="create-main">
          <h2>Chọn tài sản đã phê duyệt</h2>
          <article className="asset-choice">
            <strong>{asset.assetName}</strong>
            <span>
              {asset.assetId} · {asset.category} · {asset.region}
            </span>
            <small>
              Approval: {asset.approvalStatus} · Availability:{" "}
              {asset.availability} · Version: {asset.currentVersion} ·{" "}
              {asset.source}
            </small>
            {!canUseAssetForNewSession(asset) && (
              <p className="ops-conflict">
                <AlertTriangle /> {getAssetCreationBlockReason(asset)}
              </p>
            )}
          </article>
          <h2>Thông tin phiên bản nháp</h2>
          {(
            [
              ["title", "Tiêu đề phiên"],
              ["purpose", "Mục đích đấu giá"],
              ["region", "Khu vực"],
              ["owner", "Owner / Assignee"],
            ] as const
          ).map(([key, label]) => (
            <label className="create-field" key={key}>
              {label}
              <input
                value={form[key]}
                onChange={(e) =>
                  setForm((current) => ({ ...current, [key]: e.target.value }))
                }
                aria-invalid={errors[key] || undefined}
              />
              {errors[key] && <small>Trường này là bắt buộc.</small>}
            </label>
          ))}
          <dl className="create-summary">
            <div>
              <dt>Auction code preview</dt>
              <dd>{session.auctionCode}</dd>
            </div>
            <div>
              <dt>Session ID</dt>
              <dd>{session.sessionId}</dd>
            </div>
            <div>
              <dt>Opening Request</dt>
              <dd>Không tạo</dd>
            </div>
            <div>
              <dt>Approval Package</dt>
              <dd>Chưa tạo khi DRAFT</dd>
            </div>
          </dl>
          <button
            className="button primary"
            disabled={!valid}
            aria-describedby={!valid ? "create-blocker" : undefined}
            onClick={() => setCreated(true)}
          >
            Tạo bản nháp
          </button>
          {!valid && (
            <p id="create-blocker" className="ops-conflict">
              {errors.authority
                ? "Chỉ Content Staff được tạo phiên SGDG trực tiếp."
                : errors.asset
                  ? getAssetCreationBlockReason(asset)
                  : "Hoàn tất các trường bắt buộc trước khi tạo."}
            </p>
          )}
        </section>
        <aside className="create-rail">
          <h2>Readiness</h2>
          {[
            [canCreateDirectSgdgSession(role), "Content Staff có authority"],
            [asset.approvalStatus === "APPROVED", "Asset đã APPROVED"],
            [asset.availability === "AVAILABLE", "Asset đang AVAILABLE"],
            [!asset.activeSessionId, "Không thuộc active session"],
            [valid, "Thông tin bản nháp đầy đủ"],
          ].map(([ok, label]) => (
            <p key={String(label)}>
              {ok ? <CheckCircle2 /> : <AlertTriangle />}
              {String(label)}
            </p>
          ))}
          <h2>Audit preview</h2>
          <p>
            OPS-AUD-SGDG-OMEGA-001 · Create DRAFT · actor {form.owner} · fixed
            timestamp 2026-07-21T03:00:00.000Z
          </p>
        </aside>
      </div>
    </main>
  );
}
