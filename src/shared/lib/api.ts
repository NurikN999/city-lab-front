import { z } from 'zod'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8091/api'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
  token?: string | null
  signal?: AbortSignal
}

const errorBodySchema = z.object({
  message: z.string(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
})

function errorMessage(status: number, body: unknown): string {
  if (status === 429) return 'Слишком много запросов. Подождите минуту.'
  const parsed = errorBodySchema.safeParse(body)
  if (!parsed.success) return `Ошибка сервера (${status}).`
  const firstFieldError = parsed.data.errors ? Object.values(parsed.data.errors)[0]?.[0] : undefined
  return firstFieldError ?? parsed.data.message
}

export async function request<T>(path: string, schema: z.ZodType<T>, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })
  const body: unknown = await response.json().catch((error: unknown) => {
    if (options.signal?.aborted) throw error
    return null
  })

  if (!response.ok) throw new ApiError(response.status, errorMessage(response.status, body), body)

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    console.error('Unexpected API response', path, parsed.error)
    throw new ApiError(response.status, 'Сервер вернул данные в неожиданном формате.', body)
  }
  return parsed.data
}
