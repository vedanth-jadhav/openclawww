import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/auth/login/page'

const originalEnv = { ...process.env }

function resetEnv() {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: 'https://kxwtpdnlbmsqbzpycgzx.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  }
}

describe('LoginPage', () => {
  beforeEach(() => {
    resetEnv()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('renders both OAuth actions and a retry path for failed callbacks', async () => {
    const page = await LoginPage({
      searchParams: Promise.resolve({
        error: 'OAuth session could not be established. Please try again.',
        next: '/items/alpha',
      }),
    })

    render(page)

    expect(screen.getByRole('heading', { name: /sign in to mockly/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument()
    expect(screen.getByText(/oauth session could not be established/i)).toBeInTheDocument()
    expect(screen.getByText(/you'll return to/i)).toHaveTextContent('/items/alpha')
  })
})
