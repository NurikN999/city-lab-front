// Здания Актау из OpenStreetMap для конструктора: у каждого дома свой OSM-id (в тайлах дома склеены группами).
// Запуск: node scripts/fetch-buildings.mjs  →  public/data/aktau-buildings.geojson
import { writeFile } from 'node:fs/promises'

const BBOX = '43.60,51.08,43.73,51.28' // как у районов и остановок
const QUERY = `[out:json][timeout:120];way["building"](${BBOX});out geom;`
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const round = (x) => Math.round(x * 1e5) / 1e5 // ~1 м

function heightOf(tags) {
  const h = parseFloat(tags.height)
  if (Number.isFinite(h) && h > 0) return Math.round(h)
  const levels = parseFloat(tags['building:levels'])
  if (Number.isFinite(levels) && levels > 0) return Math.round(levels * 3)
  return 9
}

let data
for (const url of MIRRORS) {
  const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: QUERY }), headers: { 'User-Agent': 'aktau-city-lab/1.0' } })
  if (res.ok) { data = await res.json(); break }
  console.warn(`${url}: ${res.status}`)
}
if (!data) throw new Error('Overpass недоступен')

const features = data.elements
  .filter((w) => w.type === 'way' && w.geometry?.length >= 4)
  .map((w) => ({
    type: 'Feature',
    id: w.id,
    geometry: { type: 'Polygon', coordinates: [w.geometry.map((p) => [round(p.lon), round(p.lat)])] },
    properties: { h: heightOf(w.tags ?? {}) },
  }))

await writeFile('public/data/aktau-buildings.geojson', JSON.stringify({ type: 'FeatureCollection', features }))
console.log(`Зданий: ${features.length}`)
