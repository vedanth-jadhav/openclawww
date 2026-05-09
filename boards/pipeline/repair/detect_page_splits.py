#!/usr/bin/env python3
"""Detect page-boundary split candidates in the Boards SQLite database."""

from __future__ import annotations

import argparse
import csv
import re
import sqlite3
from pathlib import Path


DB = Path("data/boards.sqlite")
AUDIT = Path("audit")


def score_pair(a: dict, b: dict) -> int:
    score = 0
    a_text = (a["markdown"] or "").strip()
    b_text = (b["markdown"] or "").strip()
    if re.match(r"^[a-z]", b_text):
        score += 3
    if a_text and not re.search(r"[.?:)]$", a_text):
        score += 3
    if re.match(r"^\(?ii\)|^\(?b\)", b_text, flags=re.IGNORECASE):
        score += 2
    if a["marks"] is None and b["marks"] is not None:
        score += 2
    if not b["source_q_number"]:
        score += 2
    if a["question_type"] != b["question_type"]:
        score += 1
    if b["source_q_number"] and re.match(r"^\d+", b["source_q_number"]):
        score -= 2
    return score


def rows(conn: sqlite3.Connection) -> list[dict]:
    conn.row_factory = sqlite3.Row
    return [
        dict(row)
        for row in conn.execute(
            """
            SELECT q.id, q.markdown, q.question_type, q.marks, q.status, q.source_q_number,
                   q.split_score, q.merged_into_id, o.paper_id, o.question_number
            FROM questions q
            LEFT JOIN question_occurrences o ON o.question_id = q.id
            WHERE COALESCE(q.status, 'active') = 'active'
            ORDER BY o.paper_id, CAST(o.question_number AS INTEGER), q.id
            """
        )
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["detect", "verify"], default="detect")
    args = parser.parse_args()
    conn = sqlite3.connect(DB)
    data = rows(conn)
    candidates = []
    for a, b in zip(data, data[1:]):
        if a.get("paper_id") != b.get("paper_id"):
            continue
        score = score_pair(a, b)
        if score >= 2:
            candidates.append((a, b, score))

    AUDIT.mkdir(exist_ok=True)
    with (AUDIT / "page_split_candidates.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["q_a_id", "q_b_id", "score", "auto_merged"])
        for a, b, score in candidates:
            writer.writerow([a["id"], b["id"], score, b["status"] == "page_split_merged"])

    if args.mode == "verify":
        unmerged = [item for item in candidates if item[2] >= 4 and item[1]["status"] != "page_split_merged"]
        report = f"score_4_plus_unmerged={len(unmerged)}\npage_split_candidates={len(candidates)}\n"
        (AUDIT / "page_split_verification.txt").write_text(report, encoding="utf-8")
        if unmerged:
            raise SystemExit(report)
        print(report.strip())
    else:
        print(f"page split candidates: {len(candidates)}")


if __name__ == "__main__":
    main()
