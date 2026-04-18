#!/usr/bin/env python3
"""
Drip-publish blog articles from docs/blog/drafts/ to docs/blog/.

Reads scripts/publish-schedule.json, finds entries whose publish_date is today
or earlier and that haven't been marked published, then for each:
  1. Moves the draft HTML to docs/blog/ (stripping the noindex meta tag)
  2. Inserts a card at the top of docs/blog/index.html#posts-grid
  3. Appends a <url> entry to docs/sitemap.xml
  4. Marks the schedule entry as published

Run manually: python scripts/publish-next-article.py
Run via GitHub Actions: see .github/workflows/publish-blog.yml
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DRAFTS_DIR = REPO_ROOT / "docs" / "blog" / "drafts"
BLOG_DIR = REPO_ROOT / "docs" / "blog"
INDEX_FILE = BLOG_DIR / "index.html"
SITEMAP_FILE = REPO_ROOT / "docs" / "sitemap.xml"
SCHEDULE_FILE = REPO_ROOT / "scripts" / "publish-schedule.json"
BASE_URL = "https://smythmyke.github.io/BulkListingPro/blog"


def format_date(iso_date: str) -> str:
    """2026-04-20 -> April 20, 2026 (cross-platform)."""
    dt = datetime.strptime(iso_date, "%Y-%m-%d")
    return f"{dt.strftime('%B')} {dt.day}, {dt.year}"


def move_draft_to_blog(entry: dict) -> bool:
    slug = entry["slug"]
    src = DRAFTS_DIR / f"{slug}.html"
    dest = BLOG_DIR / f"{slug}.html"

    if not src.exists():
        print(f"ERROR: draft not found: {src}", file=sys.stderr)
        return False

    if dest.exists():
        print(f"ERROR: destination already exists: {dest}", file=sys.stderr)
        return False

    with open(src, "r", encoding="utf-8") as f:
        content = f.read()

    # Strip the noindex meta tag so Google crawls the published article
    content = re.sub(
        r'\s*<meta name="robots" content="noindex, nofollow">\n',
        "\n",
        content,
        count=1,
    )

    with open(dest, "w", encoding="utf-8") as f:
        f.write(content)

    os.remove(src)
    print(f"Moved draft: {slug}.html")
    return True


def build_card(entry: dict) -> str:
    slug = entry["slug"]
    title = entry["title"]
    description = entry["description"]
    archetype = entry["archetype"]
    read_time = entry["read_time"]
    publish_date = format_date(entry["publish_date"])

    return f'''
        <a href="{slug}.html" class="group block rounded-2xl border border-gray-200 hover:border-brand-300 hover:shadow-lg transition-all overflow-hidden bg-white">
          <div class="aspect-[16/9] bg-gradient-to-br from-brand-500 to-amber-500 flex items-center justify-center p-6 text-center">
            <span class="text-white font-extrabold text-lg leading-snug">{title}</span>
          </div>
          <div class="p-5">
            <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-500 mb-2">
              <span>{archetype}</span>
              <span class="text-gray-300">&middot;</span>
              <span class="text-gray-500">{read_time}</span>
            </div>
            <h3 class="text-lg font-bold text-gray-900 group-hover:text-brand-500 transition-colors">{title}</h3>
            <p class="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
            <p class="mt-4 text-xs text-gray-500">{publish_date}</p>
          </div>
        </a>
'''


def update_index(entry: dict) -> bool:
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    marker = '<div id="posts-grid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">'
    if marker not in content:
        print("ERROR: posts-grid marker not found in index.html", file=sys.stderr)
        return False

    # Insert the new card immediately after the opening marker (newest first)
    content = content.replace(marker, marker + build_card(entry), 1)

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        f.write(content)
    return True


def update_sitemap(entry: dict) -> bool:
    with open(SITEMAP_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    slug = entry["slug"]
    publish_date = entry["publish_date"]
    url_block = (
        f"  <url>\n"
        f"    <loc>{BASE_URL}/{slug}.html</loc>\n"
        f"    <lastmod>{publish_date}</lastmod>\n"
        f"    <changefreq>monthly</changefreq>\n"
        f"    <priority>0.7</priority>\n"
        f"  </url>\n"
    )

    if f"{BASE_URL}/{slug}.html" in content:
        print(f"  sitemap already contains {slug}, skipping")
        return True

    if "</urlset>" not in content:
        print("ERROR: sitemap missing </urlset>", file=sys.stderr)
        return False

    content = content.replace("</urlset>", url_block + "</urlset>", 1)

    with open(SITEMAP_FILE, "w", encoding="utf-8") as f:
        f.write(content)
    return True


def main() -> int:
    today = datetime.now(timezone.utc).date()

    with open(SCHEDULE_FILE, "r", encoding="utf-8") as f:
        schedule = json.load(f)

    due = [
        entry
        for entry in schedule
        if not entry.get("published", False)
        and datetime.strptime(entry["publish_date"], "%Y-%m-%d").date() <= today
    ]

    if not due:
        print("No articles due today.")
        return 0

    print(f"Found {len(due)} article(s) due for publication.")
    published = 0
    for entry in due:
        print(f"\nPublishing: {entry['slug']} (scheduled {entry['publish_date']})")
        if not move_draft_to_blog(entry):
            continue
        if not update_index(entry):
            print(f"  WARNING: index update failed for {entry['slug']}")
        if not update_sitemap(entry):
            print(f"  WARNING: sitemap update failed for {entry['slug']}")
        entry["published"] = True
        entry["published_at"] = today.isoformat()
        published += 1

    with open(SCHEDULE_FILE, "w", encoding="utf-8") as f:
        json.dump(schedule, f, indent=2)
        f.write("\n")

    print(f"\nPublished {published} article(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
