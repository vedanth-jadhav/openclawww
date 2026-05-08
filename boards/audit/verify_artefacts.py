#!/usr/bin/env python3
"""Verify that active question text no longer contains known extraction artefacts."""

from __future__ import annotations

import sqlite3
from pathlib import Path


DB = Path("data/boards.sqlite")
PATTERNS = ["CBSE", "Sample Question Paper", "www.cbse", "Page No"]


def main() -> None:
    conn = sqlite3.connect(DB)
    rows = conn.execute(
        "SELECT id, markdown FROM questions WHERE COALESCE(status, 'active') NOT IN ('duplicate', 'page_split_merged')"
    ).fetchall()
    violations = [(qid, text) for qid, text in rows if any(pattern in (text or "") for pattern in PATTERNS)]
    if violations:
        raise AssertionError(f"{len(violations)} questions still contain artefacts")
    print("artefact verification passed: 0 violations")


if __name__ == "__main__":
    main()
