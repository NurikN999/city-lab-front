import type { DeltaRow } from '../../shared/lib/deltas'
import type { Contribution } from '../../shared/lib/schemas'

export type WhyRow = DeltaRow & { causes: { label: string; delta: number }[] }

const MAX_ROWS = 4

/** Самые изменившиеся метрики района и действия, которые их сдвинули (по убыванию вклада). */
export function whyRows(rows: DeltaRow[], contributions: Contribution[]): WhyRow[] {
  return rows
    .filter((row) => row.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, MAX_ROWS)
    .map((row) => ({
      ...row,
      causes: contributions
        .flatMap((c) => {
          const delta = c.deltas[row.metric.key]
          return delta === undefined ? [] : [{ label: c.label, delta }]
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    }))
}
