import { request } from '../../shared/lib/api'
import { actionSchema, loginResponseSchema, type Action, type ActionEffect, type LoginResponse } from '../../shared/lib/schemas'

export function login(email: string, password: string): Promise<LoginResponse> {
  return request('/login', loginResponseSchema, { method: 'POST', body: { email, password } })
}

export function updateAction(id: number, body: { cost: number; effects: ActionEffect[] }, token: string): Promise<Action> {
  return request(`/actions/${id}`, actionSchema, { method: 'PUT', body, token })
}
