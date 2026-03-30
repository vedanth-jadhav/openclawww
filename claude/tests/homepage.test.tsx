import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'
import * as sessionModule from '@/lib/auth/session'

vi.mock('@/lib/auth/session', () => ({
  getViewerState: vi.fn(),
}))

describe('HomePage', () => {
  it('renders the logged-out login signal and section cards', async () => {
    vi.mocked(sessionModule.getViewerState).mockResolvedValue({
      isAuthenticated: false,
      email: null,
      displayName: null,
      username: null,
      avatarUrl: null,
      provider: null,
    })

    render(await HomePage())

    expect(
      screen.getByRole('heading', {
        name: /next\.js 15 baseline for the hosted marketplace and cli mission\./i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in with google or github/i })).toBeInTheDocument()
    expect(screen.getByText(/marketplace web app/i)).toBeInTheDocument()
    expect(screen.getByText(/cli workspace/i)).toBeInTheDocument()
    expect(screen.getByText(/supabase project/i)).toBeInTheDocument()
  })

  it('renders visible signed-in identity when a session exists', async () => {
    vi.mocked(sessionModule.getViewerState).mockResolvedValue({
      isAuthenticated: true,
      email: 'user@example.com',
      displayName: 'Mockly User',
      username: 'mockly-user',
      avatarUrl: null,
      provider: 'github',
    })

    render(await HomePage())

    expect(screen.getByText(/signed in/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mockly User' })).toBeInTheDocument()
    expect(screen.getByText(/user@example.com · @mockly-user · github/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })
})
