import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl, type ExpressionSpecification, type GeoJSONSource, type LngLat, type PointLike } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { District, LatLng, Metric, MetricValues } from '../../../shared/lib/schemas'
import {
  alertCollections, buildObjectCollection, buildZoneCollection, collectLines, busCollection, columnCollection, coverageCollection, districtCollection, EMPTY, ghostCollection,
  labelCollection, lineCollection, numberedStops, routeCollection, type DistrictAlert, stopCollection, type RouteLayer,
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
const ALERT_PULSE_MS = 1600
// Отметка жалоб над подписью района, а не поверх неё
const ALERT_OFFSET: [number, number] = [0, -42]
const GROW_MS = 700 // объект конструктора «вырастает» из земли
// В тайлах соседние дома склеены в одну фигуру с общим id — для сноса нужны здания поштучно (scripts/fetch-buildings.mjs)
const BUILDINGS_URL = `${import.meta.env.BASE_URL}data/aktau-buildings.geojson`
const OSM_BUILDINGS = 'osm-buildings-3d'

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
  onMapClick: (point: LatLng, hit: MapHit) => void
  sheetSnap?: Snap // на телефоне: карта центрирует выбранное над шторкой
  alerts: DistrictAlert[] // районы с активными жалобами жителей
  building: {
    markers: BuildMarker[]
    onMove: (uid: number, point: LatLng, onBuilding: boolean) => void
    roads: { uid: number; lines: [number, number][][] }[] // расширенные улицы
    demolished: { osmId: number; footprint: [number, number][][] }[] // снесённые здания
  } | null // конструктор
}

export type BuildMarker = { uid: number; lat: number; lng: number; radiusM: number; label: string; name: string; kind: string; invalid: boolean }

/** Стоит ли точка на здании — по слою зданий самой подложки. */
/** Что под курсором: здание (id, контур, центр) и/или улица (id, класс, полная линия из тайлов). */
export type MapHit = {
  onBuilding: boolean
  building: { osmId: number; lat: number; lng: number; footprint: [number, number][][] } | null
  road: { osmId: number; cls: string; lines: [number, number][][] } | null
}

const EDITABLE_ROADS = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'])

const layersOf = (map: MapLibreMap, sourceLayer: string, type?: string) =>
  map.getStyle().layers.flatMap((l) => ('source-layer' in l && l['source-layer'] === sourceLayer && (!type || l.type === type) ? [l.id] : []))

function pickAt(map: MapLibreMap, pixel: PointLike): MapHit {
  const [x, y] = Array.isArray(pixel) ? pixel : [pixel.x, pixel.y]
  const buildingFeature = map.queryRenderedFeatures(pixel, { layers: [OSM_BUILDINGS] })[0]
  const roadLayers = layersOf(map, 'transportation', 'line').filter((id) => !id.includes('casing') && !id.includes('rail') && !id.includes('path'))
  const roadFeature = map.queryRenderedFeatures([[x - 6, y - 6], [x + 6, y + 6]], { layers: roadLayers })
    .find((f) => EDITABLE_ROADS.has(String(f.properties.class)))

  let building: MapHit['building'] = null
  if (buildingFeature && typeof buildingFeature.id === 'number') {
    const g = buildingFeature.geometry
    const rings = g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates[0] : []
    const outer = rings[0] ?? []
    if (outer.length > 0) {
      building = {
        osmId: buildingFeature.id,
        lng: outer.reduce((sum, p) => sum + p[0], 0) / outer.length,
        lat: outer.reduce((sum, p) => sum + p[1], 0) / outer.length,
        footprint: rings.map((ring) => ring.map(([lng, lat]): [number, number] => [lng, lat])),
      }
    }
  }

  let road: MapHit['road'] = null
  if (roadFeature && typeof roadFeature.id === 'number') {
    // Улица в тайлах порезана на куски — собираем отрисованные сейчас куски с тем же id
    // (только текущий масштаб: в источнике лежат и тайлы других масштабов, они дублировали бы линию)
    const pieces = map.queryRenderedFeatures({ layers: roadLayers, filter: ['==', ['id'], roadFeature.id] })
    road = {
      osmId: roadFeature.id,
      cls: String(roadFeature.properties.class),
      lines: collectLines(pieces.flatMap((f) => (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString' ? [f.geometry] : []))),
    }
  }

  return { onBuilding: building !== null, building, road }
}

function onBuildingAt(map: MapLibreMap, lngLat: LngLat): boolean {
  return map.queryRenderedFeatures(map.project(lngLat), { layers: [OSM_BUILDINGS] }).length > 0
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function addLayers(map: MapLibreMap) {
  const [good, mid, bad, route, accent, surface, text] = ['--good', '--mid', '--bad', '--route', '--accent', '--surface', '--text'].map(cssVar)
  const byLevel: ExpressionSpecification = ['match', ['get', 'level'], 'good', good, 'mid', mid, bad]

  for (const id of ['districts', 'labels', 'columns', 'ghosts', 'coverage', 'routes', 'stops', 'buses', 'draft-path', 'draft-stops', 'alert-areas', 'alert-points', 'build-zones', 'build-objects', 'build-roads', 'build-demolished', 'osm-buildings']) {
    map.addSource(id, { type: 'geojson', data: EMPTY })
  }
  map.addLayer({
    id: OSM_BUILDINGS, type: 'fill-extrusion', source: 'osm-buildings', layout: { visibility: 'none' },
    paint: { 'fill-extrusion-color': cssVar('--building'), 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-opacity': 0.9 },
  })
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
  // Жалобы жителей: район «горит» — заливка и контур под столбиками, кольцо и счётчик поверх всего
  map.addLayer({ id: 'alert-fill', type: 'fill', source: 'alert-areas', paint: { 'fill-color': bad, 'fill-opacity': 0.25 } }, 'coverage')
  map.addLayer({ id: 'alert-line', type: 'line', source: 'alert-areas', paint: { 'line-color': bad, 'line-width': 3 } }, 'coverage')
  map.addLayer({
    id: 'alert-pulse', type: 'circle', source: 'alert-points',
    paint: { 'circle-radius': 14, 'circle-color': bad, 'circle-opacity': 0, 'circle-stroke-color': bad, 'circle-stroke-width': 3, 'circle-stroke-opacity': 0.8, 'circle-translate': ALERT_OFFSET },
  })
  map.addLayer({
    id: 'alert-dot', type: 'circle', source: 'alert-points',
    paint: { 'circle-radius': 11, 'circle-color': bad, 'circle-stroke-color': surface, 'circle-stroke-width': 2, 'circle-translate': ALERT_OFFSET },
  })
  map.addLayer({
    id: 'alert-count', type: 'symbol', source: 'alert-points',
    layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true, 'icon-allow-overlap': true },
    paint: { 'text-color': surface, 'text-translate': ALERT_OFFSET },
  })
  // Конструктор: круг влияния объекта — синий, если место подходит, красный, если нет
  const zoneColor: ExpressionSpecification = ['case', ['get', 'invalid'], bad, route]
  map.addLayer({ id: 'build-zone-fill', type: 'fill', source: 'build-zones', paint: { 'fill-color': zoneColor, 'fill-opacity': 0.14 } })
  map.addLayer({ id: 'build-zone-line', type: 'line', source: 'build-zones', paint: { 'line-color': zoneColor, 'line-width': 2, 'line-dasharray': [2, 1] } })
  // Конструктор: объёмные здания объектов своего цвета; неподходящее место — тревожный цвет
  const byKind: ExpressionSpecification = ['case', ['get', 'invalid'], bad, ['match', ['get', 'kind'],
    'school', cssVar('--object-school'), 'kindergarten', cssVar('--object-kindergarten'), 'clinic', cssVar('--object-clinic'),
    'park', cssVar('--object-park'), 'bus_stop', cssVar('--object-stop'), route]]
  map.addLayer({ id: 'build-objects', type: 'fill-extrusion', source: 'build-objects', paint: { 'fill-extrusion-color': byKind, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.95 } })
  // Правки города: снесённые здания — серое пятно, расширенная улица — широкая линия с разметкой новых полос
  map.addLayer({ id: 'build-demolished-fill', type: 'fill', source: 'build-demolished', paint: { 'fill-color': cssVar('--muted'), 'fill-opacity': 0.45 } }, 'coverage')
  map.addLayer({ id: 'build-demolished-line', type: 'line', source: 'build-demolished', paint: { 'line-color': text, 'line-width': 1.5, 'line-dasharray': [2, 2] } }, 'coverage')
  map.addLayer({ id: 'build-road-casing', type: 'line', source: 'build-roads', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': surface, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 6, 16, 26] } }, 'coverage')
  map.addLayer({ id: 'build-road', type: 'line', source: 'build-roads', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': route, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 20] } }, 'coverage')
  map.addLayer({ id: 'build-road-lanes', type: 'line', source: 'build-roads', paint: { 'line-color': surface, 'line-width': 1.5, 'line-dasharray': [3, 3] } }, 'coverage')
}

export function CityMap(props: CityMapProps) {
  const { districts, metric, values, ghostValues, selectedId, routes, coverageStops, animateBuses, onSelectDistrict, drawing, onMapClick, sheetSnap, alerts, building } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  // Обработчики регистрируются один раз при загрузке карты — берём из ref последние версии
  const onSelectRef = useRef(onSelectDistrict)
  const onMapClickRef = useRef(onMapClick)
  const isDrawingRef = useRef(drawing !== null || building !== null)
  useEffect(() => {
    onSelectRef.current = onSelectDistrict
    onMapClickRef.current = onMapClick
    isDrawingRef.current = drawing !== null || building !== null
  })
  // Рисование маршрута и конструктор забирают клики по карте себе
  const isDrawing = drawing !== null || building !== null
  const onMoveRef = useRef(building?.onMove)
  useEffect(() => {
    onMoveRef.current = building?.onMove
  })
  const markersRef = useRef(new Map<number, Marker>())
  const draggingRef = useRef<number | null>(null) // значок под пальцем не двигаем из пропсов
  const buildMarkers = building?.markers
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
        if (isDrawingRef.current) onMapClickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng }, pickAt(instance, event.point))
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
    const { areas, points } = alertCollections(districts, alerts)
    map.getSource<GeoJSONSource>('alert-areas')?.setData(areas)
    map.getSource<GeoJSONSource>('alert-points')?.setData(points)
  }, [map, districts, alerts])

  useEffect(() => {
    if (!map) return
    map.getSource<GeoJSONSource>('build-zones')?.setData(buildZoneCollection(buildMarkers ?? []))
  }, [map, buildMarkers])

  const buildRoads = building?.roads
  const demolished = building?.demolished
  useEffect(() => {
    if (!map) return
    map.getSource<GeoJSONSource>('build-roads')?.setData({
      type: 'FeatureCollection',
      features: (buildRoads ?? []).map((r) => ({ type: 'Feature', geometry: { type: 'MultiLineString', coordinates: r.lines }, properties: { uid: r.uid } })),
    })
    map.getSource<GeoJSONSource>('build-demolished')?.setData({
      type: 'FeatureCollection',
      features: (demolished ?? []).map((d) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: d.footprint }, properties: { osmId: d.osmId } })),
    })
    // Снесённые здания исчезают; проверка «на здании» их тоже больше не видит
    const ids = (demolished ?? []).map((d) => d.osmId)
    map.setFilter(OSM_BUILDINGS, ids.length > 0 ? ['!', ['in', ['id'], ['literal', ids]]] : null)
  }, [map, buildRoads, demolished])

  // Конструктор показывает здания поштучно вместо тайловых групп; файл грузится при первом входе
  const buildMode = building !== null
  const buildingsRequested = useRef(false)
  useEffect(() => {
    if (!map) return
    if (buildMode && !buildingsRequested.current) {
      map.getSource<GeoJSONSource>('osm-buildings')?.setData(BUILDINGS_URL)
      buildingsRequested.current = true
    }
    map.setLayoutProperty(OSM_BUILDINGS, 'visibility', buildMode ? 'visible' : 'none')
    for (const id of layersOf(map, 'building')) map.setLayoutProperty(id, 'visibility', buildMode ? 'none' : 'visible')
  }, [map, buildMode])

  const bornRef = useRef(new Map<number, number>())
  useEffect(() => {
    if (!map) return
    const markers = buildMarkers ?? []
    const born = bornRef.current
    const now = performance.now()
    for (const uid of born.keys()) if (!markers.some((m) => m.uid === uid)) born.delete(uid)
    for (const m of markers) if (!born.has(m.uid)) born.set(m.uid, now)
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const source = map.getSource<GeoJSONSource>('build-objects')
    let frame = 0
    const paint = (time: number) => {
      let growing = false
      source?.setData(buildObjectCollection(markers.map((m) => {
        const t = still ? 1 : Math.min(1, (time - (born.get(m.uid) ?? time)) / GROW_MS)
        if (t < 1) growing = true
        return { uid: m.uid, lat: m.lat, lng: m.lng, kind: m.kind, invalid: m.invalid, grow: 1 - (1 - t) ** 3 }
      })))
      if (growing) frame = requestAnimationFrame(paint)
    }
    paint(now)
    return () => cancelAnimationFrame(frame)
  }, [map, buildMarkers])

  useEffect(() => {
    if (!map) return
    const markers = markersRef.current
    const wanted = new Map((buildMarkers ?? []).map((m) => [m.uid, m]))
    for (const [uid, marker] of markers) {
      if (!wanted.has(uid)) {
        marker.remove()
        markers.delete(uid)
      }
    }
    for (const m of wanted.values()) {
      let marker = markers.get(m.uid)
      if (!marker) {
        const element = document.createElement('div')
        // Ручка под зданием, а не поверх него: само здание остаётся видно
        const created = new Marker({ element, draggable: true, anchor: 'top', offset: [0, 12] }).setLngLat([m.lng, m.lat]).addTo(map)
        const report = (done: boolean) => {
          const at = created.getLngLat()
          onMoveRef.current?.(m.uid, { lat: at.lat, lng: at.lng }, done && onBuildingAt(map, at))
        }
        created.on('dragstart', () => { draggingRef.current = m.uid })
        created.on('drag', () => report(false))
        created.on('dragend', () => { draggingRef.current = null; report(true) })
        markers.set(m.uid, created)
        marker = created
      } else if (draggingRef.current !== m.uid) {
        marker.setLngLat([m.lng, m.lat])
      }
      const element = marker.getElement()
      // Только свои классы: служебный класс MapLibre отвечает за позиционирование значка
      element.classList.add(styles.buildMarker)
      element.classList.toggle(styles.buildMarkerInvalid, m.invalid)
      element.textContent = m.label
      element.title = m.name
      element.setAttribute('aria-label', m.name)
    }
  }, [map, buildMarkers])

  useEffect(() => () => {
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current.clear()
  }, [])

  const hasAlerts = alerts.length > 0
  useEffect(() => {
    if (!map || !hasAlerts || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Пульс «события на карте»: кольцо расходится и гаснет, заливка района дышит
    let frame = requestAnimationFrame(function pulse(time) {
      const t = (time % ALERT_PULSE_MS) / ALERT_PULSE_MS
      map.setPaintProperty('alert-pulse', 'circle-radius', 12 + 26 * t)
      map.setPaintProperty('alert-pulse', 'circle-stroke-opacity', 0.9 * (1 - t))
      map.setPaintProperty('alert-fill', 'fill-opacity', 0.15 + 0.2 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t)))
      frame = requestAnimationFrame(pulse)
    })
    return () => cancelAnimationFrame(frame)
  }, [map, hasAlerts])

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
