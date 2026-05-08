#!/usr/bin/env python3
"""Extract reviewable question JSON from downloaded official PDFs."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import pdfplumber
from pypdf import PdfReader


def clean_text(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()

def is_hindi_or_mojibake_line(value: str) -> bool:
    if not value:
        return False
    non_ascii = sum(1 for char in value if ord(char) > 127)
    ascii_letters = sum(1 for char in value if char.isascii() and char.isalpha())
    if non_ascii / max(1, len(value)) > 0.18 and ascii_letters / max(1, len(value)) < 0.45:
        return True
    markers = ["{", "}", "H$", "Ed§", "Am¡a", "à", "ñ", "ë", "ì", "Û", "Ý", "þ"]
    return any(marker in value for marker in markers)

def strip_page_noise(value: str) -> str:
    value = re.sub(r"\b666\b", " ", value)
    value = re.sub(r"\b\d{2}/\d/\d(?:-\d+)?\s+Page\s+\d+\s+of\s+\d+\s*(?:P\.T\.O\.)?", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"\b\d{2}/\d/\d\s*#\s*\d+\s*#\s*(?:P\.T\.O\.)?", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"\bPage\s+\d+\s+of\s+\d+\s*(?:P\.T\.O\.)?", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"\bP\.T\.O\.\b", " ", value, flags=re.IGNORECASE)
    return clean_text(value)

def is_non_english_page(value: str) -> bool:
    markers = sum(value.count(marker) for marker in ["{", "}", "H$", "à", "Û", "Ý", "þ"])
    if markers >= 3:
        return True
    english_words = re.findall(r"\b[A-Za-z]{3,}\b", value)
    question_like_numbers = len(re.findall(r"^\s*\d{1,2}[.)]\s+", value, flags=re.MULTILINE))
    return question_like_numbers >= 2 and len(english_words) < 15


def question_type(text: str, marks: int) -> str:
    lowered = text.lower()
    if marks == 1 and (re.search(r"(?:^|\s)(?:\(?[A-D]\)|[A-D]\.)\s+", text) or "options:" in lowered):
      return "mcq"
    if any(word in lowered for word in ["calculate", "journal", "prepare", "draw", "numerical"]):
      return "numerical"
    if marks >= 5:
      return "long-answer"
    return "short-answer"


def extract_pdf_text(pdf_path: Path) -> tuple[str, float]:
    try:
        with pdfplumber.open(pdf_path) as pdf:
            pages = []
            empty_pages = 0
            for page in pdf.pages:
                text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
                if is_non_english_page(text):
                    pages.append("")
                    continue
                if len(text.strip()) < 80:
                    empty_pages += 1
                pages.append(text)
            confidence = 0.95 if empty_pages == 0 else max(0.35, 1 - empty_pages / max(1, len(pdf.pages)))
            return clean_text("\n".join(pages)), confidence
    except Exception:
        reader = PdfReader(str(pdf_path))
        pages = []
        empty_pages = 0
        for page in reader.pages:
            text = page.extract_text() or ""
            if len(text.strip()) < 80:
                empty_pages += 1
            pages.append(text)
        confidence = 0.95 if empty_pages == 0 else max(0.35, 1 - empty_pages / max(1, len(reader.pages)))
        return clean_text("\n".join(pages)), confidence

def infer_marks(question_number: str, fallback: int) -> int:
    number = int(question_number)
    if 1 <= number <= 16 or 27 <= number <= 30:
        return 1
    if 17 <= number <= 20 or 31 <= number <= 32:
        return 3
    if number in {21, 22, 33}:
        return 4
    if 23 <= number <= 26 or number == 34:
        return 6
    return fallback

def parse_marks(value: str, fallback: int = 1) -> int:
    marks = [int(match) for match in re.findall(r"\b([1-6])\b", value or "")]
    if marks:
        return sum(marks)
    return fallback

def markdown_table(rows: list[list[str | None]]) -> str:
    clean_rows = [[clean_text(cell or "") for cell in row] for row in rows]
    clean_rows = [row for row in clean_rows if any(row)]
    if len(clean_rows) < 2:
        return ""
    width = max(len(row) for row in clean_rows)
    padded = [row + [""] * (width - len(row)) for row in clean_rows]
    header = padded[0]
    separator = ["---"] * width
    body = padded[1:]
    def line(row: list[str]) -> str:
        return "| " + " | ".join(cell.replace("\n", "<br />") for cell in row) + " |"
    return "\n".join([line(header), line(separator), *[line(row) for row in body]])

def table_overlaps_cell(table_bbox: tuple[float, float, float, float], cell_bbox: tuple[float, float, float, float]) -> bool:
    tx0, ty0, tx1, ty1 = table_bbox
    cx0, cy0, cx1, cy1 = cell_bbox
    return tx0 >= cx0 - 2 and tx1 <= cx1 + 2 and ty0 >= cy0 - 2 and ty1 <= cy1 + 2

def crop_asset(page, bbox: tuple[float, float, float, float], asset_dir: Path, public_prefix: str, stem: str) -> str:
    asset_dir.mkdir(parents=True, exist_ok=True)
    safe_stem = re.sub(r"[^a-z0-9-]+", "-", stem.lower()).strip("-")
    out_path = asset_dir / f"{safe_stem}.png"
    page.crop(bbox).to_image(resolution=160).save(out_path)
    return f"{public_prefix}/{out_path.name}"

def graphic_zones(page, cell_bbox: tuple[float, float, float, float]) -> list[tuple[float, float, float, float]]:
    x0, y0, x1, y1 = cell_bbox
    objects = [
        obj for obj in [*page.rects, *page.curves, *page.images]
        if obj.get("x0", 0) >= x0 + 4
        and obj.get("x1", 0) <= x1 - 4
        and obj.get("top", 0) >= y0 + 4
        and obj.get("bottom", 0) <= y1 - 4
        and (obj.get("width", 0) > 8 or obj.get("height", 0) > 8)
    ]
    meaningful = [
        obj for obj in objects
        if obj.get("width", 0) > 16
        and obj.get("height", 0) > 10
        and obj.get("non_stroking_color") not in (0, 0.0, None)
    ]
    if not meaningful:
        return []
    zx0 = max(x0 + 4, min(obj["x0"] for obj in meaningful) - 20)
    zy0 = max(y0 + 4, min(obj["top"] for obj in meaningful) - 35)
    zx1 = min(x1 - 4, max(obj["x1"] for obj in meaningful) + 20)
    zy1 = min(y1 - 4, max(obj["bottom"] for obj in meaningful) + 28)
    if zy1 - zy0 < 35 or zx1 - zx0 < 80:
        return []
    return [(zx0, zy0, zx1, zy1)]

def line_in_zone(line: str, words: list[dict], zone: tuple[float, float, float, float]) -> bool:
    if not line:
        return False
    zx0, zy0, zx1, zy1 = zone
    matching = [word for word in words if word["text"] in line]
    if not matching:
        return False
    inside = [
        word for word in matching
        if float(word["x0"]) >= zx0 and float(word["x1"]) <= zx1 and float(word["top"]) >= zy0 and float(word["bottom"]) <= zy1
    ]
    return len(inside) >= max(1, len(matching) // 2)

def text_with_embeds(
    page,
    cell_bbox: tuple[float, float, float, float],
    raw_text: str,
    tables: list,
    asset_dir: Path,
    public_prefix: str,
    paper_stem: str,
    question_number: str,
) -> str:
    embeds: list[tuple[float, str, tuple[float, float, float, float]]] = []
    nested_tables = [
        table for table in tables
        if table_overlaps_cell(table.bbox, cell_bbox)
        and (table.bbox[2] - table.bbox[0]) < (cell_bbox[2] - cell_bbox[0]) - 20
    ]
    nested_table_lines: set[str] = set()
    for index, table in enumerate(nested_tables):
        for row in table.extract():
            for cell in row:
                for cell_line in clean_text(cell or "").splitlines():
                    if cell_line.strip():
                        nested_table_lines.add(cell_line.strip())
        table_md = markdown_table(table.extract())
        if table_md:
            embeds.append((table.bbox[1], table_md, table.bbox))

    for index, zone in enumerate(graphic_zones(page, cell_bbox)):
        asset_url = crop_asset(page, zone, asset_dir, public_prefix, f"{paper_stem}-q{question_number}-figure-{index + 1}")
        embeds.append((zone[1], f"![Question {question_number} figure]({asset_url})", zone))

    if not embeds:
        return strip_page_noise(raw_text)

    words = page.crop(cell_bbox).extract_words(x_tolerance=1, y_tolerance=3)
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    output: list[str] = []
    inserted: set[int] = set()
    passed_options = False
    skipping_raw_table = False
    for line in lines:
        if line.lower().startswith("options:"):
            passed_options = True
            skipping_raw_table = False
        if nested_table_lines and line.strip() in nested_table_lines:
            continue
        if nested_tables and not passed_options and (re.fullmatch(r"(?:Column\s+[IVX]+\s*)+", line) or re.match(r"^\([a-z]\)\s+", line)):
            skipping_raw_table = True
        if skipping_raw_table:
            continue
        line_top = None
        for word in words:
            if word["text"] in line:
                line_top = float(word["top"])
                break
        for embed_index, (top, markdown, _bbox) in enumerate(embeds):
            if embed_index not in inserted and line_top is not None and line_top > top:
                output.append(markdown)
                inserted.add(embed_index)
        if (
            not passed_options
            and line_top is not None
            and any(markdown.startswith("|") and embed_index in inserted and line_top > top for embed_index, (top, markdown, _bbox) in enumerate(embeds))
        ):
            continue
        if not passed_options and line_top is not None and any(bbox[1] - 2 <= line_top <= bbox[3] + 2 for _top, _markdown, bbox in embeds):
            continue
        output.append(line)
    for embed_index, (_top, markdown, _bbox) in enumerate(embeds):
        if embed_index not in inserted:
            output.append(markdown)
    return strip_page_noise("\n".join(output))

def extract_questions_from_pdf_tables(pdf_path: Path, asset_dir: Path | None = None, public_prefix: str = "/extracted-assets") -> list[dict]:
    questions: list[dict] = []
    current: dict | None = None
    asset_dir = asset_dir or Path("public/extracted-assets")
    paper_stem = pdf_path.stem
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.find_tables()
            for table in tables:
                if any(
                    other is not table
                    and other.bbox[0] <= table.bbox[0] + 1
                    and other.bbox[1] <= table.bbox[1] + 1
                    and other.bbox[2] >= table.bbox[2] - 1
                    and other.bbox[3] >= table.bbox[3] - 1
                    for other in tables
                ):
                    continue
                if len(table.rows) < 1:
                    continue
                data = table.extract()
                for row_index, row in enumerate(table.rows):
                    cells = row.cells
                    row_data = data[row_index] if row_index < len(data) else []
                    if len(cells) < 3 or len(row_data) < 3:
                        continue
                    number_cell = clean_text(row_data[0] or "")
                    text_cell = clean_text(row_data[1] or "")
                    marks_cell = clean_text(row_data[-1] or "")
                    number_match = re.search(r"\b([1-5]?\d|60)\b", number_cell)
                    is_continuation = not number_match and current and text_cell
                    if not number_match and not is_continuation:
                        continue
                    content_cell_bbox = cells[1]
                    if not content_cell_bbox:
                        continue
                    if is_continuation:
                        current["text"] = clean_text(f"{current['text']}\n{text_with_embeds(page, content_cell_bbox, text_cell, tables, asset_dir, public_prefix, paper_stem, current['questionNumber'])}")
                        if marks_cell:
                            current["marks"] = parse_marks(marks_cell, current["marks"])
                            current["questionType"] = question_type(current["text"], current["marks"])
                        continue
                    number = number_match.group(1)
                    if int(number) < 1 or int(number) > 60:
                        continue
                    text = text_with_embeds(page, content_cell_bbox, text_cell, tables, asset_dir, public_prefix, paper_stem, number)
                    if len(text) < 20:
                        continue
                    marks = parse_marks(marks_cell, 1)
                    question = {
                        "questionNumber": number,
                        "text": text,
                        "marks": marks,
                        "questionType": question_type(text, marks),
                        "confidence": 0.9 if marks_cell else 0.72,
                        "needsReview": not bool(marks_cell),
                    }
                    questions.append(question)
                    current = question
    deduped: list[dict] = []
    seen = set()
    for question in questions:
        key = (question["questionNumber"], question["text"][:120])
        if key not in seen:
            deduped.append(question)
            seen.add(key)
    return deduped


def split_questions(text: str, strict_numbering: bool = False) -> list[dict]:
    raw_lines = [line.strip() for line in text.splitlines() if line.strip()]
    lines = [
        strip_page_noise(line)
        for line in raw_lines
        if not re.match(r"^page\s+\d+\s+of\s+\d+$", line, re.IGNORECASE)
        and "assessment scheme of the academic session" not in line.lower()
        and not is_hindi_or_mojibake_line(line)
        and line.strip() != "666"
    ]
    lines = [line for line in lines if line]
    scan_from = 0
    for index, line in enumerate(lines):
        normalized = re.sub(r"[^a-z0-9]+", "", line.lower())
        if normalized in {"sno", "sn", "qn", "qno"} or ("section" in normalized and "marks" in normalized):
            scan_from = index + 1
            break
        if normalized == "parta":
            scan_from = index + 1
            break
    candidate_starts: list[tuple[int, str]] = []
    for index, line in enumerate(lines[scan_from:], start=scan_from):
        match = re.match(r"^(?:Q\.?\s*)?(\d{1,2})[.)]\s+(.+)", line, re.IGNORECASE)
        if not match and not strict_numbering:
            match = re.match(r"^(?:Q\.?\s*)?(\d{1,2})\s+([A-Z\"'“].+)", line)
        if match and 1 <= int(match.group(1)) <= 60:
            candidate_starts.append((index, match.group(1)))
    question_starts = []
    last_number = 0
    for index, number_text in candidate_starts:
        number = int(number_text)
        if strict_numbering:
            option_restart = last_number >= 33 and 27 <= number <= 34
            if question_starts and number <= last_number and not option_restart:
                continue
            if option_restart:
                last_number = number
                question_starts.append((index, number_text))
                continue
        last_number = number
        question_starts.append((index, number_text))
    questions: list[dict] = []
    for pos, (start, number) in enumerate(question_starts):
        end = question_starts[pos + 1][0] if pos + 1 < len(question_starts) else min(len(lines), start + 24)
        block = clean_text("\n".join(lines[start:end]))
        block = strip_page_noise(block)
        if len(block) < 25:
            continue
        lowered_block = block.lower()
        if any(
            phrase in lowered_block
            for phrase in [
                "this question paper contains",
                "this question paper is divided",
                "all questions are compulsory",
                "questions from",
                "question 1 to",
                "there is no overall choice",
            ]
        ):
            continue
        marks_match = re.search(r"(?:marks?\s*[:\-]?\s*|[\|\s])([1-6])\s*$", block, re.IGNORECASE)
        marks = int(marks_match.group(1)) if marks_match else 1
        questions.append(
            {
                "questionNumber": number,
                "text": block,
                "marks": marks,
                "questionType": question_type(block, marks),
                "confidence": 0.72 if marks_match else 0.58,
                "needsReview": not bool(marks_match),
            }
        )
    deduped: list[dict] = []
    seen = set()
    for question in questions:
        key = (question["questionNumber"], question["text"][:80])
        if key not in seen:
            deduped.append(question)
            seen.add(key)
    return deduped


def split_marking_scheme(text: str) -> dict[str, str]:
    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
        and not re.match(r"^page\s+\d+\s+of\s+\d+$", line.strip(), re.IGNORECASE)
        and "marking scheme" not in line.lower()
    ]
    starts: list[tuple[int, str]] = []
    for index, line in enumerate(lines):
        match = re.match(r"^(\d{1,2})\.\s+(.+)", line)
        if match and 1 <= int(match.group(1)) <= 60:
            starts.append((index, match.group(1)))
    answers: dict[str, str] = {}
    for pos, (start, number) in enumerate(starts):
        end = starts[pos + 1][0] if pos + 1 < len(starts) else min(len(lines), start + 80)
        block = clean_text("\n".join(lines[start:end]))
        block = re.sub(r"\n?[1-6]\s*$", "", block).strip()
        if number not in answers:
            answers[number] = block
    return answers


def load_manifest(manifest_path: Path) -> dict:
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def paper_id(source: dict) -> str:
    suffix = "sqp" if source["paperType"] == "sample-question-paper" else "ms"
    return f"{source['subject']}-{source.get('academicSession', source['year'])}-{suffix}"

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw-dir", type=Path, default=Path("pipeline/raw_pdfs"))
    parser.add_argument("--manifest", type=Path, default=Path("pipeline/downloader/source_manifest.json"))
    parser.add_argument("--out-dir", type=Path, default=Path("pipeline/extracted"))
    args = parser.parse_args()

    manifest = load_manifest(args.manifest)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    report = {"papers": 0, "questions": 0, "needsReview": 0, "skipped": []}
    marking_schemes: dict[str, dict[str, str]] = {}
    for source in manifest["sources"]:
        if source["paperType"] != "marking-scheme":
            continue
        pdf_path = args.raw_dir / source["subject"] / source["expectedFileName"]
        if not pdf_path.exists():
            continue
        text, _confidence = extract_pdf_text(pdf_path)
        marking_schemes[source["subject"]] = split_marking_scheme(text)

    for source in manifest["sources"]:
        if source["paperType"] not in {"sample-question-paper", "board-paper"}:
            continue
        pdf_path = args.raw_dir / source["subject"] / source["expectedFileName"]
        if not pdf_path.exists():
            report["skipped"].append({"file": str(pdf_path), "reason": "missing"})
            continue
        text, base_confidence = extract_pdf_text(pdf_path)
        table_questions = extract_questions_from_pdf_tables(pdf_path, Path("public/extracted-assets"))
        questions = table_questions if len(table_questions) >= 5 else split_questions(text)
        official_answers = marking_schemes.get(source["subject"], {})
        for question in questions:
            question["confidence"] = round(min(question["confidence"], base_confidence), 2)
            question["needsReview"] = question["needsReview"] or base_confidence < 0.8
            question["officialAnswer"] = official_answers.get(question["questionNumber"])
        extracted = {
            "paper": {
                "id": paper_id(source),
                "subject": source["subject"],
                "subjectName": source.get("subjectName", source["subject"].replace("-", " ").title()),
                "year": source["year"],
                "setName": source.get("academicSession", str(source["year"])),
                "paperType": source["paperType"],
                "sourceUrl": source["sourceUrl"],
                "filePath": str(pdf_path),
                "language": source["language"],
                "trustLevel": source["trustLevel"],
            },
            "questions": questions,
            "extraction": {
                "method": "pypdf-native-text",
                "textConfidence": round(base_confidence, 2),
                "reviewNote": "Native parser only. Use MinerU for any tables, formulas, diagrams, or low-confidence blocks before mass import.",
            },
        }
        subject_dir = args.out_dir / source["subject"]
        subject_dir.mkdir(parents=True, exist_ok=True)
        out_file = subject_dir / f"{paper_id(source)}.json"
        out_file.write_text(json.dumps(extracted, indent=2, ensure_ascii=False), encoding="utf-8")
        report["papers"] += 1
        report["questions"] += len(questions)
        report["needsReview"] += sum(1 for question in questions if question["needsReview"])
        print(f"extracted {len(questions):>2} questions -> {out_file}")
    (args.out_dir / "extraction_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote extraction report: {args.out_dir / 'extraction_report.json'}")


if __name__ == "__main__":
    main()
