const DEFAULT_POST_AUTH_REDIRECT = '/'
const AUTH_ROUTES = new Set(['/auth/login', '/auth/callback', '/auth/signout'])

export function normalizeRedirectPath(candidate: string | null | undefined) {
  if (!candidate) {
    return DEFAULT_POST_AUTH_REDIRECT
  }

  const trimmed = candidate.trim()

  if (!trimmed.startsWith('/')) {
    return DEFAULT_POST_AUTH_REDIRECT
  }

  if (trimmed.startsWith('//')) {
    return DEFAULT_POST_AUTH_REDIRECT
  }

  try {
    const url = new URL(trimmed, 'http://localhost')
    const normalizedPath = `${url.pathname}${url.search}${url.hash}`

    if (AUTH_ROUTES.has(url.pathname)) {
      return DEFAULT_POST_AUTH_REDIRECT
    }

    return normalizedPath || DEFAULT_POST_AUTH_REDIRECT
  } catch {
    return DEFAULT_POST_AUTH_REDIRECT
  }
}

export function getAuthCallbackUrl(appUrl: string, nextPath?: string | null) {
  const callbackUrl = new URL('/auth/callback', appUrl)
  const normalizedNextPath = normalizeRedirectPath(nextPath)

  if (normalizedNextPath !== DEFAULT_POST_AUTH_REDIRECT) {
    callbackUrl.searchParams.set('next', normalizedNextPath)
  }

  return callbackUrl.toString()
}

export function getAuthErrorRedirect(appUrl: string, nextPath?: string | null, message?: string) {
  const loginUrl = new URL('/auth/login', appUrl)
  const normalizedNextPath = normalizeRedirectPath(nextPath)

  if (normalizedNextPath !== DEFAULT_POST_AUTH_REDIRECT) {
    loginUrl.searchParams.set('next', normalizedNextPath)
  }

  if (message) {
    loginUrl.searchParams.set('error', message)
  }

  return loginUrl
}

export function getAuthSuccessRedirect(appUrl: string, nextPath?: string | null) {
  return new URL(normalizeRedirectPath(nextPath), appUrl)
}

export const authRedirectDefaults = {
  defaultPostAuthRedirect: DEFAULT_POST_AUTH_REDIRECT,
}
