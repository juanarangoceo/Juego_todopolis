'use client'

// Cosas con las que se interactúa al acercarse (puertas, vitrinas, asesores,
// carros). Cada componente registra las suyas; el jugador busca la más cercana
// en cada cuadro y muestra el aviso «E — Entrar a…».

export interface Interactable {
  id: string
  x: number
  z: number
  radius: number
  key: 'E' | 'F'
  label: string
  action: () => void
  /** Solo disponible a pie, o solo desde el carro. */
  when?: 'foot' | 'car' | 'any'
}

const registry = new Map<string, Interactable>()

export function registerInteractable(it: Interactable): () => void {
  registry.set(it.id, it)
  return () => {
    if (registry.get(it.id) === it) registry.delete(it.id)
  }
}

export function nearestInteractable(x: number, z: number, key: 'E' | 'F', inCar: boolean): Interactable | null {
  let best: Interactable | null = null
  let bestD = Infinity
  for (const it of registry.values()) {
    if (it.key !== key) continue
    const when = it.when ?? 'foot'
    if (when === 'foot' && inCar) continue
    if (when === 'car' && !inCar) continue
    const d = Math.hypot(it.x - x, it.z - z)
    if (d <= it.radius && d < bestD) {
      best = it
      bestD = d
    }
  }
  return best
}
