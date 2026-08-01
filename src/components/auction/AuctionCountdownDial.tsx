import { Clock3, Gavel } from "lucide-react";

type AuctionCountdownDialProps = {
  remainingMs: number;
  endsAt: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function AuctionCountdownDial({
  remainingMs,
}: AuctionCountdownDialProps) {
  const safeRemainingMs = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(safeRemainingMs / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const urgent = safeRemainingMs > 0 && safeRemainingMs <= 5 * 60 * 1_000;
  const complete = safeRemainingMs === 0;
  const accessibleTime = `${hours} giờ ${minutes} phút ${seconds} giây`;

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
      <span className="countdown-gavel-mark" aria-hidden="true">
        <Gavel />
      </span>
      <header className="countdown-compact-header">
        <Clock3 aria-hidden="true" />
        <span>{complete ? "Phiên đã kết thúc" : "Thời gian còn lại"}</span>
      </header>
      <div className="countdown-digits" aria-hidden="true">
        <span>{pad(hours)}</span>
        <i>:</i>
        <span>{pad(minutes)}</span>
        <i>:</i>
        <span>{pad(seconds)}</span>
      </div>
      <div className="countdown-units" aria-hidden="true">
        <span>Giờ</span>
        <span>Phút</span>
        <span>Giây</span>
      </div>
    </section>
  );
}
