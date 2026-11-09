// 001 en inglés · La cúpula de Brunelleschi (Santa Maria del Fiore, Florencia, 1420–1436), rehecha en 3D con medidas reales.
// Sección por las aristas: arcos concéntricos; el intradós de la cáscara interior es un «quinto acuto» (radio = 4/5 del diámetro interior, 45,5 m).
// Dos cáscaras, 8 nervios de arista + 16 intermedios, tambor de 13 m con 8 óculos, arranque a 55 m, linterna hasta 114,5 m.
// Entorno: OpenStreetMap actual (v001en.json, lo prepara motor/scripts/v001en_build.py). Volúmenes del templo: esquema a partir de su planta.
// Marco: x este (la nave hacia −x), z sur, y metros sobre el suelo. Sin títulos: los pone post019.py; aquí solo van los rótulos del dibujo.
import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, makeInkPass, prism } from './lib.js';
const $ = (id) => document.getElementById(id);
const INK = '#1A1B20', RED = '#E2401C', PINK = '#F0B8A4', POCHE = '#2A2B30', D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ss = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, u) => a + (b - a) * u, lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const YS = 55, YD = 42, DI = 45.5, RI = 0.8 * DI, E = RI - DI / 2, PHI = Math.acos((E + 3.0) / RI), PHIA = Math.acos(E / RI);
const OFF = [(u) => 0, (u) => 2.2 - 0.7 * u, (u) => 3.9 - 1.0 * u, (u) => 4.7 - 1.4 * u];   // intradós y trasdós de la cáscara interior; intradós y trasdós de la exterior
const prof = (k, u, extra = 0) => { const ph = PHI * u, rho = RI + OFF[k](u) + extra; return [-E + rho * Math.cos(ph), YS + rho * Math.sin(ph)]; };
const RO = prof(3, 0)[0], C8 = Math.cos(Math.PI / 8);
const ang = (k) => Math.PI / 8 + k * Math.PI / 4;
const corner = (r, y, k) => [r * Math.cos(ang(k)), y, r * Math.sin(ang(k))];
const mk = (t = 0) => ({ P: [], B: [], T: [], t });
function tri(A, a, b, c, hint) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  if ((uy * vz - uz * vy) * hint[0] + (uz * vx - ux * vz) * hint[1] + (ux * vy - uy * vx) * hint[2] < 0) { const t = b; b = c; c = t; }
  A.P.push(...a, ...b, ...c); A.B.push(0, 0, 0); A.T.push(A.t, A.t, A.t);
}
const quad = (A, a, b, c, d, hint) => { tri(A, a, b, c, hint); tri(A, a, c, d, hint); };
const mesh = (A, M) => { const m = new THREE.Mesh(geomFrom(A.P, A.B, A.T), M); m.frustumCulled = false; return m; };
const withBT = (g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position') n.deleteAttribute(k); const c = n.attributes.position.count;
  n.setAttribute('aBase', new THREE.Float32BufferAttribute(new Float32Array(c), 1)); n.setAttribute('aTop', new THREE.Float32BufferAttribute(new Float32Array(c), 1)); return n; };
const NS = 44;
// un gajo (vela) de una cáscara como sólido cerrado: trasdós, intradós y, aparte (S), base, coronación y los dos lados en los planos de arista
function sail(A, S, kIn, kOut, s) {
  const am = ang(s) + Math.PI / 8, out = [Math.cos(am), 0.35, Math.sin(am)], inn = [-out[0], -0.35, -out[2]], a0 = ang(s), a1 = ang(s + 1);
  for (let i = 0; i < NS; i++) {
    const [rao, yao] = prof(kOut, i / NS), [rbo, ybo] = prof(kOut, (i + 1) / NS), [rai, yai] = prof(kIn, i / NS), [rbi, ybi] = prof(kIn, (i + 1) / NS);
    const o00 = corner(rao, yao, s), o01 = corner(rao, yao, s + 1), o10 = corner(rbo, ybo, s), o11 = corner(rbo, ybo, s + 1);
    const i00 = corner(rai, yai, s), i01 = corner(rai, yai, s + 1), i10 = corner(rbi, ybi, s), i11 = corner(rbi, ybi, s + 1);
    quad(A, o00, o01, o11, o10, out); quad(A, i00, i01, i11, i10, inn);
    quad(S, o00, o10, i10, i00, [Math.sin(a0), 0, -Math.cos(a0)]); quad(S, o01, o11, i11, i01, [-Math.sin(a1), 0, Math.cos(a1)]);
    if (i === NS - 1) quad(S, o10, o11, i11, i10, [0, 1, 0]);
  }
}
// pieza barrida a lo largo del perfil entre dos superficies (nervios): centro en la fracción f del gajo s, medio ancho w
function rib(A, s, f, w, kIn, kOut, exIn = 0, exOut = 0) {
  const a0 = ang(s), a1 = ang(s + 1), dir = [Math.cos(a1) - Math.cos(a0), 0, Math.sin(a1) - Math.sin(a0)], dl = Math.hypot(dir[0], dir[2]), t = [dir[0] / dl, 0, dir[2] / dl];
  const at = (r, y, sg) => { const c0 = corner(r, y, s), c1 = corner(r, y, s + 1); return [lerp(c0[0], c1[0], f) + sg * w * t[0], y, lerp(c0[2], c1[2], f) + sg * w * t[2]]; };
  const am = lerp(a0, a1, f), out = [Math.cos(am), 0.35, Math.sin(am)];
  for (let i = 0; i < NS; i++) {
    const [rao, yao] = prof(kOut, i / NS, exOut), [rbo, ybo] = prof(kOut, (i + 1) / NS, exOut), [rai, yai] = prof(kIn, i / NS, exIn), [rbi, ybi] = prof(kIn, (i + 1) / NS, exIn);
    const oa0 = at(rao, yao, -1), oa1 = at(rao, yao, 1), ob0 = at(rbo, ybo, -1), ob1 = at(rbo, ybo, 1), ia0 = at(rai, yai, -1), ia1 = at(rai, yai, 1), ib0 = at(rbi, ybi, -1), ib1 = at(rbi, ybi, 1);
    quad(A, oa0, oa1, ob1, ob0, out); quad(A, oa0, ob0, ib0, ia0, [-t[0], 0, -t[2]]); quad(A, oa1, ob1, ib1, ia1, t); quad(A, ia0, ia1, ib1, ib0, [-out[0], -0.35, -out[2]]);
    if (i === NS - 1) quad(A, ob0, ob1, ib1, ib0, [0, 1, 0]);
  }
}
// anillo octogonal macizo entre radios de arista r0 < r1 (r0 = 0: prisma lleno), centrado en (cx, cz)
function octRing(A, r0, r1, y0, y1, cx = 0, cz = 0) {
  const c = (r, y, k) => { const p = corner(r, y, k); return [p[0] + cx, y, p[2] + cz]; };
  for (let k = 0; k < 8; k++) { const am = ang(k) + Math.PI / 8, out = [Math.cos(am), 0, Math.sin(am)];
    const a = c(r1, y0, k), b = c(r1, y0, k + 1), cc = c(r1, y1, k + 1), d = c(r1, y1, k), e = c(r0, y0, k), f = c(r0, y0, k + 1), g = c(r0, y1, k + 1), h = c(r0, y1, k);
    quad(A, a, b, cc, d, out); if (r0 > 0.01) quad(A, e, f, g, h, [-out[0], 0, -out[2]]); quad(A, d, cc, g, h, [0, 1, 0]); quad(A, a, b, f, e, [0, -1, 0]); }
}
function octPyr(A, r, y0, y1, cx = 0, cz = 0) { for (let k = 0; k < 8; k++) { const am = ang(k) + Math.PI / 8, a = corner(r, y0, k), b = corner(r, y0, k + 1); tri(A, [a[0] + cx, y0, a[2] + cz], [b[0] + cx, y0, b[2] + cz], [cx, y1, cz], [Math.cos(am), 0.6, Math.sin(am)]); } }
// prisma de perfil (z, y) extruido a lo largo de x; las tapas llevan aTop alto para que no se pinten como cubierta
function alongX(A, prof2, x0, x1) {
  const n = prof2.length, cz = prof2.reduce((s, p) => s + p[0], 0) / n, cy = prof2.reduce((s, p) => s + p[1], 0) / n;
  for (let i = 0; i < n; i++) { const p = prof2[i], q = prof2[(i + 1) % n]; if (p[1] === 0 && q[1] === 0) continue;
    const mz = (p[0] + q[0]) / 2 - cz, my = (p[1] + q[1]) / 2 - cy; quad(A, [x0, p[1], p[0]], [x1, p[1], p[0]], [x1, q[1], q[0]], [x0, q[1], q[0]], [0, my, mz]); }
  const t0 = A.t; A.t = 999; for (const [x, sg] of [[x0, -1], [x1, 1]]) for (let i = 1; i < n - 1; i++) tri(A, [x, prof2[0][1], prof2[0][0]], [x, prof2[i][1], prof2[i][0]], [x, prof2[i + 1][1], prof2[i + 1][0]], [sg, 0, 0]); A.t = t0;
}
const octLine = (r, y) => { const L = []; for (let k = 0; k < 8; k++) L.push(...corner(r, y, k), ...corner(r, y, k + 1)); return L; };

export async function init() {
  await Promise.all([document.fonts.load("24px SM"), document.fonts.load("700 44px SG")]);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
  const solid = (c, o = {}) => fillMat(c, { hatch: 0, side: o.side ?? 0.94, shade: o.shade ?? 0.84, double: true, poche: POCHE, roof: o.roof });
  const tileM = solid(RED, { side: 0.93, shade: 0.8 }), brickM = solid(PINK, { side: 0.96, shade: 0.95 }), stoneM = solid('#F6F5F1'), cathM = solid('#F6F5F1', { roof: '#EDD3C5' });
  const pocheM = fillMat(POCHE, { hatch: 0, side: 1, shade: 1, top: 1, double: true, poche: POCHE }), inkM = fillMat(INK, { hatch: 0, side: 1, shade: 1 }), redM = solid(RED, { side: 1, shade: 0.9 });
  const bldM = fillMat('#F6F5F1', { hatch: 0, side: 0.95, shade: 0.88, roof: '#EFDCD0', windows: 0.3 });
  const G = {}; const grp = (n) => { const g = new THREE.Group(); scene.add(g); G[n] = g; return g; };
  const addL = (g, pos, mat, ro = 3) => { const l = segs(pos, mat, ro); l.frustumCulled = false; g.add(l); return l; };

  // ---------- entorno: Florencia hoy (OpenStreetMap) ----------
  grp('ctx');
  try { const D = await fetch('v001en.json').then(r => r.json());
    const A = mk(); const Eg = [];
    for (const b of D.ctx) { if (b.holes) { extrudeH(A, b.r, b.holes, b.h); continue; } prism(b.r, 0, b.h, 2.2, A.P, A.B, A.T, Eg, {}); }
    G.ctx.add(mesh(A, bldM));
    const R = []; for (const r of D.roads) for (let i = 0; i + 1 < r.length; i++) R.push(r[i][0], 0.05, r[i][1], r[i + 1][0], 0.05, r[i + 1][1]);
    const rl = addL(G.ctx, R, lineMat('#DDD9CF', 1.4), 1);
    // campanile y baptisterio: planta de OpenStreetMap; alturas conocidas (84,7 m) o aproximadas
    const C = mk(84.7); prism(D.campanile, 0, 84.7, 0, C.P, C.B, C.T, [], {}); grp('campanile').add(mesh(C, cathM));
    const Bp = mk(20); prism(D.baptisterio, 0, 20, 0, Bp.P, Bp.B, Bp.T, [], {}); const bc = D.baptisterio.reduce((s, p) => [s[0] + p[0] / D.baptisterio.length, s[1] + p[1] / D.baptisterio.length], [0, 0]);
    for (let i = 0; i < D.baptisterio.length; i++) { const p = D.baptisterio[i], q = D.baptisterio[(i + 1) % D.baptisterio.length]; tri(Bp, [p[0], 20, p[1]], [q[0], 20, q[1]], [bc[0], 31, bc[1]], [(p[0] + q[0]) / 2 - bc[0], 12, (p[1] + q[1]) / 2 - bc[1]]); }
    grp('bapt').add(mesh(Bp, cathM)); { const L = []; for (const p of D.baptisterio) L.push(p[0], 20.05, p[1], bc[0], 31.05, bc[1]); addL(G.bapt, L, lineMat(INK, 0.9)); }
  } catch (e) { console.log('sin entorno: ' + e); grp('campanile'); grp('bapt'); }
  function extrudeH(A, ring, holes, h) {   // edificio con patios: muros y tapa plana
    const t0 = A.t; const all = [ring, ...holes];
    for (const r of all) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; A.P.push(a[0], 0, a[1], a[0], h, a[1], b[0], h, b[1], a[0], 0, a[1], b[0], h, b[1], b[0], 0, b[1]); for (let k = 0; k < 6; k++) { A.B.push(0); A.T.push(h); } }
    const v2 = (r) => r.map(p => new THREE.Vector2(p[0], p[1])); let f; try { f = THREE.ShapeUtils.triangulateShape(v2(ring), holes.map(v2)); } catch (e) { return; } const pts = all.flat();
    for (const q of f) { const p = q.map(i => [pts[i][0], h, pts[i][1]]); const ny = (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) - (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]); const o = ny >= 0 ? [0, 1, 2] : [0, 2, 1]; for (const k of o) { A.P.push(...p[k]); A.B.push(0); A.T.push(h); } }
  }
  // ---------- el templo: nave, tres tribunas y cuerpos diagonales (volúmenes esquemáticos sobre la planta real) ----------
  { const A = mk(42); alongX(A, [[-10.5, 0], [-10.5, 42], [0, 46], [10.5, 42], [10.5, 0]], -107.8, -23);
    A.t = 26; alongX(A, [[10.5, 0], [10.5, 29.5], [21.7, 26], [21.7, 0]], -107.8, -19); alongX(A, [[-21.7, 0], [-21.7, 26], [-10.5, 29.5], [-10.5, 0]], -107.8, -19);
    A.t = 31; for (const [cx, cz] of [[29.4, 0], [0, 29.4], [0, -29.4]]) { octRing(A, 0, 20, 0, 31, cx, cz); octPyr(A, 20, 31, 40.5, cx, cz); }
    A.t = 30; for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { octRing(A, 0, 9.5, 0, 30, sx * 21.8, sz * 21.8); octPyr(A, 9.5, 30, 33, sx * 21.8, sz * 21.8); }
    grp('church').add(mesh(A, cathM)); const L = []; const py = (r, y0, y1, cx, cz) => { for (let k = 0; k < 8; k++) { const a = corner(r, y0, k); L.push(a[0] + cx, y0 + 0.05, a[2] + cz, cx, y1 + 0.05, cz); } };
    for (const [cx, cz] of [[29.4, 0], [0, 29.4], [0, -29.4]]) py(20, 31, 40.5, cx, cz); for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) py(9.5, 30, 33, sx * 21.8, sz * 21.8); addL(G.church, L, lineMat(INK, 0.9)); }
  // ---------- cuerpo bajo el tambor (octógono hueco) y vacío oscuro para las vistas desde arriba ----------
  { const A = mk(); octRing(A, DI / 2, RO + 0.2, 0, YD - 0.6); grp('body').add(mesh(A, stoneM));
    const V = mk(); for (let k = 0; k < 8; k++) tri(V, corner(DI / 2, 40, k), corner(DI / 2, 40, k + 1), [0, 40, 0], [0, 1, 0]); const vm = mesh(V, pocheM); vm.userData.noInk = true; grp('void').add(vm); }
  // ---------- tambor con ocho óculos (malla limpia, sin operaciones booleanas: caras con hueco circular y el tubo del óculo) ----------
  { const RIN = DI / 2, A = mk(), RH = 2.75, YH = YD + 6.6, NC = 48;
    const face = (r, k, sgn) => {   // cara k a radio de arista r, con el hueco; sgn = +1 mira hacia fuera, −1 hacia dentro
      const a = corner(r, 0, k), b = corner(r, 0, k + 1), L = Math.hypot(b[0] - a[0], b[2] - a[2]), t = [(b[0] - a[0]) / L, (b[2] - a[2]) / L], am = ang(k) + Math.PI / 8, n = [Math.cos(am) * sgn, 0, Math.sin(am) * sgn];
      const sh = new THREE.Shape(); sh.moveTo(0, YD); sh.lineTo(L, YD); sh.lineTo(L, YS); sh.lineTo(0, YS); sh.lineTo(0, YD); const h = new THREE.Path(); h.absarc(L / 2, YH, RH, 0, Math.PI * 2, true); sh.holes.push(h);
      const g = new THREE.ShapeGeometry(sh, NC / 4).toNonIndexed(), q = g.attributes.position.array;
      for (let i = 0; i < q.length; i += 9) { const P3 = (o) => [a[0] + t[0] * q[i + o], q[i + o + 1], a[2] + t[1] * q[i + o]]; tri(A, P3(0), P3(3), P3(6), n); }
      return { a, t, L }; };
    for (let k = 0; k < 8; k++) { const fo = face(RO, k, 1), fi = face(RIN, k, -1), am = ang(k) + Math.PI / 8;
      for (let i = 0; i < NC; i++) { const p0 = 2 * Math.PI * i / NC, p1 = 2 * Math.PI * (i + 1) / NC; const pt = (f, ph) => [f.a[0] + f.t[0] * (f.L / 2 + RH * Math.cos(ph)), YH + RH * Math.sin(ph), f.a[2] + f.t[1] * (f.L / 2 + RH * Math.cos(ph))];
        const o0 = pt(fo, p0), o1 = pt(fo, p1), i0 = pt(fi, p0), i1 = pt(fi, p1), pm = (p0 + p1) / 2; quad(A, o0, o1, i1, i0, [-fo.t[0] * Math.cos(pm), -Math.sin(pm), -fo.t[1] * Math.cos(pm)]); }
      quad(A, corner(RO, YS, k), corner(RO, YS, k + 1), corner(RIN, YS, k + 1), corner(RIN, YS, k), [0, 1, 0]); quad(A, corner(RO, YD, k), corner(RO, YD, k + 1), corner(RIN, YD, k + 1), corner(RIN, YD, k), [0, -1, 0]); }
    octRing(A, RIN + 0.4, RO + 0.55, YS - 0.9, YS - 0.3); octRing(A, RIN + 0.4, RO + 0.45, YD - 0.6, YD); grp('drum').add(mesh(A, stoneM)); }
  // ---------- cáscaras ----------
  grp('outer'); G.outerSails = [];
  for (let s = 0; s < 8; s++) { const A = mk(), S = mk(); sail(A, S, 2, 3, s); const g = new THREE.Group(); g.add(mesh(A, tileM), mesh(S, pocheM)); G.outer.add(g); G.outerSails.push(g); }
  { const A = mk(), S = mk(); for (let s = 0; s < 8; s++) sail(A, S, 0, 1, s); grp('inner').add(mesh(A, brickM), mesh(S, pocheM)); }
  // ---------- nervios: 8 de arista (mármol, por fuera) y 8 + 16 entre las dos cáscaras ----------
  grp('ribsOut'); G.ribOut = [];
  for (let s = 0; s < 8; s++) { const A = mk(); rib(A, s, 0, 0.85, 3, 3, -0.15, 0.6); const m = mesh(A, stoneM); G.ribsOut.add(m); G.ribOut.push(m); }
  { const A = mk(); for (let s = 0; s < 8; s++) { rib(A, s, 0, 1.0, 1, 2); rib(A, s, 1 / 3, 0.55, 1, 2); rib(A, s, 2 / 3, 0.55, 1, 2); } grp('ribsIn').add(mesh(A, brickM)); }
  // ---------- anillo de cierre y linterna ----------
  const yTop0 = prof(0, 1)[1], yTop3 = prof(3, 1)[1], rTop3 = prof(3, 1)[0], YL = yTop3 + 0.45;
  { const A = mk(); octRing(A, 3.0, rTop3 + 0.9, yTop0, YL); grp('ringTop').add(mesh(A, stoneM)); }
  { const A = mk(); octRing(A, 0, 2.9, YL, YL + 11.0); octRing(A, 0, 3.5, YL + 11.0, YL + 11.7);
    for (let k = 0; k < 8; k++) { const a = ang(k), c = Math.cos(a), sn = Math.sin(a), t = [-sn, 0, c];
      const P0 = (r, y, sg) => [r * c + sg * 0.32 * t[0], y, r * sn + sg * 0.32 * t[2]];
      const a0 = P0(2.7, YL, -1), a1 = P0(2.7, YL, 1), b0 = P0(4.9, YL, -1), b1 = P0(4.9, YL, 1), c0 = P0(2.7, YL + 8.2, -1), c1 = P0(2.7, YL + 8.2, 1), d0 = P0(4.9, YL + 3.6, -1), d1 = P0(4.9, YL + 3.6, 1);
      quad(A, a0, b0, d0, c0, [-t[0], 0, -t[2]]); quad(A, a1, b1, d1, c1, t); quad(A, b0, b1, d1, d0, [c, 0, sn]); quad(A, c0, c1, d1, d0, [c, 0.6, sn]); }
    octPyr(A, 3.1, YL + 11.7, YL + 18.0); grp('lantern').add(mesh(A, stoneM));
    G.lantern.add(new THREE.Mesh(withBT(new THREE.SphereGeometry(1.2, 24, 16).translate(0, YL + 19.0, 0)), redM));
    const B2 = mk(), yb = YL + 20.1; for (const sg of [1, -1]) { quad(B2, [-0.16, yb, 0], [0.16, yb, 0], [0.16, yb + 3.6, 0], [-0.16, yb + 3.6, 0], [0, 0, sg]); quad(B2, [-0.9, yb + 2.2, 0], [0.9, yb + 2.2, 0], [0.9, yb + 2.52, 0], [-0.9, yb + 2.52, 0], [0, 0, sg]); }
    G.lantern.add(mesh(B2, inkM)); }
  // ---------- hiladas (líneas) sobre la teja y sobre el ladrillo ----------
  const courses = (k, extra, step, s0 = 0, s1 = 8, uMax = 1) => { const L = []; const n = Math.round(RI * PHI / step); for (let i = 1; i < n * uMax; i++) { const [r, y] = prof(k, i / n, extra); for (let s = s0; s < s1; s++) L.push(...corner(r, y, s), ...corner(r, y, s + 1)); } return L; };
  const tileL = lineMat('#B3311A', 0.7), brickL = lineMat('#B98974', 0.6);
  G.tileLines = []; for (let s = 0; s < 8; s++) G.tileLines.push(addL(G.outerSails[s], courses(3, 0.05, 1.35, s, s + 1), tileL));
  addL(G.inner, courses(1, 0.05, 0.9), brickL);
  grp('fine'); addL(G.fine, courses(1, 0.06, 0.3, 0, 8, 0.5), brickL);
  // ---------- espina de pez: ladrillos de canto que suben en diagonal por cada gajo ----------
  { grp('spines'); const L = [], n = Math.round(RI * PHI / 0.9);
    for (let s = 0; s < 8; s++) for (let j = 0; j < 7; j++) for (let i = 0; i < n - 1; i++) { let f = (j / 7 + 0.018 * i) % 1; if (f < 0.05 || f > 0.95) continue;
      const [r0, y0] = prof(1, i / n, 0.08), [r1, y1] = prof(1, (i + 1) / n, 0.08); const a = lerp3(corner(r0, y0, s), corner(r0, y0, s + 1), f), b = lerp3(corner(r1, y1, s), corner(r1, y1, s + 1), f); L.push(...a, ...b); }
    addL(G.spines, L, lineMat(RED, 3.2)); }
  // ---------- cadenas: 4 de arenisca y 1 de castaño, ciñendo la cáscara interior ----------
  { grp('chains'); G.chain = []; const mkc = (u, M, w) => { const [r, y] = prof(1, u); const A = mk(); octRing(A, r + 0.02, r + w, y - w / 2, y + w / 2); const m = mesh(A, M); G.chains.add(m); G.chain.push(m); };
    for (const u of [0.03, 0.34, 0.66, 0.965]) mkc(u, inkM, 1.15); mkc(0.185, redM, 1.0); }
  // ---------- líneas de construcción ----------
  const timberL = lineMat('#A9773F', 3.2, { depthTest: false }), xL = lineMat(RED, 10, { depthTest: false }), redL = lineMat(RED, 4.5, { depthTest: false }), redLd = lineMat(RED, 4.5), conL = lineMat(INK, 2.2, { depthTest: false }), greyL = lineMat('#8C897F', 1.8, { depthTest: false }), ghostL = lineMat(INK, 2.1);
  // cimbra de madera, en el plano de la sección (z = 0): andamio desde el suelo y cerchas bajo el intradós
  { grp('centering'); const L = [], Z = -0.3, rf = (u) => prof(0, u, -0.5)[0] * C8, yf = (u) => prof(0, u, -0.5)[1], seg = (x0, y0, x1, y1) => L.push(x0, y0, Z, x1, y1, Z);
    const xs = [-18, -9, 0, 9, 18]; for (let lv = 0; lv < 5; lv++) { const y0 = lv * 11, y1 = y0 + 11; for (const x of xs) seg(x, y0, x, y1); seg(-20.5, y1, 20.5, y1); for (let b = 0; b < 4; b++) (b + lv) % 2 ? seg(xs[b], y0, xs[b + 1], y1) : seg(xs[b + 1], y0, xs[b], y1); }
    const UA = PHIA / PHI; for (let i = 0; i < 30; i++) { const u0 = UA * i / 30, u1 = UA * (i + 1) / 30; for (const sg of [-1, 1]) seg(sg * Math.max(rf(u0), 0), yf(u0), sg * Math.max(rf(u1), 0), yf(u1)); }
    const ya = yf(UA); seg(0, 55, 0, ya); for (const u of [0.28, 0.5, 0.72]) for (const sg of [-1, 1]) { seg(0, 55, sg * rf(u), yf(u)); } seg(-rf(0.45), yf(0.45), rf(0.45), yf(0.45)); seg(-rf(0.75), yf(0.75), rf(0.75), yf(0.75));
    G.centL = addL(G.centering, L, timberL, 6); G.centN = L.length / 6;
    G.hL = addL(G.centering, [-36, 0, -0.4, -36, 55, -0.4, -37.5, 0, -0.4, -34.5, 0, -0.4, -37.5, 55, -0.4, -34.5, 55, -0.4, -40, 0, -0.4, 40, 0, -0.4], redL, 7);
    G.xL = addL(G.centering, [-21, 50, -0.5, 21, 92, -0.5, -21, 92, -0.5, 21, 50, -0.5], xL, 7); }
  // cúpula «fantasma»: las ocho aristas y tres anillos, a trazos, sin nada que la sostenga
  { grp('ghost'); const L = [], nd = 64; for (let i = 0; i < nd; i++) { if (i % 2) continue; for (let k = 0; k < 8; k++) { const [r0, y0] = prof(3, i / nd), [r1, y1] = prof(3, (i + 1) / nd); L.push(...corner(r0, y0, k), ...corner(r1, y1, k)); }
      if (i === 20 || i === 42 || i === 62) { const [r, y] = prof(3, (i + 1) / nd); for (let k = 0; k < 8; k++) for (let q = 0; q < 6; q += 2) { const a = corner(r, y, k), b = corner(r, y, k + 1); L.push(...lerp3(a, b, q / 6), ...lerp3(a, b, (q + 1) / 6)); } } }
    G.ghostL = addL(G.ghost, L, ghostL); G.ghostN = L.length / 6; }
  // borde del hueco y su medida
  { grp('rim'); addL(G.rim, octLine(DI / 2, YS + 0.08), redLd); const a = corner(DI / 2, YS + 0.1, 3), b = corner(DI / 2, YS + 0.1, 7); G.dimL = addL(G.rim, [...a, ...b], redL, 6); G.dimA = a; G.dimB = b; }
  // quinto acuto: el diámetro en cinco partes y el arco trazado desde la cuarta
  const DD = [Math.cos(Math.PI / 8), 0, Math.sin(Math.PI / 8)], NN = [-Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)], PD = (s, y, o = -0.4) => [s * DD[0] + o * NN[0], y, s * DD[2] + o * NN[2]];
  { grp('quinto'); const a = DI / 2; const L = [...PD(-a, YS), ...PD(a, YS)]; for (let i = 0; i <= 5; i++) { const s = -a + i * DI / 5; L.push(...PD(s, YS - 1.3), ...PD(s, YS + 1.3)); } addL(G.quinto, L, conL, 6);
    const RA = RI - 0.55, arc = (c, sg, n = 60) => { const P = []; for (let i = 0; i < n; i++) { const p0 = PHIA * i / n, p1 = PHIA * (i + 1) / n; P.push(...PD(c + sg * RA * Math.cos(p0), YS + RA * Math.sin(p0)), ...PD(c + sg * RA * Math.cos(p1), YS + RA * Math.sin(p1))); } return P; };
    const redA = lineMat(RED, 7, { depthTest: false }); G.arcA = addL(G.quinto, arc(-E, 1), redA, 7); G.arcB = addL(G.quinto, arc(E, -1), redA, 7);
    const S = []; for (let i = 0; i < 48; i += 2) { const p0 = Math.PI * i / 48, p1 = Math.PI * (i + 1) / 48; S.push(...PD(a * Math.cos(p0), YS + a * Math.sin(p0)), ...PD(a * Math.cos(p1), YS + a * Math.sin(p1))); } G.semi = addL(G.quinto, S, greyL, 6);
    G.radL = addL(G.quinto, [...PD(-E, YS), ...PD(a, YS)], conL, 7); }
  const ink = makeInkPass(renderer, W, H);

  // ---------- cámara, rótulos y escenas ----------
  const proj = (p) => { const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
  function cam(tg, az, el, z, dy = 150) {
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z; const d = 9000; az *= D2R; el *= D2R;
    camera.position.set(tg[0] + Math.sin(az) * Math.cos(el) * d, tg[1] + Math.sin(el) * d, tg[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateMatrixWorld();
    camera.position.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1), dy * 2 * z / H);   // sube la cámara: el dibujo baja dy píxeles
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
  }
  const svg = $('ov'); let SV = '';
  const text = (x, y, s, cls = 'lab', anchor = 'start', op = 1) => { if (op > 0.01) SV += `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" opacity="${op.toFixed(2)}">${s}</text>`; };
  const lead = (x0, y0, x1, y1, op = 1, col = INK) => { if (op > 0.01) SV += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${col}" stroke-width="1.4" opacity="${op.toFixed(2)}"/><circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="4" fill="${col}" opacity="${op.toFixed(2)}"/>`; };
  const arrow = (x0, y0, x1, y1, op = 1) => { if (op < 0.01) return; const a = Math.atan2(y1 - y0, x1 - x0), h = 20; SV += `<g stroke="${RED}" stroke-width="5" fill="none" opacity="${op.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/><polyline points="${x1 - h * Math.cos(a - 0.5)},${y1 - h * Math.sin(a - 0.5)} ${x1},${y1} ${x1 - h * Math.cos(a + 0.5)},${y1 - h * Math.sin(a + 0.5)}"/></g>`; };
  const show = (...names) => { for (const k of Object.keys(G)) if (G[k].isGroup) G[k].visible = names.includes(k); G.outerSails.forEach(g => { g.visible = true; g.position.set(0, 0, 0); }); G.ribOut.forEach(m => { m.visible = true; }); G.chain.forEach(m => { m.visible = true; }); G.tileLines.forEach(l => { l.visible = true; }); };
  const clipY = (y) => new THREE.Plane(new THREE.Vector3(0, -1, 0), y);
  const CITY = ['ctx', 'campanile', 'bapt', 'church', 'body', 'drum'], DOME = ['outer', 'inner', 'ribsOut', 'ribsIn'];
  const count = (l, n) => { l.geometry.instanceCount = Math.max(0, Math.round(n)); };

  const SC = [
    // 1 · el agujero: la catedral sin cúpula, en la ciudad
    [0, 4.2, (u) => { show(...CITY, 'void'); const k = ss(u); cam(lerp3([-30, 28, 6], [-6, 40, 0], k), lerp(52, 44, k), lerp(36, 42, k), lerp(132, 84, k)); }],
    // 2 · nadie sabe cerrarlo: el borde del hueco y su medida
    [4.2, 8.2, (u) => { show(...CITY, 'void', 'rim'); const k = ss(u); cam(lerp3([-4, 44, 0], [0, 50, 0], k), lerp(44, 34, k), lerp(42, 40, k), lerp(84, 52, k));
      const a = ss((u - 0.25) / 0.35); count(G.dimL, a > 0 ? 1 : 0); if (a > 0) { const p = proj(lerp3(G.dimA, G.dimB, 0.5)); text(p[0], p[1] - 22, '45 m', 'dim', 'middle', a); } }],
    // 3 · el problema: la cimbra, en sección
    [8.2, 13.0, (u) => { show('body', 'drum', 'centering'); renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)]; cam([0, 52, 0], 0, 0, 76, 150);
      count(G.centL, G.centN * ss(u / 0.5)); const x = ss((u - 0.62) / 0.16); count(G.xL, x <= 0 ? 0 : x < 0.5 ? 1 : 2);
      const a = ss((u - 0.3) / 0.2), p = proj([0, 70, 0]); text(p[0], p[1], 'TIMBER CENTERING', 'lab', 'middle', a); const q = proj([-36, 27.5, 0]), h = ss((u - 0.05) / 0.15); G.hL.visible = h > 0; text(q[0] + 12, q[1] + 8, '55 m', 'labr', 'start', h); text(64, 1600, 'SECTION', 'labs', 'start', 1); }],
    // 4 · el orfebre: la cúpula dibujada en el aire, sin nada debajo
    [13.0, 18.6, (u) => { show(...CITY, 'void', 'ghost'); const k = ss(u); cam([0, 64, 0], lerp(-28, -16, k), lerp(27, 25, k), lerp(64, 60, k)); count(G.ghostL, G.ghostN * ss((u - 0.08) / 0.6)); }],
    // 5 · dos cúpulas: la exterior se separa y deja ver la interior
    [18.6, 23.8, (u) => { show(...CITY, ...DOME, 'ringTop'); const k = ss(u), e = ss((u - 0.12) / 0.4); cam([3, 66, 2], lerp(30, 38, k), 26, lerp(56, 58, k)); G.ribOut[1].visible = e < 0.02;
      for (const s of [0, 1]) { const am = ang(s) + Math.PI / 8; G.outerSails[s].position.set(Math.cos(am) * 19 * e, 6 * e, Math.sin(am) * 19 * e); }
      const a = ss((u - 0.5) / 0.2); const p1 = proj(lerp3(corner(prof(1, 0.45)[0], prof(1, 0.45)[1], 1), corner(prof(1, 0.45)[0], prof(1, 0.45)[1], 2), 0.3)); lead(150, 1420, p1[0], p1[1], a); text(64, 1462, 'INNER SHELL', 'labr', 'start', a); text(64, 1494, 'carries the weight', 'lab', 'start', a);
      const am = ang(0) + Math.PI / 8, c0 = lerp3(corner(prof(3, 0.3)[0], prof(3, 0.3)[1], 0), corner(prof(3, 0.3)[0], prof(3, 0.3)[1], 1), 0.5), p2 = proj([c0[0] + Math.cos(am) * 19 * e, c0[1] + 6 * e, c0[2] + Math.sin(am) * 19 * e]); lead(880, 1500, p2[0], p2[1], a); text(1016, 1542, 'OUTER SHELL', 'labr', 'end', a); text(1016, 1574, 'keeps out the rain', 'lab', 'end', a); }],
    // 6 · el perfil: quinto acuto, en la sección por las aristas
    [23.8, 28.6, (u) => { show('body', 'drum', ...DOME, 'ringTop', 'quinto'); G.tileLines.forEach(l => { l.visible = false; }); renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(-NN[0], 0, -NN[2]), 0)]; cam([0, 62, 0], -22.5, 0, 62, 170);
      const s = ss((u - 0.06) / 0.2), a1 = ss((u - 0.22) / 0.3), a2 = ss((u - 0.5) / 0.25); count(G.semi, 24 * s); count(G.arcA, 60 * a1); count(G.arcB, 60 * a2);
      const ph = PHIA * (a1 < 1 ? a1 : 0.55), tip = PD(-E + RI * Math.cos(ph), YS + RI * Math.sin(ph)); G.radL.geometry.setPositions(new Float32Array([...PD(-E, YS), ...tip])); G.radL.visible = u > 0.2;
      const pc = proj(PD(-E, YS)), pm = proj(PD(-E + RI * 0.5 * Math.cos(ph), YS + RI * 0.5 * Math.sin(ph))), l = ss((u - 0.3) / 0.2); if (u > 0.2) SV += `<circle cx="${pc[0]}" cy="${pc[1]}" r="8" fill="${RED}"/>`;
      text(pm[0] + 16, pm[1] + 8, 'RADIUS = 4/5 OF THE SPAN', 'lab', 'start', l); const pb = proj(PD(4, YS + 3.2)); text(pb[0], pb[1], 'SPAN · 45.5 m · IN FIVE PARTS', 'lab', 'middle', ss(u / 0.1));
      const pr = proj(PD(DI / 2 * 0.72, YS + DI / 2 * 0.69)); text(pr[0] - 14, pr[1] + 30, 'ROUND', 'labs', 'end', s); const q = proj(PD(-34, 3)); text(64, 1600, 'SECTION THROUGH THE CORNERS', 'labs', 'start', 1); }],
    // 7 · el truco: la espina de pez, mientras sube la cáscara interior
    [28.6, 33.8, (u) => { show('drum', 'body', 'inner', 'ribsIn', 'fine', 'spines'); const yc = lerp(63.5, 68.5, u), k = ss(u), az = lerp(26, 33, k);
      renderer.clippingPlanes = [clipY(yc), new THREE.Plane(new THREE.Vector3(Math.sin(az * D2R), 0, Math.cos(az * D2R)), 3)]; cam(lerp3([10, 60.5, 16], [10, 63, 16], k), az, 13, 12.5, 150);
      const a = ss((u - 0.2) / 0.2), [r, y] = prof(1, 0.105, 0.08), p = proj(lerp3(corner(r, y, 0), corner(r, y, 1), 0.52)); lead(700, 1500, p[0], p[1], a, RED); text(1016, 1540, 'BRICKS SET ON EDGE', 'labr', 'end', a); text(1016, 1572, 'herringbone · spina di pesce', 'lab', 'end', a); }],
    // 8 · el cinturón: cuatro cadenas de piedra y una de madera
    [33.8, 38.8, (u) => { show(...CITY, 'inner', 'ribsIn', 'chains'); const k = ss(u); cam([0, 66, 0], lerp(-30, -20, k), 24, 58); const order = [0, 4, 1, 2, 3]; G.chain.forEach((m, i) => { m.visible = u > 0.06 + 0.09 * order.indexOf(i); });
      const a = ss((u - 0.5) / 0.2), [r1, y1] = prof(1, 0.34), p1 = proj(corner(r1 + 1.2, y1, 3)), [r2, y2] = prof(1, 0.185), p2 = proj(corner(r2 + 1.1, y2, 7));
      lead(170, 1440, p1[0], p1[1], a); text(64, 1482, '4 × SANDSTONE', 'lab', 'start', a); lead(905, 1440, p2[0], p2[1], a, RED); text(1016, 1482, '1 × CHESTNUT', 'labr', 'end', a);
      const pl = proj(corner(prof(1, 0.5)[0] + 13, prof(1, 0.5)[1], 3)), pr = proj(corner(prof(1, 0.5)[0] + 13, prof(1, 0.5)[1], 7)), b = ss((u - 0.3) / 0.2); arrow(pl[0] - 20, pl[1], pl[0] + 70, pl[1], b); arrow(pr[0] + 20, pr[1], pr[0] - 70, pr[1], b); }],
    // 9 · 1420–1436: las dos cáscaras suben a la vez, anillo a anillo
    [38.8, 43.8, (u) => { show(...CITY, ...DOME); const g = ss(u / 0.86), yc = lerp(YS + 0.4, YL + 0.2, g); renderer.clippingPlanes = [clipY(yc)]; G.ringTop.visible = g > 0.985; G.campanile.visible = false;
      const k = ss(u); cam([0, 66, 0], lerp(46, 30, k), lerp(30, 24, k), lerp(56, 60, k)); text(64, 1520, String(Math.round(lerp(1420, 1436, g))), 'dim', 'start', 1); }],
    // 10 · hoy: la linterna y la ciudad
    [43.8, 49.0, (u) => { show(...CITY, ...DOME, 'ringTop', 'lantern'); const g = ss(u / 0.22); renderer.clippingPlanes = g < 1 ? [clipY(lerp(YL, 118, g))] : []; const k = ss((u - 0.15) / 0.85);
      cam(lerp3([0, 66, 0], [-30, 30, 6], k), lerp(30, 50, k), lerp(24, 34, k), lerp(60, 150, k)); const a = ss((u - 0.1) / 0.1) * (1 - ss((u - 0.42) / 0.12)), p = proj([3.4, YL + 12, 0]); text(p[0] + 26, p[1], 'LANTERN · 1461', 'lab', 'start', a); }],
  ];
  const END = SC[SC.length - 1][1];
  window.renderAt = (t) => { t = clamp(t, 0, END - 1e-4); SV = ''; renderer.clippingPlanes = []; G.radL.visible = true;
    for (const [a, b, fn] of SC) if (t >= a && t < b) { fn((t - a) / (b - a), t); break; }
    svg.innerHTML = SV; ink.render(scene, camera); };
  window.view = (o) => { SV = ''; svg.innerHTML = ''; show(...(o.show || [...CITY, ...DOME, 'ringTop', 'lantern'])); renderer.clippingPlanes = (o.clip || []).map(c => new THREE.Plane(new THREE.Vector3(c[0], c[1], c[2]), c[3])); cam(o.tg || [0, 70, 0], o.az ?? 35, o.el ?? 30, o.z ?? 60); ink.render(scene, camera); };
  // portada: el templo y la cúpula sobre papel, sin la ciudad, con sitio arriba para el número y el título
  window.renderCover = () => { SV = ''; svg.innerHTML = ''; renderer.clippingPlanes = []; show('church', 'body', 'drum', ...DOME, 'ringTop', 'lantern'); cam([4, 75, 0], 40, 27, 80, 430); ink.render(scene, camera); };
  window.READY = true;
}
