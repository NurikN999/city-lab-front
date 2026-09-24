import { useEffect, useState } from 'react'
import { metricKeySchema, type MetricValues } from '../../shared/lib/schemas'

type Values = Record<string, MetricValues>

export const easeOut = (t: number) => 1 - (1 - t) ** 3

/** Значения районов на доле пути t (0..1) от «до» к «после». */
export function tweenValues(from: Values, to: Values, t: number): Values {
  return Object.fromEntries(Object.entries(to).map(([id, after]) => {
    const before = from[id] ?? {}
    const row: MetricValues = {}
    for (const key of metricKeySchema.options) {
      const a = after[key]
      if (a === undefined) continue
      const b = before[key]
      row[key] = b === undefined ? a : b + (a - b) * t
    }
    return [id, row]
  }))
}

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Плавный переход карты от «до» к «после» при новом результате SIMULATE. */
export function useTweenedValues(from: Values | null, to: Values, ms = 1500): Values {
  const [progress, setProgress] = useState<{ from: Values | null; t: number }>({ from: null, t: 1 })

  useEffect(() => {
    if (!from || reducedMotion()) return
    const start = performance.now()
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / ms)
      setProgress({ from, t })
      if (t < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [from, ms])

  if (!from || reducedMotion()) return to
  const t = progress.from === from ? progress.t : 0 // до первого кадра показываем «до»
  return t >= 1 ? to : tweenValues(from, to, easeOut(t))
}
