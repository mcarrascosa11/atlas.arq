# 017 · El Museo Nacional del Ecuador (MuNa) · vídeo de 36 s en Blender: Cycles en colores planos + Freestyle.
# Entorno real: edificios de OpenStreetMap alrededor del parque La Carolina (Quito) con sus plantas o alturas (datos/muna/osm.json).
# Solar: unos 13.000 m² en la esquina suroeste de las avenidas Eloy Alfaro y De la República (posición aproximada sobre el plano).
# «Ecos del Sol» (Campo Baeza + MAODA): caja vertical con patios excavados y plaza al sur. «Estratos Vivos» (SANAA + A0-CPA-JHS): planta baja transparente,
# estratos circulares de ladrillo escalonados con terrazas plantadas y patio circular central. Volumetrías aproximadas a partir de las descripciones publicadas.
# uso: blender -b -noaudio -P muna_video.py -- ESCENA_JSON(no se usa) CARPETA F0 F1 [PORCENTAJE]   (F0 puede ser una lista: 45,142,...)
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

import json
verde, tierra = mat('parque', '#DCE6CF', 0.95), mat('terracota', '#C7653F', 0.8)
# --- entorno: un solo objeto con todos los edificios a menos de 650 m del solar (una malla: el trazo va rápido)
LAT0, LON0 = -0.181, -78.485; CRX, CRY = -147.1, -1050.4               # el cruce República / Eloy Alfaro es el origen
def xy(p): return ((p['lon'] - LON0) * 111320 * math.cos(math.radians(LAT0)) - CRX, (p['lat'] - LAT0) * 110574 - CRY)
OSM = json.load(open('datos/muna/osm.json'))['elements']
PCX, PCY = -55.0, -60.0                                                 # centro del solar (aprox.)
SOLAR = (-120.0, -110.0, 10.0, -10.0)                                   # 130 x 100 m = 13.000 m²
def dentro_solar(x, y): return SOLAR[0] - 3 < x < SOLAR[2] + 3 and SOLAR[1] - 3 < y < SOLAR[3] + 3
bm = bmesh.new(); nb = 0
for e in OSM:
    t = e.get('tags', {})
    if 'building' not in t or e['type'] != 'way' or len(e.get('geometry', [])) < 4: continue
    g = [xy(p) for p in e['geometry']][:-1]
    mx = sum(p[0] for p in g) / len(g); my = sum(p[1] for p in g) / len(g)
    if math.hypot(mx - PCX, my - PCY) > 900 or dentro_solar(mx, my): continue
    try: h = float(t['height'].split()[0]) if 'height' in t else float(t.get('building:levels', 3)) * 3.1
    except Exception: h = 9.0
    h = max(3.0, min(h, 140.0))
    vb = [bm.verts.new((x, y, 0)) for x, y in g]; vt = [bm.verts.new((x, y, h)) for x, y in g]
    try:
        bm.faces.new(vt)
        for i in range(len(g)): bm.faces.new((vb[i], vb[(i + 1) % len(g)], vt[(i + 1) % len(g)], vt[i]))
        nb += 1
    except ValueError: pass
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new('ciudad'); bm.to_mesh(me); bm.free(); CIUDAD = bpy.data.objects.new('ciudad', me); link(CIUDAD, None); me.materials.append(paper)
print('edificios del entorno', nb, flush=True)
for e in OSM:                                                           # el parque La Carolina, como mancha verde sin trazo
    if e.get('tags', {}).get('name') == 'Parque La Carolina' and e['type'] == 'way':
        g = [xy(p) for p in e['geometry']][:-1]; me = bpy.data.meshes.new('carolina'); me.from_pydata([(x, y, -0.07) for x, y in g], [], [list(range(len(g)))])
        ob = bpy.data.objects.new('carolina', me); nol.objects.link(ob); me.materials.append(verde)
me = bpy.data.meshes.new('suelo'); me.from_pydata([(-1500, -1500, -0.10), (1500, -1500, -0.10), (1500, 1500, -0.10), (-1500, 1500, -0.10)], [], [(0, 1, 2, 3)]); g = bpy.data.objects.new('suelo', me); nol.objects.link(g); g.data.materials.append(ground)   # 10 cm por debajo de las bases: sin parpadeo del trazo
# --- calles: bandas algo más oscuras que el papel, con su anchura según la categoría de la vía (sin trazo)
ANCHO = {'trunk': 18, 'primary': 16, 'secondary': 12, 'tertiary': 9, 'residential': 6, 'pedestrian': 5}
bm = bmesh.new()
for e in OSM:
    t = e.get('tags', {}); hw = t.get('highway')
    if hw not in ANCHO or e['type'] != 'way': continue
    g = [xy(p) for p in e.get('geometry', [])]; a = ANCHO[hw] / 2
    for (xa, ya), (xb, yb) in zip(g, g[1:]):
        if math.hypot((xa + xb) / 2 - PCX, (ya + yb) / 2 - PCY) > 950: continue
        L = math.hypot(xb - xa, yb - ya)
        if L < 0.1: continue
        nx, ny = -(yb - ya) / L * a, (xb - xa) / L * a; ex, ey = (xb - xa) / L * a * 0.5, (yb - ya) / L * a * 0.5
        v = [bm.verts.new((xa - ex + nx, ya - ey + ny, -0.06)), bm.verts.new((xa - ex - nx, ya - ey - ny, -0.06)), bm.verts.new((xb + ex - nx, yb + ey - ny, -0.06)), bm.verts.new((xb + ex + nx, yb + ey + ny, -0.06))]
        bm.faces.new(v)
me = bpy.data.meshes.new('calles'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('calles', me); nol.objects.link(ob); me.materials.append(mat('calle', '#E3DFD5', 1.0))
# --- arbolado del parque La Carolina: copas sencillas en malla única (sin trazo), cerca del solar
def dentro(px, py, poly):
    c = False
    for (ax, ay), (bx, by) in zip(poly, poly[1:] + poly[:1]):
        if (ay > py) != (by > py) and px < (bx - ax) * (py - ay) / (by - ay) + ax: c = not c
    return c
import random
rnd = random.Random(18); bm = bmesh.new(); nt = 0
for e in OSM:
    if e.get('tags', {}).get('name') == 'Parque La Carolina' and e['type'] == 'way':
        poly = [xy(p) for p in e['geometry']][:-1]; xs, ys = [q[0] for q in poly], [q[1] for q in poly]
        gx = min(xs)
        while gx < max(xs):
            gy = min(ys)
            while gy < max(ys):
                px, py = gx + rnd.uniform(-4, 4), gy + rnd.uniform(-4, 4)
                if math.hypot(px - PCX, py - PCY) < 700 and dentro(px, py, poly) and rnd.random() < 0.55:
                    r = rnd.uniform(3.0, 5.0); bmesh.ops.create_cone(bm, cap_ends=True, segments=7, radius1=r, radius2=r * 0.35, depth=r * 1.6, matrix=Matrix.Translation((px, py, 2.5 + r * 0.8))); nt += 1
                gy += 13
            gx += 13
me = bpy.data.meshes.new('arbolado'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('arbolado', me); nol.objects.link(ob); me.materials.append(mat('copas', '#BFD2AB', 0.85))
print('árboles del parque', nt, flush=True)
# --- el solar: contorno en bermellón sobre el suelo
x0, y0, x1, y1 = SOLAR
SOL = cajas('solar', [(x0, y0 - 0.5, 0.05, x1, y0 + 0.5, 0.15), (x0, y1 - 0.5, 0.05, x1, y1 + 0.5, 0.15), (x0 - 0.5, y0, 0.05, x0 + 0.5, y1, 0.15), (x1 - 0.5, y0, 0.05, x1 + 0.5, y1, 0.15)], mat('linea_roja', '#E2401C', 1.0), nol)
# --- «Ecos del Sol»: caja vertical de planta rectangular con patios y huecos excavados, retranqueada al norte para dejar la plaza al sur
EX0, EY0, EX1, EY1, EH = -110.0, -55.0, -20.0, -12.0, 38.0
def ecos(nombre, m, col):
    ob = cajas(nombre, [(EX0, EY0, 0, EX1, EY1, EH)], m, col)
    huecos = [(EX0 + 8, EY1 - 7, 5, EX0 + 22, EY1 + 1, 14), (EX0 + 40, EY1 - 7, 10, EX0 + 54, EY1 + 1, 19), (EX0 + 66, EY1 - 7, 19, EX0 + 80, EY1 + 1, 28),
              (EX0 + 24, EY1 - 7, 24, EX0 + 38, EY1 + 1, 33), (EX0 + 30, EY0 - 1, 0, EX0 + 60, EY0 + 6, 6),                 # patios en la banda norte y la entrada al sur
              (EX0 + 10, EY0 - 1, 20, EX0 + 24, EY0 + 6, 29), (EX0 + 62, EY0 - 1, 28, EX0 + 76, EY0 + 6, 37),
              (EX0 + 30, EY0 + 14, EH - 4, EX0 + 60, EY1 - 12, EH + 1)]                                                  # terraza de remate
    restar(ob, cajas(nombre + '_huecos', huecos, paper)); return ob
ECOS = ecos('ecos', red, None); ECOS_D = ecos('ecos_desc', paper, pro)       # en bermellón mientras gana; en discontinua, descartado
ARB = cajas('plaza_arboles', [(PCX - 50 + 12 * i, -95 + (i % 2) * 14, 0, PCX - 47 + 12 * i, -92 + (i % 2) * 14, 7) for i in range(9)], paper)   # filtro de árboles de la plaza
# --- «Estratos Vivos»: volúmenes circulares apilados, con terrazas y patios redondos
def elipse(bm, cx, cy, a, b, z0, z1, n=56):
    vb = [bm.verts.new((cx + a * math.cos(2 * math.pi * k / n), cy + b * math.sin(2 * math.pi * k / n), z0)) for k in range(n)]
    vt = [bm.verts.new((v.co.x, v.co.y, z1)) for v in vb]
    bm.faces.new(vt); bm.faces.new(list(reversed(vb)))
    for k in range(n): bm.faces.new((vb[k], vb[(k + 1) % n], vt[(k + 1) % n], vt[k]))
TIERS = [(PCX, PCY, 52, 5.5, 12.0), (PCX - 5, PCY + 4, 44, 12.0, 18.0), (PCX + 4, PCY - 3, 36, 18.0, 24.0), (PCX - 2, PCY + 6, 27, 24.0, 29.5)]
PATIOS = [(PCX - 3, PCY + 2, 11.0), (PCX + 22, PCY - 16, 5.5)]           # patio central plantado y otro menor de luz
def estratos(nombre, m, col):
    bm = bmesh.new()
    elipse(bm, PCX, PCY, 45, 45, 0, 5.5, 64)                          # planta baja transparente, metida 7 m bajo el primer estrato: sombra y paso
    for cx, cy, r, z0, z1 in TIERS: elipse(bm, cx, cy, r, r, z0, z1, 64)   # estratos de ladrillo, cada uno más pequeño y desplazado: terrazas
    me = bpy.data.meshes.new(nombre); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(nombre, me); link(ob, col); me.materials.append(m)
    bm = bmesh.new()
    for cx, cy, r in PATIOS: bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=r, radius2=r, depth=70, matrix=Matrix.Translation((cx, cy, 20)))
    me = bpy.data.meshes.new(nombre + '_patios'); bm.to_mesh(me); bm.free(); cut = bpy.data.objects.new(nombre + '_patios', me); sc.collection.objects.link(cut)
    restar(ob, cut); return ob
def terrazas():                                                         # lo que queda al aire encima de cada estrato, plantado (mancha verde sin trazo)
    bm = bmesh.new(); n = 64
    for k, (cx, cy, r, z0, z1) in enumerate(TIERS):
        rin = TIERS[k + 1][2] - 1.0 if k + 1 < len(TIERS) else 0.0
        if rin <= 0: continue
        ox, oy = cx, cy; z = z1 + 0.06
        vo = [bm.verts.new((ox + (r - 1.2) * math.cos(2 * math.pi * q / n), oy + (r - 1.2) * math.sin(2 * math.pi * q / n), z)) for q in range(n)]
        nx, ny = TIERS[k + 1][0], TIERS[k + 1][1]
        vi = [bm.verts.new((nx + rin * math.cos(2 * math.pi * q / n), ny + rin * math.sin(2 * math.pi * q / n), z)) for q in range(n)]
        for q in range(n): bm.faces.new((vo[q], vo[(q + 1) % n], vi[(q + 1) % n], vi[q]))
    me = bpy.data.meshes.new('terrazas'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('terrazas', me); nol.objects.link(ob); me.materials.append(verde); return ob
TERR = terrazas()
SANAA = estratos('estratos', red, None); SANAA_D = estratos('estratos_desc', paper, pro)
# --- el jurado: nueve piezas en la plaza (una, Luque; dos, la viceministra y el director)
JUR = [cajas(f'jurado{k}', [(PCX - 32 + 8 * k - 1.2, -100, 0, PCX - 32 + 8 * k + 1.2, -97.6, 3.2)], paper) for k in range(9)]
# --- trazo: tinta continua para lo construido; bermellón discontinuo para lo que nunca se hizo
sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
fs = sc.view_layers[0].freestyle_settings; fs.crease_angle = math.radians(150); fs.use_culling = True   # solo lo que cae en el encuadre
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
CU = (PCX, PCY, 10.0)
SCN = [(0.0, 3.0, ((PCX, PCY + 20, 10.0), 200, 30, 38), ((PCX, PCY, 12.0), 80, 26, 30)),        # ¿pueden las redes tumbar un concurso? La caja de Campo Baeza junto al parque
       (3.0, 6.5, ((-65.0, -35.0, 15.0), 46, 40, 22), ((-65.0, -35.0, 15.0), 42, 48, 20)),    # ganan Campo Baeza y MAODA: la caja crece
       (6.5, 10.0, ((PCX, PCY + 40, 0.0), 170, 180, 84), ((PCX, PCY + 40, 0.0), 150, 180, 86)),  # planta: el remate sur de La Carolina y el solar
       (10.0, 13.0, ((-65.0, -12.0, 16.0), 34, 42, 5), ((-65.0, -12.0, 16.0), 32, 48, 6)),     # la fachada desde el parque: la «muralla gris»
       (13.0, 16.5, ((-65.0, -35.0, 15.0), 50, 300, 26), ((-65.0, -35.0, 15.0), 46, 310, 24)),  # las firmas: la caja desde el otro lado
       (16.5, 20.0, ((-65.0, -35.0, 15.0), 46, 48, 28), ((-65.0, -35.0, 15.0), 44, 56, 30)),   # el ministro la rechaza: pasa a discontinua
       (20.0, 23.0, ((PCX, PCY + 40, 10.0), 170, 20, 42), ((PCX, PCY + 40, 10.0), 190, 28, 46)),         # Luque estaba en el jurado: la caja tachada en su sitio
       (23.0, 26.0, ((PCX, PCY, 10.0), 62, 35, 30), ((PCX, PCY, 10.0), 58, 42, 28)),           # se repite la final
       (26.0, 30.0, ((PCX, PCY, 12.0), 100, 210, 30), ((PCX, PCY, 12.0), 92, 218, 28)),        # gana SANAA: el edificio entero
       (30.0, 33.0, ((PCX, PCY + 10, 14.0), 88, 30, 12), ((PCX, PCY + 10, 14.0), 84, 36, 14)),  # Zaera-Polo: desde el parque, estratos y terrazas
       (33.0, 36.2, ((PCX, PCY, 10.0), 110, 30, 34), ((PCX, PCY + 30, 0.0), 160, 26, 44))]     # por una décima: primero un proyecto y luego el otro, mismo encuadre
def camara(t):
    for a, b, A, Bv in SCN:
        if a <= t < b:
            u = ss((t - a) / (b - a)); lerp = lambda p, q: p + (q - p) * u; da = (Bv[2] - A[2] + 180) % 360 - 180
            return (tuple(lerp(p, q) for p, q in zip(A[0], Bv[0])), math.exp(lerp(math.log(A[1]), math.log(Bv[1]))), A[2] + da * u, lerp(A[3], Bv[3]))
    return SCN[-1][3]
def ver(objs, v):
    for o in (objs if isinstance(objs, list) else [objs]): o.hide_render = not v
def estado(t):
    k = ss((t - 3.1) / 1.4) if 3.0 <= t < 6.5 else 1.0                   # la caja crece al ganar
    ECOS.scale = (1, 1, max(0.02, k))
    ver(ECOS, t < 17.0); ver(ECOS_D, 17.0 <= t < 23.0 or 33.0 <= t < 34.6)   # rechazada: discontinua; al final, primero el descartado y luego el ganador
    ver(ARB, t < 23.0)
    ver(SOL, 6.5 <= t < 10.0 or 23.0 <= t < 26.0)
    ver(JUR, False)
    ks = ss((t - 26.1) / 1.4) if 26.0 <= t < 30.0 else 1.0
    SANAA.scale = (1, 1, max(0.02, ks))
    ver(SANAA_D, 23.0 <= t < 26.0); ver(SANAA, 26.0 <= t < 33.0 or t >= 34.6); ver(TERR, 27.6 <= t < 33.0 or t >= 34.6)   # las terrazas aparecen cuando el edificio ya ha crecido
t0 = time.time(); n = len(FRAMES)
for k, f in enumerate(FRAMES):
    t = f / FPS; estado(t); cam_(*camara(t)); sc.render.filepath = f'{OUT}/{f:05d}.png'; bpy.ops.render.render(write_still=True)
    if (k + 1) % 30 == 0 or k + 1 == n or n <= 15: print(f'fotograma {k + 1}/{n} · {time.time() - t0:.0f} s', flush=True)
print('vídeo ok', n)
