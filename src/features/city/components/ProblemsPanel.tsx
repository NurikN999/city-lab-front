import { badness, levelOf } from '../../../shared/lib/format'
import type { District, Metric, MetricValues } from '../../../shared/lib/schemas'
import { worstDistricts } from '../rank'
import styles from './Panels.module.css'

type ProblemsPanelProps = {
  districts: District[]
  values: Record<string, MetricValues>
  metric: Metric
  onSelect: (id: number) => void
}

export function ProblemsPanel({ districts, values, metric, onSelect }: ProblemsPanelProps) {
  const worst = worstDistricts(districts, values, metric, 4)

  return (
    <section className={styles.panel} aria-labelledby="problems-title">
      <div>
        <h2 id="problems-title" className={styles.title}>Проблемы города</h2>
        <p className={styles.hint}>{metric.name}</p>
      </div>
      {worst.map(({ district, value }) => (
        <button key={district.id} type="button" className={styles.row} onClick={() => onSelect(district.id)}>
          <span className={styles.rowHead}><span>{district.name}</span><span>{Math.round(value)}{metric.unit === '%' ? '%' : ''}</span></span>
          <span className={styles.bar}>
            <span className={`${styles.fill} ${styles[levelOf(value, metric)]}`} style={{ width: `${badness(value, metric)}%` }} />
          </span>
        </button>
      ))}
      <label className={styles.allDistricts}>
        Все районы
        <select value="" onChange={(event) => event.target.value && onSelect(Number(event.target.value))}>
          <option value="">Выберите район…</option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>{district.name}</option>
          ))}
        </select>
      </label>
    </section>
  )
}
