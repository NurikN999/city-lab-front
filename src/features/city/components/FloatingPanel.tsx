import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { clampDelta } from '../drag'
import styles from './FloatingPanel.module.css'

const DESKTOP = '(min-width: 64rem)'
const EDGE_PX = 8

type Box = { left: number; top: number; right: number; bottom: number }
type Drag = { pointerX: number; pointerY: number; start: { x: number; y: number }; rect: DOMRect; bounds: Box }

type FloatingPanelProps = { title: string; className: string; children: ReactNode }

/** Панель поверх карты: сворачивается везде, перетаскивается за ручку на десктопе. */
export function FloatingPanel({ title, className, children }: FloatingPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    const parent = ref.current?.offsetParent
    if (!ref.current || !(parent instanceof HTMLElement) || !window.matchMedia(DESKTOP).matches) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const map = parent.getBoundingClientRect()
    drag.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      start: offset,
      rect: ref.current.getBoundingClientRect(),
      bounds: { left: map.left + EDGE_PX, top: map.top + EDGE_PX, right: map.right - EDGE_PX, bottom: map.bottom - EDGE_PX },
    }
    setIsDragging(true)
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current
    if (!current) return
    const delta = clampDelta({ x: event.clientX - current.pointerX, y: event.clientY - current.pointerY }, current.rect, current.bounds)
    setOffset({ x: current.start.x + delta.x, y: current.start.y + delta.y })
  }

  function endDrag() {
    drag.current = null
    setIsDragging(false)
  }

  return (
    <div
      ref={ref}
      className={`${className} ${styles.floating} ${isDragging ? styles.dragging : ''} ${collapsed ? styles.collapsed : ''}`}
      style={{ translate: `${offset.x}px ${offset.y}px` }}
    >
      <div className={styles.bar}>
        {collapsed && <span className={styles.name}>{title}</span>}
        <button
          type="button"
          className={styles.grip}
          aria-label={`Переместить «${title}»`}
          title="Перетащите панель · двойной клик — на место"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={() => setOffset({ x: 0, y: 0 })}
        >
          ⠿
        </button>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Развернуть' : 'Свернуть'} «${title}»`}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? '+' : '–'}
        </button>
      </div>
      {!collapsed && children}
    </div>
  )
}
