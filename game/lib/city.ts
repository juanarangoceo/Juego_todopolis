// Plano de Todópolis.
//
// La ciudad es una cuadrícula de 7×7 manzanas separadas por calles. Cada
// manzana pertenece a un distrito y puede ser una tienda (una categoría del
// catálogo), un bar, un parque, la plaza o relleno de edificios. Todo se
// calcula aquí, sin React, para que el minimapa, el mapa grande, las físicas y
// los NPC lean el MISMO plano.

export const GRID = 7
export const CELL = 60 // manzana + calle
export const ROAD = 14
export const BLOCK = CELL - ROAD // 46
export const HALF = (GRID * CELL) / 2 // 210
export const SIDEWALK = 4

export type DistrictId = 'plaza' | 'pasarela' | 'tech' | 'glow' | 'arena' | 'kids' | 'casa' | 'rojo'

export interface District {
  id: DistrictId
  name: string
  tagline: string
  /** Color de marca del distrito (interfaz, toldos, banderines). */
  color: string
  /** Tejas y muros de las casas del distrito. */
  roofs: string[]
  walls: string[]
  /** Altura de las casas: de 2 a 4 pisos según el barrio. */
  towerHeight: [number, number]
}

const CREAM = ['#f3e6c8', '#efdcb5', '#f6ecd9', '#e9d3a8']

export const DISTRICTS: Record<DistrictId, District> = {
  plaza: { id: 'plaza', name: 'Plaza Todópolis', tagline: 'El centro de la ciudad', color: '#f5b73b', roofs: ['#c0563b', '#a8452f'], walls: CREAM, towerHeight: [10, 14] },
  pasarela: { id: 'pasarela', name: 'Pasarela Neón', tagline: 'Ropa, fajas, calzado y accesorios', color: '#e8559a', roofs: ['#b83b6e', '#d0567f', '#8e3a5c'], walls: ['#f8e1e7', '#f3e6c8', '#fbeff1'], towerHeight: [8, 13] },
  tech: { id: 'tech', name: 'Tech Tower', tagline: 'Tecnología y motor', color: '#2d9fd6', roofs: ['#3f6f96', '#2f5878', '#4d7fa8'], walls: ['#e3ebf1', '#d6e2ea', '#efe9dc'], towerHeight: [11, 16] },
  glow: { id: 'glow', name: 'Boulevard Glow', tagline: 'Belleza y bienestar', color: '#9b6bd6', roofs: ['#7a58b0', '#6a4a9c', '#9573c9'], walls: ['#efe6f7', '#f4ecdf', '#e8dcf2'], towerHeight: [8, 12] },
  arena: { id: 'arena', name: 'Arena Pulse', tagline: 'Deportes', color: '#4cae4c', roofs: ['#3f8a3f', '#5a9e44', '#2f7a4a'], walls: CREAM, towerHeight: [7, 11] },
  kids: { id: 'kids', name: 'Kids & Pets Park', tagline: 'Juguetes, bebés y mascotas', color: '#2fbfa0', roofs: ['#e0a13a', '#3fb3a0', '#e46b4f'], walls: ['#fdf1d6', '#e7f5ef', '#fbe7d3'], towerHeight: [6, 9] },
  casa: { id: 'casa', name: 'Casa Nube', tagline: 'Hogar y cocina', color: '#e98b3a', roofs: ['#c0563b', '#b8683a', '#9c4a2f'], walls: CREAM, towerHeight: [7, 11] },
  rojo: { id: 'rojo', name: 'Distrito Rojo', tagline: 'Lencería y vida nocturna · +18', color: '#d6334f', roofs: ['#7e2335', '#9c2e40', '#5e1e2c'], walls: ['#f1dccf', '#e8d0c0', '#f5e3d3'], towerHeight: [8, 12] },
}

// Filas de norte (j=0) a sur (j=6); columnas de oeste (i=0) a este (i=6).
const DISTRICT_MAP: DistrictId[][] = (
  [
    'P P P T T G G',
    'P P P T T G G',
    'P P P T T G G',
    'K K K C A A A',
    'K K K C A A A',
    'H H H R R R R',
    'H H H R R R R',
  ] as const
).map((row) =>
  row.split(' ').map(
    (c) =>
      ({ P: 'pasarela', T: 'tech', G: 'glow', K: 'kids', C: 'plaza', A: 'arena', H: 'casa', R: 'rojo' })[c] as DistrictId
  )
)

export type StoreKind = 'shop' | 'bar'

export interface StoreDef {
  id: string
  kind: StoreKind
  /** Nombre en el letrero. */
  sign: string
  /** Nombre completo del local. */
  name: string
  /** Categorías de Sanity que vende. Vacío en los bares. */
  categories: string[]
  district: DistrictId
  block: [number, number]
  advisor: { name: string; greeting: string }
  /** Pide confirmar mayoría de edad antes de entrar. */
  adult?: boolean
}

export const STORES: StoreDef[] = [
  { id: 'ropa', kind: 'shop', sign: 'ROPA', name: 'Atelier Neón · Ropa', categories: ['moda'], district: 'pasarela', block: [2, 2], advisor: { name: 'Valentina', greeting: 'Hola, soy Valentina. Aquí está toda la ropa de Todópolis. ¿Buscas algo para ti o para regalar?' } },
  { id: 'fajas', kind: 'shop', sign: 'FAJAS', name: 'Silueta · Fajas y moldeadores', categories: ['fajas'], district: 'pasarela', block: [1, 2], advisor: { name: 'Camila', greeting: 'Hola, soy Camila. Te ayudo a encontrar la faja o el moldeador que necesitas.' } },
  { id: 'calzado', kind: 'shop', sign: 'CALZADO', name: 'Paso Firme · Calzado', categories: ['calzado'], district: 'pasarela', block: [2, 1], advisor: { name: 'Mateo', greeting: 'Hola, soy Mateo. Tenis, sandalias, botas: dime qué buscas.' } },
  { id: 'accesorios', kind: 'shop', sign: 'ACCESORIOS', name: 'Brillo · Accesorios', categories: ['accesorios'], district: 'pasarela', block: [1, 1], advisor: { name: 'Sara', greeting: 'Hola, soy Sara. Relojes, bolsos, gafas y joyería, todo aquí.' } },
  { id: 'tecnologia', kind: 'shop', sign: 'TECNOLOGÍA', name: 'Circuito · Tecnología', categories: ['electronica'], district: 'tech', block: [3, 2], advisor: { name: 'Andrés', greeting: 'Hola, soy Andrés. Audífonos, relojes inteligentes, gadgets: pregúntame lo que quieras.' } },
  { id: 'carro-moto', kind: 'shop', sign: 'CARRO Y MOTO', name: 'Pits · Carro y moto', categories: ['carro-moto'], district: 'tech', block: [4, 1], advisor: { name: 'Julián', greeting: 'Hola, soy Julián. Todo para tu carro o tu moto.' } },
  { id: 'belleza', kind: 'shop', sign: 'BELLEZA', name: 'Glow Studio · Belleza', categories: ['belleza'], district: 'glow', block: [5, 2], advisor: { name: 'Lucy', greeting: 'Hola, soy Lucy. Maquillaje, cuidado de la piel y del cabello: ¿qué te quieres consentir hoy?' } },
  { id: 'bienestar', kind: 'shop', sign: 'BIENESTAR', name: 'Calma · Salud y bienestar', categories: ['salud-bienestar'], district: 'glow', block: [5, 1], advisor: { name: 'Daniela', greeting: 'Hola, soy Daniela. Masajeadores, descanso y alivio: cuéntame qué necesitas.' } },
  { id: 'deportes', kind: 'shop', sign: 'DEPORTES', name: 'Pulse · Deportes', categories: ['deportes'], district: 'arena', block: [4, 3], advisor: { name: 'Santiago', greeting: 'Hola, soy Santiago. ¿Entrenas en casa, en el gym o al aire libre?' } },
  { id: 'juguetes', kind: 'shop', sign: 'JUGUETES', name: 'Planeta Juego · Juguetes', categories: ['juguetes'], district: 'kids', block: [2, 3], advisor: { name: 'Mariana', greeting: 'Hola, soy Mariana. ¿Para qué edad es el regalo?' } },
  { id: 'bebes', kind: 'shop', sign: 'BEBÉS', name: 'Nido · Bebés', categories: ['bebes'], district: 'kids', block: [2, 4], advisor: { name: 'Laura', greeting: 'Hola, soy Laura. Todo para el bebé y la mamá.' } },
  { id: 'mascotas', kind: 'shop', sign: 'MASCOTAS', name: 'Huellitas · Mascotas', categories: ['mascotas'], district: 'kids', block: [1, 4], advisor: { name: 'Tomás', greeting: 'Hola, soy Tomás. ¿Perro o gato?' } },
  { id: 'hogar', kind: 'shop', sign: 'HOGAR', name: 'Casa Nube · Hogar', categories: ['hogar'], district: 'casa', block: [2, 5], advisor: { name: 'Paula', greeting: 'Hola, soy Paula. Decoración, orden y limpieza para tu casa.' } },
  { id: 'cocina', kind: 'shop', sign: 'COCINA', name: 'Sazón · Cocina', categories: ['cocina'], district: 'casa', block: [1, 5], advisor: { name: 'Felipe', greeting: 'Hola, soy Felipe. ¿Qué vamos a cocinar hoy?' } },
  { id: 'bazar', kind: 'shop', sign: 'BAZAR', name: 'Bazar Todópolis', categories: ['otros'], district: 'plaza', block: [3, 4], advisor: { name: 'Don Ramiro', greeting: 'Bienvenido al bazar. Aquí llega lo que no cabe en ninguna otra tienda.' } },
  { id: 'lenceria', kind: 'shop', sign: 'LENCERÍA', name: 'Terciopelo · Lencería', categories: ['bienestar-intimo'], district: 'rojo', block: [4, 5], adult: true, advisor: { name: 'Isabella', greeting: 'Hola, soy Isabella. Todo es discreto: el paquete llega sin marcas por fuera.' } },
  { id: 'bar-neon', kind: 'bar', sign: 'BAR NEÓN', name: 'Bar Neón', categories: [], district: 'rojo', block: [5, 5], adult: true, advisor: { name: 'Nico', greeting: 'Bienvenido al Bar Neón. La ruleta de la casa gira una vez al día: prueba suerte.' } },
  { id: 'lounge', kind: 'bar', sign: 'LOUNGE', name: 'Lounge Medianoche', categories: [], district: 'rojo', block: [3, 5], adult: true, advisor: { name: 'Vale', greeting: 'Bienvenido al Lounge. Siéntate, pide la ruleta del día y sigue recorriendo la ciudad.' } },
]

export type Facing = 'n' | 's' | 'e' | 'w'

export interface Lot {
  i: number
  j: number
  x: number
  z: number
  district: DistrictId
  type: 'store' | 'plaza' | 'park' | 'towers'
  store?: StoreDef
}

const PARKS = new Set(['0,3', '6,4', '0,6', '6,0'])

export function blockCenter(i: number, j: number): [number, number] {
  return [(i - (GRID - 1) / 2) * CELL, (j - (GRID - 1) / 2) * CELL]
}

export function districtAt(i: number, j: number): DistrictId {
  return DISTRICT_MAP[j]?.[i] ?? 'plaza'
}

/** Distrito bajo un punto del mundo (las calles cuentan como la manzana más cercana). */
export function districtAtPoint(x: number, z: number): DistrictId {
  const i = Math.round(x / CELL + (GRID - 1) / 2)
  const j = Math.round(z / CELL + (GRID - 1) / 2)
  return districtAt(Math.min(GRID - 1, Math.max(0, i)), Math.min(GRID - 1, Math.max(0, j)))
}

export const LOTS: Lot[] = (() => {
  const lots: Lot[] = []
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const [x, z] = blockCenter(i, j)
      const store = STORES.find((s) => s.block[0] === i && s.block[1] === j)
      const type: Lot['type'] = store ? 'store' : i === 3 && j === 3 ? 'plaza' : PARKS.has(`${i},${j}`) ? 'park' : 'towers'
      lots.push({ i, j, x, z, district: districtAt(i, j), type, store })
    }
  }
  return lots
})()

/** La puerta mira hacia la plaza: la calle más transitada. */
export function storeFacing(s: StoreDef): Facing {
  const [x, z] = blockCenter(s.block[0], s.block[1])
  if (Math.abs(x) > Math.abs(z)) return x > 0 ? 'w' : 'e'
  return z > 0 ? 'n' : 's'
}

export function facingVector(f: Facing): [number, number] {
  return f === 'n' ? [0, -1] : f === 's' ? [0, 1] : f === 'e' ? [1, 0] : [-1, 0]
}

export const STORE_WIDTH = 30
export const STORE_DEPTH = 20

/** Geometría de un local: centro del edificio, punto de la puerta y rotación Y. */
export function storeGeometry(s: StoreDef) {
  const [cx, cz] = blockCenter(s.block[0], s.block[1])
  const f = storeFacing(s)
  const [fx, fz] = facingVector(f)
  const frontOffset = BLOCK / 2 - SIDEWALK // fachada a ras de la acera
  const centerOffset = frontOffset - STORE_DEPTH / 2
  const rotY = Math.atan2(fx, fz)
  return {
    facing: f,
    rotY,
    center: [cx + fx * centerOffset, cz + fz * centerOffset] as [number, number],
    door: [cx + fx * (frontOffset + 1.5), cz + fz * (frontOffset + 1.5)] as [number, number],
    /** Dónde aparece el jugador al salir: en la acera, mirando a la calle. */
    exit: [cx + fx * (frontOffset + 3), cz + fz * (frontOffset + 3)] as [number, number],
    exitYaw: rotY,
    dir: [fx, fz] as [number, number],
  }
}

// ── Relleno determinista ────────────────────────────────────────────────────

export function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }
}

export interface Tower {
  x: number
  z: number
  w: number
  d: number
  h: number
  wall: string
  roof: string
  /** Eje de la cumbrera del techo: a lo largo de x o de z. */
  ridgeX: boolean
  chimney: boolean
  district: DistrictId
}

export const TOWERS: Tower[] = (() => {
  const out: Tower[] = []
  const r = rng(20260929)
  const inner = BLOCK - SIDEWALK * 2 // espacio edificable
  for (const lot of LOTS) {
    const d = DISTRICTS[lot.district]
    const [hMin, hMax] = d.towerHeight
    const h = () => hMin + r() * (hMax - hMin)
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
    const style = () => ({ wall: pick(d.walls), roof: pick(d.roofs), chimney: r() < 0.55 })
    if (lot.type === 'towers') {
      // 2×2 torres con callejón entre ellas.
      const half = inner / 4
      for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        if (r() < 0.12) continue
        const w = half * 2 - 3 - r() * 3
        const dd = half * 2 - 3 - r() * 3
        out.push({ x: lot.x + ox * half, z: lot.z + oz * half, w, d: dd, h: h(), ridgeX: w >= dd, ...style(), district: lot.district })
      }
    } else if (lot.type === 'store' && lot.store) {
      // Una torre detrás del local.
      const g = storeGeometry(lot.store)
      const backDepth = inner - STORE_DEPTH - 2
      const [fx, fz] = g.dir
      const off = -(inner / 2 - backDepth / 2)
      const alongX = fx === 0
      out.push({
        x: lot.x + fx * off,
        z: lot.z + fz * off,
        w: alongX ? inner - 4 : backDepth,
        d: alongX ? backDepth : inner - 4,
        h: h() + 4,
        ridgeX: alongX,
        ...style(),
        district: lot.district,
      })
    }
  }
  return out
})()

// ── Calles ──────────────────────────────────────────────────────────────────

/** Centros de las calles: 8 en X y 8 en Z. */
export const ROAD_LINES: number[] = Array.from({ length: GRID + 1 }, (_, k) => (k - GRID / 2) * CELL)

export const SPAWN: [number, number, number] = [0, 1.2, 15]

/** Puntos de recogida de TodoCoins: aceras y parques, fijos para todos. */
export const COIN_SPOTS: [number, number][] = (() => {
  const r = rng(777)
  const out: [number, number][] = []
  for (let k = 0; k < ROAD_LINES.length; k++) {
    for (let m = 0; m < 9; m++) {
      const along = -HALF + 20 + r() * (HALF * 2 - 40)
      const side = (r() < 0.5 ? -1 : 1) * (ROAD / 2 + 1.6)
      if (r() < 0.5) out.push([ROAD_LINES[k] + side, along])
      else out.push([along, ROAD_LINES[k] + side])
    }
  }
  // Un anillo en la plaza.
  for (let a = 0; a < 12; a++) {
    const t = (a / 12) * Math.PI * 2
    out.push([Math.cos(t) * 14, Math.sin(t) * 14])
  }
  return out
})()

/** Carros estacionados que el jugador puede manejar. */
export const PARKED_CARS: { id: string; x: number; z: number; rot: number; color: string }[] = [
  // A la orilla de la calzada (±5.8 del eje): el tráfico va por ±3.
  { id: 'car-1', x: 8, z: ROAD_LINES[4] + 5.8, rot: Math.PI / 2, color: '#ff2d55' },
  { id: 'car-2', x: -8, z: ROAD_LINES[4] + 5.8, rot: -Math.PI / 2, color: '#35e0ff' },
  { id: 'car-3', x: ROAD_LINES[2] + 5.8, z: -40, rot: 0, color: '#ffd84a' },
  { id: 'car-4', x: ROAD_LINES[5] - 5.8, z: 80, rot: Math.PI, color: '#c28bff' },
  { id: 'car-5', x: -120, z: ROAD_LINES[5] + 5.8, rot: Math.PI / 2, color: '#7dff6a' },
  { id: 'car-6', x: 130, z: ROAD_LINES[2] - 5.8, rot: -Math.PI / 2, color: '#ff4fd8' },
]

/** Calles con tráfico: [eje, índice en ROAD_LINES]. */
export const TRAFFIC_ROADS: ['x' | 'z', number][] = [
  ['z', 1], ['z', 3], ['z', 4], ['z', 6],
  ['x', 1], ['x', 3], ['x', 4], ['x', 6],
]
