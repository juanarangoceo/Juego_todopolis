'use client'

import { useRef, type ReactNode } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import * as THREE from 'three'
import { toon } from './toon'
import type { CharacterLook } from '../lib/characters'

// Personaje chibi: cabeza grande, cuerpo corto, ojos brillantes y contorno
// oscuro. Todo sale de primitivas, así cada personaje de la selección cambia
// solo de colores, peinado y accesorio.

const INK = '#2b1d14'

interface PartProps extends Omit<ThreeElements['mesh'], 'material'> {
  color: string
  outline: boolean
  children: ReactNode
}

function Part({ color, outline, children, ...props }: PartProps) {
  return (
    <mesh {...props} material={toon(color)} castShadow>
      {children}
      {outline && <Outlines thickness={0.028} color={INK} />}
    </mesh>
  )
}

interface AvatarProps {
  look: CharacterLook
  speedRef?: React.MutableRefObject<number>
  idle?: boolean
  scale?: number
  outline?: boolean
}

function Hair({ look, o }: { look: CharacterLook; o: boolean }) {
  const c = look.hair
  const cap = (
    <Part color={c} outline={o} position={[0, 1.2, -0.02]} rotation={[-0.42, 0, 0]}>
      <sphereGeometry args={[0.395, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
    </Part>
  )
  switch (look.hairStyle) {
    case 'long':
      return (
        <>
          {cap}
          <Part color={c} outline={o} position={[0, 0.98, -0.16]} scale={[1.15, 1, 0.62]}>
            <capsuleGeometry args={[0.3, 0.32, 6, 14]} />
          </Part>
        </>
      )
    case 'ponytail':
      return (
        <>
          {cap}
          <Part color={c} outline={o} position={[0, 1.36, -0.36]}>
            <sphereGeometry args={[0.12, 12, 10]} />
          </Part>
          <Part color={c} outline={o} position={[0, 1.1, -0.47]} rotation={[0.35, 0, 0]}>
            <capsuleGeometry args={[0.09, 0.3, 4, 10]} />
          </Part>
        </>
      )
    case 'bun':
      return (
        <>
          {cap}
          <Part color={c} outline={o} position={[0, 1.6, -0.06]}>
            <sphereGeometry args={[0.16, 14, 12]} />
          </Part>
        </>
      )
    case 'spiky':
      return (
        <>
          {cap}
          {Array.from({ length: 7 }, (_, i) => {
            const a = (i / 7) * Math.PI * 2
            return (
              <Part key={i} color={c} outline={o} position={[Math.sin(a) * 0.2, 1.5, Math.cos(a) * 0.2 - 0.05]} rotation={[Math.cos(a) * 0.7, 0, -Math.sin(a) * 0.7]}>
                <coneGeometry args={[0.1, 0.28, 6]} />
              </Part>
            )
          })}
        </>
      )
    case 'curly':
      return (
        <>
          {cap}
          {Array.from({ length: 11 }, (_, i) => {
            const a = (i / 11) * Math.PI * 2
            const y = 1.28 + (i % 3) * 0.12
            return (
              <Part key={i} color={c} outline={o} position={[Math.sin(a) * 0.36, y, Math.cos(a) * 0.3 - 0.12]}>
                <sphereGeometry args={[0.13, 10, 8]} />
              </Part>
            )
          })}
        </>
      )
    default:
      return cap
  }
}

function Accessory({ look, o }: { look: CharacterLook; o: boolean }) {
  const a = look.accent
  switch (look.accessory) {
    case 'bow':
      return (
        <group position={[0.18, 1.52, -0.02]} rotation={[0, 0, -0.35]}>
          <Part color={a} outline={o} position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.09, 0.18, 8]} />
          </Part>
          <Part color={a} outline={o} position={[0.1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.09, 0.18, 8]} />
          </Part>
          <Part color={a} outline={o}>
            <sphereGeometry args={[0.05, 8, 8]} />
          </Part>
        </group>
      )
    case 'headphones':
      return (
        <group position={[0, 1.2, 0]}>
          <Part color="#2d2d3a" outline={o} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.41, 0.035, 8, 24, Math.PI]} />
          </Part>
          {[-1, 1].map((s) => (
            <Part key={s} color={a} outline={o} position={[s * 0.4, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.11, 0.11, 0.09, 14]} />
            </Part>
          ))}
        </group>
      )
    case 'cap':
      return (
        <>
          <Part color={a} outline={o} position={[0, 1.24, 0]}>
            <sphereGeometry args={[0.4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </Part>
          <Part color={a} outline={o} position={[0, 1.26, 0.38]}>
            <boxGeometry args={[0.38, 0.03, 0.24]} />
          </Part>
        </>
      )
    case 'chef':
      return (
        <>
          <Part color="#ffffff" outline={o} position={[0, 1.58, 0]}>
            <cylinderGeometry args={[0.27, 0.3, 0.3, 16]} />
          </Part>
          <Part color="#ffffff" outline={o} position={[0, 1.82, 0]}>
            <sphereGeometry args={[0.32, 16, 12]} />
          </Part>
        </>
      )
    case 'crown':
      return (
        <group position={[0, 1.56, 0]}>
          <Part color="#ffd84a" outline={o}>
            <cylinderGeometry args={[0.2, 0.2, 0.12, 12, 1, true]} />
          </Part>
          {Array.from({ length: 5 }, (_, i) => {
            const t = (i / 5) * Math.PI * 2
            return (
              <Part key={i} color="#ffd84a" outline={o} position={[Math.sin(t) * 0.19, 0.11, Math.cos(t) * 0.19]}>
                <coneGeometry args={[0.045, 0.12, 5]} />
              </Part>
            )
          })}
        </group>
      )
    case 'hat':
      return (
        <group position={[0, 1.46, 0]}>
          <Part color="#6b4423" outline={o}>
            <cylinderGeometry args={[0.58, 0.58, 0.04, 20]} />
          </Part>
          <Part color="#6b4423" outline={o} position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.28, 0.32, 0.3, 16]} />
          </Part>
          <Part color={a} outline={false} position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.325, 0.325, 0.07, 16]} />
          </Part>
        </group>
      )
    case 'flower':
      return (
        <Part color={a} outline={o} position={[0.24, 1.46, 0.12]}>
          <sphereGeometry args={[0.08, 8, 8]} />
        </Part>
      )
    default:
      return null
  }
}

export function Avatar({ look, speedRef, idle = false, scale = 1.1, outline = true }: AvatarProps) {
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const phase = useRef(Math.random() * 10)
  const o = outline

  useFrame((_, dt) => {
    const speed = idle ? 0 : speedRef ? speedRef.current : 1.4
    phase.current += Math.min(dt, 0.05) * (2 + speed * 2.4)
    const swing = Math.min(1, speed / 3) * 0.85
    const s = Math.sin(phase.current)
    if (legL.current) legL.current.rotation.x = s * swing
    if (legR.current) legR.current.rotation.x = -s * swing
    if (armL.current) armL.current.rotation.x = -s * swing * 0.9
    if (armR.current) armR.current.rotation.x = s * swing * 0.9
    if (body.current) {
      const breathe = speed < 0.1 ? Math.sin(phase.current * 0.6) * 0.012 : 0
      body.current.position.y = Math.abs(Math.cos(phase.current)) * 0.06 * swing + breathe
    }
  })

  const leg = look.skirt ? look.skin : look.bottom
  return (
    <group scale={scale}>
      {[legL, legR].map((ref, i) => (
        <group key={i} ref={ref} position={[i ? 0.11 : -0.11, 0.42, 0]}>
          <Part color={leg} outline={o} position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.085, 0.18, 4, 10]} />
          </Part>
          <Part color={look.shoes} outline={o} position={[0, -0.36, 0.04]}>
            <boxGeometry args={[0.17, 0.11, 0.25]} />
          </Part>
        </group>
      ))}
      <group ref={body}>
        {/* torso */}
        <Part color={look.top} outline={o} position={[0, 0.68, 0]}>
          <capsuleGeometry args={[0.22, 0.2, 6, 14]} />
        </Part>
        {look.skirt ? (
          <Part color={look.bottom} outline={o} position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.21, 0.36, 0.3, 16]} />
          </Part>
        ) : (
          <Part color={look.accent} outline={false} position={[0, 0.54, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.215, 0.035, 8, 20]} />
          </Part>
        )}
        {look.backpack && (
          <Part color="#8b5a2b" outline={o} position={[0, 0.72, -0.27]}>
            <boxGeometry args={[0.36, 0.4, 0.18]} />
          </Part>
        )}
        {[armL, armR].map((ref, i) => (
          <group key={i} ref={ref} position={[i ? 0.3 : -0.3, 0.82, 0]}>
            <Part color={look.top} outline={o} position={[0, -0.14, 0]} rotation={[0, 0, i ? -0.12 : 0.12]}>
              <capsuleGeometry args={[0.07, 0.18, 4, 10]} />
            </Part>
            <Part color={look.skin} outline={o} position={[i ? 0.03 : -0.03, -0.31, 0]}>
              <sphereGeometry args={[0.075, 10, 8]} />
            </Part>
          </group>
        ))}
        {/* cabeza */}
        <Part color={look.skin} outline={o} position={[0, 1.18, 0]}>
          <sphereGeometry args={[0.37, 24, 18]} />
        </Part>
        {/* ojos, brillo, rubor y boca */}
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <mesh position={[sx * 0.13, 1.17, 0.33]} material={toon('#1b1410')}>
              <capsuleGeometry args={[0.042, 0.06, 4, 8]} />
            </mesh>
            <mesh position={[sx * 0.13 + 0.015, 1.2, 0.372]}>
              <sphereGeometry args={[0.017, 6, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[sx * 0.22, 1.07, 0.29]} scale={[1, 0.6, 0.35]}>
              <sphereGeometry args={[0.05, 8, 6]} />
              <meshBasicMaterial color="#ff9fae" transparent opacity={0.75} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.05, 0.355]} rotation={[0, 0, Math.PI / 2]} material={toon('#8a3b2b')}>
          <capsuleGeometry args={[0.013, 0.05, 3, 6]} />
        </mesh>
        <Hair look={look} o={o} />
        <Accessory look={look} o={o} />
      </group>
    </group>
  )
}
