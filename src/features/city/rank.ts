import { badness } from '../../shared/lib/format'
import type { District, Metric, MetricValues } from '../../shared/lib/schemas'

export function valuesById(districts: District[]): Record<string, MetricValues> {
  return Object.fromEntries(districts.map((d) => [String(d.id), d.values]))
}

export function worstDistricts(
  districts: District[],
  values: Record<string, MetricValues>,
  metric: Metric,
  count: number,
): { district: District; value: number }[] {
  return districts
    .flatMap((district) => {
      const value = values[String(district.id)]?.[metric.key]
      return value === undefined ? [] : [{ district, value }]
    })
    .sort((a, b) => badness(b.value, metric) - badness(a.value, metric))
    .slice(0, count)
}
