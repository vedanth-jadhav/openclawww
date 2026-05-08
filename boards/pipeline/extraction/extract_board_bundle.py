#!/usr/bin/env python3
"""Extract official CBSE board-paper bundle PDFs into app import JSON."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from extract import extract_pdf_text, split_questions

SOURCE_URLS = {
    2025: "https://www.cbse.gov.in/cbsenew/question-paper/2025/XII/ACCOUNTANCY.zip",
    2024: "https://www.cbse.gov.in/cbsenew/question-paper/2024/XII/ACCOUNTANCY.zip",
}


def year_from_path(path: Path) -> int:
    match = re.search(r"accountancy-(20\d{2})-official-board-bundle", str(path), re.IGNORECASE)
    if not match:
        raise ValueError(f"Could not infer year from {path}")
    return int(match.group(1))


def set_code(path: Path) -> str:
    return path.stem.replace("_Accountancy", "").replace("-Accountancy", "")


def paper_id(year: int, code: str) -> str:
    return f"accountancy-{year}-{code.lower().replace('_', '-').replace(' ', '-')}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-dir", type=Path, default=Path("pipeline/raw_official_board/accountancy"))
    parser.add_argument("--out-dir", type=Path, default=Path("pipeline/extracted/accountancy_board"))
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    report = {"papers": 0, "questions": 0, "needsReview": 0, "skipped": []}
    for pdf_path in sorted(args.raw_dir.rglob("*.pdf")):
        try:
            year = year_from_path(pdf_path)
            code = set_code(pdf_path)
            text, base_confidence = extract_pdf_text(pdf_path)
            questions = split_questions(text, strict_numbering=True)
            for question in questions:
                question["confidence"] = round(min(question["confidence"], base_confidence), 2)
                question["needsReview"] = question["needsReview"] or base_confidence < 0.8
            extracted = {
                "paper": {
                    "id": paper_id(year, code),
                    "subject": "accountancy",
                    "subjectName": "Accountancy",
                    "year": year,
                    "setName": code,
                    "paperType": "board-paper",
                    "sourceUrl": SOURCE_URLS.get(year, "https://www.cbse.gov.in/cbsenew/question-paper.html"),
                    "filePath": str(pdf_path),
                    "language": "english",
                    "trustLevel": "official-cbse",
                },
                "questions": questions,
                "extraction": {
                    "method": "pypdf-native-text",
                    "textConfidence": round(base_confidence, 2),
                    "reviewNote": "Official CBSE board paper bundle. Native extraction; needs spot review before 10-year mass ingestion.",
                },
            }
            out_file = args.out_dir / f"{paper_id(year, code)}.json"
            out_file.write_text(json.dumps(extracted, indent=2, ensure_ascii=False), encoding="utf-8")
            report["papers"] += 1
            report["questions"] += len(questions)
            report["needsReview"] += sum(1 for question in questions if question["needsReview"])
            print(f"extracted {len(questions):>2} questions -> {out_file}")
        except Exception as exc:
            report["skipped"].append({"file": str(pdf_path), "reason": str(exc)})
            print(f"skipped {pdf_path}: {exc}")

    report_path = args.out_dir / "board_extraction_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote board extraction report: {report_path}")


if __name__ == "__main__":
    main()
