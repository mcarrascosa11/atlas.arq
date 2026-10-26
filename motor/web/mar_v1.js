import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, edgesOf, boxG, merge, prism, geomFrom } from './lib.js';
const $ = (id) => document.getElementById(id);
const LW = { A: 1.8, B: 1.0, C: 0.5 }; const INK = '#1A1B20', GREY = '#9A978F', RED = '#E2401C';
// Cross-section traced from De la Sota's section (18.75 px = 1 m, from the +6.40 / -3.50 marks; gym floor 0.00).
// Plan from "Planta segunda" (18.08 px = 1 m, from the 6 m column spacing): column axes, rhomboid west end, gym end.
const S = 18.75, X = (px) => (px - 129) / S, Z = (py) => (386 - py) / S;
const TZ = [-4.9, -10.9, -16.9, -22.9, -28.9, -34.8, -40.9];   // truss / column axes
const ZEND = -45.5, ZBLD = -57, SKEW = 10.3 / 22.35;             // gym end wall, building end, west end slants 10.3 m across the width
const ROOMS = [-16.9, -34.8];                                   // three conference rooms hung between trusses
const paper = fillMat('#F4F2EC', { hatch: 1, side: 0.95, shade: 0.86 }), steel = fillMat('#EEECE6', { hatch: 1, side: 0.9, shade: 0.8 }), poche = fillMat('#26272C', { hatch: 0 }), earthCut = fillMat('#B9B6AE', { hatch: 0 }), redF = fillMat(RED, { hatch: 1, side: 0.9, shade: 0.8 }), redCut = fillMat(RED, { hatch: 0 }), woodF = fillMat('#E7E2D6', { hatch: 1, side: 0.93, shade: 0.84 });
const shape = (poly) => new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
// extrude along the length; the west end follows the slanted (rhomboid) site edge
function extS(poly, z0, z1, skew = true) { const g = new THREE.ExtrudeGeometry(shape(poly), { depth: z0 - z1, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, z1); const n = g.toNonIndexed(); if (skew) { const p = n.attributes.position; for (let i = 0; i < p.count; i++) if (p.getZ(i) > z0 - 1e-3) p.setZ(i, z0 - SKEW * Math.max(0, p.getX(i))); } n.computeVertexNormals(); return n; }
function cutF(poly, z) { const g = new THREE.ShapeGeometry(shape(poly)); g.translate(0, 0, z); return g.toNonIndexed(); }
// a straight steel bar between two points in a vertical plane z
function bar(a, b, z, t = 0.22, w = 0.3) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); const g = new THREE.BoxGeometry(L, t, w); g.rotateZ(Math.atan2(dy, dx)); g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z); return g.toNonIndexed(); }
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.localClippingEnabled = true; renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
  const G = {}; for (const k of ['terrain', 'building', 'truss', 'rooms', 'kids', 'cutT', 'cutB', 'cutR', 'slope']) { G[k] = new THREE.Group(); scene.add(G[k]); }
  const ZT0 = 6, ZT1 = -66;                                     // terrain extent
  // ---- terrain: lower street (Joaquín Costa), hillside and upper street (Guadalquivir)
  const earthR = [[X(575), Z(470)], [X(760) + 8, Z(470)], [X(760) + 8, Z(150)], [X(645), Z(150)], [X(645), Z(265)], [X(575), Z(265)]];
  const earthL = [[X(0) - 12, Z(470)], [X(126), Z(470)], [X(126), Z(392)], [X(0) - 12, Z(392)]];
  const earthB = [[X(126), Z(470)], [X(575), Z(470)], [X(575), Z(455)], [X(126), Z(455)]];
  for (const p of [earthR, earthL, earthB]) { const g = extS(p, ZT0, ZT1, false); G.terrain.add(new THREE.Mesh(g, paper)); G.terrain.add(segs(edgesOf(g, 30), lineMat(INK, LW.B))); G.cutT.add(new THREE.Mesh(cutF(p, 0), earthCut)); }
  { const p = [[X(126), Z(392)], [X(575), Z(392)], [X(575), Z(150)]]; const g = extS(p, ZT0, ZT1, false); G.slope.add(new THREE.Mesh(g, paper)); G.slope.add(segs(edgesOf(g, 30), lineMat(INK, LW.B))); }
  // ---- concrete: retaining wall, basement, gym floor, roof slab (the playground), east floors
  const conc = [
    [[X(548), Z(470)], [X(575), Z(470)], [X(575), Z(265)], [X(548), Z(265)]],
    [[X(126), Z(455)], [X(548), Z(455)], [X(548), Z(447)], [X(126), Z(447)]],
    [[X(126), Z(455)], [X(137), Z(455)], [X(137), Z(386)], [X(126), Z(386)]],
    [[X(126), Z(392)], [X(548), Z(392)], [X(548), Z(384)], [X(126), Z(384)]],
    [[X(122), Z(160)], [X(645), Z(160)], [X(645), Z(150)], [X(122), Z(150)]],
    [[X(548), Z(268)], [X(645), Z(268)], [X(645), Z(262)], [X(548), Z(262)]],
    [[X(490), Z(225)], [X(645), Z(225)], [X(645), Z(219)], [X(490), Z(219)]],
  ];
  for (const p of conc) { const g = extS(p, 0, ZBLD); G.building.add(new THREE.Mesh(g, paper)); G.building.add(segs(edgesOf(g, 30), lineMat(INK, LW.B))); G.cutB.add(new THREE.Mesh(cutF(p, 0), poche)); }
  // roof parapet / railings on the playground edge (street side)
  { const g = extS([[X(122), Z(150)], [X(126), Z(150)], [X(126), Z(150) + 1.1], [X(122), Z(150) + 1.1]], 0, ZBLD); G.building.add(new THREE.Mesh(g, paper)); G.building.add(segs(edgesOf(g, 30), lineMat(INK, LW.C))); }
  // gym end wall and the service block beyond it (changing rooms), under the same roof
  { const g = extS([[X(126), Z(384)], [X(548), Z(384)], [X(548), Z(160)], [X(126), Z(160)]], ZEND, ZBLD, false); G.building.add(new THREE.Mesh(g, paper)); G.building.add(segs(edgesOf(g, 30), lineMat(INK, LW.B))); }
  // west facade on Joaquín Costa: strip windows between brick bands, on the slanted line
  { const Lg = []; const fx = X(129); const zf = (x) => -SKEW * Math.max(0, x);
    for (let z = zf(fx); z >= ZEND; z -= 1.5) Lg.push(fx, Z(386), z, fx, Z(160), z);
    for (const zz of [Z(386), Z(330), Z(300), Z(240), Z(225), Z(160)]) Lg.push(fx, zz, zf(fx), fx, zz, ZEND);
    G.building.add(segs(Lg, lineMat(GREY, LW.C))); }
  // tribunes along the back wall, under the trusses (Planta segunda)
  { const st = []; for (let i = 0; i < 6; i++) st.push([X(548) - 0.8 * i, Z(386) + 1.0 + 0.45 * (5 - i)]);
    const poly = [[X(548) - 0.8 * 6, Z(384)], [X(548), Z(384)], [X(548), Z(386) + 1.0 + 0.45 * 6]]; for (let i = 0; i < 6; i++) { const x = X(548) - 0.8 * (i + 1); poly.push([x + 0.8, Z(386) + 1.0 + 0.45 * (6 - i)], [x, Z(386) + 1.0 + 0.45 * (6 - i)]); }
    const g = extS(poly.map(([x, y]) => [x, y]), -4.9, -40.9, false); G.building.add(new THREE.Mesh(g, woodF)); G.building.add(segs(edgesOf(g, 30), lineMat(INK, LW.C))); }
  // court lines on the gym floor
  { const C = []; const y = Z(384) + 0.02, x0 = X(160), x1 = X(500), z0 = -8, z1 = -40; const line = (a, b) => C.push(a[0], y, a[1], b[0], y, b[1]);
    line([x0, z0], [x1, z0]); line([x1, z0], [x1, z1]); line([x1, z1], [x0, z1]); line([x0, z1], [x0, z0]); line([x0, (z0 + z1) / 2], [x1, (z0 + z1) / 2]);
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, b = (i + 1) / 40 * Math.PI * 2, r = 1.8, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; line([cx + r * Math.cos(a), cz + r * Math.sin(a)], [cx + r * Math.cos(b), cz + r * Math.sin(b)]); }
    G.building.add(segs(C, lineMat(GREY, LW.C))); }
  // ---- steel trusses: top chord, curved bottom chord, end diagonal, hangers and Warren diagonals, as bars
  const curve = [[240, 265], [300, 270], [360, 268], [420, 255], [480, 238], [540, 225]].map(([x, y]) => [X(x), Z(y)]);
  const top = Z(160) - 0.15, A = [X(165), top];
  const atCurve = (x) => { for (let i = 0; i < curve.length - 1; i++) { const a = curve[i], b = curve[i + 1]; if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return curve[curve.length - 1][1]; };
  const nodes = []; for (let x = curve[0][0]; x <= curve[curve.length - 1][0] + 1e-6; x += (curve[curve.length - 1][0] - curve[0][0]) / 10) nodes.push(x);
  const BR = [];
  for (const z of TZ) {
    BR.push(bar([X(129), top], [X(548), top], z, 0.35, 0.35));
    BR.push(bar(A, curve[0], z)); BR.push(bar([X(129), top - 0.6], A, z, 0.2, 0.25));
    for (let i = 0; i < curve.length - 1; i++) BR.push(bar(curve[i], curve[i + 1], z, 0.3, 0.32));
    BR.push(bar(curve[curve.length - 1], [X(548), top], z));
    for (let i = 0; i < nodes.length; i++) { const x = nodes[i]; BR.push(bar([x, top], [x, atCurve(x)], z, 0.16, 0.2)); if (i < nodes.length - 1) { const xn = nodes[i + 1]; BR.push(i % 2 ? bar([x, top], [xn, atCurve(xn)], z, 0.14, 0.18) : bar([x, atCurve(x)], [xn, top], z, 0.14, 0.18)); } }
    BR.push(bar([X(129), Z(386)], [X(129), top], z, 0.35, 0.35)); BR.push(bar([X(548), Z(265)], [X(548), top], z, 0.35, 0.35));
  }
  const tg = merge(BR); G.truss.add(new THREE.Mesh(tg, redF)); G.truss.add(segs(edgesOf(tg, 35), lineMat('#8E2410', LW.C)));
  // ---- the conference rooms hung inside the trusses: the stepped "belly" in vermillion
  { const x0 = curve[1][0], x1 = curve[curve.length - 1][0], n = 12;
    const prof = [[curve[0][0], curve[0][1] + 0.3], [x0, curve[1][1] + 0.3]];
    for (let i = 0; i < n; i++) { const xa = x0 + (x1 - x0) * i / n, xb = x0 + (x1 - x0) * (i + 1) / n; const zz = atCurve(xb) + 0.3; prof.push([xa, zz], [xb, zz]); }
    const poly = [...prof, ...curve.slice().reverse().map(([x, z]) => [x, z - 0.05])];
    const g = extS(poly, ROOMS[0], ROOMS[1], false); G.rooms.add(new THREE.Mesh(g, redF)); G.rooms.add(segs(edgesOf(g, 30), lineMat('#8E2410', LW.C)));
    G.cutR.add(new THREE.Mesh(cutF(poly, 0), redCut));
    // the rooms' side walls (on the truss planes) and their glazed ends, light
    for (const z of [ROOMS[0], -22.9, -28.9, ROOMS[1]]) { const wp = [...curve, [X(548), top], [A[0] + 4.2, top]]; G.rooms.add(new THREE.Mesh(cutF(wp, z), fillMat('#E9E5DC', { hatch: 0, double: true, poche: '#E9E5DC' }))); } }
  // ---- children: on the playground roof (most) and a few in the gym
  { const K = []; const kid = (x, y, z) => { const g = new THREE.CylinderGeometry(0.2, 0.2, 1.05, 10); g.translate(x, y + 0.53, z); K.push(g.toNonIndexed()); const h = new THREE.SphereGeometry(0.2, 10, 8); h.translate(x, y + 1.28, z); K.push(h.toNonIndexed()); };
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 34; i++) { const x = X(170) + r() * (X(630) - X(170)); kid(x, Z(150), -SKEW * x - 1 - r() * (ZBLD + SKEW * x + 3) * -1); }
    for (let i = 0; i < 8; i++) kid(X(180) + r() * (X(500) - X(180)), Z(384), -12 - r() * 28);
    G.kids.add(new THREE.Mesh(merge(K), fillMat('#1A1B20', { hatch: 0 }))); }   // people in ink, as in De la Sota's section
  // ---- section plane: everything in front of it is removed; the poché faces sit on it
  const clipP = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const keep = new Set([poche, earthCut, redCut]);
  scene.traverse(o => { o.frustumCulled = false; if (o.material && !keep.has(o.material)) o.material.clippingPlanes = [clipP]; });
  window.shot = (o) => {
    const cz = o.clipZ ?? 50; clipP.constant = cz; for (const k of ['cutT', 'cutB', 'cutR']) G[k].position.z = cz;
    G.building.visible = o.show.includes('b'); G.truss.visible = o.show.includes('t'); G.rooms.visible = o.show.includes('r'); G.kids.visible = o.show.includes('k'); G.slope.visible = !!o.slope;
    G.cutT.visible = cz < 6; G.cutB.visible = o.show.includes('b') && cz < 0; G.cutR.visible = o.show.includes('r') && cz < ROOMS[0] && cz > ROOMS[1];
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, t = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 3000; camera.position.set(t[0] + Math.sin(az) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); camera.lookAt(t[0], t[1], t[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    $('kicker').textContent = o.kick || ''; $('title').style.opacity = o.title ? 1 : 0; if (o.title) $('title').textContent = o.title; $('sub').textContent = o.sub || ''; $('sub').style.opacity = o.sub ? 1 : 0;
    const svg = $('ov'); svg.innerHTML = ''; const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    if (o.dim) { const a = P([X(100), Z(392), cz]), b = P([X(100), Z(150), cz]), a2 = P([X(20), Z(392), cz]), b2 = P([X(690), Z(150), cz]);
      svg.insertAdjacentHTML('beforeend', `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${RED}" stroke-width="3"/><line x1="${a[0] - 12}" y1="${a[1]}" x2="${a[0] + 12}" y2="${a[1]}" stroke="${RED}" stroke-width="3"/><line x1="${b[0] - 12}" y1="${b[1]}" x2="${b[0] + 12}" y2="${b[1]}" stroke="${RED}" stroke-width="3"/><text class="dim" x="${a[0] - 18}" y="${(a[1] + b[1]) / 2}" text-anchor="end" style="font-size:44px">12 m</text>`);
      for (const [q, t2] of [[a2, 'C/ JOAQUÍN COSTA'], [b2, 'C/ GUADALQUIVIR']]) svg.insertAdjacentHTML('beforeend', `<text class="lab" x="${q[0]}" y="${q[1] - 14}" text-anchor="middle">${t2}</text>`); }
    return true; };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u, fw = (t, a, b, f = 0.35) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
  const K = [
    { t: 0, tg: [13, 12, -24], z: 36, az: 22, el: 16, c: -20 }, { t: 8.2, tg: [13, 12.5, -24], z: 37, az: 22, el: 16, c: -20 },
    { t: 14.8, tg: [15, 13, -24], z: 34, az: 22, el: 18, c: -20 }, { t: 22.6, tg: [12.5, 9.5, -24], z: 21, az: 20, el: 13, c: -20 },
    { t: 30.4, tg: [13, 8.5, -24], z: 17, az: 18, el: 12, c: -20 }, { t: 37.6, tg: [14, 13, -24], z: 38, az: 22, el: 26, c: 50 },
    { t: 44.8, tg: [14, 13, -24], z: 40, az: 22, el: 26, c: 50 }, { t: 51.6, tg: [14, 12, -24], z: 46, az: 22, el: 24, c: 50 }, { t: 55.0, tg: [14, 12, -24], z: 46, az: 22, el: 24, c: 50 } ];
  const subs = [[2.6, 8.2, 'En 1960 el colegio Maravillas de Madrid necesitaba un gimnasio. Solo tenía un solar con 12 metros de desnivel entre dos calles.'],
    [8.6, 14.8, 'Alejandro de la Sota lo mete en el hueco: el gimnasio llena el desnivel y su cubierta queda a la altura de la calle de arriba.'],
    [15.2, 22.6, 'Para cubrir 20 metros sin pilares en medio, cerchas de acero cada 6 metros.'],
    [23.0, 30.6, 'Y aprovecha su canto: entre las cerchas cuelgan las salas de conferencias, con el suelo escalonado.'],
    [31.0, 37.8, 'Encima, el patio: la cubierta prolonga la calle de arriba y se llena de pistas para los alumnos.'],
    [38.2, 44.8, 'Tres usos apilados en el mismo hueco: gimnasio, salas y patio.'],
    [45.2, 51.8, 'Se terminó en 1962 y sigue en uso. Desde 2018 es Bien de Interés Cultural.']];
  const kick = [[0, '009 · MADRID, 1960–1962'], [2.6, '01 · EL SOLAR'], [8.6, '02 · LA IDEA'], [15.2, '03 · LA ESTRUCTURA'], [23.0, '04 · LAS SALAS'], [31.0, '05 · EL PATIO'], [38.2, '06 · TRES EN UNO'], [45.2, '07 · HOY'], [52.2, '009 · MADRID, 1960–1962']];
  const T = '¿Cómo se mete un gimnasio debajo del patio de un colegio?';
  window.renderAt = (t) => {
    let i = 1; while (i < K.length - 1 && K[i].t < t) i++; const a = K[i - 1], b = K[i]; const u = smr(seg(t, a.t, b.t));
    const o = { show: 'btrk', tg: a.tg.map((v, j) => lerp(v, b.tg[j], u)), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), az: lerp(a.az, b.az, u), el: lerp(a.el, b.el, u), clipZ: lerp(a.c, b.c, sm(seg(t, a.t, b.t))) };
    window.shot(o);
    let kk = ''; for (const [s0, k0] of kick) if (t >= s0) kk = k0; $('kicker').textContent = kk;
    $('title').textContent = T; $('title').style.opacity = Math.max(1 - sm(seg(t, 2.0, 2.5)), sm(seg(t, 52.2, 52.8)));
    let st = '', so = 0; for (const [a0, b0, tx] of subs) { const f = fw(t, a0, b0); if (f > 0) { st = tx; so = f; } } $('sub').textContent = st; $('sub').style.opacity = so;
    const svg = $('ov'); svg.innerHTML = ''; const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    const cz = o.clipZ;
    { const op = fw(t, 2.8, 14.8); if (op > 0) { const A1 = P([X(100), Z(392), cz]), B1 = P([X(100), Z(150), cz]);
      svg.insertAdjacentHTML('beforeend', `<g opacity="${op}"><line x1="${A1[0]}" y1="${A1[1]}" x2="${B1[0]}" y2="${B1[1]}" stroke="${RED}" stroke-width="3"/><line x1="${A1[0] - 12}" y1="${A1[1]}" x2="${A1[0] + 12}" y2="${A1[1]}" stroke="${RED}" stroke-width="3"/><line x1="${B1[0] - 12}" y1="${B1[1]}" x2="${B1[0] + 12}" y2="${B1[1]}" stroke="${RED}" stroke-width="3"/><text class="dim" x="${A1[0] - 18}" y="${(A1[1] + B1[1]) / 2}" text-anchor="end" style="font-size:44px">12 m</text></g>`); } }
    { const op = fw(t, 2.8, 14.8); if (op > 0) for (const [pp, txt] of [[[X(70), Z(392), cz], 'C/ JOAQUÍN COSTA'], [[X(690), Z(150), cz], 'C/ GUADALQUIVIR']]) { const q = P(pp); svg.insertAdjacentHTML('beforeend', `<text class="lab" x="${q[0]}" y="${q[1] - 14}" text-anchor="middle" opacity="${op}">${txt}</text>`); } }
    { const op = fw(t, 15.4, 22.6); if (op > 0) { const a1 = P([X(165), Z(160) + 0.6, cz]), b1 = P([X(548), Z(160) + 0.6, cz]);
      svg.insertAdjacentHTML('beforeend', `<g opacity="${op}"><line x1="${a1[0]}" y1="${a1[1] - 30}" x2="${b1[0]}" y2="${b1[1] - 30}" stroke="${RED}" stroke-width="2.4"/><line x1="${a1[0]}" y1="${a1[1] - 42}" x2="${a1[0]}" y2="${a1[1] - 18}" stroke="${RED}" stroke-width="2.4"/><line x1="${b1[0]}" y1="${b1[1] - 42}" x2="${b1[0]}" y2="${b1[1] - 18}" stroke="${RED}" stroke-width="2.4"/><text class="dim" x="${(a1[0] + b1[0]) / 2}" y="${(a1[1] + b1[1]) / 2 - 44}" text-anchor="middle" style="font-size:40px">20 m</text></g>`); } }
    { const op = fw(t, 23.2, 30.6); if (op > 0) { const q = P([X(400), Z(240), cz]); svg.insertAdjacentHTML('beforeend', `<text class="lab" x="${q[0]}" y="${q[1] - 40}" text-anchor="middle" opacity="${op}" fill="${RED}">SALAS DE CONFERENCIAS</text>`); } }
    { const op = fw(t, 31.2, 37.8); if (op > 0) { const q = P([X(380), Z(150) + 2.5, -30]); svg.insertAdjacentHTML('beforeend', `<text class="lab" x="${q[0]}" y="${q[1]}" text-anchor="middle" opacity="${op}">PATIO</text>`); } }
    return true; };
  window.renderCover = () => { document.body.classList.add('cover'); window.shot({ show: 'btrk', clipZ: -20, tg: [13, 21, -24], z: 36, az: 22, el: 16 }); $('title').style.opacity = 0; $('kicker').textContent = ''; $('sub').style.opacity = 0; $('ov').innerHTML = ''; return true; };
  window.READY = true;
}
