import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, geomFrom, upTri, merge, boxG, edgesOf, pointInRing } from './lib.js';
const $ = (id) => document.getElementById(id);
const LW = { A: 1.8, B: 1.0, C: 0.5 }; const INK = '#1A1B20', RED = '#E2401C';
const flatM = (c) => fillMat(c, { hatch: 0, side: 1, shade: 1 });
const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
const orient = (rings) => rings.map((r, i) => { const s = area(r); return (i === 0 ? s < 0 : s > 0) ? [...r].reverse() : r; });
function push3(P, B, T, y0, y1, a, b, c) { P.push(...a, ...b, ...c); B.push(y0, y0, y0); T.push(y1, y1, y1); }
function extrude(rings, y0, y1, A, E, o = {}) {
  const R = orient(rings);
  for (const r of R) for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], pr = r[(i - 1 + r.length) % r.length];
    push3(A.P, A.B, A.T, y0, y1, [a[0], y0, a[1]], [a[0], y1, a[1]], [b[0], y1, b[1]]); push3(A.P, A.B, A.T, y0, y1, [a[0], y0, a[1]], [b[0], y1, b[1]], [b[0], y0, b[1]]);
    E.push(a[0], y1, a[1], b[0], y1, b[1], a[0], y0 + 0.03, a[1], b[0], y0 + 0.03, b[1]);
    const e1 = [a[0] - pr[0], a[1] - pr[1]], e2 = [b[0] - a[0], b[1] - a[1]];
    if ((e1[0] * e2[0] + e1[1] * e2[1]) / ((Math.hypot(...e1) * Math.hypot(...e2)) || 1) < Math.cos((o.corner ?? 24) * Math.PI / 180)) E.push(a[0], y0, a[1], a[0], y1, a[1]);
  }
  const v2 = (r) => r.map(p => new THREE.Vector2(p[0], p[1])); const faces = THREE.ShapeUtils.triangulateShape(v2(R[0]), R.slice(1).map(v2)); const pts = R.flat();
  for (const f of faces) { const p = f.map(i => [pts[i][0], y1, pts[i][1]]); push3(A.P, A.B, A.T, y0, y1, ...upTri(p[0], p[1], p[2])); }
}
function addBox(A, E, x0, x1, y0, y1, z0, z1, edges = true) {
  const g = boxG(x0, x1, y0, y1, z0, z1), p = g.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) { A.P.push(p[i], p[i + 1], p[i + 2]); A.B.push(y0); A.T.push(y1); }
  if (edges) E.push(...edgesOf(g));
}
const withBT = (g, y0, y1) => { const n = g.index ? g.toNonIndexed() : g; const c = n.attributes.position.count;
  n.setAttribute('aBase', new THREE.Float32BufferAttribute(new Float32Array(c).fill(y0), 1)); n.setAttribute('aTop', new THREE.Float32BufferAttribute(new Float32Array(c).fill(y1), 1)); return n; };
const mk = () => ({ P: [], B: [], T: [] });
const mesh = (A, M) => new THREE.Mesh(geomFrom(A.P, A.B, A.T), M);

// 012 · ¿Un andamio en el centro de París? Centre Pompidou (Piano, Rogers, Franchini; ingeniería Peter Rice / Arup), concurso de 1971, inaugurado en 1977.
// Entorno: IGN BD TOPO V3 (edificios con altura) y superficies de agua. Marco del edificio: huella BD TOPO. Estructura: 14 pórticos cada 12,8 m (166,4 m),
// pilares a 48 m (vigas de 48 m), ménsulas «gerberettes» hasta 60 m de ancho, 6 niveles sobre la plaza, 42 m de altura. Plaza en pendiente al oeste.
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 20000);
  const D = await fetch('v012.json').then(r => r.json());
  const paperM = flatM('#F6F5F1'), inkM = flatM(INK), redM = fillMat(RED, { hatch: 0, side: 0.93, shade: 0.8 }), waterM = flatM('#DCE3E5');
  const steelM = fillMat('#F5F4F0', { hatch: 0, side: 0.92, shade: 0.74 }), ductM = fillMat('#D8D6CF', { hatch: 0, side: 0.9, shade: 0.7 }), glassM = fillMat('#C9CDCC', { hatch: 0, side: 0.95, shade: 0.85 });
  const tintM = flatM('#F4D9CF'), carM = flatM('#4A4B50');
  // ---------- entorno: el Marais en línea gris clara ----------
  const CTX = new THREE.Group(); scene.add(CTX);
  { const A = mk(), E = []; for (const b of D.blds) extrude([b.r], 0, b.h, A, E, { corner: 30 }); CTX.add(mesh(A, paperM)); CTX.add(segs(E, lineMat('#9C998F', 0.5)));
    const Aw = mk(); for (const r of D.water) { const v2 = r.map(p => new THREE.Vector2(p[0], p[1])); try { const f = THREE.ShapeUtils.triangulateShape(v2, []); for (const t of f) { const p = t.map(i => [r[i][0], -0.3, r[i][1]]); push3(Aw.P, Aw.B, Aw.T, -1, 0, ...upTri(p[0], p[1], p[2])); } } catch (e) {} }
    CTX.add(mesh(Aw, waterM)); }
  // ---------- marco del edificio: u a lo largo (hacia el NNE), v hacia el este; y = 0 en la planta de la plaza ----------
  const PC = D.pomp.c, AXp = D.pomp.ax, BG = new THREE.Group(); BG.position.set(PC[0], 0, PC[1]); BG.rotation.y = Math.atan2(-AXp[1], AXp[0]); scene.add(BG); BG.updateMatrixWorld();
  const Wp = (u, y, v) => new THREE.Vector3(u, y, v).applyMatrix4(BG.matrixWorld).toArray();
  const U0 = -83.2, BAY = 12.8, NF = 14, LV = [7, 14, 21, 28, 35, 42], VC = 24, VT = 30;
  const cyl = (r, h, seg = 12) => { const g = new THREE.CylinderGeometry(r, r, h, seg, 1, false); g.translate(0, h / 2, 0); return g; };
  const addGeo = (grp, g, M, edges = 32, lw = LW.C, col = INK) => { const n = withBT(g, 0, 42); grp.add(new THREE.Mesh(n, M)); if (edges) grp.add(segs(edgesOf(n, edges), lineMat(col, lw))); };
  // pórticos: pilares, gerberettes, vigas de celosía, tirantes y cruces de San Andrés (cada pórtico, un grupo que crece)
  const FR = [];
  const gerbShape = (() => { const s = new THREE.Shape(); s.moveTo(-2.6, -0.9); s.lineTo(0.0, -1.0); s.quadraticCurveTo(1.6, -0.6, 6.2, 0.1); s.lineTo(6.4, 0.45); s.lineTo(0.0, 0.55); s.lineTo(-2.6, 0.45); s.lineTo(-2.6, -0.9); return s; })();
  for (let i = 0; i < NF; i++) {
    const u = U0 + i * BAY, g = new THREE.Group(); BG.add(g); FR.push(g); const E = [], Et = [];
    for (const sv of [-1, 1]) {
      const col = cyl(0.43, 42.6, 12); col.translate(u, 0, sv * VC); addGeo(g, col, steelM, 40, LW.B);
      for (const y of LV) { const geo = new THREE.ExtrudeGeometry(gerbShape, { depth: 0.6, bevelEnabled: false }); geo.translate(0, 0, -0.3);
        const m = new THREE.Matrix4().makeRotationY(sv > 0 ? -Math.PI / 2 : Math.PI / 2); geo.applyMatrix4(m); geo.translate(u, y - 0.6, sv * VC); addGeo(g, geo, steelM, 30, LW.B); }
      Et.push(u, 0, sv * VT, u, 42.6, sv * VT);                                                        // tirante exterior
    }
    for (const y of LV) { const yb = y - 2.6, n = 12;                                                    // viga de celosía de 48 m entre pilares
      E.push(u, y, -VC + 2.2, u, y, VC - 2.2, u, yb, -VC + 3.5, u, yb, VC - 3.5);
      for (let k = 0; k < n; k++) { const v0 = -VC + 3.5 + k * (2 * VC - 7) / n, v1 = v0 + (2 * VC - 7) / n; E.push(u, yb, v0, u, y, (v0 + v1) / 2, u, y, (v0 + v1) / 2, u, yb, v1); } }
    g.add(segs(E, lineMat(INK, 0.55))); g.add(segs(Et, lineMat(INK, LW.C)));
  }
  // cruces de San Andrés en los planos de fachada, y forjados, vidrio, conductos y cubierta: aparecen al final del montaje
  const SKIN = new THREE.Group(); BG.add(SKIN);
  { const E = [], A = mk(), Eg = [];
    for (let i = 0; i < NF - 1; i++) { const u0 = U0 + i * BAY, u1 = u0 + BAY; for (const sv of [-1, 1]) for (let k = 0; k < 6; k++) { const y0 = k * 7, y1 = y0 + 7; E.push(u0, y0, sv * VT, u1, y1, sv * VT, u0, y1, sv * VT, u1, y0, sv * VT); } }
    for (const y of [0, ...LV]) addBox(A, Eg, U0 - 6, -U0 + 6, y - 0.35, y, -VC + 1.5, VC - 1.5, true);            // forjados
    SKIN.add(segs(E, lineMat(INK, 0.8))); SKIN.add(mesh(A, paperM)); SKIN.add(segs(Eg, lineMat(INK, LW.C)));
    const Ag = mk(), Em = []; for (const sv of [-1, 1]) { const v = sv * (VC - 1.6); addBox(Ag, [], U0 - 6, -U0 + 6, 0, 42, v - 0.02, v + 0.02, false);
      for (let u = U0 - 6; u <= -U0 + 6.01; u += BAY / 4) Em.push(u, 0, v + sv * 0.03, u, 42, v + sv * 0.03); for (const y of [3.5, ...LV.map(y => y - 3.5)]) Em.push(U0 - 6, y, v + sv * 0.03, -U0 + 6, y, v + sv * 0.03); }
    for (const su of [-1, 1]) { const uu = su * (-U0 + 6); addBox(Ag, [], uu - 0.02, uu + 0.02, 0, 42, -VC + 1.6, VC - 1.6, false); }
    SKIN.add(segs(Em, lineMat('#A9A79F', 0.4)));
    // conductos de instalaciones en la fachada este (rue du Renard) y chimeneas de ventilación en cubierta
    const D2 = new THREE.Group(); SKIN.add(D2); let sd = 3; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < NF - 1; i++) { const u0 = U0 + i * BAY; for (let k = 0; k < 4; k++) { const r = 0.35 + rr() * 0.75, uu = u0 + 1.6 + k * 2.9 + rr() * 0.6, vv = VC + 2.0 + rr() * 3.6, hh = 30 + rr() * 16;
      const gd = cyl(r, hh, 14); gd.translate(uu, 0, vv); addGeo(D2, gd, ductM, 40, LW.C); } }
    for (let k = 0; k < 6; k++) { const uu = U0 + 10 + k * 29, gd = cyl(1.9, 6.5, 18); gd.translate(uu, 42, VC - 3); addGeo(D2, gd, ductM, 40, LW.C); const cap = cyl(3.0, 1.2, 18); cap.translate(uu, 48.5, VC - 3); addGeo(D2, cap, ductM, 40, LW.C); } }
  // la escalera mecánica en su tubo («la chenille») por la fachada de la plaza: en bermellón, único color
  const ESC = new THREE.Group(); BG.add(ESC); let tubeGeo;
  { const vv = -VT - 2.6, pts = [[-74, 0.6]], nF = 5, run = 23, land = 7.6; let uu = -74, yy = 0.6;
    for (let k = 0; k < nF; k++) { uu += run; yy += 7; pts.push([uu, yy]); if (k < nF - 1) { uu += land; pts.push([uu, yy]); } }
    pts.push([uu, 42.0]);                                         // último tramo hasta la terraza
    const path = new THREE.CurvePath(); for (let k = 0; k < pts.length - 1; k++) path.add(new THREE.LineCurve3(new THREE.Vector3(pts[k][0], pts[k][1] + 1.6, vv), new THREE.Vector3(pts[k + 1][0], pts[k + 1][1] + 1.6, vv)));
    tubeGeo = withBT(new THREE.TubeGeometry(path, 260, 1.6, 14, false), 0, 42); ESC.add(new THREE.Mesh(tubeGeo, redM));
    const E = []; let L = 0; const seg = []; for (let k = 0; k < pts.length - 1; k++) { const a = pts[k], b = pts[k + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push([a, b, l, L]); L += l; }
    ESC.userData = { seg, L, vv };
    for (const [a, b, l] of seg) { const n = Math.max(1, Math.round(l / 1.8)); for (let j = 0; j <= n; j++) { const s = j / n, u = a[0] + (b[0] - a[0]) * s, y = a[1] + (b[1] - a[1]) * s + 1.6; for (let q = 0; q < 10; q++) { const t0 = q / 10 * Math.PI * 2, t1 = (q + 1) / 10 * Math.PI * 2; E.push(u, y + Math.sin(t0) * 1.62, vv + Math.cos(t0) * 1.62, u, y + Math.sin(t1) * 1.62, vv + Math.cos(t1) * 1.62); } } }
    const ringL = segs(E, lineMat('#8C2410', 0.45)); ESC.add(ringL); ESC.userData.rings = ringL; }
  // la plaza en pendiente (de la rue Saint-Martin, a +2,4 m, hasta el pie del edificio) con su gente; los coches del aparcamiento; los 681 proyectos
  const PW = D.plaza, PL = new THREE.Group(); BG.add(PL);
  { const A = mk(), E = []; const v0 = -VT - 0.5, v1 = -VT - PW, u0 = U0 - 4, u1 = -U0 + 4;
    const q = [[u0, 0.05, v0], [u1, 0.05, v0], [u1, 2.4, v1], [u0, 2.4, v1]]; push3(A.P, A.B, A.T, -1, 3, ...upTri(q[0], q[1], q[2])); push3(A.P, A.B, A.T, -1, 3, ...upTri(q[0], q[2], q[3]));
    for (let k = 0; k <= 4; k++) { const f = k / 4; E.push(u0, 0.08 + 2.35 * f, v0 + (v1 - v0) * f, u1, 0.08 + 2.35 * f, v0 + (v1 - v0) * f); }
    PL.add(mesh(A, tintM)); PL.add(segs(E, lineMat('#E7A48F', 0.5))); }
  const plazaY = (v) => 0.05 + 2.35 * Math.min(1, Math.max(0, (-VT - 0.5 - v) / (PW - 0.5)));
  const manG = (() => { const c = new THREE.CylinderGeometry(0.24, 0.24, 1.3, 8); c.translate(0, 0.65, 0); const h = new THREE.SphereGeometry(0.24, 8, 6); h.translate(0, 1.55, 0); return merge([c.toNonIndexed(), h.toNonIndexed()]); })();
  const pplM = flatM(RED); const PPL = []; let s2 = 11; const rn = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 150; k++) { const m = new THREE.Mesh(manG, pplM); BG.add(m); PPL.push({ m, u: U0 + rn() * (-2 * U0), v: -VT - 2 - rn() * (PW - 6), sp: (rn() - 0.5) * 1.2, ph: rn(), a: rn() }); }
  const carG = (() => { const b = new THREE.BoxGeometry(4.2, 1.0, 1.75); b.translate(0, 0.5, 0); const t = new THREE.BoxGeometry(2.2, 0.55, 1.6); t.translate(-0.2, 1.27, 0); return merge([b.toNonIndexed(), t.toNonIndexed()]); })();
  const CARS = []; { const A = []; for (let v = -VC + 3; v > -VT - PW + 4; v -= 6.2) for (let u = U0; u < -U0; u += 2.6) if (rn() < 0.86) A.push([u + rn() * 0.4, v + rn() * 0.6]);
    for (const [u, v] of A) { const m = new THREE.Mesh(carG, carM); m.position.set(u, v < -VT ? plazaY(v) : 0, v); m.rotation.y = Math.PI / 2 + (rn() - 0.5) * 0.1; BG.add(m); CARS.push({ m, d: rn() }); } }
  const BOARDS = []; { const gB = new THREE.BoxGeometry(2.5, 0.14, 2.5); gB.translate(0, 0.06, 0); const eB = edgesOf(gB, 30); const bw = flatM('#FBFAF7');
    for (let k = 0; k < 681; k++) { const col = k % 34, row = Math.floor(k / 34), u = -57 + col * 3.45, v = -14 - row * 3.45; const gr = new THREE.Group(); gr.position.set(u, v < -VT ? plazaY(v) : 0, v);
      const win = k === 492; if (win) gr.scale.set(1.6, 4, 1.6); gr.add(new THREE.Mesh(gB, win ? redM : bw)); gr.add(segs(eB, lineMat(win ? '#8C2410' : '#8B8A84', 0.45))); BG.add(gr); BOARDS.push({ gr, win, d: rn() }); } }
  // cotas
  const hAcross = (() => { for (const vv of [40, 44, 48, 52, 56]) { const p = Wp(-10, 0, vv); for (const b of D.blds) if (pointInRing([p[0], p[2]], b.r)) return { v: vv, h: b.h }; } return { v: 48, h: 20 }; })();
  scene.traverse(o => { o.frustumCulled = false; });
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }, smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
  const seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, u) => a + (b - a) * u, fw = (t, a, b, f = 0.3) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
  const P2 = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
  window.shot = (o) => {
    const t = o.t ?? 0, ph = o.ph ?? {};
    const bld = ph.build ?? 1; FR.forEach((g, i) => { const f = smr(clamp(bld * (NF + 4) - i * 1.0, 0, 1)); g.visible = f > 0.01; g.scale.y = Math.max(0.001, f); });
    const sk = ph.skin ?? 1; SKIN.visible = sk > 0.01; SKIN.scale.y = Math.max(0.001, sk);
    const es = ph.esc ?? 1; ESC.visible = es > 0.005; if (tubeGeo) { const n = tubeGeo.attributes.position.count; tubeGeo.setDrawRange(0, Math.floor(n * es)); }
    const pz = ph.plaza ?? 1; PL.visible = pz > 0.01; PL.children.forEach(c => { if (c.material && c.material.uniforms && c.material.uniforms.uOpacity) c.material.uniforms.uOpacity.value = pz; });
    PPL.forEach((p, k) => { const on = (ph.people ?? 1) > p.a; p.m.visible = on; if (!on) return; const u = p.u + p.sp * (t - 24), v = p.v; p.m.position.set(u, plazaY(v) + Math.abs(Math.sin(t * 4 + k)) * 0.05 * Math.abs(p.sp), v); });
    CARS.forEach(c => { c.m.visible = (ph.cars ?? 0) > c.d; });
    BOARDS.forEach(b => { const on = (ph.boards ?? 0) > b.d * 0.6; b.gr.visible = on && (b.win || (ph.losers ?? 1) > 0.5 + b.d * 0.5); });
    CTX.visible = o.ctx ?? true;
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, tg = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 9000; camera.position.set(tg[0] + Math.sin(az) * Math.cos(el) * d, tg[1] + Math.sin(el) * d, tg[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); camera.lookAt(tg[0], tg[1], tg[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    $('kicker').textContent = o.kick ?? '012'; $('title').textContent = o.title || ''; $('title').style.opacity = o.titleOp ?? (o.title ? 1 : 0); $('sub').style.opacity = 0;
    const svg = $('ov'); svg.innerHTML = '';
    for (const [txt, p, op0, cls] of (o.labels || [])) { const q = P2(p); const half = txt.length * 9 + 30; const op = op0 * clamp(Math.min(q[0] - half, W - half - q[0], q[1] - 420, H - 460 - q[1]) / 60); if (op < 0.02) continue; svg.insertAdjacentHTML('beforeend', `<text class="${cls || 'maplab'}" x="${q[0]}" y="${q[1]}" text-anchor="middle" opacity="${op}">${txt}</text>`); }
    for (const [a, b, op, txt] of (o.dims || [])) { if (op < 0.02) continue; const p = P2(a), q = P2(b); svg.insertAdjacentHTML('beforeend', `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#E2401C" stroke-width="3" opacity="${op}"/><circle cx="${p[0]}" cy="${p[1]}" r="5" fill="#E2401C" opacity="${op}"/><circle cx="${q[0]}" cy="${q[1]}" r="5" fill="#E2401C" opacity="${op}"/><text class="dim" x="${(p[0] + q[0]) / 2 + 52}" y="${(p[1] + q[1]) / 2}" opacity="${op}">${txt}</text>`); }
    return true;
  };
  // ================= línea de tiempo (50 s) =================
  const azOf = (dx, dz) => Math.atan2(dx, dz) * 180 / Math.PI;
  const dirW = (a, b) => { const p = Wp(0, 0, 0), q = Wp(a, 0, b); return azOf(q[0] - p[0], q[2] - p[2]); };   // acimut de la cámara según el marco del edificio
  const SW = dirW(-0.55, -1), WEST = dirW(0, -1), EAST = dirW(0.35, 1), NW = dirW(0.6, -1);
  const K = [
    { t: 0.0, tg: Wp(-4, 30, -26), z: 150, az: SW, el: 30 },
    { t: 3.6, tg: Wp(-4, 24, -30), z: 142, az: SW + 4, el: 36 },
    { t: 8.4, tg: Wp(0, 4, -42), z: 96, az: SW + 8, el: 50 },
    { t: 13.0, tg: Wp(0, 6, -34), z: 92, az: SW + 6, el: 46 },
    { t: 18.8, tg: Wp(0, 18, -10), z: 74, az: SW - 6, el: 26 },
    { t: 23.8, tg: Wp(-6, 20, -32), z: 60, az: WEST + 14, el: 14 },
    { t: 29.8, tg: Wp(0, 10, -55), z: 78, az: NW, el: 30 },
    { t: 31.2, tg: Wp(-4, 24, 36), z: 58, az: EAST, el: 12 },
    { t: 37.6, tg: Wp(-12, 24, 40), z: 54, az: EAST + 8, el: 10 },
    { t: 46.5, tg: Wp(40, 0, -60), z: 420, az: SW + 10, el: 42 },
    { t: 50.0, tg: Wp(60, 0, -70), z: 470, az: SW + 14, el: 44 } ];
  const words = [[0.25, 3.4, '¿Puede un andamio entrar en el centro de París?'], [3.8, 8.2, 'Aquí había un aparcamiento.'], [8.6, 12.8, '681 proyectos. Ganan dos treintañeros.'],
    [13.2, 18.6, 'Todo lo de dentro, fuera.'], [19.0, 23.6, 'Hasta la escalera.'], [24.0, 29.6, 'Y delante, una plaza.'], [30.2, 37.6, 'La llamaron «la refinería».'], [38.2, 46.5, '¿Se integra?']];
  const kick = (t) => t < 3.6 ? '012 · CENTRE POMPIDOU · PARÍS' : t < 8.4 ? '012 · PLATEAU BEAUBOURG · 1937 – 1971' : t < 13.0 ? '012 · CONCURSO DE 1971' : t < 18.8 ? '012 · PIANO, ROGERS Y RICE · 1972 – 1977' :
    t < 23.8 ? '012 · FACHADA DE LA PLAZA' : t < 29.8 ? '012 · LA PIAZZA' : t < 38.0 ? '012 · RUE DU RENARD' : '012 · CERRADO POR REFORMA HASTA 2030';
  window.renderAt = (tt) => {
    let i = 1; while (i < K.length - 1 && K[i].t < tt) i++; const a = K[i - 1], b = K[i]; const u = smr(seg(tt, a.t, b.t));
    let tw = '', to = 0; for (const [a0, b0, tx] of words) { const f = fw(tt, a0, b0, 0.22); if (f > 0) { tw = tx; to = f; } }
    const down = smr(seg(tt, 3.7, 5.0)), up = seg(tt, 13.0, 17.6);
    const ph = { build: tt < 3.7 ? 1 : tt < 13.0 ? Math.max(0.0, 1 - down) : up, skin: tt < 3.7 ? 1 : tt < 13.0 ? 1 - smr(seg(tt, 3.7, 4.4)) : smr(seg(tt, 16.4, 18.4)),
      esc: tt < 3.7 ? 1 : tt < 19.0 ? (tt < 13.0 ? 1 - smr(seg(tt, 3.7, 4.2)) : 0) : smr(seg(tt, 19.0, 23.2)),
      plaza: tt < 3.7 ? 1 : tt < 24.0 ? (tt < 8.4 ? 1 - smr(seg(tt, 3.7, 4.4)) : 0) : smr(seg(tt, 24.0, 25.2)),
      people: tt < 3.7 ? 1 : tt < 24.0 ? (tt < 8.4 ? 1 - smr(seg(tt, 3.7, 4.2)) : 0) : smr(seg(tt, 24.4, 28.5)),
      cars: tt < 4.4 ? 0 : tt < 8.6 ? smr(seg(tt, 4.4, 6.4)) : 1 - smr(seg(tt, 8.6, 9.6)),
      boards: tt < 9.4 ? 0 : tt < 13.0 ? smr(seg(tt, 9.4, 10.8)) : 0, losers: 1 - smr(seg(tt, 11.4, 12.4)) };
    const dims = [];
    const f48 = fw(tt, 15.6, 18.6, 0.3); if (f48 > 0) dims.push([Wp(0, 22.5, -VC), Wp(0, 22.5, VC), f48, '48 m sin pilares']);
    const f42 = fw(tt, 32.0, 37.6, 0.3); if (f42 > 0) { dims.push([Wp(-10, 0, VT + 7), Wp(-10, 42, VT + 7), f42, '42 m'], [Wp(-10, 0, hAcross.v + 1), Wp(-10, hAcross.h, hAcross.v + 1), f42, `${Math.round(hAcross.h)} m`]); }
    const labels = [];
    const fl = fw(tt, 0.4, 3.4, 0.3); if (fl > 0) labels.push(['PLATEAU BEAUBOURG', Wp(0, 0, -VT - PW * 0.55), fl]);
    const fs = fw(tt, 39.0, 50.0, 0.4); if (fs > 0) labels.push(['LA SEINE', Wp(-330, 0, 300), fs], ['LE MARAIS', Wp(60, 0, 260), fs]);
    return window.shot({ t: tt, tg: a.tg.map((v, j) => lerp(v, b.tg[j], u)), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), az: lerp(a.az, b.az, u), el: lerp(a.el, b.el, u),
      ph, labels, dims, title: tw, titleOp: to, kick: kick(tt) });
  };
  window.renderCover = () => { document.body.classList.add('cover');
    return window.shot({ t: 45, tg: Wp(0, 50, -36), z: 84, az: WEST + 10, el: 12, ctx: true, ph: {}, kick: '', title: '' }); };
  window.READY = true;
}
