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
})
