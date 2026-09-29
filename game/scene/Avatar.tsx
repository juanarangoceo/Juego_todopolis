'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Personaje estilizado hecho con primitivas: cuerpo de vidrio con filetes de
// neón. Liviano a propósito: la ciudad lo repite en cada peatón y asesor.

interface AvatarProps {
  color?: string
  skin?: string
  /** Velocidad actual (m/s) para animar el paso. */
  speedRef?: React.MutableRefObject<number>
  idle?: boolean
  scale?: number
}

export function Avatar({ color = '#ff4fd8', skin = '#f1c6a8', speedRef, idle = false, scale = 1 }: AvatarProps) {
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const phase = useRef(Math.random() * 10)

  useFrame((_, dt) => {
    const speed = idle ? 0 : speedRef ? speedRef.current : 1.4
    phase.current += dt * (2 + speed * 1.9)
    const swing = Math.min(1, speed / 3) * 0.75
    const s = Math.sin(phase.current)
    if (legL.current) legL.current.rotation.x = s * swing
    if (legR.current) legR.current.rotation.x = -s * swing
    if (armL.current) armL.current.rotation.x = -s * swing * 0.8
    if (armR.current) armR.current.rotation.x = s * swing * 0.8
    if (body.current) body.current.position.y = Math.abs(Math.cos(phase.current)) * 0.05 * swing + (idle ? Math.sin(phase.current * 0.3) * 0.01 : 0)
  })

  return (
    <group scale={scale}>
      <group ref={body}>
        {/* torso */}
        <mesh position={[0, 1.15, 0]}>
          <capsuleGeometry args={[0.26, 0.5, 6, 12]} />
          <meshStandardMaterial color={color} roughness={0.25} metalness={0.3} emissive={color} emissiveIntensity={0.25} />
        </mesh>
        {/* cinturón de neón */}
        <mesh position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.27, 0.03, 8, 24]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        {/* cabeza */}
        <mesh position={[0, 1.72, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={skin} roughness={0.6} />
        </mesh>
        {/* visor de vidrio */}
        <mesh position={[0, 1.74, 0.12]}>
          <boxGeometry args={[0.3, 0.09, 0.12]} />
          <meshPhysicalMaterial color="#111" roughness={0.05} metalness={0.9} emissive={color} emissiveIntensity={0.6} />
        </mesh>
        {/* brazos */}
        <group ref={armL} position={[-0.36, 1.38, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.08, 0.45, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.35} />
          </mesh>
        </group>
        <group ref={armR} position={[0.36, 1.38, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.08, 0.45, 4, 8]} />
            <meshStandardMaterial color={color} roughness={0.35} />
          </mesh>
        </group>
      </group>
      {/* piernas */}
      <group ref={legL} position={[-0.13, 0.82, 0]}>
        <mesh position={[0, -0.38, 0]}>
          <capsuleGeometry args={[0.1, 0.55, 4, 8]} />
          <meshStandardMaterial color="#1b1830" roughness={0.5} />
        </mesh>
      </group>
      <group ref={legR} position={[0.13, 0.82, 0]}>
        <mesh position={[0, -0.38, 0]}>
          <capsuleGeometry args={[0.1, 0.55, 4, 8]} />
          <meshStandardMaterial color="#1b1830" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}
