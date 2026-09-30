'use client'

import { Outlines, RoundedBox } from '@react-three/drei'
import { toon } from './toon'

// Carrito redondeado de caricatura. Origen en el suelo, centro del carro; mira a +Z.

const INK = '#2b1d14'

export function CarModel({ color = '#e8559a' }: { color?: string; lightsOn?: boolean }) {
  return (
    <group>
      {/* carrocería */}
      <RoundedBox args={[1.9, 0.85, 4.2]} radius={0.38} smoothness={4} position={[0, 0.72, 0]} material={toon(color)} castShadow>
        <Outlines thickness={0.05} color={INK} />
      </RoundedBox>
      {/* cabina */}
      <mesh position={[0, 1.12, -0.3]} scale={[1, 0.8, 1.3]} material={toon('#bfe6f5')} castShadow>
        <sphereGeometry args={[0.8, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Outlines thickness={0.05} color={INK} />
      </mesh>
      {/* ruedas */}
      {[
        [-0.82, 1.3],
        [0.82, 1.3],
        [-0.82, -1.3],
        [0.82, -1.3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} rotation={[0, 0, Math.PI / 2]} material={toon('#2a2530')}>
          <cylinderGeometry args={[0.36, 0.36, 0.28, 12]} />
        </mesh>
      ))}
      {/* faros */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.72, 2.12]} material={toon('#fff3b0')}>
          <sphereGeometry args={[0.17, 10, 8]} />
        </mesh>
      ))}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.75, -2.1]} material={toon('#ff4d4d')}>
          <boxGeometry args={[0.3, 0.16, 0.08]} />
        </mesh>
      ))}
    </group>
  )
}
