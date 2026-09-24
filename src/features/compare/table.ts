import { deltaRows } from '../../shared/lib/deltas'
import type { CompareResponse, Metric } from '../../shared/lib/schemas'

export type CompareRow = { metric: Metric; cells: { delta: number; isBest: boolean }[] }

export function compareTable(response: CompareResponse, metrics: Metric[]) {
  const districtIds = new Set(response.scenarios.map((s) => s.scenario.district_id))
  const [onlyDistrict] = districtIds
  const focusDistrictId = districtIds.size === 1 && onlyDistrict !== undefined ? onlyDistrict : null

  const perScenario = response.scenarios.map((s) => deltaRows(s.result, metrics, focusDistrictId))

  const rows: CompareRow[] = metrics.flatMap((metric) => {
    const deltas = perScenario.map((rows) => rows.find((r) => r.metric.key === metric.key)?.delta ?? 0)
    if (deltas.every((d) => d === 0)) return []
    const gains = deltas.map((d) => (metric.lower_is_better ? -d : d))
    const bestGain = Math.max(...gains)
    return [{ metric, cells: deltas.map((delta, i) => ({ delta, isBest: bestGain > 0 && gains[i] === bestGain })) }]
  })

  const minCost = Math.min(...response.scenarios.map((s) => s.result.cost))
  const costs = response.scenarios.map((s) => ({ value: s.result.cost, isBest: s.result.cost === minCost }))

  return { focusDistrictId, rows, costs }
}
