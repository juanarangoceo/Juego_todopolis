'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import {
  BLOCK,
  CELL,
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
  storeGeometry,
} from '../lib/city'
import { makeCobbleTexture, makeGrassTexture, makeTileTexture } from '../lib/textures'
import { makeOutline, makeToon, roofGeometry, toon } from './toon'
import { StoreBuilding, FONT } from './StoreBuilding'
import { player, walkTo } from '../lib/input'
import { useGame } from '../lib/store'

const EDGE = HALF + ROAD / 2 + 4
const OUTLINE = 0.3

/** Clic en el suelo: el personaje camina hasta ahí (estilo MMORPG clásico). */
export function onGroundClick(e: ThreeEvent<MouseEvent>) {
  if (e.delta > 8 || e.button !== 0) return
  e.stopPropagation()
  walkTo(e.point.x, e.point.z)
}

// ── Suelo ───────────────────────────────────────────────────────────────────

function Ground() {
  const cobble = useMemo(() => {
    const t = makeCobbleTexture()
    t.repeat.set(ROAD / 3.5, (HALF * 2 + ROAD) / 3.5)
    return t
  }, [])
  const cobbleH = useMemo(() => {
    const t = cobble.clone()
    t.repeat.set((HALF * 2 + ROAD) / 3.5, ROAD / 3.5)
    t.needsUpdate = true
    return t
  }, [cobble])
  const cobbleBase = useMemo(() => {
    const t = cobble.clone()
    t.repeat.set((EDGE * 2 + 10) / 3.5, (EDGE * 2 + 10) / 3.5)
    t.needsUpdate = true
    return t
  }, [cobble])
  const tiles = useMemo(() => {
    const t = makeTileTexture('#e3d5b8', '#b9a684', 4)
    t.repeat.set(BLOCK / 5, BLOCK / 5)
    return t
  }, [])
  const plaza = useMemo(() => {
    const t = makeTileTexture('#e8d9b5', '#c2a878', 6)
    t.repeat.set(5, 5)
    return t
  }, [])
  const grass = useMemo(() => {
    const t = makeGrassTexture()
    t.repeat.set(BLOCK / 10, BLOCK / 10)
    return t
  }, [])
  const mats = useMemo(
    () => ({
      road: makeToon({ map: cobble }),
      roadH: makeToon({ map: cobbleH }),
      walk: makeToon({ map: tiles }),
      plaza: makeToon({ map: plaza }),
      grass: makeToon({ map: grass }),
      base: makeToon({ map: cobbleBase }),
    }),
    [cobble, cobbleH, cobbleBase, tiles, plaza, grass]
  )

  return (
    <group onClick={onGroundClick}>
      {/* isla */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow material={mats.base}>
        <planeGeometry args={[EDGE * 2 + 10, EDGE * 2 + 10]} />
      </mesh>
      {/* calles empedradas */}
      {ROAD_LINES.map((c) => (
        <group key={c}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[c, 0, 0]} receiveShadow material={mats.road}>
            <planeGeometry args={[ROAD, HALF * 2 + ROAD]} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, c]} receiveShadow material={mats.roadH}>
            <planeGeometry args={[HALF * 2 + ROAD, ROAD]} />
          </mesh>
        </group>
      ))}
      {/* manzanas: acera, plaza o parque */}
      {LOTS.map((l) => (
        <mesh
          key={`${l.i}-${l.j}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[l.x, 0.02, l.z]}
          receiveShadow
          material={l.type === 'plaza' ? mats.plaza : l.type === 'park' ? mats.grass : mats.walk}
        >
          <planeGeometry args={[BLOCK, BLOCK]} />
        </mesh>
      ))}
      <Curbs />
      {/* mar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} material={toon('#4aa3d8')}>
        <planeGeometry args={[3000, 3000]} />
      </mesh>
      {/* malecón de piedra */}
      {[
        [0, -EDGE - 1.5, EDGE * 2 + 6, 3],
        [0, EDGE + 1.5, EDGE * 2 + 6, 3],
        [-EDGE - 1.5, 0, 3, EDGE * 2],
        [EDGE + 1.5, 0, 3, EDGE * 2],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, -0.3, z]} material={toon('#b9ab93')} receiveShadow>
          <boxGeometry args={[w, 1.8, d]} />
        </mesh>
      ))}

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[EDGE + 10, 0.5, EDGE + 10]} position={[0, -0.5, 0]} />
        <CuboidCollider args={[EDGE, 6, 1]} position={[0, 6, -EDGE]} />
        <CuboidCollider args={[EDGE, 6, 1]} position={[0, 6, EDGE]} />
        <CuboidCollider args={[1, 6, EDGE]} position={[-EDGE, 6, 0]} />
        <CuboidCollider args={[1, 6, EDGE]} position={[EDGE, 6, 0]} />
      </RigidBody>
    </group>
  )
}

/** Bordillos de piedra alrededor de cada manzana. */
function Curbs() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const count = LOTS.length * 4
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    let i = 0
    for (const l of LOTS) {
      for (const [dx, dz, rot] of [
        [0, -1, 0],
        [0, 1, 0],
        [-1, 0, Math.PI / 2],
        [1, 0, Math.PI / 2],
      ] as const) {
        o.position.set(l.x + (dx * BLOCK) / 2, 0.09, l.z + (dz * BLOCK) / 2)
        o.rotation.set(0, rot, 0)
        o.scale.set(BLOCK + 0.5, 0.18, 0.5)
        o.updateMatrix()
        m.setMatrixAt(i++, o.matrix)
      }
    }
    m.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} material={toon('#cbbda3')} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  )
}

// ── Casas ───────────────────────────────────────────────────────────────────

function Houses() {
  const bodies = useRef<THREE.InstancedMesh>(null)
  const bodyLines = useRef<THREE.InstancedMesh>(null)
  const roofs = useRef<THREE.InstancedMesh>(null)
  const roofLines = useRef<THREE.InstancedMesh>(null)
  const chimneys = useRef<THREE.InstancedMesh>(null)
  const chimneyLines = useRef<THREE.InstancedMesh>(null)
  const roofGeo = useMemo(() => roofGeometry(), [])
  const mats = useMemo(
    () => ({
      body: makeToon({ windows: true, cutout: true }),
      roof: makeToon({ shingles: true, cutout: true }),
      chimney: makeToon({ color: '#a4553e', cutout: true }),
      line: makeOutline(true),
    }),
    []
  )
  const withChimney = useMemo(() => TOWERS.filter((t) => t.chimney), [])
  const lines = useGame((s) => s.quality === 'high')

  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    TOWERS.forEach((t, i) => {
      // cuerpo
      o.rotation.set(0, 0, 0)
      o.position.set(t.x, t.h / 2, t.z)
      o.scale.set(t.w, t.h, t.d)
      o.updateMatrix()
      bodies.current?.setMatrixAt(i, o.matrix)
      bodies.current?.setColorAt(i, c.set(t.wall))
      o.scale.set(t.w + OUTLINE, t.h + OUTLINE, t.d + OUTLINE)
      o.updateMatrix()
      bodyLines.current?.setMatrixAt(i, o.matrix)
      // techo de dos aguas
      const across = (t.ridgeX ? t.d : t.w) * 1.14
      const along = (t.ridgeX ? t.w : t.d) * 1.06
      const rh = Math.min(7, Math.min(t.w, t.d) * 0.45)
      o.position.set(t.x, t.h, t.z)
      o.rotation.set(0, t.ridgeX ? Math.PI / 2 : 0, 0)
      o.scale.set(across, rh, along)
      o.updateMatrix()
      roofs.current?.setMatrixAt(i, o.matrix)
      roofs.current?.setColorAt(i, c.set(t.roof))
      o.position.set(t.x, t.h - 0.15, t.z)
      o.scale.set(across + OUTLINE * 1.4, rh + OUTLINE * 1.2, along + OUTLINE)
      o.updateMatrix()
      roofLines.current?.setMatrixAt(i, o.matrix)
    })
    withChimney.forEach((t, i) => {
      const rh = Math.min(7, Math.min(t.w, t.d) * 0.45)
      const ox = t.ridgeX ? t.w * 0.28 : t.w * 0.18
      const oz = t.ridgeX ? t.d * 0.16 : t.d * 0.28
      o.rotation.set(0, 0, 0)
      o.position.set(t.x + ox, t.h + rh * 0.55, t.z + oz)
      o.scale.set(1.2, rh * 0.9 + 1.2, 1.2)
      o.updateMatrix()
      chimneys.current?.setMatrixAt(i, o.matrix)
      o.scale.set(1.2 + OUTLINE, rh * 0.9 + 1.2 + OUTLINE, 1.2 + OUTLINE)
      o.updateMatrix()
      chimneyLines.current?.setMatrixAt(i, o.matrix)
    })
    for (const m of [bodies, bodyLines, roofs, roofLines, chimneys, chimneyLines]) {
      if (!m.current) continue
      m.current.instanceMatrix.needsUpdate = true
      if (m.current.instanceColor) m.current.instanceColor.needsUpdate = true
      m.current.computeBoundingSphere()
    }
  }, [withChimney])

  return (
    <>
      <instancedMesh ref={bodies} args={[undefined, mats.body, TOWERS.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={bodyLines} args={[undefined, mats.line, TOWERS.length]} visible={lines}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[roofGeo, mats.roof, TOWERS.length]} castShadow receiveShadow />
      <instancedMesh ref={roofLines} args={[roofGeo, mats.line, TOWERS.length]} visible={lines} />
      <instancedMesh ref={chimneys} args={[undefined, mats.chimney, withChimney.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={chimneyLines} args={[undefined, mats.line, withChimney.length]} visible={lines}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <RigidBody type="fixed" colliders={false}>
        {TOWERS.map((t, i) => (
          <CuboidCollider key={i} args={[t.w / 2, t.h / 2, t.d / 2]} position={[t.x, t.h / 2, t.z]} />
        ))}
      </RigidBody>
    </>
  )
}

// ── Plaza ───────────────────────────────────────────────────────────────────

function Plaza() {
  const banner = useRef<THREE.Group>(null)
  const water = useRef<THREE.Mesh>(null)
  useFrame(({ clock }, dt) => {
    if (banner.current) banner.current.rotation.y += dt * 0.2
    if (water.current) water.current.position.y = 0.95 + Math.sin(clock.elapsedTime * 2) * 0.03
  })
  const stone = toon('#cfc3ad')
  const dark = toon('#a89a82')
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.6, 6.4]} position={[0, 0.6, 0]} />
      </RigidBody>
      {/* fuente de piedra */}
      <mesh position={[0, 0.55, 0]} material={stone} castShadow receiveShadow>
        <cylinderGeometry args={[6.4, 6.8, 1.1, 32]} />
      </mesh>
      <mesh position={[0, 0.55, 0]} material={makeOutlineCached()}>
        <cylinderGeometry args={[6.55, 6.95, 1.25, 32]} />
      </mesh>
      <mesh ref={water} position={[0, 0.95, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toon('#5ab8e8')}>
        <circleGeometry args={[5.9, 32]} />
      </mesh>
      <mesh position={[0, 1.8, 0]} material={dark} castShadow>
        <cylinderGeometry args={[0.7, 1.1, 2.2, 12]} />
      </mesh>
      <mesh position={[0, 3, 0]} material={stone} castShadow>
        <cylinderGeometry args={[2, 1.4, 0.45, 20]} />
      </mesh>
      <mesh position={[0, 3.8, 0]} material={dark} castShadow>
        <cylinderGeometry args={[0.35, 0.5, 1.4, 10]} />
      </mesh>
      <mesh position={[0, 4.7, 0]} material={toon('#f5b73b')} castShadow>
        <sphereGeometry args={[0.6, 16, 12]} />
      </mesh>
      {/* chorros de agua */}
      {Array.from({ length: 6 }, (_, k) => {
        const a = (k / 6) * Math.PI * 2
        return (
          <mesh key={k} position={[Math.cos(a) * 1.9, 2.4, Math.sin(a) * 1.9]} rotation={[0, -a, 0.5]} material={toon('#9fdcf5')}>
            <capsuleGeometry args={[0.08, 1.2, 4, 6]} />
          </mesh>
        )
      })}
      {/* estandarte giratorio */}
      <group ref={banner} position={[0, 11, 0]}>
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((r) => (
          <group key={r} rotation={[0, r, 0]}>
            <Text font={FONT} position={[0, 0, 6]} fontSize={3.2} color="#f5b73b" anchorX="center" anchorY="middle" outlineWidth={0.22} outlineColor="#5a3517" material-side={THREE.FrontSide}>
              TODÓPOLIS
            </Text>
            <Text font={FONT} position={[0, -2.5, 6]} fontSize={1} color="#fff8ec" anchorX="center" anchorY="middle" outlineWidth={0.1} outlineColor="#5a3517" material-side={THREE.FrontSide}>
              LA CIUDAD DE TODO
            </Text>
          </group>
        ))}
      </group>
      {/* bancas de madera y jardineras */}
      {Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2 + Math.PI / 8
        return (
          <group key={k} position={[Math.cos(a) * 16, 0, Math.sin(a) * 16]} rotation={[0, -a + Math.PI / 2, 0]}>
            <mesh position={[0, 0.5, 0]} material={toon('#9a6435')} castShadow>
              <boxGeometry args={[3, 0.18, 0.8]} />
            </mesh>
            <mesh position={[0, 0.9, -0.35]} material={toon('#9a6435')} castShadow>
              <boxGeometry args={[3, 0.6, 0.12]} />
            </mesh>
            {[-1.3, 1.3].map((x) => (
              <mesh key={x} position={[x, 0.25, 0]} material={toon('#3b3330')}>
                <boxGeometry args={[0.12, 0.5, 0.7]} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

let plazaOutline: THREE.MeshBasicMaterial | null = null
function makeOutlineCached() {
  if (!plazaOutline) plazaOutline = makeOutline(false)
  return plazaOutline
}

// ── Árboles ─────────────────────────────────────────────────────────────────

const DOORS = STORES.map((s) => storeGeometry(s).door)

function Trees() {
  const trees = useMemo(() => {
    const r = rng(99)
    const out: { x: number; z: number; s: number; c: string }[] = []
    const greens = ['#5daa4a', '#4f9a45', '#6cb853', '#7ac05a']
    for (const l of LOTS) {
      if (l.type !== 'park') continue
      for (let k = 0; k < 11; k++) {
        out.push({ x: l.x + (r() - 0.5) * (BLOCK - 10), z: l.z + (r() - 0.5) * (BLOCK - 10), s: 0.9 + r() * 0.7, c: greens[k % 4] })
      }
    }
    // Arborización de las aceras, lejos de las puertas de las tiendas.
    const off = ROAD / 2 + 1.8
    for (const c of ROAD_LINES) {
      for (let k = 0; k < GRID; k++) {
        const along = (k - (GRID - 1) / 2) * CELL
        for (const [x, z] of [
          [c + off, along + 17],
          [c - off, along - 17],
          [along - 17, c + off],
          [along + 17, c - off],
        ]) {
          if (Math.abs(x) > HALF || Math.abs(z) > HALF) continue
          if (DOORS.some(([dx, dz]) => Math.hypot(dx - x, dz - z) < 9)) continue
          out.push({ x, z, s: 0.7 + r() * 0.3, c: greens[Math.floor(r() * 4)] })
        }
      }
    }
    return out
  }, [])
  const trunks = useRef<THREE.InstancedMesh>(null)
  const crowns = useRef<THREE.InstancedMesh>(null)
  const crownLines = useRef<THREE.InstancedMesh>(null)
  const line = useMemo(() => makeOutline(false), [])
  const crownMat = useMemo(() => makeToon(), [])
  const lines = useGame((s) => s.quality === 'high')
  // Tres esferas por copa, como un algodón.
  const puffs: [number, number, number, number][] = [
    [0, 3.6, 0, 1.7],
    [0.9, 3.1, 0.4, 1.2],
    [-0.8, 3.2, -0.3, 1.25],
  ]
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    trees.forEach((t, i) => {
      o.position.set(t.x, 1.2 * t.s, t.z)
      o.scale.setScalar(t.s)
      o.updateMatrix()
      trunks.current?.setMatrixAt(i, o.matrix)
      puffs.forEach(([px, py, pz, pr], k) => {
        o.position.set(t.x + px * t.s, py * t.s, t.z + pz * t.s)
        o.scale.setScalar(pr * t.s)
        o.updateMatrix()
        crowns.current?.setMatrixAt(i * 3 + k, o.matrix)
        crowns.current?.setColorAt(i * 3 + k, c.set(t.c).multiplyScalar(k === 0 ? 1 : 0.92))
        o.scale.setScalar(pr * t.s + 0.14)
        o.updateMatrix()
        crownLines.current?.setMatrixAt(i * 3 + k, o.matrix)
      })
    })
    for (const m of [trunks, crowns, crownLines]) {
      if (!m.current) continue
      m.current.instanceMatrix.needsUpdate = true
      if (m.current.instanceColor) m.current.instanceColor.needsUpdate = true
      m.current.computeBoundingSphere()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trees])
  return (
    <>
      <instancedMesh ref={trunks} args={[undefined, toon('#7a4e2d'), trees.length]} castShadow>
        <cylinderGeometry args={[0.22, 0.34, 2.4, 7]} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, crownMat, trees.length * 3]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
      </instancedMesh>
      <instancedMesh ref={crownLines} args={[undefined, line, trees.length * 3]} visible={lines}>
        <icosahedronGeometry args={[1, 1]} />
      </instancedMesh>
      <RigidBody type="fixed" colliders={false}>
        {trees.map((t, i) => (
          <CylinderCollider key={i} args={[1.5 * t.s, 0.35 * t.s]} position={[t.x, 1.5 * t.s, t.z]} />
        ))}
      </RigidBody>
    </>
  )
}

// ── Faroles ─────────────────────────────────────────────────────────────────

function StreetLamps() {
  const spots = useMemo(() => {
    const out: [number, number][] = []
    const off = ROAD / 2 + 0.7
    for (const c of ROAD_LINES) {
      for (let k = 0; k < GRID; k++) {
        const along = (k - (GRID - 1) / 2) * CELL
        out.push([c + off, along + 6], [c - off, along - 6], [along - 6, c + off], [along + 6, c - off])
      }
    }
    return out.filter(([x, z]) => Math.abs(x) <= HALF + 2 && Math.abs(z) <= HALF + 2)
  }, [])
  const poles = useRef<THREE.InstancedMesh>(null)
  const heads = useRef<THREE.InstancedMesh>(null)
  const glass = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const o = new THREE.Object3D()
    spots.forEach(([x, z], i) => {
      o.position.set(x, 2, z)
      o.updateMatrix()
      poles.current?.setMatrixAt(i, o.matrix)
      o.position.set(x, 4.35, z)
      o.updateMatrix()
      heads.current?.setMatrixAt(i, o.matrix)
      o.position.set(x, 3.95, z)
      o.updateMatrix()
      glass.current?.setMatrixAt(i, o.matrix)
    })
    for (const m of [poles, heads, glass]) {
      if (!m.current) continue
      m.current.instanceMatrix.needsUpdate = true
      m.current.computeBoundingSphere()
    }
  }, [spots])
  return (
    <>
      <instancedMesh ref={poles} args={[undefined, toon('#2f2a33'), spots.length]} castShadow>
        <cylinderGeometry args={[0.09, 0.16, 4, 8]} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, toon('#2f2a33'), spots.length]}>
        <coneGeometry args={[0.42, 0.4, 4]} />
      </instancedMesh>
      <instancedMesh ref={glass} args={[undefined, undefined, spots.length]}>
        <boxGeometry args={[0.45, 0.55, 0.45]} />
        <meshBasicMaterial color="#ffe7a3" />
      </instancedMesh>
    </>
  )
}

// ── Nubes ───────────────────────────────────────────────────────────────────

function Clouds() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const clouds = useMemo(() => {
    const r = rng(55)
    return Array.from({ length: 14 }, () => ({
      x: (r() - 0.5) * 800,
      z: (r() - 0.5) * 800,
      y: 90 + r() * 40,
      s: 8 + r() * 8,
      speed: 1.5 + r() * 2,
    }))
  }, [])
  const puffs = [
    [0, 0, 0, 1],
    [1.1, -0.2, 0.2, 0.75],
    [-1.1, -0.25, -0.1, 0.7],
    [0.4, 0.35, -0.4, 0.7],
    [-0.4, -0.3, 0.6, 0.6],
  ]
  const o = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    clouds.forEach((c, i) => {
      c.x += c.speed * dt
      if (c.x > 450) c.x = -450
      puffs.forEach(([px, py, pz, ps], k) => {
        o.position.set(c.x + px * c.s, c.y + py * c.s, c.z + pz * c.s)
        o.scale.setScalar(ps * c.s)
        o.updateMatrix()
        m.setMatrixAt(i * puffs.length + k, o.matrix)
      })
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, toon('#ffffff'), clouds.length * puffs.length]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 1]} />
    </instancedMesh>
  )
}

/** Cielo con degradado: azul arriba, casi blanco en el horizonte. */
export function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {},
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 top = vec3(0.35,0.62,0.93); vec3 hor = vec3(0.86,0.94,1.0); gl_FragColor = vec4(mix(hor, top, smoothstep(-0.05, 0.55, h)), 1.0); }',
      }),
    []
  )
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[1100, 32, 16]} />
    </mesh>
  )
}

// ── Monedas ─────────────────────────────────────────────────────────────────

function Coins() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const lines = useRef<THREE.InstancedMesh>(null)
  const collected = useGame((s) => s.progress.collectedCoins)
  const collect = useGame((s) => s.collectCoin)
  const o = useMemo(() => new THREE.Object3D(), [])
  const line = useMemo(() => makeOutline(false, '#6b4a10'), [])
  const t = useRef(0)
  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return
    t.current += dt
    const reach = player.carId ? 3.2 : 1.6
    COIN_SPOTS.forEach(([x, z], i) => {
      const taken = collected.includes(i)
      if (!taken && Math.hypot(player.x - x, player.z - z) < reach) collect(i)
      o.position.set(x, taken ? -10 : 1.1 + Math.sin(t.current * 2 + i) * 0.15, z)
      o.rotation.set(Math.PI / 2, 0, t.current * 2.5 + i)
      o.scale.setScalar(1)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      o.scale.setScalar(1.18)
      o.updateMatrix()
      lines.current?.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    if (lines.current) lines.current.instanceMatrix.needsUpdate = true
  })
  return (
    <>
      <instancedMesh ref={ref} args={[undefined, toon('#ffcf3a'), COIN_SPOTS.length]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[0.45, 0.45, 0.12, 20]} />
      </instancedMesh>
      <instancedMesh ref={lines} args={[undefined, line, COIN_SPOTS.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.45, 0.45, 0.12, 20]} />
      </instancedMesh>
    </>
  )
}

export function City() {
  return (
    <group>
      <SkyDome />
      <Clouds />
      <Ground />
      <Houses />
      <Plaza />
      <Trees />
      <StreetLamps />
      <Coins />
      {STORES.map((s) => (
        <StoreBuilding key={s.id} store={s} />
      ))}
    </group>
  )
}
