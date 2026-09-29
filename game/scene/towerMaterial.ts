'use client'

import * as THREE from 'three'

// Material de los rascacielos: las ventanas se dibujan en el shader según la
// posición en el mundo, así un edificio de 20 m y uno de 100 m tienen ventanas
// del mismo tamaño sin una textura por edificio. Cada ventana se prende o no
// según un hash de su celda: la ciudad se ve habitada sin costo extra.

export function createTowerMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.18, metalness: 0.65 })
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNormal;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 twp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          twp = instanceMatrix * twp;
        #endif
        vWPos = (modelMatrix * twp).xyz;
        vWNormal = normalize(mat3(modelMatrix) * objectNormal);`
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNormal;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec3 an = abs(vWNormal);
          float side = step(an.y, 0.5);
          vec2 cell = an.x > 0.5 ? vec2(vWPos.z, vWPos.y) : vec2(vWPos.x, vWPos.y);
          vec2 g = vec2(cell.x / 2.8, (cell.y - 1.0) / 3.6);
          vec2 f = fract(g);
          vec2 id = floor(g);
          float win = step(0.16, f.x) * step(f.x, 0.84) * step(0.22, f.y) * step(f.y, 0.82);
          float h = fract(sin(dot(id + floor(vWPos.xz * 0.043) * 17.0 + an.xz * 3.0, vec2(12.9898, 78.233))) * 43758.5453);
          float lit = step(0.58, h);
          vec3 warm = vec3(1.0, 0.82, 0.55);
          vec3 cool = vec3(0.65, 0.85, 1.0);
          vec3 tint = vec3(1.0);
          #if defined( USE_COLOR )
            tint = normalize(vColor.rgb + 0.0001) * 1.6;
          #endif
          vec3 wc = h > 0.93 ? tint : mix(warm, cool, step(0.78, h));
          float aboveGround = step(4.0, vWPos.y);
          totalEmissiveRadiance += side * win * lit * aboveGround * wc * 1.35;
        }`
      )
  }
  return m
}
