import { describe, expect, it } from 'vitest'
import type { Action, District } from '../../shared/lib/schemas'
import { buildCost, buildItems, buildName, districtAt, placementProblems, type Placement } from './build'

const square = (lng: number, lat: number): District['boundary'] => ({
  type: 'Polygon',
  coordinates: [[[lng - 0.005, lat - 0.005], [lng + 0.005, lat - 0.005], [lng + 0.005, lat + 0.005], [lng - 0.005, lat + 0.005], [lng - 0.005, lat - 0.005]]],
})
const district = (id: number, name: string, lng: number, lat: number): District => ({
  id, name, population: 8000, center: { lat, lng }, boundary: square(lng, lat), values: {},
})
const districts = [district(11, '12 мкр', 51.16, 43.66), district(12, '27 мкр', 51.18, 43.66)]
const sphere = { key: 'social' as const, name: 'Соцобъекты' }
const point = (id: number, key: string, name: string, cost: number): Action => ({
  id, key, name, sphere, cost, scope: 'point', radius_m: 500, assumption: '', source_url: null, effects: [],
})
const actions = [point(20, 'school', 'Школа', 45_000_000), point(21, 'park', 'Сквер', 15_000_000)]
const place = (uid: number, actionId: number, lat: number, lng: number, onBuilding = false): Placement => ({ uid, actionId, lat, lng, onBuilding })

describe('city builder', () => {
  it('finds the district under a placed object', () => {
    expect(districtAt(districts, { lat: 43.661, lng: 51.161 })?.name).toBe('12 мкр')
    expect(districtAt(districts, { lat: 43.7, lng: 51.3 })).toBeUndefined()
  })

  it('explains why a spot does not fit', () => {
    const problems = placementProblems([
      place(1, 20, 43.66, 51.16),
      place(2, 20, 43.661, 51.161), // та же школа в ~140 м
      place(3, 21, 43.7, 51.3), // в степи
      place(4, 21, 43.66, 51.18, true), // на здании
    ], districts)

    expect(problems.get(1)).toBe('Ближе 300 м к такому же объекту')
    expect(problems.get(2)).toBe('Ближе 300 м к такому же объекту')
    expect(problems.get(3)).toBe('Вне жилых районов')
    expect(problems.get(4)).toBe('На месте уже стоит здание')
  })

  it('accepts a well placed object', () => {
    expect(placementProblems([place(1, 20, 43.66, 51.16)], districts).size).toBe(0)
  })

  it('prices and names the scenario and sends map items', () => {
    const placements = [place(1, 20, 43.66, 51.16), place(2, 21, 43.662, 51.16), place(3, 21, 43.658, 51.16)]

    expect(buildCost(placements, actions)).toBe(75_000_000)
    expect(buildName(placements, actions)).toBe('Конструктор: Школа + Сквер ×2')
    expect(buildItems(placements)[0]).toEqual({ action_id: 20, lat: 43.66, lng: 51.16 })
  })
})
