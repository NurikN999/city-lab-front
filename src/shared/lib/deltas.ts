import { isImprovement } from './format'
import type { Metric, SimulationResult } from './schemas'

export type DeltaRow = { metric: Metric; before: number; after: number; delta: number; improved: boolean }

export function deltaRows(result: SimulationResult, metrics: Metric[], districtId: number | null): DeltaRow[] {
  const before = districtId === null ? result.before.city : result.before.districts[String(districtId)] ?? {}
  const after = districtId === null ? result.after.city : result.after.districts[String(districtId)] ?? {}

  return metrics.flatMap((metric) => {
    const b = before[metric.key]
    const a = after[metric.key]
    if (b === undefined || a === undefined) return []
    const delta = Math.round((a - b) * 10) / 10
    return [{ metric, before: b, after: a, delta, improved: isImprovement(delta, metric) }]
  })
}
