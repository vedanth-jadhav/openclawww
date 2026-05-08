#!/usr/bin/env python3
"""Create a reviewable official CBSE source manifest before download."""

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

SUBJECTS = {
    "accountancy": ("Accountancy", "055"),
    "business-studies": ("Business Studies", "054"),
    "economics": ("Economics", "030"),
    "mathematics": ("Mathematics", "041"),
    "english-core": ("English Core", "301"),
}

CBSE_SQP_PAGES = {
    "2025-26": "https://cbseacademic.nic.in/SQP_CLASSXII_2025-26.html",
    "2024-25": "https://cbseacademic.nic.in/SQP_CLASSXII_2024-25.html",
}


@dataclass
class SourceCandidate:
    subject: str
    subjectName: str
    academicSession: str
    year: int
    paperType: str
    language: str
    sourceUrl: str
    expectedFileName: str
    trustLevel: str
    status: str
    sourcePage: str


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def discover_sample_papers(limit: int | None = None) -> list[SourceCandidate]:
    candidates: list[SourceCandidate] = []
    wanted = {normalize(name): (slug, name) for slug, (name, _code) in SUBJECTS.items()}
    for session, page_url in CBSE_SQP_PAGES.items():
        response = requests.get(page_url, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        seen_urls: set[str] = set()
        for row in soup.select("tr"):
            text = " ".join(row.get_text(" ", strip=True).split())
            normalized_row = normalize(text)
            current_subject: tuple[str, str] | None = None
            for subject_key, subject in wanted.items():
                if subject_key in normalized_row:
                    current_subject = subject
                    break
            if not current_subject:
                continue
            links = row.find_all("a", href=True)
            for link in links:
                label = link.get_text(" ", strip=True).lower()
                href = urljoin(page_url, link["href"])
                if not href.lower().endswith(".pdf"):
                    continue
                if href in seen_urls:
                    continue
                if label not in {"sqp", "ms"}:
                    continue
                subject_slug, subject_name = current_subject
                if normalize(subject_name) not in normalize(href):
                    continue
                seen_urls.add(href)
                paper_type = "sample-question-paper" if label == "sqp" else "marking-scheme"
                year = int(session.split("-")[0])
                suffix = "sqp" if label == "sqp" else "marking-scheme"
                candidates.append(
                    SourceCandidate(
                        subject=subject_slug,
                        subjectName=subject_name,
                        academicSession=session,
                        year=year,
                        paperType=paper_type,
                        language="english",
                        sourceUrl=href,
                        expectedFileName=f"{subject_slug}-{session}-{suffix}.pdf",
                        trustLevel="official-cbse-academic",
                        status="discovered",
                        sourcePage=page_url,
                    )
                )
                if limit and len(candidates) >= limit:
                    return candidates
    return candidates


def build_manifest(limit: int | None, reviewed: bool) -> dict:
    candidates = discover_sample_papers(limit)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "reviewRequired": not reviewed,
        "notes": [
            "These links were scraped from CBSE Academic Class XII SQP/MS pages and still require human review before mass download.",
            "For the first trial, set reviewRequired=false only after opening the listed sourceUrl values and confirming they are official English PDFs.",
            "Old board-paper discovery should be added as a separate source family after the sample-paper importer is verified.",
        ],
        "sources": [asdict(candidate) for candidate in candidates],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--reviewed", action="store_true", help="Mark manifest as reviewed for a small manual trial only.")
    parser.add_argument("--out", type=Path, default=Path("pipeline/downloader/source_manifest.json"))
    args = parser.parse_args()

    manifest = build_manifest(args.limit, args.reviewed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote review manifest: {args.out}")
    print("Review exact official URLs before running fetch.py.")


if __name__ == "__main__":
    main()
