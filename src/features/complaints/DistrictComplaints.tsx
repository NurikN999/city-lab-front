import type { Complaint } from '../../shared/lib/schemas'
import { CATEGORY_LABELS, timeAgo } from './feed'
import styles from './Complaints.module.css'

type DistrictComplaintsProps = {
  complaints: Complaint[]
  onStatus: ((id: number, status: 'resolved' | 'hidden') => void) | null // null — гость, без модерации
}

export function DistrictComplaints({ complaints, onStatus }: DistrictComplaintsProps) {
  if (complaints.length === 0) return null

  return (
    <section className={styles.district} aria-label="Жалобы жителей">
      <h3 className={styles.districtTitle}>Жалобы жителей · {complaints.length}</h3>
      <ul className={styles.list}>
        {complaints.map((c) => (
          <li key={c.id} className={styles.item}>
            <p className={styles.itemMeta}>{CATEGORY_LABELS[c.category]} · {timeAgo(c.created_at)}</p>
            <p className={styles.itemText}>{c.text}</p>
            {onStatus && (
              <div className={styles.itemActions}>
                <button type="button" aria-label={`Решено: ${c.text}`} onClick={() => onStatus(c.id, 'resolved')}>Решено</button>
                <button type="button" aria-label={`Скрыть: ${c.text}`} onClick={() => onStatus(c.id, 'hidden')}>Скрыть</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
