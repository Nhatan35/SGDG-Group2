import { ArrowRight, BadgeCheck, Gavel, Radio, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function HomeCampaignBanner() {
  return (
    <section className="home-campaign-zone" aria-labelledby="campaign-title">
      <article className="home-campaign-banner">
        <img
          className="home-campaign-art"
          src="/assets/home-auction-campaign-banner-v1.png"
          alt="Búa đấu giá cùng đồng hồ, nhẫn kim cương và xe cao cấp"
          width="1672"
          height="941"
          loading="lazy"
          decoding="async"
        />
        <div className="home-campaign-content">
          <span className="home-campaign-kicker">
            <Gavel aria-hidden="true" />
            Bộ sưu tập đấu giá tuyển chọn
          </span>
          <h2 id="campaign-title">
            Chạm giá trị thật.
            <span>Chốt phiên đầy cảm xúc.</span>
          </h2>
          <p>
            Theo dõi tài sản nổi bật, xem livestream và tham gia trả giá minh
            bạch ngay trên SGDG.
          </p>
          <div className="home-campaign-benefits" aria-label="Điểm nổi bật">
            <span>
              <BadgeCheck aria-hidden="true" /> Tài sản đã thẩm định
            </span>
            <span>
              <Radio aria-hidden="true" /> Cập nhật giá trực tiếp
            </span>
          </div>
          <div className="home-campaign-actions">
            <Link className="home-campaign-primary" to="/auctions">
              Khám phá phiên nổi bật <ArrowRight aria-hidden="true" />
            </Link>
            <a className="home-campaign-secondary" href="#live-showcase-title">
              <Radio aria-hidden="true" /> Xem phòng livestream
            </a>
          </div>
          <small className="home-campaign-trust">
            <ShieldCheck aria-hidden="true" /> Minh bạch trong từng nhịp trả giá
          </small>
        </div>
      </article>
    </section>
  );
}
