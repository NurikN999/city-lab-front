import { useActionState, useState } from 'react'
import { ApiError } from '../../shared/lib/api'
import { formatMoney } from '../../shared/lib/format'
import type { Action } from '../../shared/lib/schemas'
import { updateAction } from './api'
import styles from './ModelPage.module.css'

type ActionRowProps = { action: Action; token: string; onSaved: () => void; onUnauthorized: () => void }

export function ActionRow({ action, token, onSaved, onUnauthorized }: ActionRowProps) {
  const [isEditing, setIsEditing] = useState(false)

  const [error, save, isPending] = useActionState(async (_: string | null, form: FormData) => {
    const body = {
      cost: Math.round(Number(form.get('cost')) * 1_000_000),
      effects: action.effects.map((effect, i) => ({
        metric: effect.metric,
        delta_pct: Number(form.get(`delta-${i}`)),
        spill: Number(form.get(`spill-${i}`)),
      })),
    }
    try {
      await updateAction(action.id, body, token)
      setIsEditing(false)
      onSaved()
      return null
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        onUnauthorized()
        return null
      }
      return e instanceof ApiError ? e.message : 'Не удалось сохранить.'
    }
  }, null)

  if (!isEditing) {
    return (
      <tr>
        <th scope="row">{action.name}</th>
        <td>{action.sphere.name}</td>
        <td>{formatMoney(action.cost)}</td>
        <td>{action.effects.length === 0 ? 'Покрытие ОТ — расчёт по остановкам' : action.effects.map((e) => `${e.metric} ${e.delta_pct > 0 ? '+' : ''}${e.delta_pct}%`).join(' · ')}</td>
        <td>
          <button type="button" className={styles.secondary} aria-label={`Изменить «${action.name}»`} onClick={() => setIsEditing(true)}>Изменить</button>
        </td>
      </tr>
    )
  }

  return (
    <tr className={styles.editing}>
      <th scope="row">{action.name}</th>
      <td colSpan={4}>
        <form action={save} className={styles.editForm}>
          <label className={styles.field}>
            Стоимость, млн ₸
            <input name="cost" type="number" min={0} step={1} defaultValue={action.cost / 1_000_000} required />
          </label>
          {action.effects.map((effect, i) => (
            <fieldset key={effect.metric} className={styles.effect}>
              <legend>{effect.metric}</legend>
              <label className={styles.field}>
                {effect.metric}, %
                <input name={`delta-${i}`} type="number" min={-100} max={100} step={0.5} defaultValue={effect.delta_pct} required />
              </label>
              <label className={styles.field}>
                Соседям
                <input name={`spill-${i}`} type="number" min={0} max={1} step={0.1} defaultValue={effect.spill} required />
              </label>
            </fieldset>
          ))}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.buttons}>
            <button type="submit" className={styles.primary} disabled={isPending}>{isPending ? 'Сохраняем…' : 'Сохранить'}</button>
            <button type="button" className={styles.secondary} onClick={() => setIsEditing(false)}>Отменить</button>
          </div>
        </form>
      </td>
    </tr>
  )
}
