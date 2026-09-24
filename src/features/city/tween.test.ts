import { describe, expect, it } from 'vitest'
import { easeOut, tweenValues } from './tween'

describe('tweenValues', () => {
  const from = { '11': { traffic: 80, heat: 70 }, '12': { traffic: 60 } }
  const to = { '11': { traffic: 70, heat: 70 }, '12': { traffic: 40 } }

  it('goes from before to after', () => {
    expect(tweenValues(from, to, 0)).toEqual(from)
    expect(tweenValues(from, to, 0.5)).toEqual({ '11': { traffic: 75, heat: 70 }, '12': { traffic: 50 } })
    expect(tweenValues(from, to, 1)).toEqual(to)
  })

  it('keeps metrics that have no before value', () => {
    expect(tweenValues({ '11': {} }, { '11': { traffic: 70 } }, 0.5)).toEqual({ '11': { traffic: 70 } })
  })

  it('eases out', () => {
    expect(easeOut(0)).toBe(0)
    expect(easeOut(1)).toBe(1)
    expect(easeOut(0.5)).toBeGreaterThan(0.5)
  })
})
