import { THREE, fillMat, lineMat, segs, edgesOf, boxG, merge, prism, geomFrom, slab } from './lib.js';

export const COL = { yellow: '#E7B547', blue: '#9DC3E3', green: '#A6D2C2', wood: '#EFDDAE', barge: '#E2401C', win: '#2A2C33', ink: '#1A1B20' };
export const DECK = 1.2;

// shared clipping planes for the theatre (growth + section)
export const clipCladding = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);
export const clipTubes = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);
export const clipSection = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1e7);

function octagonRing(apothem, thick, y0, y1) {
  const R = apothem / Math.cos(Math.PI / 8), Ri = (apothem - thick) / Math.cos(Math.PI / 8);
  const pts = [new THREE.Vector2(Ri, y0), new THREE.Vector2(R, y0), new THREE.Vector2(R, y1), new THREE.Vector2(Ri, y1), new THREE.Vector2(Ri, y0)];
  const g = new THREE.LatheGeometry(pts, 8, Math.PI / 8);
  return g.toNonIndexed();
}
function roofShell(apothem, y0, apex, thick) {
  const R = apothem / Math.cos(Math.PI / 8);
  const pts = [new THREE.Vector2(0.001, apex), new THREE.Vector2(R, y0), new THREE.Vector2(R - thick * 2.2, y0 + thick), new THREE.Vector2(0.001, apex - thick * 1.6), new THREE.Vector2(0.001, apex)];
  return new THREE.LatheGeometry(pts.reverse(), 8, Math.PI / 8).toNonIndexed();
}

export function buildTheatre() {
  const g = new THREE.Group();
  const planes = [clipCladding, clipSection];
  const mk = (color, o = {}) => { const m = fillMat(color, { double: true, ...o }); m.clippingPlanes = planes; return m; };
  const mats = {
    yellow: mk(COL.yellow, { planks: 0.35 }), blue: mk(COL.blue), green: mk(COL.green), wood: mk(COL.wood, { hatch: 0.6 }),
    win: mk(COL.win, { hatch: 0 }), flag: (() => { const m = fillMat(COL.blue, { double: true, poche: false, hatch: 0 }); m.clippingPlanes = planes; return m; })(),
  };
  const parts = { yellow: [], blue: [], green: [], wood: [], win: [], flag: [] };
  const Y0 = DECK, CUBE = 4.75, T = 0.35;
  // cube walls (closed boxes) y 1.2 -> 11.2, blue parapet 11.2 -> 12.2
  const wall = (y0, y1, key) => {
    parts[key].push(boxG(-CUBE, CUBE, y0, y1, CUBE - T, CUBE), boxG(-CUBE, CUBE, y0, y1, -CUBE, -CUBE + T));
    parts[key].push(boxG(CUBE - T, CUBE, y0, y1, -CUBE + T, CUBE - T), boxG(-CUBE, -CUBE + T, y0, y1, -CUBE + T, CUBE - T));
  };
  wall(Y0, Y0 + 10.0, 'yellow'); wall(Y0 + 10.0, Y0 + 11.0, 'blue');
  // terrace floor with octagonal opening
  {
    const sh = new THREE.Shape([new THREE.Vector2(-CUBE + T, -CUBE + T), new THREE.Vector2(CUBE - T, -CUBE + T), new THREE.Vector2(CUBE - T, CUBE - T), new THREE.Vector2(-CUBE + T, CUBE - T)]);
    const a = 3.1, R = a / Math.cos(Math.PI / 8); const hole = new THREE.Path();
    for (let i = 0; i < 8; i++) { const t = Math.PI / 8 + i * Math.PI / 4; const p = new THREE.Vector2(R * Math.cos(t), R * Math.sin(t)); i ? hole.lineTo(p.x, p.y) : hole.moveTo(p.x, p.y); }
    sh.holes.push(hole);
    const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); eg.rotateX(-Math.PI / 2); eg.translate(0, Y0 + 9.7, 0);
    parts.wood.push(eg.toNonIndexed());
  }
  // stair towers east & west, y 1.2 -> 14.7, hollow
  for (const s of [1, -1]) {
    const x0 = s > 0 ? CUBE : -CUBE - 2.4, x1 = s > 0 ? CUBE + 2.4 : -CUBE, z0 = -1.8, z1 = 1.8, top = Y0 + 13.5, t = 0.3;
    parts.yellow.push(boxG(x0, x1, Y0, top, z1 - t, z1), boxG(x0, x1, Y0, top, z0, z0 + t));
    const xo0 = s > 0 ? x1 - t : x0, xo1 = s > 0 ? x1 : x0 + t;
    parts.yellow.push(boxG(xo0, xo1, Y0, top, z0 + t, z1 - t));
    parts.blue.push(boxG(x0, x1, top, top + 0.5, z0, z1));
    // windows on the outer face
    for (const y of [4.2, 7.4, 10.6]) parts.win.push(boxG(s > 0 ? x1 : x0 - 0.04, s > 0 ? x1 + 0.04 : x0, Y0 + y, Y0 + y + 0.7, -0.35, 0.35));
    // stairs (alternating flights along z)
    let y = Y0, dir = 1, lane = 0;
    const xa = s > 0 ? [CUBE + 0.3, CUBE + 1.2, CUBE + 2.1] : [-CUBE - 2.1, -CUBE - 1.2, -CUBE - 0.3];
    while (y < Y0 + 9.6) {
      for (let k = 0; k < 11; k++) {
        const zz = dir > 0 ? -1.4 + k * 0.25 : 1.4 - (k + 1) * 0.25;
        y += 0.21; parts.wood.push(boxG(xa[lane], xa[lane + 1], y - 0.16, y, zz, zz + 0.25));
      }
      parts.wood.push(boxG(xa[0], xa[2], y - 0.16, y, dir > 0 ? 1.35 : -1.5, dir > 0 ? 1.5 : -1.35));
      dir = -dir; lane = 1 - lane;
    }
  }
  // octagon drum 12.2 -> 17.4 yellow, 17.4 -> 18.2 blue
  parts.yellow.push(octagonRing(3.3, 0.3, Y0 + 11.0, Y0 + 16.2));
  parts.blue.push(octagonRing(3.3, 0.3, Y0 + 16.2, Y0 + 17.0));
  parts.green.push(roofShell(3.85, Y0 + 17.0, Y0 + 23.2, 0.22));
  // finial, pole, flag
  parts.green.push(boxG(-0.32, 0.32, Y0 + 23.0, Y0 + 23.6, -0.32, 0.32));
  { const s = new THREE.SphereGeometry(0.36, 10, 8); s.translate(0, Y0 + 23.95, 0); parts.green.push(s.toNonIndexed()); }
  parts.win.push(boxG(-0.05, 0.05, Y0 + 24.2, Y0 + 25.0, -0.05, 0.05));
  { const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute([0, Y0 + 25.0, 0, 0, Y0 + 24.45, 0, 1.6, Y0 + 24.72, 0.0], 3)); parts.flag.push(fg); }
  // windows: cube faces (2 rows x 4 on N/S, 2 x 2 on E/W beside the towers), octagon
  const wy = [Y0 + 4.6, Y0 + 7.6], ws = 0.78;
  for (const y of wy) {
    for (const x of [-3.3, -1.1, 1.1, 3.3]) { parts.win.push(boxG(x - ws / 2, x + ws / 2, y, y + ws, CUBE, CUBE + 0.04), boxG(x - ws / 2, x + ws / 2, y, y + ws, -CUBE - 0.04, -CUBE)); }
    for (const z of [-3.4, 3.4]) { parts.win.push(boxG(CUBE, CUBE + 0.04, y, y + ws, z - ws / 2, z + ws / 2), boxG(-CUBE - 0.04, -CUBE, y, y + ws, z - ws / 2, z + ws / 2)); }
  }
  for (let i = 0; i < 8; i += 2) {
    const t = i * Math.PI / 4; const c = Math.cos(t), s = Math.sin(t);
    const b = boxG(-0.35, 0.35, Y0 + 13.0, Y0 + 13.7, 3.3, 3.34); b.rotateY(Math.PI / 2 - t); parts.win.push(b);
  }
  // interior: corridor stage along z, two facing tiers, two gallery levels
  parts.wood.push(boxG(-1.0, 1.0, Y0, Y0 + 0.3, -CUBE + T, CUBE - T));
  for (const s of [1, -1]) {
    for (let i = 0; i < 5; i++) {
      const xa = 1.15 + 0.62 * i, top = Y0 + 0.3 + 0.42 * (i + 1);
      parts.wood.push(s > 0 ? boxG(xa, CUBE - T, Y0, top, -3.2, 3.2) : boxG(-CUBE + T, -xa, Y0, top, -3.2, 3.2));
    }
  }
  for (const gy of [Y0 + 4.2, Y0 + 7.2]) {
    const a = CUBE - T, b = a - 1.15;
    parts.wood.push(boxG(-a, a, gy, gy + 0.2, b, a), boxG(-a, a, gy, gy + 0.2, -a, -b), boxG(b, a, gy, gy + 0.2, -b, b), boxG(-a, -b, gy, gy + 0.2, -b, b));
    const r = b - 0.06; // balustrade
    parts.wood.push(boxG(-b, b, gy + 0.2, gy + 1.15, r, b), boxG(-b, b, gy + 0.2, gy + 1.15, -b, -r), boxG(r, b, gy + 0.2, gy + 1.15, -r, r), boxG(-b, -r, gy + 0.2, gy + 1.15, -r, r));
  }
  const edgeMat = lineMat(COL.ink, 1.7); edgeMat.clippingPlanes = planes;
  const thinMat = lineMat(COL.ink, 1.05); thinMat.clippingPlanes = planes;
  const meshes = {}; const E = [], Et = [];
  for (const [k, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const geo = merge(list);
    const m = new THREE.Mesh(geo, mats[k]); m.renderOrder = 0; m.frustumCulled = false; g.add(m); meshes[k] = m;
    (k === 'wood' || k === 'win' ? Et : E).push(...edgesOf(geo, 20));
  }
  const clad = new THREE.Group(); g.add(clad);
  for (const m of Object.values(meshes)) { g.remove(m); clad.add(m); }
  const le = segs(E, edgeMat); le.frustumCulled = false; clad.add(le);
  const lt = segs(Et, thinMat); lt.frustumCulled = false; clad.add(lt);

  // steel tube skeleton (construction phase), drawn as ink lines
  const tubes = []; const L = (a, b) => tubes.push(...a, ...b);
  const ci = CUBE - 0.25;
  for (let i = 0; i <= 6; i++) { const p = -ci + i * (2 * ci / 6); for (const [x, z] of [[p, ci], [p, -ci], [ci, p], [-ci, p]]) L([x, Y0, z], [x, Y0 + 11, z]); }
  for (let y = Y0; y <= Y0 + 11.01; y += 1.83) { for (const [a, b] of [[[-ci, ci], [ci, ci]], [[ci, ci], [ci, -ci]], [[ci, -ci], [-ci, -ci]], [[-ci, -ci], [-ci, ci]]]) L([a[0], y, a[1]], [b[0], y, b[1]]); }
  for (const [a, b] of [[[-ci, ci], [-ci + 2 * ci / 6, ci]], [[ci, -ci], [ci - 2 * ci / 6, -ci]]]) for (let y = Y0; y < Y0 + 10; y += 1.83) L([a[0], y, a[1]], [b[0], y + 1.83, b[1]]);
  const Ro = 3.1 / Math.cos(Math.PI / 8);
  for (let i = 0; i < 8; i++) { const t = Math.PI / 8 + i * Math.PI / 4, t2 = t + Math.PI / 4; const p = [Ro * Math.cos(t), Ro * Math.sin(t)], q = [Ro * Math.cos(t2), Ro * Math.sin(t2)];
    L([p[0], Y0 + 11, p[1]], [p[0], Y0 + 17, p[1]]);
    for (let y = Y0 + 11; y <= Y0 + 17.01; y += 1.5) L([p[0], y, p[1]], [q[0], y, q[1]]);
    L([p[0] * 1.2, Y0 + 17, p[1] * 1.2], [0, Y0 + 23.2, 0]); }
  for (const s of [1, -1]) { const x0 = s > 0 ? CUBE + 0.2 : -CUBE - 2.2, x1 = s > 0 ? CUBE + 2.2 : -CUBE - 0.2;
    for (const [x, z] of [[x0, -1.6], [x1, -1.6], [x0, 1.6], [x1, 1.6]]) L([x, Y0, z], [x, Y0 + 13.5, z]);
    for (let y = Y0; y <= Y0 + 13.6; y += 1.83) { L([x0, y, -1.6], [x1, y, -1.6]); L([x0, y, 1.6], [x1, y, 1.6]); L([x1, y, -1.6], [x1, y, 1.6]); } }
  const tubeMat = lineMat('#3A3C44', 1.25); tubeMat.clippingPlanes = [clipTubes];
  const tl = segs(tubes, tubeMat); tl.frustumCulled = false; g.add(tl);
  clad.position.y = 0.06; tl.position.y = 0.06;

  // barge (never clipped)
  const bm = fillMat(COL.barge, { hatch: 1 });
  const bg = boxG(-12, 12, 0, DECK, -8, 8);
  const barge = new THREE.Mesh(bg, bm); barge.frustumCulled = false; g.add(barge);
  const bl = segs(edgesOf(bg), lineMat(COL.ink, 1.7)); bl.frustumCulled = false; g.add(bl);
  // deck plates (thin joints)
  const dj = []; for (let x = -9; x <= 9; x += 3) dj.push(x, DECK + 0.01, -8, x, DECK + 0.01, 8);
  const djl = segs(dj, lineMat('#9E2A12', 0.9)); djl.frustumCulled = false; g.add(djl);
  return { group: g, clad, tubes: tl, mats, lineMats: [edgeMat, thinMat, tubeMat] };
}

export function buildTug() {
  const g = new THREE.Group();
  const P = [], B = [], T = [], E = [];
  const hull = [[-9, -3], [5, -3], [8.2, -1.6], [9, 0], [8.2, 1.6], [5, 3], [-9, 3]];
  prism(hull, 0, 1.7, 0, P, B, T, E);
  const P2 = [], B2 = [], T2 = [], E2 = [];
  prism([[-4.5, -2], [1.5, -2], [1.5, 2], [-4.5, 2]], 1.7, 3.6, 0, P2, B2, T2, E2);
  prism([[-2.5, -1.4], [1, -1.4], [1, 1.4], [-2.5, 1.4]], 3.6, 5.4, 0, P2, B2, T2, E2);
  const P3 = [], B3 = [], T3 = [], E3 = [];
  prism([[-6.2, -0.6], [-5.0, -0.6], [-5.0, 0.6], [-6.2, 0.6]], 1.7, 6.2, 0, P3, B3, T3, E3);
  const m1 = new THREE.Mesh(geomFrom(P, B, T), fillMat('#3A3D46', { hatch: 1, side: 0.9, top: 1.25 }));
  const m2 = new THREE.Mesh(geomFrom(P2, B2, T2), fillMat('#FBFAF6', { hatch: 1 }));
  const m3 = new THREE.Mesh(geomFrom(P3, B3, T3), fillMat('#E2401C', { hatch: 1 }));
  for (const m of [m1, m2, m3]) { m.frustumCulled = false; g.add(m); }
  const lm = lineMat('#1A1B20', 1.4);
  const l = segs([...E, ...E2, ...E3], lm); l.frustumCulled = false; g.add(l);
  return { group: g, mats: [m1.material, m2.material, m3.material], lineMats: [lm] };
}

// Fusina yard: quay along the north side of the barge (local coords, barge centre at origin)
export function buildFusina() {
  const g = new THREE.Group();
  const P = [], B = [], T = [], E = [];
  slab([[-260, -9.6], [260, -9.6], [260, -420], [-260, -420]], [], 1.6, -0.5, P, B, T, E);
  slab([[-260, -9.6], [-150, -9.6], [-150, 60], [-260, 80]], [], 1.6, -0.5, P, B, T, E);
  const land = new THREE.Mesh(geomFrom(P, B, T), fillMat('#E4E1D7', { hatch: 0.4, top: 1.0, side: 0.94, shade: 0.9 }));
  const PB = [], BB = [], TB = [], EB = [];
  const sheds = [[[-110, -95], [-40, -95], [-40, -58], [-110, -58], 13, 4.5], [[-28, -92], [32, -92], [32, -62], [-28, -62], 9.5, 3.5], [[60, -105], [120, -105], [120, -70], [60, -70], 8, 2.5], [[-170, -120], [-130, -120], [-130, -60], [-170, -60], 7, 2]];
  for (const s of sheds) prism(s.slice(0, 4), 1.6, s[4], s[5], PB, BB, TB, EB, { hip: 6, bottomEdges: true });
  const bld = new THREE.Mesh(geomFrom(PB, BB, TB), fillMat('#EFEDE6', { hatch: 1, windows: 0, side: 0.93, shade: 0.84 }));
  // gantry crane on the quay (solid members)
  const cr = []; const cx = 52;
  for (const [x, z] of [[cx - 9, -42], [cx + 9, -42], [cx - 9, -29], [cx + 9, -29]]) cr.push(boxG(x - 0.5, x + 0.5, 1.6, 21, z - 0.5, z + 0.5));
  cr.push(boxG(cx - 10, cx + 10, 21, 22.6, -42.7, -41.3), boxG(cx - 10, cx + 10, 21, 22.6, -29.7, -28.3));
  cr.push(boxG(cx - 9.6, cx - 8.4, 21, 22.6, -42, -29), boxG(cx + 8.4, cx + 9.6, 21, 22.6, -42, -29), boxG(cx - 1.5, cx + 1.5, 22.6, 24.4, -40, -31));
  const C = [];
  // rails along the quay and paving joints
  for (const z of [-14, -15.5, -45, -46.5]) C.push(-250, 1.62, z, 250, 1.62, z);
  for (let x = -240; x <= 240; x += 12) C.push(x, 1.62, -10, x, 1.62, -13);
  const bol = []; for (let x = -100; x <= 120; x += 22) bol.push(boxG(x - 0.4, x + 0.4, 1.6, 2.4, -10.6, -9.8));
  const bolM = new THREE.Mesh(merge(bol), fillMat('#3A3D46', { hatch: 0 }));
  const crM = new THREE.Mesh(merge(cr), fillMat('#5A5D66', { hatch: 1, top: 1.1 }));
  for (const m of [land, bld, bolM, crM]) { m.frustumCulled = false; g.add(m); }
  const lm = lineMat('#2A2B30', 1.05), lm2 = lineMat('#8C8A82', 0.9);
  const l1 = segs([...E, ...EB, ...edgesOf(bolM.geometry), ...edgesOf(crM.geometry)], lm); const l2 = segs(C, lm2);
  for (const l of [l1, l2]) { l.frustumCulled = false; g.add(l); }
  return { group: g, mats: [land.material, bld.material, bolM.material, crM.material], lineMats: [lm, lm2] };
}
