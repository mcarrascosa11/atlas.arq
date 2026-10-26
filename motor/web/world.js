import { THREE, fillMat, lineMat, segs, edgesOf, boxG, merge, prism, geomFrom, slab, pointInRing, PAPER } from './lib.js';

const LON0 = 12.33712, LAT0 = 45.43096;
export function proj(lon, lat) { return [(lon - LON0) * 111320 * Math.cos(lat * Math.PI / 180), -(lat - LAT0) * 111132]; }
export const DUB = { x: 472625, z: 310043 };
export const FUS = { x: -6221, z: 1385 };

function ringsCentroid(r) { let x = 0, z = 0; for (const p of r) { x += p[0]; z += p[1]; } return [x / r.length, z / r.length]; }

// tiles of merged buildings so the renderer can cull what is off screen
function buildingTiles(list, tile, matOpts, lineColor, lineW, groundFn) {
  const tiles = new Map();
  for (const b of list) {
    const c = ringsCentroid(b.o); const key = Math.floor(c[0] / tile) + ',' + Math.floor(c[1] / tile);
    if (!tiles.has(key)) tiles.set(key, { P: [], B: [], T: [], E: [] });
    const t = tiles.get(key);
    const y0 = groundFn ? groundFn(c[0], c[1]) : 1.0;
    prism(b.o, y0 - (groundFn ? 3 : 0), y0 + b.h, b.r ? 1.7 : 0, t.P, t.B, t.T, t.E, { hip: 2.4 });
  }
  const g = new THREE.Group(); const mat = fillMat('#F8F7F3', matOpts); const lm = lineMat(lineColor, lineW);
  g.userData.mats = [mat]; g.userData.lms = [lm];
  for (const t of tiles.values()) {
    const m = new THREE.Mesh(geomFrom(t.P, t.B, t.T), mat); g.add(m);
    const l = segs(t.E, lm); l.geometry.computeBoundingSphere(); g.add(l);
  }
  return { group: g, mats: [mat], lineMats: [lm] };
}

// ---------------- Venice ----------------
export function buildVenice(V) {
  const g = new THREE.Group(); const mats = [], lms = [];
  // land (insulae) with quay walls
  const P = [], B = [], T = [], E = [];
  for (const l of V.land) slab(l.o, l.h, 1.0, -0.4, P, B, T, E);
  const land = new THREE.Mesh(geomFrom(P, B, T), fillMat('#F2F1EC', { hatch: 0.0, side: 0.93, shade: 0.88 }));
  g.add(land); mats.push(land.material);
  const qm = lineMat('#24252B', 1.15); const ql = segs(E, qm); ql.frustumCulled = false; g.add(ql); lms.push(qm);
  // urban fabric
  const bt = buildingTiles(V.buildings, 300, { hatch: 1, windows: 1, top: 1.0, side: 0.95, shade: 0.88, roof: '#EBD3C1' }, '#3B3C43', 0.85);
  g.add(bt.group); mats.push(...bt.mats); lms.push(...bt.lineMats);
  // landmarks
  const lm = buildVeniceLandmarks(V); g.add(lm.group); mats.push(...lm.mats); lms.push(...lm.lineMats);
  return { group: g, mats, lineMats: lms, buildings: bt.group, anchors: lm.anchors };
}

function buildVeniceLandmarks(V) {
  const g = new THREE.Group(); const L = V.landmarks; const fr = V.frame;
  const Pw = [], Bw = [], Tw = [], Ew = [];     // white stone
  const Pr = [], Br = [], Tr = [], Er = [];     // brick / roofs (warm)
  const Pg = [], Bg = [], Tg = [], Eg = [];     // green/lead domes & spire
  const solid = [];                              // misc three geometries (stone)
  const F = (a, b) => [fr.SE[0] + fr.u[0] * a + fr.v[0] * b, fr.SE[1] + fr.u[1] * a + fr.v[1] * b];
  const quad = (a0, a1, b0, b1) => [F(a0, b0), F(a1, b0), F(a1, b1), F(a0, b1)];
  const ang = Math.atan2(fr.u[1], fr.u[0]);
  const anchors = {};
  // Palazzo Ducale: arcaded base reading as two bands + main block, hipped roof
  prism(L.ducale, 1.0, 25.5, 4.5, Pw, Bw, Tw, Ew, { hip: 9 });
  for (let k = 0; k < 18; k++) { const a = -70 + k * 3.9; const p = F(a, -0.2), q = F(a, 0.0); Ew.push(p[0], 1, p[1], p[0], 8.5, p[1]); }
  { const a = F(-71, 0), b = F(0, 0); Ew.push(a[0], 8.5, a[1], b[0], 8.5, b[1], a[0], 14.5, a[1], b[0], 14.5, b[1]); }
  // Marciana + Zecca
  prism(L.marciana, 1.0, 20, 2.0, Pw, Bw, Tw, Ew, { hip: 4 });
  prism(L.zecca, 1.0, 21, 2.0, Pw, Bw, Tw, Ew, { hip: 4 });
  // Basilica: base block + five domes on drums
  prism(L.basilica, 1.0, 28, 0, Pw, Bw, Tw, Ew);
  const domeAt = (a, b, r, y0, hd) => {
    const c = F(a, b);
    const drum = new THREE.CylinderGeometry(r, r, hd, 16, 1); drum.translate(c[0], y0 + hd / 2, c[1]); solid.push(drum.toNonIndexed());
    const s = new THREE.SphereGeometry(r * 1.02, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); s.scale(1, 1.25, 1); s.translate(c[0], y0 + hd, c[1]);
    const lan = new THREE.CylinderGeometry(r * 0.12, r * 0.12, r * 0.5, 8); lan.translate(c[0], y0 + hd + r * 1.25 + r * 0.2, c[1]);
    return [s.toNonIndexed(), lan.toNonIndexed()];
  };
  const domes = [];
  domes.push(...domeAt(-36, 107, 7.5, 28, 4)); domes.push(...domeAt(-36, 86, 6, 28, 3)); domes.push(...domeAt(-36, 128, 6, 28, 3)); domes.push(...domeAt(-58, 107, 6, 28, 3)); domes.push(...domeAt(-14, 107, 6, 28, 3));
  // Campanile di San Marco 98.6 m: shaft, belfry, attic, spire
  { const c = F(-117, 98); const rot = ang;
    const sh = (w, y0, y1) => { const b = boxG(-w / 2, w / 2, y0, y1, -w / 2, w / 2); b.rotateY(-rot); b.translate(c[0], 0, c[1]); return b; };
    Pr.push(); const cam = [sh(12, 1, 51), sh(12.6, 51, 52.2), sh(12, 52.2, 61), sh(12.6, 61, 62.2), sh(11, 62.2, 70)];
    solid.push(...cam.slice(1)); const shaftG = cam[0];
    const spire = new THREE.ConeGeometry(7.7, 25, 4, 1); spire.rotateY(Math.PI / 4 - rot); spire.translate(c[0], 70 + 12.5, c[1]);
    domes.push(spire.toNonIndexed());
    const angel = boxG(-0.5, 0.5, 95, 98.6, -0.5, 0.5); angel.translate(c[0], 0, c[1]); solid.push(angel);
    anchors.campanile = [c[0], 99, c[1]];
    g.userData.brick = [shaftG];
    // belfry openings as lines
    for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) { const p = F(-117 + k * 3.2, 98 + s * 6.05); Ew.push(p[0], 53, p[1], p[0], 60, p[1]); }
  }
  // columns of San Marco and San Todaro
  for (const a of [-103, -80]) { const c = F(a, 8); const col = new THREE.CylinderGeometry(0.9, 0.9, 15, 10); col.translate(c[0], 8.5, c[1]); solid.push(col.toNonIndexed()); const cap = boxG(-1.4, 1.4, 16, 17.5, -1.4, 1.4); cap.translate(c[0], 0, c[1]); solid.push(cap); const st = boxG(-0.6, 0.6, 17.5, 20, -0.6, 0.6); st.translate(c[0], 0, c[1]); solid.push(st); }
  anchors.sanmarco = [...(() => { const c = F(-90, 40); return [c[0], 30, c[1]]; })()];
  anchors.sanmarco = [anchors.sanmarco[0], anchors.sanmarco[1], anchors.sanmarco[2]];
  anchors.ducale = (() => { const c = F(-35, 30); return [c[0], 34, c[1]]; })();
  // Dogana da Mar: low triangular block + tower with globe and Fortuna at the tip
  prism(V.dogana, 1.0, 9.5, 2.6, Pw, Bw, Tw, Ew, { hip: 7 });
  { const tw = boxG(-4.5, 1.5, 1.0, 15, -3, 3); tw.rotateY(-0.3); solid.push(tw);
    const gl = new THREE.SphereGeometry(1.4, 14, 10); gl.translate(-1.5, 17, 0); domes.push(gl.toNonIndexed());
    const at = boxG(-2.4, -0.6, 15, 16.0, -0.9, 0.9); solid.push(at);
    const fo = boxG(-1.9, -1.1, 18.4, 21, -0.4, 0.4); solid.push(fo); anchors.dogana = [-6, 22, 4]; }
  // Santa Maria della Salute: octagon, drum, big dome + lantern, rear small dome and two bell towers
  { const cx = -160, cz = 35;
    const oct = new THREE.CylinderGeometry(27, 27, 26, 8, 1); oct.rotateY(Math.PI / 8); oct.translate(cx, 1 + 13, cz); solid.push(oct.toNonIndexed());
    for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; const vol = new THREE.BoxGeometry(10, 18, 7); vol.translate(0, 0, 0); vol.rotateY(-t); vol.translate(cx + Math.sin(t) * 29, 1 + 9, cz + Math.cos(t) * 29); solid.push(vol.toNonIndexed()); }
    const dr = new THREE.CylinderGeometry(15.5, 15.5, 9, 16); dr.translate(cx, 27 + 4.5, cz); solid.push(dr.toNonIndexed());
    const dm = new THREE.SphereGeometry(16, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2); dm.scale(1, 1.15, 1); dm.translate(cx, 36, cz); domes.push(dm.toNonIndexed());
    const ln = new THREE.CylinderGeometry(3, 3, 7, 8); ln.translate(cx, 36 + 18.4 + 3.5, cz); solid.push(ln.toNonIndexed());
    const lc = new THREE.ConeGeometry(3.2, 3.5, 8); lc.translate(cx, 36 + 18.4 + 8.7, cz); domes.push(lc.toNonIndexed());
    const d2 = new THREE.SphereGeometry(9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); d2.translate(cx - 3, 30, cz + 44); domes.push(d2.toNonIndexed());
    prism([[cx - 16, cz + 34], [cx + 10, cz + 34], [cx + 10, cz + 56], [cx - 16, cz + 56]], 1, 30, 0, Pw, Bw, Tw, Ew);
    for (const s of [-1, 1]) { const bt = boxG(-3, 3, 1, 44, -3, 3); bt.translate(cx - 3 + s * 17, 0, cz + 56); solid.push(bt); const sp = new THREE.ConeGeometry(2.6, 6, 8); sp.translate(cx - 3 + s * 17, 47, cz + 56); domes.push(sp.toNonIndexed()); }
    anchors.salute = [cx, 64, cz]; }
  // Redentore (Palladio): nave, dome on drum, two slender bell towers, temple front
  { const r = L.redentore; const x0 = Math.min(...r.map(p => p[0])), x1 = Math.max(...r.map(p => p[0])), z0 = Math.min(...r.map(p => p[1])), z1 = Math.max(...r.map(p => p[1]));
    const cx = (x0 + x1) / 2;
    prism([[x0, z0 + 4], [x1, z0 + 4], [x1, z0 + 48], [x0, z0 + 48]], 1, 26, 5, Pw, Bw, Tw, Ew, { hip: 7 });
    prism([[x0 - 3, z0 + 48], [x1 + 3, z0 + 48], [x1 + 3, z1], [x0 - 3, z1]], 1, 24, 0, Pw, Bw, Tw, Ew);
    prism([[cx - 11, z0], [cx + 11, z0], [cx + 11, z0 + 4], [cx - 11, z0 + 4]], 1, 30, 0, Pw, Bw, Tw, Ew);
    const dr = new THREE.CylinderGeometry(9, 9, 7, 16); dr.translate(cx, 24 + 3.5, z0 + 58); solid.push(dr.toNonIndexed());
    const dm = new THREE.SphereGeometry(9.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); dm.scale(1, 1.15, 1); dm.translate(cx, 31, z0 + 58); domes.push(dm.toNonIndexed());
    const ln = new THREE.CylinderGeometry(1.6, 1.6, 4, 8); ln.translate(cx, 31 + 10.7 + 2, z0 + 58); solid.push(ln.toNonIndexed());
    for (const s of [-1, 1]) { const t = new THREE.CylinderGeometry(1.9, 1.9, 36, 10); t.translate(cx + s * 13, 18, z0 + 70); solid.push(t.toNonIndexed()); const c2 = new THREE.ConeGeometry(2.2, 5, 10); c2.translate(cx + s * 13, 38.5, z0 + 70); domes.push(c2.toNonIndexed()); }
    anchors.redentore = [cx, 46, z0 + 40]; }
  // San Giorgio Maggiore: church + campanile
  { const r = L.sgiorgio; prism(r, 1, 30, 5, Pw, Bw, Tw, Ew, { hip: 8 }); const c = ringsCentroid(r);
    const dm = new THREE.SphereGeometry(11, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2); dm.scale(1, 1.15, 1); dm.translate(c[0], 34, c[1]); domes.push(dm.toNonIndexed());
    const dr = new THREE.CylinderGeometry(10.6, 10.6, 5, 16); dr.translate(c[0], 31.5, c[1]); solid.push(dr.toNonIndexed());
    const cp = [c[0] + 30, c[1] + 18]; const sh = boxG(-5, 5, 1, 50, -5, 5); sh.translate(cp[0], 0, cp[1]); g.userData.brick.push(sh);
    const bf = boxG(-5.4, 5.4, 50, 57, -5.4, 5.4); bf.translate(cp[0], 0, cp[1]); solid.push(bf);
    const cn = new THREE.ConeGeometry(4.5, 6, 8); cn.translate(cp[0], 60, cp[1]); domes.push(cn.toNonIndexed());
    anchors.sgiorgio = [cp[0], 64, cp[1]]; }
  // Molino Stucky: big brick mill with tower
  { const r = L.stucky; prism(r, 1, 24, 3, Pr, Br, Tr, Er, { hip: 6 }); const x1 = Math.max(...r.map(p => p[0])), z0 = Math.min(...r.map(p => p[1]));
    prism([[x1 - 26, z0], [x1 - 12, z0], [x1 - 12, z0 + 14], [x1 - 26, z0 + 14]], 1, 44, 7, Pr, Br, Tr, Er, { hip: 7 });
    anchors.stucky = [x1 - 19, 54, z0 + 7]; }
  const white = fillMat('#FAF9F5', { hatch: 1, top: 1.0 });
  const brick = fillMat('#E7C9B4', { hatch: 1 });
  const green = fillMat('#C9D9CF', { hatch: 1 });
  const ms = [];
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; g.add(m); ms.push(m); return m; };
  const gw = geomFrom(Pw, Bw, Tw); add(gw, white);
  const gr = geomFrom(Pr, Br, Tr); add(gr, brick);
  const gs = merge(solid); add(gs, white);
  const gb = merge(g.userData.brick); add(gb, brick);
  const gd = merge(domes); add(gd, green);
  const lm = lineMat('#1F2026', 1.15);
  const E = [...Ew, ...Er, ...edgesOf(gs, 30), ...edgesOf(gb, 30), ...edgesOf(gd, 32)];
  const l = segs(E, lm); l.frustumCulled = false; g.add(l);
  return { group: g, mats: [white, brick, green], lineMats: [lm], anchors };
}

// ---------------- Lagoon / Adriatic land + coast lines (global coords) ----------------
export function buildMap(LAND, COAST) {
  const g = new THREE.Group();
  const P = [], B = [], T = [], E = [];
  for (const l of LAND.adriatic) slab(l.o, l.h, 0.0, null, P, B, T, E, false);
  for (const l of LAND.lagoon) slab(l.o, l.h, 0.0, null, P, B, T, E, false);
  const mat = fillMat('#F2F1EC', { hatch: 0 });
  const mesh = new THREE.Mesh(geomFrom(P, B, T), mat); mesh.frustumCulled = false; g.add(mesh);
  const C = [];
  for (const line of COAST) for (let i = 0; i < line.length - 1; i++) { const a = proj(...line[i]), b = proj(...line[i + 1]); C.push(a[0], 0.0, a[1], b[0], 0.0, b[1]); }
  const cm = lineMat('#24252B', 1.3, { depthTest: false });
  const cl = segs(C, cm, 5); cl.frustumCulled = false; g.add(cl);
  return { group: g, mesh, mats: [mat], lineMats: [cm] };
}

// ---------------- Dubrovnik (local coords, origin = middle of Stradun) ----------------
let _landRing = null;
function segDist(p, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1]; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); }
export function groundIn(z) { return z < 0 ? 2 + Math.pow(-z / 175, 1.25) * 26 : 2 + (z / 160) * 12; }
export function dubGround(x, z, D) {
  if (pointInRing([x, z], D.walls)) return groundIn(z);
  if (!_landRing) _landRing = [...D.coast, [1800, -3200], [-1600, -3200]];
  if (!pointInRing([x, z], _landRing)) return -4;
  let d = 1e9; for (let i = 0; i < D.coast.length - 1; i++) d = Math.min(d, segDist([x, z], D.coast[i], D.coast[i + 1]));
  const h = d < 380 ? d * 0.11 : 42 + (d - 380) * 0.42;
  return Math.min(412, 1.5 + h) * (1 - Math.exp(-d / 25));
}
export function buildDubrovnik(D) {
  const g = new THREE.Group(); const mats = [], lms = [];
  // terrain grid with contour lines (shader) — clipped to land by sinking sea cells
  const nx = 170, nz = 150, x0 = -1700, x1 = 1900, z0 = -3200, z1 = 400;
  const pos = []; const H = (x, z) => dubGround(x, z, D);
  const grid = []; for (let j = 0; j <= nz; j++) { const row = []; for (let i = 0; i <= nx; i++) { const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz; row.push([x, H(x, z), z]); } grid.push(row); }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i], d = grid[j + 1][i + 1]; pos.push(...a, ...c, ...b, ...b, ...c, ...d); }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const tm = new THREE.ShaderMaterial({ vertexShader: `varying float vY; varying vec3 vV; void main(){ vY=position.y; vec4 mv=modelViewMatrix*vec4(position,1.); vV=mv.xyz; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uPaper; uniform vec3 uInk; uniform float uOp; varying float vY; varying vec3 vV;
      void main(){ float c = vY/20.0; float w = fwidth(c); float l = 1.0-smoothstep(0.5*w,1.4*w,abs(fract(c+0.5)-0.5)); if(vY<1.0) l=0.; float strong = step(0.5, abs(fract(vY/100.0+0.5)-0.5) < 0.12 ? 1.0:0.0);
      gl_FragColor = vec4(mix(uPaper, uInk, l*0.32*uOp), 1.0); }`,
    uniforms: { uPaper: { value: PAPER }, uInk: { value: new THREE.Color('#1A1B20') }, uOp: { value: 1 } }, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 });
  tm.extensions = { derivatives: true };
  const terr = new THREE.Mesh(tg, tm); terr.frustumCulled = false; g.add(terr);
  // coast line + Lokrum
  const C = []; for (let i = 0; i < D.coast.length - 1; i++) { const a = D.coast[i], b = D.coast[i + 1]; C.push(a[0], 0.2, a[1], b[0], 0.2, b[1]); }
  const P = [], B = [], T = [], E = [];
  slab(D.lokrum, [], 6, -2, P, B, T, E);
  const lok = new THREE.Mesh(geomFrom(P, B, T), fillMat('#F2F1EC', { hatch: 0.4 })); lok.frustumCulled = false; g.add(lok); mats.push(lok.material);
  // city walls: segment boxes following the ground, plus towers and forts
  const Pw = [], Bw = [], Tw = [], Ew = [];
  const w = D.walls; const wallSolids = [];
  for (let i = 0; i < w.length; i++) {
    const a = w[i], b = w[(i + 1) % w.length]; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const top = Math.max(groundIn(mz) + 15, 20); const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const bx = boxG(-len / 2 - 2.5, len / 2 + 2.5, -3, top, -3.2, 3.2); bx.rotateY(-Math.atan2(b[1] - a[1], b[0] - a[0])); bx.translate(mx, 0, mz); wallSolids.push(bx);
  }
  const tower = (x, z, r, top, seg = 14) => { const c = new THREE.CylinderGeometry(r, r * 1.08, top + 3, seg); c.translate(x, (top - 3) / 2, z); wallSolids.push(c.toNonIndexed()); };
  tower(-75, -176, 13, 58); tower(-60, -176, 9.5, 66);   // Minčeta
  tower(-240, 44, 10, 24);                                // Bokar
  tower(150, -118, 7, 34);                                // Sv. Luka
  prism([[212, 132], [262, 120], [270, 160], [226, 182]], -3, 28, 0, Pw, Bw, Tw, Ew); tower(250, 150, 14, 30, 16); // Sv. Ivan
  prism([[255, -95], [310, -110], [330, -60], [280, -40]], -3, 30, 0, Pw, Bw, Tw, Ew); // Revelin
  prism([[-470, -30], [-405, -38], [-398, 30], [-462, 36]], -3, 28, 0, Pw, Bw, Tw, Ew); // Lovrjenac rock
  prism([[-458, -20], [-412, -26], [-408, 22], [-452, 26]], 28, 44, 0, Pw, Bw, Tw, Ew); // Lovrjenac fort
  // landmarks inside the walls
  const Lm = D.landmarks; const lmH = { rector: 17, sponza: 15, blaise: 15, cathedral: 22, franciscan: 16, dominican: 16, jesuit: 24 };
  for (const [k, r] of Object.entries(Lm)) { const c = ringsCentroid(r); prism(r, dubGround(c[0], c[1], D) - 2, dubGround(c[0], c[1], D) + lmH[k], 2.5, Pw, Bw, Tw, Ew, { hip: 5 }); }
  const domes = [];
  const dome = (x, z, r, y) => { const s = new THREE.SphereGeometry(r, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2); s.scale(1, 1.2, 1); s.translate(x, y, z); domes.push(s.toNonIndexed()); };
  { const c = ringsCentroid(Lm.cathedral); dome(c[0], c[1], 8, dubGround(...c, D) + 26); const dr = new THREE.CylinderGeometry(7.6, 7.6, 5, 14); dr.translate(c[0], dubGround(...c, D) + 23.5, c[1]); wallSolids.push(dr.toNonIndexed()); }
  { const c = ringsCentroid(Lm.blaise); dome(c[0], c[1], 5, dubGround(...c, D) + 17); }
  const bell = (x, z, s, h) => { const y = dubGround(x, z, D); const b = boxG(-s, s, y - 2, y + h, -s, s); b.translate(x, 0, z); wallSolids.push(b); const p = new THREE.ConeGeometry(s * 1.35, 5, 4); p.rotateY(Math.PI / 4); p.translate(x, y + h + 2.5, z); domes.push(p.toNonIndexed()); };
  bell(176, -36, 3.2, 31); bell(-190, -56, 3.4, 36); bell(196, -92, 3.2, 32);
  const stone = fillMat('#FAF9F5', { hatch: 1 }); const tile = fillMat('#ECCDB8', { hatch: 1 });
  const gWall = merge(wallSolids); const mW = new THREE.Mesh(gWall, stone); mW.frustumCulled = false; g.add(mW);
  const mP = new THREE.Mesh(geomFrom(Pw, Bw, Tw), stone); mP.frustumCulled = false; g.add(mP);
  const gD = merge(domes); const mD = new THREE.Mesh(gD, fillMat('#D7DED5', { hatch: 1 })); mD.frustumCulled = false; g.add(mD);
  mats.push(stone, tile, mD.material);
  const lmS = lineMat('#1F2026', 1.15);
  const ls = segs([...Ew, ...edgesOf(gWall, 30), ...edgesOf(gD, 32), ...E], lmS); ls.frustumCulled = false; g.add(ls);
  const cm = lineMat('#24252B', 1.3); const cl = segs(C, cm); cl.frustumCulled = false; g.add(cl);
  lms.push(lmS, cm);
  // houses with terracotta roofs
  const bt = buildingTiles(D.buildings, 200, { hatch: 1, windows: 1, roof: '#E9B898' }, '#3B3C43', 0.85, (x, z) => dubGround(x, z, D));
  g.add(bt.group); lms.push(...bt.lineMats);
  return { group: g, mats, lineMats: lms, terrain: tm };
}
