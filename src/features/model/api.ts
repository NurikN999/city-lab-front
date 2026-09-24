import { request } from '../../shared/lib/api'
import {
  actionSchema, districtUpdateSchema, loginResponseSchema,
  type Action, type ActionEffect, type DistrictUpdate, type LoginResponse, type MetricValues,
} from '../../shared/lib/schemas'

export function login(email: string, password: string): Promise<LoginResponse> {
  return request('/login', loginResponseSchema, { method: 'POST', body: { email, password } })
}

export function updateAction(id: number, body: { cost: number; effects: ActionEffect[] }, token: string): Promise<Action> {
  return request(`/actions/${id}`, actionSchema, { method: 'PUT', body, token })
}

export function updateDistrict(id: number, body: { population: number; values: MetricValues }, token: string): Promise<DistrictUpdate> {
  return request(`/districts/${id}`, districtUpdateSchema, { method: 'PUT', body, token })
}
