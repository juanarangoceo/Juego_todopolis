'use client'

// Entrada del jugador en objetos mutables (no estado de React): se leen 60
// veces por segundo dentro de useFrame y re-renderizar por cada tecla sería
// tirar rendimiento.

export const keys = {
  forward: false,
  back: false,
  left: false,
  right: false,
  run: false,
  jump: false,
  brake: false,
}

/** Joystick táctil: x derecha, y adelante, en [-1, 1]. */
export const stick = { x: 0, y: 0, active: false }

/** Cámara: yaw (giro) y pitch (inclinación) en radianes. */
export const look = { yaw: Math.PI, pitch: 0.28, distance: 6.5 }

type ActionName = 'interact' | 'car'
const actionListeners = new Set<(a: ActionName) => void>()

export function onAction(fn: (a: ActionName) => void): () => void {
  actionListeners.add(fn)
  return () => actionListeners.delete(fn)
}

export function fireAction(a: ActionName) {
  actionListeners.forEach((fn) => fn(a))
}

const KEYMAP: Record<string, keyof typeof keys> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: 'jump',
}

export function resetKeys() {
  for (const k of Object.keys(keys) as (keyof typeof keys)[]) keys[k] = false
  stick.x = 0
  stick.y = 0
}

/** Engancha teclado y ratón. `blocked()` dice si hay un panel abierto. */
export function bindDesktopInput(
  canvas: HTMLElement,
  blocked: () => boolean,
  shortcuts: { map: () => void; help: () => void; escape: () => void }
): () => void {
  const down = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return
    if (e.code === 'Escape') return shortcuts.escape()
    if (e.code === 'KeyM') return shortcuts.map()
    if (e.code === 'KeyH') return shortcuts.help()
    if (blocked()) return
    const k = KEYMAP[e.code]
    if (k) {
      keys[k] = true
      if (k === 'jump') keys.brake = true
      e.preventDefault()
    }
    if (e.code === 'KeyE' && !e.repeat) fireAction('interact')
    if (e.code === 'KeyF' && !e.repeat) fireAction('car')
  }
  const up = (e: KeyboardEvent) => {
    const k = KEYMAP[e.code]
    if (k) {
      keys[k] = false
      if (k === 'jump') keys.brake = false
    }
  }
  const blur = () => resetKeys()

  // Mirar con el ratón: con el puntero capturado (clic en el juego) o
  // arrastrando con el botón presionado si el navegador no deja capturarlo.
  let dragging = false
  const mouseDown = (e: MouseEvent) => {
    if (blocked()) return
    dragging = true
    if (e.button === 0 && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock?.()?.catch?.(() => {})
    }
  }
  const mouseUp = () => {
    dragging = false
  }
  const mouseMove = (e: MouseEvent) => {
    if (blocked()) return
    if (document.pointerLockElement === canvas || dragging) {
      look.yaw -= e.movementX * 0.0032
      look.pitch = Math.min(1.1, Math.max(-0.35, look.pitch + e.movementY * 0.0026))
    }
  }
  const wheel = (e: WheelEvent) => {
    if (blocked()) return
    look.distance = Math.min(14, Math.max(3.5, look.distance + e.deltaY * 0.004))
  }

  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
  canvas.addEventListener('mousedown', mouseDown)
  window.addEventListener('mouseup', mouseUp)
  window.addEventListener('mousemove', mouseMove)
  canvas.addEventListener('wheel', wheel, { passive: true })
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', blur)
    canvas.removeEventListener('mousedown', mouseDown)
    window.removeEventListener('mouseup', mouseUp)
    window.removeEventListener('mousemove', mouseMove)
    canvas.removeEventListener('wheel', wheel)
  }
}

export function releasePointer() {
  if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock()
  resetKeys()
}

/** Estado compartido del jugador para minimapa, monedas y NPC. */
export const player = {
  x: 0,
  y: 0,
  z: 0,
  /** Hacia dónde mira el personaje o el carro. */
  heading: 0,
  speed: 0,
  carId: null as string | null,
}
