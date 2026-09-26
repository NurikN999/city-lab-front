import { useMemo, useState } from 'react'
import { DEFAULT_BUDGET } from '../../shared/lib/format'
import type { Action, BusRoute, CityResponse, LatLng, MetricValues } from '../../shared/lib/schemas'
import { AiBar } from './components/AiBar'
import { AiResults } from './components/AiResults'
import { CityKpiPanel } from './components/CityKpiPanel'
import { CityMap } from './components/CityMap'
import { DistrictPanel } from './components/DistrictPanel'
import { DrawPanel } from './components/DrawPanel'
import { FloatingPanel } from './components/FloatingPanel'
import { Legend } from './components/Legend'
import { LayerSwitch } from './components/LayerSwitch'
import { MyScenarios } from './components/MyScenarios'
import { ProblemsPanel } from './components/ProblemsPanel'
import { ResultPanel } from './components/ResultPanel'
import { ScenarioTray } from './components/ScenarioTray'
import type { RouteLayer } from './geo'
import { useMediaQuery } from '../../shared/hooks/useMediaQuery'
import { setComplaintStatus } from '../complaints/api'
import { ComplaintToasts } from '../complaints/ComplaintToasts'
import { DistrictComplaints } from '../complaints/DistrictComplaints'
import { alertsByDistrict } from '../complaints/feed'
import { useComplaintFeed } from '../complaints/useComplaintFeed'
import { readToken } from '../model/session'
import { BottomSheet } from './components/BottomSheet'
import { useCityData } from './hooks/useCityData'
import { useRouteDrawing } from './hooks/useRouteDrawing'
import { LAYERS, type LayerSphere } from './layers'
import styles from './CityPage.module.css'
import { valuesById } from './rank'
import type { Snap } from './sheet'
import { useTweenedValues } from './tween'
import { chooseRoute, emptyDraft, toggleAction, withRoute, type Draft } from './scenario'
import { afterAiPlan, afterSimulation, type View } from './view'


const MOBILE = '(max-width: 63.99rem)'
const DEFAULT_SNAP: Record<View['mode'], Snap> = { explore: 'peek', district: 'half', result: 'half', ai: 'full', draw: 'peek' }
type ExploreTab = 'problems' | 'mine' | 'city'
const EXPLORE_TABS: [ExploreTab, string][] = [['problems', 'Проблемы'], ['mine', 'Сценарии'], ['city', 'Город']]

type CityScreenProps = { city: CityResponse; actions: Action[]; routes: BusRoute[] }

function CityScreen({ city, actions, routes: loadedRoutes }: CityScreenProps) {
  const [sphere, setSphere] = useState<LayerSphere>('transport')
  const [view, setView] = useState<View>({ mode: 'explore' })
  const isMobile = useMediaQuery(MOBILE)
  const feed = useComplaintFeed()
  const alerts = useMemo(() => alertsByDistrict(feed.complaints), [feed.complaints])
  const [tab, setTab] = useState<ExploreTab>('problems')
  // Положение шторки задаёт режим; ручная правка действует, пока режим не сменился
  const [sheet, setSheet] = useState<{ mode: View['mode']; snap: Snap }>({ mode: 'explore', snap: 'peek' })
  const snap = sheet.mode === view.mode ? sheet.snap : DEFAULT_SNAP[view.mode]
  const [draft, setDraft] = useState<Draft | null>(null)
  const [scenariosVersion, setScenariosVersion] = useState(0)
  const [customRoutes, setCustomRoutes] = useState<BusRoute[]>([])
  const drawing = useRouteDrawing()

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

  function startDrawing() {
    if (!draft) return
    drawing.reset()
    setView({ mode: 'draw', districtId: draft.districtId })
  }

  function handleMapClick(point: LatLng) {
    if (view.mode === 'draw') drawing.add(point)
  }

  function leaveDrawing() {
    drawing.stop()
    setView((current) => (current.mode === 'draw' ? { mode: 'district', districtId: current.districtId } : current))
  }

  function handleRouteSaved(route: BusRoute, districtId: number) {
    setCustomRoutes((current) => [...current, route])
    if (routeAction) setDraft((current) => current && withRoute(current, routeAction, route.id, districtId))
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
  const mapValues = useTweenedValues(ghostValues, shownValues)
  const resultRouteId = isResult ? (view.data.scenario.items.find((i) => i.route_id !== null)?.route_id ?? null) : null
  const resultRoute = routes.find((r) => r.id === resultRouteId)
  const coverageStops: LatLng[] = resultRoute ? resultRoute.stops.map(({ lat, lng }) => ({ lat, lng })) : []
  const rightTitle = view.mode === 'draw' ? 'Новый маршрут'
    : view.mode === 'result' ? 'До → После'
    : view.mode === 'ai' ? 'City AI'
    : view.mode === 'district' && district ? district.name
    : 'Актау сейчас'
  const routesOnMap: RouteLayer[] = resultRoute ? [{ route: resultRoute, emphasis: 'selected' }] : mapRoutes

  // Акимат (вошёл на странице «Модель») может закрывать жалобы прямо из панели района
  const token = readToken()
  const moderate = token
    ? (id: number, status: 'resolved' | 'hidden') => { setComplaintStatus(id, status, token).then(feed.refresh).catch(() => {}) }
    : null
  const toasts = view.mode !== 'draw' && (
    <ComplaintToasts
      items={feed.fresh}
      districtName={(id) => city.districts.find((d) => d.id === id)?.name ?? 'район'}
      onOpen={selectDistrict}
      onDismiss={feed.dismiss}
    />
  )

  const map = (
    <CityMap
      districts={city.districts}
      metric={metric}
      values={mapValues}
      ghostValues={ghostValues}
      selectedId={selectedId}
      routes={routesOnMap}
      coverageStops={coverageStops}
      animateBuses={isResult}
      onSelectDistrict={selectDistrict}
      drawing={view.mode === 'draw' ? { points: drawing.points, path: drawing.path } : null}
      onMapClick={handleMapClick}
      sheetSnap={isMobile ? snap : undefined}
      alerts={alerts}
    />
  )

  const sidePanel = view.mode === 'draw' && district ? (
    <DrawPanel
      districtName={district.name}
      points={drawing.points}
      preview={drawing.preview}
      onUndo={drawing.undo}
      onCancel={leaveDrawing}
      onSaved={(route) => handleRouteSaved(route, view.districtId)}
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
    >
      <DistrictComplaints complaints={feed.complaints.filter((c) => c.district_id === district.id)} onStatus={moderate} />
    </DistrictPanel>
  ) : null

  const tray = view.mode === 'district' && draft ? (
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
  ) : null

  const aiBar = <AiBar onResult={(data) => { setView((current) => afterAiPlan(current, data)); setScenariosVersion((v) => v + 1) }} />
  const aiResults = view.mode === 'ai' ? <AiResults data={view.data} metrics={city.metrics} onClose={() => setView({ mode: 'explore' })} /> : null
  const problems = <ProblemsPanel districts={city.districts} values={baseValues} metric={metric} onSelect={selectDistrict} />
  const mine = <MyScenarios reloadKey={scenariosVersion} />
  const kpi = <CityKpiPanel metrics={city.metrics} city={city.city} />

  if (isMobile) {
    return (
      <div className={styles.mobile}>
        {map}
        {toasts}
        {view.mode !== 'draw' && <div className={styles.mobileTop}><LayerSwitch active={sphere} onChange={setSphere} /></div>}
        {view.mode !== 'draw' && <div className={styles.mobileLegend}><Legend metric={metric} compact /></div>}
        <BottomSheet snap={snap} onSnapChange={(next) => setSheet({ mode: view.mode, snap: next })} label={rightTitle} footer={tray} resetKey={view.mode}>
          {aiResults ?? sidePanel ?? (
            <div className={styles.explore}>
              {aiBar}
              <div role="tablist" aria-label="Разделы города" className={styles.tabs}>
                {EXPLORE_TABS.map(([key, label]) => (
                  <button key={key} type="button" role="tab" aria-selected={tab === key} className={styles.tab} onClick={() => { setTab(key); setSheet({ mode: view.mode, snap: 'half' }) }}>
                    {label}
                  </button>
                ))}
              </div>
              <div role="tabpanel">{tab === 'problems' ? problems : tab === 'mine' ? mine : kpi}</div>
            </div>
          )}
        </BottomSheet>
      </div>
    )
  }

  return (
    <div className={`${styles.screen} ${view.mode === 'draw' ? styles.drawing : ''}`}>
      {map}
      {toasts}
      {view.mode !== 'draw' && <div className={styles.top}><LayerSwitch active={sphere} onChange={setSphere} /></div>}
      {view.mode !== 'draw' && (
        // Во время рисования список районов скрыт: выбор другого района стёр бы точки
        <FloatingPanel className={styles.left} title="Проблемы города">
          <div className={styles.stack}>
            {problems}
            {mine}
          </div>
        </FloatingPanel>
      )}
      <FloatingPanel className={styles.right} title={rightTitle}>
        {sidePanel ?? kpi}
      </FloatingPanel>
      {tray && <div className={styles.bottom}>{tray}</div>}
      {view.mode !== 'district' && view.mode !== 'draw' && <div className={styles.bottom}>{aiBar}</div>}
      {aiResults && <div className={styles.overlay}>{aiResults}</div>}
      {view.mode !== 'draw' && <FloatingPanel className={styles.bottomLeft} title="Легенда"><Legend metric={metric} /></FloatingPanel>}
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
