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
  const G = {}; for (const k of ['terrain', 'building', 'truss', 'rooms', 'kids', 'cutT', 'cutB', 'cutR', 'slope', 'roof', 'cutRoof', 'mid', 'seated']) { G[k] = new THREE.Group(); scene.add(G[k]); }
  G.mid.add(G.truss, G.rooms, G.cutR, G.seated); G.roof.add(G.cutRoof);
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
    [[X(548), Z(268)], [X(645), Z(268)], [X(645), Z(262)], [X(548), Z(262)]],
    [[X(490), Z(225)], [X(645), Z(225)], [X(645), Z(219)], [X(490), Z(219)]],
  ];
  for (const p of conc) { const g = extS(p, 0, ZBLD); G.building.add(new THREE.Mesh(g, paper)); G.building.add(segs(edgesOf(g, 30), lineMat(INK, LW.B))); G.cutB.add(new THREE.Mesh(cutF(p, 0), poche)); }
  // roof slab = playground, and its parapet, as one layer
  { const p = [[X(122), Z(160)], [X(645), Z(160)], [X(645), Z(150)], [X(122), Z(150)]]; const g = extS(p, 0, ZBLD); G.roof.add(new THREE.Mesh(g, paper)); G.roof.add(segs(edgesOf(g, 30), lineMat(INK, LW.B))); G.cutRoof.add(new THREE.Mesh(cutF(p, 0), poche));
    const g2 = extS([[X(122), Z(150)], [X(126), Z(150)], [X(126), Z(150) + 1.1], [X(122), Z(150) + 1.1]], 0, ZBLD); G.roof.add(new THREE.Mesh(g2, paper)); G.roof.add(segs(edgesOf(g2, 30), lineMat(INK, LW.C))); }
  // gym end wall and the service block beyond it (changing rooms), under the same roof
  { const g = extS([[X(126), Z(384)], [X(548), Z(384)], [X(548), Z(160)], [X(126), Z(160)]], ZEND, ZBLD, false); const eb = new THREE.Group(); eb.name = 'endblock'; eb.add(new THREE.Mesh(g, paper)); eb.add(segs(edgesOf(g, 30), lineMat(INK, LW.B))); G.building.add(eb); }
  // west facade on Joaquín Costa: strip windows between brick bands, on the slanted line
  { const Lg = []; const fx = X(129); const zf = (x) => -SKEW * Math.max(0, x);
    for (let z = zf(fx); z >= ZEND; z -= 1.5) Lg.push(fx, Z(386), z, fx, Z(160), z);
    for (const zz of [Z(386), Z(330), Z(300), Z(240), Z(225), Z(160)]) Lg.push(fx, zz, zf(fx), fx, zz, ZEND);
    const fl = segs(Lg, lineMat(GREY, LW.C)); fl.name = 'facade'; G.building.add(fl); }
  // tribunes along the back wall, under the trusses (Planta segunda)
  { const st = []; for (let i = 0; i < 6; i++) st.push([X(548) - 0.8 * i, Z(386) + 1.0 + 0.45 * (5 - i)]);
    const poly = [[X(548) - 0.8 * 6, Z(384)], [X(548), Z(384)], [X(548), Z(386) + 1.0 + 0.45 * 6]]; for (let i = 0; i < 6; i++) { const x = X(548) - 0.8 * (i + 1); poly.push([x + 0.8, Z(386) + 1.0 + 0.45 * (6 - i)], [x, Z(386) + 1.0 + 0.45 * (6 - i)]); }
    const g = extS(poly.map(([x, y]) => [x, y]), -4.9, -40.9, false); G.building.add(new THREE.Mesh(g, woodF)); G.building.add(segs(edgesOf(g, 30), lineMat(INK, LW.C))); }
  // exploded-axonometric layer 1: the gym floor slab on its own (the courts are drawn on it below)
  G.floorE = new THREE.Group(); scene.add(G.floorE); G.floorE.visible = false;
  { const p = [[X(126), Z(392)], [X(548), Z(392)], [X(548), Z(384)], [X(126), Z(384)]]; const g = extS(p, 0, ZEND); G.floorE.add(new THREE.Mesh(g, paper)); G.floorE.add(segs(edgesOf(g, 30), lineMat(INK, LW.B))); }
  // court lines on the gym floor
  { const C = []; const y = Z(384) + 0.02, x0 = X(160), x1 = X(500), z0 = -8, z1 = -40; const line = (a, b) => C.push(a[0], y, a[1], b[0], y, b[1]);
    line([x0, z0], [x1, z0]); line([x1, z0], [x1, z1]); line([x1, z1], [x0, z1]); line([x0, z1], [x0, z0]); line([x0, (z0 + z1) / 2], [x1, (z0 + z1) / 2]);
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, b = (i + 1) / 40 * Math.PI * 2, r = 1.8, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; line([cx + r * Math.cos(a), cz + r * Math.sin(a)], [cx + r * Math.cos(b), cz + r * Math.sin(b)]); }
    G.building.add(segs(C, lineMat(GREY, LW.C))); G.floorE.add(segs(C, lineMat(INK, LW.C))); }
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
  // ---- people in ink (as in De la Sota's section): children running on the roof and in the gym, audience in the rooms
  const inkM = fillMat('#1A1B20', { hatch: 0 });
  const kidG = (() => { const c = new THREE.CylinderGeometry(0.2, 0.2, 1.05, 10); c.translate(0, 0.53, 0); const h = new THREE.SphereGeometry(0.2, 10, 8); h.translate(0, 1.28, 0); return merge([c.toNonIndexed(), h.toNonIndexed()]); })();
  const sitG = (() => { const c = new THREE.CylinderGeometry(0.2, 0.2, 0.7, 10); c.translate(0, 0.35, 0); const h = new THREE.SphereGeometry(0.2, 10, 8); h.translate(0, 0.92, 0); return merge([c.toNonIndexed(), h.toNonIndexed()]); })();
  let sd = 3; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const runners = [];
  for (let i = 0; i < 36; i++) { const x = X(180) + r() * (X(620) - X(180)); const zmin = -SKEW * x - 2, z = zmin - r() * (zmin - (ZBLD + 2)); const m = new THREE.Mesh(kidG, inkM); G.roof.add(m); runners.push({ m, y: Z(150), x, z, rx: 1 + r() * 3.5, rz: 1 + r() * 3.5, w: 0.8 + r() * 1.6, ph: r() * 6.28, minZ: ZBLD + 1, maxZ: zmin, minX: X(170), maxX: X(640) }); }
  for (let i = 0; i < 9; i++) { const x = X(200) + r() * (X(480) - X(200)), z = -12 - r() * 26; const m = new THREE.Mesh(kidG, inkM); G.kids.add(m); runners.push({ m, y: Z(384), x, z, rx: 2 + r() * 4, rz: 2 + r() * 5, w: 0.7 + r() * 1.2, ph: r() * 6.28, minZ: -44, maxZ: -6, minX: X(150), maxX: X(520) }); }
  { const x0 = curve[1][0], x1 = curve[curve.length - 1][0]; for (const zb of [-19.9, -25.9, -31.9]) for (let i = 1; i < 12; i += 2) for (const dz of [-1.6, 0, 1.6]) { if (r() < 0.35) continue; const x = x0 + (x1 - x0) * (i + 0.5) / 12; const m = new THREE.Mesh(sitG, inkM); m.position.set(x, atCurve(x0 + (x1 - x0) * (i + 1) / 12) + 0.3, zb + dz); G.seated.add(m); } }
  const moveKids = (t) => { for (const k of runners) { let x = k.x + k.rx * Math.cos(k.w * t + k.ph), z = k.z + k.rz * Math.sin(k.w * t + k.ph); x = Math.min(k.maxX, Math.max(k.minX, x)); z = Math.min(k.maxZ, Math.max(k.minZ, z)); k.m.position.set(x, k.y + Math.abs(Math.sin(k.w * t * 3 + k.ph)) * 0.12, z); } };
  moveKids(0);
  // ---- section plane: everything in front of it is removed; the poché faces sit on it
  const clipP = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), floorP = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e5);
  const keep = new Set([poche, earthCut, redCut]);
  scene.traverse(o => { o.frustumCulled = false; if (o.material && !keep.has(o.material)) o.material.clippingPlanes = [clipP, floorP]; });
  window.shot = (o) => {
    const cz = o.clipZ ?? 50; clipP.constant = cz; for (const k of ['cutT', 'cutB', 'cutR', 'cutRoof']) G[k].position.z = cz;
    floorP.constant = o.worm ? -(Z(384) + 0.12) : 1e5; G.terrain.visible = !o.worm; G.building.getObjectByName('endblock').visible = !o.worm;
    const ex = o.ex || 0; G.roof.position.y = o.xa ? 26 : ex * 9; G.mid.position.y = o.xa ? 12 : ex * 4.5; G.floorE.visible = !!o.xa; G.building.getObjectByName('facade').visible = ex < 0.02;
    if (o.t !== undefined) moveKids(o.t);
    G.building.visible = o.show.includes('b'); G.truss.visible = o.show.includes('t'); G.rooms.visible = o.show.includes('r'); G.kids.visible = o.show.includes('k') && !o.worm; G.roof.visible = o.show.includes('b'); G.slope.visible = !!o.slope;
    if (o.xa) { G.building.visible = false; G.terrain.visible = false; G.slope.visible = false; }
    G.cutT.visible = cz < 6 && !o.worm && !o.xa; G.cutB.visible = o.show.includes('b') && cz < 0 && !o.worm; G.cutRoof.visible = cz < 0; G.cutR.visible = o.show.includes('r') && cz < ROOMS[0] && cz > ROOMS[1];
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
    if (o.xa) { const corners = [[X(126), -SKEW * X(126)], [X(548), -SKEW * X(548)], [X(126), ZEND], [X(548), ZEND]]; let d = '';
      for (const [x, z] of corners) { const a2 = P([x, Z(384), z]), b2 = P([x, Z(150) + 26, z]); d += `<line x1="${a2[0]}" y1="${a2[1]}" x2="${b2[0]}" y2="${b2[1]}" stroke="#9A978F" stroke-width="1.4" stroke-dasharray="10 9"/>`; }
      svg.insertAdjacentHTML('afterbegin', d);
      for (const [pp, txt, col] of [[[X(126), Z(384), ZEND], 'PISTAS', INK], [[X(126), Z(300) + 12, ZEND], 'SALAS', RED], [[X(126), Z(150) + 26, ZEND], 'PATIO', INK]]) { const q = P(pp); const wdt = txt.length * 21 + 20; svg.insertAdjacentHTML('beforeend', `<rect x="${q[0] - 22 - wdt + 8}" y="${q[1] - 22}" width="${wdt}" height="44" fill="#F2F1EC" opacity="0.94"/><text class="lab" x="${q[0] - 22}" y="${q[1] + 10}" text-anchor="end" style="font-size:32px; fill:${col}">${txt}</text>`); } }
    return true; };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u, fw = (t, a, b, f = 0.35) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
  const K = [
    { t: 0, tg: [13, 12, -24], z: 36, az: 16, el: 16, c: -20, ex: 0 }, { t: 3.0, tg: [13, 12, -24], z: 36, az: 22, el: 16, c: -20, ex: 0 },
    { t: 8.5, tg: [12, 11, -22], z: 44, az: 28, el: 18, c: -9, ex: 0 }, { t: 15.0, tg: [13, 16, -24], z: 48, az: 30, el: 20, c: -20, ex: 1 },
    { t: 17.6, tg: [13, 16, -24], z: 48, az: 32, el: 20, c: -20, ex: 1 }, { t: 20.0, tg: [12, 10, -24], z: 30, az: 34, el: -28, c: 50, ex: 0 },
    { t: 28.6, tg: [12, 10, -24], z: 28, az: 46, el: -30, c: 50, ex: 0 }, { t: 30.6, tg: [13, 8.5, -24], z: 20, az: 24, el: 12, c: -20, ex: 0 },
    { t: 34.0, tg: [13, 8.5, -24], z: 18, az: 22, el: 12, c: -20, ex: 0 },
    { t: 37.4, tg: [13, 8.5, -24], z: 18, az: 18, el: 12, c: -20, ex: 0 }, { t: 42.4, tg: [14, 14, -24], z: 40, az: 24, el: 30, c: 50, ex: 0 },
    { t: 47.0, tg: [14, 13, -24], z: 46, az: 28, el: 26, c: 50, ex: 0 } ];
  const subs = [[3.2, 8.6, '12 metros de desnivel entre dos calles.'],
    [9.6, 17.4, 'Gimnasio, salas y patio, uno encima de otro.'],
    [21.0, 28.4, 'Cerchas de acero de 20 metros, cada 6.'],
    [29.6, 36.8, 'Entre ellas cuelgan las salas.'],
    [37.8, 42.6, 'Y encima, el patio, a nivel de la calle.'],
    [43.0, 45.6, '1962. Hoy, Bien de Interés Cultural.']];
  const kick = [[0, '009 · MADRID, 1960–1962'], [3.2, '01 · EL SOLAR'], [9.6, '02 · LA IDEA'], [21.0, '03 · LA ESTRUCTURA'], [29.6, '04 · LAS SALAS'], [37.8, '05 · EL PATIO'], [43.0, '06 · HOY'], [45.6, '009 · MADRID, 1960–1962']];
  const T = '¿Cómo se mete un gimnasio debajo del patio de un colegio?';
  window.renderAt = (t) => {
    let i = 1; while (i < K.length - 1 && K[i].t < t) i++; const a = K[i - 1], b = K[i]; const u = smr(seg(t, a.t, b.t));
    const el = lerp(a.el, b.el, u);
    const o = { t, show: 'btrk', tg: a.tg.map((v, j) => lerp(v, b.tg[j], u)), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), az: lerp(a.az, b.az, u), el, clipZ: lerp(a.c, b.c, sm(seg(t, a.t, b.t))), ex: lerp(a.ex, b.ex, smr(seg(t, a.t, b.t))), worm: el < -2 };
    window.shot(o);
    let kk = ''; for (const [s0, k0] of kick) if (t >= s0) kk = k0; $('kicker').textContent = kk;
    $('title').textContent = T; $('title').style.opacity = Math.max(1 - sm(seg(t, 2.6, 3.1)), sm(seg(t, 45.6, 46.2)));
    let st = '', so = 0; for (const [a0, b0, tx] of subs) { const f = fw(t, a0, b0); if (f > 0) { st = tx; so = f; } } $('sub').textContent = st; $('sub').style.opacity = so;
    const svg = $('ov'); svg.innerHTML = ''; const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    const cz = o.clipZ;
    { const op = fw(t, 3.4, 8.8); if (op > 0) { const A1 = P([X(100), Z(392), cz]), B1 = P([X(100), Z(150), cz]);
      svg.insertAdjacentHTML('beforeend', `<g opacity="${op}"><line x1="${A1[0]}" y1="${A1[1]}" x2="${B1[0]}" y2="${B1[1]}" stroke="${RED}" stroke-width="3"/><line x1="${A1[0] - 12}" y1="${A1[1]}" x2="${A1[0] + 12}" y2="${A1[1]}" stroke="${RED}" stroke-width="3"/><line x1="${B1[0] - 12}" y1="${B1[1]}" x2="${B1[0] + 12}" y2="${B1[1]}" stroke="${RED}" stroke-width="3"/><text class="dim" x="${A1[0] - 18}" y="${(A1[1] + B1[1]) / 2}" text-anchor="end" style="font-size:44px">12 m</text></g>`); } }
    { const op = fw(t, 11.0, 18.0); if (op > 0) { const ex = o.ex; for (const [pp, txt] of [[[X(560) + 3, Z(150) + ex * 9 + 1.5, cz], 'PATIO'], [[X(560) + 3, Z(230) + ex * 4.5, cz], 'SALAS'], [[X(560) + 3, Z(330), cz], 'GIMNASIO']]) { const q = P(pp); svg.insertAdjacentHTML('beforeend', `<text class="lab" x="${q[0]}" y="${q[1]}" opacity="${op}">${txt}</text>`); } } }
    return true; };
  window.renderCover = () => { document.body.classList.add('cover'); window.shot({ show: 'btrk', clipZ: -20, tg: [13, 21, -24], z: 36, az: 22, el: 16 }); $('title').style.opacity = 0; $('kicker').textContent = ''; $('sub').style.opacity = 0; $('ov').innerHTML = ''; return true; };
  window.READY = true;
}
