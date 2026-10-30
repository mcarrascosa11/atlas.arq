# 015 · Sarnago: exporta para la escena: relieve (malla + rejilla de alturas + curvas), edificios de 1960 por piezas con su edificio del plano, y pendiente típica de cubierta
import trimesh, json, numpy as np, sys
ROOT = sys.argv[1]
from shapely.geometry import Polygon, Point, MultiPoint
D = json.load(open(f'{ROOT}/motor/web/vsar.json')); t = np.array([2.29, -21.1])                     # traslación medida casando la maqueta con los contornos del plano (sin giro)
sc = trimesh.load(f'{ROOT}/datos/sarnago/modelos/sarnago_1960_morfologia.glb'); M = {}
for n in sc.graph.nodes_geometry:
    T, g = sc.graph[n]; m = sc.geometry[g].copy(); m.apply_transform(T); m.vertices[:, 0] += t[0]; m.vertices[:, 2] += t[1]; M[n] = m
TER, ED = M['terreno'], M['edificios_1960']
# rejilla de alturas del terreno (1 m) por rayos verticales
xs = np.arange(-170, 171, 1.0); zs = np.arange(-125, 85, 1.0); X, Z = np.meshgrid(xs, zs)
orig = np.c_[X.ravel(), np.full(X.size, 200.0), Z.ravel()]; dirs = np.tile([0, -1.0, 0], (X.size, 1))
loc, iray, _ = TER.ray.intersects_location(orig, dirs, multiple_hits=False)
Hh = np.full(X.size, np.nan); Hh[iray] = loc[:, 1]; Hh = Hh.reshape(X.shape)
from scipy.ndimage import generic_filter
mask = np.isnan(Hh); Hh[mask] = np.nanmean(Hh); print('rejilla', Hh.shape, 'sin dato', int(mask.sum()), 'alturas', round(float(np.nanmin(Hh)), 1), round(float(np.nanmax(Hh)), 1))
# curvas de nivel cada metro
cont = []
for h in np.arange(np.ceil(TER.vertices[:, 1].min()), TER.vertices[:, 1].max(), 1.0):
    sec = TER.section(plane_origin=[0, h, 0], plane_normal=[0, 1, 0])
    if sec is None: continue
    for e in sec.discrete: cont.append({'h': float(h), 'l': [[round(float(p[0]), 1), round(float(p[2]), 1)] for p in e[::2]]})
# edificios por piezas, emparejadas con el plano
polys = [Polygon(b['r']).buffer(0) for b in D['blds']]
pieces = []; angs = []
for c in ED.split(only_watertight=False):
    hull = MultiPoint([tuple(p) for p in c.vertices[:, [0, 2]]]).convex_hull
    if hull.area < 3: continue
    cen = hull.centroid; k = -1; best = 0
    for i, P in enumerate(polys):
        a = P.intersection(hull).area if P.intersects(hull) else 0
        if a > best: best, k = a, i
    if best < 0.25 * hull.area: k = -1
    # normales hacia fuera: si la mayoría de caras miran hacia dentro, se invierte la pieza
    ctr = c.vertices.mean(0); dots = np.einsum('ij,ij->i', c.face_normals, c.triangles_center - ctr)
    if np.sum(c.area_faces * np.sign(dots)) < 0: c.invert()
    fe = c.face_adjacency_edges[c.face_adjacency_angles > np.radians(20)]
    E = c.vertices[fe].reshape(-1, 3)
    # bordes abiertos (contornos de la malla) también
    eo = trimesh.grouping.group_rows(c.edges_sorted, require_count=1); E2 = c.vertices[c.edges_sorted[eo]].reshape(-1, 3)
    n = c.face_normals; up = n[:, 1]; roof = (up > 0.3) & (up < 0.97)
    if roof.any(): angs += list(np.degrees(np.arccos(up[roof])))
    pieces.append({'b': k, 'y0': round(float(c.vertices[:, 1].min()), 2), 'tri': np.round(c.vertices[c.faces].reshape(-1), 2).tolist(), 'e': np.round(np.r_[E, E2].reshape(-1), 2).tolist()})
print('piezas', len(pieces), 'sin edificio del plano', sum(p['b'] < 0 for p in pieces), '| pendiente de cubierta: mediana', round(float(np.median(angs)), 1), 'º, p25-p75', np.percentile(angs, [25, 75]).round(1))
json.dump({'grid': {'x0': -170, 'z0': -125, 'd': 1.0, 'nx': len(xs), 'nz': len(zs), 'h': np.round(Hh, 2).ravel().tolist()}, 'cont': cont,
           'ter': np.round(TER.vertices[TER.faces].reshape(-1), 2).tolist(), 'pieces': pieces, 'roofDeg': round(float(np.median(angs)), 1)}, open(f'{ROOT}/motor/web/vsar3d.json', 'w'), separators=(',', ':'))
import os; print('vsar3d.json', round(os.path.getsize(f'{ROOT}/motor/web/vsar3d.json') / 1e6, 2), 'MB')
r30 = D['blds'][30]['r']; print('edificio 30 (El Refugio):', r30, 'área', round(Polygon(r30).area, 1))
