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
    return (
        f'<figure class="journal-photo"><a class="photo-link" href="{url}" '
        f'aria-label="{caption}を大きく見る"><img src="{url}" alt="{caption}" '
        f'loading="lazy"></a><figcaption><h2>{caption}</h2></figcaption></figure>'
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
