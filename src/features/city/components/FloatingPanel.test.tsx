import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FloatingPanel } from './FloatingPanel'

describe('FloatingPanel', () => {
  it('collapses to its title and expands back', async () => {
    render(<FloatingPanel title="Актау сейчас" className=""><p>Загрузка дорог 56</p></FloatingPanel>)

    await userEvent.click(screen.getByRole('button', { name: 'Свернуть «Актау сейчас»' }))

    expect(screen.queryByText('Загрузка дорог 56')).not.toBeInTheDocument()
    expect(screen.getByText('Актау сейчас')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Развернуть «Актау сейчас»' }))
    expect(screen.getByText('Загрузка дорог 56')).toBeInTheDocument()
  })
})
