import {
  getPublicEnv,
  getServerEnv,
  hostedSupabaseProjectId,
  hostedSupabaseProjectUrl,
  isHostedSupabaseUrl,
} from '@/lib/config/env'

const originalEnv = { ...process.env }

function resetEnv(overrides: Record<string, string | undefined> = {}) {
  process.env = {
    ...originalEnv,
    ...overrides,
  }
}

describe('env parsing', () => {
  beforeEach(() => {
    resetEnv()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('parses the required public hosted Supabase environment variables', () => {
    resetEnv({
      NEXT_PUBLIC_SUPABASE_URL: `${hostedSupabaseProjectUrl}/`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000/',
      MOCKLY_API_URL: 'http://localhost:3000/',
    })

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: hostedSupabaseProjectUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      MOCKLY_API_URL: 'http://localhost:3000',
    })
  })

  it('fails clearly when required server envs are missing', () => {
    resetEnv({
      NEXT_PUBLIC_SUPABASE_URL: hostedSupabaseProjectUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      MOCKLY_API_URL: 'http://localhost:3000',
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      SEED_SECRET: undefined,
      ANTHROPIC_API_KEY: undefined,
    })

    expect(() => getServerEnv()).toThrowErrorMatchingInlineSnapshot(`
      [Error: Invalid server environment configuration for Mockly.
      Populate the required values in .env.local (local development) or your deployment environment before continuing.
      - SUPABASE_SERVICE_ROLE_KEY: Required
      - SEED_SECRET: Required
      - ANTHROPIC_API_KEY: Required]
    `)
  })

  it('rejects local Supabase runtime URLs so hosted wiring stays explicit', () => {
    resetEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      MOCKLY_API_URL: 'http://localhost:3000',
    })

    expect(isHostedSupabaseUrl(hostedSupabaseProjectUrl)).toBe(true)
    expect(hostedSupabaseProjectId).toBe('kxwtpdnlbmsqbzpycgzx')
    expect(() => getPublicEnv()).toThrow(/must target the hosted Supabase project/)
  })
})
