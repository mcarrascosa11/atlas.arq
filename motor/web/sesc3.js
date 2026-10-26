import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, edgesOf, boxG, merge, prism, geomFrom } from './lib.js';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
const $ = (id) => document.getElementById(id);
const LW = { A: 1.6, B: 0.9, C: 0.5 }; const INK = '#1A1B20', GREY = '#9A978F', RED = '#E2401C';
// plan "Planta general, primer nivel" (scale bar: 30 m = 320 px)
const S = 1 / 10.67, OX = 900, OY = 950; const M = (x, y) => [(x - OX) * S, (y - OY) * S];
const paper = fillMat('#F4F2EC', { hatch: 1, side: 0.95, shade: 0.86 }), roofM = fillMat('#ECE9E1', { hatch: 1, side: 0.93, shade: 0.84 }), poche = fillMat('#26272C', { hatch: 0 }), white = fillMat('#FBFAF6', { hatch: 0 });
// sheds: [x0, y0, x1, y1, public?]
const SHEDS = [[300, 805, 420, 1000, 0], [420, 805, 720, 1000, 0], [720, 805, 1145, 1000, 1], [1195, 805, 1485, 1000, 0], [235, 1075, 905, 1580, 1], [905, 1075, 1190, 1580, 1], [1195, 1075, 1485, 1580, 1]];
const CLOSED = [[235, 1200, 330, 1580], [1340, 1480, 1485, 1580]];   // offices (16) and lab (7) inside the sheds
const SW = [];
function shed(x0, y0, x1, y1, P, B, T, E, R) { const a = M(x0, y0), b = M(x1, y1); const h = 7.5, rise = 3.2, th = 0.45;
  SW.push(boxG(a[0], b[0], 0, h, a[1], a[1] + th), boxG(a[0], b[0], 0, h, b[1] - th, b[1]), boxG(a[0], a[0] + th, 0, h, a[1] + th, b[1] - th), boxG(b[0] - th, b[0], 0, h, a[1] + th, b[1] - th));
  // gable roof built explicitly: two sloped planes + two gable triangles, ridge along the long side
  const X0 = a[0], X1 = b[0], Z0 = a[1], Z1 = b[1], o = 0.3, y = h, yr = h + rise; const V = [];
  const tri = (p, q, r) => V.push(...p, ...q, ...r); const quad = (p, q, r, t) => { tri(p, q, r); tri(p, r, t); };
  if ((X1 - X0) >= (Z1 - Z0)) { const zm = (Z0 + Z1) / 2;
    quad([X0 - o, y, Z0 - o], [X1 + o, y, Z0 - o], [X1 + o, yr, zm], [X0 - o, yr, zm]); quad([X0 - o, y, Z1 + o], [X0 - o, yr, zm], [X1 + o, yr, zm], [X1 + o, y, Z1 + o]);
    tri([X0 - o, y, Z0 - o], [X0 - o, yr, zm], [X0 - o, y, Z1 + o]); tri([X1 + o, y, Z0 - o], [X1 + o, y, Z1 + o], [X1 + o, yr, zm]); }
  else { const xm = (X0 + X1) / 2;
    quad([X0 - o, y, Z0 - o], [xm, yr, Z0 - o], [xm, yr, Z1 + o], [X0 - o, y, Z1 + o]); quad([X1 + o, y, Z0 - o], [X1 + o, y, Z1 + o], [xm, yr, Z1 + o], [xm, yr, Z0 - o]);
    tri([X0 - o, y, Z0 - o], [X1 + o, y, Z0 - o], [xm, yr, Z0 - o]); tri([X0 - o, y, Z1 + o], [xm, yr, Z1 + o], [X1 + o, y, Z1 + o]); }
  { const cx = (X0 + X1) / 2, cy = h + rise / 3, cz = (Z0 + Z1) / 2; for (let i = 0; i < V.length; i += 9) { const p = new THREE.Vector3(V[i], V[i + 1], V[i + 2]), q = new THREE.Vector3(V[i + 3], V[i + 4], V[i + 5]), r = new THREE.Vector3(V[i + 6], V[i + 7], V[i + 8]); const n = q.clone().sub(p).cross(r.clone().sub(p)); const m = p.clone().add(q).add(r).multiplyScalar(1 / 3); if (n.dot(m.sub(new THREE.Vector3(cx, cy, cz))) < 0) { for (let k = 0; k < 3; k++) { const tmp = V[i + 3 + k]; V[i + 3 + k] = V[i + 6 + k]; V[i + 6 + k] = tmp; } } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(V, 3)); g.computeVertexNormals();
  R.push(g); }
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); renderer.localClippingEnabled = true; $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
  const vol = new THREE.Group(), plan = new THREE.Group(), tw = new THREE.Group(); scene.add(vol, plan); vol.add(tw);
  const cutP = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  const shedM = fillMat('#F4F2EC', { hatch: 1, side: 0.95, shade: 0.86, double: true, poche: '#3A3B40' }); const roofM2 = fillMat('#ECE9E1', { hatch: 1, side: 0.93, shade: 0.84, double: true, poche: '#3A3B40' }); shedM.clippingPlanes = [cutP]; roofM2.clippingPlanes = [cutP];
  // ---- volumes
  { const P = [], B = [], T = [], E = [], R = [];
    for (const s of SHEDS) shed(s[0], s[1], s[2], s[3], P, B, T, E, R);
    const dk = [M(1560, 265), M(1610, 265), M(1665, 1580), M(1585, 1580)]; prism(dk, 0, 0.8, 0, P, B, T, E);
    const sl1 = lineMat(INK, LW.B); sl1.clippingPlanes = [cutP]; const sl2 = lineMat(INK, LW.B); sl2.clippingPlanes = [cutP];
    vol.add(new THREE.Mesh(geomFrom(P, B, T), paper)); vol.add(segs(E, lineMat(INK, LW.B)));
    const swg = merge(SW); vol.add(new THREE.Mesh(swg, shedM)); vol.add(segs(edgesOf(swg, 30), sl1));
    const rg = merge(R); vol.add(new THREE.Mesh(rg, roofM2)); vol.add(segs(edgesOf(rg, 25), sl2));
    // water tower (ribbed) and the eight walkways fanning out from the sports block to the corner of the service tower
    const w = M(1683, 733); const cg = new THREE.CylinderGeometry(3.5, 3.5, 70, 32); cg.translate(w[0], 35, w[1]); tw.add(new THREE.Mesh(cg.toNonIndexed(), paper));
    const RL = []; for (let y = 1.4; y < 70; y += 1.4) for (let i = 0; i < 32; i += 2) { const a1 = i / 32 * Math.PI * 2, a2 = (i + 1) / 32 * Math.PI * 2; RL.push(w[0] + 3.52 * Math.cos(a1), y, w[1] + 3.52 * Math.sin(a1), w[0] + 3.52 * Math.cos(a2), y, w[1] + 3.52 * Math.sin(a2)); }
    for (let i = 0; i < 32; i++) { const a1 = i / 32 * Math.PI * 2, a2 = (i + 1) / 32 * Math.PI * 2; RL.push(w[0] + 3.5 * Math.cos(a1), 70, w[1] + 3.5 * Math.sin(a1), w[0] + 3.5 * Math.cos(a2), 70, w[1] + 3.5 * Math.sin(a2)); RL.push(w[0] + 3.5 * Math.cos(a1), 0, w[1] + 3.5 * Math.sin(a1), w[0] + 3.5 * Math.cos(a1), 70, w[1] + 3.5 * Math.sin(a1)); }
    tw.add(segs(RL, lineMat(GREY, LW.C)));
    // ---- sports block: board-marked concrete prism with the irregular "cave" openings cut through the wall, red lattices set back inside
    const A0 = M(1195, 325), A1 = M(1485, 720), HB = 40; const bx0 = A0[0], bx1 = A1[0], bz0 = A0[1], bz1 = A1[1];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const blob = (w, h) => { const pts = []; const n = 20, ph = rnd() * 6; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; const r = 1 + 0.15 * Math.sin(3 * t + ph) + 0.07 * Math.cos(5 * t + ph * 1.7); pts.push(new THREE.Vector2(Math.cos(t) * w / 2 * r, Math.sin(t) * h / 2 * r)); } return new THREE.Shape(pts); };
    const holes = []; const faces = [['S', bx0, bx1], ['E', bz0, bz1], ['W', bz0, bz1], ['N', bx0, bx1]];
    for (const [f, u0, u1] of faces) for (const yb of [3.0, 12.6, 22.2, 31.8]) { let u = u0 + 1.6 + rnd() * 2; while (u < u1 - 4.5) { const w = 2.8 + rnd() * 2.2, h = 1.9 + rnd() * 1.2; holes.push([f, u + w / 2, yb + 1.4 + rnd() * 2.2, w, h, blob(w, h)]); u += w + 1.8 + rnd() * 3.4; } }
    const place = (g, f, u, v, inset) => { if (f === 'S') { g.translate(u, v, bz1 - inset); } else if (f === 'N') { g.rotateY(Math.PI); g.translate(u, v, bz0 + inset); } else if (f === 'E') { g.rotateY(Math.PI / 2); g.translate(bx1 - inset, v, u); } else { g.rotateY(-Math.PI / 2); g.translate(bx0 + inset, v, u); } return g; };
    const ev = new Evaluator(); ev.attributes = ['position'];
    let res = new Brush(new THREE.BoxGeometry(bx1 - bx0, HB, bz1 - bz0).translate((bx0 + bx1) / 2, HB / 2, (bz0 + bz1) / 2)); res.updateMatrixWorld();
    const cut = []; for (const [f, u, v, w, h, shp] of holes) { const g = new THREE.ExtrudeGeometry(shp, { depth: 2.4, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -1.2); place(g, f, u, 0, 0); g.translate(0, v, 0); cut.push(g.toNonIndexed()); }
    const cb = new Brush(merge(cut)); cb.updateMatrixWorld(); res = ev.evaluate(res, cb, SUBTRACTION);
    const sg = res.geometry.index ? res.geometry.toNonIndexed() : res.geometry; for (const k of Object.keys(sg.attributes)) if (k !== 'position') sg.deleteAttribute(k);
    tw.add(new THREE.Mesh(sg, fillMat('#ECEAE3', { hatch: 1, side: 0.94, shade: 0.84, double: true, poche: '#CFCBC2' })));
    const OL = []; for (const y of [0, HB]) OL.push(bx0, y, bz0, bx1, y, bz0, bx1, y, bz0, bx1, y, bz1, bx1, y, bz1, bx0, y, bz1, bx0, y, bz1, bx0, y, bz0);
    for (const [x, z] of [[bx0, bz0], [bx1, bz0], [bx1, bz1], [bx0, bz1]]) OL.push(x, 0, z, x, HB, z);
    const lat = [], SL = [];
    for (const [f, u, v, w, h, shp] of holes) { const pts = shp.getPoints(); const tmp = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; tmp.push(p.x, p.y, 0, q.x, q.y, 0); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(tmp, 3)); place(lg, f, u, 0, -0.01); lg.translate(0, v, 0); OL.push(...lg.attributes.position.array);
      const g2 = new THREE.ShapeGeometry(shp); place(g2, f, u, 0, 0.45); g2.translate(0, v, 0); lat.push(g2.toNonIndexed());
      const sl = []; for (let x = -w / 2 + 0.35; x < w / 2 - 0.25; x += 0.4) { const hh = h * 0.44 * Math.sqrt(Math.max(0, 1 - (2 * x / w) ** 2)); sl.push(x, -hh, 0, x, hh, 0); }
      const sgm = new THREE.BufferGeometry(); sgm.setAttribute('position', new THREE.Float32BufferAttribute(sl, 3)); place(sgm, f, u, 0, 0.43); sgm.translate(0, v, 0); SL.push(...sgm.attributes.position.array); }
    tw.add(segs(OL, lineMat(INK, LW.B))); tw.add(new THREE.Mesh(merge(lat), fillMat(RED, { hatch: 0, double: true, poche: RED }))); tw.add(segs(SL, lineMat('#8E2410', LW.C)));
    // ---- service tower (rotated square): small square windows in a regular grid
    { const c = M(1720, 525), hs = 170 * S / 2, an = 0.52, HT = 48; const tg = new THREE.Group(); const P3 = [], B3 = [], T3 = [], E3 = [];
      prism([[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]], 0, HT, 0, P3, B3, T3, E3, { bottomEdges: true }); tg.add(new THREE.Mesh(geomFrom(P3, B3, T3), fillMat('#ECEAE3', { hatch: 1, side: 0.94, shade: 0.84 }))); tg.add(segs(E3, lineMat(INK, LW.B)));
      const wins = []; for (let y = 3; y < HT - 2; y += 3) for (let k = -2; k <= 2; k++) { const u = k * 2.8; wins.push(boxG(u - 0.45, u + 0.45, y, y + 0.9, hs - 0.02, hs + 0.04), boxG(u - 0.45, u + 0.45, y, y + 0.9, -hs - 0.04, -hs + 0.02), boxG(hs - 0.02, hs + 0.04, y, y + 0.9, u - 0.45, u + 0.45), boxG(-hs - 0.04, -hs + 0.02, y, y + 0.9, u - 0.45, u + 0.45)); }
      tg.add(new THREE.Mesh(merge(wins), fillMat('#3A3C44', { hatch: 0 }))); tg.rotation.y = -an; tg.position.set(c[0], 0, c[1]); tw.add(tg); }
    // ---- eight concrete walkways with solid parapets, fanning out from the sports block to the service tower.
    //      Each one is pushed 1.5 m into both walls and the intersection with each wall plane is drawn as a line.
    { const c = M(1720, 525), hs = 170 * S / 2, an = 0.52;
      const sq = [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]].map(([u, v]) => [c[0] + u * Math.cos(an) - v * Math.sin(an), c[1] + u * Math.sin(an) + v * Math.cos(an)]);
      const tip = M(1630, 545); const ys = [430, 470, 510, 550, 590, 630, 670, 700]; const hA = [5, 9.5, 14, 18.5, 23, 27.5, 32, 36.5];
      const WK = [], XL = [];
      // 2D: first crossing of the ray a->tip with the tower square, and that side's outward plane
      const hitSquare = (ax, az, tx, tz) => { let best = null; for (let i = 0; i < 4; i++) { const p = sq[i], q = sq[(i + 1) % 4]; const dx = tx - ax, dz = tz - az, ex = q[0] - p[0], ez = q[1] - p[1]; const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue;
          const t = ((p[0] - ax) * ez - (p[1] - az) * ex) / den, u = ((p[0] - ax) * dz - (p[1] - az) * dx) / den; if (t > 0 && u >= 0 && u <= 1 && (!best || t < best.t)) { const nx = ez, nz = -ex; const L = Math.hypot(nx, nz); best = { t, x: ax + dx * t, z: az + dz * t, n: new THREE.Vector3(nx / L, 0, nz / L) }; } } return best; };
      ys.forEach((py, k) => { const za = M(1485, py)[1]; const hb = hA[k] + (k % 2 ? 2 : -2);
        const hit = hitSquare(bx1, za, tip[0], tip[1]); if (!hit) return;
        const A = new THREE.Vector3(bx1, hA[k], za), Bp = new THREE.Vector3(hit.x, hb, hit.z); const dir = Bp.clone().sub(A).normalize();
        const A2 = A.clone().addScaledVector(dir, -1.5), B2 = Bp.clone().addScaledVector(dir, 1.5); const L = A2.distanceTo(B2);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir); const yv = new THREE.Vector3(0, 1, 0).applyQuaternion(q), zv = new THREE.Vector3(0, 0, 1).applyQuaternion(q); const mid = A2.clone().add(B2).multiplyScalar(0.5);
        const parts = [[0, -0.2, 0.2, 2.6], [1.2, 0.2, 1.2, 0.22], [-1.2, 0.2, 1.2, 0.22]];
        for (const [dz, y0, y1, wd] of parts) { const g = new THREE.BoxGeometry(L, y1 - y0, wd); g.translate(0, (y0 + y1) / 2, dz); g.applyQuaternion(q); g.translate(mid.x, mid.y, mid.z); WK.push(g.toNonIndexed());
          // intersection outlines with the block face (x = bx1) and the tower face
          const corners = [[y0, dz - wd / 2], [y0, dz + wd / 2], [y1, dz + wd / 2], [y1, dz - wd / 2]];
          for (const [n, c0] of [[new THREE.Vector3(1, 0, 0), bx1], [hit.n, hit.n.x * hit.x + hit.n.z * hit.z]]) { const nd = n.dot(dir); if (Math.abs(nd) < 1e-6) continue;
            const pts = corners.map(([ly, lz]) => { const base = A2.clone().addScaledVector(yv, ly).addScaledVector(zv, lz); const sP = (c0 - n.dot(base)) / nd; return base.addScaledVector(dir, sP); });
            for (let i = 0; i < 4; i++) { const p = pts[i], r = pts[(i + 1) % 4]; XL.push(p.x + n.x * 0.02, p.y, p.z + n.z * 0.02, r.x + n.x * 0.02, r.y, r.z + n.z * 0.02); } } } });
      const wg = merge(WK); tw.add(new THREE.Mesh(wg, fillMat('#F4F2EC', { hatch: 1, side: 0.95, shade: 0.86 }))); tw.add(segs(edgesOf(wg, 30), lineMat(INK, LW.B))); tw.add(segs(XL, lineMat(INK, LW.B))); } }
  // ---- Nolli plan: public ground in white, closed in black, streets continuing into the internal street
  { const P = [], B = [], T = [], E = [], P2 = [], B2 = [], T2 = [], E2 = [];
    const rect = (x0, y0, x1, y1, list) => { const a = M(x0, y0), b = M(x1, y1); prism([[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]], 0.05, 0.1, 0, ...list); };
    for (const s of SHEDS) rect(s[0], s[1], s[2], s[3], s[4] ? [P2, B2, T2, E2] : [P, B, T, E]);
    for (const c of CLOSED) rect(c[0], c[1], c[2], c[3], [P, B, T, E]);
    rect(1195, 325, 1485, 720, [P, B, T, E]);
    const c = M(1720, 525), hs = 170 * S / 2, an = 0.52; prism([[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]].map(([u, v]) => [c[0] + u * Math.cos(an) - v * Math.sin(an), c[1] + u * Math.sin(an) + v * Math.cos(an)]), 0.05, 0.1, 0, P, B, T, E);
    // the city around (schematic): blocks beyond the four streets
    const city = [[-60, 40, 180, 330], [-60, 1660, 900, 1950], [960, 1660, 1900, 1950], [1660, 600, 2050, 1580], [-60, 330, 1060, 760], [1100, -150, 1700, 80]];
    for (const q of city) rect(q[0], q[1], q[2], q[3], [P, B, T, E]);
    plan.add(new THREE.Mesh(geomFrom(P, B, T), poche)); plan.add(new THREE.Mesh(geomFrom(P2, B2, T2), white)); plan.add(segs(E2, lineMat(INK, LW.C)));
    // the walk: from rua Clélia along the internal street into the great hall (vermillion)
    const route = [M(250, 1037), M(700, 1037), M(705, 1110), M(760, 1300)]; const RL = []; for (let i = 0; i < route.length - 1; i++) RL.push(route[i][0], 0.2, route[i][1], route[i + 1][0], 0.2, route[i + 1][1]);
    plan.add(segs(RL, lineMat(RED, 4, { depthTest: false }), 9)); }
  // ---- demolition cross (vermillion, dashed)
  const cross = new THREE.Group(); { const L = []; const a = M(235, 805), b = M(1485, 1580); const dash = (p, q) => { const n = 50; for (let i = 0; i < n; i += 2) { const f = (k) => [p[0] + (q[0] - p[0]) * k / n, 14, p[1] + (q[1] - p[1]) * k / n]; L.push(...f(i), ...f(i + 1)); } }; dash([a[0], a[1]], [b[0], b[1]]); dash([b[0], a[1]], [a[0], b[1]]); cross.add(segs(L, lineMat(RED, 4, { depthTest: false }), 9)); scene.add(cross); }
  // streets as lines (both views)
  { const L = []; const ln = (p, q) => { const a = M(...p), b = M(...q); L.push(a[0], 0.04, a[1], b[0], 0.04, b[1]); }; ln([360, 790], [225, 1600]); ln([150, 1600], [1700, 1600]); ln([1100, 150], [1400, 110]); ln([1590, 250], [2000, 520]); ln([1110, 150], [1110, 805]); scene.add(segs(L, lineMat(GREY, LW.C))); }
  // ---- great hall (13) interior: concrete columns with corbels, timber trusses, the river and the hanging fireplace
  const hall = new THREE.Group(); scene.add(hall);
  { const C = [], L = []; const xs = [352, 497, 637, 777], yc = []; for (let y = 1135; y < 1560; y += 80) yc.push(y);
    for (const px of xs) for (const py of yc) { const p = M(px, py); C.push(boxG(p[0] - 0.3, p[0] + 0.3, 0, 7.2, p[1] - 0.3, p[1] + 0.3), boxG(p[0] - 0.9, p[0] + 0.9, 6.6, 7.2, p[1] - 0.3, p[1] + 0.3)); }
    const cg2 = merge(C); hall.add(new THREE.Mesh(cg2, paper)); hall.add(segs(edgesOf(cg2, 30), lineMat(INK, LW.B)));
    for (const py of yc) { const a = M(235, py), b = M(905, py); L.push(a[0], 7.3, a[1], b[0], 7.3, b[1]); const n = 14; for (let k = 0; k < n; k++) { const x0 = a[0] + (b[0] - a[0]) * k / n, x1 = a[0] + (b[0] - a[0]) * (k + 1) / n; const yA = 7.3 + 2.4 * (1 - Math.abs(2 * k / n - 1)), yB = 7.3 + 2.4 * (1 - Math.abs(2 * (k + 1) / n - 1)); L.push(x0, yA, a[1], x1, yB, a[1], x0, 7.3, a[1], x1, yB, a[1]); } }
    { const tm = lineMat('#5A5B62', LW.C); tm.clippingPlanes = [cutP]; hall.add(segs(L, tm)); }
    // river: sinuous channel traced from the plan, drawn as two banks with water dashes
    const rv = [[845, 1115], [860, 1160], [820, 1230], [760, 1262], [745, 1330], [790, 1380], [760, 1440], [700, 1470], [710, 1530], [760, 1560]].map(p => M(...p));
    const RV = [], WD = []; for (let i = 0; i < rv.length - 1; i++) { const p = rv[i], q = rv[i + 1]; const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
      for (const sgn of [1, -1]) RV.push(p[0] + nx * 1.1 * sgn, 0.06, p[1] + nz * 1.1 * sgn, q[0] + nx * 1.1 * sgn, 0.06, q[1] + nz * 1.1 * sgn);
      for (let k = 0.2; k < 1; k += 0.3) WD.push(p[0] + dx * k - dx / l * 0.3, 0.06, p[1] + dz * k - dz / l * 0.3, p[0] + dx * k + dx / l * 0.3, 0.06, p[1] + dz * k + dz / l * 0.3); }
    hall.add(segs(RV, lineMat(INK, LW.A))); hall.add(segs(WD, lineMat('#6A6C72', LW.B)));
    const fp = M(690, 1215); const cone = new THREE.ConeGeometry(1.3, 1.6, 24, 1, true); cone.rotateX(Math.PI); cone.translate(fp[0], 2.4, fp[1]); const flue = new THREE.CylinderGeometry(0.22, 0.22, 7.6, 12); flue.translate(fp[0], 6.9, fp[1]);
    const fg = merge([cone.toNonIndexed(), flue.toNonIndexed()]); hall.add(new THREE.Mesh(fg, fillMat('#26272C', { hatch: 0, double: true, poche: '#26272C' }))); hall.add(new THREE.Mesh(merge([boxG(fp[0] - 1.6, fp[0] + 1.6, 0, 0.35, fp[1] - 1.6, fp[1] + 1.6)]), paper));
    hall.userData.labels = [[[rv[4][0] + 2, 0.2, rv[4][1]], 'RÍO'], [[fp[0], 3.4, fp[1]], 'CHIMENEA']]; }
  // ---- people in vermillion: the kids of 1976 inside the sheds; the crowd of today in the street, the halls and the deck
  const fig = (pts) => { const g = merge(pts.map(([x, z, s]) => boxG(x - 0.25 * s, x + 0.25 * s, 0, 1.7 * s, z - 0.25 * s, z + 0.25 * s))); const grp = new THREE.Group(); grp.add(new THREE.Mesh(g, fillMat(RED, { hatch: 0.6 }))); grp.add(segs(edgesOf(g, 30), lineMat('#8E2410', LW.C))); scene.add(grp); return grp; };
  let sd = 11; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const kids = []; for (let i = 0; i < 34; i++) { const p = M(260 + rr() * 620, 1100 + rr() * 450); kids.push([p[0], p[1], rr() < 0.55 ? 0.7 : 1]); } const kidsG = fig(kids);
  const crowd = []; for (let i = 0; i < 70; i++) { const p = M(240 + rr() * 1330, 1005 + rr() * 65); crowd.push([p[0], p[1], 1]); } for (let i = 0; i < 70; i++) { const p = M(260 + rr() * 620, 1100 + rr() * 450); crowd.push([p[0], p[1], 1]); } for (let i = 0; i < 40; i++) { const t = rr(); const p = M(1575 + t * 60 + rr() * 20, 300 + t * 1260); crowd.push([p[0], p[1], 1]); }
  const crowdG = fig(crowd);
  scene.traverse(o => o.frustumCulled = false);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)); const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }; const smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const seg = (t, a, b) => clamp((t - a) / (b - a)); const lerp = (a, b, t) => a + (b - a) * t; const fw = (t, a, b, f = 0.35) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
  const Kf = [
    { t: 0, tg: [30, 14, -20], z: 110, az: 35, el: 26 }, { t: 2.0, tg: [30, 14, -20], z: 110, az: 35, el: 26 },
    { t: 7.8, tg: [0, 4, 15], z: 88, az: 30, el: 28 }, { t: 13.6, tg: [0, 4, 15], z: 84, az: 34, el: 28 },
    { t: 16.2, tg: [-10, 2, 22], z: 54, az: 30, el: 42 }, { t: 21.6, tg: [-10, 2, 22], z: 52, az: 34, el: 44 },
    { t: 24.2, tg: [25, 0, -5], z: 170, az: 0, el: 88 }, { t: 29.4, tg: [25, 0, -5], z: 168, az: 0, el: 88 },
    { t: 31.9, tg: [-16, 2, 26], z: 30, az: 24, el: 40 }, { t: 37.4, tg: [-16, 2, 26], z: 29, az: 30, el: 42 },
    { t: 40.4, tg: [64, 22, -36], z: 60, az: 40, el: 16 }, { t: 45.6, tg: [64, 22, -36], z: 58, az: 30, el: 16 },
    { t: 48.6, tg: [30, 8, -10], z: 105, az: 35, el: 30 }, { t: 53.4, tg: [30, 14, -20], z: 110, az: 35, el: 26 }, { t: 56.0, tg: [30, 14, -20], z: 110, az: 35, el: 26 } ];
  const subs = [[2.2, 7.8, 'Pompéia, barrio obrero de São Paulo. Una fábrica de bidones de 1938, ya sin uso.'],
    [8.2, 13.8, 'El SESC, que se paga con una aportación obligatoria de las empresas de comercio, la compra para hacer un centro de ocio para los trabajadores. Lo lógico era derribarla.'],
    [14.4, 21.8, '1976: Lina la visita y encuentra niños corriendo y jóvenes jugando al fútbol bajo el agua que caía de los tejados rotos. Decide que todo eso debe seguir así.'],
    [22.4, 29.6, 'No la cierra: la abre. La planta baja es un suelo público que sigue la calle hacia dentro, sin puertas que cruzar.'],
    [30.4, 37.6, 'Dentro, un salón para el barrio: biblioteca, exposiciones, un río y una chimenea.'],
    [38.4, 45.8, 'Lo que no cabía en las naves, la piscina y las pistas, lo apila en dos torres unidas por pasarelas.'],
    [46.4, 53.2, 'Abre en 1982. Hoy sigue lleno de gente de todo São Paulo: la arquitectura le devuelve al barrio un trozo de ciudad.']];
  const kick = [[0, '008 · SÃO PAULO, 1977–1986'], [2.2, '01 · LA FÁBRICA'], [8.0, '02 · LA DECISIÓN'], [14.2, '03 · 1976'], [22.2, '04 · LA CALLE'], [30.2, '05 · DENTRO'], [38.2, '06 · EL DEPORTE'], [46.2, '07 · HOY'], [53.8, '008 · SÃO PAULO, 1977–1986']];
  const T = '¿Por qué Lina Bo Bardi no derribó la fábrica?';
  window.renderAt = (t) => {
    let i = 1; while (i < Kf.length - 1 && Kf[i].t < t) i++; const a = Kf[i - 1], b = Kf[i]; const u = smr(seg(t, a.t, b.t));
    const o = { tg: a.tg.map((v, k) => lerp(v, b.tg[k], u)), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), az: lerp(a.az, b.az, u), el: lerp(a.el, b.el, u) };
    o.plan = t >= 23.4 && t < 30.4; o.cross = t >= 8.4 && t < 14.6;
    tw.scale.y = Math.max(0.001, t < 3.2 ? 1 - sm(seg(t, 2.2, 3.2)) : t < 38.0 ? 0.001 : sm(seg(t, 38.0, 40.6)));
    cutP.constant = ((t >= 14.8 && t < 23.4) || (t >= 30.4 && t < 38.4)) ? 6.2 : 1e6;
    hall.visible = (t >= 14.8 && t < 23.4) || (t >= 30.4 && t < 38.4); kidsG.visible = t >= 14.8 && t < 22.6; crowdG.visible = t >= 46.0 && t < 56.5;
    o.labels = (t >= 31.0 && t < 37.6) ? hall.userData.labels : (o.plan ? [[[(230 - 900) / 10.67 - 3, 0.2, (1300 - 950) / 10.67], 'RUA CLÉLIA'], [[0, 0.2, (1640 - 950) / 10.67], 'RUA BARÃO DO BANANAL']] : []);
    window.shot(o);
    $('title').style.opacity = Math.max(1 - sm(seg(t, 1.6, 2.1)), sm(seg(t, 53.8, 54.4))); $('title').textContent = T;
    let kk = ''; for (const [s0, k0] of kick) if (t >= s0) kk = k0; $('kicker').textContent = kk;
    let st = '', so = 0; for (const [a0, b0, tx] of subs) { const f = fw(t, a0, b0); if (f > 0) { st = tx; so = f; } } $('sub').textContent = st; $('sub').style.opacity = so;
    return true; };
  window.renderCover = () => { document.body.classList.add('cover'); window.renderAt(0); $('title').style.opacity = 0; $('kicker').textContent = ''; $('sub').style.opacity = 0; window.shot({ tg: [30, 46, -20], z: 112, az: 35, el: 26 }); $('title').style.opacity = 0; $('sub').style.opacity = 0; $('kicker').textContent = ''; return true; };
  window.shot = (o) => {
    vol.visible = !o.plan; plan.visible = !!o.plan; cross.visible = !!o.cross;
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, t = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 3000; camera.position.set(t[0] + Math.sin(az) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); if (o.el >= 89) camera.up.set(0, 0, -1); camera.lookAt(t[0], t[1], t[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    $('kicker').textContent = o.kick || ''; $('title').style.opacity = o.title ? 1 : 0; if (o.title) $('title').textContent = o.title; $('sub').textContent = o.sub || ''; $('sub').style.opacity = o.sub ? 1 : 0;
    const svg = $('ov'); svg.innerHTML = ''; const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    for (const [pp, txt] of o.labels || []) { const q = P(pp); svg.insertAdjacentHTML('beforeend', `<text class="lab" x="${q[0]}" y="${q[1]}" text-anchor="middle">${txt}</text>`); }
    return true; };
  window.READY = true;
}
