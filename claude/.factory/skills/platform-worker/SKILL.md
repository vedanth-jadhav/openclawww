---
name: platform-worker
description: Handles cross-cutting platform work such as deployment hardening, preview readiness, placeholder surfaces, and environment-level verification.
---

# Platform Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill
Use for deploy hardening, environment/config work, cross-surface placeholder behavior, production build verification, and Vercel preview readiness.

## Required Skills
Workers must invoke every relevant skill, not just one.
- `senior-architect` — for cross-surface architecture and deploy-boundary decisions
- `senior-backend` — for env/config, routes, and server/runtime concerns
- `senior-frontend` — for placeholder surfaces and cross-route UI consistency
- `find-docs` — for Vercel/Next.js/runtime documentation details
- `agent-browser` — for placeholder route and cross-surface verification
- `browser-navigation` — if browser troubleshooting is needed

## Work Procedure
1. Read mission artifacts, `.factory/library/environment.md`, and `.factory/library/user-testing.md` before changing config or deploy behavior.
2. Invoke every relevant skill above before making platform decisions.
3. Add failing tests first where env parsing, route behavior, or placeholder rendering can be meaningfully covered.
4. Implement the smallest changes needed to satisfy deploy-readiness and placeholder-boundary requirements.
5. Run build/typecheck/lint and any targeted tests. Preview/deploy-related commands must be recorded exactly in the handoff.
6. Verify placeholder routes in the browser so they are intentionally non-operational rather than broken.
7. Return to orchestrator if external accounts, domains, or credentials block completion.

## Example Handoff
```json
{
  "salientSummary": "Added environment guards, seller/payment placeholder routes, and preview-deploy hardening. Verified the app builds against hosted Supabase configuration and that placeholder routes are explicitly unavailable rather than broken.",
  "whatWasImplemented": "Created environment validation helpers, added seller and payment placeholder route content, tightened preview-deploy configuration, and updated runtime wiring so the app builds cleanly without local Supabase or custom-domain assumptions.",
  "whatWasLeftUndone": "Custom-domain callback wiring remains intentionally deferred because the domain is not yet authenticated.",
  "verification": {
    "commandsRun": [
      {
        "command": "npm run build",
        "exitCode": 0,
        "observation": "Production build succeeded using hosted-service configuration only."
      },
      {
        "command": "vercel build",
        "exitCode": 0,
        "observation": "Preview build path completed with current environment assumptions."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened seller and payment-related routes in the browser",
        "observed": "Each route showed a clear placeholder/unavailable state with no broken form or transaction path."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "lib/env.test.ts",
        "cases": [
          {
            "name": "throws clear error when required Supabase env is missing",
            "verifies": "Missing configuration fails clearly before runtime breakage."
          }
        ]
      }
    ]
  },
  "discoveredIssues": [],
  "skillsUsed": [
    {
      "skill": "find-docs",
      "contribution": "Confirmed current Vercel preview and Next.js env-handling expectations."
    },
    {
      "skill": "agent-browser",
      "contribution": "Verified placeholder routes were intentionally non-operational."
    }
  ]
}
```

## When to Return to Orchestrator
- External deployment, domain, or credential setup is missing and blocks feature completion
- Preview/deploy requirements change beyond the approved MVP
- Placeholder-only routes appear to require operational seller/payment capabilities to proceed
