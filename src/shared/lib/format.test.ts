import { describe, expect, it } from 'vitest'
import { badness, formatDelta, formatMoney, isImprovement, levelOf } from './format'
import type { Metric } from './schemas'

const traffic: Metric = { key: 'traffic', name: 'Загрузка дорог', unit: '%', sphere: 'transport', lower_is_better: true, min: 0, max: 100, is_computed: false }
const air: Metric = { key: 'air', name: 'Качество воздуха', unit: 'индекс', sphere: 'climate', lower_is_better: false, min: 0, max: 100, is_computed: false }
const co2: Metric = { key: 'co2', name: 'Выбросы CO₂', unit: 'индекс', sphere: 'climate', lower_is_better: true, min: 0, max: 200, is_computed: false }

describe('format', () => {
  it('formats tenge as millions', () => {
    expect(formatMoney(70_000_000)).toBe('70 млн ₸')
    expect(formatMoney(1_500_000_000)).toBe('1 500 млн ₸')
  })

  it('formats deltas with a real minus sign', () => {
    expect(formatDelta(-17)).toBe('−17')
    expect(formatDelta(17.4)).toBe('+17.4')
    expect(formatDelta(0)).toBe('0')
  })

  it('computes badness on the metric scale', () => {
    expect(badness(84, traffic)).toBe(84)
    expect(badness(58, air)).toBe(42)
    expect(badness(100, co2)).toBe(50)
  })

  it('maps badness to levels', () => {
    expect(levelOf(42, traffic)).toBe('good')
    expect(levelOf(61, traffic)).toBe('mid')
    expect(levelOf(84, traffic)).toBe('bad')
    expect(levelOf(25, air)).toBe('bad')
  })

  it('knows the good direction', () => {
    expect(isImprovement(-5, traffic)).toBe(true)
    expect(isImprovement(5, air)).toBe(true)
    expect(isImprovement(5, traffic)).toBe(false)
  })
})
