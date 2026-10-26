import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, edgesOf, boxG, merge, prism, geomFrom, shadowU, LIGHT } from './lib.js';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
const $ = (id) => document.getElementById(id);
const rng = (() => { let s = 13; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// Schematic layout (metres). Rua Clélia along z = +70 (south edge of the lot); the lot runs north (z negative).
// Internal street x in [-4, 4] from the gate (z = 70) to the deck (z = -40). Sheds on both sides. Towers at the back.
const clipS = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
function sawShed(x0, x1, z0, z1, h, tooth, P, B, T, E) {
  prism([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], 0, h, 0, P, B, T, E);
  const geos = [];
  for (let z = z0; z < z1 - 0.1; z += tooth) {
    const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(tooth, 0), new THREE.Vector2(0, tooth * 0.55)]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(x1, h, z); geos.push(g.toNonIndexed());
  }
  return geos;
}
function build() {
  const root = new THREE.Group();
  // ---- neighbourhood fabric (low houses, a few taller blocks)
  { const P = [], B = [], T = [], E = [];
    for (let gx = -230; gx < 230; gx += 24) for (let gz = -230; gz < 230; gz += 20) {
      const cx = gx + 12, cz = gz + 10;
      if (cx > -40 && cx < 40 && cz > -110 && cz < 80) continue;      // the SESC lot
      if (Math.abs(cz - 86) < 9) continue;                               // rua Clélia
      if (Math.hypot(cx, cz) > 210 + rng() * 30) continue;
      const nh = 2 + Math.floor(rng() * 3); const w = 21 / nh;
      for (let k = 0; k < nh; k++) { const a = gx + k * w + 0.3, b = gx + (k + 1) * w - 0.3; const tall = rng() < 0.05 && Math.hypot(cx, cz) > 140; const h = tall ? 26 + rng() * 18 : 6 + Math.floor(rng() * 3) * 3;
        prism([[a, gz + 1.5], [b, gz + 1.5], [b, gz + 17.5], [a, gz + 17.5]], 0, h, tall ? 0 : 1.6, P, B, T, E, { hip: 2.2 }); }
    }
    const m = fillMat('#F8F7F3', { hatch: 0.45, windows: 0.5, side: 0.975, shade: 0.945 });
    const g = new THREE.Group(); g.add(new THREE.Mesh(geomFrom(P, B, T), m)); g.add(segs(E, lineMat('#4A4B52', 0.8))); g.name = 'city'; root.add(g); }
  // ground
  { const gp = new THREE.PlaneGeometry(800, 800); gp.rotateX(-Math.PI / 2); root.add(new THREE.Mesh(gp, fillMat('#F2F1EC', { hatch: 0 }))); }
  // ---- factory sheds: rows of gabled sheds (serrated gable line), concrete frame + brick infill, tall windows
  const SP = [], SB = [], ST = [], SE = []; const roofs = [], frame = [], wins = [];
  const shedRow = (xa, xb, z0, z1, n, h, rise) => {
    const w = (xb - xa) / n;
    for (let k = 0; k < n; k++) {
      const x0 = xa + k * w, x1 = x0 + w;
      prism([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], 0, h, 0, SP, SB, ST, SE);
      const sh = new THREE.Shape([new THREE.Vector2(x0 - 0.3, h), new THREE.Vector2(x1 + 0.3, h), new THREE.Vector2((x0 + x1) / 2, h + rise)]);
      const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0 + 0.6, bevelEnabled: false }); g.translate(0, 0, z0 - 0.3); roofs.push(g.toNonIndexed());
      // ridge skylight
      frame.push(boxG((x0 + x1) / 2 - 0.5, (x0 + x1) / 2 + 0.5, h + rise - 0.05, h + rise + 0.35, z0, z1));
      // gable-end windows (front and back)
      for (const zz of [z1, z0]) { const s2 = zz === z1 ? 1 : -1; for (const f of [0.22, 0.42, 0.62]) wins.push(boxG(x0 + w * f, x0 + w * (f + 0.14), 2.6, h - 1.6, zz - (s2 > 0 ? 0 : 0.05), zz + (s2 > 0 ? 0.05 : 0))); }
    }
    // concrete frame: pilasters along the outer long walls + top beam; tall windows between
    for (const [x, side] of [[xa, -1], [xb, 1]]) {
      for (let z = z0; z <= z1 + 0.01; z += 5) frame.push(boxG(x - (side < 0 ? 0.35 : 0), x + (side > 0 ? 0.35 : 0), 0, h + 0.2, z - 0.35, z + 0.35));
      frame.push(boxG(x - (side < 0 ? 0.35 : 0), x + (side > 0 ? 0.35 : 0), h - 0.6, h + 0.2, z0, z1));
      for (let z = z0 + 1.2; z < z1 - 1; z += 5) wins.push(boxG(x - (side < 0 ? 0.06 : 0), x + (side > 0 ? 0.06 : 0), 1.6, h - 1.4, z, z + 2.6));
    }
  };
  shedRow(-37, -5, 20, 66, 3, 7.5, 3.2); shedRow(5, 37, 20, 66, 3, 7.5, 3.2);
  shedRow(-37, -5, -36, 16, 3, 8.5, 3.6); shedRow(5, 37, -36, 16, 3, 8.5, 3.6);
  const shedMat = fillMat('#FAF9F5', { hatch: 1, double: true, poche: false }); shedMat.clippingPlanes = [clipS];
  const sg = new THREE.Group(); sg.name = 'sheds';
  sg.add(new THREE.Mesh(geomFrom(SP, SB, ST), shedMat));
  const rg = merge(roofs); const rm = fillMat('#ECE9E1', { hatch: 1, double: true, poche: false }); rm.clippingPlanes = [clipS]; sg.add(new THREE.Mesh(rg, rm));
  const fg = merge(frame); const fm = fillMat('#E2DFD7', { hatch: 1 }); fm.clippingPlanes = [clipS]; sg.add(new THREE.Mesh(fg, fm));
  const wg2 = merge(wins); const wm = fillMat('#3A3C44', { hatch: 0 }); wm.clippingPlanes = [clipS]; sg.add(new THREE.Mesh(wg2, wm));
  const sl = lineMat('#1A1B20', 1.1); sl.clippingPlanes = [clipS]; sg.add(segs([...SE, ...edgesOf(rg, 25)], sl));
  const sl2 = lineMat('#1A1B20', 0.7); sl2.clippingPlanes = [clipS]; sg.add(segs([...edgesOf(fg, 30), ...edgesOf(wg2, 30)], sl2));
  root.add(sg);
  // gate on rua Clélia + internal street paving
  { const L = []; for (let z = 66; z > -40; z -= 3) L.push(-4, 0.03, z, 4, 0.03, z); L.push(-4, 0.03, 70, -4, 0.03, -40, 4, 0.03, 70, 4, 0.03, -40);
    const s = segs(L, lineMat('#BDB9AE', 0.8)); root.add(s); }
  // interior: tables, shelves, stage + water channel (inside the front sheds), people
  { const it = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) it.push(boxG(-30 + i * 4, -27.6 + i * 4, 0, 0.8, 30 + j * 6, 33 + j * 6));
    for (let i = 0; i < 4; i++) it.push(boxG(10 + i * 6, 11, 0, 2.2, 24, 34));
    it.push(boxG(14, 32, 0, 1.0, 50, 62));
    const g = merge(it); const m = fillMat('#E9DCC6', { hatch: 1 }); m.clippingPlanes = [clipS];
    const ig = new THREE.Group(); ig.name = 'interior'; ig.add(new THREE.Mesh(g, m)); const l = lineMat('#1A1B20', 0.9); l.clippingPlanes = [clipS]; ig.add(segs(edgesOf(g, 30), l));
    // river: sinuous double line on the floor
    const R = []; let px = -24, pz = 64; for (let k = 1; k <= 40; k++) { const z = 64 - k * 1.1; const x = -24 + Math.sin(k * 0.35) * 4; R.push(px, 0.05, pz, x, 0.05, z); R.push(px + 1.2, 0.05, pz, x + 1.2, 0.05, z); px = x; pz = z; }
    const rl = lineMat('#1A1B20', 1.4); rl.clippingPlanes = [clipS]; ig.add(segs(R, rl));
    root.add(ig); }
  const people = (pts, name) => { const g = new THREE.Group(); g.name = name; const gs = pts.map(([x, z]) => boxG(x - 0.25, x + 0.25, 0, 1.75, z - 0.25, z + 0.25)); const ge = merge(gs); g.add(new THREE.Mesh(ge, fillMat('#E2401C', { hatch: 0.6 }))); g.add(segs(edgesOf(ge, 30), lineMat('#1A1B20', 0.7))); return g; };
  { const pts = []; for (let i = 0; i < 46; i++) pts.push([(rng() - 0.5) * 6, 84 - i * 2.7 + rng()]); root.add(people(pts, 'flow'));
    const pin = []; for (let i = 0; i < 40; i++) pin.push([-34 + rng() * 26 + (rng() < 0.5 ? 0 : 38), 22 + rng() * 42]); root.add(people(pin, 'inside')); }
  // deck (solarium) behind the sheds
  { const P = [], B = [], T = [], E = []; prism([[-36, -62], [10, -62], [10, -42], [-36, -42]], 0, 0.8, 0, P, B, T, E);
    const g = new THREE.Group(); g.name = 'deck'; g.add(new THREE.Mesh(geomFrom(P, B, T), fillMat('#EFE6D6', { hatch: 1 })));
    const L = [...E]; for (let x = -35; x < 10; x += 1.2) L.push(x, 0.82, -62, x, 0.82, -42); g.add(segs(L, lineMat('#9B958A', 0.6))); root.add(g); }
  // ---- towers: sports block with REAL openings (boolean), red lattices set back inside; service tower; water tower
  const towers = new THREE.Group(); towers.name = 'towers';
  { const conc = fillMat('#E7E4DC', { hatch: 1, top: 1.0, side: 0.93, shade: 0.84, double: true, poche: '#CFCBC2' });
    // openings: irregular rounded polygons extruded through the wall thickness
    const holes = [];
    const blobShape = (w, h) => { const pts = []; const n = 18; const ph = rng() * 6;
      for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; const r = 1 + 0.16 * Math.sin(3 * t + ph) + 0.07 * Math.cos(5 * t + ph * 1.7);
        pts.push(new THREE.Vector2(Math.cos(t) * w / 2 * r, Math.sin(t) * h / 2 * r)); } return new THREE.Shape(pts); };
    const floors = [3.2, 13.7, 24.2, 34.7];
    for (const yb of floors) {
      let u = 68 + rng() * 2; while (u < 100) { const w = 2.8 + rng() * 2.2, h = 1.9 + rng() * 1.1; holes.push(['W', u + w / 2, yb + 1.3 + rng() * 2.0, w, h, blobShape(w, h)]); u += w + 1.6 + rng() * 3.2; }
      u = 16 + rng() * 2; while (u < 34) { const w = 2.8 + rng() * 2.2, h = 1.9 + rng() * 1.1; holes.push(['S', u + w / 2, yb + 1.3 + rng() * 2.0, w, h, blobShape(w, h)]); u += w + 1.6 + rng() * 3.2; }
    }
    const ev = new Evaluator(); ev.attributes = ['position'];
    let res = new Brush(new THREE.BoxGeometry(24, 45, 38).translate(26, 22.5, -85)); res.updateMatrixWorld();
    const cutGeos = [];
    for (const [f, u, v, w, h, shp] of holes) {
      const g = new THREE.ExtrudeGeometry(shp, { depth: 2.4, bevelEnabled: false, curveSegments: 1 }); g.translate(0, 0, -1.2);
      if (f === 'W') { g.rotateY(Math.PI / 2); g.translate(14, v, -u); } else { g.translate(u, v, -66); }
      cutGeos.push(g.toNonIndexed());
    }
    const cutter = new Brush(merge(cutGeos)); cutter.updateMatrixWorld();
    res = ev.evaluate(res, cutter, SUBTRACTION);
    const sportGeo = res.geometry.index ? res.geometry.toNonIndexed() : res.geometry; for (const k of Object.keys(sportGeo.attributes)) if (k !== 'position') sportGeo.deleteAttribute(k);
    sportGeo.computeBoundingSphere();
    towers.add(new THREE.Mesh(sportGeo, conc));
    // clean linework: box edges + the outline of each opening (CSG triangulation is never drawn)
    const BX = [14, 38], BY = [0, 45], BZ = [-104, -66]; const OL = [];
    for (const y of BY) for (const z of BZ) OL.push(BX[0], y, z, BX[1], y, z);
    for (const x of BX) for (const z of BZ) OL.push(x, BY[0], z, x, BY[1], z);
    for (const x of BX) for (const y of BY) OL.push(x, y, BZ[0], x, y, BZ[1]);
    for (const [f, u, v, w, h, shp] of holes) { const pts = shp.getPoints(); for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length];
      if (f === 'W') OL.push(14, v + a.y, -u - a.x, 14, v + b.y, -u - b.x); else OL.push(u + a.x, v + a.y, -66, u + b.x, v + b.y, -66); } }
    towers.add(segs(OL, lineMat('#1A1B20', 1.25)));
    // red lattice panels 0.45 m inside each opening, with vertical slats
    const lat = [], slats = [];
    for (const [f, u, v, w, h, shp] of holes) {
      const g = new THREE.ShapeGeometry(shp); // same outline, slightly inside
      if (f === 'W') { g.rotateY(Math.PI / 2); g.translate(14.45, v, -u); } else { g.translate(u, v, -66.45); }
      lat.push(g.toNonIndexed());
      for (let x = -w / 2 + 0.35; x < w / 2 - 0.25; x += 0.42) { const hh = h * 0.42 * Math.sqrt(Math.max(0, 1 - (2 * x / w) ** 2));
        if (f === 'W') slats.push(14.42, v - hh, -u - x, 14.42, v + hh, -u - x); else slats.push(u + x, v - hh, -66.42, u + x, v + hh, -66.42); }
    }
    towers.add(new THREE.Mesh(merge(lat), fillMat('#E2401C', { hatch: 0, double: true, poche: '#D23A18' })));
    towers.add(segs(slats, lineMat('#8E2410', 0.8)));
    // board-formed concrete lifts (only on solid wall, drawn behind the openings' reveals by depth)
    const L = []; for (let y = 1.2; y < 45; y += 1.2) L.push(13.99, y, -104, 13.99, y, -66, 14, y, -65.99, 38, y, -65.99);
    towers.add(segs(L, lineMat('#CDC9BF', 0.5)));
    // service tower (regular square windows, recessed)
    const P = [], B = [], T = [], E = [];
    prism([[-30, -104], [-16, -104], [-16, -88], [-30, -88]], 0, 52, 0, P, B, T, E, { bottomEdges: true });
    towers.add(new THREE.Mesh(geomFrom(P, B, T), fillMat('#E7E4DC', { hatch: 1, top: 1.0, side: 0.93, shade: 0.84 }))); towers.add(segs(E, lineMat('#1A1B20', 1.3)));
    const L2 = []; for (let y = 1.2; y < 52; y += 1.2) L2.push(-15.99, y, -104, -15.99, y, -88, -30, y, -87.99, -16, y, -87.99); towers.add(segs(L2, lineMat('#CDC9BF', 0.5)));
    const sq = [];
    for (let y = 4; y < 50; y += 3) { for (const z of [-101, -97.5, -94, -90.5]) sq.push(boxG(-16.02, -15.9, y, y + 0.9, z, z + 0.9)); for (const x of [-28, -24.5, -21, -17.5]) sq.push(boxG(x, x + 0.9, y, y + 0.9, -87.9, -88.02 + 0.0)); }
    const sqg = merge(sq); towers.add(new THREE.Mesh(sqg, fillMat('#2A2B30', { hatch: 0 })));
    // water tower: stacked rings
    const c = new THREE.CylinderGeometry(4.2, 4.2, 70, 40, 1, false); c.translate(-6, 35, -104); towers.add(new THREE.Mesh(c.toNonIndexed(), fillMat('#E7E4DC', { hatch: 1 })));
    const rib = []; for (let k = 0, y = 0.7; y < 70; y += 1.4, k++) for (let i = 0; i < 40; i++) { const t = (i + (k % 2) * 0.5) * Math.PI * 2 / 40, t2 = t + Math.PI * 2 / 40 * 0.62; rib.push(-6 + 4.24 * Math.cos(t), y, -104 + 4.24 * Math.sin(t), -6 + 4.24 * Math.cos(t2), y, -104 + 4.24 * Math.sin(t2)); }
    towers.add(segs(rib, lineMat('#8C8982', 0.55)));
    towers.traverse(o => o.frustumCulled = false); root.add(towers); }
  // eight horizontal concrete walkways (deck + solid parapets), framed into both towers, zigzag in plan
  { const wk = []; const lv = [[8, -100, -74], [13, -92, -96], [18, -100, -74], [23, -92, -96], [28, -100, -74], [33, -92, -96], [38, -100, -74], [43, -92, -96]];
    for (const [y, za, zb] of lv) { const a = new THREE.Vector3(-16.2, y, za), b = new THREE.Vector3(14.2, y, zb);
      const d = b.clone().sub(a); const len = d.length(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.clone().normalize()); const mid = a.clone().add(b).multiplyScalar(0.5);
      for (const part of [[0, -0.2, 0.2, 2.8], [1, 0.2, 1.25, 0.22], [-1, 0.2, 1.25, 0.22]]) { const [side, y0, y1, wdt] = part; const g = new THREE.BoxGeometry(len, y1 - y0, wdt); g.translate(0, (y0 + y1) / 2, side * 1.29); g.applyQuaternion(q); g.translate(mid.x, mid.y, mid.z); wk.push(g.toNonIndexed()); } }
    const g = merge(wk); const wg = new THREE.Group(); wg.name = 'walk'; wg.add(new THREE.Mesh(g, fillMat('#EFECE5', { hatch: 1, side: 0.94, shade: 0.84 }))); wg.add(segs(edgesOf(g, 30), lineMat('#1A1B20', 1.0))); root.add(wg); }
  // demolition cross over the sheds (vermillion dashed)
  { const L = []; const dash = (a, b) => { const n = 40; for (let i = 0; i < n; i += 2) { const p = (k) => a.map((v, j) => v + (b[j] - v) * k / n); L.push(...p(i), ...p(i + 1)); } };
    dash([-38, 16, 68], [38, 16, -38]); dash([38, 16, 68], [-38, 16, -38]);
    const lm = lineMat('#E2401C', 4, { depthTest: false }); const c = segs(L, lm, 9); c.name = 'cross'; root.add(c); }
  root.traverse(o => o.frustumCulled = false);
  return root;
}
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); renderer.localClippingEnabled = true;
  $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 8000);
  const root = build(); scene.add(root);
  const shadowRT = new THREE.WebGLRenderTarget(4096, 4096); shadowRT.depthTexture = new THREE.DepthTexture(4096, 4096); shadowRT.depthTexture.type = THREE.UnsignedIntType;
  const lightCam = new THREE.OrthographicCamera(-200, 200, 200, -200, 1, 3000); const depthMat = new THREE.MeshDepthMaterial(); depthMat.side = THREE.DoubleSide; depthMat.clippingPlanes = [clipS];
  window.shot = (o) => {
    const show = o.show || {}; for (const n of ['city', 'sheds', 'interior', 'flow', 'inside', 'deck', 'towers', 'walk', 'cross']) { const g = root.getObjectByName(n); if (g) g.visible = show[n] !== false && !(n === 'cross' && !show.cross) && !(n === 'flow' && !show.flow) && !(n === 'inside' && !show.inside); }
    clipS.constant = o.cut ?? 1e6;
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, t = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 3000; camera.position.set(t[0] + Math.sin(az) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(t[0], t[1], t[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    // shadow pass (depth from the sun), then the drawing
    { const ctr = new THREE.Vector3(t[0], 0, t[2]); const L = LIGHT.clone().normalize();
      lightCam.left = -o.sh; lightCam.right = o.sh; lightCam.top = o.sh; lightCam.bottom = -o.sh; lightCam.near = 1; lightCam.far = 3000;
      lightCam.position.copy(ctr).addScaledVector(L, 1200); lightCam.up.set(0, 1, 0); lightCam.lookAt(ctr); lightCam.updateProjectionMatrix(); lightCam.updateMatrixWorld();
      const hidden = []; scene.traverse(x => { if (x.isLineSegments2 && x.visible) { x.visible = false; hidden.push(x); } });
      scene.overrideMaterial = depthMat; renderer.setRenderTarget(shadowRT); renderer.clear(); renderer.render(scene, lightCam); renderer.setRenderTarget(null); scene.overrideMaterial = null;
      for (const x of hidden) x.visible = true;
      shadowU.mat.value.multiplyMatrices(lightCam.projectionMatrix, lightCam.matrixWorldInverse); shadowU.map.value = shadowRT.depthTexture; shadowU.on.value = 1; shadowU.texel.value = 1 / 4096; }
    renderer.render(scene, camera);
    $('kicker').textContent = o.kick || ''; $('title').style.opacity = o.title ? 1 : 0; if (o.title) $('title').textContent = o.title;
    $('sub').textContent = o.sub || ''; $('sub').style.opacity = o.sub ? 1 : 0;
    const svg = $('ov'); svg.innerHTML = '';
    const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    for (const l of o.labels || []) { const p = P(l[0]); svg.insertAdjacentHTML('beforeend', `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#1A1B20"/><line x1="${p[0]}" y1="${p[1]}" x2="${p[0]}" y2="${p[1] - 28}" stroke="#1A1B20" stroke-width="1.2"/><text class="lab" x="${p[0]}" y="${p[1] - 34}">${l[1]}</text>`); }
    return true;
  };
  window.READY = true;
}
