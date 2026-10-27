#!/usr/bin/env python3
"""Stamp the shared header into every Formula page.

Source of truth: _partials/header.html (markup), header.css, header.js, search.css, search.js.
Targets:
  - every *.html under this repo, between <!-- fh:head --> / <!-- fh:header --> markers
  - the Ghost theme (blog) partials fh-head.hbs and fh-header.hbs, if the theme folder exists
Runs from the pre-commit hook (.githooks/pre-commit); safe to run by hand. Prints changed files.
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
THEME = ROOT.parent / "ZV-Bench/tools/on-demand/ghost-blog/theme/formula-ink/partials"
SITE = "https://formulacommons.com"

# Which nav item is active, by page path. Pages not listed show no active item.
ACTIVE = {"index.html": "resources", "newsletter/index.html": "newsletter", "about/index.html": "about"}


def version():
    h = hashlib.sha1()
    for name in ("header.css", "header.js", "search.css", "search.js"):
        h.update((ROOT / name).read_bytes())
    return h.hexdigest()[:8]


def render_header(site, active):
    html = (ROOT / "_partials/header.html").read_text(encoding="utf-8").replace("{{site}}", site).rstrip("\n")
    if active:
        html = html.replace(f'data-nav="{active}" ', f'data-nav="{active}" class="active" aria-current="page" ')
    return html


def render_head(site, v):
    return (f'<link rel="stylesheet" href="{site}/header.css?v={v}">\n'
            f'<script src="{site}/header.js?v={v}" defer></script>')


def replace_block(text, name, content):
    pat = re.compile(rf"(<!-- fh:{name} -->\n)(?:.*?\n)?(<!-- /fh:{name} -->)", re.S)
    if not pat.search(text):
        return None
    return pat.sub(lambda m: m.group(1) + content + "\n" + m.group(2), text, count=1)


def write_if_changed(path, text, changed):
    old = path.read_text(encoding="utf-8") if path.exists() else None
    if old != text:
        path.write_text(text, encoding="utf-8")
        changed.append(path)


def main():
    v = version()
    changed, missing = [], []
    for page in sorted(ROOT.rglob("*.html")):
        rel = page.relative_to(ROOT).as_posix()
        if rel.startswith(("_partials/", ".git/", "node_modules/")):
            continue
        text = page.read_text(encoding="utf-8")
        out = replace_block(text, "head", render_head("", v))
        out = out and replace_block(out, "header", render_header("", ACTIVE.get(rel)))
        if out is None:
            missing.append(rel)
            continue
        write_if_changed(page, out, changed)

    if THEME.is_dir():
        write_if_changed(THEME / "fh-head.hbs", render_head(SITE, v) + "\n", changed)
        write_if_changed(THEME / "fh-header.hbs", render_header(SITE, "blog") + "\n", changed)

    for p in changed:
        print(p)
    if missing:
        print("no fh markers (header not synced): " + ", ".join(missing), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
