'use client'

import { useState } from 'react'

export function SignOutButton() {
  const [isPending, setIsPending] = useState(false)

  return (
    <form action="/auth/signout" method="post" onSubmit={() => setIsPending(true)}>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
      >
        {isPending ? 'Signing out…' : 'Sign out'}
      </button>
    </form>
  )
}
