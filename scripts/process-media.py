"""
Media pipeline for faraananagaji.com

Takes the raw, uncategorised media folder and produces web-ready assets:
  * categorises every file into a topic folder with a descriptive slug
  * auto-orients, trims letterbox bars, gently enhances (contrast, colour, sharpness)
  * exports responsive WebP sizes + a JPEG fallback
  * creates a tiny blurred placeholder (LQIP) for smooth "blur-up" loading
  * compresses videos to H.264 MP4 (fast-start) with poster frames
  * writes src/data/media.json, used by the build script to emit <picture> tags

Usage:
    pip install pillow imageio-ffmpeg
    python scripts/process-media.py --src "C:/path/to/raw/media"
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT_IMG = ROOT / "src" / "assets" / "images"
OUT_VID = ROOT / "src" / "assets" / "video"
MANIFEST = ROOT / "src" / "data" / "media.json"

WIDTHS = (480, 960, 1440)
WEBP_QUALITY = 70
JPEG_QUALITY = 72

# raw filename -> (category/slug, trim_letterbox)
IMAGES: dict[str, tuple[str, bool]] = {
    # Portraits & personal brand
    "1789832451030.jpg": ("portraits/studio-caramel", False),
    "n1.jpeg": ("portraits/studio-caramel-confident", False),
    "1789330425714.jpg": ("portraits/studio-royal-blue", False),
    "1747206405742.jpg": ("portraits/office-ankara-elegance", False),
    "1785078910332.jpg": ("portraits/library-poise", False),
    "1785102895781.jpg": ("portraits/garden-ankara", False),
    "1786999871829.jpg": ("portraits/at-work-candid", False),
    "1789331092531.jpg": ("portraits/headwrap-candid", False),
    "729684418_36440101342271521_2613128438169034111_n.jpg": ("portraits/red-gele", False),
    "nana1.jpeg": ("portraits/casual-plaid", True),
    "nana2.jpeg": ("portraits/garden-wall", True),
    "nana3.jpeg": ("portraits/glam-headwrap", False),
    "1789142702021.jpg": ("portraits/street-style", False),
    # Professional / institutional
    "1785101381873.jpg": ("professional/gallery-visit-blazer", False),
    "1787945842468.jpg": ("professional/library-trust-fund", False),
    # Community development & humanitarian field work
    "1755045222488.jpg": ("community/farm-site-visit", False),
    "1755045222814.jpg": ("community/field-assessment", False),
    "1755083666138.jpg": ("community/dialogue-under-the-tree", False),
    "1785081787754.jpg": ("community/community-leaders-meeting", False),
    "1785093318145.jpg": ("community/youth-farmers-engagement", False),
    "1786998727557.jpg": ("community/household-visit", False),
    "1786998735189.jpg": ("community/household-visit-family", False),
    "1786998736816.jpg": ("community/family-outreach", False),
    "1786999227844.jpg": ("community/women-gathering", False),
    "1787556346732.jpg": ("community/town-hall-under-the-tree", False),
    "1787556348040.jpg": ("community/sensitisation-session", False),
    "1789028905623.jpg": ("community/women-circle", False),
    "1789331936168.jpg": ("community/agric-field-training", False),
    "1790105604817.jpg": ("community/women-outreach-registration", False),
    "1790982280430.jpg": ("community/stakeholders-group", False),
    "1790982965198.jpg": ("community/clean-cooking-demonstration", False),
    "cw1.jpeg": ("community/phc-munape-women", False),
    "cw2.jpeg": ("community/savings-group-meeting", False),
    "cw3.jpeg": ("community/savings-group-women", False),
    "cw4.jpeg": ("community/savings-group-session", False),
    "cw5.jpeg": ("community/skills-acquisition-graduates", False),
    "cw7.jpeg": ("community/skills-training-hall", False),
    # Advocacy, GBV & policy
    "1788530705563.jpg": ("advocacy/rwvl-safespace-therapy", False),
    "1788836465979.jpg": ("advocacy/gs26-gender-inclusion-summit", False),
    "1791114935686.jpg": ("advocacy/capacity-building-workshop", False),
    # Mentorship & youth leadership
    "1785262675200.jpg": ("mentorship/vision-board-session", False),
    "1787556342232.jpg": ("mentorship/ecwa-goodnews-keynote", False),
}

# raw filename -> (slug, max height, keep audio, crf)
VIDEOS: dict[str, tuple[str, int, bool, int]] = {
    "n3.mp4": ("brand-reel-studio", 960, False, 27),
    "n2.mp4": ("brand-reel-portrait", 960, False, 27),
    "cw6.mp4": ("community-skills-production", 640, True, 30),
}


def trim_letterbox(im: Image.Image) -> Image.Image:
    """Remove solid black bars (common on phone screenshots / reposts)."""
    mask = im.convert("L").point(lambda p: 255 if p > 18 else 0)
    box = mask.getbbox()
    return im.crop(box) if box else im


def enhance(im: Image.Image) -> Image.Image:
    # phone photos carry sensor noise that bloats compressed files; a whisper of blur
    # removes it, and the post-resize unsharp mask restores perceived crispness
    im = im.filter(ImageFilter.GaussianBlur(0.6))
    im = ImageEnhance.Contrast(im).enhance(1.04)
    im = ImageEnhance.Color(im).enhance(1.06)
    return im


def resized(im: Image.Image, width: int) -> Image.Image:
    if im.width <= width:
        out = im.copy()
    else:
        h = round(im.height * width / im.width)
        out = im.resize((width, h), Image.LANCZOS)
    return out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=4))


def lqip(im: Image.Image) -> str:
    tiny = im.copy()
    tiny.thumbnail((24, 24))
    buf = io.BytesIO()
    tiny.save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def process_images(src: Path, manifest: dict) -> None:
    for raw, (key, trim) in IMAGES.items():
        path = src / raw
        if not path.exists():
            print(f"  ! missing {raw}")
            continue
        im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        if trim:
            im = trim_letterbox(im)
        im = enhance(im)

        out_dir = OUT_IMG / Path(key).parent
        out_dir.mkdir(parents=True, exist_ok=True)
        stem = Path(key).name

        widths = sorted({min(w, im.width) for w in WIDTHS})
        for w in widths:
            resized(im, w).save(out_dir / f"{stem}-{w}.webp", "WEBP", quality=WEBP_QUALITY, method=6)
        fallback_w = min(800, im.width)
        resized(im, fallback_w).save(
            out_dir / f"{stem}-{fallback_w}.jpg", "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True
        )
        manifest["images"][key] = {
            "width": im.width,
            "height": im.height,
            "widths": widths,
            "fallback": fallback_w,
            "lqip": lqip(im),
            "source": raw,
        }
        print(f"  ✓ {key}  ({im.width}x{im.height})")


def ffmpeg_exe() -> str:
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def process_videos(src: Path, manifest: dict) -> None:
    ff = ffmpeg_exe()
    OUT_VID.mkdir(parents=True, exist_ok=True)
    for raw, (slug, max_h, audio, crf) in VIDEOS.items():
        path = src / raw
        if not path.exists():
            print(f"  ! missing {raw}")
            continue
        out = OUT_VID / f"{slug}.mp4"
        cmd = [
            ff, "-v", "error", "-y", "-i", str(path),
            "-vf", f"scale=-2:'min({max_h},ih)',fps=30,format=yuv420p",
            "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-profile:v", "high",
            "-movflags", "+faststart",
        ]
        cmd += ["-c:a", "aac", "-b:a", "80k"] if audio else ["-an"]
        cmd.append(str(out))
        subprocess.run(cmd, check=True)

        poster = OUT_VID / f"{slug}-poster.jpg"
        subprocess.run(
            [ff, "-v", "error", "-y", "-ss", "1", "-i", str(out), "-frames:v", "1",
             "-vf", "format=yuvj420p", "-q:v", "4", str(poster)],
            check=True,
        )
        with Image.open(poster) as p:
            p.save(OUT_VID / f"{slug}-poster.webp", "WEBP", quality=72)
            w, h = p.size
        manifest["videos"][slug] = {"width": w, "height": h, "audio": audio, "source": raw}
        print(f"  ✓ video {slug}  {out.stat().st_size / 1e6:.2f} MB")


def make_social_card(manifest: dict) -> None:
    """1200x630 Open Graph image from the hero portrait."""
    info = manifest["images"].get("portraits/studio-caramel")
    if not info:
        return
    src = OUT_IMG / "portraits" / f"studio-caramel-{max(info['widths'])}.webp"
    im = Image.open(src).convert("RGB")
    card = ImageOps.fit(im, (1200, 630), centering=(0.5, 0.12))
    (OUT_IMG / "social").mkdir(exist_ok=True)
    card.save(OUT_IMG / "social" / "og-card.jpg", "JPEG", quality=82, optimize=True, progressive=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="raw media directory")
    args = ap.parse_args()
    src = Path(args.src)

    manifest = {"images": {}, "videos": {}}
    print("Images:")
    process_images(src, manifest)
    print("Videos:")
    process_videos(src, manifest)
    make_social_card(manifest)

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Manifest → {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
