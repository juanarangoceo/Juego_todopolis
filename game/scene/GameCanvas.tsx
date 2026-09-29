'use client'

import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { City } from './City'
import { Traffic, Pedestrians } from './Traffic'
import { Vehicles } from './Vehicles'
import { PlayerRig } from './PlayerRig'
import { Interior } from './Interior'
import { SPAWN, STORES } from '../lib/city'
import { bindDesktopInput, releasePointer } from '../lib/input'
import { isUiBlocking, useGame } from '../lib/store'

function InputBinder() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const g = useGame.getState
    return bindDesktopInput(gl.domElement, () => isUiBlocking(g()), {
      map: () => {
        const s = g()
        if (!s.started) return
        s.setMap(!s.mapOpen)
        releasePointer()
      },
      help: () => {
        const s = g()
        if (!s.started) return
        s.setHelp(!s.helpOpen)
        releasePointer()
      },
      escape: () => {
        const s = g()
        if (s.checkoutOpen) s.setCheckout(false)
        else if (s.product) s.openProduct(null)
        else if (s.advisorOpen) s.setAdvisor(false)
        else if (s.spinOpen) s.setSpin(false)
        else if (s.mapOpen) s.setMap(false)
        else if (s.helpOpen) s.setHelp(false)
      },
    })
  }, [gl])

  // Al abrir un panel se suelta el ratón para poder hacer clic en él.
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        if (isUiBlocking(s) && !isUiBlocking(prev)) releasePointer()
      }),
    []
  )
  return null
}

function CityScene() {
  const returnTo = useGame((s) => s.returnTo)
  const spawn = useMemo(() => returnTo ?? { x: SPAWN[0], z: SPAWN[2], yaw: 0 }, [returnTo])
  return (
    <>
      <color attach="background" args={['#070514']} />
      <fog attach="fog" args={['#0c0820', 60, 330]} />
      <Stars radius={500} depth={60} count={2500} factor={6} fade speed={0.5} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#7a6cff', '#1a0f2e', 0.55]} />
      <directionalLight position={[-120, 200, 80]} intensity={0.55} color="#b9c4ff" />
      {/* luna */}
      <mesh position={[-300, 260, -500]}>
        <sphereGeometry args={[26, 24, 24]} />
        <meshBasicMaterial color="#fff4d6" toneMapped={false} />
      </mesh>
      <Physics gravity={[0, -20, 0]} timeStep="vary">
        <City />
        <Vehicles />
        <Traffic />
        <PlayerRig spawn={spawn} />
      </Physics>
      <Pedestrians />
    </>
  )
}

function InteriorScene({ storeId }: { storeId: string }) {
  const store = STORES.find((s) => s.id === storeId)
  if (!store) return null
  return (
    <>
      <color attach="background" args={['#0b0818']} />
      <fog attach="fog" args={['#0b0818', 30, 70]} />
      <Physics gravity={[0, -20, 0]} timeStep="vary">
        <Interior store={store} />
      </Physics>
    </>
  )
}

export function GameCanvas({ quality }: { quality: 'high' | 'low' }) {
  const mode = useGame((s) => s.mode)
  const storeId = useGame((s) => s.storeId)
  return (
    <Canvas
      dpr={quality === 'high' ? [1, 1.75] : [0.75, 1.1]}
      camera={{ fov: 62, near: 0.1, far: 1400, position: [0, 6, 30] }}
      gl={{ antialias: quality === 'high', powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0, touchAction: 'none' }}
    >
      <InputBinder />
      <Suspense fallback={null}>
        {mode === 'interior' && storeId ? <InteriorScene key={storeId} storeId={storeId} /> : <CityScene key="city" />}
      </Suspense>
      {quality === 'high' && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.7} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
