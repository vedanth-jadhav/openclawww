import { NextResponse } from 'next/server'
import { getPublicEnv } from '@/lib/config/env'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function POST() {
  const env = getPublicEnv()
  const response = NextResponse.redirect(new URL('/', env.NEXT_PUBLIC_APP_URL), {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })

  const supabase = await createSupabaseRouteHandlerClient(response)
  await supabase.auth.signOut()

  return response
}
