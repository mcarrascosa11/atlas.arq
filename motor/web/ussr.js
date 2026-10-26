import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, edgesOf, boxG, merge, prism, geomFrom, makeInkPass } from './lib.js';
const $ = (id) => document.getElementById(id);
const rng = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// Khrushchyovka (schematic large-panel block): 5 storeys x 2.7 m, 4 sections, 12 m deep, panels 3.2 m wide
const FL = 2.7, NF = 5, PW = 3.2, NP = 20, LEN = NP * PW, DEP = 12;
function block(ox, oz, rot, opts = {}) {
  const g = new THREE.Group(); const walls = [], dark = [], bal = [], red = []; const L = [], WL = [], RL = [];
  const upto = opts.floors ?? NF;
  for (let f = 0; f < upto; f++) {
    if (opts.only !== undefined && f !== opts.only) continue;
    const y0 = f * FL, y1 = y0 + FL;
    for (let i = 0; i < NP; i++) { const x0 = -LEN / 2 + i * PW, x1 = x0 + PW;
      for (const zf of [DEP / 2, -DEP / 2]) {
        const t = zf > 0 ? [zf - 0.3, zf] : [zf, zf + 0.3];
        const isRed = opts.redPanel && f === opts.redPanel[0] && i === opts.redPanel[1] && zf > 0;
        (isRed ? red : walls).push(boxG(x0 + 0.02, x1 - 0.02, y0 + 0.02, y1 - 0.02, t[0], t[1]));
        // window per panel (stair panels at section joints get a narrow window)
        const stair = i % 5 === 2; const ww = stair ? 0.7 : 1.5, wh = stair ? 1.0 : 1.45;
        const wx = (x0 + x1) / 2, wy = y0 + (stair ? 1.35 : 0.85);
        const zo = zf > 0 ? zf + 0.025 : zf - 0.025;
        dark.push(boxG(wx - ww / 2, wx + ww / 2, wy, wy + wh, zf > 0 ? zf : zf - 0.02, zf > 0 ? zf + 0.02 : zf));
        WL.push(wx - ww / 2, wy, zo, wx + ww / 2, wy, zo, wx + ww / 2, wy, zo, wx + ww / 2, wy + wh, zo, wx + ww / 2, wy + wh, zo, wx - ww / 2, wy + wh, zo, wx - ww / 2, wy + wh, zo, wx - ww / 2, wy, zo);
        WL.push(wx, wy, zo, wx, wy + wh, zo); if (!stair) WL.push(wx - ww / 2, wy + wh * 0.62, zo, wx + ww / 2, wy + wh * 0.62, zo);
        bal.push(boxG(wx - ww / 2 - 0.1, wx + ww / 2 + 0.1, wy - 0.06, wy, zf > 0 ? zf : zf - 0.14, zf > 0 ? zf + 0.14 : zf));
        if (!stair && f > 0 && zf > 0 && (i % 5 === 0 || i % 5 === 4)) { bal.push(boxG(x0 + 0.3, x1 - 0.3, y0 - 0.12, y0 + 0.05, zf, zf + 1.0), boxG(x0 + 0.3, x1 - 0.3, y0 + 0.95, y0 + 1.02, zf + 0.92, zf + 1.0));
          for (let bx = x0 + 0.4; bx < x1 - 0.3; bx += 0.16) RL.push(bx, y0 + 0.05, zf + 0.96, bx, y0 + 0.95, zf + 0.96);
          for (const bz of [zf + 0.1, zf + 0.5]) RL.push(x0 + 0.3, y0 + 0.05, bz, x0 + 0.3, y0 + 0.98, bz, x1 - 0.3, y0 + 0.05, bz, x1 - 0.3, y0 + 0.98, bz); }
      }
      L.push(x0, y0, DEP / 2 + 0.005, x0, y1, DEP / 2 + 0.005, x0, y0, -DEP / 2 - 0.005, x0, y1, -DEP / 2 - 0.005);
    }
    L.push(-LEN / 2, y0, DEP / 2 + 0.005, LEN / 2, y0, DEP / 2 + 0.005, -LEN / 2, y0, -DEP / 2 - 0.005, LEN / 2, y0, -DEP / 2 - 0.005);
    walls.push(boxG(-LEN / 2, -LEN / 2 + 0.3, y0, y1, -DEP / 2 + 0.3, DEP / 2 - 0.3), boxG(LEN / 2 - 0.3, LEN / 2, y0, y1, -DEP / 2 + 0.3, DEP / 2 - 0.3));
    walls.push(boxG(-LEN / 2 + 0.3, LEN / 2 - 0.3, y1 - 0.22, y1, -DEP / 2 + 0.3, DEP / 2 - 0.3));   // floor slab
  }
  if (upto >= NF && (opts.only === undefined || opts.only === NF - 1)) { walls.push(boxG(-LEN / 2, LEN / 2, NF * FL, NF * FL + 0.6, -DEP / 2, DEP / 2)); }
  // entrance canopies on the back face (one per section)
  if (opts.only === undefined || opts.only === 0) for (let s = 0; s < 4; s++) { const x = -LEN / 2 + (s * 5 + 2.5) * PW; walls.push(boxG(x - 1.4, x + 1.4, 2.4, 2.6, -DEP / 2 - 1.4, -DEP / 2)); }
  const add = (list, m, ang = 30, lw = 1.0) => { if (!list.length) return; const ge = merge(list); g.add(new THREE.Mesh(ge, m)); g.add(segs(edgesOf(ge, ang), lineMat('#1A1B20', lw))); };
  add(walls, fillMat('#F0EDE6', { hatch: 1, side: 0.95, shade: 0.86, double: true, poche: '#E2401C' }), 30, 1.1);
  add(dark, fillMat('#5E6168', { hatch: 0 }), 30, 0.6);
  add(bal, fillMat('#E6E2DA', { hatch: 1 }), 30, 0.8);
  add(red, fillMat('#E2401C', { hatch: 1 }), 30, 1.2);
  g.add(segs(L, lineMat('#8C8A84', 0.6))); if (WL.length) g.add(segs(WL, lineMat('#3A3B42', 0.6))); if (RL.length) g.add(segs(RL, lineMat('#3A3B42', 0.55)));
  g.position.set(ox, 0, oz); g.rotation.y = rot; g.traverse(o => o.frustumCulled = false);
  return g;
}
function crane(x, z, h, jibAng) {
  const L = []; const m = 1.0;
  for (const [dx, dz] of [[-m, -m], [m, -m], [m, m], [-m, m]]) L.push(x + dx, 0, z + dz, x + dx, h, z + dz);
  for (let y = 0; y < h; y += 2) { L.push(x - m, y, z - m, x + m, y + 2, z - m, x + m, y, z + m, x - m, y + 2, z + m, x - m, y, z - m, x - m, y + 2, z + m, x + m, y, z - m, x + m, y + 2, z + m); }
  const c = Math.cos(jibAng), s = Math.sin(jibAng); const jx = (d) => x + c * d, jz = (d) => z - s * d;
  L.push(jx(-10), h, jz(-10), jx(34), h, jz(34), jx(-10), h + 1.2, jz(-10), jx(34), h + 1.2, jz(34), x, h + 5, z, jx(34), h + 1.2, jz(34), x, h + 5, z, jx(-10), h + 1.2, jz(-10));
  for (let d = -10; d < 34; d += 2.2) L.push(jx(d), h, jz(d), jx(d + 2.2), h + 1.2, jz(d + 2.2));
  const g = segs(L, lineMat('#2A2B30', 1.0)); g.frustumCulled = false; return g;
}
function trees(n, area, avoid) {
  const CR = [], CR2 = [], TL = [], TB = [];
  const put = (x, z, kind) => {
    if (kind === 0) { const h = 9 + rng() * 5, r = 1.5 + rng() * 0.5; const g = new THREE.SphereGeometry(1, 10, 8); g.scale(r, h * 0.5, r); g.translate(x, 2.2 + h * 0.5, z); CR.push(g.toNonIndexed()); TL.push(x, 0, z, x, 2.4, z); }
    else if (kind === 1) { const r = 2.6 + rng() * 2.0, h = 3.2 + rng() * 1.6; const g = new THREE.IcosahedronGeometry(r, 1); g.scale(1, 0.85, 1); g.translate(x, h + r * 0.7, z); (rng() < 0.5 ? CR : CR2).push(g.toNonIndexed()); TL.push(x, 0, z, x, h, z); }
    else if (kind === 2) { const h = 5 + rng() * 3, r = 1.6 + rng() * 0.6; const g = new THREE.ConeGeometry(r, h * 0.8, 8); g.translate(x, 2.6 + h * 0.4, z); CR2.push(g.toNonIndexed()); TB.push(x, 0, z, x, 2.8, z); }
    else { const r = 0.9 + rng() * 0.7; const g = new THREE.IcosahedronGeometry(r, 0); g.translate(x, r * 0.7, z); CR2.push(g.toNonIndexed()); }
  };
  for (let i = 0; i < n; i++) { let x, z, ok, k = 0; do { x = (rng() - 0.5) * area; z = (rng() - 0.5) * area; ok = avoid(x, z); k++; } while (!ok && k < 60); if (!ok) continue;
    const kind = rng() < 0.22 ? 0 : rng() < 0.55 ? 1 : rng() < 0.7 ? 2 : 3; put(x, z, kind);
    if (kind === 1 && rng() < 0.5) for (let j = 0; j < 2; j++) { const xx = x + (rng() - 0.5) * 9, zz = z + (rng() - 0.5) * 9; if (avoid(xx, zz)) put(xx, zz, rng() < 0.5 ? 1 : 3); } }
  // poplar rows along the access paths (between the rows of blocks)
  for (const z of [-46, 46, -86, 86]) for (let x = -120; x <= 120; x += 7.5) { if (avoid(x, z)) put(x, z, 0); }
  const g = new THREE.Group();
  const a1 = merge(CR); g.add(new THREE.Mesh(a1, fillMat('#ECEBE3', { hatch: 1, side: 0.95, shade: 0.84 }))); g.add(segs(edgesOf(a1, 55), lineMat('#4A4B52', 0.6)));
  const a2 = merge(CR2); g.add(new THREE.Mesh(a2, fillMat('#E3E1D6', { hatch: 1, side: 0.93, shade: 0.8 }))); g.add(segs(edgesOf(a2, 55), lineMat('#4A4B52', 0.6)));
  g.add(segs(TL, lineMat('#3A3B42', 1.1))); g.add(segs(TB, lineMat('#9A978F', 1.6)));
  g.traverse(o => o.frustumCulled = false); return g;
}
// services of the microdistrict: school, kindergarten, shop pavilion; paths
function services() {
  const g = new THREE.Group(); const P = [], B = [], T = [], E = [];
  prism([[-36, -8], [36, -8], [36, 8], [-36, 8]], 0, 9.6, 0, P, B, T, E, { bottomEdges: true })                 // school (3 storeys) in the central strip
  for (const [x0, x1] of [[52, 70], [-70, -52]]) prism([[x0, -7], [x1, -7], [x1, 7], [x0, 7]], 0, 6.4, 0, P, B, T, E, { bottomEdges: true }); // kindergartens
  prism([[96, -6], [124, -6], [124, 6], [96, 6]], 0, 4.2, 0, P, B, T, E, { bottomEdges: true });                            // shop pavilion
  g.add(new THREE.Mesh(geomFrom(P, B, T), fillMat('#FBFAF6', { hatch: 1, windows: 0.6, side: 0.95, shade: 0.86 }))); g.add(segs(E, lineMat('#1A1B20', 1.1)));
  // cafeteria + club next to the shop
  { const P2 = [], B2 = [], T2 = [], E2 = []; prism([[96, 14], [116, 14], [116, 26], [96, 26]], 0, 4.2, 0, P2, B2, T2, E2, { bottomEdges: true }); g.add(new THREE.Mesh(geomFrom(P2, B2, T2), fillMat('#FBFAF6', { hatch: 1, windows: 0.6 }))); g.add(segs(E2, lineMat('#1A1B20', 1.1))); }
  // playgrounds in the courtyards between rows: sandpit rings, swings, slides
  const Lp = []; const ring = (x, z, r) => { for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, b = (i + 1) / 20 * Math.PI * 2; Lp.push(x + r * Math.cos(a), 0.06, z + r * Math.sin(a), x + r * Math.cos(b), 0.06, z + r * Math.sin(b)); } };
  for (const [x, z] of [[-82, -46], [0, -46], [82, -46], [-82, 46], [0, 46], [82, 46], [-82, 86], [82, -86]]) { ring(x - 8, z, 2.2); ring(x - 8, z, 1.6); Lp.push(x + 2, 0, z - 1.5, x + 2, 2.4, z - 1.5, x + 2, 0, z + 1.5, x + 2, 2.4, z + 1.5, x + 2, 2.4, z - 1.5, x + 2, 2.4, z + 1.5, x + 6, 0, z - 1, x + 6, 2.0, z - 1, x + 6, 2.0, z - 1, x + 10, 0, z - 1); }
  g.add(segs(Lp, lineMat('#E2401C', 1.6)));
  const L = []; for (const z of [-20, 20, 60, -60]) L.push(-150, 0.04, z, 150, 0.04, z); for (const x of [-41, 41]) L.push(x, 0.04, -110, x, 0.04, 110);
  // traffic only on the perimeter road
  for (const z of [-118, 118]) L.push(-160, 0.04, z, 160, 0.04, z); for (const x of [-160, 160]) L.push(x, 0.04, -118, x, 0.04, 118);
  g.add(segs(L, lineMat('#BDB9AE', 1.4)));
  g.traverse(o => o.frustumCulled = false); g.name = 'services'; return g;
}
// microdistrict: parallel rows of identical blocks (the repetition is the point)
const SITES = []; for (let r = -2; r <= 2; r++) for (let c = -1; c <= 1; c++) { if (r === 0 && c !== 0) continue; SITES.push([c * 82, r * 40 + (r === 0 ? 0 : Math.sign(r) * 12), 0]); }
function flat() {   // one 2-room flat cut open at floor 3: walls, kitchen, bath, furniture
  const g = new THREE.Group(); const w = [], fur = []; const y = 2 * FL;
  const x0 = -LEN / 2 + 5 * PW, x1 = x0 + 4 * PW;
  const wall = (a, b, c, d) => w.push(boxG(a, b, y + 0.05, y + FL - 0.25, c, d));
  wall(x0, x0 + 0.15, -DEP / 2 + 0.3, DEP / 2 - 0.3); wall(x1 - 0.15, x1, -DEP / 2 + 0.3, DEP / 2 - 0.3);
  wall(x0, x1, -0.6, -0.48); wall(x0 + 2 * PW - 0.06, x0 + 2 * PW + 0.06, -0.6, DEP / 2 - 0.3); wall(x0 + 1.4 * PW, x0 + 1.4 * PW + 0.1, -DEP / 2 + 0.3, -0.6);
  fur.push(boxG(x0 + 0.4, x0 + 2.4, y + 0.05, y + 0.5, 1.0, 2.6), boxG(x0 + 3.6, x0 + 5.6, y + 0.05, y + 0.75, 3.6, 4.4), boxG(x0 + 7.0, x0 + 8.8, y + 0.05, y + 0.5, 0.6, 2.6), boxG(x1 - 2.4, x1 - 0.4, y + 0.05, y + 0.9, -4.2, -3.6), boxG(x0 + 0.4, x0 + 1.6, y + 0.05, y + 0.6, -4.4, -3.0));
  const add = (list, m, lw) => { const ge = merge(list); g.add(new THREE.Mesh(ge, m)); g.add(segs(edgesOf(ge, 30), lineMat('#1A1B20', lw))); };
  add(w, fillMat('#F0EDE6', { hatch: 1, double: true, poche: '#E2401C' }), 1.0); add(fur, fillMat('#E9E6DE', { hatch: 1, side: 0.94, shade: 0.84 }), 0.9);
  g.traverse(o => o.frustumCulled = false); return g;
}
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); renderer.localClippingEnabled = true;
  $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
  const ink = makeInkPass(renderer, W, H);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), fillMat('#F2F1EC', { hatch: 0 })); ground.userData.noInk = true; scene.add(ground);
  const hero = new THREE.Group(); const heroF = []; for (let k = 0; k < NF; k++) { const b = block(0, 0, 0, { only: k }); heroF.push(b); hero.add(b); } scene.add(hero);
  const setFloors = (n) => heroF.forEach((b, k) => b.visible = k < n);
  const building = block(0, 0, 0, { floors: 3, redPanel: [2, 9] }); building.visible = false; scene.add(building);
  const cr = crane(0, -14, 24, 0.4); cr.visible = false; scene.add(cr);
  const district = new THREE.Group(); for (const [x, z, r] of SITES) if (x || z) district.add(block(x, z, r)); district.visible = false; scene.add(district);
  const svc = services(); svc.visible = false; scene.add(svc);
  const dclip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  district.children.forEach(b => { b.userData.d = Math.hypot(b.position.x, b.position.z); });
  const growDistrict = (f) => { const maxd = 200; district.children.forEach(b => { const s0 = b.userData.d / maxd * 0.6; const k = Math.min(1, Math.max(0.001, (f - s0) / 0.4)); b.scale.y = k * k * (3 - 2 * k) || 0.001; }); };
  const tr = trees(150, 280, (x, z) => SITES.every(([sx, sz]) => Math.abs(x - sx) > LEN / 2 + 3 || Math.abs(z - sz) > DEP / 2 + 4) && !(Math.abs(z) < 12 && Math.abs(x) < 130) && !(z > 5 && z < 34 && Math.abs(x) < 46)); scene.add(tr);
  const ring = []; for (let i = 0; i < 96; i += 2) { const a = i / 96 * Math.PI * 2, b2 = (i + 1) / 96 * Math.PI * 2; ring.push(92 * Math.cos(a), 0.3, 92 * Math.sin(a), 92 * Math.cos(b2), 0.3, 92 * Math.sin(b2)); }
  const walk = segs(ring, lineMat('#E2401C', 2.6, { depthTest: false }), 9); walk.visible = false; walk.frustumCulled = false; scene.add(walk);
  const fl = flat(); fl.visible = false; scene.add(fl);
  const cut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  hero.traverse(o => { if (o.material) o.material.clippingPlanes = [cut]; }); fl.traverse(o => { if (o.material) o.material.clippingPlanes = [cut]; }); ink.normalMat.clippingPlanes = [cut];
  // red outlines for the 2017 renovation
  const redL = []; for (const [x, z] of SITES) { const a = [[-LEN / 2, -DEP / 2], [LEN / 2, -DEP / 2], [LEN / 2, DEP / 2], [-LEN / 2, DEP / 2]]; for (let i = 0; i < 4; i++) { const p = a[i], q = a[(i + 1) % 4]; for (const y of [0.05, NF * FL + 0.6]) redL.push(x + p[0], y, z + p[1], x + q[0], y, z + q[1]); redL.push(x + p[0], 0, z + p[1], x + p[0], NF * FL + 0.6, z + p[1]); } }
  const reno = segs(redL, lineMat('#E2401C', 2.6, { depthTest: false }), 9); reno.visible = false; reno.frustumCulled = false; scene.add(reno);
  // renovation wave: a new tall building on a free plot of the same district; the old block marked for demolition; the move in vermillion
  const wave = new THREE.Group(); wave.visible = false; scene.add(wave);
  { const P = [], B = [], T = [], E = []; prism([[-30, -132], [30, -132], [30, -116], [-30, -116]], 0, 17 * 3.0, 0, P, B, T, E, { bottomEdges: true });
    wave.add(new THREE.Mesh(geomFrom(P, B, T), fillMat('#FBFAF6', { hatch: 1, windows: 1, side: 0.95, shade: 0.86 }))); wave.add(segs(E, lineMat('#1A1B20', 1.2)));
    const R = []; const box = [[-LEN / 2 - 0.5, -DEP / 2 - 0.5], [LEN / 2 + 0.5, -DEP / 2 - 0.5], [LEN / 2 + 0.5, DEP / 2 + 0.5], [-LEN / 2 - 0.5, DEP / 2 + 0.5]];
    for (let i = 0; i < 4; i++) { const p = box[i], q = box[(i + 1) % 4]; for (const y of [0.05, NF * FL + 0.7]) { const n = 18; for (let k = 0; k < n; k += 2) R.push(p[0] + (q[0] - p[0]) * k / n, y, p[1] + (q[1] - p[1]) * k / n, p[0] + (q[0] - p[0]) * (k + 1) / n, y, p[1] + (q[1] - p[1]) * (k + 1) / n); } }
    for (let k = 0; k < 40; k += 2) { const t0 = k / 40, t1 = (k + 1) / 40; const pz = (t) => -8 - t * 104, py = (t) => 18 + Math.sin(t * Math.PI) * 26; R.push(0, py(t0), pz(t0), 0, py(t1), pz(t1)); }
    R.push(0, 18, -112, -3, 22, -106, 0, 18, -112, 3, 22, -106);
    const rl = segs(R, lineMat('#E2401C', 2.6, { depthTest: false }), 9); rl.frustumCulled = false; wave.add(rl); }
  window.shot = (o) => {
    wave.visible = !!o.wave;
    svc.visible = !!o.services; walk.visible = !!o.walk;
    hero.visible = !o.hideHero || !!o.mask; building.visible = !!o.building; cr.visible = !!o.crane; district.visible = !!o.district; fl.visible = !!o.flat; reno.visible = !!o.reno;
    cut.constant = o.cut ?? 1e6; growDistrict(o.grow ?? 1); svc.scale.y = Math.max(0.001, o.sgrow ?? 1); if (o.mask) heroF.forEach((b, k) => b.visible = !!o.mask[k]); else if (o.floors !== undefined) setFloors(o.floors); else setFloors(NF);
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, t = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 3000; camera.position.set(t[0] + Math.sin(az) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); camera.lookAt(t[0], t[1], t[2]); camera.near = 1; camera.far = 7000; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    ink.render(scene, camera);
    $('kicker').textContent = o.kick || ''; $('title').style.opacity = o.title ? 1 : 0; if (o.title) $('title').textContent = o.title;
    $('sub').textContent = o.sub || ''; $('sub').style.opacity = o.sub ? 1 : 0;
    const svg = $('ov'); svg.innerHTML = '';
    const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    for (const l of o.labels || []) { const p = P(l[0]); svg.insertAdjacentHTML('beforeend', `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#1A1B20"/><line x1="${p[0]}" y1="${p[1]}" x2="${p[0]}" y2="${p[1] - 28}" stroke="#1A1B20" stroke-width="1.2"/><text class="lab" x="${p[0]}" y="${p[1] - 34}">${l[1]}</text>`); }
    for (const dd of o.dims || []) { const a = P(dd[0]), b = P(dd[1]); svg.insertAdjacentHTML('beforeend', `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#E2401C" stroke-width="2.4"/><line x1="${a[0] - 9}" y1="${a[1]}" x2="${a[0] + 9}" y2="${a[1]}" stroke="#E2401C" stroke-width="2.4"/><line x1="${b[0] - 9}" y1="${b[1]}" x2="${b[0] + 9}" y2="${b[1]}" stroke="#E2401C" stroke-width="2.4"/><text class="dim" x="${(a[0] + b[0]) / 2 + (dd[3] || 0)}" y="${(a[1] + b[1]) / 2 + 8}">${dd[2]}</text>`); }
    return true;
  };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)); const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }; const smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const seg = (t, a, b) => clamp((t - a) / (b - a)); const lerp = (a, b, t) => a + (b - a) * t; const fw = (t, a, b, f = 0.35) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
  const K = [
    { t: 0, tg: [0, 8, 0], z: 36, az: 32, el: 18 }, { t: 1.6, tg: [0, 8, 0], z: 36, az: 30, el: 18 },
    { t: 6.6, tg: [0, 10, -4], z: 34, az: 26, el: 22 }, { t: 9.2, tg: [-2, 8, 4], z: 18, az: 24, el: 16 }, { t: 12.6, tg: [-2, 8, 4], z: 19, az: 32, el: 14 },
    { t: 14.6, tg: [-LEN / 2 + 22, 6, 0], z: 15, az: 18, el: 55 }, { t: 18.8, tg: [-LEN / 2 + 22, 6, 0], z: 14, az: 22, el: 58 },
    { t: 24.8, tg: [0, 6, 0], z: 118, az: 30, el: 36 }, { t: 26.8, tg: [20, 0, 0], z: 150, az: 90, el: 88 }, { t: 38.2, tg: [20, 0, 0], z: 150, az: 90, el: 88 },
    { t: 41.0, tg: [0, 6, 0], z: 130, az: 30, el: 34 }, { t: 47.6, tg: [0, 6, 0], z: 132, az: 34, el: 32 },
    { t: 50.0, tg: [0, 20, -64], z: 118, az: 90, el: 16 }, { t: 55.0, tg: [0, 20, -64], z: 116, az: 88, el: 16 },
    { t: 57.0, tg: [0, 8, 0], z: 36, az: 32, el: 18 }, { t: 58.5, tg: [0, 8, 0], z: 36, az: 32, el: 18 } ];
  const subs = [[2.0, 6.8, 'En 1957 la URSS promete acabar con la falta de vivienda en diez o doce años.'],
    [7.2, 13.2, 'Paneles de hormigón hechos en fábrica, cinco plantas y sin ascensor: cerca de un 30 % más barato.'],
    [13.6, 19.2, 'Pisos de 30 a 60 m², con cocina de 5–6 m² y techos de 2,5 m. Los construía y repartía el Estado, con alquileres muy bajos.'],
    [19.6, 25.6, 'La respuesta no es un edificio: es un barrio completo, fabricado en serie.'],
    [26.8, 34.0, 'Cada barrio, para 5.000–10.000 vecinos: colegio, guarderías, tiendas, comedor, club y zonas de juego a un paseo. El tráfico, por fuera.'],
    [34.4, 38.6, 'Se planificaban a la vez que las casas; en muchas ciudades llegaron años después.'],
    [40.8, 44.6, 'Se pensaron como algo provisional: las primeras series se calcularon para durar entre 25 y 50 años.'],
    [44.8, 48.6, 'La escasez no se cerró: en 1986 se volvió a prometer un piso por familia, ahora para el año 2000.'],
    [49.6, 56.0, 'En 2017 Moscú aprueba derribar 5.175 de esos edificios: los vecinos se mudan gratis a un piso de igual tamaño en su mismo distrito.']];
  const kick = [[0, '007 · URSS, 1957'], [2.0, '01 · 1957'], [7.0, '02 · EL MÉTODO'], [13.4, '03 · EL PISO'], [19.4, '04 · EL BARRIO'], [26.6, '05 · EL MICRODISTRITO'], [40.6, '06 · 25 AÑOS'], [49.4, '07 · HOY'], [56.6, '007 · URSS, 1957']];
  const T = '¿Pudo la URSS acabar con la falta de vivienda en diez años?';
  window.renderAt = (t) => {
    let i = 1; while (i < K.length - 1 && K[i].t < t) i++; const A = K[i - 1], Bk = K[i]; const u = smr(seg(t, A.t, Bk.t));
    const o = { tg: A.tg.map((v, k) => lerp(v, Bk.tg[k], u)), z: Math.exp(lerp(Math.log(A.z), Math.log(Bk.z), u)), az: lerp(A.az, Bk.az, u), el: lerp(A.el, Bk.el, u) };
    // block: full -> down to 3 floors -> the 3-floor building with the red panel and the crane, storeys 4 and 5 added on top -> full block cut for the flat
    if (t < 2.4) o.floors = 5;
    else if (t < 3.8) o.floors = t < 3.1 ? 4 : 3;
    else if (t < 13.2) { o.hideHero = true; o.building = true; o.crane = true; o.mask = [0, 0, 0, t >= 10.4 ? 1 : 0, t >= 11.6 ? 1 : 0]; }
    else o.floors = 5;
    if (t >= 13.4 && t < 19.4) { o.cut = 6.9; o.flat = true; }
    if (t >= 10.2 && t < 13.2) o.dims = [[[LEN / 2 + 3, 0, DEP / 2], [LEN / 2 + 3, 13.5, DEP / 2], '5 plantas', 70]];
    // pulling back from the flat, the district grows around the block as solid volumes
    if (t >= 19.4 && t < 49.2) { o.district = true; o.grow = seg(t, 19.8, 24.4); }
    if (t >= 19.4 && t < 49.2) { o.services = !(t > 34.8 && t < 36.8); o.sgrow = t < 26 ? sm(seg(t, 21.0, 22.8)) : 1; }
    if (t >= 27.2 && t < 38.6) o.walk = true;
    if (t >= 49.2 && t < 56.4) o.wave = true;
    if (t >= 27.2 && t < 38.6) o.labels = [[[0, 9.6, 0], 'COLEGIO'], [[61, 6.4, 0], 'GUARDERÍA'], [[-61, 6.4, 0], 'GUARDERÍA'], [[110, 4.2, 0], 'TIENDA'], [[106, 4.2, 20], 'COMEDOR · CLUB'], [[-6, 0, 46], 'JUEGOS']];
    if (t >= 41.0 && t < 48.6) o.labels = [[[0, NF * FL + 1, 0], '25–50 AÑOS']];
    o.kick = ''; for (const [s0, k0] of kick) if (t >= s0) o.kick = k0;
    const titleOp = Math.max(1 - sm(seg(t, 1.6, 2.1)), sm(seg(t, 56.8, 57.4)));
    o.title = titleOp > 0.001 ? T : '';
    o.sub = ''; let so = 0; for (const [a0, b0, tx] of subs) { const f = fw(t, a0, b0); if (f > 0) { o.sub = tx; so = f; } }
    window.shot(o); $('title').style.opacity = titleOp; $('sub').style.opacity = so; return true; };
  window.renderCover = () => { document.body.classList.add('cover'); tr.visible = false; window.shot({ tg: [2, 18, -4], z: 40, az: 26, el: 20, hideHero: true, building: true, crane: true }); return true; };
  window.READY = true;
}
