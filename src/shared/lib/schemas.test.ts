import { describe, expect, it } from 'vitest'
import { aiPlanResponseSchema, cityResponseSchema, scenarioWithResultSchema } from './schemas'

const district = {
  id: 11, name: '12 мкр', population: 10000, center: { lat: 43.669365, lng: 51.16699 },
  boundary: { type: 'Polygon', coordinates: [[[51.16512, 43.66452], [51.17226, 43.66809], [51.16512, 43.66452]]] },
  values: { traffic: 84, transit_coverage: 0, satisfaction: 49 },
}

const result = {
  before: { city: { traffic: 56.1 }, districts: { '11': { traffic: 84 } } },
  after: { city: { traffic: 55 }, districts: { '11': { traffic: 59 } } },
  cost: 70_000_000, budget: 100_000_000, over_budget: false,
  assumptions: { actions: [{ key: 'smart_lights', name: 'Умные светофоры', assumption: 'демо', source_url: null }], couplings: [{ source: 'transit_coverage', target: 'traffic', factor: -0.35 }] },
}

const scenario = {
  id: 2, name: 'Транспорт + тень', source: 'manual', budget: 100_000_000, district_id: 11, cost: 70_000_000,
  items: [{ id: 4, action_id: 1, action_key: 'new_bus_route', action_name: 'Новый автобусный маршрут', district_id: null, route_id: 2, quantity: 1 }],
  created_at: '2026-09-23T23:52:09+00:00',
}

describe('schemas', () => {
  it('parses GET /city', () => {
    const parsed = cityResponseSchema.parse({
      spheres: [{ key: 'transport', name: 'Транспорт' }],
      metrics: [{ key: 'traffic', name: 'Загрузка дорог', unit: '%', sphere: 'transport', lower_is_better: true, min: 0, max: 100, is_computed: false }],
      districts: [district],
      city: { traffic: 56.1 },
    })
    expect(parsed.districts[0].values.traffic).toBe(84)
  })

  it('parses a scenario with result', () => {
    expect(scenarioWithResultSchema.parse({ scenario, result }).result.after.districts['11'].traffic).toBe(59)
  })

  it('parses POST /ai/plan', () => {
    const parsed = aiPlanResponseSchema.parse({
      intent: { district_id: 11, district_name: '12 мкр', goals: [{ metric: 'traffic', direction: 'decrease', weight: 1 }], budget: 100_000_000, fallback: true },
      stats: { combinations: 47, within_budget: 43 },
      scenarios: [{ label: 'A', scenario: { ...scenario, source: 'ai' }, result }],
      explanation: 'A «…»: …',
    })
    expect(parsed.scenarios[0].label).toBe('A')
  })

  it('rejects a wrong shape', () => {
    expect(cityResponseSchema.safeParse({ ...{ spheres: [], metrics: [], city: {} }, districts: [{ ...district, id: '11' }] }).success).toBe(false)
  })
})
