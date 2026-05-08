# Boards

Modern local-first Class 12 Commerce PYQ intelligence app.

## Stack

- Next.js App Router + TypeScript
- Bun for installs and scripts
- Tailwind + shadcn-style local components
- SQLite + Drizzle schema
- SQLite FTS5 search
- Python pipeline for source manifest, downloads, extraction, and 9Router tagging

## Run

```bash
bun install
bun run db:import
bun run dev
```

Open `http://localhost:3000`.

## Pipeline

Start with a reviewable official-source manifest:

```bash
python3 pipeline/downloader/discover_sources.py --limit 6
```

Edit `pipeline/downloader/source_manifest.json` and set `reviewRequired` to `false` only after review. For a small verified trial against official CBSE Academic links:

```bash
python3 pipeline/downloader/discover_sources.py --limit 6 --reviewed
```

Then:

```bash
python3 pipeline/downloader/fetch.py
python3 pipeline/extraction/extract.py
bun run db:import
```

The current trial manifest indexes Accountancy, Business Studies, and Economics 2025-26 CBSE Academic sample question papers. Extracted questions are imported as real official-source data, with chapter/topic set to `Needs classification` until the tagging phase runs.

9Router tagging uses `NINEROUTER_URL`, optional `NINEROUTER_KEY`, and optional `NINEROUTER_MODEL`.
