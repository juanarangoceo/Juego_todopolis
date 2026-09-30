'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { City } from './City'
import { Traffic, Pedestrians } from './Traffic'
import { Vehicles } from './Vehicles'
import { PlayerRig } from './PlayerRig'
import { Interior } from './Interior'
import { SPAWN, STORES } from '../lib/city'
import { bindDesktopInput, player, releasePointer } from '../lib/input'
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

/** Sol de la tarde: la sombra se calcula solo alrededor del jugador. */
function Sun({ shadows }: { shadows: boolean }) {
  const light = useRef<THREE.DirectionalLight>(null)
  useFrame(() => {
    const l = light.current
    if (!l) return
    l.position.set(player.x + 40, 70, player.z + 25)
    l.target.position.set(player.x, 0, player.z)
    l.target.updateMatrixWorld()
  })
  return (
    <directionalLight
      ref={light}
      intensity={2.1}
      color="#fff1d6"
      castShadow={shadows}
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-55}
      shadow-camera-right={55}
      shadow-camera-top={55}
      shadow-camera-bottom={-55}
      shadow-camera-near={10}
      shadow-camera-far={180}
      shadow-bias={-0.0006}
      shadow-normalBias={0.04}
    />
  )
}

function CityScene({ shadows }: { shadows: boolean }) {
  const returnTo = useGame((s) => s.returnTo)
  const spawn = useMemo(() => returnTo ?? { x: SPAWN[0], z: SPAWN[2], yaw: 0 }, [returnTo])
  return (
    <>
      <color attach="background" args={['#bfe3fb']} />
      <fog attach="fog" args={['#cfeafc', 140, 460]} />
      <hemisphereLight args={['#dff1ff', '#8a7a5c', 1.15]} />
      <ambientLight intensity={0.25} />
      <Sun shadows={shadows} />
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
      <color attach="background" args={['#2a1c14']} />
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
      flat
      shadows={quality === 'high' ? 'soft' : false}
      dpr={quality === 'high' ? [1, 1.75] : [0.8, 1.25]}
      camera={{ fov: 34, near: 0.5, far: 2400, position: [0, 30, 40] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ position: 'fixed', inset: 0, touchAction: 'none' }}
    >
      <InputBinder />
      <Suspense fallback={null}>
        {mode === 'interior' && storeId ? <InteriorScene key={storeId} storeId={storeId} /> : <CityScene key="city" shadows={quality === 'high'} />}
      </Suspense>
    </Canvas>
  )
}
