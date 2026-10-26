import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, edgesOf, boxG, merge, prism, geomFrom, setFillOpacity, setLineOpacity } from './lib.js';
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const fadeWin = (t, a, b, f = 0.35) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
const FT = 0.2577, Y1 = 10 * FT, Y2 = 210 * FT, OFF = 2.6, TOP = 80.4;
const lean = (y) => (y <= Y1 ? 0 : y >= Y2 ? OFF : OFF * (y - Y1) / (Y2 - Y1));
const shearArr = (a) => { for (let i = 0; i < a.length; i += 3) a[i] += lean(a[i + 1]); return a; };
const shear = (g) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + lean(p.getY(i))); p.needsUpdate = true; return g; };
const star = (R, r, n = 16) => { const p = []; for (let i = 0; i < n * 2; i++) { const t = i * Math.PI / n; const rr = i % 2 ? r : R; p.push([rr * Math.cos(t), rr * Math.sin(t)]); } return p; };
const oct = (a) => { const R = a / Math.cos(Math.PI / 8); const p = []; for (let i = 0; i < 8; i++) { const t = Math.PI / 8 + i * Math.PI / 4; p.push([R * Math.cos(t), R * Math.sin(t)]); } return p; };
const clipT = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);   // keep y <= constant
const rng = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

function buildTower() {
  const g = new THREE.Group(); const mats = [], lms = [];
  const B = { P: [], B: [], T: [], E: [] }, C = { P: [], B: [], T: [], E: [] };
  prism(star(5.75, 4.75), 0, 19, 0, B.P, B.B, B.T, B.E);
  prism(oct(5.0), 19, 20.2, 0, C.P, C.B, C.T, C.E); prism(oct(4.7), 20.2, 37, 0, B.P, B.B, B.T, B.E);
  prism(oct(4.95), 37, 38.2, 0, C.P, C.B, C.T, C.E); prism(oct(4.15), 38.2, 52, 0, B.P, B.B, B.T, B.E);
  prism(oct(4.4), 52, 53.2, 0, C.P, C.B, C.T, C.E); prism(oct(3.6), 53.2, 63, 0, B.P, B.B, B.T, B.E);
  prism(oct(3.85), 63, 64, 0, C.P, C.B, C.T, C.E);
  const solid = [];
  for (const [a, y0, y1] of [[4.7, 20.2, 37], [4.15, 38.2, 52], [3.6, 53.2, 63]]) { const R = a / Math.cos(Math.PI / 8);
    for (let i = 0; i < 8; i++) { const t = Math.PI / 8 + i * Math.PI / 4; const bx = boxG(-0.45, 0.45, y0, y1, -0.45, 0.45); bx.rotateY(-t); bx.translate((R + 0.15) * Math.cos(t), 0, (R + 0.15) * Math.sin(t)); solid.push(bx); } }
  // belfry openings (dark) on the top body
  const win = [];
  for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; const a = 3.6; const b = boxG(-0.55, 0.55, 56, 60.5, a - 0.05, a + 0.02); b.rotateY(Math.PI / 2 - t); win.push(b); }
  for (let i = 0; i < 8; i += 2) { const t = i * Math.PI / 4; const b = boxG(-0.35, 0.35, 28, 30.5, 4.65, 4.72); b.rotateY(Math.PI / 2 - t); win.push(b); const c = boxG(-0.3, 0.3, 44, 46, 4.1, 4.17); c.rotateY(Math.PI / 2 - t); win.push(c); }
  // clock face (disc) on body 2
  { const d = new THREE.CylinderGeometry(1.25, 1.25, 0.12, 20); d.rotateX(Math.PI / 2); d.translate(0, 33, 4.72); solid.push(d.toNonIndexed()); }
  const sp = [];
  { const c1 = new THREE.CylinderGeometry(2.6, 3.4, 5, 8); c1.rotateY(Math.PI / 8); c1.translate(0, 66.5, 0); sp.push(c1.toNonIndexed());
    const c2 = new THREE.CylinderGeometry(1.2, 2.4, 4, 8); c2.rotateY(Math.PI / 8); c2.translate(0, 71, 0); sp.push(c2.toNonIndexed());
    const c3 = new THREE.CylinderGeometry(0.9, 1.2, 2.5, 8); c3.rotateY(Math.PI / 8); c3.translate(0, 74.2, 0); sp.push(c3.toNonIndexed());
    const c4 = new THREE.ConeGeometry(0.9, 4.2, 8); c4.rotateY(Math.PI / 8); c4.translate(0, 77.6, 0); sp.push(c4.toNonIndexed());
    sp.push(boxG(-0.06, 0.06, 79.6, TOP, -0.06, 0.06)); }
  const mk = (geo, color, opts, lw, angle = 30) => { const m = fillMat(color, { double: true, poche: '#E2401C', ...opts }); m.clippingPlanes = [clipT]; mats.push(m); const mesh = new THREE.Mesh(geo, m); g.add(mesh);
    const lm = lineMat('#1A1B20', lw); lm.clippingPlanes = [clipT]; lms.push(lm); g.add(segs(edgesOf(geo, angle), lm)); return mesh; };
  const geoB = geomFrom(shearArr(B.P), B.B, B.T), geoC = geomFrom(shearArr(C.P), C.B, C.T);
  const m1 = fillMat('#FAF9F5', { hatch: 1, double: true, poche: '#E2401C' }); m1.clippingPlanes = [clipT]; mats.push(m1); g.add(new THREE.Mesh(geoB, m1));
  const l1 = lineMat('#1A1B20', 1.25); l1.clippingPlanes = [clipT]; lms.push(l1); g.add(segs(shearArr(B.E), l1));
  const m2 = fillMat('#ECE9E1', { hatch: 1, double: true, poche: '#E2401C' }); m2.clippingPlanes = [clipT]; mats.push(m2); g.add(new THREE.Mesh(geoC, m2));
  const l2 = lineMat('#1A1B20', 1.1); l2.clippingPlanes = [clipT]; lms.push(l2); g.add(segs(shearArr(C.E), l2));
  mk(shear(merge(solid)), '#FAF9F5', { hatch: 1 }, 1.0);
  mk(shear(merge(win)), '#2A2B30', { hatch: 0 }, 0.8);
  mk(shear(merge(sp)), '#F1EFE9', { hatch: 1 }, 1.1);
  // brick coursing on the star body
  const J = []; for (let y = 1.1; y < 19; y += 1.1) { const s = star(5.77, 4.77); for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length]; J.push(a[0], y, a[1], b[0], y, b[1]); } }
  const lj = lineMat('#BDB9AE', 0.7); lj.clippingPlanes = [clipT]; lms.push(lj); g.add(segs(shearArr(J), lj));
  g.traverse(o => o.frustumCulled = false);
  return { g, mats, lms };
}
// 1860 reinforcement of the lower stretch (drawn as a collar in vermillion tint)
function buildCollar() {
  const g = new THREE.Group(); const P = [], B = [], T = [], E = [];
  prism(oct(6.4), 0, 7.5, 0, P, B, T, E);
  const m = fillMat('#F3D2C6', { hatch: 1 }); const lm = lineMat('#E2401C', 1.8);
  g.add(new THREE.Mesh(geomFrom(shearArr(P), B, T), m)); g.add(segs(shearArr(E), lm));
  g.traverse(o => o.frustumCulled = false); return { g, mats: [m], lms: [lm] };
}
function buildScaffold() {
  const L = []; const R = 7.2; const n = 16;
  for (let i = 0; i < n; i++) { const t = i * 2 * Math.PI / n; for (let y = 0; y < 66; y += 6) { const x = R * Math.cos(t), z = R * Math.sin(t); L.push(x, y, z, x, y + 6, z); } }
  for (let y = 0; y <= 66; y += 3) for (let i = 0; i < n; i++) { const t = i * 2 * Math.PI / n, t2 = (i + 1) * 2 * Math.PI / n; L.push(R * Math.cos(t), y, R * Math.sin(t), R * Math.cos(t2), y, R * Math.sin(t2)); }
  const lm = lineMat('#6E6C66', 0.9); lm.clippingPlanes = [clipT];
  const s = segs(shearArr(L), lm); s.frustumCulled = false; return { g: s, lms: [lm] };
}
function buildCity() {
  const g = new THREE.Group(); const P = [], B = [], T = [], E = [];
  // plaza ~46 x 36 m around the tower; irregular perimeter blocks; generic old-town fabric beyond
  const plaza = (x, z) => Math.abs(x) < 23 && Math.abs(z) < 18;
  const streets = [[-3.5, 3.5, 'z'], [30, 37, 'x'], [-70, -63, 'x'], [-48, -42, 'z'], [52, 58, 'z']];
  for (let gx = -200; gx < 200; gx += 27) for (let gz = -200; gz < 200; gz += 23) {
    if (Math.hypot(gx, gz) > 150 + rng() * 40) continue;
    const x0 = gx + rng() * 3, z0 = gz + rng() * 3, x1 = gx + 26 - 3 - rng() * 3, z1 = gz + 22 - 3 - rng() * 3;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (plaza(cx, cz) || (Math.abs(cx) < 30 && Math.abs(cz) < 24 && plaza(cx * 0.8, cz * 0.8))) continue;
    if (Math.hypot(cx, cz) < 30 && Math.abs(cx) < 26 && Math.abs(cz) < 21) continue;
    let skip = false; for (const [a, b, ax] of streets) { const v = ax === 'z' ? cz : cx; if (v > a - 8 && v < b + 8 && rng() < 0.0) skip = true; } if (skip) continue;
    // split block into 2-4 houses
    const nh = 2 + Math.floor(rng() * 3); const w = (x1 - x0) / nh;
    for (let k = 0; k < nh; k++) { const a = x0 + k * w + 0.3, b = x0 + (k + 1) * w - 0.3; const h = 10 + Math.floor(rng() * 3) * 3.2;
      prism([[a, z0], [b, z0], [b, z1], [a, z1]], 0, h, 2.0, P, B, T, E, { hip: 3, bottomEdges: Math.hypot(cx, cz) < 70 }); }
  }
  // San Felipe church (east side of the plaza) and Argillo palace (north-west): simplified volumes
  prism([[24, -16], [48, -16], [48, 14], [24, 14]], 0, 21, 3.5, P, B, T, E, { hip: 7, bottomEdges: true });
  prism([[-46, -40], [-20, -40], [-20, -20], [-46, -20]], 0, 17, 2.4, P, B, T, E, { hip: 4, bottomEdges: true });
  const m = fillMat('#F8F7F3', { hatch: 0.45, windows: 0.55, side: 0.975, shade: 0.945 }); const lm = lineMat('#4A4B52', 0.8);
  g.add(new THREE.Mesh(geomFrom(P, B, T), m)); g.add(segs(E, lm));
  // ground + paving in the plaza
  const gp = new THREE.PlaneGeometry(700, 700); gp.rotateX(-Math.PI / 2); const gm = fillMat('#F2F1EC', { hatch: 0 }); g.add(new THREE.Mesh(gp, gm));
  const L = []; for (let x = -22; x <= 22; x += 2) L.push(x, 0.03, -17, x, 0.03, 17); for (let z = -17; z <= 17; z += 2) L.push(-22, 0.03, z, 22, 0.03, z);
  const pl = lineMat('#CFCBC0', 0.6); g.add(segs(L, pl));
  // bronze boy, seated, looking up at where the tower stood
  const boy = merge([boxG(-0.25, 0.25, 0, 0.45, -0.35, 0.35), boxG(-0.2, 0.2, 0.45, 1.05, -0.15, 0.15), boxG(-0.13, 0.13, 1.05, 1.3, -0.13, 0.13)]); boy.translate(10, 0, 8);
  const bm = fillMat('#2A2B30', { hatch: 0 }); g.add(new THREE.Mesh(boy, bm)); const bl = lineMat('#1A1B20', 1.0); g.add(segs(edgesOf(boy, 30), bl));
  g.traverse(o => o.frustumCulled = false);
  return { g, mats: [m, gm, bm], lms: [lm, pl, bl] };
}
function buildAccents() {
  const g = new THREE.Group();
  const pl = []; for (let y = TOP; y > 0.6; y -= 2.4) pl.push(OFF, y, 0, OFF, Math.max(0, y - 1.4), 0);
  const ax = []; for (let i = 0; i < 80; i++) { const y0 = TOP * i / 80, y1 = TOP * (i + 1) / 80; ax.push(lean(y0), y0, 0, lean(y1), y1, 0); }
  const mk = (arr, w) => { const lm = lineMat('#E2401C', w, { depthTest: false }); const s = segs(arr, lm, 9); s.frustumCulled = false; g.add(s); return lm; };
  const lms = [mk(pl, 2.2), mk(ax, 3.4)];
  const ticks = []; for (const y of [Y1, Y2]) ticks.push(-8 + lean(y), y, 0, 8 + lean(y), y, 0); lms.push(mk(ticks, 1.6));
  return { g, lms };
}
function buildFootprint() {
  const s = star(5.75, 4.75); const L = []; for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length]; L.push(a[0], 0.05, a[1], b[0], 0.05, b[1]); }
  const lm = lineMat('#E2401C', 2.6); const g = segs(L, lm); g.frustumCulled = false; return { g, lms: [lm] };
}
function buildGhost() {   // vermillion line ghost of the tower for the closing frame
  const E = [];
  for (const [ring, y0, y1] of [[star(5.75, 4.75), 0, 19], [oct(4.7), 20.2, 37], [oct(4.15), 38.2, 52], [oct(3.6), 53.2, 63]]) { const P = [], B = [], T = []; prism(ring, y0, y1, 0, P, B, T, E); }
  const s = []; const c = new THREE.ConeGeometry(3.0, 16, 8); c.rotateY(Math.PI / 8); c.translate(0, 72, 0); E.push(...edgesOf(c.toNonIndexed(), 30));
  const lm = lineMat('#E2401C', 1.5); lm.clippingPlanes = [clipT]; const g = segs(shearArr(E), lm); g.frustumCulled = false; return { g, lms: [lm] };
}

export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); renderer.localClippingEnabled = true;
  $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 8000);
  const city = buildCity(); scene.add(city.g);
  const tower = buildTower(); scene.add(tower.g);
  const collar = buildCollar(); scene.add(collar.g);
  const scaf = buildScaffold(); scene.add(scaf.g);
  const acc = buildAccents(); scene.add(acc.g);
  const fp = buildFootprint(); scene.add(fp.g);
  const ghost = buildGhost(); scene.add(ghost.g);
  const plate = (() => { const P = [], B = [], T = [], E = []; prism(star(10.5, 8.6), 0, 1.4, 0, P, B, T, E); const g = new THREE.Group(); g.add(new THREE.Mesh(geomFrom(P, B, T), fillMat('#E2401C', { hatch: 1 }))); g.add(segs(E, lineMat('#1A1B20', 1.3))); g.traverse(o => o.frustumCulled = false); g.visible = false; return g; })();
  scene.add(plate);
  const op = (o, v) => { for (const m of o.mats || []) setFillOpacity(m, v); for (const m of o.lms || []) setLineOpacity(m, v); o.g.visible = v > 0.003; };
  const K = [
    { t: 0, tg: [0, 32, 0], z: 50, az: 34, el: 26 },
    { t: 2.2, tg: [0, 28, 0], z: 48, az: 22, el: 30 },
    { t: 4.2, tg: [0, 10, 0], z: 34, az: 8, el: 34 },
    { t: 11.5, tg: [0, 36, 0], z: 52, az: -16, el: 26 },
    { t: 15.2, tg: [0, 38, 0], z: 54, az: -28, el: 22 },
    { t: 17.6, tg: [1.3, 40, 0], z: 48, az: 0, el: 3 },
    { t: 25.0, tg: [1.3, 40, 0], z: 48, az: 0, el: 3 },
    { t: 28.0, tg: [0, 26, 0], z: 120, az: 25, el: 42 },
    { t: 31.0, tg: [0, 26, 0], z: 112, az: 35, el: 40 },
    { t: 33.5, tg: [0, 20, 0], z: 42, az: 16, el: 24 },
    { t: 38.5, tg: [0, 32, 0], z: 50, az: 10, el: 26 },
    { t: 47.0, tg: [2, 10, 2], z: 36, az: 45, el: 32 },
    { t: 52.0, tg: [2, 20, 2], z: 44, az: 36, el: 28 },
    { t: 56.0, tg: [0, 32, 0], z: 50, az: 34, el: 26 },
  ];
  const subs = [
    [4.4, 7.7, 'En 1504 Zaragoza encarga una torre de reloj. Fernando el Católico da el visto bueno.'],
    [7.9, 11.4, 'La levantan maestros cristianos y mudéjares, en ladrillo y aljez.'],
    [11.6, 15.3, 'Unos 80 m de altura. En 1512 ya tiene reloj y campanas.'],
    [15.6, 20.2, 'Al fraguar de forma desigual, se inclina.'],
    [20.4, 25.2, 'Sube recta, se inclina hasta dos tercios de su altura y el remate vuelve a la vertical.'],
    [25.6, 31.0, 'En los Sitios de 1808 y 1809 sirve de atalaya sobre la ciudad.'],
    [31.4, 35.0, 'En 1741 se mide su desplome. En 1860 se refuerza la base.'],
    [35.2, 38.6, 'En 1892 el desplome es prácticamente el mismo.'],
    [38.8, 42.6, 'Aun así, ese año el Ayuntamiento acuerda derribarla.'],
    [42.8, 47.2, 'Sus ladrillos se venden para cimientos de casas nuevas. En 1893 ya no queda nada.'],
    [47.6, 52.4, 'Hoy, en la plaza de San Felipe, un niño de bronce mira hacia donde estaba.'],
  ];
  const kick = [[0, '005 · ZARAGOZA, 1504–1893'], [2.2, '01 · 1504'], [15.4, '02 · EL DESPLOME'], [25.4, '03 · 1808'], [31.2, '04 · 1741–1892'], [38.6, '05 · EL DERRIBO'], [47.4, '06 · HOY'], [52.6, '005 · ZARAGOZA, 1504–1893']];
  const NS = 'http://www.w3.org/2000/svg';
  window.renderAt = (t) => {
    let i = 1; while (i < K.length - 1 && K[i].t < t) i++; const a = K[i - 1], b = K[i]; const u = smr(seg(t, a.t, b.t));
    const tg = a.tg.map((v, k) => lerp(v, b.tg[k], u)); const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), u));
    let az = lerp(a.az, b.az, u) * Math.PI / 180; const el = (window.COVER ? 24 : lerp(a.el, b.el, u)) * Math.PI / 180;
    let tgC = tg, zC = z; if (window.COVER) { tgC = [-4, 72, 0]; zC = 76; az = 34 * Math.PI / 180; city.g.children[0].visible = false; city.g.children[1].visible = false; plate.visible = true; acc.g.children[1].visible = false; acc.g.children[2].visible = false; }
    camera.left = -zC * W / H; camera.right = zC * W / H; camera.top = zC; camera.bottom = -zC;
    const d = 2500; camera.position.set(tgC[0] + Math.sin(az) * Math.cos(el) * d, tgC[1] + Math.sin(el) * d, tgC[2] + Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(tgC[0], tgC[1], tgC[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    // tower height: complete -> rewind -> rebuild -> demolish
    let h = TOP + 0.5;
    if (t >= 2.0 && t < 4.0) h = lerp(TOP + 0.5, 0, smr(seg(t, 2.0, 3.9)));
    else if (t >= 4.0 && t < 12) h = lerp(0, TOP + 0.5, sm(seg(t, 4.2, 11.4)));
    else if (t >= 39.4) h = lerp(TOP + 0.5, 0, sm(seg(t, 39.6, 46.6)));
    clipT.constant = h;
    tower.g.visible = h > 0.05;
    op(collar, t < 30 ? 0 : (t < 40 ? sm(seg(t, 32.6, 33.8)) : 1 - sm(seg(t, 44.0, 46.0))));
    collar.g.scale.y = 1; 
    op(scaf, fadeWin(t, 38.8, 47.0, 0.8));
    op(acc, window.COVER ? 1 : Math.max(fadeWin(t, 17.4, 25.3, 0.6), fadeWin(t, 35.0, 38.8, 0.5)));
    op(fp, Math.max(fadeWin(t, 2.6, 5.0, 0.4), sm(seg(t, 46.4, 47.4))));
    // closing ghost: vermillion silhouette rises again where the tower stood
    const gh = sm(seg(t, 52.4, 55.4)); ghost.g.visible = gh > 0.003; if (gh > 0) { setLineOpacity(ghost.lms[0], 1); }
    if (t > 52.4) clipT.constant = lerp(0, TOP + 0.5, gh);
    renderer.render(scene, camera);
    // overlay
    const titleO = Math.max(1 - sm(seg(t, 1.6, 2.2)), sm(seg(t, 53.0, 53.8)));
    $('title').style.opacity = titleO;
    let kt = kick[0][1], ks = 0; for (const [s, x] of kick) if (t >= s) { kt = x; ks = s; } $('kicker').textContent = kt; $('kicker').style.opacity = ks === 0 ? 1 : clamp((t - ks) / 0.4);
    let sub = '', so = 0; for (const [s0, s1, x] of subs) { const o = fadeWin(t, s0, s1); if (o > 0) { sub = x; so = o; } } $('sub').textContent = sub; $('sub').style.opacity = so;
    const svg = $('ov'); svg.innerHTML = '';
    const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    const dim = (A, Bp, txt, o, dx = 0, dy = 0) => { if (o <= 0) return; const p = P(A), q = P(Bp); svg.insertAdjacentHTML('beforeend', `<g opacity="${o}"><line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#E2401C" stroke-width="2.4"/><line x1="${p[0] - 9}" y1="${p[1]}" x2="${p[0] + 9}" y2="${p[1]}" stroke="#E2401C" stroke-width="2.4"/><line x1="${q[0] - 9}" y1="${q[1]}" x2="${q[0] + 9}" y2="${q[1]}" stroke="#E2401C" stroke-width="2.4"/><text class="dim" x="${(p[0] + q[0]) / 2 + dx}" y="${(p[1] + q[1]) / 2 + dy}">${txt}</text></g>`); };
    const lab = (A, txt, o) => { if (o <= 0) return; const p = P(A); svg.insertAdjacentHTML('beforeend', `<g opacity="${o}"><circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#1A1B20"/><line x1="${p[0]}" y1="${p[1]}" x2="${p[0]}" y2="${p[1] - 28}" stroke="#1A1B20" stroke-width="1.2"/><text class="lab" x="${p[0]}" y="${p[1] - 34}">${txt}</text></g>`); };
    dim([-12, 0, 0], [-12 + OFF, TOP, 0], '≈ 80 m', fadeWin(t, 11.8, 15.3), -58, 0);
    const lo = fadeWin(t, 18.6, 25.2, 0.5);
    lab([lean(Y2) + 9, Y2, 0], '2/3 DE LA ALTURA', lo);
    const dd = Math.max(fadeWin(t, 20.4, 25.2), fadeWin(t, 35.2, 38.8));
    if (dd > 0) { const p = P([0, Y2 + 6, 0]), q = P([OFF, Y2 + 6, 0]); svg.insertAdjacentHTML('beforeend', `<g opacity="${dd}"><line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#E2401C" stroke-width="2.4"/><text class="dim" x="${q[0] + 70}" y="${q[1] + 8}">≈ 2,6 m</text></g>`); }
    lab([6.5, 7.6, 0], '1860', fadeWin(t, 33.4, 38.6));
    lab([24, 23, -1], 'SAN FELIPE', fadeWin(t, 26.2, 31.0)); lab([0, TOP, 0], 'TORRE NUEVA', fadeWin(t, 26.6, 31.0));
    lab([10, 1.4, 8], 'EL NIÑO DE BRONCE', fadeWin(t, 48.0, 52.4));
    return true;
  };
  window.READY = true;
}
