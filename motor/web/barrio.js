import { THREE, W, H, PAPER, viewToWorld, fillMat, lineMat, segs, edgesOf, merge, prism, geomFrom } from './lib.js';
const $ = (id) => document.getElementById(id);
const LW = { A: 1.6, B: 0.9, C: 0.5 }; const INK = '#1A1B20', GREY = '#9A978F', RED = '#E2401C';
export async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.setClearColor(PAPER);
  $('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
  const DS = { A: await fetch('barrio.json').then(r => r.json()), B: await fetch('barrio9.json').then(r => r.json()) };
  const groups = {};
  for (const key of ['A', 'B']) { const B = DS[key]; const root = new THREE.Group(); scene.add(root); groups[key] = root;
  // ground linework: paths, plot edges, ponds (thin grey)
  const GL = []; for (const l of B.lines) GL.push(l[0], 0.05, l[1], l[2], 0.05, l[3]); root.add(segs(GL, lineMat(GREY, LW.C)));
  // buildings as solid volumes (paper) + plan poché version (ink) for the zenithal view
  const vol = new THREE.Group(), plan = new THREE.Group(); vol.name = 'vol'; plan.name = 'plan'; root.add(vol, plan);
  const P = [], Bf = [], T = [], E = [], P2 = [], B2 = [], T2 = [], E2 = [];
  let hero = null, best = 0;
  for (const b of B.blds) { const ring = b.p.map(([x, z]) => [x, z]); prism(ring, 0, b.h, 0, P, Bf, T, E, { bottomEdges: true }); prism(ring, 0.06, 0.12, 0, P2, B2, T2, E2);
    if (b.h > 10 && b.long > best && Math.abs(b.p[0][0]) < 60 && Math.abs(b.p[0][1]) < 120) { best = b.long; hero = b; } }
  vol.add(new THREE.Mesh(geomFrom(P, Bf, T), fillMat('#F4F2EC', { hatch: 1, side: 0.95, shade: 0.86 }))); vol.add(segs(E, lineMat(INK, LW.B)));
  plan.add(new THREE.Mesh(geomFrom(P2, B2, T2), fillMat('#26272C', { hatch: 0 })));
  // one K-7 block marked in vermillion
  const R = []; if (hero) { const r = hero.p; for (let i = 0; i < r.length; i++) { const a = r[i], c = r[(i + 1) % r.length]; for (const y of [0.1, hero.h + 0.1]) R.push(a[0], y, a[1], c[0], y, c[1]); R.push(a[0], 0.1, a[1], a[0], hero.h + 0.1, a[1]); } }
  const red = segs(R, lineMat(RED, 2.6, { depthTest: false }), 9); red.name = 'red'; root.add(red); root.userData.labels = B.labels || []; }
  scene.traverse(o => o.frustumCulled = false);
  window.shot = (o) => {
    for (const k of ['A', 'B']) { const g = groups[k]; g.visible = (o.ds || 'A') === k; g.getObjectByName('vol').visible = !o.planView; g.getObjectByName('plan').visible = !!o.planView; g.getObjectByName('red').visible = !!o.red; }
    const az = o.az * Math.PI / 180, el = o.el * Math.PI / 180, z = o.z, t = o.tg;
    camera.left = -z * W / H; camera.right = z * W / H; camera.top = z; camera.bottom = -z;
    const d = 3000; camera.position.set(t[0] + Math.sin(az) * Math.cos(el) * d, t[1] + Math.sin(el) * d, t[2] + Math.cos(az) * Math.cos(el) * d);
    camera.up.set(0, 1, 0); if (o.el >= 89) camera.up.set(0, 0, -1); camera.lookAt(t[0], t[1], t[2]); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); viewToWorld.value.setFromMatrix4(camera.matrixWorld);
    renderer.render(scene, camera);
    $('kicker').textContent = o.kick || ''; $('title').style.opacity = 0; $('sub').textContent = o.sub || ''; $('sub').style.opacity = o.sub ? 1 : 0; const svg = $('ov'); svg.innerHTML = '';
    if (o.labels) { const P = (p) => { const v = new THREE.Vector3(...p).project(camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; };
      for (const [x, y, z, t] of groups[o.ds || 'A'].userData.labels) { const p = P([x, o.planView ? 0.2 : y, z]); svg.insertAdjacentHTML('beforeend', `<rect x="${p[0] - t.length * 4.6 - 8}" y="${p[1] - 30}" width="${t.length * 9.2 + 16}" height="26" fill="#F2F1EC" opacity="0.92"/><text class="lab" x="${p[0]}" y="${p[1] - 11}" text-anchor="middle" fill="#E2401C">${t}</text><circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#E2401C"/>`); } }
    return true; };
  window.READY = true;
}
