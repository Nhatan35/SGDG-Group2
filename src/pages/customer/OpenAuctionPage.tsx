import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Crown,
  FileSearch,
  Gavel,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { Badge } from "../../components/common/Badge";
import { getOpenAuctionEligibility } from "../../services/openAuctionEligibility";
import {
  CURRENT_CUSTOMER_ID,
  selectOwnedOpeningRequests,
  useOpeningRequestStore,
} from "../../store/openingRequestStore";
import "../../styles/open-auction.css";

const requestBasePath = "/open-auction/requests";

export function OpenAuctionEligibilityGuard({
  children,
}: {
  children: ReactNode;
}) {
  const eligibility = getOpenAuctionEligibility(CURRENT_CUSTOMER_ID);

  return eligibility.eligible ? (
    <>{children}</>
  ) : (
    <Navigate to="/open-auction" replace state={{ accessDenied: true }} />
  );
}

export function OpenAuctionPage() {
  const records = useOpeningRequestStore((state) => state.records);
  const requestCount = selectOwnedOpeningRequests(
    records,
    CURRENT_CUSTOMER_ID,
  ).length;
  const eligibility = getOpenAuctionEligibility(CURRENT_CUSTOMER_ID);

  return (
    <div className="open-auction-page">
      <section className="open-auction-hero">
        <div className="open-auction-hero__copy">
          <span className="open-auction-eyebrow">
            <Gavel aria-hidden="true" /> MỞ ĐẤU GIÁ CÙNG SGDG
          </span>
          <h1>Đưa tài sản của bạn đến đúng cộng đồng người mua</h1>
          <p>
            Gửi thông tin tài sản để SGDG thẩm định, tư vấn giá và xem xét mở
            phiên đấu giá minh bạch trên nền tảng.
          </p>

          {eligibility.eligible ? (
            <div className="open-auction-actions">
              <Link className="button primary" to={`${requestBasePath}/new`}>
                Tạo yêu cầu mở phiên <ArrowRight aria-hidden="true" />
              </Link>
              <Link className="button secondary" to={requestBasePath}>
                <ClipboardList aria-hidden="true" /> Yêu cầu của tôi
                {requestCount > 0 && <span>{requestCount}</span>}
              </Link>
            </div>
          ) : (
            <div className="open-auction-actions">
              <Link className="button primary" to="/account/membership">
                Xem lộ trình lên hạng Vàng
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>

        <aside
          className={`open-auction-eligibility ${
            eligibility.eligible ? "is-eligible" : "is-locked"
          }`}
          aria-label="Điều kiện mở đấu giá"
        >
          <div className="open-auction-eligibility__top">
            <span className="open-auction-eligibility__icon">
              {eligibility.eligible ? (
                <Crown aria-hidden="true" />
              ) : (
                <LockKeyhole aria-hidden="true" />
              )}
            </span>
            <Badge tone={eligibility.eligible ? "success" : "warning"}>
              {eligibility.eligible ? (
                <>
                  <CheckCircle2 aria-hidden="true" /> Đủ điều kiện
                </>
              ) : (
                "Chưa đủ điều kiện"
              )}
            </Badge>
          </div>
          <span className="open-auction-eligibility__label">
            Hạng thành viên hiện tại
          </span>
          <h2>{eligibility.currentTitleLabel}</h2>
          <dl>
            <div>
              <dt>Điều kiện tối thiểu</dt>
              <dd>Hạng {eligibility.requiredTitleLabel}</dd>
            </div>
            <div>
              <dt>Trạng thái membership</dt>
              <dd>
                {eligibility.membershipStatus === "ACTIVE"
                  ? "Đang hoạt động"
                  : "Cần kiểm tra"}
              </dd>
            </div>
          </dl>
          <p>
            {eligibility.eligible
              ? "Membership của bạn đã được xác thực. Bạn có thể tạo và theo dõi yêu cầu mở phiên."
              : "Tính năng mở đấu giá yêu cầu membership đang hoạt động và đạt tối thiểu hạng Vàng."}
          </p>
        </aside>
      </section>

      <section className="open-auction-process" aria-labelledby="open-process-title">
        <header>
          <span>QUY TRÌNH MINH BẠCH</span>
          <h2 id="open-process-title">Từ tài sản đến phiên đấu giá</h2>
          <p>Ba bước rõ ràng trước khi một phiên được công bố.</p>
        </header>
        <div>
          <article>
            <span>01</span>
            <FileSearch aria-hidden="true" />
            <h3>Gửi hồ sơ tài sản</h3>
            <p>Cung cấp mô tả, hình ảnh, tình trạng và mức giá đề xuất.</p>
          </article>
          <article>
            <span>02</span>
            <ClipboardCheck aria-hidden="true" />
            <h3>SGDG thẩm định</h3>
            <p>Đội ngũ chuyên môn đối chiếu thông tin và đánh giá khả năng mở phiên.</p>
          </article>
          <article>
            <span>03</span>
            <Sparkles aria-hidden="true" />
            <h3>Chuẩn bị phiên đấu giá</h3>
            <p>Yêu cầu được duyệt sẽ chuyển sang quy trình cấu hình và công bố phiên.</p>
          </article>
        </div>
      </section>

      <section className="open-auction-trust">
        <ShieldCheck aria-hidden="true" />
        <div>
          <h2>Tiếp nhận yêu cầu không đồng nghĩa phiên đã được phê duyệt</h2>
          <p>
            Mỗi tài sản vẫn phải hoàn tất thẩm định, kiểm tra hồ sơ và quy trình
            phê duyệt của SGDG trước khi lên lịch.
          </p>
        </div>
      </section>
    </div>
  );
}
