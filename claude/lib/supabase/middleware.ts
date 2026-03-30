import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPublicEnv } from '@/lib/config/env'
import type { Database } from '@/lib/supabase/types'

function buildMiddlewareResponse(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })
}

export async function updateAuthSession(request: NextRequest) {
  const env = getPublicEnv()
  let response = buildMiddlewareResponse(request)

  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = buildMiddlewareResponse(request)

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  await supabase.auth.getUser()

  return response
}
