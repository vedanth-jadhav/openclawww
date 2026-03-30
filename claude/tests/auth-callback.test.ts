import {
  authRedirectDefaults,
  getAuthCallbackUrl,
  getAuthErrorRedirect,
  getAuthSuccessRedirect,
  normalizeRedirectPath,
} from '@/lib/auth/callback'

describe('auth callback helpers', () => {
  it('normalizes next paths and rejects external or auth-route redirects', () => {
    expect(normalizeRedirectPath('/items/test?ref=card')).toBe('/items/test?ref=card')
    expect(normalizeRedirectPath('https://example.com')).toBe(authRedirectDefaults.defaultPostAuthRedirect)
    expect(normalizeRedirectPath('//evil.com')).toBe(authRedirectDefaults.defaultPostAuthRedirect)
    expect(normalizeRedirectPath('/auth/login')).toBe(authRedirectDefaults.defaultPostAuthRedirect)
    expect(normalizeRedirectPath(undefined)).toBe(authRedirectDefaults.defaultPostAuthRedirect)
  })

  it('builds callback and recovery redirects with preserved in-app destinations', () => {
    expect(getAuthCallbackUrl('http://localhost:3000', '/items/test')).toBe(
      'http://localhost:3000/auth/callback?next=%2Fitems%2Ftest',
    )

    expect(getAuthErrorRedirect('http://localhost:3000', '/items/test', 'retry').toString()).toBe(
      'http://localhost:3000/auth/login?next=%2Fitems%2Ftest&error=retry',
    )

    expect(getAuthSuccessRedirect('http://localhost:3000', 'https://evil.com').toString()).toBe(
      'http://localhost:3000/',
    )
  })
})
