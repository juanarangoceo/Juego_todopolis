'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { Avatar } from './Avatar'
import { cameraState, cancelWalk, clickTarget, keys, look, onAction, player, stick } from '../lib/input'
import { sharedUniforms, toon } from './toon'
import { lookFor } from '../lib/characters'
import { nearestInteractable } from '../lib/interactions'
import { isUiBlocking, useGame } from '../lib/store'
import { districtAtPoint } from '../lib/city'
import { carBodies, carControl } from './vehicleRegistry'

const WALK = 4.2
const RUN = 8.5
const JUMP = 6.2

interface PlayerRigProps {
  spawn: { x: number; z: number; yaw: number }
  /** En interiores no hay carros ni distritos. */
  city?: boolean
}

/** Inclinación y apertura de la cámara isométrica (vista desde arriba, en diagonal). */
const ISO_PITCH = 0.64
const ISO_FOV = 30
const THIRD_FOV = 62

const tmpTarget = new THREE.Vector3()
const tmpCam = new THREE.Vector3()
const tmpDir = new THREE.Vector3()

export function PlayerRig({ spawn, city = true }: PlayerRigProps) {
  const body = useRef<RapierRigidBody>(null)
  const avatar = useRef<THREE.Group>(null)
  const speedRef = useRef(0)
  const heading = useRef(spawn.yaw + Math.PI)
  const districtTimer = useRef(0)
  const camReady = useRef(false)
  const { camera } = useThree()
  const { world, rapier } = useRapier()
  const character = useGame((s) => s.character)
  const cameraMode = useGame((s) => s.cameraMode)
  const stuck = useRef(0)

  useEffect(() => {
    cameraState.mode = cameraMode
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = cameraMode === 'iso' ? ISO_FOV : THIRD_FOV
    cam.updateProjectionMatrix()
    camReady.current = false
  }, [cameraMode, camera])

  useEffect(() => cancelWalk, [])

  // Mirar hacia donde indica el punto de aparición.
  useEffect(() => {
    // En isométrica la cámara queda en diagonal, como en los MMORPG clásicos.
    look.yaw = spawn.yaw + (cameraState.mode === 'iso' ? Math.PI / 4 : 0)
    look.pitch = 0.28
    camReady.current = false
    player.carId = null
    useGame.getState().setInCar(false)
  }, [spawn.x, spawn.z, spawn.yaw])

  // E: interactuar · F: subir o bajar del carro.
  useEffect(() => {
    return onAction((a) => {
      const state = useGame.getState()
      if (isUiBlocking(state)) return
      if (a === 'interact') {
        const it = nearestInteractable(player.x, player.z, 'E', !!player.carId)
        it?.action()
        return
      }
      if (a === 'car' && city) {
        if (player.carId) exitCar()
        else enterNearestCar()
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city])

  function enterNearestCar() {
    let best: string | null = null
    let bestD = 4
    for (const [id, b] of carBodies) {
      const t = b.translation()
      const d = Math.hypot(t.x - player.x, t.z - player.z)
      if (d < bestD) {
        bestD = d
        best = id
      }
    }
    if (!best || !body.current) return
    player.carId = best
    body.current.setEnabled(false)
    carControl.speed = 0
    useGame.getState().setInCar(true)
  }

  function exitCar() {
    const car = player.carId ? carBodies.get(player.carId) : null
    if (car && body.current) {
      const t = car.translation()
      const q = car.rotation()
      const yaw = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w), 'YXZ').y
      // Bajarse por la puerta del conductor (izquierda del carro).
      const lx = Math.cos(yaw) * 2.2
      const lz = -Math.sin(yaw) * 2.2
      body.current.setTranslation({ x: t.x + lx, y: t.y + 1.2, z: t.z + lz }, true)
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      body.current.setEnabled(true)
      car.setLinvel({ x: 0, y: car.linvel().y, z: 0 }, true)
      car.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
    player.carId = null
    useGame.getState().setInCar(false)
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const b = body.current
    if (!b) return
    const state = useGame.getState()
    const blocked = isUiBlocking(state)

    // Taxi: el mapa pide llevar al jugador a otro punto.
    if (state.teleport) {
      if (player.carId) exitCar()
      b.setTranslation({ x: state.teleport.x, y: 1.2, z: state.teleport.z }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      look.yaw = state.teleport.yaw + (cameraState.mode === 'iso' ? Math.PI / 4 : 0)
      cancelWalk()
      camReady.current = false
      state.requestTeleport(null)
    }

    const inCar = !!player.carId
    let px: number, py: number, pz: number

    if (inCar) {
      const car = carBodies.get(player.carId!)
      if (!car) {
        player.carId = null
        return
      }
      const t = car.translation()
      px = t.x
      py = t.y
      pz = t.z
      // Detrás del carro cuando va rápido y nadie mueve la cámara.
      if (Math.abs(carControl.speed) > 3) {
        const behind = carControl.heading + (carControl.speed > 0 ? 0 : Math.PI)
        let diff = behind + Math.PI - look.yaw
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        look.yaw += diff * Math.min(1, dt * 2.2)
      }
      player.heading = carControl.heading
      player.speed = Math.abs(carControl.speed)
    } else {
      // ── A pie ───────────────────────────────────────────────────────────
      const fwdX = -Math.sin(look.yaw)
      const fwdZ = -Math.cos(look.yaw)
      const rightX = -fwdZ
      const rightZ = fwdX
      let ix = 0
      let iz = 0
      if (!blocked) {
        iz = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0) + stick.y
        ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + stick.x
      }
      const len = Math.hypot(ix, iz)
      const mag = Math.min(1, len)
      const running = keys.run || (stick.active && len > 0.92)
      let speed = (running ? RUN : WALK) * mag
      let vx = 0
      let vz = 0
      const here = b.translation()
      if (len > 0.05) {
        if (clickTarget.active) cancelWalk()
        const nx = ix / len
        const nz = iz / len
        vx = (fwdX * nz + rightX * nx) * speed
        vz = (fwdZ * nz + rightZ * nx) * speed
      } else if (clickTarget.active && !blocked) {
        // Clic para caminar: directo al punto; si algo lo frena, se rinde.
        const dx = clickTarget.x - here.x
        const dz = clickTarget.z - here.z
        const dist = Math.hypot(dx, dz)
        if (dist <= clickTarget.radius) {
          const arrive = clickTarget.onArrive
          cancelWalk()
          arrive?.()
        } else {
          speed = dist > 10 ? RUN * 0.85 : WALK * 1.15
          vx = (dx / dist) * speed
          vz = (dz / dist) * speed
          const real = Math.hypot(b.linvel().x, b.linvel().z)
          stuck.current = real < speed * 0.25 ? stuck.current + dt : 0
          if (stuck.current > 0.6) {
            stuck.current = 0
            cancelWalk()
          }
        }
      }
      if (Math.abs(vx) + Math.abs(vz) > 0.01) {
        const target = Math.atan2(vx, vz)
        let diff = target - heading.current
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        heading.current += diff * Math.min(1, dt * 12)
      }
      const lv = b.linvel()
      let vy = lv.y
      const t = b.translation()
      if (keys.jump && !blocked) {
        const ray = new rapier.Ray({ x: t.x, y: t.y, z: t.z }, { x: 0, y: -1, z: 0 })
        const hit = world.castRay(ray, 1.05, true, undefined, undefined, undefined, b)
        if (hit && vy < 1) vy = JUMP
        keys.jump = false
      }
      b.setLinvel({ x: vx, y: vy, z: vz }, true)
      speedRef.current = Math.hypot(vx, vz)
      if (avatar.current) avatar.current.rotation.y = heading.current
      px = t.x
      py = t.y
      pz = t.z
      // Red de seguridad: si algo lo saca del mapa, vuelve al punto de partida.
      if (t.y < -20) b.setTranslation({ x: spawn.x, y: 2, z: spawn.z }, true)
      player.heading = heading.current
      player.speed = speedRef.current
    }

    player.x = px
    player.y = py
    player.z = pz

    sharedUniforms.uPlayer.value.set(px, py - 0.9, pz)

    // ── Cámara: isométrica (MMORPG) o tercera persona con choque ─────────
    const iso = cameraMode === 'iso'
    const pitch = iso ? ISO_PITCH : look.pitch
    const dist = iso ? look.isoDistance * (city ? 1 : 0.8) + (inCar ? 8 : 0) : look.distance + (inCar ? 4 : 0)
    tmpTarget.set(px, py + (inCar ? 1.6 : 0.9), pz)
    tmpDir.set(Math.sin(look.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(look.yaw) * Math.cos(pitch))
    let d = dist
    if (!iso) {
      // En isométrica no se acerca: las casas que tapan se recortan en el shader.
      const ray = new rapier.Ray(tmpTarget, tmpDir)
      const hit = world.castRay(ray, dist, true, undefined, undefined, undefined, undefined, (c) =>
        c.parent()?.isFixed() ?? false
      )
      if (hit) d = Math.max(1.2, hit.timeOfImpact - 0.35)
    }
    tmpCam.copy(tmpTarget).addScaledVector(tmpDir, d)
    if (tmpCam.y < 0.4) tmpCam.y = 0.4
    if (!camReady.current) {
      camera.position.copy(tmpCam)
      camReady.current = true
    } else {
      camera.position.lerp(tmpCam, Math.min(1, dt * 10))
    }
    camera.lookAt(tmpTarget)

    // ── Avisos de interacción ────────────────────────────────────────────
    const it = nearestInteractable(px, pz, 'E', inCar)
    if (it) state.setPrompt({ key: 'E', text: it.label })
    else if (city && inCar) state.setPrompt({ key: 'F', text: 'Bajarse del carro' })
    else if (city && nearCar(px, pz)) state.setPrompt({ key: 'F', text: 'Manejar este carro' })
    else state.setPrompt(null)

    if (city) {
      districtTimer.current += dt
      if (districtTimer.current > 0.3) {
        districtTimer.current = 0
        state.setDistrict(districtAtPoint(px, pz))
      }
    }
  })

  return (
    <>
    <RigidBody
      ref={body}
      colliders={false}
      position={[spawn.x, 1.2, spawn.z]}
      enabledRotations={[false, false, false]}
      mass={1}
      friction={0}
      linearDamping={0}
      ccd
    >
      <CapsuleCollider args={[0.5, 0.4]} />
      <group ref={avatar} position={[0, -0.9, 0]} visible={true}>
        <PlayerVisibility>
          <Avatar look={lookFor(character)} speedRef={speedRef} />
        </PlayerVisibility>
      </group>
    </RigidBody>
    <ClickMarker />
    </>
  )
}

/** Anillo en el suelo donde el jugador hizo clic para caminar. */
function ClickMarker() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    g.visible = clickTarget.active
    if (!clickTarget.active) return
    g.position.set(clickTarget.x, 0.06, clickTarget.z)
    const s = 1 + Math.sin(clock.elapsedTime * 6) * 0.12
    g.scale.set(s, 1, s)
    g.rotation.y = clock.elapsedTime * 1.5
  })
  return (
    <group ref={ref} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={toon('#f5b73b')}>
        <ringGeometry args={[0.45, 0.62, 24]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, (i * Math.PI) / 2]} position={[Math.cos((i * Math.PI) / 2) * 0.85, 0, -Math.sin((i * Math.PI) / 2) * 0.85]} material={toon('#fff4dc')}>
          <circleGeometry args={[0.12, 3]} />
        </mesh>
      ))}
    </group>
  )
}

/** Oculta al personaje mientras maneja (el cuerpo físico queda desactivado). */
function PlayerVisibility({ children }: { children: React.ReactNode }) {
  const inCar = useGame((s) => s.inCar)
  return <group visible={!inCar}>{children}</group>
}

function nearCar(x: number, z: number): boolean {
  for (const b of carBodies.values()) {
    const t = b.translation()
    if (Math.hypot(t.x - x, t.z - z) < 4) return true
  }
  return false
}
