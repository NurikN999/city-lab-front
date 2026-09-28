import { useMemo, useRef, useState } from 'react'
import { DEFAULT_BUDGET } from '../../shared/lib/format'
import type { Action, BusRoute, CityResponse, Complaint, LatLng, MetricValues } from '../../shared/lib/schemas'
import { createScenario } from './api'
import { buildItems, districtAt, isObject, placementProblems, roadLabel, type Placement } from './build'
import { AiBar } from './components/AiBar'
import { AiResults } from './components/AiResults'
import { CityKpiPanel } from './components/CityKpiPanel'
import { CityMap, type MapHit } from './components/CityMap'
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
import { alertsByDistrict, suggestedObject } from '../complaints/feed'
import { useComplaintFeed } from '../complaints/useComplaintFeed'
import { readToken } from '../model/session'
import { BottomSheet } from './components/BottomSheet'
import { BuildPanel } from './components/BuildPanel'
import { useBuildPreview } from './hooks/useBuildPreview'
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
const DEFAULT_SNAP: Record<View['mode'], Snap> = { explore: 'peek', district: 'half', result: 'half', ai: 'full', draw: 'peek', build: 'half' }
type ExploreTab = 'problems' | 'mine' | 'city'
const EXPLORE_TABS: [ExploreTab, string][] = [['problems', 'Проблемы'], ['mine', 'Сценарии'], ['city', 'Город']]

type CityScreenProps = { city: CityResponse; actions: Action[]; routes: BusRoute[] }

function CityScreen({ city, actions, routes: loadedRoutes }: CityScreenProps) {
  const [sphere, setSphere] = useState<LayerSphere>('transport')
  const [view, setView] = useState<View>({ mode: 'explore' })
  const isMobile = useMediaQuery(MOBILE)
  const feed = useComplaintFeed()
  const alerts = useMemo(() => alertsByDistrict(feed.complaints), [feed.complaints])
  // Конструктор: объекты на карте, выбранный инструмент палитры и живой пересчёт
  const [placements, setPlacements] = useState<Placement[]>([])
  const [tool, setTool] = useState<number | null>(null)
  const [solving, setSolving] = useState<Complaint | null>(null) // жалоба, которую решаем в конструкторе
  const nextUid = useRef(1)
  const objects = actions.filter((a) => a.scope === 'point' || a.scope === 'line' || a.scope === 'building')
  const placeProblems = useMemo(() => placementProblems(placements, city.districts), [placements, city.districts])
  // Стабильные списки для карты: иначе она перерисовывала бы улицы и фильтр зданий на каждый кадр
  const edits = useMemo(() => ({
    roads: placements.flatMap((p) => (p.kind === 'road' ? [{ uid: p.uid, lines: p.lines }] : [])),
    demolished: placements.flatMap((p) => (p.kind === 'demolish' ? [{ osmId: p.osmId, footprint: p.footprint }] : [])),
  }), [placements])
  const preview = useBuildPreview(view.mode === 'build' ? buildItems(placements) : [])
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
  const selectedId = view.mode === 'build' ? solving?.district_id ?? null : view.mode === 'explore' || view.mode === 'ai' ? null : view.districtId
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

  function handleMapClick(point: LatLng, hit: MapHit) {
    const action = view.mode === 'build' ? objects.find((o) => o.id === tool) : undefined
    if (action) {
      const uid = nextUid.current++
      const { road, building } = hit
      if (action.scope === 'line') {
        // Улица: повторный клик по той же улице отменяет расширение
        if (road) {
          setPlacements((current) => (current.some((p) => p.kind === 'road' && p.osmId === road.osmId)
            ? current.filter((p) => !(p.kind === 'road' && p.osmId === road.osmId))
            : [...current, { kind: 'road', uid, actionId: action.id, osmId: road.osmId, label: roadLabel(road.cls), lines: road.lines }]))
        }
      } else if (action.scope === 'building') {
        if (building) {
          setPlacements((current) => (current.some((p) => p.kind === 'demolish' && p.osmId === building.osmId)
            ? current.filter((p) => !(p.kind === 'demolish' && p.osmId === building.osmId))
            : [...current, { kind: 'demolish', uid, actionId: action.id, osmId: building.osmId, lat: building.lat, lng: building.lng, footprint: building.footprint }]))
        }
      } else {
        setPlacements((current) => [...current, { uid, actionId: action.id, ...point, onBuilding: hit.onBuilding }])
      }
    }
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
  const buildResult = view.mode === 'build' ? preview.result : null
  const shownValues: Record<string, MetricValues> = isResult ? view.data.result.after.districts : buildResult ? buildResult.after.districts : baseValues
  const ghostValues = isResult ? view.data.result.before.districts : buildResult ? buildResult.before.districts : null
  // Анимация «до → после» — только для SIMULATE: в конструкторе значения меняются на ходу
  const mapValues = useTweenedValues(isResult ? ghostValues : null, shownValues)

  function solveInBuilder(complaint: Complaint) {
    const key = suggestedObject(complaint.category)
    setPlacements([])
    setTool(objects.find((o) => o.key === key)?.id ?? null)
    setSolving(complaint)
    setView({ mode: 'build' })
  }

  function leaveBuild() {
    setPlacements([])
    setTool(null)
    setSolving(null)
    setView({ mode: 'explore' })
  }

  async function saveBuild(name: string) {
    // Район сценария — по первой правке; у дороги — по её первой точке
    const first = placements[0]
    const anchor = first && (first.kind === 'road' ? { lng: first.lines[0][0][0], lat: first.lines[0][0][1] } : first)
    const home = anchor && districtAt(city.districts, anchor)
    if (!home) return
    const data = await createScenario({ name, district_id: home.id, items: buildItems(placements), complaint_ids: solving ? [solving.id] : undefined })
    setScenariosVersion((v) => v + 1)
    setSolving(null)
    feed.refresh() // жалоба стала «принята» — обновляем ленту сразу
    setPlacements([])
    setTool(null)
    setView({ mode: 'result', districtId: home.id, data })
  }

  const buildButton = view.mode !== 'build' && view.mode !== 'draw' && (
    <button type="button" className={styles.buildButton} onClick={() => setView({ mode: 'build' })}>Конструктор</button>
  )
  const resultRouteId = isResult ? (view.data.scenario.items.find((i) => i.route_id !== null)?.route_id ?? null) : null
  const resultRoute = routes.find((r) => r.id === resultRouteId)
  const coverageStops: LatLng[] = resultRoute ? resultRoute.stops.map(({ lat, lng }) => ({ lat, lng })) : []
  const rightTitle = view.mode === 'draw' ? 'Новый маршрут'
    : view.mode === 'result' ? 'До → После'
    : view.mode === 'ai' ? 'City AI'
    : view.mode === 'build' ? 'Конструктор'
    : view.mode === 'district' && district ? district.name
    : 'Актау сейчас'
  const routesOnMap: RouteLayer[] = resultRoute ? [{ route: resultRoute, emphasis: 'selected' }] : mapRoutes

  // Акимат (вошёл на странице «Модель») может закрывать жалобы прямо из панели района
  const token = readToken()
  const moderate = token
    ? (id: number, status: 'resolved' | 'hidden') => { setComplaintStatus(id, status, token).then(feed.refresh).catch(() => {}) }
    : null
  const toasts = view.mode !== 'draw' && view.mode !== 'build' && (
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
      building={view.mode === 'build' ? {
        markers: placements.filter(isObject).map((p) => {
          const object = objects.find((o) => o.id === p.actionId)
          const name = object?.name ?? 'Объект'
          return { uid: p.uid, lat: p.lat, lng: p.lng, radiusM: object?.radius_m ?? 0, label: name.charAt(0), name, kind: object?.key ?? '', invalid: placeProblems.has(p.uid) }
        }),
        onMove: (uid, point, onBuilding) => setPlacements((current) => current.map((p) => (p.uid === uid && isObject(p) ? { ...p, ...point, onBuilding } : p))),
        roads: edits.roads,
        demolished: edits.demolished,
      } : null}
    />
  )

  const sidePanel = view.mode === 'build' ? (
    <BuildPanel
      objects={objects}
      metrics={city.metrics}
      districts={city.districts}
      placements={placements}
      problems={placeProblems}
      tool={tool}
      result={preview.result}
      error={preview.error}
      onTool={setTool}
      onRemove={(uid) => setPlacements((current) => current.filter((p) => p.uid !== uid))}
      onSave={saveBuild}
      onExit={leaveBuild}
      complaint={solving ? { text: solving.text, district: city.districts.find((d) => d.id === solving.district_id)?.name ?? 'район' } : null}
      onDropComplaint={() => setSolving(null)}
    />
  ) : view.mode === 'draw' && district ? (
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
      <DistrictComplaints complaints={feed.complaints.filter((c) => c.district_id === district.id)} onStatus={moderate} onSolve={solveInBuilder} />
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
              {buildButton}
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
      {view.mode !== 'draw' && <div className={`${styles.top} ${styles.topRow}`}><LayerSwitch active={sphere} onChange={setSphere} />{buildButton}</div>}
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
      {view.mode !== 'district' && view.mode !== 'draw' && view.mode !== 'build' && <div className={styles.bottom}>{aiBar}</div>}
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
