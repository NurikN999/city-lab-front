import { useState } from 'react'
import { useFetch } from '../../shared/hooks/useFetch'
import { actionsSchema, cityResponseSchema, modelResponseSchema } from '../../shared/lib/schemas'
import { ActionRow } from './ActionRow'
import { DistrictEditor } from './DistrictEditor'
import { LoginForm } from './LoginForm'
import styles from './ModelPage.module.css'
import { clearToken, readToken } from './session'

function ModelEditor({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [version, setVersion] = useState(0)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const actions = useFetch('/actions', actionsSchema, version)
  const model = useFetch('/model', modelResponseSchema)
  const city = useFetch('/city', cityResponseSchema)
  const metricName = (key: string) => (city.status === 'success' ? city.data.metrics.find((m) => m.key === key)?.name : undefined) ?? key
  const markSaved = () => { setVersion((v) => v + 1); setSavedAt(new Date().toLocaleTimeString('ru-RU')) }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Модель симуляции</h1>
          <p className={styles.hint}>Стоимости и коэффициенты открыты. После сохранения все сценарии пересчитываются.</p>
        </div>
        <button type="button" className={styles.secondary} onClick={onLogout}>Выйти</button>
      </header>
      {savedAt && <p role="status" className={styles.saved}>Сохранено в {savedAt}. Откройте сравнение — цифры уже пересчитаны.</p>}

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="actions-title">
          <h2 id="actions-title" className={styles.cardTitle}>Действия</h2>
          {actions.status === 'loading' && <p className={styles.hint}>Загрузка…</p>}
          {actions.status === 'error' && <p role="alert" className={styles.error}>{actions.error}</p>}
          {actions.status === 'success' && (
            <table className={styles.table}>
              <thead>
                <tr><th scope="col">Действие</th><th scope="col">Сфера</th><th scope="col">Стоимость</th><th scope="col">Эффекты</th><th scope="col"><span className={styles.visuallyHidden}>Правка</span></th></tr>
              </thead>
              <tbody>
                {actions.data.map((action) => (
                  <ActionRow
                    key={action.id}
                    action={action}
                    token={token}
                    onSaved={markSaved}
                    onUnauthorized={onLogout}
                  />
                ))}
              </tbody>
            </table>
          )}
        </section>

        <aside className={styles.side}>
          <section className={styles.card} aria-labelledby="districts-title">
            <h2 id="districts-title" className={styles.cardTitle}>Районы: базовые значения</h2>
            {city.status === 'loading' && <p className={styles.hint}>Загрузка…</p>}
            {city.status === 'error' && <p role="alert" className={styles.error}>{city.error}</p>}
            {city.status === 'success' && (
              <DistrictEditor districts={city.data.districts} metrics={city.data.metrics} token={token} onSaved={markSaved} onUnauthorized={onLogout} />
            )}
          </section>
          <section className={styles.card} aria-labelledby="rules-title">
            <h2 id="rules-title" className={styles.cardTitle}>Правила движка</h2>
            {model.status === 'success' && (
              <dl className={styles.rules}>
                {model.data.couplings.map((c) => (
                  <div key={`${c.source}-${c.target}`}><dt>{metricName(c.source)} → {metricName(c.target)}</dt><dd>{c.factor}</dd></div>
                ))}
                <div><dt>Повтор действия в районе</dt><dd>× {model.data.constants.diminishing_factor}</dd></div>
                <div><dt>Радиус «соседей»</dt><dd>{model.data.constants.neighbor_radius_m} м</dd></div>
                <div><dt>Доступ к остановке</dt><dd>{model.data.constants.stop_access_radius_m} м</dd></div>
              </dl>
            )}
            {model.status === 'error' && <p role="alert" className={styles.error}>{model.error}</p>}
          </section>
          <section className={`${styles.card} ${styles.demo}`}>
            <h2 className={styles.cardTitle}>Данные — демо</h2>
            <p className={styles.hint}>Стоимости и базовые значения — демо, население — оценка по площади района. Перед пилотом заменяются данными управлений акимата и stat.gov.kz.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default function ModelPage() {
  const [token, setToken] = useState<string | null>(readToken)

  if (!token) return <LoginForm onLogin={setToken} />
  return <ModelEditor token={token} onLogout={() => { clearToken(); setToken(null) }} />
}
