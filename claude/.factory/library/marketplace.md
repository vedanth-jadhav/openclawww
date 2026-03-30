# Marketplace

Marketplace-specific product knowledge for workers.

---

## MVP behavior
- Public discovery surface lives on `/`.
- Required browse controls: keyword search, category filters, sort.
- Detail pages must render canonical item information and README markdown.
- Free seed items are the only installable assets in MVP.
- If scaffolded or future-facing records exist, they must not appear as actively installable.

## UX stance
- Barebones-but-good, not polished marketing UI.
- Keep structure clean and replaceable by a future Framer-based redesign.
- Do not introduce in-browser wizard chat.

## Data assumptions
- Hosted Supabase is the source of truth.
- Seed flow must be protected and idempotent.
- Slugs and install commands must remain stable once seeded.

## Cross-surface contract
- The install command shown on web surfaces should correspond to what the CLI accepts.
- Item category determines CLI destination behavior under `.claude`.
