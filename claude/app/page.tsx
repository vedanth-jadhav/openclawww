import Link from 'next/link'
import { MarketplaceBrowse } from '@/components/marketplace/marketplace-browse'
import { UserSessionCard } from '@/components/auth/user-session-card'
import { getViewerState } from '@/lib/auth/session'
import { getMarketplaceBrowseItems } from '@/lib/marketplace/browse'

export default async function HomePage() {
  const [viewer, items] = await Promise.all([
    getViewerState(),
    getMarketplaceBrowseItems().catch(() => []),
  ])

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50 sm:px-6 sm:py-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 sm:gap-10">
        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">Mockly marketplace</p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Discover free Mockly assets from the hosted Supabase catalog.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                The homepage is the discovery surface for installable skills, templates, and prompts. Browse live catalog items, copy the canonical install command, and jump into each item&apos;s detail page.
              </p>
            </div>

            {viewer.isAuthenticated ? null : (
              <Link
                href="/auth/login"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                Sign in with Google or GitHub
              </Link>
            )}
          </div>
        </section>

        {viewer.isAuthenticated ? (
          <UserSessionCard
            displayName={viewer.displayName ?? 'Signed-in user'}
            email={viewer.email}
            username={viewer.username}
            provider={viewer.provider}
            avatarUrl={viewer.avatarUrl}
          />
        ) : (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Signed-out session</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Discovery works before login.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              You can browse the marketplace anonymously, then sign in when you need authenticated flows. OAuth should still round-trip through <code className="rounded bg-slate-800 px-2 py-1 text-cyan-200">/auth/callback</code> and keep your hosted profile visible after refresh.
            </p>
          </section>
        )}

        <MarketplaceBrowse items={items} />
      </div>
    </main>
  )
}
