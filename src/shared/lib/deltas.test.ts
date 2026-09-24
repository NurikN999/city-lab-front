import { describe, expect, it } from 'vitest'
import { deltaRows } from './deltas'
import type { Metric, SimulationResult } from './schemas'

const traffic: Metric = { key: 'traffic', name: 'Загрузка дорог', unit: '%', sphere: 'transport', lower_is_better: true, min: 0, max: 100, is_computed: false }
const coverage: Metric = { key: 'transit_coverage', name: 'Покрытие ОТ', unit: '%', sphere: 'transport', lower_is_better: false, min: 0, max: 100, is_computed: true }
const heat: Metric = { key: 'heat', name: 'Индекс жары', unit: 'индекс', sphere: 'climate', lower_is_better: true, min: 0, max: 100, is_computed: false }

const result: SimulationResult = {
  before: { city: { traffic: 56.1, transit_coverage: 44.3 }, districts: { '11': { traffic: 84, transit_coverage: 0 } } },
  after: { city: { traffic: 55, transit_coverage: 48.8 }, districts: { '11': { traffic: 59, transit_coverage: 72.4 } } },
  cost: 1, budget: 1, over_budget: false, assumptions: { actions: [], couplings: [] },
}

describe('deltaRows', () => {
  it('builds district rows with improvement direction', () => {
    expect(deltaRows(result, [traffic, coverage, heat], 11)).toEqual([
      { metric: traffic, before: 84, after: 59, delta: -25, improved: true },
      { metric: coverage, before: 0, after: 72.4, delta: 72.4, improved: true },
    ])
  })

  it('uses city values without a district and rounds deltas', () => {
    expect(deltaRows(result, [traffic], null)[0].delta).toBe(-1.1)
  })
})
