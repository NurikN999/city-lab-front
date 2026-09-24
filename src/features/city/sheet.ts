export type Snap = 'peek' | 'half' | 'full'

const PEEK_PX = 152 // = 9.5rem в BottomSheet.module.css
const FULL_GAP_PX = 72 // = 4.5rem: над раскрытой шторкой остаётся полоска карты

const ORDER: Snap[] = ['peek', 'half', 'full']

export function nextSnap(snap: Snap): Snap {
  return ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length]
}

/** Высота шторки в пикселях внутри области карты высотой areaPx. */
export function snapHeight(snap: Snap, areaPx: number): number {
  if (snap === 'peek') return PEEK_PX
  if (snap === 'half') return Math.round(areaPx / 2)
  return areaPx - FULL_GAP_PX
}

export function nearestSnap(heightPx: number, areaPx: number): Snap {
  return ORDER.reduce((best, snap) =>
    Math.abs(snapHeight(snap, areaPx) - heightPx) < Math.abs(snapHeight(best, areaPx) - heightPx) ? snap : best)
}
