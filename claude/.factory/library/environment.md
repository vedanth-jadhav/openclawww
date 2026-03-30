# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, hosted service dependencies, OAuth requirements, local setup notes, deployment prerequisites.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Runtime model
- Local Next.js app runs against hosted Supabase project `kxwtpdnlbmsqbzpycgzx`.
- No Docker-based local Supabase runtime is used in this mission.
- Vercel preview deployment is the release validation target.

## Expected environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY` (for CLI wizard / any retained wizard API behavior)
- `NEXT_PUBLIC_APP_URL` (use localhost during local validation; custom domain later)
- `SEED_SECRET`
- `MOCKLY_API_URL`

Additional variables may be added if implementation requires them, but workers should keep the set minimal and update this file when new required envs become authoritative.

## OAuth notes
- Google and GitHub OAuth must both work locally.
- Local callback is required for MVP validation.
- Custom-domain callback for `claudehub.aimockly.com` is deferred.

## Deployment notes
- Vercel CLI is available locally.
- GitHub Actions are out of scope for this mission.
- Preview deploy readiness is sufficient for MVP completion.
