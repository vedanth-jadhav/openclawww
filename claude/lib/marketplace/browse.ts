import { cache } from 'react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import {
  filterAndSortMarketplaceItems,
  type MarketplaceBrowseItem,
} from '@/lib/marketplace/browse-state'

async function readMarketplaceItems(): Promise<MarketplaceBrowseItem[]> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from('items')
    .select(
      'id, slug, title, summary, description, category, access_tier, status, is_scaffold_only, install_command, tags, published_at, created_at',
    )
    .eq('status', 'published')
    .eq('access_tier', 'free')
    .eq('is_scaffold_only', false)

  if (error) {
    throw new Error(`Failed to load marketplace browse items: ${error.message}`)
  }

  return data ?? []
}

export const getMarketplaceBrowseItems = cache(async (): Promise<MarketplaceBrowseItem[]> => {
  const data = await readMarketplaceItems()

  return filterAndSortMarketplaceItems({
    items: data,
    search: '',
    category: 'all',
    sort: 'featured',
  })
})

export const getMarketplaceItemBySlug = cache(async (slug: string): Promise<MarketplaceBrowseItem | null> => {
  const items = await readMarketplaceItems()

  return items.find((item) => item.slug === slug) ?? null
})
