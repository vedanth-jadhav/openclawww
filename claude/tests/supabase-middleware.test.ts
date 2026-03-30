import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { updateAuthSession } from '@/lib/supabase/middleware'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/config/env', () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://kxwtpdnlbmsqbzpycgzx.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  }),
}))

describe('updateAuthSession', () => {
  it('verifies the current user on every request', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null } })

    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser },
    } as never)

    const response = await updateAuthSession(new NextRequest('http://localhost:3000/'))

    expect(getUser).toHaveBeenCalledTimes(1)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('copies refreshed auth cookies onto the middleware response', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: null } })

    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      options?.cookies?.setAll?.([
        {
          name: 'sb-kxwtpdnlbmsqbzpycgzx-auth-token',
          value: 'token-value',
          options: { path: '/', sameSite: 'lax' },
        },
      ])

      return {
        auth: { getUser },
      } as never
    })

    const response = await updateAuthSession(new NextRequest('http://localhost:3000/'))

    expect(getUser).toHaveBeenCalledTimes(1)
    expect(response.cookies.get('sb-kxwtpdnlbmsqbzpycgzx-auth-token')?.value).toBe('token-value')
  })
})
