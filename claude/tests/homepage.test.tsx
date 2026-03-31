import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'
import * as sessionModule from '@/lib/auth/session'
import * as browseModule from '@/lib/marketplace/browse'
import type { MarketplaceBrowseItem } from '@/lib/marketplace/browse-state'

vi.mock('@/lib/auth/session', () => ({
  getViewerState: vi.fn(),
}))

vi.mock('@/lib/marketplace/browse', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace/browse')>('@/lib/marketplace/browse')

  return {
    ...actual,
    getMarketplaceBrowseItems: vi.fn(),
  }
})

const browseItems: MarketplaceBrowseItem[] = [
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
]

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(browseModule.getMarketplaceBrowseItems).mockResolvedValue(browseItems)
  })

  it('renders the logged-out login signal and marketplace browse surface', async () => {
    vi.mocked(sessionModule.getViewerState).mockResolvedValue({
      isAuthenticated: false,
      email: null,
      displayName: null,
      username: null,
      avatarUrl: null,
      provider: null,
    })

    render(await HomePage())

    expect(
      screen.getByRole('heading', {
        name: /discover free mockly assets from the hosted supabase catalog\./i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in with google or github/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /browse installable mockly assets from the hosted catalog\./i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /next\.js api guardian/i })).toBeInTheDocument()
  })

  it('renders visible signed-in identity when a session exists', async () => {
    vi.mocked(sessionModule.getViewerState).mockResolvedValue({
      isAuthenticated: true,
      email: 'user@example.com',
      displayName: 'Mockly User',
      username: 'mockly-user',
      avatarUrl: null,
      provider: 'github',
    })

    render(await HomePage())

    expect(screen.getByText(/signed in/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mockly User' })).toBeInTheDocument()
    expect(screen.getByText(/user@example.com · @mockly-user · github/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })
})
