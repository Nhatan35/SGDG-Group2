import type { Auction } from "../../services/mock/auctionService";

export type StageDisplayMode = "cutout" | "framed-art" | "media-frame";

type GeneratedStageAsset = {
  src: string;
  mode: StageDisplayMode;
};

export const generatedStageImageMap: Record<string, GeneratedStageAsset> = {
  "/assets/catalog-generated/antique-07.jpg": {
    src: "/images/auction-room/generated-display/antique-07.png",
    mode: "cutout",
  },
  "/assets/catalog-generated/fashion-07.jpg": {
    src: "/images/auction-room/generated-display/fashion-07.png",
    mode: "cutout",
  },
  "/assets/catalog-generated/collectible-07.jpg": {
    src: "/images/auction-room/generated-display/collectible-07.png",
    mode: "cutout",
  },
  "/assets/catalog-generated/phone-13.jpg": {
    src: "/images/auction-room/generated-display/phone-13.png",
    mode: "cutout",
  },
  "/assets/catalog-generated/vehicle-13.jpg": {
    src: "/images/auction-room/generated-display/vehicle-13.png",
    mode: "cutout",
  },
  "/assets/catalog-generated/art-13.jpg": {
    src: "/images/auction-room/generated-display/art-13.webp",
    mode: "framed-art",
  },
  "/assets/catalog-generated/watch-18.jpg": {
    src: "/images/auction-room/generated-display/watch-18.png",
    mode: "cutout",
  },
  "/assets/catalog-generated/jewelry-18.jpg": {
    src: "/images/auction-room/generated-display/jewelry-18.png",
    mode: "cutout",
  },
};

const framedArtCategories = new Set(["Nghệ thuật"]);
const mediaFrameCategories = new Set(["Bất động sản"]);

export function resolveStagePresentation(auction: Auction): {
  src: string;
  mode: StageDisplayMode;
  scale: string;
} {
  const generated = generatedStageImageMap[auction.image];
  const explicitImage =
    auction.transparentDisplayImage ?? auction.displayImage;

  const mode: StageDisplayMode = auction.transparentDisplayImage
    ? "cutout"
    : auction.displayImage || framedArtCategories.has(auction.category)
      ? "framed-art"
      : generated?.mode ??
        (mediaFrameCategories.has(auction.category)
          ? "media-frame"
          : "media-frame");

  const scale =
    framedArtCategories.has(auction.category) || mode === "framed-art"
      ? "art"
      : auction.category === "Đồng hồ" || auction.category === "Trang sức"
        ? "watch-jewelry"
        : auction.category === "Xe cộ"
          ? "vehicle"
          : auction.category === "Bất động sản"
            ? "real-estate"
            : "object";

  return {
    src: explicitImage ?? generated?.src ?? auction.image,
    mode,
    scale,
  };
}
