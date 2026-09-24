import { useState } from 'react'
import type { Action, BusRoute, CityResponse } from '../../shared/lib/schemas'
import { CityKpiPanel } from './components/CityKpiPanel'
import { CityMap } from './components/CityMap'
import { Legend } from './components/Legend'
import { LayerSwitch } from './components/LayerSwitch'
import { ProblemsPanel } from './components/ProblemsPanel'
import { useCityData } from './hooks/useCityData'
import { LAYERS, type LayerSphere } from './layers'
import styles from './CityPage.module.css'
import { valuesById } from './rank'

type View = { mode: 'explore' } | { mode: 'district'; districtId: number }

type CityScreenProps = { city: CityResponse; actions: Action[]; routes: BusRoute[] }

function CityScreen({ city }: CityScreenProps) {
  const [sphere, setSphere] = useState<LayerSphere>('transport')
  const [view, setView] = useState<View>({ mode: 'explore' })

  const layer = LAYERS.find((l) => l.sphere === sphere) ?? LAYERS[0]
  const metric = city.metrics.find((m) => m.key === layer.metric) ?? city.metrics[0]
  const baseValues = valuesById(city.districts)
  const selectedId = view.mode === 'explore' ? null : view.districtId

  return (
    <div className={styles.screen}>
      <CityMap
        districts={city.districts}
        metric={metric}
        values={baseValues}
        ghostValues={null}
        selectedId={selectedId}
        routes={[]}
        coverageStops={[]}
        animateBuses={false}
        onSelectDistrict={(id) => setView({ mode: 'district', districtId: id })}
      />
      <div className={styles.top}><LayerSwitch active={sphere} onChange={setSphere} /></div>
      <div className={styles.left}>
        <ProblemsPanel districts={city.districts} values={baseValues} metric={metric} onSelect={(id) => setView({ mode: 'district', districtId: id })} />
      </div>
      <div className={styles.right}><CityKpiPanel metrics={city.metrics} city={city.city} /></div>
      <div className={styles.bottomLeft}><Legend metric={metric} /></div>
    </div>
  )
}

export default function CityPage() {
  const data = useCityData()

  if (data.status === 'loading') return <p className={styles.status}>Загружаем город…</p>
  if (data.status === 'error') return <p className={styles.status} role="alert">Не удалось загрузить город: {data.error}</p>
  if (data.data.city.districts.length === 0) return <p className={styles.status}>В базе нет районов — выполните сидер бэкенда.</p>
  return <CityScreen city={data.data.city} actions={data.data.actions} routes={data.data.routes} />
}
