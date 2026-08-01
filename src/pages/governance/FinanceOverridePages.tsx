import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  History,
  LockKeyhole,
  PackageCheck,
  Route,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/feedback/States";
import {
  useFinanceOverrideStore,
  type ControlledFinanceAction,
  type FinanceOverrideRequest,
} from "../../store/financeOverrideStore";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/finance-override.css";

const packageContext = {
  packageId: "FIN-PKG-PATEK-5711R-V2",
  targetReference: "SGD-WIN-•••-5711R",
  currentState: "FINAL_WINNER_CONFIRMED",
  expectedVersion: 2,
};

const actionContent: Record<
  ControlledFinanceAction,
  {
    title: string;
    description: string;
    impact: string;
    icon: typeof FileCheck2;
  }
> = {
  RE_REVIEW_FINANCE_PACKAGE: {
    title: "Rà soát lại gói tài chính",
    description:
      "Mở lại bước review của Finance cho đúng package và version hiện tại.",
    impact: "Không thay đổi kết quả đấu giá; chỉ tạo một vòng kiểm tra mới.",
    icon: FileCheck2,
  },
  ROUTE_TO_REMEDIATION: {
    title: "Chuyển sang hồ sơ khắc phục",
    description:
      "Tạo đường dẫn sang remediation sau khi ADMIN phê duyệt yêu cầu.",
    impact: "Không tự động sửa winner, số tiền hoặc Auction Result.",
    icon: Route,
  },
};

const statusLabels = {
  PENDING: "Chờ ADMIN duyệt",
  APPROVED: "Đã phê duyệt",
  REJECTED: "Đã từ chối",
} as const;

export function FinanceOverrideRequestPage() {
  const createRequest = useFinanceOverrideStore((state) => state.createRequest);
  const requests = useFinanceOverrideStore((state) => state.requests);
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [action, setAction] = useState<ControlledFinanceAction>(
    "RE_REVIEW_FINANCE_PACKAGE",
  );
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const evidenceReferences = useMemo(
    () =>
      evidence
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    [evidence],
  );
  const canReview = reason.trim().length >= 20 && evidenceReferences.length > 0;

  const submit = () => {
    const result = createRequest("FINANCE", "finance@sgdg.demo", {
      packageId: packageContext.packageId,
      targetReference: packageContext.targetReference,
      requestedAction: action,
      businessReason: reason,
      evidenceReferences,
      expectedVersion: packageContext.expectedVersion,
    });
    if (result.ok) {
      navigate(`/finance/override-requests/${result.request.overrideId}`);
      return;
    }
    setMessage(`Không thể gửi yêu cầu: ${result.reason}.`);
  };

  return (
    <main className="finance-override-page">
      <header className="finance-override-heading">
        <div>
          <span>FINANCE CONTROLLED REQUEST</span>
          <h1>Yêu cầu ngoại lệ có kiểm soát</h1>
          <p>
            Tạo đề nghị maker-checker cho một action đã được giới hạn, kèm lý do
            và bằng chứng có thể audit.
          </p>
        </div>
        <div className="finance-override-authority">
          <LockKeyhole aria-hidden="true" />
          <span>
            <strong>Finance tạo · ADMIN duyệt</strong>
            Không có quyền tự phê duyệt
          </span>
        </div>
      </header>

      <div className="finance-override-disclosure">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>
            Đây là luồng ngoại lệ, không phải màn hình sửa kết quả
          </strong>
          <span>
            Candidate, thứ hạng, Final Winner, số tiền và Auction Result đều
            không thể chỉnh tại đây.
          </span>
        </div>
      </div>

      <div className="finance-override-layout">
        <Card className="finance-override-wizard">
          <ol
            className="finance-override-steps"
            aria-label="Các bước tạo yêu cầu"
          >
            {[
              [1, "Chọn action"],
              [2, "Lý do & bằng chứng"],
              [3, "Kiểm tra & gửi"],
            ].map(([number, label]) => {
              const value = number as 1 | 2 | 3;
              const completed = value < step;
              return (
                <li
                  key={number}
                  className={[
                    value === step ? "active" : "",
                    completed ? "completed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (value === 1 || (value === 2 && step >= 2))
                        setStep(value);
                      if (value === 3 && canReview) setStep(3);
                    }}
                  >
                    <b>{completed ? <Check aria-hidden="true" /> : number}</b>
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          {step === 1 && (
            <section className="finance-override-step-panel">
              <div className="finance-override-step-heading">
                <span>BƯỚC 1/3</span>
                <h2>Chọn hành động cần ADMIN phê duyệt</h2>
                <p>Chỉ hai action dưới đây được phép đi qua luồng ngoại lệ.</p>
              </div>
              <fieldset className="finance-override-options">
                <legend>Controlled action</legend>
                {(
                  Object.entries(actionContent) as Array<
                    [
                      ControlledFinanceAction,
                      (typeof actionContent)[ControlledFinanceAction],
                    ]
                  >
                ).map(([value, content]) => {
                  const Icon = content.icon;
                  return (
                    <label
                      key={value}
                      className={action === value ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="controlled-action"
                        value={value}
                        checked={action === value}
                        onChange={() => setAction(value)}
                      />
                      <Icon aria-hidden="true" />
                      <span>
                        <strong>{content.title}</strong>
                        {content.description}
                        <small>{content.impact}</small>
                      </span>
                      <i>{action === value && <Check aria-hidden="true" />}</i>
                    </label>
                  );
                })}
              </fieldset>
              <footer className="finance-override-step-actions">
                <span />
                <Button rightIcon={<ArrowRight />} onClick={() => setStep(2)}>
                  Tiếp tục
                </Button>
              </footer>
            </section>
          )}

          {step === 2 && (
            <section className="finance-override-step-panel">
              <div className="finance-override-step-heading">
                <span>BƯỚC 2/3</span>
                <h2>Giải thích ngoại lệ bằng dữ liệu</h2>
                <p>
                  ADMIN cần đủ ngữ cảnh để quyết định mà không phải hỏi lại
                  Finance.
                </p>
              </div>
              <div className="finance-override-fields">
                <label>
                  <span>
                    Lý do nghiệp vụ
                    <small>{reason.trim().length}/500</small>
                  </span>
                  <textarea
                    value={reason}
                    maxLength={500}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Mô tả vấn đề, ảnh hưởng và vì sao flow chuẩn không xử lý được..."
                  />
                  <small>
                    Tối thiểu 20 ký tự; không nhập hướng dẫn thay đổi winner
                    hoặc số tiền.
                  </small>
                </label>
                <label>
                  <span>Reference bằng chứng</span>
                  <textarea
                    className="finance-override-evidence-input"
                    value={evidence}
                    onChange={(event) => setEvidence(event.target.value)}
                    placeholder={"PAY-REV-5711R\nAUD-FIN-2026-0718"}
                  />
                  <small>
                    Phân cách bằng dấu phẩy hoặc xuống dòng. Mỗi reference sẽ
                    được lưu bất biến.
                  </small>
                </label>
              </div>
              {evidenceReferences.length > 0 && (
                <div className="finance-override-evidence-preview">
                  <span>Bằng chứng sẽ đính kèm</span>
                  <div>
                    {evidenceReferences.map((reference) => (
                      <b key={reference}>
                        <FileText aria-hidden="true" /> {reference}
                      </b>
                    ))}
                  </div>
                </div>
              )}
              <footer className="finance-override-step-actions">
                <Button
                  variant="secondary"
                  leftIcon={<ArrowLeft />}
                  onClick={() => setStep(1)}
                >
                  Quay lại
                </Button>
                <Button
                  rightIcon={<ArrowRight />}
                  disabled={!canReview}
                  onClick={() => setStep(3)}
                >
                  Kiểm tra yêu cầu
                </Button>
              </footer>
            </section>
          )}

          {step === 3 && (
            <section className="finance-override-step-panel">
              <div className="finance-override-step-heading">
                <span>BƯỚC 3/3</span>
                <h2>Kiểm tra trước khi gửi</h2>
                <p>
                  Yêu cầu sẽ khóa nội dung và chuyển vào hàng đợi maker-checker
                  của ADMIN.
                </p>
              </div>
              <dl className="finance-override-review">
                <div>
                  <dt>Action yêu cầu</dt>
                  <dd>{actionContent[action].title}</dd>
                </div>
                <div>
                  <dt>Finance package</dt>
                  <dd>{packageContext.packageId}</dd>
                </div>
                <div>
                  <dt>Target</dt>
                  <dd>{packageContext.targetReference}</dd>
                </div>
                <div>
                  <dt>Lý do</dt>
                  <dd>{reason}</dd>
                </div>
                <div>
                  <dt>Evidence ({evidenceReferences.length})</dt>
                  <dd>{evidenceReferences.join(" · ")}</dd>
                </div>
              </dl>
              <label className="finance-override-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  Tôi xác nhận yêu cầu chỉ đề nghị action đã chọn và không yêu
                  cầu sửa Auction Result.
                </span>
              </label>
              {message && (
                <p className="finance-override-error" role="alert">
                  {message}
                </p>
              )}
              <footer className="finance-override-step-actions">
                <Button
                  variant="secondary"
                  leftIcon={<ArrowLeft />}
                  onClick={() => setStep(2)}
                >
                  Chỉnh sửa
                </Button>
                <Button
                  leftIcon={<ShieldCheck />}
                  disabled={!confirmed}
                  onClick={submit}
                >
                  Gửi cho ADMIN duyệt
                </Button>
              </footer>
            </section>
          )}
        </Card>

        <aside className="finance-override-rail">
          <section>
            <span>ĐỐI TƯỢNG ĐANG XỬ LÝ</span>
            <h2>{packageContext.packageId}</h2>
            <dl>
              <div>
                <dt>Target</dt>
                <dd>{packageContext.targetReference}</dd>
              </div>
              <div>
                <dt>Trạng thái hiện tại</dt>
                <dd>{packageContext.currentState}</dd>
              </div>
              <div>
                <dt>Package version</dt>
                <dd>v{packageContext.expectedVersion}</dd>
              </div>
            </dl>
          </section>
          <section className="finance-override-guardrails">
            <span>KIỂM SOÁT ÁP DỤNG</span>
            <ul>
              <li>
                <UserRoundCheck /> Tách người tạo và người duyệt
              </li>
              <li>
                <PackageCheck /> Khóa đúng package version
              </li>
              <li>
                <History /> Lưu lịch sử quyết định bất biến
              </li>
              <li>
                <LockKeyhole /> Không expose trường sửa kết quả
              </li>
            </ul>
          </section>
          <section className="finance-override-recent">
            <span>YÊU CẦU GẦN ĐÂY</span>
            <div>
              {requests
                .slice(-3)
                .reverse()
                .map((request) => (
                  <Link
                    key={request.overrideId}
                    to={`/finance/override-requests/${request.overrideId}`}
                  >
                    <span>
                      <strong>{request.overrideId}</strong>
                      {statusLabels[request.status]}
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

export function FinanceOverrideReadPage() {
  const { overrideId } = useParams();
  const request = useFinanceOverrideStore((state) =>
    state.requests.find((item) => item.overrideId === overrideId),
  );
  if (!request) return <NotFoundPage />;
  return (
    <FinanceOverrideSummary requestId={request.overrideId} reviewer={false} />
  );
}

export function FinanceOverrideQueuePage() {
  const requests = useFinanceOverrideStore((state) => state.requests);
  return (
    <main className="finance-override-page">
      <header className="finance-override-heading">
        <div>
          <span>FINANCE GOVERNANCE</span>
          <h1>Phê duyệt yêu cầu ngoại lệ</h1>
          <p>
            Hàng đợi maker-checker dành cho các action tài chính đã được giới
            hạn phạm vi.
          </p>
        </div>
      </header>
      {!requests.length ? (
        <EmptyState
          title="Chưa có yêu cầu ngoại lệ"
          description="Hàng đợi sẽ hiển thị khi Finance gửi một yêu cầu hợp lệ."
        />
      ) : (
        <>
          <section className="finance-override-queue-summary">
            <div>
              <ClockStatus status="PENDING" />{" "}
              <span>
                <strong>
                  {requests.filter((item) => item.status === "PENDING").length}
                </strong>
                Chờ duyệt
              </span>
            </div>
            <div>
              <ClockStatus status="APPROVED" />{" "}
              <span>
                <strong>
                  {requests.filter((item) => item.status === "APPROVED").length}
                </strong>
                Đã duyệt
              </span>
            </div>
            <div>
              <ClockStatus status="REJECTED" />{" "}
              <span>
                <strong>
                  {requests.filter((item) => item.status === "REJECTED").length}
                </strong>
                Đã từ chối
              </span>
            </div>
          </section>
          <section className="finance-override-list">
            {requests.map((request) => (
              <Card key={request.overrideId}>
                <div>
                  <Badge
                    tone={
                      request.status === "APPROVED"
                        ? "success"
                        : request.status === "REJECTED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {statusLabels[request.status]}
                  </Badge>
                  <small>v{request.version}</small>
                </div>
                <h2>{request.overrideId}</h2>
                <p>{actionContent[request.requestedAction].title}</p>
                <dl>
                  <div>
                    <dt>Package</dt>
                    <dd>{request.packageId}</dd>
                  </div>
                  <div>
                    <dt>Người tạo</dt>
                    <dd>{request.requesterId}</dd>
                  </div>
                </dl>
                <Link
                  className="button secondary"
                  to={`/governance/finance-overrides/${request.overrideId}`}
                >
                  Mở yêu cầu <ArrowRight aria-hidden="true" />
                </Link>
              </Card>
            ))}
          </section>
        </>
      )}
    </main>
  );
}

function ClockStatus({ status }: { status: FinanceOverrideRequest["status"] }) {
  if (status === "APPROVED") return <CheckCircle2 aria-hidden="true" />;
  if (status === "REJECTED") return <XCircle aria-hidden="true" />;
  return <History aria-hidden="true" />;
}

export function FinanceOverrideDetailPage() {
  const { overrideId } = useParams();
  const exists = useFinanceOverrideStore((state) =>
    state.requests.some((item) => item.overrideId === overrideId),
  );
  if (!exists || !overrideId) return <NotFoundPage />;
  return <FinanceOverrideSummary requestId={overrideId} reviewer />;
}

function FinanceOverrideSummary({
  requestId,
  reviewer,
}: {
  requestId: string;
  reviewer: boolean;
}) {
  const request = useFinanceOverrideStore((state) =>
    state.requests.find((item) => item.overrideId === requestId),
  )!;
  const decide = useFinanceOverrideStore((state) => state.decide);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const action = actionContent[request.requestedAction];
  const act = (decision: "APPROVE" | "REJECT") => {
    const result = decide(
      request.overrideId,
      "ADMIN",
      "admin@sgdg.demo",
      request.version,
      decision,
      reason,
    );
    setMessage(
      result.ok
        ? "Quyết định đã được ghi vào lịch sử; Auction Result không bị chỉnh sửa."
        : `Không thể quyết định: ${result.reason}.`,
    );
  };

  return (
    <main className="finance-override-page">
      <Link
        className="finance-override-back"
        to={
          reviewer
            ? "/governance/finance-overrides"
            : "/finance/override-requests/new"
        }
      >
        <ArrowLeft aria-hidden="true" />
        {reviewer ? "Về hàng đợi phê duyệt" : "Về trang tạo yêu cầu"}
      </Link>
      <header className="finance-override-heading">
        <div>
          <span>CONTROLLED FINANCE EXCEPTION</span>
          <h1>{request.overrideId}</h1>
          <p>
            {action.title} · {request.packageId}
          </p>
        </div>
        <Badge
          tone={
            request.status === "APPROVED"
              ? "success"
              : request.status === "REJECTED"
                ? "danger"
                : "warning"
          }
        >
          {statusLabels[request.status]}
        </Badge>
      </header>

      <div className="finance-override-summary-layout">
        <Card className="finance-override-summary">
          <div className="finance-override-impact">
            <ShieldCheck aria-hidden="true" />
            <span>
              <strong>Impact được phép</strong>
              {action.impact}
            </span>
          </div>
          <h2>Thông tin yêu cầu</h2>
          <dl>
            <div>
              <dt>Controlled action</dt>
              <dd>{action.title}</dd>
            </div>
            <div>
              <dt>Package</dt>
              <dd>{request.packageId}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>{request.targetReference}</dd>
            </div>
            <div>
              <dt>Trạng thái authoritative</dt>
              <dd>{request.currentAuthoritativeState}</dd>
            </div>
            <div>
              <dt>Người yêu cầu</dt>
              <dd>{request.requesterId}</dd>
            </div>
            <div>
              <dt>Expected package version</dt>
              <dd>v{request.expectedVersion}</dd>
            </div>
          </dl>
          <h3>Lý do nghiệp vụ</h3>
          <p>{request.businessReason}</p>
          <h3>Evidence bất biến</h3>
          <ul className="finance-override-evidence-list">
            {request.evidenceReferences.map((item) => (
              <li key={item}>
                <FileText aria-hidden="true" /> {item}
              </li>
            ))}
          </ul>
          {request.status === "APPROVED" &&
            request.requestedAction === "ROUTE_TO_REMEDIATION" && (
              <Link
                className="button primary"
                to="/governance/remediation/REM-PATEK-REVERSAL-001"
              >
                Mở hồ sơ remediation
              </Link>
            )}
        </Card>

        <Card className="finance-override-decision">
          <span>MAKER-CHECKER</span>
          <h2>{reviewer ? "Quyết định của ADMIN" : "Trạng thái phê duyệt"}</h2>
          {reviewer && request.status === "PENDING" ? (
            <>
              <div className="finance-override-reviewer">
                <UserRoundCheck aria-hidden="true" />
                <span>
                  <strong>Reviewer độc lập</strong>
                  admin@sgdg.demo
                </span>
              </div>
              <label>
                Lý do quyết định
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Nêu căn cứ chấp thuận hoặc từ chối..."
                />
              </label>
              <div className="finance-override-actions">
                <Button
                  onClick={() => act("APPROVE")}
                  disabled={!reason.trim()}
                >
                  Phê duyệt action
                </Button>
                <Button
                  variant="danger"
                  onClick={() => act("REJECT")}
                  disabled={!reason.trim()}
                >
                  Từ chối
                </Button>
              </div>
            </>
          ) : !reviewer && request.status === "PENDING" ? (
            <p className="finance-override-waiting">
              <History aria-hidden="true" />
              Đang chờ ADMIN độc lập xem xét. Finance không thể tự duyệt yêu cầu
              này.
            </p>
          ) : (
            <p className="finance-override-result">
              {request.status === "APPROVED" ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <XCircle aria-hidden="true" />
              )}
              <span>
                <strong>{statusLabels[request.status]}</strong>
                {request.decisionReason}
              </span>
            </p>
          )}
          {message && (
            <p role="status" className="finance-override-message">
              {message}
            </p>
          )}
          <h3>Lịch sử bất biến</h3>
          <ol className="finance-override-history">
            {request.history.map((item) => (
              <li key={`${item.at}-${item.action}`}>
                <i />
                <span>
                  <strong>{item.action}</strong> · {item.actorId}
                  <small>
                    {item.at}
                    {item.reason ? ` · ${item.reason}` : ""}
                  </small>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </main>
  );
}
