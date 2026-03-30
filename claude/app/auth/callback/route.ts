import { NextResponse } from 'next/server'
import { getAuthErrorRedirect, getAuthSuccessRedirect } from '@/lib/auth/callback'
import { getPublicEnv } from '@/lib/config/env'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler'

const CALLBACK_ERROR_MESSAGE = 'OAuth session could not be established. Please try again.'

export async function GET(request: Request) {
  const env = getPublicEnv()
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextPath = requestUrl.searchParams.get('next')
  const response = NextResponse.redirect(getAuthSuccessRedirect(env.NEXT_PUBLIC_APP_URL, nextPath), {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })

  if (!code) {
    return NextResponse.redirect(getAuthErrorRedirect(env.NEXT_PUBLIC_APP_URL, nextPath, CALLBACK_ERROR_MESSAGE), {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    })
  }

  const supabase = await createSupabaseRouteHandlerClient(response)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(getAuthErrorRedirect(env.NEXT_PUBLIC_APP_URL, nextPath, CALLBACK_ERROR_MESSAGE), {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    })
  }

  return response
}
