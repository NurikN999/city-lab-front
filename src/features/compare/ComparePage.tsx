import { useFetch } from '../../shared/hooks/useFetch'
import { formatDelta, formatMoney } from '../../shared/lib/format'
import { cityResponseSchema, compareResponseSchema, type CompareResponse, type Metric } from '../../shared/lib/schemas'
import styles from './ComparePage.module.css'
import { compareTable } from './table'

function CompareView({ data, metrics, districtName }: { data: CompareResponse; metrics: Metric[]; districtName: (id: number) => string }) {
  const table = compareTable(data, metrics)

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Сравнение сценариев</h1>
        <p className={styles.hint}>{table.focusDistrictId === null ? 'Весь город' : districtName(table.focusDistrictId)} · изменения в пунктах</p>
      </header>

      <div className={styles.grid}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Метрика</th>
                {data.scenarios.map((s) => (
                  <th key={s.scenario.id} scope="col" className={styles[`col${s.label}`]}>
                    <span className={styles.letter}>{s.label}</span>
                    <span>{s.scenario.name.replace(/^[ABC] · /, '')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.metric.key}>
                  <th scope="row">{row.metric.name}</th>
                  {row.cells.map((cell, i) => (
                    <td key={data.scenarios[i].scenario.id} className={cell.isBest ? styles.best : undefined}>{formatDelta(cell.delta)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">Стоимость</th>
                {table.costs.map((cost, i) => (
                  <td key={data.scenarios[i].scenario.id} className={cost.isBest ? styles.best : undefined}>{formatMoney(cost.value)}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className={styles.hint}><span className={styles.legendBest} /> лучшее значение в строке</p>
        </div>

        <aside className={styles.side}>
          <section className={styles.card} aria-labelledby="bars-title">
            <h2 id="bars-title" className={styles.cardTitle}>Эффект по метрикам</h2>
            {table.rows.slice(0, 4).map((row) => {
              const max = Math.max(...row.cells.map((c) => Math.abs(c.delta)), 1)
              return (
                <div key={row.metric.key} className={styles.barGroup}>
                  <span className={styles.barLabel}>{row.metric.name}</span>
                  {row.cells.map((cell, i) => (
                    <div key={data.scenarios[i].scenario.id} className={styles.barRow}>
                      <b>{data.scenarios[i].label}</b>
                      <span className={styles.track}><span className={`${styles.bar} ${styles[`bar${data.scenarios[i].label}`]}`} style={{ width: `${(Math.abs(cell.delta) / max) * 100}%` }} /></span>
                      <span>{formatDelta(cell.delta)}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </section>
          <section className={`${styles.card} ${styles.ai}`} aria-labelledby="ai-explain">
            <h2 id="ai-explain" className={styles.cardTitle}>City AI объясняет</h2>
            <p className={styles.explanation}>{data.explanation}</p>
            <p className={styles.hint}>Текст по готовым цифрам движка. Решение принимает акимат.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default function ComparePage({ ids }: { ids: number[] }) {
  const city = useFetch('/city', cityResponseSchema)
  const compare = useFetch(`/compare?ids=${ids.join(',')}`, compareResponseSchema)

  if (ids.length === 0) return <p className={styles.status}>Выберите сценарии в «Мои сценарии» на карте или запустите City AI.</p>
  if (compare.status === 'error') return <p className={styles.status} role="alert">{compare.error}</p>
  if (city.status === 'error') return <p className={styles.status} role="alert">{city.error}</p>
  if (compare.status === 'loading' || city.status === 'loading') return <p className={styles.status}>Пересчитываем сценарии…</p>

  const names = new Map(city.data.districts.map((d) => [d.id, d.name]))
  return <CompareView data={compare.data} metrics={city.data.metrics} districtName={(id) => names.get(id) ?? `Район ${id}`} />
}
