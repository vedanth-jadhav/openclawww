import { POST } from '@/app/api/seed/route'
import { freeSeedItems } from '@/lib/marketplace/seed'

const { mockSeedMarketplaceCatalog, mockGetSupabaseAdminClient } = vi.hoisted(() => ({
  mockSeedMarketplaceCatalog: vi.fn(),
  mockGetSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: mockGetSupabaseAdminClient,
}))

vi.mock('@/lib/marketplace/seed', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace/seed')>('@/lib/marketplace/seed')

  return {
    ...actual,
    seedMarketplaceCatalog: mockSeedMarketplaceCatalog,
  }
})

describe('POST /api/seed', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://kxwtpdnlbmsqbzpycgzx.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      MOCKLY_API_URL: 'http://localhost:3000',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      SEED_SECRET: 'local-seed-secret',
      ANTHROPIC_API_KEY: 'anthropic-key',
    }

    mockSeedMarketplaceCatalog.mockReset()
    mockGetSupabaseAdminClient.mockReset()
    mockGetSupabaseAdminClient.mockReturnValue({ kind: 'admin-client' })
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('rejects unauthorized callers without mutating data', async () => {
    const response = await POST(new Request('http://localhost:3000/api/seed', { method: 'POST' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: 'Unauthorized seed request.',
    })
    expect(mockGetSupabaseAdminClient).not.toHaveBeenCalled()
    expect(mockSeedMarketplaceCatalog).not.toHaveBeenCalled()
  })

  it('returns canonical seeded items for authorized callers', async () => {
    mockSeedMarketplaceCatalog.mockResolvedValue({
      seededItemCount: freeSeedItems.length,
      items: freeSeedItems.map((item, index) => ({
        id: `item-${index + 1}`,
        slug: item.slug,
        title: item.title,
        category: item.category,
        install_command: `npx mockly@latest install ${item.slug}`,
      })),
    })

    const response = await POST(
      new Request('http://localhost:3000/api/seed', {
        method: 'POST',
        headers: {
          'x-seed-secret': 'local-seed-secret',
        },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      seededItemCount: freeSeedItems.length,
      items: freeSeedItems.map((item) => ({
        slug: item.slug,
        title: item.title,
        category: item.category,
        installCommand: `npx mockly@latest install ${item.slug}`,
      })),
    })
    expect(mockGetSupabaseAdminClient).toHaveBeenCalledTimes(1)
    expect(mockSeedMarketplaceCatalog).toHaveBeenCalledWith({ kind: 'admin-client' })
  })
})
