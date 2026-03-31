'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  filterAndSortMarketplaceItems,
  getMarketplaceCategories,
  marketplaceSortOptions,
  type MarketplaceBrowseItem,
  type MarketplaceSortOption,
} from '@/lib/marketplace/browse-state'

type MarketplaceBrowseProps = {
  items: MarketplaceBrowseItem[]
}

function formatCategoryLabel(category: string) {
  return category
    .split('-')
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(' ')
}

function CopyInstallButton({ command }: { command: string | null }) {
  const [state, setState] = useState<'idle' | 'copied' | 'unsupported'>('idle')

  if (!command) {
    return <p className="text-sm font-medium text-slate-500">Install unavailable for this item.</p>
  }

  const commandToCopy = command

  async function handleCopy() {
    if (!navigator.clipboard?.writeText) {
      setState('unsupported')
      return
    }

    await navigator.clipboard.writeText(commandToCopy)
    setState('copied')
    window.setTimeout(() => setState('idle'), 1800)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs leading-6 text-cyan-100 sm:text-sm">
        <code className="break-all">{command}</code>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        title={`Copy install command for ${command}`}
      >
        {state === 'copied' ? 'Copied install command' : 'Copy install command'}
      </button>
      {state === 'unsupported' ? (
        <p className="text-xs text-amber-300">Clipboard access is unavailable in this browser.</p>
      ) : null}
    </div>
  )
}

function MarketplaceCard({ item }: { item: MarketplaceBrowseItem }) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">{formatCategoryLabel(item.category)}</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
          Free
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-300">{item.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-200"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-1 flex-col justify-end gap-4">
        <CopyInstallButton command={item.install_command} />

        <Link
          href={`/items/${item.slug}`}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          Open details
        </Link>
      </div>
    </article>
  )
}

export function MarketplaceBrowse({ items }: MarketplaceBrowseProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sort, setSort] = useState<MarketplaceSortOption>('featured')
  const categories = useMemo(() => getMarketplaceCategories(items), [items])

  const visibleItems = useMemo(
    () =>
      filterAndSortMarketplaceItems({
        items,
        search,
        category: activeCategory,
        sort,
      }),
    [activeCategory, items, search, sort],
  )

  const hasActiveControls = search.trim().length > 0 || activeCategory !== 'all'

  function clearFilters() {
    setSearch('')
    setActiveCategory('all')
  }

  return (
    <section className="space-y-6" aria-label="Marketplace browse surface">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/20 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Marketplace</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Browse installable Mockly assets from the hosted catalog.
            </h2>
            <p className="text-sm leading-6 text-slate-300 sm:text-base">
              Search by keyword, narrow by category, change the sort order, and copy the canonical install command for any free item.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
            <p className="font-semibold text-white">{visibleItems.length}</p>
            <p>{visibleItems.length === 1 ? 'result visible' : 'results visible'}</p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
            Search assets
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, slug, summary, or tag"
              className="min-h-11 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as MarketplaceSortOption)}
              className="min-h-11 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none transition focus:border-cyan-300"
            >
              {marketplaceSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
              activeCategory === 'all'
                ? 'border border-cyan-300 bg-cyan-400/15 text-cyan-100'
                : 'border border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500 hover:bg-slate-800'
            }`}
          >
            All categories
          </button>

          {categories.map((category) => {
            const isActive = category === activeCategory

            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                  isActive
                    ? 'border border-cyan-300 bg-cyan-400/15 text-cyan-100'
                    : 'border border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500 hover:bg-slate-800'
                }`}
              >
                {formatCategoryLabel(category)}
              </button>
            )
          })}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/70 p-8 text-center shadow-lg shadow-slate-950/20">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">No matches found</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Try clearing your search or filters.</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            We could not find any hosted marketplace items matching your current controls. Clear the search or reset the category filter to recover instantly.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300 bg-cyan-400/15 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              Clear search and filters
            </button>
            {hasActiveControls ? (
              <p className="self-center text-sm text-slate-400">Recovery happens without a page reload.</p>
            ) : null}
          </div>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <MarketplaceCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}
