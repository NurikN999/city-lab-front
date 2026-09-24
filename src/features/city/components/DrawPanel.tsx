import { useActionState, useState } from 'react'
import { ApiError } from '../../../shared/lib/api'
import type { BusRoute, LatLng } from '../../../shared/lib/schemas'
import { saveRoute } from '../api'
import { canSave, MAX_POINTS, pathLengthKm, type PreviewState } from '../drawing'
import styles from './Panels.module.css'

type DrawPanelProps = {
  districtName: string
  points: LatLng[]
  preview: PreviewState
  onUndo: () => void
  onCancel: () => void
  onSaved: (route: BusRoute) => void
}

export function DrawPanel({ districtName, points, preview, onUndo, onCancel, onSaved }: DrawPanelProps) {
  const [name, setName] = useState(`Маршрут · ${districtName}`)

  const [error, save, isPending] = useActionState(async () => {
    try {
      onSaved(await saveRoute(name.trim(), points))
      return null
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Не удалось сохранить маршрут.'
    }
  }, null)

  return (
    <form action={save} className={styles.panel} aria-labelledby="draw-title">
      <div className={styles.rowHead}>
        <h2 id="draw-title" className={styles.title}>Новый маршрут</h2>
        <button type="button" className={styles.remove} aria-label="Выйти из рисования" onClick={onCancel}>×</button>
      </div>
      <p className={styles.hint}>Кликайте по карте: каждая точка — остановка, линия пойдёт по дорогам.</p>

      <dl className={styles.kpis}>
        <div className={styles.rowHead}><dt>Остановок</dt><dd>{points.length}</dd></div>
        <div className={styles.rowHead}>
          <dt>Длина</dt>
          <dd>{preview.status === 'ready' ? `${pathLengthKm(preview.data.path.coordinates).toFixed(1)} км` : '—'}</dd>
        </div>
      </dl>
      {points.length >= MAX_POINTS && <p className={styles.hint}>Максимум {MAX_POINTS} остановок.</p>}
      {preview.status === 'loading' && <p className={styles.hint}>Строим путь по дорогам…</p>}
      {preview.status === 'ready' && !preview.data.snapped && (
        <p className={styles.error}>Линия прямая — роутинг по дорогам сейчас недоступен.</p>
      )}
      {preview.status === 'error' && <p className={styles.error}>{preview.error}</p>}

      <label className={styles.field}>
        Название
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required />
      </label>
      {error && <p role="alert" className={styles.error}>{error}</p>}

      <div className={styles.actions3}>
        <button type="button" className={styles.toggle} onClick={onUndo} disabled={points.length === 0}>Отменить точку</button>
        <button type="submit" className={styles.primaryButton} disabled={!canSave(points, name) || isPending}>
          {isPending ? 'Сохраняем…' : 'Сохранить'}
        </button>
        <button type="button" className={styles.toggle} onClick={onCancel}>Выйти</button>
      </div>
    </form>
  )
}
