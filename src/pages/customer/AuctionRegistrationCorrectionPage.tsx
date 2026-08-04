import { useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { Dialog } from "../../components/common/Dialog";
import { BlockedState } from "../../components/feedback/States";
import { useAuctionCustomerRegistrationStore } from "../../store/auctionCustomerRegistrationStore";
import {
  PROTOTYPE_REGISTRATION_CORRECTION_MODEL,
  evaluateRegistrationCorrectionEligibility,
  type RegistrationCorrectionCommandResult,
  useAuctionRegistrationCorrectionDraftStore,
} from "../../store/auctionRegistrationCorrectionDraftStore";
import {
  PROTOTYPE_REGISTRATION_RESUBMISSION_POLICY,
  evaluateRegistrationResubmissionEligibility,
  type RegistrationResubmissionCommandResult,
  useAuctionRegistrationResubmissionStore,
} from "../../store/auctionRegistrationResubmissionStore";
import { useAuctionRegistrationRevalidationStore } from "../../store/auctionRegistrationRevalidationStore";
import { useAuctionMembershipCheckStore } from "../../store/auctionMembershipCheckStore";
import { useAuctionDepositCheckStore } from "../../store/auctionDepositCheckStore";
import { useAuctionRegistrationValidationStore } from "../../store/auctionRegistrationValidationStore";
import { useDemoStore } from "../../store/demoStore";
import { CURRENT_CUSTOMER_ID } from "../../store/openingRequestStore";
import "../../styles/auction-schedule-confirmation.css";
import "../../styles/auction-approval-package.css";

const correctionError = (
  result: Extract<RegistrationCorrectionCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

const resubmissionError = (
  result: Extract<RegistrationResubmissionCommandResult, { ok: false }>,
) => `${result.code}: ${result.message}`;

export function AuctionRegistrationCorrectionPage() {
  const { sessionId = "" } = useParams();
  const actorRole = useDemoStore((state) => state.actorRole);
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
  const correctionDraft = useAuctionRegistrationCorrectionDraftStore(
    (state) =>
      state.correctionDrafts.find(
        (item) =>
          item.registrationId === registration?.registrationId &&
          item.customerId === CURRENT_CUSTOMER_ID,
      ),
  );
  const resubmission = useAuctionRegistrationResubmissionStore((state) =>
    state.resubmissions.find(
      (item) =>
        item.registrationId === registration?.registrationId &&
        item.customerId === CURRENT_CUSTOMER_ID,
    ),
  );
  const revalidation = useAuctionRegistrationRevalidationStore((state) =>
    state.revalidations.find(
      (item) =>
        item.resubmissionId === resubmission?.resubmissionId &&
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
  const createDraft = useAuctionRegistrationCorrectionDraftStore(
    (state) => state.createRegistrationCorrectionDraft,
  );
  const saveDraft = useAuctionRegistrationCorrectionDraftStore(
    (state) => state.saveRegistrationCorrectionDraft,
  );
  const resubmitCorrectedRegistration =
    useAuctionRegistrationResubmissionStore(
      (state) => state.resubmitCorrectedRegistration,
    );
  const [rulesAccepted, setRulesAccepted] = useState(
    correctionDraft?.rulesAccepted ?? registration?.rulesAccepted ?? false,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  if (actorRole !== "CUSTOMER")
    return (
      <main className="schedule-confirmation-page">
        <h1>Bản nháp chỉnh sửa đăng ký</h1>
        <BlockedState
          title="Không có quyền truy cập"
          description="Chỉ khách hàng sở hữu hồ sơ mới được chỉnh sửa đăng ký này."
        />
      </main>
    );

  if (!registration || !validation)
    return (
      <main className="schedule-confirmation-page">
        <h1>Bản nháp chỉnh sửa đăng ký</h1>
        <BlockedState
          title="Chưa thể chỉnh sửa đăng ký"
          description="Cần có hồ sơ đăng ký đã gửi và kết quả kiểm tra tương ứng."
        />
      </main>
    );

  const correctionEligibility =
    evaluateRegistrationCorrectionEligibility({
      registrationId: registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedRegistrationVersion: registration.registrationVersion,
      expectedValidationId: validation.validationId,
      commandId: `CHECK_REGISTRATION_CORRECTION:${registration.registrationId}`,
    });

  const resubmissionEligibility = correctionDraft
    ? evaluateRegistrationResubmissionEligibility({
        registrationId: registration.registrationId,
        actorId: CURRENT_CUSTOMER_ID,
        actorRole,
        expectedRegistrationVersion: registration.registrationVersion,
        expectedValidationId: validation.validationId,
        expectedCorrectionDraftId: correctionDraft.correctionDraftId,
        expectedCorrectionDraftVersion:
          correctionDraft.correctionVersion,
        commandId: `CHECK_REGISTRATION_RESUBMISSION:${registration.registrationId}`,
      })
    : undefined;

  const create = () => {
    setError("");
    setMessage("");
    const result = createDraft({
      registrationId: registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedRegistrationVersion: registration.registrationVersion,
      expectedValidationId: validation.validationId,
      commandId: `CREATE_REGISTRATION_CORRECTION:${registration.registrationId}:v${registration.registrationVersion}`,
    });
    if (!result.ok) return setError(correctionError(result));
    setRulesAccepted(result.correctionDraft.rulesAccepted);
    setMessage("Đã tạo bản nháp chỉnh sửa.");
  };

  const save = () => {
    if (!correctionDraft || resubmission) return;
    setError("");
    setMessage("");
    const result = saveDraft({
      correctionDraftId: correctionDraft.correctionDraftId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedCorrectionVersion: correctionDraft.correctionVersion,
      rulesAccepted,
      commandId: `SAVE_REGISTRATION_CORRECTION:${correctionDraft.correctionDraftId}:v${correctionDraft.correctionVersion}:${rulesAccepted}`,
    });
    if (!result.ok) return setError(correctionError(result));
    setMessage(
      result.changed
        ? "Đã lưu bản nháp chỉnh sửa."
        : "Bản nháp chỉnh sửa không có thay đổi.",
    );
  };

  const resubmit = () => {
    if (!correctionDraft) return;
    setError("");
    setMessage("");
    const result = resubmitCorrectedRegistration({
      registrationId: registration.registrationId,
      actorId: CURRENT_CUSTOMER_ID,
      actorRole,
      expectedRegistrationVersion: registration.registrationVersion,
      expectedValidationId: validation.validationId,
      expectedCorrectionDraftId: correctionDraft.correctionDraftId,
      expectedCorrectionDraftVersion:
        correctionDraft.correctionVersion,
      commandId: `RESUBMIT_CORRECTED_REGISTRATION:${registration.registrationId}:draft-v${correctionDraft.correctionVersion}`,
    });
    if (!result.ok) return setError(resubmissionError(result));
    setConfirmationOpen(false);
    setMessage(
      result.created
        ? "Đã gửi lại đăng ký sau chỉnh sửa."
        : "Lần gửi lại này đã được ghi nhận trước đó.",
    );
  };

  return (
    <main className="schedule-confirmation-page">
      <header className="approval-package-heading">
        <span>KHÁCH HÀNG · CHỈNH SỬA VÀ GỬI LẠI ĐĂNG KÝ</span>
        <h1>Bản nháp chỉnh sửa đăng ký</h1>
        <p>{PROTOTYPE_REGISTRATION_CORRECTION_MODEL}</p>
      </header>

      <section
        className="approval-package-card"
        aria-labelledby="correction-source"
      >
        <div className="schedule-confirmation-title">
          <h2 id="correction-source">Thông tin gốc chỉ đọc</h2>
          <Badge tone="warning">CẦN CHỈNH SỬA</Badge>
        </div>
        <dl className="schedule-confirmation-evidence">
          <dt>Mã / phiên bản đăng ký gốc</dt>
          <dd>
            {registration.registrationId} / v
            {registration.registrationVersion}
          </dd>
          <dt>Trạng thái đăng ký gốc</dt>
          <dd>{registration.status}</dd>
          <dt>Kết quả kiểm tra</dt>
          <dd>
            {validation.outcome} / {validation.correctability} /{" "}
            {validation.nextStep}
          </dd>
          <dt>Mã kết quả kiểm tra</dt>
          <dd>{validation.validationId}</dd>
          <dt>Mã khách hàng</dt>
          <dd>{CURRENT_CUSTOMER_ID}</dd>
          <dt>Trạng thái / phiên bản bản nháp chỉnh sửa</dt>
          <dd>
            {correctionDraft
              ? `${correctionDraft.status} / v${correctionDraft.correctionVersion}`
              : "NOT CREATED"}
          </dd>
        </dl>
        <h3>Nội dung có thể chỉnh sửa</h3>
        <ul>
          {validation.findings.map((item) => (
            <li key={item.code}>
              <strong>{item.code}</strong>: {item.message}
            </li>
          ))}
        </ul>
      </section>

      {!correctionDraft && !correctionEligibility.eligible && (
        <section className="approval-package-card">
          <h2>Chưa thể chỉnh sửa</h2>
          <p role="alert">
            {correctionEligibility.code}: {correctionEligibility.message}
          </p>
        </section>
      )}

      {!correctionDraft && correctionEligibility.eligible && (
        <section className="approval-package-card">
          <h2>Tạo bản nháp chỉnh sửa</h2>
          <Button onClick={create}>Tạo bản nháp chỉnh sửa</Button>
        </section>
      )}

      {correctionDraft && (
        <section className="approval-package-card">
          <h2>Nội dung được phép chỉnh sửa</h2>
          <label>
            <input
              type="checkbox"
              checked={rulesAccepted}
              disabled={Boolean(resubmission)}
              onChange={(event) => setRulesAccepted(event.target.checked)}
            />{" "}
            Tôi đã đọc và đồng ý với quy tắc đấu giá
          </label>
          {!resubmission && (
            <div className="approval-package-actions">
              <Button onClick={save}>Lưu bản nháp chỉnh sửa</Button>
            </div>
          )}
        </section>
      )}

      {correctionDraft &&
        !resubmission &&
        resubmissionEligibility?.eligible && (
          <section className="approval-package-card">
            <h2>Gửi lại đăng ký đã chỉnh sửa</h2>
            <p>Bản nháp chỉnh sửa: {correctionDraft.status}</p>
            <p>Gửi lại: CHƯA BẮT ĐẦU</p>
            <Button onClick={() => setConfirmationOpen(true)}>
              Gửi lại đăng ký
            </Button>
          </section>
        )}

      {correctionDraft &&
        !resubmission &&
        resubmissionEligibility &&
        !resubmissionEligibility.eligible &&
        correctionDraft.rulesAccepted && (
          <p role="alert">
            {resubmissionEligibility.code}:{" "}
            {resubmissionEligibility.message}
          </p>
        )}

      {resubmission && (
        <section className="approval-package-card">
          <h2>Kết quả gửi lại đăng ký</h2>
          <dl className="schedule-confirmation-evidence">
            <dt>Đăng ký gốc</dt>
            <dd>{registration.status}</dd>
            <dt>Kết quả kiểm tra trước đó</dt>
            <dd>{validation.nextStep}</dd>
            <dt>Bản nháp chỉnh sửa</dt>
            <dd>{correctionDraft?.status ?? "NOT CREATED"}</dd>
            <dt>Đăng ký gửi lại</dt>
            <dd>{resubmission.status}</dd>
            <dt>Bước tiếp theo</dt>
            <dd>{resubmission.nextStep}</dd>
            <dt>Hạng thành viên</dt>
            <dd>NOT CHECKED</dd>
            <dt>Tiền cọc</dt>
            <dd>NOT CHECKED</dd>
            <dt>Điều kiện tham gia</dt>
            <dd>NOT EVALUATED</dd>
          </dl>
        </section>
      )}

      {revalidation && (
        <section className="approval-package-card">
          <h2>Kết quả kiểm tra lại đăng ký</h2>
          <dl className="schedule-confirmation-evidence">
            <dt>Kết quả kiểm tra lại</dt>
            <dd>{revalidation.outcome}</dd>
            <dt>Bước tiếp theo</dt>
            <dd>{revalidation.nextStep}</dd>
            <dt>Trạng thái hiển thị</dt>
            <dd>
              {revalidation.nextStep === "READY_FOR_MEMBERSHIP_CHECK"
                ? "Sẵn sàng kiểm tra hạng thành viên"
                : revalidation.nextStep === "CORRECTION_REQUIRED_AGAIN"
                  ? "Cần chỉnh sửa lại"
                  : "Đã dừng xử lý"}
            </dd>
          </dl>
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

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      <section className="approval-package-card">
        <h2>Phạm vi chỉnh sửa</h2>
        {!resubmission && <p>Thao tác này chỉ lưu bản nháp chỉnh sửa.</p>}
        <p>Hồ sơ đăng ký đã gửi ban đầu vẫn được giữ nguyên.</p>
        {!resubmission && <p>Quá trình gửi lại chưa bắt đầu.</p>}
        <p>Chưa bắt đầu xử lý hạng thành viên, tiền cọc và điều kiện tham gia.</p>
      </section>

      <Dialog
        open={confirmationOpen}
        onOpenChange={setConfirmationOpen}
        title="Xác nhận gửi lại đăng ký đã chỉnh sửa"
        description={PROTOTYPE_REGISTRATION_RESUBMISSION_POLICY}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmationOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={resubmit}>
              Xác nhận gửi lại
            </Button>
          </>
        }
      >
        <dl className="schedule-confirmation-evidence">
          <dt>Mã / phiên bản đăng ký gốc</dt>
          <dd>
            {registration.registrationId} / v
            {registration.registrationVersion}
          </dd>
          <dt>Mã kết quả kiểm tra trước đó</dt>
          <dd>{validation.validationId}</dd>
          <dt>Mã / phiên bản bản nháp chỉnh sửa</dt>
          <dd>
            {correctionDraft?.correctionDraftId ?? "NOT CREATED"} / v
            {correctionDraft?.correctionVersion ?? 0}
          </dd>
          <dt>Xác nhận quy tắc sau chỉnh sửa</dt>
          <dd>
            {correctionDraft?.rulesAccepted ? "ACCEPTED" : "NOT ACCEPTED"}
          </dd>
          <dt>Mã khách hàng</dt>
          <dd>{CURRENT_CUSTOMER_ID}</dd>
        </dl>
        <p>Thao tác này tạo bản ghi gửi lại đăng ký đã chỉnh sửa.</p>
        <p>
          Đăng ký gốc và kết quả kiểm tra trước đó vẫn được giữ nguyên.
        </p>
        <p>Thao tác này chưa khởi chạy kiểm tra hạng thành viên, tiền cọc và điều kiện tham gia.</p>
      </Dialog>
    </main>
  );
}
