import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, upTri, merge, boxG, edgesOf } from './lib.js';
// 011 · ¿14 apóstoles en una cuneta? Arantzazu (Oñati): basílica de Sáenz de Oiza y Laorga (1950–1955), apostolado de Oteiza (1969).
// Terreno: teselas Terrarium (AWS) a zoom 15; carretera GI-3591 y edificios: OpenStreetMap. Basílica: planta publicada escalada a la huella de OSM
// (67,6 m) con las medidas publicadas: campanario 44 m + cruz de 6 m, nave 66 x 20 m y 20 m de altura, brazos de 33 m, apóstoles de 3 m.
// Alturas de torres de fachada, muro, friso y Piedad: por proporción en fotografía (aproximadas). Origen y = 0: plaza (cota 720 m).
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
// puntas de diamante: rejilla de pirámides de base cuadrada sobre una cara (origen o, ejes a lo ancho ua y en alto va, normal hacia fuera nn)
function pyramids(A, E, o, ua, va, nn, L, Hh, s = 1.0, d = 0.42) {
  const nu = Math.max(1, Math.round(L / s)), nv = Math.max(1, Math.round(Hh / s)), su = L / nu, sv = Hh / nv;
  const P = (a, b, c = 0) => [o[0] + ua[0] * a + va[0] * b + nn[0] * c, o[1] + ua[1] * a + va[1] * b + nn[1] * c, o[2] + ua[2] * a + va[2] * b + nn[2] * c];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const c00 = P(i * su, j * sv), c10 = P((i + 1) * su, j * sv), c11 = P((i + 1) * su, (j + 1) * sv), c01 = P(i * su, (j + 1) * sv), ap = P((i + 0.5) * su, (j + 0.5) * sv, d);
    for (const [p, q] of [[c00, c10], [c10, c11], [c11, c01], [c01, c00]]) { const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2 = [ap[0] - p[0], ap[1] - p[1], ap[2] - p[2]];
      const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const out = cr[0] * nn[0] + cr[1] * nn[1] + cr[2] * nn[2] >= 0; push3(A.P, A.B, A.T, -5, 50, ...(out ? [p, q, ap] : [p, ap, q])); }
    E.push(...ap, ...c00, ...ap, ...c11, ...ap, ...c10, ...ap, ...c01); }
  for (let i = 0; i <= nu; i++) E.push(...P(i * su, 0), ...P(i * su, Hh)); for (let j = 0; j <= nv; j++) E.push(...P(0, j * sv), ...P(L, j * sv));
}
// apóstol de Oteiza: la misma figura vaciada (pecho y piernas abiertos), con la cabeza y el brazo en otra posición en cada una
const HEADX = [0.10, -0.09, 0.13, 0.0, -0.13, 0.07, -0.05, 0.11, -0.11, 0.03, 0.13, -0.07, 0.01, -0.12];
function apostleShape(k, sc = 1) {
  const hx = HEADX[k % 14], ax = (k % 2 ? 1 : -1) * (0.06 + 0.04 * ((k * 7) % 3)), lean = ((k * 5) % 3 - 1) * 0.03, X = (x) => x * sc, Y = (y) => y * sc;
  const sh = new THREE.Shape();
  sh.moveTo(X(-0.40), 0); sh.lineTo(X(0.40), 0); sh.lineTo(X(0.43), Y(0.9));
  sh.quadraticCurveTo(X(0.47 + lean), Y(1.9), X(0.37), Y(2.42)); sh.quadraticCurveTo(X(0.24), Y(2.6), X(hx + 0.11), Y(2.6));
  sh.lineTo(X(hx + 0.09 + lean), Y(2.68)); sh.quadraticCurveTo(X(hx + 0.24 + lean), Y(2.74), X(hx + 0.19 + lean), Y(2.95));
  sh.quadraticCurveTo(X(hx + 0.04 + lean), Y(3.07), X(hx - 0.12 + lean), Y(2.97)); sh.quadraticCurveTo(X(hx - 0.21 + lean), Y(2.83), X(hx - 0.1 + lean), Y(2.68));
  sh.lineTo(X(hx - 0.11), Y(2.6)); sh.quadraticCurveTo(X(-0.29), Y(2.6), X(-0.38), Y(2.42)); sh.quadraticCurveTo(X(-0.47 + lean), Y(1.9), X(-0.43), Y(0.9)); sh.lineTo(X(-0.40), 0);
  const h1 = new THREE.Path(); h1.absellipse(X(ax), Y(1.93), X(0.12), Y(0.21), 0, Math.PI * 2, false);                  // hueco del pecho, entre el brazo y el cuerpo
  const h2 = new THREE.Path(); h2.moveTo(X(-0.09), Y(0.22)); h2.lineTo(X(0.09), Y(0.22)); h2.lineTo(X(0.09), Y(1.1)); h2.quadraticCurveTo(0, Y(1.32), X(-0.09), Y(1.1)); h2.lineTo(X(-0.09), Y(0.22));   // vaciado de las piernas
  sh.holes.push(h1, h2); return { sh, holes: [h1, h2] };
}
function apostleGeom(k, sc = 1) { const { sh } = apostleShape(k, sc); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.5 * sc, bevelEnabled: true, bevelThickness: 0.05 * sc, bevelSize: 0.035 * sc, bevelSegments: 2, curveSegments: 10 }); g.translate(0, 0, -0.25 * sc); return g; }
const mk = () => ({ P: [], B: [], T: [] });
const mesh = (A, M) => new THREE.Mesh(geomFrom(A.P, A.B, A.T), M);

export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
  const D = await fetch('v011.json').then(r => r.json());
  const CTX = new THREE.Group(); scene.add(CTX);   // terreno, carretera y edificios del entorno (se ocultan en la portada)
  const paperM = flatM('#F6F5F1'), groundM = fillMat('#EFEEE8', { hatch: 0, side: 0.97, shade: 0.9 }), roadM = flatM('#DDDAD2'), inkM = flatM(INK), redM = flatM(RED);
  const apM = fillMat(RED, { hatch: 0, side: 0.93, shade: 0.8 }), towerM = fillMat('#D3CFC5', { hatch: 0, side: 0.93, shade: 0.8 }), stoneM = fillMat('#B4B0A7', { hatch: 0, side: 0.92, shade: 0.78 }), blockM = fillMat('#C9C5BC', { hatch: 0, side: 0.93, shade: 0.8 });
  { const n = D.nx, S = D.S, R = D.R, Hh = D.H, A = mk();
    const V = (i, j) => [-R + j * S, Hh[i][j] - 0.05, -R + i * S];
    const BCx = D.bas.c, AXx = D.bas.ax, inStair = (x, z) => { const dx = x - BCx[0], dz = z - BCx[1], u = dx * AXx[0] + dz * AXx[1], v = -dx * AXx[1] + dz * AXx[0]; return u > -57 && u < -33 && v > -16 && v < 10; };
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) {
      const a = V(i, j), b = V(i, j + 1), c = V(i + 1, j + 1), d = V(i + 1, j);
      if (inStair((a[0] + c[0]) / 2, (a[2] + c[2]) / 2)) continue;
      push3(A.P, A.B, A.T, -300, 400, ...upTri(a, b, c)); push3(A.P, A.B, A.T, -300, 400, ...upTri(a, c, d)); }
    CTX.add(mesh(A, groundM));
    const Em = [], Ej = [];
    for (const c of D.contours) { const E = c.m ? Em : Ej; for (let k = 0; k < c.p.length - 1; k++) E.push(c.p[k][0], c.y + 0.1, c.p[k][1], c.p[k + 1][0], c.y + 0.1, c.p[k + 1][1]); }
    CTX.add(segs(Ej, lineMat('#CBC8C0', 0.6))); CTX.add(segs(Em, lineMat('#AEAAA1', 0.9))); }
  { const A = mk(), E = [];
    for (const r of D.roads) { const p = r.p, w = r.w / 2;
      for (let k = 0; k < p.length - 1; k++) { const a = p[k], b = p[k + 1]; const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1, nx = -dz / l * w, nz = dx / l * w;
        { const mx = (a[0] + b[0]) / 2 - D.bas.c[0], mz = (a[2] + b[2]) / 2 - D.bas.c[1], uu = mx * D.bas.ax[0] + mz * D.bas.ax[1], vv = -mx * D.bas.ax[1] + mz * D.bas.ax[0]; if (uu > -60 && uu < 30 && vv > -20 && vv < 22) continue; }   // nada de calzada sobre la plaza y la escalera
        const A0 = [a[0] + nx, a[1], a[2] + nz], A1 = [a[0] - nx, a[1], a[2] - nz], B0 = [b[0] + nx, b[1], b[2] + nz], B1 = [b[0] - nx, b[1], b[2] - nz];
        push3(A.P, A.B, A.T, -300, 400, ...upTri(A0, B0, B1)); push3(A.P, A.B, A.T, -300, 400, ...upTri(A0, B1, A1));
        if (r.w > 3) E.push(...A0, ...B0, ...A1, ...B1); } }
    CTX.add(mesh(A, roadM)); CTX.add(segs(E, lineMat('#8E8B84', 0.6))); }
  { const A = mk(), E = []; for (const b of D.blds) extrude([b.r], b.y0, b.y0 + b.h, A, E); CTX.add(mesh(A, paperM)); CTX.add(segs(E, lineMat(INK, LW.C))); }
  const BC = D.bas.c, AX = D.bas.ax, BG = new THREE.Group(); BG.position.set(BC[0], 0, BC[1]); BG.rotation.y = Math.atan2(-AX[1], AX[0]); scene.add(BG); BG.updateMatrixWorld();
  const Wp = (u, y, v) => new THREE.Vector3(u, y, v).applyMatrix4(BG.matrixWorld).toArray();
  { const A = mk(), E = [], At = mk(), Et = [], Ed = [], Ak = mk(), Ek = [];
    addBox(A, E, -33.4, -3.2, -5, 16, -11, 11);
    addBox(A, E, -3.2, 13.3, -5, 18, -16.4, 16.4);
    const ap = []; for (let k = 0; k <= 16; k++) { const f = -Math.PI / 2 + Math.PI * k / 16; ap.push([13.3 + 13.6 * Math.cos(f), 13.6 * Math.sin(f)]); }
    extrude([ap], -5, 16, A, E);
    addBox(A, E, -33.4, -5, -5, 4, -15, -11);
    addBox(A, E, -34.4, -33.4, -5, 19, -8, 8);
    for (let y = -4.45, r = 0; y < 19; y += 0.55, r++) { Ed.push(-34.43, y, -8, -34.43, y, 8); for (let v = -8 + (r % 2 ? 0.6 : 1.2); v < 8; v += 1.2) Ed.push(-34.43, y, v, -34.43, Math.min(19, y + 0.55), v); }
    for (const v of [-11.02, 11.02]) addBox(Ak, Ek, -32.5, -5.5, 12.2, 14.4, v - 0.02, v + 0.02, false);                  // banda de vidrio alta de la nave
    for (let u = -33.4; u < -3.2; u += 0.62) for (const v of [-11.03, 11.03]) Ed.push(u, -5, v, u, 12.2, v);
    addBox(A, E, -35.6, -34.4, -0.4, 0.6, -8, 8);
    addBox(A, E, -35.0, -34.4, 0.6, 13.8, -0.7, 0.7);
    Ed.push(-35.02, 0.6, -0.35, -35.02, 13.8, -0.35, -35.02, 0.6, 0.35, -35.02, 13.8, 0.35);
    addBox(A, E, -36.0, -34.4, 13.8, 14.2, -1.0, 1.0);
    for (const [v0, v1] of [[-7, -4.6], [-3.6, -1.2], [1.2, 3.6], [4.6, 7]]) addBox(Ak, Ek, -34.48, -34.42, -5, -1.2, v0, v1, true);
    for (const vs of [[-19, -8], [8, 19]]) addBox(At, Et, -40.6, -33.5, -5, 27, vs[0] + 0.1, vs[1] - 0.1);
    addBox(At, Et, -7.0, -1.2, 4, 48, -30.1, -24.3);
    const Ap = mk(), Ep = [];
    const tower = (u0, u1, v0, v1, y0, y1) => { const Hh = y1 - y0;
      pyramids(Ap, Ep, [u0, y0, v1], [0, 0, -1], [0, 1, 0], [-1, 0, 0], v1 - v0, Hh);   // cara oeste
      pyramids(Ap, Ep, [u1, y0, v0], [0, 0, 1], [0, 1, 0], [1, 0, 0], v1 - v0, Hh);    // cara este
      pyramids(Ap, Ep, [u0, y0, v0], [1, 0, 0], [0, 1, 0], [0, 0, -1], u1 - u0, Hh);   // cara norte
      pyramids(Ap, Ep, [u1, y0, v1], [-1, 0, 0], [0, 1, 0], [0, 0, 1], u1 - u0, Hh); }  // cara sur
    tower(-40.6, -33.5, -18.9, -8.1, -5, 27); tower(-40.6, -33.5, 8.1, 18.9, -5, 27); tower(-7.0, -1.2, -30.1, -24.3, 4, 41);
    BG.add(mesh(Ap, fillMat('#CFCBC1', { hatch: 0, side: 0.9, shade: 0.66 }))); BG.add(segs(Ep, lineMat('#4A4842', 0.5)));
    const diam = (u0, u1, y0, y1, v0, v1) => { const s = 1.25, o = 0.04, faces = [[u0 - o, 'v', v0, v1], [u1 + o, 'v', v0, v1], [v0 - o, 'u', u0, u1], [v1 + o, 'u', u0, u1]];
      for (const [c, ax, a0, a1] of faces) { const L = a1 - a0, Hh = y1 - y0;
        for (let k = -Math.ceil(Hh / s); k <= Math.ceil(L / s); k++) for (const sg of [1, -1]) {
          const p0 = [a0 + k * s, y0], p1 = [a0 + k * s + sg * Hh, y1];
          const lerp2 = (t) => [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
          const dx = p1[0] - p0[0]; const t1 = (a0 - p0[0]) / dx, t2 = (a1 - p0[0]) / dx; const ta = Math.max(0, Math.min(t1, t2)), tb = Math.min(1, Math.max(t1, t2));
          if (!(ta < tb)) continue;
          const q0 = lerp2(ta), q1 = lerp2(tb); const P3 = (q) => ax === 'v' ? [c, q[1], q[0]] : [q[0], q[1], c]; Ed.push(...P3(q0), ...P3(q1)); } } };
    for (const [c, ax] of [[-7.15, 'v'], [-1.05, 'v'], [-30.25, 'u'], [-24.15, 'u']]) for (const s0 of [0.9, 3.4]) {
      if (ax === 'v') addBox(Ak, Ek, c - 0.03, c + 0.03, 41.5, 46.5, -30.2 + s0, -30.2 + s0 + 1.7, false); else addBox(Ak, Ek, -7.1 + s0, -7.1 + s0 + 1.7, 41.5, 46.5, c - 0.03, c + 0.03, false); }
    Ed.push(-4.1, 48, -27.2, -4.1, 54, -27.2, -4.1, 52.4, -28.6, -4.1, 52.4, -25.8);
    const vN = (u) => -14 + 6 * (u + 54.3) / 13.6, vS = (u) => 7 + (u + 54.3) / 13.6, Nst = 20, du = 13.6 / Nst, dy = 5 / Nst;
    for (let i = 0; i < Nst; i++) { const u0 = -54.3 + i * du, u1 = u0 + du, y = -i * dy - dy;
      const ring = [[u0, vN(u0)], [u1, vN(u1)], [u1, vS(u1)], [u0, vS(u0)]]; extrude([ring], y - 0.02, y, A, E, { corner: 80 }); }
    addBox(A, E, -40.7, -34.4, -5.3, -5, -8, 8, true);
    for (const sideF of [vN, vS]) { const pts = []; for (let i = 0; i <= Nst; i++) { const u = -54.3 + i * du; pts.push([u, sideF(u)]); }
      for (let i = 0; i < Nst; i++) { const a = pts[i], b = pts[i + 1], y = -(i + 1) * dy; push3(A.P, A.B, A.T, -6, 0, [a[0], y, a[1]], [a[0], 0, a[1]], [b[0], 0, b[1]]); push3(A.P, A.B, A.T, -6, 0, [a[0], y, a[1]], [b[0], 0, b[1]], [b[0], y, b[1]]); E.push(a[0], 0, a[1], b[0], 0, b[1]); } }
    BG.add(mesh(A, fillMat('#F6F5F1', { hatch: 0, side: 0.95, shade: 0.86, double: true }))); BG.add(segs(E, lineMat(INK, LW.B)));
    BG.add(mesh(At, towerM)); BG.add(segs(Et, lineMat(INK, LW.B))); BG.add(segs(Ed, lineMat('#5F5C56', 0.55)));
    BG.add(mesh(Ak, inkM)); }
  const PIE = new THREE.Group(); BG.add(PIE);
  { const mg = withBT(apostleGeom(4, 0.72), 0, 3); const m = new THREE.Mesh(mg, stoneM); const me = segs(edgesOf(mg, 32), lineMat(INK, LW.C));
    const g1 = new THREE.Group(); g1.add(m, me); g1.position.set(-35.2, 14.2, 0); g1.rotation.y = -Math.PI / 2; PIE.add(g1);
    const cs = new THREE.Shape(); cs.moveTo(-0.95, 0); cs.quadraticCurveTo(-0.6, 0.22, 0, 0.2); cs.quadraticCurveTo(0.6, 0.24, 0.92, 0.34); cs.quadraticCurveTo(1.05, 0.2, 0.9, 0.04); cs.quadraticCurveTo(0, -0.1, -0.95, 0);
    const cg = withBT(new THREE.ExtrudeGeometry(cs, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 }), 0, 1); cg.translate(0, 0, -0.18);
    const g2 = new THREE.Group(); g2.add(new THREE.Mesh(cg, stoneM), segs(edgesOf(cg, 32), lineMat(INK, LW.C))); g2.position.set(-35.75, 15.15, 0); g2.rotation.y = -Math.PI / 2; g2.rotation.z = 0.12; PIE.add(g2); }
  const figG = (k, withCore) => { const g = new THREE.Group(); const geo = withBT(apostleGeom(k), 0, 3);
    g.add(new THREE.Mesh(geo, apM)); g.add(segs(edgesOf(geo, 32), lineMat(INK, LW.C)));   // los apóstoles, en bermellón
    if (withCore) { const { holes } = apostleShape(k); const A = mk();
      for (const h of holes) { const shp = new THREE.Shape(h.getPoints(16)); const gg = new THREE.ExtrudeGeometry(shp, { depth: 0.46, bevelEnabled: false }); gg.translate(0, 0, -0.23); const n = withBT(gg, 0, 3); const p = n.attributes.position.array; for (let i = 0; i < p.length; i += 3) { A.P.push(p[i], p[i + 1], p[i + 2]); A.B.push(0); A.T.push(3); } }
      const core = mesh(A, blockM); core.name = 'core'; g.add(core); }   // la piedra que se quita, en gris
    return g; };
  const blockG = () => { const g = new THREE.Group(), A = mk(), E = []; addBox(A, E, -0.45, 0.45, 0, 3.0, -0.3, 0.3); g.add(mesh(A, blockM)); g.add(segs(E, lineMat(INK, LW.B))); return g; };
  const CN = D.cuneta; const roadDir = (() => { let best = null; for (const r of D.roads) for (let k = 0; k < r.p.length - 1; k++) { const a = r.p[k], d = Math.hypot(a[0] - CN[0], a[2] - CN[2]); if (r.w > 5 && (!best || d < best.d)) best = { d, dx: r.p[k + 1][0] - a[0], dz: r.p[k + 1][2] - a[2] }; } const l = Math.hypot(best.dx, best.dz); return [best.dx / l, best.dz / l]; })();
  const ry = (x, z) => { let best = null; for (const r of D.roads) if (r.w > 5) for (const q of r.p) { const d = Math.hypot(q[0] - x, q[2] - z); if (!best || d < best.d) best = { d, y: q[1] }; } return best.y; };
  let side = [-roadDir[1], roadDir[0]];
  const terrainY = (x, z) => { const S = D.S, R = D.R, n = D.nx; const fj = (x + R) / S, fi = (z + R) / S; const i = Math.min(n - 2, Math.max(0, Math.floor(fi))), j = Math.min(n - 2, Math.max(0, Math.floor(fj))), u = fj - j, v = fi - i;
    return D.H[i][j] * (1 - u) * (1 - v) + D.H[i][j + 1] * u * (1 - v) + D.H[i + 1][j] * (1 - u) * v + D.H[i + 1][j + 1] * u * v; };
  { const up = terrainY(CN[0] + side[0] * 7, CN[2] + side[1] * 7) > terrainY(CN[0] - side[0] * 7, CN[2] - side[1] * 7); if (!up) side = [-side[0], -side[1]]; }   // la cuneta, del lado del talud
  const FAC = Wp(-45, 0, 0); let tb = [FAC[0] - CN[0], FAC[2] - CN[2]]; { const l = Math.hypot(...tb); tb = [tb[0] / l, tb[1] / l]; }
  const azOf = (dx, dz) => Math.atan2(dx, dz) * 180 / Math.PI;
  const AP = [];
  for (let k = 0; k < 14; k++) {
    const fig = figG(k, false), blk = k >= 4 ? blockG() : null; scene.add(fig); if (blk) scene.add(blk);
    const along = (k - 6.5) * 1.5 + Math.sin(k * 2.1) * 0.4, off = 4.3 + (k % 3) * 0.55;
    const cx = CN[0] + roadDir[0] * along + side[0] * off, cz = CN[2] + roadDir[1] * along + side[1] * off;
    const yaw = Math.atan2(roadDir[0], roadDir[1]) + Math.sin(k * 1.7) * 0.45;
    AP.push({ fig, blk, cun: [cx, Math.max(terrainY(cx, cz), ry(cx, cz)), cz], yaw, ledge: Wp(-35.0, 0.6, -6.83 + k * 1.05), stage: Wp(-62 - (k % 2) * 1.4, 0, -12 + k * 1.7) }); }
  const CC0 = AP.reduce((m, a) => [m[0] + a.cun[0] / 14, m[1] + a.cun[1] / 14, m[2] + a.cun[2] / 14], [0, 0, 0]), CC4 = AP.slice(0, 4).reduce((m, a) => [m[0] + a.cun[0] / 4, m[1] + a.cun[1] / 4, m[2] + a.cun[2] / 4], [0, 0, 0]);
  const CC = [0, 1, 2].map(i => (CC0[i] + CC4[i]) / 2);   // entre el montón y los cuatro ya tallados
  const DEMO = figG(3, true); scene.add(DEMO); { const p = Wp(-61, 0, 16); DEMO.position.set(...p); DEMO.rotation.y = (Math.atan2(-AX[0], -AX[1]) * 180 / Math.PI - 8) * Math.PI / 180; }
  const coreD = DEMO.getObjectByName('core');
  const CR = new THREE.Group(); scene.add(CR); let cable;
  { const E = []; const top = Wp(-50, 30, -21), j0 = Wp(-64, 30, -21), j1 = Wp(-33, 30, -21), apex = Wp(-50, 34, -21);
    for (const dv of [-0.8, 0.8]) for (const du of [-0.8, 0.8]) E.push(...Wp(-50 + du, 0, -21 + dv), ...Wp(-50 + du, 30, -21 + dv));
    for (let y = 0; y < 30; y += 2.5) E.push(...Wp(-50.8, y, -21.8), ...Wp(-49.2, y + 2.5, -20.2), ...Wp(-49.2, y, -21.8), ...Wp(-50.8, y + 2.5, -20.2));
    E.push(...j0, ...j1, ...apex, ...j0, ...apex, ...j1, ...top, ...apex);
    CR.add(segs(E, lineMat(INK, LW.A))); cable = segs([0, 0, 0, 0, 1, 0], lineMat(INK, LW.B)); CR.add(cable); }
  const manG = (() => { const c = new THREE.CylinderGeometry(0.24, 0.24, 1.3, 10); c.translate(0, 0.65, 0); const h = new THREE.SphereGeometry(0.24, 10, 8); h.translate(0, 1.55, 0); return merge([c.toNonIndexed(), h.toNonIndexed()]); })();
  const PPL = []; let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(manG, inkM); scene.add(m); PPL.push({ m, s0: -30 + k * 7 + rnd() * 3, lane: (rnd() - 0.5) * 3, v: 0.9 + rnd() * 0.4 }); }
  const ST = []; for (let k = 0; k < 14; k++) { const m = new THREE.Mesh(manG, inkM); scene.add(m); ST.push({ m, v: -6 + rnd() * 12, ph: rnd(), sp: 0.07 + rnd() * 0.04 }); }
  scene.traverse(o => { o.frustumCulled = false; });
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u, fw = (t, a, b, f = 0.3) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
  const P2 = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
  window.shot = (o) => {
    const t = o.t ?? 0, ph = o.ph ?? {}; CTX.visible = o.ctx ?? true;
    let lifting = null;
    AP.forEach((a, k) => {
      const lift = ph.lift ? ph.lift[k] : 1, onStage = ph.stage ?? 1;
      if (ph.cuneta) { a.fig.visible = k < 4; if (a.blk) a.blk.visible = true;
        const grp = k < 4 ? a.fig : a.blk; grp.position.set(...a.cun); grp.rotation.set(0, a.yaw, 0); grp.rotateX(-Math.PI / 2 + 0.12 * Math.sin(k)); grp.position.y += 0.35; return; }
      if (a.blk) a.blk.visible = false; a.fig.visible = onStage > 0.5 || lift > 0;
      if (lift <= 0) { a.fig.position.set(...a.stage); a.fig.position.y += 0.3; a.fig.rotation.set(0, BG.rotation.y, 0); a.fig.rotateX(-Math.PI / 2); return; }
      const s = smr(lift), up = Math.sin(Math.PI * Math.min(1, s * 1.15)) * 9;
      a.fig.position.set(lerp(a.stage[0], a.ledge[0], s), lerp(a.stage[1] + 0.3, a.ledge[1], s) + up * (1 - s * 0.3), lerp(a.stage[2], a.ledge[2], s));
      a.fig.rotation.set(0, BG.rotation.y - Math.PI / 2, 0); a.fig.rotateX(-(Math.PI / 2) * (1 - sm(lift * 1.6)));
      if (lift > 0 && lift < 1) lifting = a.fig.position.toArray();
    });
    PIE.visible = (ph.pieta ?? 1) > 0.02; PIE.position.y = (1 - smr(ph.pieta ?? 1)) * 14; PIE.scale.setScalar(Math.max(0.001, ph.pieta ?? 1));
    CR.visible = !!ph.crane; if (ph.crane) { const tgt = lifting || Wp(-46, 6, -21); const tip = [tgt[0], tgt[1] + 3.1, tgt[2]]; cable.geometry.setPositions(new Float32Array([...Wp(-46, 30, -21), tip[0], 30, tip[2], tip[0], 30, tip[2], ...tip])); }
    DEMO.visible = (ph.demo ?? 0) > 0; if (coreD) { const c = ph.core ?? 1; coreD.scale.set(Math.max(0.001, c), Math.max(0.001, 0.3 + 0.7 * c), 1); coreD.visible = c > 0.01; }
    for (const p of PPL) { p.m.visible = !!ph.road; if (!ph.road) continue; const s = p.s0 + p.v * t; const x = CN[0] + roadDir[0] * s + side[0] * p.lane, z = CN[2] + roadDir[1] * s + side[1] * p.lane;
      p.m.position.set(x, terrainY(x, z) + 0.15 + Math.abs(Math.sin(t * 5 + p.s0)) * 0.06, z); }
    for (const p of ST) { p.m.visible = !!ph.stair; if (!ph.stair) continue; const f = (p.ph + p.sp * Math.max(0, t - 40)) % 1, u = -58 + f * 22, y = u < -54.3 ? 0 : u > -40.7 ? -5 : -5 * (u + 54.3) / 13.6;
      p.m.position.set(...Wp(u, y + 0.05, p.v * (u < -40.7 ? 1 : 0.7))); }
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, tg = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 9000; camera.position.set(tg[0] + Math.sin(az) * Math.cos(el) * d, tg[1] + Math.sin(el) * d, tg[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    $('kicker').textContent = o.kick ?? '011'; $('title').textContent = o.title || ''; $('title').style.opacity = o.titleOp ?? (o.title ? 1 : 0); $('sub').style.opacity = 0;
    const svg = $('ov'); svg.innerHTML = '';
    for (const [txt, p, op0] of (o.labels || [])) { const q = P2(p); const half = txt.length * 9 + 30; const op = op0 * clamp(Math.min(q[0] - half, W - half - q[0], q[1] - 420, H - 460 - q[1]) / 60); if (op < 0.02) continue; svg.insertAdjacentHTML('beforeend', `<text class="maplab" x="${q[0]}" y="${q[1]}" text-anchor="middle" opacity="${op}">${txt}</text>`); }
    return true;
  };
  const FAZ = Math.atan2(-AX[0], -AX[1]) * 180 / Math.PI;
  const K = [
    { t: 0.0, tg: [CN[0] + tb[0] * 34, CN[1] + 13, CN[2] + tb[1] * 34], z: 40, az: azOf(-tb[0], -tb[1]) - 10, el: 11 },
    { t: 3.2, tg: [CN[0] + tb[0] * 48, CN[1] + 12, CN[2] + tb[1] * 48], z: 48, az: azOf(-tb[0], -tb[1]) - 6, el: 22 },
    { t: 7.8, tg: Wp(-26, 20, -10), z: 36, az: FAZ - 26, el: 9 },
    { t: 12.8, tg: Wp(-46, -1.5, 0), z: 20, az: FAZ - 30, el: 30 },
    { t: 15.6, tg: Wp(-61, 1.6, 16), z: 5.5, az: FAZ - 8, el: 9 },
    { t: 18.0, tg: Wp(-60, 2, 14), z: 7, az: FAZ - 2, el: 10 },
    { t: 21.6, tg: Wp(-36, 4, 0), z: 15, az: FAZ - 6, el: 7 },
    { t: 23.4, tg: Wp(-36, 4, 0), z: 15, az: FAZ - 4, el: 8 },
    { t: 26.0, tg: [CC[0], CC[1] + 0.6, CC[2]], z: 12.5, az: azOf(-side[0], -side[1]) + 30, el: 38 },
    { t: 29.4, tg: [CC[0] + roadDir[0], CC[1] + 0.6, CC[2] + roadDir[1]], z: 11.5, az: azOf(-side[0], -side[1]) + 18, el: 40 },
    { t: 31.4, tg: Wp(-52, 12, -6), z: 30, az: FAZ - 36, el: 26 },
    { t: 36.6, tg: Wp(-47, 10, -4), z: 27, az: FAZ - 24, el: 22 },
    { t: 41.6, tg: Wp(-36, 6.5, 0), z: 13.5, az: FAZ - 6, el: 6 },
    { t: 45.6, tg: Wp(-48, 0, 0), z: 30, az: FAZ - 28, el: 30 },
    { t: 50.0, tg: Wp(-10, -10, 25), z: 240, az: FAZ - 40, el: 38 } ];
  const words = [[0.25, 3.0, '¿14 apóstoles en una cuneta?'], [3.4, 7.8, 'Piedras en punta: espinos.'], [8.4, 12.8, 'Se baja para entrar.'],
    [13.4, 17.8, 'Oteiza los vacía por dentro.'], [18.4, 22.8, '1955: la Iglesia lo prohíbe.'], [23.4, 29.8, '14 años en la cuneta.'],
    [30.4, 36.8, '1969: suben al friso.'], [37.4, 41.8, 'Lo acaba al cumplir 61.']];
  const kick = (t) => t < 8.2 ? '011 · ARANTZAZU · OÑATI' : t < 13.2 ? '011 · SÁENZ DE OIZA Y LAORGA · 1950' : t < 18.2 ? '011 · JORGE OTEIZA · APOSTOLADO' :
    t < 23.2 ? '011 · NOVIEMBRE DE 1954 – 1955' : t < 29.8 ? `011 · CUNETA DE LA GI-3591 · ${1955 + Math.min(13, Math.floor(seg(t, 23.6, 29.4) * 13.999))}` :
    t < 37.2 ? '011 · JUNIO DE 1969' : t < 42.2 ? '011 · 21 DE OCTUBRE DE 1969' : '011 · ARANTZAZU · OÑATI';
  window.renderAt = (tt) => {
    let i = 1; while (i < K.length - 1 && K[i].t < tt) i++; const a = K[i - 1], b = K[i]; const u = smr(seg(tt, a.t, b.t));
    let tw = '', to = 0; for (const [a0, b0, tx] of words) { const f = fw(tt, a0, b0, 0.22); if (f > 0) { tw = tx; to = f; } }
    const cuneta = tt < 30.0, lift = AP.map((_, k) => seg(tt, 31.2 + k * 0.38, 31.2 + k * 0.38 + 1.25));
    const ph = { cuneta, stage: cuneta ? 0 : 1, lift, crane: tt > 30.0 && tt < 38.5, pieta: smr(seg(tt, 36.6, 37.6)), demo: tt > 12.0 && tt < 22.0 ? 1 : 0,
      core: 1 - smr(seg(tt, 14.2, 17.2)), road: tt < 11, stair: tt > 41 };
    const labels = [['GI-3591 · DESDE OÑATI', [CN[0] - 18, CN[1], CN[2] - 10], fw(tt, 0.5, 7.8, 0.4)], ['BASÍLICA', Wp(-20, 22, 0), fw(tt, 0.6, 7.8, 0.4)]];
    return window.shot({ t: tt, tg: a.tg.map((v, j) => lerp(v, b.tg[j], u)), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), az: lerp(a.az, b.az, u), el: lerp(a.el, b.el, u),
      ph, labels, title: tw, titleOp: to, kick: kick(tt) });
  };
  window.renderCover = () => { document.body.classList.add('cover');
    return window.shot({ t: 45, tg: Wp(-37, 23.5, -1), z: 23.5, az: FAZ - 16, el: 6, ctx: false, ph: { cuneta: false, stage: 1, lift: AP.map(() => 1), pieta: 1 }, kick: '', title: '' }); };
  window.READY = true;
}
