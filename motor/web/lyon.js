import { THREE, W, H, PAPER, LIGHT, viewToWorld, fillMat, lineMat, segs, geomFrom, upTri, merge } from './lib.js';
// 010 · Bloques cebra — tramo de Lyon: îlot A3 de Lyon Confluence 2 en su entorno real (IGN BD TOPO, Licence Ouverte 2.0).
// Coordenadas locales: x = este, z = -norte, en metros desde Lambert-93 (841575, 6517425). Alturas: atributo "hauteur" de la BD TOPO.
// Los edificios sin altura en la BD TOPO se dibujan solo en planta (no se inventa su volumen).
const $ = (id) => document.getElementById(id);
const LW = { A: 1.8, B: 1.0, C: 0.5 }; const INK = '#1A1B20', GREY = '#9A978F', RED = '#E2401C';
const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
// planta (contorno + patios) extruida entre y0 e y1: muros, cubierta plana y líneas de cubierta, arranque y esquinas reales
function extrude(rings, y0, y1, P, B, T, E, o = {}) {
  const R = rings.map((r, i) => { const s = area(r); return (i === 0 ? s < 0 : s > 0) ? [...r].reverse() : r; });
  const push = (a, b, c) => { P.push(...a, ...b, ...c); B.push(y0, y0, y0); T.push(y1, y1, y1); };
  const cosC = Math.cos((o.corner ?? 24) * Math.PI / 180);
  for (const r of R) {
    const n = r.length;
    for (let i = 0; i < n; i++) {
      const a = r[i], b = r[(i + 1) % n], pr = r[(i - 1 + n) % n];
      push([a[0], y0, a[1]], [a[0], y1, a[1]], [b[0], y1, b[1]]); push([a[0], y0, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]]);
      E.push(a[0], y1, a[1], b[0], y1, b[1]);
      if (o.base) E.push(a[0], y0 + 0.03, a[1], b[0], y0 + 0.03, b[1]);
      const e1 = [a[0] - pr[0], a[1] - pr[1]], e2 = [b[0] - a[0], b[1] - a[1]];
      const c = (e1[0] * e2[0] + e1[1] * e2[1]) / ((Math.hypot(...e1) * Math.hypot(...e2)) || 1);
      if (c < cosC) E.push(a[0], y0, a[1], a[0], y1, a[1]);
    }
  }
  const v2 = (r) => r.map(p => new THREE.Vector2(p[0], p[1]));
  const faces = THREE.ShapeUtils.triangulateShape(v2(R[0]), R.slice(1).map(v2)); const pts = R.flat();
  for (const f of faces) { const p = f.map(i => [pts[i][0], y1, pts[i][1]]); push(...upTri(p[0], p[1], p[2])); }
}
const ORDER = ['568291', '568867', '568495', '568890', '568935', '569058', '568304', '569173'];   // cours Charlemagne primero, la torre la última
export async function init() {
  LIGHT.set(0.62, 1.0, 0.42).normalize();
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
  const D = await fetch('lyon.json').then(r => r.json());
  const ctxM = fillMat('#F4F2EC', { hatch: 0, side: 0.975, shade: 0.94 }), a3M = fillMat('#F4F2EC', { hatch: 1, side: 0.94, shade: 0.84 }), hallM = fillMat(RED, { hatch: 1, side: 0.9, shade: 0.8 }), inkM = fillMat(INK, { hatch: 0 });
  const G = { ctx: new THREE.Group(), hall: new THREE.Group(), a3: [], ppl: new THREE.Group() }; scene.add(G.ctx, G.hall, G.ppl);
  // ---- entorno: volúmenes con altura oficial; los que no la tienen, solo la huella en gris
  { const P = [], B = [], T = [], E = [], F = [];
    for (const b of D.blds) {
      if (b.k === 'a3' || b.k === 'hall') continue;
      if (b.h === null || b.h === undefined) { for (const r of b.r) for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length]; F.push(a[0], 0.03, a[1], c[0], 0.03, c[1]); } continue; }
      extrude(b.r, 0, Math.max(b.h, 2.5), P, B, T, E, { base: true });
    }
    G.ctx.add(new THREE.Mesh(geomFrom(P, B, T), ctxM)); G.ctx.add(segs(E, lineMat(INK, LW.C))); G.ctx.add(segs(F, lineMat(GREY, LW.C))); }
  // ---- la nave del antiguo mercado de flores (bermellón) y los ocho edificios nuevos, cada uno en su grupo para crecer
  for (const b of D.blds) {
    if (b.k !== 'a3' && b.k !== 'hall') continue;
    const P = [], B = [], T = [], E = []; extrude(b.r, 0, b.h, P, B, T, E, { base: true });
    const g = new THREE.Group(); g.add(new THREE.Mesh(geomFrom(P, B, T), b.k === 'hall' ? hallM : a3M)); g.add(segs(E, lineMat(b.k === 'hall' ? '#8E2410' : INK, LW.B)));
    if (b.k === 'hall') G.hall.add(g); else { g.userData.id = b.id; g.userData.h = b.h; scene.add(g); G.a3.push(g); }
  }
  G.a3.sort((p, q) => ORDER.indexOf(p.userData.id) - ORDER.indexOf(q.userData.id));
  // ---- gente en tinta por las aceras del îlot (fuera de la manzana: el patio no se da por público)
  const manG = (() => { const c = new THREE.CylinderGeometry(0.24, 0.24, 1.3, 10); c.translate(0, 0.65, 0); const h = new THREE.SphereGeometry(0.24, 10, 8); h.translate(0, 1.55, 0); return merge([c.toNonIndexed(), h.toNonIndexed()]); })();
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const walkers = D.ppl.map(([x, z, dx, dz]) => { const m = new THREE.Mesh(manG, inkM); G.ppl.add(m); return { m, x, z, dx, dz, a: 2 + rnd() * 5, w: 0.25 + rnd() * 0.35, ph: rnd() * 6.28 }; });
  const walk = (t) => { for (const k of walkers) { const s = k.a * Math.sin(k.w * t + k.ph); k.m.position.set(k.x + k.dx * s, Math.abs(Math.sin(k.w * t * 6 + k.ph)) * 0.08, k.z + k.dz * s); } };
  walk(0);
  scene.traverse(o => { o.frustumCulled = false; });
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u, fw = (t, a, b, f = 0.3) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
  const P2 = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
  // o: { tg, z, az, el, grow (0-1 por edificio, array) , ppl, t, labels: [[texto, [x,y,z], opacidad]], title, kick }
  window.shot = (o) => {
    const gr = o.grow ?? G.a3.map(() => 1);
    G.a3.forEach((g, i) => { const s = Math.max(0.0005, gr[i] ?? 1); g.scale.y = s; g.visible = (gr[i] ?? 1) > 0.002; });
    G.ppl.visible = (o.ppl ?? 1) > 0.5; walk(o.t ?? 0);
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, t = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 3000; camera.position.set(t[0] + Math.sin(az) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); camera.lookAt(t[0], t[1], t[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    $('kicker').textContent = o.kick ?? '010 · BLOQUES CEBRA';
    $('title').textContent = o.title || ''; $('title').style.opacity = o.titleOp ?? (o.title ? 1 : 0); $('sub').style.opacity = 0;
    const svg = $('ov'); svg.innerHTML = '';
    for (const [txt, p, op0] of (o.labels || [])) { const q = P2(p); const half = txt.length * 9 + 30; const op = op0 * clamp(Math.min(q[0] - half, W - half - q[0], q[1] - 420, H - 460 - q[1]) / 60); if (op < 0.02) continue; svg.insertAdjacentHTML('beforeend', `<text class="maplab" x="${q[0]}" y="${q[1]}" text-anchor="middle" opacity="${op}">${txt}</text>`); }
    return true;
  };
  // ---- línea de tiempo del tramo (t en segundos del vídeo completo: 22 a 40)
  const K = [
    { t: 22.0, tg: [0, 0, -10], z: 210, az: -30, el: 89 },
    { t: 24.6, tg: [0, 4, 0], z: 168, az: 30, el: 70 },
    { t: 27.6, tg: [2, 10, 4], z: 112, az: 95, el: 50 },
    { t: 30.6, tg: [5, 12, 5], z: 100, az: 120, el: 46 },
    { t: 33.8, tg: [6, 12, -6], z: 138, az: 150, el: 40 },
    { t: 36.8, tg: [12, 11, 16], z: 58, az: 108, el: 28 },
    { t: 40.0, tg: [14, 10, 20], z: 44, az: 118, el: 22 } ];
  const words = [[22.4, 25.2, 'Lyon, 2012–2018.'], [25.4, 29.4, 'La nave vieja se queda.'], [29.8, 32.4, 'Nueve edificios, seis arquitectos.'], [32.6, 35.2, 'Cose con el barrio viejo.'], [35.6, 39.4, 'La nave, hoy gimnasio.']];
  const LAB = { charl: [-55, 0, -41], casi: [41, 0, -64], sb: [40, 0, -78], smith: [39, 0, 7] };
  window.renderAt = (tt) => {
    let i = 1; while (i < K.length - 1 && K[i].t < tt) i++; const a = K[i - 1], b = K[i]; const u = smr(seg(tt, a.t, b.t));
    const grow = G.a3.map((g, j) => { const t0 = 24.6 + j * 0.4, dur = j === G.a3.length - 1 ? 2.4 : 1.8; return smr(seg(tt, t0, t0 + dur)); });
    let tw = '', to = 0; for (const [a0, b0, tx] of words) { const f = fw(tt, a0, b0, 0.22); if (f > 0) { tw = tx; to = f; } }
    const labels = [['ÎLOT A3 · LYON CONFLUENCE', [0, 0, -28], fw(tt, 22.4, 25.2, 0.3)], ['COURS CHARLEMAGNE', LAB.charl, 0.85 * fw(tt, 26.2, 31.4, 0.4)], ['RUE CASIMIR PÉRIER', LAB.casi, 0.85 * fw(tt, 26.2, 35.2, 0.4)], ['SAINTE-BLANDINE · S. XIX', LAB.sb, fw(tt, 32.6, 35.2, 0.3)]];
    return window.shot({ t: tt, tg: a.tg.map((v, j) => lerp(v, b.tg[j], u)), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), az: lerp(a.az, b.az, u), el: lerp(a.el, b.el, u),
      grow, ppl: tt > 29.8 ? 1 : 0, labels, title: tw, titleOp: to });
  };
  window.READY = true;
}
