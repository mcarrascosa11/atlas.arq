import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

THREE.ColorManagement.enabled = false;
export const PAPER = new THREE.Color('#F2F1EC');
export const INK = new THREE.Color('#1A1B20');
export const W = 1080, H = 1920;
export const LIGHT = new THREE.Vector3(-0.55, 1.0, 0.5).normalize();

export const viewToWorld = { value: new THREE.Matrix3() };
export const shadowU = { on: { value: 0 }, map: { value: null }, mat: { value: new THREE.Matrix4() }, texel: { value: 1 / 2048 } };

// ---------- fill material: flat tones, hatched shadow side, optional windows / planks, poché on cut ----------
const fillVS = /* glsl */`
#include <common>
#include <clipping_planes_pars_vertex>
attribute float aBase; attribute float aTop;
uniform mat4 uShadowMat;
varying vec3 vView; varying vec3 vLocal; varying float vBase; varying float vTop; varying vec4 vSC;
void main(){
  vSC = uShadowMat * modelMatrix * vec4(position, 1.0);
  vec4 mvPosition = modelViewMatrix * vec4(position,1.0);
  vView = mvPosition.xyz; vLocal = position; vBase = aBase; vTop = aTop;
  gl_Position = projectionMatrix * mvPosition;
  #include <clipping_planes_vertex>
}`;
const fillFS = /* glsl */`
#include <common>
#include <clipping_planes_pars_fragment>
uniform vec3 uColor; uniform vec3 uInk; uniform vec3 uPaper; uniform vec3 uPoche;
uniform float uOpacity; uniform float uHatch; uniform float uWindows; uniform float uPlanks; uniform float uPocheOn;
uniform vec3 uLight; uniform mat3 uV2W; uniform vec3 uRoof; uniform float uRoofOn; uniform float uTopTone; uniform float uSideTone; uniform float uShadeTone;
uniform float uShadowOn; uniform sampler2D uShadowMap; uniform float uTexel;
varying vec3 vView; varying vec3 vLocal; varying float vBase; varying float vTop; varying vec4 vSC;
float aaLine(float coord, float halfW){ float w = fwidth(coord); return 1.0 - smoothstep(halfW*w, (halfW+1.0)*w, abs(coord)); }
void main(){
  #include <clipping_planes_fragment>
  if(!gl_FrontFacing){
    if(uPocheOn < 0.5) discard;
    gl_FragColor = vec4(mix(uPaper, uPoche, uOpacity),1.0); return;
  }
  vec3 nV = normalize(cross(dFdx(vView), dFdy(vView)));
  vec3 n = normalize(uV2W * nV);
  vec3 c = uColor; float hatch = 0.0;
  if(uRoofOn > 0.5 && vLocal.y > vTop + 0.03) c = uRoof;
  if(n.y > 0.85){ c *= uTopTone; }
  else if(n.y < -0.3){ c *= uShadeTone; }
  else {
    vec2 l2 = normalize(uLight.xz); vec2 n2 = normalize(n.xz + 1e-5);
    float d = dot(n2, l2) * (1.0 - max(n.y,0.0)) + n.y*0.35;
    if(n.y > 0.25){ c *= mix(uSideTone, uTopTone, 0.55) ; if(d < 0.0) { c *= 0.95; hatch = 0.55; } }
    else if(d > -0.05){ c *= uSideTone; }
    else { c *= uShadeTone; hatch = 1.0; }
  }
  // cast shadows (drawn like the shade side: darker tone + hatching)
  if(uShadowOn > 0.5 && hatch < 0.5){
    vec3 p = vSC.xyz / vSC.w * 0.5 + 0.5;
    if(p.x > 0.0 && p.x < 1.0 && p.y > 0.0 && p.y < 1.0 && p.z < 1.0){
      float occ = 0.0;
      float d = texture2D(uShadowMap, p.xy).r; occ = (p.z - 0.0012 > d) ? 1.0 : 0.0;
      float sh = occ;
      c = mix(c, uColor * uShadeTone, sh * 0.85); hatch = max(hatch, sh * 0.85);
    }
  }
  vec3 col = c;
  // planks (vertical joints on timber cladding)
  if(uPlanks > 0.0 && abs(n.y) < 0.3){
    vec2 t2 = normalize(vec2(-n.z, n.x));
    float s = dot(vLocal.xz, t2) / 0.62;
    float a = aaLine(fract(s+0.5)-0.5, 0.35) * uPlanks;
    col = mix(col, col*0.80, a);
  }
  // windows on generic buildings
  if(uWindows > 0.0 && abs(n.y) < 0.3 && vTop - vBase > 6.0){
    vec2 t2 = normalize(vec2(-n.z, n.x));
    float s = dot(vLocal.xz, t2);
    float y = vLocal.y - vBase;
    float fw = fwidth(s);
    float vis = smoothstep(0.08, 0.16, 1.0/max(fw,1e-4) * 0.06);   // fade when windows become tiny on screen
    float cs = fract(s/3.1); float cy = fract(y/3.25);
    float floorIx = floor(y/3.25);
    float inX = step(0.32, cs) * step(cs, 0.68);
    float inY = step(0.30, cy) * step(cy, 0.78);
    float ok = step(1.0, floorIx) * step(y, vTop - vBase - 1.6);
    float win = inX*inY*ok*vis*uWindows;
    col = mix(col, uInk*0.9 + c*0.1, win*0.72);
  }
  if(hatch > 0.0 && uHatch > 0.0){
    float s = (gl_FragCoord.x + gl_FragCoord.y) / 6.0;
    float a = aaLine(fract(s)-0.5, 0.25) * hatch * uHatch;
    col = mix(col, uInk, a*0.55);
  }
  gl_FragColor = vec4(mix(uPaper, col, uOpacity), 1.0);
}`;

export function fillMat(color, o = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: fillVS, fragmentShader: fillFS, clipping: true,
    side: o.double ? THREE.DoubleSide : THREE.FrontSide,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uInk: { value: INK }, uPaper: { value: PAPER },
      uPoche: { value: new THREE.Color(o.poche || '#2A2B30') }, uOpacity: { value: 1 },
      uHatch: { value: o.hatch ?? 1 }, uWindows: { value: o.windows ?? 0 }, uPlanks: { value: o.planks ?? 0 },
      uPocheOn: { value: o.poche === false ? 0 : (o.double ? 1 : 0) },
      uLight: { value: LIGHT }, uV2W: viewToWorld, uRoof: { value: new THREE.Color(o.roof || '#E9CDB9') }, uRoofOn: { value: o.roof ? 1 : 0 },
      uShadowOn: shadowU.on, uShadowMap: shadowU.map, uShadowMat: shadowU.mat, uTexel: shadowU.texel,
      uTopTone: { value: o.top ?? 1.0 }, uSideTone: { value: o.side ?? 0.94 }, uShadeTone: { value: o.shade ?? 0.86 },
    },
  });
  m.extensions = { derivatives: true };
  return m;
}

export const lineMats = [];
export function lineMat(color, width, o = {}) {
  const m = new LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: width, worldUnits: false, clipping: true,
    depthTest: o.depthTest ?? true });
  m.resolution.set(W, H);
  m.userData.base = new THREE.Color(color);
  m.userData.opacity = 1;
  lineMats.push(m);
  return m;
}
export function setLineOpacity(m, op) {
  m.userData.opacity = op;
  m.color.copy(PAPER).lerp(m.userData.base, op);
}
export function setFillOpacity(m, op) { m.uniforms.uOpacity.value = op; }

export function segs(positions, mat, renderOrder = 3) {
  const g = new LineSegmentsGeometry();
  g.setPositions(positions instanceof Float32Array ? positions : new Float32Array(positions));
  const l = new LineSegments2(g, mat);
  l.computeLineDistances?.();
  l.renderOrder = renderOrder;
  return l;
}
export function edgesOf(geom, angle = 25) {
  const e = new THREE.EdgesGeometry(geom, angle);
  return Array.from(e.attributes.position.array);
}

// ---------- geometry helpers ----------
export function boxG(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g.toNonIndexed();
}
export function merge(list) { return mergeGeometries(list.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position') n.deleteAttribute(k); return n; }), false); }

function signedArea(r) { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
// inset ring by d (mitre, clamped); returns null when it degenerates
export function inset(ring, d) {
  const n = ring.length; if (n < 3) return null;
  const ccw = signedArea(ring) > 0 ? 1 : -1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = ring[(i - 1 + n) % n], b = ring[i], c = ring[(i + 1) % n];
    let e1 = [b[0] - a[0], b[1] - a[1]], e2 = [c[0] - b[0], c[1] - b[1]];
    const l1 = Math.hypot(...e1) || 1, l2 = Math.hypot(...e2) || 1;
    e1 = [e1[0] / l1, e1[1] / l1]; e2 = [e2[0] / l2, e2[1] / l2];
    // inward normals (for ccw in x,z with z down the sign flips; use area sign)
    const n1 = [-e1[1] * ccw, e1[0] * ccw], n2 = [-e2[1] * ccw, e2[0] * ccw];
    let bx = n1[0] + n2[0], bz = n1[1] + n2[1]; const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl;
    const cosh = bx * n1[0] + bz * n1[1];
    const k = Math.min(d / Math.max(cosh, 0.35), d * 2.2);
    out.push([b[0] + bx * k, b[1] + bz * k]);
  }
  const a0 = Math.abs(signedArea(ring)), a1 = Math.abs(signedArea(out));
  if (Math.sign(signedArea(out)) !== Math.sign(signedArea(ring)) || a1 < a0 * 0.12) return null;
  // reject self-intersections cheaply: inset vertices must stay inside the original ring
  for (const p of out) if (!pointInRing(p, ring)) return null;
  return out;
}
export function pointInRing(p, r) {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], zi = r[i][1], xj = r[j][0], zj = r[j][1];
    if (((zi > p[1]) !== (zj > p[1])) && (p[0] < (xj - xi) * (p[1] - zi) / (zj - zi) + xi)) ins = !ins;
  }
  return ins;
}
export function upTri(p0, p1, p2) { const ny = (p1[2] - p0[2]) * (p2[0] - p0[0]) - (p1[0] - p0[0]) * (p2[2] - p0[2]); return ny >= 0 ? [p0, p1, p2] : [p0, p2, p1]; }
function tri(ring, holes = []) {
  const c = ring.map(p => new THREE.Vector2(p[0], p[1]));
  const hs = holes.map(h => h.map(p => new THREE.Vector2(p[0], p[1])));
  return { faces: THREE.ShapeUtils.triangulateShape(c, hs), pts: [...ring, ...holes.flat()] };
}

// Extruded prism with hipped roof. Pushes triangles into P (positions), base/top attrs, and edges into E.
export function prism(ring, y0, y1, rise, P, B, T, E, opt = {}) {
  if (signedArea(ring) < 0) ring = [...ring].reverse();   // make orientation consistent: x right, z down => area>0 is clockwise on screen-from-top
  const n = ring.length;
  const push = (a, b, c) => { P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); for (let i = 0; i < 3; i++) { B.push(y0); T.push(y1); } };
  // walls (outward facing). With area>0 in (x,z) the ring is counter-clockwise when z points down -> outward normal = (dz,-dx)
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    const A0 = [a[0], y0, a[1]], B0 = [b[0], y0, b[1]], A1 = [a[0], y1, a[1]], B1 = [b[0], y1, b[1]];
    push(A0, A1, B1); push(A0, B1, B0);
    E.push(a[0], y1, a[1], b[0], y1, b[1]);
    if (opt.bottomEdges) E.push(a[0], y0, a[1], b[0], y0, b[1]);
    E.push(a[0], y0, a[1], a[0], y1, a[1]);
  }
  const ins = rise > 0 ? inset(ring, opt.hip ?? 2.6) : null;
  if (ins) {
    const yr = y1 + rise;
    for (let i = 0; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n], c = ins[i], d = ins[(i + 1) % n];
      const A = [a[0], y1, a[1]], Bv = [b[0], y1, b[1]], C = [c[0], yr, c[1]], D = [d[0], yr, d[1]];
      push(A, C, D); push(A, D, Bv);
      E.push(a[0], y1, a[1], c[0], yr, c[1]);
      E.push(c[0], yr, c[1], d[0], yr, d[1]);
    }
    const t = tri(ins);
    for (const f of t.faces) { const p = f.map(i => [t.pts[i][0], yr, t.pts[i][1]]); push(...upTri(p[0], p[1], p[2])); }
  } else {
    const t = tri(ring);
    for (const f of t.faces) { const p = f.map(i => [t.pts[i][0], y1, t.pts[i][1]]); push(...upTri(p[0], p[1], p[2])); }
  }
}
export function geomFrom(P, B, T) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aBase', new THREE.Float32BufferAttribute(B, 1));
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(T, 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}
// flat polygon (with holes) at height y, plus optional skirt down to y0
export function slab(ring, holes, y, y0, P, B, T, E, edges = true) {
  if (signedArea(ring) < 0) ring = [...ring].reverse();
  const t = tri(ring, holes);
  const push = (a, b, c) => { P.push(...a, ...b, ...c); B.push(y0, y0, y0); T.push(y, y, y); };
  for (const f of t.faces) { const p = f.map(i => [t.pts[i][0], y, t.pts[i][1]]); push(...upTri(p[0], p[1], p[2])); }
  const rings = [ring, ...holes];
  for (const r of rings) for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    if (y0 !== null) { push([a[0], y0, a[1]], [a[0], y, a[1]], [b[0], y, b[1]]); push([a[0], y0, a[1]], [b[0], y, b[1]], [b[0], y0, b[1]]); }
    if (edges) E.push(a[0], y, a[1], b[0], y, b[1]);
  }
}

// ---------- water: world-anchored dashes, density adapts to zoom ----------
const waterVS = `uniform float uSize; varying vec2 vXZ; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vXZ = position.xz*uSize; gl_Position = projectionMatrix*viewMatrix*w; }`;
const waterFS = `
uniform vec3 uPaper; uniform vec3 uInk; uniform float uS1; uniform vec2 uOff1; uniform vec2 uOff2; uniform float uMix; uniform float uAlpha;
uniform vec2 uMaskC; uniform float uMaskR; uniform float uPx; uniform vec2 uRot; uniform vec2 uRotB; uniform vec2 uOff1B; uniform vec2 uOff2B; uniform float uAng;
varying vec2 vXZ;
float h1(float n){ return fract(sin(n*12.9898)*43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float layer(vec2 p, float s){
  vec2 q = p / s;
  float row = floor(q.y);
  float fy = fract(q.y) - 0.5;
  float w = fwidth(q.y);
  float line = 1.0 - smoothstep(0.45*w, 1.25*w, abs(fy));
  float rowm = mod(row, 64.0);
  float cx = q.x / 3.4 + h1(rowm)*7.0;
  float cell = floor(cx); float fx = fract(cx);
  float cm = mod(cell, 64.0);
  float on = step(h2(vec2(cm, rowm)), 0.30);
  float len = 0.25 + 0.55*h2(vec2(cm+3.1, rowm+1.7));
  float dash = step(fx, len);
  return line*on*dash;
}
void main(){
  vec2 r = vec2(dot(vXZ, vec2(uRot.x, -uRot.y)), dot(vXZ, vec2(uRot.y, uRot.x)));
  float aA = mix(layer(r + uOff1, uS1), layer(r + uOff2, uS1*2.0), uMix);
  float aB = 0.0;
  if(uAng > 0.0){ vec2 rb = vec2(dot(vXZ, vec2(uRotB.x, -uRotB.y)), dot(vXZ, vec2(uRotB.y, uRotB.x))); aB = mix(layer(rb + uOff1B, uS1), layer(rb + uOff2B, uS1*2.0), uMix); }
  float a = mix(aA, aB, uAng) * uAlpha;
  if(uMaskR > 0.0){ float d = length(vXZ - uMaskC); a *= 1.0 - smoothstep(uMaskR*0.55, uMaskR, d); }
  gl_FragColor = vec4(mix(uPaper, uInk, a*0.5), 1.0);
}`;
export function makeWater() {
  const m = new THREE.ShaderMaterial({
    vertexShader: waterVS, fragmentShader: waterFS, depthWrite: false,
    uniforms: { uSize: { value: 1 }, uPaper: { value: PAPER }, uInk: { value: INK }, uS1: { value: 4 }, uOff1: { value: new THREE.Vector2() }, uOff2: { value: new THREE.Vector2() },
      uMix: { value: 0 }, uAlpha: { value: 1 }, uMaskC: { value: new THREE.Vector2() }, uMaskR: { value: 0 }, uPx: { value: 1 }, uRot: { value: new THREE.Vector2(1, 0) }, uRotB: { value: new THREE.Vector2(1, 0) }, uOff1B: { value: new THREE.Vector2() }, uOff2B: { value: new THREE.Vector2() }, uAng: { value: 0 } },
  });
  m.extensions = { derivatives: true };
  const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 1; mesh.frustumCulled = false;
  return mesh;
}
// place the water quad around the camera target; dash pattern offsets computed in double precision
export function updateWater(water, target, zoom, el, maskC, maskR, alpha, angA = 0, angB = 0, mixAB = 0) {
  const size = zoom * 26;
  water.scale.set(size, 1, size);
  water.position.set(target.x, 0, target.z);
  const m = water.material.uniforms; m.uSize.value = size;
  const pxPerM = H / (2 * zoom);
  const want = 24 / (pxPerM * Math.max(Math.sin(el), 0.3));        // ~24 px between rows on screen
  const L = Math.log2(want); const s1 = Math.pow(2, Math.floor(L));
  m.uS1.value = s1; m.uMix.value = L - Math.floor(L);
  const per = (s) => [s * 3.4 * 64, s * 64];
  const offFor = (ang, s) => { const ca = Math.cos(ang), sa = Math.sin(ang); const rx = target.x * ca - target.z * sa, rz = target.x * sa + target.z * ca; const [px, pz] = per(s); return new THREE.Vector2(((rx % px) + px) % px, ((rz % pz) + pz) % pz); };
  m.uRot.value.set(Math.cos(angA), Math.sin(angA)); m.uRotB.value.set(Math.cos(angB), Math.sin(angB));
  m.uOff1.value.copy(offFor(angA, s1)); m.uOff2.value.copy(offFor(angA, s1 * 2));
  m.uOff1B.value.copy(offFor(angB, s1)); m.uOff2B.value.copy(offFor(angB, s1 * 2)); m.uAng.value = mixAB;
  m.uAlpha.value = alpha;
  if (maskC) { m.uMaskC.value.set(maskC.x - target.x, maskC.z - target.z); m.uMaskR.value = maskR; } else m.uMaskR.value = 0;
}
export { THREE, LineSegments2, LineSegmentsGeometry, LineMaterial };

// ---------- ink pass: draws every crease and intersection (normal + depth discontinuities) over the colour render ----------
export function makeInkPass(renderer, w, h) {
  const rtColor = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
  const rtND = new THREE.WebGLRenderTarget(w, h); rtND.depthTexture = new THREE.DepthTexture(w, h); rtND.depthTexture.type = THREE.UnsignedIntType;
  const normalMat = new THREE.MeshNormalMaterial({ flatShading: true, side: THREE.DoubleSide });
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({
    uniforms: { tColor: { value: rtColor.texture }, tNormal: { value: rtND.texture }, tDepth: { value: rtND.depthTexture }, uPx: { value: new THREE.Vector2(1 / w, 1 / h) }, uDepthScale: { value: 1000 }, uInk: { value: INK }, uOn: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tColor; uniform sampler2D tNormal; uniform sampler2D tDepth; uniform vec2 uPx; uniform float uDepthScale; uniform vec3 uInk; uniform float uOn; varying vec2 vUv;
      vec3 N(vec2 o){ return texture2D(tNormal, vUv + o * uPx).xyz * 2.0 - 1.0; }
      float D(vec2 o){ return texture2D(tDepth, vUv + o * uPx).r; }
      void main(){
        vec4 c = texture2D(tColor, vUv);
        if (uOn < 0.5) { gl_FragColor = c; return; }
        float d0 = D(vec2(0.0)); vec3 n0 = N(vec2(0.0));
        float e = 0.0;
        // creases: normal changes of more than ~35 degrees
        for (int k = 0; k < 4; k++) { vec2 o = k == 0 ? vec2(1.0, 0.0) : k == 1 ? vec2(-1.0, 0.0) : k == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
          float dk = D(o); if (dk < 1.0 && d0 < 1.0 && dot(n0, N(o)) < 0.82) e = max(e, 1.0); }
        // depth steps (second difference, robust on sloped planes), in metres
        float lx = abs(D(vec2(1.0, 0.0)) + D(vec2(-1.0, 0.0)) - 2.0 * d0) * uDepthScale;
        float ly = abs(D(vec2(0.0, 1.0)) + D(vec2(0.0, -1.0)) - 2.0 * d0) * uDepthScale;
        if (d0 < 1.0) e = max(e, smoothstep(0.35, 0.9, max(lx, ly)));
        gl_FragColor = vec4(mix(c.rgb, uInk, e * 0.82), 1.0);
      }` });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; const qs = new THREE.Scene(); qs.add(quad);
  return {
    normalMat, uniforms: mat.uniforms,
    render(scene, camera) {
      renderer.setRenderTarget(rtColor); renderer.clear(); renderer.render(scene, camera);
      const hidden = []; scene.traverse(o => { if ((o.isLineSegments2 || o.userData.noInk) && o.visible) { o.visible = false; hidden.push(o); } });
      const bg = scene.background; scene.overrideMaterial = normalMat; renderer.setRenderTarget(rtND); renderer.setClearColor(0x8080ff, 1); renderer.clear(); renderer.render(scene, camera); scene.overrideMaterial = null;
      renderer.setClearColor(PAPER, 1); for (const o of hidden) o.visible = true;
      mat.uniforms.uDepthScale.value = camera.far - camera.near;
      renderer.setRenderTarget(null); renderer.render(qs, quadCam);
    } };
}
