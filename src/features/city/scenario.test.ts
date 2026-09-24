import { describe, expect, it } from 'vitest'
import type { Action } from '../../shared/lib/schemas'
import { chooseRoute, draftCost, draftItems, draftName, emptyDraft, toggleAction, withRoute } from './scenario'

const sphere = { key: 'transport' as const, name: 'Транспорт' }
const routeAction: Action = { id: 1, key: 'new_bus_route', name: 'Новый автобусный маршрут', sphere, cost: 42_000_000, scope: 'route', assumption: '', source_url: null, effects: [] }
const lights: Action = { id: 3, key: 'smart_lights', name: 'Умные светофоры', sphere, cost: 10_000_000, scope: 'district', assumption: '', source_url: null, effects: [] }
const actions = [routeAction, lights]
const routes = [{ id: 2, key: 'b', name: 'Маршрут Б', path: { type: 'LineString' as const, coordinates: [] }, stops: [], district_ids: [11] }]

describe('scenario draft', () => {
  it('toggles district actions', () => {
    const on = toggleAction(emptyDraft(11), lights, null)
    expect(on.actionIds).toEqual([3])
    expect(toggleAction(on, lights, null).actionIds).toEqual([])
  })

  it('picks the default route when the route action is added and clears it on removal', () => {
    const on = toggleAction(emptyDraft(11), routeAction, 2)
    expect(on).toEqual({ districtId: 11, actionIds: [1], routeId: 2 })
    expect(toggleAction(on, routeAction, 2).routeId).toBeNull()
  })

  it('switches route', () => {
    expect(chooseRoute(toggleAction(emptyDraft(11), routeAction, 2), 5).routeId).toBe(5)
  })

  it('builds API items with the right target per scope', () => {
    const draft = toggleAction(toggleAction(emptyDraft(11), routeAction, 2), lights, 2)
    expect(draftItems(draft, actions)).toEqual([{ action_id: 1, route_id: 2 }, { action_id: 3, district_id: 11 }])
  })

  it('sums the cost', () => {
    expect(draftCost(toggleAction(toggleAction(emptyDraft(11), routeAction, 2), lights, 2), actions)).toBe(52_000_000)
  })

  it('names the scenario after its parts', () => {
    const draft = toggleAction(toggleAction(emptyDraft(11), routeAction, 2), lights, 2)
    expect(draftName(draft, actions, routes)).toBe('Маршрут Б + Умные светофоры')
  })

  it('puts a freshly drawn route into the draft', () => {
    expect(withRoute(emptyDraft(11), routeAction, 42)).toEqual({ districtId: 11, actionIds: [1], routeId: 42 })
    const already = toggleAction(emptyDraft(11), routeAction, 2)
    expect(withRoute(already, routeAction, 42)).toEqual({ districtId: 11, actionIds: [1], routeId: 42 })
  })
})
