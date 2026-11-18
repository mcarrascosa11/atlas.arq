// 024 · La ciudad de los 15 minutos · ciudad esquemática (no es una ciudad real). Escala: manzanas de 130 m y calles de 30 m.
// Radio de 15 minutos andando: 1.200 m (unos 4,8 km/h). Unidad vecinal de Perry (1929): 400 m. Oxford: esquema de filtros, no el plano real.
import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, makeInkPass, prism } from './lib.js';
const $ = (id) => document.getElementById(id);
const INK = '#1A1B20', RED = '#E2401C', PINK = '#F0B8A4', D2R = Math.PI / 180;
const EN = new URLSearchParams(location.search).get('lang') === 'en';
const TX = (es, en) => EN ? en : es;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ss = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, u) => a + (b - a) * u;
const mk = () => ({ P: [], B: [], T: [] });
const mesh = (A, M) => { const m = new THREE.Mesh(geomFrom(A.P, A.B, A.T), M); m.frustumCulled = false; return m; };
function flat(A, r, y) { let f; try { f = THREE.ShapeUtils.triangulateShape(r.map(p => new THREE.Vector2(p[0], p[1])), []); } catch (e) { return; } for (const q of f) { const p = q.map(i => [r[i][0], y, r[i][1]]); const ny = (p[1][2] - p[0][2]) * (p[2][0] - p[0][0]) - (p[1][0] - p[0][0]) * (p[2][2] - p[0][2]); const o = ny >= 0 ? [0, 1, 2] : [0, 2, 1]; for (const k of o) { A.P.push(...p[k]); A.B.push(0); A.T.push(y); } } }
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export async function init() {
  await Promise.all([document.fonts.load("24px SM"), document.fonts.load("700 44px SG")]);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 60000);
  const solid = (c, o = {}) => fillMat(c, { hatch: 0, side: o.side ?? 0.94, shade: o.shade ?? 0.84, double: true, poche: RED, roof: o.roof });
  const bldM = fillMat('#F6F5F1', { hatch: 0, side: 0.95, shade: 0.88, roof: '#EFDCD0', windows: 0 });
  const redM = fillMat(RED, { hatch: 0, side: 0.92, shade: 0.82, roof: '#D23A18', windows: 0 });
  const greenM = solid('#DDE6D2', { side: 1, shade: 1 }), redFlat = solid(RED, { side: 1, shade: 1 });
  const G = {}; const grp = (n) => { const g = new THREE.Group(); scene.add(g); G[n] = g; return g; };
  const addL = (g, pos, mat, ro = 3) => { const l = segs(pos, mat, ro); l.frustumCulled = false; g.add(l); return l; };
  // ciudad esquemática de manzanas cerradas con patio: 130 m de manzana y calles de 30 m (paso de 160 m)
  const PITCH = 160, R15 = 1200, N = 11;
  const SERV = { '0,0': 'casa', '3,-4': 'trabajo', '-4,2': 'compra', '4,3': 'salud', '-3,-4': 'colegio', '5,-1': 'parque', '-1,5': 'cultura' };
  const LAB = { casa: TX('CASA', 'HOME'), trabajo: TX('TRABAJO', 'WORK'), compra: TX('COMPRAS', 'SHOPS'), salud: TX('SALUD', 'HEALTH'), colegio: TX('COLEGIO', 'SCHOOL'), parque: TX('PARQUE', 'PARK'), cultura: TX('OCIO Y CULTURA', 'LEISURE') };
  const pinkM = fillMat('#F6F5F1', { hatch: 0, side: 0.95, shade: 0.88, roof: PINK, windows: 0 });
  const SP = {}; const A = mk(), Eg = [], AR = mk(), EgR = [], AS = mk(), EgS = [], AG = mk();
  const anillo = (T, E, cx, cz, h, w = 130, dep = 30) => { const a = w / 2, b = a - dep; const o = [[-a, -a], [a, -a], [a, a], [-a, a]], i = [[-b, -b], [b, -b], [b, b], [-b, b]];
    const tr = (r) => r.map(([x, z]) => [cx + x, cz + z]);
    prism(tr([o[0], o[1], [a, -b], [-a, -b]]), 0, h, 2.2, T.P, T.B, T.T, E, {}); prism(tr([[-a, b], [a, b], o[2], o[3]]), 0, h, 2.2, T.P, T.B, T.T, E, {});
    prism(tr([[-a, -b], [-b, -b], [-b, b], [-a, b]]), 0, h, 2.2, T.P, T.B, T.T, E, {}); prism(tr([[b, -b], [a, -b], [a, b], [b, b]]), 0, h, 2.2, T.P, T.B, T.T, E, {}); };
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
    const cx = i * PITCH, cz = j * PITCH, d = Math.hypot(cx, cz), k = SERV[`${i},${j}`];
    if (d > 1750) continue;
    if (k) SP[k] = [cx, cz];
    if (k === 'parque') { flat(AG, [[cx - 65, cz - 65], [cx + 65, cz - 65], [cx + 65, cz + 65], [cx - 65, cz + 65]], 0.2); continue; }
    if (k === 'casa') { anillo(AR, EgR, cx, cz, 22); continue; }
    if (k === 'trabajo') { prism([[cx - 30, cz - 30], [cx + 30, cz - 30], [cx + 30, cz + 30], [cx - 30, cz + 30]], 0, 70, 2.2, AS.P, AS.B, AS.T, EgS, {}); anillo(A, Eg, cx, cz, 16); continue; }
    if (k === 'compra') { prism([[cx - 65, cz - 65], [cx + 65, cz - 65], [cx + 65, cz + 65], [cx - 65, cz + 65]], 0, 9, 2.2, AS.P, AS.B, AS.T, EgS, {}); continue; }
    if (k === 'colegio') { prism([[cx - 65, cz - 65], [cx + 65, cz - 65], [cx + 65, cz - 25], [cx - 65, cz - 25]], 0, 12, 2.2, AS.P, AS.B, AS.T, EgS, {}); flat(AG, [[cx - 65, cz - 25], [cx + 65, cz - 25], [cx + 65, cz + 65], [cx - 65, cz + 65]], 0.2); continue; }
    if (k) { anillo(AS, EgS, cx, cz, 18); continue; }
    anillo(A, Eg, cx, cz, 14 + Math.floor(rnd() * 4) * 3);
  }
  grp('ciudad').add(mesh(A, bldM)); G.ciudad.add(mesh(AS, pinkM)); const gm = mesh(AG, greenM); gm.userData.noInk = true; G.ciudad.add(gm);
  grp('casaR').add(mesh(AR, redM)); grp('casaW').add(mesh(AR, bldM));
  const ring = (r, y, n = 160, dash = false, c = [0, 0]) => { const L = []; for (let i = 0; i < n; i++) { if (dash && i % 2) continue; const a = i / n * 2 * Math.PI, b = (i + 1) / n * 2 * Math.PI; L.push(c[0] + Math.cos(a) * r, y, c[1] + Math.sin(a) * r, c[0] + Math.cos(b) * r, y, c[1] + Math.sin(b) * r); } return L; };
  addL(grp('c15'), ring(R15, 1, 120, true), lineMat(RED, 5, { depthTest: false }), 6);
  addL(grp('perry'), ring(400, 1.2, 80, false, SP.colegio), lineMat(INK, 4, { depthTest: false }), 6);
  addL(grp('ronda'), ring(1450, 0.6, 160, false), lineMat(INK, 8), 4);
  // el muro del bulo: un anillo rojo de 48 m alrededor del barrio de casa
  const RM = 330; { const M = mk(), n = 72; for (let i = 0; i < n; i++) { const a = i / n * 2 * Math.PI, b = (i + 1) / n * 2 * Math.PI, p = [Math.cos(a) * RM, Math.sin(a) * RM], q = [Math.cos(b) * RM, Math.sin(b) * RM]; M.P.push(p[0], 0, p[1], p[0], 48, p[1], q[0], 48, q[1], p[0], 0, p[1], q[0], 48, q[1], q[0], 0, q[1]); for (let k = 0; k < 6; k++) { M.B.push(0); M.T.push(48); } } grp('muro').add(mesh(M, fillMat(RED, { hatch: 0, side: 0.92, shade: 0.82, double: true, windows: 0 }))); }
  // seis filtros de tráfico (esquema): barras rojas atravesando calles a unos 600 m del centro
  const FIL = [[-640, 80, 0], [640, -80, 0], [80, -640, 1], [-80, 640, 1], [-480, -400, 0], [480, 400, 0]];
  { const M = mk(); for (const [x, z, o] of FIL) { const w = 30, d = 5; const r = o ? [[x - w / 2, z - d], [x + w / 2, z - d], [x + w / 2, z + d], [x - w / 2, z + d]] : [[x - d, z - w / 2], [x + d, z - w / 2], [x + d, z + w / 2], [x - d, z + w / 2]]; flat(M, r, 1.5); } const m = mesh(M, redFlat); m.userData.noInk = true; grp('filtros').add(m); }
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
  const show = (...n) => { for (const k of Object.keys(G)) G[k].visible = n.includes(k); };
  const etiq = (u, keys, t0 = 0.1, step = 0.08) => keys.forEach((k, i) => { const p = proj([SP[k][0], k === 'trabajo' ? 74 : 24, SP[k][1]]); dot(p, 7, k === 'casa' ? RED : INK, ss((u - t0 - step * i) / 0.1)); text(p[0], p[1] - 18, LAB[k], k === 'casa' ? 'labr' : 'lab', 'middle', ss((u - t0 - step * i) / 0.1)); });
  const largo = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]); return L; };
  const tramo = (pts, e) => { const T = largo(pts) * clamp(e), out = [pts[0]]; let acc = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[2] - a[2]); if (acc + l >= T) { const f = (T - acc) / Math.max(l, 1e-6); out.push([lerp(a[0], b[0], f), 2, lerp(a[2], b[2], f)]); return out; } acc += l; out.push(b); } return out; };
  const estela = (pts, e, col, w, dash, r) => { if (e <= 0) return; const q = tramo(pts, e), P = q.map(p => proj(p)); if (P.length > 1) poly(P, col, w, dash, 1); dot(P[P.length - 1], r, col, 1); };
  const aSvc = (k) => { const [x, z] = SP[k]; return [[0, 2, 0], [0, 2, 80], [x, 2, 80], [x, 2, z]]; };
  const arco = (r, e, col, w, c = [0, 0]) => { const n = 90, P = []; for (let i = 0; i <= Math.round(n * clamp(e)); i++) { const a = -Math.PI / 2 + i / n * 2 * Math.PI; P.push(proj([c[0] + Math.cos(a) * r, 1, c[1] + Math.sin(a) * r])); } if (P.length > 1) poly(P, col, w, '18 12', 1); };
  // marca de un equipamiento: contorno rojo de su manzana que aparece con un pequeño rebote, y su nombre
  const marca = (k, op, conNombre = true) => { if (op <= 0.01) return; const [x, z] = SP[k], h = k === 'trabajo' ? 70 : k === 'parque' || k === 'colegio' ? 1 : 20, s0 = 72 * (1 + 0.25 * (1 - op));
    const P = [[x - s0, h, z - s0], [x + s0, h, z - s0], [x + s0, h, z + s0], [x - s0, h, z + s0], [x - s0, h, z - s0]].map(q => proj(q)); poly(P, RED, 5, '', op);
    if (conNombre) { const c = proj([x, h, z]); const top = Math.min(...P.map(q => q[1])); text(c[0], top - 16, LAB[k], k === 'casa' ? 'labr' : 'lab', 'middle', op); } };
  const SVC = ['trabajo', 'compra', 'salud', 'colegio', 'parque', 'cultura'];
  const AZ = 35, C = [0, 0, 0];
  const PL = AZ + 10;   // orientación de las plantas
  const SC = [
    [0, 4.5, (u) => { show('ciudad', 'casaR', 'muro'); G.muro.scale.y = 0.05 + 0.95 * ss((u - 0.05) / 0.45); const k = ss(u); cam(C, AZ + lerp(-14, 4, k), lerp(56, 50, k), lerp(620, 540, k), 60); }],
    [4.5, 9, (u) => { show('ciudad', 'casaR', 'muro'); G.muro.scale.y = Math.max(0.001, 1 - ss(u / 0.3)); G.muro.visible = u < 0.31; const k = ss((u - 0.15) / 0.7); cam(C, lerp(AZ + 4, PL, k), lerp(50, 89.9, k), lerp(540, 1650, k), lerp(60, 120, k)); arco(R15, ss((u - 0.45) / 0.45), RED, 5); text(540, 1580, TX('15 MINUTOS ANDANDO DESDE CASA · CIUDAD ESQUEMÁTICA', '15 MINUTES ON FOOT FROM HOME · SCHEMATIC CITY'), 'labr', 'middle', ss((u - 0.7) / 0.2)); }],
    [9, 13.5, (u) => { show('ciudad', 'casaR', 'c15'); cam(C, PL, 89.9, lerp(1650, 1560, ss(u)), 120); marca('casa', ss(u / 0.12)); SVC.forEach((key, i) => { estela(aSvc(key), ss((u - 0.05 - 0.07 * i) / 0.35), RED, 4, '10 8', 9); marca(key, ss((u - 0.3 - 0.07 * i) / 0.12)); }); }],
    [13.5, 18, (u) => { show('ciudad', 'casaR', 'c15'); const k = ss(u); cam(C, AZ + lerp(70, 110, k), lerp(28, 24, k), lerp(700, 520, k), 140); text(540, 1560, 'CARLOS MORENO · 2016', 'labr', 'middle', ss((u - 0.15) / 0.2)); text(540, 1600, TX('PARÍS · 2020', 'PARIS · 2020'), 'lab', 'middle', ss((u - 0.45) / 0.2)); }],
    [18, 22.5, (u) => { show('ciudad', 'casaW', 'ronda', 'filtros'); cam(C, PL, 89.9, lerp(1850, 1950, ss(u)), 140); FIL.forEach(([x, z], i) => { const p = proj([x, 2, z]); dot(p, 18 + 8 * (1 - ss((u - 0.2 - 0.07 * i) / 0.1)), RED, ss((u - 0.2 - 0.07 * i) / 0.1)); }); const pr = proj([0, 2, -1450]); text(pr[0], pr[1] - 20, TX('RONDA', 'RING ROAD'), 'lab', 'middle', ss((u - 0.1) / 0.15)); text(540, 1560, TX('OXFORD · 2023 · 6 FILTROS DE TRÁFICO · ESQUEMA', 'OXFORD · 2023 · 6 TRAFFIC FILTERS · SCHEMATIC'), 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [22.5, 27, (u) => { show('ciudad', 'casaW', 'filtros'); const k = ss(u); cam([-660, 0, 140], AZ + lerp(120, 140, k), lerp(38, 34, k), 300, 120);
      const coche = [[-1000, 2, 88], [-690, 2, 88], [-720, 2, 120], [-720, 2, 240], [-1000, 2, 240]], bici = [[-1000, 2, 70], [-300, 2, 70]], bus = [[-1000, 2, 76], [-300, 2, 76]];
      estela(coche, ss((u - 0.05) / 0.8), INK, 8, '16 12', 13); estela(bici, ss((u - 0.15) / 0.6), RED, 6, '', 10); estela(bus, ss((u - 0.35) / 0.6), RED, 6, '', 10);
      const pf = proj([-640, 2, 80]); text(pf[0], pf[1] + 46, TX('FILTRO', 'FILTER'), 'labr', 'middle', ss((u - 0.05) / 0.15));
      const pc = proj([-900, 2, 140]), pb = proj([-480, 2, 60]); text(pc[0], pc[1] - 30, TX('COCHE', 'CAR'), 'lab', 'middle', ss((u - 0.1) / 0.15)); text(pb[0], pb[1] - 34, TX('A PIE · BICI · BUS', 'ON FOOT · BIKE · BUS'), 'labr', 'middle', ss((u - 0.5) / 0.15)); }],
    [27, 31.5, (u) => { show('ciudad', 'casaW', 'ronda', 'filtros'); cam(C, PL, 89.9, 1950, 140); const p0 = [-880, 2, 80], p1 = [880, 2, -80];
      estela([p0, [-1120, 2, 80], [-1450, 2, 0], [-1025, 2, -1025], [0, 2, -1450], [1025, 2, -1025], [1450, 2, 0], [1120, 2, -80], p1], ss((u - 0.05) / 0.8), INK, 9, '16 12', 14); dot(proj(p1), 14, RED); const pa = proj(p0), pd = proj(p1); text(pa[0], pa[1] + 44, TX('SALIDA', 'START'), 'lab', 'middle', 1); text(pd[0], pd[1] + 44, TX('DESTINO', 'DESTINATION'), 'labr', 'middle', ss((u - 0.7) / 0.15)); text(540, 1560, TX('SIN BARRERAS: EN COCHE SE LLEGA, DANDO LA VUELTA', 'NO BARRIERS: YOU CAN STILL DRIVE THERE, THE LONG WAY'), 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [31.5, 36, (u) => { show('ciudad', 'casaW', 'perry'); const k = ss(u); const S0 = SP.colegio; cam([S0[0], 0, S0[1]], AZ + lerp(165, 195, k), lerp(46, 40, k), lerp(760, 620, k), 120);
      for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * Math.PI + 0.3, r = 400; estela([[S0[0] + Math.cos(a) * r, 2, S0[1] + Math.sin(a) * r], [S0[0], 2, S0[1]]], ss((u - 0.1 - 0.03 * i) / 0.6), RED, 3, '8 8', 8); } marca('colegio', ss((u - 0.05) / 0.15)); text(540, 1560, TX('CLARENCE PERRY · 1929 · RADIO DE 400 m', 'CLARENCE PERRY · 1929 · 400 m RADIUS'), 'labr', 'middle', ss((u - 0.15) / 0.2)); }],
    [36, 40.5, (u) => { show('ciudad', 'casaR', 'c15'); cam(C, PL, 89.9, lerp(1600, 1750, ss(u)), 120); marca('casa', 1); SVC.forEach((key, i) => marca(key, ss((u - 0.05 - 0.05 * i) / 0.12))); }],
  ];
  const END = SC[SC.length - 1][1];
  window.renderAt = (t) => { t = clamp(t, 0, END - 1e-4); SV = ''; G.muro.scale.y = 1; G.muro.visible = true; for (const [a, b, fn] of SC) if (t >= a && t < b) { fn((t - a) / (b - a), t); break; } svg.innerHTML = SV; ink.render(scene, camera); };
  window.READY = true;
}
