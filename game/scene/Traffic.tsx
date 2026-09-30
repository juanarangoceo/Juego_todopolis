'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { CarModel } from './CarModel'
import { Avatar } from './Avatar'
import { BLOCK, CELL, GRID, HALF, ROAD, ROAD_LINES, TRAFFIC_ROADS, rng } from '../lib/city'
import { player } from '../lib/input'
import { CHARACTERS, SKIN_TONES, type CharacterLook } from '../lib/characters'

// Tráfico y peatones: dan vida a la ciudad. Los carros van por su carril de
// punta a punta y reaparecen al otro lado; frenan si el jugador se les pone
// adelante. Son cinemáticos: empujan pero no se dejan empujar.

const COLORS = ['#e8559a', '#4aa3d8', '#f5b73b', '#9b6bd6', '#4cae4c', '#e46b4f', '#fdf1d6', '#2fbfa0']
const LIMIT = HALF + ROAD / 2 + 2

interface TrafficCar {
  axis: 'x' | 'z'
  /** Coordenada fija del carril. */
  lane: number
  dir: 1 | -1
  pos: number
  speed: number
  color: string
}

function NpcCar({ car }: { car: TrafficCar }) {
  const ref = useRef<RapierRigidBody>(null)
  const current = useRef(car.speed)
  const rotY = car.axis === 'x' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : car.dir > 0 ? 0 : Math.PI
  const quat = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), [rotY])

  useFrame((_, rawDt) => {
    const b = ref.current
    if (!b) return
    const dt = Math.min(rawDt, 1 / 20)
    // ¿Hay alguien adelante en el carril?
    const x = car.axis === 'x' ? car.pos : car.lane
    const z = car.axis === 'x' ? car.lane : car.pos
    const ahead = car.axis === 'x' ? (player.x - x) * car.dir : (player.z - z) * car.dir
    const side = car.axis === 'x' ? Math.abs(player.z - z) : Math.abs(player.x - x)
    const blocked = ahead > 0 && ahead < 9 && side < 2.2
    const target = blocked ? 0 : car.speed
    current.current += (target - current.current) * Math.min(1, dt * (blocked ? 5 : 1.2))
    car.pos += car.dir * current.current * dt
    if (car.pos > LIMIT) car.pos = -LIMIT
    if (car.pos < -LIMIT) car.pos = LIMIT
    const nx = car.axis === 'x' ? car.pos : car.lane
    const nz = car.axis === 'x' ? car.lane : car.pos
    b.setNextKinematicTranslation({ x: nx, y: 0, z: nz })
    b.setNextKinematicRotation(quat)
  })

  const start: [number, number, number] = car.axis === 'x' ? [car.pos, 0, car.lane] : [car.lane, 0, car.pos]
  return (
    <RigidBody ref={ref} type="kinematicPosition" colliders={false} position={start} rotation={[0, rotY, 0]}>
      <CuboidCollider args={[0.95, 0.5, 2.1]} position={[0, 0.6, 0]} />
      <CarModel color={car.color} />
    </RigidBody>
  )
}

export function Traffic() {
  const cars = useMemo(() => {
    const r = rng(4242)
    const out: TrafficCar[] = []
    TRAFFIC_ROADS.forEach(([axis, k], n) => {
      const c = ROAD_LINES[k]
      for (const dir of [1, -1] as const) {
        out.push({
          axis,
          lane: c + (axis === 'x' ? 3 * dir : -3 * dir),
          dir,
          pos: -LIMIT + r() * LIMIT * 2,
          speed: 9 + r() * 7,
          color: COLORS[(n * 2 + (dir > 0 ? 0 : 1)) % COLORS.length],
        })
      }
    })
    return out
  }, [])
  return (
    <>
      {cars.map((c, i) => (
        <NpcCar key={i} car={c} />
      ))}
    </>
  )
}

// ── Peatones ────────────────────────────────────────────────────────────────

interface Walker {
  axis: 'x' | 'z'
  line: number
  from: number
  to: number
  t: number
  speed: number
  look: CharacterLook
}

function Pedestrian({ w }: { w: Walker }) {
  const ref = useRef<THREE.Group>(null)
  const dir = useRef(1)
  useFrame((_, rawDt) => {
    const g = ref.current
    if (!g) return
    const dt = Math.min(rawDt, 1 / 20)
    w.t += (dir.current * w.speed * dt) / Math.abs(w.to - w.from)
    if (w.t > 1) {
      w.t = 1
      dir.current = -1
    }
    if (w.t < 0) {
      w.t = 0
      dir.current = 1
    }
    const along = w.from + (w.to - w.from) * w.t
    const x = w.axis === 'x' ? along : w.line
    const z = w.axis === 'x' ? w.line : along
    g.position.set(x, 0, z)
    const heading = w.axis === 'x' ? (dir.current * Math.sign(w.to - w.from) > 0 ? Math.PI / 2 : -Math.PI / 2) : dir.current * Math.sign(w.to - w.from) > 0 ? 0 : Math.PI
    g.rotation.y = heading
  })
  return (
    <group ref={ref}>
      <Avatar look={w.look} outline={false} />
    </group>
  )
}

export function Pedestrians() {
  const walkers = useMemo(() => {
    const r = rng(1234)
    const out: Walker[] = []
    for (let n = 0; n < 12; n++) {
      const axis = r() < 0.5 ? 'x' : 'z'
      const k = Math.floor(r() * ROAD_LINES.length)
      const side = r() < 0.5 ? -1 : 1
      const line = ROAD_LINES[k] + side * (ROAD / 2 + 2)
      const block = Math.floor(r() * GRID)
      const center = (block - (GRID - 1) / 2) * CELL
      out.push({
        axis,
        line,
        from: center - BLOCK / 2 + 2,
        to: center + BLOCK / 2 - 2,
        t: r(),
        speed: 1.1 + r() * 0.8,
        look: {
          ...CHARACTERS[n % CHARACTERS.length].look,
          skin: SKIN_TONES[(n * 3) % SKIN_TONES.length],
          top: COLORS[(n * 5) % COLORS.length],
        },
      })
    }
    return out
  }, [])
  return (
    <>
      {walkers.map((w, i) => (
        <Pedestrian key={i} w={w} />
      ))}
    </>
  )
}
