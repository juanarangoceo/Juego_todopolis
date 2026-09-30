'use client'

import { useEffect, useMemo } from 'react'
import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { DISTRICTS, STORE_DEPTH, STORE_WIDTH, storeGeometry, type StoreDef } from '../lib/city'
import { registerInteractable } from '../lib/interactions'
import { productsForStore, useGame } from '../lib/store'
import { useSafeTexture, makeStripeTexture } from '../lib/textures'
import { walkTo } from '../lib/input'
import { imageProxyUrl, type GameProduct } from '@/lib/catalog-types'
import { makeOutline, makeToon, roofGeometry, toon } from './toon'

export const FONT = '/fonts/montserrat-800.woff'

const H_SHOP = 9
const H_BAR = 8
const WOOD = '#8a5a33'
const DARK_WOOD = '#5a3820'

/** Vitrina de la fachada con un producto real, en marco de madera. */
function Poster({ product, position }: { product: GameProduct; position: [number, number, number] }) {
  const tex = useSafeTexture(imageProxyUrl(product.image, 256))
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.05]} material={toon(DARK_WOOD)}>
        <boxGeometry args={[5.2, 4.6, 0.3]} />
      </mesh>
      <mesh position={[0, 0, 0.11]}>
        <planeGeometry args={[4.6, 4]} />
        {tex ? <meshBasicMaterial key={tex.uuid} map={tex} /> : <meshBasicMaterial key="empty" color="#cfe3ee" />}
      </mesh>
      {/* jardinera bajo la vitrina */}
      <mesh position={[0, -2.6, 0.35]} material={toon(WOOD)} castShadow>
        <boxGeometry args={[4.8, 0.6, 0.7]} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[-2 + i * 0.66, -2.15, 0.4]} material={toon(['#ff6f91', '#ffd84a', '#ffffff', '#b690ff'][i % 4])}>
          <sphereGeometry args={[0.22, 8, 6]} />
        </mesh>
      ))}
    </group>
  )
}

export function StoreBuilding({ store }: { store: StoreDef }) {
  const g = useMemo(() => storeGeometry(store), [store])
  const d = DISTRICTS[store.district]
  const color = d.color
  const enterStore = useGame((s) => s.enterStore)
  const catalog = useGame((s) => s.catalog)
  const height = store.kind === 'bar' ? H_BAR : H_SHOP
  const front = STORE_DEPTH / 2

  const mats = useMemo(() => {
    const stripes = makeStripeTexture(color)
    stripes.repeat.set(10, 1)
    return {
      wall: makeToon({ color: store.kind === 'bar' ? '#e3c9a8' : d.walls[0], windows: true, cutout: true }),
      roof: makeToon({ color: d.roofs[0], shingles: true, cutout: true }),
      line: makeOutline(true),
      awning: makeToon({ map: stripes, side: THREE.DoubleSide }),
    }
  }, [color, d, store.kind])
  const roofGeo = useMemo(() => roofGeometry(), [])

  const posters = useMemo(() => {
    const list = productsForStore(store, catalog).filter((p) => p.image)
    return [...list.filter((p) => p.isBestSeller), ...list.filter((p) => !p.isBestSeller)].slice(0, 2)
  }, [store, catalog])

  const returnTo = useMemo(() => ({ x: g.exit[0], z: g.exit[1], yaw: Math.atan2(-g.dir[0], -g.dir[1]) }), [g])

  useEffect(
    () =>
      registerInteractable({
        id: `door-${store.id}`,
        x: g.door[0],
        z: g.door[1],
        radius: 4.2,
        key: 'E',
        label: `Entrar a ${store.name}`,
        action: () => enterStore(store, returnTo),
      }),
    [store, g, enterStore, returnTo]
  )

  // Clic en el local: caminar hasta la puerta y entrar.
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 8 || e.button !== 0) return
    e.stopPropagation()
    walkTo(g.door[0], g.door[1], () => enterStore(store, returnTo), 1.8)
  }

  const rh = 6
  return (
    <group position={[g.center[0], 0, g.center[1]]} rotation={[0, g.rotY, 0]} onClick={onClick}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[STORE_WIDTH / 2, height / 2, STORE_DEPTH / 2]} position={[0, height / 2, 0]} />
      </RigidBody>

      {/* cuerpo y techo de dos aguas, con contorno */}
      <mesh position={[0, height / 2, 0]} material={mats.wall} castShadow receiveShadow>
        <boxGeometry args={[STORE_WIDTH, height, STORE_DEPTH]} />
      </mesh>
      <mesh position={[0, height / 2, 0]} material={mats.line}>
        <boxGeometry args={[STORE_WIDTH + 0.3, height + 0.3, STORE_DEPTH + 0.3]} />
      </mesh>
      <mesh position={[0, height, 0]} rotation={[0, Math.PI / 2, 0]} scale={[STORE_DEPTH * 1.12, rh, STORE_WIDTH * 1.04]} geometry={roofGeo} material={mats.roof} castShadow />
      <mesh position={[0, height - 0.15, 0]} rotation={[0, Math.PI / 2, 0]} scale={[STORE_DEPTH * 1.12 + 0.4, rh + 0.35, STORE_WIDTH * 1.04 + 0.3]} geometry={roofGeo} material={mats.line} />

      {/* vigas de madera en las esquinas */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[(sx * STORE_WIDTH) / 2, height / 2, front]} material={toon(DARK_WOOD)} castShadow>
          <boxGeometry args={[0.6, height, 0.6]} />
        </mesh>
      ))}
      <mesh position={[0, height - 0.3, front + 0.05]} material={toon(DARK_WOOD)}>
        <boxGeometry args={[STORE_WIDTH + 0.6, 0.5, 0.5]} />
      </mesh>

      {/* puerta de madera con arco */}
      <group position={[0, 0, front]}>
        <mesh position={[0, 1.9, 0.12]} material={toon('#6b3f22')} castShadow>
          <boxGeometry args={[3, 3.8, 0.25]} />
        </mesh>
        <mesh position={[0, 3.8, 0.12]} rotation={[Math.PI / 2, 0, 0]} material={toon('#6b3f22')}>
          <cylinderGeometry args={[1.5, 1.5, 0.25, 20, 1, false, -Math.PI / 2, Math.PI]} />
        </mesh>
        <mesh position={[0, 2.2, 0.3]} material={toon('#c49a3a')}>
          <boxGeometry args={[0.12, 3.6, 0.05]} />
        </mesh>
        <mesh position={[0.9, 1.8, 0.32]} material={toon('#f5c542')}>
          <sphereGeometry args={[0.13, 8, 8]} />
        </mesh>
        {/* marco de piedra */}
        <mesh position={[0, 2.4, 0.02]} material={toon('#bdb09a')}>
          <boxGeometry args={[4, 5.2, 0.2]} />
        </mesh>
        {/* escalón */}
        <mesh position={[0, 0.12, 1]} material={toon('#bdb09a')} receiveShadow>
          <boxGeometry args={[4.4, 0.24, 1.4]} />
        </mesh>
      </group>

      {/* toldo a rayas sobre la fachada */}
      <mesh position={[0, 5.6, front + 1.3]} rotation={[0.42, 0, 0]} material={mats.awning} castShadow>
        <boxGeometry args={[STORE_WIDTH - 2, 0.12, 2.8]} />
      </mesh>
      {/* faldón del toldo */}
      <mesh position={[0, 4.72, front + 2.62]} material={mats.awning}>
        <boxGeometry args={[STORE_WIDTH - 2, 0.55, 0.08]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (STORE_WIDTH / 2 - 1.2), 2.5, front + 2.5]} material={toon('#2f2a33')} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 5, 6]} />
        </mesh>
      ))}

      {/* letrero de madera sobre el toldo */}
      <group position={[0, 7.45, front + 0.35]}>
        <mesh material={toon('#a8733f')} castShadow>
          <boxGeometry args={[Math.min(STORE_WIDTH - 4, 3 + store.sign.length * 1.35), 2, 0.3]} />
        </mesh>
        <mesh position={[0, 0, -0.05]} material={toon(DARK_WOOD)}>
          <boxGeometry args={[Math.min(STORE_WIDTH - 3.4, 3.6 + store.sign.length * 1.35), 2.5, 0.2]} />
        </mesh>
        <Text font={FONT} position={[0, 0.02, 0.17]} fontSize={1.3} color="#fff4dc" anchorX="center" anchorY="middle" outlineWidth={0.06} outlineColor="#3b2412">
          {store.sign}
        </Text>
      </group>
      <Text font={FONT} position={[0, 6.2, front + 0.45]} fontSize={0.5} color={DARK_WOOD} anchorX="center" anchorY="middle">
        {store.name.split(' · ')[0]}
        {store.adult ? ' · +18' : ''}
      </Text>

      {/* cartel colgante perpendicular, visible desde la calle */}
      <group position={[STORE_WIDTH / 2 - 1.5, 5, front + 1.6]}>
        <mesh position={[0, 0.9, -0.6]} material={toon('#2f2a33')}>
          <boxGeometry args={[0.1, 0.1, 1.6]} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]} material={toon(color)} castShadow>
          <boxGeometry args={[1.6, 1.6, 0.15]} />
        </mesh>
        <Text font={FONT} position={[0.09, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.34} maxWidth={1.4} textAlign="center" color="#ffffff" anchorX="center" anchorY="middle">
          {store.kind === 'bar' ? 'BAR' : 'TIENDA'}
        </Text>
      </group>

      {/* vitrinas con productos reales */}
      {posters.map((p, i) => (
        <Poster key={p.id} product={p} position={[(i === 0 ? -1 : 1) * 8.5, 3, front + 0.15]} />
      ))}

      {/* toneles en la taberna */}
      {store.kind === 'bar' &&
        [-6, -4.6, 6].map((x) => (
          <mesh key={x} position={[x, 0.7, front + 1.2]} material={toon('#8a5a33')} castShadow>
            <cylinderGeometry args={[0.6, 0.6, 1.4, 12]} />
          </mesh>
        ))}
    </group>
  )
}
