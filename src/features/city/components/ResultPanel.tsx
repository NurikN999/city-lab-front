import { useState } from 'react'
import { compareHref } from '../../../app/useHashRoute'
import { deltaRows } from '../../../shared/lib/deltas'
import { formatDelta, formatMoney } from '../../../shared/lib/format'
import type { Metric, ScenarioWithResult } from '../../../shared/lib/schemas'
import { whyRows } from '../why'
import styles from './Panels.module.css'

type ResultPanelProps = {
  data: ScenarioWithResult
  metrics: Metric[]
  districtName: string
  onEdit: () => void
  onClose: () => void
}

export function ResultPanel({ data, metrics, districtName, onEdit, onClose }: ResultPanelProps) {
  const [scope, setScope] = useState<'district' | 'city'>('district')
  const rows = deltaRows(data.result, metrics, scope === 'district' ? data.scenario.district_id : null)
  const why = scope === 'district' ? whyRows(rows, data.contributions ?? []) : []
  const metricName = (key: string) => metrics.find((m) => m.key === key)?.name ?? key

  return (
    <section className={styles.panel} aria-labelledby="result-title">
      <div className={styles.rowHead}>
        <h2 id="result-title" className={styles.title}>До → После</h2>
        <div className={styles.chips} role="group" aria-label="Масштаб">
          <button type="button" className={styles.chip} aria-pressed={scope === 'district'} onClick={() => setScope('district')}>{districtName}</button>
          <button type="button" className={styles.chip} aria-pressed={scope === 'city'} onClick={() => setScope('city')}>Весь город</button>
        </div>
      </div>
      <p className={styles.hint}>«{data.scenario.name}» · {formatMoney(data.result.cost)} из {formatMoney(data.result.budget)}</p>

      <table className={styles.deltas}>
        <thead>
          <tr><th scope="col">Метрика</th><th scope="col">До</th><th scope="col">После</th><th scope="col">Δ</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.metric.key}>
              <th scope="row">{row.metric.name}</th>
              <td>{row.before}</td>
              <td><strong>{row.after}</strong></td>
              <td><span className={row.delta === 0 ? styles.deltaFlat : row.improved ? styles.deltaGood : styles.deltaBad}>{formatDelta(row.delta)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      {why.length > 0 && (
        <details open className={styles.assumptions}>
          <summary>Почему так изменилось</summary>
          <dl className={styles.why}>
            {why.map((row) => (
              <div key={row.metric.key}>
                <dt><span>{row.metric.name}</span><span className={row.improved ? styles.deltaGood : styles.deltaBad}>{formatDelta(row.delta)}</span></dt>
                <dd>{row.causes.length > 0 ? row.causes.map((c) => `${c.label} ${formatDelta(c.delta)}`).join(' · ') : 'через связи с другими метриками'}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.hint}>Вклад — насколько иначе было бы без этого действия. Считает движок на правилах, коэффициенты открыты на странице <a href="#/model">«Модель»</a>.</p>
        </details>
      )}

      <details open className={styles.assumptions}>
        <summary>Допущения модели</summary>
        <ul>
          {data.result.assumptions.actions.map((a) => (
            <li key={a.key}><strong>{a.name}:</strong> {a.assumption}{a.source_url && <> · <a href={a.source_url} target="_blank" rel="noreferrer">источник</a></>}</li>
          ))}
          {data.result.assumptions.couplings.map((c) => (
            <li key={`${c.source}-${c.target}`}><strong>Связь {metricName(c.source)} → {metricName(c.target)}:</strong> коэффициент {c.factor}</li>
          ))}
        </ul>
      </details>

      <div className={styles.actions3}>
        <a className={styles.primaryLink} href={compareHref([data.scenario.id])}>Сравнить</a>
        <button type="button" className={styles.toggle} onClick={onEdit}>Изменить</button>
        <button type="button" className={styles.toggle} onClick={onClose}>Закрыть</button>
      </div>
    </section>
  )
}
