// 023 · El chaflán de Cerdà · Ensanche de Barcelona (1859). Edificios y calles: OpenStreetMap (v023.json, lo prepara motor/scripts/v023_build.py).
// Retícula ideal ajustada a las calles reales: manzanas de 113,3 m, calles de 20 m y chaflanes a 45°. Idea de Cerdà y alturas: esquema.
import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, makeInkPass, prism } from './lib.js';
const $ = (id) => document.getElementById(id);
const INK = '#1A1B20', RED = '#E2401C', PINK = '#F0B8A4', D2R = Math.PI / 180;
const EN = new URLSearchParams(location.search).get('lang') === 'en';
const TX = (es, en) => EN ? en : es;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ss = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, u) => a + (b - a) * u;
const mk = () => ({ P: [], B: [], T: [] });
const mesh = (A, M) => { const m = new THREE.Mesh(geomFrom(A.P, A.B, A.T), M); m.frustumCulled = false; return m; };
function extrudeH(A, ring, holes, h, y0 = 0) {
  const all = [ring, ...holes];
  for (const r of all) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; A.P.push(a[0], y0, a[1], a[0], h, a[1], b[0], h, b[1], a[0], y0, a[1], b[0], h, b[1], b[0], y0, b[1]); for (let k = 0; k < 6; k++) { A.B.push(0); A.T.push(h); } }
  const v2 = (r) => r.map(p => new THREE.Vector2(p[0], p[1])); let f; try { f = THREE.ShapeUtils.triangulateShape(v2(ring), holes.map(v2)); } catch (e) { return; } const pts = all.flat();
  for (const q of f) { const p = q.map(i => [pts[i][0], h, pts[i][1]]); const ny = (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) - (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]); const o = ny >= 0 ? [0, 1, 2] : [0, 2, 1]; for (const k of o) { A.P.push(...p[k]); A.B.push(0); A.T.push(h); } }
}
function flat(A, r, y) { let f; try { f = THREE.ShapeUtils.triangulateShape(r.map(p => new THREE.Vector2(p[0], p[1])), []); } catch (e) { return; } for (const q of f) { const p = q.map(i => [r[i][0], y, r[i][1]]); const ny = (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) - (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]); const o = ny >= 0 ? [0, 1, 2] : [0, 2, 1]; for (const k of o) { A.P.push(...p[k]); A.B.push(0); A.T.push(y); } } }
export async function init() {
  await Promise.all([document.fonts.load("24px SM"), document.fonts.load("700 44px SG")]);
  const D = await fetch('v023.json').then(r => r.json());
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 40000);
  const solid = (c, o = {}) => fillMat(c, { hatch: 0, side: o.side ?? 0.94, shade: o.shade ?? 0.84, double: true, poche: RED, roof: o.roof });
  const bldM = fillMat('#F6F5F1', { hatch: 0, side: 0.95, shade: 0.88, roof: '#EFDCD0', windows: 0.35 });
  const redM = fillMat(RED, { hatch: 0, side: 0.92, shade: 0.82, roof: '#D23A18', windows: 0.25 });
  const greenM = solid('#DDE6D2', { side: 1, shade: 1 }), redFlat = solid(RED, { side: 1, shade: 1 }), pinkFlat = solid(PINK, { side: 1, shade: 1 });
  const G = {}; const grp = (n) => { const g = new THREE.Group(); scene.add(g); G[n] = g; return g; };
  const addL = (g, pos, mat, ro = 3) => { const l = segs(pos, mat, ro); l.frustumCulled = false; g.add(l); return l; };
  const build = (name, list, M) => { const A = mk(), Eg = []; for (const b of list) { if (b.holes) { extrudeH(A, b.r, b.holes, b.h); continue; } prism(b.r, 0, b.h, 2.2, A.P, A.B, A.T, Eg, {}); } grp(name).add(mesh(A, M)); };
  build('ctx', D.ctx, bldM); build('mz', D.mz, bldM); build('mzR', D.mz, redM);
  { grp('suelo'); const R = []; for (const r of D.roads) for (let i = 0; i + 1 < r.length; i++) R.push(r[i][0], 0.05, r[i][1], r[i + 1][0], 0.05, r[i + 1][1]); addL(G.suelo, R, lineMat('#DDD9CF', 1.4), 1);
    const Gr = mk(); for (const r of D.green) flat(Gr, r, 0.1); const gm = mesh(Gr, greenM); gm.userData.noInk = true; G.suelo.add(gm); }
  { grp('interior'); const A = mk(); for (const it of D.interior) flat(A, it.r, 0.3); const m = mesh(A, greenM); m.userData.noInk = true; G.interior.add(m);
    const L = []; for (const it of D.interior) { const r = it.r; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; L.push(a[0], 0.4, a[1], b[0], 0.4, b[1]); } } addL(G.interior, L, lineMat(RED, 3, { depthTest: false }), 6); }
  { grp('interiorR'); const A = mk(); for (const it of D.interior) flat(A, it.r, 0.3); const m = mesh(A, redFlat); m.userData.noInk = true; G.interiorR.add(m); }
  { grp('plazasP'); const A = mk(); for (const c of D.cruces) flat(A, c.o, 0.25); const m = mesh(A, pinkFlat); m.userData.noInk = true; G.plazasP.add(m); }
  { grp('plazas'); const A = mk(); for (const c of D.cruces) flat(A, c.o, 0.25); const m = mesh(A, redFlat); m.userData.noInk = true; G.plazas.add(m); }
  { grp('reticula'); const L = []; for (const b of D.blocks) { const r = b.o; for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length]; L.push(a[0], 0.3, a[1], c[0], 0.3, c[1]); } } addL(G.reticula, L, lineMat(INK, 2.2)); }
  // manzana central: la idea de Cerdà (dos bloques paralelos de 16 m y jardín) en coordenadas de la retícula
  const th = D.th, cu = Math.cos(th), su = Math.sin(th), BC = D.bc, toXZ = (u, v) => [u * cu - v * su, u * su + v * cu];
  const bq = (u0, v0, u1, v1) => [toXZ(BC.uv[0] + u0, BC.uv[1] + v0), toXZ(BC.uv[0] + u1, BC.uv[1] + v0), toXZ(BC.uv[0] + u1, BC.uv[1] + v1), toXZ(BC.uv[0] + u0, BC.uv[1] + v1)];
  const h2 = D.S / 2, c2 = D.CH;
  { const A = mk(); extrudeH(A, bq(-h2 + c2, -h2, h2 - c2, -h2 + 20), [], 16); extrudeH(A, bq(-h2 + c2, h2 - 20, h2 - c2, h2), [], 16); grp('idea').add(mesh(A, redM));
    const Gd = mk(); flat(Gd, bq(-h2 + 4, -h2 + 24, h2 - 4, h2 - 24), 0.3); const gm = mesh(Gd, greenM); gm.userData.noInk = true; G.idea.add(gm); }
  { grp('mzO'); const L = [], r = BC.o; for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length]; L.push(a[0], 0.35, a[1], c[0], 0.35, c[1]); } addL(G.mzO, L, lineMat(INK, 2.6, { depthTest: false }), 6); }
  const ink = makeInkPass(renderer, W, H);
  const proj = (p) => { const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
  function cam(tg, az, el, z, dy = 160) {
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z; const d = 20000; az *= D2R; el *= D2R;
    camera.position.set(tg[0] + Math.sin(az) * Math.cos(el) * d, tg[1] + Math.sin(el) * d, tg[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); if (el > 89) camera.up.set(-Math.sin(az), 0, -Math.cos(az)); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateMatrixWorld();
    camera.position.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1), dy * 2 * z / H);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
  }
  const svg = $('ov'); let SV = '';
  const text = (x, y, s, cls = 'lab', anchor = 'middle', op = 1) => { if (op > 0.01) SV += `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" opacity="${op.toFixed(2)}">${s}</text>`; };
  const line = (a, b, col, w, dash, op) => { if (op > 0.01) SV += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} opacity="${op.toFixed(2)}"/>`; };
  const show = (...n) => { for (const k of Object.keys(G)) if (G[k].isGroup) G[k].visible = n.includes(k); };
  const AZ = 45 - th / D2R;                                    // vista en diagonal a la retícula
  const C0 = [BC.c[0], 0, BC.c[1]];
  const cr = D.cruces.reduce((m, c) => Math.hypot(c.c[0] - BC.c[0], c.c[1] - BC.c[1]) < Math.hypot(m.c[0] - BC.c[0], m.c[1] - BC.c[1]) ? c : m, D.cruces[0]);
  const CR = [cr.c[0], 0, cr.c[1]], uvX = (u, v) => { const p = toXZ(u, v); return [p[0], 0, p[1]]; };
  const crUV = [cr.c[0] * cu + cr.c[1] * su, -cr.c[0] * su + cr.c[1] * cu];
  const tor = D.interior.find(i => /torre de les aig/i.test(i.n)) || D.interior.find(i => /^jardins/i.test(i.n)) || D.interior[0];
  const torC = tor ? tor.r.reduce((a, p) => [a[0] + p[0] / tor.r.length, a[1] + p[1] / tor.r.length], [0, 0]) : BC.c;
  const SC = [
    [0, 4.5, (u) => { show('ctx', 'mz', 'suelo', 'plazas'); const k = ss(u); cam(C0, AZ + lerp(-6, 4, k), lerp(42, 36, k), lerp(330, 270, k)); }],
    [4.5, 9, (u) => { show('ctx', 'mz', 'suelo', 'plazasP'); cam(CR, AZ - 45, 89.9, 80, 260);
      const e = ss((u - 0.05) / 0.35), A0 = proj(uvX(crUV[0] - 75, crUV[1] + 5)), A1 = proj(uvX(crUV[0] - 30, crUV[1] + 5)), B0 = proj(uvX(crUV[0] - 5, crUV[1] - 75)), B1 = proj(uvX(crUV[0] - 5, crUV[1] - 30));
      const pa = [lerp(A0[0], A1[0], e), lerp(A0[1], A1[1], e)], pb = [lerp(B0[0], B1[0], e), lerp(B0[1], B1[1], e)];
      line(A0, pa, INK, 7, '', 1); line(B0, pb, INK, 7, '', 1); SV += `<circle cx="${pa[0].toFixed(1)}" cy="${pa[1].toFixed(1)}" r="14" fill="${INK}"/><circle cx="${pb[0].toFixed(1)}" cy="${pb[1].toFixed(1)}" r="14" fill="${INK}"/>`;
      line(pa, pb, RED, 5, '16 12', ss((u - 0.38) / 0.12)); text(540, 1580, TX('CHAFLÁN A 45° · EL CRUCE SE VE ANTES', '45° CHAMFER · YOU SEE THE CROSSING EARLIER'), 'labr', 'middle', ss((u - 0.5) / 0.2)); }],
    [9, 13.5, (u) => { show('reticula', 'suelo'); cam(C0, AZ - 45, 89.9, lerp(300, 260, ss(u)), 140); const p = BC.o, a = proj([p[2][0], 0.3, p[2][1]]), b = proj([p[5][0], 0.3, p[5][1]]);
      text(540, 1580, TX('MANZANAS DE 113 m · CALLES DE 20 m', '113 m BLOCKS · 20 m STREETS'), 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [13.5, 18, (u) => { show('ctx', 'mz', 'suelo', 'plazas'); const k = ss(u); cam(CR, AZ + lerp(10, 25, k), lerp(55, 45, k), lerp(90, 120, k), 120); text(540, 1580, TX('UNA PLAZA EN CADA CRUCE', 'A SQUARE AT EVERY CROSSING'), 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [18, 22.5, (u) => { show('ctx', 'idea', 'suelo', 'mzO'); const k = ss(u); cam(C0, AZ + lerp(20, 32, k), 38, lerp(130, 115, k), 130); text(540, 1580, TX('DOS BLOQUES DE 16 m Y UN JARDÍN · ESQUEMA', 'TWO 16 m BLOCKS AND A GARDEN · SCHEMATIC'), 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [22.5, 27, (u) => { show('ctx', 'mzR', 'suelo'); const k = ss(u); cam(C0, AZ + lerp(32, 44, k), 40, lerp(115, 125, k), 130); text(540, 1580, TX('LA MANZANA HOY', 'THE BLOCK TODAY'), 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [27, 31.5, (u) => { show('ctx', 'mz', 'suelo', 'interiorR'); cam(C0, AZ - 45, 89.9, lerp(560, 500, ss(u)), 140); text(540, 1600, TX('EN ROJO, INTERIORES AJARDINADOS SEGÚN OPENSTREETMAP', 'IN RED, GARDEN COURTYARDS FROM OPENSTREETMAP'), 'labs', 'middle', ss((u - 0.2) / 0.2)); text(540, 1560, TX('423 MANZANAS · 86 CON INTERIOR LIBRE · AYUNTAMIENTO, 2020', '423 BLOCKS · 86 WITH OPEN COURTYARDS · CITY COUNCIL, 2020'), 'labr', 'middle', ss((u - 0.3) / 0.2)); }],
    [31.5, 36, (u) => { show('ctx', 'mz', 'suelo', 'interior'); const k = ss(u); cam([torC[0], 0, torC[1]], AZ + lerp(0, 14, k), lerp(50, 42, k), lerp(120, 100, k), 130); if (tor && tor.n) text(540, 1580, tor.n.toUpperCase(), 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [36, 40.5, (u) => { show('ctx', 'mz', 'suelo', 'plazas', 'interior'); const k = ss(u); cam(C0, AZ + lerp(4, 14, k), lerp(36, 46, k), lerp(270, 480, k)); }],
  ];
  const END = SC[SC.length - 1][1];
  window.renderAt = (t) => { t = clamp(t, 0, END - 1e-4); SV = ''; for (const [a, b, fn] of SC) if (t >= a && t < b) { fn((t - a) / (b - a), t); break; } svg.innerHTML = SV; ink.render(scene, camera); };
  window.READY = true;
}
