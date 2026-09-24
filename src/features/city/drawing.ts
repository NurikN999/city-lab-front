import type { LatLng, RoutePreview } from '../../shared/lib/schemas'

export const MAX_POINTS = 25

export type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: RoutePreview }
  | { status: 'error'; error: string }

export function addPoint(points: LatLng[], point: LatLng): LatLng[] {
  return points.length >= MAX_POINTS ? points : [...points, point]
}

export function undoPoint(points: LatLng[]): LatLng[] {
  return points.slice(0, -1)
}

export function canSave(points: LatLng[], name: string): boolean {
  return points.length >= 2 && name.trim().length > 0
}

const EARTH_RADIUS_M = 6_371_000
const toRad = (deg: number) => (deg * Math.PI) / 180

/** Длина линии GeoJSON ([lng, lat]) по гаверсинусу. */
export function pathLengthKm(path: [number, number][]): number {
  let meters = 0
  for (let i = 1; i < path.length; i++) {
    const [lng1, lat1] = path[i - 1]
    const [lng2, lat2] = path[i]
    const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2
    meters += 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)))
  }
  return meters / 1000
}
