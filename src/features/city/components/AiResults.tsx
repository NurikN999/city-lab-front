import { compareHref } from '../../../app/useHashRoute'
import { deltaRows } from '../../../shared/lib/deltas'
import { formatDelta, formatMoney } from '../../../shared/lib/format'
import type { AiPlanResponse, Metric } from '../../../shared/lib/schemas'
import styles from './Panels.module.css'

export function AiResults({ data, metrics, onClose }: { data: AiPlanResponse; metrics: Metric[]; onClose: () => void }) {
  const goalKeys = new Set<string>([...data.intent.goals.map((g) => g.metric), 'transit_coverage'])
  const shownMetrics = metrics.filter((m) => goalKeys.has(m.key))
  const metricName = (key: string) => metrics.find((m) => m.key === key)?.name ?? key

  return (
    <section className={`${styles.panel} ${styles.aiResults}`} aria-labelledby="ai-title">
      <div className={styles.rowHead}>
        <h2 id="ai-title" className={styles.title}>City AI</h2>
        <button type="button" className={styles.remove} aria-label="Закрыть City AI" onClick={onClose}>×</button>
      </div>
      <ul className={styles.trayChips} aria-label="Понял запрос">
        <li className={styles.trayChip}>Район: {data.intent.district_name}</li>
        {data.intent.goals.map((g) => (
          <li key={g.metric} className={styles.trayChip}>{metricName(g.metric)} {g.direction === 'decrease' ? '↓' : '↑'}{g.weight < 1 ? ` · вес ${g.weight}` : ''}</li>
        ))}
        <li className={styles.trayChip}>Бюджет: {formatMoney(data.intent.budget)}</li>
      </ul>
      <p className={styles.hint}>
        Движок перебрал {data.stats.combinations} комбинаций · {data.stats.within_budget} в бюджете
        {data.intent.fallback && ' · запрос разобран без OpenAI'}
      </p>

      {data.scenarios.length === 0 ? (
        <p>{data.explanation}</p>
      ) : (
        <>
          <ol className={styles.aiCards}>
            {data.scenarios.map((s) => (
              <li key={s.scenario.id} className={styles.aiCard}>
                <strong className={styles.aiLetter}>{s.label}</strong>
                <span>{s.scenario.name.replace(/^[ABC] · /, '')}</span>
                <dl className={styles.kpis}>
                  {deltaRows(s.result, shownMetrics, data.intent.district_id).map((row) => (
                    <div key={row.metric.key} className={styles.rowHead}>
                      <dt>{row.metric.name}</dt>
                      <dd className={row.improved ? styles.goodText : undefined}>{formatDelta(row.delta)}</dd>
                    </div>
                  ))}
                </dl>
                <span className={styles.hint}>{formatMoney(s.result.cost)}</span>
              </li>
            ))}
          </ol>
          <p className={styles.explanation}>{data.explanation}</p>
          <a className={styles.primaryLink} href={compareHref(data.scenarios.map((s) => s.scenario.id))}>Сравнить все {data.scenarios.length}</a>
        </>
      )}
      <p className={styles.hint}>Цифры посчитал движок симуляции. City AI только понял запрос и подобрал разные варианты.</p>
    </section>
  )
}
