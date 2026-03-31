import { freeSeedItems, getCanonicalSeedSnapshot, seedMarketplaceCatalog } from '@/lib/marketplace/seed'

describe('marketplace seed catalog', () => {
  it('defines stable canonical seed items and install commands', () => {
    expect(getCanonicalSeedSnapshot()).toEqual([
      {
        slug: 'nextjs-api-guardian',
        title: 'Next.js API Guardian',
        category: 'skill',
        installCommand: 'npx mockly@latest install nextjs-api-guardian',
      },
      {
        slug: 'supabase-rls-audit-pack',
        title: 'Supabase RLS Audit Pack',
        category: 'template',
        installCommand: 'npx mockly@latest install supabase-rls-audit-pack',
      },
      {
        slug: 'claude-release-notes-prompt',
        title: 'Claude Release Notes Prompt',
        category: 'prompt',
        installCommand: 'npx mockly@latest install claude-release-notes-prompt',
      },
    ])
  })

  it('upserts by slug and verifies returned install metadata remains canonical', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const select = vi.fn().mockReturnThis()
    const inFilter = vi.fn().mockReturnThis()
    const order = vi.fn().mockResolvedValue({
      data: freeSeedItems.map((item, index) => ({
        id: `item-${index + 1}`,
        slug: item.slug,
        title: item.title,
        category: item.category,
        install_command: `npx mockly@latest install ${item.slug}`,
      })),
      error: null,
    })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'items') {
          throw new Error(`Unexpected table ${table}`)
        }

        return {
          upsert,
          select,
          in: inFilter,
          order,
        }
      }),
    }

    const result = await seedMarketplaceCatalog(supabase as never)

    expect(result.seededItemCount).toBe(freeSeedItems.length)
    expect(supabase.from).toHaveBeenCalledTimes(2)
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'nextjs-api-guardian',
          install_command: 'npx mockly@latest install nextjs-api-guardian',
          access_tier: 'free',
          status: 'published',
        }),
      ]),
      {
        onConflict: 'slug',
        ignoreDuplicates: false,
      },
    )
    expect(select).toHaveBeenCalledWith('id, slug, title, category, install_command')
    expect(inFilter).toHaveBeenCalledWith(
      'slug',
      freeSeedItems.map((item) => item.slug),
    )
    expect(order).toHaveBeenCalledWith('slug', { ascending: true })
  })

  it('throws when canonical install metadata drifts after a repeated seed run', async () => {
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce({
          upsert: vi.fn().mockResolvedValue({ error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: freeSeedItems.map((item, index) => ({
              id: `item-${index + 1}`,
              slug: item.slug,
              title: item.title,
              category: item.category,
              install_command:
                item.slug === 'supabase-rls-audit-pack'
                  ? 'npx mockly@latest install drifted-command'
                  : `npx mockly@latest install ${item.slug}`,
            })),
            error: null,
          }),
        }),
    }

    await expect(seedMarketplaceCatalog(supabase as never)).rejects.toThrow(
      'Marketplace seed verification found drift in install metadata for supabase-rls-audit-pack.',
    )
  })
})
