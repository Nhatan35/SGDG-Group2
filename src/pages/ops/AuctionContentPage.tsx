import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { BlockedState } from "../../components/feedback/States";
import { useDemoStore } from "../../store/demoStore";
import {
  AUCTION_SUMMARY_MAX_LENGTH,
  AUCTION_TITLE_MAX_LENGTH,
  PROTOTYPE_CONTENT_POLICY,
  type AuctionContentCommandResult,
  useAuctionContentStore,
} from "../../store/auctionContentStore";
import {
  CONTENT_STAFF_ACTOR_ID,
  useOpeningRequestStore,
} from "../../store/openingRequestStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import "../../styles/auction-content.css";

const errorMessage = (
  result: Extract<AuctionContentCommandResult, { ok: false }>,
) => result.message;

export function AuctionContentPage() {
  const { sessionId } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const session = useAuctionSessionStore((state) =>
    state.sessions.find((item) => item.sessionId === sessionId),
  );
  const content = useAuctionContentStore((state) =>
    state.contents.find((item) => item.sessionId === sessionId),
  );
  const request = useOpeningRequestStore((state) =>
    state.records.find(
      (item) =>
        item.requestId ===
        (content?.sourceLineage.openingRequestId ??
          (session?.recordKind === "DYNAMIC_LINKED_SESSION"
            ? session.openingRequestId
            : undefined)),
    ),
  );
  const initializeAuctionContent = useAuctionContentStore(
    (state) => state.initializeAuctionContent,
  );
  const saveAuctionContentDraft = useAuctionContentStore(
    (state) => state.saveAuctionContentDraft,
  );
  const refreshAuctionContentSourceLineage = useAuctionContentStore(
    (state) => state.refreshAuctionContentSourceLineage,
  );
  const [auctionTitle, setAuctionTitle] = useState(
    () => content?.workingContent.auctionTitle ?? "",
  );
  const [auctionSummary, setAuctionSummary] = useState(
    () => content?.workingContent.auctionSummary ?? "",
  );
  const [changeReason, setChangeReason] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"auctionTitle" | "auctionSummary", string>>
  >({});
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const sourceTitle = content?.sourceLineage.originalTitle ?? request?.title;
  const sourcePurpose =
    content?.sourceLineage.originalPurpose ?? request?.purpose ?? "";
  const sourceVersion =
    content?.sourceLineage.openingRequestVersion ?? request?.version;
  const findingsByField = useMemo(
    () =>
      Object.fromEntries(
        (content?.completeness.findings ?? [])
          .filter((finding) => finding.field)
          .map((finding) => [finding.field!, finding.message]),
      ),
    [content],
  );

  const clearFeedback = () => {
    setError("");
    setFieldErrors({});
    setSuccess("");
  };

  const initialize = () => {
    if (
      !session ||
      session.recordKind !== "DYNAMIC_LINKED_SESSION" ||
      !request
    )
      return;
    clearFeedback();
    setBusy(true);
    const result = initializeAuctionContent({
      sessionId: session.sessionId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole,
      expectedSessionVersion: session.currentVersion,
      expectedOpeningRequestVersion: request.version,
      commandId: `INITIALIZE_AUCTION_CONTENT:${session.sessionId}:S${session.currentVersion}:R${request.version}`,
    });
    setBusy(false);
    if (!result.ok) {
      setError(errorMessage(result));
      return;
    }
    setAuctionTitle(result.content.workingContent.auctionTitle);
    setAuctionSummary(result.content.workingContent.auctionSummary);
    setSuccess(
      `Đã khởi tạo Auction Content ${result.content.contentId} phiên bản 1.`,
    );
  };

  const save = () => {
    if (!session || !content) return;
    clearFeedback();
    setBusy(true);
    const result = saveAuctionContentDraft({
      contentId: content.contentId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole,
      expectedContentVersion: content.contentVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: `SAVE_AUCTION_CONTENT:${content.contentId}:V${content.contentVersion}`,
      auctionTitle,
      auctionSummary,
      changeReason,
    });
    setBusy(false);
    if (!result.ok) {
      setError(errorMessage(result));
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    setAuctionTitle(result.content.workingContent.auctionTitle);
    setAuctionSummary(result.content.workingContent.auctionSummary);
    setChangeReason("");
    setSuccess(
      result.changed
        ? `Đã lưu Auction Content phiên bản ${result.content.contentVersion}.`
        : `Không có thay đổi; vẫn ở phiên bản ${result.content.contentVersion}.`,
    );
  };

  const refreshSource = () => {
    if (!session || !content) return;
    clearFeedback();
    const result = refreshAuctionContentSourceLineage({
      contentId: content.contentId,
      actorId: CONTENT_STAFF_ACTOR_ID,
      actorRole,
      expectedContentVersion: content.contentVersion,
      expectedSessionVersion: session.currentVersion,
      commandId: `REFRESH_AUCTION_CONTENT_SOURCE:${content.contentId}:V${content.contentVersion}`,
    });
    if (!result.ok) {
      setError(errorMessage(result));
      return;
    }
    setSuccess(
      result.changed
        ? `Đã cập nhật trạng thái source lineage: ${result.content.status}.`
        : "Source lineage không thay đổi.",
    );
  };

  if (!session)
    return (
      <main className="auction-content-page">
        <header className="auction-content-heading">
          <span>AUCTION OPERATIONS</span>
          <h1>Auction Content</h1>
        </header>
        <BlockedState
          title="Không tìm thấy dynamic Session"
          description="Content workspace không sử dụng fixture fallback."
        />
      </main>
    );

  if (actorRole !== "CONTENT_STAFF")
    return (
      <main className="auction-content-page">
        <header className="auction-content-heading">
          <span>AUCTION OPERATIONS</span>
          <h1>Auction Content</h1>
        </header>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ CONTENT_STAFF được truy cập nội dung làm việc nội bộ."
        />
      </main>
    );

  if (session.recordKind !== "DYNAMIC_LINKED_SESSION")
    return (
      <main className="auction-content-page">
        <header className="auction-content-heading">
          <span>AUCTION OPERATIONS</span>
          <h1>Auction Content</h1>
        </header>
        <section className="prototype-content-disclaimer" role="note">
          <strong>{PROTOTYPE_CONTENT_POLICY.classification}</strong>
        </section>
        <BlockedState
          title="Dynamic Content foundation deferred for this branch"
          description="Direct SGDG title, purpose và region chưa được migrate để tránh tạo duplicate content authority. Configuration Listing Fee vẫn cần quyết định nghiệp vụ."
          primaryAction={
            <Link className="button secondary" to={`/ops/auctions/${session.sessionId}`}>
              Trở lại Session
            </Link>
          }
        />
      </main>
    );

  return (
    <main className="auction-content-page">
      <header className="auction-content-heading">
        <span>AUCTION OPERATIONS · CONTENT FOUNDATION</span>
        <h1>Auction Content</h1>
        <p>
          BOUNDARY DECISION: Content is versioned independently from Auction
          Session lifecycle state.
        </p>
      </header>

      <section className="prototype-content-disclaimer" role="note">
        <strong>{PROTOTYPE_CONTENT_POLICY.classification}</strong>
        <p>{PROTOTYPE_CONTENT_POLICY.publicationBoundary}</p>
      </section>

      <section className="auction-content-identity" aria-labelledby="content-session-heading">
        <div>
          <h2 id="content-session-heading">Session identity</h2>
          <dl>
            <dt>Session</dt>
            <dd>{session.sessionId}</dd>
            <dt>Code</dt>
            <dd>{session.auctionCode}</dd>
            <dt>Source / mode</dt>
            <dd>
              {session.creationSource} / {session.managementMode}
            </dd>
          </dl>
        </div>
        <div className="auction-content-badges">
          <Badge tone="neutral">{session.lifecycleStatus}</Badge>
          <Badge tone="warning">{session.publicationStatus}</Badge>
          <Badge tone={content?.status === "COMPLETE" ? "success" : "info"}>
            {content?.status ?? "NOT INITIALIZED"}
          </Badge>
        </div>
      </section>

      <div className="auction-content-comparison">
        <section className="auction-content-panel source-panel">
          <header>
            <p className="content-panel-eyebrow">CUSTOMER SOURCE · READ-ONLY</p>
            <h2>Nguồn từ Opening Request — chỉ đọc</h2>
          </header>
          <label>
            Request ID / version
            <input
              readOnly
              aria-readonly="true"
              value={`${request?.requestId ?? "Không tìm thấy"} · v${sourceVersion ?? "—"}`}
            />
          </label>
          <label>
            Source owner
            <input
              readOnly
              aria-readonly="true"
              value={content?.sourceLineage.customerId ?? request?.ownerId ?? "—"}
            />
          </label>
          <label>
            Accepted state
            <input
              readOnly
              aria-readonly="true"
              value={content?.sourceLineage.acceptedState ?? request?.status ?? "—"}
            />
          </label>
          <label>
            Tiêu đề gốc
            <textarea
              readOnly
              aria-readonly="true"
              rows={3}
              value={sourceTitle ?? ""}
            />
          </label>
          <label>
            Mục đích gốc
            <textarea
              readOnly
              aria-readonly="true"
              rows={5}
              value={sourcePurpose}
            />
          </label>
        </section>

        <section className="auction-content-panel working-panel">
          <header>
            <p className="content-panel-eyebrow">CONTENT_STAFF WORKING DRAFT</p>
            <h2>Nội dung làm việc — Content Staff chỉnh sửa</h2>
          </header>
          {content ? (
            <>
              <label htmlFor="auction-title">
                Tiêu đề phiên đấu giá <span aria-hidden="true">*</span>
              </label>
              <input
                id="auction-title"
                required
                value={auctionTitle}
                maxLength={AUCTION_TITLE_MAX_LENGTH + 1}
                aria-describedby="auction-title-count auction-title-error"
                aria-invalid={Boolean(
                  fieldErrors.auctionTitle || findingsByField.auctionTitle,
                )}
                onChange={(event) => setAuctionTitle(event.target.value)}
              />
              <small id="auction-title-count" className="content-character-count">
                {auctionTitle.length}/{AUCTION_TITLE_MAX_LENGTH} ký tự
              </small>
              {(fieldErrors.auctionTitle || findingsByField.auctionTitle) && (
                <p id="auction-title-error" className="field-error">
                  Lỗi: {fieldErrors.auctionTitle ?? findingsByField.auctionTitle}
                </p>
              )}

              <label htmlFor="auction-summary">
                Tóm tắt phiên đấu giá <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="auction-summary"
                required
                rows={8}
                value={auctionSummary}
                maxLength={AUCTION_SUMMARY_MAX_LENGTH + 1}
                aria-describedby="auction-summary-count auction-summary-error"
                aria-invalid={Boolean(
                  fieldErrors.auctionSummary || findingsByField.auctionSummary,
                )}
                onChange={(event) => setAuctionSummary(event.target.value)}
              />
              <small id="auction-summary-count" className="content-character-count">
                {auctionSummary.length}/{AUCTION_SUMMARY_MAX_LENGTH} ký tự
              </small>
              {(fieldErrors.auctionSummary ||
                findingsByField.auctionSummary) && (
                <p id="auction-summary-error" className="field-error">
                  Lỗi:{" "}
                  {fieldErrors.auctionSummary ??
                    findingsByField.auctionSummary}
                </p>
              )}

              <label htmlFor="content-change-reason">
                Ghi chú thay đổi <span>(không bắt buộc)</span>
              </label>
              <input
                id="content-change-reason"
                value={changeReason}
                onChange={(event) => setChangeReason(event.target.value)}
              />
            </>
          ) : (
            <div className="content-not-initialized">
              <p>
                Working content chưa được khởi tạo. Giá trị ban đầu sẽ được sao
                chép từ Opening Request hiện hành.
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="source-working-explanation">
        Giá trị nguồn từ Opening Request được giữ nguyên. Việc chỉnh sửa nội
        dung làm việc không thay đổi yêu cầu gốc của Customer.
      </p>

      {error && (
        <div className="auction-content-alert" role="alert">
          <strong>Không thể hoàn tất thao tác</strong>
          <p>{error}</p>
          <p>Dữ liệu đang nhập trên form được giữ nguyên.</p>
        </div>
      )}
      <p className="auction-content-success" aria-live="polite">
        {success}
      </p>

      {content && (
        <section className="auction-content-readiness" aria-labelledby="content-completeness-heading">
          <div>
            <h2 id="content-completeness-heading">Content completeness</h2>
            <p>
              Content version <strong>v{content.contentVersion}</strong> ·{" "}
              {content.completeness.complete
                ? "CONTENT DRAFT COMPLETE"
                : "DRAFT — còn finding"}
            </p>
          </div>
          {content.completeness.findings.length ? (
            <ul>
              {content.completeness.findings.map((finding) => (
                <li key={finding.code}>
                  <strong>{finding.code}</strong>
                  <span>{finding.message}</span>
                  <small>
                    Owner: {finding.owner} ·{" "}
                    {finding.correctableInCurrentWorkspace
                      ? "Có thể sửa tại đây"
                      : "Chỉ đọc"}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>Không còn blocking content finding.</p>
          )}
        </section>
      )}

      <div className="auction-content-actions">
        {!content ? (
          <Button loading={busy} onClick={initialize}>
            Khởi tạo nội dung phiên đấu giá
          </Button>
        ) : (
          <>
            <Button loading={busy} onClick={save}>
              {content.completeness.complete
                ? "Lưu nội dung"
                : "Lưu bản nháp"}
            </Button>
            <Button variant="secondary" onClick={refreshSource}>
              Kiểm tra lại nguồn
            </Button>
          </>
        )}
        <Link className="button secondary" to={`/ops/auctions/${session.sessionId}`}>
          Trở lại Session
        </Link>
      </div>

      {content && (
        <section className="auction-content-history">
          <h2>Version history</h2>
          <ol>
            {content.versions
              .slice()
              .reverse()
              .map((version) => (
                <li key={version.versionId}>
                  <strong>Content v{version.contentVersion}</strong>
                  <span>{version.workingContent.auctionTitle || "Chưa có tiêu đề"}</span>
                  <small>
                    {version.createdBy} · {version.createdAt}
                    {version.changeReason
                      ? ` · ${version.changeReason}`
                      : ""}
                  </small>
                </li>
              ))}
          </ol>
        </section>
      )}
    </main>
  );
}
