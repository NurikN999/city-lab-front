import { z } from 'zod'
import { request } from '../../shared/lib/api'
import {
  aiPlanResponseSchema, busRouteSchema, routePreviewSchema, scenarioWithResultSchema, simulationResultSchema,
  type AiPlanResponse, type BusRoute, type LatLng, type RoutePreview, type ScenarioItemInput, type ScenarioWithResult, type SimulationResult,
} from '../../shared/lib/schemas'

export function createScenario(body: { name: string; district_id: number; items: ScenarioItemInput[] }): Promise<ScenarioWithResult> {
  return request('/scenarios', scenarioWithResultSchema, { method: 'POST', body })
}

export function planWithAi(prompt: string): Promise<AiPlanResponse> {
  return request('/ai/plan', aiPlanResponseSchema, { method: 'POST', body: { prompt } })
}

export function previewRoute(points: LatLng[], signal?: AbortSignal): Promise<RoutePreview> {
  return request('/routes/preview', routePreviewSchema, { method: 'POST', body: { points }, signal })
}

export function saveRoute(name: string, points: LatLng[]): Promise<BusRoute> {
  return request('/routes', busRouteSchema, { method: 'POST', body: { name, points } })
}

const previewSchema = z.object({ result: simulationResultSchema })

/** Пересчёт без сохранения — для конструктора, пока объект тащат по карте. */
export function previewScenario(items: ScenarioItemInput[], signal?: AbortSignal): Promise<SimulationResult> {
  return request('/scenarios/preview', previewSchema, { method: 'POST', body: { items }, signal }).then((r) => r.result)
}
