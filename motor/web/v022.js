// 022 · Karl-Marx-Hof (Karl Ehn, 1927–1930), Heiligenstadt, Viena · la vivienda municipal de la Viena Roja.
// Planta del Hof y entorno: OpenStreetMap (v022.json, lo prepara motor/scripts/v022_build.py). Altura del Hof aproximada; usos de los patios, esquema.
import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, makeInkPass, prism } from './lib.js';
const $ = (id) => document.getElementById(id);
const INK = '#1A1B20', RED = '#E2401C', PINK = '#F0B8A4', D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ss = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, u) => a + (b - a) * u;
const mk = (t = 0) => ({ P: [], B: [], T: [], t });
const mesh = (A, M) => { const m = new THREE.Mesh(geomFrom(A.P, A.B, A.T), M); m.frustumCulled = false; return m; };
function extrudeH(A, ring, holes, h) {   // edificio con patios: muros y cubierta plana
  const all = [ring, ...holes];
  for (const r of all) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; A.P.push(a[0], 0, a[1], a[0], h, a[1], b[0], h, b[1], a[0], 0, a[1], b[0], h, b[1], b[0], 0, b[1]); for (let k = 0; k < 6; k++) { A.B.push(0); A.T.push(h); } }
  const v2 = (r) => r.map(p => new THREE.Vector2(p[0], p[1])); let f; try { f = THREE.ShapeUtils.triangulateShape(v2(ring), holes.map(v2)); } catch (e) { return; } const pts = all.flat();
  for (const q of f) { const p = q.map(i => [pts[i][0], h, pts[i][1]]); const ny = (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) - (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]); const o = ny >= 0 ? [0, 1, 2] : [0, 2, 1]; for (const k of o) { A.P.push(...p[k]); A.B.push(0); A.T.push(h); } }
}
function flat(A, r, y) { let f; try { f = THREE.ShapeUtils.triangulateShape(r.map(p => new THREE.Vector2(p[0], p[1])), []); } catch (e) { return; } for (const q of f) { const p = q.map(i => [r[i][0], y, r[i][1]]); const ny = (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) - (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]); const o = ny >= 0 ? [0, 1, 2] : [0, 2, 1]; for (const k of o) { A.P.push(...p[k]); A.B.push(0); A.T.push(y); } } }
export async function init() {
  await Promise.all([document.fonts.load("24px SM"), document.fonts.load("700 44px SG")]);
  const D = await fetch('v022.json').then(r => r.json());
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 40000);
  const solid = (c, o = {}) => fillMat(c, { hatch: 0, side: o.side ?? 0.94, shade: o.shade ?? 0.84, double: true, poche: RED, roof: o.roof });
  const bldM = fillMat('#F6F5F1', { hatch: 0, side: 0.95, shade: 0.88, roof: '#EFDCD0', windows: 0.35 });
  const hofRed = fillMat(RED, { hatch: 0, side: 0.92, shade: 0.82, roof: '#D23A18', windows: 0.25 }), hofW = fillMat('#F6F5F1', { hatch: 0, side: 0.95, shade: 0.86, roof: PINK, windows: 0.35 });
  const greenM = solid('#DDE6D2', { side: 1, shade: 1 }), waterM = solid('#DCE6EA', { side: 1, shade: 1 });
  const G = {}; const grp = (n) => { const g = new THREE.Group(); scene.add(g); G[n] = g; return g; };
  const addL = (g, pos, mat, ro = 3) => { const l = segs(pos, mat, ro); l.frustumCulled = false; g.add(l); return l; };
  { grp('ctx'); const A = mk(), Eg = []; for (const b of D.ctx) { if (b.holes) { extrudeH(A, b.r, b.holes, b.h); continue; } prism(b.r, 0, b.h, 2.2, A.P, A.B, A.T, Eg, {}); } G.ctx.add(mesh(A, bldM));
    const R = []; for (const r of D.roads) for (let i = 0; i + 1 < r.length; i++) R.push(r[i][0], 0.05, r[i][1], r[i + 1][0], 0.05, r[i + 1][1]); addL(G.ctx, R, lineMat('#DDD9CF', 1.4), 1);
    const T = []; for (const r of D.rails) for (let i = 0; i + 1 < r.length; i++) T.push(r[i][0], 0.06, r[i][1], r[i + 1][0], 0.06, r[i + 1][1]); addL(G.ctx, T, lineMat('#B8B3A8', 1.2), 1);
    const Gr = mk(0.1); for (const r of D.green) flat(Gr, r, 0.1); const gm = mesh(Gr, greenM); gm.userData.noInk = true; G.ctx.add(gm);
    const Wt = mk(0.08); for (const r of D.water) flat(Wt, r, 0.08); const wm = mesh(Wt, waterM); wm.userData.noInk = true; G.ctx.add(wm); }
  { grp('hofR'); const A = mk(18); for (const b of D.hof) extrudeH(A, b.r, b.holes || [], b.h); G.hofR.add(mesh(A, hofRed)); }
  { grp('hofW'); const A = mk(18); for (const b of D.hof) extrudeH(A, b.r, b.holes || [], b.h); G.hofW.add(mesh(A, hofW)); }
  // patios (zonas verdes del Hof): los huecos interiores del edificio, en verde
  { grp('patios'); const A = mk(0.2); for (const b of D.hof) for (const h of b.holes || []) flat(A, h, 0.2); const m = mesh(A, greenM); m.userData.noInk = true; G.patios.add(m); }
  // solar: envolvente del conjunto (rectángulo orientado sobre el eje del edificio), a trazos
  const E = D.eje, U = E.u, V = [-U[1], U[0]], pt = (u, v) => [E.c[0] + U[0] * u + V[0] * v, E.c[1] + U[1] * u + V[1] * v];
  const pv = D.hof.flatMap(b => b.r).map(p => (p[0] - E.c[0]) * V[0] + (p[1] - E.c[1]) * V[1]), v0 = Math.min(...pv) - 12, v1 = Math.max(...pv) + 12;
  { grp('solar'); const C4 = [pt(E.u0 - 8, v0), pt(E.u1 + 8, v0), pt(E.u1 + 8, v1), pt(E.u0 - 8, v1)], L = [];
    for (let i = 0; i < 4; i++) { const a = C4[i], b = C4[(i + 1) % 4], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10); for (let k = 0; k < n; k += 2) L.push(lerp(a[0], b[0], k / n), 0.3, lerp(a[1], b[1], k / n), lerp(a[0], b[0], (k + 1) / n), 0.3, lerp(a[1], b[1], (k + 1) / n)); }
    addL(G.solar, L, lineMat(INK, 2.6)); }
  { grp('cota'); const a = pt(E.u0, v0 - 25), b = pt(E.u1, v0 - 25); addL(G.cota, [a[0], 1, a[1], b[0], 1, b[1]], lineMat(RED, 4, { depthTest: false }), 6); G.cotaP = [a, b]; }
  { grp('ring'); const A = mk(), Eg = []; for (const b of D.ring || []) { if (b.holes) { extrudeH(A, b.r, b.holes, b.h); continue; } prism(b.r, 0, b.h, 2.2, A.P, A.B, A.T, Eg, {}); } G.ring.add(mesh(A, bldM));
    const R = []; for (const r of D.ringRoads || []) for (let i = 0; i + 1 < r.length; i++) R.push(r[i][0], 0.05, r[i][1], r[i + 1][0], 0.05, r[i + 1][1]); addL(G.ring, R, lineMat('#DDD9CF', 1.4), 1); }
  const HZ = D.hansen || { c: [0, 3990], u: [1, 0] }, HU = HZ.u, HV = [-HU[1], HU[0]], hp = (u, v) => [HZ.c[0] + HU[0] * (u - 50) + HV[0] * (v - 25), HZ.c[1] + HU[1] * (u - 50) + HV[1] * (v - 25)];
  const HH = 24, rect = (u0, v0, u1, v1) => [hp(u0, v0), hp(u1, v0), hp(u1, v1), hp(u0, v1)];
  const courts8 = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) courts8.push(rect(i * 25 + 7.5, j * 25 + 7.5, i * 25 + 17.5, j * 25 + 17.5));
  const courts3 = [rect(7.5, 15, 17.5, 35), rect(40, 15, 60, 35), rect(82.5, 15, 92.5, 35)];
  const H8 = mk(HH); extrudeH(H8, rect(0, 0, 100, 50), courts8, HH); grp('hansen8').add(mesh(H8, hofRed));
  const H3 = mk(HH); extrudeH(H3, rect(0, 0, 100, 50), courts3, HH); grp('hansen3').add(mesh(H3, hofRed));
  { grp('hgrid'); const L = []; for (let i = 1; i < 4; i++) { const a = hp(i * 25, 0), b = hp(i * 25, 50); L.push(a[0], HH + 0.3, a[1], b[0], HH + 0.3, b[1]); } { const a = hp(0, 25), b = hp(100, 25); L.push(a[0], HH + 0.3, a[1], b[0], HH + 0.3, b[1]); } addL(G.hgrid, L, lineMat(INK, 2.4)); }
  { grp('hfac'); const L = []; for (let i = 0; i <= 4; i++) { const a = hp(i * 25, -0.3); L.push(a[0], 0, a[1], a[0], HH, a[1]); } const a = hp(0, -0.3), b = hp(100, -0.3); L.push(a[0], HH, a[1], b[0], HH, b[1], a[0], 0.2, a[1], b[0], 0.2, b[1]); addL(G.hfac, L, lineMat(INK, 3, { depthTest: false }), 6); }
  // el Palais Hansen a la misma escala, junto a la planta del Hof (para la herencia)
  const E0 = D.eje, UU = E0.u, VV = [-UU[1], UU[0]], ghostAt = [E0.c[0] + UU[0] * (E0.u0 + 140) + VV[0] * -150, E0.c[1] + UU[1] * (E0.u0 + 140) + VV[1] * -150];
  { grp('hghost'); const A = mk(HH); const rr = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => [ghostAt[0] + UU[0] * (u - 50) + VV[0] * (v - 25), ghostAt[1] + UU[1] * (u - 50) + VV[1] * (v - 25)]);
    extrudeH(A, rr(0, 0, 100, 50), [rr(7.5, 15, 17.5, 35), rr(40, 15, 60, 35), rr(82.5, 15, 92.5, 35)], 1.0); G.hghost.add(mesh(A, hofRed)); G.ghostAt = ghostAt; }
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
  const text = (x, y, s, cls = 'lab', anchor = 'start', op = 1) => { if (op > 0.01) SV += `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" opacity="${op.toFixed(2)}">${s}</text>`; };
  const sq = (x, y, s, fill, op) => { if (op > 0.01) SV += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${s}" height="${s}" fill="${fill}" stroke="${INK}" stroke-width="0.8" opacity="${op.toFixed(2)}"/>`; };
  const puff = (x, y, r, op) => { if (op > 0.01) SV += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#D9D5CB" stroke="${INK}" stroke-width="1.2" opacity="${op.toFixed(2)}"/>`; };
  const show = (...n) => { for (const k of Object.keys(G)) if (G[k].isGroup) G[k].visible = n.includes(k); };
  const AZ = Math.atan2(U[0], U[1]) / D2R;                // mirar a lo largo del edificio, desde su extremo sur
  const TG = [E.c[0], 8, E.c[1]];
  const grid = (u, n, cols, x0, y0, s, fill, delay) => { for (let i = 0; i < n; i++) sq(x0 + (i % cols) * (s + 4), y0 + Math.floor(i / cols) * (s + 4), s, fill, ss((u - delay - i * 0.0025) / 0.05)); };
  const HT = [HZ.c[0], 10, HZ.c[1]], AZH = Math.atan2(HV[0], HV[1]) / D2R;   // frente del Palais Hansen (lado v<0, el Schottenring)
  const SC = [
    [0, 4.5, (u) => { show('ring', 'hansen3', 'hfac'); const k = ss(u); cam(HT, AZH + 180 + lerp(-30, -18, k), lerp(34, 28, k), lerp(240, 160, k), 180); }],
    [4.5, 9, (u) => { show('ring', 'hansen3'); const k = ss(u); cam(HT, AZH + 180 + lerp(-18, 10, k), lerp(28, 36, k), lerp(160, 200, k), 180); text(540, 1580, TX('RINGSTRASSE · SCHOTTENRING', 'RINGSTRASSE · SCHOTTENRING'), 'labs', 'middle', 1); }],
    [9, 13.5, (u) => { show('ring', 'hansen8', 'hgrid'); cam([HZ.c[0], 0, HZ.c[1]], AZH + 180, 89.9, lerp(110, 90, ss(u)), 110); text(540, 1580, TX('8 MÓDULOS DE 25 × 25 m · PATIOS DE 10 × 10 m', '8 MODULES OF 25 × 25 m · 10 × 10 m COURTYARDS'), 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [13.5, 18, (u) => { const m = ss((u - 0.15) / 0.3); show('ring', m < 0.5 ? 'hansen8' : 'hansen3', 'hgrid', 'hfac'); cam(HT, AZH + 180 + lerp(-20, -32, ss(u)), 40, 95, 150); text(540, 1580, TX('PATIOS DE 200 + 400 + 200 m² · UNA FACHADA', '200 + 400 + 200 m² COURTYARDS · ONE FAÇADE'), 'labr', 'middle', ss((u - 0.45) / 0.2)); }],
    [18, 22.5, (u) => { show('ctx', 'hofW', 'patios'); cam(TG, AZ + 180 + 6, 26, 360); grid(u, 25, 10, 120, 1180, 30, PINK, 0.05); grid(u, 35, 10, 120, 1180 + 3 * 34, 30, RED, 0.3); text(120, 1156, '1923 · 25.000', 'lab', 'start', ss((u - 0.05) / 0.1)); text(120, 1180 + 7 * 34 + 30, TX('1927 · 35.000 · CADA CUADRO, 1.000 VIVIENDAS', '1927 · 35,000 · EACH SQUARE, 1,000 HOMES'), 'labr', 'start', ss((u - 0.3) / 0.1)); }],
    [22.5, 27, (u) => { show('ctx', 'hofR', 'patios', 'cota'); const k = ss(u); cam(TG, AZ + 90 + lerp(-20, -12, k), lerp(28, 24, k), 560, 200); const [a, b] = G.cotaP, pa = proj([a[0], 1, a[1]]), pb = proj([b[0], 1, b[1]]), mm = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2]; text(mm[0], mm[1] + 54, String(Math.round(E.u1 - E.u0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' m', 'dim', 'middle', ss((u - 0.2) / 0.2)); }],
    [27, 31.5, (u) => { show('ctx', 'hofR', 'patios', 'solar'); cam([E.c[0], 0, E.c[1]], AZ + 180, 89.9, lerp(600, 540, ss(u)), 140); text(540, 1620, TX('SOLAR 156.027 m² · CONSTRUIDO 28.751 m² · 18 %', 'SITE 156,027 m² · BUILT 28,751 m² · 18%'), 'labr', 'middle', ss((u - 0.25) / 0.2)); text(540, 1660, TX('DATOS DE 1932', 'FIGURES FROM 1932'), 'labs', 'middle', ss((u - 0.25) / 0.2)); }],
    [31.5, 36.5, (u) => { show('ctx', 'hofR', 'patios', 'hghost'); cam([E.c[0] + UU[0] * -320, 0, E.c[1] + UU[1] * -320], AZ + 180, 89.9, 330, 110); const g = G.ghostAt, p = proj([g[0], 1, g[1]]); text(p[0], p[1] - 70, TX('PALAIS HANSEN, A LA MISMA ESCALA', 'PALAIS HANSEN, SAME SCALE'), 'labr', 'middle', ss((u - 0.15) / 0.2)); text(540, 1640, TX('TESIS DE CARMEN DÍEZ MEDINA (2015)', 'CARMEN DÍEZ MEDINA’S THESIS (2015)'), 'labs', 'middle', 1); }],
    [36.5, 41, (u) => { show('ctx', 'ring', 'hofR', 'hansen3'); const k = ss(u), mid = [(E.c[0] + HZ.c[0]) / 2, 0, (E.c[1] + HZ.c[1]) / 2]; cam(mid, 0, 89.9, lerp(2700, 3000, k), 260); const a = proj([E.c[0], 0, E.c[1]]), b = proj([HZ.c[0], 0, HZ.c[1]]); SV += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${RED}" stroke-width="3" stroke-dasharray="12 10" opacity="${ss((u - 0.1) / 0.2)}"/>`; text(b[0] + 24, b[1] + 8, TX('VIENA AZUL · 1869', 'BLUE VIENNA · 1869'), 'lab', 'start', ss((u - 0.2) / 0.2)); text(a[0] + 24, a[1] + 8, TX('VIENA ROJA · 1927', 'RED VIENNA · 1927'), 'labr', 'start', ss((u - 0.3) / 0.2)); }],
    [41, 45.5, (u) => { show('ctx', 'hofW', 'patios'); cam(TG, AZ + 180 + 30, 30, 300, 150); const n = 16; for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, uu = lerp(E.u0 + 60, E.u1 - 60, t), p = proj([E.c[0] + U[0] * uu + V[0] * (v0 + 14), 10, E.c[1] + U[1] * uu + V[1] * (v0 + 14)]), e = ss((u - 0.1 - 0.03 * i) / 0.2); puff(p[0], p[1] - 20 * e, 10 + 26 * e, 0.85 * e * (1 - ss((u - 0.8) / 0.2))); if (e > 0.3) SV += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="7" fill="${RED}"/>`; } text(540, 1580, TX('FEBRERO DE 1934', 'FEBRUARY 1934'), 'labr', 'middle', ss((u - 0.15) / 0.15)); }],
    [45.5, 50.5, (u) => { show('ctx', 'hofW', 'patios'); cam(TG, AZ + 180 + 44, 34, 380); grid(u, 220, 20, 96, 1080, 38, RED, 0.02); grid(u, 200, 20, 96, 1080 + 11 * 42 + 20, 38, PINK, 0.3); text(96, 1060, TX('220.000 PISOS MUNICIPALES', '220,000 MUNICIPAL FLATS'), 'labr', 'start', ss((u - 0.02) / 0.1)); text(96, 1080 + 11 * 42 + 20 + 10 * 42 + 40, TX('200.000 DE COOPERATIVAS SUBVENCIONADAS · CADA CUADRO, 1.000', '200,000 SUBSIDISED CO-OP FLATS · EACH SQUARE, 1,000'), 'lab', 'start', ss((u - 0.35) / 0.1)); }],
    [50.5, 55, (u) => { show('ctx', 'hofR', 'patios'); const k = ss(u); cam(TG, AZ + 180 + lerp(-8, -20, k), lerp(30, 40, k), lerp(380, 640, k)); }],
  ];
  const END = SC[SC.length - 1][1];
  window.renderAt = (t) => { t = clamp(t, 0, END - 1e-4); SV = ''; for (const [a, b, fn] of SC) if (t >= a && t < b) { fn((t - a) / (b - a), t); break; } svg.innerHTML = SV; ink.render(scene, camera); };
  window.READY = true;
}
const EN = new URLSearchParams(location.search).get('lang') === 'en';
function TX(es, en) { return EN ? en : es; }
