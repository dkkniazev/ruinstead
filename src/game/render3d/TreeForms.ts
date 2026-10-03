import * as T from 'three';

const forms = new Map<string, T.BufferGeometry>();

/** Closed rings share normals: the silhouette carries the stylization, not seams
 * between separate spheres/cylinders. All variants are reused by harvest nodes. */
function surface(key: string, rings: T.Vector3[][], colorAt: (p: T.Vector3, angle: number) => T.Color): T.BufferGeometry {
  const cached = forms.get(key); if (cached) return cached;
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const sides = rings[0].length;
  for (const ring of rings) for (let i = 0; i < sides; i++) {
    const p = ring[i], color = colorAt(p, i / sides * Math.PI * 2);
    positions.push(p.x, p.y, p.z); colors.push(color.r, color.g, color.b);
  }
  for (let j = 1; j < rings.length; j++) for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides, a = (j - 1) * sides + i, b = (j - 1) * sides + next;
    const c = j * sides + i, d = j * sides + next;
    indices.push(a, c, d, a, d, b);
  }
  // Small cap rings keep the pole normals stable and avoid a sharp pinched tip.
  for (const top of [false, true]) {
    const ringIndex = top ? rings.length - 1 : 0, ring = rings[ringIndex];
    const center = ring.reduce((sum, p) => sum.add(p), new T.Vector3()).multiplyScalar(1 / sides);
    const cap = positions.length / 3, color = colorAt(center, 0);
    positions.push(center.x, center.y, center.z); colors.push(color.r, color.g, color.b);
    for (let i = 0; i < sides; i++) {
      const a = ringIndex * sides + i, b = ringIndex * sides + (i + 1) % sides;
      indices.push(...(top ? [cap, b, a] : [cap, a, b]));
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); forms.set(key, geometry);
  return geometry;
}

/** Buttressed root flare and a curved taper instead of a pole with root spokes. */
export function treeBark(seed: number, color: number, trunk = false): T.BufferGeometry {
  const variant = Math.abs(seed) % 8, key = `bark:${variant}:${color}:${trunk}`;
  const cached = forms.get(key); if (cached) return cached;
  const profile = trunk ? [[0,1.55],[.045,1.22],[.13,.91],[.3,.76],[.52,.61],[.76,.42],[1,.22]]
    : [[0,1],[.22,.85],[.6,.53],[1,.16]];
  const phase = variant * .79, base = new T.Color(color);
  const sides=trunk?12:8;
  const rings = profile.map(([y, radius]) => Array.from({length:sides}, (_, i) => {
    const angle = i / sides * Math.PI * 2;
    const roots = trunk ? Math.pow(Math.max(0, Math.cos(angle * 4 + phase)), 2) * Math.exp(-y * 22) * .75 : 0;
    const r = radius + roots;
    const bend = Math.sin(y * Math.PI) * (trunk ? .6 : 1.1);
    return new T.Vector3(Math.cos(angle) * r + Math.cos(phase) * bend,
      y, Math.sin(angle) * r + Math.sin(phase) * bend);
  }));
  return surface(key, rings, (p, angle) => base.clone()
    .multiplyScalar(.86 + p.y * .12 + Math.sin(angle * 4 + phase + p.y * 2) * .10));
}

/** One lobed canopy; broad leaves and integrated needle tiers have distinct shapes. */
export function treeCanopy(seed: number, color: number, pine = false): T.BufferGeometry {
  const variant = Math.abs(seed) % 12, key = `canopy:${variant}:${color}:${pine}`;
  const cached = forms.get(key); if (cached) return cached;
  const phase = variant * .71, sides = pine ? 20 : 28;
  if(!pine){
    // Overlapping leaf volumes share a single skin. Fixed clusters give the
    // crown readable bulges; a twisting radial wave looked like a soft rock.
    const lobes=[
      [0,-.05,0,.68,.85,.65],[-.43,-.22,.06,.6,.52,.53],
      [.44,-.18,.08,.61,.52,.5],[-.18,-.1,.42,.58,.55,.58],
      [.1,.2,-.36,.58,.61,.48],[.13,.64,.08,.47,.42,.46],[-.44,.34,-.08,.49,.5,.48],
    ].map(([x,y,z,rx,ry,rz],i)=>[x,y+(i===0?0:Math.sin(phase+i*1.7)*.06),z,rx,ry,rz]);
    const rings=Array.from({length:15},(_,j)=>Array.from({length:sides},(_,i)=>{
      const y=-.9+j/14*1.99,angle=i/sides*Math.PI*2,dx=Math.cos(angle),dz=Math.sin(angle);
      let radius=.025;
      for(const [cx,cy,cz,rx,ry,rz] of lobes){
        const slice=1-((y-cy)/ry)**2;if(slice<=0)continue;
        const a=(dx/rx)**2+(dz/rz)**2,b=-2*(dx*cx/rx**2+dz*cz/rz**2);
        const c=(cx/rx)**2+(cz/rz)**2-slice,discriminant=b*b-4*a*c;
        if(discriminant<0)continue;
        const extent=(-b+Math.sqrt(discriminant))/(2*a);
        const blend=Math.max(0,.075-Math.abs(radius-extent))/.075;
        radius=Math.max(radius,extent)+blend*blend*.01875;
      }
      return new T.Vector3(dx*radius,y,dz*radius);
    }));
    const base=new T.Color(color),shade=new T.Color(0x28534a),light=new T.Color(0xb5c975);
    const geometry=surface(key,rings,p=>{
      let closest=Infinity,lobe=0;
      lobes.forEach(([x,y,z,rx,ry,rz],i)=>{
        const distance=Math.abs(((p.x-x)/rx)**2+((p.y-y)/ry)**2+((p.z-z)/rz)**2-1);
        if(distance<closest){closest=distance;lobe=i;}
      });
      return base.clone().lerp(shade,Math.max(0,.18-p.y*.22))
        .lerp(light,Math.max(0,p.y)*.2).multiplyScalar(.93+Math.sin(lobe*2.4+phase)*.12);
    });
    // Broad leaf planes catch the light, while blended normals keep adjacent
    // clusters connected. Fully smooth normals made foliage read as rubber.
    const leaves=geometry.toNonIndexed(),p=leaves.attributes.position,n=leaves.attributes.normal;
    const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),face=new T.Vector3(),normal=new T.Vector3();
    for(let i=0;i<p.count;i+=3){
      a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);
      face.crossVectors(b.sub(a),c.sub(a)).normalize();
      for(let j=0;j<3;j++){
        normal.fromBufferAttribute(n,i+j).lerp(face,.42).normalize();n.setXYZ(i+j,normal.x,normal.y,normal.z);
      }
    }
    geometry.dispose();forms.set(key,leaves);return leaves;
  }
  const profile = [[-1,.2],[-.88,.94],[-.69,.64],[-.63,.84],[-.4,.48],[-.34,.67],[-.09,.34],[-.03,.5],[.24,.22],[.3,.34],[.69,.12],[1,.025]];
  const rings = profile.map(([y, radius]) => Array.from({length:sides}, (_, i) => {
    const angle = i / sides * Math.PI * 2;
    const lobe = Math.sin(angle * 3 + phase + y * 2.5) * .09
      + Math.cos(angle * 5 - phase + y * 3.4) * .055;
    const r = radius * (1 + lobe), belly = 1 - y * y;
    return new T.Vector3(Math.cos(angle) * r + belly * Math.sin(phase) * .12,
      y + Math.sin(angle * 3 + phase) * belly * .04, Math.sin(angle) * r);
  }));
  const base = new T.Color(color), shade = new T.Color(0x28534a), light = new T.Color(0xb5c975);
  return surface(key, rings, (p, angle) => base.clone()
    .lerp(shade, Math.max(0, .18 - p.y * .22))
    .lerp(light, Math.max(0, p.y) * .18)
    .multiplyScalar(.94 + Math.sin(angle * 3 + phase + p.y * 3) * .11));
}
