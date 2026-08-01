import { Link, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/feedback/States";
import {
  openingRequestStatusLabel,
  useOpeningRequestStore,
} from "../../store/openingRequestStore";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/opening-request-lifecycle.css";

export function OpeningRequestGovernanceQueuePage() {
  const records = useOpeningRequestStore((state) => state.records);
  const [params, setParams] = useSearchParams();
  const governed = records.filter(
    (record) => record.status === "GOVERNANCE_REVIEW",
  );
  if (params.get("view") === "loading")
    return <LoadingState label="Đang tải hồ sơ xem xét quản trị" />;
  if (params.get("view") === "error")
    return (
      <ErrorState
        announce
        description="Không thể tải ngữ cảnh quản trị. Trạng thái hồ sơ không thay đổi."
        retry={() => setParams({})}
      />
    );
  return (
    <>
      <header className="ops-heading">
        <span>OPENING REQUEST GOVERNANCE</span>
        <h1>Hồ sơ chờ xem xét quản trị</h1>
        <p>
          Ngữ cảnh chỉ đọc dành cho ADMIN; chưa có quyền Apply Governance Hold.
        </p>
      </header>
      {governed.length ? (
        <section className="ops-panel governance-opening-list">
          <table>
            <caption className="sr-only">
              Opening Request đang chờ xem xét quản trị
            </caption>
            <thead>
              <tr>
                <th>Yêu cầu</th>
                <th>Tài sản</th>
                <th>Phiên bản</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {governed.map((record) => (
                <tr key={record.requestId}>
                  <td data-label="Yêu cầu">{record.requestId}</td>
                  <td data-label="Tài sản">{record.assetReference}</td>
                  <td data-label="Phiên bản">{record.version}</td>
                  <td data-label="Trạng thái">
                    <Badge tone="info">
                      {openingRequestStatusLabel[record.status]}
                    </Badge>
                  </td>
                  <td data-label="Thao tác">
                    <Link
                      to={`/governance/opening-requests/${record.requestId}`}
                    >
                      Xem hồ sơ
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <EmptyState
          title="Không có hồ sơ chờ quản trị"
          description="Chỉ các Opening Request đã được Content Staff chuyển sang xem xét quản trị mới xuất hiện tại đây."
        />
      )}
    </>
  );
}

export function OpeningRequestGovernanceDetailPage() {
  const { requestId } = useParams();
  const record = useOpeningRequestStore((state) =>
    state.records.find(
      (item) =>
        item.requestId === requestId &&
        item.status === "GOVERNANCE_REVIEW",
    ),
  );
  if (!record) return <NotFoundPage />;
  return (
    <>
      <header className="ops-heading">
        <span>OPENING REQUEST GOVERNANCE · READ ONLY</span>
        <h1>{record.requestId}</h1>
        <p>
          Review thông thường đã tạm dừng ở phiên bản {record.version}.
        </p>
      </header>
      <div className="governance-opening-grid">
        <section className="ops-panel">
          <Badge tone="info">
            {openingRequestStatusLabel[record.status]}
          </Badge>
          <h2>Tham chiếu hồ sơ</h2>
          <dl>
            <dt>Customer</dt>
            <dd>{record.ownerId}</dd>
            <dt>Tài sản</dt>
            <dd>{record.assetReference}</dd>
            <dt>Tên yêu cầu</dt>
            <dd>{record.title}</dd>
            <dt>Mục đích</dt>
            <dd>{record.purpose}</dd>
          </dl>
        </section>
        <aside className="ops-panel governance-opening-concern">
          <h2>Quan ngại nội bộ</h2>
          <p>{record.governanceConcern?.reason}</p>
          <dl>
            <dt>Người ghi nhận</dt>
            <dd>{record.governanceConcern?.recordedBy}</dd>
            <dt>Thời điểm</dt>
            <dd>{record.governanceConcern?.recordedAt}</dd>
            <dt>Tham chiếu bằng chứng</dt>
            <dd>
              {record.governanceConcern?.evidenceReferenceIds.length
                ? record.governanceConcern.evidenceReferenceIds.join(", ")
                : "Không có"}
            </dd>
          </dl>
          <p className="opening-review-disclosure">
            Chưa có hành động quyết định chính thức. BA cần xác nhận thẩm quyền,
            lý do bắt buộc và transition trước khi triển khai Apply Governance
            Hold.
          </p>
        </aside>
      </div>
      <section className="ops-panel opening-review-history">
        <h2>Lịch sử đầy đủ</h2>
        <ol>
          {record.history
            .slice()
            .reverse()
            .map((entry) => (
              <li key={entry.id}>
                <strong>{entry.action.replaceAll("_", " ")}</strong>
                <span>
                  {entry.fromStatus} → {entry.toStatus} · v
                  {entry.requestVersion}
                </span>
                <small>
                  {entry.actorRole} · {entry.actorId} · {entry.visibility}
                </small>
                {entry.reason && <p>{entry.reason}</p>}
              </li>
            ))}
        </ol>
      </section>
      <Link className="button secondary" to="/governance/opening-requests">
        Quay lại danh sách
      </Link>
    </>
  );
}
