import { describe, expect, it } from 'vitest'
import type { District, Metric } from '../../shared/lib/schemas'
import { busCollection, circlePolygon, columnCollection, districtCollection, labelCollection, lineCollection, numberedStops, pointAlong, routeCollection } from './geo'

const traffic: Metric = { key: 'traffic', name: 'Загрузка дорог', unit: '%', sphere: 'transport', lower_is_better: true, min: 0, max: 100, is_computed: false }

const district: District = {
  id: 11, name: '12 мкр', population: 10000, center: { lat: 43.66, lng: 51.16 },
  boundary: { type: 'Polygon', coordinates: [[[51.15, 43.65], [51.17, 43.65], [51.17, 43.67], [51.15, 43.65]]] },
  values: { traffic: 84 },
}

function metersBetween(a: number[], b: number[]): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const x = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180) * 111_320
  const y = (lat2 - lat1) * 110_574
  return Math.hypot(x, y)
}

describe('geo', () => {
  it('colors districts by level and marks the selected one', () => {
    const fc = districtCollection([district], { '11': { traffic: 84 } }, traffic, 11)

    expect(fc.features[0].properties).toEqual({ id: 11, level: 'bad', selected: true })
    expect(fc.features[0].geometry).toEqual(district.boundary)
  })

  it('labels districts with their value', () => {
    expect(labelCollection([district], { '11': { traffic: 84 } }, traffic).features[0].properties.label).toBe('12 мкр\n84')
  })

  it('builds a ~140 m column whose height follows badness', () => {
    const column = columnCollection([district], { '11': { traffic: 50 } }, traffic).features[0]
    const ring = column.geometry.coordinates[0]

    expect(column.properties.height).toBe(400)
    expect(metersBetween(ring[0], ring[1])).toBeGreaterThan(120)
    expect(metersBetween(ring[0], ring[1])).toBeLessThan(160)
  })

  it('skips districts without a value', () => {
    expect(columnCollection([district], {}, traffic).features).toHaveLength(0)
  })

  it('draws a closed circle of the given radius', () => {
    const ring = circlePolygon({ lat: 43.66, lng: 51.16 }, 500).coordinates[0]

    expect(ring[0]).toEqual(ring[ring.length - 1])
    expect(metersBetween([51.16, 43.66], ring[8])).toBeGreaterThan(480)
    expect(metersBetween([51.16, 43.66], ring[8])).toBeLessThan(520)
  })

  it('keeps route emphasis on features', () => {
    const route = { id: 2, key: 'b', name: 'Маршрут Б', path: { type: 'LineString' as const, coordinates: [[51.1, 43.6], [51.2, 43.6]] as [number, number][] }, stops: [], district_ids: [11] }

    expect(routeCollection([{ route, emphasis: 'selected' }]).features[0].properties.emphasis).toBe('selected')
  })

  it('interpolates along a path by length', () => {
    const path: [number, number][] = [[0, 0], [1, 0], [1, 1]]

    expect(pointAlong(path, 0)).toEqual([0, 0])
    expect(pointAlong(path, 1)).toEqual([1, 1])
    expect(pointAlong(path, 0.5)).toEqual([1, 0])
    expect(pointAlong(path, 1.25)).toEqual(pointAlong(path, 0.25))
  })

  it('spreads buses evenly', () => {
    expect(busCollection([[0, 0], [3, 0]], 0, 3).features.map((f) => f.geometry.coordinates[0])).toEqual([0, 1, 2])
  })

  it('numbers drawn stops from one', () => {
    const fc = numberedStops([{ lat: 43.66, lng: 51.16 }, { lat: 43.67, lng: 51.17 }])
    expect(fc.features.map((f) => f.properties.label)).toEqual(['1', '2'])
    expect(fc.features[0].geometry.coordinates).toEqual([51.16, 43.66])
  })

  it('draws a preview line only for two or more points', () => {
    expect(lineCollection(null).features).toHaveLength(0)
    expect(lineCollection([[51.16, 43.66]]).features).toHaveLength(0)
    expect(lineCollection([[51.16, 43.66], [51.17, 43.67]]).features[0].geometry.type).toBe('LineString')
  })
})
