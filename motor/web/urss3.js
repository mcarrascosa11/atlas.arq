import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, edgesOf, boxG, merge, prism, geomFrom } from './lib.js';
const $ = (id) => document.getElementById(id);
const LW = { A: 1.6, B: 0.9, C: 0.5 }; const INK = '#1A1B20', GREY = '#9A978F', RED = '#E2401C';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)); const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); }; const smr = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const seg = (t, a, b) => clamp((t - a) / (b - a)); const lerp = (a, b, t) => a + (b - a) * t; const fw = (t, a, b, f = 0.35) => Math.min(sm(seg(t, a, a + f)), 1 - sm(seg(t, b - f, b)));
const paper = fillMat('#F4F2EC', { hatch: 1, side: 0.95, shade: 0.86 }); const glass = fillMat('#6A6C72', { hatch: 0 }); const redF = fillMat(RED, { hatch: 1 }); const poche = fillMat('#26272C', { hatch: 0 });
// ---------- K-7 (after the K7-2-4 construction drawing): pad footings, transverse wall-beams, floor panels, two-layer facade panels
const FL = 2.7, NF = 5, NB = 20, PW = 3.2, LEN = NB * PW, DEP = 12;
function k7() {
  const g = new THREE.Group(); const stages = [];
  const mk = (list, mat, lw, ex) => { const sg = new THREE.Group(); const ge = merge(list); sg.add(new THREE.Mesh(ge, mat)); sg.add(segs(edgesOf(ge, 30), lineMat(INK, lw))); g.add(sg); sg.userData.ex = ex; stages.push(sg); return sg; };
  const pads = []; for (let i = 0; i <= NB; i++) { const x = -LEN / 2 + i * PW; for (const z of [-DEP / 2 + 0.7, 0, DEP / 2 - 0.7]) pads.push(boxG(x - 0.45, x + 0.45, -0.5, 0, z - 0.45, z + 0.45)); }
  mk(pads, paper, LW.C, [0, -1.5, 0]);
  let red = null;
  for (let f = 0; f < NF; f++) { const y0 = f * FL, lift = (f + 1) * 1.3;
    const walls = []; for (let i = 0; i <= NB; i++) { const x = -LEN / 2 + i * PW; walls.push(boxG(x - 0.08, x + 0.08, y0, y0 + FL - 0.2, -DEP / 2 + 0.3, DEP / 2 - 0.3)); }
    mk(walls, paper, LW.B, [0, lift, 0]);
    mk([boxG(-LEN / 2, LEN / 2, y0 + FL - 0.2, y0 + FL, -DEP / 2, DEP / 2)], paper, LW.B, [0, lift + 0.7, 0]);
    for (const side of [1, -1]) { const P = [], Wn = [];
      for (let i = 0; i < NB; i++) { const x0 = -LEN / 2 + i * PW, x1 = x0 + PW; const z0 = side > 0 ? DEP / 2 - 0.3 : -DEP / 2, z1 = side > 0 ? DEP / 2 : -DEP / 2 + 0.3;
        const stair = i % 5 === 2; const ww = stair ? 0.7 : 1.4, wh = stair ? 0.9 : 1.4, wx = (x0 + x1) / 2, wy = y0 + (stair ? 1.3 : 0.85); const zf = side > 0 ? DEP / 2 + 0.02 : -DEP / 2 - 0.02;
        const panel = boxG(x0 + 0.03, x1 - 0.03, y0 + 0.02, y0 + FL - 0.02, z0, z1); const win = boxG(wx - ww / 2, wx + ww / 2, wy, wy + wh, Math.min(zf, zf - 0.02 * side), Math.max(zf, zf - 0.02 * side));
        if (side > 0 && f === NF - 1 && i === 9) { red = new THREE.Group(); const ge = merge([panel]); red.add(new THREE.Mesh(ge, redF)); red.add(segs(edgesOf(ge, 30), lineMat(INK, LW.B))); const wg = merge([win]); red.add(new THREE.Mesh(wg, glass)); g.add(red); red.userData.ex = [0, lift, 4.5]; continue; }
        P.push(panel); Wn.push(win); }
      const sg = mk(P, paper, LW.B, [0, lift, 4.5 * side]); const wg = merge(Wn); sg.add(new THREE.Mesh(wg, glass)); }
  }
  mk([boxG(-LEN / 2 - 0.15, LEN / 2 + 0.15, NF * FL, NF * FL + 0.5, -DEP / 2 - 0.15, DEP / 2 + 0.15)], paper, LW.A, [0, 8, 0]);
  return { g, stages, red };
}
function crane(x, z, h) { const L = []; const m = 0.9; for (const [dx, dz] of [[-m, -m], [m, -m], [m, m], [-m, m]]) L.push(x + dx, 0, z + dz, x + dx, h, z + dz);
  for (let y = 0; y < h; y += 1.8) L.push(x - m, y, z - m, x + m, y + 1.8, z - m, x + m, y, z + m, x - m, y + 1.8, z + m);
  L.push(x - 8, h, z, x + 30, h, z, x - 8, h + 1.1, z, x + 30, h + 1.1, z, x, h + 4.5, z, x + 30, h + 1.1, z, x, h + 4.5, z, x - 8, h + 1.1, z);
  for (let d = -8; d < 30; d += 2) L.push(x + d, h, z, x + d + 2, h + 1.1, z); const s = segs(L, lineMat('#2A2B30', LW.B)); s.frustumCulled = false; return s; }
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER); $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
  const A = await fetch('barrio.json').then(r => r.json()), B9 = await fetch('barrio9.json').then(r => r.json());
  // hero site inside microdistrict V: the longest block near the centre
  let hi = -1, best = 0; A.blds.forEach((b, i) => { const cx = b.p.reduce((s, p) => s + p[0], 0) / b.p.length, cz = b.p.reduce((s, p) => s + p[1], 0) / b.p.length; if (b.h > 10 && b.p.length === 4 && b.long > best && Math.abs(cx) < 120 && Math.abs(cz) < 200) { best = b.long; hi = i; } });
  const hb = A.blds[hi]; const hc = [hb.p.reduce((s, p) => s + p[0], 0) / 4, hb.p.reduce((s, p) => s + p[1], 0) / 4];
  let e0 = [hb.p[1][0] - hb.p[0][0], hb.p[1][1] - hb.p[0][1]], e1 = [hb.p[2][0] - hb.p[1][0], hb.p[2][1] - hb.p[1][1]]; const le = Math.hypot(...e0) >= Math.hypot(...e1) ? e0 : e1; const ang = Math.atan2(le[1], le[0]);
  const K = k7(); const hero = new THREE.Group(); hero.add(K.g); hero.position.set(hc[0], 0, hc[1]); hero.rotation.y = -ang; hero.scale.set(best / LEN, 1, 1); scene.add(hero);
  const cr = crane(LEN / 2 + 6, -DEP / 2 - 6, 22); K.g.add(cr);
  const HP = (p) => new THREE.Vector3(...p).applyMatrix4(hero.matrixWorld);
  // districts: V (with the hero block left out of the volumes) and quarter 9, 640 m to the east on the same sheet
  const dist = (Bd, ox, skip) => { const root = new THREE.Group(); const GL = []; for (const l of Bd.lines) GL.push(l[0] + ox, 0.05, l[1], l[2] + ox, 0.05, l[3]); root.add(segs(GL, lineMat(GREY, LW.C)));
    const P = [], Bf = [], T = [], E = [], P2 = [], B2 = [], T2 = [], E2 = [];
    Bd.blds.forEach((b, i) => { const ring = b.p.map(([x, z]) => [x + ox, z]); if (i !== skip) prism(ring, 0, b.h, 0, P, Bf, T, E, { bottomEdges: true }); prism(ring, 0.06, 0.12, 0, P2, B2, T2, E2); });
    const vol = new THREE.Group(); vol.add(new THREE.Mesh(geomFrom(P, Bf, T), paper)); vol.add(segs(E, lineMat(INK, LW.B))); const plan = new THREE.Group(); plan.add(new THREE.Mesh(geomFrom(P2, B2, T2), poche));
    root.add(vol, plan); root.userData = { vol, plan }; root.traverse(o => o.frustumCulled = false); scene.add(root); return root; };
  const V = dist(A, 0, hi), N9 = dist(B9, 640, -1);
  scene.traverse(o => o.frustumCulled = false); hero.updateMatrixWorld(true);
  const HC = [hc[0], 0, hc[1]];
  const Kf = [
    { t: 0, tg: [4, 10, 0], z: 44, az: 34, el: 22 }, { t: 7.8, tg: [4, 10, 0], z: 46, az: 30, el: 22 },
    { t: 9.4, tg: [0, 11, 0], z: 52, az: 28, el: 24 }, { t: 14.8, tg: [0, 11, 0], z: 53, az: 32, el: 24 }, { t: 21.8, tg: [0, 9, 0], z: 48, az: 36, el: 26 }, { t: 26.8, tg: [0, 9, 0], z: 48, az: 40, el: 26 },
    { t: 33.6, tg: [0, 0, 0], z: 420, az: 35, el: 30, w: 1 }, { t: 36.4, tg: [0, 0, 40], z: 430, az: 0, el: 88, w: 1 }, { t: 40.4, tg: [0, 0, 40], z: 430, az: 0, el: 88, w: 1 },
    { t: 42.6, tg: [640, 0, 30], z: 330, az: 0, el: 88, w: 1 }, { t: 44.6, tg: [650, 0, 10], z: 320, az: 35, el: 30, w: 1 }, { t: 48.2, tg: [650, 0, 10], z: 320, az: 38, el: 30, w: 1 },
    { t: 54.2, tg: [650, 0, 10], z: 430, az: 35, el: 30, w: 1 }, { t: 57.5, tg: [650, 0, 10], z: 436, az: 36, el: 30, w: 1 } ];
  const subs = [[2.2, 7.8, 'En los años cincuenta se vivía con unos 5 m² por persona. En 1957 la URSS se propone acabar con la falta de vivienda en diez o doce años.'],
    [8.4, 14.8, 'La clave: fabricar la casa. Paneles de hormigón hechos en fábrica que en obra solo había que montar.'],
    [15.4, 21.8, 'Un bloque de cuatro portales, en unos 12 días.'],
    [22.2, 26.8, 'Cinco plantas, sin ascensor ni sótano: cerca de un 30 % más barato.'],
    [27.4, 33.8, 'Los mismos planos y las mismas piezas para todo el país: de 41 a 82,8 millones de m² al año entre 1956 y 1960.'],
    [34.4, 40.8, 'Y no bloques sueltos: barrios enteros, de 25 a 30 hectáreas, construidos de una vez.'],
    [41.6, 48.4, 'Con colegio, guarderías, comedor, tiendas y cine entre las viviendas.'],
    [48.8, 54.6, 'Alivió la escasez, pero no la cerró: en 1986 se volvió a prometer un piso por familia, para el año 2000.']];
  const kick = [[0, '007 · URSS, 1957'], [2.2, '01 · EL PROBLEMA'], [8.2, '02 · LA PIEZA'], [15.2, '03 · RÁPIDO'], [22.0, '04 · BARATO'], [27.2, '05 · MUCHO'], [34.2, '06 · EL BARRIO'], [41.4, '07 · LOS SERVICIOS'], [48.6, '08 · ¿LO CONSIGUIÓ?'], [55.0, '007 · URSS, 1957']];
  const T = '¿Pudo la URSS acabar con la falta de vivienda en diez años?';
  const NS = K.stages.length;           // pads + 5 x (walls, slab, front, back) + roof
  const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
  window.renderAt = (t) => {
    let i = 1; while (i < Kf.length - 1 && Kf[i].t < t) i++; const a = Kf[i - 1], b = Kf[i]; const u = smr(seg(t, a.t, b.t));
    // camera target: block-relative until the zoom-out, world afterwards
    const ta = a.w ? new THREE.Vector3(...a.tg) : HP(a.tg), tb = b.w ? new THREE.Vector3(...b.tg) : HP(b.tg); const tg = ta.lerp(tb, u);
    const azA = a.az * Math.PI / 180 + (a.w ? 0 : -ang), azB = b.az * Math.PI / 180 + (b.w ? 0 : -ang);
    const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), u)), az = lerp(azA, azB, u), el = lerp(a.el, b.el, u) * Math.PI / 180;
    // explode / assemble: e per stage
    const ex = t < 8.6 ? 0 : t < 10.2 ? sm(seg(t, 8.6, 10.2)) : 1;
    K.stages.forEach((sg, k) => { let e = ex; if (t >= 15.2) { const tk = 15.4 + k / (NS - 1) * 6.0; e = 1 - sm(seg(t, tk - 0.35, tk + 0.25)); } const v = sg.userData.ex; sg.position.set(v[0] * e, v[1] * e, v[2] * e); });
    { let e = ex; if (t >= 15.2) { const tk = 15.4 + (NS - 1.5) / (NS - 1) * 6.0; e = 1 - sm(seg(t, tk - 0.35, tk + 0.25)); } const v = K.red.userData.ex; const drop = t < 1.9 ? (1 - sm(seg(t, 0.2, 1.8))) * 7 : 0; K.red.position.set(v[0] * e, v[1] * e + drop, v[2] * e); }
    cr.visible = t < 27.2;
    // district growth (solid volumes rising) and plan/axo state
    V.userData.vol.scale.y = Math.max(0.001, sm(seg(t, 27.4, 32.6))); V.visible = t >= 27.3 && t < 45.0; N9.visible = t >= 40.4; if (t >= 45.0) hero.visible = false;
    const planOn = t >= 35.6 && t < 44.0; for (const D of [V, N9]) { D.userData.plan.visible = planOn; D.userData.vol.visible = !planOn; } hero.visible = !planOn && t < 45.0;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 3000; camera.position.set(tg.x + Math.sin(az) * Math.cos(el) * d, tg.y + Math.sin(el) * d, tg.z + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); camera.lookAt(tg); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    let kk = ''; for (const [s0, k0] of kick) if (t >= s0) kk = k0; $('kicker').textContent = kk;
    const titleOp = Math.max(1 - sm(seg(t, 1.6, 2.1)), sm(seg(t, 55.0, 55.6))); $('title').textContent = T; $('title').style.opacity = titleOp;
    let st = '', so = 0; for (const [a0, b0, tx] of subs) { const f = fw(t, a0, b0); if (f > 0) { st = tx; so = f; } } $('sub').textContent = st; $('sub').style.opacity = so;
    const svg = $('ov'); svg.innerHTML = '';
    const lab = (p, txt, op = 1, col = INK) => { const q = P(p); svg.insertAdjacentHTML('beforeend', `<g opacity="${op}"><circle cx="${q[0]}" cy="${q[1]}" r="3.4" fill="${col}"/><line x1="${q[0]}" y1="${q[1]}" x2="${q[0]}" y2="${q[1] - 26}" stroke="${col}" stroke-width="1.2"/><text class="lab" x="${q[0]}" y="${q[1] - 32}" fill="${col}">${txt}</text></g>`); };
    { const o = fw(t, 10.0, 14.8); if (o > 0) { const hp = (x, y, zz) => HP([x, y, zz]).toArray(); lab(hp(-LEN / 2 + 1.6, -1.6, DEP / 2 - 0.7), 'ZAPATAS', o); lab(hp(-LEN / 2 + 6.4, FL * 4 + 1.3 * 5 - 0.6, -DEP / 2 + 0.6), 'VIGAS-PARED', o); lab(hp(LEN / 2 - 8, FL * 4 + 1.3 * 5 + 0.7, -DEP / 2 + 2), 'FORJADOS', o); lab(hp(LEN / 2 - 12, FL * 1 + 1.3 * 2, DEP / 2 + 4.5), 'PANELES DE FACHADA', o); } }
    { const o = fw(t, 15.3, 22.0, 0.3); if (o > 0) { const day = Math.min(12, Math.max(1, Math.floor(1 + seg(t, 15.4, 21.4) * 11.999))); svg.insertAdjacentHTML('beforeend', `<text x="${W - 70}" y="${H * 0.255}" text-anchor="end" style="font: 700 120px 'SG'; fill: ${RED}; opacity: ${o}">DÍA ${day}</text>`); } }
    { const o = fw(t, 22.4, 26.8); if (o > 0) { const a1 = P(HP([LEN / 2 + 3, 0, DEP / 2]).toArray()), b1 = P(HP([LEN / 2 + 3, NF * FL + 0.5, DEP / 2]).toArray()); svg.insertAdjacentHTML('beforeend', `<g opacity="${o}"><line x1="${a1[0]}" y1="${a1[1]}" x2="${b1[0]}" y2="${b1[1]}" stroke="${RED}" stroke-width="2.4"/><line x1="${a1[0] - 9}" y1="${a1[1]}" x2="${a1[0] + 9}" y2="${a1[1]}" stroke="${RED}" stroke-width="2.4"/><line x1="${b1[0] - 9}" y1="${b1[1]}" x2="${b1[0] + 9}" y2="${b1[1]}" stroke="${RED}" stroke-width="2.4"/><text class="dim" x="${(a1[0] + b1[0]) / 2 + 16}" y="${(a1[1] + b1[1]) / 2}">5 plantas</text></g>`); } }
    { const o = fw(t, 42.2, 48.6); if (o > 0) for (const [x, y, zz, txt] of B9.labels) lab([x + 640, planOn ? 0.2 : y, zz], txt, o, RED); }
    { const o = fw(t, 36.2, 40.6); if (o > 0) lab([hc[0], 0.2, hc[1]], 'EL BLOQUE', o, RED); }
    return true; };
  window.renderCover = () => { document.body.classList.add('cover'); window.renderAt(0.0); $('title').style.opacity = 0; $('kicker').textContent = ''; $('sub').style.opacity = 0; $('ov').innerHTML = '';
    K.red.position.set(0, 0, 0); const tg = HP([4, 14, 0]); const az = 34 * Math.PI / 180 - ang, el = 22 * Math.PI / 180, z = 48; camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    camera.position.set(tg.x + Math.sin(az) * Math.cos(el) * 3000, tg.y + Math.sin(el) * 3000 - 0, tg.z + Math.cos(az) * Math.cos(el) * 3000); cr.visible = false; camera.position.y += 21; camera.lookAt(tg.x, tg.y + 21, tg.z); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); renderer.render(scene, camera); return true; };
  window.READY = true;
}
