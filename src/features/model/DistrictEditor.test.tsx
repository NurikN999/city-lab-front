import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { District, Metric } from '../../shared/lib/schemas'
import { DistrictEditor } from './DistrictEditor'

const metric = (key: 'traffic' | 'transit_coverage', name: string, isComputed: boolean): Metric => ({
  key, name, unit: '%', sphere: 'transport', lower_is_better: key === 'traffic', min: 0, max: 100, is_computed: isComputed,
})
const metrics = [metric('traffic', 'Загрузка дорог', false), metric('transit_coverage', 'Покрытие ОТ', true)]
const district = (id: number, name: string): District => ({
  id, name, population: 8400, center: { lat: 43.66, lng: 51.16 },
  boundary: { type: 'Polygon', coordinates: [[[51.16, 43.66], [51.17, 43.66], [51.17, 43.67], [51.16, 43.66]]] },
  values: { traffic: 84, transit_coverage: 30 },
})
const districts = [district(11, '12 мкр'), district(12, '12А мкр')]

describe('DistrictEditor', () => {
  it('saves population and editable metric values of the chosen district', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ id: 12, population: 9000, values: { traffic: 70 } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const onSaved = vi.fn()
    render(<DistrictEditor districts={districts} metrics={metrics} token="t" onSaved={onSaved} onUnauthorized={vi.fn()} />)

    await userEvent.selectOptions(screen.getByLabelText('Район'), '12А мкр')
    await userEvent.clear(screen.getByLabelText('Население'))
    await userEvent.type(screen.getByLabelText('Население'), '9000')
    await userEvent.clear(screen.getByLabelText('Загрузка дорог, %'))
    await userEvent.type(screen.getByLabelText('Загрузка дорог, %'), '70')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить район' }))

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/districts\/12$/)
    expect(JSON.parse(String(init?.body))).toEqual({ population: 9000, values: { traffic: 70 } })
    expect(screen.queryByLabelText('Покрытие ОТ, %')).not.toBeInTheDocument()
  })

  it('shows the server error and keeps the input', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Ошибка', errors: { 'values.traffic': ['Значение вне диапазона.'] } }), { status: 422 })))
    render(<DistrictEditor districts={districts} metrics={metrics} token="t" onSaved={vi.fn()} onUnauthorized={vi.fn()} />)

    await userEvent.clear(screen.getByLabelText('Загрузка дорог, %'))
    await userEvent.type(screen.getByLabelText('Загрузка дорог, %'), '99')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить район' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Значение вне диапазона.')
    expect(screen.getByLabelText('Загрузка дорог, %')).toHaveValue(99)
  })

  it('shows saved values when coming back to a district', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 11, population: 9000, values: { traffic: 70 } }), { status: 200 })))
    render(<DistrictEditor districts={districts} metrics={metrics} token="t" onSaved={vi.fn()} onUnauthorized={vi.fn()} />)

    await userEvent.clear(screen.getByLabelText('Загрузка дорог, %'))
    await userEvent.type(screen.getByLabelText('Загрузка дорог, %'), '70')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить район' }))
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Сохранить район' })).toBeEnabled())
    await userEvent.selectOptions(screen.getByLabelText('Район'), '12А мкр')
    await userEvent.selectOptions(screen.getByLabelText('Район'), '12 мкр')

    expect(screen.getByLabelText('Загрузка дорог, %')).toHaveValue(70)
    expect(screen.getByLabelText('Население')).toHaveValue(9000)
  })

  it('does not send an emptied metric field', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<DistrictEditor districts={districts} metrics={metrics} token="t" onSaved={vi.fn()} onUnauthorized={vi.fn()} />)

    await userEvent.clear(screen.getByLabelText('Загрузка дорог, %'))
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить район' }))

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
