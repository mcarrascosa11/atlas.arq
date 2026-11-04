# 017 · Balcones en Euskadi (Decreto 80/2022) · vídeo de 36 s en Blender: Cycles en colores planos + Freestyle, como 015 y 016.
# Un bloque de viviendas tipo de los años sesenta (planta baja + 7, seis crujías de 4 m): el balcón de 10 m² (4 x 2,5 m) en bermellón;
# lo que solo está propuesto, en discontinua. Paseo de Bizkaia (balcones solo en el primer piso) y Manteo (saliente en la fachada lateral) son esquemas, no levantamientos.
# uso: blender -b -noaudio -P balcones_video.py -- ESCENA_JSON(no se usa) CARPETA F0 F1 [PORCENTAJE]   (F0 puede ser una lista: 45,142,...)
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
    md = ob.modifiers.new('resta', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cutter; md.solver = 'EXACT'; md.use_self = True   # el cortador puede tener cajas que se tocan
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

glass, shop, sate = mat('vidrio', '#D8D4CA', 0.9), mat('comercio', '#CBC5B9', 0.9), mat('sate', '#E9E5DC', 0.8)
# --- bloques: planta baja de 4 m y 7 plantas de 3 m; seis crujías de 4 m (24 m de fachada) y 12 m de fondo; la fachada principal mira al sur (y = Y0)
PB, HP, NP, NB, CR, FON = 4.0, 3.0, 7, 6, 4.0, 12.0
def zf(p): return PB + (p - 1) * HP                      # cota del suelo de la planta p (1..7)
def ventanas(nm, X0):                                         # todas las ventanas de un bloque en una sola malla (6 caras por ventana): vidrio o bermellón
    bm = bmesh.new()
    for p in range(1, NP + 1):
        for b in range(NB):
            cx = X0 + b * CR + CR / 2; x0, y0, z0, x1, y1, z1 = cx - 0.7, -0.06, zf(p) + 0.9, cx + 0.7, 0, zf(p) + 2.4
            bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Diagonal((x1 - x0, y1 - y0, z1 - z0, 1)))
    me = bpy.data.meshes.new(nm); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(nm, me); link(ob, None); me.materials.append(glass); me.materials.append(red); return ob
def bloque(nm, X0):                                           # pocas mallas por bloque: con cientos de objetos sueltos el trazo se vuelve lentísimo
    cajas(nm, [(X0, 0, 0, X0 + NB * CR, FON, PB + NP * HP), (X0 - 0.3, -0.3, PB + NP * HP - 0.5, X0 + NB * CR + 0.3, FON + 0.3, PB + NP * HP)], paper)
    cajas(nm + '_bajos', [(X0 + b * CR + 0.4, -0.06, 0.3, X0 + b * CR + CR - 0.4, 0, 3.3) for b in range(NB)], shop)
    return ventanas(nm + '_ventanas', X0)
def bal(cx, p, y0=0.0, lado=False):                           # 4 x 2,5 m = 10 m²: losa de 20 cm y barandilla de 1,10 m
    z = zf(p)
    if not lado: return [(cx - 2, y0 - 2.5, z - 0.2, cx + 2, y0, z), (cx - 2, y0 - 2.5, z, cx + 2, y0 - 2.42, z + 1.1), (cx - 2, y0 - 2.5, z, cx - 1.92, y0, z + 1.1), (cx + 1.92, y0 - 2.5, z, cx + 2, y0, z + 1.1)]
    return [(cx, y0 - 2, z - 0.2, cx + 2.5, y0 + 2, z), (cx + 2.42, y0 - 2, z, cx + 2.5, y0 + 2, z + 1.1), (cx, y0 - 2, z, cx + 2.5, y0 - 1.92, z + 1.1), (cx, y0 + 1.92, z, cx + 2.5, y0 + 2, z + 1.1)]
XA, XB, XC = 0.0, 40.0, 80.0
VA = bloque('A', XA); bloque('B', XB); bloque('C', XC)
CXB = XA + 2 * CR + CR / 2                                  # el balcón del gancho: crujía 3, planta 4
B1 = cajas('balcon10', bal(CXB, 4), red)
MITAD = cajas('mitad', [(CXB - 2, -2.5, zf(4) + 0.01, CXB, 0, zf(4) + 0.03)], red, nol)   # «computaban al 50 %»: media losa en bermellón
PA_ = cajas('propA', [q for p in range(1, NP + 1) for b in range(NB) for q in bal(XA + b * CR + CR / 2, p)], paper, pro)        # todos los balcones posibles, en discontinua
EXB = cajas('exB', [q for b in range(NB) for q in bal(XB + b * CR + CR / 2, 1)], paper)                                      # paseo de Bizkaia: solo el primer piso tiene balcón
PB_ = cajas('propB', [q for p in range(2, NP + 1) for b in range(NB) for q in bal(XB + b * CR + CR / 2, p)], paper, pro)      # la propuesta de Balkoitu!: todas las plantas
XE_ = XC + NB * CR
MAN = cajas('manteo', [q for p in range(1, NP + 1) for q in bal(XE_, p, 6.0, True)] + [(XE_ + 2.3, 3.8, 0, XE_ + 2.6, 4.1, zf(NP) + 1.1), (XE_ + 2.3, 7.9, 0, XE_ + 2.6, 8.2, zf(NP) + 1.1)], red)   # Manteo: saliente lateral
SATE = cajas('sate', [(XA - 0.15, -0.18, PB, XA + 3 * CR, 0, PB + NP * HP - 0.5)], sate)   # aislamiento por fuera en media fachada: apenas se ve
RA = cajas('balconesA', [q for p in range(1, NP + 1) for b in range(3, NB) for q in bal(XA + b * CR + CR / 2, p)], red)       # y balcones en la otra media
me = bpy.data.meshes.new('suelo'); me.from_pydata([(-400, -400, 0), (500, -400, 0), (500, 400, 0), (-400, 400, 0)], [], [(0, 1, 2, 3)]); g = bpy.data.objects.new('suelo', me); nol.objects.link(g); g.data.materials.append(ground)
cajas('acera', [(-40, -6, 0.0, 140, 0, 0.15)], ground, nol)
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
import random
NV = NP * NB; ORDEN = list(range(NV)); random.Random(17).shuffle(ORDEN); RANGO = {v: k for k, v in enumerate(ORDEN)}       # orden en que «votan» las ventanas en la escena de la comunidad
TA, TB = (XA + 12, 0.0, 16.0), (XB + 12, 0.0, 16.0); BAL = (CXB, -1.25, zf(4)); CALLE = (XB + 12, -2.0, 10.0)
# una toma por escena (de, a, cámara inicial, cámara final); entre escenas hay corte. Cámara: (objetivo, semialtura, azimut, elevación); azimut 180 = desde el sur
SCN = [(0.0, 3.0, (TA, 25, 212, 14), ((CXB, -1.0, zf(4) + 0.6), 9, 206, 12)),          # el bloque y, en la planta 4, el balcón de 10 m²
       (3.0, 6.5, (BAL, 4.6, 180, 72), (BAL, 4.2, 188, 76)),                           # el balcón en planta: 4 x 2,5 m
       (6.5, 10.0, (BAL, 4.4, 188, 76), (BAL, 4.2, 196, 78)),                           # media losa: computaban al 50 %
       (10.0, 13.0, ((XA + 12, 0.0, 14.5), 23.5, 180, 6), ((XA + 12, 0.0, 14.5), 22.5, 180, 6)),   # todos los balcones posibles, en discontinua
       (13.0, 16.5, (TA, 25, 218, 4), (TA, 23, 226, 5)),                               # sin directrices: se quedan en el papel
       (16.5, 20.0, ((XA + 12, 0.0, 14.5), 23.5, 180, 3), ((XA + 12, 0.0, 14.5), 23.0, 180, 3)),   # la comunidad: las ventanas se van poniendo de acuerdo
       (20.0, 23.0, (TB, 25, 205, 12), (TB, 23, 212, 14)),                             # paseo de Bizkaia: solo el primer piso
       (23.0, 26.0, ((XB + 12, 0.0, 14.5), 23.5, 180, 6), ((XB + 12, 0.0, 14.5), 22.5, 184, 7)),   # la propuesta: en todas las plantas
       (26.0, 30.0, ((XE_ + 1.0, 6.0, 14.0), 22, 125, 12), ((XE_ + 1.0, 6.0, 14.0), 20, 132, 14)),   # Manteo: el saliente lateral
       (30.0, 33.0, ((XA + 12, 0.0, 14.5), 23.5, 180, 4), ((XA + 12, 0.0, 14.5), 22.5, 186, 6)),   # aislamiento que no se ve y balcones que sí
       (33.0, 36.2, (CALLE, 34, 236, 20), (CALLE, 52, 242, 26))]                       # la calle entera en diagonal: la norma ya está
def camara(t):
    for a, b, A, Bv in SCN:
        if a <= t < b:
            u = ss((t - a) / (b - a)); lerp = lambda p, q: p + (q - p) * u; da = (Bv[2] - A[2] + 180) % 360 - 180
            return (tuple(lerp(p, q) for p, q in zip(A[0], Bv[0])), math.exp(lerp(math.log(A[1]), math.log(Bv[1]))), A[2] + da * u, lerp(A[3], Bv[3]))
    return SCN[-1][3]
def ver(objs, v):
    for o in (objs if isinstance(objs, list) else [objs]): o.hide_render = not v
def estado(t):
    B1.scale = (1, max(0.02, ss((t - 0.5) / 0.7)), 1)                 # el balcón sale de la fachada al empezar
    ver(B1, t < 10.0); B1.data.materials[0] = red if t < 6.5 else paper   # en la escena del 50 %, losa en blanco y media en bermellón
    ver(MITAD, 6.5 <= t < 10.0)
    ver(PA_, 10.0 <= t < 16.5 or t >= 33.0)
    n = int(NV * ss((t - 16.7) / 3.0)) if 16.5 <= t < 20.0 else 0     # la comunidad: cada vivienda que dice sí, en bermellón
    pol = VA.data.polygons
    for w in range(NV):
        mi = 1 if RANGO[w] < n else 0
        for q in range(6 * w, 6 * w + 6): pol[q].material_index = mi
    VA.data.update()
    ver(PB_, 23.0 <= t < 26.0 or t >= 33.0)
    ver(MAN, t >= 26.0)
    ver(SATE, 30.0 <= t < 33.0); ver(RA, 30.0 <= t < 33.0)
t0 = time.time(); n = len(FRAMES)
for k, f in enumerate(FRAMES):
    t = f / FPS; estado(t); cam_(*camara(t)); sc.render.filepath = f'{OUT}/{f:05d}.png'; bpy.ops.render.render(write_still=True)
    if (k + 1) % 30 == 0 or k + 1 == n or n <= 15: print(f'fotograma {k + 1}/{n} · {time.time() - t0:.0f} s', flush=True)
print('vídeo ok', n)
