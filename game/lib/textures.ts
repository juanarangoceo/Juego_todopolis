'use client'

import { useEffect, useState } from 'react'
import * as THREE from 'three'

// Texturas de producto sin Suspense: si una foto falla, la vitrina muestra el
// marco vacío y la ciudad sigue. Con `useTexture` de drei, una sola foto rota
// tumbaba la escena entera.

const cache = new Map<string, Promise<THREE.Texture>>()
const loader = new THREE.TextureLoader()

export function loadTexture(url: string): Promise<THREE.Texture> {
  let p = cache.get(url)
  if (!p) {
    p = new Promise((resolve, reject) => {
      loader.load(
        url,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = 4
          resolve(t)
        },
        undefined,
        reject
      )
    })
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p
}

export function useSafeTexture(url: string | null): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let alive = true
    setTex(null)
    if (!url) return
    loadTexture(url).then(
      (t) => alive && setTex(t),
      () => alive && setTex(null)
    )
    return () => {
      alive = false
    }
  }, [url])
  return tex
}

/** Textura de líneas discontinuas para el eje de las calles. */
export function makeDashTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 128
  const g = c.getContext('2d')!
  g.clearRect(0, 0, 16, 128)
  g.fillStyle = '#ffd84a'
  g.fillRect(4, 0, 8, 64)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** Baldosas para aceras y plaza. */
export function makeTileTexture(base: string, line: string, cells = 8): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = base
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = line
  g.lineWidth = 2
  const step = 256 / cells
  for (let i = 0; i <= cells; i++) {
    g.beginPath()
    g.moveTo(i * step, 0)
    g.lineTo(i * step, 256)
    g.stroke()
    g.beginPath()
    g.moveTo(0, i * step)
    g.lineTo(256, i * step)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
