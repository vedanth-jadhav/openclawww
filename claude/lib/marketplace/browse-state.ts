import type { Database } from '@/lib/supabase/types'

export type MarketplaceBrowseItem = Pick<
  Database['public']['Tables']['items']['Row'],
  | 'id'
  | 'slug'
  | 'title'
  | 'summary'
  | 'description'
  | 'category'
  | 'access_tier'
  | 'status'
  | 'is_scaffold_only'
  | 'install_command'
  | 'tags'
  | 'published_at'
  | 'created_at'
>

export type MarketplaceSortOption = 'featured' | 'title-asc' | 'newest'

export const marketplaceSortOptions: { value: MarketplaceSortOption; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'newest', label: 'Newest' },
]

export const marketplaceCategoryOrder = [
  'skill',
  'template',
  'prompt',
  'workflow',
  'utility',
  'command',
  'integration',
  'mcp',
] as const

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function getMarketplaceCategories(items: MarketplaceBrowseItem[]) {
  const categories = new Set(items.map((item) => item.category))

  return marketplaceCategoryOrder.filter((category) => categories.has(category))
}

function getSearchIndex(item: MarketplaceBrowseItem) {
  return [item.title, item.summary, item.description ?? '', item.slug, ...item.tags]
    .join(' ')
    .toLowerCase()
}

function compareByPublishedDate(a: MarketplaceBrowseItem, b: MarketplaceBrowseItem) {
  const aDate = a.published_at ?? a.created_at
  const bDate = b.published_at ?? b.created_at

  return bDate.localeCompare(aDate)
}

export function filterAndSortMarketplaceItems({
  items,
  search,
  category,
  sort,
}: {
  items: MarketplaceBrowseItem[]
  search: string
  category: string
  sort: MarketplaceSortOption
}) {
  const normalizedSearch = normalizeSearchValue(search)

  const filteredItems = items.filter((item) => {
    const matchesCategory = category === 'all' ? true : item.category === category
    const matchesSearch = normalizedSearch.length === 0 ? true : getSearchIndex(item).includes(normalizedSearch)

    return matchesCategory && matchesSearch
  })

  switch (sort) {
    case 'title-asc':
      return filteredItems.toSorted((a, b) => a.title.localeCompare(b.title))
    case 'newest':
      return filteredItems.toSorted(compareByPublishedDate)
    case 'featured':
    default:
      return filteredItems.toSorted((a, b) => {
        const categoryDelta =
          marketplaceCategoryOrder.indexOf(a.category as (typeof marketplaceCategoryOrder)[number]) -
          marketplaceCategoryOrder.indexOf(b.category as (typeof marketplaceCategoryOrder)[number])

        if (categoryDelta !== 0) {
          return categoryDelta
        }

        return compareByPublishedDate(a, b)
      })
  }
}
