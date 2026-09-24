import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Metric, ScenarioWithResult } from '../../../shared/lib/schemas'
import { ResultPanel } from './ResultPanel'

const metric = (key: 'traffic' | 'air', name: string): Metric => ({
  key, name, unit: 'индекс', sphere: 'transport', lower_is_better: key === 'traffic', min: 0, max: 100, is_computed: false,
})
const metrics = [metric('traffic', 'Загрузка дорог'), metric('air', 'Качество воздуха')]

const data: ScenarioWithResult = {
  scenario: { id: 7, name: 'Светофоры', source: 'manual', budget: 100_000_000, district_id: 11, cost: 10_000_000, items: [], created_at: '2026-09-24T10:00:00Z' },
  result: {
    before: { city: { traffic: 56, air: 70 }, districts: { '11': { traffic: 84, air: 58 } } },
    after: { city: { traffic: 55, air: 70 }, districts: { '11': { traffic: 79.2, air: 58 } } },
    cost: 10_000_000,
    budget: 100_000_000,
    over_budget: false,
    assumptions: { actions: [], couplings: [{ source: 'air', target: 'traffic', factor: -0.35 }] },
  },
  contributions: [{ label: 'Умные светофоры', deltas: { traffic: -4.8 } }],
}

describe('ResultPanel', () => {
  it('explains which action moved each metric', () => {
    render(<ResultPanel data={data} metrics={metrics} districtName="12 мкр" onEdit={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText('Почему так изменилось')).toBeInTheDocument()
    expect(screen.getByText(/Умные светофоры −4\.8/)).toBeInTheDocument()
  })

  it('names metrics in model couplings', () => {
    render(<ResultPanel data={data} metrics={metrics} districtName="12 мкр" onEdit={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByText(/Качество воздуха → Загрузка дорог/)).toBeInTheDocument()
  })
})
