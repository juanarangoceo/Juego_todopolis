'use client'

import { create } from 'zustand'
import type { CatalogResponse, GameProduct } from '@/lib/catalog-types'
import { emptyProgress, loadPrefs, loadProgress, savePrefs, saveProgress, today, type SavedProgress } from './persist'
import type { PlayerCharacter } from './characters'
import { STORES, type DistrictId, type StoreDef } from './city'

export interface Mission {
  id: string
  title: string
  reward: number
  goal: number
  progress: (p: SavedProgress) => number
}

export const MISSIONS: Mission[] = [
  { id: 'visit3', title: 'Entra a 3 tiendas', reward: 50, goal: 3, progress: (p) => p.visited.length },
  { id: 'coins20', title: 'Recoge 20 TodoCoins en la calle', reward: 40, goal: 20, progress: (p) => p.collectedCoins.length },
  { id: 'drive', title: 'Maneja un carro', reward: 25, goal: 1, progress: (p) => (p.drove ? 1 : 0) },
  { id: 'spin', title: 'Gira la ruleta de un bar', reward: 20, goal: 1, progress: (p) => (p.spunOn === today() ? 1 : 0) },
]

export type Mode = 'city' | 'interior'

export interface Prompt {
  key: string
  text: string
}

interface Toast {
  id: number
  text: string
}

interface GameState {
  started: boolean
  mode: Mode
  storeId: string | null
  /** Dónde reaparece el jugador al volver a la ciudad. */
  returnTo: { x: number; z: number; yaw: number } | null
  catalog: CatalogResponse | null
  catalogError: boolean
  prompt: Prompt | null
  district: DistrictId
  inCar: boolean
  progress: SavedProgress
  character: PlayerCharacter | null
  cameraMode: 'iso' | 'third'
  /** Calidad gráfica: en baja se quitan sombras y contornos de edificios. */
  quality: 'high' | 'low'
  setQuality: (q: 'high' | 'low') => void
  /** Pantalla de selección de personaje abierta. */
  choosing: boolean

  // Paneles
  product: GameProduct | null
  checkoutOpen: boolean
  advisorOpen: boolean
  mapOpen: boolean
  helpOpen: boolean
  spinOpen: boolean
  adultPrompt: StoreDef | null
  toasts: Toast[]

  // Filtro que el asesor aplica a las vitrinas
  shelfFilter: 'all' | 'best' | 'under50' | 'under100'
  shelfPage: number

  start: () => void
  setCharacter: (c: PlayerCharacter) => void
  setChoosing: (v: boolean) => void
  setCameraMode: (m: 'iso' | 'third') => void
  hydrate: () => void
  setCatalog: (c: CatalogResponse | null, error?: boolean) => void
  setPrompt: (p: Prompt | null) => void
  setDistrict: (d: DistrictId) => void
  setInCar: (v: boolean) => void
  enterStore: (store: StoreDef, returnTo: { x: number; z: number; yaw: number }) => void
  confirmAdultAndEnter: () => void
  exitStore: () => void
  openProduct: (p: GameProduct | null) => void
  setCheckout: (v: boolean) => void
  setAdvisor: (v: boolean) => void
  setMap: (v: boolean) => void
  setHelp: (v: boolean) => void
  setSpin: (v: boolean) => void
  setShelfFilter: (f: GameState['shelfFilter']) => void
  setShelfPage: (n: number) => void
  collectCoin: (index: number) => void
  addCoins: (n: number, reason?: string) => void
  markSpun: () => void
  toast: (text: string) => void
  teleport: { x: number; z: number; yaw: number } | null
  requestTeleport: (t: { x: number; z: number; yaw: number } | null) => void
}

let toastId = 0
let pendingAdultReturn: { x: number; z: number; yaw: number } | null = null

export const useGame = create<GameState>((set, get) => {
  /** Guarda y revisa si alguna misión se acaba de cumplir. */
  const commit = (next: SavedProgress) => {
    let p = next
    for (const m of MISSIONS) {
      if (!p.missionsDone.includes(m.id) && m.progress(p) >= m.goal) {
        p = { ...p, coins: p.coins + m.reward, missionsDone: [...p.missionsDone, m.id] }
        get().toast(`Misión cumplida: ${m.title} · +${m.reward} TodoCoins`)
      }
    }
    saveProgress(p)
    set({ progress: p })
  }

  return {
    started: false,
    mode: 'city',
    storeId: null,
    returnTo: null,
    catalog: null,
    catalogError: false,
    prompt: null,
    district: 'plaza',
    inCar: false,
    progress: emptyProgress(),
    character: null,
    cameraMode: 'iso',
    quality: 'high',
    setQuality: (q) => set({ quality: q }),
    choosing: false,
    product: null,
    checkoutOpen: false,
    advisorOpen: false,
    mapOpen: false,
    helpOpen: false,
    spinOpen: false,
    adultPrompt: null,
    toasts: [],
    shelfFilter: 'all',
    shelfPage: 0,
    teleport: null,

    start: () => {
      commit({ ...get().progress, ageConfirmed: true })
      set({ started: true })
    },
    hydrate: () => {
      const prefs = loadPrefs()
      set({ progress: loadProgress(), character: prefs.character, cameraMode: prefs.cameraMode })
    },
    setCharacter: (c) => {
      savePrefs({ character: c, cameraMode: get().cameraMode })
      set({ character: c, choosing: false })
    },
    setChoosing: (v) => set({ choosing: v }),
    setCameraMode: (m) => {
      savePrefs({ character: get().character, cameraMode: m })
      set({ cameraMode: m })
    },
    setCatalog: (c, error = false) => set({ catalog: c, catalogError: error }),
    setPrompt: (p) => {
      const cur = get().prompt
      if (cur?.text === p?.text && cur?.key === p?.key) return
      set({ prompt: p })
    },
    setDistrict: (d) => {
      if (get().district === d) return
      set({ district: d })
    },
    setInCar: (v) => {
      set({ inCar: v })
      if (v && !get().progress.drove) commit({ ...get().progress, drove: true })
    },
    enterStore: (store, returnTo) => {
      if (store.adult && !get().progress.ageConfirmed) {
        pendingAdultReturn = returnTo
        set({ adultPrompt: store })
        return
      }
      const p = get().progress
      if (!p.visited.includes(store.id)) commit({ ...p, visited: [...p.visited, store.id] })
      set({ mode: 'interior', storeId: store.id, returnTo, prompt: null, shelfFilter: 'all', shelfPage: 0, advisorOpen: false })
    },
    confirmAdultAndEnter: () => {
      const store = get().adultPrompt
      commit({ ...get().progress, ageConfirmed: true })
      set({ adultPrompt: null })
      if (store && pendingAdultReturn) get().enterStore(store, pendingAdultReturn)
    },
    exitStore: () =>
      set({ mode: 'city', storeId: null, prompt: null, product: null, checkoutOpen: false, advisorOpen: false, spinOpen: false }),
    openProduct: (p) => set({ product: p, checkoutOpen: false }),
    setCheckout: (v) => set({ checkoutOpen: v }),
    setAdvisor: (v) => set({ advisorOpen: v }),
    setMap: (v) => set({ mapOpen: v }),
    setHelp: (v) => set({ helpOpen: v }),
    setSpin: (v) => set({ spinOpen: v }),
    setShelfFilter: (f) => set({ shelfFilter: f, shelfPage: 0 }),
    setShelfPage: (n) => set({ shelfPage: n }),
    collectCoin: (index) => {
      const p = get().progress
      if (p.collectedCoins.includes(index)) return
      commit({ ...p, coins: p.coins + 5, collectedCoins: [...p.collectedCoins, index] })
    },
    addCoins: (n, reason) => {
      commit({ ...get().progress, coins: get().progress.coins + n })
      if (reason) get().toast(reason)
    },
    markSpun: () => commit({ ...get().progress, spunOn: today() }),
    toast: (text) => {
      const id = ++toastId
      set({ toasts: [...get().toasts, { id, text }].slice(-3) })
      setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3800)
    },
    requestTeleport: (t) => set({ teleport: t }),
  }
})

/** Hay un panel abierto: el personaje no debe moverse con el teclado. */
export function isUiBlocking(s: GameState): boolean {
  return (
    !s.started ||
    !s.character ||
    s.choosing ||
    !!s.product ||
    s.checkoutOpen ||
    s.advisorOpen ||
    s.mapOpen ||
    s.helpOpen ||
    s.spinOpen ||
    !!s.adultPrompt
  )
}

export function currentStore(): StoreDef | null {
  const id = useGame.getState().storeId
  return STORES.find((s) => s.id === id) ?? null
}

export function productsForStore(store: StoreDef, catalog: CatalogResponse | null): GameProduct[] {
  if (!catalog) return []
  return catalog.products.filter((p) => store.categories.includes(p.category))
}
