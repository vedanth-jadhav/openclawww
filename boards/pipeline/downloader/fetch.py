#!/usr/bin/env python3
"""Download reviewed official PDFs from source_manifest.json."""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from urllib.parse import urlparse
from zipfile import ZipFile

import requests


def is_downloadable_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and parsed.netloc and url.lower().endswith((".pdf", ".zip"))


def download(url: str, target: Path, retries: int = 3) -> tuple[bool, str]:
    if target.exists() and target.stat().st_size > 0:
        return True, "skip"
    target.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(1, retries + 1):
        try:
            response = requests.get(url, timeout=45)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            is_pdf = url.lower().endswith(".pdf") and ("pdf" in content_type.lower() or response.content.startswith(b"%PDF"))
            is_zip = url.lower().endswith(".zip") and response.content.startswith(b"PK")
            if not is_pdf and not is_zip:
                return False, "not-pdf-or-zip"
            target.write_bytes(response.content)
            return True, "downloaded"
        except requests.RequestException as exc:
            if attempt == retries:
                return False, str(exc)
            time.sleep(2 * attempt)
    return False, "failed"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=Path("pipeline/downloader/source_manifest.json"))
    parser.add_argument("--out-dir", type=Path, default=Path("pipeline/raw_pdfs"))
    parser.add_argument("--log", type=Path, default=Path("pipeline/downloader/download_log.json"))
    parser.add_argument("--extract-zips", action="store_true")
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    if manifest.get("reviewRequired"):
        raise SystemExit("Manifest is still marked reviewRequired=true. Review sources before downloading.")

    counts = {"downloaded": 0, "skip": 0, "failed": 0}
    failures = []
    for source in manifest["sources"]:
        url = source["sourceUrl"]
        subject = source["subject"]
        filename = source["expectedFileName"]
        if not is_downloadable_url(url):
            failures.append({**source, "error": "sourceUrl is not an exact PDF URL"})
            counts["failed"] += 1
            print(f"{subject} -> {filename} -> x invalid-url")
            continue
        target = args.out_dir / subject / filename
        ok, status = download(url, target)
        if ok:
            counts[status] = counts.get(status, 0) + 1
            if args.extract_zips and target.suffix.lower() == ".zip":
                extract_dir = args.out_dir / subject / target.stem
                extract_dir.mkdir(parents=True, exist_ok=True)
                with ZipFile(target) as archive:
                    archive.extractall(extract_dir)
                print(f"{subject} -> {filename} -> extracted to {extract_dir}")
            print(f"{subject} -> {filename} -> {'skip' if status == 'skip' else 'ok'}")
        else:
            counts["failed"] += 1
            failures.append({**source, "error": status})
            print(f"{subject} -> {filename} -> x {status}")

    args.log.write_text(json.dumps({"counts": counts, "failures": failures}, indent=2), encoding="utf-8")
    print(f"Wrote {args.log}")


if __name__ == "__main__":
    main()
