# OAuth validation status

- Local app auth routes and signed-in UI code are implemented under `app/auth/*`, `components/auth/*`, and `lib/auth/*`.
- `NEXT_PUBLIC_APP_URL` is set to `http://localhost:3000` in `.env.local` and Supabase OAuth initiation builds callback URLs pointing to `/auth/callback`.
- As of 2026-03-30, both providers now initiate correctly from `/auth/login` in the local app:
  - Google redirects to `accounts.google.com` with Supabase as the OAuth intermediary and preserves `redirect_to=http://localhost:3000/auth/callback` in the flow.
  - GitHub redirects to `github.com/login/oauth/authorize` with `return_to` containing `redirect_to=http://localhost:3000/auth/callback`.
- `/auth/callback` failure handling is verified locally: a missing code redirects to `/auth/login` with a retryable error message and preserved `next` destination.
- Session-refresh middleware was added in `middleware.ts` and `lib/supabase/middleware.ts` so Supabase auth cookies can be refreshed on normal requests, which is required for post-login session persistence across reloads.
- Remaining blocker for full auth closure in an Exec worker: end-to-end provider approval, visible signed-in identity after approval, session persistence after reload, and hosted `profiles` row creation/reuse still require a real authenticated Google and GitHub login in the browser plus hosted database inspection. Those steps were not completable autonomously because no provider credentials or pre-authenticated browser state were available to the worker.
