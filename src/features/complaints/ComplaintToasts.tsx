import { useEffect } from 'react'
import type { Complaint } from '../../shared/lib/schemas'
import { CATEGORY_LABELS } from './feed'
import styles from './Complaints.module.css'

const TOAST_MS = 8000

type ComplaintToastsProps = {
  items: Complaint[]
  districtName: (districtId: number) => string
  onOpen: (districtId: number) => void
  onDismiss: (id: number) => void
}

/** Уведомления о новых жалобах, как события на карте в игре: клик — перелёт к району. */
export function ComplaintToasts({ items, districtName, onOpen, onDismiss }: ComplaintToastsProps) {
  useEffect(() => {
    const timers = items.map((c) => setTimeout(() => onDismiss(c.id), TOAST_MS))
    return () => timers.forEach(clearTimeout)
  }, [items, onDismiss])

  return (
    <div className={styles.toasts} role="status" aria-live="polite">
      {items.map((c) => (
        <div key={c.id} className={styles.toast}>
          <button type="button" className={styles.toastBody} onClick={() => { onOpen(c.district_id); onDismiss(c.id) }}>
            <span className={styles.toastTitle}>Новая жалоба · {districtName(c.district_id)}</span>
            <span className={styles.toastMeta}>{CATEGORY_LABELS[c.category]}</span>
            <span className={styles.toastText}>{c.text}</span>
          </button>
          <button type="button" className={styles.toastClose} aria-label="Скрыть уведомление" onClick={() => onDismiss(c.id)}>×</button>
        </div>
      ))}
    </div>
  )
}
