// 021 · Monumento a los Caídos (Pamplona; José Yárnoz y Víctor Eusa, 1941–1952) y las dos propuestas finalistas del concurso para transformarlo en museo-memorial.
// Planta del conjunto (cruz, arquerías, iglesia y casa parroquial) y entorno: OpenStreetMap (v021.json, lo prepara motor/scripts/v021_build.py).
// Alturas, tambor, cúpula, linterna, templetes y las dos propuestas: volumetría aproximada a partir de fotos y de la descripción pública de los proyectos.
import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, makeInkPass, prism } from './lib.js';
const $ = (id) => document.getElementById(id);
const INK = '#1A1B20', RED = '#E2401C', PINK = '#F0B8A4', D2R = Math.PI / 180;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ss = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, lerp = (a, b, u) => a + (b - a) * u, lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const mk = (t = 0) => ({ P: [], B: [], T: [], t });
function tri(A, a, b, c, hint) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  if ((uy * vz - uz * vy) * hint[0] + (uz * vx - ux * vz) * hint[1] + (ux * vy - uy * vx) * hint[2] < 0) { const t = b; b = c; c = t; }
  A.P.push(...a, ...b, ...c); A.B.push(0, 0, 0); A.T.push(A.t, A.t, A.t);
}
const quad = (A, a, b, c, d, hint) => { tri(A, a, b, c, hint); tri(A, a, c, d, hint); };
const mesh = (A, M) => { const m = new THREE.Mesh(geomFrom(A.P, A.B, A.T), M); m.frustumCulled = false; return m; };
export async function init() {
  await Promise.all([document.fonts.load("24px SM"), document.fonts.load("700 44px SG")]);
  const D = await fetch('v021.json').then(r => r.json());
  const UX = Math.cos(D.eje), UZ = Math.sin(D.eje), VX = -UZ, VZ = UX;                       // u: a lo largo de las arquerías (hacia el NE); v: hacia la parte trasera (SE)
  const W2 = (u, v) => [u * UX + v * VX, u * UZ + v * VZ];                                       // (u, v) → (x, z)
  const C0 = (() => { const m = D.piezas.monumento; return [m.reduce((s, p) => s + p[0], 0) / m.length, m.reduce((s, p) => s + p[1], 0) / m.length]; })();
  const P3 = (u, y, v) => { const [x, z] = W2(u, v); return [C0[0] + x, y, C0[1] + z]; };
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
  const solid = (c, o = {}) => fillMat(c, { hatch: 0, side: o.side ?? 0.94, shade: o.shade ?? 0.84, double: true, poche: RED, roof: o.roof });
  const stoneM = solid('#F6F5F1'), domeM = solid('#8A8D92', { side: 0.95, shade: 0.86 }), slabM = solid('#D9D4C8', { side: 0.95, shade: 0.88 }), glassM = solid('#DCE3E6', { side: 0.97, shade: 0.92 });
  const redM = solid(RED, { side: 1, shade: 0.9 }), pinkM = solid(PINK, { side: 0.96, shade: 0.92 }), greenM = solid('#DDE6D2', { side: 1, shade: 1 });
  const bldM = fillMat('#F6F5F1', { hatch: 0, side: 0.95, shade: 0.88, roof: '#EFDCD0', windows: 0.35 });
  const G = {}; const grp = (n) => { const g = new THREE.Group(); scene.add(g); G[n] = g; return g; };
  const addL = (g, pos, mat, ro = 3) => { const l = segs(pos, mat, ro); l.frustumCulled = false; g.add(l); return l; };
  // ---------- entorno ----------
  { grp('ctx'); const A = mk(), Eg = []; for (const b of D.ctx) prism(b.r, 0, b.h, 2.2, A.P, A.B, A.T, Eg, {}); G.ctx.add(mesh(A, bldM));
    const R = []; for (const r of D.roads) for (let i = 0; i + 1 < r.length; i++) R.push(r[i][0], 0.05, r[i][1], r[i + 1][0], 0.05, r[i + 1][1]); addL(G.ctx, R, lineMat('#DDD9CF', 1.4), 1);
    const Gr = mk(0.1); for (const r of D.green) { let f; try { f = THREE.ShapeUtils.triangulateShape(r.map(p => new THREE.Vector2(p[0], p[1])), []); } catch (e) { continue; } for (const q of f) tri(Gr, [r[q[0]][0], 0.1, r[q[0]][1]], [r[q[1]][0], 0.1, r[q[1]][1]], [r[q[2]][0], 0.1, r[q[2]][1]], [0, 1, 0]); }
    const gm = mesh(Gr, greenM); gm.userData.noInk = true; G.ctx.add(gm); }
  // ---------- el conjunto: cruz griega (planta de OSM), iglesia y casa parroquial en los extremos ----------
  { grp('body'); const A = mk(21); prism(D.piezas.monumento, 0, 21, 0, A.P, A.B, A.T, [], {}); G.body.add(mesh(A, stoneM)); }
  { grp('ends'); const A = mk(16); for (const k of ['iglesia', 'casa']) prism(D.piezas[k], 0, 16, 0, A.P, A.B, A.T, [], {}); G.ends.add(mesh(A, bldM)); }
  // arquerías: volumen de 11 m con diez arcos en cada cara larga
  grp('arcades'); for (const k of ['arqueria_ne', 'arqueria_so']) { const r = D.piezas[k], A = mk(11); prism(r, 0, 11, 0, A.P, A.B, A.T, [], {}); const g = new THREE.Group(); g.add(mesh(A, stoneM));
    const pu = r.map(p => (p[0] - C0[0]) * UX + (p[1] - C0[1]) * UZ), pv = r.map(p => (p[0] - C0[0]) * VX + (p[1] - C0[1]) * VZ), u0 = Math.min(...pu), u1 = Math.max(...pu), v0 = Math.min(...pv), v1 = Math.max(...pv), L = [];
    for (const v of [v0 - 0.05, v1 + 0.05]) for (let i = 0; i < 10; i++) { const a0 = lerp(u0, u1, (i + 0.15) / 10), a1 = lerp(u0, u1, (i + 0.85) / 10), am = (a0 + a1) / 2, rr = (a1 - a0) / 2;
      L.push(...P3(a0, 0, v), ...P3(a0, 7, v), ...P3(a1, 0, v), ...P3(a1, 7, v)); for (let j = 0; j < 10; j++) { const t0 = Math.PI * j / 10, t1 = Math.PI * (j + 1) / 10; L.push(...P3(am + rr * Math.cos(t0), 7 + rr * Math.sin(t0), v), ...P3(am + rr * Math.cos(t1), 7 + rr * Math.sin(t1), v)); } }
    addL(g, L, lineMat(INK, 1.6)); G.arcades.add(g); G[k] = g; }
  // tambor, cúpula, linterna y templetes
  const NR = 32, ring = (A, r0, r1, y0, y1, cu = 0, cv = 0) => { for (let i = 0; i < NR; i++) { const a0 = 2 * Math.PI * i / NR, a1 = 2 * Math.PI * (i + 1) / NR, am = (a0 + a1) / 2;
      const p = (r, y, a) => P3(cu + r * Math.cos(a), y, cv + r * Math.sin(a)), o = W2(Math.cos(am), Math.sin(am));
      quad(A, p(r1, y0, a0), p(r1, y0, a1), p(r1, y1, a1), p(r1, y1, a0), [o[0], 0, o[1]]); if (r0 > 0) quad(A, p(r0, y0, a0), p(r0, y0, a1), p(r0, y1, a1), p(r0, y1, a0), [-o[0], 0, -o[1]]);
      quad(A, p(r0, y1, a0), p(r0, y1, a1), p(r1, y1, a1), p(r1, y1, a0), [0, 1, 0]); } };
  const dome = (A, r, y0, h) => { const n = 14; for (let i = 0; i < NR; i++) for (let j = 0; j < n; j++) { const a0 = 2 * Math.PI * i / NR, a1 = 2 * Math.PI * (i + 1) / NR, t0 = (Math.PI / 2) * j / n, t1 = (Math.PI / 2) * (j + 1) / n;
      const p = (a, t) => P3(r * Math.cos(t) * Math.cos(a), y0 + h * Math.sin(t), r * Math.cos(t) * Math.sin(a)), o = W2(Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2));
      quad(A, p(a0, t0), p(a1, t0), p(a1, t1), p(a0, t1), [o[0], 0.6, o[1]]); } };
  { grp('drum'); const A = mk(31); ring(A, 0, 14, 21, 31); G.drum.add(mesh(A, stoneM)); }
  { grp('dome'); const A = mk(46); dome(A, 14, 31, 15); G.dome.add(mesh(A, domeM)); }
  { grp('domeStone'); const A = mk(46); dome(A, 14.3, 31, 15.3); G.domeStone.add(mesh(A, slabM)); const L = []; for (let j = 1; j < 9; j++) { const t = (Math.PI / 2) * j / 9; for (let i = 0; i < NR; i++) { const a0 = 2 * Math.PI * i / NR, a1 = 2 * Math.PI * (i + 1) / NR; L.push(...P3(14.4 * Math.cos(t) * Math.cos(a0), 31 + 15.4 * Math.sin(t), 14.4 * Math.cos(t) * Math.sin(a0)), ...P3(14.4 * Math.cos(t) * Math.cos(a1), 31 + 15.4 * Math.sin(t), 14.4 * Math.cos(t) * Math.sin(a1))); } } addL(G.domeStone, L, lineMat('#8C897F', 1.1)); }
  { grp('domeGlass'); const A = mk(46); dome(A, 14.3, 31, 15.3); G.domeGlass.add(mesh(A, solid('#CFE0E6', { side: 0.97, shade: 0.9 }))); const L = [];
    for (let i = 0; i < 48; i++) for (let j = 0; j < 9; j++) { const a0 = 2 * Math.PI * i / 48 + (j % 2) * Math.PI / 48, a1 = a0 + Math.PI / 48, t0 = (Math.PI / 2) * j / 10, t1 = (Math.PI / 2) * (j + 1) / 10;
      const q = (a, t) => P3(14.42 * Math.cos(t) * Math.cos(a), 31 + 15.42 * Math.sin(t), 14.42 * Math.cos(t) * Math.sin(a)); L.push(...q(a0, t0), ...q(a1, t1), ...q(a1, t1), ...q(a0 + Math.PI / 24, t0)); }
    addL(G.domeGlass, L, lineMat('#7FA3AE', 1.0)); }
  { grp('lanternMin'); const A = mk(48); ring(A, 0, 2.6, 46, 47.6); dome(A, 2.6, 47.6, 1.0); G.lanternMin.add(mesh(A, slabM)); }
  { grp('glassCyl'); const A = mk(28); for (const [su, sv] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) ring(A, 0, 2.3, 21, 27.5, su * 15.5, sv * 15.5 - 6.5); G.glassCyl.add(mesh(A, glassM)); }
  // Harriak Hitz: gran plataforma horizontal a cota de planta primera, con un gran hueco circular en el lado del paso peatonal, y el centro de interpretación debajo
  { grp('plataforma'); const A = mk(6); const out = [[-58, -38], [58, -38], [58, -8], [-58, -8]], hc = [-36, -22], hr = 10, hole = []; for (let i = 0; i < 40; i++) { const a = -2 * Math.PI * i / 40; hole.push([hc[0] + hr * Math.cos(a), hc[1] + hr * Math.sin(a)]); }
    const f = THREE.ShapeUtils.triangulateShape(out.map(p => new THREE.Vector2(p[0], p[1])), [hole.map(p => new THREE.Vector2(p[0], p[1]))]), pts = [...out, ...hole];
    for (const q of f) for (const y of [5.0, 5.9]) tri(A, P3(pts[q[0]][0], y, pts[q[0]][1]), P3(pts[q[1]][0], y, pts[q[1]][1]), P3(pts[q[2]][0], y, pts[q[2]][1]), y > 5.5 ? [0, 1, 0] : [0, -1, 0]);
    const wall = (r, inward) => { for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], mx = (a[0] + b[0]) / 2, mv = (a[1] + b[1]) / 2, c = inward ? [hc[0] - mx, hc[1] - mv] : [mx, mv + 23], o = W2(c[0], c[1]); quad(A, P3(a[0], 5.0, a[1]), P3(b[0], 5.0, b[1]), P3(b[0], 5.9, b[1]), P3(a[0], 5.9, a[1]), [o[0], 0, o[1]]); } };
    wall(out, false); wall(hole, true); G.plataforma.add(mesh(A, solid('#E4DED2', { side: 0.95, shade: 0.88 })));
    const C = mk(5); const Q = [[24, -36], [55, -36], [55, -10], [24, -10]].map(([a, b]) => { const [x, z] = W2(a, b); return [C0[0] + x, C0[1] + z]; }); prism(Q, 0, 5.0, 0, C.P, C.B, C.T, [], {}); G.plataforma.add(mesh(C, solid('#E4DED2', { side: 0.95, shade: 0.88 }))); }
  // Itzaletik Argira: pieza horizontal baja que rodea el edificio a cota de calle (cubierta vegetal)
  { grp('anillo'); const A = mk(4.5); const ringR = (u0, u1, v0, v1) => { const Q = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([a, b]) => { const [x, z] = W2(a, b); return [C0[0] + x, C0[1] + z]; }); prism(Q, 0, 4.5, 0, A.P, A.B, A.T, [], {}); };
    ringR(-40, 40, -46, -36); ringR(-40, 40, 23, 31); ringR(-40, -31, -36, 23); ringR(31, 40, -36, 23); G.anillo.add(mesh(A, solid('#E7ECDD', { side: 0.97, shade: 0.9, roof: '#DDE6D2' }))); }
  { grp('lantern'); const A = mk(53); ring(A, 0, 2.6, 46, 51); dome(A, 2.6, 51, 2.2); G.lantern.add(mesh(A, stoneM)); }
  { grp('templetes'); const A = mk(27); for (const [su, sv] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const cu = su * 15.5, cv = sv * 15.5 - 6.5; const Q = [[-2.6, -2.6], [2.6, -2.6], [2.6, 2.6], [-2.6, 2.6]].map(([a, b]) => { const [x, z] = W2(cu + a, cv + b); return [C0[0] + x, C0[1] + z]; }); prism(Q, 21, 26, 0, A.P, A.B, A.T, [], {}); } G.templetes.add(mesh(A, stoneM)); }
  // cripta (bajo la cruz) para la sección
  { grp('crypt'); const A = mk(); const Q = [[-15, -15], [15, -15], [15, 15], [-15, 15]].map(([a, b]) => { const [x, z] = W2(a, b - 6.5); return [C0[0] + x, C0[1] + z]; }); prism(Q, -6, -0.5, 0, A.P, A.B, A.T, [], {}); G.crypt.add(mesh(A, pinkM)); }
  // ---------- Harriak Hitz: zócalo a la altura de la cripta delante del edificio, cúpula forrada de piedra, sin linterna ni templetes ----------
  { grp('zocalo'); const A = mk(); const Q = [[-46, -52], [46, -52], [46, -31], [-46, -31]].map(([a, b]) => { const [x, z] = W2(a, b); return [C0[0] + x, C0[1] + z]; }); prism(Q, 0.15, 0.35, 0, A.P, A.B, A.T, [], {}); G.zocalo.add(mesh(A, solid(PINK, { side: 1, shade: 1 })));
    const L = []; for (let k = 0; k <= 6; k++) { const d = k * 1.6; L.push(...P3(-46 + d, 0.4, -52 + d), ...P3(46 - d, 0.4, -52 + d), ...P3(46 - d, 0.4, -52 + d), ...P3(46 - d, 0.4, -31 - d * 0), ...P3(-46 + d, 0.4, -52 + d), ...P3(-46 + d, 0.4, -31)); } addL(G.zocalo, L, lineMat(RED, 2.2)); }
  // ---------- Itzaletik Argira: sin arquerías, mirador de vidrio que rodea la base de la cúpula y volumen acristalado a la altura de la cripta ----------
  { grp('mirador'); const A = mk(37); ring(A, 15.0, 18.5, 31, 36.5); G.mirador.add(mesh(A, glassM)); const L = []; for (let i = 0; i < 48; i++) { const a = 2 * Math.PI * i / 48; L.push(...P3(18.55 * Math.cos(a), 31, 18.55 * Math.sin(a)), ...P3(18.55 * Math.cos(a), 36.5, 18.55 * Math.sin(a))); } addL(G.mirador, L, lineMat(RED, 1.6)); }
  const ink = makeInkPass(renderer, W, H);
  // ---------- cámara, rótulos y escenas ----------
  const proj = (p) => { const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
  const AZF = Math.atan2(-VX, -VZ) / D2R;                                                   // acimut que mira el edificio de frente, desde la avenida (lado −v)
  function cam(tg, az, el, z, dy = 160) {
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z; const d = 9000; az *= D2R; el *= D2R;
    camera.position.set(tg[0] + Math.sin(az) * Math.cos(el) * d, tg[1] + Math.sin(el) * d, tg[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); if (el > 89) camera.up.set(-Math.sin(az), 0, -Math.cos(az)); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateMatrixWorld();
    camera.position.addScaledVector(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1), dy * 2 * z / H);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
  }
  const svg = $('ov'); let SV = '';
  const text = (x, y, s, cls = 'lab', anchor = 'start', op = 1) => { if (op > 0.01) SV += `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" opacity="${op.toFixed(2)}">${s}</text>`; };
  const show = (...n) => { for (const k of Object.keys(G)) if (G[k].isGroup) G[k].visible = n.includes(k); G.arqueria_ne.visible = G.arqueria_so.visible = n.includes('arcades'); for (const k of ['arqueria_ne', 'arqueria_so']) G[k].scale.set(1, 1, 1); };
  const ORIG = ['ctx', 'body', 'ends', 'arcades', 'drum', 'dome', 'lantern', 'templetes'];
  const TG = [C0[0], 14, C0[1]];
  const SC = [
    [0, 4.5, (u) => { show(...ORIG); const k = ss(u); cam(TG, AZF + lerp(-28, -18, k), lerp(34, 28, k), lerp(170, 120, k)); }],
    [4.5, 9.5, (u) => { show(...ORIG); const k = ss(u); cam(TG, AZF + lerp(-18, -6, k), lerp(28, 18, k), lerp(120, 80, k)); }],
    [9.5, 14, (u) => { show(...ORIG); cam([C0[0], 0, C0[1]], AZF, 89.9, lerp(150, 110, ss(u)), 130); const p0 = proj(P3(0, 0, -260)), p1 = proj(P3(0, 0, -30)); SV += `<line x1="${p0[0]}" y1="${p0[1]}" x2="${p1[0]}" y2="${p1[1]}" stroke="${RED}" stroke-width="4" stroke-dasharray="14 10" opacity="${ss(u / 0.4)}"/>`; text(p0[0] + 16, p0[1] + 230, 'AVENIDA DE CARLOS III', 'labr', 'start', ss(u / 0.4)); }],
    [14, 18.5, (u) => { show(...ORIG); const k = ss(u); cam(TG, AZF + 30, 26, 95); const a = ss((u - 0.15) / 0.3); for (const g of [G.arqueria_ne, G.arqueria_so]) g.children[0].material = a > 0.5 ? redM : stoneM; text(540, 1580, 'ARQUERÍAS · CATALOGADAS CON GRADO 3', 'labs', 'middle', a); }],
    [18.5, 23, (u) => { show('body', 'drum', 'dome', 'lantern', 'templetes', 'crypt'); renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(...(() => { const [x, z] = W2(1, 0); return [x, 0, z]; })()), -C0[0] * UX - C0[1] * UZ)]; cam([C0[0], 8, C0[1]], AZF - 90, 12, 60, 170); const p = proj(P3(0, -3.5, -6.5)); text(p[0], p[1] + 70, 'CRIPTA · 1961 – 2016', 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [23, 27.5, (u) => { show(...ORIG); cam(TG, AZF - 10, 24, 90); for (let i = 0; i < 21; i++) { const x = 140 + (i % 7) * 118, y = 1240 + Math.floor(i / 7) * 92, a = ss((u - 0.05 - i * 0.025) / 0.1), fin = i === 8 || i === 15; SV += `<rect x="${x}" y="${y}" width="96" height="70" fill="${fin && u > 0.75 ? RED : '#F6F5F1'}" stroke="${INK}" stroke-width="1.5" opacity="${a.toFixed(2)}"/>`; } text(540, 1530, '21 PROPUESTAS · 2 FINALISTAS', 'labr', 'middle', ss((u - 0.6) / 0.2)); }],
    [27.5, 33.5, (u) => { const a = ss((u - 0.12) / 0.3), b = ss((u - 0.42) / 0.3); show('ctx', 'body', 'ends', 'arcades', 'drum', ...(a < 0.5 ? ['dome', 'lantern', 'templetes'] : ['domeStone', 'lanternMin', 'glassCyl']), ...(b > 0.02 ? ['plataforma'] : [])); G.plataforma.scale.set(1, Math.max(0.02, b), 1); cam(TG, AZF - 24, 26, 94);
      text(540, 1580, 'HARRIAK HITZ · SEGÚN SU MEMORIA (ESQUEMA)', 'labs', 'middle', 1); if (b > 0.5) { const p = proj(P3(-36, 6, -22)); text(p[0], p[1] - 30, 'HUECO CIRCULAR', 'labr', 'middle', ss((u - 0.7) / 0.15)); } }],
    [33.5, 39.5, (u) => { const a = ss((u - 0.08) / 0.3), c = ss((u - 0.3) / 0.25), b = ss((u - 0.5) / 0.3); show('ctx', 'body', 'ends', 'arcades', 'drum', 'lantern', 'templetes', c < 0.5 ? 'dome' : 'domeGlass', ...(b > 0.02 ? ['mirador', 'anillo'] : [])); for (const k of ['arqueria_ne', 'arqueria_so']) G[k].scale.set(1, Math.max(0.01, 1 - a), 1); G.mirador.scale.set(1, 1, 1); G.mirador.position.y = lerp(12, 0, b); G.anillo.scale.set(1, Math.max(0.02, b), 1); cam(TG, AZF + 22, 26, 94);
      text(540, 1580, 'ITZALETIK ARGIRA · SEGÚN SU MEMORIA (ESQUEMA)', 'labs', 'middle', 1); }],
    [39.5, 44.5, (u) => { show('ctx', 'body', 'ends', 'drum', 'domeGlass', 'lantern', 'templetes', 'mirador', 'anillo'); G.mirador.scale.set(1, 1, 1); G.mirador.position.y = 0; G.anillo.scale.set(1, 1, 1); cam(TG, AZF + lerp(22, 10, ss(u)), 24, 100); text(540, 1580, 'CONSULTA VECINAL · JUNIO DE 2026', 'labr', 'middle', ss((u - 0.2) / 0.2)); }],
    [44.5, 50, (u) => { show(...ORIG); const k = ss(u); cam(TG, AZF + lerp(-4, 8, k), lerp(20, 30, k), lerp(85, 150, k)); }],
  ];
  const END = SC[SC.length - 1][1];
  window.renderAt = (t) => { t = clamp(t, 0, END - 1e-4); SV = ''; renderer.clippingPlanes = []; for (const g of [G.arqueria_ne, G.arqueria_so]) g.children[0].material = stoneM; G.zocalo.position.y = 0;
    for (const [a, b, fn] of SC) if (t >= a && t < b) { fn((t - a) / (b - a), t); break; }
    svg.innerHTML = SV; ink.render(scene, camera); };
  window.READY = true;
}
