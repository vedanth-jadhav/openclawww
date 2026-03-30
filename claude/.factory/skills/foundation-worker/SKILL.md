---
name: foundation-worker
description: Establishes project foundations, auth, schema, environment wiring, and baseline quality gates for the Mockly MVP.
---

# Foundation Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill
Use for foundation features: project initialization, dependency setup, schema/migrations, environment wiring, Supabase clients, auth routes/pages, and baseline project quality gates.

## Required Skills
Workers must invoke every relevant skill, not just one.
- `senior-architect` — before making architectural structure decisions
- `senior-backend` — for schema, auth, route handlers, and data access decisions
- `senior-frontend` — for auth page/app structure decisions that affect Next.js app composition
- `find-docs` — for current Next.js, Supabase, and auth-related API details
- `react-best-practices` — when app structure or client/server boundaries are involved
- `agent-browser` — for manual verification of auth and app flows
- `browser-navigation` — if browser automation support is needed beyond direct verification

## Work Procedure
1. Read mission artifacts, `AGENTS.md`, `.factory/library/*`, and the feature definition before making changes.
2. Invoke all relevant skills above. Record what each one contributed in the handoff.
3. Write failing tests first when the feature has testable logic or routes. If no tests are added, justify why in the handoff.
4. Implement in small coherent slices, keeping canonical data shapes stable across web and CLI boundaries.
5. Run the relevant command set from `.factory/services.yaml`: at minimum typecheck, targeted tests, and lint when available.
6. Manually verify with `agent-browser` for any auth or user-facing route behavior. Capture exact user actions and observed results.
7. If the environment or service assumptions are wrong, return to orchestrator instead of inventing alternate infrastructure.

## Example Handoff
```json
{
  "salientSummary": "Initialized the Next.js app, added Supabase client layers and auth callback flow, and validated Google/GitHub login wiring locally. Typecheck and lint passed after tightening server/client boundaries.",
  "whatWasImplemented": "Created the app skeleton, environment scaffolding, hosted-Supabase client helpers, minimal login page, and auth callback route. Added migration structure and profile-trigger plumbing so first login creates a profile row and repeat logins reuse it.",
  "whatWasLeftUndone": "Google OAuth could not be fully completed because provider credentials were not yet configured in Supabase.",
  "verification": {
    "commandsRun": [
      {
        "command": "npm run typecheck",
        "exitCode": 0,
        "observation": "No TypeScript errors after moving cookie-aware logic to server-only modules."
      },
      {
        "command": "npm run lint",
        "exitCode": 0,
        "observation": "Lint passed with no blocking issues."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened /auth/login and clicked Continue with GitHub",
        "observed": "Provider redirect started successfully with localhost callback target."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "app/auth/callback/route.test.ts",
        "cases": [
          {
            "name": "redirects to next destination on successful code exchange",
            "verifies": "Auth callback completes session exchange and redirects correctly."
          }
        ]
      }
    ]
  },
  "discoveredIssues": [
    {
      "severity": "medium",
      "description": "Supabase project lacked one OAuth provider callback during first verification run.",
      "suggestedFix": "Update provider settings in Supabase dashboard before re-running auth validation."
    }
  ],
  "skillsUsed": [
    {
      "skill": "senior-architect",
      "contribution": "Confirmed clean split between browser/server/admin Supabase clients."
    },
    {
      "skill": "find-docs",
      "contribution": "Verified current @supabase/ssr callback and cookie handling guidance."
    },
    {
      "skill": "agent-browser",
      "contribution": "Validated login page and provider redirect behavior."
    }
  ]
}
```

## When to Return to Orchestrator
- Hosted Supabase project access, linkage, or OAuth configuration is missing or inconsistent
- The feature depends on a product decision not captured in mission artifacts
- Required infrastructure or commands in `.factory/services.yaml` are broken or incomplete
- Validation cannot continue because real auth dependencies are unavailable
