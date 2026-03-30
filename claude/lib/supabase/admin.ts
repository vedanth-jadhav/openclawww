import { createClient } from '@supabase/supabase-js'
import { getServerEnv } from '@/lib/config/env'
import type { Database } from '@/lib/supabase/types'

let adminClient: ReturnType<typeof createClient<Database>> | undefined

export function getSupabaseAdminClient() {
  if (adminClient) {
    return adminClient
  }

  const env = getServerEnv()

  adminClient = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return adminClient
}
