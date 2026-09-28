import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Action, District } from '../../../shared/lib/schemas'
import type { Placement } from '../build'
import { BuildPanel } from './BuildPanel'

const sphere = { key: 'social' as const, name: 'Соцобъекты' }
const school: Action = { id: 20, key: 'school', name: 'Школа', sphere, cost: 45_000_000, scope: 'point', radius_m: 500, assumption: '', source_url: null, effects: [] }
const district: District = {
  id: 11, name: '12 мкр', population: 8000, center: { lat: 43.66, lng: 51.16 }, values: {},
  boundary: { type: 'Polygon', coordinates: [[[51.155, 43.655], [51.165, 43.655], [51.165, 43.665], [51.155, 43.665], [51.155, 43.655]]] },
}
const placed: Placement = { uid: 1, actionId: 20, lat: 43.66, lng: 51.16, onBuilding: false }

function renderPanel(overrides: Partial<Parameters<typeof BuildPanel>[0]> = {}) {
  const props: Parameters<typeof BuildPanel>[0] = {
    objects: [school], metrics: [], districts: [district], placements: [], problems: new Map(), tool: null,
    result: null, error: null, onTool: vi.fn(), onRemove: vi.fn(), onSave: vi.fn(async () => {}), onExit: vi.fn(),
    ...overrides,
  }
  render(<BuildPanel {...props} />)
  return props
}

describe('BuildPanel', () => {
  it('picks an object from the palette', async () => {
    const props = renderPanel()

    await userEvent.click(screen.getByRole('button', { name: /Школа/ }))

    expect(props.onTool).toHaveBeenCalledWith(20)
  })

  it('explains a bad spot and blocks saving', () => {
    renderPanel({ placements: [placed], problems: new Map([[1, 'На месте уже стоит здание']]) })

    expect(screen.getByText('На месте уже стоит здание')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Сохранить сценарий' })).toBeDisabled()
  })

  it('saves the placed objects as a scenario', async () => {
    const props = renderPanel({ placements: [placed] })

    await userEvent.click(screen.getByRole('button', { name: 'Сохранить сценарий' }))

    expect(props.onSave).toHaveBeenCalledWith('Конструктор: Школа')
  })

  it('reminds which complaint the builder is solving', async () => {
    const onDropComplaint = vi.fn()
    renderPanel({ complaint: { text: 'Далеко до поликлиники', district: '14 мкр' }, onDropComplaint })

    expect(screen.getByText(/Решаем жалобу · 14 мкр/)).toHaveTextContent('Далеко до поликлиники')
    await userEvent.click(screen.getByRole('button', { name: 'Не привязывать к жалобе' }))
    expect(onDropComplaint).toHaveBeenCalled()
  })

  it('lists widened streets and demolished buildings', () => {
    const road: Action = { ...school, id: 30, key: 'road_widening', name: 'Расширение дороги', cost: 60_000_000, scope: 'line', radius_m: 400 }
    const demolish: Action = { ...school, id: 31, key: 'demolish', name: 'Снос здания', cost: 8_000_000, scope: 'building', radius_m: null }
    renderPanel({
      objects: [school, road, demolish],
      placements: [
        { kind: 'road', uid: 2, actionId: 30, osmId: 1, label: 'Улица районного значения', lines: [[[51.16, 43.66], [51.17, 43.66]]] },
        { kind: 'demolish', uid: 3, actionId: 31, osmId: 2, lat: 43.66, lng: 51.16, footprint: [] },
      ],
    })

    expect(screen.getByText('Снос здания', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Поставленные объекты' })).toHaveTextContent('Расширение дороги · Улица районного значения')
    expect(screen.getByRole('list', { name: 'Поставленные объекты' })).toHaveTextContent('Снос здания · 12 мкр')
    expect(screen.getByRole('button', { name: /^Снос здания/ })).toHaveTextContent('8 млн ₸')
    expect(screen.getByRole('button', { name: /^Снос здания/ })).not.toHaveTextContent('м ·')
  })
})
