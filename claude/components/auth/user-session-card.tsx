import Image from 'next/image'
import { SignOutButton } from '@/components/auth/sign-out-button'

type UserSessionCardProps = {
  displayName: string
  email: string | null
  username: string | null
  provider: string | null
  avatarUrl: string | null
}

function getInitials(value: string) {
  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) {
    return 'MU'
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function UserSessionCard({ displayName, email, username, provider, avatarUrl }: UserSessionCardProps) {
  return (
    <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-lg shadow-slate-950/30">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={56}
              height={56}
              className="h-14 w-14 rounded-full border border-emerald-300/30 object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/30 bg-slate-900 text-sm font-semibold text-emerald-100">
              {getInitials(displayName)}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
              Signed in
            </p>
            <h2 className="text-2xl font-semibold text-white">{displayName}</h2>
            <p className="text-sm text-emerald-100">
              {email ?? 'No email available'}
              {username ? ` · @${username}` : ''}
              {provider ? ` · ${provider}` : ''}
            </p>
          </div>
        </div>

        <SignOutButton />
      </div>
    </section>
  )
}
