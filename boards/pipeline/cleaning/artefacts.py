"""Known text artefacts produced by CBSE PDF extraction."""

from __future__ import annotations

import re


STANDALONE_PATTERNS = [
    re.compile(r"^\s*\d+\s*$"),
    re.compile(r"^\s*page\s+no\.?\s*\d+\s*$", re.IGNORECASE),
    re.compile(r"^\s*page\s+\d+\s+of\s+\d+\s*$", re.IGNORECASE),
    re.compile(r"^\s*section\s+[a-e]\s*$", re.IGNORECASE),
    re.compile(r"^\s*sample\s+question\s+paper\s*$", re.IGNORECASE),
    re.compile(r"^\s*cbse\s*$", re.IGNORECASE),
    re.compile(r"^\s*www\.cbse\.gov\.in\s*$", re.IGNORECASE),
]

INLINE_PATTERNS = [
    re.compile(r"\bP\.T\.O\.\b", re.IGNORECASE),
    re.compile(r"\bCBSE\s+20\d{2}-\d{2}\s+Sample\s+Paper\b", re.IGNORECASE),
]


def clean_artefacts(value: str) -> str:
    lines = []
    for line in value.replace("\u00a0", " ").splitlines():
        if any(pattern.search(line) for pattern in STANDALONE_PATTERNS):
            continue
        next_line = line
        for pattern in INLINE_PATTERNS:
            next_line = pattern.sub(" ", next_line)
        next_line = re.sub(r"[ \t]+", " ", next_line).strip()
        if next_line:
            lines.append(next_line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
