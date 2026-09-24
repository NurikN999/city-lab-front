import { formatMoney, levelOf } from '../../../shared/lib/format'
import type { Action, BusRoute, District, Metric } from '../../../shared/lib/schemas'
import type { Draft } from '../scenario'
import styles from './Panels.module.css'

type DistrictPanelProps = {
  district: District
  metrics: Metric[]
  actions: Action[]
  routes: BusRoute[]
  draft: Draft
  onToggle: (action: Action) => void
  onChooseRoute: (routeId: number) => void
  onClose: () => void
}

export function DistrictPanel({ district, metrics, actions, routes, draft, onToggle, onChooseRoute, onClose }: DistrictPanelProps) {
  const servingRoutes = routes.filter((r) => r.district_ids.includes(district.id))
  const available = actions.filter((a) => a.scope === 'district' || servingRoutes.length > 0)
  const routeActionOn = actions.some((a) => a.scope === 'route' && draft.actionIds.includes(a.id))

  return (
    <section className={styles.panel} aria-labelledby="district-title">
      <div className={styles.rowHead}>
        <div>
          <h2 id="district-title" className={styles.title}>{district.name}</h2>
          <p className={styles.hint}>Население: {district.population.toLocaleString('ru-RU')} · метрики — демо</p>
        </div>
        <button type="button" className={styles.remove} aria-label="Закрыть район" onClick={onClose}>×</button>
      </div>

      <dl className={styles.metricGrid}>
        {metrics.flatMap((metric) => {
          const value = district.values[metric.key]
          if (value === undefined) return []
          const level = levelOf(value, metric)
          return [
            <div key={metric.key} className={`${styles.metricCell} ${styles[`${level}Soft`]}`}>
              <dt>{metric.name}</dt>
              <dd className={styles[`${level}Text`]}>{Math.round(value)}</dd>
            </div>,
          ]
        })}
      </dl>

      <h3 className={styles.title}>Действия</h3>
      <ul className={styles.actionList}>
        {available.map((action) => {
          const isOn = draft.actionIds.includes(action.id)
          return (
            <li key={action.id} className={styles.actionRow}>
              <span>
                <strong>{action.name}</strong>
                <span className={styles.hint}> · {action.sphere.name} · {formatMoney(action.cost)}</span>
              </span>
              <button type="button" className={styles.toggle} aria-pressed={isOn} onClick={() => onToggle(action)}>
                {isOn ? 'В сценарии' : '+ Добавить'}
              </button>
            </li>
          )
        })}
      </ul>

      {routeActionOn && (
        <fieldset className={styles.routes}>
          <legend>Вариант маршрута</legend>
          {servingRoutes.map((route) => (
            <label key={route.id} className={styles.routeOption}>
              <input type="radio" name="route" value={route.id} checked={draft.routeId === route.id} onChange={() => onChooseRoute(route.id)} />
              {route.name} · {route.stops.length} ост.
            </label>
          ))}
        </fieldset>
      )}
    </section>
  )
}
