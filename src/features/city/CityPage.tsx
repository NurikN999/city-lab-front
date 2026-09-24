import { useRef, useState } from 'react'
import { DEFAULT_BUDGET } from '../../shared/lib/format'
import type { Action, BusRoute, CityResponse, LatLng, MetricValues } from '../../shared/lib/schemas'
import { AiBar } from './components/AiBar'
import { AiResults } from './components/AiResults'
import { CityKpiPanel } from './components/CityKpiPanel'
import { CityMap } from './components/CityMap'
import { DistrictPanel } from './components/DistrictPanel'
import { DrawPanel } from './components/DrawPanel'
import { Legend } from './components/Legend'
import { LayerSwitch } from './components/LayerSwitch'
import { MyScenarios } from './components/MyScenarios'
import { ProblemsPanel } from './components/ProblemsPanel'
import { ResultPanel } from './components/ResultPanel'
import { ScenarioTray } from './components/ScenarioTray'
import { previewRoute } from './api'
import { addPoint, undoPoint, type PreviewState } from './drawing'
import type { RouteLayer } from './geo'
import { useCityData } from './hooks/useCityData'
import { LAYERS, type LayerSphere } from './layers'
import styles from './CityPage.module.css'
import { valuesById } from './rank'
import { chooseRoute, emptyDraft, toggleAction, withRoute, type Draft } from './scenario'
import { afterAiPlan, afterSimulation, type View } from './view'


type CityScreenProps = { city: CityResponse; actions: Action[]; routes: BusRoute[] }

function CityScreen({ city, actions, routes: loadedRoutes }: CityScreenProps) {
  const [sphere, setSphere] = useState<LayerSphere>('transport')
  const [view, setView] = useState<View>({ mode: 'explore' })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [scenariosVersion, setScenariosVersion] = useState(0)
  const [customRoutes, setCustomRoutes] = useState<BusRoute[]>([])
  const [drawPoints, setDrawPoints] = useState<LatLng[]>([])
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' })
  const previewRequest = useRef<AbortController | null>(null)

  // Новые маршруты добавляем локально: перезапрос /routes перевёл бы весь экран в «загрузку» и сбросил черновик
  const routes = [...loadedRoutes, ...customRoutes]
  const routeAction = actions.find((a) => a.scope === 'route')

  const layer = LAYERS.find((l) => l.sphere === sphere) ?? LAYERS[0]
  const metric = city.metrics.find((m) => m.key === layer.metric) ?? city.metrics[0]
  const baseValues = valuesById(city.districts)
  const selectedId = view.mode === 'explore' || view.mode === 'ai' ? null : view.districtId
  const district = city.districts.find((d) => d.id === selectedId)

  function selectDistrict(id: number) {
    setView({ mode: 'district', districtId: id })
    setDraft(emptyDraft(id))
  }

  function toggle(action: Action) {
    // Функциональное обновление: два быстрых клика не перетирают друг друга
    setDraft((current) => {
      if (!current) return current
      const defaultRoute = routes.find((r) => r.district_ids.includes(current.districtId))?.id ?? null
      return toggleAction(current, action, defaultRoute)
    })
  }

  function requestPreview(points: LatLng[]) {
    previewRequest.current?.abort()
    if (points.length < 2) {
      setPreview({ status: 'idle' })
      return
    }
    const controller = new AbortController()
    previewRequest.current = controller
    setPreview({ status: 'loading' })
    previewRoute(points, controller.signal)
      .then((data) => setPreview({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setPreview({ status: 'error', error: error instanceof Error ? error.message : String(error) })
      })
  }

  function startDrawing() {
    if (!draft) return
    setDrawPoints([])
    setPreview({ status: 'idle' })
    setView({ mode: 'draw', districtId: draft.districtId })
  }

  function handleMapClick(point: LatLng) {
    if (view.mode !== 'draw') return
    const next = addPoint(drawPoints, point)
    setDrawPoints(next)
    requestPreview(next)
  }

  function undoLastPoint() {
    const next = undoPoint(drawPoints)
    setDrawPoints(next)
    requestPreview(next)
  }

  function leaveDrawing() {
    previewRequest.current?.abort()
    setView((current) => (current.mode === 'draw' ? { mode: 'district', districtId: current.districtId } : current))
  }

  function handleRouteSaved(route: BusRoute) {
    setCustomRoutes((current) => [...current, route])
    if (routeAction) setDraft((current) => current && withRoute(current, routeAction, route.id))
    leaveDrawing()
  }

  const mapRoutes: RouteLayer[] = view.mode === 'district' && draft
    ? routes.filter((r) => r.district_ids.includes(draft.districtId) || r.id === draft.routeId).map((route) => ({
        route,
        emphasis: draft.routeId === route.id ? 'selected' : 'option',
      }))
    : []

  const isResult = view.mode === 'result'
  const shownValues: Record<string, MetricValues> = isResult ? view.data.result.after.districts : baseValues
  const ghostValues = isResult ? view.data.result.before.districts : null
  const resultRouteId = isResult ? (view.data.scenario.items.find((i) => i.route_id !== null)?.route_id ?? null) : null
  const resultRoute = routes.find((r) => r.id === resultRouteId)
  const coverageStops: LatLng[] = resultRoute ? resultRoute.stops.map(({ lat, lng }) => ({ lat, lng })) : []
  const routesOnMap: RouteLayer[] = resultRoute ? [{ route: resultRoute, emphasis: 'selected' }] : mapRoutes

  return (
    <div className={styles.screen}>
      <CityMap
        districts={city.districts}
        metric={metric}
        values={shownValues}
        ghostValues={ghostValues}
        selectedId={selectedId}
        routes={routesOnMap}
        coverageStops={coverageStops}
        animateBuses={isResult}
        onSelectDistrict={selectDistrict}
        drawing={view.mode === 'draw' ? { points: drawPoints, path: preview.status === 'ready' ? preview.data.path.coordinates : null } : null}
        onMapClick={handleMapClick}
      />
      <div className={styles.top}><LayerSwitch active={sphere} onChange={setSphere} /></div>
      <div className={`${styles.left} ${styles.stack}`}>
        <ProblemsPanel districts={city.districts} values={baseValues} metric={metric} onSelect={selectDistrict} />
        <MyScenarios reloadKey={scenariosVersion} />
      </div>
      <div className={styles.right}>
        {view.mode === 'draw' && district ? (
          <DrawPanel
            districtName={district.name}
            points={drawPoints}
            preview={preview}
            onUndo={undoLastPoint}
            onCancel={leaveDrawing}
            onSaved={handleRouteSaved}
          />
        ) : view.mode === 'result' && district ? (
          <ResultPanel
            data={view.data}
            metrics={city.metrics}
            districtName={district.name}
            onEdit={() => setView({ mode: 'district', districtId: view.districtId })}
            onClose={() => setView({ mode: 'explore' })}
          />
        ) : view.mode === 'district' && district && draft ? (
          <DistrictPanel
            key={district.id}
            district={district}
            metrics={city.metrics}
            actions={actions}
            routes={routes}
            draft={draft}
            onToggle={toggle}
            onChooseRoute={(routeId) => setDraft((current) => current && chooseRoute(current, routeId))}
            onClose={() => setView({ mode: 'explore' })}
            onDrawRoute={startDrawing}
          />
        ) : (
          <CityKpiPanel metrics={city.metrics} city={city.city} />
        )}
      </div>
      {view.mode === 'district' && draft && (
        <div className={styles.bottom}>
          <ScenarioTray
            key={draft.districtId}
            draft={draft}
            actions={actions}
            routes={routes}
            budget={DEFAULT_BUDGET}
            onRemove={toggle}
            onSimulated={(data) => {
              setView((current) => afterSimulation(current, draft.districtId, data))
              setScenariosVersion((v) => v + 1)
            }}
          />
        </div>
      )}
      {view.mode !== 'district' && view.mode !== 'draw' && (
        <div className={styles.bottom}>
          <AiBar onResult={(data) => { setView((current) => afterAiPlan(current, data)); setScenariosVersion((v) => v + 1) }} />
        </div>
      )}
      {view.mode === 'ai' && (
        <div className={styles.overlay}>
          <AiResults data={view.data} metrics={city.metrics} onClose={() => setView({ mode: 'explore' })} />
        </div>
      )}
      <div className={styles.bottomLeft}><Legend metric={metric} /></div>
    </div>
  )
}

export default function CityPage() {
  const data = useCityData()

  if (data.status === 'loading') return <p className={styles.status}>Загружаем город…</p>
  if (data.status === 'error') return <p className={styles.status} role="alert">Не удалось загрузить город: {data.error}</p>
  if (data.data.city.districts.length === 0 || data.data.city.metrics.length === 0) return <p className={styles.status}>В базе нет районов или метрик — выполните сидер бэкенда.</p>
  return <CityScreen city={data.data.city} actions={data.data.actions} routes={data.data.routes} />
}
