import { useActionState, useState } from 'react'
import { useFetch } from '../../shared/hooks/useFetch'
import { ApiError } from '../../shared/lib/api'
import { cityResponseSchema, complaintCategorySchema, type ComplaintCategory } from '../../shared/lib/schemas'
import { sendComplaint } from './api'
import { CATEGORY_LABELS } from './feed'
import styles from './Complaints.module.css'

const MAX_TEXT = 280

export default function ReportPage() {
  const city = useFetch('/city', cityResponseSchema)
  const [districtId, setDistrictId] = useState('')
  const [category, setCategory] = useState<ComplaintCategory>('other')
  const [text, setText] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)

  const districts = city.status === 'success'
    ? [...city.data.districts].sort((a, b) => a.name.localeCompare(b.name, 'ru', { numeric: true }))
    : []

  const [error, submit, isPending] = useActionState(async () => {
    try {
      const sent = await sendComplaint({ district_id: Number(districtId), category, text: text.trim() })
      setSentTo(districts.find((d) => d.id === sent.district_id)?.name ?? 'район')
      setText('')
      return null
    } catch (e) {
      return e instanceof ApiError ? e.message : 'Не удалось отправить жалобу.'
    }
  }, null)

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Сообщить о проблеме</h1>
        <p className={styles.pageHint}>Жалоба анонимная и сразу появляется на карте города — акимат видит её в реальном времени.</p>
      </header>

      {sentTo && (
        <p role="status" className={styles.success}>
          Жалоба отправлена — {sentTo} уже горит на карте. <a href="#/">Открыть карту</a>
        </p>
      )}

      {city.status === 'loading' && <p className={styles.pageHint}>Загружаем районы…</p>}
      {city.status === 'error' && <p role="alert" className={styles.error}>{city.error}</p>}
      {city.status === 'success' && (
        <form action={submit} className={styles.form}>
          <label className={styles.field}>
            Район
            <select value={districtId} onChange={(event) => setDistrictId(event.target.value)} required>
              <option value="" disabled>Выберите район…</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>

          <fieldset className={styles.categories}>
            <legend>Категория</legend>
            {complaintCategorySchema.options.map((key) => (
              <label key={key} className={styles.category}>
                <input type="radio" name="category" value={key} checked={category === key} onChange={() => setCategory(key)} />
                {CATEGORY_LABELS[key]}
              </label>
            ))}
          </fieldset>

          <div className={styles.field}>
            <label htmlFor="complaint-text">Что случилось</label>
            <textarea id="complaint-text" value={text} onChange={(event) => setText(event.target.value)} rows={4} minLength={5} maxLength={MAX_TEXT} required aria-describedby="complaint-count" />
            <span id="complaint-count" className={styles.counter}>{text.length}/{MAX_TEXT}</span>
          </div>

          {error && <p role="alert" className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submit} disabled={isPending}>{isPending ? 'Отправляем…' : 'Отправить жалобу'}</button>
        </form>
      )}
    </div>
  )
}
