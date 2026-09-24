import { LAYERS, type LayerSphere } from '../layers'
import styles from './Panels.module.css'

export function LayerSwitch({ active, onChange }: { active: LayerSphere; onChange: (sphere: LayerSphere) => void }) {
  return (
    <div className={styles.chips} role="group" aria-label="Слой карты">
      {LAYERS.map((layer) => (
        <button key={layer.sphere} type="button" className={styles.chip} aria-pressed={layer.sphere === active} onClick={() => onChange(layer.sphere)}>
          {layer.label}
        </button>
      ))}
    </div>
  )
}
