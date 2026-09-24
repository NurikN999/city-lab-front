import type { Action, BusRoute, ScenarioItemInput } from '../../shared/lib/schemas'

export type Draft = { districtId: number; actionIds: number[]; routeId: number | null }

export function emptyDraft(districtId: number): Draft {
  return { districtId, actionIds: [], routeId: null }
}

export function toggleAction(draft: Draft, action: Action, defaultRouteId: number | null): Draft {
  const isOn = draft.actionIds.includes(action.id)
  const actionIds = isOn ? draft.actionIds.filter((id) => id !== action.id) : [...draft.actionIds, action.id]
  if (action.scope !== 'route') return { ...draft, actionIds }
  return { ...draft, actionIds, routeId: isOn ? null : (draft.routeId ?? defaultRouteId) }
}

export function chooseRoute(draft: Draft, routeId: number): Draft {
  return { ...draft, routeId }
}

function selectedActions(draft: Draft, actions: Action[]): Action[] {
  return draft.actionIds.flatMap((id) => actions.filter((a) => a.id === id))
}

export function draftItems(draft: Draft, actions: Action[]): ScenarioItemInput[] {
  return selectedActions(draft, actions).flatMap((action): ScenarioItemInput[] => {
    if (action.scope === 'district') return [{ action_id: action.id, district_id: draft.districtId }]
    return draft.routeId === null ? [] : [{ action_id: action.id, route_id: draft.routeId }]
  })
}

export function draftCost(draft: Draft, actions: Action[]): number {
  return selectedActions(draft, actions).reduce((sum, action) => sum + action.cost, 0)
}

export function draftName(draft: Draft, actions: Action[], routes: BusRoute[]): string {
  return selectedActions(draft, actions)
    .map((action) => (action.scope === 'route' ? (routes.find((r) => r.id === draft.routeId)?.name ?? action.name) : action.name))
    .join(' + ')
    .slice(0, 120)
}
