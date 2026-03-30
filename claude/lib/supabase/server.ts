import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPublicEnv } from '@/lib/config/env'
import type { Database } from '@/lib/supabase/types'

type CookieStore = Awaited<ReturnType<typeof cookies>>

function withCookieBridge(cookieStore: CookieStore) {
  return {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      } catch {
        // Server Components cannot always write cookies. Route handlers and middleware should handle persistence.
      }
    },
  }
}

export async function getSupabaseServerClient() {
  const env = getPublicEnv()
  const cookieStore = await cookies()

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: withCookieBridge(cookieStore),
  })
}
