import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, edgesOf, boxG, merge } from './lib.js';
const $ = (id) => document.getElementById(id);
const rng = (() => { let s = 9; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// ---- strict graphic system: three line weights, paper fills, one vermillion element per scene
const LW = { A: 1.7, B: 0.95, C: 0.5 };
const INKC = '#1A1B20', GREY = '#8C8A84', RED = '#E2401C';
const paper = fillMat('#F7F6F2', { hatch: 0 }), paper2 = fillMat('#EFEDE7', { hatch: 1, side: 0.95, shade: 0.88 });
const poche = fillMat('#26272C', { hatch: 0 }), redF = fillMat(RED, { hatch: 0 }), glass = fillMat('#6A6C72', { hatch: 0 });
const ring = (x, z, r, y, n = 28) => { const L = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; L.push(x + r * Math.cos(a), y, z + r * Math.sin(a), x + r * Math.cos(b), y, z + r * Math.sin(b)); } return L; };
const disc = (x, z, r, y, n = 24) => { const g = new THREE.CircleGeometry(r, n); g.rotateX(-Math.PI / 2); g.translate(x, y, z); return g.toNonIndexed(); };
function grp(name) { const g = new THREE.Group(); g.name = name; return g; }
function addMesh(g, list, mat, lw = LW.B, ang = 30, col = INKC) { if (!list.length) return; const ge = merge(list); g.add(new THREE.Mesh(ge, mat)); if (lw) g.add(segs(edgesOf(ge, ang), lineMat(col, lw))); }
// ---- 1. communal flat in an old building (plan, 20 x 12 m): one room per family, shared kitchen and bath
function kommunalka() {
  const g = grp('komm'); const Wl = [], fam = []; const y0 = 0, h = 0.4;
  const wall = (x0, x1, z0, z1) => Wl.push(boxG(x0, x1, y0, h, z0, z1));
  wall(-10, 10, -6, -5.4); wall(-10, 10, 5.4, 6); wall(-10, -9.4, -6, 6); wall(9.4, 10, -6, 6);          // thick outer walls
  wall(-9.4, 9.4, -0.95, -0.8); wall(-9.4, 9.4, 0.8, 0.95);                                               // corridor
  for (const x of [-4.7, 0, 4.7]) { wall(x - 0.08, x + 0.08, -5.4, -0.95); }                           // north rooms
  for (const x of [-3.2, 2.4, 6.2]) { wall(x - 0.08, x + 0.08, 0.95, 5.4); } wall(6.2, 9.4, 3.1, 3.25);   // south rooms, kitchen, bath/WC
  addMesh(g, Wl, poche, LW.B);
  // door gaps drawn as paper patches on the corridor walls
  const gaps = []; for (const x of [-7, -2.4, 2.4, 7]) gaps.push(boxG(x - 0.45, x + 0.45, h - 0.01, h + 0.01, -0.97, -0.78)); for (const x of [-6.3, -0.4, 4.3, 7.8]) gaps.push(boxG(x - 0.45, x + 0.45, h - 0.01, h + 0.01, 0.78, 0.97));
  addMesh(g, gaps, paper, 0);
  // families: one cluster of vermillion figures per room (top view = small discs)
  const rooms = [[-7, -3.2, 4], [-2.4, -3.2, 3], [2.4, -3.2, 5], [7, -3.2, 3], [-6.3, 3.2, 4], [-0.4, 3.2, 2]];
  for (const [x, z, n] of rooms) for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + 0.4; fam.push(disc(x + Math.cos(a) * 0.9, z + Math.sin(a) * 0.9, 0.28, h + 0.02)); }
  addMesh(g, fam, redF, 0);
  const L = []; for (const [x, z] of rooms) L.push(...ring(x, z, 1.2, h + 0.02, 24)); g.add(segs(L, lineMat(GREY, LW.C)));
  // kitchen (stoves) and bath fixtures in the shared rooms
  const fx = [boxG(3.0, 5.6, h - 0.38, h + 0.05, 4.6, 5.3), boxG(6.5, 7.4, h - 0.38, h + 0.05, 1.3, 2.5), boxG(8.2, 9.2, h - 0.38, h + 0.05, 3.6, 5.1)];
  addMesh(g, fx, paper2, LW.C);
  g.userData.labels = [[[4.3, h, 2.6], 'COCINA COMÚN'], [[7.8, h, 2.2], 'BAÑO'], [[0, h, 0], 'PASILLO']];
  return g;
}
// ---- 2. one family, one flat: a two-room khrushchyovka flat (8.0 x 5.6 m, about 44 m2)
function flatPlan() {
  const g = grp('flat'); const Wl = [], fam = []; const h = 0.4;
  const wall = (x0, x1, z0, z1) => Wl.push(boxG(x0, x1, 0, h, z0, z1));
  wall(-4, 4, -2.8, -2.5); wall(-4, 4, 2.5, 2.8); wall(-4, -3.7, -2.8, 2.8); wall(3.7, 4, -2.8, 2.8);
  wall(0.1, 0.2, -2.5, 2.5); wall(-3.7, 0.1, 0.6, 0.7); wall(-1.6, -1.5, 0.7, 2.5);
  addMesh(g, Wl, poche, LW.B);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.3; fam.push(disc(-1.8 + Math.cos(a) * 0.8, -1.0 + Math.sin(a) * 0.8, 0.28, h + 0.02)); }
  addMesh(g, fam, redF, 0);
  addMesh(g, [boxG(-3.5, -1.8, h - 0.38, h + 0.05, 1.9, 2.4), boxG(-1.3, -0.2, h - 0.38, h + 0.05, 1.6, 2.4)], paper2, LW.C);
  g.userData.labels = [[[-1.8, h, -2.0], 'SALÓN'], [[2, h, 0], 'DORMITORIO'], [[-2.6, h, 1.4], 'COCINA'], [[-0.8, h, 1.4], 'BAÑO']];
  return g;
}
// ---- 3. the block: a clean massing with the panel grid; one flat outlined in vermillion
const FL = 2.7, NF = 5, PW = 3.2, NP = 20, LEN = NP * PW, DEP = 12;
function block(ox, oz, detail, redFlat) {
  const g = grp('block'); const L1 = [], L2 = [], win = [], red = [];
  const body = [boxG(-LEN / 2, LEN / 2, 0, NF * FL, -DEP / 2, DEP / 2)]; const roof = [boxG(-LEN / 2 - 0.15, LEN / 2 + 0.15, NF * FL, NF * FL + 0.5, -DEP / 2 - 0.15, DEP / 2 + 0.15)];
  addMesh(g, body, paper2, LW.A); addMesh(g, roof, paper, LW.B);
  if (detail) {
    for (let f = 1; f < NF; f++) for (const zf of [DEP / 2 + 0.01, -DEP / 2 - 0.01]) L2.push(-LEN / 2, f * FL, zf, LEN / 2, f * FL, zf);
    for (let i = 1; i < NP; i++) for (const zf of [DEP / 2 + 0.01, -DEP / 2 - 0.01]) L2.push(-LEN / 2 + i * PW, 0, zf, -LEN / 2 + i * PW, NF * FL, zf);
    for (let f = 0; f < NF; f++) for (let i = 0; i < NP; i++) { const stair = i % 5 === 2; const ww = stair ? 0.7 : 1.4, wh = stair ? 0.9 : 1.4; const wx = -LEN / 2 + (i + 0.5) * PW, wy = f * FL + (stair ? 1.3 : 0.85);
      for (const zf of [DEP / 2, -DEP / 2]) win.push(boxG(wx - ww / 2, wx + ww / 2, wy, wy + wh, zf - 0.02, zf + 0.02)); }
    addMesh(g, win, glass, 0); g.add(segs(L2, lineMat(GREY, LW.C)));
  } else { for (let f = 1; f < NF; f++) L2.push(-LEN / 2, f * FL, DEP / 2 + 0.01, LEN / 2, f * FL, DEP / 2 + 0.01); g.add(segs(L2, lineMat(GREY, LW.C))); }
  if (redFlat) { const [f, i0] = redFlat; const x0 = -LEN / 2 + i0 * PW, x1 = x0 + 2 * PW, y0 = f * FL, y1 = y0 + FL, z = DEP / 2 + 0.03; red.push(x0, y0, z, x1, y0, z, x1, y0, z, x1, y1, z, x1, y1, z, x0, y1, z, x0, y1, z, x0, y0, z); g.add(segs(red, lineMat(RED, 3.2, { depthTest: false }), 9)); }
  g.position.set(ox, 0, oz); g.traverse(o => o.frustumCulled = false); return g;
}
function trees(pts) { const g = grp('trees'); const D = [], L = []; for (const [x, z, r] of pts) { D.push(disc(x, z, r, 0.06)); L.push(...ring(x, z, r, 0.07, 24)); L.push(x - 0.2, 0.08, z, x + 0.2, 0.08, z, x, 0.08, z - 0.2, x, 0.08, z + 0.2); } addMesh(g, D, paper, 0); g.add(segs(L, lineMat(GREY, LW.C))); return g; }
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER);
  $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
  const komm = kommunalka(); scene.add(komm); const fp = flatPlan(); fp.position.set(0, 0, 0); scene.add(fp);
  const hero = block(0, 0, true, [2, 6]); scene.add(hero);
  const many = grp('many'); for (let r = -4; r <= 4; r++) for (let c = -3; c <= 3; c++) { if (!r && !c) continue; many.add(block(c * 82, r * 40, false)); } scene.add(many);
  const tp = []; for (let i = 0; i < 420; i++) { const x = (rng() - 0.5) * 600, z = (rng() - 0.5) * 380; const zz = ((z % 40) + 40) % 40; if (zz < 8 || zz > 32) continue; tp.push([x, z, 1.6 + rng() * 1.6]); } const tr = trees(tp); scene.add(tr);
  window.shot = (o) => {
    for (const [n, obj] of [['komm', komm], ['flat', fp], ['hero', hero], ['many', many], ['trees', tr]]) obj.visible = !!(o.show || []).includes(n);
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, t = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 3000; camera.position.set(t[0] + Math.sin(az) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); if (o.el >= 89) camera.up.set(0, 0, -1); camera.lookAt(t[0], t[1], t[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    $('kicker').textContent = o.kick || ''; $('title').style.opacity = o.title ? 1 : 0; if (o.title) $('title').textContent = o.title; $('sub').textContent = o.sub || ''; $('sub').style.opacity = o.sub ? 1 : 0;
    const svg = $('ov'); svg.innerHTML = ''; const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    const labs = [...(o.labels || [])]; if (o.show?.includes('komm')) labs.push(...komm.userData.labels); if (o.show?.includes('flat')) labs.push(...fp.userData.labels);
    for (const l of labs) { const p = P(l[0]); svg.insertAdjacentHTML('beforeend', `<text class="lab" x="${p[0]}" y="${p[1] + 5}" text-anchor="middle">${l[1]}</text>`); }
    return true; };
  window.READY = true;
}
