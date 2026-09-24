import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new Error('chunk failed')
}

describe('ErrorBoundary', () => {
  it('shows a readable message instead of a blank screen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<ErrorBoundary><Boom /></ErrorBoundary>)

    expect(screen.getByRole('alert')).toHaveTextContent('Что-то пошло не так')
    expect(screen.getByRole('button', { name: 'Перезагрузить' })).toBeInTheDocument()
  })
})
