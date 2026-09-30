// Progreso del jugador en ESTE navegador (monedas, misiones, ruleta).
//
// Es una comodidad, no una cuenta: se puede perder al borrar datos del sitio o
// en modo incógnito, y el juego tiene que arrancar igual. Por eso cada lectura
// y escritura va en try/catch.

const KEY = 'todopolis-game-v1'

export interface SavedProgress {
  coins: number
  /** Día (AAAA-MM-DD) al que corresponden `collectedCoins`, `visited` y `missionsDone`. */
  day: string
  collectedCoins: number[]
  visited: string[]
  missionsDone: string[]
  spunOn: string | null
  drove: boolean
  ageConfirmed: boolean
}

export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function emptyProgress(): SavedProgress {
  return { coins: 0, day: today(), collectedCoins: [], visited: [], missionsDone: [], spunOn: null, drove: false, ageConfirmed: false }
}

export function loadProgress(): SavedProgress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProgress()
    const p = { ...emptyProgress(), ...JSON.parse(raw) } as SavedProgress
    // Día nuevo: las monedas del mapa y las misiones vuelven a salir.
    if (p.day !== today()) {
      return { ...p, day: today(), collectedCoins: [], visited: [], missionsDone: [], drove: false }
    }
    return p
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(p: SavedProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* sin almacenamiento: el progreso dura lo que dure la pestaña */
  }
}

// ── Preferencias: personaje y cámara ────────────────────────────────────────

const PREFS_KEY = 'todopolis-prefs-v1'

export interface Prefs {
  character: { id: string; name: string; skin: string } | null
  cameraMode: 'iso' | 'third'
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { character: null, cameraMode: 'iso', ...JSON.parse(raw) }
  } catch {
    /* sin almacenamiento */
  }
  return { character: null, cameraMode: 'iso' }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p))
  } catch {
    /* sin almacenamiento */
  }
}
