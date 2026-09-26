import { useCallback, useEffect, useRef, useState } from 'react'
import { request } from '../../shared/lib/api'
import { complaintsSchema, type Complaint } from '../../shared/lib/schemas'

const MAX_FRESH = 3

/**
 * Лента жалоб: опрос раз в intervalMs. «Свежие» — пришедшие после первой загрузки, для уведомлений.
 * ponytail: опрос вместо WebSocket — для десятков жалоб в минуту хватает; Reverb, когда поток вырастет.
 */
export function useComplaintFeed(intervalMs = 4000) {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [fresh, setFresh] = useState<Complaint[]>([])
  const seen = useRef<Set<number> | null>(null)

  const load = useCallback(() => {
    request('/complaints', complaintsSchema)
      .then((data) => {
        const known = seen.current
        if (known) {
          const incoming = data.filter((c) => !known.has(c.id))
          if (incoming.length > 0) setFresh((current) => [...incoming, ...current].slice(0, MAX_FRESH))
        }
        seen.current = new Set([...(known ?? []), ...data.map((c) => c.id)])
        setComplaints(data)
      })
      .catch(() => {}) // сеть моргнула — следующий опрос догонит
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, intervalMs)
    return () => clearInterval(timer)
  }, [load, intervalMs])

  // Стабильная ссылка: иначе каждый опрос перезапускал бы таймеры автоскрытия уведомлений
  const dismiss = useCallback((id: number) => setFresh((current) => current.filter((c) => c.id !== id)), [])

  return { complaints, fresh, dismiss, refresh: load }
}
