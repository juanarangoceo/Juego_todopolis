'use client'

import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Avatar } from '../scene/Avatar'
import { toon } from '../scene/toon'
import { CHARACTERS, SKIN_TONES, type CharacterLook } from '../lib/characters'
import { useGame } from '../lib/store'

function Turntable({ look }: { look: CharacterLook }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.7
  })
  return (
    <group ref={ref}>
      <Avatar look={look} speedRef={{ current: 0 }} scale={1.2} />
      <mesh position={[0, -0.08, 0]} material={toon('#c9b48f')} receiveShadow>
        <cylinderGeometry args={[0.95, 1.05, 0.16, 32]} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={toon('#f5b73b')}>
        <ringGeometry args={[0.8, 0.9, 32]} />
      </mesh>
    </group>
  )
}

export function CharacterSelect() {
  const current = useGame((s) => s.character)
  const setCharacter = useGame((s) => s.setCharacter)
  const setChoosing = useGame((s) => s.setChoosing)
  const [id, setId] = useState(current?.id ?? CHARACTERS[0].id)
  const def = CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]
  const [skin, setSkin] = useState(current?.skin ?? def.look.skin)
  const [name, setName] = useState(current?.name ?? '')

  const pick = (cid: string) => {
    setId(cid)
    const d = CHARACTERS.find((c) => c.id === cid)
    if (d && !current) setSkin(d.look.skin)
  }
  const confirm = () => setCharacter({ id, skin, name: name.trim().slice(0, 16) || def.name })

  return (
    <div className="welcome">
      <div className="panel glass select-panel">
        {current && (
          <button className="btn icon-btn close" onClick={() => setChoosing(false)} aria-label="Cerrar">
            ✕
          </button>
        )}
        <div className="eyebrow">Elige tu personaje</div>
        <h2 className="title" style={{ margin: '4px 0 12px', fontSize: 26 }}>
          ¿Quién recorre Todópolis hoy?
        </h2>
        <div className="select-grid">
          <div className="preview">
            <Canvas flat camera={{ position: [0, 1.5, 5.2], fov: 32 }} onCreated={({ camera }) => camera.lookAt(0, 1.05, 0)}>
              <hemisphereLight args={['#fff4e0', '#8a7a5c', 1.3]} />
              <directionalLight position={[2, 4, 3]} intensity={1.8} />
              <Turntable look={{ ...def.look, skin }} />
            </Canvas>
            <div className="preview-caption">
              <b className="title" style={{ fontSize: 20 }}>
                {name.trim() || def.name}
              </b>
              <span>{def.title}</span>
            </div>
          </div>
          <div className="select-side">
            <div className="char-cards">
              {CHARACTERS.map((c) => (
                <button key={c.id} className={`char-card ${c.id === id ? 'on' : ''}`} onClick={() => pick(c.id)}>
                  <span className="char-swatch" style={{ background: `linear-gradient(135deg, ${c.look.top} 50%, ${c.look.hair} 50%)` }} />
                  <span>
                    <b>{c.name}</b>
                    <small>{c.title}</small>
                  </span>
                </button>
              ))}
            </div>
            <p className="desc" style={{ margin: '10px 0' }}>
              {def.description}
            </p>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Tono de piel
            </div>
            <div className="chips" style={{ marginBottom: 12 }}>
              {SKIN_TONES.map((t) => (
                <button key={t} className={`skin-dot ${t === skin ? 'on' : ''}`} style={{ background: t }} onClick={() => setSkin(t)} aria-label="Tono de piel" />
              ))}
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="pname">Tu nombre en la ciudad</label>
              <input id="pname" maxLength={16} placeholder={def.name} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button className="btn btn-cta" style={{ width: '100%' }} onClick={confirm}>
              Jugar con {name.trim() || def.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
