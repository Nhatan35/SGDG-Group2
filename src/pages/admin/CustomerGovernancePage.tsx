import {
  Eye,
  FileCheck2,
  LockKeyhole,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../../components/common/Badge";
import { demoStaffNames } from "../../config/staffRoles";
import {
  type EkycStatus,
  useCustomerGovernanceStore,
} from "../../store/customerGovernanceStore";
import { useDemoStore } from "../../store/demoStore";

const ekycLabel: Record<EkycStatus, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  PROCESSING: "Đang xác minh tự động",
  VERIFIED: "Đã xác minh",
  NEEDS_ADDITIONAL_INFO: "Cần bổ sung",
  EXCEPTION_REVIEW: "Chờ thẩm định ngoại lệ",
  REJECTED: "Đã từ chối",
};

type DialogState =
  | { mode: "VIEW"; accountId: string }
  | { mode: "EKYC"; accountId: string }
  | { mode: "ACCESS"; accountId: string };

export function CustomerGovernancePage() {
  const accounts = useCustomerGovernanceStore((state) => state.accounts);
  const decideEkyc = useCustomerGovernanceStore(
    (state) => state.decideEkycException,
  );
  const changeAccess = useCustomerGovernanceStore(
    (state) => state.changeAccountAccess,
  );
  const staffEmail = useDemoStore((state) => state.staffEmail);
  const actor = demoStaffNames[staffEmail] ?? staffEmail;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<
    "VERIFY" | "REQUEST_INFO" | "REJECT"
  >("VERIFY");

  const rows = useMemo(
    () =>
      accounts.filter((account) => {
        const keyword = query.trim().toLowerCase();
        return (
          (filter === "ALL" ||
            account.accountStatus === filter ||
            account.ekycStatus === filter) &&
          (!keyword ||
            `${account.name} ${account.id} ${account.email} ${account.phone}`
              .toLowerCase()
              .includes(keyword))
        );
      }),
    [accounts, filter, query],
  );
  const selected = accounts.find(
    (account) => account.id === dialog?.accountId,
  );
  const close = () => {
    setDialog(null);
    setReason("");
    setDecision("VERIFY");
  };
  const confirm = () => {
    if (!selected || !reason.trim() || !dialog) return;
    if (dialog.mode === "EKYC") {
      decideEkyc(selected.id, decision, actor, reason);
    }
    if (dialog.mode === "ACCESS") {
      changeAccess(
        selected.id,
        selected.accountStatus === "LOCKED" ? "ACTIVE" : "LOCKED",
        actor,
        reason,
      );
    }
    close();
  };

  return (
    <>
      <header className="admin-heading">
        <div>
          <span>QUẢN TRỊ CUSTOMER</span>
          <h1>Tài khoản Customer & ngoại lệ eKYC</h1>
          <p>
            Theo dõi trạng thái tài khoản, kết quả VNeID và chỉ thẩm định những
            trường hợp hệ thống không thể kết luận tự động.
          </p>
        </div>
        <Badge tone="warning">
          {accounts.filter((item) => item.ekycStatus === "EXCEPTION_REVIEW").length}{" "}
          ngoại lệ chờ xử lý
        </Badge>
      </header>
      <div className="ar-boundary">
        <ShieldAlert />
        <div>
          <strong>Phân tách trạng thái</strong>
          <p>
            Trạng thái tài khoản và trạng thái eKYC độc lập. Duyệt ngoại lệ
            không tự động khóa hoặc mở tài khoản Customer.
          </p>
        </div>
      </div>
      <section className="admin-management-shell account-management-shell">
        <div className="management-toolbar">
          <label className="management-search">
            <Search />
            <input
              aria-label="Tìm kiếm Customer"
              placeholder="Tìm theo tên, mã, email hoặc số điện thoại"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            className="management-filter-select"
            aria-label="Lọc tài khoản và eKYC"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="EXCEPTION_REVIEW">Ngoại lệ chờ thẩm định</option>
            <option value="NEEDS_ADDITIONAL_INFO">Cần bổ sung</option>
            <option value="VERIFIED">Đã xác minh</option>
            <option value="REJECTED">Đã từ chối eKYC</option>
            <option value="LOCKED">Tài khoản bị khóa</option>
          </select>
        </div>
        <div className="management-table-wrap">
          <table className="management-table account-management-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Liên hệ đã ẩn</th>
                <th>Tài khoản</th>
                <th>eKYC</th>
                <th>Nguồn / Face Match</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((account) => (
                <tr key={account.id}>
                  <td>
                    <strong>{account.name}</strong>
                    <small>{account.id} · {account.customerType}</small>
                  </td>
                  <td>
                    {account.email}
                    <small>{account.phone}</small>
                  </td>
                  <td>
                    <Badge
                      tone={
                        account.accountStatus === "ACTIVE" ? "success" : "danger"
                      }
                    >
                      {account.accountStatus === "ACTIVE"
                        ? "Đang hoạt động"
                        : account.accountStatus === "LOCKED"
                          ? "Đã khóa"
                          : "Tạm đình chỉ"}
                    </Badge>
                  </td>
                  <td>
                    <strong>{account.ekycLevel}</strong>
                    <small>{ekycLabel[account.ekycStatus]}</small>
                  </td>
                  <td>
                    {account.verificationSource}
                    <small>
                      {account.faceMatchScore === undefined
                        ? "Chưa có điểm"
                        : `Face Match ${account.faceMatchScore}%`}
                    </small>
                  </td>
                  <td>
                    <div className="management-row-actions">
                      <button
                        aria-label={`Xem ${account.name}`}
                        title="Xem hồ sơ và lịch sử"
                        onClick={() =>
                          setDialog({ mode: "VIEW", accountId: account.id })
                        }
                      >
                        <Eye />
                      </button>
                      <button
                        aria-label={`Thẩm định ngoại lệ ${account.name}`}
                        title={
                          account.ekycStatus === "EXCEPTION_REVIEW"
                            ? "Thẩm định ngoại lệ eKYC"
                            : "Chỉ khả dụng với hồ sơ ngoại lệ"
                        }
                        disabled={account.ekycStatus !== "EXCEPTION_REVIEW"}
                        onClick={() =>
                          setDialog({ mode: "EKYC", accountId: account.id })
                        }
                      >
                        <FileCheck2 />
                      </button>
                      <button
                        aria-label={`${account.accountStatus === "LOCKED" ? "Mở khóa" : "Khóa"} ${account.name}`}
                        title="Quản lý quyền truy cập tài khoản"
                        onClick={() =>
                          setDialog({ mode: "ACCESS", accountId: account.id })
                        }
                      >
                        <LockKeyhole />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="management-empty">Không có Customer phù hợp.</p>
          )}
        </div>
      </section>
      {dialog && selected && (
        <div className="modal-backdrop">
          <section role="dialog" aria-modal="true" className="audit-dialog">
            <ShieldAlert />
            <h2>
              {dialog.mode === "VIEW"
                ? `Hồ sơ ${selected.name}`
                : dialog.mode === "EKYC"
                  ? `Thẩm định ngoại lệ eKYC · ${selected.name}`
                  : `${selected.accountStatus === "LOCKED" ? "Mở khóa" : "Khóa tài khoản"} · ${selected.name}`}
            </h2>
            <p>
              {selected.exceptionReason ??
                "Không có ngoại lệ định danh đang chờ xử lý."}
            </p>
            {dialog.mode === "VIEW" ? (
              <dl className="ar-definition">
                <div><dt>Tài khoản</dt><dd>{selected.accountStatus}</dd></div>
                <div><dt>eKYC</dt><dd>{ekycLabel[selected.ekycStatus]}</dd></div>
                <div><dt>Nguồn</dt><dd>{selected.verificationSource}</dd></div>
                <div><dt>Lịch sử quản trị</dt><dd>{selected.events.length} sự kiện</dd></div>
              </dl>
            ) : (
              <>
                {dialog.mode === "EKYC" && (
                  <label>
                    Quyết định
                    <select
                      value={decision}
                      onChange={(event) =>
                        setDecision(
                          event.target.value as
                            | "VERIFY"
                            | "REQUEST_INFO"
                            | "REJECT",
                        )
                      }
                    >
                      <option value="VERIFY">Xác nhận ngoại lệ hợp lệ</option>
                      <option value="REQUEST_INFO">
                        Yêu cầu bổ sung qua CSKH
                      </option>
                      <option value="REJECT">Từ chối xác minh</option>
                    </select>
                  </label>
                )}
                <label>
                  Lý do bắt buộc
                  <textarea
                    autoFocus
                    rows={4}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
              </>
            )}
            <div>
              <button className="button secondary" onClick={close}>
                {dialog.mode === "VIEW" ? "Đóng" : "Hủy"}
              </button>
              {dialog.mode !== "VIEW" && (
                <button
                  className="button primary"
                  disabled={!reason.trim()}
                  onClick={confirm}
                >
                  Xác nhận quyết định
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
