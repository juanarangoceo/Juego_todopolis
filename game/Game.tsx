'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useGame } from './lib/store'
import { Hud } from './hud/Hud'
import { Welcome } from './hud/Welcome'
import { CharacterSelect } from './hud/CharacterSelect'
import type { CatalogResponse } from '@/lib/catalog-types'

// El lienzo 3D solo existe en el navegador (WebGL + WASM de Rapier).
const GameCanvas = dynamic(() => import('./scene/GameCanvas').then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => <div className="loading">CARGANDO TODÓPOLIS…</div>,
})

function pickQuality(): 'high' | 'low' {
  if (typeof window === 'undefined') return 'high'
  const q = new URLSearchParams(window.location.search).get('calidad')
  if (q === 'alta') return 'high'
  if (q === 'baja') return 'low'
  // En teléfonos se apagan el bloom y el antialiasing: la GPU no da para todo.
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  return coarse || (navigator.hardwareConcurrency ?? 8) <= 4 ? 'low' : 'high'
}

export function Game() {
  const started = useGame((s) => s.started)
  const hydrate = useGame((s) => s.hydrate)
  const setCatalog = useGame((s) => s.setCatalog)
  const catalog = useGame((s) => s.catalog)
  const catalogError = useGame((s) => s.catalogError)
  const character = useGame((s) => s.character)
  const choosing = useGame((s) => s.choosing)
  const [quality, setQuality] = useState<'high' | 'low' | null>(null)

  useEffect(() => {
    hydrate()
    const q = pickQuality()
    setQuality(q)
    useGame.getState().setQuality(q)
    let alive = true
    fetch('/api/catalog')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((c: CatalogResponse) => alive && setCatalog(c))
      .catch(() => alive && setCatalog(null, true))
    return () => {
      alive = false
    }
  }, [hydrate, setCatalog])

  return (
    <>
      {quality && <GameCanvas quality={quality} />}
      {started && character && <Hud />}
      {started && (!character || choosing) && <CharacterSelect />}
      {!started && <Welcome ready={!!quality && (!!catalog || catalogError)} />}
    </>
  )
}
