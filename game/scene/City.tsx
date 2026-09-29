'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import {
  BLOCK,
  COIN_SPOTS,
  DISTRICTS,
  GRID,
  HALF,
  LOTS,
  ROAD,
  ROAD_LINES,
  STORES,
  TOWERS,
  rng,
} from '../lib/city'
import { createTowerMaterial } from './towerMaterial'
import { makeDashTexture, makeTileTexture } from '../lib/textures'
import { StoreBuilding, FONT } from './StoreBuilding'
import { player } from '../lib/input'
import { useGame } from '../lib/store'

const EDGE = HALF + ROAD / 2 + 4

function Ground() {
  const tiles = useMemo(() => makeTileTexture('#2a2540', '#3a3458', 6), [])
  const plazaTiles = useMemo(() => makeTileTexture('#3a2f52', '#ffd84a33', 10), [])
  const dash = useMemo(() => {
    const t = makeDashTexture()
    t.repeat.set(1, (HALF * 2 + ROAD) / 6)
    return t
  }, [])
  tiles.repeat.set(BLOCK / 6, BLOCK / 6)
  plazaTiles.repeat.set(6, 6)

  return (
    <group>
      {/* asfalto */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[EDGE * 2 + 20, EDGE * 2 + 20]} />
        <meshStandardMaterial color="#14121f" roughness={0.55} metalness={0.2} />
      </mesh>
      {/* mar alrededor de la isla */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial color="#0a1030" roughness={0.1} metalness={0.8} />
      </mesh>
      {/* manzanas */}
      {LOTS.map((l) => (
        <mesh key={`${l.i}-${l.j}`} rotation={[-Math.PI / 2, 0, 0]} position={[l.x, 0.02, l.z]}>
          <planeGeometry args={[BLOCK, BLOCK]} />
          {l.type === 'plaza' ? (
            <meshStandardMaterial map={plazaTiles} roughness={0.35} metalness={0.3} />
          ) : l.type === 'park' ? (
            <meshStandardMaterial color="#1d4a3a" roughness={0.9} />
          ) : (
            <meshStandardMaterial map={tiles} roughness={0.6} />
          )}
        </mesh>
      ))}
      {/* eje de las calles */}
      {ROAD_LINES.map((c) => (
        <group key={c}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c, 0.03, 0]}>
            <planeGeometry args={[0.35, HALF * 2 + ROAD]} />
            <meshBasicMaterial map={dash} transparent toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.03, c]}>
            <planeGeometry args={[0.35, HALF * 2 + ROAD]} />
            <meshBasicMaterial map={dash} transparent toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* borde de las manzanas en neón tenue, por distrito */}
      {LOTS.map((l) => (
        <mesh key={`e-${l.i}-${l.j}`} rotation={[-Math.PI / 2, 0, 0]} position={[l.x, 0.025, l.z]}>
          <ringGeometry args={[BLOCK * 0.69, BLOCK * 0.707, 4, 1, Math.PI / 4]} />
          <meshBasicMaterial color={DISTRICTS[l.district].color} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      ))}

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[EDGE + 10, 0.5, EDGE + 10]} position={[0, -0.5, 0]} />
        {/* límites de la isla */}
        <CuboidCollider args={[EDGE, 6, 1]} position={[0, 6, -EDGE]} />
        <CuboidCollider args={[EDGE, 6, 1]} position={[0, 6, EDGE]} />
        <CuboidCollider args={[1, 6, EDGE]} position={[-EDGE, 6, 0]} />
        <CuboidCollider args={[1, 6, EDGE]} position={[EDGE, 6, 0]} />
      </RigidBody>
      {/* baranda de neón en el borde */}
      {[
        [0, -EDGE, 0],
        [0, EDGE, 0],
        [-EDGE, 0, Math.PI / 2],
        [EDGE, 0, Math.PI / 2],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 1, z]} rotation={[0, r, 0]}>
          <boxGeometry args={[EDGE * 2, 0.12, 0.12]} />
          <meshBasicMaterial color="#35e0ff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Towers() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(() => createTowerMaterial(), [])
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    const dark = new THREE.Color('#15122a')
    TOWERS.forEach((t, i) => {
      o.position.set(t.x, t.h / 2, t.z)
      o.scale.set(t.w, t.h, t.d)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      c.set(t.color).lerp(dark, 0.78)
      m.setColorAt(i, c)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, undefined, TOWERS.length]} material={material}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      {/* cornisas de neón */}
      <TowerCrowns />
      <RigidBody type="fixed" colliders={false}>
        {TOWERS.map((t, i) => (
          <CuboidCollider key={i} args={[t.w / 2, t.h / 2, t.d / 2]} position={[t.x, t.h / 2, t.z]} />
        ))}
      </RigidBody>
    </>
  )
}

function TowerCrowns() {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    TOWERS.forEach((t, i) => {
      o.position.set(t.x, t.h + 0.2, t.z)
      o.scale.set(t.w + 0.3, 0.4, t.d + 0.3)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, c.set(t.color))
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, TOWERS.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}

function Plaza() {
  const holo = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (holo.current) holo.current.rotation.y += dt * 0.25
    if (ring.current) ring.current.rotation.z += dt * 0.4
  })
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.6, 6.2]} position={[0, 0.6, 0]} />
      </RigidBody>
      {/* fuente */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[6.2, 6.6, 1, 48]} />
        <meshPhysicalMaterial color="#d9d4ff" roughness={0.1} metalness={0.3} transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.8, 48]} />
        <meshStandardMaterial color="#2bd9ff" emissive="#1aa6ff" emissiveIntensity={0.8} roughness={0} metalness={0.6} />
      </mesh>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.35, 0.6, 4, 16]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.05} transmission={0} transparent opacity={0.5} emissive="#ffd84a" emissiveIntensity={0.4} />
      </mesh>
      <mesh ref={ring} position={[0, 5.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3, 0.08, 8, 64]} />
        <meshBasicMaterial color="#ffd84a" toneMapped={false} />
      </mesh>
      {/* holograma */}
      <group ref={holo} position={[0, 12, 0]}>
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((r) => (
          <group key={r} rotation={[0, r, 0]}>
            <Text font={FONT} position={[0, 0, 7]} fontSize={3.4} color="#ffd84a" anchorX="center" anchorY="middle" material-toneMapped={false} material-side={THREE.FrontSide} fillOpacity={0.92}>
              TODÓPOLIS
            </Text>
            <Text font={FONT} position={[0, -2.6, 7]} fontSize={1.1} color="#ffffff" anchorX="center" anchorY="middle" material-toneMapped={false} material-side={THREE.FrontSide}>
              LA CIUDAD DE TODO
            </Text>
          </group>
        ))}
      </group>
      {/* bancas */}
      {Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2 + Math.PI / 8
        return (
          <mesh key={k} position={[Math.cos(a) * 17, 0.35, Math.sin(a) * 17]} rotation={[0, -a + Math.PI / 2, 0]}>
            <boxGeometry args={[3, 0.25, 0.8]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.5} roughness={0.1} />
          </mesh>
        )
      })}
    </group>
  )
}

function Parks() {
  const trees = useMemo(() => {
    const r = rng(99)
    const out: { x: number; z: number; s: number; c: string }[] = []
    for (const l of LOTS) {
      if (l.type !== 'park') continue
      for (let k = 0; k < 14; k++) {
        out.push({
          x: l.x + (r() - 0.5) * (BLOCK - 12),
          z: l.z + (r() - 0.5) * (BLOCK - 12),
          s: 0.8 + r() * 0.8,
          c: DISTRICTS[l.district].color,
        })
      }
    }
    return out
  }, [])
  const trunks = useRef<THREE.InstancedMesh>(null)
  const crowns = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    trees.forEach((t, i) => {
      o.position.set(t.x, 1.5 * t.s, t.z)
      o.scale.set(t.s, t.s, t.s)
      o.updateMatrix()
      trunks.current?.setMatrixAt(i, o.matrix)
      o.position.set(t.x, 4 * t.s, t.z)
      o.updateMatrix()
      crowns.current?.setMatrixAt(i, o.matrix)
      crowns.current?.setColorAt(i, c.set(t.c).lerp(new THREE.Color('#0f3a2a'), 0.55))
    })
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true
    if (crowns.current) {
      crowns.current.instanceMatrix.needsUpdate = true
      if (crowns.current.instanceColor) crowns.current.instanceColor.needsUpdate = true
    }
  }, [trees])
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]}>
        <cylinderGeometry args={[0.2, 0.3, 3, 6]} />
        <meshStandardMaterial color="#3b2a24" />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, trees.length]}>
        <icosahedronGeometry args={[1.8, 0]} />
        <meshStandardMaterial emissive="#0b3" emissiveIntensity={0.15} roughness={0.7} flatShading />
      </instancedMesh>
      <RigidBody type="fixed" colliders={false}>
        {trees.map((t, i) => (
          <CylinderCollider key={i} args={[1.5 * t.s, 0.3 * t.s]} position={[t.x, 1.5 * t.s, t.z]} />
        ))}
      </RigidBody>
    </>
  )
}

function StreetLamps() {
  const spots = useMemo(() => {
    const out: [number, number][] = []
    const off = ROAD / 2 + 0.8
    for (const c of ROAD_LINES) {
      for (let k = 0; k < GRID; k++) {
        const along = (k - (GRID - 1) / 2) * 60
        out.push([c + off, along + 12], [c - off, along - 12], [along + 12, c + off], [along - 12, c - off])
      }
    }
    return out
  }, [])
  const poles = useRef<THREE.InstancedMesh>(null)
  const bulbs = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    spots.forEach(([x, z], i) => {
      o.position.set(x, 3, z)
      o.updateMatrix()
      poles.current?.setMatrixAt(i, o.matrix)
      o.position.set(x, 6.1, z)
      o.updateMatrix()
      bulbs.current?.setMatrixAt(i, o.matrix)
    })
    if (poles.current) poles.current.instanceMatrix.needsUpdate = true
    if (bulbs.current) bulbs.current.instanceMatrix.needsUpdate = true
  }, [spots])
  return (
    <>
      <instancedMesh ref={poles} args={[undefined, undefined, spots.length]}>
        <cylinderGeometry args={[0.08, 0.12, 6, 6]} />
        <meshStandardMaterial color="#2c2840" metalness={0.8} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, spots.length]}>
        <sphereGeometry args={[0.28, 10, 10]} />
        <meshBasicMaterial color="#fff1c9" toneMapped={false} />
      </instancedMesh>
    </>
  )
}

function Coins() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const collected = useGame((s) => s.progress.collectedCoins)
  const collect = useGame((s) => s.collectCoin)
  const o = useMemo(() => new THREE.Object3D(), [])
  const t = useRef(0)
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    t.current += dt
    const reach = player.carId ? 3.2 : 1.6
    COIN_SPOTS.forEach(([x, z], i) => {
      const taken = collected.includes(i)
      if (!taken && Math.hypot(player.x - x, player.z - z) < reach) collect(i)
      o.position.set(x, taken ? -10 : 1.2 + Math.sin(t.current * 2 + i) * 0.15, z)
      o.rotation.set(Math.PI / 2, 0, t.current * 2.5 + i)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COIN_SPOTS.length]}>
      <cylinderGeometry args={[0.45, 0.45, 0.1, 20]} />
      <meshStandardMaterial color="#ffd84a" emissive="#ffb800" emissiveIntensity={0.9} metalness={0.9} roughness={0.2} />
    </instancedMesh>
  )
}

export function City() {
  return (
    <group>
      <Ground />
      <Towers />
      <Plaza />
      <Parks />
      <StreetLamps />
      <Coins />
      {STORES.map((s) => (
        <StoreBuilding key={s.id} store={s} />
      ))}
    </group>
  )
}
