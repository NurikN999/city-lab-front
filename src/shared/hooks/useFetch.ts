import { useEffect, useState } from 'react'
import type { z } from 'zod'
import { request } from '../lib/api'

export type FetchState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T }

/** Состояние привязано к ключу запроса: при смене пути сразу «loading», старый запрос отменяется. */
export function useFetch<T>(path: string, schema: z.ZodType<T>, reloadKey = 0): FetchState<T> {
  const key = `${path}#${reloadKey}`
  const [result, setResult] = useState<{ key: string; state: FetchState<T> } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    request(path, schema, { signal: controller.signal })
      .then((data) => setResult({ key, state: { status: 'success', data } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setResult({ key, state: { status: 'error', error: error instanceof Error ? error.message : String(error) } })
      })
    return () => controller.abort()
  }, [key, path, schema])

  return result?.key === key ? result.state : { status: 'loading' }
}
