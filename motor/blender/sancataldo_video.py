# 016 · San Cataldo (Aldo Rossi y Gianni Braghieri, Módena, 1971-) · vídeo de 36 s en Blender: Cycles en colores planos + Freestyle, como Sarnago.
# Lo construido va en trazo continuo; lo que nunca se hizo (el cono de la fosa común y la espina de 14 piezas) en trazo discontinuo.
# Medidas documentadas: ventanas del cubo de 2 m en 9 columnas x 7 filas por cara; recinto de galerías de 5 m de ancho y 13 m de alto;
# cono de 25 m de alto y de 16 a 5,5 m de diámetro; espina de 14 piezas de 2 m de ancho entre 4,5 y 11,5 m; cementerio de Costa de 272 x 180 m.
# Estimadas para el dibujo (se señalan en los bocetos): lado del cubo, grosor de muros y posición relativa de cubo, espina y cono en el patio.
# uso: blender -b -noaudio -P sancataldo_video.py -- ESCENA_JSON(no se usa) CARPETA F0 F1 [PORCENTAJE]   (F0 puede ser una lista: 45,142,...)
import bpy, bmesh, math, sys, os, time
from mathutils import Matrix
argv = sys.argv[sys.argv.index('--') + 1:]; OUT = argv[1]; os.makedirs(OUT, exist_ok=True)
FRAMES = [int(x) for x in argv[2].split(',')] if ',' in argv[2] else list(range(int(argv[2]), int(argv[3]) + 1)); PCT = int(argv[4]) if len(argv) > 4 else 100
FPS = 30
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 4; sc.cycles.use_denoising = False; sc.cycles.device = 'CPU'; sc.render.use_persistent_data = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, PCT; sc.view_settings.view_transform = 'Standard'
def lin(h): c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]; return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]
w = bpy.data.worlds.new('papel'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = lin('#F2F1EC')
def mat(name, hexc, lo=0.74, ventanas=False):    # color plano con sombreado suave por orientación; con ventanas: huecos cuadrados pintados en los muros
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    geo = nt.nodes.new('ShaderNodeNewGeometry'); dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; dot.inputs[1].default_value = (0.35, -0.45, 0.82)
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs[1].default_value = -0.2; mr.inputs[2].default_value = 1.0; mr.inputs[3].default_value = lo; mr.inputs[4].default_value = 1.0
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0; mul.inputs[6].default_value = lin(hexc)
    em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial'); comb = nt.nodes.new('ShaderNodeCombineColor')
    nt.links.new(geo.outputs['Normal'], dot.inputs[0]); nt.links.new(dot.outputs['Value'], mr.inputs[0]); [nt.links.new(mr.outputs[0], comb.inputs[i]) for i in range(3)]
    nt.links.new(comb.outputs[0], mul.inputs[7]); nt.links.new(mul.outputs[2], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
    if ventanas:                                  # cadencia regular de ventanas cuadradas (1,2 m cada 3 m) en dos alturas, solo en caras verticales
        sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'], sep.inputs[0]); sn = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Normal'], sn.inputs[0])
        def op(o, a=None, b=None):
            n = nt.nodes.new('ShaderNodeMath'); n.operation = o
            for k, v in enumerate((a, b)):
                if v is None: continue
                if isinstance(v, (int, float)): n.inputs[k].default_value = v
                else: nt.links.new(v, n.inputs[k])
            return n.outputs[0]
        u = op('ADD', sep.outputs['X'], sep.outputs['Y']); fu = op('FRACT', op('DIVIDE', u, 3.0)); cu = op('LESS_THAN', fu, 0.4)
        z = sep.outputs['Z']; r1 = op('MULTIPLY', op('GREATER_THAN', z, 2.6), op('LESS_THAN', z, 3.8)); r2 = op('MULTIPLY', op('GREATER_THAN', z, 7.0), op('LESS_THAN', z, 8.2))
        vert = op('LESS_THAN', op('ABSOLUTE', sn.outputs['Z']), 0.2); fac = op('MULTIPLY', op('MULTIPLY', cu, op('MAXIMUM', r1, r2)), vert)
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[6].default_value = lin(hexc); mx.inputs[7].default_value = lin('#C9C3B6')
        nt.links.new(fac, mx.inputs['Factor']); nt.links.new(mx.outputs[2], mul.inputs[6])
    return m
paper, red, ground, galer = mat('papel', '#F7F6F2'), mat('rojo', '#E2401C', 0.8), mat('suelo', '#F4F3EE', 0.86), mat('galerias', '#F7F6F2', 0.74, True)
nol = bpy.data.collections.new('sin_lineas'); sc.collection.children.link(nol)          # suelo y marcas: sin trazo
pro = bpy.data.collections.new('proyecto'); sc.collection.children.link(pro)           # lo no construido: trazo discontinuo en bermellón
con = bpy.data.collections.new('construido'); sc.collection.children.link(con)         # lo construido: tinta continua
def link(ob, col): (col or con).objects.link(ob); return ob
def cajas(name, boxes, m, col=None):
    bm = bmesh.new()
    for x0, y0, z0, x1, y1, z1 in boxes:
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal((x1 - x0, y1 - y0, z1 - z0, 1)))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); link(ob, col); ob.data.materials.append(m); return ob
def restar(ob, cutter):
    md = ob.modifiers.new('resta', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cutter; md.solver = 'EXACT'
    bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.modifier_apply(modifier=md.name); bpy.data.objects.remove(cutter, do_unlink=True)
def prisma(name, V, F, m, col=None):
    me = bpy.data.meshes.new(name); me.from_pydata(V, [], F); me.update(); bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); link(ob, col); ob.data.materials.append(m); return ob
def crujia(name, x0, y0, x1, y1, he=11.0, hr=13.0, m=None):    # galería de colombarios: muro de 5 m de ancho, alero a 11 m y cumbrera a 13 m
    if (x1 - x0) >= (y1 - y0):
        ym = (y0 + y1) / 2; V = [(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0), (x0, y0, he), (x1, y0, he), (x1, y1, he), (x0, y1, he), (x0, ym, hr), (x1, ym, hr)]
        F = [(0, 1, 5, 4), (2, 3, 7, 6), (1, 2, 6, 9, 5), (3, 0, 4, 8, 7), (4, 5, 9, 8), (6, 7, 8, 9), (0, 3, 2, 1)]
    else:
        xm = (x0 + x1) / 2; V = [(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0), (x0, y0, he), (x1, y0, he), (x1, y1, he), (x0, y1, he), (xm, y0, hr), (xm, y1, hr)]
        F = [(1, 2, 6, 5), (3, 0, 4, 7), (0, 1, 5, 8, 4), (2, 3, 7, 9, 6), (5, 6, 9, 8), (7, 4, 8, 9), (0, 3, 2, 1)]
    return prisma(name, V, F, m or galer)
# --- recinto nuevo (Rossi): rectángulo de galerías alrededor de un patio; el cubo y el cono en los extremos de la espina central
LX, LY, WG = 346.0, 188.0, 5.0; X0, Y0 = -LX - 30, 0.0                                # recinto al oeste del de Costa, separado por un paso de servicio
GAL = [crujia('gal_s', X0, Y0, X0 + LX, Y0 + WG), crujia('gal_n', X0, Y0 + LY - WG, X0 + LX, Y0 + LY),
       crujia('gal_o', X0, Y0 + WG, X0 + WG, Y0 + LY - WG), crujia('gal_e', X0 + LX - WG, Y0 + WG, X0 + LX, Y0 + LY - WG)]
YC = Y0 + LY / 2; XCUBO, XCONO = X0 + LX - 70, X0 + 110                               # eje central este-oeste
S, E, W, P, H = 26.0, 0.6, 2.0, 0.8, 26.0; ZB = H - 1.6 - (7 * W + 6 * P)
cx0, cy0 = XCUBO - S / 2, YC - S / 2
cubo = cajas('cubo', [(cx0, cy0, 0, cx0 + S, cy0 + S, H)], red)
restar(cubo, cajas('vacio', [(cx0 + E, cy0 + E, -1, cx0 + S - E, cy0 + S - E, H + 1)], paper))
HU = []
for c in range(9):
    for r in range(7):
        a, z = P + c * (W + P), ZB + r * (W + P)
        HU += [(cx0 + a, cy0 - 1, z, cx0 + a + W, cy0 + E + 1, z + W), (cx0 + a, cy0 + S - E - 1, z, cx0 + a + W, cy0 + S + 1, z + W),
               (cx0 - 1, cy0 + a, z, cx0 + E + 1, cy0 + a + W, z + W), (cx0 + S - E - 1, cy0 + a, z, cx0 + S + 1, cy0 + a + W, z + W)]
restar(cubo, cajas('huecos', HU, paper))
cubo_m = cubo.data.materials
# cono de la fosa común (no construido): 25 m de alto, de 16 m a 5,5 m de diámetro
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=8.0, radius2=2.75, depth=25.0, matrix=Matrix.Translation((XCONO, YC, 12.5)))
me = bpy.data.meshes.new('cono'); bm.to_mesh(me); bm.free(); cono = bpy.data.objects.new('cono', me); link(cono, pro); cono.data.materials.append(paper)
for p in cono.data.polygons: p.use_smooth = True
# espina (no construida): 14 piezas de 2 m de ancho; la altura crece hacia el cono mientras la longitud decrece (de 4,5 a 11,5 m)
ESP = []
for i in range(14):
    k = i / 13; x = XCUBO - S / 2 - 14 - i * ((XCUBO - S / 2 - 14) - (XCONO + 14)) / 13; hgt = 4.5 + 7.0 * k; L = 11.5 - 7.0 * k
    ESP.append((x - 1, YC - L / 2, 0, x + 1, YC + L / 2, hgt))
espina = cajas('espina', ESP, paper, pro)
# --- cementerio de Costa (1858-1876): cuadripórtico de 272 x 180 m con columnas dóricas hacia el patio
CX0, CY0, CL, CW = 0.0, 4.0, 272.0, 180.0
cost = [cajas('costa', [(CX0, CY0, 0, CX0 + CL, CY0 + 7, 9), (CX0, CY0 + CW - 7, 0, CX0 + CL, CY0 + CW, 9), (CX0, CY0 + 7, 0, CX0 + 7, CY0 + CW - 7, 9), (CX0 + CL - 7, CY0 + 7, 0, CX0 + CL, CY0 + CW - 7, 9)], paper)]
bm = bmesh.new()
for xs, ys, dx, dy, n in ((CX0 + 9, CY0 + 9, 4.0, 0, 64), (CX0 + 9, CY0 + CW - 9, 4.0, 0, 64), (CX0 + 9, CY0 + 13, 0, 4.0, 39), (CX0 + CL - 9, CY0 + 13, 0, 4.0, 39)):
    for j in range(n): bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.45, radius2=0.45, depth=7.5, matrix=Matrix.Translation((xs + dx * j, ys + dy * j, 3.75)))
me = bpy.data.meshes.new('columnas'); bm.to_mesh(me); bm.free(); col = bpy.data.objects.new('columnas', me); link(col, None); col.data.materials.append(paper)
for p in col.data.polygons: p.use_smooth = True
cost.append(col)
me = bpy.data.meshes.new('suelo'); me.from_pydata([(-900, -600, 0), (700, -600, 0), (700, 800, 0), (-900, 800, 0)], [], [(0, 1, 2, 3)]); g = bpy.data.objects.new('suelo', me); nol.objects.link(g); g.data.materials.append(ground)
# solar vacío del concurso: contorno en bermellón sobre el suelo (sin trazo)
redl = mat('linea_roja', '#E2401C', 1.0)
SOL = cajas('solar', [(X0, Y0 - 0.6, 0.02, X0 + LX, Y0 + 0.6, 0.12), (X0, Y0 + LY - 0.6, 0.02, X0 + LX, Y0 + LY + 0.6, 0.12), (X0 - 0.6, Y0, 0.02, X0 + 0.6, Y0 + LY, 0.12), (X0 + LX - 0.6, Y0, 0.02, X0 + LX + 0.6, Y0 + LY, 0.12)], redl, nol)
# --- trazo: tinta continua para lo construido; bermellón discontinuo para lo que nunca se hizo
sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
fs = sc.view_layers[0].freestyle_settings; fs.crease_angle = math.radians(150)
def lineset(name, coll, color, thick, dashed=False):
    l = fs.linesets[0] if (name == 'tinta' and fs.linesets) else fs.linesets.new(name); l.name = name
    l.select_by_visibility = True; l.visibility = 'VISIBLE'; l.select_by_edge_types = True
    l.select_silhouette = l.select_border = l.select_crease = l.select_external_contour = True
    l.select_by_collection = True; l.collection = coll; l.collection_negation = 'INCLUSIVE'
    st = bpy.data.linestyles.new(name); l.linestyle = st; st.color = lin(color)[:3]; st.thickness = thick
    if dashed: st.use_dashed_line = True; st.dash1 = 9; st.gap1 = 6
lineset('tinta', con, '#1A1B20', 1.2); lineset('proyecto', pro, '#E2401C', 1.6, True)
# --- cámara ortogonal
cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam; cam_data.clip_start = 1; cam_data.clip_end = 30000
tgt = bpy.data.objects.new('mira', None); sc.collection.objects.link(tgt); tc = cam.constraints.new('TRACK_TO'); tc.target = tgt; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
def cam_(tg, half, az, el):
    az, el = math.radians(az), math.radians(el); d = 5000; cam_data.ortho_scale = 2 * half
    cam.location = (tg[0] + math.sin(az) * math.cos(el) * d, tg[1] + math.cos(az) * math.cos(el) * d, tg[2] + math.sin(el) * d); tgt.location = tg
ss = lambda x: 0.0 if x <= 0 else 1.0 if x >= 1 else x * x * (3 - 2 * x)
CU = (XCUBO, YC, H * 0.55); CO = (XCONO, YC, 13.0); MIDE = (X0 + LX / 2, YC, 0.0); TODO = ((X0 + CX0 + CL) / 2, (Y0 + LY) / 2, 0.0); FR_ = (XCUBO, cy0, 14.0)
# una toma por escena (de, a, cámara inicial, cámara final); entre escenas hay corte. Cámara: (objetivo, semialtura, azimut, elevación)
SCN = [(0.0, 3.0, (CU, 36, 205, 24), (CU, 32, 222, 26)),                 # el cubo, desde el primer fotograma
       (3.0, 6.5, (CU, 34, 222, 30), (CU, 46, 232, 34)),                 # el cubo imaginado: solo trazo
       (6.5, 10.0, (TODO, 330, 270, 58), (TODO, 300, 270, 56)),          # el cementerio de Costa y el solar del concurso
       (10.0, 13.0, (MIDE, 175, 262, 40), (MIDE, 165, 268, 38)),         # se levantan las galerías
       (13.0, 16.5, (CU, 30, 200, 62), (CU, 27, 210, 66)),               # el cubo desde arriba: sin techo ni suelos
       (16.5, 20.0, (FR_, 17, 180, 6), (FR_, 15, 186, 8)),               # la fachada: ventanas sin carpintería
       (20.0, 23.0, (CO, 26, 160, 16), (CO, 24, 168, 14)),               # el cono, en discontinua
       (23.0, 26.0, ((XCONO, YC, 18.0), 18, 150, 3), ((XCONO, YC, 18.0), 16, 158, 4)),   # el cono como una chimenea
       (26.0, 30.0, (MIDE, 165, 262, 46), (MIDE, 150, 270, 44)),         # todo: lo construido y lo que falta
       (30.0, 33.0, (CU, 40, 236, 22), (CU, 36, 242, 24)),               # vuelta al cubo
       (33.0, 36.2, (CO, 32, 150, 12), (CO, 44, 140, 16))]               # el cono sigue esperando
def camara(t):
    for a, b, A, Bv in SCN:
        if a <= t < b:
            u = ss((t - a) / (b - a)); lerp = lambda p, q: p + (q - p) * u; da = (Bv[2] - A[2] + 180) % 360 - 180
            return (tuple(lerp(p, q) for p, q in zip(A[0], Bv[0])), math.exp(lerp(math.log(A[1]), math.log(Bv[1]))), A[2] + da * u, lerp(A[3], Bv[3]))
    return SCN[-1][3]
def estado(t):
    imagina = 3.0 <= t < 6.5                                       # el cubo «imaginado»: solo trazo, sin color
    cubo.data.materials[0] = paper if imagina else red
    vis_galer = t >= 10.0 or t < 0                                 # las galerías se levantan con «una ciudad de los muertos»
    for o in GAL: o.hide_render = not vis_galer
    kg = ss((t - 10.0) / 1.6) if 10.0 <= t < 11.6 else 1.0
    for o in GAL: o.scale = (1, 1, max(0.02, kg)) if vis_galer else (1, 1, 1)
    SOL.hide_render = not (6.5 <= t < 10.4)
    cono.hide_render = not (t >= 20.0); espina.hide_render = not (26.0 <= t < 30.0)
    cubo.hide_render = (6.5 <= t < 10.0) or (20.0 <= t < 26.0) or t >= 33.0
    for o in cost: o.hide_render = not (6.5 <= t < 13.0 or 26.0 <= t < 30.0)
t0 = time.time(); n = len(FRAMES)
for k, f in enumerate(FRAMES):
    t = f / FPS; estado(t); cam_(*camara(t)); sc.render.filepath = f'{OUT}/{f:05d}.png'; bpy.ops.render.render(write_still=True)
    if (k + 1) % 30 == 0 or k + 1 == n or n <= 15: print(f'fotograma {k + 1}/{n} · {time.time() - t0:.0f} s', flush=True)
print('vídeo ok', n)
