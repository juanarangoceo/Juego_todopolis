'use client'

import { useEffect, useMemo } from 'react'
import { Text } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { DISTRICTS, STORE_DEPTH, STORE_WIDTH, storeGeometry, type StoreDef } from '../lib/city'
import { registerInteractable } from '../lib/interactions'
import { productsForStore, useGame } from '../lib/store'
import { useSafeTexture } from '../lib/textures'
import { imageProxyUrl, type GameProduct } from '@/lib/catalog-types'

export const FONT = '/fonts/montserrat-800.woff'

const H_SHOP = 16
const H_BAR = 11

/** Afiche de producto en la vidriera de la fachada. */
function Poster({ product, position, color }: { product: GameProduct; position: [number, number, number]; color: string }) {
  const tex = useSafeTexture(imageProxyUrl(product.image, 256))
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[5.4, 5.4]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.55} />
      </mesh>
      <mesh>
        <planeGeometry args={[5, 5]} />
        {tex ? <meshBasicMaterial key={tex.uuid} map={tex} toneMapped={false} /> : <meshBasicMaterial key="empty" color="#1a1530" />}
      </mesh>
    </group>
  )
}

export function StoreBuilding({ store }: { store: StoreDef }) {
  const g = useMemo(() => storeGeometry(store), [store])
  const color = DISTRICTS[store.district].color
  const enterStore = useGame((s) => s.enterStore)
  const catalog = useGame((s) => s.catalog)
  const height = store.kind === 'bar' ? H_BAR : H_SHOP

  // Los más vendidos de la tienda van en la vidriera.
  const posters = useMemo(() => {
    const list = productsForStore(store, catalog).filter((p) => p.image)
    return [...list.filter((p) => p.isBestSeller), ...list.filter((p) => !p.isBestSeller)].slice(0, 2)
  }, [store, catalog])

  useEffect(
    () =>
      registerInteractable({
        id: `door-${store.id}`,
        x: g.door[0],
        z: g.door[1],
        radius: 4.2,
        key: 'E',
        label: store.kind === 'bar' ? `Entrar a ${store.name}` : `Entrar a ${store.name}`,
        action: () => enterStore(store, { x: g.exit[0], z: g.exit[1], yaw: Math.atan2(-g.dir[0], -g.dir[1]) }),
      }),
    [store, g, enterStore]
  )

  const front = STORE_DEPTH / 2
  return (
    <group position={[g.center[0], 0, g.center[1]]} rotation={[0, g.rotY, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[STORE_WIDTH / 2, height / 2, STORE_DEPTH / 2]} position={[0, height / 2, 0]} />
      </RigidBody>

      {/* volumen de vidrio */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[STORE_WIDTH, height, STORE_DEPTH]} />
        <meshPhysicalMaterial color="#1b1636" metalness={0.4} roughness={0.08} transparent opacity={0.82} emissive={color} emissiveIntensity={0.06} />
      </mesh>
      {/* aristas de neón */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[(sx * STORE_WIDTH) / 2, height / 2, front + 0.05]}>
          <boxGeometry args={[0.25, height, 0.25]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, height, front + 0.05]}>
        <boxGeometry args={[STORE_WIDTH + 0.25, 0.25, 0.25]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.12, front + 0.05]}>
        <boxGeometry args={[STORE_WIDTH, 0.25, 0.25]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* entrada: vidrio oscuro con marco de neón */}
      <mesh position={[0, 2.2, front + 0.03]}>
        <planeGeometry args={[4.6, 4.4]} />
        <meshStandardMaterial color="#0e0b1c" emissive={color} emissiveIntensity={0.35} metalness={0.6} roughness={0.15} />
      </mesh>
      {[
        [-2.35, 2.2, 0.12, 4.5],
        [2.35, 2.2, 0.12, 4.5],
        [0, 4.45, 4.8, 0.12],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, front + 0.08]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      ))}
      <Text font={FONT} position={[0, 2.4, front + 0.1]} fontSize={0.55} color="#ffffff" anchorX="center" anchorY="middle" material-toneMapped={false}>
        ENTRA
      </Text>
      <mesh position={[0, 4.6, front + 0.9]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[7, 0.15, 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.8} />
      </mesh>
      {/* tapete de bienvenida: marca dónde se entra */}
      <mesh position={[0, 0.03, front + 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 2.6]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} toneMapped={false} />
      </mesh>

      {/* letrero */}
      <Text
        font={FONT}
        position={[0, height - 2.6, front + 0.3]}
        fontSize={store.sign.length > 10 ? 2.1 : 2.8}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.06}
        outlineColor="#ffffff"
        outlineOpacity={0.35}
        material-toneMapped={false}
      >
        {store.sign}
      </Text>
      <Text font={FONT} position={[0, height - 5.1, front + 0.3]} fontSize={0.9} color="#ffffff" anchorX="center" anchorY="middle" material-toneMapped={false}>
        {store.name.split(' · ')[0]}
        {store.adult ? '  ·  +18' : ''}
      </Text>

      {/* vidriera con productos reales */}
      {posters.map((p, i) => (
        <Poster key={p.id} product={p} color={color} position={[(i === 0 ? -1 : 1) * 9, 4.4, front + 0.06]} />
      ))}
    </group>
  )
}
