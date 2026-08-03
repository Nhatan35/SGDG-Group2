import type { ImgHTMLAttributes, SyntheticEvent } from "react";

const fallbackSource = "/assets/auction-image-fallback.svg";

export interface ResilientImageProps
  extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export function ResilientImage({
  fallbackSrc = fallbackSource,
  onError,
  src,
  ...props
}: ResilientImageProps) {
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const failedSource = image.currentSrc || src?.toString() || "";

    onError?.(event);

    if (image.dataset.fallbackApplied === "true") {
      console.error("[ImageLoader] Fallback image failed to load.", {
        failedSource,
        fallbackSrc,
      });
      return;
    }

    console.error("[ImageLoader] Product image failed to load.", {
      failedSource,
      fallbackSrc,
    });
    image.dataset.fallbackApplied = "true";
    image.dataset.failedSource = failedSource;
    image.src = fallbackSrc;
  };

  return <img {...props} src={src} onError={handleError} />;
}
