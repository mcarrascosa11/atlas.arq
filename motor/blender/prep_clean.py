# 014: volúmenes limpios de Vegaviana. Cada pieza del Catastro se extruye por su número de plantas; las piezas casi rectangulares
# llevan cubierta a dos aguas sobre su rectángulo; todas las piezas que se tocan se unen en un solo sólido (manifold), y las aristas
# se sacan del sólido ya unido: sin caras que se pisen y con las líneas de intersección reales.
import re, glob, json, sys, math, numpy as np
import manifold3d as m3d, trimesh
from shapely.geometry import Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union
from pyproj import Transformer
ROOT = sys.argv[1]; D = f'{ROOT}/datos/014'; OUT = sys.argv[2]
tr = Transformer.from_crs('EPSG:4326', 'EPSG:25829', always_xy=True); CX, CY = tr.transform(-6.71857, 40.04147)
loc = lambda x, y: (x - CX, -(y - CY))
parts = {}
for f in sorted(glob.glob(f'{D}/catastro/bu*.gml')):
    t = open(f, encoding='utf-8', errors='ignore').read()
    for m in re.finditer(r'<bu-ext2d:BuildingPart gml:id="([^"]+)"(.*?)</bu-ext2d:BuildingPart>', t, re.S):
        gid, body = m.group(1), m.group(2)
        if gid in parts: continue
        fl = re.search(r'numberOfFloorsAboveGround>(\d+)<', body); fl = int(fl.group(1)) if fl else 1
        pl = re.search(r'<gml:posList[^>]*>([^<]+)<', body)
        if not pl or fl < 1: continue
        v = [float(a) for a in pl.group(1).split()]; g = Polygon([loc(v[i], v[i + 1]) for i in range(0, len(v) - 1, 2)]).buffer(0)
        if g.is_empty or g.area < 6 or g.geom_type != 'Polygon': continue
        if g.centroid.distance(Polygon([(-600, -600), (600, -600), (600, 600), (-600, 600)]).centroid) > 520: continue
        parts[gid] = (g, fl)
print('piezas', len(parts))
PITCH = math.tan(math.radians(24))
def solid(g, fl):
    H = 3.0 * fl; r = g.minimum_rotated_rectangle
    if g.area / r.area > 0.86:                                                            # casi rectangular: muros sobre el rectángulo y cubierta a dos aguas
        c = list(r.exterior.coords)[:4]; e1, e2 = np.subtract(c[1], c[0]), np.subtract(c[2], c[1])
        if np.hypot(*e1) < np.hypot(*e2): c = c[1:] + c[:1]; e1, e2 = e2, e1                    # c0-c1 = lado largo
        short = np.hypot(*e2); rise = min(2.4, short / 2 * PITCH)
        body = m3d.Manifold.extrude(m3d.CrossSection([[tuple(p) for p in list(orient(Polygon(c), 1.0).exterior.coords)[:-1]]]), H)
        m1, m2 = (np.add(c[0], c[3]) / 2), (np.add(c[1], c[2]) / 2)
        roof = m3d.Manifold.hull_points([(p[0], p[1], H) for p in c] + [(m1[0], m1[1], H + rise), (m2[0], m2[1], H + rise)])
        return body + roof
    ring = [tuple(p) for p in list(orient(g, 1.0).exterior.coords)[:-1]]
    return m3d.Manifold.extrude(m3d.CrossSection([ring]), H + 0.4)                          # irregular: cubierta plana con peto
# grupos: piezas que se tocan, unidas en un solo sólido
keys = list(parts); polys = [parts[k][0] for k in keys]
from shapely.strtree import STRtree
tree = STRtree(polys); parent = list(range(len(polys)))
def find(i):
    while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
    return i
for i, p in enumerate(polys):
    for j in tree.query(p.buffer(0.35)):
        if j != i and p.buffer(0.35).intersects(polys[j]): parent[find(i)] = find(j)
groups = {}
for i in range(len(polys)): groups.setdefault(find(i), []).append(i)
print('grupos', len(groups))
out = []
for gi, idx in groups.items():
    man = None
    for i in idx:
        s = solid(*parts[keys[i]]); man = s if man is None else man + s
    mesh = man.to_mesh(); V = np.asarray(mesh.vert_properties)[:, :3]; F = np.asarray(mesh.tri_verts)
    if len(F) == 0: continue
    tm = trimesh.Trimesh(vertices=V, faces=F, process=True)
    fe = tm.face_adjacency_edges[tm.face_adjacency_angles > np.radians(12)]; E = tm.vertices[fe].reshape(-1, 3)
    P3 = lambda A: np.c_[A[:, 0], A[:, 2], A[:, 1]]                                        # (x, y_plano, z_altura) -> (x, altura, z)
    outline = unary_union([polys[i] for i in idx]).buffer(0)
    rings = [list(map(lambda p: [round(p[0], 2), round(p[1], 2)], list(q.exterior.coords)[:-1])) for q in getattr(outline, 'geoms', [outline])]
    c = outline.centroid; fls = max(parts[keys[i]][1] for i in idx)
    out.append({'tri': np.round(P3(tm.vertices[tm.faces].reshape(-1, 3)), 2).ravel().tolist(), 'e': np.round(P3(E), 2).ravel().tolist(),
                'c': [round(c.x, 1), round(c.y, 1)], 'a': round(outline.area, 1), 'f': fls, 'o': rings})
print('grupos con malla', len(out), 'plantas', {k: sum(1 for g in out if g['f'] == k) for k in (1, 2, 3)})
# casa protagonista: la de dos plantas más cercana al centro con tamaño de vivienda
cand = [k for k, g in enumerate(out) if g['f'] == 2 and 60 < g['a'] < 900] or [k for k, g in enumerate(out) if g['f'] == 2]
hero = min(cand, key=lambda k: math.hypot(*out[k]['c']))
hx, hz = out[hero]['c']
for g in out: g['d'] = round(math.hypot(g['c'][0] - hx, g['c'][1] - hz), 1)
V = json.load(open(f'{ROOT}/motor/web/vveg.json')) if len(sys.argv) < 4 else json.load(open(sys.argv[3]))
trees = [t for t in V['t26'] if math.hypot(t[0], t[1]) < 520]
json.dump({'g': out, 'hero': hero, 'trees': trees, 'roads': V['roads']}, open(OUT, 'w'), separators=(',', ':'))
import os; print('grupos exportados', len(out), 'protagonista', hero, out[hero]['c'], out[hero]['a'], 'm2 |', round(os.path.getsize(OUT) / 1e6, 2), 'MB | triángulos', sum(len(g['tri']) // 9 for g in out))
