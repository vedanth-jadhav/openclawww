import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMarketplaceItemBySlug } from '@/lib/marketplace/browse'

export default async function MarketplaceItemPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const item = await getMarketplaceItemBySlug(slug)

  if (!item) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-50 sm:px-6 sm:py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Link
          href="/"
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          Back to marketplace
        </Link>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/20 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">{item.category}</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{item.title}</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{item.summary}</p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Free asset
            </span>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/90 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Install command</p>
            <code className="mt-3 block break-all text-sm leading-7 text-cyan-100">{item.install_command}</code>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>

          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Overview</p>
            <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
              {item.description ?? item.summary}
            </p>
          </section>
        </section>
      </div>
    </main>
  )
}
