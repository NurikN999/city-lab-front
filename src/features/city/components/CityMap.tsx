import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type ExpressionSpecification, type GeoJSONSource } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { District, LatLng, Metric, MetricValues } from '../../../shared/lib/schemas'
import {
  busCollection, columnCollection, coverageCollection, districtCollection, EMPTY,
  labelCollection, routeCollection, stopCollection, type RouteLayer,
} from '../geo'
import styles from './CityMap.module.css'

// MapLibre 6 ищет воркер рядом с собой через import.meta.url,
// а Vite переносит библиотеку в .vite/deps — поэтому отдаём собранный Vite воркер явно
setWorkerUrl(workerUrl)

// Liberty уже содержит слой building-3d (fill-extrusion с zoom 14)
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const AKTAU_CENTER: [number, number] = [51.165, 43.655]
const STOP_RADIUS_M = 500
const BUS_LAP_MS = 20_000

type CityMapProps = {
  districts: District[]
  metric: Metric
  values: Record<string, MetricValues>
  ghostValues: Record<string, MetricValues> | null
  selectedId: number | null
  routes: RouteLayer[]
  coverageStops: LatLng[]
  animateBuses: boolean
  onSelectDistrict: (id: number) => void
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function addLayers(map: MapLibreMap) {
  const [good, mid, bad, route, accent, surface, text] = ['--good', '--mid', '--bad', '--route', '--accent', '--surface', '--text'].map(cssVar)
  const byLevel: ExpressionSpecification = ['match', ['get', 'level'], 'good', good, 'mid', mid, bad]

  for (const id of ['districts', 'labels', 'columns', 'ghosts', 'coverage', 'routes', 'stops', 'buses']) {
    map.addSource(id, { type: 'geojson', data: EMPTY })
  }
  map.addLayer({ id: 'district-fill', type: 'fill', source: 'districts', paint: { 'fill-color': byLevel, 'fill-opacity': 0.3 } })
  map.addLayer({
    id: 'district-line', type: 'line', source: 'districts',
    paint: { 'line-color': ['case', ['get', 'selected'], accent, surface], 'line-width': ['case', ['get', 'selected'], 4, 1.5] },
  })
  map.addLayer({ id: 'coverage', type: 'fill', source: 'coverage', paint: { 'fill-color': route, 'fill-opacity': 0.12 } })
  map.addLayer({
    id: 'route-option', type: 'line', source: 'routes', filter: ['==', ['get', 'emphasis'], 'option'],
    paint: { 'line-color': route, 'line-width': 3, 'line-opacity': 0.45, 'line-dasharray': [1, 2] },
  })
  map.addLayer({
    id: 'route-selected', type: 'line', source: 'routes', filter: ['==', ['get', 'emphasis'], 'selected'],
    paint: { 'line-color': route, 'line-width': 6 },
  })
  map.addLayer({
    id: 'stops', type: 'circle', source: 'stops', filter: ['==', ['get', 'emphasis'], 'selected'],
    paint: { 'circle-radius': 5, 'circle-color': surface, 'circle-stroke-color': route, 'circle-stroke-width': 2.5 },
  })
  map.addLayer({
    id: 'ghost-columns', type: 'fill-extrusion', source: 'ghosts',
    paint: { 'fill-extrusion-color': bad, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.25 },
  })
  map.addLayer({
    id: 'columns', type: 'fill-extrusion', source: 'columns',
    paint: { 'fill-extrusion-color': byLevel, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.9 },
  })
  map.addLayer({
    id: 'buses', type: 'circle', source: 'buses',
    paint: { 'circle-radius': 7, 'circle-color': route, 'circle-stroke-color': surface, 'circle-stroke-width': 2 },
  })
  map.addLayer({
    id: 'labels', type: 'symbol', source: 'labels',
    layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true },
    paint: { 'text-color': text, 'text-halo-color': surface, 'text-halo-width': 2 },
  })
}

export function CityMap(props: CityMapProps) {
  const { districts, metric, values, ghostValues, selectedId, routes, coverageStops, animateBuses, onSelectDistrict } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  // Обработчик клика регистрируется один раз при загрузке карты — берём из ref последнюю версию колбэка
  const onSelectRef = useRef(onSelectDistrict)
  useEffect(() => {
    onSelectRef.current = onSelectDistrict
  })

  useEffect(() => {
    const instance = new MapLibreMap({
      container: containerRef.current!,
      style: STYLE_URL,
      center: AKTAU_CENTER,
      zoom: 13.2,
      pitch: 55,
      bearing: -30,
      maxPitch: 75,
    })
    instance.addControl(new NavigationControl({ visualizePitch: true }))
    instance.on('load', () => {
      addLayers(instance)
      instance.on('click', 'district-fill', (event) => {
        const id: unknown = event.features?.[0]?.properties.id
        if (typeof id === 'number') onSelectRef.current(id)
      })
      instance.on('mouseenter', 'district-fill', () => { instance.getCanvas().style.cursor = 'pointer' })
      instance.on('mouseleave', 'district-fill', () => { instance.getCanvas().style.cursor = '' })
      setMap(instance)
    })
    return () => instance.remove()
  }, [])

  useEffect(() => {
    if (!map) return
    map.getSource<GeoJSONSource>('districts')?.setData(districtCollection(districts, values, metric, selectedId))
    map.getSource<GeoJSONSource>('labels')?.setData(labelCollection(districts, values, metric))
    map.getSource<GeoJSONSource>('columns')?.setData(columnCollection(districts, values, metric))
    map.getSource<GeoJSONSource>('ghosts')?.setData(ghostValues ? columnCollection(districts, ghostValues, metric) : EMPTY)
    map.getSource<GeoJSONSource>('routes')?.setData(routeCollection(routes))
    map.getSource<GeoJSONSource>('stops')?.setData(stopCollection(routes))
    map.getSource<GeoJSONSource>('coverage')?.setData(coverageCollection(coverageStops, STOP_RADIUS_M))
  }, [map, districts, metric, values, ghostValues, selectedId, routes, coverageStops])

  useEffect(() => {
    if (!map) return
    const selected = districts.find((d) => d.id === selectedId)
    if (selected) map.flyTo({ center: [selected.center.lng, selected.center.lat], zoom: 14.6, pitch: 60 })
    else map.easeTo({ center: AKTAU_CENTER, zoom: 13.2, pitch: 55 })
  }, [map, districts, selectedId])

  useEffect(() => {
    if (!map) return
    const source = map.getSource<GeoJSONSource>('buses')
    const path = routes.find((r) => r.emphasis === 'selected')?.route.path.coordinates
    if (!source || !path || !animateBuses) {
      source?.setData(EMPTY)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      source.setData(busCollection(path, 0))
      return
    }
    let frame = requestAnimationFrame(function draw(time) {
      source.setData(busCollection(path, time / BUS_LAP_MS))
      frame = requestAnimationFrame(draw)
    })
    return () => cancelAnimationFrame(frame)
  }, [map, routes, animateBuses])

  return <div ref={containerRef} className={styles.map} role="region" aria-label="Карта микрорайонов Актау" />
}
