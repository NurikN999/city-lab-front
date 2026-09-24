import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson'
import { badness, levelOf, type Level } from '../../shared/lib/format'
import type { BusRoute, District, LatLng, Metric, MetricValues } from '../../shared/lib/schemas'

export type RouteEmphasis = 'selected' | 'option'
export type RouteLayer = { route: BusRoute; emphasis: RouteEmphasis }

export const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

const METERS_PER_DEG_LAT = 110_574
const COLUMN_HALF_SIDE_M = 70
// ponytail: 8 м на пункт «плохости» → 800 м при 100; подобрано на глаз под зум 13–15
const COLUMN_METERS_PER_POINT = 8

function metersPerDegLng(lat: number): number {
  return 111_320 * Math.cos((lat * Math.PI) / 180)
}

function valueOf(values: Record<string, MetricValues>, district: District, metric: Metric): number | undefined {
  return values[String(district.id)]?.[metric.key]
}

function collection<G extends Polygon | Point | LineString, P>(features: Feature<G, P>[]): FeatureCollection<G, P> {
  return { type: 'FeatureCollection', features }
}

export function districtCollection(
  districts: District[],
  values: Record<string, MetricValues>,
  metric: Metric,
  selectedId: number | null,
): FeatureCollection<Polygon, { id: number; level: Level; selected: boolean }> {
  return collection(districts.map((district) => {
    const value = valueOf(values, district, metric)
    return {
      type: 'Feature',
      geometry: district.boundary,
      properties: { id: district.id, level: value === undefined ? 'mid' : levelOf(value, metric), selected: district.id === selectedId },
    }
  }))
}

export function labelCollection(
  districts: District[],
  values: Record<string, MetricValues>,
  metric: Metric,
): FeatureCollection<Point, { label: string }> {
  return collection(districts.map((district) => {
    const value = valueOf(values, district, metric)
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [district.center.lng, district.center.lat] },
      properties: { label: value === undefined ? district.name : `${district.name}\n${Math.round(value)}` },
    }
  }))
}

const GHOST_HALF_SIDE_M = 78 // шире столбика: грани не совпадают
const GHOST_GAP_M = 4 // зазор над верхом столбика: верхние грани не совпадают

function square(center: LatLng, halfSideM: number): Polygon {
  const { lat, lng } = center
  const dLat = halfSideM / METERS_PER_DEG_LAT
  const dLng = halfSideM / metersPerDegLng(lat)
  return {
    type: 'Polygon',
    coordinates: [[[lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat]]],
  }
}

const columnHeight = (value: number, metric: Metric) => Math.max(0, badness(value, metric)) * COLUMN_METERS_PER_POINT

export function columnCollection(
  districts: District[],
  values: Record<string, MetricValues>,
  metric: Metric,
): FeatureCollection<Polygon, { id: number; height: number; level: Level }> {
  const features: Feature<Polygon, { id: number; height: number; level: Level }>[] = []
  for (const district of districts) {
    const value = valueOf(values, district, metric)
    if (value === undefined) continue
    features.push({
      type: 'Feature',
      geometry: square(district.center, COLUMN_HALF_SIDE_M),
      properties: { id: district.id, height: columnHeight(value, metric), level: levelOf(value, metric) },
    })
  }
  return collection(features)
}

/** «Ушедшая» часть столбика: полупрозрачная шапка от текущей высоты до прежней, только если район улучшился. */
export function ghostCollection(
  districts: District[],
  before: Record<string, MetricValues>,
  current: Record<string, MetricValues>,
  metric: Metric,
): FeatureCollection<Polygon, { id: number; base: number; height: number }> {
  const features: Feature<Polygon, { id: number; base: number; height: number }>[] = []
  for (const district of districts) {
    const was = valueOf(before, district, metric)
    const now = valueOf(current, district, metric)
    if (was === undefined || now === undefined) continue
    const base = columnHeight(now, metric) + GHOST_GAP_M
    const height = columnHeight(was, metric)
    if (height <= base) continue
    features.push({ type: 'Feature', geometry: square(district.center, GHOST_HALF_SIDE_M), properties: { id: district.id, base, height } })
  }
  return collection(features)
}

export function circlePolygon(center: LatLng, radiusM: number, steps = 32): Polygon {
  const ring: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = ((i % steps) / steps) * 2 * Math.PI
    ring.push([
      center.lng + (radiusM * Math.cos(angle)) / metersPerDegLng(center.lat),
      center.lat + (radiusM * Math.sin(angle)) / METERS_PER_DEG_LAT,
    ])
  }
  return { type: 'Polygon', coordinates: [ring] }
}

export function coverageCollection(stops: LatLng[], radiusM: number): FeatureCollection<Polygon> {
  return collection(stops.map((stop) => ({ type: 'Feature', geometry: circlePolygon(stop, radiusM), properties: {} })))
}

export function routeCollection(routes: RouteLayer[]): FeatureCollection<LineString, { emphasis: RouteEmphasis }> {
  return collection(routes.map(({ route, emphasis }) => ({ type: 'Feature', geometry: route.path, properties: { emphasis } })))
}

export function stopCollection(routes: RouteLayer[]): FeatureCollection<Point, { emphasis: RouteEmphasis }> {
  return collection(routes.flatMap(({ route, emphasis }) =>
    route.stops.map((stop) => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [stop.lng, stop.lat] }, properties: { emphasis } })),
  ))
}

export function pointAlong(path: [number, number][], t: number): [number, number] {
  const lengths = path.slice(1).map((point, i) => Math.hypot(point[0] - path[i][0], point[1] - path[i][1]))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  // t − floor(t) точнее, чем t % 1, для долей вроде 1/3; целое t > 0 — конец пути
  const fraction = t - Math.floor(t)
  let remaining = (t > 0 && fraction === 0 ? 1 : fraction) * total
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const share = lengths[i] === 0 ? 0 : remaining / lengths[i]
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * share, path[i][1] + (path[i + 1][1] - path[i][1]) * share]
    }
    remaining -= lengths[i]
  }
  return path[path.length - 1]
}

export function busCollection(path: [number, number][], t: number, count = 3): FeatureCollection<Point> {
  return collection(Array.from({ length: count }, (_, i) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: pointAlong(path, t + i / count) },
    properties: {},
  })))
}

export function numberedStops(points: LatLng[]): FeatureCollection<Point, { label: string }> {
  return collection(points.map((point, i) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [point.lng, point.lat] },
    properties: { label: String(i + 1) },
  })))
}

export function lineCollection(path: [number, number][] | null): FeatureCollection<LineString> {
  if (!path || path.length < 2) return collection<LineString, Record<string, never>>([])
  return collection([{ type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: path }, properties: {} }])
}
