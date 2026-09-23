import { useEffect, useRef } from 'react'
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import styles from './CityMap.module.css'

// MapLibre 6 ищет воркер рядом с собой через import.meta.url,
// а Vite переносит библиотеку в .vite/deps — поэтому отдаём собранный Vite воркер явно
setWorkerUrl(workerUrl)

// Liberty уже содержит слой building-3d (fill-extrusion с zoom 14)
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const AKTAU_CENTER: [number, number] = [51.165, 43.655]

export function CityMap() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const map = new MapLibreMap({
      container: containerRef.current!,
      style: STYLE_URL,
      center: AKTAU_CENTER,
      zoom: 14.5,
      pitch: 60,
      bearing: -30,
      maxPitch: 75,
    })
    map.addControl(new NavigationControl({ visualizePitch: true }))

    return () => map.remove()
  }, [])

  return <div ref={containerRef} className={styles.map} />
}
