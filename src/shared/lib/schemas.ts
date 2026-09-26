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

export const metricValuesSchema = z.partialRecord(metricKeySchema, z.number())
export type MetricValues = z.infer<typeof metricValuesSchema>

export const sphereSchema = z.object({ key: sphereKeySchema, name: z.string() })
export type Sphere = z.infer<typeof sphereSchema>

const lngLat = z.tuple([z.number(), z.number()])
const latLngSchema = z.object({ lat: z.number(), lng: z.number() })
export type LatLng = z.infer<typeof latLngSchema>

export const districtSchema = z.object({
  id: z.number(),
  name: z.string(),
  population: z.number(),
  center: latLngSchema,
  boundary: z.object({ type: z.literal('Polygon'), coordinates: z.array(z.array(lngLat)) }),
  values: metricValuesSchema,
})
export type District = z.infer<typeof districtSchema>

export const districtUpdateSchema = z.object({ id: z.number(), population: z.number(), values: metricValuesSchema })
export type DistrictUpdate = z.infer<typeof districtUpdateSchema>

export const cityResponseSchema = z.object({
  spheres: z.array(sphereSchema),
  metrics: z.array(metricSchema),
  districts: z.array(districtSchema),
  city: metricValuesSchema,
})
export type CityResponse = z.infer<typeof cityResponseSchema>

export const actionEffectSchema = z.object({ metric: metricKeySchema, delta_pct: z.number(), spill: z.number() })
export type ActionEffect = z.infer<typeof actionEffectSchema>

export const actionSchema = z.object({
  id: z.number(),
  key: z.string(),
  name: z.string(),
  sphere: sphereSchema,
  cost: z.number(),
  scope: z.enum(['district', 'route']),
  assumption: z.string(),
  source_url: z.string().nullable(),
  effects: z.array(actionEffectSchema),
})
export type Action = z.infer<typeof actionSchema>
export const actionsSchema = z.array(actionSchema)

export const busRouteSchema = z.object({
  id: z.number(),
  key: z.string(),
  name: z.string(),
  path: z.object({ type: z.literal('LineString'), coordinates: z.array(lngLat) }),
  stops: z.array(z.object({ position: z.number(), lat: z.number(), lng: z.number() })),
  district_ids: z.array(z.number()),
})
export type BusRoute = z.infer<typeof busRouteSchema>
export const routesSchema = z.array(busRouteSchema)

export const routePreviewSchema = z.object({
  path: z.object({ type: z.literal('LineString'), coordinates: z.array(lngLat) }),
  stops: z.array(latLngSchema),
  snapped: z.boolean(),
  district_ids: z.array(z.number()),
})
export type RoutePreview = z.infer<typeof routePreviewSchema>

export const couplingSchema = z.object({ source: metricKeySchema, target: metricKeySchema, factor: z.number() })
export type Coupling = z.infer<typeof couplingSchema>

export const modelResponseSchema = z.object({
  couplings: z.array(couplingSchema),
  constants: z.object({
    default_budget: z.number(),
    diminishing_factor: z.number(),
    neighbor_radius_m: z.number(),
    stop_access_radius_m: z.number(),
    coverage_grid: z.number(),
  }),
})
export type ModelResponse = z.infer<typeof modelResponseSchema>

export const scenarioSchema = z.object({
  id: z.number(),
  name: z.string(),
  source: z.enum(['manual', 'ai']),
  budget: z.number(),
  district_id: z.number().nullable(),
  cost: z.number(),
  items: z.array(z.object({
    id: z.number(),
    action_id: z.number(),
    action_key: z.string(),
    action_name: z.string(),
    district_id: z.number().nullable(),
    route_id: z.number().nullable(),
    quantity: z.number(),
  })),
  created_at: z.string(),
})
export type Scenario = z.infer<typeof scenarioSchema>
export const scenariosSchema = z.array(scenarioSchema)

export const simulationSideSchema = z.object({ city: metricValuesSchema, districts: z.record(z.string(), metricValuesSchema) })
export type SimulationSide = z.infer<typeof simulationSideSchema>

export const simulationResultSchema = z.object({
  before: simulationSideSchema,
  after: simulationSideSchema,
  cost: z.number(),
  budget: z.number(),
  over_budget: z.boolean(),
  assumptions: z.object({
    actions: z.array(z.object({ key: z.string(), name: z.string(), assumption: z.string(), source_url: z.string().nullable() })),
    couplings: z.array(couplingSchema),
  }),
})
export type SimulationResult = z.infer<typeof simulationResultSchema>

export const contributionSchema = z.object({ label: z.string(), deltas: metricValuesSchema })
export type Contribution = z.infer<typeof contributionSchema>

export const scenarioWithResultSchema = z.object({
  scenario: scenarioSchema,
  result: simulationResultSchema,
  contributions: z.array(contributionSchema).optional(), // вклад каждого действия в районе фокуса
})
export type ScenarioWithResult = z.infer<typeof scenarioWithResultSchema>

export const labeledScenarioSchema = scenarioWithResultSchema.extend({ label: z.enum(['A', 'B', 'C']) })
export type LabeledScenario = z.infer<typeof labeledScenarioSchema>

export const compareResponseSchema = z.object({ scenarios: z.array(labeledScenarioSchema), explanation: z.string() })
export type CompareResponse = z.infer<typeof compareResponseSchema>

export const goalSchema = z.object({ metric: metricKeySchema, direction: z.enum(['decrease', 'increase']), weight: z.number() })
export type Goal = z.infer<typeof goalSchema>

export const aiPlanResponseSchema = z.object({
  intent: z.object({
    district_id: z.number(),
    district_name: z.string(),
    district_auto: z.boolean().optional(), // район не назван — движок взял самый проблемный
    goals: z.array(goalSchema),
    budget: z.number(),
    fallback: z.boolean(),
  }),
  stats: z.object({ combinations: z.number(), within_budget: z.number() }),
  scenarios: z.array(labeledScenarioSchema),
  explanation: z.string(),
})
export type AiPlanResponse = z.infer<typeof aiPlanResponseSchema>

export const loginResponseSchema = z.object({ token: z.string(), name: z.string() })
export type LoginResponse = z.infer<typeof loginResponseSchema>

export type ScenarioItemInput =
  | { action_id: number; district_id: number }
  | { action_id: number; route_id: number }

export const complaintCategorySchema = z.enum(['transport', 'climate', 'water', 'social', 'other'])
export type ComplaintCategory = z.infer<typeof complaintCategorySchema>
export const complaintSchema = z.object({
  id: z.number(),
  district_id: z.number(),
  category: complaintCategorySchema,
  text: z.string(),
  status: z.enum(['new', 'accepted', 'resolved', 'hidden']),
  created_at: z.string(),
})
export type Complaint = z.infer<typeof complaintSchema>
export const complaintsSchema = z.array(complaintSchema)
