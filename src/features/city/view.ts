import type { AiPlanResponse, ScenarioWithResult } from '../../shared/lib/schemas'

export type View =
  | { mode: 'explore' }
  | { mode: 'district'; districtId: number }
  | { mode: 'result'; districtId: number; data: ScenarioWithResult }
  | { mode: 'ai'; data: AiPlanResponse }
  | { mode: 'draw'; districtId: number }

/** Ответ SIMULATE применяется, только если пользователь всё ещё в том же районе — иначе поздний ответ не выдёргивает его из текущего. */
export function afterSimulation(view: View, districtId: number, data: ScenarioWithResult): View {
  return view.mode === 'district' && view.districtId === districtId ? { mode: 'result', districtId, data } : view
}

/** Результаты City AI не перекрывают начатую работу с районом или рисование маршрута. */
export function afterAiPlan(view: View, data: AiPlanResponse): View {
  return view.mode === 'district' || view.mode === 'draw' ? view : { mode: 'ai', data }
}
