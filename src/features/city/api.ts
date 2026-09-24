import { request } from '../../shared/lib/api'
import { aiPlanResponseSchema, scenarioWithResultSchema, type AiPlanResponse, type ScenarioItemInput, type ScenarioWithResult } from '../../shared/lib/schemas'

export function createScenario(body: { name: string; district_id: number; items: ScenarioItemInput[] }): Promise<ScenarioWithResult> {
  return request('/scenarios', scenarioWithResultSchema, { method: 'POST', body })
}

export function planWithAi(prompt: string): Promise<AiPlanResponse> {
  return request('/ai/plan', aiPlanResponseSchema, { method: 'POST', body: { prompt } })
}
