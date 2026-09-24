import type { Metric } from '../../../shared/lib/schemas'
import styles from './Panels.module.css'

export function Legend({ metric, compact = false }: { metric: Metric; compact?: boolean }) {
  if (compact) {
    return (
      <section className={styles.legendPill} aria-label={`Легенда: ${metric.name}`}>
        <div className={styles.swatches}>
          <span><span className={`${styles.swatch} ${styles.good}`} />Норма</span>
          <span><span className={`${styles.swatch} ${styles.mid}`} />Внимание</span>
          <span><span className={`${styles.swatch} ${styles.bad}`} />Проблема</span>
        </div>
      </section>
    )
  }
  return (
    <section className={styles.panel} aria-label="Легенда">
      <p className={styles.title}>{metric.name}</p>
      <div className={styles.swatches}>
        <span><span className={`${styles.swatch} ${styles.good}`} />Норма</span>
        <span><span className={`${styles.swatch} ${styles.mid}`} />Внимание</span>
        <span><span className={`${styles.swatch} ${styles.bad}`} />Проблема</span>
      </div>
      <p className={styles.hint}>Высота столбика — насколько плохо</p>
    </section>
  )
}
