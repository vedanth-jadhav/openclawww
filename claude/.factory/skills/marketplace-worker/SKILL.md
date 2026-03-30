---
name: marketplace-worker
description: Builds and verifies the marketplace web experience, seed flow, discovery controls, and item detail surfaces for Mockly MVP.
---

# Marketplace Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill
Use for homepage marketplace features, search/filter/sort, item cards/detail pages, markdown rendering, seed route/data, and placeholder web surfaces.

## Required Skills
Workers must invoke every relevant skill, not just one.
- `senior-frontend` — for Next.js UI implementation and interaction decisions
- `frontend-design` — to keep the temporary UI clean, structured, and usable
- `ui-ux-pro-max` — for interaction polish where relevant without overbuilding
- `react-best-practices` — for state, rendering, and client/server boundary decisions
- `tailwind-patterns` — when styling structure is introduced
- `senior-backend` — for seed routes, data fetching, or Supabase query logic affecting the web surface
- `find-docs` — for current framework/library docs when needed
- `agent-browser` — mandatory for user-facing flow verification
- `browser-navigation` — if deeper browser debugging/navigation help is needed

## Work Procedure
1. Read mission artifacts and `.factory/library/marketplace.md` before changing browse/detail behavior.
2. Invoke every relevant skill above and use them to shape both implementation and verification.
3. Add failing tests first for utilities, route logic, or component behaviors that are practical to lock down automatically.
4. Implement marketplace features with hosted Supabase as the source of truth; avoid hardcoded browse mocks except narrowly scoped tests.
5. Preserve canonical identity across card, detail, API, and install command surfaces.
6. Run targeted tests plus typecheck/lint/build commands as appropriate.
7. Use `agent-browser` to verify search, filters, sort, detail rendering, empty states, copy/install affordances, and placeholder-only future surfaces.
8. Record exact browser actions and outcomes. Vague verification is not acceptable.

## Example Handoff
```json
{
  "salientSummary": "Built the homepage marketplace and item detail routes, seeded hosted Supabase with free items, and verified browse/search/filter/detail flows manually in the browser. Fixed a mismatch where the detail route showed stale install metadata after sort navigation.",
  "whatWasImplemented": "Added the hosted-data marketplace homepage, category filters, keyword search, sort controls, item cards, item detail rendering with markdown, and a protected idempotent seed route. Also added placeholder seller/payment pages that clearly mark those flows unavailable.",
  "whatWasLeftUndone": "Mobile verification still needs a second pass on the seller placeholder route because the first run focused on marketplace surfaces.",
  "verification": {
    "commandsRun": [
      {
        "command": "npm run test -- marketplace",
        "exitCode": 0,
        "observation": "Component and route tests passed for search/filter/detail logic."
      },
      {
        "command": "npm run typecheck",
        "exitCode": 0,
        "observation": "No TypeScript errors after aligning item DTOs."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Loaded /, searched for 'frontend', applied Skills filter, then opened the first card",
        "observed": "Results narrowed correctly, filter state persisted, and the detail page matched the same slug/title/install command."
      },
      {
        "action": "Called the seed endpoint twice with the correct header",
        "observed": "Second run preserved stable counts and slugs; no duplicate items were created."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "app/page.test.tsx",
        "cases": [
          {
            "name": "restores results after clearing a zero-result search",
            "verifies": "Marketplace empty-state recovery without reload."
          }
        ]
      }
    ]
  },
  "discoveredIssues": [],
  "skillsUsed": [
    {
      "skill": "frontend-design",
      "contribution": "Kept the temporary browse UI minimal but structurally clean."
    },
    {
      "skill": "react-best-practices",
      "contribution": "Helped separate server-loaded listing data from client-side filter controls."
    },
    {
      "skill": "agent-browser",
      "contribution": "Verified the real browse/detail/seed flows against hosted data."
    }
  ]
}
```

## When to Return to Orchestrator
- Hosted Supabase data contracts conflict with the feature requirements
- Seed route behavior or item schema requirements need a new product decision
- Marketplace verification is blocked by missing auth/env/runtime setup outside the feature scope
- Placeholder-only future surfaces appear to require real seller/payment behavior to proceed
