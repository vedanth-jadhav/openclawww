import Link from 'next/link'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { getPublicEnv } from '@/lib/config/env'
import { normalizeRedirectPath } from '@/lib/auth/callback'

type LoginPageProps = {
  searchParams: Promise<{
    error?: string
    next?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const env = getPublicEnv()
  const nextPath = normalizeRedirectPath(params.next)

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <Link href="/" className="text-sm font-medium text-cyan-300 transition hover:text-cyan-200">
          ← Back to marketplace
        </Link>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
              Mockly Authentication
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Sign in to Mockly with Google or GitHub.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              OAuth stays on the hosted Supabase project but returns to localhost through the app’s
              callback route so session cookies persist across reloads.
            </p>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <dl className="space-y-4 text-sm text-slate-300">
                <div>
                  <dt className="font-semibold text-white">Supported providers</dt>
                  <dd className="mt-1">Google and GitHub are both wired for the localhost callback flow.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">After sign-in</dt>
                  <dd className="mt-1">You&apos;ll return to <code className="rounded bg-slate-800 px-2 py-1 text-cyan-200">{nextPath}</code> and the signed-in state should stay visible on refresh.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Profile behavior</dt>
                  <dd className="mt-1">First login creates the hosted profile row from provider metadata; repeat logins reuse it.</dd>
                </div>
              </dl>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Continue with OAuth</h2>
              <p className="text-sm leading-6 text-slate-300">
                Choose a provider to start the hosted authorization flow.
              </p>
            </div>

            {params.error ? (
              <p className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {params.error}
              </p>
            ) : null}

            <div className="mt-5">
              <OAuthButtons appUrl={env.NEXT_PUBLIC_APP_URL} nextPath={nextPath} />
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
