// Sanatorio Druzhba (Igor Vasilevsky, ingeniero Nodar Kancheli; Kurpaty, Yalta, Crimea; 1978–1985). Reel de prueba en inglés.
// Volumetría ESQUEMÁTICA: anillo dentado de cuatro plantas sobre tres apoyos, tres «engranajes» en la cubierta, puente de entrada por arriba,
// ladera inestable hacia el mar. Medidas aproximadas; lo verificado: tres apoyos, ladera con riesgo de deslizamiento, zona sísmica 8, mirador a 56 m sobre el mar.
import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, makeInkPass, prism } from './lib.js';
const $ = (id) => document.getElementById(id);
const INK = '#1A1B20', RED = '#E2401C', PINK = '#F0B8A4', D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ss = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, u) => a + (b - a) * u;
const mk = () => ({ P: [], B: [], T: [] });
const mesh = (A, M) => { const m = new THREE.Mesh(geomFrom(A.P, A.B, A.T), M); m.frustumCulled = false; return m; };
function extrudeH(A, ring, holes, h, y0 = 0) {
  const all = [ring, ...holes];
  for (const [ix, r0] of all.entries()) { const r = ix === 0 ? r0 : [...r0].reverse(); for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; A.P.push(a[0], y0, a[1], a[0], h, a[1], b[0], h, b[1], a[0], y0, a[1], b[0], h, b[1], b[0], y0, b[1]); for (let k = 0; k < 6; k++) { A.B.push(0); A.T.push(h); } } }
  const v2 = (r) => r.map(p => new THREE.Vector2(p[0], p[1])); let f; try { f = THREE.ShapeUtils.triangulateShape(v2(ring), holes.map(v2)); } catch (e) { return; } const pts = all.flat();
  for (const yy of [h, y0]) for (const q of f) { const p = q.map(i => [pts[i][0], yy, pts[i][1]]); const ny = (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) - (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]); const o = (ny >= 0) === (yy === h) ? [0, 1, 2] : [0, 2, 1]; for (const k of o) { A.P.push(...p[k]); A.B.push(0); A.T.push(h); } }
}
const circ = (cx, cz, r, n = 28) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * 2 * Math.PI) * r, cz + Math.sin(i / n * 2 * Math.PI) * r]);
const gear = (cx, cz, R, d, n) => Array.from({ length: 2 * n }, (_, i) => { const a = i / (2 * n) * 2 * Math.PI, r = i % 2 ? R - d : R; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
const yG = (z) => clamp(60 - (z + 150) * 0.24, 0, 60);   // ladera: 60 m arriba, mar a 100 m del centro
export async function init() {
  await Promise.all([document.fonts.load("24px SM"), document.fonts.load("700 44px SG")]);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 60000);
  const M = (c, roof) => fillMat(c, { hatch: 0, side: 0.94, shade: 0.84, roof: roof ?? c, windows: 0, double: true });
  const whiteM = M('#F6F5F1', '#EFE9E0'), redM = M(RED, '#D23A18'), groundM = fillMat('#ECE6DA', { hatch: 0, side: 0.9, shade: 0.9, roof: '#E8E2D3', windows: 0 }), seaM = fillMat('#DCE6EA', { hatch: 0, side: 1, shade: 1, roof: '#DCE6EA', windows: 0 });
  const G = {}; const grp = (n) => { const g = new THREE.Group(); scene.add(g); G[n] = g; return g; };
  const addL = (g, pos, mat, ro = 3) => { const l = segs(pos, mat, ro); l.frustumCulled = false; g.add(l); return l; };
  // ladera (bloque con la cara de corte en x = 0 para la sección) y mar
  const terreno = (x0, x1) => { const A = mk(); const zs = []; for (let z = -260; z <= 100; z += 20) zs.push(z);
    for (let i = 0; i + 1 < zs.length; i++) { const za = zs[i], zb = zs[i + 1], ya = yG(za), yb = yG(zb); A.P.push(x0, ya, za, x1, yb, zb, x1, ya, za, x0, ya, za, x0, yb, zb, x1, yb, zb); for (let k = 0; k < 6; k++) { A.B.push(0); A.T.push(ya); } }   // cara superior hacia arriba
    for (let i = 0; i + 1 < zs.length; i++) { const za = zs[i], zb = zs[i + 1], ya = yG(za), yb = yG(zb);
      A.P.push(x1, -30, za, x1, ya, za, x1, yb, zb, x1, -30, za, x1, yb, zb, x1, -30, zb);   // cara x1 hacia +x
      A.P.push(x0, -30, za, x0, yb, zb, x0, ya, za, x0, -30, za, x0, -30, zb, x0, yb, zb);   // cara x0 hacia -x
      for (let k = 0; k < 12; k++) { A.B.push(0); A.T.push(ya); } }
    return A; };
  grp('tierra').add(mesh(terreno(-240, 240), groundM)); grp('tierraCorte').add(mesh(terreno(-240, 0), groundM));
  { const L = []; for (let y = 6; y < 60; y += 6) { const z = (60 - y) / 0.24 - 150; L.push(-240, y + 0.2, z, 240, y + 0.2, z); } addL(G.tierra, L, lineMat('#C9C1B0', 1.4), 1); }
  { const A = mk(); A.P.push(-600, 0, 100, 600, 0, 600, 600, 0, 100, -600, 0, 100, -600, 0, 600, 600, 0, 600); for (let k = 0; k < 6; k++) { A.B.push(0); A.T.push(0); } const m = mesh(A, seaM); m.userData.noInk = true; grp('mar').add(m); }
  // edificio: tres apoyos, cuatro plantas en anillo dentado que se abren hacia arriba, atrio central, tres engranajes en la cubierta
  const Y0 = 40, FH = 3.5, LEGS = [90, 210, 330].map(a => [Math.cos(a * D2R) * 12, Math.sin(a * D2R) * 12]);
  { const A = mk(), E = []; for (const [x, z] of LEGS) prism(circ(x, z, 5, 24), yG(z), Y0, 2.2, A.P, A.B, A.T, E, {}); grp('patasR').add(mesh(A, redM)); grp('patasW').add(mesh(A, whiteM)); }
  { const A = mk(); for (let f = 0; f < 4; f++) extrudeH(A, gear(0, 0, 30 + 2 * f, 3.5, 24), [circ(0, 0, 18, 32)], Y0 + FH * (f + 1), Y0 + FH * f); grp('anillo').add(mesh(A, whiteM));
    const B = mk(); for (let k = 0; k < 3; k++) { const a = (90 + 120 * k) * D2R; extrudeH(B, gear(Math.cos(a) * 24, Math.sin(a) * 24, 7, 1.6, 10), [], Y0 + 4 * FH + 4, Y0 + 4 * FH); } grp('corona').add(mesh(B, whiteM)); grp('coronaR').add(mesh(B, redM)); }
  { const A = mk(); const p = [[-2.5, -110], [2.5, -110], [2.5, -28], [-2.5, -28]]; extrudeH(A, p, [], Y0 + 4 * FH + 0.6, Y0 + 4 * FH - 1.2); grp('puente').add(mesh(A, whiteM)); grp('puenteR').add(mesh(A, redM)); }
  const ink = makeInkPass(renderer, W, H);
  const proj = (p) => { const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
  function cam(tg, az, el, z, dy = 160) {
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z; const d = 30000; az *= D2R; el *= D2R;
    camera.position.set(tg[0] + Math.sin(az) * Math.cos(el) * d, tg[1] + Math.sin(el) * d, tg[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); if (el > 89) camera.up.set(-Math.sin(az), 0, -Math.cos(az)); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateMatrixWorld();
    camera.position.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1), dy * 2 * z / H);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
  }
  const svg = $('ov'); let SV = '';
  const text = (x, y, s, cls = 'lab', anchor = 'middle', op = 1) => { if (op > 0.01) SV += `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" opacity="${op.toFixed(2)}">${s}</text>`; };
  const poly = (pts, col, w, dash, op) => { if (op > 0.01) SV += `<polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-linecap="round" stroke-linejoin="round" opacity="${op.toFixed(2)}"/>`; };
  const dot = (p, r, col, op = 1) => { if (op > 0.01) SV += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}" fill="${col}" opacity="${op.toFixed(2)}"/>`; };
  const flecha = (a, b, col, w, op) => { if (op <= 0.01) return; poly([a, b], col, w, '14 10', op); const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 22; poly([[b[0] - L * Math.cos(ang - 0.45), b[1] - L * Math.sin(ang - 0.45)], b, [b[0] - L * Math.cos(ang + 0.45), b[1] - L * Math.sin(ang + 0.45)]], col, w, '', op); };
  const show = (...n) => { for (const k of Object.keys(G)) G[k].visible = n.includes(k); };
  const BASE = ['tierra', 'mar', 'anillo', 'corona', 'puente'];
  const T = [0, 46, 0];
  const SC = [
    [0, 4.5, (u) => { show(...BASE, 'patasR'); const k = ss(u); cam(T, lerp(-40, -20, k), lerp(16, 20, k), lerp(95, 85, k), 120); }],
    [4.5, 9, (u) => { show(...BASE, 'patasW'); const k = ss(u); cam(T, lerp(-20, 30, k), lerp(20, 34, k), lerp(85, 120, k), 140); text(540, 1580, 'IGOR VASILEVSKY · ENGINEER NODAR KANCHELI', 'labr', 'middle', ss((u - 0.2) / 0.2)); text(540, 1620, 'KURPATY, NEAR YALTA · SCHEMATIC MASSING', 'labs', 'middle', ss((u - 0.2) / 0.2)); }],
    [9, 13.5, (u) => { show(...BASE, 'patasW'); const k = ss(u); cam([0, 50, 0], lerp(30, 60, k), 89.9, lerp(70, 60, k), 140); text(540, 1580, 'USSR · CZECHOSLOVAKIA', 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [13.5, 18, (u) => { show(...BASE, 'patasW'); const k = ss(u); cam([0, 50, 26], lerp(160, 185, k), lerp(14, 10, k), lerp(42, 36, k), 120); for (let i = 0; i < 7; i++) { const a = (60 + i * 10) * D2R, r = 33, p0 = proj([Math.cos(a) * r, 47, Math.sin(a) * r]), p1 = proj([Math.cos(a) * 160, 30, Math.sin(a) * 160]); poly([p0, p1], RED, 3, '10 8', ss((u - 0.15 - 0.05 * i) / 0.2)); } text(540, 1580, 'EVERY NOTCH: A ROOM FACING THE SEA', 'labr', 'middle', ss((u - 0.3) / 0.2)); }],
    [18, 22.5, (u) => { show('tierra', 'mar', 'anillo', 'corona', 'puenteR', 'patasW'); const k = ss(u); cam([0, 54, -50], lerp(-70, -40, k), lerp(30, 38, k), lerp(90, 80, k), 140); const ruta = [[0, Y0 + 4 * FH + 1, -112], [0, Y0 + 4 * FH + 1, -30], [0, Y0 + 4 * FH + 1, -20]]; const e = ss((u - 0.1) / 0.7), n = Math.min(2, Math.floor(e * 2)), f = e * 2 - n; const pts = ruta.slice(0, n + 1).map(proj); if (n < 2) { const a = ruta[n], b = ruta[n + 1]; pts.push(proj([a[0], a[1], lerp(a[2], b[2], f)])); } poly(pts, RED, 5, '', 1); dot(pts[pts.length - 1], 11, INK); text(540, 1580, 'IN THROUGH THE ROOF', 'labr', 'middle', ss((u - 0.3) / 0.2)); }],
    [22.5, 27, (u) => { show(...BASE, 'patasR'); const k = ss(u); cam([0, 30, 0], lerp(-20, 10, k), lerp(8, 12, k), lerp(70, 80, k), 100); LEGS.forEach(([x, z], i) => { const e = ss((u - 0.1 - 0.1 * i) / 0.5); const y = lerp(Y0 + 4 * FH, yG(z), e); dot(proj([x, y, z]), 10, INK, 1); }); text(540, 1580, 'THREE LIFTS INSIDE THE LEGS', 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [27, 31.5, (u) => { show('tierraCorte', 'mar', 'anillo', 'corona', 'puente', 'patasW'); cam([0, 25, -20], 90, 4, 150, 60); for (let i = 0; i < 5; i++) { const z0 = -200 + i * 55, a = proj([0, yG(z0) + 4, z0]), b = proj([0, yG(z0 + 40) + 4, z0 + 40]); flecha(a, b, RED, 5, ss((u - 0.1 - 0.08 * i) / 0.2)); } text(540, 1580, 'LANDSLIDE-PRONE SLOPE · SEISMIC ZONE 8', 'labr', 'middle', ss((u - 0.3) / 0.2)); }],
    [31.5, 36, (u) => { show('tierraCorte', 'mar', 'anillo', 'corona', 'puente', 'patasR'); cam([0, 25, -20], 90, 4, lerp(150, 120, ss(u)), 60); for (let i = 0; i < 3; i++) { const z0 = -120 + i * 45, a = proj([0, yG(z0) + 4, z0]), b = proj([0, yG(z0 + 35) + 4, z0 + 35]); flecha(a, b, RED, 4, 0.5); } const p0 = proj([0, Y0, 12]), p1 = proj([0, yG(12) - 22, 12]); poly([p0, p1], RED, 8, '', ss((u - 0.1) / 0.3)); text(540, 1580, 'THREE SUPPORTS · THE RING CLEARS THE SLOPE', 'labr', 'middle', ss((u - 0.3) / 0.2)); }],
    [36, 40.5, (u) => { show(...BASE, 'patasR'); const k = ss(u); cam(T, lerp(150, 200, k), lerp(18, 26, k), lerp(110, 170, k), 140); }],
  ];
  const END = SC[SC.length - 1][1];
  window.renderAt = (t) => { t = clamp(t, 0, END - 1e-4); SV = ''; for (const [a, b, fn] of SC) if (t >= a && t < b) { fn((t - a) / (b - a), t); break; } svg.innerHTML = SV; ink.render(scene, camera); };
  window.READY = true;
}
