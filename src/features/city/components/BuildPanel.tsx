import { useActionState, useState } from 'react'
import { ApiError } from '../../../shared/lib/api'
import { deltaRows } from '../../../shared/lib/deltas'
import { DEFAULT_BUDGET, formatDelta, formatMoney } from '../../../shared/lib/format'
import type { Action, District, Metric, SimulationResult } from '../../../shared/lib/schemas'
import { buildCost, buildName, districtAt, topDistrictChanges, type Placement } from '../build'
import styles from './Panels.module.css'
import build from './Build.module.css'

type BuildPanelProps = {
  objects: Action[] // только scope = point
  metrics: Metric[]
  districts: District[]
  placements: Placement[]
  problems: Map<number, string>
  tool: number | null
  result: SimulationResult | null
  error: string | null
  onTool: (actionId: number | null) => void
  onRemove: (uid: number) => void
  onSave: (name: string) => Promise<void>
  onExit: () => void
  complaint?: { text: string; district: string } | null // жалоба, которую решаем этим сценарием
  onDropComplaint?: () => void
}

export function BuildPanel(props: BuildPanelProps) {
  const { objects, metrics, districts, placements, problems, tool, result, error, onTool, onRemove, onSave, onExit, complaint, onDropComplaint } = props
  const cost = buildCost(placements, objects)
  const suggested = placements.length > 0 ? buildName(placements, objects) : ''
  // Своё название, пока пользователь его не менял, следует за набором объектов
  const [customName, setCustomName] = useState<string | null>(null)
  const name = customName ?? suggested
  const toolName = objects.find((o) => o.id === tool)?.name

  const [saveError, save, isSaving] = useActionState(async () => {
    try {
      await onSave(name.trim())
      setCustomName(null)
      return null
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Не удалось сохранить сценарий.'
    }
  }, null)

  const cityRows = result ? deltaRows(result, metrics, null).filter((row) => row.delta !== 0) : []
  const top = result ? topDistrictChanges(result, metrics, districts) : []
  const canSave = placements.length > 0 && problems.size === 0 && cost <= DEFAULT_BUDGET && name.trim() !== ''

  return (
    <section className={styles.panel} aria-labelledby="build-title">
      <div className={styles.rowHead}>
        <h2 id="build-title" className={styles.title}>Конструктор</h2>
        <button type="button" className={styles.remove} aria-label="Выйти из конструктора" onClick={onExit}>×</button>
      </div>
      {complaint && (
        <div className={build.complaint}>
          <p>Решаем жалобу · {complaint.district}: «{complaint.text}»</p>
          <button type="button" className={styles.remove} aria-label="Не привязывать к жалобе" onClick={onDropComplaint}>×</button>
        </div>
      )}
      <p className={styles.hint}>
        {toolName ? `Кликните по карте, чтобы поставить «${toolName}».` : 'Выберите объект и кликните по карте. Поставленные объекты можно перетаскивать.'}
      </p>

      <ul className={build.palette}>
        {objects.map((o) => (
          <li key={o.id}>
            <button type="button" className={build.object} aria-pressed={tool === o.id} onClick={() => onTool(tool === o.id ? null : o.id)}>
              <span className={build.objectName}>{o.name}</span>
              <span className={build.objectMeta}>{formatMoney(o.cost)} · {o.radius_m ?? 0} м</span>
            </button>
          </li>
        ))}
      </ul>

      {placements.length > 0 && (
        <ul className={build.placed} aria-label="Поставленные объекты">
          {placements.map((p) => {
            const object = objects.find((o) => o.id === p.actionId)
            const problem = problems.get(p.uid)
            return (
              <li key={p.uid} className={build.placedRow}>
                <span>
                  <strong>{object?.name}</strong> · {districtAt(districts, p)?.name ?? 'вне районов'}
                  {problem && <span className={build.problem}>{problem}</span>}
                </span>
                <button type="button" className={styles.remove} aria-label={`Убрать «${object?.name}»`} onClick={() => onRemove(p.uid)}>×</button>
              </li>
            )
          })}
        </ul>
      )}

      <p className={cost > DEFAULT_BUDGET ? styles.error : styles.hint}>
        {formatMoney(cost)} из {formatMoney(DEFAULT_BUDGET)}{cost > DEFAULT_BUDGET && ' — бюджет превышен'}
      </p>

      {error && <p className={styles.error}>{error}</p>}
      {result && (
        <div className={build.effect} aria-live="polite">
          <h3 className={build.effectTitle}>Эффект по городу</h3>
          {cityRows.length === 0 ? <p className={styles.hint}>Пока без изменений.</p> : (
            <dl className={build.rows}>
              {cityRows.map((row) => (
                <div key={row.metric.key}>
                  <dt>{row.metric.name}</dt>
                  <dd className={row.improved ? styles.deltaGood : styles.deltaBad}>{formatDelta(row.delta)}</dd>
                </div>
              ))}
            </dl>
          )}
          {top.length > 0 && (
            <>
              <h3 className={build.effectTitle}>Сильнее всего изменились</h3>
              <ul className={build.top}>
                {top.map((t) => (
                  <li key={t.district}>{t.district}: {t.metric} <span className={t.improved ? styles.deltaGood : styles.deltaBad}>{formatDelta(t.delta)}</span></li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {placements.length > 0 && (
        <form action={save} className={build.save}>
          <label className={styles.field}>
            Название
            <input value={name} onChange={(event) => setCustomName(event.target.value)} maxLength={120} required />
          </label>
          {saveError && <p role="alert" className={styles.error}>{saveError}</p>}
          <button type="submit" className={styles.primaryButton} disabled={!canSave || isSaving}>
            {isSaving ? 'Сохраняем…' : 'Сохранить сценарий'}
          </button>
        </form>
      )}
    </section>
  )
}
