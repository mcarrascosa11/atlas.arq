import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, edgesOf, boxG, merge, prism, geomFrom, slab } from './lib.js';
const $ = (id) => document.getElementById(id);
// lean profile (from city archive description): vertical up to 10 ft, leans until 210 ft, vertical above. ~2.6 m offset.
const FT = 0.2786, Y1 = 10 * FT, Y2 = 210 * FT, OFF = 2.6;
const lean = (y, k) => k * (y <= Y1 ? 0 : y >= Y2 ? OFF : OFF * (y - Y1) / (Y2 - Y1));
function shear(g, k) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + lean(p.getY(i), k)); p.needsUpdate = true; g.computeBoundingSphere(); return g; }
function shearArr(a, k) { for (let i = 0; i < a.length; i += 3) a[i] += lean(a[i + 1], k); return a; }
function star(R, r, n = 16) { const pts = []; for (let i = 0; i < n * 2; i++) { const t = i * Math.PI / n; const rr = i % 2 ? r : R; pts.push([rr * Math.cos(t), rr * Math.sin(t)]); } return pts; }
function oct(a) { const R = a / Math.cos(Math.PI / 8); const pts = []; for (let i = 0; i < 8; i++) { const t = Math.PI / 8 + i * Math.PI / 4; pts.push([R * Math.cos(t), R * Math.sin(t)]); } return pts; }
export function buildTower(k = 1, upto = 80) {
  const g = new THREE.Group();
  const B = { P: [], B: [], T: [], E: [] }, C = { P: [], B: [], T: [], E: [] }, S = { P: [], B: [], T: [], E: [] };
  const body = (ring, y0, y1, t) => { if (upto <= y0) return; prism(ring, y0, Math.min(y1, upto), 0, t.P, t.B, t.T, t.E); };
  body(star(5.75, 4.75), 0, 19, B);
  body(oct(5.0), 19, 20.2, C);
  body(oct(4.7), 20.2, 37, B);
  body(oct(4.95), 37, 38.2, C);
  body(oct(4.15), 38.2, 52, B);
  body(oct(4.4), 52, 53.2, C);
  body(oct(3.6), 53.2, 63, B);
  body(oct(3.85), 63, 64, C);
  // corner buttresses on the octagonal bodies
  const butt = [];
  for (const [a, y0, y1] of [[4.7, 20.2, 37], [4.15, 38.2, 52], [3.6, 53.2, 63]]) {
    const R = a / Math.cos(Math.PI / 8);
    for (let i = 0; i < 8; i++) { if (upto <= y0) continue; const t = Math.PI / 8 + i * Math.PI / 4; const bx = boxG(-0.45, 0.45, y0, Math.min(y1, upto), -0.45, 0.45); bx.rotateY(-t); bx.translate((R + 0.15) * Math.cos(t), 0, (R + 0.15) * Math.sin(t)); butt.push(bx); }
  }
  // spire (triple), slate
  const sp = [];
  if (upto > 64) {
    const c1 = new THREE.CylinderGeometry(2.6, 3.4, 5, 8); c1.rotateY(Math.PI / 8); c1.translate(0, 66.5, 0); sp.push(c1.toNonIndexed());
    const c2 = new THREE.CylinderGeometry(1.2, 2.4, 4, 8); c2.rotateY(Math.PI / 8); c2.translate(0, 71, 0); sp.push(c2.toNonIndexed());
    const c3 = new THREE.CylinderGeometry(0.9, 1.2, 2.5, 8); c3.rotateY(Math.PI / 8); c3.translate(0, 74.2, 0); sp.push(c3.toNonIndexed());
    const c4 = new THREE.ConeGeometry(0.9, 4.2, 8); c4.rotateY(Math.PI / 8); c4.translate(0, 77.6, 0); sp.push(c4.toNonIndexed());
    sp.push(boxG(-0.06, 0.06, 79.6, 80.4, -0.06, 0.06));
  }
  const mk = (t, mat) => { if (!t.P.length) return; const ge = geomFrom(shearArr(t.P, k), t.B, t.T); g.add(new THREE.Mesh(ge, mat)); t.E.length && g.add(segs(shearArr(t.E, k), lineMat('#1A1B20', 1.25))); };
  const brick = fillMat('#FAF9F5', { hatch: 1 }); const band = fillMat(window.HL ? '#F4D3C8' : '#EFEDE6', { hatch: 1 });
  mk(B, brick); mk(C, band);
  if (butt.length) { const ge = shear(merge(butt), k); g.add(new THREE.Mesh(ge, brick)); g.add(segs(edgesOf(ge, 30), lineMat('#1A1B20', 1.0))); }
  if (sp.length) { const ge = shear(merge(sp), k); g.add(new THREE.Mesh(ge, fillMat('#E9E7E0', { hatch: 1 }))); g.add(segs(edgesOf(ge, 30), lineMat('#1A1B20', 1.1))); }
  // brick coursing (horizontal joints) on the star body as fine lines
  const J = []; if (upto > 1) for (let y = 1.2; y < Math.min(19, upto); y += 1.2) { const s = star(5.77, 4.77); for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length]; J.push(a[0], y, a[1], b[0], y, b[1]); } }
  if (J.length) g.add(segs(shearArr(J, k), lineMat('#B9B5AA', 0.7)));
  g.traverse(o => o.frustumCulled = false);
  return g;
}
export function buildPlaza() {
  const g = new THREE.Group(); const P = [], Bb = [], T = [], E = [];
  const blocks = [[[-48, -44], [-16, -44], [-16, -18], [-48, -18], 14], [[16, -44], [46, -44], [46, -16], [16, -16], 15], [[-50, 18], [-16, 18], [-16, 46], [-50, 46], 13], [[16, 16], [50, 16], [50, 46], [16, 46], 14],
    [[-62, -14], [-30, -14], [-30, 14], [-62, 14], 12], [[30, -12], [62, -12], [62, 12], [30, 12], 13], [[-12, -48], [12, -48], [12, -30], [-12, -30], 16]];
  for (const b of blocks) prism(b.slice(0, 4), 0, b[4], 2, P, Bb, T, E, { hip: 3, bottomEdges: true });
  const m = new THREE.Mesh(geomFrom(P, Bb, T), fillMat('#F8F7F3', { hatch: 1, windows: 1 })); g.add(m);
  g.add(segs(E, lineMat('#3B3C43', 0.9)));
  // paving joints
  const L = []; for (let x = -26; x <= 26; x += 2) L.push(x, 0.02, -24, x, 0.02, 24); for (let z = -24; z <= 24; z += 2) L.push(-26, 0.02, z, 26, 0.02, z);
  g.add(segs(L, lineMat('#C9C5BA', 0.6)));
  // seated boy (bronze), small
  const boy = [boxG(-0.25, 0.25, 0, 0.45, -0.35, 0.35), boxG(-0.2, 0.2, 0.45, 1.05, -0.15, 0.15), boxG(-0.13, 0.13, 1.05, 1.3, -0.13, 0.13)];
  const bg = merge(boy); bg.translate(9, 0, 6); g.add(new THREE.Mesh(bg, fillMat('#2A2B30', { hatch: 0 }))); g.add(segs(edgesOf(bg, 30), lineMat('#1A1B20', 1.0)));
  const fp = []; const s = (function(){ const p=[]; for (let i = 0; i < 32; i++) { const t2 = i * Math.PI / 16; const rr = i % 2 ? 4.75 : 5.75; p.push([rr * Math.cos(t2), rr * Math.sin(t2)]); } return p; })();
  for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length]; fp.push(a[0], 0.04, a[1], b[0], 0.04, b[1]); }
  const fpl = segs(fp, lineMat('#E2401C', 2.4)); fpl.name = 'footprint'; g.add(fpl);
  g.traverse(o => o.frustumCulled = false);
  return g;
}
export function accents(k) {
  const g = new THREE.Group();
  const pl = []; for (let y = 80; y > 0; y -= 2.4) pl.push(0, y, 0, 0, Math.max(0, y - 1.4), 0);   // plumb (dashed) from the axis at the top
  for (let i = 0; i < pl.length; i += 3) pl[i] += OFF * k;
  const plumb = segs(pl, lineMat('#E2401C', 2.2)); plumb.renderOrder = 9; plumb.material.depthTest = false; g.add(plumb);
  const ax = []; const N = 60; for (let i = 0; i < N; i++) { const y0 = 80 * i / N, y1 = 80 * (i + 1) / N; ax.push(lean(y0, k), y0, 0, lean(y1, k), y1, 0); }
  const axis = segs(ax, lineMat('#E2401C', 3.2)); axis.renderOrder = 9; axis.material.depthTest = false; g.add(axis);
  for (const y of [Y1, Y2]) { const t = segs([-9 + lean(y, k), y, 0, 9 + lean(y, k), y, 0], lineMat('#E2401C', 1.6)); t.renderOrder = 9; t.material.depthTest = false; g.add(t); }
  g.traverse(o => o.frustumCulled = false);
  return g;
}
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); renderer.localClippingEnabled = true;
  $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 5000);
  const plaza = buildPlaza(); scene.add(plaza);
  let tower = null;
  window.shot = (o) => {
    if (tower) scene.remove(tower);
    tower = o.upto > 0 ? buildTower(o.k ?? 1, o.upto) : null; if (tower) scene.add(tower);
    plaza.visible = o.plaza !== false;
    if (window._acc) { scene.remove(window._acc); window._acc = null; }
    if (o.accents) { window._acc = accents(o.k ?? 1); scene.add(window._acc); }
    plaza.getObjectByName('footprint').visible = !!o.footprint;
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 1500, t = o.tg; camera.position.set(t[0] + Math.sin(az) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(t[0], t[1], t[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    // overlay
    $('kicker').textContent = o.kick || ''; $('title').style.opacity = o.title ? 1 : 0; $('title').textContent = o.title || '';
    $('sub').textContent = o.sub || ''; $('sub').style.opacity = o.sub ? 1 : 0;
    const svg = $('ov'); svg.innerHTML = '';
    const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    for (const d of o.dims || []) { const a = P(d[0]), b = P(d[1]); svg.insertAdjacentHTML('beforeend', `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${d[3] || '#E2401C'}" stroke-width="2.2" ${d[4] ? 'stroke-dasharray="8 7"' : ''}/><text class="dim" x="${(a[0] + b[0]) / 2 + (d[5] || 0)}" y="${(a[1] + b[1]) / 2}">${d[2]}</text>`); }
    for (const l of o.labels || []) { const p = P(l[0]); svg.insertAdjacentHTML('beforeend', `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#1A1B20"/><line x1="${p[0]}" y1="${p[1]}" x2="${p[0]}" y2="${p[1] - 28}" stroke="#1A1B20" stroke-width="1.2"/><text class="lab" x="${p[0]}" y="${p[1] - 34}">${l[1]}</text>`); }
    return true;
  };
  window.READY = true;
}
