import { useActionState, useState, type ChangeEvent } from 'react'
import { ApiError } from '../../shared/lib/api'
import type { District, DistrictUpdate, Metric } from '../../shared/lib/schemas'
import { updateDistrict } from './api'
import styles from './ModelPage.module.css'

type DistrictEditorProps = {
  districts: District[]
  metrics: Metric[]
  token: string
  onSaved: () => void
  onUnauthorized: () => void
}

export function DistrictEditor({ districts, metrics, token, onSaved, onUnauthorized }: DistrictEditorProps) {
  const sorted = [...districts].sort((a, b) => a.name.localeCompare(b.name, 'ru', { numeric: true }))
  const [districtId, setDistrictId] = useState(sorted[0]?.id)
  // Сохранённое держим локально: страница не перезагружает город, и выбранный район не сбрасывается
  const [saved, setSaved] = useState<Record<number, DistrictUpdate>>({})
  const found = sorted.find((d) => d.id === districtId)
  const update = found && saved[found.id]
  const district = found && update ? { ...found, population: update.population, values: { ...found.values, ...update.values } } : found

  return (
    <div className={styles.editForm}>
      <label className={styles.field}>
        Район
        <select value={districtId} onChange={(event) => setDistrictId(Number(event.target.value))}>
          {sorted.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
      {district && (
        <DistrictForm
          key={district.id}
          district={district}
          metrics={metrics.filter((m) => !m.is_computed)}
          token={token}
          onSaved={(result) => {
            setSaved((current) => ({ ...current, [result.id]: result }))
            onSaved()
          }}
          onUnauthorized={onUnauthorized}
        />
      )}
    </div>
  )
}

type DistrictFormProps = Omit<DistrictEditorProps, 'districts' | 'onSaved'> & { district: District; onSaved: (result: DistrictUpdate) => void }

function DistrictForm({ district, metrics, token, onSaved, onUnauthorized }: DistrictFormProps) {
  // Контролируемые поля: при ошибке сервера правки не откатываются
  const [fields, setFields] = useState<Record<string, string>>(() => Object.fromEntries([
    ['population', String(district.population)],
    ...metrics.map((m) => [m.key, String(district.values[m.key] ?? '')]),
  ]))

  function field(name: string) {
    return { name, value: fields[name] ?? '', onChange: (event: ChangeEvent<HTMLInputElement>) => setFields((f) => ({ ...f, [name]: event.target.value })) }
  }

  const [error, save, isPending] = useActionState(async () => {
    const body = {
      population: Number(fields.population),
      values: Object.fromEntries(metrics.filter((m) => fields[m.key] !== '').map((m) => [m.key, Number(fields[m.key])])),
    }
    try {
      onSaved(await updateDistrict(district.id, body, token))
      return null
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        onUnauthorized()
        return null
      }
      return e instanceof ApiError ? e.message : 'Не удалось сохранить.'
    }
  }, null)

  return (
    <form action={save} className={styles.editForm}>
      <label className={styles.field}>
        Население
        <input {...field('population')} type="number" min={0} step={100} required />
      </label>
      {metrics.map((m) => (
        <label key={m.key} className={styles.field}>
          {m.name}, {m.unit}
          <input {...field(m.key)} type="number" min={m.min} max={m.max} step={0.1} />
        </label>
      ))}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.buttons}>
        <button type="submit" className={styles.primary} disabled={isPending}>{isPending ? 'Сохраняем…' : 'Сохранить район'}</button>
      </div>
    </form>
  )
}
