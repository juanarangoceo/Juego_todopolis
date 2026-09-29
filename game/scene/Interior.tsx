'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { DISTRICTS, type StoreDef } from '../lib/city'
import { registerInteractable } from '../lib/interactions'
import { productsForStore, useGame } from '../lib/store'
import { useSafeTexture } from '../lib/textures'
import { formatCOP, imageProxyUrl, type GameProduct } from '@/lib/catalog-types'
import { Avatar } from './Avatar'
import { PlayerRig } from './PlayerRig'
import { FONT } from './StoreBuilding'
import { filteredProducts, PAGE_SIZE } from '../lib/shelves'

export const ROOM_W = 32
export const ROOM_D = 24
const ROOM_H = 8
const COLS = [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5]
const ROWS = [-3, 4]
export const INTERIOR_SPAWN = { x: 0, z: 8.5, yaw: 0 }

function Shell({ store }: { store: StoreDef }) {
  const color = DISTRICTS[store.district].color
  const exitStore = useGame((s) => s.exitStore)
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
  const walls: { p: [number, number, number]; r: number; w: number }[] = [
    { p: [0, ROOM_H / 2, -ROOM_D / 2], r: 0, w: ROOM_W },
    { p: [0, ROOM_H / 2, ROOM_D / 2], r: Math.PI, w: ROOM_W },
    { p: [-ROOM_W / 2, ROOM_H / 2, 0], r: Math.PI / 2, w: ROOM_D },
    { p: [ROOM_W / 2, ROOM_H / 2, 0], r: -Math.PI / 2, w: ROOM_D },
  ]
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[ROOM_W, 0.5, ROOM_D]} position={[0, -0.5, 0]} />
        <CuboidCollider args={[ROOM_W / 2, ROOM_H, 0.5]} position={[0, ROOM_H / 2, -ROOM_D / 2 - 0.5]} />
        <CuboidCollider args={[ROOM_W / 2, ROOM_H, 0.5]} position={[0, ROOM_H / 2, ROOM_D / 2 + 0.5]} />
        <CuboidCollider args={[0.5, ROOM_H, ROOM_D / 2]} position={[-ROOM_W / 2 - 0.5, ROOM_H / 2, 0]} />
        <CuboidCollider args={[0.5, ROOM_H, ROOM_D / 2]} position={[ROOM_W / 2 + 0.5, ROOM_H / 2, 0]} />
        <CuboidCollider args={[ROOM_W, 0.5, ROOM_D]} position={[0, ROOM_H + 0.5, 0]} />
      </RigidBody>
      {/* piso brillante */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#120f22" metalness={0.6} roughness={0.38} />
      </mesh>
      <gridHelper args={[ROOM_W, 16, color, '#2b2450']} position={[0, 0.01, 0]} />
      {/* paredes de vidrio */}
      {walls.map((w, i) => (
        <group key={i} position={w.p} rotation={[0, w.r, 0]}>
          <mesh>
            <planeGeometry args={[w.w, ROOM_H]} />
            <meshStandardMaterial color="#1c1738" metalness={0.5} roughness={0.2} emissive={color} emissiveIntensity={0.05} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -ROOM_H / 2 + 0.3, 0.02]}>
            <planeGeometry args={[w.w, 0.08]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <mesh position={[0, ROOM_H / 2 - 0.3, 0.02]}>
            <planeGeometry args={[w.w, 0.08]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* techo con paneles de luz */}
      <mesh position={[0, ROOM_H - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#0d0b18" side={THREE.DoubleSide} />
      </mesh>
      {[-8, 0, 8].map((x) => (
        <mesh key={x} position={[x, ROOM_H - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4, ROOM_D - 4]} />
          <meshBasicMaterial color="#fff6ff" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* puerta de salida */}
      <mesh position={[0, 2, ROOM_D / 2 - 0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[3.6, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <Text font={FONT} position={[0, 4.6, ROOM_D / 2 - 0.1]} rotation={[0, Math.PI, 0]} fontSize={0.6} color="#ffffff" anchorX="center">
        SALIDA
      </Text>
      {/* letrero del local */}
      <Text font={FONT} position={[0, 6, -ROOM_D / 2 + 0.1]} fontSize={1.6} color={color} anchorX="center" anchorY="middle" material-toneMapped={false}>
        {store.sign}
      </Text>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#ffffff', color, 0.6]} />
      <pointLight position={[0, 6, 0]} intensity={60} distance={30} color="#ffffff" />
      <pointLight position={[0, 4, -9]} intensity={25} distance={16} color={color} />
    </group>
  )
}

function Advisor({ store }: { store: StoreDef }) {
  const color = DISTRICTS[store.district].color
  const setAdvisor = useGame((s) => s.setAdvisor)
  const setSpin = useGame((s) => s.setSpin)
  const isBar = store.kind === 'bar'
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
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[5, 0.6, 0.8]} position={[0, 0.6, -9]} />
      </RigidBody>
      {/* mostrador */}
      <mesh position={[0, 0.6, -9]}>
        <boxGeometry args={[10, 1.2, 1.6]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.35} roughness={0.05} metalness={0.2} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 1.22, -8.2]}>
        <boxGeometry args={[10, 0.05, 0.05]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <group position={[0, 0, -10.4]}>
        <Avatar color={color} idle />
      </group>
      <Text font={FONT} position={[0, 2.5, -10.4]} fontSize={0.32} color="#ffffff" anchorX="center">
        {store.advisor.name}
      </Text>
    </group>
  )
}

function Kiosk({ product, x, z, color }: { product: GameProduct; x: number; z: number; color: string }) {
  const tex = useSafeTexture(imageProxyUrl(product.image, 512))
  const openProduct = useGame((s) => s.openProduct)
  const img = useRef<THREE.Group>(null)
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
  useFrame(({ clock }) => {
    if (img.current) img.current.position.y = 2.75 + Math.sin(clock.elapsedTime * 1.2 + x) * 0.06
  })
  const badge = product.isBestSeller ? 'MÁS VENDIDO' : product.isDestacado ? 'ENVÍO GRATIS' : product.isNew ? 'NUEVO' : null
  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.8, 0.55, 0.8]} position={[0, 0.55, 0]} />
      </RigidBody>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.6, 1.1, 1.6]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.28} roughness={0.05} metalness={0.1} emissive={color} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, 1.11, 0]}>
        <boxGeometry args={[1.62, 0.03, 1.62]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <group
        ref={img}
        position={[0, 2.75, 0]}
        onClick={(e) => {
          e.stopPropagation()
          openProduct(product)
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[2.35, 2.35]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <planeGeometry args={[2.2, 2.2]} />
          {tex ? (
            <meshBasicMaterial key={tex.uuid} map={tex} toneMapped={false} side={THREE.DoubleSide} />
          ) : (
            <meshBasicMaterial key="empty" color="#231d40" side={THREE.DoubleSide} />
          )}
        </mesh>
      </group>
      <Text font={FONT} position={[0, 1.45, 0.82]} fontSize={0.34} color="#ffffff" anchorX="center" anchorY="middle" material-toneMapped={false}>
        {formatCOP(product.price)}
      </Text>
      <Text font={FONT} position={[0, 0.86, 0.82]} fontSize={0.13} maxWidth={1.5} textAlign="center" color="#e9e4ff" anchorX="center" anchorY="middle" lineHeight={1.1}>
        {product.name.length > 48 ? product.name.slice(0, 46) + '…' : product.name}
      </Text>
      {badge && (
        <Text font={FONT} position={[0, 4.05, 0]} fontSize={0.2} color="#ffd84a" anchorX="center" material-toneMapped={false}>
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
        <Text font={FONT} position={[0, 3, 0]} fontSize={0.6} color="#ffffff" anchorX="center" maxWidth={16} textAlign="center">
          {catalog ? 'No hay productos con este filtro. Habla con el asesor para ver todo.' : 'Cargando vitrinas…'}
        </Text>
      )}
      {pages > 1 && (
        <>
          <PagePad x={-ROOM_W / 2 + 2} label={`MÁS  ${current + 1}/${pages}`} color={color} />
          {current > 0 && <PagePad x={ROOM_W / 2 - 2} label="ANTERIOR" color={color} />}
        </>
      )}
    </group>
  )
}

function PagePad({ x, label, color }: { x: number; label: string; color: string }) {
  const ring = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt
  })
  return (
    <group position={[x, 0, 9]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[1.1, 1.35, 6]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <Text font={FONT} position={[0, 2.4, 0]} fontSize={0.4} color="#ffffff" anchorX="center" rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
        {label}
      </Text>
    </group>
  )
}

function BarDecor({ store }: { store: StoreDef }) {
  const color = DISTRICTS[store.district].color
  const floor = useRef<THREE.InstancedMesh>(null)
  const wheel = useRef<THREE.Group>(null)
  const palette = useMemo(() => ['#ff2d55', '#ff4fd8', '#c28bff', '#35e0ff', '#ffd84a'].map((c) => new THREE.Color(c)), [])
  const tile = useMemo(() => new THREE.Object3D(), [])
  const tmp = useMemo(() => new THREE.Color(), [])
  useFrame(({ clock }, dt) => {
    const m = floor.current
    if (m) {
      const t = Math.floor(clock.elapsedTime * 2)
      for (let i = 0; i < 36; i++) {
        tmp.copy(palette[(i * 7 + t * (1 + (i % 3))) % palette.length])
        m.setColorAt(i, tmp)
      }
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    if (wheel.current) wheel.current.rotation.z += dt * 0.3
  })
  useEffect(() => {
    const m = floor.current
    if (!m) return
    for (let i = 0; i < 36; i++) {
      tile.position.set(((i % 6) - 2.5) * 1.6, 0.02, (Math.floor(i / 6) - 2.5) * 1.6 + 1)
      tile.rotation.set(-Math.PI / 2, 0, 0)
      tile.updateMatrix()
      m.setMatrixAt(i, tile.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [tile])
  const bottleColors = ['#ff2d55', '#35e0ff', '#ffd84a', '#7dff6a', '#c28bff', '#ff4fd8']
  return (
    <group>
      {/* pista de baile */}
      <instancedMesh ref={floor} args={[undefined, undefined, 36]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.7} />
      </instancedMesh>
      {/* repisa de botellas */}
      {bottleColors.flatMap((c, i) =>
        [0, 1].map((row) => (
          <mesh key={`${i}-${row}`} position={[-4 + i * 1.6 + row * 0.5, 2.2 + row * 1, -11.7]}>
            <cylinderGeometry args={[0.14, 0.18, 0.8, 10]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.8} transparent opacity={0.85} />
          </mesh>
        ))
      )}
      {/* clientes */}
      {[
        [-9, -2, '#ff4fd8', 0.6],
        [-10, 3, '#35e0ff', 2.2],
        [9, 5, '#ffd84a', -2.4],
        [-3, 2, '#7dff6a', 0],
        [3, 0, '#c28bff', 3],
      ].map(([x, z, c, r], i) => (
        <group key={i} position={[x as number, 0, z as number]} rotation={[0, r as number, 0]}>
          <Avatar color={c as string} skin={['#c68e6a', '#f1c6a8', '#8d5a3b'][i % 3]} idle={i > 2 ? false : true} speedRef={i > 2 ? { current: 0.6 } : undefined} />
        </group>
      ))}
      {/* ruleta */}
      <group position={[ROOM_W / 2 - 0.4, 3.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <group ref={wheel} rotation={[0, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[2.2, 2.2, 0.2, 10]} />
            <meshStandardMaterial color="#1b1636" emissive={color} emissiveIntensity={0.3} />
          </mesh>
        </group>
        <mesh>
          <torusGeometry args={[2.3, 0.08, 8, 48]} />
          <meshBasicMaterial color="#ffd84a" toneMapped={false} />
        </mesh>
        <Text font={FONT} position={[0, 3, 0.2]} fontSize={0.45} color="#ffd84a" anchorX="center" material-toneMapped={false}>
          RULETA DEL DÍA
        </Text>
      </group>
      <pointLight position={[0, 5, 1]} intensity={40} distance={20} color={color} />
    </group>
  )
}

export function Interior({ store }: { store: StoreDef }) {
  const color = DISTRICTS[store.district].color
  return (
    <group>
      <Shell store={store} />
      <Advisor store={store} />
      {store.kind === 'bar' ? <BarDecor store={store} /> : <Shelves store={store} />}
      <PlayerRig spawn={INTERIOR_SPAWN} city={false} color={color === '#ff4fd8' ? '#35e0ff' : '#ff4fd8'} />
    </group>
  )
}
