import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/types'

export type SeedItemDefinition = {
  slug: string
  title: string
  summary: string
  description: string
  category: Database['public']['Tables']['items']['Row']['category']
  installManifest: Json
  assetPayload: Json
  tags: string[]
  readmeMarkdown: string
}

export const freeSeedItems: SeedItemDefinition[] = [
  {
    slug: 'nextjs-api-guardian',
    title: 'Next.js API Guardian',
    summary: 'Route-hardening checks for App Router APIs, auth callbacks, and server actions.',
    description:
      'Security and regression checklist tuned for Next.js App Router backends that need clearer route contracts and safer request handling.',
    category: 'skill',
    installManifest: {
      destination: '.claude/skills/nextjs-api-guardian',
      files: ['SKILL.md'],
      installType: 'skill',
    },
    assetPayload: {
      files: [
        {
          path: '.claude/skills/nextjs-api-guardian/SKILL.md',
          content: [
            '# Next.js API Guardian',
            '',
            'Use this skill to review App Router route handlers, auth callbacks, and server-side request validation before shipping.',
          ].join('\n'),
        },
      ],
    },
    tags: ['nextjs', 'api', 'security', 'app-router'],
    readmeMarkdown: [
      '# Next.js API Guardian',
      '',
      'Use this free asset when you need a **repeatable backend review pass** for Next.js App Router APIs.',
      '',
      '## What it gives you',
      '',
      '- Route guardrails for auth-sensitive handlers',
      '- Request/response validation reminders',
      '- Safer error handling and cache guidance',
      '',
      '## Install',
      '',
      '```bash',
      'npx mockly@latest install nextjs-api-guardian',
      '```',
    ].join('\n'),
  },
  {
    slug: 'supabase-rls-audit-pack',
    title: 'Supabase RLS Audit Pack',
    summary: 'A hosted-data review pack for row-level security, admin boundaries, and policy drift.',
    description:
      'Focused on verifying RLS posture, service-role boundaries, and policy assumptions for Supabase-backed products.',
    category: 'template',
    installManifest: {
      destination: '.claude/templates/supabase-rls-audit-pack',
      files: ['checklist.md'],
      installType: 'template',
    },
    assetPayload: {
      files: [
        {
          path: '.claude/templates/supabase-rls-audit-pack/checklist.md',
          content: [
            '# Supabase RLS Audit Pack',
            '',
            '- Confirm anon/authenticated policy coverage',
            '- Verify service-role usage stays server-only',
            '- Review policy predicates for canonical ownership checks',
          ].join('\n'),
        },
      ],
    },
    tags: ['supabase', 'security', 'rls', 'postgres'],
    readmeMarkdown: [
      '# Supabase RLS Audit Pack',
      '',
      'Run this pack whenever you need to validate **hosted Supabase authorization rules** before new marketplace or API work lands.',
      '',
      '## Includes',
      '',
      '- RLS review checklist',
      '- Service-role boundary reminders',
      '- Policy regression prompts',
      '',
      '## Install',
      '',
      '```bash',
      'npx mockly@latest install supabase-rls-audit-pack',
      '```',
    ].join('\n'),
  },
  {
    slug: 'claude-release-notes-prompt',
    title: 'Claude Release Notes Prompt',
    summary: 'A reusable prompt asset for turning shipped diffs into crisp user-facing release notes.',
    description:
      'Helps teams summarize product changes with canonical sections for wins, risks, migrations, and customer-facing language.',
    category: 'prompt',
    installManifest: {
      destination: '.claude/prompts/claude-release-notes-prompt',
      files: ['prompt.md'],
      installType: 'prompt',
    },
    assetPayload: {
      files: [
        {
          path: '.claude/prompts/claude-release-notes-prompt/prompt.md',
          content: [
            '# Claude Release Notes Prompt',
            '',
            'Summarize the shipped change set, customer-visible impact, rollout caveats, and any follow-up migrations in plain language.',
          ].join('\n'),
        },
      ],
    },
    tags: ['prompt', 'docs', 'release-notes', 'communication'],
    readmeMarkdown: [
      '# Claude Release Notes Prompt',
      '',
      'This free prompt asset gives you a stable format for **customer-facing release notes** without rewriting the framing every sprint.',
      '',
      '## Best for',
      '',
      '- Launch summaries',
      '- Changelog drafts',
      '- Internal handoff notes that need polish',
      '',
      '## Install',
      '',
      '```bash',
      'npx mockly@latest install claude-release-notes-prompt',
      '```',
    ].join('\n'),
  },
]

export type SeededMarketplaceItem = Pick<
  Database['public']['Tables']['items']['Row'],
  'id' | 'slug' | 'title' | 'category' | 'install_command'
>

export type SeedMarketplaceCatalogResult = {
  items: SeededMarketplaceItem[]
  seededItemCount: number
}

function buildInstallCommand(slug: string) {
  return `npx mockly@latest install ${slug}`
}

function buildSeedRow(item: SeedItemDefinition): Database['public']['Tables']['items']['Insert'] {
  return {
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    description: item.description,
    category: item.category,
    access_tier: 'free',
    status: 'published',
    is_scaffold_only: false,
    install_command: buildInstallCommand(item.slug),
    readme_markdown: item.readmeMarkdown,
    install_manifest: item.installManifest,
    asset_payload: item.assetPayload,
    tags: item.tags,
    future_capabilities: [],
    published_at: '2026-03-31T00:00:00.000Z',
  }
}

export async function seedMarketplaceCatalog(supabase: SupabaseClient<Database>): Promise<SeedMarketplaceCatalogResult> {
  const rows = freeSeedItems.map(buildSeedRow)
  const slugs = rows.map((row) => row.slug)

  const { error: upsertError } = await supabase.from('items').upsert(rows, {
    onConflict: 'slug',
    ignoreDuplicates: false,
  })

  if (upsertError) {
    throw new Error(`Failed to upsert marketplace seed items: ${upsertError.message}`)
  }

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, slug, title, category, install_command')
    .in('slug', slugs)
    .order('slug', { ascending: true })

  if (itemsError) {
    throw new Error(`Failed to read marketplace seed items after upsert: ${itemsError.message}`)
  }

  if (!items || items.length !== freeSeedItems.length) {
    throw new Error(
      `Marketplace seed verification expected ${freeSeedItems.length} canonical items but found ${items?.length ?? 0}.`,
    )
  }

  const canonicalCommands = new Map(rows.map((row) => [row.slug, row.install_command]))

  for (const item of items) {
    if (canonicalCommands.get(item.slug) !== item.install_command) {
      throw new Error(`Marketplace seed verification found drift in install metadata for ${item.slug}.`)
    }
  }

  return {
    items,
    seededItemCount: items.length,
  }
}

export function getCanonicalSeedSnapshot() {
  return freeSeedItems.map((item) => ({
    slug: item.slug,
    title: item.title,
    category: item.category,
    installCommand: buildInstallCommand(item.slug),
  }))
}
