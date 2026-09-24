import { useActionState } from 'react'
import { ApiError } from '../../../shared/lib/api'
import { formatMoney } from '../../../shared/lib/format'
import type { Action, BusRoute, ScenarioWithResult } from '../../../shared/lib/schemas'
import { createScenario } from '../api'
import { draftCost, draftItems, draftName, type Draft } from '../scenario'
import styles from './Panels.module.css'

type ScenarioTrayProps = {
  draft: Draft
  actions: Action[]
  routes: BusRoute[]
  budget: number
  onRemove: (action: Action) => void
  onSimulated: (data: ScenarioWithResult) => void
}

export function ScenarioTray({ draft, actions, routes, budget, onRemove, onSimulated }: ScenarioTrayProps) {
  const cost = draftCost(draft, actions)
  const items = draftItems(draft, actions)
  const isOver = cost > budget
  const chosen = draft.actionIds.flatMap((id) => actions.filter((a) => a.id === id))

  const [error, simulate, isPending] = useActionState(async () => {
    try {
      onSimulated(await createScenario({ name: draftName(draft, actions, routes), district_id: draft.districtId, items }))
      return null
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Не удалось запустить симуляцию.'
    }
  }, null)

  return (
    <form action={simulate} className={`${styles.panel} ${styles.tray}`} aria-label="Сценарий">
      <div className={styles.trayBody}>
        <h2 className={styles.title}>Сценарий</h2>
        {chosen.length === 0 && <p className={styles.hint}>Добавьте действия в панели района.</p>}
        <ul className={styles.trayChips}>
          {chosen.map((action) => (
            <li key={action.id} className={styles.trayChip}>
              {action.scope === 'route' ? (routes.find((r) => r.id === draft.routeId)?.name ?? action.name) : action.name} · {formatMoney(action.cost)}
              <button type="button" className={styles.remove} aria-label={`Убрать «${action.name}»`} onClick={() => onRemove(action)}>×</button>
            </li>
          ))}
        </ul>
        <label className={styles.budget}>
          <span>{isOver ? `Превышение на ${formatMoney(cost - budget)}` : `${formatMoney(cost)} из ${formatMoney(budget)}`}</span>
          <meter min={0} max={budget} high={budget} value={Math.min(cost, budget)} />
        </label>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </div>
      <button type="submit" className={styles.simulate} disabled={isOver || items.length === 0 || isPending}>
        {isPending ? 'Считаем…' : 'SIMULATE'}
      </button>
    </form>
  )
}
