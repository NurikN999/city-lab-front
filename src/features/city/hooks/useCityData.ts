import { useFetch, type FetchState } from '../../../shared/hooks/useFetch'
import { actionsSchema, cityResponseSchema, routesSchema, type Action, type BusRoute, type CityResponse } from '../../../shared/lib/schemas'

export type CityData = { city: CityResponse; actions: Action[]; routes: BusRoute[] }

export function useCityData(): FetchState<CityData> {
  const city = useFetch('/city', cityResponseSchema)
  const actions = useFetch('/actions', actionsSchema)
  const routes = useFetch('/routes', routesSchema)

  for (const state of [city, actions, routes]) {
    if (state.status === 'error') return state
  }
  if (city.status !== 'success' || actions.status !== 'success' || routes.status !== 'success') return { status: 'loading' }
  return { status: 'success', data: { city: city.data, actions: actions.data, routes: routes.data } }
}
