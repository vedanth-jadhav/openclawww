import { NextResponse } from 'next/server'
import { getServerEnv } from '@/lib/config/env'
import { seedMarketplaceCatalog } from '@/lib/marketplace/seed'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

function getUnauthorizedResponse() {
  return NextResponse.json(
    {
      error: 'Unauthorized seed request.',
    },
    {
      status: 401,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}

export async function POST(request: Request) {
  const env = getServerEnv()
  const providedSecret = request.headers.get('x-seed-secret')?.trim()

  if (!providedSecret || providedSecret !== env.SEED_SECRET) {
    return getUnauthorizedResponse()
  }

  const result = await seedMarketplaceCatalog(getSupabaseAdminClient())

  return NextResponse.json(
    {
      ok: true,
      seededItemCount: result.seededItemCount,
      items: result.items.map((item) => ({
        slug: item.slug,
        title: item.title,
        category: item.category,
        installCommand: item.install_command,
      })),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
