import { cache } from 'react'
import { getSupabaseServerClient } from '@/lib/supabase/server'

type ProfileIdentity = {
  full_name: string | null
  email: string | null
  username: string | null
  avatar_url: string | null
  provider: string | null
}

type ViewerState = {
  isAuthenticated: boolean
  email: string | null
  displayName: string | null
  username: string | null
  avatarUrl: string | null
  provider: string | null
}

const emptyViewerState: ViewerState = {
  isAuthenticated: false,
  email: null,
  displayName: null,
  username: null,
  avatarUrl: null,
  provider: null,
}

export const getViewerState = cache(async (): Promise<ViewerState> => {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return emptyViewerState
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, username, avatar_url, provider')
    .eq('id', user.id)
    .maybeSingle<ProfileIdentity>()

  const displayName =
    profile?.full_name ??
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    user.email ??
    'Signed-in user'

  return {
    isAuthenticated: true,
    email: profile?.email ?? user.email ?? null,
    displayName,
    username: profile?.username ?? null,
    avatarUrl: profile?.avatar_url ?? (typeof user.user_metadata.avatar_url === 'string' ? user.user_metadata.avatar_url : null),
    provider:
      profile?.provider ??
      (typeof user.app_metadata.provider === 'string' ? user.app_metadata.provider : null),
  }
})
