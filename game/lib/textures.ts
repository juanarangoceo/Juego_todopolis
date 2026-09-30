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

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Empedrado: piedras redondeadas en hileras desfasadas. */
export function makeCobbleTexture(base = '#a89880', gap = '#6f604f'): THREE.CanvasTexture {
  return canvasTexture(256, (g) => {
    const r = seeded(7)
    g.fillStyle = gap
    g.fillRect(0, 0, 256, 256)
    const rows = 8
    const h = 256 / rows
    for (let row = 0; row < rows; row++) {
      let x = row % 2 ? -h / 2 : 0
      while (x < 256) {
        const w = h * (0.8 + r() * 0.6)
        const shade = 0.85 + r() * 0.25
        const c = new THREE.Color(base).multiplyScalar(shade)
        g.fillStyle = `#${c.getHexString()}`
        g.beginPath()
        g.roundRect(x + 2, row * h + 2, w - 4, h - 4, 9)
        g.fill()
        // brillo superior de cada piedra
        g.fillStyle = 'rgba(255,255,255,0.12)'
        g.beginPath()
        g.roundRect(x + 5, row * h + 4, w - 12, (h - 8) * 0.35, 6)
        g.fill()
        x += w
      }
    }
  })
}

/** Baldosas de piedra clara para aceras y plazas. */
export function makeTileTexture(base: string, line: string, cells = 4): THREE.CanvasTexture {
  return canvasTexture(256, (g) => {
    const r = seeded(11)
    const step = 256 / cells
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const c = new THREE.Color(base).multiplyScalar(0.92 + r() * 0.14)
        g.fillStyle = `#${c.getHexString()}`
        g.fillRect(i * step, j * step, step, step)
      }
    }
    g.strokeStyle = line
    g.lineWidth = 4
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
  })
}

/** Pasto con manchas y florecitas. */
export function makeGrassTexture(): THREE.CanvasTexture {
  return canvasTexture(256, (g) => {
    const r = seeded(3)
    g.fillStyle = '#86c35f'
    g.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 60; i++) {
      g.fillStyle = r() < 0.5 ? '#79b653' : '#94cf6a'
      g.beginPath()
      g.ellipse(r() * 256, r() * 256, 10 + r() * 22, 6 + r() * 12, r() * 3, 0, Math.PI * 2)
      g.fill()
    }
    const flowers = ['#ffffff', '#ffd84a', '#ff8fb1', '#b690ff']
    for (let i = 0; i < 40; i++) {
      g.fillStyle = flowers[i % flowers.length]
      g.beginPath()
      g.arc(r() * 256, r() * 256, 2.2, 0, Math.PI * 2)
      g.fill()
    }
  })
}

/** Tablas de madera para pisos. */
export function makeWoodTexture(base = '#b07a4a'): THREE.CanvasTexture {
  return canvasTexture(256, (g) => {
    const r = seeded(5)
    const boards = 6
    const h = 256 / boards
    for (let b = 0; b < boards; b++) {
      const c = new THREE.Color(base).multiplyScalar(0.88 + r() * 0.2)
      g.fillStyle = `#${c.getHexString()}`
      g.fillRect(0, b * h, 256, h)
      g.strokeStyle = 'rgba(60,35,15,0.25)'
      g.lineWidth = 1.5
      for (let k = 0; k < 4; k++) {
        const y = b * h + 6 + r() * (h - 12)
        g.beginPath()
        g.moveTo(0, y)
        g.bezierCurveTo(80, y + 3, 170, y - 3, 256, y)
        g.stroke()
      }
      g.fillStyle = 'rgba(50,28,12,0.7)'
      g.fillRect(0, b * h, 256, 3)
      const cut = r() * 256
      g.fillRect(cut, b * h, 3, h)
    }
  })
}

/** Toldo a rayas. */
export function makeStripeTexture(a: string, b = '#fff8ec'): THREE.CanvasTexture {
  return canvasTexture(64, (g) => {
    g.fillStyle = b
    g.fillRect(0, 0, 64, 64)
    g.fillStyle = a
    g.fillRect(0, 0, 32, 64)
  })
}
