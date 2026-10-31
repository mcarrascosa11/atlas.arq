# 014 · escena de prueba en Blender (Cycles con colores planos y Freestyle para las líneas)
# uso: blender -b -P vega_prueba.py -- ESCENA.json CARPETA_FOTOGRAMAS [PRIMERO ULTIMO]
import bpy, json, math, sys
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]; SRC, OUTDIR = argv[0], argv[1]; F0, F1 = (int(argv[2]), int(argv[3])) if len(argv) > 3 else (0, 299)
D = json.load(open(SRC))
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 4; sc.cycles.use_denoising = False; sc.cycles.device = 'CPU'
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, 100; sc.render.fps = 30; sc.frame_start, sc.frame_end = 0, 299
sc.view_settings.view_transform = 'Standard'; sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = OUTDIR + '/'
def lin(h): c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]; return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]
w = bpy.data.worlds.new('papel'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = lin('#F2F1EC')
def mat(name, hexc, lo=0.74):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    geo = nt.nodes.new('ShaderNodeNewGeometry'); dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; dot.inputs[1].default_value = (0.35, -0.45, 0.82)
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs[1].default_value = -0.2; mr.inputs[2].default_value = 1.0; mr.inputs[3].default_value = lo; mr.inputs[4].default_value = 1.0
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0; mul.inputs[6].default_value = lin(hexc)
    em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(geo.outputs['Normal'], dot.inputs[0]); nt.links.new(dot.outputs['Value'], mr.inputs[0])
    comb = nt.nodes.new('ShaderNodeCombineColor'); [nt.links.new(mr.outputs[0], comb.inputs[i]) for i in range(3)]
    nt.links.new(comb.outputs[0], mul.inputs[7]); nt.links.new(mul.outputs[2], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface']); return m
paper, red, tree, ground, road = mat('papel', '#F7F6F2'), mat('rojo', '#E2401C', 0.8), mat('encina', '#C4CBB2', 0.72), mat('suelo', '#F4F3EE', 1.0), mat('calle', '#DCD8CF', 1.0)
B = lambda p: (p[0], -p[2], p[1])                                                        # (x, altura, z sur) -> Blender (x, y norte, z arriba)
def mesh_obj(name, verts, faces, m):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update(); ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); ob.data.materials.append(m); return ob
import bmesh
dmax = max(g['d'] for g in D['g']); OBJ = []
for i, g in enumerate(D['g']):
    P = g['tri']; V = [B(P[k:k + 3]) for k in range(0, len(P), 3)]; F = [(k, k + 1, k + 2) for k in range(0, len(V), 3)]
    ob = mesh_obj(f'g{i}', V, F, red if i == D['hero'] else paper)
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.01); bm.to_mesh(ob.data); bm.free()
    OBJ.append((ob, -0.2 if i == D['hero'] else 0.35 + 5.0 * (g['d'] / dmax) ** 0.75))
# suelo y calles
mesh_obj('suelo', [(-1400, -1400, -0.02), (1400, -1400, -0.02), (1400, 1400, -0.02), (-1400, 1400, -0.02)], [(0, 1, 2, 3)], ground)
RV, RF = [], []
for r in D['roads']:
    L = r['l']
    for a, b in zip(L, L[1:]):
        dx, dz = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dz) or 1; nx, nz = -dz / l * 0.9, dx / l * 0.9; n = len(RV)
        RV += [B((a[0] + nx, 0.0, a[1] + nz)), B((b[0] + nx, 0.0, b[1] + nz)), B((b[0] - nx, 0.0, b[1] - nz)), B((a[0] - nx, 0.0, a[1] - nz))]; RF.append((n, n + 1, n + 2, n + 3))
rd = mesh_obj('calles', RV, RF, road); rd.visible_shadow = False
# encinas en oleadas
bands = []
for k in range(6):
    bm = bmesh.new()
    for x, z, r in D['trees']:
        if min(5, int(math.hypot(x, z) // 90)) != k: continue
        rr = max(1.8, min(6.5, r)); h = rr * 0.75
        ret = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0); 
        for v in ret['verts']: v.co.x, v.co.y, v.co.z = x + v.co.x * rr, -z + v.co.y * rr, rr * 0.55 + 1.2 + v.co.z * h
    me = bpy.data.meshes.new(f'encinas{k}'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(f'encinas{k}', me); sc.collection.objects.link(ob); ob.data.materials.append(tree); bands.append(ob)
# animación: crecer con rebote, oleadas de encinas y cámara
def back(x):
    x = min(1, max(0, x)); c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
for ob, t0 in OBJ:
    f0 = max(0, int(math.floor(t0 * 30)) - 1); f1 = min(299, int(math.ceil((t0 + 0.4) * 30)) + 1)
    for f in sorted(set([0] + list(range(f0, f1 + 1)))):
        s = back((f / 30 - t0) / 0.35); ob.scale = (1, 1, max(0.001, s)); ob.keyframe_insert('scale', frame=f)
        ob.hide_render = s < 0.002; ob.keyframe_insert('hide_render', frame=f)
for k, ob in enumerate(bands):
    for f in (0, int((6.0 + k * 0.28) * 30) - 1, int((6.0 + k * 0.28) * 30)):
        ob.hide_render = f < (6.0 + k * 0.28) * 30; ob.keyframe_insert('hide_render', frame=f)
cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam_data.clip_start = 1; cam_data.clip_end = 30000; cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
tgt = bpy.data.objects.new('mira', None); sc.collection.objects.link(tgt); con = cam.constraints.new('TRACK_TO'); con.target = tgt; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
H0 = D['g'][D['hero']]['c']; lerp = lambda a, b, u: a + (b - a) * u; eo = lambda x: 1 - (1 - min(1, max(0, x))) ** 3
smr = lambda x: (lambda y: y * y * y * (y * (y * 6 - 15) + 10))(min(1, max(0, x)))
for f in range(0, 300):
    t = f / 30; u = eo(t / 6.0); v = smr((t - 6.0) / 4.0)
    z = math.exp(lerp(math.log(26), math.log(330), u)) if t < 6 else lerp(330, 290, v); az = math.radians(lerp(198, 252, u) if t < 6 else lerp(252, 292, v)); el = math.radians(lerp(30, 48, u) if t < 6 else lerp(48, 62, v))
    tg = (lerp(H0[0], 0, u), 0.0, lerp(H0[1], 30, u)); d = 4000
    p3 = (tg[0] + math.sin(az) * math.cos(el) * d, tg[1] + math.sin(el) * d, tg[2] + math.cos(az) * math.cos(el) * d)
    cam.location = B(p3); tgt.location = B(tg); cam_data.ortho_scale = 2 * z
    cam.keyframe_insert('location', frame=f); tgt.keyframe_insert('location', frame=f); cam_data.keyframe_insert('ortho_scale', frame=f)
# líneas con Freestyle: contorno, aristas vivas y bordes, en tinta
sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
vl = sc.view_layers[0]; fs = vl.freestyle_settings; fs.crease_angle = math.radians(150)
ls = fs.linesets[0] if fs.linesets else fs.linesets.new('tinta'); ls.select_by_visibility = True; ls.visibility = 'VISIBLE'; ls.select_by_edge_types = True
ls.select_silhouette = ls.select_border = ls.select_crease = True; ls.select_external_contour = True
ls.select_by_collection = False; st = ls.linestyle or bpy.data.linestyles.new('tinta'); ls.linestyle = st; st.color = lin('#1A1B20')[:3]; st.thickness = 1.3
for ob in (bpy.data.objects['suelo'], rd): ob.visible_camera = True
sup = bpy.data.collections.new('sin_lineas'); sc.collection.children.link(sup)
for ob in (bpy.data.objects['suelo'], rd): sc.collection.objects.unlink(ob); sup.objects.link(ob)
ls.select_by_collection = True; ls.collection = sup; ls.collection_negation = 'EXCLUSIVE'
sc.frame_start, sc.frame_end = F0, F1
bpy.ops.render.render(animation=True)
