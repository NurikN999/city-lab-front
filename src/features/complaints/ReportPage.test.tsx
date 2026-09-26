import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ReportPage from './ReportPage'

const city = {
  spheres: [], metrics: [], city: {},
  districts: [{ id: 11, name: '12 мкр', population: 8400, center: { lat: 43.66, lng: 51.16 }, boundary: { type: 'Polygon', coordinates: [[[51.16, 43.66], [51.17, 43.66], [51.17, 43.67], [51.16, 43.66]]] }, values: {} }],
}

function stubApi(post: () => Response) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (_url, init) => (init?.method === 'POST' ? post() : new Response(JSON.stringify(city))))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('ReportPage', () => {
  it('sends a complaint and confirms it is on the map', async () => {
    const fetchMock = stubApi(() => new Response(JSON.stringify({ id: 1, district_id: 11, category: 'transport', text: 'Пробка у школы', status: 'new', created_at: '2026-09-26T10:00:00+00:00' }), { status: 201 }))
    render(<ReportPage />)

    await userEvent.selectOptions(await screen.findByLabelText('Район'), '12 мкр')
    await userEvent.click(screen.getByRole('radio', { name: 'Транспорт' }))
    await userEvent.type(screen.getByLabelText('Что случилось'), 'Пробка у школы')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить жалобу' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Жалоба отправлена')
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ district_id: 11, category: 'transport', text: 'Пробка у школы' })
  })

  it('shows why the server refused', async () => {
    stubApi(() => new Response(JSON.stringify({ message: 'Too Many Attempts.' }), { status: 429 }))
    render(<ReportPage />)

    await userEvent.selectOptions(await screen.findByLabelText('Район'), '12 мкр')
    await userEvent.type(screen.getByLabelText('Что случилось'), 'Пробка у школы')
    await userEvent.click(screen.getByRole('button', { name: 'Отправить жалобу' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Слишком много запросов')
  })
})
