import { createBrowserClient } from '@supabase/ssr'
import { getPublicEnv } from '@/lib/config/env'
import type { Database } from '@/lib/supabase/types'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient
  }

  const env = getPublicEnv()

  browserClient = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  return browserClient
}
