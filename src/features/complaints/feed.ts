import type { Complaint, ComplaintCategory } from '../../shared/lib/schemas'
import type { DistrictAlert } from '../city/geo'

export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  transport: 'Транспорт',
  climate: 'Жара и воздух',
  water: 'Вода',
  social: 'Соцобъекты',
  other: 'Другое',
}

/** Сколько активных жалоб у каждого района — самые горячие первыми. */
export function alertsByDistrict(complaints: Complaint[]): DistrictAlert[] {
  const counts = new Map<number, number>()
  for (const c of complaints) counts.set(c.district_id, (counts.get(c.district_id) ?? 0) + 1)
  return [...counts].map(([districtId, count]) => ({ districtId, count })).sort((a, b) => b.count - a.count)
}

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  return `${Math.floor(minutes / 60)} ч назад`
}
