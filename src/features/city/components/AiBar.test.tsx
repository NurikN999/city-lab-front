import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AiBar } from './AiBar'

describe('AiBar', () => {
  it('shows the server message when the district is unknown', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Не удалось определить район. Укажите его, например: «12 мкр».' }), { status: 422 })))
    render(<AiBar onResult={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('City AI'), 'пробки в городе')
    await userEvent.click(screen.getByRole('button', { name: 'Спросить' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось определить район')
    expect(screen.getByLabelText('City AI')).toHaveValue('пробки в городе')
  })

  it('passes the plan to the parent', async () => {
    const plan = {
      intent: { district_id: 11, district_name: '12 мкр', goals: [{ metric: 'traffic', direction: 'decrease', weight: 1 }], budget: 100_000_000, fallback: false },
      stats: { combinations: 47, within_budget: 43 },
      scenarios: [],
      explanation: 'Нет вариантов',
    }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(plan), { status: 200 })))
    const onResult = vi.fn()
    render(<AiBar onResult={onResult} />)

    await userEvent.type(screen.getByLabelText('City AI'), 'пробки в 12 мкр')
    await userEvent.click(screen.getByRole('button', { name: 'Спросить' }))

    await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith(plan))
  })
})
