import { Clock3, Crown, Radio } from "lucide-react";

type AuctionCountdownDialProps = {
  remainingMs: number;
  endsAt: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatEndTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      time: "Đang cập nhật",
      date: "",
    };
  }

  const time = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  const day = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  return {
    time,
    date: day,
  };
}

export function AuctionCountdownDial({
  remainingMs,
  endsAt,
}: AuctionCountdownDialProps) {
  const safeRemainingMs = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(safeRemainingMs / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const urgent = safeRemainingMs > 0 && safeRemainingMs <= 5 * 60 * 1_000;
  const complete = safeRemainingMs === 0;
  const accessibleTime = `${hours} giờ ${minutes} phút ${seconds} giây`;
  const endTime = formatEndTime(endsAt);

  return (
    <section
      className={`count-card auction-countdown-dial${urgent ? " is-urgent" : ""}${
        complete ? " is-complete" : ""
      }`}
      role="timer"
      aria-label={
        complete
          ? "Phiên đấu giá đã kết thúc"
          : `Thời gian còn lại ${accessibleTime}`
      }
    >
      <div className="countdown-orbit" aria-hidden="true">
        <span className="countdown-progress" />
        <span className="countdown-spark countdown-spark-one" />
        <span className="countdown-spark countdown-spark-two" />
        <div className="countdown-face">
          <Crown className="countdown-crown" />
          <span className="countdown-eyebrow">Thời gian kết thúc</span>
          <div className="countdown-digits">
            <span>{pad(hours)}</span>
            <i>:</i>
            <span>{pad(minutes)}</span>
            <i>:</i>
            <span>{pad(seconds)}</span>
          </div>
          <div className="countdown-units">
            <span>Giờ</span>
            <span>Phút</span>
            <span>Giây</span>
          </div>
        </div>
      </div>

      <div className="countdown-summary">
        <div className="countdown-live-pill">
          <Radio aria-hidden="true" />
          {complete ? "ĐÃ KẾT THÚC" : "LIVE AUCTION"}
        </div>
        <h2>
          <span>Thời gian</span>
          <span>kết thúc</span>
        </h2>
        <div className="countdown-divider" aria-hidden="true">
          <span>✦</span>
        </div>
        <div className="countdown-end-time">
          <Clock3 aria-hidden="true" />
          <span>
            <small>Kết thúc lúc</small>
            <strong>
              <span>
                {endTime.time}
                {endTime.date ? "," : ""}
              </span>
              {endTime.date && <span>{endTime.date}</span>}
            </strong>
            <small>(GMT+7)</small>
          </span>
        </div>
      </div>
    </section>
  );
}
