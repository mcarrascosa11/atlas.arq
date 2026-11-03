# 016 · San Cataldo (Aldo Rossi y Gianni Braghieri, Módena, 1971-) · vídeo de 36 s en Blender: Cycles en colores planos + Freestyle, como Sarnago.
# Lo construido va en trazo continuo; lo que nunca se hizo (el cono de la fosa común y las 15 costillas del triángulo) en trazo discontinuo.
# Planta y medidas sacadas de la maqueta de SketchUp que pasó Marcos (maqueta_cementerio_aldo_rossi_2014.skp, escalada x1,26 para que el recinto mida
# 277 x 183 m y el cono sus 25 m documentados): cubo de 18,9 x 18,9 x 14,7 m con muros de 1,07 m, 9 columnas de huecos de 1,1 m (puertas abajo y 6 filas
# de ventanas); U central de 5 m de alto; 15 costillas de 2,2 m en triángulo hacia el cono (de 4,5 a 11,5 m de alto); cono de 16 a 5,5 m de diámetro.
# Detrás de la fachada del cubo, un paso de 0,9 m y el muro de nichos (1 m): unos 3 m de grueso en total, como recoge la documentación.
# Documentado aparte: galerías de 5 m de ancho y 13 m de alto, cementerio de Costa de 272 x 180 m al este. Sin construir: costillas y cono.
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
# --- recinto nuevo (Rossi): galerías alrededor del patio; en el eje sur-norte, el cubo junto a la entrada sur, la U, el triángulo de costillas y el cono
LX, LY, WG = 277.0, 183.0, 5.0; X0, Y0 = 0.0, 0.0
GAL = [crujia('gal_s', X0, Y0, X0 + LX, Y0 + WG), crujia('gal_n', X0, Y0 + LY - WG, X0 + LX, Y0 + LY),
       crujia('gal_o', X0, Y0 + WG, X0 + WG, Y0 + LY - WG), crujia('gal_e', X0 + LX - WG, Y0 + WG, X0 + LX, Y0 + LY - WG)]
XE = 138.5                                                                               # eje sur-norte
S, E, H = 18.9, 1.07, 14.73; cx0, cy0 = 129.05, 20.04; XCUBO, YC = cx0 + S / 2, cy0 + S / 2
GI, EI = 0.9, 1.0; A0, A1 = E + GI, E + GI + EI                                     # detrás de la fachada, un paso de 0,9 m y el muro de nichos de 1 m: ~3 m en total
def mat_cubo():                                   # bermellón con la retícula de nichos pintada solo en las caras del patio
    m = mat('rojo_cubo', '#E2401C', 0.8); nt = m.node_tree; mul = [n for n in nt.nodes if n.bl_idname == 'ShaderNodeMix'][0]
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Position'], sep.inputs[0])
    def op(o, a=None, b=None):
        n = nt.nodes.new('ShaderNodeMath'); n.operation = o
        for k, v in enumerate((a, b)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[k].default_value = v
            else: nt.links.new(v, n.inputs[k])
        return n.outputs[0]
    dx, dy = op('ABSOLUTE', op('SUBTRACT', sep.outputs['X'], XCUBO)), op('ABSOLUTE', op('SUBTRACT', sep.outputs['Y'], YC)); d = op('MAXIMUM', dx, dy)
    patio = op('MULTIPLY', op('GREATER_THAN', d, S / 2 - A1 - 0.05), op('LESS_THAN', d, S / 2 - A1 + 0.05))   # cara del muro de nichos hacia el patio
    u = op('ADD', sep.outputs['X'], sep.outputs['Y']); cu = op('LESS_THAN', op('FRACT', op('DIVIDE', u, 0.75)), 0.72); cz = op('LESS_THAN', op('FRACT', op('DIVIDE', sep.outputs['Z'], 0.75)), 0.72)
    fac = op('MULTIPLY', op('MULTIPLY', patio, op('MULTIPLY', cu, cz)), op('GREATER_THAN', sep.outputs['Z'], 0.6))
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[6].default_value = lin('#E2401C'); mx.inputs[7].default_value = lin('#B8340F')
    nt.links.new(fac, mx.inputs['Factor']); nt.links.new(mx.outputs[2], mul.inputs[6]); return m
redc = mat_cubo()
cubo = cajas('cubo', [(cx0, cy0, 0, cx0 + S, cy0 + S, H)], redc)
restar(cubo, cajas('vacio', [(cx0 + E, cy0 + E, -1, cx0 + S - E, cy0 + S - E, H + 1)], paper))
COLS = [0.89 + c * 1.99 for c in range(9)]; FILAS = [(0.0, 2.14)] + [(3.02 + r * 1.97, 3.02 + r * 1.97 + 1.09) for r in range(6)]   # puertas abajo y 6 filas de ventanas
HU = [[], [], [], []]                              # un cortador por cara: así las cajas de dos caras no se solapan en las esquinas
for a_ in COLS:
    for z0, z1 in FILAS:
        z0 = z0 - (1.0 if z0 == 0 else 0)
        HU[0].append((cx0 + a_, cy0 - 1, z0, cx0 + a_ + 1.1, cy0 + E + 0.5, z1)); HU[1].append((cx0 + a_, cy0 + S - E - 0.5, z0, cx0 + a_ + 1.1, cy0 + S + 1, z1))
        HU[2].append((cx0 - 1, cy0 + a_, z0, cx0 + E + 0.5, cy0 + a_ + 1.1, z1)); HU[3].append((cx0 + S - E - 0.5, cy0 + a_, z0, cx0 + S + 1, cy0 + a_ + 1.1, z1))
for k, boxes in enumerate(HU): restar(cubo, cajas(f'huecos{k}', boxes, paper))
ZN = 2.3                                          # el columbario arranca por encima de las puertas: por abajo se sigue pasando al patio
nichos = cajas('nichos', [(cx0 + A0, cy0 + A0, ZN, cx0 + S - A0, cy0 + A1, H), (cx0 + A0, cy0 + S - A1, ZN, cx0 + S - A0, cy0 + S - A0, H),
                          (cx0 + A0, cy0 + A1, ZN, cx0 + A1, cy0 + S - A1, H), (cx0 + S - A1, cy0 + A1, ZN, cx0 + S - A0, cy0 + S - A1, H)], redc)   # columbario: tapa los huecos por detrás
import glob
OBJP = (sorted(glob.glob('datos/sancataldo/*.obj')) or [''])[0]; SMQ = 1.262             # maqueta de SketchUp de Marcos (se llame como se llame el .obj), a escala real: el cono sale con sus 25 m
MAQ = bool(OBJP) and os.path.exists(OBJP)
if MAQ:
    antes = set(bpy.data.objects); bpy.ops.wm.obj_import(filepath=OBJP, forward_axis='NEGATIVE_Z', up_axis='Y')
    nuevos = [o for o in bpy.data.objects if o not in antes and o.type == 'MESH']; bm = bmesh.new()
    for o in nuevos:                              # todo en una malla, sin personas, cristales, césped ni zócalo
        me_ = o.data; me_.transform(o.matrix_world); mats = [m.name if m else '' for m in me_.materials]
        b2 = bmesh.new(); b2.from_mesh(me_)
        malas = [f for f in b2.faces if f.material_index < len(mats) and any(k in mats[f.material_index] for k in ('Chris', 'Grass', 'Charcoal', 'Translucent'))]
        bmesh.ops.delete(b2, geom=malas, context='FACES'); tmp = bpy.data.meshes.new('tmp'); b2.to_mesh(tmp); b2.free(); bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
        bpy.data.objects.remove(o, do_unlink=True)
    for v in bm.verts: v.co = ((v.co.x - 1075.83) * SMQ, (v.co.y - 450.68) * SMQ, v.co.z * SMQ)   # mismo marco que el esquema: recinto de 0 a 277 x 0 a 183 m
    fuera, costi = [], []
    for f in bm.faces:
        c = f.calc_center_median(); zs = [v.co.z for v in f.verts]
        en_cubo = 127.5 < c.x < 150.5 and 18.5 < c.y < 40.5                      # el cubo de la maqueta se sustituye por el nuestro, macizo
        en_cono = 129.0 < c.x < 148.0 and 129.5 < c.y < 149.0 and max(zs) > 0.3   # el cono se dibuja aparte, en discontinua
        suelo = max(zs) < 0.05 or min(zs) < -0.5                                  # terreno y zócalo: el suelo es el nuestro
        if en_cubo or en_cono or suelo: fuera.append(f)
        elif 102.0 < c.x < 175.0 and 63.0 < c.y < 129.0: costi.append(f)          # el triángulo de costillas: proyecto, sin construir en su mayor parte
    bmesh.ops.delete(bm, geom=fuera, context='FACES')
    bm2 = bm.copy(); quitar = [f for f in bm2.faces if not (102.0 < f.calc_center_median().x < 175.0 and 63.0 < f.calc_center_median().y < 129.0)]
    bmesh.ops.delete(bm2, geom=quitar, context='FACES'); bmesh.ops.delete(bm, geom=costi, context='FACES')
    meC = bpy.data.meshes.new('maqueta'); bm.to_mesh(meC); bm.free(); MQ = bpy.data.objects.new('maqueta', meC); link(MQ, None); MQ.data.materials.clear(); MQ.data.materials.append(paper)
    meR = bpy.data.meshes.new('costillas'); bm2.to_mesh(meR); bm2.free(); espina = bpy.data.objects.new('costillas', meR); link(espina, pro); espina.data.materials.clear(); espina.data.materials.append(paper)
    for o_ in GAL: bpy.data.objects.remove(o_, do_unlink=True)
    GAL = [MQ]; print('maqueta', len(meC.polygons), 'caras construidas', len(meR.polygons), 'de costillas', flush=True)
# U central (construida): barra de 5,8 m al norte del cubo, abierta en el eje, y dos brazos hacia el norte; 5 m de alto
if not MAQ: U = cajas('u_central', [(50.6, 54.1, 0, 132.0, 59.9, 5.0), (141.0, 54.1, 0, 223.9, 59.9, 5.0), (50.6, 59.9, 0, 54.9, 126.7, 5.0), (218.1, 59.9, 0, 223.9, 126.7, 5.0)], paper)
# costillas (sin construir): 15 piezas de 2,2 m en triángulo, más cortas y más altas hacia el cono (4,5 a 11,5 m), partidas por el paso central
RIB = []
for k in (range(0) if MAQ else range(15)):
    y = 59.3 + k * (125.5 - 59.3) / 14; f = k / 14; xl, xr = 101.6 + f * (128.0 - 101.6), 175.4 + f * (149.0 - 175.4); h = 4.5 + 0.5 * k
    RIB += [(xl, y, 0, 137.2, y + 2.2, h), (139.8, y, 0, xr, y + 2.2, h)]
if not MAQ: espina = cajas('costillas', RIB, paper, pro)
else: U = cajas('u_vacia', [(0, 0, -50, 0.1, 0.1, -49.9)], paper, nol)   # la U ya va dentro de la maqueta
# cono de la fosa común (sin construir): 25 m de alto, de 16 m a 5,5 m de diámetro
XCONO, YCONO = 138.5, 139.2
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=8.0, radius2=2.75, depth=25.0, matrix=Matrix.Translation((XCONO, YCONO, 12.5)))
me = bpy.data.meshes.new('cono'); bm.to_mesh(me); bm.free(); cono = bpy.data.objects.new('cono', me); link(cono, pro); cono.data.materials.append(paper)
for p in cono.data.polygons: p.use_smooth = True
# --- cementerio de Costa (1858-1876): cuadripórtico de 272 x 180 m con columnas dóricas hacia el patio
CX0, CY0, CL, CW = LX + 10.0, 1.5, 272.0, 180.0
cost = [cajas('costa', [(CX0, CY0, 0, CX0 + CL, CY0 + 7, 9), (CX0, CY0 + CW - 7, 0, CX0 + CL, CY0 + CW, 9), (CX0, CY0 + 7, 0, CX0 + 7, CY0 + CW - 7, 9), (CX0 + CL - 7, CY0 + 7, 0, CX0 + CL, CY0 + CW - 7, 9)], paper)]
bm = bmesh.new()
for xs, ys, dx, dy, n in ((CX0 + 9, CY0 + 9, 4.0, 0, 64), (CX0 + 9, CY0 + CW - 9, 4.0, 0, 64), (CX0 + 9, CY0 + 13, 0, 4.0, 39), (CX0 + CL - 9, CY0 + 13, 0, 4.0, 39)):
    for j in range(n): bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.45, radius2=0.45, depth=7.5, matrix=Matrix.Translation((xs + dx * j, ys + dy * j, 3.75)))
me = bpy.data.meshes.new('columnas'); bm.to_mesh(me); bm.free(); col = bpy.data.objects.new('columnas', me); link(col, None); col.data.materials.append(paper)
for p in col.data.polygons: p.use_smooth = True
cost.append(col)
me = bpy.data.meshes.new('suelo'); me.from_pydata([(-500, -500, 0), (1100, -500, 0), (1100, 700, 0), (-500, 700, 0)], [], [(0, 1, 2, 3)]); g = bpy.data.objects.new('suelo', me); nol.objects.link(g); g.data.materials.append(ground)
# solar vacío del concurso: contorno en bermellón sobre el suelo (sin trazo)
redl = mat('linea_roja', '#E2401C', 1.0)
costa_patio = cajas('costa_patio', [(CX0, CY0, 0.02, CX0 + CL, CY0 + CW, 0.08)], mat('patio_costa', '#E4E0D6', 1.0), nol)
solar_rel = cajas('solar_relleno', [(X0, Y0, 0.02, X0 + LX, Y0 + LY, 0.08)], mat('solar_claro', '#F3C1B0', 1.0), nol)
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
CU = (XCUBO, YC, H * 0.55); CO = (XCONO, YCONO, 13.0); EJE = (XE, 80.0, 0.0); FS = (XCUBO, cy0, 8.5); TODO = (LX / 2, LY / 2, 0.0)
# una toma por escena (de, a, cámara inicial, cámara final); entre escenas hay corte. Cámara: (objetivo, semialtura, azimut, elevación); azimut 180 = desde el sur
SCN = [(0.0, 3.0, ((LX / 2 + 10, LY / 2, 0.0), 168, 270, 40), ((LX / 2 + 10, LY / 2, 0.0), 158, 278, 42)),   # el cementerio entero desde el oeste, con el cubo en bermellón
       (3.0, 6.5, ((LX / 2 + 10, LY / 2, 0.0), 160, 278, 44), ((LX / 2 + 10, LY / 2, 0.0), 150, 286, 46)),   # el conjunto «imaginado»: solo trazo
       (6.5, 10.0, ((377.0, 91.5, 0.0), 395, 270, 80), ((377.0, 91.5, 0.0), 380, 270, 82)),               # planta: Costa arriba (al este) y el solar del concurso abajo
       (10.0, 13.0, (TODO, 175, 222, 30), (TODO, 160, 230, 32)),          # se levantan las galerías alrededor del patio
       (13.0, 16.5, (CU, 26, 205, 60), (CU, 23, 212, 64)),               # el cubo desde arriba, con el patio alrededor
       (16.5, 20.0, (FS, 15, 180, 2), (FS, 14, 180, 2)),                 # la fachada sur de frente: puertas y ventanas sin carpintería
       (20.0, 23.0, ((XE, 88.0, 6.0), 64, 180, 18), ((XE, 92.0, 6.0), 58, 180, 20)),   # por el eje: el cubo delante, las costillas y al fondo el cono
       (23.0, 26.0, ((XCONO, YCONO, 18.0), 18, 186, 3), ((XCONO, YCONO, 18.0), 16, 180, 4)),   # el cono como una chimenea
       (26.0, 30.0, ((LX / 2 - 10, LY / 2, 0.0), 168, 90, 44), ((LX / 2 - 10, LY / 2, 0.0), 158, 82, 46)),   # el conjunto desde el este: lo construido y lo que falta
       (30.0, 33.0, (CU, 40, 40, 22), (CU, 36, 48, 24)),                 # vuelta al cubo, con el patio detrás
       (33.0, 36.2, (CO, 30, 190, 14), ((LX / 2, LY / 2 + 10, 0.0), 168, 200, 40))]   # del cono al cementerio entero: sigue esperando
def camara(t):
    for a, b, A, Bv in SCN:
        if a <= t < b:
            u = ss((t - a) / (b - a)); lerp = lambda p, q: p + (q - p) * u; da = (Bv[2] - A[2] + 180) % 360 - 180
            return (tuple(lerp(p, q) for p, q in zip(A[0], Bv[0])), math.exp(lerp(math.log(A[1]), math.log(Bv[1]))), A[2] + da * u, lerp(A[3], Bv[3]))
    return SCN[-1][3]
def estado(t):
    imagina = 3.0 <= t < 6.5                                       # el conjunto «imaginado»: solo trazo, sin color
    cubo.data.materials[0] = nichos.data.materials[0] = paper if imagina else redc
    vis_galer = (t < 6.5 or t >= 10.0) and not (16.5 <= t < 20.0)  # galerías: en las vistas del conjunto y desde «una ciudad de los muertos»; fuera en la fachada de frente
    for o in GAL + [U]: o.hide_render = not vis_galer
    kg = ss((t - 10.0) / 1.6) if 10.0 <= t < 11.6 else 1.0            # vuelven a levantarse en «una ciudad de los muertos»
    for o in GAL + [U]: o.scale = (1, 1, max(0.02, kg)) if vis_galer else (1, 1, 1)
    SOL.hide_render = solar_rel.hide_render = costa_patio.hide_render = not (6.5 <= t < 10.0)
    cono.hide_render = not (t >= 20.0); espina.hide_render = not (t >= 20.0)
    cubo.hide_render = nichos.hide_render = (6.5 <= t < 10.0) or (23.0 <= t < 26.0)   # fuera solo en la planta y en el cono como chimenea
    for o in cost: o.hide_render = not (6.5 <= t < 10.0)            # Costa solo en la planta del concurso (desde el este taparía el recinto)
t0 = time.time(); n = len(FRAMES)
for k, f in enumerate(FRAMES):
    t = f / FPS; estado(t); cam_(*camara(t)); sc.render.filepath = f'{OUT}/{f:05d}.png'; bpy.ops.render.render(write_still=True)
    if (k + 1) % 30 == 0 or k + 1 == n or n <= 15: print(f'fotograma {k + 1}/{n} · {time.time() - t0:.0f} s', flush=True)
print('vídeo ok', n)
