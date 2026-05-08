# PLAN.md
> Read this first. This project is a local-first PYQ intelligence app for Class 12 Commerce.

## What This Is

A personal study tool for Accountancy, Business Studies, Economics, Maths, and English.

The goal is not to generate new questions. The goal is to collect official PYQ/PYP questions, convert them into clean structured text, segment them by subject/chapter/topic, cluster repeated or near-repeated questions, and show exam trend intelligence.

## Stack

- Next.js App Router
- TypeScript
- Bun for package management and script running
- Tailwind CSS
- shadcn-style local UI primitives
- SQLite local database
- Drizzle schema
- SQLite FTS5 search
- Python data pipeline
- 9Router for AI-assisted tagging, clustering, and draft solutions

SQLite uses `better-sqlite3` at runtime because the Next.js server build runs on Node. Bun still owns installs and `bun run ...` scripts.

## Design Direction

Think Linear meets a focused student Notion setup.

- no gradients
- no glassmorphism
- no hero sections
- no decorative illustrations
- no card shadows
- rounded corners max 8px
- flat, dense, fast, useful
- every visible element must earn its place

Palette:

```txt
bg:        #F9F9F7
surface:   #FFFFFF
text:      #141414
muted:     #888888
accent:    #5B5BD6
border:    #EBEBEB
answer-bg: #F4F4F2
correct:   #22C55E
wrong:     #EF4444
skipped:   #F59E0B
```

## Current App Modes

### Trends

Shows exam intelligence:

- total indexed questions
- paper source count
- repeated clusters
- weighted appearances
- chapter frequency
- top repeated question clusters

### Browse

Filters and searches questions by:

- subject
- question type
- full-text search via SQLite FTS5

Each question should expose:

- canonical text
- formatted question body
- subject/chapter/topic
- marks
- repeat count
- original occurrences by year/set/question number
- official answer if available
- AI draft solution only when requested

### Practice

MCQ practice mode stores local attempts in SQLite.

Current v1 has the persistence path in place. Future work should improve answer-option extraction and correct-option storage from official marking schemes.

### Sources

Shows the reviewable source manifest plus download/extraction counts. The downloader must not bulk-download until exact official PDF URLs are reviewed.

## Data Model

Core entities:

- subjects
- chapters
- topics
- papers
- question clusters
- questions
- question occurrences
- solutions
- practice attempts
- practice responses
- questions_fts virtual table

Preserve both:

- the canonical grouped question
- every original occurrence from each paper

This is required so repeated/near-repeated questions can be audited.

## Pipeline

The pipeline is Python-first.

### 1. Source Manifest

Run:

```bash
python3 pipeline/downloader/discover_sources.py --limit 6
```

This creates `pipeline/downloader/source_manifest.json`.

Rules:

- official CBSE/NCERT/marking-scheme sources first
- last 10 years where available
- exact PDF URLs only before download
- English content only
- skip Hindi translated duplicates
- keep `reviewRequired: true` until the user verifies source URLs

For the current tiny trial only, this was run with:

```bash
python3 pipeline/downloader/discover_sources.py --limit 6 --reviewed
```

That creates a reviewed manifest for Accountancy, Business Studies, and Economics 2025-26 CBSE Academic sample question papers plus marking schemes.

### 2. Download

After review, set `reviewRequired` to `false`, then run:

```bash
python3 pipeline/downloader/fetch.py
```

The downloader:

- retries downloads
- skips existing files
- rejects non-PDF responses
- writes `download_log.json`

### 3. Extract

Use native PDF text when reliable.

Use MinerU 2.5 for scanned/broken PDFs, formulas, layout, and tables.

Extraction output must prefer structured text:

- Markdown for question text
- LaTeX-style text for formulas where possible
- structured tables for Accountancy and Maths
- low-confidence formulas/tables flagged for review

Current trial command:

```bash
python3 pipeline/extraction/extract.py
```

This emits JSON under `pipeline/extracted/` and writes `pipeline/extracted/extraction_report.json`.

### 3.5. Import

Run:

```bash
bun run db:import
```

This clears old imported study data, imports extracted official-source questions, rebuilds repeat clusters, and refreshes SQLite FTS5.

Placeholder seed data has been removed. If the app has questions, they came from extracted official-source files.

### 4. Tag With 9Router

Environment:

```bash
NINEROUTER_URL=...
NINEROUTER_KEY=...
NINEROUTER_MODEL=...
```

Use 9Router for:

- chapter/topic classification
- near-duplicate clustering assistance
- confidence notes
- AI draft solutions where official answers are missing

Official answers and AI drafts must remain separate.

AI draft solutions must be labeled clearly and should never be silently treated as official.

## Commands

Install:

```bash
bun install
```

Import extracted official-source data:

```bash
bun run db:import
```

Develop:

```bash
bun run dev
```

Build:

```bash
bun run build
```

## Checkpoints

1. Source manifest reviewed by user.
2. PDFs downloaded and spot-opened as real official PDFs.
3. Extraction validated on a small sample across Accountancy, Maths, and one theory subject.
4. Hindi duplicate removal verified on bilingual papers.
5. Duplicate clustering checked against exact and near-match repeats.
6. SQLite import builds FTS index cleanly.
7. Dashboard counts match raw occurrences.
8. Practice attempt persists after restart.

## Current Implementation Notes

The current scaffold includes:

- runnable Next.js app
- SQLite schema and runtime migrations
- Trends, Browse, Practice, and Sources screens
- local API routes
- FTS-backed search path
- official CBSE Academic manifest generator
- guarded downloader
- native PDF extraction trial
- extracted JSON importer
- 9Router client skeleton

Current trial status:

- 3 official CBSE Academic sample question papers downloaded
- 96 extracted questions imported into SQLite
- subjects imported: Accountancy, Business Studies, Economics
- chapter/topic classification is intentionally set to `Needs classification` until 9Router/manual tagging is run

Next major work: review extraction quality, attach marking-scheme answers, then expand to older official board papers.
