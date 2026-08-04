import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button, ButtonLink } from "../../components/common/Button";
import { Badge } from "../../components/common/Badge";
import { BlockedState } from "../../components/feedback/States";
import {
  PROTOTYPE_CUSTOMER_REGISTRATION_MODEL,
  evaluateCustomerRegistrationEligibility,
  type CustomerRegistrationCommandResult,
  useAuctionCustomerRegistrationStore,
} from "../../store/auctionCustomerRegistrationStore";
import { useAuctionContentStore } from "../../store/auctionContentStore";
import { getRegistrationReadinessDeterministicNow } from "../../store/auctionRegistrationOpeningReadinessStore";
import { useAuctionRegistrationWindowStore } from "../../store/auctionRegistrationWindowStore";
import { useAuctionRegistrationValidationStore } from "../../store/auctionRegistrationValidationStore";
import { useAuctionMembershipCheckStore } from "../../store/auctionMembershipCheckStore";
import { useAuctionDepositCheckStore } from "../../store/auctionDepositCheckStore";
import { useAuctionSessionStore } from "../../store/auctionSessionStore";
import { useDemoStore } from "../../store/demoStore";
import { CURRENT_CUSTOMER_ID } from "../../store/openingRequestStore";
import "../../styles/auction-schedule-confirmation.css";
import "../../styles/auction-approval-package.css";

const commandError = (
  result: Extract<CustomerRegistrationCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

export function AuctionCustomerRegistrationPage() {
  const { sessionId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
  const session = useAuctionSessionStore((state) =>
    state.sessions.find((item) => item.sessionId === sessionId),
  );
  const content = useAuctionContentStore((state) =>
    state.contents.find((item) => item.sessionId === sessionId),
  );
  const registrationWindow = useAuctionRegistrationWindowStore((state) =>
    state.registrationWindows.find((item) => item.sessionId === sessionId),
  );
  const registration = useAuctionCustomerRegistrationStore((state) =>
    state.registrations.find(
      (item) =>
        item.sessionId === sessionId &&
        item.customerId === CURRENT_CUSTOMER_ID,
    ),
  );
  const validation = useAuctionRegistrationValidationStore((state) =>
    state.validations.find(
      (item) =>
        item.registrationId === registration?.registrationId &&
        item.customerId === CURRENT_CUSTOMER_ID,
    ),
  );
  const membershipCheck = useAuctionMembershipCheckStore((state) =>
    state.membershipChecks.find(
      (item) =>
        item.registrationId === registration?.registrationId &&
        item.customerId === CURRENT_CUSTOMER_ID,
    ),
  );
  const depositCheck = useAuctionDepositCheckStore((state) =>
    state.depositChecks.find(
      (item) =>
        item.registrationId === registration?.registrationId &&
        item.customerId === CURRENT_CUSTOMER_ID,
    ),
  );
  const createDraft = useAuctionCustomerRegistrationStore(
    (state) => state.createRegistrationDraft,
  );
  const saveDraft = useAuctionCustomerRegistrationStore(
    (state) => state.saveRegistrationDraft,
  );
  const submit = useAuctionCustomerRegistrationStore(
    (state) => state.submitRegistration,
  );
  const [rulesAccepted, setRulesAccepted] = useState(
    registration?.rulesAccepted ?? false,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (actorRole !== "CUSTOMER")
    return (
      <main className="schedule-confirmation-page">
        <h1>Đăng ký tham gia đấu giá</h1>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ khách hàng đã đăng nhập mới được truy cập chức năng đăng ký tham gia."
        />
      </main>
    );

  if (!session)
    return (
      <main className="schedule-confirmation-page">
        <h1>Đăng ký tham gia đấu giá</h1>
        <BlockedState
          title="Không tìm thấy phiên đấu giá"
          description="Phiên đấu giá được yêu cầu không tồn tại hoặc không còn khả dụng."
        />
      </main>
    );

  const now = getRegistrationReadinessDeterministicNow();
  const eligibility =
    registrationWindow &&
    evaluateCustomerRegistrationEligibility({
      sessionId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedSessionVersion: session.currentVersion,
      expectedRegistrationWindowId:
        registrationWindow.registrationWindowId,
      commandId: `CHECK_CUSTOMER_REGISTRATION:${sessionId}:${now}`,
    });

  const create = () => {
    if (!registrationWindow) return;
    setError("");
    setMessage("");
    const result = createDraft({
      sessionId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedSessionVersion: session.currentVersion,
      expectedRegistrationWindowId:
        registrationWindow.registrationWindowId,
      commandId: `CREATE_CUSTOMER_REGISTRATION:${sessionId}:${CURRENT_CUSTOMER_ID}`,
    });
    if (!result.ok) return setError(commandError(result));
    setMessage("Đã tạo bản nháp đăng ký.");
  };

  const save = () => {
    if (!registration) return;
    setError("");
    setMessage("");
    const result = saveDraft({
      registrationId: registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedRegistrationVersion: registration.registrationVersion,
      rulesAccepted,
      commandId: `SAVE_CUSTOMER_REGISTRATION:${registration.registrationId}:v${registration.registrationVersion}:${rulesAccepted}`,
    });
    if (!result.ok) return setError(commandError(result));
    setMessage(
      result.changed ? "Đã lưu bản nháp đăng ký." : "Bản nháp không có thay đổi.",
    );
  };

  const submitRegistration = () => {
    if (!registration || !registrationWindow) return;
    setError("");
    setMessage("");
    const result = submit({
      registrationId: registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedRegistrationVersion: registration.registrationVersion,
      expectedRegistrationWindowId:
        registrationWindow.registrationWindowId,
      commandId: `SUBMIT_CUSTOMER_REGISTRATION:${registration.registrationId}:v${registration.registrationVersion}`,
    });
    if (!result.ok) return setError(commandError(result));
    setMessage("Đã gửi đăng ký tham gia.");
  };

  return (
    <main className="schedule-confirmation-page">
      <header className="approval-package-heading">
        <span>KHU VỰC ĐĂNG KÝ DÀNH CHO KHÁCH HÀNG</span>
        <h1>Đăng ký tham gia đấu giá</h1>
        <p>{PROTOTYPE_CUSTOMER_REGISTRATION_MODEL}</p>
      </header>

      <section className="approval-package-card" aria-labelledby="session-data">
        <h2 id="session-data">Thông tin phiên đấu giá</h2>
        <dl className="schedule-confirmation-evidence">
          <dt>Mã phiên</dt>
          <dd>{session.sessionId}</dd>
          <dt>Tên phiên đấu giá</dt>
          <dd>{content?.workingContent.auctionTitle || "Chưa có thông tin"}</dd>
          <dt>Hạn đăng ký</dt>
          <dd>
            {registrationWindow?.window.registrationCloseAt ??
              "Chưa mở thời gian đăng ký"}
          </dd>
          <dt>Mã khách hàng</dt>
          <dd>{CURRENT_CUSTOMER_ID}</dd>
          <dt>Trạng thái / phiên bản đăng ký</dt>
          <dd>
            {registration
              ? `${registration.status} / v${registration.registrationVersion}`
              : "NONE"}
          </dd>
          {registration?.submittedAt && (
            <>
              <dt>Thời điểm gửi</dt>
              <dd>{registration.submittedAt}</dd>
            </>
          )}
          {registration?.status === "SUBMITTED" && (
            <>
              <dt>Kết quả kiểm tra đăng ký</dt>
              <dd>
                {!validation
                  ? "VALIDATION_NOT_STARTED"
                  : validation.nextStep}
              </dd>
            </>
          )}
        </dl>
      </section>

      {!registration && (
        <section className="approval-package-card">
          <h2>Tạo bản nháp đăng ký</h2>
          {!registrationWindow ? (
            <p role="alert">CUSTOMER_REGISTRATION_WINDOW_NOT_OPEN: Registration Window chưa được mở.</p>
          ) : eligibility && !eligibility.eligible ? (
            <p role="alert">{eligibility.code}: {eligibility.message}</p>
          ) : (
            <Button onClick={create}>Tạo bản nháp đăng ký</Button>
          )}
        </section>
      )}

      {registration && (
        <section className="approval-package-card">
          <div className="schedule-confirmation-title">
            <h2>Xác nhận quy tắc đấu giá</h2>
            <Badge
              tone={registration.status === "SUBMITTED" ? "success" : "warning"}
            >
              {registration.status}
            </Badge>
          </div>
          <label>
            <input
              type="checkbox"
              checked={rulesAccepted}
              disabled={registration.status === "SUBMITTED"}
              onChange={(event) => setRulesAccepted(event.target.checked)}
            />{" "}
            Tôi đã đọc và đồng ý với quy tắc đấu giá
          </label>
          {registration.status === "DRAFT" && (
            <div className="approval-package-actions">
              <Button variant="secondary" onClick={save}>
                Lưu bản nháp
              </Button>
              <Button
                onClick={submitRegistration}
                disabled={!rulesAccepted || !registration.rulesAccepted}
              >
                Gửi đăng ký
              </Button>
            </div>
          )}
        </section>
      )}

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      {validation?.nextStep === "CORRECTION_REQUIRED" && (
        <section className="approval-package-card">
          <h2>Đăng ký cần được chỉnh sửa</h2>
          <p>
            Kết quả kiểm tra yêu cầu khách hàng tạo bản nháp chỉnh sửa. Hồ sơ
            đăng ký đã gửi ban đầu được giữ nguyên để đối chiếu.
          </p>
          <ButtonLink
            to={`/customer/auctions/${sessionId}/registration/correction`}
          >
            Mở bản chỉnh sửa đăng ký
          </ButtonLink>
        </section>
      )}

      {membershipCheck && (
        <section className="approval-package-card">
          <h2>Kết quả kiểm tra hạng thành viên</h2>
          <dl className="schedule-confirmation-evidence">
            <dt>Kết quả</dt>
            <dd>{membershipCheck.outcome}</dd>
            <dt>Bước tiếp theo</dt>
            <dd>{membershipCheck.nextStep}</dd>
            <dt>Trạng thái hiển thị</dt>
            <dd>
              {membershipCheck.nextStep === "READY_FOR_DEPOSIT_CHECK"
                ? "Sẵn sàng kiểm tra tiền cọc"
                : membershipCheck.nextStep === "MEMBERSHIP_INELIGIBLE"
                  ? "Hạng thành viên chưa đủ điều kiện"
                  : "Cần xem xét hạng thành viên"}
            </dd>
          </dl>
        </section>
      )}

      {depositCheck && (
        <section className="approval-package-card">
          <h2>Kết quả kiểm tra tiền cọc</h2>
          <dl className="schedule-confirmation-evidence">
            <dt>Kết quả</dt>
            <dd>{depositCheck.outcome}</dd>
            <dt>Bước tiếp theo</dt>
            <dd>{depositCheck.nextStep}</dd>
            <dt>Trạng thái hiển thị</dt>
            <dd>
              {depositCheck.nextStep ===
              "READY_FOR_ELIGIBILITY_EVALUATION"
                ? "Sẵn sàng đánh giá điều kiện tham gia"
                : depositCheck.nextStep === "DEPOSIT_NOT_SATISFIED"
                  ? "Tiền cọc chưa đáp ứng"
                  : "Cần xem xét tiền cọc"}
            </dd>
          </dl>
        </section>
      )}

      <section className="approval-package-card">
        <h2>Lưu ý khi gửi đăng ký</h2>
        <p>Gửi đăng ký không đồng nghĩa khách hàng đã đủ điều kiện tham gia.</p>
        {registration?.status === "SUBMITTED" && (
          <p>
            Validation projection:{" "}
            {!validation
              ? "VALIDATION_NOT_STARTED"
              : validation.nextStep}
            .
          </p>
        )}
        {membershipCheck ? (
          <>
            <p>Hạng thành viên: {membershipCheck.outcome}.</p>
            <p>
              Tiền cọc: {depositCheck ? depositCheck.outcome : "CHƯA KIỂM TRA"}.
              Điều kiện tham gia: CHƯA ĐÁNH GIÁ.
            </p>
          </>
        ) : (
          <p>Chưa bắt đầu kiểm tra hạng thành viên, tiền cọc và điều kiện tham gia.</p>
        )}
        <p>Thao tác này không tự động công khai phiên đấu giá.</p>
      </section>
    </main>
  );
}
