'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { CarModel } from './CarModel'
import { PARKED_CARS } from '../lib/city'
import { keys, player, stick } from '../lib/input'
import { isUiBlocking, useGame } from '../lib/store'
import { carBodies, carControl, carSaved } from './vehicleRegistry'

const MAX_FWD = 30 // m/s ≈ 108 km/h
const MAX_REV = 9
const ACCEL = 14
const BRAKE = 30
const DRAG = 0.6
const TURN = 1.9

const q = new THREE.Quaternion()
const e = new THREE.Euler()

function Car({ id, x, z, rot, color }: (typeof PARKED_CARS)[number]) {
  const ref = useRef<RapierRigidBody>(null)
  const saved = carSaved.get(id)
  const start = saved ?? { x, y: 0.2, z, yaw: rot }

  useEffect(() => {
    const b = ref.current
    if (!b) return
    carBodies.set(id, b)
    return () => {
      // La ciudad se desmonta al entrar a una tienda: el carro queda donde estaba.
      try {
        const t = b.translation()
        const r = b.rotation()
        e.setFromQuaternion(q.set(r.x, r.y, r.z, r.w), 'YXZ')
        carSaved.set(id, { x: t.x, y: Math.max(0.2, t.y), z: t.z, yaw: e.y })
      } catch {
        /* el mundo físico ya se liberó */
      }
      carBodies.delete(id)
    }
  }, [id])

  useFrame((_, rawDt) => {
    const b = ref.current
    if (!b || player.carId !== id) return
    const dt = Math.min(rawDt, 1 / 20)
    const blocked = isUiBlocking(useGame.getState())
    const r = b.rotation()
    e.setFromQuaternion(q.set(r.x, r.y, r.z, r.w), 'YXZ')
    const heading = e.y
    carControl.heading = heading

    let throttle = 0
    let steer = 0
    if (!blocked) {
      throttle = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0) + stick.y
      steer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0) - stick.x
    }
    throttle = Math.max(-1, Math.min(1, throttle))
    steer = Math.max(-1, Math.min(1, steer))

    let v = carControl.speed
    if (keys.brake && !blocked) {
      v -= Math.sign(v) * Math.min(Math.abs(v), BRAKE * dt)
    } else if (throttle > 0) {
      v += (v < 0 ? BRAKE : ACCEL) * throttle * dt
    } else if (throttle < 0) {
      v += (v > 0 ? -BRAKE : -ACCEL * 0.7) * -throttle * dt
    } else {
      v -= v * DRAG * dt
      if (Math.abs(v) < 0.1) v = 0
    }
    v = Math.max(-MAX_REV, Math.min(MAX_FWD, v))

    // Si chocó, la física frenó el carro: la velocidad real manda.
    const lv = b.linvel()
    const real = lv.x * Math.sin(heading) + lv.z * Math.cos(heading)
    if (Math.abs(real) < Math.abs(v) - 4) v = real

    carControl.speed = v
    const grip = Math.min(1, Math.abs(v) / 6)
    b.setAngvel({ x: 0, y: steer * TURN * grip * Math.sign(v || 1), z: 0 }, true)
    b.setLinvel({ x: Math.sin(heading) * v, y: lv.y, z: Math.cos(heading) * v }, true)
  })

  return (
    <RigidBody
      ref={ref}
      colliders={false}
      position={[start.x, start.y, start.z]}
      rotation={[0, start.yaw, 0]}
      enabledRotations={[false, true, false]}
      mass={40}
      linearDamping={0.4}
      angularDamping={3}
      friction={0.3}
      ccd
    >
      <CuboidCollider args={[0.95, 0.5, 2.1]} position={[0, 0.6, 0]} />
      <CarModel color={color} />
    </RigidBody>
  )
}

export function Vehicles() {
  return (
    <>
      {PARKED_CARS.map((c) => (
        <Car key={c.id} {...c} />
      ))}
    </>
  )
}
