# openclawww

Two TypeScript/Next.js experiments live in this repository:

- `boards/` - a local-first Class 12 Commerce previous-year-question index and study app
- `claude/` - Mockly, a Supabase-backed marketplace prototype for skills, templates, and prompts

They are separate apps with separate package files. There is no root application or shared build command.

## Boards

Boards imports official CBSE question-paper PDFs into a local SQLite database, groups repeated questions, and exposes trends, search, source review, and MCQ practice in a Next.js UI.

Stack: Next.js App Router, TypeScript, Bun, Tailwind, SQLite, Drizzle, SQLite FTS5, and a Python extraction pipeline.

```bash
cd boards
bun install
bun run db:import
bun run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
bun run build
bun run quality:audit
```

The committed dataset has passed the automated audit gates recorded in `boards/audit/FINAL_REPORT.md`, but 1,248 items remain in the human-review queue. A passing script is not the same as verified source quality.

See `boards/README.md` and `boards/PLAN.md` for the data pipeline and source-review flow.

## Mockly prototype

`claude/` is a marketplace prototype with anonymous browsing, Google/GitHub sign-in, item pages, catalog seeding, and a hosted Supabase schema.

```bash
cd claude
npm install
cp .env.example .env.local
npm run dev
```

Required Supabase values are listed in `.env.example`. Seeding also needs `SEED_SECRET`; optional API-assisted flows use the remaining service variables.

Verify it with:

```bash
npm run typecheck
npm test
npm run build
```

## Current status

Both directories are active prototypes. Boards has a working local UI and import/audit pipeline, but its source set and human review are incomplete. Mockly has the marketplace, authentication, schema, and test scaffolding, but it is not documented or packaged as a production deployment.

There is no finished "OpenClaw" product at the repository root. The repository name is historical; use the directory names when discussing or running the code.
