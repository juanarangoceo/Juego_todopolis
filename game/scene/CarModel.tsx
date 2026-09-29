'use client'

// Carro deportivo de primitivas: carrocería lacada, cabina de vidrio, luces y
// neón por debajo. El origen está en el suelo, centro del carro; mira a +Z.

export function CarModel({ color = '#ff2d55', lightsOn = true }: { color?: string; lightsOn?: boolean }) {
  return (
    <group>
      {/* carrocería */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.9, 0.55, 4.2]} />
        <meshPhysicalMaterial color={color} metalness={0.25} roughness={0.3} clearcoat={1} clearcoatRoughness={0.1} emissive={color} emissiveIntensity={0.18} />
      </mesh>
      {/* cabina */}
      <mesh position={[0, 1.05, -0.25]}>
        <boxGeometry args={[1.6, 0.5, 2.1]} />
        <meshPhysicalMaterial color="#0b0b18" metalness={0.9} roughness={0.05} transparent opacity={0.85} />
      </mesh>
      {/* ruedas */}
      {[
        [-0.95, 1.35],
        [0.95, 1.35],
        [-0.95, -1.35],
        [0.95, -1.35],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.36, 0.36, 0.3, 14]} />
          <meshStandardMaterial color="#111" roughness={0.8} />
        </mesh>
      ))}
      {/* faros y stops */}
      <mesh position={[0, 0.62, 2.11]}>
        <boxGeometry args={[1.5, 0.12, 0.04]} />
        <meshBasicMaterial color={lightsOn ? '#fff6d8' : '#666'} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.66, -2.11]}>
        <boxGeometry args={[1.6, 0.1, 0.04]} />
        <meshBasicMaterial color="#ff1133" toneMapped={false} />
      </mesh>
      {/* neón inferior */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.3, 4.6]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  )
}
