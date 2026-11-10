// 020 · Mercado de Olavide (Francisco Javier Ferrero, 1931–1934; volado el 2 de noviembre de 1974), plaza de Olavide, Chamberí, Madrid.
// Mercado: volumetría a partir de los planos publicados (planta superior e inferior y alzado, 1931) y de las fotos; medidas aproximadas.
// Entorno: OpenStreetMap actual (v020.json, lo prepara motor/scripts/v020_build.py). Marco: x este, z sur, y metros sobre la calle.
import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, makeInkPass, prism } from './lib.js';
const $ = (id) => document.getElementById(id);
const INK = '#1A1B20', RED = '#E2401C', PINK = '#F0B8A4', POCHE = '#2A2B30', D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ss = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, u) => a + (b - a) * u, lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const C8 = Math.cos(Math.PI / 8), RA = (a) => a / C8;      // radio de vértice a partir de la apotema
let ROT = 0;
const ang = (k) => ROT + Math.PI / 8 + k * Math.PI / 4;
const corner = (r, y, k) => [r * Math.cos(ang(k)), y, r * Math.sin(ang(k))];
const mk = (t = 0) => ({ P: [], B: [], T: [], t });
function tri(A, a, b, c, hint) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  if ((uy * vz - uz * vy) * hint[0] + (uz * vx - ux * vz) * hint[1] + (ux * vy - uy * vx) * hint[2] < 0) { const t = b; b = c; c = t; }
  A.P.push(...a, ...b, ...c); A.B.push(0, 0, 0); A.T.push(A.t, A.t, A.t);
}
const quad = (A, a, b, c, d, hint) => { tri(A, a, b, c, hint); tri(A, a, c, d, hint); };
const mesh = (A, M) => { const m = new THREE.Mesh(geomFrom(A.P, A.B, A.T), M); m.frustumCulled = false; return m; };
function octRing(A, r0, r1, y0, y1, outerOnly = false) {   // anillo octogonal entre radios de vértice r0 < r1
  for (let k = 0; k < 8; k++) { const am = ang(k) + Math.PI / 8, out = [Math.cos(am), 0, Math.sin(am)];
    const a = corner(r1, y0, k), b = corner(r1, y0, k + 1), c = corner(r1, y1, k + 1), d = corner(r1, y1, k), e = corner(r0, y0, k), f = corner(r0, y0, k + 1), g = corner(r0, y1, k + 1), h = corner(r0, y1, k);
    quad(A, a, b, c, d, out); if (r0 > 0.01 && !outerOnly) quad(A, e, f, g, h, [-out[0], 0, -out[2]]); quad(A, d, c, g, h, [0, 1, 0]); quad(A, a, b, f, e, [0, -1, 0]); }
}
const box = (A, x0, x1, y0, y1, z0, z1) => { const P = (x, y, z) => [x, y, z];
  quad(A, P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), [0, 0, 1]); quad(A, P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), [0, 0, -1]);
  quad(A, P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), [1, 0, 0]); quad(A, P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), [-1, 0, 0]);
  quad(A, P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1), [0, 1, 0]); quad(A, P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), [0, -1, 0]); };
const octLine = (r, y) => { const L = []; for (let k = 0; k < 8; k++) L.push(...corner(r, y, k), ...corner(r, y, k + 1)); return L; };

export async function init() {
  await Promise.all([document.fonts.load("24px SM"), document.fonts.load("700 44px SG")]);
  const D = await fetch('v020.json').then(r => r.json()); ROT = D.rot * D2R;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
  const solid = (c, o = {}) => fillMat(c, { hatch: 0, side: o.side ?? 0.94, shade: o.shade ?? 0.84, double: true, poche: RED, roof: o.roof });
  const stoneM = solid('#F6F5F1'), glassM = solid('#DCE3E6', { side: 0.97, shade: 0.9 }), redM = solid(RED, { side: 1, shade: 0.9 }), pinkM = solid(PINK, { side: 0.96, shade: 0.9 });
  const pocheM = fillMat(RED, { hatch: 0, side: 1, shade: 1, top: 1, double: true, poche: RED }), greenM = solid('#DDE6D2', { side: 1, shade: 1 });
  const bldM = fillMat('#F6F5F1', { hatch: 0, side: 0.95, shade: 0.88, roof: '#EFDCD0', windows: 0.35 });
  let TOW = null, FLOOR = null; const G = {}; const grp = (n) => { const g = new THREE.Group(); scene.add(g); G[n] = g; return g; };
  const addL = (g, pos, mat, ro = 3) => { const l = segs(pos, mat, ro); l.frustumCulled = false; g.add(l); return l; };
  // ---------- entorno (OpenStreetMap) ----------
  { grp('ctx'); const A = mk(); const Eg = []; for (const b of D.ctx) prism(b.r, 0, b.h, 2.2, A.P, A.B, A.T, Eg, {}); G.ctx.add(mesh(A, bldM));
    const R = []; for (const r of D.roads) for (let i = 0; i + 1 < r.length; i++) R.push(r[i][0], 0.05, r[i][1], r[i + 1][0], 0.05, r[i + 1][1]); addL(G.ctx, R, lineMat('#DDD9CF', 1.4), 1); }
  // la plaza: isla central y acera, octógonos concéntricos
  { grp('plaza'); const L = [...octLine(RA(44), 0.06), ...octLine(RA(50.5), 0.06)]; addL(G.plaza, L, lineMat('#BDB9AE', 1.6), 1); }
  // ---------- el mercado: anillos octogonales escalonados hacia el patio central (apotemas en metros) ----------
  const TIERS = [[34, 27, 5.2, 36.6], [27, 20, 7.4, 29.0], [20, 13, 9.6, 21.8], [13, 7, 11.8, 14.4]];   // [apotema fuera, apotema dentro, altura, vuelo de la losa]
  grp('market'); G.tier = [];
  TIERS.forEach(([ao, ai, h, as], i) => { const g = new THREE.Group(); G.market.add(g); G.tier.push(g);
    const y0 = i === 0 ? 0 : TIERS[i - 1][2], S = mk(h), V = mk(h), C = mk(h);
    octRing(S, RA(ai), RA(as), h - 0.45, h); g.add(mesh(S, stoneM));                                   // losa con su vuelo
    octRing(V, RA(ao) - 0.25, RA(ao), y0 + (i ? 0.45 : 0), h - 0.45, true); g.add(mesh(V, i === 0 ? stoneM : glassM));   // cerramiento: zócalo abajo, banda de vidrio arriba
    for (let k = 0; k < 16; k++) { const a = ROT + k * Math.PI / 8, r = RA(ai) * 0.98 + 0.6, x = r * Math.cos(a), z = r * Math.sin(a); box(C, x - 0.3, x + 0.3, 0, h - 0.45, z - 0.3, z + 0.3); }   // pilastras
    g.add(mesh(C, stoneM)); });
  { const A = mk(0.02); octRing(A, 0, RA(34), -0.02, 0.02); const m = mesh(A, pocheM); m.userData.noInk = true; G.market.add(m); FLOOR = m; }   // suelo del mercado y del patio
  // dos torres de escalera en el eje de las entradas, con sus mástiles
  { const A = mk(14.5), L = []; for (const sg of [1, -1]) { const k = sg > 0 ? 2 : 6, am = ang(k) + Math.PI / 8, c = [Math.cos(am) * 27.5, Math.sin(am) * 27.5], t = [-Math.sin(am), Math.cos(am)];
      const Q = [[-3.5, -3.5], [3.5, -3.5], [3.5, 3.5], [-3.5, 3.5]].map(([u, v]) => [c[0] + u * t[0] + v * Math.cos(am), c[1] + u * t[1] + v * Math.sin(am)]); prism(Q, 0, 14.5, 0, A.P, A.B, A.T, [], {});
      for (const u of [-2, 2]) L.push(c[0] + u * t[0], 14.5, c[1] + u * t[1], c[0] + u * t[0], 22, c[1] + u * t[1]); }
    const g = new THREE.Group(); G.market.add(g); TOW = g; g.add(mesh(A, stoneM)); addL(g, L, lineMat(INK, 2.2)); }
  // ---------- planta inferior: el paso de vehículos que atravesaba el edificio (eje de las entradas) y las rampas ----------
  { grp('basement'); const am = ang(2) + Math.PI / 8, dx = Math.cos(am), dz = Math.sin(am), nx = -dz, nz = dx;
    const P = (s, y, o) => [dx * s + nx * o, y, dz * s + nz * o], A = mk();
    const seg = (s0, s1, y0, y1) => { for (const o of [-3, 3]) {} quad(A, P(s0, y0, -3), P(s1, y1, -3), P(s1, y1, 3), P(s0, y0, 3), [0, 1, 0]); };
    seg(-62, -42, 0, -4.5); seg(-42, 42, -4.5, -4.5); seg(42, 62, -4.5, 0);
    G.basement.add(mesh(A, redM)); const B = mk(); octRing(B, RA(13), RA(34), -5.2, -0.3); const bm = mesh(B, pinkM); G.basement.add(bm); }
  // ---------- 1977: aparcamiento bajo la plaza ----------
  { grp('parking'); const A = mk(); octRing(A, 0, RA(40), -6.5, -0.6); G.parking.add(mesh(A, solid('#F6DDD3', { side: 0.97, shade: 0.94 }))); }
  // jardines y árboles de la plaza de hoy
  { grp('garden'); const A = mk(0.3); for (const r of D.gardens) { const v = r.map(p => new THREE.Vector2(p[0], p[1])); let f; try { f = THREE.ShapeUtils.triangulateShape(v, []); } catch (e) { continue; } for (const q of f) tri(A, [r[q[0]][0], 0.3, r[q[0]][1]], [r[q[1]][0], 0.3, r[q[1]][1]], [r[q[2]][0], 0.3, r[q[2]][1]], [0, 1, 0]); }
    const gm = mesh(A, greenM); gm.userData.noInk = true; G.garden.add(gm);
    const T = mk(); for (const [x, z] of D.trees) { const s = new THREE.SphereGeometry(3.2, 12, 8).translate(x, 7.5, z).toNonIndexed(); const p = s.attributes.position.array; for (let i = 0; i < p.length; i += 9) tri(T, [p[i], p[i + 1], p[i + 2]], [p[i + 3], p[i + 4], p[i + 5]], [p[i + 6], p[i + 7], p[i + 8]], [p[i] - x, p[i + 1] - 7.5, p[i + 2] - z]); }
    G.garden.add(mesh(T, greenM)); const L = []; for (const [x, z] of D.trees) L.push(x, 0, z, x, 4.5, z); addL(G.garden, L, lineMat('#8C897F', 2)); }
  // contorno del mercado desaparecido (rojo a trazos) y polvo de la voladura
  { grp('ghost'); const L = []; for (let k = 0; k < 8; k++) for (let q = 0; q < 8; q += 2) { const a = corner(RA(34), 0.1, k), b = corner(RA(34), 0.1, k + 1); L.push(...lerp3(a, b, q / 8), ...lerp3(a, b, (q + 1) / 8)); } addL(G.ghost, L, lineMat(RED, 4)); }
  const ink = makeInkPass(renderer, W, H);
  // ---------- cámara, rótulos y escenas ----------
  const proj = (p) => { const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
  function cam(tg, az, el, z, dy = 150) {
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z; const d = 9000; az *= D2R; el *= D2R;
    camera.position.set(tg[0] + Math.sin(az) * Math.cos(el) * d, tg[1] + Math.sin(el) * d, tg[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); if (el > 89) camera.up.set(-Math.sin(az), 0, -Math.cos(az)); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateMatrixWorld();
    camera.position.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1), dy * 2 * z / H);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
  }
  const svg = $('ov'); let SV = '';
  const text = (x, y, s, cls = 'lab', anchor = 'start', op = 1) => { if (op > 0.01) SV += `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" opacity="${op.toFixed(2)}">${s}</text>`; };
  const lead = (x0, y0, x1, y1, op = 1, col = INK) => { if (op > 0.01) SV += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${col}" stroke-width="1.4" opacity="${op.toFixed(2)}"/><circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="4" fill="${col}" opacity="${op.toFixed(2)}"/>`; };
  const arrow = (x0, y0, x1, y1, op = 1) => { if (op < 0.01) return; const a = Math.atan2(y1 - y0, x1 - x0), h = 18; SV += `<g stroke="${RED}" stroke-width="5" fill="none" opacity="${op.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/><polyline points="${x1 - h * Math.cos(a - 0.5)},${y1 - h * Math.sin(a - 0.5)} ${x1},${y1} ${x1 - h * Math.cos(a + 0.5)},${y1 - h * Math.sin(a + 0.5)}"/></g>`; };
  const puff = (x, y, r, op) => { if (op > 0.01) SV += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#D9D5CB" stroke="${INK}" stroke-width="1.2" opacity="${op.toFixed(2)}"/>`; };
  const show = (...names) => { for (const k of Object.keys(G)) if (G[k].isGroup) G[k].visible = names.includes(k); G.tier.forEach(g => { g.visible = true; g.scale.set(1, 1, 1); g.rotation.set(0, 0, 0); }); TOW.scale.set(1, 1, 1); FLOOR.visible = true; };
  const MK = ['market'], BASE = ['ctx', 'plaza'];
  const SC = [
    // 1 · el gancho: el mercado en su plaza
    [0, 4.5, (u) => { show(...BASE, ...MK); const k = ss(u); cam([0, 6, 0], lerp(36, 30, k), lerp(32, 30, k), lerp(150, 110, k), 160); }],
    // 2 · 1934: un mercado que ocupa la plaza entera
    [4.5, 9.5, (u) => { show(...BASE, ...MK); const k = ss(u); cam([0, 6, 0], lerp(30, 22, k), lerp(30, 38, k), lerp(110, 95, k), 160); }],
    // 3 · octógono dentro de un octógono: planta
    [9.5, 14.5, (u) => { show(...BASE, ...MK); cam([0, 0, 0], 0, 89.9, lerp(110, 80, ss(u)), 120); }],
    // 4 · escalonado hacia el patio: sección
    [14.5, 19.5, (u) => { show('plaza', ...MK); FLOOR.visible = false; renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)]; const k = ss(u); cam([0, 6, 0], lerp(8, 14, k), 16, lerp(40, 36, k), 140);
      const a = ss((u - 0.25) / 0.25); for (const sg of [-1, 1]) { const p0 = proj([sg * 19, 2.2, 0]), p1 = proj([sg * 8, 4.5, 0]); arrow(p0[0], p0[1], p1[0], p1[1], a); } const q0 = proj([0, 5, 0]), q1 = proj([0, 18, 0]); arrow(q0[0], q0[1], q1[0], q1[1], ss((u - 0.45) / 0.2));
      text(q1[0] + 20, q1[1] + 10, 'AIRE', 'labr', 'start', ss((u - 0.5) / 0.2)); text(540, 1560, 'SECCIÓN · ESQUEMA', 'labs', 'middle', 1); }],
    // 5 · sin un adorno: hormigón, vuelos
    [19.5, 24, (u) => { show('plaza', ...MK); const k = ss(u); cam([10, 5, 8], lerp(44, 36, k), 16, 34, 170); }],
    // 6 · por debajo lo cruzaban los vehículos
    [24, 29, (u) => { show('plaza', ...MK, 'basement'); const am = ang(2) + Math.PI / 8, n = new THREE.Vector3(Math.sin(am), 0, -Math.cos(am)); renderer.clippingPlanes = [new THREE.Plane(n, 0)]; cam([0, 0, 0], -am / D2R + 90 + 28, 20, 78, 170);
      const a = ss((u - 0.2) / 0.2), p = proj([Math.cos(am) * -52, -2.5, Math.sin(am) * -52]), q = proj([Math.cos(am) * 52, -2.5, Math.sin(am) * 52]); text(p[0], p[1] + 46, 'ENTRADA', 'labr', 'middle', a); text(q[0], q[1] + 46, 'ENTRADA', 'labr', 'middle', a); text(540, 1560, 'PLANTA INFERIOR · PASO DE VEHÍCULOS (ESQUEMA)', 'labs', 'middle', 1); }],
    // 7 · 1974: decide derribarlo
    [29, 34, (u) => { show(...BASE, ...MK); cam([0, 6, 0], 30, 30, 100, 160); const a = ss((u - 0.3) / 0.2), p = proj([0, 14, 0]); text(p[0], p[1] - 150, '«MODELO OBSOLETO»', 'lab', 'middle', a); text(p[0], p[1] - 110, '«RECUPERARLO» · COAM', 'labr', 'middle', ss((u - 0.5) / 0.2)); }],
    // 8 · 2 de noviembre de 1974: voladura
    [34, 39.5, (u) => { show(...BASE, ...MK); cam([0, 6, 0], 30, 30, 100, 160);
      const t0 = 0.12; G.tier.forEach((g, i) => { const k = ss((u - t0 - 0.05 * (3 - i)) / 0.3); g.scale.set(1, Math.max(0.03, 1 - 0.97 * k), 1); g.rotation.set(0.04 * k * (i % 2 ? 1 : -1), 0, 0.03 * k); });
      TOW.scale.set(1, Math.max(0.03, 1 - 0.97 * ss((u - t0) / 0.28)), 1);
      const c = proj([0, 4, 0]); for (let i = 0; i < 14; i++) { const a = i * 2.39, d = 60 + 26 * (i % 5), e = ss((u - 0.1 - 0.01 * i) / 0.4); puff(c[0] + Math.cos(a) * d * (0.4 + e), c[1] - 30 * e - Math.abs(Math.sin(a)) * d * 0.5 * e, 30 + 55 * e, 0.85 * e * (1 - ss((u - 0.75) / 0.25))); } }],
    // 9 · 1977: jardines y aparcamiento
    [39.5, 44.5, (u) => { show(...BASE, 'garden', 'parking', 'ghost'); renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)]; cam([0, 0, 0], 22, 30, 74, 170); const a = ss((u - 0.3) / 0.2), p = proj([8, -4, 0]); text(p[0], p[1] + 64, 'APARCAMIENTO · 400 PLAZAS', 'labr', 'middle', a); }],
    // 10 · hoy
    [44.5, 50, (u) => { show(...BASE, 'garden', 'ghost'); const k = ss(u); cam([0, 6, 0], lerp(22, 34, k), lerp(32, 36, k), lerp(95, 120, k), 160); const p = proj(corner(RA(34), 0, 1)); text(p[0] + 10, p[1] + 44, 'MERCADO DE OLAVIDE · 1934 – 1974', 'labr', 'start', ss((u - 0.25) / 0.2)); }],
  ];
  const END = SC[SC.length - 1][1];
  window.renderAt = (t) => { t = clamp(t, 0, END - 1e-4); SV = ''; renderer.clippingPlanes = [];
    for (const [a, b, fn] of SC) if (t >= a && t < b) { fn((t - a) / (b - a), t); break; }
    svg.innerHTML = SV; ink.render(scene, camera); };
  window.READY = true;
}
