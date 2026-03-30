---
name: cli-worker
description: Builds and verifies the Mockly CLI, filesystem application logic, extraction flow, terminal wizard, and skill-file generation.
---

# CLI Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill
Use for `/cli` package features: install, extract, wizard, filesystem/materialization logic, config merge behavior, and CLI-facing API integration.

## Required Skills
Workers must invoke every relevant skill, not just one.
- `senior-backend` — for command logic, file IO boundaries, and API integration
- `senior-architect` — for CLI/package structure and canonical contract alignment with the web app
- `find-docs` — for commander, Node CLI, packaging, and SDK/library specifics
- `senior-prompt-engineer` — mandatory for wizard/system-prompt and result-block design
- `agent-browser` — when browser comparison is needed for browser-to-CLI canonical alignment checks
- `browser-navigation` — if comparison/debugging across browser and CLI surfaces is needed

## Work Procedure
1. Read mission artifacts and `.factory/library/architecture.md` before editing CLI behavior.
2. Invoke all relevant skills above, especially `senior-prompt-engineer` for wizard behavior and `senior-architect` for CLI/web contract alignment.
3. Write failing tests first for parsers, path resolution, config merge logic, and command behavior wherever practical.
4. Implement CLI commands with deterministic filesystem behavior. Never allow writes outside the intended `.claude` root.
5. Validate against live marketplace/API assumptions rather than inventing a separate local catalog contract.
6. Run CLI-targeted tests plus repo-level typecheck/lint/build where impacted.
7. Manually verify installs, extract output, wizard transcripts, and skill-file artifacts in a disposable test project.
8. If live data dependencies are unavailable or ambiguous, return to orchestrator instead of inventing hidden fallback behavior.

## Example Handoff
```json
{
  "salientSummary": "Implemented `mockly install` and `mockly extract`, then added the terminal wizard result block and skill-file generation flow. Verified real installs into a disposable `.claude` tree and tightened config merge logic to avoid duplicate MCP entries.",
  "whatWasImplemented": "Built the CLI package entrypoint, install command, extract command, category-based file materialization, safe project-root resolution, non-destructive config merge behavior, and terminal wizard output that emits both recommendations and a runnable install command plus optional skill-file artifact.",
  "whatWasLeftUndone": "The mixed valid/invalid batch install path still needs one more targeted automated test.",
  "verification": {
    "commandsRun": [
      {
        "command": "npm --prefix cli test -- --runInBand",
        "exitCode": 0,
        "observation": "CLI tests passed for path resolution, config merge, and extract archive generation."
      },
      {
        "command": "node cli/dist/index.js install senior-frontend-engineer",
        "exitCode": 0,
        "observation": "Installed files into the expected .claude/skills path in the disposable test project."
      }
    ],
    "interactiveChecks": [
      {
        "action": "Ran `mockly wizard`, answered prompts, and executed the emitted install command",
        "observed": "Wizard emitted a single result block, the generated command matched the recommended slugs, and the resulting files were created successfully."
      }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "cli/utils/apply-skill.test.ts",
        "cases": [
          {
            "name": "keeps writes inside the resolved .claude root",
            "verifies": "Materialization cannot escape the intended project tree."
          }
        ]
      }
    ]
  },
  "discoveredIssues": [
    {
      "severity": "low",
      "description": "Wizard interruption path currently returns a generic process exit without a user-friendly message.",
      "suggestedFix": "Add a clean interruption handler and explicit exit message."
    }
  ],
  "skillsUsed": [
    {
      "skill": "senior-prompt-engineer",
      "contribution": "Shaped the wizard prompt and final result-block contract for deterministic parsing."
    },
    {
      "skill": "senior-architect",
      "contribution": "Ensured CLI install behavior stayed aligned with the web marketplace catalog contract."
    }
  ]
}
```

## When to Return to Orchestrator
- Live catalog/API assumptions conflict with the mission contract
- A command needs a product decision not captured in mission artifacts
- Filesystem behavior would require writes outside approved mission boundaries
- Wizard behavior depends on unavailable credentials or unsupported runtime constraints
