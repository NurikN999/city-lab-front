import { levelOf } from '../../../shared/lib/format'
import type { Metric, MetricValues } from '../../../shared/lib/schemas'
import styles from './Panels.module.css'

export function CityKpiPanel({ metrics, city }: { metrics: Metric[]; city: MetricValues }) {
  return (
    <section className={styles.panel} aria-labelledby="kpi-title">
      <h2 id="kpi-title" className={styles.title}>Актау сейчас</h2>
      <dl className={styles.kpis}>
        {metrics.flatMap((metric) => {
          const value = city[metric.key]
          if (value === undefined) return []
          return [
            <div key={metric.key} className={styles.rowHead}>
              <dt>{metric.name}</dt>
              <dd className={styles[`${levelOf(value, metric)}Text`]}>{Math.round(value)}</dd>
            </div>,
          ]
        })}
      </dl>
      <p className={styles.hint}>Демо-данные, среднее по районам с учётом населения.</p>
    </section>
  )
}
