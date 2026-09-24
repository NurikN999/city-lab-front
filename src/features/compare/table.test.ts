import { describe, expect, it } from 'vitest'
import type { CompareResponse, LabeledScenario, Metric } from '../../shared/lib/schemas'
import { compareTable } from './table'

const traffic: Metric = { key: 'traffic', name: 'Загрузка дорог', unit: '%', sphere: 'transport', lower_is_better: true, min: 0, max: 100, is_computed: false }
const heat: Metric = { key: 'heat', name: 'Индекс жары', unit: 'индекс', sphere: 'climate', lower_is_better: true, min: 0, max: 100, is_computed: false }
const air: Metric = { key: 'air', name: 'Качество воздуха', unit: 'индекс', sphere: 'climate', lower_is_better: false, min: 0, max: 100, is_computed: false }

function labeled(label: 'A' | 'B' | 'C', districtId: number | null, cost: number, after: Record<string, number>): LabeledScenario {
  return {
    label,
    scenario: { id: label.charCodeAt(0), name: label, source: 'manual', budget: 100, district_id: districtId, cost, items: [], created_at: '' },
    result: {
      before: { city: { traffic: 60, heat: 70, air: 50 }, districts: { '11': { traffic: 84, heat: 78, air: 50 } } },
      after: { city: { traffic: 60, heat: 70, air: 50 }, districts: { '11': { traffic: 84, heat: 78, air: 50, ...after } } },
      cost, budget: 100, over_budget: false, assumptions: { actions: [], couplings: [] },
    },
  }
}

describe('compareTable', () => {
  const response: CompareResponse = {
    scenarios: [labeled('A', 11, 70, { traffic: 67, heat: 73 }), labeled('B', 11, 82, { traffic: 62 }), labeled('C', 11, 28, { traffic: 78, heat: 73 })],
    explanation: '',
  }

  it('highlights the best improvement per row, including ties', () => {
    const table = compareTable(response, [traffic, heat, air])

    expect(table.focusDistrictId).toBe(11)
    expect(table.rows.map((r) => r.metric.key)).toEqual(['traffic', 'heat'])
    expect(table.rows[0].cells.map((c) => c.isBest)).toEqual([false, true, false])
    expect(table.rows[1].cells.map((c) => [c.delta, c.isBest])).toEqual([[-5, true], [0, false], [-5, true]])
  })

  it('marks the cheapest scenario', () => {
    expect(compareTable(response, [traffic]).costs.map((c) => c.isBest)).toEqual([false, false, true])
  })

  it('falls back to the city when districts differ', () => {
    const mixed = { ...response, scenarios: [labeled('A', 11, 1, {}), labeled('B', null, 1, {})] }
    expect(compareTable(mixed, [traffic]).focusDistrictId).toBeNull()
  })
})
