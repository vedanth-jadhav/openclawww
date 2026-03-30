'use client'

import { useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { getAuthCallbackUrl } from '@/lib/auth/callback'

type OAuthProvider = 'google' | 'github'

type OAuthButtonsProps = {
  appUrl: string
  nextPath: string
}

const providerCopy: Record<OAuthProvider, { label: string; helper: string }> = {
  google: {
    label: 'Continue with Google',
    helper: 'Use the hosted Google OAuth flow for localhost testing.',
  },
  github: {
    label: 'Continue with GitHub',
    helper: 'Use the hosted GitHub OAuth flow for localhost testing.',
  },
}

export function OAuthButtons({ appUrl, nextPath }: OAuthButtonsProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleProviderSignIn(provider: OAuthProvider) {
    setPendingProvider(provider)
    setErrorMessage(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthCallbackUrl(appUrl, nextPath),
        queryParams:
          provider === 'google'
            ? {
                access_type: 'offline',
                prompt: 'consent',
              }
            : undefined,
      },
    })

    if (error) {
      setErrorMessage(error.message)
      setPendingProvider(null)
    }
  }

  return (
    <div className="space-y-3">
      {(Object.keys(providerCopy) as OAuthProvider[]).map((provider) => {
        const isPending = pendingProvider === provider

        return (
          <button
            key={provider}
            type="button"
            onClick={() => handleProviderSignIn(provider)}
            disabled={pendingProvider !== null}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-left transition hover:border-cyan-400 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
          >
            <span>
              <span className="block text-base font-semibold text-white">{providerCopy[provider].label}</span>
              <span className="mt-1 block text-sm text-slate-300">{providerCopy[provider].helper}</span>
            </span>
            <span className="text-sm font-medium text-cyan-300">
              {isPending ? 'Redirecting…' : 'Start OAuth'}
            </span>
          </button>
        )
      })}

      {errorMessage ? (
        <p className="rounded-2xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
