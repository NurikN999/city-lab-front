import { useRef, useState } from 'react'
import type { LatLng } from '../../../shared/lib/schemas'
import { previewRoute } from '../api'
import { addPoint, MAX_POINTS, undoPoint, type PreviewState } from '../drawing'

/** Точки рисуемого маршрута и превью по дорогам; каждый новый набор точек отменяет прошлый запрос. */
export function useRouteDrawing() {
  const [points, setPoints] = useState<LatLng[]>([])
  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' })
  const request = useRef<AbortController | null>(null)

  function show(next: LatLng[]) {
    request.current?.abort()
    setPoints(next)
    if (next.length < 2) {
      setPreview({ status: 'idle' })
      return
    }
    const controller = new AbortController()
    request.current = controller
    setPreview({ status: 'loading' })
    previewRoute(next, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setPreview({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setPreview({ status: 'error', error: error instanceof Error ? error.message : String(error) })
      })
  }

  return {
    points,
    preview,
    add: (point: LatLng) => {
      if (points.length < MAX_POINTS) show(addPoint(points, point))
    },
    undo: () => show(undoPoint(points)),
    reset: () => show([]),
    stop: () => request.current?.abort(),
  }
}
