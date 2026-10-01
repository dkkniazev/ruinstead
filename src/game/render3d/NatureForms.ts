import * as T from 'three';

const crowns = new Map<string, T.BufferGeometry>();
const rocks = new Map<string, T.BufferGeometry>();
export const naturalSurfaceMaterial = new T.MeshStandardMaterial({vertexColors:true,roughness:.94});
naturalSurfaceMaterial.userData.sharedArtMaterial = true;
const hash = (n: number) => { const x = Math.sin(n * 127.13) * 43758.5453; return x - Math.floor(x); };

/** Broad, irregular leaf masses with shaded undersides; shared between trees and bushes. */
export function foliageCrown(seed: number, color: number, pine = false): T.BufferGeometry {
  const variant = Math.abs(seed) % 8, key = `${variant}:${color}:${pine}`;
  const cached = crowns.get(key); if (cached) return cached;
  const positions: number[] = [], colors: number[] = [], sides = pine ? 10 : 12;
  const profile = pine
    ? [[-1, .72], [-.72, 1], [-.22, .78], [.38, .43], [.91, .05]]
    : [[-.82, .23], [-.53, .78], [-.08, 1], [.42, .91], [.79, .54], [.95, .08]];
  const rings = profile.map(([y, radius], band) => Array.from({ length: sides }, (_, i) => {
    const angle = i / sides * Math.PI * 2, r = radius * (.84 + hash(variant * 43 + i * 7) * .25);
    return new T.Vector3(Math.cos(angle) * r + y * .12,
      y + (band === 0 ? 0 : (hash(i * 13 + variant) - .5) * .14), Math.sin(angle) * r);
  }));
  const base = new T.Color(color), light = new T.Color(0xc6d78a), shade = new T.Color(0x234c48);
  const emit = (a: T.Vector3, b: T.Vector3, c: T.Vector3, face: number) => {
    for (const p of [a, c, b]) {
      positions.push(p.x, p.y, p.z);
      const tint = base.clone().lerp(shade, Math.max(0, .3 - p.y * .25))
        .lerp(light, Math.max(0, p.y) * .12).multiplyScalar(.94 + hash(face + variant * 29) * .1);
      colors.push(tint.r, tint.g, tint.b);
    }
  };
  for (let j = 1; j < rings.length; j++) for (let i = 0; i < sides; i++) {
    const n = (i + 1) % sides;
    emit(rings[j - 1][i], rings[j][n], rings[j][i], i + j * sides);
    emit(rings[j - 1][i], rings[j - 1][n], rings[j][n], i + j * sides);
  }
  for (let i = 0; i < sides; i++) {
    const n = (i + 1) % sides;
    emit(new T.Vector3(0, profile[0][0], 0), rings[0][n], rings[0][i], i);
    const top = rings.length - 1;
    emit(new T.Vector3(.12, profile[top][0], 0), rings[top][i], rings[top][n], i);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); crowns.set(key, geometry); return geometry;
}

/** A small radial fern, low enough that walking through it reads naturally. */
export function fernGeometry(color: number, dry = false): T.BufferGeometry {
  const positions: number[] = [], colors: number[] = [], base = new T.Color(color);
  for (let frond = 0; frond < 7; frond++) {
    const angle = frond * 2.399, length = 19 + frond % 3 * 4;
    const point = (t: number, side: number) => new T.Vector3(
      Math.cos(angle) * length * t - Math.sin(angle) * side,
      Math.sin(t * Math.PI * .77) * (dry ? 10 : 16),
      Math.sin(angle) * length * t + Math.cos(angle) * side);
    for (let leaf = 0; leaf < 4; leaf++) {
      const t = .15 + leaf * .19, width = (1 - t) * (dry ? 3 : 6);
      for (const side of [-1, 1]) for (const p of [point(t, 0), point(t + .12, side * width), point(t + .26, 0)]) {
        positions.push(...p.toArray());
        const c = base.clone().multiplyScalar(.75 + p.y / 45); colors.push(c.r, c.g, c.b);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); return geometry;
}

/** Flat petals catch light from above without looking like floating beads. */
export function flowerGeometry(): T.BufferGeometry {
  const positions: number[] = [], indices: number[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = i / 5 * Math.PI * 2;
    for (const [r, a, y] of [[0, angle, .2], [.85, angle - .4, .1], [1, angle, .3], [.85, angle + .4, .1]])
      positions.push(Math.cos(a) * r, y, Math.sin(a) * r);
    const n = i * 4; indices.push(n, n + 2, n + 1, n, n + 3, n + 2);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export function flagstoneGeometry(): T.BufferGeometry {
  const shape = new T.Shape();
  const outline = [[-.44, -.5], [.38, -.5], [.5, -.35], [.5, .43], [.38, .5], [-.5, .4], [-.5, -.32]];
  outline.forEach(([x, z], i) => i ? shape.lineTo(x, z) : shape.moveTo(x, z)); shape.closePath();
  const geometry = new T.ExtrudeGeometry(shape, { depth: .14, bevelEnabled: true,
    bevelSegments: 1, bevelThickness: .04, bevelSize: .04, steps: 1, curveSegments: 1 });
  geometry.rotateX(-Math.PI / 2); geometry.scale(1, 1 / .22, 1); geometry.translate(0, .04 / .22, 0);
  return geometry;
}

/** Fractured shoulders and a slanted summit, with large coloured stone planes. */
export function fracturedRock(seed: number, color: number): T.BufferGeometry {
  const variant = Math.abs(seed) % 8, key = `${variant}:${color}`;
  const cached = rocks.get(key); if(cached) return cached;
  const sides=7, profile=[[0,.82],[.13,1],[.61,.87],[.9,.48],[1,.19]], positions:number[]=[],colors:number[]=[];
  const rings=profile.map(([y,r])=>Array.from({length:sides},(_,i)=>{
    const angle=i/sides*Math.PI*2,radius=r*(.78+hash(variant*19+i*13)*.27);
    return new T.Vector3(Math.cos(angle)*radius+y*.22,y+(y===0?0:(hash(i*7+variant)-.5)*.15),Math.sin(angle)*radius);
  }));
  const base=new T.Color(color);
  const emit=(a:T.Vector3,b:T.Vector3,c:T.Vector3,face:number)=>{
    const tint=base.clone().multiplyScalar(.84+hash(variant+face*17)*.23);
    for(const p of [a,b,c]){positions.push(...p.toArray());const col=tint.clone().multiplyScalar(.8+p.y*.24);colors.push(col.r,col.g,col.b);}
  };
  for(let j=1;j<rings.length;j++)for(let i=0;i<sides;i++){
    const n=(i+1)%sides;emit(rings[j-1][i],rings[j][i],rings[j][n],i);emit(rings[j-1][i],rings[j][n],rings[j-1][n],i);
  }
  for(let i=0;i<sides;i++){const n=(i+1)%sides;emit(new T.Vector3(),rings[0][i],rings[0][n],i);emit(new T.Vector3(.22,1,0),rings[4][n],rings[4][i],i);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();rocks.set(key,geometry);return geometry;
}
