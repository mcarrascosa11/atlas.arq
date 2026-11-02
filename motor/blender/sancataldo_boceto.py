# 016 · San Cataldo · boceto animado del cubo osario de Aldo Rossi (Cycles en colores planos + Freestyle, como Sarnago).
# Cubo hueco, sin cubierta ni forjados, con 9 columnas x 7 filas de ventanas cuadradas de 2 m por fachada (63 por cara).
# El lado (26 m), el muro (0,6 m) y la base maciza son una estimación para el boceto: se ajustan con los planos antes del vídeo.
# uso: blender -b -noaudio -P sancataldo_boceto.py -- ESCENA_JSON(no se usa) CARPETA F0 F1 [PORCENTAJE]   (F0 puede ser una lista: 0,90,179)
import bpy, bmesh, math, sys, os, time
from mathutils import Matrix, Vector
argv = sys.argv[sys.argv.index('--') + 1:]; OUT = argv[1]; os.makedirs(OUT, exist_ok=True)
FRAMES = [int(x) for x in argv[2].split(',')] if ',' in argv[2] else list(range(int(argv[2]), int(argv[3]) + 1)); PCT = int(argv[4]) if len(argv) > 4 else 100
FPS = 30
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 4; sc.cycles.use_denoising = False; sc.cycles.device = 'CPU'; sc.render.use_persistent_data = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, PCT; sc.view_settings.view_transform = 'Standard'
def lin(h): c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]; return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]
w = bpy.data.worlds.new('papel'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = lin('#F2F1EC')
def mat(name, hexc, lo=0.74):                    # color plano con un sombreado suave según la orientación de la cara (como en Sarnago)
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    geo = nt.nodes.new('ShaderNodeNewGeometry'); dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; dot.inputs[1].default_value = (0.35, -0.45, 0.82)
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs[1].default_value = -0.2; mr.inputs[2].default_value = 1.0; mr.inputs[3].default_value = lo; mr.inputs[4].default_value = 1.0
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0; mul.inputs[6].default_value = lin(hexc)
    em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial'); comb = nt.nodes.new('ShaderNodeCombineColor')
    nt.links.new(geo.outputs['Normal'], dot.inputs[0]); nt.links.new(dot.outputs['Value'], mr.inputs[0]); [nt.links.new(mr.outputs[0], comb.inputs[i]) for i in range(3)]
    nt.links.new(comb.outputs[0], mul.inputs[7]); nt.links.new(mul.outputs[2], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface']); return m
paper, red, ground = mat('papel', '#F7F6F2'), mat('rojo', '#E2401C', 0.8), mat('suelo', '#F4F3EE', 0.86)
nol = bpy.data.collections.new('sin_lineas'); sc.collection.children.link(nol)
def cajas(name, boxes, m, lines=True):           # varias cajas (x0, y0, z0, x1, y1, z1) en un solo objeto
    bm = bmesh.new()
    for x0, y0, z0, x1, y1, z1 in boxes:
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal((x1 - x0, y1 - y0, z1 - z0, 1)))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); (sc.collection if lines else nol).objects.link(ob); ob.data.materials.append(m); return ob
def restar(ob, cutter):
    md = ob.modifiers.new('resta', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cutter; md.solver = 'EXACT'
    bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.modifier_apply(modifier=md.name); bpy.data.objects.remove(cutter, do_unlink=True)
# cubo osario
S, E, W, P, H = 26.0, 0.6, 2.0, 0.8, 26.0; ZB = H - 1.6 - (7 * W + 6 * P)            # base maciza hasta la primera fila de ventanas
cubo = cajas('cubo', [(0, 0, 0, S, S, H)], red)
restar(cubo, cajas('vacio', [(E, E, -1, S - E, S - E, H + 1)], paper))                # hueco por dentro, sin forjados ni cubierta
H_ = []
for c in range(9):
    for r in range(7):
        a, z = P + c * (W + P), ZB + r * (W + P)
        H_ += [(a, -1, z, a + W, E + 1, z + W), (a, S - E - 1, z, a + W, S + 1, z + W), (-1, a, z, E + 1, a + W, z + W), (S - E - 1, a, z, S + 1, a + W, z + W)]
restar(cubo, cajas('huecos', H_, paper))                                              # 63 ventanas por fachada, sin carpintería
# contexto: dos crujías de galerías (5 m de ancho, alero a 11 m y cumbrera a 13 m), en blanco
def crujia(name, x0, y0, x1, y1, he=11.0, hr=13.0):
    along_x = (x1 - x0) >= (y1 - y0)
    if along_x: ym = (y0 + y1) / 2; V = [(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0), (x0, y0, he), (x1, y0, he), (x1, y1, he), (x0, y1, he), (x0, ym, hr), (x1, ym, hr)]
    else: xm = (x0 + x1) / 2; V = [(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0), (x0, y0, he), (x1, y0, he), (x1, y1, he), (x0, y1, he), (xm, y0, hr), (xm, y1, hr)]
    if along_x: F = [(0, 1, 5, 4), (2, 3, 7, 6), (1, 2, 6, 9, 5), (3, 0, 4, 8, 7), (4, 5, 9, 8), (6, 7, 8, 9)]
    else: F = [(1, 2, 6, 5), (3, 0, 4, 7), (0, 1, 5, 8, 4), (2, 3, 7, 9, 6), (5, 6, 9, 8), (7, 4, 8, 9)]
    me = bpy.data.meshes.new(name); me.from_pydata(V, [], F); me.update()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()   # normales hacia fuera
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); ob.data.materials.append(paper); return ob
crujia('galeria_n', -70, 52, 110, 57); crujia('galeria_o', -70, -60, -65, 52)
me = bpy.data.meshes.new('suelo'); me.from_pydata([(-400, -400, 0), (400, -400, 0), (400, 400, 0), (-400, 400, 0)], [], [(0, 1, 2, 3)]); g = bpy.data.objects.new('suelo', me); nol.objects.link(g); g.data.materials.append(ground)
# trazo
sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
fs = sc.view_layers[0].freestyle_settings; fs.crease_angle = math.radians(150)
ls = fs.linesets[0] if fs.linesets else fs.linesets.new('tinta'); ls.select_by_visibility = True; ls.visibility = 'VISIBLE'; ls.select_by_edge_types = True
ls.select_silhouette = ls.select_border = ls.select_crease = ls.select_external_contour = True
st = ls.linestyle or bpy.data.linestyles.new('tinta'); ls.linestyle = st; st.color = lin('#1A1B20')[:3]; st.thickness = 1.2
ls.select_by_collection = True; ls.collection = nol; ls.collection_negation = 'EXCLUSIVE'
# cámara ortogonal en vista aérea oblicua; acercamiento lento rodeando el cubo
cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam; cam_data.clip_start = 1; cam_data.clip_end = 20000
tgt = bpy.data.objects.new('mira', None); sc.collection.objects.link(tgt); con = cam.constraints.new('TRACK_TO'); con.target = tgt; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
def cam_(tg, half, az, el):
    az, el = math.radians(az), math.radians(el); d = 3000; cam_data.ortho_scale = 2 * half
    cam.location = (tg[0] + math.sin(az) * math.cos(el) * d, tg[1] + math.cos(az) * math.cos(el) * d, tg[2] + math.sin(el) * d); tgt.location = tg
ss = lambda x: 0.0 if x <= 0 else 1.0 if x >= 1 else x * x * (3 - 2 * x)
def camara(t):
    u = ss(t / 6.0); return ((S / 2, S / 2, H * 0.62), 38 - 5 * u, 205 + 17 * u, 22 + 4 * u)
t0 = time.time(); n = len(FRAMES)
for k, f in enumerate(FRAMES):
    cam_(*camara(f / FPS)); sc.render.filepath = f'{OUT}/{f:05d}.png'; bpy.ops.render.render(write_still=True)
    if (k + 1) % 30 == 0 or k + 1 == n or n <= 5: print(f'fotograma {k + 1}/{n} · {time.time() - t0:.0f} s', flush=True)
print('boceto ok', n)
