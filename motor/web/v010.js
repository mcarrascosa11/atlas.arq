import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, upTri, merge } from './lib.js';
// 010 · ¿Hay alternativa a los bloques cebra? Zaragoza (Catastro, sin color) frente a Lyon Confluence (IGN BD TOPO, a línea con color).
// Zaragoza: origen en la estación Delicias; altura = plantas x 3 m (aproximada). Lyon: origen en el îlot A3, desplazado OZ metros al sur en la lámina.
const $ = (id) => document.getElementById(id);
const LW = { A: 1.8, B: 1.0, C: 0.5 }; const INK = '#1A1B20', GREY = '#9A978F', RED = '#E2401C', GREEN = '#A8C09C', BLUE = '#A9C2D2';
const OX = 0, OZ = 2600;   // Lyon queda al sur de Zaragoza en la lámina: en vertical se ven las dos al pasar
const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
const orient = (rings) => rings.map((r, i) => { const s = area(r); return (i === 0 ? s < 0 : s > 0) ? [...r].reverse() : r; });
function push3(P, B, T, y0, y1, a, b, c) { P.push(...a, ...b, ...c); B.push(y0, y0, y0); T.push(y1, y1, y1); }
// volumen cerrado: muros, cubierta plana, líneas de cubierta, arranque, esquinas reales y (opcional) forjados
function extrude(rings, y0, y1, P, B, T, E, o = {}) {
  const R = orient(rings); const cosC = Math.cos((o.corner ?? 24) * Math.PI / 180);
  for (const r of R) {
    const n = r.length;
    for (let i = 0; i < n; i++) {
      const a = r[i], b = r[(i + 1) % n], pr = r[(i - 1 + n) % n];
      if (!o.noWalls) { push3(P, B, T, y0, y1, [a[0], y0, a[1]], [a[0], y1, a[1]], [b[0], y1, b[1]]); push3(P, B, T, y0, y1, [a[0], y0, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]]); }
      E.push(a[0], y1, a[1], b[0], y1, b[1]); if (o.base) E.push(a[0], y0 + 0.03, a[1], b[0], y0 + 0.03, b[1]);
      if (o.fh) for (let y = y0 + o.fh; y < y1 - 0.6; y += o.fh) E.push(a[0], y, a[1], b[0], y, b[1]);
      const e1 = [a[0] - pr[0], a[1] - pr[1]], e2 = [b[0] - a[0], b[1] - a[1]];
      const c = (e1[0] * e2[0] + e1[1] * e2[1]) / ((Math.hypot(...e1) * Math.hypot(...e2)) || 1);
      if (c < cosC) E.push(a[0], y0, a[1], a[0], y1, a[1]);
    }
  }
  flat(R, y1, P, B, T, y0);
}
function flat(R, y, P, B, T, yb = y) {
  const v2 = (r) => r.map(p => new THREE.Vector2(p[0], p[1]));
  const faces = THREE.ShapeUtils.triangulateShape(v2(R[0]), R.slice(1).map(v2)); const pts = R.flat();
  for (const f of faces) { const p = f.map(i => [pts[i][0], y, pts[i][1]]); push3(P, B, T, yb, y, ...upTri(p[0], p[1], p[2])); }
}
function band(ring, y0, y1, P, B, T) {   // franja: solo muros, hacia fuera, sobre el anillo desplazado
  const r = orient([ring])[0], n = r.length;
  for (let i = 0; i < n; i++) { const a = r[i], b = r[(i + 1) % n];
    push3(P, B, T, y0, y1, [a[0], y0, a[1]], [a[0], y1, a[1]], [b[0], y1, b[1]]); push3(P, B, T, y0, y1, [a[0], y0, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]]); }
}
const flatM = (c) => fillMat(c, { hatch: 0, side: 1, shade: 1 });
// fachadas del îlot A3 con el vocabulario de la axonométrica de referencia: muro perforado con huecos remetidos y carpintería,
// escaparates en planta baja (vidrio bermellón cuando se "encienden" los bajos), balcones como losas macizas con barandilla y,
// en la torre de Herzog & de Meuron (R+16), losas de vuelo variable. Edificio 6 (Kerez, cours Charlemagne): retícula de hormigón
// con paños de 4,05 m y plantas de 3,6 m (PSS-archi, Lyon Capitale). El resto de tipos, por la axonométrica.
const FT = { '569173': 'tower', '568291': 'grid', '568890': 'glass', '568935': 'win', '569058': 'balc', '568304': 'win', '568867': 'balc', '568495': 'win', hall: 'hall' };
function facadeWalls(ring, h, type, G, E, seed) {
  const R = orient([ring])[0], n = R.length; let cx = 0, cz = 0; for (const p of R) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
  const g0 = type === 'grid' ? 3.6 : 4.0, fh = type === 'grid' ? 3.6 : type === 'glass' ? 3.8 : type === 'tower' ? (h - g0) / Math.round((h - g0) / 3.0) : 3.0;
  const levels = []; for (let y = g0; y <= h - fh * 0.8; y += fh) levels.push(y);
  let rs = seed; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  const V = (x, y) => new THREE.Vector2(x, y);
  for (let i = 0; i < n; i++) {
    const a = R[i], b = R[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.05) continue;
    const ux = dx / len, uz = dz / len; let nx = uz, nz = -ux; if (nx * ((a[0] + b[0]) / 2 - cx) + nz * ((a[1] + b[1]) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    const P3 = (s, y, d = 0) => [a[0] + ux * s - nx * d, y, a[1] + uz * s - nz * d];   // d > 0 hacia dentro, d < 0 hacia fuera
    const tri = (A, p, q, r, N) => { const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
      const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      if (c[0] * N[0] + c[1] * N[1] + c[2] * N[2] < 0) push3(A.P, A.B, A.T, 0, h, p, r, q); else push3(A.P, A.B, A.T, 0, h, p, q, r); };
    const quad = (A, p0, p1, p2, p3, N) => { tri(A, p0, p1, p2, N); tri(A, p0, p2, p3, N); };
    const L = (p, q) => E.push(p[0], p[1], p[2], q[0], q[1], q[2]);
    const NO = [nx, 0, nz], NI = [-nx, 0, -nz], UP = [0, 1, 0], DN = [0, -1, 0], UA = [ux, 0, uz], UB = [-ux, 0, -uz];
    const holes = [];
    const add = (s0, s1, y0, y1, d, kind = 'w') => { s0 = Math.max(0.3, s0); s1 = Math.min(len - 0.3, s1); y1 = Math.min(h - 0.35, y1); if (s1 - s0 > 0.4 && y1 - y0 > 0.4) holes.push([s0, s1, y0, y1, d, kind]); };
    const slab = (s0, s1, y, dep) => {   // losa maciza que vuela dep metros, con canto de 0,2 m y barandilla de 1 m
      const o = -dep, t = 0.2;
      quad(G.Sl, P3(s0, y, 0), P3(s1, y, 0), P3(s1, y, o), P3(s0, y, o), UP); quad(G.Sl, P3(s0, y - t, 0), P3(s1, y - t, 0), P3(s1, y - t, o), P3(s0, y - t, o), DN);
      quad(G.Sl, P3(s0, y - t, o), P3(s1, y - t, o), P3(s1, y, o), P3(s0, y, o), NO);
      quad(G.Sl, P3(s0, y - t, 0), P3(s0, y, 0), P3(s0, y, o), P3(s0, y - t, o), UB); quad(G.Sl, P3(s1, y - t, 0), P3(s1, y, 0), P3(s1, y, o), P3(s1, y - t, o), UA);
      const q = -dep - 0.02; L(P3(s0, y, q), P3(s1, y, q)); L(P3(s0, y - t, q), P3(s1, y - t, q)); L(P3(s0, y, q), P3(s0, y - t, q)); L(P3(s1, y, q), P3(s1, y - t, q));
      L(P3(s0, y, -0.02), P3(s0, y, q)); L(P3(s1, y, -0.02), P3(s1, y, q));
      L(P3(s0, y + 1.0, q), P3(s1, y + 1.0, q)); L(P3(s0, y, q), P3(s0, y + 1.0, q)); L(P3(s1, y, q), P3(s1, y + 1.0, q));
      L(P3(s0, y + 1.0, -0.02), P3(s0, y + 1.0, q)); L(P3(s1, y + 1.0, -0.02), P3(s1, y + 1.0, q));
    };
    if (len >= 2.6 && type !== 'hall') {   // planta baja: escaparates
      const nb = Math.max(1, Math.round(len / 5.0)), bw = len / nb; for (let j = 0; j < nb; j++) add(j * bw + 0.45, (j + 1) * bw - 0.45, 0.25, g0 - 0.6, 0.4, 'shop');
    }
    if (len >= 2.6) {
      if (type === 'hall') { const nb = Math.max(1, Math.round(len / 2.5)), bw = len / nb; for (let j = 0; j < nb; j++) add(j * bw + 0.25, (j + 1) * bw - 0.25, 0.4, h - 0.6, 0.3, 'shop'); }
      else if (type === 'glass') { const nb = Math.max(1, Math.round(len / 2.7)), bw = len / nb; for (const y of levels) for (let j = 0; j < nb; j++) add(j * bw + 0.15, (j + 1) * bw - 0.15, y + 0.25, y + fh - 0.25, 0.25); }
      else if (type === 'grid') { const nb = Math.max(1, Math.round(len / 4.05)), bw = len / nb; for (const y of levels) for (let j = 0; j < nb; j++) add(j * bw + 0.25, (j + 1) * bw - 0.25, y + 0.55, y + fh - 0.2, 0.45); }
      else if (type === 'tower') {
        for (const y of levels) { let s = 0; while (s < len - 0.8) { const w = Math.min(len - s, 2.4 + rnd() * 1.8); const dep = 0.5 + rnd() * 1.2;
          add(s + 0.35, s + w - 0.35, y + 0.15, y + fh - 0.3, 0.3); if (w > 1.4) slab(s + 0.05, s + w - 0.05, y, dep); s += w; } }
      }
      else { const bay = type === 'balc' ? 3.6 : 3.0, nb = Math.max(1, Math.round(len / bay)), bw = len / nb;
        for (const y of levels) for (let j = 0; j < nb; j++) { const sc = (j + 0.5) * bw;
          if (type === 'win') add(sc - bw * 0.25, sc + bw * 0.25, y + fh * 0.2, y + fh * 0.8, 0.3);
          else { add(sc - bw * 0.36, sc + bw * 0.36, y + 0.1, y + fh - 0.35, 0.35); slab(sc - bw * 0.46, sc + bw * 0.46, y, 1.2); } } }
    }
    // muro perforado
    const contour = [V(0, 0), V(len, 0), V(len, h), V(0, h)], hv = holes.map(([s0, s1, y0, y1]) => [V(s0, y0), V(s1, y0), V(s1, y1), V(s0, y1)]);
    const faces = THREE.ShapeUtils.triangulateShape(contour, hv), pts = [...contour, ...hv.flat()];
    for (const f of faces) tri(G.Wl, P3(pts[f[0]].x, pts[f[0]].y), P3(pts[f[1]].x, pts[f[1]].y), P3(pts[f[2]].x, pts[f[2]].y), NO);
    for (const [s0, s1, y0, y1, d, kind] of holes) {
      quad(G.Rv, P3(s0, y0), P3(s0, y1), P3(s0, y1, d), P3(s0, y0, d), UA); quad(G.Rv, P3(s1, y0), P3(s1, y1), P3(s1, y1, d), P3(s1, y0, d), UB);
      quad(G.Rv, P3(s0, y0), P3(s1, y0), P3(s1, y0, d), P3(s0, y0, d), UP); quad(G.Rv, P3(s0, y1), P3(s1, y1), P3(s1, y1, d), P3(s0, y1, d), DN);
      quad(G.Gl, P3(s0, y0, d), P3(s1, y0, d), P3(s1, y1, d), P3(s0, y1, d), NO);
      if (kind === 'shop') quad(G.Gr, P3(s0, y0, d - 0.01), P3(s1, y0, d - 0.01), P3(s1, y1, d - 0.01), P3(s0, y1, d - 0.01), NO);
      const o = -0.02, di = d - 0.03;
      L(P3(s0, y0, o), P3(s1, y0, o)); L(P3(s1, y0, o), P3(s1, y1, o)); L(P3(s1, y1, o), P3(s0, y1, o)); L(P3(s0, y1, o), P3(s0, y0, o));
      L(P3(s0, y0, di), P3(s1, y0, di)); L(P3(s1, y0, di), P3(s1, y1, di)); L(P3(s1, y1, di), P3(s0, y1, di)); L(P3(s0, y1, di), P3(s0, y0, di));
      L(P3(s0, y0, o), P3(s0, y0, di)); L(P3(s1, y0, o), P3(s1, y0, di)); L(P3(s1, y1, o), P3(s1, y1, di)); L(P3(s0, y1, o), P3(s0, y1, di));
      // carpintería: montante central en huecos anchos y travesaño en los altos
      const w = s1 - s0, hh = y1 - y0;
      if (w > 1.5) { const sm = (s0 + s1) / 2; L(P3(sm, y0, di), P3(sm, y1, di)); }
      if (hh > 2.2 && kind !== 'shop') { const yt = y1 - Math.min(0.6, hh * 0.25); L(P3(s0, yt, di), P3(s1, yt, di)); }
    }
  }
}

export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
  const [Z, L] = await Promise.all([fetch('zgz10.json').then(r => r.json()), fetch('lyon10.json').then(r => r.json())]);
  const revealM = fillMat('#ECEAE3', { hatch: 0, side: 0.9, shade: 0.74 }), slabM = fillMat('#F3F1EB', { hatch: 0, side: 0.93, shade: 0.8 }), glassM = flatM('#DCDCD6'), paperM = flatM('#F6F5F1'), inkM = flatM(INK), redM = flatM(RED), greenM = flatM(GREEN), blueM = flatM(BLUE);
  // ================= ZARAGOZA (papel y tinta) =================
  const ZG = new THREE.Group(); scene.add(ZG); const ZC = new THREE.Group(); ZG.add(ZC);
  { const P = [], B = [], T = [], E = [], F = [];
    for (const v of Z.vols) {
      if (v.k === 'flat') { for (const r of v.r) for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length]; F.push(a[0], 0.04, a[1], c[0], 0.04, c[1]); } continue; }
      if (v.k === 'zebra') continue;
      extrude(v.r, 0, Math.max(v.h, 2.5), P, B, T, E, { base: true });
    }
    ZC.add(new THREE.Mesh(geomFrom(P, B, T), paperM)); ZC.add(segs(E, lineMat(INK, LW.C))); ZC.add(segs(F, lineMat(GREY, LW.C))); }
  // las cebras: volumen blanco + franjas de tinta por planta (la baja, entera: zócalo ciego)
  const zebraBands = [];   // un grupo por planta para poder despegarlas y volver a ponerlas
  { const P = [], B = [], T = [], E = []; const byK = new Map();
    for (const v of Z.vols) {
      if (v.k !== 'zebra') continue;
      const h = Math.max(v.h, 3); extrude(v.r, 0, h, P, B, T, E, { base: true });
      if (!v.ro || v.fl < 1) continue;
      for (let k = 0; k < v.fl; k++) {
        const y0 = k === 0 ? 0.0 : k * 3 + 0.95, y1 = k === 0 ? 3.0 : k * 3 + 2.35;
        if (!byK.has(k)) byK.set(k, [[], [], []]); const [p, b, t] = byK.get(k); band(v.ro, y0, y1, p, b, t);
      }
    }
    ZG.add(new THREE.Mesh(geomFrom(P, B, T), paperM)); ZG.add(segs(E, lineMat(INK, LW.B)));
    for (const k of [...byK.keys()].sort((a, b) => a - b)) { const [p, b, t] = byK.get(k); const m = new THREE.Mesh(geomFrom(p, b, t), inkM); m.userData.k = k; ZG.add(m); zebraBands.push(m); } }
  const KMAX = Math.max(...zebraBands.map(m => m.userData.k));
  // ================= LYON (a línea, con color) =================
  const LG = new THREE.Group(); LG.position.set(OX, 0, OZ); scene.add(LG);
  { const P = [], B = [], T = [], E = [];   // agua
    for (const w of L.water) flat(orient(w), -0.3, P, B, T);
    LG.add(new THREE.Mesh(geomFrom(P, B, T), blueM)); }
  { const P = [], B = [], T = [], E = [], F = [];
    for (const b of L.blds) {
      if (b.k === 'a3' || b.k === 'hall') continue;
      if (b.h === null || b.h === undefined) { for (const r of b.r) for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length]; F.push(a[0], 0.04, a[1], c[0], 0.04, c[1]); } continue; }
      extrude(b.r, 0, Math.max(b.h, 2.5), P, B, T, E, { base: true });
    }
    LG.add(new THREE.Mesh(geomFrom(P, B, T), paperM)); LG.add(segs(E, lineMat(INK, LW.C))); LG.add(segs(F, lineMat(GREY, LW.C))); }
  const A3 = [], RDC = [];
  const ORDER = ['568291', '568867', '568495', '568890', '568935', '569058', '568304', '569173'];
  for (const b of L.blds) {
    if (b.k !== 'a3' && b.k !== 'hall') continue;
    const P = [], B = [], T = [], E = [], E2 = [], mk = () => ({ P: [], B: [], T: [] }), G = { Wl: mk(), Rv: mk(), Gl: mk(), Gr: mk(), Sl: mk() };
    extrude([b.r[0]], 0, b.h, P, B, T, E, { base: true, noWalls: true });
    facadeWalls(b.r[0], b.h, FT[b.k === 'hall' ? 'hall' : b.id] || 'win', G, E2, (parseInt(b.id || '851837', 10) % 2147483646) + 1);
    const g = new THREE.Group(); for (const [A, M] of [[{ P, B, T }, paperM], [G.Wl, paperM], [G.Rv, revealM], [G.Gl, glassM], [G.Sl, slabM]]) g.add(new THREE.Mesh(geomFrom(A.P, A.B, A.T), M));
    g.add(segs(E, lineMat(INK, LW.B))); g.add(segs(E2, lineMat(INK, LW.C)));
    const rg = new THREE.Mesh(geomFrom(G.Gr.P, G.Gr.B, G.Gr.T), redM); rg.scale.y = 0.0001; g.add(rg); RDC.push(rg);
    LG.add(g); if (b.k === 'a3') { g.userData.id = b.id; A3.push(g); }
  }
  A3.sort((p, q) => ORDER.indexOf(p.userData.id) - ORDER.indexOf(q.userData.id));
  const garden = new THREE.Group(); LG.add(garden);
  { const P = [], B = [], T = []; for (const gr of L.garden) flat(orient(gr), 0.06, P, B, T);
    const gm = new THREE.Mesh(geomFrom(P, B, T), greenM); const box = new THREE.Box3().setFromObject(gm); const c = box.getCenter(new THREE.Vector3());
    gm.position.set(-c.x, 0, -c.z); garden.position.set(c.x, 0, c.z); garden.add(gm); garden.scale.set(0.0001, 1, 0.0001); }
  const manG = (() => { const c = new THREE.CylinderGeometry(0.24, 0.24, 1.3, 10); c.translate(0, 0.65, 0); const h = new THREE.SphereGeometry(0.24, 10, 8); h.translate(0, 1.55, 0); return merge([c.toNonIndexed(), h.toNonIndexed()]); })();
  const PPL = new THREE.Group(); LG.add(PPL); let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const walkers = L.ppl.map(([x, z, dx, dz]) => { const m = new THREE.Mesh(manG, inkM); PPL.add(m); return { m, x, z, dx, dz, a: 2 + rnd() * 5, w: 0.25 + rnd() * 0.35, ph: rnd() * 6.28 }; });
  const walk = (t) => { for (const k of walkers) { const s = k.a * Math.sin(k.w * t + k.ph); k.m.position.set(k.x + k.dx * s, Math.abs(Math.sin(k.w * t * 6 + k.ph)) * 0.08, k.z + k.dz * s); } };
  // ríos: etiqueta en los dos polígonos de agua más grandes
  const wl = L.water.map(w => { const r = w[0]; return { a: Math.abs(area(r)), x: r.reduce((s, p) => s + p[0], 0) / r.length, z: r.reduce((s, p) => s + p[1], 0) / r.length }; }).sort((p, q) => q.a - p.a).slice(0, 2).sort((p, q) => p.x - q.x);
  scene.traverse(o => { o.frustumCulled = false; });
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u, fw = (t, a, b, f = 0.3) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
  const P2 = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
  window.shot = (o) => {
    ZC.visible = o.ctx ?? true;
    const zr = o.zebra ?? 1, pl = o.plinth ?? 1; for (const m of zebraBands) { m.visible = m.userData.k <= zr * (KMAX + 1) - 1 + 1e-6; if (m.userData.k === 0) { m.scale.y = Math.max(0.0001, pl); m.visible = m.visible && pl > 0.002; } }
    const gr = o.grow ?? A3.map(() => 1); A3.forEach((g, i) => { g.scale.y = Math.max(0.0005, gr[i] ?? 1); g.visible = (gr[i] ?? 1) > 0.04; });
    const rd = o.rdc ?? 0; for (const m of RDC) { m.scale.y = Math.max(0.0001, rd); m.visible = rd > 0.002; }
    const gd = o.garden ?? 0; garden.scale.set(Math.max(0.0001, gd), 1, Math.max(0.0001, gd)); garden.visible = gd > 0.002;
    PPL.visible = (o.ppl ?? 0) > 0.5; walk(o.t ?? 0);
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, t = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 9000; camera.position.set(t[0] + Math.sin(az) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); camera.lookAt(t[0], t[1], t[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    $('kicker').textContent = o.kick ?? '010'; $('title').textContent = o.title || ''; $('title').style.opacity = o.titleOp ?? (o.title ? 1 : 0); $('sub').style.opacity = 0;
    const svg = $('ov'); svg.innerHTML = '';
    for (const [txt, p, op0] of (o.labels || [])) { const q = P2(p); const half = txt.length * 9 + 30; const op = op0 * clamp(Math.min(q[0] - half, W - half - q[0], q[1] - 420, H - 460 - q[1]) / 60); if (op < 0.02) continue; svg.insertAdjacentHTML('beforeend', `<text class="maplab" x="${q[0]}" y="${q[1]}" text-anchor="middle" opacity="${op}">${txt}</text>`); }
    return true;
  };
  // ================= línea de tiempo (48 s) =================
  const K = [
    { t: 0.0, tg: [-165, 26, 125], z: 95, az: 225, el: 20 },
    { t: 3.0, tg: [-152, 18, 120], z: 74, az: 205, el: 16 },
    { t: 6.4, tg: [-150, 4, 104], z: 30, az: 190, el: 6 },
    { t: 9.6, tg: [-150, 10, 110], z: 70, az: 205, el: 22 },
    { t: 13.6, tg: [-150, 8, 108], z: 52, az: 190, el: 12 },
    { t: 17.4, tg: [-330, 0, 50], z: 300, az: 200, el: 65 },
    { t: 21.0, tg: [-160, 0, 135], z: 80, az: 200, el: 62 },
    { t: 22.8, tg: [-158, 0, 135], z: 76, az: 190, el: 64 },
    { t: 23.7, tg: [-100, 0, 700], z: 900, az: 186, el: 82 },
    { t: 24.6, tg: [0, 0, 1500], z: 1700, az: 184, el: 82 },
    { t: 26.4, tg: [OX, 0, OZ + 250], z: 1450, az: 182, el: 80 },
    { t: 29.8, tg: [OX, 0, OZ + 260], z: 1350, az: 170, el: 72 },
    { t: 33.0, tg: [OX + 5, 10, OZ + 5], z: 112, az: 95, el: 46 },
    { t: 36.0, tg: [OX + 5, 12, OZ + 5], z: 100, az: 118, el: 42 },
    { t: 39.6, tg: [OX + 6, 12, OZ], z: 104, az: 132, el: 38 },
    { t: 43.2, tg: [OX + 12, 11, OZ + 16], z: 58, az: 110, el: 28 },
    { t: 48.0, tg: [OX + 14, 10, OZ + 20], z: 42, az: 118, el: 22 } ];
  // Zaragoza: modificación del Plan General en el área G-44-2 (texto refundido, octubre de 2014), promovida por Zaragoza Alta Velocidad 2002:
  // suprime la superficie mínima obligatoria de usos distintos de vivienda por la escasa demanda y crea zonas privadas de ocio comunitario.
  const words = [[0.25, 3.1, '¿Hay alternativa a los bloques cebra?'], [3.5, 7.6, 'Así llega a la calle.'], [8.0, 11.6, 'El plan pedía bajos activos.'],
    [12.0, 15.8, 'La sociedad pública pidió quitarlo.'], [16.2, 19.6, 'Para vender mejor el suelo.'], [20.0, 23.2, 'A cambio, patio privado dentro.'],
    [26.8, 29.9, 'Sí: Lyon Confluence.'], [30.4, 34.8, 'Empresa pública, pliego por manzana.'], [35.4, 39.6, 'Bajos abiertos a la calle.'], [40.2, 43.8, 'Nueve edificios, seis arquitectos.']];
  const kick = (t) => t < 8.0 ? '010 · ZARAGOZA · AV. CIUDAD DE SORIA' : t < 12.0 ? '010 · ZARAGOZA · PLAN GENERAL, 2006' : t < 20.0 ? '010 · ZARAGOZA · MODIFICACIÓN, 2014' :
    t < 23.2 ? '010 · ZARAGOZA · ENTORNO DE DELICIAS' : t < 26.2 ? '010 · ZARAGOZA → LYON' : t < 40.0 ? '010 · LYON · CONFLUENCE' : '010 · LYON · ÎLOT A3';
  window.renderAt = (tt) => {
    let i = 1; while (i < K.length - 1 && K[i].t < tt) i++; const a = K[i - 1], b = K[i]; const u = smr(seg(tt, a.t, b.t));
    const plinth = tt < 8.2 ? 1 : tt < 12.4 ? 1 - smr(seg(tt, 8.2, 9.2)) : smr(seg(tt, 12.4, 13.6));   // el zócalo ciego se va mientras el plan exige locales y vuelve en 2014
    const grow = A3.map((g, j) => { const t0 = 30.4 + j * 0.4, dur = j === A3.length - 1 ? 2.2 : 1.6; return smr(seg(tt, t0, t0 + dur)); });
    let tw = '', to = 0; for (const [a0, b0, tx] of words) { const f = fw(tt, a0, b0, 0.22); if (f > 0) { tw = tx; to = f; } }
    const labels = [['AV. CIUDAD DE SORIA', [-175, 0, 70], 0.9 * fw(tt, 0.4, 7.6, 0.4)], ['ZARAGOZA', [-250, 0, 0], fw(tt, 23.4, 25.6, 0.3)], ['LYON', [OX, 0, OZ - 200], fw(tt, 23.8, 26.2, 0.3)],
      ['SAÔNE', [OX + wl[0].x, 0, OZ + wl[0].z], fw(tt, 26.6, 31.0, 0.4)], ['RHÔNE', [OX + wl[1].x, 0, OZ + wl[1].z], fw(tt, 26.6, 31.0, 0.4)],
      ['ÎLOT A3', [OX, 0, OZ - 30], fw(tt, 27.4, 32.0, 0.4)], ['COURS CHARLEMAGNE', [OX - 55, 0, OZ - 41], 0.85 * fw(tt, 34.0, 39.0, 0.4)]];
    return window.shot({ t: tt, tg: a.tg.map((v, j) => lerp(v, b.tg[j], u)), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), az: lerp(a.az, b.az, u), el: lerp(a.el, b.el, u),
      zebra: 1, plinth, grow, rdc: smr(seg(tt, 35.4, 37.4)), garden: smr(seg(tt, 35.8, 37.2)), ppl: tt > 36.0 ? 1 : 0, labels, title: tw, titleOp: to, kick: kick(tt) });
  };
  window.renderCover = () => { document.body.classList.add('cover');
    return window.shot({ t: 0, tg: [-160, 64, 128], z: 112, az: 225, el: 20, zebra: 1, ctx: false, kick: '', title: '' }); };
  window.READY = true;
}
