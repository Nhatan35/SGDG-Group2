import type { Auction } from "../services/mock/auctionService";

export const SHORT_LIVESTREAM_MAX_DURATION_MS = 4 * 60 * 60 * 1000;

type LivestreamAuction = Pick<
  Auction,
  "status" | "startsAt" | "endsAt"
>;

export function isShortLiveAuction(
  auction: LivestreamAuction,
  now: number,
) {
  if (auction.status !== "LIVE") return false;

  const startsAt = new Date(auction.startsAt).getTime();
  const endsAt = new Date(auction.endsAt).getTime();
  const duration = endsAt - startsAt;

  return (
    Number.isFinite(startsAt) &&
    Number.isFinite(endsAt) &&
    duration > 0 &&
    duration <= SHORT_LIVESTREAM_MAX_DURATION_MS &&
    startsAt <= now &&
    now < endsAt
  );
}

export function formatLivestreamDuration(startsAt: string, endsAt: string) {
  const durationMinutes = Math.max(
    0,
    Math.round(
      (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000,
    ),
  );
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (!hours) return `${minutes} phút`;
  if (!minutes) return `${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}
