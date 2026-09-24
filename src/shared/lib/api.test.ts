import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, request } from './api'

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('request', () => {
  it('returns parsed data and sends JSON with bearer token', async () => {
    const fetchMock = stubFetch(200, { ok: 1 })

    const data = await request('/x', z.object({ ok: z.number() }), { method: 'POST', body: { a: 1 }, token: 't' })

    expect(data).toEqual({ ok: 1 })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/x$/)
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"a":1}')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer t')
  })

  it('surfaces the first validation message', async () => {
    stubFetch(422, { message: 'Ошибка', errors: { 'items.0.route_id': ['Для этого действия нужен маршрут.'] } })

    await expect(request('/x', z.object({}))).rejects.toMatchObject({ status: 422, message: 'Для этого действия нужен маршрут.' })
  })

  it('surfaces budget_exceeded message', async () => {
    stubFetch(422, { message: 'Сценарий превышает бюджет на 10 000 000 ₸.', error: 'budget_exceeded', over: 10_000_000 })

    await expect(request('/x', z.object({}))).rejects.toMatchObject({ message: 'Сценарий превышает бюджет на 10 000 000 ₸.' })
  })

  it('translates 429', async () => {
    stubFetch(429, { message: 'Too Many Attempts.' })

    await expect(request('/x', z.object({}))).rejects.toMatchObject({ status: 429, message: 'Слишком много запросов. Подождите минуту.' })
  })

  it('turns an unexpected response shape into a readable error', async () => {
    stubFetch(200, { ok: 'yes' })

    const error = await request('/x', z.object({ ok: z.number() })).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ message: 'Сервер вернул данные в неожиданном формате.' })
  })
})
