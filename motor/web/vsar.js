import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, upTri, merge, pointInRing, setLineOpacity, inset, prism } from './lib.js';
const $ = (id) => document.getElementById(id);
const INK = '#1A1B20', RED = '#E2401C';
const flatM = (c) => fillMat(c, { hatch: 0, side: 1, shade: 1 });
const mk = () => ({ P: [], B: [], T: [] });
const mesh = (A, M) => new THREE.Mesh(geomFrom(A.P, A.B, A.T), M);
const frac = (x) => x - Math.floor(x);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u, fw = (t, a, b, f = 0.4) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
const orient = (rings) => rings.map((r, i) => { const s = area(r); return (i === 0 ? s < 0 : s > 0) ? [...r].reverse() : r; });
function push3(P, B, T, y0, y1, a, b, c) { P.push(...a, ...b, ...c); B.push(y0, y0, y0); T.push(y1, y1, y1); }
function band(rings, y0, y1, A, E) {   // anillo (o polígono) extruido de y0 a y1
  const R = orient(rings);
  for (const r of R) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length];
    push3(A.P, A.B, A.T, y0, y1, [a[0], y0, a[1]], [a[0], y1, a[1]], [b[0], y1, b[1]]); push3(A.P, A.B, A.T, y0, y1, [a[0], y0, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]]);
    E.push(a[0], y1, a[1], b[0], y1, b[1]); }
  const v2 = (r) => r.map(p => new THREE.Vector2(p[0], p[1])); const faces = THREE.ShapeUtils.triangulateShape(v2(R[0]), R.slice(1).map(v2)); const pts = R.flat();
  for (const f of faces) { const p = f.map(i => [pts[i][0], y1, pts[i][1]]); push3(A.P, A.B, A.T, y0, y1, ...upTri(p[0], p[1], p[2])); }
}
// 015 · Sarnago (Tierras Altas, Soria). Relieve y edificios: maqueta de 1960 del TFM (Rhino). Usos de 1955, estado de 2019, familias y lazos:
// planos del TFG «Sarnago: radiografía dinámica de lugares sociales» (2019). El Refugio: proyecto de la Asociación (presentación de 2022 y proyecto visado de 2024).
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
  const D = await fetch('vsar.json').then(r => r.json()), G3 = await fetch('vsar3d.json').then(r => r.json());
  const GR = G3.grid; const hAt = (x, z) => { const fx = (x - GR.x0) / GR.d, fz = (z - GR.z0) / GR.d; const i = Math.max(0, Math.min(GR.nx - 2, Math.floor(fx))), j = Math.max(0, Math.min(GR.nz - 2, Math.floor(fz)));
    const u = clamp(fx - i), v = clamp(fz - j), h = (a, b) => GR.h[b * GR.nx + a]; return (1 - v) * ((1 - u) * h(i, j) + u * h(i + 1, j)) + v * ((1 - u) * h(i, j + 1) + u * h(i + 1, j + 1)); };
  const groundM = fillMat('#F4F3EE', { hatch: 0, side: 1, shade: 0.9, double: true }), paperM = fillMat('#F7F6F2', { hatch: 0, side: 0.9, shade: 0.76 }), redM = fillMat(RED, { hatch: 0, side: 0.9, shade: 0.78 });
  groundM.polygonOffset = true; groundM.polygonOffsetFactor = 2; groundM.polygonOffsetUnits = 2;
  const ok = (x, z) => { const i = Math.round((x - GR.x0) / GR.d), j = Math.round((z - GR.z0) / GR.d); return i >= 0 && j >= 0 && i < GR.nx && j < GR.nz && GR.v[j * GR.nx + i] === 1; };
  const barnM = fillMat('#EEEAE0', { hatch: 0, side: 0.9, shade: 0.78 }), pubM = fillMat('#E4E1D8', { hatch: 0, side: 0.9, shade: 0.76 }), treeM = flatM('#E3E6D9');
  // ---------- relieve: malla del terreno y curvas cada metro ----------
  { const P = G3.ter, A = mk(); for (let k = 0; k < P.length; k += 9) push3(A.P, A.B, A.T, 0, 60, ...upTri([P[k], P[k + 1] - 0.04, P[k + 2]], [P[k + 3], P[k + 4] - 0.04, P[k + 5]], [P[k + 6], P[k + 7] - 0.04, P[k + 8]])); scene.add(mesh(A, groundM));
    const E = []; for (const c of G3.cont) for (let i = 0; i < c.l.length - 1; i++) E.push(c.l[i][0], c.h + 0.05, c.l[i][1], c.l[i + 1][0], c.h + 0.05, c.l[i + 1][1]); scene.add(segs(E, lineMat('#D3CCBF', 0.5))); }
  // ---------- caminos, lindes y árboles de cada época, sobre el relieve ----------
  const Y55 = new THREE.Group(), Y19 = new THREE.Group(); scene.add(Y55, Y19);
  const drape = (L, dy, E) => { for (let i = 0; i < L.length - 1; i++) if (ok(L[i][0], L[i][1]) && ok(L[i + 1][0], L[i + 1][1])) E.push(L[i][0], hAt(L[i][0], L[i][1]) + dy, L[i][1], L[i + 1][0], hAt(L[i + 1][0], L[i + 1][1]) + dy, L[i + 1][1]); };
  for (const [k, G] of [['1955', Y55], ['2019', Y19]]) {
    const E = []; for (const L of D.caminos[k]) drape(L, 0.3, E); G.add(segs(E, lineMat('#A9A49A', 0.8)));
    const F = []; for (const L of D.tierras[k]) drape(L, 0.25, F); G.add(segs(F, lineMat('#CFC9BC', 0.5)));
    const T = mk(), Et = []; for (const [x, z, r] of D.arboles[k]) { if (!ok(x, z)) continue; const y = hAt(x, z) + 0.35, n = 10; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; const p0 = [x, y, z], p1 = [x + Math.cos(a) * r, y, z + Math.sin(a) * r], p2 = [x + Math.cos(b) * r, y, z + Math.sin(b) * r];
      push3(T.P, T.B, T.T, 0, 60, ...upTri(p0, p1, p2)); Et.push(...p1, ...p2); } }
    G.add(mesh(T, treeM), segs(Et, lineMat('#B9BFAE', 0.5))); }
  // ---------- edificios de la maqueta de 1960 (cubiertas con su pendiente real), cada pieza con su edificio del plano ----------
  const famIn = (r) => D.fam.some(([x, z]) => pointInRing([x, z], r));
  const cen = D.blds.map(b => [b.r.reduce((s, p) => s + p[0], 0) / b.r.length, b.r.reduce((s, p) => s + p[1], 0) / b.r.length]);
  const PCS = G3.pieces.map((pc, i) => { const P = pc.tri, A = mk(); let sx = 0, sz = 0; for (let k = 0; k < P.length; k += 9) { push3(A.P, A.B, A.T, pc.y0, pc.y0 + 9, [P[k], P[k + 1], P[k + 2]], [P[k + 3], P[k + 4], P[k + 5]], [P[k + 6], P[k + 7], P[k + 8]]); sx += P[k]; sz += P[k + 2]; }
    const n = P.length / 9, cx = sx / n, cz = sz / n; let b = pc.b; if (b < 0) { let bd = 9; cen.forEach((c, j) => { const d = Math.hypot(c[0] - cx, c[1] - cz); if (d < bd) { bd = d; b = j; } }); }
    const bl = b >= 0 ? D.blds[b] : null, u = bl ? bl.u55 : 'otro', base = u === 'publico' ? pubM : (u === 'viv' || u === 'vivdes') ? paperM : barnM;
    const m = mesh(A, base), e = segs(pc.e, lineMat(INK, 0.8)), g = new THREE.Group(); g.add(m, e); scene.add(g); let m2 = null;
    if (pc.f && pc.f.length >= 3) { const tmin = Math.min(...pc.f.map(p => hAt(p[0], p[1])), hAt(cx, cz)); if (tmin < pc.y0 - 0.05) { const Ab = mk(), Eb = []; band([pc.f], tmin - 0.5, pc.y0 + 0.02, Ab, Eb); m2 = mesh(Ab, base); g.add(m2); } }
    return { g, m, m2, base, b, bl, lit55: bl ? (famIn(bl.r) || u === 'viv') : false, s19: bl ? bl.s19 : 'desaparece', ord: frac(Math.sin(i * 12.9898) * 43758.5453), cx, cz }; });
  // ruinas de 2019: muros bajos sobre la huella; edificios nuevos de 2019 con la pendiente media de las cubiertas de la maqueta
  const RUINS = new THREE.Group(); scene.add(RUINS); const stoneM = fillMat('#E9E3D6', { hatch: 0, side: 0.88, shade: 0.74, double: true });
  D.blds.forEach((b) => { if (b.s19 !== 'ruina') return; const y0 = Math.min(...b.r.map(p => hAt(p[0], p[1]))) - 0.3; const inner = inset(b.r, 0.55); if (!inner) return; const A = mk(), E = []; band([b.r, inner], y0, y0 + 1.9, A, E); RUINS.add(mesh(A, stoneM), segs(E, lineMat(INK, 0.7))); });
  const NEW = new THREE.Group(); scene.add(NEW); const tanR = Math.tan(G3.roofDeg * Math.PI / 180);
  for (const r of D.new19) { const y0 = Math.min(...r.map(p => hAt(p[0], p[1]))) - 0.2; const A = mk(), E = []; const xs = r.map(p => p[0]), zs = r.map(p => p[1]); const s = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    prism(r, y0, y0 + 5.2, Math.min(3, s / 2 * tanR), A.P, A.B, A.T, E, { hip: s / 2 - 0.05 }); NEW.add(mesh(A, paperM), segs(E, lineMat(INK, 0.8))); }
  // ---------- familias de 1955 ----------
  const manG = (() => { const c = new THREE.CylinderGeometry(0.42, 0.42, 1.9, 8); c.translate(0, 0.95, 0); const h = new THREE.SphereGeometry(0.42, 8, 6); h.translate(0, 2.25, 0); return merge([c.toNonIndexed(), h.toNonIndexed()]); })();
  const PPL = [];
  const famL = lineMat(RED, 2.0), FAM = new THREE.Group(); scene.add(FAM);
  if (false) { const E = []; for (const [x, z, r] of D.fam) { const y = hAt(x, z) + 0.4, n = 28; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2; E.push(x + Math.cos(a) * r, y, z + Math.sin(a) * r, x + Math.cos(b) * r, y, z + Math.sin(b) * r); } } FAM.add(segs(E, famL)); }
  const lazL = lineMat(RED, 2.2), LAZ = new THREE.Group(); scene.add(LAZ);
  { const E = []; for (const L of [...D.lazos.hijos, ...D.lazos.hermanos]) { const n = L.length, len = Math.hypot(L[n - 1][0] - L[0][0], L[n - 1][1] - L[0][1]), hh = 4 + Math.min(14, len * 0.12), yb = Math.max(hAt(...L[0]), hAt(...L[n - 1])) + 7.5;
      for (let i = 0; i < n - 1; i++) E.push(L[i][0], yb + Math.sin(Math.PI * i / (n - 1)) * hh, L[i][1], L[i + 1][0], yb + Math.sin(Math.PI * (i + 1) / (n - 1)) * hh, L[i + 1][1]); } LAZ.add(segs(E, lazL)); }
  // ---------- 2019: la asociación que vuelve y las casas ocupadas ----------
  const occL = lineMat(RED, 2.4), OCC = new THREE.Group(); scene.add(OCC);
  const RINGS = D.occ19.map(([x, z, r], i) => { const E = [], n = 32; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, b = (k + 1) / n * Math.PI * 2; E.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(b) * r, 0, Math.sin(b) * r); }
    const s = segs(E, occL); const ang = i * 2.399; return { s, x, z, y: hAt(x, z) + 0.6, fx: x + Math.cos(ang) * 380, fz: z + Math.sin(ang) * 380 }; });
  const occIn = (q) => D.occ19.some(([x, z, r]) => Math.hypot(q.cx - x, q.cz - z) < r + 2) || q.s19 === 'viv';
  // el camino (el trazado más largo que sale del pueblo)
  const ROAD = new THREE.Group(); scene.add(ROAD); const roadL = lineMat(RED, 4.0);
  { const L = [...D.caminos['2019']].sort((a, b) => { const len = (q) => q.reduce((s, p, i) => i ? s + Math.hypot(p[0] - q[i - 1][0], p[1] - q[i - 1][1]) : 0, 0); return len(b) - len(a); })[0]; const E = []; drape(L, 0.4, E); ROAD.add(segs(E, roadL)); }
  // ---------- El Refugio: parcela de la calle Real (153 m², 14 m de frente), planta baja + primera, cubierta a un agua, porche y chaflán ----------
  const RF = (() => { const A = [-53.4, -11.3], B = [-60.8, 0.7], C = [-68.3, -5.4], Dd = [-61.2, -16.2]; const k = 3.0 / Math.hypot(B[0] - A[0], B[1] - A[1]), k2 = 3.0 / Math.hypot(Dd[0] - A[0], Dd[1] - A[1]);
    return { A1: [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k], A2: [A[0] + (Dd[0] - A[0]) * k2, A[1] + (Dd[1] - A[1]) * k2], A, B, C, D: Dd }; })();
  const F = [RF.A1, RF.B, RF.C, RF.D, RF.A2], Fy = Math.min(...F.map(p => hAt(p[0], p[1]))) + 0.1;
  const ab = [RF.B[0] - RF.A[0], RF.B[1] - RF.A[1]], abL = Math.hypot(...ab), abU = [ab[0] / abL, ab[1] / abL];
  const roofH = (p) => Fy + 7.0 - 1.8 * clamp(((p[0] - RF.A[0]) * abU[0] + (p[1] - RF.A[1]) * abU[1]) / abL);
  const REF = new THREE.Group(); scene.add(REF); const woolM = fillMat(RED, { hatch: 0, side: 0.9, shade: 0.8, double: true }), woodM = fillMat('#E8D9BC', { hatch: 0, side: 0.9, shade: 0.8, double: true });
  const F1 = inset(F, 0.5), F2 = inset(F, 0.85), F3 = inset(F, 1.0);
  const mkBand = (outer, hole, y0, y1, M, lw = 0.8, col = INK) => { const A = mk(), E = []; band([outer, hole], y0, y1, A, E); const g = new THREE.Group(); g.add(mesh(A, M), segs(E, lineMat(col, lw))); return g; };
  const RUIN = mkBand(F, F1, Fy - 0.3, Fy + 1.6, stoneM); REF.add(RUIN);
  const LEV = []; for (let k = 0; k < 11; k++) { const g = mkBand(F, F1, Fy + k * 0.5, Fy + (k + 1) * 0.5, stoneM, 0.6); REF.add(g); LEV.push(g); }     // hiladas hasta 5,5 m
  const WOOL = []; for (let k = 0; k < 11; k++) { const g = mkBand(F1, F2, Fy + k * 0.5, Fy + (k + 1) * 0.5, woolM, 0.5, '#8A2410'); REF.add(g); WOOL.push(g); }
  const WOOD = mkBand(F2, F3, Fy, Fy + 5.5, woodM, 0.6); REF.add(WOOD);
  const TOP = new THREE.Group(); REF.add(TOP);                                                          // remate de muros hasta la cubierta inclinada, cubierta, porche y huecos
  { const A = mk(), E = []; for (let i = 0; i < F.length; i++) { const a = F[i], b = F[(i + 1) % F.length], p0 = [a[0], Fy + 5.5, a[1]], p1 = [a[0], roofH(a), a[1]], p2 = [b[0], roofH(b), b[1]], p3 = [b[0], Fy + 5.5, b[1]];
      push3(A.P, A.B, A.T, Fy, Fy + 7, p0, p1, p2); push3(A.P, A.B, A.T, Fy, Fy + 7, p0, p2, p3); E.push(...p1, ...p2, ...p0, ...p1); }
    TOP.add(mesh(A, stoneM), segs(E, lineMat(INK, 0.9)));
    const Fc = F.reduce((s, p) => [s[0] + p[0] / F.length, s[1] + p[1] / F.length], [0, 0]), Frr = F.reduce((s, p) => s + Math.hypot(p[0] - Fc[0], p[1] - Fc[1]), 0) / F.length, Fs = 1 + 0.35 / Frr;
    const Rf = F.map(p => [Fc[0] + (p[0] - Fc[0]) * Fs, Fc[1] + (p[1] - Fc[1]) * Fs]), Ar = mk(), Er = [], v2 = Rf.map(p => new THREE.Vector2(p[0], p[1])); for (const f of THREE.ShapeUtils.triangulateShape(v2, [])) { const p = f.map(i => [Rf[i][0], roofH(Rf[i]) + 0.3, Rf[i][1]]); push3(Ar.P, Ar.B, Ar.T, Fy, Fy + 8, ...upTri(p[0], p[1], p[2])); }
    for (let i = 0; i < Rf.length; i++) { const a = Rf[i], b = Rf[(i + 1) % Rf.length]; Er.push(a[0], roofH(a) + 0.3, a[1], b[0], roofH(b) + 0.3, b[1], a[0], roofH(a) + 0.12, a[1], b[0], roofH(b) + 0.12, b[1]); }
    TOP.add(mesh(Ar, fillMat('#CFCBC2', { hatch: 0, side: 0.9, shade: 0.8, double: true })), segs(Er, lineMat(INK, 1.0)));
    // porche de teja a lo largo de la fachada de la calle (de B hacia el chaflán)
    const nrm = [abU[1], -abU[0]], out = (() => { const c = F.reduce((s, p) => [s[0] + p[0] / F.length, s[1] + p[1] / F.length], [0, 0]); const m = [(RF.A1[0] + RF.B[0]) / 2 - c[0], (RF.A1[1] + RF.B[1]) / 2 - c[1]]; return (m[0] * nrm[0] + m[1] * nrm[1]) > 0 ? nrm : [-nrm[0], -nrm[1]]; })();
    const pA = [RF.B[0] - abU[0] * 0.2, RF.B[1] - abU[1] * 0.2], pB = [RF.A1[0] + abU[0] * 1.5, RF.A1[1] + abU[1] * 1.5], d = 1.8;
    const q = [[pA[0], Fy + 3.2, pA[1]], [pB[0], Fy + 3.2, pB[1]], [pB[0] + out[0] * d, Fy + 2.75, pB[1] + out[1] * d], [pA[0] + out[0] * d, Fy + 2.75, pA[1] + out[1] * d]];
    const Ap = mk(), Ep = []; push3(Ap.P, Ap.B, Ap.T, Fy, Fy + 4, ...upTri(q[0], q[1], q[2])); push3(Ap.P, Ap.B, Ap.T, Fy, Fy + 4, ...upTri(q[0], q[2], q[3])); Ep.push(...q[0], ...q[1], ...q[1], ...q[2], ...q[2], ...q[3], ...q[3], ...q[0]);
    for (let k = 1; k < 18; k++) { const f = k / 18, a = [q[0][0] + (q[1][0] - q[0][0]) * f, q[0][2] + (q[1][2] - q[0][2]) * f]; Ep.push(a[0], Fy + 3.21, a[1], a[0] + out[0] * d, Fy + 2.76, a[1] + out[1] * d); }
    for (const p of [q[2], q[3]]) Ep.push(p[0], Fy, p[2], p[0], p[1], p[2]);
    TOP.add(mesh(Ap, fillMat('#D9B9A7', { hatch: 0, side: 1, shade: 1 })), segs(Ep, lineMat(INK, 0.8)));
    // huecos: cuatro ventanas con contraventanas de madera en la primera planta y dos ventanas y la puerta en la baja, más una por planta en el chaflán
    const Aw = mk(), Ew = [], Aws = mk(); const hole = (p, w, y0, y1, sh) => { const c0 = [p[0] - abU[0] * w / 2 + out[0] * 0.04, p[1] - abU[1] * w / 2 + out[1] * 0.04], c1 = [p[0] + abU[0] * w / 2 + out[0] * 0.04, p[1] + abU[1] * w / 2 + out[1] * 0.04];
      const r = [[c0[0], y0, c0[1]], [c1[0], y0, c1[1]], [c1[0], y1, c1[1]], [c0[0], y1, c0[1]]]; push3(Aw.P, Aw.B, Aw.T, Fy, Fy + 7, r[0], r[1], r[2]); push3(Aw.P, Aw.B, Aw.T, Fy, Fy + 7, r[0], r[2], r[3]); Ew.push(...r[0], ...r[1], ...r[1], ...r[2], ...r[2], ...r[3], ...r[3], ...r[0]);
      if (sh) for (const s of [-1, 1]) { const e0 = [p[0] + abU[0] * s * (w / 2 + 0.05) + out[0] * 0.06, p[1] + abU[1] * s * (w / 2 + 0.05) + out[1] * 0.06], e1 = [e0[0] + abU[0] * s * w * 0.5, e0[1] + abU[1] * s * w * 0.5];
        const r2 = [[e0[0], y0, e0[1]], [e1[0], y0, e1[1]], [e1[0], y1, e1[1]], [e0[0], y1, e0[1]]]; push3(Aws.P, Aws.B, Aws.T, Fy, Fy + 7, r2[0], r2[1], r2[2]); push3(Aws.P, Aws.B, Aws.T, Fy, Fy + 7, r2[0], r2[2], r2[3]); Ew.push(...r2[0], ...r2[1], ...r2[1], ...r2[2], ...r2[2], ...r2[3], ...r2[3], ...r2[0]); } };
    const at = (f) => [RF.A1[0] + (RF.B[0] - RF.A1[0]) * f, RF.A1[1] + (RF.B[1] - RF.A1[1]) * f];
    for (const f of [0.18, 0.4, 0.62, 0.84]) hole(at(f), 0.9, Fy + 3.9, Fy + 5.2, true);
    for (const f of [0.3, 0.55]) hole(at(f), 1.3, Fy + 0.8, Fy + 2.3, false); hole(at(0.78), 1.1, Fy, Fy + 2.3, false);
    TOP.add(mesh(Aw, fillMat('#77736C', { hatch: 0, side: 1, shade: 1, double: true })), mesh(Aws, fillMat('#E8D9BC', { hatch: 0, side: 1, shade: 1, double: true })), segs(Ew, lineMat(INK, 0.7))); }
  scene.traverse(o => { o.frustumCulled = false; });
  const P2 = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
  // ---------- dibujo de un fotograma ----------
  window.shot = (o) => {
    const t = o.t ?? 0, ph = o.ph ?? {}; const y19 = ph.y19 ?? 0, lit = ph.lit ?? 0, gone = ph.gone ?? 0, dk = ph.dark ?? 0;
    Y55.visible = y19 < 0.5; Y19.visible = y19 >= 0.5; NEW.visible = y19 >= 0.5; RUINS.visible = y19 >= 0.5 || gone > 0.5;
    for (const q of PCS) { let vis = true, mat = q.base;
      if (q.lit55 && lit > q.ord) mat = redM;
      if (y19 >= 0.5 || gone > 0.5) { if (q.s19 === 'desaparece' || q.s19 === 'ruina') vis = false; if (y19 >= 0.5) mat = (ph.occ ?? 0) > q.ord * 0.8 && occIn(q) ? redM : q.base; }
      if (q.b === 30 && (ph.ref ?? -1) >= 0) vis = false;
      q.g.visible = vis; q.m.material = mat; if (q.m2) q.m2.material = mat; }
    const pe = ph.people ?? 0, leave = ph.leave ?? 0;
    for (const p of PPL) { const on = pe > p.d * 0.98 && leave < 0.15 + p.d * 0.85; p.m.visible = on; if (!on) continue; const k = clamp((leave - p.d * 0.6) / 0.4); const x = p.x + k * 240, z = p.z - k * 40; p.m.position.set(x, hAt(x, z), z); }
    FAM.visible = (ph.fam ?? 0) > 0.02; setLineOpacity(famL, ph.fam ?? 0); LAZ.visible = (ph.laz ?? 0) > 0.02; setLineOpacity(lazL, ph.laz ?? 0);
    const ar = ph.arrive ?? 0; OCC.visible = ar > 0.01; setLineOpacity(occL, Math.min(1, ar * 2)); for (const R of RINGS) { const k = smr(ar); R.s.position.set(R.fx + (R.x - R.fx) * k, R.y, R.fz + (R.z - R.fz) * k); }
    ROAD.visible = (ph.road ?? 0) > 0.02; setLineOpacity(roadL, ph.road ?? 0);
    const rs = ph.ref ?? -1; REF.visible = rs >= 0;
    if (rs >= 0) { RUIN.visible = rs < 0.12; const hS = Math.max(0, (rs - 0.12) / 0.6) * 11, hW = (ph.wool ?? 0) * 11, cut = ph.cut ? 8 : 99;
      LEV.forEach((g, k) => { g.visible = k < hS && k < cut; }); WOOL.forEach((g, k) => { g.visible = k < hW && k < cut; }); WOOD.visible = rs > 0.4; WOOD.scale.y = 1; TOP.visible = rs > 0.95 && !ph.cut; }
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, tg = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const dd = 9000; camera.position.set(tg[0] + Math.sin(az) * Math.cos(el) * dd, tg[1] + Math.sin(el) * dd, tg[2] + Math.cos(az) * Math.cos(el) * dd);
    camera.up.set(0, 1, 0); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    $('kicker').textContent = o.kick ?? '015'; $('title').textContent = o.title || ''; $('title').style.opacity = o.titleOp ?? (o.title ? 1 : 0); $('sub').style.opacity = 0;
    const svg = $('ov'); svg.innerHTML = '';
    for (const [txt, p, op] of (o.labels || [])) { if ((op ?? 1) < 0.02) continue; const q = P2(p); svg.insertAdjacentHTML('beforeend', `<text class="maplab" x="${q[0]}" y="${q[1]}" text-anchor="middle" opacity="${op ?? 1}">${txt}</text>`); }
    const mp = ph.map ?? 0; if (mp > 0.01) { const M = D.map, ln = ph.mapLines ?? 0; let s = `<rect x="0" y="0" width="1080" height="1920" fill="#F2F1EC" opacity="${mp}"/><g opacity="${mp}">`;
      s += `<path d="${M.portugal}" fill="#ECEAE3" stroke="#B9B4A8" stroke-width="2"/><path d="${M.france}" fill="#ECEAE3" stroke="#B9B4A8" stroke-width="2"/><path d="${M.spain}" fill="#F7F6F2" stroke="#1A1B20" stroke-width="3"/>`;
      const [sx, sy] = M.sarnago; M.cities.forEach(([n, x, y, k], i) => { const f = clamp(ln * M.cities.length - i); if (f <= 0) return; s += `<line x1="${sx}" y1="${sy}" x2="${sx + (x - sx) * f}" y2="${sy + (y - sy) * f}" stroke="#E2401C" stroke-width="2"/>`;
        if (f >= 1) { const r = 4.2 * Math.sqrt(k); s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#E2401C" stroke="#F2F1EC" stroke-width="2"/>`; if (['Tudela', 'Madrid', 'Barcelona', 'Cádiz', 'Zaragoza', 'Vitoria'].includes(n)) { const L = n === 'Barcelona'; s += `<text class="maplab" x="${L ? x : x + r + 10}" y="${L ? y + r + 36 : y + 9}" text-anchor="${L ? 'end' : 'start'}">${n.toUpperCase()} ${k}</text>`; } } });
      s += `<circle cx="${sx}" cy="${sy}" r="9" fill="#1A1B20"/><text class="maplab" x="${sx - 20}" y="${sy + 42}" text-anchor="end">SARNAGO</text>`;
      if (ln > 0.95) s += `<text class="maplab" x="540" y="1560" text-anchor="middle">y 305 más, en ciudades que el gráfico no rotula</text>`;
      svg.insertAdjacentHTML('beforeend', s + '</g>'); }
    return true;
  };
  // ================= línea de tiempo (60 s) =================
  const azOf = (dx, dz) => Math.atan2(dx, dz) * 180 / Math.PI;
  const OUTV = (() => { const nrm = [abU[1], -abU[0]], c = F.reduce((s, p) => [s[0] + p[0] / F.length, s[1] + p[1] / F.length], [0, 0]), m = [(RF.A1[0] + RF.B[0]) / 2 - c[0], (RF.A1[1] + RF.B[1]) / 2 - c[1]]; return (m[0] * nrm[0] + m[1] * nrm[1]) > 0 ? nrm : [-nrm[0], -nrm[1]]; })();
  const RAZ = azOf(OUTV[0] * 0.8 + 0.6 * OUTV[1], OUTV[1] * 0.8 - 0.6 * OUTV[0]), hV = hAt(-10, 0), RC = [-60.5, Fy + 3, -8];
  const V = (z, az, el, dx = 0, dz = 0, dy = 0) => ({ tg: [-10 + dx, hV + dy, 0 + dz], z, az, el });
  const K = [
    { t: 0.0, ...V(92, 186, 38) }, { t: 3.5, ...V(84, 198, 42, -4, -2) }, { t: 8.5, ...V(78, 212, 46, -8, -4, 4) }, { t: 12.5, ...V(88, 222, 42, 6, 2) },
    { t: 19.0, ...V(86, 236, 44, 4, 0) }, { t: 23.0, ...V(92, 220, 46) }, { t: 28.0, ...V(86, 206, 42, -6, 0) }, { t: 32.5, ...V(80, 196, 40, -10, -2) },
    { t: 36.0, ...V(80, 196, 40, -10, -2) }, { t: 41.0, ...V(80, 196, 40, -30, -4) },
    { t: 42.6, tg: RC, z: 28, az: RAZ, el: 30 }, { t: 48.6, tg: RC, z: 25, az: RAZ + 14, el: 28 }, { t: 49.6, tg: [RC[0], RC[1] - 1, RC[2]], z: 21, az: RAZ + 32, el: 38 },
    { t: 53.4, tg: [RC[0], RC[1] - 1, RC[2]], z: 21, az: RAZ + 40, el: 38 }, { t: 55.0, tg: RC, z: 25, az: RAZ, el: 26 }, { t: 60.0, tg: [RC[0] + 20, RC[1] - 2, RC[2] + 6], z: 60, az: RAZ - 18, el: 36 } ];
  for (let i = 1; i < K.length; i++) { while (K[i].az - K[i - 1].az > 180) K[i].az -= 360; while (K[i].az - K[i - 1].az < -180) K[i].az += 360; }
  const words = [[0.25, 3.3, 'En 1979 murió su último vecino.'], [3.6, 8.3, '1955: 228 vecinos y 53 casas habitadas.'], [8.6, 12.3, 'Cada arco une padres, hijos y hermanos.'],
    [12.6, 15.7, '1957, la pedregada. 1965, los pinos.'], [15.9, 18.8, 'Las familias se van.'], [19.1, 22.8, '23 de abril de 1979: muere el último vecino.'],
    [23.1, 27.8, '1980: los que se fueron fundan una asociación.'], [28.1, 30.3, 'En hacenderas arreglan calles, agua y luz.'], [30.4, 32.4, '2018: el camino asfaltado, tras 87 años.'],
    [32.6, 35.8, '2019: 26 casas arregladas.'], [36.1, 40.8, '640 personas siguen ligadas al pueblo.'], [41.1, 44.6, 'Ahora levantan El Refugio, un centro social.'],
    [44.8, 48.4, 'Piedra del lugar y madera de pino de Soria.'], [48.7, 53.2, 'Y lo abrigan con lana de oveja.'], [53.5, 56.6, 'Y ahora buscan financiación para seguir adelante.'], [56.8, 59.8, 'Ayúdalos: goteo.cc/jc']];
  const kick = (t) => t < 3.5 ? '015 · SARNAGO · TIERRAS ALTAS, SORIA' : t < 8.5 ? '015 · 1955' : t < 12.5 ? '015 · 1955 · FAMILIAS' : t < 19.0 ? '015 · 1957 – 1979' : t < 23.0 ? '015 · 1979' :
    t < 28.0 ? '015 · 1980' : t < 32.5 ? '015 · HACENDERAS' : t < 36.0 ? '015 · 2019' : t < 41.0 ? '015 · DÓNDE VIVEN' : t < 48.6 ? '015 · EL REFUGIO' : t < 53.4 ? '015 · ABRIGUEMOS EL REFUGIO' : '015 · GOTEO.CC/JC · @AASARNAGO';
  const Fc0 = F.reduce((s, p) => [s[0] + p[0] / F.length, s[1] + p[1] / F.length], [0, 0]);
  const LBL = (() => { const sm2 = (p, q, d, y) => [(p[0] + q[0]) / 2 + (((p[0] + q[0]) / 2) - Fc0[0]) * d, y, (p[1] + q[1]) / 2 + (((p[1] + q[1]) / 2) - Fc0[1]) * d];
    return [['PIEDRA DEL LUGAR', sm2(RF.B, RF.C, 0.55, Fy + 0.6)], ['LANA DE OVEJA', [RF.A1[0] + OUTV[0] * 1.5, Fy + 6.4, RF.A1[1] + OUTV[1] * 1.5]], ['MADERA', [Fc0[0], Fy + 6.0, Fc0[1]]]]; })();
  window.renderAt = (tt) => {
    let i = 1; while (i < K.length - 1 && K[i].t < tt) i++; const a = K[i - 1], b = K[i]; const u = smr(seg(tt, a.t, b.t));
    let tw = '', to = 0; for (const [a0, b0, tx] of words) { const f = fw(tt, a0, b0, 0.22); if (f > 0) { tw = tx; to = f; } }
    const y19 = tt >= 23.0 ? 1 : 0;
    const ph = { y19, lit: tt < 12.6 ? smr(seg(tt, 3.5, 4.8)) : 1 - smr(seg(tt, 12.8, 18.6)), laz: fw(tt, 8.6, 13.4, 0.5),
      gone: tt < 23 ? smr(seg(tt, 20.6, 22.8)) : 1, occ: tt < 41 ? smr(seg(tt, 23.4, 35.0)) : tt < 57.4 ? 1 - smr(seg(tt, 41.0, 42.4)) : smr(seg(tt, 57.4, 59.0)),
      map: fw(tt, 36.0, 41.0, 0.6), mapLines: smr(seg(tt, 36.6, 39.6)), road: 0,
      ref: tt >= 41.4 ? smr(seg(tt, 42.0, 47.6)) : -1, wool: smr(seg(tt, 49.0, 51.6)), cut: tt > 48.6 && tt < 53.5 ? 1 : 0 };
    if (tt >= 53.5) { ph.ref = 1; ph.wool = 1; ph.cut = 0; }
    const labels = []; const fl = fw(tt, 49.4, 53.2, 0.35); if (fl > 0) for (const [txt, p] of LBL) labels.push([txt, p, fl]);
    return window.shot({ t: tt, tg: a.tg.map((v, j) => lerp(v, b.tg[j], u)), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), az: lerp(a.az, b.az, u), el: lerp(a.el, b.el, u), ph, labels, title: tw, titleOp: to, kick: kick(tt) });
  };
  window.renderCover = () => { document.body.classList.add('cover'); return window.shot({ t: 0, tg: [-30, hV + 20, -2], z: 80, az: 200, el: 40, ph: { y19: 1, occ: 1, ref: 1, wool: 1 }, kick: '', title: '' }); };
  window.SAR = { hAt, RF, F, Fy, cen, OUT: (() => { const nrm = [abU[1], -abU[0]], c = F.reduce((s, p) => [s[0] + p[0] / F.length, s[1] + p[1] / F.length], [0, 0]), m = [(RF.A1[0] + RF.B[0]) / 2 - c[0], (RF.A1[1] + RF.B[1]) / 2 - c[1]]; return (m[0] * nrm[0] + m[1] * nrm[1]) > 0 ? nrm : [-nrm[0], -nrm[1]]; })() };
  window.READY = true;
}
