# 015 · Sarnago · bocetos en Blender (Cycles en colores planos + Freestyle). Maqueta de 1960 (relieve y edificios) y planos de usos de 1955 y 2019 del TFG.
# uso: blender -b -P sarnago_bocetos.py -- vsar.json vsar3d.json CARPETA [índices]
import bpy, bmesh, json, math, sys
argv = sys.argv[sys.argv.index('--') + 1:]; D = json.load(open(argv[0])); G = json.load(open(argv[1])); OUT = argv[2]; ONLY = [int(x) for x in argv[3].split(',')] if len(argv) > 3 and argv[3] else None
RFJ = json.load(open(argv[4] if len(argv) > 4 else 'datos/sarnago/refugio_planta.json'))      # planta del proyecto de 2022 encajada en la parcela de la calle Real
AJ = json.load(open(argv[5] if len(argv) > 5 else 'datos/sarnago/escena_ajustes.json'))        # qué casas de 2019 se pintan sobre la maqueta y cuáles se levantan aparte
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 4; sc.cycles.use_denoising = False; sc.cycles.device = 'CPU'
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1080, 1920, 100; sc.view_settings.view_transform = 'Standard'
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
paper, red, ground, tree, stone, road, roadR, cont, wool = (mat('papel', '#F7F6F2'), mat('rojo', '#E2401C', 0.8), mat('suelo', '#F4F3EE', 0.86), mat('encina', '#D3D9C4', 0.8),
    mat('piedra', '#E9E3D6', 0.78), mat('camino', '#DCD7CC', 1.0), mat('caminoR', '#E2401C', 1.0), mat('curva', '#DDD7CB', 1.0), mat('lana', '#E2401C', 0.85))
B = lambda p: (p[0], -p[2], p[1])                                                        # (x, altura, z sur) -> Blender
GR = G['grid']
def hAt(x, z):
    fx, fz = (x - GR['x0']) / GR['d'], (z - GR['z0']) / GR['d']; i = max(0, min(GR['nx'] - 2, int(fx))); j = max(0, min(GR['nz'] - 2, int(fz))); u, v = min(1, max(0, fx - i)), min(1, max(0, fz - j))
    h = lambda a, b: GR['h'][b * GR['nx'] + a]; return (1 - v) * ((1 - u) * h(i, j) + u * h(i + 1, j)) + v * ((1 - u) * h(i, j + 1) + u * h(i + 1, j + 1))
nol = bpy.data.collections.new('sin_lineas'); sc.collection.children.link(nol)
def obj(name, V, F, m, lines=True):
    me = bpy.data.meshes.new(name); me.from_pydata(V, [], F); me.update(); ob = bpy.data.objects.new(name, me); (sc.collection if lines else nol).objects.link(ob); ob.data.materials.append(m); return ob
# relieve y curvas de nivel
def suelo_con_curvas():
    m = mat('suelo_curvas', '#F4F3EE', 0.86); nt = m.node_tree; mul = [n for n in nt.nodes if n.bl_idname == 'ShaderNodeMix'][0]
    geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); dv = nt.nodes.new('ShaderNodeMath'); dv.operation = 'DIVIDE'; dv.inputs[1].default_value = 2.0
    fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'FRACT'; lt = nt.nodes.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = 0.055
    mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[6].default_value = lin('#F4F3EE'); mx.inputs[7].default_value = lin('#DDD7CB')
    nt.links.new(geo.outputs['Position'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], dv.inputs[0]); nt.links.new(dv.outputs[0], fr.inputs[0]); nt.links.new(fr.outputs[0], lt.inputs[0])
    nt.links.new(lt.outputs[0], mx.inputs['Factor']); nt.links.new(mx.outputs[2], mul.inputs[6]); return m
P = G['ter']; V = [B((P[k], P[k + 1] - 0.04, P[k + 2])) for k in range(0, len(P), 3)]; obj('terreno', V, [(k, k + 1, k + 2) for k in range(0, len(V), 3)], suelo_con_curvas(), False)
def cinta(L, wdt, dy, name, m):
    V, F = [], []
    for a, b in zip(L, L[1:]):
        dx, dz = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dz) or 1; nx, nz = -dz / l * wdt, dx / l * wdt; n = len(V)
        V += [B((a[0] + nx, hAt(*a) + dy, a[1] + nz)), B((b[0] + nx, hAt(*b) + dy, b[1] + nz)), B((b[0] - nx, hAt(*b) + dy, b[1] - nz)), B((a[0] - nx, hAt(*a) + dy, a[1] - nz))]; F.append((n, n + 1, n + 2, n + 3))
    return obj(name, V, F, m, False)
CAM = {k: [cinta(L, 0.45, 0.25, f'camino{k}{i}', road) for i, L in enumerate(D['caminos'][k])] for k in ('1955', '2019')}
CAMR = [cinta(L, 0.7, 0.3, f'calleR{i}', roadR) for i, L in enumerate(D['caminos']['2019'])]
ARB = {}
for k in ('1955', '2019'):
    bm = bmesh.new()
    for x, z, r in D['arboles'][k]:
        dentro = False; e = RFJ['ext']
        for a in range(len(e)):
            p, q = e[a], e[(a + 1) % len(e)]
            if (p[1] > z) != (q[1] > z) and x < (q[0] - p[0]) * (z - p[1]) / (q[1] - p[1]) + p[0]: dentro = not dentro
        if dentro: continue                                                       # ningún árbol dentro de la huella del Refugio
        rr = max(1.5, min(5, r)); ret = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0); y0 = hAt(x, z) + rr * 0.9
        for v in ret['verts']: v.co.x, v.co.y, v.co.z = x + v.co.x * rr, -z + v.co.y * rr, y0 + v.co.z * rr * 0.7
    me = bpy.data.meshes.new(f'arb{k}'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(f'arb{k}', me); nol.objects.link(ob); ob.data.materials.append(tree); ARB[k] = ob
# edificios de la maqueta de 1960, cada pieza con su zócalo hasta el terreno
def inring(p, r):
    x, y = p; c = False
    for i in range(len(r)):
        a, b = r[i], r[(i + 1) % len(r)]
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]: c = not c
    return c
PZ = []
for i, pc in enumerate(G['pieces']):
    T = pc['tri']; V = [B(T[k:k + 3]) for k in range(0, len(T), 3)]; F = [(k, k + 1, k + 2) for k in range(0, len(V), 3)]
    ob = obj(f'p{i}', V, F, paper); bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.01)
    zmin = min(v.co.z for v in bm.verts); bm.normal_update()
    low = [f for f in bm.faces if f.normal.z < -0.7 and max(v.co.z for v in f.verts) < zmin + 0.6]
    if pc.get('f') and len(pc['f']) >= 3:
        tmin = min(hAt(*p) for p in pc['f']) - 0.8
        if low:
            r = bmesh.ops.extrude_face_region(bm, geom=low); nv = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
            for v in nv: v.co.z = min(v.co.z, tmin)
            bmesh.ops.delete(bm, geom=low, context='FACES')
        else:
            bnd = [e for e in bm.edges if e.is_boundary and max(v.co.z for v in e.verts) < zmin + 0.6]
            if bnd:
                r = bmesh.ops.extrude_edge_only(bm, edges=bnd)
                for v in [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.z = tmin
    bm.to_mesh(ob.data); bm.free()
    b = pc['b']; bl = D['blds'][b] if b >= 0 else None
    lit55 = bool(bl) and bl['u55'] != 'publico' and (bl['u55'] in ('viv', 'vivdes') or any(inring((x, z), bl['r']) for x, z, *_ in D['fam']))   # la iglesia y los edificios públicos nunca se pintan
    st19 = 'ruina' if i in RFJ.get('sustituye_piezas', []) else (bl['s19'] if bl else 'en pie')          # las casas del solar del Refugio están en ruina desde 1979
    if i in AJ['piezas_restauradas'] and st19 not in ('ruina',): st19 = 'viv'                              # casa rehecha en el plano de 2019 sobre esta pieza
    sem = b if b >= 0 else 1000 + i                                              # todas las piezas de un mismo edificio se encienden y apagan a la vez
    PZ.append({'ob': ob, 'b': b, 'lit55': lit55, 's19': st19, 'ord': (math.sin(sem * 12.9898) * 43758.5453) % 1})
# ruinas de 2019 y viviendas nuevas de 2019
def banda(ring, y0, y1, name, m, hole=None):
    bm = bmesh.new(); vs = [bm.verts.new(B((x, y0, z))) for x, z in ring]; f = bm.faces.new(vs); r = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.z = y1
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); ob.data.materials.append(m); return ob
def muros(ring, y0, y1, name, m, t=0.5):
    V, F = [], []
    for a, b in zip(ring, ring[1:] + ring[:1]):
        dx, dz = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dz) or 1; nx, nz = -dz / l * t / 2, dx / l * t / 2
        q = [(a[0] + nx, a[1] + nz), (b[0] + nx, b[1] + nz), (b[0] - nx, b[1] - nz), (a[0] - nx, a[1] - nz)]; k = len(V)
        V += [B((x, y0, z)) for x, z in q] + [B((x, y1, z)) for x, z in q]
        F += [(k, k + 1, k + 2, k + 3), (k + 4, k + 7, k + 6, k + 5), (k, k + 4, k + 5, k + 1), (k + 1, k + 5, k + 6, k + 2), (k + 2, k + 6, k + 7, k + 3), (k + 3, k + 7, k + 4, k)]
    ob = obj(name, V, F, m); bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.01); bm.to_mesh(ob.data); bm.free(); return ob
RU = []
for i, b in enumerate(D['blds']):
    if b['s19'] == 'ruina': y0 = min(hAt(*p) for p in b['r']) - 0.3; RU.append(muros(b['r'], y0, y0 + 1.8, f'ruina{i}', stone)); RU[-1]['solar'] = i in RFJ.get('sustituye_edificios', [])
def casa(ring, y0, h, name, m):
    bm = bmesh.new(); vs = [bm.verts.new(B((x, y0, z))) for x, z in ring]; f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f]); top = [e for e in r['geom'] if isinstance(e, bmesh.types.BMFace)][0]
    for v in top.verts: v.co.z = y0 + h
    r2 = bmesh.ops.extrude_face_region(bm, geom=[top]); t2 = [e for e in r2['geom'] if isinstance(e, bmesh.types.BMFace)][0]; c = t2.calc_center_median()
    for v in t2.verts: v.co.x = c.x + (v.co.x - c.x) * 0.35; v.co.y = c.y + (v.co.y - c.y) * 0.35; v.co.z = y0 + h + 1.6
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); ob.data.materials.append(m); return ob
NU = []
for i, r in enumerate(D['new19']):
    if i in AJ['nuevas_volumen']: y0 = min(hAt(*p) for p in r) - 0.6; NU.append(casa(r, y0, 5.6, f'nueva{i}', red))
conp = {pc['b'] for pc in G['pieces']}
EX = []                                                                          # en pie en 2019 pero sin pieza en la maqueta de 1960
for i, b in enumerate(D['blds']):
    if i in AJ['existentes_volumen']:
        y0 = min(hAt(*p) for p in b['r']) - 0.6; EX.append((casa(b['r'], y0, 6.2 if b['s19'] in ('viv', 'vivdes') else 3.6, f'existente{i}', paper), b['s19']))
# El Refugio (edificio 30 del plano): muros de piedra, cámara de lana y madera
RF = RFJ['ext']; Fy = min(hAt(*p) for p in RF) + 0.05; cx = sum(p[0] for p in RF) / len(RF); cz = sum(p[1] for p in RF) / len(RF)
def anillo(o, i, y0, y1, name, m):                              # muro entre dos contornos (exterior e interior)
    n = len(o); V = [B((x, y0, z)) for x, z in o] + [B((x, y0, z)) for x, z in i] + [B((x, y1, z)) for x, z in o] + [B((x, y1, z)) for x, z in i]; F = []
    for a in range(n):
        b = (a + 1) % n; F += [(2 * n + a, 2 * n + b, b, a), (3 * n + b, 3 * n + a, n + a, n + b), (2 * n + b, 2 * n + a, 3 * n + a, 3 * n + b), (a, b, n + b, n + a)]
    return obj(name, V, F, m)
(sx0, sz0), (sx1, sz1) = RFJ['calle']; ux, uz = sx1 - sx0, sz1 - sz0; L = math.hypot(ux, uz); ux, uz = ux / L, uz / L; nx_, nz_ = -uz, ux
if (cx - sx0) * nx_ + (cz - sz0) * nz_ < 0: nx_, nz_ = -nx_, -nz_                  # normal hacia dentro (de la calle al fondo)
dmax = max((x - sx0) * nx_ + (z - sz0) * nz_ for x, z in RFJ['alero'])
HE, HA = 5.9, 7.0                                                                # alero a la calle y cumbrera del fondo (cubierta a un agua)
hcub = lambda x, z: Fy + HE + (HA - HE) * max(0, (x - sx0) * nx_ + (z - sz0) * nz_) / dmax
def ref_muros(k):
    for o in REF_W: bpy.data.objects.remove(o, do_unlink=True)
    REF_W.clear(); y1 = Fy + max(0.6, k * HE)
    REF_W.append(anillo(RFJ['ext'], RFJ['piedra'], Fy - 0.6, y1, 'ref_piedra', REFM[0])); REF_W.append(anillo(RFJ['piedra'], RFJ['lana'], Fy, y1 - 0.02, 'ref_lana', wool))
    REF_W.append(anillo(RFJ['lana'], RFJ['int'], Fy, y1 - 0.04, 'ref_int', paper))
REFM = [red]; REF_W = []; ref_muros(1.0)
al = RFJ['alero']; V = [B((x, hcub(x, z), z)) for x, z in al] + [B((x, hcub(x, z) + 0.28, z)) for x, z in al]; n = len(al)
F = [tuple(range(n))[::-1], tuple(range(n, 2 * n))] + [(a, (a + 1) % n, n + (a + 1) % n, n + a) for a in range(n)]; REF_CUB = obj('ref_cubierta', V, F, paper)
p0 = (sx0 + ux * L * 0.5, sz0 + uz * L * 0.5); p1 = (sx0 + ux * L * 0.97, sz0 + uz * L * 0.97); dep = 1.7
PQ = [p0, p1, (p1[0] - nx_ * dep, p1[1] - nz_ * dep), (p0[0] - nx_ * dep, p0[1] - nz_ * dep)]; hp = lambda q, t: Fy + 3.0 - 0.35 * t
V = [B((x, hp(0, t), z)) for (x, z), t in zip(PQ, (0, 0, 1, 1))] + [B((x, hp(0, t) + 0.18, z)) for (x, z), t in zip(PQ, (0, 0, 1, 1))]
REF_POR = obj('ref_porche', V, [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], paper)
REF_PIEDRA, REF_LANA = REF_CUB, REF_POR
LINEART = False                                                              # el lápiz (Line Art) no se dibuja sin GPU: seguimos con Freestyle
def colorea(m, hexc): m.node_tree.nodes['Mix'].inputs[6].default_value = lin(hexc)
for p in PZ: p['mat'] = paper.copy(); p['ob'].data.materials[0] = p['mat']
EXM = []
for o, st19 in EX: m = paper.copy(); o.data.materials[0] = m; EXM.append((m, st19))
NUM = []
for o in NU: m = red.copy(); o.data.materials[0] = m; NUM.append(m)
def unir(obs, name):
    cps = []
    for o in obs:
        c = o.copy(); c.data = o.data.copy(); c.hide_render = False; sc.collection.objects.link(c); cps.append(c)
    bpy.ops.object.select_all(action='DESELECT')
    for c in cps: c.select_set(True)
    bpy.context.view_layer.objects.active = cps[0]; bpy.ops.object.join(); J = bpy.context.view_layer.objects.active; J.name = name
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.intersect(mode='SELECT', separate_mode='NONE', solver='EXACT'); bpy.ops.mesh.mark_freestyle_edge(clear=False)
    bpy.ops.object.mode_set(mode='OBJECT'); return J
J55 = unir([p['ob'] for p in PZ], 'casas_1955')
RU_SOLAR = [o for o in RU if o.get('solar', False)]
J19 = unir([p['ob'] for p in PZ if p['s19'] not in ('ruina', 'desaparece')] + [o for o, _ in EX] + NU + [o for o in RU if not o.get('solar', False)], 'casas_2019')
for o in [p['ob'] for p in PZ] + [o for o, _ in EX] + NU + [o for o in RU if not o.get('solar', False)]: o.hide_render = True
sc.render.use_freestyle = not LINEART; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.0
fs = sc.view_layers[0].freestyle_settings; fs.crease_angle = math.radians(150)
ls = fs.linesets[0] if fs.linesets else fs.linesets.new('tinta'); ls.select_by_visibility = True; ls.visibility = 'VISIBLE'; ls.select_by_edge_types = True
ls.select_silhouette = ls.select_border = ls.select_crease = ls.select_external_contour = True; ls.select_edge_mark = True
st = ls.linestyle or bpy.data.linestyles.new('tinta'); ls.linestyle = st; st.color = lin('#1A1B20')[:3]; st.thickness = 1.2
ls.select_by_collection = True; ls.collection = nol; ls.collection_negation = 'EXCLUSIVE'
if LINEART:
    nol.lineart_usage = 'OCCLUSION_ONLY'                                         # relieve, curvas, caminos y árboles tapan pero no se dibujan
    gpd = bpy.data.grease_pencils.new('lineas'); gpo = bpy.data.objects.new('lineas', gpd); sc.collection.objects.link(gpo)
    gpo.lineart.usage = 'EXCLUDE'; lay = gpd.layers.new('tinta', set_active=True); lay.frames.new(1)
    gm = bpy.data.materials.new('tinta_gp'); bpy.data.materials.create_gpencil_data(gm); gm.grease_pencil.color = lin('#1A1B20'); gpd.materials.append(gm)
    la = gpo.grease_pencil_modifiers.new('lineart', 'GP_LINEART'); la.source_type = 'SCENE'; la.target_layer = 'tinta'; la.target_material = gm
    la.use_contour = True; la.use_crease = True; la.crease_threshold = math.radians(150); la.use_intersection = True; la.use_material = False; la.use_edge_mark = False; la.use_loose = False
    la.thickness = 3; la.opacity = 1.0; la.use_crease_on_smooth = True; la.use_back_face_culling = False
cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam; cam_data.clip_start = 1; cam_data.clip_end = 30000
tgt = bpy.data.objects.new('mira', None); sc.collection.objects.link(tgt); con = cam.constraints.new('TRACK_TO'); con.target = tgt; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
hV = hAt(-10, 0)
def estado(st):                                  # '1955' (k = fracción encendida), 'vacio', '2026' (k = fracción de casas arregladas encendidas), 'refugio' (k = altura)
    s, k = st
    J55.hide_render = s != '1955'; J19.hide_render = s == '1955'
    for p in PZ:
        if s == '1955': on = p['lit55'] and p['ord'] < k
        else: on = s == '2026' and p['s19'] in ('viv', 'vivdes') and p['ord'] < k              # en las escenas del Refugio solo él va en bermellón
        colorea(p['mat'], '#E2401C' if on else '#F7F6F2')
    for m, st19 in EXM: colorea(m, '#E2401C' if (s == '2026' and st19 in ('viv', 'vivdes')) else '#F7F6F2')
    for m in NUM: colorea(m, '#E2401C' if s == '2026' else '#F7F6F2')
    for o in RU_SOLAR: o.hide_render = s == '1955' or s in ('refugio', 'seccion')
    for o in CAM['1955']: o.hide_render = s != '1955'
    for o in CAM['2019']: o.hide_render = s == '1955' or s == 'calles'
    for o in CAMR: o.hide_render = s != 'calles'
    ARB['1955'].hide_render = s != '1955'; ARB['2019'].hide_render = s == '1955'
    if s in ('refugio', 'seccion'): REFM[0] = stone if s == 'seccion' else red; ref_muros(0.72 if s == 'seccion' else k)        # en la sección, muros a media altura y sin cubierta
    for o in REF_W: o.hide_render = s not in ('refugio', 'seccion')
    REF_CUB.hide_render = not (s == 'refugio' and k >= 1); REF_POR.hide_render = not (s == 'refugio' and k >= 1)
def cam_(tg, z, az, el):
    az, el = math.radians(az), math.radians(el); d = 4000; cam_data.ortho_scale = 2 * z
    cam.location = B((tg[0] + math.sin(az) * math.cos(el) * d, tg[1] + math.sin(el) * d, tg[2] + math.cos(az) * math.cos(el) * d)); tgt.location = B(tg)
RC = (cx, Fy + 3, cz); AZC = math.degrees(math.atan2(-nx_, -nz_))           # mirando la fachada de la calle de frente
SH = [('vacio', 0), ('1955', 1.0), ('1955', 0.45), ('vacio', 0), ('vacio', 0), ('calles', 0), ('2026', 1.0), ('2026', 1.0), ('seccion', 1.0), ('refugio', 1.0), ('refugio', 1.0)]
CAMS = [((-10, hV, 0), 80, 196, 42), ((-12, hV, -4), 70, 206, 46), ((-6, hV, 0), 78, 220, 44), ((-10, hV + 2, 0), 88, 232, 48), ((-20, hV, -4), 72, 205, 42),
        ((-10, hV, 0), 105, 214, 62), ((-12, hV, -2), 75, 200, 44), ((-10, hV, 0), 95, 185, 50), ((cx, Fy + 3.0, cz), 9.5, AZC - 45, 58), ((cx, Fy + 3.5, cz), 18, AZC - 45, 34), ((cx, Fy + 3, cz), 55, AZC - 45, 46)]
for i, (st, cm) in enumerate(zip(SH, CAMS)):
    if ONLY and i not in ONLY: continue
    estado(st); cam_(*cm); sc.render.filepath = f'{OUT}/s{i:02d}.png'; bpy.ops.render.render(write_still=True)
print('bocetos ok')
