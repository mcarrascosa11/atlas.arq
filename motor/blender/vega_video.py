# 014 · Vegaviana: vídeo completo en Blender (Cycles en colores planos + Freestyle). Volumetría real: Catastro + LiDAR-PNOA 2023 (IGN).
# uso: blender -b -P vega_video.py -- ESCENA.json CARPETA [PRIMERO ULTIMO]   (salta los fotogramas que ya existen)
import bpy, bmesh, json, math, sys, os
argv = sys.argv[sys.argv.index('--') + 1:]; SRC, OUTDIR = argv[0], argv[1]; F0, F1 = (int(argv[2]), int(argv[3])) if len(argv) > 3 else (0, 899); D = json.load(open(SRC))
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 4; sc.cycles.use_denoising = False; sc.cycles.device = 'CPU'; sc.render.use_persistent_data = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, 100; sc.render.fps = 30; sc.view_settings.view_transform = 'Standard'
sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = OUTDIR + '/'; sc.render.use_overwrite = False; sc.render.use_placeholder = True
FPS = 30
def lin(h): c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]; return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]
w = bpy.data.worlds.new('papel'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = lin('#F2F1EC')
def mat(name, hexc, lo=0.74):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    geo = nt.nodes.new('ShaderNodeNewGeometry'); dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; dot.inputs[1].default_value = (0.35, -0.45, 0.82)
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs[1].default_value = -0.2; mr.inputs[2].default_value = 1.0; mr.inputs[3].default_value = lo; mr.inputs[4].default_value = 1.0
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0; mul.inputs[6].default_value = lin(hexc)
    em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial'); comb = nt.nodes.new('ShaderNodeCombineColor')
    nt.links.new(geo.outputs['Normal'], dot.inputs[0]); nt.links.new(dot.outputs['Value'], mr.inputs[0]); [nt.links.new(mr.outputs[0], comb.inputs[i]) for i in range(3)]
    nt.links.new(comb.outputs[0], mul.inputs[7]); nt.links.new(mul.outputs[2], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface']); return m
paper, red, tree, ground, road, plazaM = mat('papel', '#F7F6F2'), mat('rojo', '#E2401C', 0.8), mat('encina', '#D3D9C4', 0.8), mat('suelo', '#F4F3EE', 1.0), mat('calle', '#E8E5DE', 1.0), mat('plaza', '#F2C4B6', 1.0)
B = lambda p: (p[0], -p[2], p[1])
nol = bpy.data.collections.new('sin_lineas'); sc.collection.children.link(nol)
def mesh_obj(name, verts, faces, m, lines=True, me=None):
    if me is None: me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new(name, me); (sc.collection if lines else nol).objects.link(ob); ob.data.materials.append(m) if not ob.data.materials else None; ob.material_slots[0].link = 'OBJECT'; ob.material_slots[0].material = m; return ob
def key_hide(ob, frames_vis):                                       # visible solo en los intervalos de fotogramas dados
    vis = lambda f: any(a <= f < b for a, b in frames_vis)
    prev = None
    for f in range(F0 - 1, F1 + 2):
        v = vis(f)
        if v != prev: ob.hide_render = not v; ob.keyframe_insert('hide_render', frame=f); prev = v
# ---------- tiempos (s) ----------
T_PLAZA, T_PLAZA_END = 11.8, 15.0; T_LOTE, T_LOTE_END = 17.8, 21.0; T_HERO_OFF, T_HERO_ON = 11.8, 27.6
fr = lambda t: int(round(t * FPS))
dmax = max(g['d'] for g in D['g']); H0 = D['g'][D['hero']]['c']
ig = next((g['c'] for g in D['g'] if g.get('civ') == 'iglesia'), [0, 0])
def lote():
    c = [(k, g) for k, g in enumerate(D['g']) if g['f'] == 2 and 120 < g['a'] < 380 and g.get('n', 1) >= 2 and not g.get('civ') and not g.get('nl') and k != D['hero']] or [(k, g) for k, g in enumerate(D['g']) if g['f'] == 2 and g['a'] < 500 and k != D['hero']]
    return min(c, key=lambda kg: math.hypot(kg[1]['c'][0] - 60, kg[1]['c'][1] - 40))
LK, LG = lote()
def zona():
    best = None
    for gx in range(-200, 260, 20):
        for gz in range(-200, 260, 20):
            n = sum(1 for g in D['g'] if g['f'] == 2 and not g.get('civ') and not g.get('nl') and math.hypot(g['c'][0] - gx, g['c'][1] - gz) < 45)
            if best is None or n > best[0]: best = (n, [gx, gz])
    return best[1]
ZA = zona(); PZ = [ig[0] - 15, ig[1] - 5]
# ---------- edificios: crecen en cascada desde la casa roja ----------
def back(x):
    x = min(1, max(0, x)); c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
for i, g in enumerate(D['g']):
    P = g['tri']; V = [B(P[k:k + 3]) for k in range(0, len(P), 3)]; F = [(k, k + 1, k + 2) for k in range(0, len(V), 3)]
    me = bpy.data.meshes.new(f'g{i}'); me.from_pydata(V, [], F); me.update(); bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.01); bm.to_mesh(me); bm.free()
    t0 = -0.2 if i == D['hero'] else 0.35 + 5.0 * (g['d'] / dmax) ** 0.75
    obs = [mesh_obj(f'g{i}', None, None, paper, me=me)]
    rojo = []
    if i == D['hero']: rojo = [(0, fr(T_HERO_OFF)), (fr(T_HERO_ON), 10 ** 6)]
    if g.get('civ'): rojo = [(fr(T_PLAZA), fr(T_PLAZA_END))]
    if i == LK: rojo = [(fr(T_LOTE), fr(T_LOTE_END))]
    if rojo:
        r_ob = mesh_obj(f'g{i}r', None, None, red, me=me); obs.append(r_ob)
        key_hide(r_ob, rojo); key_hide(obs[0], [(a, b) for a, b in [(-10, rojo[0][0])] + [(rojo[k][1], rojo[k + 1][0]) for k in range(len(rojo) - 1)] + [(rojo[-1][1], 10 ** 6)] if b > a])
    for ob in obs:
        f0 = max(F0, int(math.floor(t0 * FPS)) - 1); f1 = min(F1, int(math.ceil((t0 + 0.4) * FPS)) + 1)
        for f in sorted(set([F0] + list(range(f0, f1 + 1)))):
            s = back((f / FPS - t0) / 0.35); ob.scale = (1, 1, max(0.001, s)); ob.keyframe_insert('scale', frame=f)
# ---------- suelo, calles, plaza mayor y encinas ----------
mesh_obj('suelo', [(-1600, -1600, -0.02), (1600, -1600, -0.02), (1600, 1600, -0.02), (-1600, 1600, -0.02)], [(0, 1, 2, 3)], ground, False)
RV, RF = [], []
for r in D['roads']:
    for a, b in zip(r['l'], r['l'][1:]):
        dx, dz = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dz) or 1; nx, nz = -dz / l * 0.9, dx / l * 0.9; n = len(RV)
        RV += [B((a[0] + nx, 0.0, a[1] + nz)), B((b[0] + nx, 0.0, b[1] + nz)), B((b[0] - nx, 0.0, b[1] - nz)), B((a[0] - nx, 0.0, a[1] - nz))]; RF.append((n, n + 1, n + 2, n + 3))
mesh_obj('calles', RV, RF, road, False)
def area(r): return abs(sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r)))) / 2
pl = sorted([r for r in D['plazas'] if area(r) < 7000], key=lambda r: math.hypot(sum(p[0] for p in r) / len(r) - ig[0], sum(p[1] for p in r) / len(r) - ig[1]))[:1]
for k, ring in enumerate(pl): key_hide(mesh_obj(f'plaza{k}', [B((x, 0.03, z)) for x, z in ring], [tuple(range(len(ring)))], plazaM, False), [(fr(T_PLAZA), fr(T_PLAZA_END))])
for k in range(6):
    bm = bmesh.new()
    for t in D['trees']:
        x, z, r = t[:3]
        if min(5, int(math.hypot(x, z) // 90)) != k: continue
        rr = max(1.8, min(6.5, r)); hh = rr * 0.7; top = t[3] if len(t) > 3 else rr * 0.55 + 1.2 + hh; ret = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
        for v in ret['verts']: v.co.x, v.co.y, v.co.z = x + v.co.x * rr, -z + v.co.y * rr, max(hh + 0.8, top - hh) + v.co.z * hh
    me = bpy.data.meshes.new(f'encinas{k}'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(f'encinas{k}', me); nol.objects.link(ob); ob.data.materials.append(tree)
    key_hide(ob, [(fr(4.4 + k * 0.25), 10 ** 6)])
# ---------- líneas ----------
sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
fs = sc.view_layers[0].freestyle_settings; fs.crease_angle = math.radians(150)
ls = fs.linesets[0] if fs.linesets else fs.linesets.new('tinta'); ls.select_by_visibility = True; ls.visibility = 'VISIBLE'; ls.select_by_edge_types = True
ls.select_silhouette = ls.select_border = ls.select_crease = ls.select_external_contour = True
st = ls.linestyle or bpy.data.linestyles.new('tinta'); ls.linestyle = st; st.color = lin('#1A1B20')[:3]; st.thickness = 1.3
ls.select_by_collection = True; ls.collection = nol; ls.collection_negation = 'EXCLUSIVE'
# ---------- cámara ----------
cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam_data.clip_start = 1; cam_data.clip_end = 40000; cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
tgt = bpy.data.objects.new('mira', None); sc.collection.objects.link(tgt); con = cam.constraints.new('TRACK_TO'); con.target = tgt; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
C0 = [0, 30]; MID = [(H0[0] + C0[0]) / 2, (H0[1] + C0[1]) / 2]
K = [(0.0, H0, 24, 198, 30), (2.6, MID, 150, 226, 42), (5.6, C0, 330, 255, 50), (8.4, C0, 380, 280, 58), (11.2, C0, 370, 290, 58),
     (12.2, PZ, 110, 205, 58), (14.4, PZ, 100, 215, 56), (15.2, ZA, 34, 205, 38), (17.4, ZA, 30, 222, 36), (18.2, LG['c'], 30, 215, 38), (20.4, LG['c'], 26, 232, 36),
     (21.4, C0, 700, 240, 55), (24.2, C0, 760, 252, 60), (25.0, C0, 950, 262, 66), (27.2, C0, 980, 270, 68), (28.2, H0, 30, 300, 30), (30.0, H0, 24, 306, 30)]
smr = lambda x: (lambda y: y * y * y * (y * (y * 6 - 15) + 10))(min(1, max(0, x))); lerp = lambda a, b, u: a + (b - a) * u
for f in range(F0, F1 + 1):
    t = f / FPS; i = 1
    while i < len(K) - 1 and K[i][0] < t: i += 1
    a, b = K[i - 1], K[i]; u = smr((t - a[0]) / (b[0] - a[0])) if t < 5.6 or i > 3 else smr((t - a[0]) / (b[0] - a[0]))
    if i <= 2: u = 1 - (1 - min(1, max(0, (t - a[0]) / (b[0] - a[0])))) ** 3                     # arranque: la cámara ya se mueve en el fotograma 0
    tg = (lerp(a[1][0], b[1][0], u), 0.0, lerp(a[1][1], b[1][1], u)); z = math.exp(lerp(math.log(a[2]), math.log(b[2]), u)); az = math.radians(lerp(a[3], b[3], u)); el = math.radians(lerp(a[4], b[4], u)); d = 6000
    cam.location = B((tg[0] + math.sin(az) * math.cos(el) * d, math.sin(el) * d, tg[2] + math.cos(az) * math.cos(el) * d)); tgt.location = B(tg); cam_data.ortho_scale = 2 * z
    cam.keyframe_insert('location', frame=f); tgt.keyframe_insert('location', frame=f); cam_data.keyframe_insert('ortho_scale', frame=f)
sc.frame_start, sc.frame_end = F0, F1
print('escena lista: grupos', len(D['g']), 'lote', LK, 'zona', ZA, 'plaza', PZ)
bpy.ops.render.render(animation=True)
