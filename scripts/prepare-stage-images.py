"""Prepare cached wireframe assets for the public auction-room stage.

This script never changes source catalog images. Existing outputs are skipped.
Cutout jobs consume an optional, flat-green `<stem>-chroma.png` prepared source;
when none is available the application deliberately falls back to the original
image in media-frame mode.
"""

from __future__ import annotations

from pathlib import Path
import json

from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "assets" / "catalog-generated"
CHROMA_DIR = ROOT / "scripts" / "stage-image-inputs"
OUTPUT_DIR = ROOT / "public" / "images" / "auction-room" / "generated-display"

JOBS = {
    "antique-07.jpg": ("antique-07.png", "cutout"),
    "fashion-07.jpg": ("fashion-07.png", "cutout"),
    "collectible-07.jpg": ("collectible-07.png", "cutout"),
    "phone-13.jpg": ("phone-13.png", "cutout"),
    "vehicle-13.jpg": ("vehicle-13.png", "cutout"),
    "art-13.jpg": ("art-13.webp", "framed-art"),
}


def remove_green(source: Path, output: Path) -> None:
    image = Image.open(source).convert("RGBA")
    pixels = []
    for red, green, blue, _alpha in image.getdata():
        distance = max(abs(red), abs(green - 255), abs(blue))
        alpha = 0 if distance <= 26 else min(255, max(0, (distance - 26) * 5))
        if alpha < 255:
            green = min(green, max(red, blue))
        pixels.append((red, green, blue, alpha))
    image.putdata(pixels)
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds:
        left, top, right, bottom = bounds
        subject_width = right - left
        subject_height = bottom - top
        pad_x = max(2, round(subject_width * 0.05))
        pad_y = max(2, round(subject_height * 0.05))
        image = image.crop(
            (
                max(0, left - pad_x),
                max(0, top - pad_y),
                min(image.width, right + pad_x),
                min(image.height, bottom + pad_y),
            )
        )
    image.save(output, "PNG", optimize=True)


def crop_framed_art(source: Path, output: Path) -> None:
    image = Image.open(source).convert("RGB")
    background = Image.new("RGB", image.size, image.getpixel((0, 0)))
    mask = ImageChops.difference(image, background).convert("L")
    mask = mask.point(lambda value: 255 if value > 16 else 0)
    bounds = mask.getbbox()
    if not bounds:
        raise RuntimeError(f"Cannot detect framed art bounds: {source}")
    left, top, right, bottom = bounds
    cropped = image.crop(
        (
            max(0, left - 2),
            max(0, top - 2),
            min(image.width, right + 2),
            min(image.height, bottom + 2),
        )
    )
    cropped.save(output, "WEBP", quality=95, method=6)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {}

    for source_name, (output_name, mode) in JOBS.items():
        source = SOURCE_DIR / source_name
        output = OUTPUT_DIR / output_name
        manifest[f"/assets/catalog-generated/{source_name}"] = {
            "src": f"/images/auction-room/generated-display/{output_name}",
            "mode": mode,
        }

        if output.exists():
            print(f"SKIP {output.relative_to(ROOT)}")
            continue
        if not source.exists():
            print(f"MISSING SOURCE {source.relative_to(ROOT)}")
            continue

        if mode == "framed-art":
            crop_framed_art(source, output)
            print(f"WROTE {output.relative_to(ROOT)}")
            continue

        chroma_source = CHROMA_DIR / f"{Path(source_name).stem}-chroma.png"
        if not chroma_source.exists():
            print(
                f"NO PREPARED CUTOUT {chroma_source.relative_to(ROOT)}; "
                "runtime will use the original image in media-frame mode"
            )
            continue
        remove_green(chroma_source, output)
        print(f"WROTE {output.relative_to(ROOT)}")

    manifest_path = OUTPUT_DIR / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"WROTE {manifest_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
