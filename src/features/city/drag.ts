type Box = { left: number; top: number; right: number; bottom: number }
type Point = { x: number; y: number }

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** Сдвиг панели, при котором она не выходит за границы карты. */
export function clampDelta(delta: Point, rect: Box, bounds: Box): Point {
  return {
    x: clamp(delta.x, bounds.left - rect.left, bounds.right - rect.right),
    y: clamp(delta.y, bounds.top - rect.top, bounds.bottom - rect.bottom),
  }
}
