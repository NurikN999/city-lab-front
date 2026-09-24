import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { nearestSnap, nextSnap, type Snap } from '../sheet'
import styles from './BottomSheet.module.css'

const TAP_SLOP_PX = 6
const MIN_HEIGHT_PX = 96

type BottomSheetProps = {
  snap: Snap
  onSnapChange: (snap: Snap) => void
  label: string
  footer?: ReactNode
  resetKey?: string // смена содержимого — прокрутка шторки к началу
  children: ReactNode
}

/** Нижняя шторка поверх карты на телефоне: тап по ручке — следующее положение, перетаскивание — ближайшее. */
export function BottomSheet({ snap, onSnapChange, label, footer, resetKey, children }: BottomSheetProps) {
  const ref = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [resetKey])
  const drag = useRef<{ y: number; start: number; moved: boolean } | null>(null)
  const skipClick = useRef(false)
  const [dragHeight, setDragHeight] = useState<number | null>(null)

  const areaHeight = () => ref.current?.parentElement?.clientHeight ?? window.innerHeight

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!ref.current) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drag.current = { y: event.clientY, start: ref.current.getBoundingClientRect().height, moved: false }
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current) return
    const dy = current.y - event.clientY
    if (Math.abs(dy) > TAP_SLOP_PX) current.moved = true
    if (current.moved) setDragHeight(Math.min(Math.max(current.start + dy, MIN_HEIGHT_PX), areaHeight()))
  }

  function endDrag() {
    const current = drag.current
    drag.current = null
    if (current?.moved && dragHeight !== null) {
      skipClick.current = true // за перетаскиванием следует click — это не тап
      onSnapChange(nearestSnap(dragHeight, areaHeight()))
    }
    setDragHeight(null)
  }

  function tap() {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    onSnapChange(nextSnap(snap))
  }

  return (
    <section
      ref={ref}
      className={`${styles.sheet} ${styles[snap]} ${dragHeight !== null ? styles.dragging : ''}`}
      style={dragHeight !== null ? { height: dragHeight } : undefined}
      aria-label={label}
    >
      <button
        type="button"
        className={styles.handle}
        aria-label={`${snap === 'full' ? 'Свернуть' : 'Развернуть'} «${label}»`}
        aria-expanded={snap !== 'peek'}
        onClick={tap}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className={styles.grabber} />
      </button>
      <div ref={bodyRef} className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </section>
  )
}
