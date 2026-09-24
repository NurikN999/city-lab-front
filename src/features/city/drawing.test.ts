import { describe, expect, it } from 'vitest'
import { addPoint, canSave, MAX_POINTS, pathLengthKm, undoPoint } from './drawing'

const p = (lat: number, lng: number) => ({ lat, lng })

describe('drawing', () => {
  it('adds and undoes points', () => {
    const two = addPoint(addPoint([], p(43.66, 51.16)), p(43.67, 51.17))
    expect(two).toHaveLength(2)
    expect(undoPoint(two)).toEqual([p(43.66, 51.16)])
    expect(undoPoint([])).toEqual([])
  })

  it('caps the number of stops', () => {
    const full = Array.from({ length: MAX_POINTS }, (_, i) => p(43.6 + i / 1000, 51.1))
    expect(addPoint(full, p(43.7, 51.2))).toHaveLength(MAX_POINTS)
  })

  it('needs two points and a name to save', () => {
    expect(canSave([p(43.66, 51.16)], 'Мой')).toBe(false)
    expect(canSave([p(43.66, 51.16), p(43.67, 51.17)], '  ')).toBe(false)
    expect(canSave([p(43.66, 51.16), p(43.67, 51.17)], 'Мой')).toBe(true)
  })

  it('measures path length in km', () => {
    expect(pathLengthKm([[51.16, 43.65], [51.17, 43.65]])).toBeCloseTo(0.8046, 2)
    expect(pathLengthKm([])).toBe(0)
  })
})
