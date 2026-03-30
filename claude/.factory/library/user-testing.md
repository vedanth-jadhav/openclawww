# User Testing

Testing surfaces, required testing tools, and validation concurrency guidance.

**What belongs here:** Validation surfaces, tool selection, environment constraints, runtime testing notes, concurrency classification.

---

## Validation Surface

### Browser surface
Covers:
- `/auth/login`
- `/auth/callback`
- homepage marketplace browse/search/filter/sort
- item detail routes
- placeholder seller/payment surfaces if present

Primary tool:
- `agent-browser`

Environment:
- Local app on port 3000 against hosted Supabase
- Real OAuth on localhost

### CLI surface
Covers:
- `mockly install`
- `mockly extract`
- `mockly wizard`
- generated skill-file artifacts

Primary tools:
- shell execution
- terminal interaction automation if needed

Environment:
- disposable test project with a writable `.claude` tree
- live marketplace/API data

### Build/deploy surface
Covers:
- production build
- Vercel preview readiness

Primary tools:
- shell execution
- Vercel CLI

## Validation Concurrency

### Browser surface
- Max concurrent validators: 3
- Rationale: 10 CPU cores available; browser automation plus local Next.js dev server and OAuth redirects can be moderately heavy. Conservative concurrency protects stability while allowing parallel validation.

### CLI surface
- Max concurrent validators: 4
- Rationale: CLI runs are lighter than browser sessions, but some validations perform filesystem writes and may hit shared live APIs. Keep headroom for the local app and browser validation.

### Build/deploy surface
- Max concurrent validators: 1
- Rationale: build/deploy flows are heavyweight and should run serially to avoid noisy failures and environment contention.

## Current accepted limitations
- No Dockerized local Supabase runtime
- No custom-domain auth validation in MVP
- Vercel preview readiness is enough; custom-domain production validation is deferred
