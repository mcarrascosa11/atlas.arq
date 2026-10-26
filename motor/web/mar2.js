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
  for (const k of ['wall', 'basement', 'floor', 'east', 'pillars']) { G[k] = new THREE.Group(); G.building.add(G[k]); }
  const CT = await fetch('mar_ctx.json').then(r => r.json());
  const ctxTex = await new THREE.TextureLoader().loadAsync('mar_ctx.png'); ctxTex.colorSpace = THREE.LinearSRGBColorSpace; ctxTex.anisotropy = 8;
  const ctxMat = new THREE.MeshBasicMaterial({ map: ctxTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  { const [c0, c1, c2, c3] = CT.corners, y = Z(392) - 0.06; const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([c0[0], y, c0[1], c1[0], y, c1[1], c2[0], y, c2[1], c0[0], y, c0[1], c2[0], y, c2[1], c3[0], y, c3[1]], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0], 2)); const m = new THREE.Mesh(g, ctxMat); m.renderOrder = -1; scene.add(m); }
  const U0 = 592, V0 = 548, TH = Math.atan2(14, 313), SC = CT.scale; const MP = (u, v) => { const du = u - U0, dv = v - V0; const east = du * Math.cos(TH) + dv * Math.sin(TH), north = du * Math.sin(TH) - dv * Math.cos(TH); return [north / SC, -east / SC]; };
  const C3 = await fetch('mar_ctx3d.json').then(r => r.json());
  G.ctx3d = new THREE.Group(); scene.add(G.ctx3d); G.ctx3d.visible = false;
  const riseP = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);
  const ctxPaper = fillMat('#F4F2EC', { hatch: 1, side: 0.95, shade: 0.86 }), groundM = fillMat('#EEECE5', { hatch: 0, side: 0.97, shade: 0.9 });
  { const P = [], B = [], T = [], E = []; for (const v of C3.vols) prism(v.p, v.b, v.b + v.h, 0, P, B, T, E, { bottomEdges: false });
    G.ctx3d.add(new THREE.Mesh(geomFrom(P, B, T), ctxPaper)); G.ctx3d.add(segs(E, lineMat(INK, LW.C))); }
  { const XS = X(645), TOPG = Z(150), LOW = Z(392), W0 = 170, W1 = -230, zf = (x) => -SKEW * x; const V = [];
    const quad = (a, b, c, d) => V.push(...a, ...b, ...c, ...a, ...c, ...d);
    quad([-200, LOW, W0], [-200, LOW, W1], [0, LOW, W1], [0, LOW, W0]);                                     // south of Joaquín Costa
    quad([XS, TOPG, W0], [XS, TOPG, W1], [240, TOPG, W1], [240, TOPG, W0]);                                 // upper level (school grounds, Guadalquivir)
    quad([0, LOW, W0], [0, LOW, zf(0)], [XS, TOPG, zf(XS)], [XS, TOPG, W0]);                                // hillside west of the gym
    quad([0, LOW, ZBLD], [0, LOW, W1], [XS, TOPG, W1], [XS, TOPG, ZBLD]);                                   // hillside east of the gym
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(V, 3)); g.computeVertexNormals(); G.ctx3d.add(new THREE.Mesh(g, groundM));
    G.ctx3d.add(segs([0, LOW + 0.02, W0, 0, LOW + 0.02, W1, XS, TOPG + 0.02, W0, XS, TOPG + 0.02, W1], lineMat(GREY, LW.C))); }
  G.ctx3d.traverse(o => { if (o.material) o.material.clippingPlanes = [riseP]; });
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
  const dest = ['wall', 'basement', 'basement', 'floor', 'east', 'east'];
  conc.forEach((p, i) => { const g = extS(p, 0, ZBLD); G[dest[i]].add(new THREE.Mesh(g, paper)); G[dest[i]].add(segs(edgesOf(g, 30), lineMat(INK, LW.B))); G.cutB.add(new THREE.Mesh(cutF(p, 0), poche)); });
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
  { const fw0 = X(129), fwT = Z(160); const FA = new THREE.Group(); FA.name = 'facadeSolid'; G.building.add(FA);
    const wall = [[fw0 - 0.25, Z(386)], [fw0, Z(386)], [fw0, fwT], [fw0 - 0.25, fwT]];
    const holes = [[3.2, 5.6], [6.8, 9.0]];
    const parts = [[Z(386), 3.2], [5.6, 6.8], [9.0, fwT]];
    for (const [z0, z1] of parts) { const g = extS([[fw0 - 0.25, z0], [fw0, z0], [fw0, z1], [fw0 - 0.25, z1]], 0, ZBLD); FA.add(new THREE.Mesh(g, paper)); FA.add(segs(edgesOf(g, 30), lineMat(INK, LW.B))); }
    const GL = []; for (const [z0, z1] of holes) { const g = extS([[fw0 - 0.12, z0], [fw0 - 0.05, z0], [fw0 - 0.05, z1], [fw0 - 0.12, z1]], 0, ZBLD); GL.push(g); }
    const gg = merge(GL); FA.add(new THREE.Mesh(gg, fillMat('#3A3C44', { hatch: 0 })));
    const ML = []; for (let z = -0.6; z > ZBLD; z -= 1.5) for (const [z0, z1] of holes) { const zz = z - SKEW * 0; ML.push(fw0 - 0.3, z0, zz, fw0 - 0.3, z1, zz); }
    FA.add(segs(ML, lineMat('#F4F2EC', LW.C)));
    // glazed gallery cantilevered over the street at the top
    const gp = [[fw0 - 1.9, 9.3], [fw0, 9.3], [fw0, fwT - 0.5], [fw0 - 1.9, fwT - 0.5]]; const g2 = extS(gp, 0, ZBLD); FA.add(new THREE.Mesh(g2, fillMat('#D9DCDD', { hatch: 0 }))); FA.add(segs(edgesOf(g2, 30), lineMat(INK, LW.B)));
    const GM = []; for (let z = -0.8; z > ZBLD; z -= 1.5) GM.push(fw0 - 1.92, 9.3, z, fw0 - 1.92, fwT - 0.5, z); FA.add(segs(GM, lineMat(INK, LW.C))); }
  // tribunes along the back wall, under the trusses (Planta segunda)
  { const st = []; for (let i = 0; i < 6; i++) st.push([X(548) - 0.8 * i, Z(386) + 1.0 + 0.45 * (5 - i)]);
    const poly = [[X(548) - 0.8 * 6, Z(384)], [X(548), Z(384)], [X(548), Z(386) + 1.0 + 0.45 * 6]]; for (let i = 0; i < 6; i++) { const x = X(548) - 0.8 * (i + 1); poly.push([x + 0.8, Z(386) + 1.0 + 0.45 * (6 - i)], [x, Z(386) + 1.0 + 0.45 * (6 - i)]); }
    const g = extS(poly.map(([x, y]) => [x, y]), -4.9, -40.9, false); G.floor.add(new THREE.Mesh(g, woodF)); G.floor.add(segs(edgesOf(g, 30), lineMat(INK, LW.C))); }
  // exploded-axonometric layer 1: the gym floor slab on its own (the courts are drawn on it below)
  G.floorE = new THREE.Group(); scene.add(G.floorE); G.floorE.visible = false;
  { const p = [[X(126), Z(392)], [X(548), Z(392)], [X(548), Z(384)], [X(126), Z(384)]]; const g = extS(p, 0, ZEND); G.floorE.add(new THREE.Mesh(g, paper)); G.floorE.add(segs(edgesOf(g, 30), lineMat(INK, LW.B))); }
  // court lines on the gym floor
  { const C = []; const y = Z(384) + 0.02, x0 = X(160), x1 = X(500), z0 = -8, z1 = -40; const line = (a, b) => C.push(a[0], y, a[1], b[0], y, b[1]);
    line([x0, z0], [x1, z0]); line([x1, z0], [x1, z1]); line([x1, z1], [x0, z1]); line([x0, z1], [x0, z0]); line([x0, (z0 + z1) / 2], [x1, (z0 + z1) / 2]);
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, b = (i + 1) / 40 * Math.PI * 2, r = 1.8, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; line([cx + r * Math.cos(a), cz + r * Math.sin(a)], [cx + r * Math.cos(b), cz + r * Math.sin(b)]); }
    G.floor.add(segs(C, lineMat(GREY, LW.C))); G.floorE.add(segs(C, lineMat(INK, LW.C))); }
  // ---- steel trusses: top chord, curved bottom chord, end diagonal, hangers and Warren diagonals, as bars
  const curve = [[240, 265], [300, 270], [360, 268], [420, 255], [480, 238], [540, 225]].map(([x, y]) => [X(x), Z(y)]);
  const top = Z(160) - 0.15, A = [X(165), top];
  const atCurve = (x) => { for (let i = 0; i < curve.length - 1; i++) { const a = curve[i], b = curve[i + 1]; if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return curve[curve.length - 1][1]; };
  const nodes = []; for (let x = curve[0][0]; x <= curve[curve.length - 1][0] + 1e-6; x += (curve[curve.length - 1][0] - curve[0][0]) / 10) nodes.push(x);
  const trussGroups = [], PL = [];
  for (const z of TZ) { const BR = [];
    BR.push(bar([X(129), top], [X(548), top], z, 0.35, 0.35));
    BR.push(bar(A, curve[0], z)); BR.push(bar([X(129), top - 0.6], A, z, 0.2, 0.25));
    for (let i = 0; i < curve.length - 1; i++) BR.push(bar(curve[i], curve[i + 1], z, 0.3, 0.32));
    BR.push(bar(curve[curve.length - 1], [X(548), top], z));
    for (let i = 0; i < nodes.length; i++) { const x = nodes[i]; BR.push(bar([x, top], [x, atCurve(x)], z, 0.16, 0.2)); if (i < nodes.length - 1) { const xn = nodes[i + 1]; BR.push(i % 2 ? bar([x, top], [xn, atCurve(xn)], z, 0.14, 0.18) : bar([x, atCurve(x)], [xn, top], z, 0.14, 0.18)); } }
    const tgm = merge(BR); const grp = new THREE.Group(); grp.add(new THREE.Mesh(tgm, redF)); grp.add(segs(edgesOf(tgm, 35), lineMat('#8E2410', LW.C))); G.truss.add(grp); trussGroups.push(grp);
    PL.push(bar([X(129), Z(386)], [X(129), top], z, 0.35, 0.35), bar([X(548), Z(386)], [X(548), top], z, 0.35, 0.35)); }
  { const pg = merge(PL); G.pillars.add(new THREE.Mesh(pg, paper)); G.pillars.add(segs(edgesOf(pg, 35), lineMat(INK, LW.B))); }
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
    G.mid.visible = true;
    const cz = o.clipZ ?? 50; clipP.constant = cz; for (const k of ['cutT', 'cutB', 'cutR', 'cutRoof']) G[k].position.z = cz;
    floorP.constant = o.worm ? -(Z(384) + 0.12) : 1e5; G.terrain.visible = !o.worm; G.building.getObjectByName('endblock').visible = !o.worm;
    const ex = o.ex || 0; G.roof.position.y = o.xa ? 26 * (o.xaS ?? 1) : ex * 9; G.mid.position.y = o.xa ? 12 * (o.xaS ?? 1) : ex * 4.5; G.floorE.visible = !!o.xa; G.building.getObjectByName('facade').visible = ex < 0.02;
    if (o.t !== undefined) moveKids(o.t);

    G.building.visible = o.show.includes('b'); G.truss.visible = o.show.includes('t'); G.rooms.visible = o.show.includes('r'); G.kids.visible = o.show.includes('k') && !o.worm; G.roof.visible = o.show.includes('b'); G.slope.visible = !!o.slope;
    if (o.xa) { G.building.visible = false; G.terrain.visible = false; G.slope.visible = false; }
    G.cutT.visible = cz < 6 && !o.worm && !o.xa; G.cutB.visible = o.show.includes('b') && cz < 0 && !o.worm; G.cutRoof.visible = cz < 0; G.cutR.visible = o.show.includes('r') && cz < ROOMS[0] && cz > ROOMS[1];
    const bd = o.build ?? 99, cl = (v) => Math.min(1, Math.max(0, v)), ease = (v) => { v = cl(v); return v * v * (3 - 2 * v); };
    const s0 = ease(1 - bd), y0 = Z(392); G.slope.visible = s0 > 0.001 || !!o.slope; G.slope.scale.y = Math.max(0.001, o.slope ? 1 : s0); G.slope.position.y = y0 * (1 - G.slope.scale.y);
    const sw = Math.max(0.001, ease(bd - 1)), yb = Z(470); G.wall.scale.y = sw; G.wall.position.y = yb * (1 - sw); G.basement.visible = bd > 1.2;
    const fl = ease(bd - 2); G.floor.position.y = -8 * (1 - fl); G.floor.visible = fl > 0.001; G.east.visible = bd > 2;
    const sp = Math.max(0.001, ease(bd - 3)), yp = Z(386); G.pillars.scale.y = sp; G.pillars.position.y = yp * (1 - sp); G.pillars.visible = bd > 3;
    trussGroups.forEach((g, i) => { const e = ease((bd - 4) * 1.6 - i * 0.6); g.position.y = 14 * (1 - e); g.visible = e > 0.001; });
    const er = ease(bd - 6.2); G.rooms.position.y = 10 * (1 - er); G.rooms.visible = er > 0.001; G.seated.visible = bd > 7.1; G.cutR.visible = G.cutR.visible && bd > 7.1;
    const ef = ease(bd - 7.2); G.roof.position.y += 16 * (1 - ef); G.roof.visible = G.roof.visible && ef > 0.001;
    runners.forEach((k, i) => { k.m.visible = bd > 8.2 + (i % 12) * 0.05; });
    G.building.getObjectByName('endblock').visible = G.building.getObjectByName('endblock').visible && bd > 2; G.building.getObjectByName('facade').visible = G.building.getObjectByName('facade').visible && bd > 8.2; G.building.getObjectByName('facadeSolid').visible = bd > 8.2;
    G.ctx3d.visible = !!o.ctx3d; riseP.constant = o.ctx3d ? -1 + 70 * (o.rise ?? 1) : 1e5; if (o.ctx3d) G.terrain.visible = false;
    const cx = o.ctx || 0; ctxMat.opacity = cx; if (cx > 0.995) for (const k of ['terrain', 'building', 'mid', 'roof', 'kids', 'slope', 'floorE', 'cutT', 'cutB', 'cutRoof']) G[k].visible = false;
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
      for (const [x, z] of corners) { const a2 = P([x, Z(384), z]), b2 = P([x, Z(150) + 26 * (o.xaS ?? 1), z]); d += `<line x1="${a2[0]}" y1="${a2[1]}" x2="${b2[0]}" y2="${b2[1]}" stroke="#9A978F" stroke-width="1.4" stroke-dasharray="10 9"/>`; }
      svg.insertAdjacentHTML('afterbegin', d);
      for (const [pp, txt, col] of [[[X(126), Z(384), ZEND], 'PISTAS', INK], [[X(126), Z(300) + 12 * (o.xaS ?? 1), ZEND], 'SALAS', RED], [[X(126), Z(150) + 26 * (o.xaS ?? 1), ZEND], 'PATIO', INK]]) { const q = P(pp); const wdt = txt.length * 21 + 20; svg.insertAdjacentHTML('beforeend', `<rect x="${q[0] - 22 - wdt + 8}" y="${q[1] - 22}" width="${wdt}" height="44" fill="#F2F1EC" opacity="0.94"/><text class="lab" x="${q[0] - 22}" y="${q[1] + 10}" text-anchor="end" style="font-size:32px; fill:${col}">${txt}</text>`); } }
    return true; };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u, fw = (t, a, b, f = 0.35) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
  const K = [
    // hook: slow orbit and push-in
    { t: 0.0, tg: [12, 10, -26], z: 44, az: 14, el: 22, c: 50, bd: 99, ctx: 0 },
    { t: 3.0, tg: [12, 10, -26], z: 36, az: 40, el: 26, c: 50, bd: 99, ctx: 0 },
    // whip out to the city plan (rotating 130 degrees while rising)
    { t: 6.0, tg: [14, 0, -20], z: 122, az: -90, el: 89, c: 50, bd: 99, ctx: 1 },
    { t: 8.8, tg: [16, 0, -26], z: 100, az: -72, el: 89, c: 50, bd: 99, ctx: 1 },
    // dive onto the leftover rhomboid
    { t: 11.6, tg: [12, 0, -28], z: 44, az: -96, el: 89, c: 50, bd: 0, ctx: 1 },
    // tilt down into the axonometry and keep turning: half a revolution while it is built
    { t: 14.2, tg: [12, 6, -26], z: 40, az: -44, el: 26, c: 50, bd: 0, ctx: 0 },
    { t: 18.0, tg: [12, 6, -26], z: 46, az: -12, el: 32, c: 50, bd: 0, ctx: 0 },
    { t: 21.6, tg: [12, 8, -24], z: 34, az: 22, el: 22, c: 50, bd: 0, ctx: 0 },
    { t: 24.8, tg: [12, 9, -24], z: 26, az: 58, el: 18, c: 50, bd: 0, ctx: 0 },
    { t: 27.2, tg: [12, 9, -24], z: 36, az: 92, el: 28, c: 50, bd: 0, ctx: 0 },
    { t: 29.6, tg: [14, 11, -26], z: 46, az: 122, el: 34, c: 50, bd: 0, ctx: 0 },
    { t: 32.2, tg: [14, 12, -26], z: 44, az: 150, el: 30, c: 50, bd: 0, ctx: 0 },
    // exploded layers while still turning
    { t: 34.0, tg: [14, 22, -26], z: 54, az: 190, el: 28, c: 50, bd: 99, ctx: 0 },
    { t: 37.4, tg: [14, 22, -26], z: 50, az: 262, el: 24, c: 50, bd: 99, ctx: 0 },
    // swing round to the section and push in
    { t: 40.0, tg: [13, 11, -24], z: 32, az: 382, el: 16, c: -20, bd: 99, ctx: 0 },
    { t: 41.8, tg: [13, 10, -24], z: 30, az: 388, el: 15, c: -20, bd: 99, ctx: 0 },
    // up and out to a wider 3D view of the gym inside the massing of the block
    { t: 43.4, tg: [12, 9, -26], z: 42, az: 356, el: 17, c: 50, bd: 99, ctx: 0 },
    { t: 45.6, tg: [14, 8, -30], z: 84, az: 334, el: 24, c: 50, bd: 99, ctx: 0 },
    { t: 48.0, tg: [14, 8, -30], z: 96, az: 326, el: 25, c: 50, bd: 99, ctx: 0 } ];
  const BD = [[14.2, 0], [16.0, 1], [17.8, 2], [19.6, 3], [21.4, 4], [24.8, 6.2], [26.8, 7.2], [28.8, 8.2], [31.2, 9.5]];
  const bdAt = (t) => { if (t < BD[0][0]) return null; for (let i = 0; i < BD.length - 1; i++) { const [ta, va] = BD[i], [tb, vb] = BD[i + 1]; if (t <= tb) return va + (vb - va) * (t - ta) / (tb - ta); } return null; };
  const words = [[0.0, 1.6, '¿Dónde cabe un gimnasio?'], [1.6, 3.2, 'Debajo del recreo.'], [3.8, 6.2, 'Madrid, 1960.'], [6.4, 8.8, 'Alejandro de la Sota.'],
    [9.0, 10.4, 'Sobra un rombo.'], [10.4, 12.4, '12 metros de desnivel.'], [14.4, 16.0, 'Excavar.'], [16.2, 17.8, 'Contener.'], [18.0, 19.6, 'Pistas.'],
    [19.8, 21.4, 'Pilares cada 6 m.'], [21.6, 24.8, 'Cerchas de 20 m.'], [25.0, 26.8, 'Salas colgadas.'], [27.0, 28.8, 'Y encima,'], [28.8, 32.0, 'el patio.'],
    [34.2, 37.4, 'Tres capas.'], [40.0, 42.4, 'Por dentro.'], [43.6, 48.0, 'La calle sigue en el patio.']];
  window.renderAt = (t) => {
    let i = 1; while (i < K.length - 1 && K[i].t < t) i++; const a = K[i - 1], b = K[i]; const u = smr(seg(t, a.t, b.t));
    const el = lerp(a.el, b.el, u); const bv = bdAt(t);
    const o = { t, show: 'btrk', tg: a.tg.map((v, j) => lerp(v, b.tg[j], u)), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), az: lerp(a.az, b.az, u), el, clipZ: lerp(a.c, b.c, sm(seg(t, a.t, b.t))),
      ex: 0, worm: el < -2, ctx: lerp(a.ctx, b.ctx, smr(seg(t, a.t + (b.t - a.t) * 0.35, b.t))), build: bv === null ? ((t >= 9.0 && t < 14.2) ? 0 : 99) : bv };
    // exploded layers: separate and close again
    const xe = Math.min(sm(seg(t, 32.2, 34.0)), 1 - sm(seg(t, 37.0, 38.8))); if (xe > 0.001) { o.xa = true; o.xaS = xe; }
    if (t >= 43.4) { o.ctx3d = true; o.rise = sm(seg(t, 43.4, 45.6)); }
    window.shot(o);
    $('kicker').textContent = '009 · GIMNASIO MARAVILLAS';
    let tw = '', to = 0; for (const [a0, b0, tx] of words) { const f = fw(t, a0, b0, 0.22); if (f > 0) { tw = tx; to = f; } } $('title').textContent = tw; $('title').style.opacity = to; $('sub').style.opacity = 0;
    const svg = $('ov'); svg.innerHTML = ''; const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    if (o.ctx > 0.02) svg.insertAdjacentHTML('beforeend', `<rect x="0" y="0" width="${W}" height="${H * 0.2}" fill="#F2F1EC" opacity="${Math.min(0.92, o.ctx)}"/>`);
    { const op = Math.min(o.ctx, fw(t, 6.4, 12.4)); if (op > 0.02) for (const [uv, txt] of [[[700, 660], 'C/ JOAQUÍN COSTA'], [[1010, 222], 'C/ GUADALQUIVIR']]) { const [X1, z1] = MP(uv[0], uv[1]); const q = P([X1, 0, z1]); svg.insertAdjacentHTML('beforeend', `<text class="lab" x="${q[0]}" y="${q[1]}" text-anchor="middle" opacity="${op}">${txt}</text>`); } }
    { const op = fw(t, 10.4, 12.4); if (op > 0.02) { const A1 = P([0, 0, -2]), B1 = P([28.6, 0, -2]); svg.insertAdjacentHTML('beforeend', `<g opacity="${op}"><line x1="${A1[0] - 30}" y1="${A1[1]}" x2="${B1[0] - 30}" y2="${B1[1]}" stroke="${RED}" stroke-width="3"/><text class="dim" x="${(A1[0] + B1[0]) / 2 - 44}" y="${(A1[1] + B1[1]) / 2}" text-anchor="end" style="font-size:40px">↑ 12 m</text></g>`); } }
    return true; };
  window.renderCover = () => { document.body.classList.add('cover'); window.shot({ show: 'btrk', clipZ: -20, tg: [13, 21, -24], z: 36, az: 22, el: 16 }); $('title').style.opacity = 0; $('kicker').textContent = ''; $('sub').style.opacity = 0; $('ov').innerHTML = ''; return true; };
  window.READY = true;
}
