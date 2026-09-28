import { isImprovement } from '../../shared/lib/format'
import type { Action, District, LatLng, Metric, ScenarioItemInput, SimulationResult } from '../../shared/lib/schemas'
import { pathLengthKm } from './drawing'

/** Новый объект на карте. onBuilding — место занято зданием (проверяет карта). */
export type ObjectPlacement = { kind?: 'object'; uid: number; actionId: number; lat: number; lng: number; onBuilding: boolean }
/** Расширенная улица: линия собрана из тайлов по id дороги в OSM. */
export type RoadEdit = { kind: 'road'; uid: number; actionId: number; osmId: number; label: string; lines: [number, number][][] }
/** Снесённое здание: id в OSM, центр и контур для «пятна» на карте. */
export type Demolition = { kind: 'demolish'; uid: number; actionId: number; osmId: number; lat: number; lng: number; footprint: [number, number][][] }
export type Placement = ObjectPlacement | RoadEdit | Demolition

export const isObject = (p: Placement): p is ObjectPlacement => p.kind === undefined || p.kind === 'object'

const ROAD_LABELS: Record<string, string> = {
  motorway: 'Магистраль', trunk: 'Магистраль', primary: 'Магистральная улица',
  secondary: 'Улица районного значения', tertiary: 'Улица', minor: 'Местная улица', service: 'Проезд',
}

export const roadLabel = (cls: string) => ROAD_LABELS[cls] ?? 'Дорога'

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
  const objects = placements.filter(isObject) // дорога и снос — поверх существующего, место не проверяем
  for (const p of objects) {
    if (!districtAt(districts, p)) problems.set(p.uid, 'Вне жилых районов')
    else if (p.onBuilding) problems.set(p.uid, 'На месте уже стоит здание')
    else if (objects.some((o) => o.uid !== p.uid && o.actionId === p.actionId && metersBetween(o, p) < MIN_SAME_GAP_M)) {
      problems.set(p.uid, `Ближе ${MIN_SAME_GAP_M} м к такому же объекту`)
    }
  }
  return problems
}

export function buildItems(placements: Placement[]): ScenarioItemInput[] {
  return placements.map((p) => {
    if (p.kind === 'road') return { action_id: p.actionId, geometry: { type: 'MultiLineString' as const, coordinates: p.lines } }
    if (p.kind === 'demolish') return { action_id: p.actionId, osm_id: p.osmId, lat: p.lat, lng: p.lng }
    return { action_id: p.actionId, lat: p.lat, lng: p.lng }
  })
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

export type DistrictChange = { district: string; metric: string; delta: number; improved: boolean }

/** Районы, которые конструктор изменил сильнее всего: у каждого — самая сдвинувшаяся метрика. */
export function topDistrictChanges(result: SimulationResult, metrics: Metric[], districts: District[], limit = 3): DistrictChange[] {
  const changes: DistrictChange[] = []
  for (const district of districts) {
    const before = result.before.districts[String(district.id)] ?? {}
    const after = result.after.districts[String(district.id)] ?? {}
    let best: DistrictChange | null = null
    for (const metric of metrics) {
      const b = before[metric.key]
      const a = after[metric.key]
      if (b === undefined || a === undefined) continue
      const delta = Math.round((a - b) * 10) / 10
      if (delta !== 0 && (!best || Math.abs(delta) > Math.abs(best.delta))) {
        best = { district: district.name, metric: metric.name, delta, improved: isImprovement(delta, metric) }
      }
    }
    if (best) changes.push(best)
  }
  return changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, limit)
}
