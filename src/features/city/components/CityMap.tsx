import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type ExpressionSpecification, type GeoJSONSource } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { District, LatLng, Metric, MetricValues } from '../../../shared/lib/schemas'
import {
  busCollection, columnCollection, coverageCollection, districtCollection, EMPTY, ghostCollection,
  labelCollection, lineCollection, numberedStops, routeCollection, stopCollection, type RouteLayer,
} from '../geo'
import { snapHeight, type Snap } from '../sheet'
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
  drawing: { points: LatLng[]; path: [number, number][] | null } | null
  onMapClick: (point: LatLng) => void
  sheetSnap?: Snap // на телефоне: карта центрирует выбранное над шторкой
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function addLayers(map: MapLibreMap) {
  const [good, mid, bad, route, accent, surface, text] = ['--good', '--mid', '--bad', '--route', '--accent', '--surface', '--text'].map(cssVar)
  const byLevel: ExpressionSpecification = ['match', ['get', 'level'], 'good', good, 'mid', mid, bad]

  for (const id of ['districts', 'labels', 'columns', 'ghosts', 'coverage', 'routes', 'stops', 'buses', 'draft-path', 'draft-stops']) {
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
    paint: { 'fill-extrusion-color': bad, 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.3 },
  })
  map.addLayer({
    id: 'columns', type: 'fill-extrusion', source: 'columns',
    // Непрозрачные: полупрозрачный столбик просвечивает 3D-зданиями внутри квадрата
    paint: { 'fill-extrusion-color': byLevel, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 1 },
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
  map.addLayer({
    id: 'draft-path', type: 'line', source: 'draft-path',
    paint: { 'line-color': route, 'line-width': 5, 'line-dasharray': [2, 1] },
  })
  map.addLayer({
    id: 'draft-stops', type: 'circle', source: 'draft-stops',
    paint: { 'circle-radius': 10, 'circle-color': surface, 'circle-stroke-color': route, 'circle-stroke-width': 3 },
  })
  map.addLayer({
    id: 'draft-labels', type: 'symbol', source: 'draft-stops',
    layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-allow-overlap': true },
    paint: { 'text-color': route },
  })
}

export function CityMap(props: CityMapProps) {
  const { districts, metric, values, ghostValues, selectedId, routes, coverageStops, animateBuses, onSelectDistrict, drawing, onMapClick, sheetSnap } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  // Обработчики регистрируются один раз при загрузке карты — берём из ref последние версии
  const onSelectRef = useRef(onSelectDistrict)
  const onMapClickRef = useRef(onMapClick)
  const isDrawingRef = useRef(drawing !== null)
  useEffect(() => {
    onSelectRef.current = onSelectDistrict
    onMapClickRef.current = onMapClick
    isDrawingRef.current = drawing !== null
  })
  const isDrawing = drawing !== null
  const drawPoints = drawing?.points
  const drawPath = drawing?.path

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
      instance.on('click', (event) => {
        if (isDrawingRef.current) onMapClickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng })
      })
      instance.on('click', 'district-fill', (event) => {
        if (isDrawingRef.current) return
        const id: unknown = event.features?.[0]?.properties.id
        if (typeof id === 'number') onSelectRef.current(id)
      })
      instance.on('mouseenter', 'district-fill', () => {
        if (!isDrawingRef.current) instance.getCanvas().style.cursor = 'pointer'
      })
      instance.on('mouseleave', 'district-fill', () => {
        if (!isDrawingRef.current) instance.getCanvas().style.cursor = ''
      })
      setMap(instance)
    })
    return () => instance.remove()
  }, [])

  useEffect(() => {
    if (!map) return
    map.getSource<GeoJSONSource>('districts')?.setData(districtCollection(districts, values, metric, selectedId))
    map.getSource<GeoJSONSource>('labels')?.setData(labelCollection(districts, values, metric))
    map.getSource<GeoJSONSource>('columns')?.setData(columnCollection(districts, values, metric))
    map.getSource<GeoJSONSource>('ghosts')?.setData(ghostValues ? ghostCollection(districts, ghostValues, values, metric) : EMPTY)
    map.getSource<GeoJSONSource>('routes')?.setData(routeCollection(routes))
    map.getSource<GeoJSONSource>('stops')?.setData(stopCollection(routes))
    map.getSource<GeoJSONSource>('coverage')?.setData(coverageCollection(coverageStops, STOP_RADIUS_M))
  }, [map, districts, metric, values, ghostValues, selectedId, routes, coverageStops])

  useEffect(() => {
    if (!map) return
    const selected = districts.find((d) => d.id === selectedId)
    // Шторка «во весь экран» закрывает карту — центрируем как для половины
    const bottom = sheetSnap ? snapHeight(sheetSnap === 'full' ? 'half' : sheetSnap, map.getContainer().clientHeight) : 0
    const padding = { top: 0, right: 0, left: 0, bottom }
    if (selected) map.flyTo({ center: [selected.center.lng, selected.center.lat], zoom: sheetSnap ? 14 : 14.6, pitch: 60, padding })
    else map.easeTo({ center: AKTAU_CENTER, zoom: 13.2, pitch: 55, padding })
  }, [map, districts, selectedId, sheetSnap])

  useEffect(() => {
    if (!map) return
    map.getCanvas().style.cursor = isDrawing ? 'crosshair' : ''
    // Двойной клик в режиме рисования — это две остановки, а не зум
    if (isDrawing) map.doubleClickZoom.disable()
    else map.doubleClickZoom.enable()
    // Столбики не должны закрывать рисуемую линию
    map.setPaintProperty('columns', 'fill-extrusion-opacity', isDrawing ? 0.2 : 1)
  }, [map, isDrawing])

  useEffect(() => {
    if (!map) return
    map.getSource<GeoJSONSource>('draft-path')?.setData(lineCollection(drawPath ?? null))
    map.getSource<GeoJSONSource>('draft-stops')?.setData(numberedStops(drawPoints ?? []))
  }, [map, drawPoints, drawPath])

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
