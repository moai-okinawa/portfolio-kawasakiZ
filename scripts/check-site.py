#!/usr/bin/env python3
"""Validate the two static pages without a browser or extra dependencies.

Checks source structure, local resources and required content. It does not
prove rendered layout, color contrast over photography or screen-reader UX.
"""

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PAGES = (DIST / "index.html", DIST / "ashiato/index.html")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
CSS_URL = re.compile(r"url\(\s*['\"]?([^)'\"\s]+)['\"]?\s*\)", re.I)
WORKS = ("寄り道手帖", "サンダル散歩マップ", "路地裏ラジオ")
SAMPLE_PHOTOS = {"alley.webp", "pots.webp", "river.webp", "shadows.webp"}


class Node:
    def __init__(self, tag, attributes=(), parent=None, line=0):
        self.tag = tag
        self.attrs = dict(attributes)
        self.parent = parent
        self.children = []
        self.parts = []
        self.line = line

    def has_class(self, value):
        return value in (self.attrs.get("class") or "").split()

    def text(self):
        if self.tag in {"head", "script", "style", "template"}:
            return ""
        return "".join(part.text() if isinstance(part, Node) else part
                       for part in self.parts)

    def descendants(self, tag=None):
        for child in self.children:
            if tag is None or child.tag == tag:
                yield child
            yield from child.descendants(tag)

    def ancestor(self, tag):
        item = self.parent
        while item is not None:
            if item.tag == tag:
                return item
            item = item.parent
        return None


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.root = Node("document")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1], self.getpos()[0])
        self.stack[-1].children.append(node)
        self.stack[-1].parts.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].parts.append(data)

    @property
    def nodes(self):
        return list(self.root.descendants())

    @property
    def ids(self):
        return [node.attrs["id"] for node in self.nodes if "id" in node.attrs]


def read_page(path):
    page = Page(path)
    page.feed(path.read_text(encoding="utf-8"))
    page.close()
    return page


def normalized(value):
    return re.sub(r"\s+", "", value)


def local_target(reference, origin):
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc:
        return None, parsed.fragment
    if parsed.path.startswith("/"):
        # Root-relative links break when hosted below /portfolio-kawasakiZ/.
        raise ValueError(f"root-relative resource is unsafe for project Pages: {reference}")
    target = (origin.parent / unquote(parsed.path)).resolve() if parsed.path else origin
    if not target.is_relative_to(DIST):
        raise ValueError(f"resource escapes dist/: {reference}")
    if target.is_dir():
        target /= "index.html"
    return target, unquote(parsed.fragment)


def check_reference(reference, origin, errors, cache):
    if not reference or reference == "#":
        errors.append(f"{origin.relative_to(DIST)}: empty link/resource")
        return 0
    if urlsplit(reference).scheme.lower() in {"javascript", "vbscript"}:
        errors.append(f"{origin.relative_to(DIST)}: active script URL")
        return 0
    try:
        target, fragment = local_target(reference, origin)
    except ValueError as error:
        errors.append(f"{origin.relative_to(DIST)}: {error}")
        return 0
    if target is None:
        return 0
    if not target.is_file():
        errors.append(f"{origin.relative_to(DIST)}: missing resource {reference}")
    elif fragment and target.suffix.lower() in {".html", ".htm"}:
        if target not in cache:
            cache[target] = read_page(target)
        if fragment not in cache[target].ids:
            errors.append(f"{origin.relative_to(DIST)}: missing anchor {reference}")
    return 1


def check_page(page, errors, cache):
    label = str(page.path.relative_to(DIST))
    nodes = page.nodes
    ids = page.ids
    if len([node for node in nodes if node.tag == "h1"]) != 1:
        errors.append(f"{label}: expected exactly one h1")
    if len([node for node in nodes if node.tag == "main"]) != 1:
        errors.append(f"{label}: expected exactly one main")
    if not any(node.tag == "html" and node.attrs.get("lang") == "ja" for node in nodes):
        errors.append(f"{label}: missing lang=ja")
    if not any(node.tag == "a" and node.attrs.get("href") == "#main" for node in nodes):
        errors.append(f"{label}: missing skip link to main")
    for identifier, count in Counter(ids).items():
        if count > 1:
            errors.append(f"{label}: duplicate id {identifier}")
    references = 0
    images = 0
    for node in nodes:
        for key in ("aria-labelledby", "aria-describedby", "aria-controls"):
            for identifier in (node.attrs.get(key) or "").split():
                if identifier not in ids:
                    errors.append(f"{label}:{node.line}: unresolved {key} {identifier}")
        for key in ("href", "src", "poster"):
            if key in node.attrs:
                references += check_reference(node.attrs[key], page.path, errors, cache)
        if node.tag == "img":
            images += 1
            if "alt" not in node.attrs:
                errors.append(f"{label}:{node.line}: image is missing alt")
            if not node.attrs.get("src") and not (
                node.attrs.get("id") == "dialog-image" or node.has_class("viewer-image")
            ):
                errors.append(f"{label}:{node.line}: image has no source")
        if node.tag in {"button", "summary"}:
            if not (node.attrs.get("aria-label") or node.attrs.get("aria-labelledby") or normalized(node.text())):
                errors.append(f"{label}:{node.line}: unnamed {node.tag}")
        if node.tag == "dialog":
            if not (node.attrs.get("aria-label") or node.attrs.get("aria-labelledby")):
                errors.append(f"{label}:{node.line}: dialog has no accessible name")
            if not any(child.tag == "form" and child.attrs.get("method") == "dialog"
                       for child in node.descendants()):
                errors.append(f"{label}:{node.line}: dialog lacks native close form")
    return references, images


def check_content(cache, errors):
    home, gallery = (cache[path] for path in PAGES)
    home_text, gallery_text = normalized(home.root.text()), normalized(gallery.root.text())
    for name in ("サンダルの川崎", "写真を撮る", "全国各地を周る"):
        if normalized(name) not in home_text:
            errors.append(f"index.html: missing required content {name}")
    works = [node for node in home.nodes if node.tag == "article" and node.has_class("work")]
    for name in WORKS:
        matches = [node for node in works if any(name in heading.text() for heading in node.descendants("h3"))]
        if len(matches) != 1:
            errors.append(f"index.html: expected one work titled {name}")
    if "サンプル" not in home_text:
        errors.append("index.html: missing sample-content disclosure")
    if "work-dialog" not in home.ids:
        errors.append("index.html: missing work dialog")
    if "本島から見える伊江島" not in gallery_text:
        errors.append("ashiato/index.html: required Ie Island title is missing")
    if not any(node.tag == "img" and "本島から見える伊江島" in unquote(node.attrs.get("src", ""))
               for node in gallery.nodes):
        errors.append("ashiato/index.html: required Ie Island photo is missing")
    photo_links = [node for node in gallery.nodes if node.tag == "a" and node.has_class("photo-link")]
    if len(photo_links) < 5:
        errors.append("ashiato/index.html: expected the user photo and four retained sample photos")
    for filename in SAMPLE_PHOTOS:
        matches = [node for node in photo_links if Path(urlsplit(node.attrs.get("href", "")).path).name == filename]
        if len(matches) != 1:
            errors.append(f"ashiato/index.html: expected one sample photo {filename}")
            continue
        figure = matches[0].ancestor("figure")
        if figure is None or "AI生成のサンプル" not in normalized(figure.text()):
            errors.append(f"ashiato/index.html: {filename} is missing its AI sample disclosure")
    for identifier in ("viewer", "viewer-title"):
        if identifier not in gallery.ids:
            errors.append(f"ashiato/index.html: missing photo viewer hook {identifier}")
    for class_name in ("previous", "next"):
        if not any(node.tag == "button" and node.has_class(class_name) for node in gallery.nodes):
            errors.append(f"ashiato/index.html: missing {class_name} photo control")
    return len(works), len(photo_links)


def check_svgs(errors):
    files = sorted(DIST.rglob("*.svg"))
    for path in files:
        label = str(path.relative_to(DIST))
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError as error:
            errors.append(f"{label}: invalid SVG XML: {error}")
            continue
        ids = [node.attrib["id"] for node in root.iter() if "id" in node.attrib]
        references = []
        for identifier, count in Counter(ids).items():
            if count > 1:
                errors.append(f"{label}: duplicate SVG id {identifier}")
        for node in root.iter():
            tag = node.tag.rsplit("}", 1)[-1].lower()
            if tag in {"script", "foreignobject"}:
                errors.append(f"{label}: active SVG element {tag}")
            for key, value in node.attrib.items():
                key = key.rsplit("}", 1)[-1].lower()
                if key.startswith("on"):
                    errors.append(f"{label}: SVG event handler {key}")
                if key in {"href", "src"}:
                    references.append(value)
                references.extend(CSS_URL.findall(value))
            if tag == "style":
                css = "".join(node.itertext())
                references.extend(CSS_URL.findall(css))
                if "@import" in css.lower():
                    errors.append(f"{label}: stylesheet import")
        for reference in references:
            if not reference.startswith("#") or reference[1:] not in ids:
                errors.append(f"{label}: invalid/external SVG reference {reference}")
    return len(files)


def main():
    errors = []
    cache = {path: read_page(path) for path in PAGES}
    references = images = 0
    for page in list(cache.values()):
        found_references, found_images = check_page(page, errors, cache)
        references += found_references
        images += found_images
    for path in DIST.rglob("*.css"):
        for reference in CSS_URL.findall(path.read_text(encoding="utf-8")):
            references += check_reference(reference, path, errors, cache)
    works, photos = check_content(cache, errors)
    svg_count = check_svgs(errors)
    if errors:
        print("FAIL: static-site checks", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"PASS: 2 pages; {references} local references; {images} images; {svg_count} SVGs")
    print(f"Content: {works} works; {photos} gallery photos; required titles and sample disclosures retained")
    print("Source checks only; rendered layout and assistive-technology behavior need browser verification.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
