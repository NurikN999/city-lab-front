import { describe, expect, it } from 'vitest'
import type { District, Metric } from '../../shared/lib/schemas'
import { valuesById, worstDistricts } from './rank'

const traffic: Metric = { key: 'traffic', name: 'Загрузка дорог', unit: '%', sphere: 'transport', lower_is_better: true, min: 0, max: 100, is_computed: false }
const air: Metric = { key: 'air', name: 'Качество воздуха', unit: 'индекс', sphere: 'climate', lower_is_better: false, min: 0, max: 100, is_computed: false }

function district(id: number, values: District['values']): District {
  return { id, name: `${id} мкр`, population: 1, center: { lat: 0, lng: 0 }, boundary: { type: 'Polygon', coordinates: [] }, values }
}

describe('rank', () => {
  const districts = [district(1, { traffic: 40, air: 80 }), district(2, { traffic: 84, air: 50 }), district(3, { traffic: 71, air: 30 })]

  it('keys values by id string', () => {
    expect(valuesById(districts)['2'].traffic).toBe(84)
  })

  it('returns the worst districts first', () => {
    expect(worstDistricts(districts, valuesById(districts), traffic, 2).map((r) => r.district.id)).toEqual([2, 3])
  })

  it('respects higher-is-better metrics', () => {
    expect(worstDistricts(districts, valuesById(districts), air, 1)[0]).toEqual({ district: districts[2], value: 30 })
  })
})
