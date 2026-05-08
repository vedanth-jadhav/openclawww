#!/usr/bin/env python3
"""Discover official CBSE previous-year board-paper bundles."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

CBSE_QUESTION_PAPER_PAGE = "https://www.cbse.gov.in/cbsenew/question-paper.html"


@dataclass
class SourceCandidate:
    subject: str
    subjectName: str
    year: int
    paperType: str
    language: str
    sourceUrl: str
    expectedFileName: str
    trustLevel: str
    status: str
    sourcePage: str


def discover_accountancy(years: set[int]) -> list[SourceCandidate]:
    response = requests.get(CBSE_QUESTION_PAPER_PAGE, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    sources: list[SourceCandidate] = []
    for link in soup.find_all("a", href=True):
        row = link.find_parent("tr")
        row_text = " ".join(row.get_text(" ", strip=True).split()) if row else ""
        href = urljoin(CBSE_QUESTION_PAPER_PAGE, link["href"])
        match = re.search(r"/question-paper/(\d{4})/XII/ACCOUNTANCY\.zip", href, re.IGNORECASE)
        if not match or "ACCOUNTANCY" not in row_text:
            continue
        year = int(match.group(1))
        if year not in years:
            continue
        sources.append(
            SourceCandidate(
                subject="accountancy",
                subjectName="Accountancy",
                year=year,
                paperType="board-paper-bundle",
                language="english",
                sourceUrl=href,
                expectedFileName=f"accountancy-{year}-official-board-bundle.zip",
                trustLevel="official-cbse",
                status="discovered",
                sourcePage=CBSE_QUESTION_PAPER_PAGE,
            )
        )
    return sorted(sources, key=lambda source: source.year, reverse=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--years", default="2025,2024")
    parser.add_argument("--reviewed", action="store_true")
    parser.add_argument("--out", type=Path, default=Path("pipeline/downloader/accountancy_board_manifest.json"))
    args = parser.parse_args()

    years = {int(year.strip()) for year in args.years.split(",") if year.strip()}
    sources = discover_accountancy(years)
    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "reviewRequired": not args.reviewed,
        "notes": [
            "Official CBSE previous-year Class XII Accountancy ZIP bundles. Each bundle can contain many set/region PDFs.",
            "Keep this as a trial manifest until extracted PDFs and set codes are reviewed.",
        ],
        "sources": [asdict(source) for source in sources],
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote board-paper manifest: {args.out}")
    print(f"Discovered {len(sources)} official Accountancy bundle(s).")


if __name__ == "__main__":
    main()
