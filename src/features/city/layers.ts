import type { MetricKey } from '../../shared/lib/schemas'

export const LAYERS = [
  { sphere: 'transport', label: 'Транспорт', metric: 'traffic' },
  { sphere: 'climate', label: 'Климат', metric: 'heat' },
  { sphere: 'water', label: 'Вода', metric: 'water_loss' },
  { sphere: 'social', label: 'Соцобъекты', metric: 'social_access' },
] as const satisfies readonly { sphere: string; label: string; metric: MetricKey }[]

export type LayerSphere = (typeof LAYERS)[number]['sphere']
