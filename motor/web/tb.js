import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, edgesOf, boxG, merge, prism, geomFrom, slab, shadowU, LIGHT, makeInkPass } from './lib.js';
const $ = (id) => document.getElementById(id);
const rng = (() => { let s = 21; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
// Schematic Torres Blancas: 21 residential floors + 2 social floors on top (23), ~3.05 m per floor.
const FL = 3.05, NRES = 21, NTOP = 2, TOPY = (NRES + NTOP) * FL;
function cyl(x, z, r, y0, y1, seg = 28) { const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1); g.translate(x, (y0 + y1) / 2, z); return g.toNonIndexed(); }
function ringLines(x, z, r, y, seg, L) { for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2, b = (i + 1) / seg * Math.PI * 2; L.push(x + r * Math.cos(a), y, z + r * Math.sin(a), x + r * Math.cos(b), y, z + r * Math.sin(b)); } }
function build(GEO) {
  const root = new THREE.Group();
  const conc = fillMat('#E8E5DD', { hatch: 1, side: 0.94, shade: 0.83 });
  const conc2 = fillMat('#D3CFC6', { hatch: 1, side: 0.93, shade: 0.80 });
  const slat = fillMat('#E2401C', { hatch: 1, side: 0.92, shade: 0.8 });
  const Lm = [], Ls = [], Lb = [];
  // recessed glazed body (traced outline, 1.5 m in from the balcony edge) with mullions
  { const P = [], B = [], T = [], E = []; prism(GEO.inner, 0, NRES * FL, 0, P, B, T, E);
    root.add(new THREE.Mesh(geomFrom(P, B, T), conc2)); root.add(segs(E, lineMat('#3A3C44', 0.7)));
    const r = GEO.inner; for (let i = 0; i < r.length; i++) { const p0 = r[i], p1 = r[(i + 1) % r.length]; const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); const n = Math.max(1, Math.round(len / 1.3));
      for (let k = 0; k < n; k++) { const t = k / n; const x = p0[0] + (p1[0] - p0[0]) * t, z = p0[1] + (p1[1] - p0[1]) * t; Lm.push(x, 0.4, z, x, NRES * FL, z); } } }
  // balcony drums: stacked round slabs + parapets (deep gaps between them read as recesses)
  { const DG = [], E = [];
    for (const [x, z, r] of GEO.drums) for (let f = 1; f <= NRES; f++) { const y = f * FL - 1.2; const rr = r + (((f * 3 + Math.round(x * 7)) % 5) - 2) * 0.05;
      DG.push(cyl(x, z, rr, y - 0.3, y, 24)); const pa = new THREE.CylinderGeometry(rr, rr, 1.1, 24, 1, true); pa.translate(x, y + 0.55, z); DG.push(pa.toNonIndexed());
      for (let k = 0; k < 24; k++) { const t0 = k / 24 * Math.PI * 2, t1 = (k + 1) / 24 * Math.PI * 2; for (const yy of [y - 0.3, y + 1.1]) E.push(x + rr * Math.cos(t0), yy, z + rr * Math.sin(t0), x + rr * Math.cos(t1), yy, z + rr * Math.sin(t1)); } }
    const g = merge(DG); root.add(new THREE.Mesh(g, fillMat('#E8E5DD', { hatch: 1, side: 0.94, shade: 0.83 }))); root.add(segs(E, lineMat('#1A1B20', 0.8)));
    // dark glazing drum inside each stack
    const GL = GEO.drums.map(([x, z, r]) => cyl(x, z, r - 1.5, 0, NRES * FL, 32)); root.add(new THREE.Mesh(merge(GL), fillMat('#6E7076', { hatch: 0 }))); }
  // social floors on top + roof terrace
  { const P = [], B = [], T = [], E = []; slab(GEO.foot, [], NRES * FL + 0.25, NRES * FL - 0.3, P, B, T, E, true);
    prism(GEO.top, NRES * FL + 0.25, TOPY - 0.2, 0, P, B, T, E, { bottomEdges: false });
    root.add(new THREE.Mesh(geomFrom(P, B, T), conc)); root.add(segs(E, lineMat('#1A1B20', 1.0))); }
  // shafts on the perimeter, crowned by the "setas"
  const shafts = GEO.shafts.slice().sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
  const drops = [0, -2, 0, -1, 0, -3, 0, -1];
  const SG = [], CG = [], SL = [];
  shafts.forEach(([x, z, r0], i) => { const r = r0; const top = TOPY + drops[i % drops.length] * FL;
    SG.push(cyl(x, z, r, 0, top - 2.4, 32));
    const R = r * 2.6; const cap = new THREE.CylinderGeometry(R, r * 1.05, 2.4, 32, 1); cap.translate(x, top - 1.2, z); CG.push(cap.toNonIndexed());
    CG.push(cyl(x, z, R, top, top + 1.0, 32)); const sr = R * 0.93; SL.push(cyl(x, z, sr, top + 1.0, top + 2.9, 32)); CG.push(cyl(x, z, R * 0.97, top + 2.9, top + 3.15, 32));
    for (let k = 0; k < 60; k++) { const t = k / 60 * Math.PI * 2; Ls.push(x + sr * 1.004 * Math.cos(t), top + 1.0, z + sr * 1.004 * Math.sin(t), x + sr * 1.004 * Math.cos(t), top + 2.9, z + sr * 1.004 * Math.sin(t)); }
    for (let y = 2.4; y < top - 2.6; y += 2.4) for (let k = 0; k < 28; k += 2) { const t0 = k / 28 * Math.PI * 2, t1 = (k + 1) / 28 * Math.PI * 2; Lb.push(x + r * 1.003 * Math.cos(t0), y, z + r * 1.003 * Math.sin(t0), x + r * 1.003 * Math.cos(t1), y, z + r * 1.003 * Math.sin(t1)); } });
  for (const [x, z, r] of GEO.core) SG.push(cyl(x, z, Math.max(3.8, r * 1.6), 0, TOPY + 3.4, 40));
  const add = (list, m, ang, lw) => { const g = merge(list); root.add(new THREE.Mesh(g, m)); root.add(segs(edgesOf(g, ang), lineMat('#1A1B20', lw))); };
  add(SG, conc, 50, 1.25); add(CG, conc, 40, 1.2); add(SL, slat, 40, 1.0);
  root.add(segs(Lm, lineMat('#5A5B62', 0.5))); root.add(segs(Ls, lineMat('#9E2A12', 0.6))); root.add(segs(Lb, lineMat('#CFCBC1', 0.5)));
  { const pg = new THREE.Group(); pg.name = 'plan'; pg.visible = false; const y = 0.06;
    const fillPoly = (ring, color, yy) => { const P = [], B = [], T = [], E = []; slab(ring, [], yy, null, P, B, T, E, false); return new THREE.Mesh(geomFrom(P, B, T), fillMat(color, { hatch: 0 })); };
    const circ = (x, z, r, n = 64) => { const p = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; p.push([x + r * Math.cos(t), z + r * Math.sin(t)]); } return p; };
    // floor of the typical plan (traced outline), terraces in the brand red, then the redrawn plan linework on top
    pg.add(fillPoly(GEO.plan_foot, '#FBFAF6', y));
    for (const [x, z, r] of GEO.terraces) pg.add(fillPoly(circ(x, z, r), '#F2B5A5', y + 0.01));
    const L = []; const pl = GEO.planlines; for (let i = 0; i < pl.length; i += 4) L.push(pl[i], y + 0.05, pl[i + 1], pl[i + 2], y + 0.05, pl[i + 3]);
    pg.add(segs(L, lineMat('#1A1B20', 1.0)));
    const Lo = []; const f = GEO.plan_foot; for (let i = 0; i < f.length; i++) { const p = f[i], q = f[(i + 1) % f.length]; Lo.push(p[0], y + 0.06, p[1], q[0], y + 0.06, q[1]); }
    pg.add(segs(Lo, lineMat('#E2401C', 2.2)));
    pg.traverse(o => { o.frustumCulled = false; o.userData.noInk = true; }); root.add(pg); }
  const lobes = GEO.drums.map(d => [d[0], d[1], d[2] + 0.6, 0]);
  // ground, Avenida de América (south), Corazón de María (west) and Padre Xifré (east): schematic street layout
  // ground: cheap plane that only receives the cast shadow as hatching (no lighting maths)
  { const gp = new THREE.PlaneGeometry(220, 220); gp.rotateX(-Math.PI / 2); const gm = fillMat('#F2F1EC', { hatch: 1, top: 1.0 }); const m = new THREE.Mesh(gp, gm); m.renderOrder = -1; root.add(m); }
  const city = new THREE.Group(); city.name = 'city'; root.add(city);
  { const P = [], B = [], T = [], E = [];
    const street = (x, z) => (z > 40 && z < 92) || (Math.abs(x + 96) < 8) || (Math.abs(x - 44) < 8);
    for (let gx = -330; gx < 330; gx += 36) for (let gz = -330; gz < 330; gz += 32) {
      const x0 = gx + 3, x1 = gx + 33, z0 = gz + 3, z1 = gz + 29, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      if (cx > -86 && cx < 36 && cz > -36 && cz < 38) continue;                 // the plot with its garden (room for the twin that was never built)
      if (street(cx, cz) || street(x0, z0) || street(x1, z1) || street(x0, z1) || street(x1, z0)) continue;
      if (Math.hypot(cx, cz) > 230 + rng() * 30) continue;
      const nh = 1 + Math.floor(rng() * 2); const w = (x1 - x0) / nh;
      for (let k = 0; k < nh; k++) { const h = 21 + Math.floor(rng() * 5) * 3.0; prism([[x0 + k * w + 0.4, z0], [x0 + (k + 1) * w - 0.4, z0], [x0 + (k + 1) * w - 0.4, z1], [x0 + k * w + 0.4, z1]], 0, h, 0, P, B, T, E, { bottomEdges: true }); } }
    city.add(new THREE.Mesh(geomFrom(P, B, T), fillMat('#F8F7F3', { hatch: 0.45, windows: 0.55, side: 0.975, shade: 0.945 }))); city.add(segs(E, lineMat('#4A4B52', 0.8))); }
  { const Lr = []; for (const z of [44, 88]) Lr.push(-400, 0.03, z, 400, 0.03, z); for (const z of [62, 70]) Lr.push(-400, 0.03, z, 400, 0.03, z);
    for (const z of [53, 79]) for (let x = -400; x < 400; x += 7) Lr.push(x, 0.03, z, x + 3.5, 0.03, z);
    for (const xs of [-96, 44]) for (const d of [-8, 8]) Lr.push(xs + d, 0.03, -400, xs + d, 0.03, 44);
    city.add(segs(Lr, lineMat('#BDB9AE', 0.8))); }
  // garden trees around the tower (simple crowns on trunks)
  { const TR = [], TL = [];
    for (let i = 0; i < 30; i++) { let x, z; do { x = (rng() - 0.5) * 66; z = (rng() - 0.5) * 66; } while (Math.hypot(x, z) < 22 || z > 36); const r = 2.2 + rng() * 1.6, h = 4 + rng() * 3;
      const sp = new THREE.IcosahedronGeometry(r, 1); sp.translate(x, h + r * 0.7, z); TR.push(sp.toNonIndexed()); TL.push(x, 0, z, x, h, z); }
    const g = merge(TR); city.add(new THREE.Mesh(g, fillMat('#EEEDE6', { hatch: 1, side: 0.95, shade: 0.85 }))); city.add(segs(edgesOf(g, 50), lineMat('#5A5B62', 0.6))); city.add(segs(TL, lineMat('#5A5B62', 0.9))); }
  // the second tower that was never licensed: vermillion dashed ghost (twin, west of the built one)
  { const G = []; const off = -46; const dash = (x0, y0, z0, x1, y1, z1) => { const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 1.6)); for (let i = 0; i < n; i += 2) { const p = (k) => [x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, z0 + (z1 - z0) * k / n]; G.push(...p(i), ...p(Math.min(i + 1, n))); } };
    const Hh = 20 * FL; for (const [x, z, r] of lobes) { for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, b = (k + 1) / 16 * Math.PI * 2; for (const y of [0, Hh]) G.push(off + x + r * Math.cos(a), y, z + r * Math.sin(a), off + x + r * Math.cos(b), y, z + r * Math.sin(b)); }
      for (const k of [0, 4, 8, 12]) { const a = k / 16 * Math.PI * 2; dash(off + x + r * Math.cos(a), 0, z + r * Math.sin(a), off + x + r * Math.cos(a), Hh, z + r * Math.sin(a)); } }
    const g = segs(G, lineMat('#E2401C', 1.8)); g.name = 'ghost'; root.add(g); }
  root.traverse(o => o.frustumCulled = false);
  return root;
}
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); renderer.localClippingEnabled = true;
  $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
  const GEO = await fetch('tb_geo.json').then(r => r.json());
  const root = build(GEO); scene.add(root); window.TB = { root, scene, shadowU, get renderer() { return renderer; }, get camera() { return camera; } };
  const shadowRT = new THREE.WebGLRenderTarget(2048, 2048); shadowRT.depthTexture = new THREE.DepthTexture(2048, 2048); shadowRT.depthTexture.type = THREE.UnsignedIntType;
  const lightCam = new THREE.OrthographicCamera(-200, 200, 200, -200, 1, 3000); const depthMat = new THREE.MeshDepthMaterial(); depthMat.side = THREE.DoubleSide;
  // ---- growth clip (tower only) ----
  const clipY = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e6);
  for (const ch of root.children) { if (ch.name === 'city' || ch.name === 'ghost' || ch.name === 'plan' || ch.geometry?.type === 'PlaneGeometry') continue; ch.traverse(o => { if (o.material) o.material.clippingPlanes = [clipY]; }); }
  depthMat.clippingPlanes = [clipY];
  const ink = makeInkPass(renderer, W, H); ink.normalMat.clippingPlanes = [clipY];
  { const gpl = root.children.find(c => c.geometry?.type === 'PlaneGeometry'); if (gpl) gpl.userData.noInk = true; }
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)); const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }; const smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const seg = (t, a, b) => clamp((t - a) / (b - a)); const lerp = (a, b, t) => a + (b - a) * t; const fw = (t, a, b, f = 0.35) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
  const K = [
    { t: 0, tg: [0, 43, 0], z: 57, az: 28, el: 6 }, { t: 1.0, tg: [0, 43, 0], z: 57, az: 28, el: 6 },
    { t: 3.0, tg: [-20, 40, 0], z: 70, az: 24, el: 9 }, { t: 5.6, tg: [-20, 40, 0], z: 68, az: 24, el: 9 },
    { t: 9.6, tg: [0, 40, 0], z: 56, az: 10, el: 14 }, { t: 12.8, tg: [0, 0, 0], z: 33, az: 0, el: 88 }, { t: 17.8, tg: [0, 0, 0], z: 33, az: 0, el: 88 },
    { t: 21.2, tg: [0, 30, 0], z: 48, az: -20, el: 16 }, { t: 24.2, tg: [0, 24, 0], z: 34, az: -40, el: 12 }, { t: 28.6, tg: [0, 54, 0], z: 34, az: -46, el: 12 },
    { t: 31.2, tg: [0, 70, 0], z: 24, az: -20, el: 22 }, { t: 34.8, tg: [0, 72, 0], z: 26, az: 10, el: 28 },
    { t: 37.6, tg: [-22, 38, 0], z: 72, az: 22, el: 11 }, { t: 41.8, tg: [-20, 38, 0], z: 70, az: 26, el: 9 },
    { t: 44.2, tg: [0, 43, 0], z: 57, az: 28, el: 6 }, { t: 46.0, tg: [0, 43, 0], z: 57, az: 28, el: 6 } ];
  const subs = [[1.3, 5.4, 'Oiza proyectó dos torres gemelas. Solo se construyó una.'],
    [5.8, 9.8, 'Madrid, 1961. Juan Huarte le encarga una torre de viviendas en la avenida de América.'],
    [12.9, 17.9, 'Una planta en cruz, sin esquinas: cada vivienda se abre a terrazas curvas.'],
    [18.4, 24.1, 'La plantea como una ciudad jardín vertical: terrazas apiladas alrededor de troncos de hormigón.'],
    [24.5, 30.5, 'Veintiuna plantas de viviendas y, arriba, dos más para los vecinos.'],
    [30.9, 36.5, 'En la azotea, una piscina entre los troncos.'],
    [36.9, 43.2, 'El Ayuntamiento solo dio licencia para una, y la dejó subir hasta 23 plantas. De ahí el plural.']];
  const kick = [[0, '006 · MADRID, 1961–1969'], [5.6, '01 · 1961'], [12.6, '02 · LA PLANTA'], [18.2, '03 · CIUDAD JARDÍN VERTICAL'], [24.3, '04 · 23 PLANTAS'], [30.7, '05 · LA CORONACIÓN'], [36.7, '06 · EL NOMBRE'], [43.6, '006 · MADRID, 1961–1969']];
  window.renderCover = () => { document.body.classList.add('cover'); TB.root.getObjectByName('city').visible = false;
    window.shot({ tg: [-18, 74, 0], z: 78, az: 24, el: 8, sh: 120, towerH: 1e6, ghost: true, ghostOp: 1 }); $('pimg').style.display = 'none'; $('stage').style.opacity = 1; return true; };
  window.renderAt = (t) => {
    let i = 1; while (i < K.length - 1 && K[i].t < t) i++; const A = K[i - 1], Bk = K[i]; const u = smr(seg(t, A.t, Bk.t));
    const o = { tg: A.tg.map((v, k) => lerp(v, Bk.tg[k], u)), z: Math.exp(lerp(Math.log(A.z), Math.log(Bk.z), u)), az: lerp(A.az, Bk.az, u), el: lerp(A.el, Bk.el, u), sh: 110 };
    // the tower lowers into its own plan and grows back out of it
    let h = 1e6; if (t >= 9.8 && t < 21.4) h = t < 12.9 ? lerp(82, -1, smr(seg(t, 9.8, 12.8))) : (t < 18.0 ? -1 : lerp(-1, 82, sm(seg(t, 18.0, 21.3))));
    o.towerH = h; o.plan = t > 9.6 && t < 22.0;
    const g1 = fw(t, 0.9, 5.8, 0.9), g2 = fw(t, 36.8, 43.6, 0.9); o.ghost = g1 > 0.002 || g2 > 0.002; o.ghostOp = Math.max(g1, g2);
    o.kick = ''; for (const [s0, k0] of kick) if (t >= s0) o.kick = k0;
    const titleOp = Math.max(1 - sm(seg(t, 1.0, 1.5)), sm(seg(t, 43.6, 44.2)));
    o.title = titleOp > 0.001 ? '¿Por qué se llaman Torres Blancas si es una sola torre gris?' : '';
    o.sub = ''; let so = 0; for (const [a0, b0, tx] of subs) { const f = fw(t, a0, b0); if (f > 0) { o.sub = tx; so = f; } }
    window.shot(o);
    $('pimg').style.display = 'none'; $('stage').style.opacity = 1;
    $('title').style.opacity = titleOp; $('sub').style.opacity = so;
    return true; };
  window.shot = (o) => {
    { const gh = root.getObjectByName('ghost'); gh.visible = !!o.ghost; if (o.ghost) { const m = gh.material; m.userData.base = m.userData.base || m.color.clone(); m.color.copy(PAPER).lerp(m.userData.base, o.ghostOp ?? 1); } }
    renderer.clippingPlanes = o.cut ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), o.cut)] : [];
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, t = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 3000; camera.position.set(t[0] + Math.sin(az) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); if (o.el >= 89) camera.up.set(0, 0, -1);
    camera.lookAt(t[0], t[1], t[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    root.getObjectByName('plan').visible = !!o.plan;
    if (o.towerH !== undefined) clipY.constant = o.towerH;
    if (!o.shadows) { shadowU.on.value = 0; } else if (window._lastH !== clipY.constant || !window._shadowReady) { window._lastH = clipY.constant; window._shadowReady = true; const ctr = new THREE.Vector3(0, 0, 0); const Ld = LIGHT.clone().normalize(); lightCam.left = -o.sh; lightCam.right = o.sh; lightCam.top = o.sh; lightCam.bottom = -o.sh;
      lightCam.position.copy(ctr).addScaledVector(Ld, 1200); lightCam.lookAt(ctr); lightCam.updateProjectionMatrix(); lightCam.updateMatrixWorld();
      const hidden = []; scene.traverse(x => { if (x.isLineSegments2 && x.visible) { x.visible = false; hidden.push(x); } });
      scene.overrideMaterial = depthMat; renderer.setRenderTarget(shadowRT); renderer.clear(); renderer.render(scene, lightCam); renderer.setRenderTarget(null); scene.overrideMaterial = null; for (const x of hidden) x.visible = true;
      shadowU.mat.value.multiplyMatrices(lightCam.projectionMatrix, lightCam.matrixWorldInverse); shadowU.map.value = shadowRT.depthTexture; shadowU.on.value = 1; shadowU.texel.value = 1 / 2048; }
    ink.render(scene, camera);
    $('pimg').style.display = o.planimg ? 'block' : 'none'; $('stage').style.opacity = o.planimg ? 0 : 1;
    $('kicker').textContent = o.kick || ''; $('title').style.opacity = o.title ? 1 : 0; if (o.title) $('title').textContent = o.title;
    $('sub').textContent = o.sub || ''; $('sub').style.opacity = o.sub ? 1 : 0;
    const svg = $('ov'); svg.innerHTML = '';
    const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
    for (const l of o.labels || []) { const p = P(l[0]); svg.insertAdjacentHTML('beforeend', `<circle cx="${p[0]}" cy="${p[1]}" r="3.2" fill="#1A1B20"/><line x1="${p[0]}" y1="${p[1]}" x2="${p[0]}" y2="${p[1] - 28}" stroke="#1A1B20" stroke-width="1.2"/><text class="lab" x="${p[0]}" y="${p[1] - 34}">${l[1]}</text>`); }
    return true;
  };
  window.READY = true;
}
