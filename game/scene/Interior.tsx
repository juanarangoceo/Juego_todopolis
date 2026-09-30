'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Outlines, Text } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { DISTRICTS, type StoreDef } from '../lib/city'
import { registerInteractable } from '../lib/interactions'
import { productsForStore, useGame } from '../lib/store'
import { makeWoodTexture, useSafeTexture } from '../lib/textures'
import { formatCOP, imageProxyUrl, type GameProduct } from '@/lib/catalog-types'
import { Avatar } from './Avatar'
import { PlayerRig } from './PlayerRig'
import { FONT } from './StoreBuilding'
import { filteredProducts, PAGE_SIZE } from '../lib/shelves'
import { makeToon, toon } from './toon'
import { walkTo } from '../lib/input'
import { CHARACTERS, SKIN_TONES, type CharacterLook } from '../lib/characters'

export const ROOM_W = 32
export const ROOM_D = 24
const ROOM_H = 8
const COLS = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5]
const ROWS = [-3, 4]
export const INTERIOR_SPAWN = { x: 0, z: 8.5, yaw: 0 }
const INK = '#2b1d14'
const WOOD = '#9a6435'
const DARK_WOOD = '#5a3820'

function hash(s: string) {
  let h = 7
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

function onFloorClick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > 8 || e.button !== 0) return
  e.stopPropagation()
  walkTo(e.point.x, e.point.z)
}

/** Pared que se esconde cuando la cámara queda por fuera de ella (vista isométrica). */
function Wall({ position, rotation, width, side, children }: { position: [number, number, number]; rotation: number; width: number; side: 'n' | 's' | 'e' | 'w'; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const { camera } = useThree()
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const p = camera.position
    g.visible =
      side === 's' ? p.z < ROOM_D / 2 - 0.3 : side === 'n' ? p.z > -ROOM_D / 2 + 0.3 : side === 'e' ? p.x < ROOM_W / 2 - 0.3 : p.x > -ROOM_W / 2 + 0.3
  })
  return (
    <group ref={ref} position={position} rotation={[0, rotation, 0]}>
      {children}
    </group>
  )
}

function Shell({ store }: { store: StoreDef }) {
  const color = DISTRICTS[store.district].color
  const exitStore = useGame((s) => s.exitStore)
  const floor = useMemo(() => {
    const t = makeWoodTexture(store.kind === 'bar' ? '#8a5a33' : '#c08a55')
    t.repeat.set(ROOM_W / 4, ROOM_D / 4)
    return makeToon({ map: t })
  }, [store.kind])
  const plaster = store.kind === 'bar' ? '#e3c9a8' : '#f4e8d0'
  useEffect(
    () =>
      registerInteractable({
        id: 'exit',
        x: 0,
        z: ROOM_D / 2 - 0.5,
        radius: 2.4,
        key: 'E',
        label: 'Salir a la ciudad',
        action: exitStore,
      }),
    [exitStore]
  )
  const walls: { p: [number, number, number]; r: number; w: number; side: 'n' | 's' | 'e' | 'w' }[] = [
    { p: [0, 0, -ROOM_D / 2], r: 0, w: ROOM_W, side: 'n' },
    { p: [0, 0, ROOM_D / 2], r: Math.PI, w: ROOM_W, side: 's' },
    { p: [-ROOM_W / 2, 0, 0], r: Math.PI / 2, w: ROOM_D, side: 'w' },
    { p: [ROOM_W / 2, 0, 0], r: -Math.PI / 2, w: ROOM_D, side: 'e' },
  ]
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[ROOM_W, 0.5, ROOM_D]} position={[0, -0.5, 0]} />
        <CuboidCollider args={[ROOM_W / 2, ROOM_H, 0.5]} position={[0, ROOM_H / 2, -ROOM_D / 2 - 0.5]} />
        <CuboidCollider args={[ROOM_W / 2, ROOM_H, 0.5]} position={[0, ROOM_H / 2, ROOM_D / 2 + 0.5]} />
        <CuboidCollider args={[0.5, ROOM_H, ROOM_D / 2]} position={[-ROOM_W / 2 - 0.5, ROOM_H / 2, 0]} />
        <CuboidCollider args={[0.5, ROOM_H, ROOM_D / 2]} position={[ROOM_W / 2 + 0.5, ROOM_H / 2, 0]} />
      </RigidBody>
      {/* piso de tablas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={floor} receiveShadow onClick={onFloorClick}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
      </mesh>
      {/* tapete */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1]} material={toon(color)} receiveShadow onClick={onFloorClick}>
        <planeGeometry args={[6, 12]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 1]} material={toon('#fff4dc')} onClick={onFloorClick}>
        <ringGeometry args={[2.2, 2.45, 4, 1, Math.PI / 4]} />
      </mesh>
      {/* paredes de estuco con zócalo de madera, ventanas y vigas */}
      {walls.map((w, i) => (
        <Wall key={i} position={w.p} rotation={w.r} width={w.w} side={w.side}>
          <mesh position={[0, ROOM_H / 2, 0]} material={toon(plaster)} receiveShadow>
            <planeGeometry args={[w.w, ROOM_H]} />
          </mesh>
          <mesh position={[0, 0.7, 0.05]} material={toon(WOOD)}>
            <boxGeometry args={[w.w, 1.4, 0.1]} />
          </mesh>
          <mesh position={[0, 1.45, 0.08]} material={toon(DARK_WOOD)}>
            <boxGeometry args={[w.w, 0.14, 0.14]} />
          </mesh>
          {[-1, 1].map((sx) => (
            <group key={sx} position={[sx * w.w * 0.3, 4.3, 0.06]}>
              <mesh material={toon(DARK_WOOD)}>
                <boxGeometry args={[3.2, 2.6, 0.12]} />
              </mesh>
              <mesh position={[0, 0, 0.07]} material={toon('#bfe6f5')}>
                <planeGeometry args={[2.7, 2.1]} />
              </mesh>
              <mesh position={[0, 0, 0.09]} material={toon(DARK_WOOD)}>
                <boxGeometry args={[0.12, 2.1, 0.04]} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, ROOM_H - 0.3, 0.2]} material={toon(DARK_WOOD)}>
            <boxGeometry args={[w.w, 0.6, 0.4]} />
          </mesh>
        </Wall>
      ))}
      {/* puerta de salida */}
      <Wall position={[0, 0, ROOM_D / 2 - 0.08]} rotation={Math.PI} width={4} side="s">
        <mesh position={[0, 1.9, 0]} material={toon('#6b3f22')}>
          <boxGeometry args={[3, 3.8, 0.2]} />
        </mesh>
        <Text font={FONT} position={[0, 4.4, 0.12]} fontSize={0.5} color={DARK_WOOD} anchorX="center">
          SALIDA
        </Text>
      </Wall>
      {/* letrero del local */}
      <Wall position={[0, 0, -ROOM_D / 2 + 0.25]} rotation={0} width={10} side="n">
        <mesh position={[0, 6.1, 0]} material={toon('#a8733f')}>
          <boxGeometry args={[Math.max(8, store.sign.length * 1.1), 1.8, 0.2]} />
        </mesh>
        <Text font={FONT} position={[0, 6.1, 0.12]} fontSize={1.1} color="#fff4dc" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="#3b2412">
          {store.sign}
        </Text>
      </Wall>
      {/* lámparas colgantes */}
      {[-8, 0, 8].map((x) => (
        <group key={x} position={[x, ROOM_H - 1.6, 0]}>
          <mesh position={[0, 0.8, 0]} material={toon('#2f2a33')}>
            <cylinderGeometry args={[0.03, 0.03, 1.6, 4]} />
          </mesh>
          <mesh material={toon('#2f2a33')}>
            <coneGeometry args={[0.7, 0.5, 8, 1, true]} />
          </mesh>
          <mesh position={[0, -0.15, 0]}>
            <sphereGeometry args={[0.3, 10, 8]} />
            <meshBasicMaterial color="#ffe7a3" />
          </mesh>
        </group>
      ))}
      <hemisphereLight args={['#fff4e0', '#8a6a4a', 1.3]} />
      <directionalLight position={[8, 16, 10]} intensity={1.6} color="#fff1d6" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={16} shadow-camera-bottom={-16} />
      <pointLight position={[0, 5, 0]} intensity={30} distance={26} color="#ffd9a0" />
    </group>
  )
}

function advisorLook(store: StoreDef): CharacterLook {
  const h = hash(store.id)
  const base = CHARACTERS[h % CHARACTERS.length].look
  return { ...base, top: DISTRICTS[store.district].color, skin: SKIN_TONES[h % SKIN_TONES.length] }
}

function Advisor({ store }: { store: StoreDef }) {
  const setAdvisor = useGame((s) => s.setAdvisor)
  const setSpin = useGame((s) => s.setSpin)
  const isBar = store.kind === 'bar'
  const look = useMemo(() => advisorLook(store), [store])
  useEffect(
    () =>
      registerInteractable({
        id: 'advisor',
        x: 0,
        z: -7.6,
        radius: 3.4,
        key: 'E',
        label: isBar ? `Hablar con ${store.advisor.name}` : `Hablar con ${store.advisor.name}, asesor(a)`,
        action: () => setAdvisor(true),
      }),
    [store, setAdvisor, isBar]
  )
  useEffect(() => {
    if (!isBar) return
    return registerInteractable({
      id: 'wheel',
      x: ROOM_W / 2 - 2.5,
      z: 0,
      radius: 3.6,
      key: 'E',
      label: 'Girar la ruleta del día',
      action: () => setSpin(true),
    })
  }, [isBar, setSpin])
  const talk = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return
    e.stopPropagation()
    walkTo(0, -7.4, () => setAdvisor(true), 1.2)
  }
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[5, 0.6, 0.8]} position={[0, 0.6, -9]} />
      </RigidBody>
      {/* mostrador de madera */}
      <mesh position={[0, 0.6, -9]} material={toon(WOOD)} castShadow receiveShadow onClick={talk}>
        <boxGeometry args={[10, 1.2, 1.6]} />
        <Outlines thickness={0.06} color={INK} />
      </mesh>
      <mesh position={[0, 1.25, -9]} material={toon(DARK_WOOD)} castShadow>
        <boxGeometry args={[10.4, 0.12, 1.9]} />
      </mesh>
      {/* caja registradora y planta */}
      <mesh position={[3, 1.6, -9]} material={toon('#c49a3a')} castShadow>
        <boxGeometry args={[0.9, 0.6, 0.7]} />
        <Outlines thickness={0.04} color={INK} />
      </mesh>
      <mesh position={[-3.8, 1.55, -9]} material={toon('#b8683a')}>
        <cylinderGeometry args={[0.3, 0.24, 0.5, 10]} />
      </mesh>
      <mesh position={[-3.8, 2.1, -9]} material={toon('#5daa4a')}>
        <icosahedronGeometry args={[0.45, 1]} />
        <Outlines thickness={0.04} color={INK} />
      </mesh>
      <group position={[0, 0, -10.4]} onClick={talk}>
        <Avatar look={look} idle />
      </group>
      <Text font={FONT} position={[0, 2.9, -10.4]} fontSize={0.34} color="#fff4dc" anchorX="center" outlineWidth={0.04} outlineColor="#3b2412">
        {store.advisor.name}
      </Text>
    </group>
  )
}

function Kiosk({ product, x, z, color }: { product: GameProduct; x: number; z: number; color: string }) {
  const tex = useSafeTexture(imageProxyUrl(product.image, 512))
  const openProduct = useGame((s) => s.openProduct)
  useEffect(
    () =>
      registerInteractable({
        id: `kiosk-${product.id}`,
        x,
        z: z + 1.1,
        radius: 3.3,
        key: 'E',
        label: `Ver ${product.name}`,
        action: () => openProduct(product),
      }),
    [product, x, z, openProduct]
  )
  const open = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return
    e.stopPropagation()
    openProduct(product)
  }
  const badge = product.isBestSeller ? 'MÁS VENDIDO' : product.isDestacado ? 'ENVÍO GRATIS' : product.isNew ? 'NUEVO' : null
  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.9, 0.5, 0.7]} position={[0, 0.5, 0]} />
      </RigidBody>
      {/* mesa de madera */}
      <mesh position={[0, 0.95, 0]} material={toon(WOOD)} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.14, 1.4]} />
        <Outlines thickness={0.04} color={INK} />
      </mesh>
      {[
        [-0.8, -0.55],
        [0.8, -0.55],
        [-0.8, 0.55],
        [0.8, 0.55],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.45, lz]} material={toon(DARK_WOOD)} castShadow>
          <boxGeometry args={[0.14, 0.9, 0.14]} />
        </mesh>
      ))}
      {/* caballete con la foto del producto */}
      <group position={[0, 2.55, -0.1]} rotation={[-0.08, 0, 0]} onClick={open} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        <mesh position={[0, 0, -0.06]} material={toon(DARK_WOOD)} castShadow>
          <boxGeometry args={[2.4, 2.4, 0.1]} />
          <Outlines thickness={0.05} color={INK} />
        </mesh>
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[2.15, 2.15]} />
          {tex ? <meshBasicMaterial key={tex.uuid} map={tex} side={THREE.DoubleSide} /> : <meshBasicMaterial key="empty" color="#e8dcc4" side={THREE.DoubleSide} />}
        </mesh>
      </group>
      {/* cinta de color del distrito */}
      <mesh position={[0, 1.03, 0.71]} material={toon(color)}>
        <boxGeometry args={[1.9, 0.08, 0.02]} />
      </mesh>
      {/* etiqueta de precio */}
      <group position={[0, 1.35, 0.55]} rotation={[-0.5, 0, 0]}>
        <mesh material={toon('#fff4dc')}>
          <boxGeometry args={[1.7, 0.62, 0.05]} />
          <Outlines thickness={0.03} color={INK} />
        </mesh>
        <Text font={FONT} position={[0, 0.09, 0.04]} fontSize={0.24} color="#3b2412" anchorX="center" anchorY="middle">
          {formatCOP(product.price)}
        </Text>
        <Text font={FONT} position={[0, -0.17, 0.04]} fontSize={0.09} maxWidth={1.55} textAlign="center" color="#6b4a2a" anchorX="center" anchorY="middle">
          {product.name.length > 40 ? product.name.slice(0, 38) + '…' : product.name}
        </Text>
      </group>
      {badge && (
        <Text font={FONT} position={[0, 3.95, -0.1]} fontSize={0.22} color="#f5b73b" anchorX="center" outlineWidth={0.03} outlineColor="#3b2412">
          {badge}
        </Text>
      )}
    </group>
  )
}

function Shelves({ store }: { store: StoreDef }) {
  const color = DISTRICTS[store.district].color
  const catalog = useGame((s) => s.catalog)
  const filter = useGame((s) => s.shelfFilter)
  const page = useGame((s) => s.shelfPage)
  const setPage = useGame((s) => s.setShelfPage)
  const list = useMemo(() => filteredProducts(productsForStore(store, catalog), filter), [store, catalog, filter])
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const visible = list.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  useEffect(() => {
    if (pages <= 1) return
    const offs = [
      registerInteractable({
        id: 'next-page',
        x: -ROOM_W / 2 + 2,
        z: 9,
        radius: 2.4,
        key: 'E',
        label: `Ver más productos (${((current + 1) % pages) + 1} de ${pages})`,
        action: () => setPage((current + 1) % pages),
      }),
    ]
    if (current > 0) {
      offs.push(
        registerInteractable({
          id: 'prev-page',
          x: ROOM_W / 2 - 2,
          z: 9,
          radius: 2.4,
          key: 'E',
          label: `Volver a la página ${current} de ${pages}`,
          action: () => setPage(current - 1),
        })
      )
    }
    return () => offs.forEach((f) => f())
  }, [current, pages, setPage])

  return (
    <group>
      {visible.map((p, i) => (
        <Kiosk key={p.id} product={p} color={color} x={COLS[i % COLS.length]} z={ROWS[Math.floor(i / COLS.length)]} />
      ))}
      {list.length === 0 && (
        <Text font={FONT} position={[0, 3, 0]} fontSize={0.6} color="#3b2412" anchorX="center" maxWidth={16} textAlign="center">
          {catalog ? 'No hay productos con este filtro. Habla con el asesor para ver todo.' : 'Cargando vitrinas…'}
        </Text>
      )}
      {pages > 1 && (
        <>
          <PagePad x={-ROOM_W / 2 + 2} label={`MÁS ${current + 1}/${pages}`} color={color} onGo={() => setPage((current + 1) % pages)} />
          {current > 0 && <PagePad x={ROOM_W / 2 - 2} label="ANTERIOR" color={color} onGo={() => setPage(current - 1)} />}
        </>
      )}
    </group>
  )
}

/** Poste con flecha para cambiar de página de vitrinas. */
function PagePad({ x, label, color, onGo }: { x: number; label: string; color: string; onGo: () => void }) {
  const ring = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt
  })
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8) return
    e.stopPropagation()
    walkTo(x, 9, onGo, 1.5)
  }
  return (
    <group position={[x, 0, 9]} onClick={click}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} material={toon(color)}>
        <ringGeometry args={[1.1, 1.4, 6]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={toon(DARK_WOOD)} castShadow>
        <boxGeometry args={[0.2, 2.4, 0.2]} />
      </mesh>
      <group position={[0, 2.3, 0]} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
        <mesh material={toon('#a8733f')}>
          <boxGeometry args={[2.6, 0.7, 0.12]} />
          <Outlines thickness={0.04} color={INK} />
        </mesh>
        <Text font={FONT} position={[0, 0, 0.08]} fontSize={0.3} color="#fff4dc" anchorX="center" anchorY="middle">
          {label}
        </Text>
      </group>
    </group>
  )
}

function Tavern({ store }: { store: StoreDef }) {
  const color = DISTRICTS[store.district].color
  const wheel = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (wheel.current) wheel.current.rotation.z += dt * 0.3
  })
  const patrons = useMemo(
    () =>
      [
        [-9, -2, 0.6],
        [-10, 3, 2.2],
        [9, 5, -2.4],
        [-3, 3, 0],
        [3, 0, 3],
      ].map(([x, z, r], i) => ({ x, z, r, look: { ...CHARACTERS[(i + 2) % CHARACTERS.length].look, skin: SKIN_TONES[i % SKIN_TONES.length] } })),
    []
  )
  const slices = ['#e8559a', '#f5b73b', '#4aa3d8', '#4cae4c', '#9b6bd6', '#e46b4f', '#2fbfa0', '#fff4dc']
  return (
    <group>
      {/* repisa de botellas */}
      <mesh position={[0, 3, -11.6]} material={toon(DARK_WOOD)}>
        <boxGeometry args={[12, 0.15, 0.6]} />
      </mesh>
      {['#e46b4f', '#4cae4c', '#f5b73b', '#9b6bd6', '#4aa3d8', '#e8559a', '#2fbfa0'].map((c, i) => (
        <mesh key={i} position={[-5 + i * 1.6, 3.5, -11.6]} material={toon(c)}>
          <cylinderGeometry args={[0.16, 0.2, 0.9, 10]} />
          <Outlines thickness={0.03} color={INK} />
        </mesh>
      ))}
      {/* mesas redondas y toneles */}
      {[
        [-8, 1],
        [7, -2],
        [8, 6],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[1.2, 0.6, 1.2]} position={[0, 0.6, 0]} />
          </RigidBody>
          <mesh position={[0, 1, 0]} material={toon(WOOD)} castShadow>
            <cylinderGeometry args={[1.3, 1.3, 0.14, 18]} />
            <Outlines thickness={0.04} color={INK} />
          </mesh>
          <mesh position={[0, 0.5, 0]} material={toon(DARK_WOOD)}>
            <cylinderGeometry args={[0.15, 0.3, 1, 8]} />
          </mesh>
          <mesh position={[0.3, 1.25, 0.2]} material={toon('#f5c542')}>
            <cylinderGeometry args={[0.14, 0.12, 0.35, 10]} />
          </mesh>
        </group>
      ))}
      {[
        [-13.5, -9],
        [-12, -10.2],
        [13.5, -9],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.75, z]} material={toon('#8a5a33')} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 1.5, 14]} />
          <Outlines thickness={0.04} color={INK} />
        </mesh>
      ))}
      {patrons.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.r, 0]}>
          <Avatar look={p.look} idle={i < 3} speedRef={i >= 3 ? { current: 0.7 } : undefined} />
        </group>
      ))}
      {/* rueda de la fortuna */}
      <group position={[ROOM_W / 2 - 0.4, 3.6, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <group ref={wheel}>
          {slices.map((c, i) => (
            <mesh key={i} rotation={[Math.PI / 2, (i / slices.length) * Math.PI * 2, 0]} material={toon(c)}>
              <cylinderGeometry args={[2.2, 2.2, 0.2, 12, 1, false, 0, (Math.PI * 2) / slices.length]} />
            </mesh>
          ))}
        </group>
        <mesh material={toon('#c49a3a')}>
          <torusGeometry args={[2.3, 0.14, 8, 40]} />
        </mesh>
        <mesh position={[0, 0, 0.2]} material={toon(DARK_WOOD)}>
          <cylinderGeometry args={[0.3, 0.3, 0.3, 12]} />
        </mesh>
        <Text font={FONT} position={[0, 3, 0.2]} fontSize={0.45} color={color} anchorX="center" outlineWidth={0.04} outlineColor="#3b2412">
          RULETA DEL DÍA
        </Text>
      </group>
    </group>
  )
}

export function Interior({ store }: { store: StoreDef }) {
  return (
    <group>
      <Shell store={store} />
      <Advisor store={store} />
      {store.kind === 'bar' ? <Tavern store={store} /> : <Shelves store={store} />}
      <PlayerRig spawn={INTERIOR_SPAWN} city={false} />
    </group>
  )
}
