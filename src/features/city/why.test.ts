import { describe, expect, it } from 'vitest'
import type { DeltaRow } from '../../shared/lib/deltas'
import type { Metric } from '../../shared/lib/schemas'
import { whyRows } from './why'

const metric = (key: 'traffic' | 'heat' | 'air', name: string): Metric => ({
  key, name, unit: 'индекс', sphere: 'transport', lower_is_better: key !== 'air', min: 0, max: 100, is_computed: false,
})
const row = (m: Metric, delta: number): DeltaRow => ({ metric: m, before: 50, after: 50 + delta, delta, improved: delta < 0 })
const traffic = metric('traffic', 'Загрузка дорог')
const heat = metric('heat', 'Индекс жары')
const air = metric('air', 'Качество воздуха')

describe('whyRows', () => {
  const contributions = [
    { label: 'Маршрут Б', deltas: { traffic: -3.9 } },
    { label: 'Умные светофоры', deltas: { traffic: -4.8 } },
    { label: 'Озеленение', deltas: { heat: -4.6, air: 2.3 } },
  ]

  it('lists what moved each changed metric, biggest first', () => {
    const rows = whyRows([row(traffic, -8.7), row(heat, -4.6), row(air, 0)], contributions)

    expect(rows.map((r) => r.metric.key)).toEqual(['traffic', 'heat'])
    expect(rows[0].causes).toEqual([{ label: 'Умные светофоры', delta: -4.8 }, { label: 'Маршрут Б', delta: -3.9 }])
  })

  it('keeps only the four biggest changes', () => {
    const many = [1, 2, 3, 4, 5].map((d) => row(traffic, -d))
    expect(whyRows(many, contributions)).toHaveLength(4)
  })
})
