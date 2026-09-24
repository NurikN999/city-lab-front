import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Action } from '../../shared/lib/schemas'
import { ActionRow } from './ActionRow'

const lights: Action = {
  id: 3, key: 'smart_lights', name: 'Умные светофоры', sphere: { key: 'transport', name: 'Транспорт' }, cost: 10_000_000,
  scope: 'district', assumption: 'демо', source_url: null,
  effects: [{ metric: 'traffic', delta_pct: -6, spill: 0.3 }],
}

describe('ActionRow', () => {
  it('sends edited cost and effects', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ...lights, cost: 12_000_000 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const onSaved = vi.fn()
    render(<table><tbody><ActionRow action={lights} token="t" onSaved={onSaved} onUnauthorized={vi.fn()} /></tbody></table>)

    await userEvent.click(screen.getByRole('button', { name: 'Изменить «Умные светофоры»' }))
    await userEvent.clear(screen.getByLabelText('Стоимость, млн ₸'))
    await userEvent.type(screen.getByLabelText('Стоимость, млн ₸'), '12')
    await userEvent.clear(screen.getByLabelText('traffic, %'))
    await userEvent.type(screen.getByLabelText('traffic, %'), '-20')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ cost: 12_000_000, effects: [{ metric: 'traffic', delta_pct: -20, spill: 0.3 }] })
  })

  it('drops the session on 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Unauthenticated.' }), { status: 401 })))
    const onUnauthorized = vi.fn()
    render(<table><tbody><ActionRow action={lights} token="t" onSaved={vi.fn()} onUnauthorized={onUnauthorized} /></tbody></table>)

    await userEvent.click(screen.getByRole('button', { name: 'Изменить «Умные светофоры»' }))
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await vi.waitFor(() => expect(onUnauthorized).toHaveBeenCalled())
  })
})
