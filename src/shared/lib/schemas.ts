import { z } from 'zod'

export const metricKeySchema = z.enum([
  'traffic', 'transit_coverage', 'travel_time', 'co2', 'heat',
  'air', 'water_loss', 'social_access', 'satisfaction',
])
export type MetricKey = z.infer<typeof metricKeySchema>

export const sphereKeySchema = z.enum(['transport', 'climate', 'water', 'social', 'summary'])
export type SphereKey = z.infer<typeof sphereKeySchema>

export const metricSchema = z.object({
  key: metricKeySchema,
  name: z.string(),
  unit: z.string(),
  sphere: sphereKeySchema,
  lower_is_better: z.boolean(),
  min: z.number(),
  max: z.number(),
  is_computed: z.boolean(),
})
export type Metric = z.infer<typeof metricSchema>
