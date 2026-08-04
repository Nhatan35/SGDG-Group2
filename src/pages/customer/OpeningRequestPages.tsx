import { ClipboardList, Plus, Search } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { ResilientImage } from "../../components/common/ResilientImage";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/feedback/States";
import {
  CURRENT_CUSTOMER_ID,
  isOpeningRequestCustomerEditable,
  openingRequestStatusLabel,
  selectCustomerVisibleHistory,
  selectOpeningRequestForOwner,
  selectOwnedOpeningRequests,
  type CustomerOpeningRequest,
  type OpeningRequestHistoryAction,
  useOpeningRequestStore,
} from "../../store/openingRequestStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import { formatDateTime, formatMoney } from "../../utils/format";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/opening-request-customer.css";
import "../../styles/opening-request-enhancements.css";
import "../../styles/opening-request-lifecycle.css";

const statusTone = (status: CustomerOpeningRequest["status"]) =>
  status === "ACCEPTED_FOR_DRAFT"
    ? "success"
    : status === "REJECTED"
      ? "danger"
      : status === "DRAFT"
        ? "neutral"
        : status === "GOVERNANCE_REVIEW"
          ? "info"
          : "warning";

const actionLabel = (status: CustomerOpeningRequest["status"]) =>
  status === "DRAFT"
    ? "Tiếp tục chỉnh sửa"
    : status === "RETURNED_FOR_CORRECTION"
      ? "Xem và chỉnh sửa"
      : status === "ACCEPTED_FOR_DRAFT"
        ? "Xem yêu cầu đã được tiếp nhận"
        : status === "REJECTED"
          ? "Xem quyết định"
          : "Xem yêu cầu";

const historyLabel: Record<OpeningRequestHistoryAction, string> = {
  CREATE_DRAFT: "Tạo bản nháp",
  SAVE_DRAFT: "Lưu bản nháp",
  SUBMIT: "Gửi yêu cầu",
  START_REVIEW: "Bắt đầu xem xét",
  RETURN_FOR_CORRECTION: "Yêu cầu cập nhật",
  RESUBMIT: "Gửi lại yêu cầu",
  REJECT: "Từ chối yêu cầu",
  ACCEPT_FOR_DRAFT: "Tiếp nhận để chuẩn bị phiên",
  ROUTE_TO_GOVERNED_REVIEW: "Chuyển xem xét quản trị",
};

export function OpeningRequestListPage({
  basePath = "/account/opening-requests",
}: {
  basePath?: string;
}) {
  const records = useOpeningRequestStore((state) => state.records);
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const status = params.get("status") ?? "ALL";
  const view = params.get("view");
  const owned = selectOwnedOpeningRequests(records, CURRENT_CUSTOMER_ID);
  const rows = useMemo(
    () =>
      owned
        .filter((item) => status === "ALL" || item.status === status)
        .filter((item) =>
          `${item.requestId} ${item.title} ${item.assetReference}`
            .toLocaleLowerCase("vi")
            .includes(query.toLocaleLowerCase("vi")),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [owned, query, status],
  );
  const setFilter = (key: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });

  if (view === "loading")
    return <LoadingState label="Đang tải yêu cầu mở phiên" />;
  if (view === "error")
    return (
      <ErrorState
        announce
        description="Dữ liệu hiện tại không thay đổi. Vui lòng thử tải lại."
        retry={() => setFilter("view", "")}
      />
    );

  return (
    <main className="opening-request-page">
      <header className="opening-request-heading">
        <div>
          <span>YÊU CẦU MỞ PHIÊN</span>
          <h1>Yêu cầu đấu giá của tôi</h1>
          <p>Theo dõi, hoàn thiện và gửi yêu cầu mở phiên đấu giá.</p>
        </div>
        <Link className="button primary" to={`${basePath}/new`}>
          <Plus aria-hidden="true" /> Tạo yêu cầu mở phiên
        </Link>
      </header>
      {owned.length ? (
        <>
          <section
            className="opening-request-filters"
            aria-label="Bộ lọc yêu cầu"
          >
            <label>
              <span>Tìm kiếm</span>
              <span className="opening-request-search">
                <Search aria-hidden="true" />
                <input
                  value={query}
                  placeholder="Mã yêu cầu hoặc tên tài sản"
                  onChange={(event) => setFilter("q", event.target.value)}
                />
              </span>
            </label>
            <label>
              <span>Trạng thái</span>
              <select
                value={status}
                onChange={(event) => setFilter("status", event.target.value)}
              >
                <option value="ALL">Tất cả</option>
                {Object.entries(openingRequestStatusLabel).map(
                  ([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>
          </section>
          {rows.length ? (
            <section
              className="opening-request-list"
              aria-label="Danh sách yêu cầu"
            >
              {rows.map((item) => (
                <article key={item.requestId}>
                  <div>
                    <Badge tone={statusTone(item.status)}>
                      {openingRequestStatusLabel[item.status]}
                    </Badge>
                    <h2>{item.title || "Yêu cầu chưa đặt tên"}</h2>
                    <p>
                      {item.requestId} · Phiên bản {item.version}
                    </p>
                  </div>
                  <dl>
                    <div>
                      <dt>Tài sản</dt>
                      <dd>{item.assetReference || "Chưa nhập"}</dd>
                    </div>
                    <div>
                      <dt>Cập nhật</dt>
                      <dd>{formatDateTime(item.updatedAt)}</dd>
                    </div>
                  </dl>
                  <Link
                    className="button secondary"
                    to={`${basePath}/${item.requestId}`}
                  >
                    {actionLabel(item.status)}
                  </Link>
                </article>
              ))}
            </section>
          ) : (
            <EmptyState
              title="Không có kết quả phù hợp"
              description="Hãy thay đổi từ khóa hoặc trạng thái lọc."
              primaryAction={
                <Button variant="secondary" onClick={() => setParams({})}>
                  Xóa bộ lọc
                </Button>
              }
            />
          )}
        </>
      ) : (
        <EmptyState
          title="Bạn chưa có yêu cầu mở phiên"
          description="Tạo yêu cầu đầu tiên để SGDG tiếp nhận và xem xét tài sản."
          icon={<ClipboardList />}
          primaryAction={
            <Link className="button primary" to={`${basePath}/new`}>
              Tạo yêu cầu mở phiên
            </Link>
          }
        />
      )}
    </main>
  );
}

type FormValues = {
  title: string;
  assetReference: string;
  assetCategory: string;
  assetCondition: string;
  assetImageUrl: string;
  purpose: string;
  proposedStartPrice: string;
  customerNotes: string;
  declarationAccepted: boolean;
};

const fromRecord = (record?: CustomerOpeningRequest): FormValues => ({
  title: record?.title ?? "",
  assetReference: record?.assetReference ?? "",
  assetCategory: record?.assetCategory ?? "",
  assetCondition: record?.assetCondition ?? "",
  assetImageUrl: record?.assetImageUrl ?? "",
  purpose: record?.purpose ?? "",
  proposedStartPrice: record?.proposedStartPrice?.toString() ?? "",
  customerNotes: record?.customerNotes ?? "",
  declarationAccepted: record?.declarationAccepted ?? false,
});

export function OpeningRequestFormPage({
  create = false,
  basePath = "/account/opening-requests",
}: {
  create?: boolean;
  basePath?: string;
}) {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const records = useOpeningRequestStore((state) => state.records);
  const createDraft = useOpeningRequestStore((state) => state.createDraft);
  const saveDraft = useOpeningRequestStore((state) => state.saveDraft);
  const submitOpeningRequest = useOpeningRequestStore(
    (state) => state.submitOpeningRequest,
  );
  const dynamicSessions = useAuctionSessionStore((state) => state.sessions);
  const existing = requestId
    ? selectOpeningRequestForOwner(records, requestId, CURRENT_CUSTOMER_ID)
    : undefined;
  const [recordId, setRecordId] = useState(existing?.requestId);
  const record = records.find(
    (item) =>
      item.requestId === recordId && item.ownerId === CURRENT_CUSTOMER_ID,
  );
  const [values, setValues] = useState(() => fromRecord(existing));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  if (!create && !existing) return <NotFoundPage />;

  const editable =
    create || (record ? isOpeningRequestCustomerEditable(record.status) : false);
  const fields = {
    title: values.title.trim(),
    assetReference: values.assetReference.trim(),
    assetCategory: values.assetCategory,
    assetCondition: values.assetCondition.trim(),
    assetImageUrl: values.assetImageUrl,
    purpose: values.purpose.trim(),
    proposedStartPrice: values.proposedStartPrice
      ? Number(values.proposedStartPrice)
      : null,
    customerNotes: values.customerNotes.trim(),
    declarationAccepted: values.declarationAccepted,
  };

  const ensureDraft = () => {
    if (record) return record;
    const created = createDraft({
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      commandId: `create-${CURRENT_CUSTOMER_ID}-${records.length + 1}`,
    });
    if (!created.ok) {
      setMessage(created.message);
      return undefined;
    }
    setRecordId(created.data.requestId);
    return created.data;
  };

  const save = () => {
    const current = ensureDraft();
    if (!current) return;
    if (fields.proposedStartPrice !== null && fields.proposedStartPrice <= 0) {
      setErrors({ proposedStartPrice: "Giá đề xuất phải lớn hơn 0." });
      return;
    }
    const result = saveDraft({
      requestId: current.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: current.version,
      commandId: `save-${current.requestId}-v${current.version}`,
      fields,
    });
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setErrors({});
    setMessage("Đã lưu bản nháp.");
    if (create)
      navigate(`${basePath}/${result.data.requestId}`, {
        replace: true,
      });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!fields.title) nextErrors.title = "Vui lòng nhập tên yêu cầu.";
    if (!fields.assetReference)
      nextErrors.assetReference = "Vui lòng nhập tham chiếu tài sản.";
    if (!fields.purpose)
      nextErrors.purpose = "Vui lòng nhập mục đích đấu giá.";
    if (!fields.proposedStartPrice || fields.proposedStartPrice <= 0)
      nextErrors.proposedStartPrice =
        "Vui lòng nhập giá đề xuất hợp lệ.";
    if (!fields.declarationAccepted)
      nextErrors.declarationAccepted =
        "Bạn cần xác nhận thông tin trước khi gửi.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    const current = ensureDraft();
    if (!current) return;
    const result = submitOpeningRequest({
      requestId: current.requestId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole: "CUSTOMER",
      expectedVersion: current.version,
      commandId: `${
        current.status === "RETURNED_FOR_CORRECTION" ? "resubmit" : "submit"
      }-${current.requestId}-v${current.version}`,
      fields,
    });
    if (!result.ok) {
      setMessage(result.message);
      if (result.fieldErrors) setErrors(result.fieldErrors);
      return;
    }
    setErrors({});
    navigate(`${basePath}/${result.data.requestId}`, {
      replace: true,
    });
  };

  const customerHistory = record ? selectCustomerVisibleHistory(record) : [];
  const linkedSession =
    record?.acceptedOpeningRequestVersion !== undefined
      ? dynamicSessions.find(
          (session) =>
            session.openingRequestId === record.requestId &&
            session.openingRequestVersion ===
              record.acceptedOpeningRequestVersion,
        )
      : undefined;

  return (
    <main className="opening-request-page">
      <header className="opening-request-heading compact">
        <div>
          <Link to={basePath}>← Yêu cầu của tôi</Link>
          <h1>
            {create
              ? "Tạo yêu cầu mở phiên"
              : record?.title || "Chi tiết yêu cầu"}
          </h1>
          <p>
            {record
              ? `${record.requestId} · Phiên bản ${record.version}`
              : "Bản nháp mới"}
          </p>
        </div>
        {record && (
          <Badge tone={statusTone(record.status)}>
            {openingRequestStatusLabel[record.status]}
          </Badge>
        )}
      </header>

      {record?.status === "RETURNED_FOR_CORRECTION" && (
        <section className="opening-request-correction" role="status">
          <h2>Yêu cầu cần được chỉnh sửa</h2>
          <p>{record.reviewerComment}</p>
          {record.correctionSections?.length ? (
            <p>Phần cần chú ý: {record.correctionSections.join(", ")}.</p>
          ) : null}
          {record.previousSubmittedAt || record.submittedAt ? (
            <small>
              Lần gửi trước:{" "}
              {formatDateTime(
                record.previousSubmittedAt ?? record.submittedAt ?? "",
              )}
            </small>
          ) : null}
        </section>
      )}
      {record?.status === "REJECTED" && (
        <section
          className="opening-request-outcome opening-request-outcome--rejected"
          role="status"
        >
          <h2>Yêu cầu đã bị từ chối</h2>
          <p>{record.decisionReason}</p>
          <p>
            Yêu cầu này không thể chỉnh sửa hoặc gửi lại trong vòng đời hiện
            tại.
          </p>
          {record.decisionAt && (
            <small>Quyết định lúc {formatDateTime(record.decisionAt)}</small>
          )}
        </section>
      )}
      {record?.status === "ACCEPTED_FOR_DRAFT" && (
        <section
          className="opening-request-outcome opening-request-outcome--accepted"
          role="status"
        >
          <h2>Đã tiếp nhận để chuẩn bị phiên đấu giá</h2>
          {linkedSession ? (
            <>
              <p>
                Yêu cầu đã được tiếp nhận và bản nháp phiên đấu giá đã được
                tạo.
              </p>
              <p>
                Phiên chưa được phê duyệt, lập lịch hoặc xuất bản. SGDG sẽ tiếp
                tục các bước chuẩn bị nội bộ.
              </p>
              <small>
                Bắt đầu chuẩn bị lúc {formatDateTime(linkedSession.createdAt)}
              </small>
            </>
          ) : (
            <>
              <p>
                Yêu cầu đã được tiếp nhận cho bước chuẩn bị bản nháp phiên đấu
                giá.
              </p>
              <p>
                Phiên đấu giá chưa được tạo hoặc phê duyệt trong bước này; chưa
                có lịch và chưa được xuất bản.
              </p>
            </>
          )}
        </section>
      )}
      {record?.status === "GOVERNANCE_REVIEW" && (
        <section
          className="opening-request-outcome opening-request-outcome--governance"
          role="status"
        >
          <h2>Đang xem xét theo quy trình quản trị</h2>
          <p>
            Yêu cầu đang được xem xét theo quy trình quản trị. Bạn chưa cần thực
            hiện thêm thao tác tại thời điểm này.
          </p>
        </section>
      )}
      {!editable && record && (
        <p className="opening-request-readonly">
          Trạng thái hiện tại chỉ cho phép xem. Quyết định review thuộc SGDG
          Operations.
        </p>
      )}

      <form className="opening-request-form" onSubmit={onSubmit} noValidate>
        <label>
          <span>Tên yêu cầu</span>
          <input
            id="title"
            disabled={!editable}
            value={values.title}
            onChange={(event) =>
              setValues({ ...values, title: event.target.value })
            }
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
          />
          {errors.title && (
            <small id="title-error" className="field-error">
              {errors.title}
            </small>
          )}
        </label>
        <label>
          <span>Tham chiếu tài sản</span>
          <input
            id="assetReference"
            disabled={!editable}
            value={values.assetReference}
            onChange={(event) =>
              setValues({ ...values, assetReference: event.target.value })
            }
            aria-invalid={Boolean(errors.assetReference)}
          />
          {errors.assetReference && (
            <small className="field-error">{errors.assetReference}</small>
          )}
        </label>
        <section className="opening-request-asset-details wide" aria-labelledby="asset-details-title">
          <header>
            <h2 id="asset-details-title">Thông tin nhận diện tài sản</h2>
            <p>Thông tin và hình ảnh giúp SGDG đối chiếu đúng tài sản khi tiếp nhận hồ sơ.</p>
          </header>
          <div className="opening-request-asset-fields">
            <label>
              <span>Loại tài sản</span>
              <select
                disabled={!editable}
                value={values.assetCategory}
                onChange={(event) =>
                  setValues({ ...values, assetCategory: event.target.value })
                }
              >
                <option value="">Chọn loại tài sản</option>
                <option>Đồng hồ</option>
                <option>Trang sức</option>
                <option>Nghệ thuật</option>
                <option>Đồ cổ</option>
                <option>Xe cộ</option>
                <option>Bất động sản</option>
                <option>Khác</option>
              </select>
            </label>
            <label>
              <span>Tình trạng tài sản</span>
              <input
                disabled={!editable}
                placeholder="Ví dụ: mới, đã qua sử dụng, còn nguyên hộp"
                value={values.assetCondition}
                onChange={(event) =>
                  setValues({ ...values, assetCondition: event.target.value })
                }
              />
            </label>
          </div>
          <div className="opening-request-image-field">
            <label>
              <span>Hình ảnh tài sản</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={!editable}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () =>
                    setValues({ ...values, assetImageUrl: String(reader.result ?? "") });
                  reader.readAsDataURL(file);
                }}
              />
              <small>PNG, JPG hoặc WebP. Ảnh rõ toàn bộ tài sản sẽ giúp rút ngắn bước đối chiếu.</small>
            </label>
            <div className="opening-request-image-preview">
              {values.assetImageUrl ? (
                <ResilientImage src={values.assetImageUrl} alt="Ảnh tài sản đã chọn" />
              ) : (
                <span>Chưa có ảnh tài sản</span>
              )}
            </div>
          </div>
        </section>
        <label className="wide">
          <span>Mục đích đấu giá</span>
          <textarea
            id="purpose"
            disabled={!editable}
            value={values.purpose}
            onChange={(event) =>
              setValues({ ...values, purpose: event.target.value })
            }
            aria-invalid={Boolean(errors.purpose)}
          />
          {errors.purpose && (
            <small className="field-error">{errors.purpose}</small>
          )}
        </label>
        <label>
          <span>Giá khởi điểm đề xuất</span>
          <input
            id="proposedStartPrice"
            type="number"
            min="1"
            disabled={!editable}
            value={values.proposedStartPrice}
            onChange={(event) =>
              setValues({ ...values, proposedStartPrice: event.target.value })
            }
            aria-invalid={Boolean(errors.proposedStartPrice)}
          />
          {errors.proposedStartPrice && (
            <small className="field-error">{errors.proposedStartPrice}</small>
          )}
          {fields.proposedStartPrice ? (
            <small>{formatMoney(fields.proposedStartPrice)}</small>
          ) : null}
        </label>
        <label className="wide">
          <span>Ghi chú cho SGDG</span>
          <textarea
            disabled={!editable}
            value={values.customerNotes}
            onChange={(event) =>
              setValues({ ...values, customerNotes: event.target.value })
            }
          />
        </label>
        <label className="opening-request-declaration wide">
          <input
            id="declarationAccepted"
            type="checkbox"
            disabled={!editable}
            checked={values.declarationAccepted}
            onChange={(event) =>
              setValues({
                ...values,
                declarationAccepted: event.target.checked,
              })
            }
          />
          <span>
            Tôi xác nhận thông tin cung cấp là chính xác và hiểu rằng yêu cầu
            được tiếp nhận không đồng nghĩa phiên đấu giá đã được phê duyệt,
            lên lịch hoặc công bố.
          </span>
          {errors.declarationAccepted && (
            <small className="field-error">
              {errors.declarationAccepted}
            </small>
          )}
        </label>
        {message && (
          <p className="opening-request-message" aria-live="polite">
            {message}
          </p>
        )}
        {editable && (
          <footer className="opening-request-actions wide">
            <Button type="button" variant="secondary" onClick={save}>
              Lưu bản nháp
            </Button>
            <Button type="submit">
              {record?.status === "RETURNED_FOR_CORRECTION"
                ? "Gửi lại yêu cầu"
                : "Gửi yêu cầu"}
            </Button>
          </footer>
        )}
      </form>

      {customerHistory.length > 0 && (
        <section
          className="opening-request-history"
          aria-labelledby="opening-request-history-title"
        >
          <h2 id="opening-request-history-title">Lịch sử yêu cầu</h2>
          <ol>
            {customerHistory.map((entry) => (
              <li key={entry.id}>
                <strong>{historyLabel[entry.action]}</strong>
                <span>
                  Phiên bản {entry.requestVersion} ·{" "}
                  {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
