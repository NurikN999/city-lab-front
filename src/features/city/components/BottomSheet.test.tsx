import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BottomSheet } from './BottomSheet'

describe('BottomSheet', () => {
  it('opens one step further on a tap of the handle', async () => {
    const onSnapChange = vi.fn()
    render(<BottomSheet snap="peek" onSnapChange={onSnapChange} label="12 мкр"><p>Панель района</p></BottomSheet>)

    await userEvent.click(screen.getByRole('button', { name: 'Развернуть «12 мкр»' }))

    expect(onSnapChange).toHaveBeenCalledWith('half')
    expect(screen.getByRole('region', { name: '12 мкр' })).toHaveTextContent('Панель района')
  })

  it('keeps the footer outside the scrolling body', () => {
    render(<BottomSheet snap="half" onSnapChange={vi.fn()} label="12 мкр" footer={<button type="button">SIMULATE</button>}><p>Действия</p></BottomSheet>)

    expect(screen.getByRole('button', { name: 'SIMULATE' })).toBeInTheDocument()
  })

  it('starts new content from the top', () => {
    const { rerender } = render(<BottomSheet snap="half" onSnapChange={vi.fn()} label="12 мкр" resetKey="district"><p>Действия</p></BottomSheet>)
    const body = screen.getByText('Действия').parentElement
    if (!body) throw new Error('no body')
    body.scrollTop = 500

    rerender(<BottomSheet snap="half" onSnapChange={vi.fn()} label="До → После" resetKey="result"><p>Результат</p></BottomSheet>)

    expect(body.scrollTop).toBe(0)
  })
})
