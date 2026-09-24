import { useState } from 'react'
import { compareHref } from '../../../app/useHashRoute'
import { useFetch } from '../../../shared/hooks/useFetch'
import { formatMoney } from '../../../shared/lib/format'
import { scenariosSchema } from '../../../shared/lib/schemas'
import styles from './Panels.module.css'

const MAX_COMPARE = 3

export function MyScenarios({ reloadKey }: { reloadKey: number }) {
  const scenarios = useFetch('/scenarios', scenariosSchema, reloadKey)
  const [checked, setChecked] = useState<number[]>([])

  function toggle(id: number) {
    setChecked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-MAX_COMPARE)))
  }

  return (
    <section className={styles.panel} aria-labelledby="mine-title">
      <h2 id="mine-title" className={styles.title}>Мои сценарии</h2>
      {scenarios.status === 'loading' && <p className={styles.hint}>Загрузка…</p>}
      {scenarios.status === 'error' && <p role="alert" className={styles.error}>{scenarios.error}</p>}
      {scenarios.status === 'success' && scenarios.data.length === 0 && <p className={styles.hint}>Пока нет сценариев — запустите первый SIMULATE.</p>}
      {scenarios.status === 'success' && scenarios.data.length > 0 && (
        <>
          <ul className={styles.actionList}>
            {scenarios.data.slice(0, 6).map((s) => (
              <li key={s.id}>
                <label className={styles.check}>
                  <input type="checkbox" checked={checked.includes(s.id)} onChange={() => toggle(s.id)} />
                  <span>{s.name}{s.source === 'ai' && <span className={styles.aiTag}> AI</span>}</span>
                  <span className={styles.hint}>{formatMoney(s.cost)}</span>
                </label>
              </li>
            ))}
          </ul>
          {checked.length > 0 ? (
            <a className={styles.primaryLink} href={compareHref(checked)}>Сравнить выбранные ({checked.length})</a>
          ) : (
            <p className={styles.hint}>Отметьте до {MAX_COMPARE} сценариев для сравнения.</p>
          )}
        </>
      )}
    </section>
  )
}
