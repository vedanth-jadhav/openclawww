import { hostedSupabaseProjectUrl } from '@/lib/config/env'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

type InspectableSupabaseClient = {
  supabaseUrl?: string
}

const originalEnv = { ...process.env }

function resetEnv() {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: 'https://kxwtpdnlbmsqbzpycgzx.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    MOCKLY_API_URL: 'http://localhost:3000',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    SEED_SECRET: 'seed-secret',
    ANTHROPIC_API_KEY: 'anthropic-key',
  }
}

describe('Supabase client helpers', () => {
  beforeEach(() => {
    resetEnv()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('reuses singleton browser and admin clients', () => {
    expect(getSupabaseBrowserClient()).toBe(getSupabaseBrowserClient())
    expect(getSupabaseAdminClient()).toBe(getSupabaseAdminClient())
  })

  it('uses the hosted project URL for both browser and admin clients', () => {
    const browserClient = getSupabaseBrowserClient() as unknown as InspectableSupabaseClient
    const adminClient = getSupabaseAdminClient() as unknown as InspectableSupabaseClient

    expect(browserClient.supabaseUrl).toBe(hostedSupabaseProjectUrl)
    expect(adminClient.supabaseUrl).toBe(hostedSupabaseProjectUrl)
  })
})
