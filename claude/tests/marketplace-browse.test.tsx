import { fireEvent, render, screen, within } from '@testing-library/react'
import { MarketplaceBrowse } from '@/components/marketplace/marketplace-browse'
import { filterAndSortMarketplaceItems, type MarketplaceBrowseItem } from '@/lib/marketplace/browse-state'

const items: MarketplaceBrowseItem[] = [
  {
    id: '1',
    slug: 'nextjs-api-guardian',
    title: 'Next.js API Guardian',
    summary: 'Route-hardening checks for App Router APIs.',
    description: 'Security and regression checklist tuned for Next.js backends.',
    category: 'skill',
    access_tier: 'free',
    status: 'published',
    is_scaffold_only: false,
    install_command: 'npx mockly@latest install nextjs-api-guardian',
    tags: ['nextjs', 'api', 'security'],
    published_at: '2026-03-31T00:00:00.000Z',
    created_at: '2026-03-30T00:00:00.000Z',
  },
  {
    id: '2',
    slug: 'supabase-rls-audit-pack',
    title: 'Supabase RLS Audit Pack',
    summary: 'Hosted-data review pack for row-level security.',
    description: 'Focused on verifying RLS posture and policy assumptions.',
    category: 'template',
    access_tier: 'free',
    status: 'published',
    is_scaffold_only: false,
    install_command: 'npx mockly@latest install supabase-rls-audit-pack',
    tags: ['supabase', 'security', 'rls'],
    published_at: '2026-03-29T00:00:00.000Z',
    created_at: '2026-03-28T00:00:00.000Z',
  },
  {
    id: '3',
    slug: 'claude-release-notes-prompt',
    title: 'Claude Release Notes Prompt',
    summary: 'Reusable prompt asset for release notes.',
    description: 'Summarizes shipped changes in a crisp format.',
    category: 'prompt',
    access_tier: 'free',
    status: 'published',
    is_scaffold_only: false,
    install_command: 'npx mockly@latest install claude-release-notes-prompt',
    tags: ['prompt', 'docs', 'communication'],
    published_at: '2026-03-27T00:00:00.000Z',
    created_at: '2026-03-26T00:00:00.000Z',
  },
]

describe('filterAndSortMarketplaceItems', () => {
  it('normalizes search text across case and whitespace', () => {
    const uppercaseMatches = filterAndSortMarketplaceItems({
      items,
      search: '  NEXTJS  ',
      category: 'all',
      sort: 'featured',
    }).map((item) => item.slug)

    const lowercaseMatches = filterAndSortMarketplaceItems({
      items,
      search: 'nextjs',
      category: 'all',
      sort: 'featured',
    }).map((item) => item.slug)

    expect(uppercaseMatches).toEqual(['nextjs-api-guardian'])
    expect(lowercaseMatches).toEqual(['nextjs-api-guardian'])
  })

  it('preserves search and category state when sort changes', () => {
    const filtered = filterAndSortMarketplaceItems({
      items,
      search: 'security',
      category: 'template',
      sort: 'title-asc',
    })

    expect(filtered.map((item) => item.slug)).toEqual(['supabase-rls-audit-pack'])
  })
})

describe('MarketplaceBrowse', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('shows a reversible empty state and restores items after clearing controls', async () => {
    render(<MarketplaceBrowse items={items} />)

    fireEvent.change(screen.getByLabelText(/search assets/i), {
      target: { value: 'missing item' },
    })

    expect(screen.getByRole('heading', { name: /try clearing your search or filters/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /clear search and filters/i }))

    expect(await screen.findByRole('heading', { name: /next\.js api guardian/i })).toBeInTheDocument()
    expect(screen.queryByText(/no matches found/i)).not.toBeInTheDocument()
  })

  it('filters by category, sorts the active results, and copies the canonical install command', async () => {
    render(<MarketplaceBrowse items={items} />)

    fireEvent.click(screen.getByRole('button', { name: /template/i }))
    fireEvent.change(screen.getByLabelText(/sort/i), { target: { value: 'title-asc' } })

    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(1)
    expect(within(cards[0]!).getByRole('heading', { name: /supabase rls audit pack/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/search assets/i)).toHaveValue('')
    expect(screen.getByLabelText(/sort/i)).toHaveValue('title-asc')

    fireEvent.click(screen.getByRole('button', { name: /copy install command/i }))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('npx mockly@latest install supabase-rls-audit-pack')
    expect(await screen.findByRole('button', { name: /copied install command/i })).toBeInTheDocument()
  })
})
