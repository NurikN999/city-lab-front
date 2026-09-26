import { useEffect, useRef, useState } from 'react'
import type { ScenarioItemInput, SimulationResult } from '../../../shared/lib/schemas'
import { previewScenario } from '../api'

/**
 * Живой пересчёт конструктора: не чаще раза в throttleMs, пока объект тащат.
 * Прошлый результат остаётся на карте до прихода нового — без мигания; устаревшие ответы отбрасываются.
 */
export function useBuildPreview(items: ScenarioItemInput[], throttleMs = 300) {
  const [state, setState] = useState<{ result: SimulationResult | null; error: string | null }>({ result: null, error: null })
  const itemsRef = useRef(items)
  const lastSent = useRef(0)
  const seq = useRef(0)
  const inflight = useRef<AbortController | null>(null)
  const key = JSON.stringify(items)

  useEffect(() => {
    itemsRef.current = items
  })

  useEffect(() => {
    if (itemsRef.current.length === 0) return
    const timer = setTimeout(() => {
      const id = ++seq.current
      inflight.current?.abort()
      const controller = new AbortController()
      inflight.current = controller
      lastSent.current = Date.now()
      previewScenario(itemsRef.current, controller.signal)
        .then((result) => {
          if (id === seq.current) setState({ result, error: null })
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted && id === seq.current) {
            setState((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }))
          }
        })
    }, Math.max(0, lastSent.current + throttleMs - Date.now()))
    return () => clearTimeout(timer)
  }, [key, throttleMs])

  useEffect(() => () => inflight.current?.abort(), [])

  return { result: items.length > 0 ? state.result : null, error: items.length > 0 ? state.error : null }
}
