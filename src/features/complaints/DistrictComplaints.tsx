import type { Complaint } from '../../shared/lib/schemas'
import { CATEGORY_LABELS, suggestedObject, timeAgo } from './feed'
import styles from './Complaints.module.css'

type DistrictComplaintsProps = {
  complaints: Complaint[]
  onStatus: ((id: number, status: 'resolved' | 'hidden') => void) | null // null — гость, без модерации
  onSolve?: (complaint: Complaint) => void // открыть конструктор с подходящим объектом
}

export function DistrictComplaints({ complaints, onStatus, onSolve }: DistrictComplaintsProps) {
  if (complaints.length === 0) return null

  return (
    <section className={styles.district} aria-label="Жалобы жителей">
      <h3 className={styles.districtTitle}>Жалобы жителей · {complaints.length}</h3>
      <ul className={styles.list}>
        {complaints.map((c) => (
          <li key={c.id} className={styles.item}>
            <p className={styles.itemMeta}>{CATEGORY_LABELS[c.category]} · {timeAgo(c.created_at)}</p>
            <p className={styles.itemText}>{c.text}</p>
            {c.status === 'accepted' && c.scenario_name && <p className={styles.accepted}>Принята · «{c.scenario_name}»</p>}
            {c.status === 'new' && onSolve && suggestedObject(c.category) && (
              <button type="button" className={styles.solve} aria-label={`Решить в конструкторе: ${c.text}`} onClick={() => onSolve(c)}>
                Решить в конструкторе
              </button>
            )}
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
