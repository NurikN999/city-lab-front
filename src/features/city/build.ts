import type { Action, District, LatLng, ScenarioItemInput } from '../../shared/lib/schemas'
import { pathLengthKm } from './drawing'

/** Объект конструктора на карте. onBuilding — место занято зданием (проверяет карта). */
export type Placement = { uid: number; actionId: number; lat: number; lng: number; onBuilding: boolean }

const MIN_SAME_GAP_M = 300

const metersBetween = (a: LatLng, b: LatLng) => pathLengthKm([[a.lng, a.lat], [b.lng, b.lat]]) * 1000

function insideRing(ring: number[][], { lat, lng }: LatLng): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function districtAt(districts: District[], point: LatLng): District | undefined {
  return districts.find((d) => insideRing(d.boundary.coordinates[0], point))
}

/** Почему место не подходит: uid → причина. Пустая карта — всё можно строить. */
export function placementProblems(placements: Placement[], districts: District[]): Map<number, string> {
  const problems = new Map<number, string>()
  for (const p of placements) {
    if (!districtAt(districts, p)) problems.set(p.uid, 'Вне жилых районов')
    else if (p.onBuilding) problems.set(p.uid, 'На месте уже стоит здание')
    else if (placements.some((o) => o.uid !== p.uid && o.actionId === p.actionId && metersBetween(o, p) < MIN_SAME_GAP_M)) {
      problems.set(p.uid, `Ближе ${MIN_SAME_GAP_M} м к такому же объекту`)
    }
  }
  return problems
}

export function buildItems(placements: Placement[]): ScenarioItemInput[] {
  return placements.map((p) => ({ action_id: p.actionId, lat: p.lat, lng: p.lng }))
}

export function buildCost(placements: Placement[], actions: Action[]): number {
  return placements.reduce((sum, p) => sum + (actions.find((a) => a.id === p.actionId)?.cost ?? 0), 0)
}

export function buildName(placements: Placement[], actions: Action[]): string {
  const counts = new Map<string, number>()
  for (const p of placements) {
    const name = actions.find((a) => a.id === p.actionId)?.name ?? 'Объект'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return `Конструктор: ${[...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(' + ')}`
}
