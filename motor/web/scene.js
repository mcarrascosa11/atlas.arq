import { THREE, W, H, PAPER, viewToWorld, makeWater, updateWater, setFillOpacity, setLineOpacity, lineMat, segs } from './lib.js';
import { buildTheatre, buildTug, buildFusina, clipCladding, clipTubes, clipSection, DECK } from './models.js';
import { buildVenice, buildMap, buildDubrovnik, proj, DUB, FUS } from './world.js';

const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const fadeWin = (t, a, b, f = 0.4) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));

export async function init() {
  const [V, D, LAND, COAST] = await Promise.all(['venice.json', 'dubrovnik.json', 'land.json', 'adriatic.json'].map(f => fetch(f).then(r => r.json())));
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); renderer.localClippingEnabled = true;
  renderer.sortObjects = true;
  $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10);

  const water = makeWater(); scene.add(water);
  const theatre = buildTheatre(); scene.add(theatre.group);
  const tug = buildTug(); scene.add(tug.group);
  const fus = buildFusina(); fus.group.position.set(FUS.x, 0, FUS.z); scene.add(fus.group);
  const ven = buildVenice(V); scene.add(ven.group);
  const map = buildMap(LAND, COAST); scene.add(map.group);
  const dub = buildDubrovnik(D); dub.group.position.set(DUB.x, 0, DUB.z); scene.add(dub.group);
  // tow line
  const towMat = lineMat('#1A1B20', 1.2); const tow = segs(new Float32Array(6 * 12), towMat); tow.frustumCulled = false; scene.add(tow);

  // ---------- paths ----------
  const venPath = [[FUS.x, FUS.z], [FUS.x + 170, FUS.z], [-5400, 1270], [-4200, 1130], [-3000, 1060], [-1800, 1010], [-900, 975], [-300, 945], [100, 900], [290, 800], [400, 660], [428, 560], [424, 470], [410, 390], [392, 310], [372, 230], [340, 140], [280, 40], [200, -50], [110, -105], [60, -40], [35, 10], [10, 40], [-17.5, 33.5]];
  const P = (lon, lat) => proj(lon, lat);
  const D2 = (x, z) => [DUB.x + x, DUB.z + z];
  const seaPath = [[-17.5, 33.5], [80, 60], [400, 140], [1400, 400], [2900, 700], [4300, 1000], P(12.40, 45.415), P(12.55, 45.36), P(13.30, 45.25), P(13.56, 45.235), P(13.60, 45.10), P(13.64, 45.075), P(13.75, 44.85), P(13.92, 44.73),
    P(14.25, 44.66), P(14.60, 44.50), P(14.95, 44.33), P(15.16, 44.255), P(15.12, 44.18), P(15.35, 44.00), P(15.70, 43.75), P(16.05, 43.47), P(16.45, 43.33), P(16.95, 43.06), P(17.35, 42.88), P(17.75, 42.72), P(17.98, 42.64), D2(1800, 1300), D2(1100, 800), D2(560, 330), D2(330, 120), D2(262, 52), D2(228, 40)];
  const mkPath = (pts) => { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, L, len: L[L.length - 1] }; };
  const at = (p, s) => { s = clamp(s, 0, p.len); let i = 1; while (i < p.L.length - 1 && p.L[i] < s) i++; const t = (s - p.L[i - 1]) / ((p.L[i] - p.L[i - 1]) || 1); return [lerp(p.pts[i - 1][0], p.pts[i][0], t), lerp(p.pts[i - 1][1], p.pts[i][1], t)]; };
  const smoothAt = (p, s, r) => { let x = 0, z = 0, n = 0; for (let k = -2; k <= 2; k++) { const q = at(p, s + k * r / 2); x += q[0]; z += q[1]; n++; } return [x / n, z / n]; };
  const heading = (p, s, r) => { const a = smoothAt(p, s - r, r), b = smoothAt(p, s + r, r); return Math.atan2(-(b[1] - a[1]), b[0] - a[0]); };
  const VP = mkPath(venPath), SP = mkPath(seaPath); const VPL = (i) => VP.L[i];
  const sAtX = (x) => { for (let i = 1; i < venPath.length; i++) if (venPath[i][0] >= x) { const a = venPath[i - 1], b = venPath[i]; const t = (x - a[0]) / (b[0] - a[0]); return VP.L[i - 1] + t * (VP.L[i] - VP.L[i - 1]); } return VP.len; };
  // monotone keyframes for the distance travelled along the Venice path
  const vKeys = [[19.2, 0], [21.2, 25], [23.0, 300], [31.5, VPL(7)], [34.5, VPL(13)], [37.5, VPL(16)], [40.0, VPL(19)], [41.6, VP.len]];
  const pchip = (keys, t) => { if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[keys.length - 1][0]) return keys[keys.length - 1][1];
    let i = 1; while (keys[i][0] < t) i++; const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
    const d = (j) => { if (j <= 0 || j >= keys.length - 1) return 0; const s0 = (keys[j][1] - keys[j - 1][1]) / (keys[j][0] - keys[j - 1][0]), s1 = (keys[j + 1][1] - keys[j][1]) / (keys[j + 1][0] - keys[j][0]); return (s0 * s1 <= 0) ? 0 : 2 / (1 / s0 + 1 / s1); };
    const h = t1 - t0, u = (t - t0) / h, m0 = d(i - 1) * h, m1 = d(i) * h;
    return (2 * u ** 3 - 3 * u ** 2 + 1) * v0 + (u ** 3 - 2 * u ** 2 + u) * m0 + (-2 * u ** 3 + 3 * u ** 2) * v1 + (u ** 3 - u ** 2) * m1; };
  const seaApproachS = SP.L[SP.pts.length - 6];
  const sKeys = [[45.6, 0], [47.0, 2500], [54.9, seaApproachS], [57.4, SP.len]];
  const MOOR_V = -139.4 * Math.PI / 180;

  function bargeState(t) {
    if (t < 19.2) return { x: FUS.x, z: FUS.z, phi: 0, moving: 0, path: null };
    if (t < 45.6) {
      const s = pchip(vKeys, Math.min(t, 41.6));
      const [x, z] = smoothAt(VP, s, 24);
      let phi = s < 15 ? 0 : heading(VP, s, 30);
      const k = sm(seg(s, VP.len - 120, VP.len));
      let d = ((MOOR_V - phi + Math.PI * 3) % (Math.PI * 2)) - Math.PI; phi = phi + d * k;
      return { x, z, phi, moving: t < 41.6 ? 1 : 0, path: VP, s };
    }
    const s = pchip(sKeys, t);
    const [x, z] = smoothAt(SP, s, s < 6000 ? 40 : (s > seaApproachS ? 30 : 4000));
    let phi = heading(SP, s, s > seaApproachS ? 40 : (s < 6000 ? 60 : 6000));
    // leave the Dogana: rotate out from the mooring heading
    { let d = ((phi - MOOR_V + Math.PI * 3) % (Math.PI * 2)) - Math.PI; phi = MOOR_V + d * sm(seg(s, 0, 160)); }
    phi = lerp(phi, phi > 0 ? 0 : 0, 0);
    const k = sm(seg(s, SP.len - 260, SP.len));
    let dphi = ((0 - phi + Math.PI * 3) % (Math.PI * 2)) - Math.PI; phi = phi + dphi * k;
    return { x, z, phi, moving: t < 57.4 ? 1 : 0, path: SP, s };
  }

  // ---------- camera keys ----------
  const follow = (dy = 9) => (t, b) => [b.x, dy, b.z];
  const fixed = (x, y, z) => () => [x, y, z];
  const followOff = (dx, dy, dz) => (t, b) => [b.x + dx, dy, b.z + dz];
  const K = [
    { t: 0, tg: follow(7.5), z: 22, az: 78, el: 24 },
    { t: 3.6, tg: follow(10.5), z: 24.5, az: 52, el: 27 },
    { t: 7.4, tg: follow(12), z: 26, az: 32, el: 28 },
    { t: 9.7, tg: follow(12), z: 26, az: 26, el: 28 },
    { t: 11.7, tg: follow(9.0), z: 17.5, az: 14, el: 26 },
    { t: 16.9, tg: follow(9.0), z: 18.5, az: 20, el: 27 },
    { t: 19.2, tg: follow(10), z: 30, az: -8, el: 26 },
    { t: 23.0, tg: follow(14), z: 290, az: -58, el: 15 },
    { t: 29.0, tg: follow(14), z: 320, az: -62, el: 15 },
    { t: 31.8, tg: follow(12), z: 260, az: -38, el: 19 },
    { t: 34.6, tg: follow(12), z: 210, az: -4, el: 21 },
    { t: 37.4, tg: follow(12), z: 205, az: 8, el: 18 },
    { t: 40.0, tg: followOff(14, 42, -112), z: 175, az: 32, el: 13 },
    { t: 42.4, tg: fixed(-28, 18, -40), z: 195, az: 22, el: 17 },
    { t: 45.4, tg: fixed(-20, 18, -48), z: 205, az: 18, el: 19 },
    { t: 50.7, tg: fixed(236000, 0, 150000), z: 345000, az: 38, el: 76, vw: true },
    { t: 53.9, tg: fixed(240000, 0, 156000), z: 335000, az: 38, el: 76 },
    { t: 57.4, tg: fixed(DUB.x + 175, 22, DUB.z + 30), z: 250, az: 30, el: 26, vw: true },
    { t: 62.1, tg: fixed(DUB.x + 195, 18, DUB.z + 38), z: 190, az: 34, el: 26 },
    { t: 65.2, tg: follow(10), z: 38, az: 60, el: 27 },
    { t: 68.4, tg: follow(7.5), z: 22, az: 78, el: 24 },
    { t: 70.0, tg: follow(7.5), z: 22, az: 78, el: 24 },
  ];
  function vanWijk(c0, w0, c1, w1, s01) {
    const rho = 1.42, dx = c1[0] - c0[0], dz = c1[2] - c0[2], u1 = Math.hypot(dx, dz);
    if (u1 < 1e-3) { const S = Math.log(w1 / w0) / rho; const w = w0 * Math.exp(rho * S * s01); return { c: c0.map((v, i) => lerp(v, c1[i], s01)), w }; }
    const b0 = (w1 * w1 - w0 * w0 + rho ** 4 * u1 * u1) / (2 * w0 * rho * rho * u1), b1 = (w1 * w1 - w0 * w0 - rho ** 4 * u1 * u1) / (2 * w1 * rho * rho * u1);
    const r0 = Math.log(-b0 + Math.sqrt(b0 * b0 + 1)), r1 = Math.log(-b1 + Math.sqrt(b1 * b1 + 1)); const S = (r1 - r0) / rho; const s = s01 * S;
    const u = w0 / (rho * rho) * (Math.cosh(r0) * Math.tanh(rho * s + r0) - Math.sinh(r0)); const w = w0 * Math.cosh(r0) / Math.cosh(rho * s + r0);
    const f = u / u1; return { c: [lerp(c0[0], c1[0], f), lerp(c0[1], c1[1], f), lerp(c0[2], c1[2], f)], w };
  }
  function cameraAt(t, b) {
    let i = 1; while (i < K.length - 1 && K[i].t < t) i++;
    const a = K[i - 1], c = K[i]; const u = smr(seg(t, a.t, c.t));
    const p0 = a.tg(t, b), p1 = c.tg(t, b);
    let tg, z;
    if (c.vw) { const r = vanWijk(p0, a.z, p1, c.z, u); tg = r.c; z = r.w; }
    else { tg = p0.map((v, k) => lerp(v, p1[k], u)); z = Math.exp(lerp(Math.log(a.z), Math.log(c.z), u)); }
    return { tg, z, az: lerp(a.az, c.az, u) * Math.PI / 180, el: lerp(a.el, c.el, u) * Math.PI / 180 };
  }

  // ---------- overlay ----------
  const svg = $('ov');
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.appendChild(e); return e; };
  const labelLayer = el('g'); const dimLayer = el('g'); const mapLayer = el('g');
  const v3 = new THREE.Vector3();
  const toScreen = (p) => { v3.set(p[0], p[1], p[2]).project(camera); return [(v3.x * 0.5 + 0.5) * W, (-v3.y * 0.5 + 0.5) * H, v3.z]; };
  const G = (lx, ly, lz, b) => { const c = Math.cos(b.phi), s = Math.sin(b.phi); return [b.x + lx * c + lz * s, ly, b.z - lx * s + lz * c]; };
  const ANC = ven.anchors;
  const labels = [
    [1.8, 9.4, () => [FUS.x - 60, 16, FUS.z - 42], 'FUSINA'],
    [11.7, 17.0, (b) => G(0, 1.9, 2.2, b), 'ESCENARIO', 1],
    [12.0, 17.0, (b) => G(3.6, 4.0, 1.0, b), 'GRADAS', 1],
    [12.3, 17.0, (b) => G(-3.7, 8.9, 1.0, b), 'GALERÍAS', 1],
    [12.6, 17.0, (b) => G(6.0, 12.6, 0.4, b), 'ESCALERAS', 1],
    [31.6, 34.6, () => [-150, 22, 640], 'GIUDECCA'],
    [34.8, 38.2, () => ANC.sgiorgio, 'SAN GIORGIO MAGGIORE'],
    [38.6, 41.8, () => ANC.campanile, 'CAMPANILE DI SAN MARCO'],
    [38.9, 41.8, () => ANC.ducale, 'PALAZZO DUCALE'],
    [39.2, 41.8, () => ANC.sanmarco, 'PIAZZETTA'],
    [42.0, 45.6, () => ANC.dogana, 'PUNTA DELLA DOGANA'],
    [42.3, 45.6, () => ANC.salute, 'LA SALUTE'],
    [57.1, 62.5, () => [DUB.x - 60, 70, DUB.z - 175], 'MINČETA'],
    [57.4, 62.5, () => [DUB.x + 250, 34, DUB.z + 150], 'SV. IVAN'],
    [57.7, 62.5, () => [DUB.x - 20, 30, DUB.z], 'STRADUN'],
  ];
  const labelEls = labels.map(l => { const g = el('g', {}, labelLayer); el('circle', { r: 3.2, fill: '#1A1B20' }, g); el('line', { stroke: '#1A1B20', 'stroke-width': 1.2 }, g); const tx = el('text', { class: 'lab' }, g); tx.textContent = l[3]; return g; });
  const stops = [['VENECIA', proj(12.337, 45.431)], ['POREČ', proj(13.5945, 45.2272)], ['ROVINJ', proj(13.6386, 45.0811)], ['NIN', proj(15.1866, 44.2420)], ['DUBROVNIK', [DUB.x, DUB.z]]];
  const routePath = el('path', { fill: 'none', stroke: '#E2401C', 'stroke-width': 4, 'stroke-dasharray': '10 8', 'stroke-linecap': 'round' }, mapLayer);
  const stopEls = stops.map(s => { const g = el('g', {}, mapLayer); el('circle', { r: 7, fill: '#F2F1EC', stroke: '#1A1B20', 'stroke-width': 2.5 }, g); const tx = el('text', { class: 'maplab' }, g); tx.textContent = s[0]; return g; });
  const bmark = el('g', {}, svg); el('circle', { r: 26, fill: 'none', stroke: '#E2401C', 'stroke-width': 3 }, bmark);
  const marker = el('rect', { width: 18, height: 12, fill: '#E2401C', stroke: '#1A1B20', 'stroke-width': 2 }, mapLayer);
  const dims = [
    { a: (b) => G(-4.75, DECK, 4.75 + 0.0, b), b: (b) => G(4.75, DECK, 4.75, b), off: [0, -1, 0], txt: '9,5 m' },
    { a: (b) => G(4.75, DECK, 4.75, b), b: (b) => G(4.75, DECK + 11, 4.75, b), txt: '11 m', side: 1 },
    { a: (b) => G(-7.3, DECK, 1.8, b), b: (b) => G(-7.3, DECK + 25, 1.8, b), txt: '25 m', side: -1 },
  ];
  const dimEls = dims.map(() => { const g = el('g', {}, dimLayer); el('line', { stroke: '#E2401C', 'stroke-width': 2.2 }, g); el('line', { stroke: '#E2401C', 'stroke-width': 2.2 }, g); el('line', { stroke: '#E2401C', 'stroke-width': 2.2 }, g); const tx = el('text', { class: 'dim' }, g); return g; });

  const subs = [
    [1.9, 5.3, 'Se construye en Fusina en 1979: sobre una balsa de vigas de acero, un esqueleto de tubos.'],
    [5.5, 7.1, 'Forrado de madera, por fuera y por dentro.'],
    [7.3, 9.9, 'Un cubo de 9,5 × 9,5 m y 11 m de alto. 25 m de altura total.'],
    [10.2, 13.6, 'Dentro, el escenario es un pasillo entre dos gradas enfrentadas.'],
    [13.8, 17.1, 'Encima, galerías: 250 personas sentadas, hasta 400 en total.'],
    [19.4, 26.6, 'El 10 de noviembre de 1979 un remolcador lo saca de Fusina…'],
    [26.8, 34.2, '…y cruza la laguna hasta el Bacino di San Marco.'],
    [42.0, 46.0, 'Se inaugura el 11 de noviembre. En febrero de 1980 acoge el Carnaval del Teatro.'],
    [46.2, 51.6, 'En verano de 1980 cruza el Adriático, con escalas en Poreč, Rovinj y Nin…'],
    [51.8, 57.1, '…hasta el festival de teatro de Dubrovnik.'],
    [63.0, 68.0, 'En 1981 se desmonta.'],
  ];
  const kick = [[0, '004 · VENECIA, 1979'], [1.9, '01 · FUSINA, 1979'], [10.0, '02 · POR DENTRO'], [19.0, '03 · LA LAGUNA'], [38.4, '04 · BACINO DI SAN MARCO'], [41.8, '05 · PUNTA DELLA DOGANA'], [45.9, '06 · EL ADRIÁTICO'], [56.9, '07 · DUBROVNIK · VERANO DE 1980'], [62.6, '08 · 1981'], [68.4, '004 · VENECIA, 1979']];

  function groupOpacity(obj, op) {
    for (const m of obj.mats || []) setFillOpacity(m, op);
    for (const m of obj.lineMats || []) setLineOpacity(m, op);
    obj.group.visible = op > 0.002;
  }

  window.renderAt = (t) => {
    const b = bargeState(t);
    theatre.group.position.set(b.x, 0, b.z); theatre.group.rotation.y = b.phi;
    // construction / dismantling
    const hT = t < 50 ? lerp(DECK - 0.05, 26.7, sm(seg(t, 0.4, 3.6))) : lerp(26.7, DECK - 0.05, sm(seg(t, 66.9, 68.6)));
    const hC = t < 50 ? lerp(DECK - 0.05, 26.7, sm(seg(t, 2.3, 7.0))) : lerp(26.7, DECK - 0.05, sm(seg(t, 64.2, 67.4)));
    clipTubes.constant = hT; clipCladding.constant = hC;
    theatre.tubes.visible = hT > DECK && ((t > 0.3 && t < 7.6) || (t > 63.8)); theatre.clad.visible = hC > DECK;
    // section: keep local z <= k (cut faces the camera side)
    const k = t < 30 ? lerp(12, 0.0, smr(seg(t, 9.8, 11.6))) + lerp(0, 12, smr(seg(t, 17.0, 18.7))) : 12;
    const nx = -Math.sin(b.phi) * 0 + 0, cph = Math.cos(b.phi), sph = Math.sin(b.phi);
    const nW = new THREE.Vector3(-sph, 0, -cph);       // local -z in world
    clipSection.normal.copy(nW); clipSection.constant = -(nW.x * b.x + nW.z * b.z) + k;
    // tug
    let tg;
    const moving = b.path && b.moving;
    if (moving) { const sTug = b.s + 44; const [x, z] = smoothAt(b.path, sTug, 30); tg = { x, z, phi: heading(b.path, sTug, 40) }; }
    else { const off = G(42, 0, 0, b); tg = { x: off[0], z: off[2], phi: b.phi }; }
    if (b.path === VP && t >= 41.6) { const off = G(16, 0, -26, b); tg = { x: off[0], z: off[2], phi: b.phi + 0.3 }; }
    if (b.path === VP && t > 40.2 && t < 41.6) { const off = G(16, 0, -26, b); const k2 = sm(seg(t, 40.2, 41.6)); tg = { x: lerp(tg.x, off[0], k2), z: lerp(tg.z, off[2], k2), phi: lerp(tg.phi, b.phi + 0.3, k2) }; }
    if (b.path === SP && t > 56.2) { const off = G(-2, 0, -22, b); const k2 = sm(seg(t, 56.2, 57.9)); tg = { x: lerp(tg.x, off[0], k2), z: lerp(tg.z, off[2], k2), phi: lerp(tg.phi, b.phi, k2) }; }
    tug.group.position.set(tg.x, 0, tg.z); tug.group.rotation.y = tg.phi;
    // tow line (catenary-ish) while under way
    const towOn = (t > 19.4 && t < 40.6) || (t > 45.8 && t < 56.8);
    tow.visible = towOn;
    if (towOn) { const a = G(12, DECK + 0.3, 0, b); const c = Math.cos(tg.phi), s = Math.sin(tg.phi); const e = [tg.x - 9 * c, 1.8, tg.z + 9 * s]; const arr = [];
      for (let i = 0; i < 12; i++) { const u0 = i / 12, u1 = (i + 1) / 12; const p = (u) => [lerp(a[0], e[0], u), lerp(a[1], e[1], u) - Math.sin(Math.PI * u) * 1.2, lerp(a[2], e[2], u)]; arr.push(...p(u0), ...p(u1)); }
      tow.geometry.setPositions(arr); }
    // camera
    const C = cameraAt(t, b);
    if (window.COVER) { C.tg = [b.x - 1.5, 19.5, b.z + 1]; C.z = 30; C.az = 33 * Math.PI / 180; C.el = 29 * Math.PI / 180; }
    const asp = W / H;
    camera.left = -C.z * asp; camera.right = C.z * asp; camera.top = C.z; camera.bottom = -C.z;
    const dist = Math.max(900, C.z * 9);
    const dir = new THREE.Vector3(Math.sin(C.az) * Math.cos(C.el), Math.sin(C.el), Math.cos(C.az) * Math.cos(C.el));
    camera.position.set(C.tg[0] + dir.x * dist, C.tg[1] + dir.y * dist, C.tg[2] + dir.z * dist);
    camera.up.set(0, 1, 0); camera.lookAt(C.tg[0], C.tg[1], C.tg[2]);
    camera.near = 1; camera.far = dist * 2 + C.z * 12; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    // environment visibility
    const zoom = C.z;
    groupOpacity(fus, window.COVER ? 0 : Math.min(sm(seg(t, 1.4, 4.4)), 1 - sm(seg(t, 22.5, 25.0))));
    const venOp = Math.min(sm(seg(t, 20.0, 23.5)), 1 - sm(seg(t, 47.5, 49.5)));
    groupOpacity(ven, venOp);
    ven.buildings.visible = venOp > 0 && zoom < 1300;
    { const bo = venOp * (1 - sm(seg(zoom, 800, 1300))); for (const m of ven.buildings.userData.mats || []) setFillOpacity(m, bo); for (const m of ven.buildings.userData.lms || []) setLineOpacity(m, bo); }
    const mapOp = Math.min(sm(seg(t, 44, 46)), 1 - sm(seg(t, 55.8, 57.2))) * sm(seg(zoom, 1500, 5000));
    groupOpacity(map, mapOp);
    map.group.position.y = Math.max(0.3, zoom * 0.0006);
    const dubOp = Math.min(sm(seg(t, 53.0, 56.0)), 1 - sm(seg(t, 62.2, 65.6)));
    groupOpacity(dub, dubOp); dub.terrain.uniforms.uOp.value = dubOp;
    groupOpacity(tug, window.COVER ? 0 : Math.min(sm(seg(t, 2.0, 4.5)), 1 - sm(seg(t, 62.4, 65.0))));
    setLineOpacity(towMat, 1);
    // water: masked around the barge at both ends of the film
    const maskR = t < 30 ? lerp(34, 6000, smr(seg(t, 1.0, 5.5))) : lerp(6000, 34, smr(seg(t, 62.4, 67.4)));
    const WK = [[0, 0], [19.6, 0], [22.0, 5], [32.6, 5], [34.6, 90], [37.6, 90], [39.2, 139.5], [41.4, 139.5], [43.0, 40.6], [46.5, 40.6], [49.5, 0], [80, 0]];
    let wi = 1; while (wi < WK.length - 1 && WK[wi][0] < t) wi++;
    const wa = WK[wi - 1], wb = WK[wi]; const wm = wa[1] === wb[1] ? 0 : sm(seg(t, wa[0], wb[0]));
    updateWater(water, new THREE.Vector3(C.tg[0], 0, C.tg[2]), zoom, C.el, { x: b.x, z: b.z }, window.COVER ? 44 : (maskR > 5000 ? 0 : maskR), 1, wa[1] * Math.PI / 180, wb[1] * Math.PI / 180, wm);
    // theatre fades at map scale
    const thOp = 1 - sm(seg(zoom, 2500, 9000));
    theatre.group.visible = thOp > 0.01; tug.group.visible = tug.group.visible && thOp > 0.01;

    renderer.render(scene, camera);

    // ---------- overlay ----------
    const title = Math.max(1 - sm(seg(t, 1.5, 2.1)), sm(seg(t, 68.5, 69.1)));
    $('title').style.opacity = title;
    let kt = kick[0][1]; let kStart = 0; for (const [s, txt] of kick) if (t >= s) { kt = txt; kStart = s; }
    $('kicker').textContent = kt; $('kicker').style.opacity = Math.min(1, (t - kStart) / 0.4 + (kStart === 0 ? 1 : 0));
    let sub = '', so = 0; for (const [a, bb, txt] of subs) { const o = fadeWin(t, a, bb, 0.35); if (o > 0) { sub = txt; so = o; } }
    $('sub').textContent = sub; $('sub').style.opacity = so;
    labels.forEach((l, i) => { const o = fadeWin(t, l[0], l[1], 0.4); const g = labelEls[i]; if (o <= 0) { g.style.display = 'none'; return; }
      const p = toScreen(l[2](b)); g.style.display = ''; g.setAttribute('opacity', o);
      const dx = l[4] ? 0 : 0; const ty = p[1] - 34;
      g.children[0].setAttribute('cx', p[0]); g.children[0].setAttribute('cy', p[1]);
      g.children[1].setAttribute('x1', p[0]); g.children[1].setAttribute('y1', p[1]); g.children[1].setAttribute('x2', p[0]); g.children[1].setAttribute('y2', ty + 6);
      g.children[2].setAttribute('x', p[0]); g.children[2].setAttribute('y', ty); });
    // dimensions
    const dO = window.COVER ? 0 : fadeWin(t, 7.2, 9.9, 0.35);
    dims.forEach((d, i) => { const g = dimEls[i]; if (dO <= 0) { g.style.display = 'none'; return; } g.style.display = ''; g.setAttribute('opacity', dO);
      const A = toScreen(d.a(b)), Bp = toScreen(d.b(b)); let nx = -(Bp[1] - A[1]), ny = Bp[0] - A[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const off = 26 * (d.side || 1) * (i === 0 ? 1 : -1); const a2 = [A[0] + nx * off, A[1] + ny * off], b2 = [Bp[0] + nx * off, Bp[1] + ny * off];
      const [l0, l1, l2, tx] = g.children; l0.setAttribute('x1', a2[0]); l0.setAttribute('y1', a2[1]); l0.setAttribute('x2', b2[0]); l0.setAttribute('y2', b2[1]);
      const tk = (L, P) => { L.setAttribute('x1', P[0] - nx * 9 - (b2[0] - a2[0]) / nl * 0); L.setAttribute('y1', P[1] - ny * 9); L.setAttribute('x2', P[0] + nx * 9); L.setAttribute('y2', P[1] + ny * 9); };
      tk(l1, a2); tk(l2, b2); tx.textContent = d.txt; tx.setAttribute('x', (a2[0] + b2[0]) / 2 + nx * 22); tx.setAttribute('y', (a2[1] + b2[1]) / 2 + ny * 22 + 8); });
    { const o = sm(seg(zoom, 900, 1500)) * (1 - sm(seg(zoom, 9000, 20000))); bmark.style.display = o > 0.01 ? '' : 'none'; if (o > 0.01) { const p = toScreen([b.x, 4, b.z]); bmark.setAttribute('opacity', o); bmark.children[0].setAttribute('cx', p[0]); bmark.children[0].setAttribute('cy', p[1]); } }
    // map overlay
    const mO = sm(seg(zoom, 15000, 60000));
    mapLayer.style.display = mO > 0.01 ? '' : 'none'; mapLayer.setAttribute('opacity', mO);
    if (mO > 0.01) {
      const pts = SP.pts.map(p => toScreen([p[0], 0, p[1]]));
      routePath.setAttribute('d', 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L'));
      const total = pts.reduce((acc, p, i) => i ? acc + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);
      const prog = b.path === SP ? b.s / SP.len : (t < 45.6 ? 0 : 1);
      // draw route up to current progress
      let acc = 0, cut = total; for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (SP.L[i] / SP.len >= prog) { const f = (prog * SP.len - SP.L[i - 1]) / (SP.L[i] - SP.L[i - 1]); cut = acc + L * clamp(f); break; } acc += L; }
      routePath.setAttribute('stroke-dasharray', `${cut} ${total + 10}`);
      stops.forEach((s, i) => { const p = toScreen([s[1][0], 0, s[1][1]]); const g = stopEls[i]; g.children[0].setAttribute('cx', p[0]); g.children[0].setAttribute('cy', p[1]); const tx = g.children[1]; tx.setAttribute('x', p[0] + (i === 0 ? -16 : 16)); tx.setAttribute('y', p[1] + 9); tx.setAttribute('text-anchor', i === 0 ? 'end' : 'start'); });
      const mp = toScreen([b.x, 0, b.z]); marker.setAttribute('x', mp[0] - 9); marker.setAttribute('y', mp[1] - 6);
    }
    return true;
  };
  window.DBG = { map, water, scene, camera, ven, dub, renderer };
  window.READY = true;
}
