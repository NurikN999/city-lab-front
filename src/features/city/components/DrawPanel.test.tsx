import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DrawPanel } from './DrawPanel'

const two = [{ lat: 43.66, lng: 51.16 }, { lat: 43.67, lng: 51.17 }]

describe('DrawPanel', () => {
  it('cannot save a single stop', () => {
    render(<DrawPanel districtName="12 мкр" points={[two[0]]} preview={{ status: 'idle' }} onUndo={vi.fn()} onCancel={vi.fn()} onSaved={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled()
  })

  it('warns when the line could not follow roads', () => {
    const coordinates: [number, number][] = [[51.16, 43.66], [51.17, 43.67]]
    const preview = { status: 'ready' as const, data: { path: { type: 'LineString' as const, coordinates }, stops: two, snapped: false, district_ids: [] } }
    render(<DrawPanel districtName="12 мкр" points={two} preview={preview} onUndo={vi.fn()} onCancel={vi.fn()} onSaved={vi.fn()} />)

    expect(screen.getByText(/линия прямая/i)).toBeInTheDocument()
  })

  it('shows the server error when saving fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Ошибка', errors: { 'points.0.lat': ['Точка вне Актау.'] } }), { status: 422 })))
    render(<DrawPanel districtName="12 мкр" points={two} preview={{ status: 'idle' }} onUndo={vi.fn()} onCancel={vi.fn()} onSaved={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Точка вне Актау.')
  })

  it('hands the saved route to the parent', async () => {
    const route = { id: 42, key: 'u-abc', name: 'Маршрут · 12 мкр', path: { type: 'LineString', coordinates: [[51.16, 43.66], [51.17, 43.67]] }, stops: [], district_ids: [11] }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(route), { status: 201 })))
    const onSaved = vi.fn()
    render(<DrawPanel districtName="12 мкр" points={two} preview={{ status: 'idle' }} onUndo={vi.fn()} onCancel={vi.fn()} onSaved={onSaved} />)

    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 42 })))
  })

  it('tells the user when the stop limit is reached', () => {
    const full = Array.from({ length: 25 }, (_, i) => ({ lat: 43.6 + i / 1000, lng: 51.16 }))
    render(<DrawPanel districtName="12 мкр" points={full} preview={{ status: 'idle' }} onUndo={vi.fn()} onCancel={vi.fn()} onSaved={vi.fn()} />)

    expect(screen.getByText('Максимум 25 остановок.')).toBeInTheDocument()
  })
})
