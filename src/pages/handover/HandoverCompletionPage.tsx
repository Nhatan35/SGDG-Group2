import { CheckCircle2, ShieldCheck, Star } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { getHandoverCaseFixture } from "../../services/mock/handoverService";
import { auctions } from "../../services/mock/auctionService";
import { formatMoney } from "../../utils/format";
import { NotFoundPage } from "../NotFoundPage";
import "../../styles/handover-completion.css";

const REVIEW_REDIRECT_DELAY_MS = 2_000;

export function HandoverCompletionPage() {
  const { caseId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fixture = caseId ? getHandoverCaseFixture(caseId, "completed") : undefined;
  const requestedAuctionId = params.get("auctionId");
  const auction =
    auctions.find((item) => item.id === requestedAuctionId) ||
    auctions.find((item) => item.id === fixture?.auctionId);

  useEffect(() => {
    if (!submitted) return;

    const redirectTimer = window.setTimeout(() => {
      navigate("/", { replace: true });
    }, REVIEW_REDIRECT_DELAY_MS);

    return () => window.clearTimeout(redirectTimer);
  }, [navigate, submitted]);

  if (!fixture || !auction) return <NotFoundPage />;

  const winningPrice = auction.currentPrice || auction.startPrice;

  return (
    <main className="container handover-child-page completion-page post-auction-page">
      <section className="completion-success-card">
        <div className="completion-confetti" aria-hidden="true" />
        <span className="completion-shield">
          <ShieldCheck aria-hidden="true" />
        </span>
        <h1>{submitted ? "Đánh giá thành công!" : "Giao dịch hoàn tất!"}</h1>
        <p>
          {submitted
            ? "Cảm ơn phản hồi của bạn. Bạn sẽ được chuyển về trang chủ trong giây lát."
            : "Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của SGDG."}
        </p>
      </section>

      <div className="completion-layout">
        <section className="completion-order-card">
          <h2>Thông tin giao dịch</h2>
          <div>
            <img src={auction.image} alt={auction.assetName} />
            <div>
              <h3>{auction.assetName}</h3>
              <p>{auction.code}</p>
              <span>
                <CheckCircle2 aria-hidden="true" />
                Đã bàn giao thành công
              </span>
            </div>
          </div>
          <dl>
            <div>
              <dt>Giá trúng</dt>
              <dd>{formatMoney(winningPrice)}</dd>
            </div>
            <div>
              <dt>Mã hồ sơ bàn giao</dt>
              <dd>{fixture.caseReference}</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>Hoàn tất</dd>
            </div>
          </dl>
        </section>

        {submitted ? (
          <section
            className="completion-rating-panel submitted"
            role="status"
            aria-live="polite"
          >
            <div className="completion-rating-success">
              <CheckCircle2 aria-hidden="true" />
              <h2>Đã gửi đánh giá thành công</h2>
              <p>Đang chuyển bạn về trang chủ...</p>
            </div>
          </section>
        ) : (
          <section className="completion-rating-panel">
            <h2>Đánh giá trải nghiệm của bạn</h2>
            <div
              className="completion-stars"
              role="radiogroup"
              aria-label="Mức độ hài lòng"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={rating === value}
                  className={value <= rating ? "selected" : ""}
                  onClick={() => setRating(value)}
                  aria-label={`${value} sao`}
                >
                  <Star aria-hidden="true" />
                </button>
              ))}
            </div>
            <label>
              Chia sẻ trải nghiệm của bạn (tùy chọn)
              <textarea
                value={feedback}
                maxLength={1000}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Dịch vụ bàn giao, thanh toán, thông báo..."
              />
            </label>
            <div className="completion-actions">
              <Link className="button secondary" to="/auctions">
                Để sau
              </Link>
              <button
                className="button primary"
                onClick={() => setSubmitted(true)}
              >
                Gửi đánh giá
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
