import { auctions } from "../../services/mock/auctionService";

export const featuredAuctions = [
  ...auctions.filter((auction) => auction.status === "LIVE").slice(0, 4),
  ...auctions
    .filter((auction) => auction.status === "REGISTRATION_OPEN")
    .slice(0, 3),
];
