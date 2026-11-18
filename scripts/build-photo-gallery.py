"""Update the photo journal from the images in its photos directory."""

from html import escape
from pathlib import Path
import re
from urllib.parse import quote


GALLERY = Path(__file__).resolve().parents[1] / "dist" / "ashiato"
SAMPLE_PHOTOS = {"alley.webp", "pots.webp", "river.webp", "shadows.webp"}
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"}


def photo_figure(photo):
    title = re.sub(r"[-_\s]+", " ", photo.stem).strip() or "散歩の写真"
    caption = escape(title)
    url = "photos/" + quote(photo.name, safe="")
    island = photo.name == "本島から見える伊江島.webp"
    frame = "photo-link island-frame" if island else "photo-link"
    image = ' class="island-rotated" width="1920" height="1440"' if island else ""
    alt = "沖縄本島の海岸から、青い海の向こうに伊江島を望む" if island else title
    note = ('<p>海の向こうの島影。<br>足を止めて、水平線を眺めたくなる景色。</p>'
            '<span class="photo-caption-english" aria-hidden="true">Beyond the horizon.</span>') if island else ""
    return (
        f'<figure class="journal-photo" data-reveal><a class="{frame}" href="{url}" '
        f'aria-label="{caption}を大きく見る"><img{image} src="{url}" alt="{escape(alt)}" '
        f'loading="lazy"><span class="photo-open" aria-hidden="true">↗</span></a>'
        f'<figcaption><p class="photo-kicker">FIELD NOTES / {"OKINAWA, JAPAN" if island else "PHOTO JOURNAL"}</p>'
        f'<h2>{caption}</h2>{note}</figcaption></figure>'
    )


def main():
    page = GALLERY / "index.html"
    lines = page.read_text(encoding="utf-8").splitlines(keepends=True)
    markers = [line.strip() for line in lines]
    start_mark = "<!-- added-photos:start -->"
    end_mark = "<!-- added-photos:end -->"
    if markers.count(start_mark) != 1 or markers.count(end_mark) != 1:
        raise ValueError("Expected one pair of added-photos markers in the gallery")
    start, end = markers.index(start_mark), markers.index(end_mark)
    if end < start:
        raise ValueError("Gallery end marker appears before its start marker")

    photos = sorted(
        (
            path for path in (GALLERY / "photos").iterdir()
            if path.is_file() and path.name not in SAMPLE_PHOTOS
            and path.suffix.lower() in EXTENSIONS
        ),
        key=lambda path: (path.name.casefold(), path.name),
    )
    indent = lines[start][:lines[start].index("<")]
    lines[start + 1:end] = [f"{indent}{photo_figure(photo)}\n" for photo in photos]
    page.write_text("".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
