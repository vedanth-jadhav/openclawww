## OBJECTIVE

You are an autonomous agent working inside the **Boards** codebase — a local-first Class 12 Commerce PYQ intelligence app (Next.js + SQLite + Drizzle + Python pipeline). Your mission is to audit, fix, and verify **every category of question quality issue** across all subjects: Accountancy, Business Studies, Economics, Mathematics, and English.

Work methodically. Do not stop until every verification gate below passes. You are expected to run for multiple hours. Commit fixes in logical atomic batches. Never skip a verification step.

---

## CONTEXT

Questions are imported from CBSE PDFs via a Python extraction pipeline into a SQLite database. Extracted questions suffer from:

- Broken formatting due to PDF → text conversion (columns, tables, graphs described as gibberish)
- Images embedded in questions that were either dropped or stored as raw paths without render logic
- OCR-able image questions (diagrams, graphs, balance sheets) that need alt-text or structured data
- Duplicate questions from overlapping source PDFs
- Assertion-Reason pairs split incorrectly across rows
- MCQ options merged into question stem or split across multiple rows
- Marks metadata missing, wrong, or mismatched to question type
- Chapter/topic stuck at `Needs classification` when classifiable from text
- Mixed-language artefacts (Hindi watermarks, header/footer bleed into question text)

---

## SUBJECTS & QUESTION TYPES IN SCOPE

| Subject | Special Types |
|---|---|
| Accountancy | Tables (T-accounts, balance sheets), multi-part journal entries, image-based financial statements, numericals, match-the-following, OR questions, distinguish-between |
| Business Studies | Case-study paragraphs, CBQ, multi-part, Assertion-Reason, True/False, Fill-in-the-blank, OR questions, match-the-following |
| Economics | Graphs (demand/supply curves), data-interpretation tables, Assertion-Reason, numericals, source-based CBQ, OR questions, fill-in-the-blank |
| Mathematics | LaTeX equations, multi-part numericals, graph-based, matrix questions, OR questions |
| English | Reading comprehension, note-making, letter writing, article/speech/report, notice/advertisement, integrated grammar (gap-fill/editing/omission/rearrangement), poetry & prose extracts, OR questions |

---

## PHASE 1 — CODEBASE AUDIT (read-only)

Before touching anything, build a full picture:

```
1. Read schema:         drizzle/schema.ts (or schema.sql)
2. Read importer:       pipeline/import/ or bun run db:import entry
3. Read extractor:      pipeline/extraction/extract.py
4. Sample the DB:       SELECT * FROM questions LIMIT 40;
5. Count by type:       SELECT question_type, COUNT(*) FROM questions GROUP BY question_type;
6. Count marks nulls:   SELECT COUNT(*) FROM questions WHERE marks IS NULL OR marks = '';
7. Count dupe suspects: SELECT question_text, COUNT(*) c FROM questions GROUP BY question_text HAVING c > 1;
8. Count unclassified:  SELECT COUNT(*) FROM questions WHERE chapter = 'Needs classification';
```

Write findings to `audit/phase1_findings.md` — do not proceed to Phase 2 until this file exists.

---

## PHASE 2 — DEDUPLICATION

### Detection

Run exact + near-duplicate detection:

- **Exact dupes**: identical `question_text` after normalising whitespace → flag with `dupe_group` id
- **Near dupes**: Levenshtein distance < 15% of longer string length → flag as `near_dupe_candidate`
- **Source-aware**: if same question appears from two different source PDFs, keep both with a `cross_source_dupe` flag (do not delete — it is evidence of recurring questions)
- **Same-source dupes**: same `source_id` + same normalised text → safe to hard-delete the later import

### Actions

1. Write a dedupe report to `audit/deduplication_report.md` with counts and sample pairs
2. Add a `dupe_group` nullable column to the questions table if not present
3. Mark all exact same-source dupes as `status = 'duplicate'` (soft delete, not hard delete)
4. Log every deletion/mark to `audit/deduplication_log.csv` (id, action, reason)

### Verification Gate ✓

```sql
SELECT COUNT(*) FROM questions
WHERE question_text IN (
  SELECT question_text FROM questions
  WHERE status != 'duplicate'
  GROUP BY TRIM(LOWER(question_text))
  HAVING COUNT(*) > 1
);
-- Must return 0
```

---

## PHASE 3 — QUESTION TYPE CLASSIFICATION & FIXING

For each question type below, apply the fix rules and then run its verification gate.

---

### 3A — MCQ (Multiple Choice Questions)

**Symptoms**: Options (A)(B)(C)(D) merged into `question_text`, or options in wrong column, or `correct_option` missing.

**Fix rules**:
- Parse `question_text` with regex: split stem from options block starting at `(A)` or `A.` or `(a)`
- Store stem in `question_text`, options in `options` JSON column: `{"A": "...", "B": "...", "C": "...", "D": "..."}`
- If `correct_option` exists in source metadata, populate it; else set to `null` (not empty string)
- `marks` for MCQ = 1 unless source says otherwise

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_type = 'MCQ'
AND (options IS NULL OR options = '' OR options = '{}');
-- Must return 0
```

---

### 3B — Assertion-Reason (AR)

**Symptoms**: Assertion and Reason in same `question_text` blob, or split across two rows, or missing the standard 4-option MCQ footer.

**Fix rules**:
- Detect AR by presence of keywords: `Assertion`, `Reason`, `(A) Both`, `(R)`
- Ensure single row per AR question with `question_type = 'assertion_reason'`
- Structure: `{ "assertion": "...", "reason": "...", "options": { "A": "Both A and R are true...", ... } }`
- Merge any split rows detected in Phase 1
- `marks` = 1

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_type = 'assertion_reason'
AND JSON_EXTRACT(question_data, '$.assertion') IS NULL;
-- Must return 0
```

---

### 3C — Tables & Accounts (Accountancy-heavy)

**Symptoms**: Table data extracted as pipe-separated garbage, T-account columns merged, balance sheet rows scrambled.

**Fix rules**:
- Detect table questions: `question_text` contains `|` runs, or original PDF page had tabular structure (check extractor metadata if stored)
- Attempt to parse pipe/space-delimited content into a `table_data` JSON: `{ "headers": [...], "rows": [[...], ...] }`
- If parse confidence < 80% (heuristic: mismatched column counts across rows), set `render_hint = 'table_needs_review'` and flag for human review list
- Do NOT fabricate table data — mark uncertain ones clearly
- Store original raw extraction in `raw_text` column for audit trail

**Verification Gate ✓**:
```
audit/tables_review_list.md exists
All questions with render_hint = 'table_needs_review' are listed there with their IDs
COUNT(questions WHERE question_type = 'table' AND table_data IS NULL AND render_hint IS NULL) = 0
```

---

### 3D — Graph / Diagram Questions (Economics, Maths)

**Symptoms**: Graph described as `[Figure]`, `[Diagram]`, blank space, or image path pointing to non-existent file.

**Fix rules**:
- Set `question_type = 'graph_based'` for questions referencing graphs
- Check if image path exists on disk: `pipeline/extracted/images/<id>.*`
- If image exists → set `has_image = true`, `image_path = <relative path>`
- If image missing but text says "refer to diagram" → set `render_hint = 'image_missing'`, add to review list
- If image is OCR-able (diagram with labels visible in surrounding text) → extract label text into `image_alt_text`

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_type = 'graph_based'
AND has_image = true
AND image_path NOT IN (SELECT path FROM verified_images);
-- verified_images = a temp table you build by fs.existsSync check via a script
-- Must return 0
```

---

### 3E — Image / Photo Questions (OCR-able)

**Symptoms**: Question contains an image of a printed question (photo of a paper), full question text is inside the image not extracted.

**Fix rules**:
- Flag as `render_hint = 'ocr_required'` if `question_text` is very short (< 30 chars) but `image_path` is set
- Run pytesseract or easyocr on these images if available, store result in `ocr_text`
- If OCR confidence > 70% → promote `ocr_text` to `question_text`, set `ocr_source = true`
- If OCR confidence < 70% → leave in review list

**Verification Gate ✓**:
```
audit/ocr_results.csv exists with columns: id, image_path, ocr_confidence, action_taken
```

---

### 3F — Multi-Part / Case-Study Questions

**Symptoms**: Parts (i), (ii), (iii) or (a), (b), (c) stored as separate rows without a parent link, or merged into one long blob.

**Fix rules**:
- Detect via: sequential rows with same source page + marks pattern (2+2+2 = 6 marks on one page block)
- Create a `parent_question_id` self-reference in the schema if not present
- Link sub-parts to parent; parent row holds the case-study passage, children hold each sub-question
- `marks` on parent = sum of children marks; marks on each child = individual marks

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_text LIKE '%(i)%' OR question_text LIKE '%(a)%'
AND parent_question_id IS NULL
AND question_type != 'multi_part';
-- Should approach 0 (exceptions: coincidental text matches are acceptable, log them)
```

---

### 3G — Marks Metadata

**Symptoms**: `marks` column is NULL, 0, or doesn't match known CBSE marking scheme.

**Fix rules**:
- CBSE Class 12 Commerce marking norms:
  - MCQ / AR → 1 mark
  - VSA (Very Short Answer) → 1–2 marks  
  - SA (Short Answer) → 3–4 marks
  - LA (Long Answer) → 5–6 marks
  - Case-based → typically 4–5 marks (parent), 1–2 marks (sub-parts)
- If `marks` is NULL and `question_type` is known → apply default from above table
- If marks inference is ambiguous → set to NULL explicitly (not 0) and add to `audit/marks_ambiguous.csv`

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions WHERE marks = 0;
-- Must return 0 (0 is invalid; use NULL for unknown)

SELECT COUNT(*) FROM questions WHERE marks IS NULL AND question_type IN ('MCQ','assertion_reason');
-- Must return 0 (these are always 1 mark)
```

---

### 3H — Text Artefacts & Encoding

**Symptoms**: Hindi characters, header/footer bleed (`CBSE 2025-26 Sample Paper`, page numbers), watermark text inside `question_text`.

**Fix rules**:
- Strip known header/footer patterns via regex (maintain a pattern list in `pipeline/cleaning/artefacts.py`)
- Strip page numbers: lines matching `^\s*\d+\s*$`
- Strip watermark text: lines containing `CBSE`, `Sample Question Paper`, `www.cbse.gov.in` when they appear standalone
- Trim leading/trailing whitespace and normalise internal whitespace (collapse multiple spaces/newlines)
- Log before/after for any question where text changed length by > 20%

**Verification Gate ✓**:
```python
# Run this script: audit/verify_artefacts.py
patterns = ["CBSE", "Sample Question Paper", "www.cbse", "Page No"]
violations = [q for q in all_questions if any(p in q.question_text for p in patterns)]
assert len(violations) == 0, f"{len(violations)} questions still contain artefacts"
```

---

### 3I — OR Questions (Alternative Questions)

**Symptoms**: Two full questions separated by `OR` on their own line, stored as a single row, or as two disconnected rows with no link, or the word `OR` stripped entirely causing question loss.

**Context**: CBSE board papers consistently offer choice — "Attempt either Q5 OR Q6." Both alternatives must be preserved. Students and the app need to know these are interchangeable, not two separate compulsory questions.

**Fix rules**:
- Detect OR boundaries: a line containing only `OR` (case-insensitive, possibly padded with whitespace or dashes `--- OR ---`) between two question blocks in the same source page range
- If stored as one row: split into two rows, both with `question_type` preserved, link them via `or_pair_id` (shared UUID) and `or_position` = `'A'` / `'B'`
- If stored as two disconnected rows on the same source page with no link: detect by page proximity and marks equality, then assign shared `or_pair_id`
- If `OR` was stripped and only one alternative exists: flag as `render_hint = 'or_partner_missing'`, log to `audit/or_missing_partner.csv`
- `marks` on both alternatives must be equal — if they differ, flag as `render_hint = 'or_marks_mismatch'`
- Schema addition if not present: `or_pair_id TEXT`, `or_position TEXT CHECK(or_position IN ('A','B',NULL))`

**Verification Gate ✓**:
```sql
-- Every OR-A must have a corresponding OR-B with the same or_pair_id
SELECT or_pair_id FROM questions WHERE or_position = 'A'
EXCEPT
SELECT or_pair_id FROM questions WHERE or_position = 'B';
-- Must return 0 rows (every A has a B)

SELECT COUNT(*) FROM questions
WHERE or_position IS NOT NULL AND or_pair_id IS NULL;
-- Must return 0
```

---

### 3J — Fill in the Blanks (FIB)

**Symptoms**: Blank represented as `_____`, `………`, `(   )`, or entirely missing from extracted text. Answer stored inline or not stored at all.

**Context**: Common in Economics (define/complete statements), English (grammar), BST (one-word concepts).

**Fix rules**:
- Detect FIB: `question_text` contains 3+ consecutive underscores or 3+ consecutive dots
- Normalise all blank representations to `______` (6 underscores) — single consistent token
- If answer is embedded after the blank in source (e.g. `______ (Partnership)`), extract it to `answer_key` JSON: `{"blanks": ["Partnership"]}`
- Count number of blanks → store in `blank_count`
- `marks` = `blank_count` × 1 (CBSE standard) unless source specifies otherwise
- `question_type = 'fill_in_blank'`

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_type = 'fill_in_blank'
AND (question_text NOT LIKE '%______%');
-- Must return 0 — all FIBs must use normalised blank token
```

---

### 3K — True / False

**Symptoms**: "State True or False" questions with the statement merged with answer or with T/F already appended.

**Context**: Appears in BST, Economics, Accountancy — usually 1 mark each.

**Fix rules**:
- Detect: question begins with `State True or False`, `True/False:`, or ends with `(True/False)`
- `question_type = 'true_false'`
- Strip any answer hint already appended to `question_text` (e.g. `— True` at end of line)
- Store correct answer in `answer_key`: `{"answer": "True"}` or `{"answer": "False"}`
- `marks` = 1

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_type = 'true_false'
AND marks != 1;
-- Must return 0
```

---

### 3L — Match the Following / Match the Columns

**Symptoms**: Two-column match layout completely destroyed in extraction — all items in one column concatenated into `question_text`, Column B items lost, or items out of order.

**Context**: Common in all commerce subjects. Standard format: Column A (concepts) ↔ Column B (definitions/examples). Usually 3–5 pairs.

**Fix rules**:
- Detect: `question_text` contains `Column I` / `Column II`, `Column A` / `Column B`, or `Match the following`
- Parse both columns into structured JSON: `{ "column_a": ["item1", "item2", ...], "column_b": ["item1", "item2", ...], "correct_pairs": {"1": "c", "2": "a", ...} }`
- If column B items are completely missing from extraction → set `render_hint = 'match_column_b_missing'`, flag for human review
- If correct pairs are available in answer key source → populate `correct_pairs`; else set to `null`
- `question_type = 'match_following'`
- `marks` = number of pairs × 1 (typically 3–5 marks total)

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_type = 'match_following'
AND JSON_EXTRACT(question_data, '$.column_a') IS NULL;
-- Must return 0
```

---

### 3M — Give Reasons / Distinguish Between / Define

**Symptoms**: Short-answer conceptual questions with no special structure, but often extracted with their question number bleeding into `question_text` (e.g. `5. Define partnership.`).

**Context**: Very high frequency in BST, Accountancy, Economics. These are the "bread and butter" 2–3 mark questions.

**Sub-types**:
| Sub-type | Detection pattern | `question_type` value |
|---|---|---|
| Define | Starts with `Define`, `What is`, `What do you mean by` | `definition` |
| Give Reasons | Starts with `Give reason`, `Why`, `Explain why` | `reason` |
| Distinguish Between | `Distinguish between`, `Differentiate between`, `Difference between` | `distinguish` |
| Explain / Describe | `Explain`, `Describe`, `Discuss`, `Elaborate` | `short_answer` |
| State / List | `State`, `List`, `Mention`, `Name` | `short_answer` |

**Fix rules**:
- Strip leading question numbers: `^\s*\d+[\.\)]\s+` from `question_text`
- Classify into sub-type using detection patterns above; store sub-type in `question_subtype` column
- `distinguish` questions often have a table structure in their expected answer — set `render_hint = 'distinguish_table'` so the UI can render a comparison table
- `marks`: Define/State = 1–2, Give Reasons = 2–3, Distinguish = 3–4, Explain = 4–5

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE (question_text LIKE 'Distinguish%' OR question_text LIKE 'Differentiate%')
AND question_type != 'distinguish';
-- Must return 0
```

---

### 3N — Numericals (Accountancy & Mathematics)

**Symptoms**: Multi-step numerical problems where workings, formulas, or intermediate values are garbled; LaTeX/equation markup either raw or stripped; amounts in tables misaligned.

**Context**: Journal entries, ledger posting, P&L statements, balance sheet preparation (Accountancy). Integration, differentiation, probability, matrices (Mathematics).

**Fix rules**:

**Accountancy numericals**:
- Detect: contains `₹`, `Rs.`, `Dr.`, `Cr.`, `Debit`, `Credit`, `Journal`, `Ledger`, `Balance Sheet`, `Trading Account`
- Set `question_type = 'numerical_accountancy'`
- Preserve all monetary values exactly — do not normalise or abbreviate amounts
- If the question has a given data block (e.g. "From the following information prepare..."), split into `question_stem` and `given_data` JSON
- Tables within given data → parse as per 3C rules

**Maths numericals**:
- Detect: contains LaTeX fragments (`\frac`, `\int`, `\sum`, `\sqrt`, `\begin{matrix}`), or `dy/dx`, `f(x)`, `lim`
- Set `question_type = 'numerical_maths'`
- Raw LaTeX must be preserved verbatim in `question_text` — do not attempt to convert to plain text
- Set `render_hint = 'latex'` so the UI knows to render with MathJax/KaTeX
- If LaTeX was partially stripped (equation present as garbled symbols), set `render_hint = 'latex_corrupted'` and add to human review

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_type = 'numerical_maths'
AND render_hint IS NULL;
-- Must return 0 — all maths numericals must have a render_hint set

SELECT COUNT(*) FROM questions
WHERE question_type = 'numerical_accountancy'
AND question_text LIKE '%Rs.%'  -- old format
AND question_text NOT LIKE '%₹%';
-- Log count — flag for currency symbol normalisation (Rs. → ₹)
```

---

### 3O — Competency-Based Questions (CBQ) / Source-Based Integrated Questions

**Symptoms**: A stimulus (passage, infographic description, data set, or short case) followed by 4–5 sub-questions of mixed types (MCQ + SA + reason). Often extracted as a single blob or each sub-question as an orphan row.

**Context**: CBSE introduced CBQs heavily from 2023 onward. They appear in all five subjects. Each CBQ block is worth 4–5 marks. This is the most complex structural type.

**Fix rules**:
- Detect: a block of text > 100 words followed immediately by numbered/lettered sub-questions, OR sub-questions that reference "the above passage", "the given data", "the above graph"
- `question_type = 'cbq'` on the parent row; store stimulus in `cbq_stimulus` column
- Each sub-question gets its own child row with `parent_question_id`, own `question_type` (MCQ/short_answer/reason), and own `marks`
- `or_pair_id` logic from 3I still applies — CBQ blocks can also have OR alternatives
- Sub-questions referencing "the above" must NOT be stored without their parent — they are meaningless in isolation

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE (question_text LIKE '%above passage%'
   OR question_text LIKE '%above graph%'
   OR question_text LIKE '%given data%')
AND parent_question_id IS NULL;
-- Must return 0
```

---

### 3P — English Subject Question Types

English has structurally unique question types not present in commerce subjects:

**Sub-types**:

| Type | Detection | `question_type` |
|---|---|---|
| Reading Comprehension | "Read the following passage", unseen passage + sub-questions | `comprehension` |
| Note Making | "Make notes", "Write a summary" following a passage | `note_making` |
| Letter Writing | "Write a letter to...", "Draft a formal letter" | `letter_writing` |
| Article / Speech / Report | "Write an article on", "You are asked to deliver a speech" | `writing_task` |
| Notice / Advertisement | "Draft a notice", "Write an advertisement" | `notice_ad` |
| Integrated Grammar | Gap-fill, editing, omission, rearrangement | `grammar` |
| Poetry Appreciation | "Read the extract...answer the following" from poem | `poetry_extract` |
| Prose Extract | "Read the extract...answer the following" from prose | `prose_extract` |

**Fix rules**:
- Comprehension + Note Making: always link passage as parent, sub-questions as children (same as CBQ)
- Writing tasks: store word limit in `word_limit` column if specified (`"Write in 100–120 words"`)
- Grammar questions: `question_subtype` = `gap_fill` / `editing` / `omission` / `rearrangement`
- Extract-based questions (poetry/prose): store the extract in `cbq_stimulus`, link sub-questions as children
- Marks for writing tasks: Letter = 5, Article/Speech = 5, Notice = 4, Report = 5 (CBSE standard)

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE subject = 'English'
AND question_type NOT IN (
  'MCQ','assertion_reason','comprehension','note_making',
  'letter_writing','writing_task','notice_ad','grammar',
  'poetry_extract','prose_extract','fill_in_blank',
  'true_false','short_answer','multi_part','cbq'
);
-- Must return 0 — every English question must have a recognised type
```

---

### 3Q — Question Number & Section Bleed

**Symptoms**: CBSE papers are divided into Sections (A, B, C, D, E). Section headers, question serial numbers, and internal instruction lines (`Attempt any 4 of the following 5`) bleed into `question_text`.

**Fix rules**:
- Strip standalone section headers: lines matching `^Section [A-E]$` or `^SECTION [A-E]$`
- Strip internal instructions: lines matching `^Attempt any \d+ (of|out of) the following \d+\.?$`
- Extract and store question serial number in `source_q_number` column (e.g. `Q.5`, `5.`, `5(a)`)
- Strip `source_q_number` from the start of `question_text`
- Store section letter in `section` column: `'A'`, `'B'`, `'C'`, `'D'`, `'E'`

**CBSE Section → Marks mapping** (for cross-validation):
| Section | Typical marks/question |
|---|---|
| A | 1 (MCQ/AR/T-F/FIB) |
| B | 2–3 (VSA) |
| C | 4–5 (SA) |
| D | 6 (LA) |
| E | 4–5 (CBQ/Case-study) |

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_text REGEXP '^Q\.\s*\d+'
   OR question_text REGEXP '^Section [A-E]';
-- Must return 0
```

---

### 3R — Statement 1 / Statement 2 MCQs (Two-Statement Type)

**Symptoms**: A question presents two numbered statements and asks which are true/false — distinct from Assertion-Reason because there are no causal labels and the four options are of the form "Both true / Only 1 true / Only 2 true / Both false." Often extracted as a flat blob with statement text merged into option text.

**Context**: Very common in Economics (2025-26 official sample paper uses this heavily). Also appears in BST and Accountancy. Confirmed from official CBSE Economics SQP 2025-26 which has multiple questions of the form: *"Read the following statements carefully: Statement 1: … Statement 2: … Choose the correct option: (A) S1 true S2 false …"*

**Fix rules**:
- Detect: `question_text` contains `Statement 1:` / `Statement 2:` (or `Statement I` / `Statement II`) AND options follow the true/false combo pattern
- `question_type = 'statement_based_mcq'` — NOT `assertion_reason` (different structure, different pedagogy)
- Parse into: `{ "statement_1": "...", "statement_2": "...", "options": { "A": "...", "B": "...", "C": "...", "D": "..." } }`
- `marks` = 1

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE (question_text LIKE '%Statement 1:%' OR question_text LIKE '%Statement I:%')
AND question_type NOT IN ('statement_based_mcq', 'assertion_reason');
-- Must return 0
```

---

### 3S — Visually Impaired (VI) Alternative Questions

**Symptoms**: Every official CBSE board paper contains a note: *"The following question is for Visually Impaired Candidates only, in lieu of Q.X."* These are text-based replacements for diagram/graph questions. They are frequently extracted as orphan rows with no link to the question they replace, or worse — merged into the diagram question's `question_text`.

**Context**: Mandatory in all subjects. Economics SQP 2025-26 provides VI alternatives for every diagram MCQ. These are real questions that real students answer; they must be stored correctly and not silently discarded.

**Fix rules**:
- Detect: `question_text` contains `"for Visually Impaired"`, `"in lieu of Q"`, `"for VI Candidates"` (case-insensitive)
- `question_type = 'vi_alternative'`
- Extract the referenced question number from `"in lieu of Q.N"` → store in `vi_replaces_q_number`
- Link to the diagram question it replaces via `vi_replaces_id` (foreign key) if that question exists in DB
- Never merge VI text into the parent diagram question — keep as a sibling row
- `marks` = same as the question it replaces
- Set `is_vi_alternative = true` boolean flag

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE (question_text LIKE '%Visually Impaired%' OR question_text LIKE '%in lieu of Q%')
AND question_type != 'vi_alternative';
-- Must return 0

SELECT COUNT(*) FROM questions
WHERE is_vi_alternative = true AND vi_replaces_q_number IS NULL;
-- Must return 0
```

---

### 3T — Defend / Refute / Justify / Analyse (Open-Ended Analytical)

**Symptoms**: Long-answer questions that ask students to take a position or validate a claim. Frequently mis-classified as `short_answer` or `long_answer` without capturing the analytical sub-type, causing loss of the core pedagogical intent.

**Context**: Confirmed in CBSE Economics 2026 board paper: *"Defend or refute the above statement with valid reasons and examples."* Also common in BST (*"Do you agree? Give reasons."*) and English literature (*"Justify the author's decision…"*). These are high-order questions worth 4–6 marks.

**Sub-types**:
| Keyword pattern | `question_subtype` | Marks |
|---|---|---|
| `Defend or refute`, `Do you agree` | `defend_refute` | 4–6 |
| `Justify`, `Give valid reasons` | `justify` | 3–4 |
| `Analyse`, `Examine`, `Critically examine` | `analyse` | 4–6 |
| `Comment on`, `Evaluate` | `evaluate` | 4–6 |
| `Elucidate`, `Elaborate` | `elaborate` | 3–4 |
| `Discuss`, `Explain in detail` | `discuss` | 4–6 |

**Fix rules**:
- Detect via leading keyword patterns (case-insensitive) in `question_text`
- Set `question_type = 'analytical'` and `question_subtype` from table above
- If a news/data stimulus precedes the question, link via `parent_question_id` (CBQ structure from 3O)
- Do NOT set `question_type = 'short_answer'` for any question with marks ≥ 4

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE (question_text LIKE 'Defend%' OR question_text LIKE 'Do you agree%'
   OR question_text LIKE 'Justify%' OR question_text LIKE 'Critically%')
AND question_type NOT IN ('analytical', 'cbq');
-- Must return 0
```

---

### 3U — Internal Choice within a Question ("Attempt any N of M")

**Symptoms**: A single question block contains more sub-questions than required and instructs: *"Attempt any 3 out of the following 5."* Extraction often stores all sub-parts as individually compulsory rows, inflating the required question count and confusing students.

**Context**: Different from OR (which is between two full standalone questions). This is internal to a single question. Common in Section A MCQ blocks: *"Q.1 to Q.20 are MCQ. Attempt any 16."* Also appears in reading comprehension and grammar sections of English.

**Fix rules**:
- Detect: instruction line matches `Attempt any \d+ (of|out of) (?:the following )?\d+`
- Group all sub-options under a parent row with `question_type = 'internal_choice_block'`
- Store metadata: `{ "attempt_any": 3, "total_options": 5 }` in `internal_choice_meta`
- Children rows: each sub-question with `parent_question_id` pointing to the block parent
- `marks` on parent = (attempt_any × marks_per_sub)
- **Do not** store the instruction line as a question row — strip it and record in parent metadata

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_text LIKE '%Attempt any%'
AND question_type != 'internal_choice_block';
-- Must return 0 (the instruction must live in metadata, not question_text)
```

---

### 3V — Multi-Set / Same-Paper Variant Deduplication

**Symptoms**: CBSE releases Set 1, Set 2, Set 3 (sometimes Set 4, Set 5) of the same paper for different examination centres. The question order and sometimes minor wording varies between sets, but the underlying question is the same. Extracted as fully separate rows with different `source_id` values, causing apparent question counts to be 3–5× the real unique count.

**Context**: Economics 2025 had at least 7 sets (58/1/1 through 58/7/3). Every subject has multiple sets. This is a cross-source deduplication problem distinct from Phase 2's same-source deduplication.

**Fix rules**:
- After Phase 2, run a second-pass cross-source dedupe specifically targeting multi-set variants:
  - Normalise question text (lowercase, strip question numbers, strip whitespace)
  - Group by normalised text + subject + marks
  - Assign a `canonical_question_id` to the earliest-imported row of each group
  - Mark all other rows as `status = 'set_variant'`, `canonical_question_id = <id of canonical>`
- Expose only canonical rows in the UI by default; variants accessible via a "View all sets" toggle
- Store set identifier (e.g. `58/1/1`) in `paper_set_code` column

**Verification Gate ✓**:
```sql
-- Count unique canonical questions vs total rows
SELECT
  COUNT(*) AS total_rows,
  COUNT(CASE WHEN canonical_question_id IS NULL THEN 1 END) AS canonical_count,
  COUNT(CASE WHEN status = 'set_variant' THEN 1 END) AS variant_count
FROM questions;
-- Log this. canonical_count + variant_count must = total_rows.
-- canonical_count / total_rows should be < 0.5 if multiple sets were imported (expected)
```

---

### 3W — Accountancy Part A / Part B Optional Section Handling

**Symptoms**: Accountancy paper has a mandatory Part A (Partnership + Company Accounts, 60 marks) and an optional Part B where students choose **either** "Analysis of Financial Statements" **or** "Computerised Accounting" (20 marks). Extracted questions from both Part B branches are stored as equally compulsory rows, making it appear students must answer both branches.

**Context**: Confirmed from official CBSE Accountancy pattern 2025-26: *"Part B has two options i.e. (i) Analysis of Financial Statements and (ii) Computerised Accounting. Students must attempt only one."*

**Fix rules**:
- Add `paper_part` column: `'A'`, `'B_financial'`, `'B_computerised'`
- Add `is_optional_branch = true` for all Part B questions
- Add `branch_group` to link questions that are alternatives of each other across branches
- Ensure UI logic knows: if `paper_part = 'B_financial'` and `paper_part = 'B_computerised'` both exist for a paper, only ONE branch is shown/required at a time
- `marks` totals: Part A = 60, Part B (either branch) = 20 → total = 80

**Verification Gate ✓**:
```sql
SELECT paper_part, COUNT(*) FROM questions
WHERE subject = 'Accountancy'
GROUP BY paper_part;
-- All three values must appear: A, B_financial, B_computerised
-- B_financial and B_computerised counts should be roughly equal (same paper, mirrored structure)
```

---

### 3X — Real-Life Scenario / Application Questions (BST)

**Symptoms**: Business Studies questions from 2023 onward are almost entirely scenario-framed: *"Piyush started a company selling handmade candles online…"* or *"Asha Ltd. decided to expand…"* The scenario paragraph and the actual question are stored as one blob or split across rows. Questions appear to be pure text but have an embedded application context that must be preserved.

**Context**: CBSE BST 2025-26 sample paper explicitly states: *"heavily based on real-life business situations, which means most questions resemble case-study formats."* These are NOT CBQs (no formal stimulus block) but scenario-embedded questions.

**Fix rules**:
- Detect: `question_text` > 80 words with a named entity (person/company name) in opening sentence, followed by a direct question
- `question_type = 'scenario_based'` — distinct from `cbq` (no separate stimulus block) and `short_answer`
- Parse: first paragraph (up to first `?` or directive) → `scenario_context`; remainder → `question_stem`
- Store both in separate columns; `question_text` = full combined text (for search/FTS)
- `question_subtype` = underlying concept being tested (e.g. `management_principles`, `marketing_mix`, `staffing`)

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE subject = 'Business Studies'
AND LENGTH(question_text) > 300
AND question_type NOT IN ('scenario_based', 'cbq', 'multi_part', 'distinguish', 'analytical');
-- Should approach 0 — long BST questions must be classified into one of these types
```

---

### 3Y — English Invitation Writing (Formal / Informal)

**Symptoms**: A distinct English writing type — Formal Invitation (e.g., from principal to parents) or Informal Invitation (e.g., to a friend for a birthday) — stored under the generic `writing_task` or `letter_writing` type, losing the format-specific marking criteria.

**Context**: Confirmed in CBSE English Core Syllabus 2025-26 Section B: *"Formal/Informal Invitation and Reply, up to 50 words. 4 Marks: Format: 1 / Content: 2 / Grammar: 1."* This is a separate question slot (Q.4) distinct from letters (Q.5) and articles (Q.6).

**Fix rules**:
- Detect: question starts with `Write a formal invitation`, `Write an informal invitation`, `Draft an invitation`, `Write a reply to the invitation`
- `question_type = 'invitation_writing'`
- `question_subtype` = `'formal'` or `'informal'` or `'reply'`
- Store word limit in `word_limit = 50`
- Marking breakdown stored in `marking_criteria`: `{ "format": 1, "content": 2, "grammar": 1 }`
- `marks` = 4 always

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE (question_text LIKE '%formal invitation%' OR question_text LIKE '%informal invitation%'
   OR question_text LIKE '%reply to the invitation%')
AND question_type != 'invitation_writing';
-- Must return 0
```

---

### 3Z — English Resume / Bio-Data Questions

**Symptoms**: A job-application question requiring students to write a letter of application PLUS attach a bio-data/resume. Often stored as two separate rows (the letter and the bio-data template), or only the letter prompt is stored with the bio-data instruction dropped entirely.

**Context**: Confirmed in CBSE English Core Syllabus 2025-26 Q.5 letter types: *"application for a job with bio-data or resume."* This is a compound task — one question, two deliverables. `marks` = 5.

**Fix rules**:
- Detect: `question_text` contains `bio-data`, `biodata`, `resume`, `curriculum vitae`, `C.V.` alongside `application` or `letter`
- `question_type = 'job_application'`
- `question_subtype` = `'with_biodata'` or `'with_resume'`
- Store the full compound instruction in `question_text` — do not split letter part from bio-data part
- `marks` = 5, `word_limit` = 120 (letter) — bio-data has no word limit, store `word_limit_note = 'letter 120-150 words; bio-data as required'`
- Marking criteria: `{ "format": 1, "organisation": 1, "content": 2, "grammar": 1 }`

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE (question_text LIKE '%bio-data%' OR question_text LIKE '%biodata%')
AND question_type != 'job_application';
-- Must return 0
```

---

### 3AA — Economics Circular Flow / Diagram-Linked MCQs

**Symptoms**: Economics MCQs that are linked to a diagram printed on the question paper (e.g., a circular flow of income diagram, a production possibility curve, a cost curve) where the MCQ options reference points/labels on the diagram. Without the diagram, the MCQ is unanswerable. These are extracted as standalone MCQs with no image link.

**Context**: Confirmed in CBSE Economics SQP 2025-26 Q.1: *"With reference to the given diagram, which of the following is true at point B?"* and Q.10 (Circular Flow diagram with arrows C and D labelled). These are diagram-anchored MCQs, not standalone.

**Fix rules**:
- Detect: MCQ `question_text` contains `"the given diagram"`, `"the above diagram"`, `"with reference to"` + `"diagram"` / `"figure"` / `"graph"` / `"the above table"` / `"arrow"` / `"point [A-Z]"`
- `question_type = 'diagram_mcq'` (subtype of MCQ, requires image)
- Must have `has_image = true` and valid `image_path` — if not, set `render_hint = 'diagram_mcq_image_missing'`
- Also check: is the VI alternative (3S) for this question present? Link via `vi_replaces_id`
- `marks` = 1

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_type = 'diagram_mcq'
AND (has_image = false OR image_path IS NULL);
-- Log count → all must be flagged render_hint = 'diagram_mcq_image_missing' or have image
```

---

### 3AB — Economics Data Calculation MCQs (Numerical MCQ)

**Symptoms**: MCQ questions that require actual calculation to determine the answer (e.g., *"On the basis of the given data, Money Supply (M1) would be ₹ ___ crore."* or *"Calculate GDP deflator given the following data."*). These are stored as plain MCQs without flagging that a calculation is required, so students (and the UI) have no signal to expect working.

**Context**: Confirmed directly in CBSE Economics SQP 2025-26 Q.8 (Money Supply calculation MCQ) and Q. on GDP deflator. Also common in Accountancy (ratio MCQs).

**Fix rules**:
- Detect: MCQ where `question_text` contains numerical values (₹ amounts, percentages, index numbers) AND a `given_data` block precedes the question OR values are embedded in the stem
- `question_type = 'mcq'` (unchanged), `question_subtype = 'numerical_mcq'`
- Set `requires_calculation = true`
- Extract any inline data table into `given_data` JSON (same as 3N accountancy numericals)
- `marks` = 1

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_type = 'mcq'
AND question_text LIKE '%₹%'
AND question_subtype IS NULL;
-- Should approach 0 — all monetary MCQs must have subtype = 'numerical_mcq'
```

---

### 3AC — Maths Linear Programming Problems (LPP)

**Symptoms**: LPP questions require students to: (1) formulate constraints as inequalities, (2) draw a feasibility region on a graph, (3) identify corner points, (4) calculate objective function at each corner. Extraction frequently gives only the constraint text, dropping the graphical instruction and the objective function, or splits formulation from solving across two rows.

**Context**: LPP is a dedicated chapter in Class 12 Maths (Chapter 12). Questions are consistently 5–6 marks. The graphical method is mandatory — the question is inseparable from the graph it requires.

**Fix rules**:
- Detect: `question_text` contains `maximise Z =`, `minimise Z =`, `subject to`, `constraints`, `feasible region`, `corner point`, `objective function`
- `question_type = 'lpp'` (Linear Programming Problem)
- Parse components into structured JSON:
  ```json
  {
    "objective": "Maximise Z = 2x + 3y",
    "constraints": ["x + y ≤ 4", "x ≥ 0", "y ≥ 0"],
    "method": "graphical"
  }
  ```
- Set `render_hint = 'lpp_graph_required'` — UI must display graphing area or warn student
- `marks` = 5 or 6

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE (question_text LIKE '%Maximise Z%' OR question_text LIKE '%Minimise Z%')
AND question_type != 'lpp';
-- Must return 0
```

---

### 3AD — Applied Mathematics (Commerce Maths Alternate Subject)

**Symptoms**: Applied Mathematics (subject code 241) is offered as an alternative to Mathematics for Commerce students. Its questions include financial mathematics (EMI, SIP, depreciation), linear programming, statistics, and index numbers. When extracted alongside regular Maths questions, they are indistinguishable by text alone but have fundamentally different syllabus scope and marking.

**Context**: CBSE introduced Applied Maths specifically for Commerce/Arts students not pursuing Science. Sections include: Numbers and Quantification, Algebra, Calculus, Probability, Index Numbers & Time Series, Financial Mathematics, Linear Programming.

**Fix rules**:
- Identify by `source_subject` metadata from the pipeline (PDF file name / manifest entry) — Applied Maths PDFs are tagged differently
- Set `subject = 'Applied Mathematics'`, `subject_code = '241'` (not `'041'` for regular Maths)
- Question sub-types unique to Applied Maths:
  | Sub-type | Detection | `question_subtype` |
  |---|---|---|
  | EMI / Loan calculation | Contains `EMI`, `loan`, `instalment`, `principal`, `interest rate` | `financial_maths` |
  | Index Numbers | Contains `Laspeyre`, `Paasche`, `Fisher`, `price index`, `quantity index` | `index_numbers` |
  | Time Series | Contains `trend`, `moving average`, `secular trend` | `time_series` |
  | SIP / Investment | Contains `SIP`, `maturity`, `monthly investment`, `future value` | `investment_maths` |
  | Depreciation | Contains `depreciation`, `scrap value`, `book value`, `straight line method` | `depreciation` |
- These must NOT be tagged as Economics numericals

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE subject = 'Mathematics'
AND (question_text LIKE '%EMI%' OR question_text LIKE '%Laspeyre%'
   OR question_text LIKE '%moving average%' OR question_text LIKE '%SIP%');
-- Must return 0 — these belong to Applied Mathematics, not regular Maths
```

---

### 3AE — HOTS (Higher Order Thinking Skills) Cognitive Level Tag

**Symptoms**: HOTS questions are not a structural type but a cognitive difficulty marker that CBSE mandates on marking schemes. They require application, analysis, or evaluation — not just recall. Without tagging, the app cannot filter by difficulty or surface HOTS questions for advanced practice.

**Context**: CBSE mandates 20–30% HOTS in every paper. Marking schemes explicitly label certain questions `[HOTS]`. Questions with `[HOTS]` in source PDFs are often extracted with the tag embedded in `question_text`, which must be stripped and re-stored as metadata.

**Fix rules**:
- Detect: `question_text` contains `[HOTS]`, `(HOTS)`, `*HOTS*` or similar bracketed label
- Strip the HOTS label from `question_text`
- Set `cognitive_level = 'HOTS'` in a dedicated column
- For questions WITHOUT explicit label: infer from question type — `analytical`, `defend_refute`, `evaluate`, `lpp`, `cbq` sub-parts → `cognitive_level = 'HOTS'`; MCQ, T/F, FIB → `cognitive_level = 'recall'`; SA with explanation → `cognitive_level = 'understanding'`

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE question_text LIKE '%[HOTS]%' OR question_text LIKE '%(HOTS)%';
-- Must return 0 — all HOTS labels stripped from question_text

SELECT COUNT(*) FROM questions WHERE cognitive_level IS NULL;
-- Must return 0 — every question must have a cognitive level assigned
```

---

### 3AF — English Literature Extract Questions (Flamingo / Vistas / Supplementary)

**Symptoms**: Section C of English has extract-based questions where a passage from a specific textbook chapter or poem is quoted and 4–5 sub-questions follow. The extract (stimulus) is often not stored, or the chapter/text source is not tagged, or sub-questions are orphaned without the extract.

**Context**: CBSE English Core 2025-26 Section C (40 marks) covers Flamingo (prose + poetry) and Vistas (supplementary reader). Extract questions appear for specific chapters — not any random passage. The source text (chapter/poem name) must be stored for the app to surface chapter-wise practice.

**Fix rules**:
- `question_type = 'literature_extract'`
- Mandatory fields: `text_source` (e.g., `"The Last Lesson"`, `"My Mother at Sixty-Six"`), `text_type` = `'prose'` / `'poetry'`, `textbook` = `'Flamingo'` / `'Vistas'`
- Sub-questions linked as children via `parent_question_id`; parent holds the extract in `cbq_stimulus`
- If `text_source` cannot be identified from extraction → set `render_hint = 'literature_source_unknown'` and add to classification queue for 9Router
- Long answer questions (6 marks) on literature themes/characters: `question_type = 'literature_la'`, tag with `text_source`

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions
WHERE subject = 'English'
AND question_type = 'literature_extract'
AND text_source IS NULL;
-- Must return 0

SELECT COUNT(*) FROM questions
WHERE subject = 'English'
AND question_type = 'literature_la'
AND text_source IS NULL;
-- Must return 0
```

---

### 3AG — Question-Number-to-Marks Attribution ("Right-Side Marks Badge")

**Symptoms**: In the original CBSE paper, every question has its marks printed to the right side of the question text (e.g., `[1]`, `[3]`, `[6]`). During PDF extraction these right-aligned marks numbers are either (a) silently dropped, (b) appended to the end of `question_text` as a trailing digit or bracketed number, (c) misread as part of an answer option or inline numeral, or (d) fused with the question serial number (`5. [6]` → stored as `56` or `5.6`).

This is the most widespread silent data corruption — it breaks marks display in the UI, breaks the section→marks cross-validation from 3Q, and makes the app unable to show students how many marks a question is worth without manual lookup.

**Context**: CBSE papers universally print marks in square brackets flush-right on the same line as the question number. Example from Economics SQP 2025-26:
```
17  Refer to the given text carefully: [Real GDP...passage...]     [4]
    (I) Differentiate between ...                                   [2]
    (II) Elaborate the reasons...                                   [2]
```
All three `[4]`, `[2]`, `[2]` are right-margin marks that extractors almost always lose or corrupt.

**Root causes to detect and fix**:

**Case A — Marks dropped entirely**:
- `marks IS NULL` but `question_type` and `section` are known → apply section defaults (3G rules)
- If sub-part marks are known (e.g. two `[2]` children) → parent marks = sum; store derivation in `marks_source = 'derived_from_children'`

**Case B — Marks appended to question_text as trailing token**:
- Detect: `question_text` ends with `\s*\[\d+\]$` or `\s*\(\d+\s*marks?\)$` or bare ` \d$` after sentence-ending punctuation
- Extract the number → set `marks`, strip from `question_text`
- Log to `audit/marks_extracted_from_text.csv` (id, extracted_value, original_tail)

**Case C — Marks fused with question serial number**:
- Detect: `source_q_number` value looks implausibly large (e.g. `56`, `16`) when the paper only has 34 questions → split by known serial range, infer marks from remainder
- Example: `source_q_number = '56'` on a paper with max 34 questions → `source_q_number = '5'`, `marks = 6`
- Heuristic: valid marks values are `{1, 2, 3, 4, 5, 6, 8}` — anything else is corruption

**Case D — Marks bracket mid-text (sub-part marks inline)**:
- Detect: `question_text` contains `[1]` or `[2]` inline between sub-parts (not at end)
- These are per-sub-part marks annotations → extract them as child question marks, strip from parent text

**Schema requirements** (add if missing):
```sql
ALTER TABLE questions ADD COLUMN marks_source TEXT;
-- Values: 'explicit' | 'derived_from_children' | 'section_default' | 'extracted_from_text' | 'inferred_from_type'
ALTER TABLE questions ADD COLUMN marks_display_position TEXT DEFAULT 'right';
-- Always 'right' for CBSE — stored so the UI knows to render it right-aligned
ALTER TABLE questions ADD COLUMN marks_verified BOOLEAN DEFAULT false;
-- Set true only when marks come from 'explicit' source (extracted from text or pipeline metadata)
```

**Verification Gates ✓**:
```sql
-- Gate 1: No trailing marks bracket left in question text
SELECT COUNT(*) FROM questions
WHERE question_text REGEXP '\[\d+\]\s*$'
   OR question_text REGEXP '\(\d+\s*[Mm]arks?\)\s*$';
-- Must return 0

-- Gate 2: No NULL marks for questions with known type + section
SELECT COUNT(*) FROM questions
WHERE marks IS NULL
AND section IS NOT NULL
AND question_type NOT IN ('internal_choice_block');
-- Must return 0

-- Gate 3: No zero marks
SELECT COUNT(*) FROM questions WHERE marks = 0;
-- Must return 0

-- Gate 4: marks_source must be set for every row
SELECT COUNT(*) FROM questions WHERE marks_source IS NULL;
-- Must return 0

-- Gate 5: Cross-validate marks against section norms
SELECT id, section, marks, question_type FROM questions
WHERE (section = 'A' AND marks != 1)
   OR (section = 'D' AND marks NOT IN (5, 6))
   OR (section = 'E' AND marks NOT IN (4, 5));
-- Log any violations — investigate individually, do not auto-correct without logging
```

**UI requirement note** (store as `render_hint` if applicable):
- Set `marks_display_position = 'right'` on all rows — the frontend must render this as a right-aligned badge on the question card, matching the look of the real CBSE paper.
- Sub-part marks (children of multi-part/CBQ) must also show their own marks badge, not just the parent total.

---

### 3AH — Two-Page / Page-Boundary Split Questions

**Symptoms**: Long questions (6-mark LA, case-study passages, LPP problems, accountancy journal entries, English passages) span two PDF pages. The extraction pipeline processes page-by-page and creates **two separate rows** — the first half of the question as one row, and the continuation of the same question as a second row, with no link between them. This is one of the hardest corruption types to detect because both halves look like valid standalone text individually.

**How splits manifest**:

| Pattern | Example | Signal |
|---|---|---|
| First half ends mid-sentence | `"The following data relates to..."` | No `?` or directive verb; incomplete sentence |
| Second half starts mid-sentence | `"...calculate the net profit for the year."` | Starts with lowercase or continuation clause |
| Second half starts with `(contd.)` or `(continued)` | Explicit | Easy to detect |
| Second half starts with sub-part letter/number that has no parent | `"(ii) Explain the role of RBI..."` without a `(i)` in the same row | Missing preceding sub-part |
| First half has `marks IS NULL`, second has marks from right-margin | First row has no trailing `[6]` because it was on page 2 | Marks only on page 2 half |
| Same source page number range overlap | Both rows claim `source_page_start` = N and N+1 | Page overlap metadata |

**Detection algorithm** (implement as `pipeline/repair/detect_page_splits.py`):

```python
# Step 1: Sort all questions by (source_id, source_page_start, source_q_number)
# Step 2: For each consecutive pair (q_a, q_b) from the SAME source:
#   SPLIT SIGNALS (score each; threshold ≥ 2 signals → flag as suspected split):
#   +3: q_b.question_text starts with lowercase letter
#   +3: q_a.question_text does not end with '.', '?', or ':'
#   +2: q_b.question_text starts with '(ii)', '(b)', or similar mid-sequence sub-part
#   +2: q_a.marks IS NULL and q_b.marks IS NOT NULL (marks only on page 2)
#   +2: q_b has no source_q_number (no question number at start = continuation)
#   +2: q_a.source_page_end == q_b.source_page_start (adjacent pages)
#   +1: q_a question_type differs from q_b (mis-classified halves)
#   +1: combined word count of q_a + q_b matches expected word count for marks tier
#   -2: q_b.source_q_number is a valid NEW question number (starts fresh)
# Step 3: Log all pairs with score ≥ 2 to audit/page_split_candidates.csv
```

**Fix rules**:

**For confirmed splits** (human-reviewed or score ≥ 4):
- Merge: `merged_text = q_a.question_text + ' ' + q_b.question_text`
- Assign merged text to `q_a.question_text`
- Assign marks from `q_b.marks` → `q_a.marks` (right-side marks were on page 2)
- Set `q_a.marks_source = 'merged_from_page_split'`
- Soft-delete `q_b`: `status = 'page_split_merged'`, `merged_into_id = q_a.id`
- Set `q_a.had_page_split = true` (boolean flag for audit trail)
- Re-run question_type classification on merged row — type may have been wrong on the half-question

**For score 2–3 (uncertain)**:
- Flag `q_a.render_hint = 'suspected_page_split'`
- Add both rows to `audit/page_split_review.md` with their text side-by-side for human confirmation
- Do NOT merge automatically

**For common known split patterns** (auto-merge without human review):
- `q_b.question_text` starts with `(contd.)` or `continued` → always merge
- `q_b.question_text` starts with `(ii)` or `(b)` and `q_a` has no sub-parts yet → always merge

**Special handling by question type**:

*Accountancy journal entries / financial statements*:
- A journal that stops mid-entry (no closing `Dr.`/`Cr.` balance on q_a) + q_b has the debit/credit completion → merge
- After merge, re-run 3C (table parse) on the merged text

*Economics passages (CBQ)*:
- Passage stimulus cut at page boundary: q_a = passage fragment, q_b = more passage + sub-questions
- After merge: re-run 3O (CBQ structure) — extract `cbq_stimulus` from merged text, re-link sub-questions

*Mathematics multi-step*:
- LaTeX expression cut at page boundary (common: matrix rows split, integral limits on different pages)
- After merge: validate LaTeX completeness — check balanced `\begin{}`/`\end{}` and `\frac{}{}` pairs
- Set `render_hint = 'latex_merge_verify'` so human can check the render

*English passages*:
- Unseen passage split at page boundary → merge passage halves, then re-link comprehension sub-questions as children

**Schema additions**:
```sql
ALTER TABLE questions ADD COLUMN had_page_split BOOLEAN DEFAULT false;
ALTER TABLE questions ADD COLUMN merged_into_id INTEGER REFERENCES questions(id);
ALTER TABLE questions ADD COLUMN split_score INTEGER;
-- Stores the detection score for audit reference
```

**Verification Gates ✓**:
```python
# Gate 1: No orphaned continuation fragments remain active
# Run: pipeline/repair/detect_page_splits.py --mode=verify
# All score-4+ pairs must have status = 'page_split_merged' on the second row
# Output to: audit/page_split_verification.txt
```

```sql
-- Gate 2: No active questions that start with lowercase (strongest single signal)
SELECT COUNT(*) FROM questions
WHERE status = 'active'
AND question_text REGEXP '^[a-z]';
-- Must return 0

-- Gate 3: All questions flagged had_page_split=true must have marks set
SELECT COUNT(*) FROM questions
WHERE had_page_split = true AND marks IS NULL;
-- Must return 0

-- Gate 4: Soft-deleted halves must be marked
SELECT COUNT(*) FROM questions
WHERE status = 'page_split_merged' AND merged_into_id IS NULL;
-- Must return 0
```

```markdown
# Gate 5: Human review file exists
audit/page_split_review.md must exist
audit/page_split_candidates.csv must exist with columns: q_a_id, q_b_id, score, auto_merged (true/false)
```

**Audit output** — append to `audit/FINAL_REPORT.md`:
```
## Page Split Summary
- Candidate pairs detected: N
- Auto-merged (score ≥ 4 or pattern match): N
- Pending human review (score 2–3): N  (see audit/page_split_review.md)
- By subject: Accountancy N | Economics N | Maths N | BST N | English N
```

---

## PHASE 4 — CLASSIFICATION (Needs Classification → Tagged)

For every question still labelled `chapter = 'Needs classification'`:

1. Attempt keyword-based classification using a mapping file `pipeline/tagging/keyword_map.json`
2. If confidence ≥ 0.7 → update `chapter` and `topic` in DB, set `classification_source = 'keyword_auto'`
3. If confidence < 0.7 → call the 9Router API (env: `NINEROUTER_URL`, `NINEROUTER_KEY`, `NINEROUTER_MODEL`) with the question text
4. Store 9Router response in `tag_metadata` JSON column
5. If 9Router unavailable → leave as `Needs classification` and log to `audit/classification_pending.csv`

**Verification Gate ✓**:
```sql
SELECT COUNT(*) FROM questions WHERE chapter = 'Needs classification';
-- Log this number. Target: reduce by ≥ 80% from Phase 1 baseline.
-- If 9Router is unavailable, a reduction via keyword-auto alone is acceptable.
```

---

## PHASE 5 — RENDER VERIFICATION (Computer Use / Browser Check)

After all DB fixes, start the dev server (`bun run dev`) and perform visual verification:

1. Navigate to the question list/browse page
2. Spot-check **5 questions of each type** (MCQ, AR, Statement-based MCQ, Table, Graph, Diagram-MCQ, Multi-part, CBQ, Passage/Comprehension, OR pair, Fill-in-blank, Match-the-following, Numerical with LaTeX, LPP, Scenario-based BST, Letter Writing, Invitation Writing, Job Application, Literature Extract, True/False, VI Alternative, HOTS-tagged, page-split-merged question, and a question with `marks_display_position = 'right'` badge)
3. For each, verify:
   - [ ] Question text renders without raw JSON, pipe characters, or garbled symbols
   - [ ] Options render as a proper list (MCQ/AR)
   - [ ] Tables render as HTML table or structured layout (not flat text)
   - [ ] Images load (no broken img tags)
   - [ ] Marks badge shows correct value
   - [ ] Chapter/topic tag is not `Needs classification` (for auto-classified ones)
4. Screenshot or log any rendering failures to `audit/render_issues.md`

---

## PHASE 6 — FINAL AUDIT REPORT

Generate `audit/FINAL_REPORT.md` containing:

```
## Summary
- Total questions at start: N
- Total questions after deduplication: N
- Questions fixed (formatting): N
- Questions fixed (marks): N
- Questions auto-classified: N
- Questions pending human review: N (list file: audit/human_review_queue.md)

## Verification Gate Results
| Gate | Status | Count |
|------|--------|-------|
| Deduplication (same-source) | PASS/FAIL | 0 dupes |
| Multi-set variant deduplication | PASS/FAIL | N variants tagged |
| MCQ options | PASS/FAIL | 0 missing |
| AR structure | PASS/FAIL | 0 malformed |
| Statement 1/2 MCQ typed | PASS/FAIL | 0 misclassified |
| OR pairs | PASS/FAIL | 0 unpaired |
| Fill in Blank normalised | PASS/FAIL | 0 missing token |
| True/False marks | PASS/FAIL | 0 wrong marks |
| Match Following structure | PASS/FAIL | 0 missing column_a |
| Distinguish sub-type | PASS/FAIL | 0 misclassified |
| Maths numericals render_hint | PASS/FAIL | 0 missing hint |
| LPP structured | PASS/FAIL | 0 untyped LPP |
| Applied Maths subject isolation | PASS/FAIL | 0 cross-tagged |
| CBQ orphan sub-questions | PASS/FAIL | 0 orphans |
| Defend/Refute typed | PASS/FAIL | 0 misclassified |
| Internal choice blocks | PASS/FAIL | 0 instruction in question_text |
| VI alternatives typed + linked | PASS/FAIL | 0 unlinked |
| Diagram MCQ image check | PASS/FAIL | N flagged missing image |
| Numerical MCQ subtype | PASS/FAIL | 0 unsubtyped |
| Scenario BST typed | PASS/FAIL | 0 long BST unclassified |
| Accountancy Part B branching | PASS/FAIL | Both branches present |
| English question types | PASS/FAIL | 0 unrecognised types |
| Invitation writing typed | PASS/FAIL | 0 misclassified |
| Job application typed | PASS/FAIL | 0 misclassified |
| Literature extract + source | PASS/FAIL | 0 missing text_source |
| HOTS label stripped | PASS/FAIL | 0 labels in question_text |
| cognitive_level populated | PASS/FAIL | 0 NULL values |
| Q-number/section bleed | PASS/FAIL | 0 violations |
| **Marks trailing bracket stripped** | **PASS/FAIL** | **0 brackets in question_text** |
| **marks_source populated** | **PASS/FAIL** | **0 NULL marks_source** |
| **Marks section cross-validation** | **PASS/FAIL** | **N violations logged** |
| **No zero marks** | **PASS/FAIL** | **0 rows with marks=0** |
| **Page split candidates detected** | **PASS/FAIL** | **audit/page_split_candidates.csv exists** |
| **Page split auto-merges done** | **PASS/FAIL** | **0 score≥4 pairs unmerged** |
| **No active lowercase-start rows** | **PASS/FAIL** | **0 rows starting with lowercase** |
| **Merged rows have marks** | **PASS/FAIL** | **0 had_page_split=true with marks NULL** |
| Table parse | PASS/FAIL | N flagged for review |
| Graph images | PASS/FAIL | 0 broken paths |
| Artefact text | PASS/FAIL | 0 violations |
| Classification | PASS/FAIL | N% reduced |

## Known Remaining Issues
(list anything that requires human review or is intentionally deferred)
```

---

## COMPLETION CRITERIA

The goal is **complete** when ALL of the following are true:

- [ ] `audit/phase1_findings.md` exists
- [ ] `audit/deduplication_report.md` exists and deduplication gate passes
- [ ] All 7 question-type verification gates return PASS
- [ ] `audit/FINAL_REPORT.md` exists with all gate statuses filled in
- [ ] `audit/human_review_queue.md` exists (may be empty — that is fine)
- [ ] Dev server starts without errors (`bun run dev`)
- [ ] No TypeScript or Drizzle migration errors

If any gate returns FAIL, loop back to the relevant phase, fix, and re-run the gate. Do not mark the goal complete with a failing gate.

---

## CONSTRAINTS

- Never fabricate question content. If text is unrecoverable, mark it `render_hint = 'unrecoverable'` and add to human review queue.
- Never hard-delete rows. Use `status = 'duplicate'` or `status = 'archived'`.
- All schema changes must be via Drizzle migrations (`bun run db:generate && bun run db:migrate`).
- Commit after each phase completes with message: `fix(phase-N): <description>`.
- Write all audit files to `audit/` directory (create it if it doesn't exist).
- If a Python dependency is missing, add it to `pipeline/requirements.txt` and document it.

---
