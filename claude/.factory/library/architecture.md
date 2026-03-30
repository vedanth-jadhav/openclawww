# Architecture

How the system works at a high level.

**What belongs here:** major components, data flow, ownership boundaries, invariants.
**What does NOT belong here:** step-by-step implementation tasks or service commands.

---

## System overview
Mockly MVP is a two-surface product:
1. A Next.js 15 marketplace web app for discovery, auth, browsing, and item detail
2. A `mockly` CLI for installing assets, extracting local Claude setups, and producing wizard-driven recommendations

Both surfaces rely on the same canonical hosted Supabase-backed item catalog.

## Major components

### Web app
- App Router-based Next.js app
- Public homepage is the marketplace browse surface
- Public item detail routes render canonical item data and README content
- Auth routes establish local sessions through hosted Supabase OAuth
- Future seller/payment pages may exist only as placeholders
- The web surface owns public discovery UX, route-level auth handling, and the browser-visible install command text for each item

### Data layer
- Hosted Supabase provides auth, Postgres, and storage only if implementation truly needs it
- Profiles are created automatically from auth events/triggers
- Items are the canonical marketplace records and own slug, title, category, README, and install-command identity
- Reviews and wizard sessions are part of the approved schema surface even if some are lightly used in MVP
- Future seller/payment-related fields or tables may exist only as scaffolding and must not create working commerce behavior
- Seed flow populates the hosted dataset with MVP free items
- Idempotent seeding is required so canonical slugs/install metadata stay stable
- Search/filter/sort behavior must operate over the same canonical item dataset that powers detail pages and CLI install resolution

### CLI
- `mockly install` resolves items from a single canonical live catalog source and materializes them under `.claude`
- `mockly extract` packages the current local Claude setup
- `mockly wizard` produces recommendation output and a skill-file path aligned to installable free items
- The CLI owns filesystem materialization, category-to-destination mapping, config merge behavior, and guardrails that keep writes inside the resolved `.claude` root

## Ownership boundaries
- Canonical item identity is owned by the item record in hosted Supabase. Web and CLI surfaces must consume that identity consistently rather than deriving alternate slugs or install commands.
- The web app owns presentation of discovery metadata, README rendering, and user-triggered navigation between browse and detail surfaces.
- Seed authorization and idempotent data population belong to the app's protected seed flow backed by hosted Supabase writes.
- The CLI should consume one canonical catalog contract. Workers must avoid splitting the source of truth across unrelated local data definitions.
- Config/MCP merge behavior belongs to the CLI install layer and must preserve unrelated user state while remaining idempotent on repeat install.
- Placeholder seller/payment behavior belongs to the web surface and must fail early as intentionally unavailable, not late as broken partial workflows.

## Data model shape
- `profiles` extend authenticated users and are created automatically on first successful login.
- `items` are the canonical marketplace assets and must carry enough information for browse, detail, and install flows.
- `reviews` and `wizard_sessions` exist in schema planning so later work can extend safely, even if their MVP use is narrow.
- Future seller/payment structures may exist in schema only as placeholders and must not be treated as shipped transactional features.

## Key invariants
- Homepage is the marketplace, not a landing page.
- Only free seed items are installable in MVP.
- Canonical identity must align across web, data, and CLI surfaces: slug, title, category, install command, and installed artifacts must match.
- Seller/payment capabilities are placeholder-only and must be visibly non-operational.
- Local development and validation use hosted Supabase; no local Supabase runtime dependency.
- Browser wizard/chat is out of scope for MVP; wizard behavior is terminal-first.

## Core data flows

### Auth flow
User starts at `/auth/login` -> provider OAuth -> `/auth/callback` exchanges code for session -> session is visible in UI -> profile row exists/reuses existing row.

### Marketplace flow
Protected seed flow populates hosted data -> homepage reads canonical items -> search/filter/sort narrow the same dataset -> item detail renders the same canonical record -> browser-visible install command corresponds to that record.

### CLI install flow
User invokes `mockly install <slug>` -> CLI resolves the canonical live catalog contract for that slug -> category-specific files/config are written under `.claude` -> resulting local artifact corresponds to the same canonical item seen in the app.

### Extract flow
User invokes `mockly extract` -> current `.claude` configuration/files are collected -> archive output is produced for marketplace-compatible packaging.

### Wizard flow
User runs `mockly wizard` -> conversation gathers needs -> recommendations and install command are emitted -> optional skill-file artifact is generated -> emitted install command installs the same recommended free items.

## Failure-mode expectations
- Invalid item slugs must resolve to a clear not-found state in the web app and a clear unavailable/not-found error in the CLI.
- Failed auth callbacks must return users to a recoverable logged-out state.
- Missing required environment variables should fail clearly before broken runtime behavior.
- Unavailable live catalog/API dependencies must not leave partial CLI install state behind.
- Placeholder seller/payment surfaces must appear intentionally unavailable at entry, not only after a broken late-stage failure.

## Extension direction
The architecture should allow later activation of seller workflows, paid listings, and payment processing without restructuring the web/CLI/data contract already established in MVP. Later work should be able to promote placeholder schema and routes into operational flows without changing the canonical item contract already shared by web and CLI.
