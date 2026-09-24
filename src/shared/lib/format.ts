import type { Metric } from './schemas'

export const DEFAULT_BUDGET = 100_000_000

export type Level = 'good' | 'mid' | 'bad'

const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

export function formatMoney(tenge: number): string {
  // Intl ставит неразрывный пробел между разрядами — меняем на обычный, чтобы строки сравнивались предсказуемо
  return `${money.format(tenge / 1_000_000).replace(/\s/g, ' ')} млн ₸`
}

export function formatDelta(delta: number): string {
  if (delta === 0) return '0'
  return delta < 0 ? `−${Math.abs(delta)}` : `+${delta}`
}

/** 0 = идеально, 100 = хуже некуда — независимо от того, что для метрики «хорошо». */
export function badness(value: number, metric: Metric): number {
  const share = ((value - metric.min) * 100) / (metric.max - metric.min)
  return metric.lower_is_better ? share : 100 - share
}

export function levelOf(value: number, metric: Metric): Level {
  const b = badness(value, metric)
  if (b < 50) return 'good'
  return b < 70 ? 'mid' : 'bad'
}

export function isImprovement(delta: number, metric: Metric): boolean {
  return metric.lower_is_better ? delta < 0 : delta > 0
}
