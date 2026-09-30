'use client'

import * as THREE from 'three'

// Materiales de caricatura (estilo MMORPG isométrico clásico): luz en 3 tonos
// planos, contornos oscuros y, en los edificios, un "recorte" que abre un
// hueco alrededor del personaje cuando una casa lo tapa desde la cámara.

/** Posición del jugador para el recorte. La actualiza el jugador en cada cuadro. */
export const sharedUniforms = {
  uPlayer: { value: new THREE.Vector3(0, -999, 0) },
}

let gradient: THREE.DataTexture | null = null

/** Rampa de luz de 3 escalones: sombra, medio tono y luz. */
export function toonGradient(): THREE.DataTexture {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat)
    gradient.minFilter = THREE.NearestFilter
    gradient.magFilter = THREE.NearestFilter
    gradient.generateMipmaps = false
    gradient.needsUpdate = true
  }
  return gradient
}

const VARYINGS = 'varying vec3 vWPos;\nvarying vec3 vWNormal;'

const WORLD_POS_VERTEX = `#include <project_vertex>
  vec4 twp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    twp = instanceMatrix * twp;
  #endif
  vWPos = (modelMatrix * twp).xyz;
  vec3 tn = normal;
  #ifdef USE_INSTANCING
    tn = mat3(instanceMatrix) * tn;
  #endif
  vWNormal = normalize(mat3(modelMatrix) * tn);`

// Abre un hueco con tramado entre la cámara y el jugador.
const CUTOUT_FRAGMENT = `
  {
    vec3 target = uPlayer + vec3(0.0, 0.9, 0.0);
    vec3 toP = target - cameraPosition;
    float L = length(toP);
    vec3 dir = toP / max(L, 0.0001);
    vec3 rel = vWPos - cameraPosition;
    float t = dot(rel, dir);
    if (t > 0.0 && t < L - 1.4) {
      float dist = length(rel - dir * t);
      float r = 3.6;
      if (dist < r) {
        vec2 p = floor(gl_FragCoord.xy);
        float dither = fract((p.x * 0.5 + p.y * 0.25) + fract(p.y * 0.5) * 0.5);
        if (dither > smoothstep(r * 0.55, r, dist) - 0.001) discard;
      }
    }
  }
  #include <clipping_planes_fragment>`

// Ventanas con marco de madera, vigas en cada piso y zócalo de piedra,
// dibujadas según la posición en el mundo (sirve para casas de cualquier tamaño).
const WINDOWS_FRAGMENT = `#include <color_fragment>
  {
    vec3 an = abs(vWNormal);
    if (an.y < 0.5) {
      float along = an.x > 0.5 ? vWPos.z : vWPos.x;
      float y = vWPos.y;
      vec3 wood = vec3(0.36, 0.22, 0.13);
      vec3 stone = vec3(0.66, 0.62, 0.55);
      if (y < 1.3) {
        // zócalo de piedra con juntas
        vec2 b = vec2(along / 1.1 + floor(y / 0.45) * 0.5, y / 0.45);
        vec2 bf = fract(b);
        float joint = step(bf.x, 0.06) + step(bf.y, 0.1);
        diffuseColor.rgb = mix(stone, stone * 0.7, clamp(joint, 0.0, 1.0));
      } else {
        vec2 g = vec2(along / 3.0, (y - 1.3) / 3.2);
        vec2 f = fract(g);
        vec2 id = floor(g);
        float h = fract(sin(dot(id + floor(vWPos.xz * 0.07) * 13.0, vec2(12.9898, 78.233))) * 43758.5453);
        // viga horizontal en cada piso
        if (f.y < 0.07) diffuseColor.rgb = wood;
        else if (h > 0.18) {
          float inX = step(0.3, f.x) * step(f.x, 0.7);
          float inY = step(0.3, f.y) * step(f.y, 0.82);
          float frX = step(0.25, f.x) * step(f.x, 0.75);
          float frY = step(0.25, f.y) * step(f.y, 0.87);
          if (inX * inY > 0.5) {
            // vidrio con reflejo diagonal
            float shine = step(0.62, fract((f.x + f.y) * 2.2));
            vec3 glass = mix(vec3(0.42, 0.62, 0.78), vec3(0.78, 0.9, 0.97), shine * 0.6);
            if (abs(f.x - 0.5) < 0.012 || abs(f.y - 0.56) < 0.015) glass = wood;
            diffuseColor.rgb = glass;
          } else if (frX * frY > 0.5) diffuseColor.rgb = wood;
        }
      }
    }
  }`

const SHINGLES_FRAGMENT = `#include <color_fragment>
  {
    // hileras de tejas: franjas más oscuras cada 45 cm y juntas escalonadas
    float row = vWPos.y / 0.45;
    float fr = fract(row);
    float along = abs(vWNormal.x) > abs(vWNormal.z) ? vWPos.z : vWPos.x;
    float seam = fract(along / 0.9 + floor(row) * 0.5);
    if (fr < 0.14 || seam < 0.05) diffuseColor.rgb *= 0.74;
  }`

interface ToonOptions {
  shingles?: boolean
  color?: THREE.ColorRepresentation
  map?: THREE.Texture | null
  cutout?: boolean
  windows?: boolean
  transparent?: boolean
  opacity?: number
  side?: THREE.Side
  emissive?: THREE.ColorRepresentation
  emissiveIntensity?: number
}

function patch(m: THREE.Material, opts: { cutout?: boolean; windows?: boolean; shingles?: boolean }) {
  if (!opts.cutout && !opts.windows && !opts.shingles) return
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uPlayer = sharedUniforms.uPlayer
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VARYINGS}`)
      .replace('#include <project_vertex>', WORLD_POS_VERTEX)
    let fs = shader.fragmentShader.replace('#include <common>', `#include <common>\n${VARYINGS}\nuniform vec3 uPlayer;`)
    if (opts.cutout) fs = fs.replace('#include <clipping_planes_fragment>', CUTOUT_FRAGMENT)
    if (opts.windows) fs = fs.replace('#include <color_fragment>', WINDOWS_FRAGMENT)
    else if (opts.shingles) fs = fs.replace('#include <color_fragment>', SHINGLES_FRAGMENT)
    shader.fragmentShader = fs
  }
  m.customProgramCacheKey = () => `toon-${opts.cutout ? 'c' : ''}${opts.windows ? 'w' : ''}${opts.shingles ? 's' : ''}`
}

export function makeToon(opts: ToonOptions = {}): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({
    color: opts.color ?? '#ffffff',
    gradientMap: toonGradient(),
    map: opts.map ?? null,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    emissive: opts.emissive ?? '#000000',
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  })
  patch(m, opts)
  return m
}

/** Contorno por "casco invertido": la misma forma un poco más grande, negra y de espaldas. */
export function makeOutline(cutout = false, color = '#2b1d14'): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide })
  patch(m, { cutout })
  return m
}

const cache = new Map<string, THREE.MeshToonMaterial>()
/** Material toon compartido por color (sin recorte): para piezas pequeñas repetidas. */
export function toon(color: string): THREE.MeshToonMaterial {
  let m = cache.get(color)
  if (!m) {
    m = makeToon({ color })
    cache.set(color, m)
  }
  return m
}

/** Prisma triangular de 1×1×1 (base en y=0, cumbrera en y=1) para los techos. */
export function roofGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(-0.5, 0)
  shape.lineTo(0.5, 0)
  shape.lineTo(0, 1)
  shape.lineTo(-0.5, 0)
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false })
  g.translate(0, 0, -0.5)
  g.computeVertexNormals()
  return g
}
