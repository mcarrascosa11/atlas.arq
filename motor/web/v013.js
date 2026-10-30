import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, upTri, merge, boxG, edgesOf, pointInRing, setFillOpacity, setLineOpacity } from './lib.js';
const $ = (id) => document.getElementById(id);
const LW = { A: 1.8, B: 1.0, C: 0.5 }; const INK = '#1A1B20', RED = '#E2401C';
const flatM = (c) => fillMat(c, { hatch: 0, side: 1, shade: 1 });
const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
const orient = (rings) => rings.map((r, i) => { const s = area(r); return (i === 0 ? s < 0 : s > 0) ? [...r].reverse() : r; });
function push3(P, B, T, y0, y1, a, b, c) { P.push(...a, ...b, ...c); B.push(y0, y0, y0); T.push(y1, y1, y1); }
function extrude(rings, y0, y1, A, E, o = {}) {
  const R = orient(rings);
  for (const r of R) for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], pr = r[(i - 1 + r.length) % r.length];
    push3(A.P, A.B, A.T, y0, y1, [a[0], y0, a[1]], [a[0], y1, a[1]], [b[0], y1, b[1]]); push3(A.P, A.B, A.T, y0, y1, [a[0], y0, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]]);
    E.push(a[0], y1, a[1], b[0], y1, b[1], a[0], y0 + 0.03, a[1], b[0], y0 + 0.03, b[1]);
    const e1 = [a[0] - pr[0], a[1] - pr[1]], e2 = [b[0] - a[0], b[1] - a[1]];
    if ((e1[0] * e2[0] + e1[1] * e2[1]) / ((Math.hypot(...e1) * Math.hypot(...e2)) || 1) < Math.cos((o.corner ?? 24) * Math.PI / 180)) E.push(a[0], y0, a[1], a[0], y1, a[1]);
  }
  const v2 = (r) => r.map(p => new THREE.Vector2(p[0], p[1])); const faces = THREE.ShapeUtils.triangulateShape(v2(R[0]), R.slice(1).map(v2)); const pts = R.flat();
  for (const f of faces) { const p = f.map(i => [pts[i][0], y1, pts[i][1]]); push3(A.P, A.B, A.T, y0, y1, ...upTri(p[0], p[1], p[2])); }
}
function addBox(A, E, x0, x1, y0, y1, z0, z1, edges = true) {
  const g = boxG(x0, x1, y0, y1, z0, z1), p = g.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) { A.P.push(p[i], p[i + 1], p[i + 2]); A.B.push(y0); A.T.push(y1); }
  if (edges) E.push(...edgesOf(g));
}
const withBT = (g, y0, y1) => { const n = g.index ? g.toNonIndexed() : g; const c = n.attributes.position.count;
  n.setAttribute('aBase', new THREE.Float32BufferAttribute(new Float32Array(c).fill(y0), 1)); n.setAttribute('aTop', new THREE.Float32BufferAttribute(new Float32Array(c).fill(y1), 1)); return n; };
const mk = () => ({ P: [], B: [], T: [] });
const mesh = (A, M) => new THREE.Mesh(geomFrom(A.P, A.B, A.T), M);

// 013 · ¿Una piscina que se llena con el mar? Piscina das Marés (Álvaro Siza, 1961–1966), Leça da Palmeira, Matosinhos.
// Datos: OpenStreetMap (edificios, costa, playa, rocas, calles, piscinas, casa de baños) y relieve AWS Terrain (Terrarium z15).
// Marco: x al este, z al sur, y en metros sobre el mar. C = centro de la piscina grande; A = eje de la costa (hacia el NO); N = normal hacia tierra.
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
  const D = await fetch('v013.json').then(r => r.json());
  const paperM = flatM('#F6F5F1'), inkM = flatM(INK), redM = fillMat(RED, { hatch: 0, side: 0.93, shade: 0.8 }), seaM = flatM('#DCE3E5'), poolM = flatM('#C9DCE0');
  const sandM = flatM('#F2EBDD'), roadM = flatM('#ECEAE4'), rockM = fillMat('#F2F0EB', { hatch: 0, side: 0.88, shade: 0.72 }), casaM = fillMat('#F7F6F2', { hatch: 0, side: 0.92, shade: 0.8 });
  const graniteM = fillMat('#EEE7DC', { hatch: 0, side: 0.9, shade: 0.78 }), bldM = fillMat('#F6F5F1', { hatch: 0, side: 0.94, shade: 0.86 }), floorM = flatM('#E9EDEC'), secInk = fillMat(INK, { hatch: 0, side: 1, shade: 1, double: true }), earthM = fillMat('#DDD8CE', { hatch: 0, side: 1, shade: 1, double: true });
  const A = D.coastAxis, N = D.nrm, C = D.C, S = D.sec;
  const side = (x, z) => (x - C[0]) * A[0] + (z - C[1]) * A[1];                 // > 0: detrás del corte (hacia el NO)
  const AX = D.grid.ax, HH = D.grid.h, nG = AX.length;
  const idx = (v) => { if (v <= AX[0]) return [0, 0]; if (v >= AX[nG - 1]) return [nG - 2, 1]; let lo = 0, hi = nG - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (AX[m] <= v) lo = m; else hi = m; } return [lo, (v - AX[lo]) / (AX[lo + 1] - AX[lo])]; };
  const hAt = (x, z) => { const [i, u] = idx(x), [j, v] = idx(z); return (1 - v) * ((1 - u) * HH[j][i] + u * HH[j][i + 1]) + v * ((1 - u) * HH[j + 1][i] + u * HH[j + 1][i + 1]); };
  const NEAR = new THREE.Group(), FAR = new THREE.Group(), WHOLE = new THREE.Group(), FARONLY = new THREE.Group(), SEC = new THREE.Group(); scene.add(NEAR, FAR, WHOLE, FARONLY, SEC);
  const grp = (far) => far ? FAR : NEAR;
  const poolsR = D.pools.map(p => p.r), inPool = (x, z) => poolsR.some(r => pointInRing([x, z], r));
  const tri = (ring, y, A2, yf) => { const v2 = ring.map(p => new THREE.Vector2(p[0], p[1])); let f; try { f = THREE.ShapeUtils.triangulateShape(v2, []); } catch (e) { return; }
    for (const t of f) { const p = t.map(i => [ring[i][0], yf ? yf(ring[i][0], ring[i][1]) : y, ring[i][1]]); push3(A2.P, A2.B, A2.T, -1, 30, ...upTri(p[0], p[1], p[2])); } };
  const triH = (o, holes, y, A2) => { const v2 = o.map(p => new THREE.Vector2(p[0], p[1])); const hv = (holes || []).map(h => h.map(p => new THREE.Vector2(p[0], p[1]))); let f; try { f = THREE.ShapeUtils.triangulateShape(v2, hv); } catch (e) { return; }
    const all = [...o, ...(holes || []).flat()]; for (const t of f) { const p = t.map(i => [all[i][0], y, all[i][1]]); push3(A2.P, A2.B, A2.T, -1, 30, ...upTri(p[0], p[1], p[2])); } };
  // ---------- relieve (rejilla estirada), con hueco en las piscinas; mitad cercana y lejana ----------
  { const An = mk(), Af = mk(), Rn = mk(), Rf = mk();
    for (let j = 0; j < nG - 1; j++) for (let i = 0; i < nG - 1; i++) { const x0 = AX[i], x1 = AX[i + 1], z0 = AX[j], z1 = AX[j + 1];
      if (inPool((x0 + x1) / 2, (z0 + z1) / 2)) continue;
      const p00 = [x0, HH[j][i], z0], p10 = [x1, HH[j][i + 1], z0], p01 = [x0, HH[j + 1][i], z1], p11 = [x1, HH[j + 1][i + 1], z1];
      const far = Math.min(side(x0, z0), side(x1, z0), side(x0, z1), side(x1, z1)) > 0, rk = (D.rh[j][i] + D.rh[j][i + 1] + D.rh[j + 1][i] + D.rh[j + 1][i + 1]) > 0.6;
      const T = rk ? (far ? Rf : Rn) : (far ? Af : An);
      push3(T.P, T.B, T.T, -1, 30, ...upTri(p00, p01, p11)); push3(T.P, T.B, T.T, -1, 30, ...upTri(p00, p11, p10)); }
    NEAR.add(mesh(An, paperM)); FAR.add(mesh(Af, paperM)); NEAR.add(mesh(Rn, graniteM)); FAR.add(mesh(Rf, graniteM));
    const En = [], Ef = []; for (const c of D.cont) for (let k = 0; k < c.l.length - 1; k++) { const a = c.l[k], b = c.l[k + 1]; ((side((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) > 0) ? Ef : En).push(a[0], c.h + 0.06, a[1], b[0], c.h + 0.06, b[1]); }
    NEAR.add(segs(En, lineMat('#BDB5A8', 0.5))); FAR.add(segs(Ef, lineMat('#BDB5A8', 0.5))); }
  // ---------- playa, calles y avenida ----------
  { const An = mk(), Af = mk(); for (const r of D.beach) { const cx = r.reduce((m, p) => m + p[0], 0) / r.length, cz = r.reduce((m, p) => m + p[1], 0) / r.length; tri(r, 0, side(cx, cz) > 0 ? Af : An, (x, z) => hAt(x, z) + 0.05); }
    NEAR.add(mesh(An, sandM)); FAR.add(mesh(Af, sandM));
    const Ln = [], Lf = [], Rn = mk(), Rf = mk(), Bn = [], Bf = [];
    for (const r of D.roads) { const L = r.l;
      if (r.n === 'Avenida da Liberdade') { for (let k = 0; k < L.length - 1; k++) { const a = L[k], b = L[k + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * r.w / 2, nz = dx / l * r.w / 2;
          const q = [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]].map(p => [p[0], hAt(p[0], p[1]) + 0.14, p[1]]); const far = side((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) > 0;
          const T = far ? Rf : Rn; push3(T.P, T.B, T.T, -1, 30, ...upTri(q[0], q[1], q[2])); push3(T.P, T.B, T.T, -1, 30, ...upTri(q[0], q[2], q[3]));
          (far ? Bf : Bn).push(...q[0], ...q[1], ...q[3], ...q[2]); } continue; }
      for (let k = 0; k < L.length - 1; k++) { const a = L[k], b = L[k + 1]; ((side((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) > 0) ? Lf : Ln).push(a[0], hAt(a[0], a[1]) + 0.1, a[1], b[0], hAt(b[0], b[1]) + 0.1, b[1]); } }
    NEAR.add(segs(Ln, lineMat('#BDB9AF', 0.45))); FAR.add(segs(Lf, lineMat('#BDB9AF', 0.45))); NEAR.add(mesh(Rn, roadM)); FAR.add(mesh(Rf, roadM)); NEAR.add(segs(Bn, lineMat('#8F8B82', 0.7))); FAR.add(segs(Bf, lineMat('#8F8B82', 0.7))); }
  // ---------- edificios de Leça ----------
  { const An = mk(), Af = mk(), En = [], Ef = []; for (const b of D.blds) { const cx = b.r.reduce((m, p) => m + p[0], 0) / b.r.length, cz = b.r.reduce((m, p) => m + p[1], 0) / b.r.length; const far = side(cx, cz) > 0;
      extrude([b.r], b.b - 0.5, b.b + b.h, far ? Af : An, far ? Ef : En, { corner: 30 }); }
    NEAR.add(mesh(An, bldM)); FAR.add(mesh(Af, bldM)); NEAR.add(segs(En, lineMat('#9C998F', 0.5))); FAR.add(segs(Ef, lineMat('#9C998F', 0.5))); }
  // ---------- rocas: bolos facetados ----------
  { const gn = [], gf = []; let sd = 7; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (const [x, z, s, h, rot] of D.rocks) { if (inPool(x, z)) continue; const g = new THREE.IcosahedronGeometry(1, 0).toNonIndexed(); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.8 + rr() * 0.4), p.getY(i) * (0.8 + rr() * 0.4), p.getZ(i) * (0.8 + rr() * 0.4));
      const y0 = hAt(x, z); g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y0 + h * 0.28, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rot, 0)), new THREE.Vector3(s, h, s * 0.85)));
      (side(x, z) > 0 ? gf : gn).push(withBT(g, y0 - 1, y0 + h)); }
    for (const [L, G] of [[gn, NEAR], [gf, FAR]]) if (L.length) { const m = merge(L); G.add(new THREE.Mesh(m, rockM)); G.add(segs(edgesOf(m, 22), lineMat(INK, 0.5))); } }
  // ---------- mar con marea y olas ----------
  const SEA = new THREE.Group(); WHOLE.add(SEA); const SEAF = new THREE.Group(); FARONLY.add(SEAF);
  { const As = mk(); for (const r of D.sea) tri(r, 0, As); SEA.add(mesh(As, seaM)); const Af = mk(); for (const q of D.seaFar) triH(q.o, q.h, 0, Af); SEAF.add(mesh(Af, seaM)); }
  const WAVES = new THREE.Group(); scene.add(WAVES); const WSP = 9;
  { const E = []; for (let d = -300; d <= -6; d += WSP) for (let u = -520; u < 520; u += 8) { const a = [C[0] + A[0] * u + N[0] * d, C[1] + A[1] * u + N[1] * d], b = [C[0] + A[0] * (u + 5.5) + N[0] * d, C[1] + A[1] * (u + 5.5) + N[1] * d]; E.push(a[0], 0.06, a[1], b[0], 0.06, b[1]); }
    WAVES.add(segs(E, lineMat('#AFC0C5', 0.6))); }
  // ---------- piscinas, muros y casa de baños ----------
  const WL = 2.0, PF = S.floor; const POOLS = new THREE.Group(); WHOLE.add(POOLS); const POOLSF = new THREE.Group(); FARONLY.add(POOLSF); const WATER = [], WALLS = [];
  for (const pp of D.pools) { const Aw = mk(), Ew = []; extrude([pp.out, pp.r], PF, 2.3, Aw, Ew, { corner: 18 }); const w = mesh(Aw, casaM), l = segs(Ew, lineMat(INK, LW.B)); POOLS.add(w, l); WALLS.push(w);
    const Af = mk(); tri(pp.r, PF + 0.02, Af); POOLS.add(mesh(Af, floorM)); const Aq = mk(); tri(pp.r, 0, Aq); const wm = mesh(Aq, poolM); POOLS.add(wm); WATER.push(wm);
    for (const q of pp.bandFar) { const Ab = mk(), Eb = []; extrude([q.o, ...q.h], PF, 2.3, Ab, Eb, { corner: 18 }); POOLSF.add(mesh(Ab, casaM), segs(Eb, lineMat(INK, LW.B))); }
    for (const q of pp.waterFar) { const Aq2 = mk(); triH(q.o, q.h, 0, Aq2); const wm2 = mesh(Aq2, poolM); POOLSF.add(wm2); WATER.push(wm2); } }
  const MUROS = new THREE.Group(); scene.add(MUROS);
  { const An = mk(), Af = mk(), En = [], Ef = []; for (const [a, b] of D.muros) { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * 0.35, nz = dx / l * 0.35;
      const ring = [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]]; const y0 = Math.min(hAt(a[0], a[1]), hAt(b[0], b[1])) - 0.6; const far = side((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) > 0;
      extrude([ring], y0, Math.max(y0 + 1.8, 2.0), far ? Af : An, far ? Ef : En, { corner: 30 }); }
    const mn = mesh(An, casaM), mf = mesh(Af, casaM), MN = new THREE.Group(); MN.add(mn, segs(En, lineMat(INK, LW.B))); MUROS.add(MN, mf, segs(Ef, lineMat(INK, LW.B))); MUROS.userData = { MN }; WALLS.push(mn, mf); }
  const CASA = new THREE.Group(); WHOLE.add(CASA); const CASAF = new THREE.Group(); FARONLY.add(CASAF);
  // vestuarios: muros de hormigón y cubiertas de cobre de poca pendiente (bajan hacia el mar), unos 2 m por debajo de la avenida
  const CR = D.casaRoof, roofM = fillMat('#BAC3BB', { hatch: 0, side: 0.9, shade: 0.76 });
  const roofY = (x, z) => { const sv = (x - CR.O[0]) * CR.M[0] + (z - CR.O[1]) * CR.M[1]; return CR.lo + (CR.hi - CR.lo) * Math.min(1, Math.max(0, (sv - CR.tSea) / (CR.tIn - CR.tSea))); };
  const casaBuild = (ring, holes, G) => { const Aw = mk(), E = [];
    for (const r of [ring, ...(holes || [])]) for (let k = 0; k < r.length; k++) { const a = r[k], b = r[(k + 1) % r.length], ya = roofY(a[0], a[1]), yb = roofY(b[0], b[1]);
      const p0 = [a[0], S.casa0, a[1]], p1 = [a[0], ya, a[1]], p2 = [b[0], yb, b[1]], p3 = [b[0], S.casa0, b[1]];
      push3(Aw.P, Aw.B, Aw.T, S.casa0, 9.5, p0, p1, p2); push3(Aw.P, Aw.B, Aw.T, S.casa0, 9.5, p0, p2, p3); push3(Aw.P, Aw.B, Aw.T, S.casa0, 9.5, p0, p2, p1); push3(Aw.P, Aw.B, Aw.T, S.casa0, 9.5, p0, p3, p2);
      E.push(...p1, ...p2, ...p0, ...p3, ...p0, ...p1); }
    const Ar = mk(), v2 = ring.map(p => new THREE.Vector2(p[0], p[1])), hv = (holes || []).map(h => h.map(p => new THREE.Vector2(p[0], p[1]))), all = [ring, ...(holes || [])].flat(); let f = [];
    try { f = THREE.ShapeUtils.triangulateShape(v2, hv); } catch (e) { }
    for (const t of f) { const p = t.map(i => [all[i][0], roofY(all[i][0], all[i][1]) + 0.02, all[i][1]]); push3(Ar.P, Ar.B, Ar.T, 8, 9.5, ...upTri(p[0], p[1], p[2])); }
    G.add(mesh(Aw, casaM), mesh(Ar, roofM), segs(E, lineMat(INK, LW.B))); };
  casaBuild(D.casa, [], CASA); for (const q of D.casaFar) casaBuild(q.o, q.h, CASAF);
  // muro a 45º que protege la terraza del bar del viento del norte
  { const [a, b] = D.muro45, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), nx = -dz / l * 0.2, nz = dx / l * 0.2; const Am = mk(), Em = [];
    extrude([[[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]]], 3.0, S.casa0 + 2.0, Am, Em, { corner: 30 });
    const far = side((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) > 0; CASA.add(mesh(Am, casaM), segs(Em, lineMat(INK, LW.B))); if (far) CASAF.add(mesh(Am, casaM), segs(Em, lineMat(INK, LW.B))); }
  // terraza de la casa de baños, a la cota del suelo de los vestuarios
  { const At = mk(), Et = []; if (D.terr.length > 2) { extrude([D.terr], 3.0, S.casa0, At, Et, { corner: 25 }); CASA.add(mesh(At, casaM), segs(Et, lineMat(INK, LW.C))); }
    for (const q of D.terrFar) { const A2 = mk(), E2 = []; extrude([q.o, ...q.h], 3.0, S.casa0, A2, E2, { corner: 25 }); CASAF.add(mesh(A2, casaM), segs(E2, lineMat(INK, LW.C))); } }
  // en discontinuas: lo que todavía no existe (antes de 1961)
  const ghostL = lineMat('#8E8B84', 1.0); ghostL.dashed = true; ghostL.dashSize = 0.9; ghostL.gapSize = 0.7; const GHOST = new THREE.Group(); scene.add(GHOST);
  { const E = []; const ring = (r, y) => { for (let k = 0; k < r.length; k++) { const a = r[k], b = r[(k + 1) % r.length]; E.push(a[0], y, a[1], b[0], y, b[1]); } };
    for (const pp of D.pools) { ring(pp.r, 2.0); ring(pp.out, 2.0); } ring(D.casa, S.casa1); ring(D.casa, S.casa0); for (const p of D.casa) E.push(p[0], S.casa0, p[1], p[0], S.casa1, p[1]); GHOST.add(segs(E, ghostL)); }
  // ---------- gente: bañistas, gente en las terrazas y paseando por la avenida ----------
  const manG = (() => { const c = new THREE.CylinderGeometry(0.24, 0.24, 1.3, 8); c.translate(0, 0.65, 0); const h = new THREE.SphereGeometry(0.24, 8, 6); h.translate(0, 1.55, 0); return merge([c.toNonIndexed(), h.toNonIndexed()]); })();
  const pplM = flatM(RED); const PPL = []; let s2 = 13; const rn = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
  const inside = (r, n, cb) => { let xs = r.map(p => p[0]), zs = r.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs); let k = 0;
    while (n > 0 && k < 4000) { k++; const x = x0 + rn() * (x1 - x0), z = z0 + rn() * (z1 - z0); if (pointInRing([x, z], r)) { cb(x, z); n--; } } };
  D.pools.forEach((pp, k) => inside(pp.r, k === 0 ? 46 : 16, (x, z) => { const m = new THREE.Mesh(manG, pplM); scene.add(m); PPL.push({ m, x, z, kind: 'swim', a: rn(), ph: rn() * 6 }); }));
  inside(D.complejo, 60, (x, z) => { if (inPool(x, z) || pointInRing([x, z], D.casa)) return; const m = new THREE.Mesh(manG, pplM); scene.add(m); PPL.push({ m, x, z, kind: 'land', a: rn(), ph: rn() * 6 }); });
  { const av = D.roads.filter(r => r.n === 'Avenida da Liberdade'); for (let k = 0; k < 70; k++) { const r = av[Math.floor(rn() * av.length)]; const L = r.l, i = Math.floor(rn() * (L.length - 1)), a = L[i], b = L[i + 1], f = rn();
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, off = -(r.w / 2 + 1.6); const x = a[0] + dx * f - dz / l * off * (rn() < 0.5 ? 1 : -1), z = a[1] + dz * f + dx / l * off * (rn() < 0.5 ? 1 : -1);
      const m = new THREE.Mesh(manG, pplM); scene.add(m); PPL.push({ m, x, z, kind: 'walk', a: rn(), ph: rn() * 6, dx: dx / l, dz: dz / l, sp: (rn() - 0.5) * 2.4 }); } }
  // ---------- la sección dibujada sobre el plano de corte ----------
  const P3 = (t, y) => [C[0] + N[0] * t - A[0] * 0.08, y, C[1] + N[1] * t - A[1] * 0.08];
  { const poly = (pts, A2) => { const v2 = pts.map(p => new THREE.Vector2(p[0], p[1])); let f; try { f = THREE.ShapeUtils.triangulateShape(v2, []); } catch (e) { return; }
      for (const t of f) { const q = t.map(i => P3(pts[i][0], pts[i][1])); push3(A2.P, A2.B, A2.T, -30, 30, q[0], q[1], q[2]); push3(A2.P, A2.B, A2.T, -30, 30, q[0], q[2], q[1]); } };
    const top = S.poly.slice(0, S.poly.length - 2); const Ak = mk(), Ag = mk();
    const quad = (A2, a, b, c, d) => { const q = [a, b, c, d].map(p => P3(p[0], p[1])); push3(A2.P, A2.B, A2.T, -30, 30, q[0], q[1], q[2]); push3(A2.P, A2.B, A2.T, -30, 30, q[0], q[2], q[3]); push3(A2.P, A2.B, A2.T, -30, 30, q[0], q[2], q[1]); push3(A2.P, A2.B, A2.T, -30, 30, q[0], q[3], q[2]); };
    for (let k = 0; k < top.length - 1; k++) { const a = top[k], b = top[k + 1];
      quad(Ak, a, b, [b[0], b[1] - 0.9], [a[0], a[1] - 0.9]);                                              // línea de terreno cortada
      quad(Ag, [a[0], a[1] - 0.9], [b[0], b[1] - 0.9], [b[0], -5], [a[0], -5]); }                         // tierra
    for (const [t0, t1, y0, y1] of S.rects) poly([[t0, y0], [t1, y0], [t1, y1], [t0, y1]], Ak);
    if (S.roof) poly(S.roof, Ak);
    SEC.add(mesh(Ak, secInk)); const gm = mesh(Ag, earthM); gm.position.set(-A[0] * 0.03, 0, -A[1] * 0.03); SEC.add(gm);
    const Aw = mk(); const seaTop = 0.45; const sw = S.poly.filter(p => p[0] <= S.pa); poly([...sw.map(p => [p[0], p[1]]).reverse(), [sw[0][0], seaTop], [S.pa, seaTop]].reverse(), Aw);
    poly([[S.pa, S.floor], [S.pb, S.floor], [S.pb, WL], [S.pa, WL]], Aw); const wm = mesh(Aw, poolM); wm.position.set(-A[0] * 0.02, 0, -A[1] * 0.02); SEC.add(wm);
    const yv = S.avy + 0.15;
    const sl = lineMat(RED, 2.2); sl.dashed = true; sl.dashSize = 1.4; sl.gapSize = 1.0; const a = P3(S.av0 - 1.2, yv + 1.55), b = P3(-150, yv + 1.55); SEC.add(segs([...a, ...b], sl));
    const m = new THREE.Mesh(manG, pplM); m.position.set(...P3(S.av0 - 1.0, yv)); SEC.add(m); SEC.userData = { yv }; }
  // muro de contención de la avenida y rampa de entrada: se baja entre muros desde la acera hasta el suelo de los vestuarios
  const CD = D.corr, atB = (u, t, y) => [CR.O[0] + CR.B[0] * u + CR.M[0] * t, y, CR.O[1] + CR.B[1] * u + CR.M[1] * t];
  const ENT = new THREE.Group(); scene.add(ENT);
  { const Aw = mk(), Ew = [], Ar = mk(), Er = []; const t0 = CD.tIn + 3.2, t1 = t0 + 0.45;
    const ring = [[CD.uS - 2, t0], [CD.uN + 2, t0], [CD.uN + 2, t1], [CD.uS - 2, t1]].map(([u, t]) => { const p = atB(u, t, 0); return [p[0], p[2]]; });
    extrude([ring], S.casa0 - 0.4, 8.95, Aw, Ew, { corner: 30 });
    const uA = CD.uN - 1.5, uB = CD.uN - 22, ta = CD.tIn + 0.1, tb = CD.tIn + 3.15;
    const q = [atB(uA, ta, 8.75), atB(uA, tb, 8.75), atB(uB, tb, S.casa0 + 0.02), atB(uB, ta, S.casa0 + 0.02)];
    push3(Ar.P, Ar.B, Ar.T, 6, 9, ...upTri(q[0], q[1], q[2])); push3(Ar.P, Ar.B, Ar.T, 6, 9, ...upTri(q[0], q[2], q[3])); Er.push(...q[0], ...q[1], ...q[1], ...q[2], ...q[2], ...q[3], ...q[3], ...q[0]);
    for (let k = 1; k < 14; k++) { const f = k / 14, a = [uA + (uB - uA) * f, ta], b = [uA + (uB - uA) * f, tb], y = 8.75 + (S.casa0 - 8.75) * f; Er.push(...atB(a[0], a[1], y + 0.01), ...atB(b[0], b[1], y + 0.01)); }
    const fl = [atB(uB, ta, S.casa0 + 0.02), atB(uB, tb, S.casa0 + 0.02), atB(CD.uS - 1, tb, S.casa0 + 0.02), atB(CD.uS - 1, ta, S.casa0 + 0.02)];
    push3(Ar.P, Ar.B, Ar.T, 6, 9, ...upTri(fl[0], fl[1], fl[2])); push3(Ar.P, Ar.B, Ar.T, 6, 9, ...upTri(fl[0], fl[2], fl[3]));
    ENT.add(mesh(Aw, casaM), segs(Ew, lineMat(INK, LW.B)), mesh(Ar, flatM('#F3F1EA')), segs(Er, lineMat('#9C998F', 0.6)));
    for (const f of [0.15, 0.32, 0.47, 0.66, 0.84]) { const u = uA + (uB - uA) * f, t = ta + 0.9 + (f * 7 % 1.3), y = 8.75 + (S.casa0 - 8.75) * f; const m = new THREE.Mesh(manG, pplM); m.position.set(...atB(u, t, y)); ENT.add(m); } }
  // el agua: se toma del mar, se trata en la casa y llega a la piscina (esquema)
  const pipeL = lineMat(RED, 3.0); pipeL.dashed = true; pipeL.dashSize = 1.6; pipeL.gapSize = 1.1; const PIPE = new THREE.Group(); scene.add(PIPE);
  { const p0 = [C[0] - N[0] * 22 + A[0] * 6, 0.9, C[1] - N[1] * 22 + A[1] * 6], p1 = atB(CD.uS + 8, CD.tSea - 0.5, S.casa0 + 0.6), p2 = [C[0] + N[0] * 4, 2.3, C[1] + N[1] * 4];
    const pts = []; const pathPts = [p0, [ (p0[0] + p1[0]) / 2, 3.2, (p0[2] + p1[2]) / 2 ], p1, [ (p1[0] + p2[0]) / 2, 4.0, (p1[2] + p2[2]) / 2 ], p2];
    for (let k = 0; k < pathPts.length - 1; k++) pts.push(...pathPts[k], ...pathPts[k + 1]);
    const L = segs(pts, pipeL); PIPE.add(L); }
  scene.traverse(o => { o.frustumCulled = false; });
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u, fw = (t, a, b, f = 0.3) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
  const P2 = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
  window.shot = (o) => {
    const t = o.t ?? 0, ph = o.ph ?? {};
    const sec = (ph.sec ?? 0) > 0.5; NEAR.visible = !sec; WHOLE.visible = !sec; FARONLY.visible = sec; SEC.visible = sec; FAR.visible = true;
    const tide = 0.45 + 0.22 * Math.sin(t * 0.7); SEA.position.y = tide; SEAF.position.y = tide; WAVES.position.set(-N[0] * ((t * 2.2) % WSP), tide, -N[1] * ((t * 2.2) % WSP)); WAVES.visible = !sec;
    const site = ph.site ?? 1, wl = ph.walls ?? 1, red = ph.red ?? 0;
    POOLS.visible = !sec && wl > 0.01; POOLSF.visible = sec; MUROS.visible = wl > 0.01; CASA.visible = !sec && site > 0.5; CASAF.visible = sec;
    MUROS.scale.y = Math.max(0.001, smr(wl)); POOLS.children.forEach(c => { if (WALLS.includes(c)) c.scale.y = Math.max(0.001, smr(wl)); });
    for (const w of WALLS) w.material = red > 0.5 ? redM : casaM; MUROS.userData.MN.visible = !sec;
    const wf = ph.water ?? 1; for (const w of WATER) { w.visible = wf > 0.02; w.position.y = PF + (WL - PF) * smr(wf); }
    const gh = ph.ghost ?? 0; GHOST.visible = gh > 0.02; setLineOpacity(ghostL, gh);
    const pp = ph.pipe ?? 0; PIPE.visible = pp > 0.02; setLineOpacity(pipeL, pp); pipeL.dashOffset = -t * 2.4; ENT.visible = !sec || true;
    const pe = ph.people ?? 1; PPL.forEach((p, k) => { let on = pe > p.a; if (sec && side(p.x, p.z) <= 0) on = false; if (p.kind === 'swim' && wf < 0.95) on = false; p.m.visible = on; if (!on) return;
      if (p.kind === 'swim') p.m.position.set(p.x + Math.sin(t * 0.6 + p.ph) * 0.8, WL - 1.32 + Math.sin(t * 2 + p.ph) * 0.05, p.z + Math.cos(t * 0.5 + p.ph) * 0.8);
      else if (p.kind === 'walk') { const d = p.sp * (t - 20); p.m.position.set(p.x + p.dx * d, hAt(p.x + p.dx * d, p.z + p.dz * d) + 0.1, p.z + p.dz * d); }
      else p.m.position.set(p.x, hAt(p.x, p.z), p.z); });
    CTXV(o.ctx ?? true);
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, tg = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 9000; camera.position.set(tg[0] + Math.sin(az) * Math.cos(el) * d, tg[1] + Math.sin(el) * d, tg[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    $('kicker').textContent = o.kick ?? '013'; $('title').textContent = o.title || ''; $('title').style.opacity = o.titleOp ?? (o.title ? 1 : 0); $('sub').style.opacity = 0;
    const svg = $('ov'); svg.innerHTML = '';
    for (const [txt, p, op0, cls] of (o.labels || [])) { const q = P2(p); const half = txt.length * 9 + 30; const op = op0 * clamp(Math.min(q[0] - half, W - half - q[0], q[1] - 420, H - 460 - q[1]) / 60); if (op < 0.02) continue; svg.insertAdjacentHTML('beforeend', `<text class="${cls || 'maplab'}" x="${q[0]}" y="${q[1]}" text-anchor="middle" opacity="${op}">${txt}</text>`); }
    for (const [a, b, op, txt] of (o.dims || [])) { if (op < 0.02) continue; const p = P2(a), q = P2(b); svg.insertAdjacentHTML('beforeend', `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#E2401C" stroke-width="3" opacity="${op}"/><circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#E2401C" opacity="${op}"/><circle cx="${q[0]}" cy="${q[1]}" r="5" fill="#E2401C" opacity="${op}"/><text class="dim" x="${(p[0] + q[0]) / 2 + 52}" y="${(p[1] + q[1]) / 2}" opacity="${op}">${txt}</text>`); }
    return true;
  };
  function CTXV(v) { }
  // ================= línea de tiempo (50 s) =================
  const azOf = (dx, dz) => Math.atan2(dx, dz) * 180 / Math.PI;
  const at = (t, y, u = 0) => [C[0] + N[0] * t + A[0] * u, y, C[1] + N[1] * t + A[1] * u];
  const HOOKV = azOf(-N[0] * 0.55 - A[0] * 0.83, -N[1] * 0.55 - A[1] * 0.83), SECF = azOf(-A[0], -A[1]), PLANV = azOf(-A[0], -A[1] + 1e-4), LANDV = azOf(N[0] * 0.8 - A[0] * 0.6, N[1] * 0.8 - A[1] * 0.6);
  const CORRV = azOf(CR.B[0], CR.B[1]), REVV = azOf(CR.M[0] * 0.8 + CR.B[0] * 0.6, CR.M[1] * 0.8 + CR.B[1] * 0.6), SEAV = HOOKV;
  const K = [
    { t: 0.0, tg: at(16, 5, 8), z: 64, az: HOOKV, el: 38 },
    { t: 3.6, tg: at(10, 4, 4), z: 56, az: HOOKV + 6, el: 42 },
    { t: 8.0, tg: at(8, 3, 2), z: 52, az: HOOKV + 10, el: 46 },
    { t: 9.6, tg: at(26, 0, 22), z: 82, az: PLANV, el: 89.4 },
    { t: 13.6, tg: at(28, 0, 20), z: 78, az: PLANV, el: 89.4 },
    { t: 15.0, tg: at(80, 7, 0), z: 30, az: SECF, el: 4 },
    { t: 21.6, tg: at(-6, 5, 0), z: 30, az: SECF, el: 4 },
    { t: 23.0, tg: atB(CD.uN - 10, CD.tIn + 1.6, 7.6), z: 17, az: CORRV, el: 40 },
    { t: 25.2, tg: atB(CD.uN - 20, CD.tIn + 1.0, 7.0), z: 18, az: CORRV + 10, el: 34 },
    { t: 27.6, tg: at(-6, 2, 2), z: 46, az: REVV, el: 24 },
    { t: 28.8, tg: at(4, 3, 0), z: 52, az: HOOKV + 22, el: 46 },
    { t: 33.8, tg: at(6, 3, 2), z: 48, az: HOOKV + 28, el: 44 },
    { t: 35.4, tg: at(30, 6, 0), z: 46, az: LANDV, el: 28 },
    { t: 39.8, tg: at(24, 6, 6), z: 50, az: LANDV + 8, el: 30 },
    { t: 46.5, tg: at(260, 0, 0), z: 560, az: HOOKV + 10, el: 40 },
    { t: 50.0, tg: at(300, 0, 0), z: 620, az: HOOKV + 14, el: 42 } ];
  for (let i = 1; i < K.length; i++) { while (K[i].az - K[i - 1].az > 180) K[i].az -= 360; while (K[i].az - K[i - 1].az < -180) K[i].az += 360; }
  const words = [[0.25, 3.4, '¿Una piscina que se llena con el mar?'], [3.8, 8.0, '1961: un arquitecto de 26 años solo añade muros.'], [8.4, 13.8, 'De la avenida al mar, bajando.'],
    [14.2, 17.8, 'Los vestuarios, 2 m por debajo de la calle.'], [18.0, 21.8, 'Y el mar, siempre a la vista.'], [22.4, 25.4, 'Entras entre muros…'], [25.6, 27.9, '…y aparece el mar.'],
    [28.4, 33.8, '¿La llena la marea? No: el agua se bombea y se trata.'], [34.4, 39.8, '1966: abre. 2011: Monumento Nacional.'], [40.4, 47.0, '¿Arquitectura o paisaje?']];
  const kick = (t) => t < 3.6 ? '013 · PISCINA DAS MARÉS · LEÇA DA PALMEIRA' : t < 8.2 ? '013 · ÁLVARO SIZA · 1961 – 1966' : t < 14.0 ? '013 · PLANTA' : t < 22.2 ? '013 · SECCIÓN' :
    t < 28.2 ? '013 · LA ENTRADA' : t < 34.2 ? '013 · AGUA DE MAR TRATADA' : t < 40.2 ? '013 · MATOSINHOS, PORTUGAL' : '013 · RESTAURADA ENTRE 2019 Y 2021';
  window.renderAt = (tt) => {
    let i = 1; while (i < K.length - 1 && K[i].t < tt) i++; const a = K[i - 1], b = K[i]; const u = smr(seg(tt, a.t, b.t));
    let tw = '', to = 0; for (const [a0, b0, tx] of words) { const f = fw(tt, a0, b0, 0.22); if (f > 0) { tw = tx; to = f; } }
    const ph = { site: 1, walls: tt < 3.7 ? 1 : tt < 8.6 ? 0.25 + 0.75 * smr(seg(tt, 3.9, 6.6)) : 1, red: tt > 3.7 && tt < 14.0 ? 1 : 0, water: 1, ghost: 0, people: 1,
      sec: tt > 14.6 && tt < 22.2 ? 1 : 0, pipe: fw(tt, 28.6, 34.0, 0.5) };
    const labels = [], dims = [];
    const fl = fw(tt, 15.0, 22.0, 0.3); if (fl > 0) { const L5 = [['AVENIDA', 91, 11.6], ['VESTUARIOS', 54, 11.2], ['PLATAFORMA', 43, 8.6], ['ROCAS', 24, 5.4], ['PISCINA', 2, 4.0], ['MAR', -24, 3.0]];
      for (const [tx, t0, y] of L5) labels.push([tx, at(t0, y, -0.1), fl]); }
    const fp = fw(tt, 9.8, 13.8, 0.3); if (fp > 0) labels.push(['AVENIDA', at(92, 9, 40), fp], ['VESTUARIOS', at(60, 10, 30), fp], ['BAR', at(44, 8, 60), fp], ['ROCAS', at(22, 4, -14), fp], ['PISCINA', at(1, 3, 0), fp], ['NIÑOS', at(30, 3, -30), fp]);
    const fs = fw(tt, 41.0, 50.0, 0.4); if (fs > 0) labels.push(['OCÉANO ATLÁNTICO', at(-170, 0, -40), fs], ['LEÇA DA PALMEIRA', at(380, 20, 60), fs]);
    return window.shot({ t: tt, tg: a.tg.map((v, j) => lerp(v, b.tg[j], u)), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), az: lerp(a.az, b.az, u), el: lerp(a.el, b.el, u),
      ph, labels, dims, title: tw, titleOp: to, kick: kick(tt) });
  };
  window.renderCover = () => { document.body.classList.add('cover');
    return window.shot({ t: 20, tg: at(4, 30, 0), z: 54, az: SEAV + 4, el: 34, ph: {}, kick: '', title: '' }); };
  window.B13 = { at, azOf, A, N, C, S };
  window.READY = true;
}

