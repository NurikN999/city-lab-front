import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Action } from '../../../shared/lib/schemas'
import { ScenarioTray } from './ScenarioTray'

const sphere = { key: 'transport' as const, name: 'Транспорт' }
const lane: Action = { id: 2, key: 'bus_lane', name: 'Выделенная полоса', sphere, cost: 30_000_000, scope: 'district', assumption: '', source_url: null, effects: [] }
const dust: Action = { id: 6, key: 'dust', name: 'Пылеподавление', sphere, cost: 80_000_000, scope: 'district', assumption: '', source_url: null, effects: [] }

describe('ScenarioTray', () => {
  it('blocks SIMULATE over budget', () => {
    render(<ScenarioTray draft={{ districtId: 11, actionIds: [2, 6], routeId: null }} actions={[lane, dust]} routes={[]} budget={100_000_000} onRemove={vi.fn()} onSimulated={vi.fn()} />)

    expect(screen.getByRole('button', { name: /simulate/i })).toBeDisabled()
    expect(screen.getByText('Превышение на 10 млн ₸')).toBeInTheDocument()
  })

  it('shows the server message when simulation fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Сценарий превышает бюджет на 5 000 000 ₸.', error: 'budget_exceeded', over: 5_000_000 }), { status: 422 })))
    render(<ScenarioTray draft={{ districtId: 11, actionIds: [2], routeId: null }} actions={[lane, dust]} routes={[]} budget={100_000_000} onRemove={vi.fn()} onSimulated={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /simulate/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Сценарий превышает бюджет на 5 000 000 ₸.')
  })

  it('reports the simulated scenario', async () => {
    const onSimulated = vi.fn()
    const result = { before: { city: {}, districts: {} }, after: { city: {}, districts: {} }, cost: 30_000_000, budget: 100_000_000, over_budget: false, assumptions: { actions: [], couplings: [] } }
    const scenario = { id: 9, name: 'Выделенная полоса', source: 'manual', budget: 100_000_000, district_id: 11, cost: 30_000_000, items: [], created_at: '2026-09-24T00:00:00+00:00' }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ scenario, result }), { status: 201 })))
    render(<ScenarioTray draft={{ districtId: 11, actionIds: [2], routeId: null }} actions={[lane]} routes={[]} budget={100_000_000} onRemove={vi.fn()} onSimulated={onSimulated} />)

    await userEvent.click(screen.getByRole('button', { name: /simulate/i }))

    await vi.waitFor(() => expect(onSimulated).toHaveBeenCalledWith(expect.objectContaining({ scenario: expect.objectContaining({ id: 9 }) })))
  })
})
