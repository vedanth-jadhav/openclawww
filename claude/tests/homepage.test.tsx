import { render, screen } from '@testing-library/react'
import HomePage from '@/app/page'

describe('HomePage', () => {
  it('renders the foundation heading and section cards', () => {
    render(<HomePage />)

    expect(
      screen.getByRole('heading', {
        name: /next\.js 15 baseline for the hosted marketplace and cli mission\./i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/marketplace web app/i)).toBeInTheDocument()
    expect(screen.getByText(/cli workspace/i)).toBeInTheDocument()
    expect(screen.getByText(/supabase project/i)).toBeInTheDocument()
  })
})
