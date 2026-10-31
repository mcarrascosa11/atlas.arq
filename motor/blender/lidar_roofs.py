# 014 · volumetría real de Vegaviana: huellas del Catastro + nube LiDAR del IGN (PNOA 3ª cobertura, 2023).
# Para cada pieza del Catastro: altura del suelo (puntos de suelo alrededor), planos de cubierta ajustados a los puntos de edificio de
# dentro de la huella (RANSAC), sólido = huella extruida y recortada por esos planos. Las piezas que se tocan se unen en un sólido.
# Las piezas sin puntos LiDAR quedan marcadas ('nl') con la altura del Catastro, sin cubierta supuesta.
import re, glob, json, sys, math, numpy as np
import manifold3d as m3d, trimesh
from shapely.geometry import Polygon, Point, LineString
from shapely.geometry.polygon import orient
from shapely.ops import unary_union
from shapely.strtree import STRtree
from scipy.spatial import cKDTree
from scipy import ndimage as ndi
from pyproj import Transformer
ROOT, PTS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]; VV = sys.argv[4] if len(sys.argv) > 4 else None
FIT = not PTS.startswith('planos:')
if FIT:
    P = np.load(PTS); X, Y, Z, C = P['x'].astype(float), -P['y'].astype(float), P['z'].astype(float), P['c']        # z local hacia el sur, como el resto
    cx, cy = P['origen']
else:
    src = PTS[7:]
    if src.endswith('.txt'):                                                                       # formato compacto: planos respecto al centroide de cada pieza
        L_ = open(src).read().split('\n'); cx, cy = map(float, L_[0].split()[1:3]); npz = int(L_[1].split()[1])
        PL = {'compacto': L_[2:2 + npz], 'encinas': [[int(a) / 10 for a in l.split(',')] for l in L_[3 + npz:] if l and not l.startswith('#')]}
    else: PL = json.load(open(src)); cx, cy = PL['origen']
tr = Transformer.from_crs('EPSG:4326', 'EPSG:25829', always_xy=True)
loc = lambda x, y: (x - cx, -(y - cy))
if FIT:
    G = C == 2; B = C == 6; V = np.isin(C, (4, 5))
    tg, tb = cKDTree(np.c_[X[G], Y[G]]), cKDTree(np.c_[X[B], Y[B]]); ZG, ZB, XB, YB = Z[G], Z[B], X[B], Y[B]
    covered = lambda p: (X.min() + 2 < p.bounds[0]) and (p.bounds[2] < X.max() - 2) and (Y.min() + 2 < p.bounds[1]) and (p.bounds[3] < Y.max() - 2)
# piezas del Catastro
parts = {}
for f in sorted(glob.glob(f'{ROOT}/datos/014/catastro/bu*.gml')):
    t = open(f, encoding='utf-8', errors='ignore').read()
    for m in re.finditer(r'<bu-ext2d:BuildingPart gml:id="([^"]+)"(.*?)</bu-ext2d:BuildingPart>', t, re.S):
        gid, body = m.group(1), m.group(2)
        if gid in parts: continue
        fl = re.search(r'numberOfFloorsAboveGround>(\d+)<', body); fl = int(fl.group(1)) if fl else 1
        pl = re.search(r'<gml:posList[^>]*>([^<]+)<', body)
        if not pl or fl < 1: continue
        v = [float(a) for a in pl.group(1).split()]; g = Polygon([loc(v[i], v[i + 1]) for i in range(0, len(v) - 1, 2)]).buffer(0)
        if g.is_empty or g.area < 6 or g.geom_type != 'Polygon' or abs(g.centroid.x) > 560 or abs(g.centroid.y) > 560: continue
        parts[gid] = (g, fl)
print('piezas', len(parts))
rng = np.random.default_rng(1)
def planes(pts, thr=0.18, maxp=3):
    out, rest = [], pts
    for _ in range(maxp):
        if len(rest) < 12: break
        best, bi = None, None
        for _ in range(300):
            s = rest[rng.choice(len(rest), 3, replace=False)]; n = np.cross(s[1] - s[0], s[2] - s[0]); L = np.linalg.norm(n)
            if L < 1e-6 or abs(n[2]) / L < 0.5: continue                                           # cubiertas: planos de menos de 60°
            n = n / L; d = -n @ s[0]; inl = np.abs(rest @ n + d) < thr
            if best is None or inl.sum() > bi.sum(): best, bi = (n, d), inl
        if best is None or bi.sum() < max(10, 0.15 * len(pts)): break
        q = rest[bi]; A = np.c_[q[:, 0], q[:, 1], np.ones(len(q))]; a, b, c0 = np.linalg.lstsq(A, q[:, 2], rcond=None)[0]   # z = a x + b y + c
        out.append((a, b, c0, int(bi.sum()))); rest = rest[~bi]
    return out
def ground(poly):
    c = poly.centroid; idx = tg.query_ball_point([c.x, c.y], r=max(8, math.sqrt(poly.area) * 0.9 + 6))
    if not idx: return None
    return float(np.percentile(ZG[idx], 30))
info = {}; solids = {}; stats = {'lidar': 0, 'sin': 0, 'tipos': {}}
PLANES = {}
if not FIT and 'compacto' in PL: ORDEN = {k: i for i, k in enumerate(sorted(parts))}
for gid, (g, fl) in parts.items():
    ring = [tuple(p) for p in list(orient(g, 1.0).exterior.coords)[:-1]]
    if not FIT and 'compacto' in PL:
        l = PL['compacto'][ORDEN[gid]]
        if l == '-': q = None
        else:
            cc = g.centroid; pls = []
            for e in l.split(';'):
                A, Bb, C = (int(x) for x in e.split(',')); a, b = A / 1000, Bb / 1000; pls.append([a, b, C / 100 - a * cc.x - b * cc.y])
            top = max(max(a * x + b * y + c0 for a, b, c0 in pls) for x, y in ring) + 1.0
            q = {'k': 'un agua' if len(pls) == 1 else 'dos aguas' if len(pls) == 2 else 'varias', 't': max(top, 1.0), 'p': pls, 'h': 3.0 * fl}
    if not FIT:                                                                                    # planos ya medidos
        if 'compacto' not in PL: q = PL['piezas'].get(gid) or PL['piezas'].get(gid.replace('ES.SDGC.BU.', ''))
        if q is None or q['k'] == 'nl': solids[gid] = m3d.Manifold.extrude(m3d.CrossSection([ring]), 3.0 * fl); info[gid] = ('nl', fl); stats['sin'] += 1; continue
        s = m3d.Manifold.extrude(m3d.CrossSection([ring]), q['t'])
        for a, b, c0 in q['p']:
            n = np.array([a, b, -1.0]); L = np.linalg.norm(n); s = s.trim_by_plane((n / L).tolist(), float(-c0 / L))
        if s.is_empty(): s = m3d.Manifold.extrude(m3d.CrossSection([ring]), q.get('h', 3.0))
        solids[gid] = s; info[gid] = (q['k'], fl, q.get('s', []), q.get('h', 0)); stats['lidar'] += 1; stats['tipos'][q['k']] = stats['tipos'].get(q['k'], 0) + 1; continue
    z0 = ground(g); inner = g.buffer(-0.45) if g.buffer(-0.45).area > 2 else g
    idx = tb.query_ball_point([g.centroid.x, g.centroid.y], r=math.sqrt((g.bounds[2] - g.bounds[0]) ** 2 + (g.bounds[3] - g.bounds[1]) ** 2) / 2 + 1)
    pts = np.array([[XB[i], YB[i], ZB[i]] for i in idx if inner.contains(Point(XB[i], YB[i]))]) if idx else np.zeros((0, 3))
    if z0 is None or len(pts) < 8 or not covered(g):                                               # sin LiDAR: altura del Catastro, cubierta plana, marcada
        solids[gid] = m3d.Manifold.extrude(m3d.CrossSection([ring]), 3.0 * fl); info[gid] = ('nl', fl); stats['sin'] += 1; PLANES[gid] = {'k': 'nl'}; continue
    pts[:, 2] -= z0; pl = planes(pts)
    if not pl: pl = [(0.0, 0.0, float(np.percentile(pts[:, 2], 90)), len(pts))]
    top = float(pts[:, 2].max()) + 2
    s = m3d.Manifold.extrude(m3d.CrossSection([ring]), top)
    for a, b, c0, _ in pl:                                                                         # bajo cada plano: z <= a x + b y + c  ->  (a, b, -1)·p >= -c
        n = np.array([a, b, -1.0]); L = np.linalg.norm(n); s = s.trim_by_plane((n / L).tolist(), float(-c0 / L))
    if s.is_empty(): s = m3d.Manifold.extrude(m3d.CrossSection([ring]), max(2.5, float(np.percentile(pts[:, 2], 80))))
    slopes = [round(math.degrees(math.atan(math.hypot(a, b))), 1) for a, b, _, _ in pl]
    kind = 'plana' if max(slopes) < 5 else 'un agua' if len(pl) == 1 or sum(1 for x in slopes if x >= 5) == 1 else 'dos aguas' if len(pl) == 2 else 'varias'
    stats['tipos'][kind] = stats['tipos'].get(kind, 0) + 1; stats['lidar'] += 1
    solids[gid] = s; info[gid] = (kind, fl, slopes, round(float(pts[:, 2].max()), 2))
    PLANES[gid] = {'k': kind, 't': round(top, 2), 'h': round(float(np.percentile(pts[:, 2], 80)), 2), 's': slopes, 'p': [[round(float(a), 5), round(float(b), 5), round(float(c0) + 0.0, 3)] for a, b, c0, _ in pl]}
print('con LiDAR', stats['lidar'], '| sin LiDAR', stats['sin'], '| cubiertas', stats['tipos'])
sl = [x for v in info.values() if v[0] not in ('nl', 'plana') for x in v[2] if x >= 5]
if sl: print('pendientes de cubierta: mediana', round(float(np.median(sl)), 1), 'º, p10-p90', np.percentile(sl, [10, 90]).round(1))
# grupos: piezas que se tocan, un solo sólido
keys = list(parts); polys = [parts[k][0] for k in keys]; T = STRtree(polys); par = list(range(len(polys)))
def find(i):
    while par[i] != i: par[i] = par[par[i]]; i = par[i]
    return i
for i, p in enumerate(polys):
    for j in T.query(p.buffer(0.35)):
        if j != i and p.buffer(0.35).intersects(polys[j]): par[find(i)] = find(j)
groups = {}
for i in range(len(polys)): groups.setdefault(find(i), []).append(i)
OSM = json.load(open(f'{ROOT}/datos/014/osm.json'))['elements']; L2 = lambda lon, lat: loc(*tr.transform(lon, lat))
CIV = {}
for e in OSM:
    t = e.get('tags', {}); k = 'iglesia' if t.get('amenity') == 'place_of_worship' else 'ayuntamiento' if t.get('amenity') == 'townhall' else None
    if k and e.get('geometry'): CIV[k] = Polygon([L2(p['lon'], p['lat']) for p in e['geometry']]).buffer(0)
out = []
for gi, idx in groups.items():
    man = None
    for i in idx: man = solids[keys[i]] if man is None else man + solids[keys[i]]
    mesh = man.to_mesh(); Vv = np.asarray(mesh.vert_properties)[:, :3]; F = np.asarray(mesh.tri_verts)
    if len(F) == 0: continue
    tm = trimesh.Trimesh(vertices=Vv, faces=F, process=True)
    fe = tm.face_adjacency_edges[tm.face_adjacency_angles > np.radians(10)]; E = tm.vertices[fe].reshape(-1, 3)
    P3 = lambda A: np.c_[A[:, 0], A[:, 2], A[:, 1]]
    outline = unary_union([polys[i] for i in idx]).buffer(0)
    rings = [[[round(p[0], 2), round(p[1], 2)] for p in list(q.exterior.coords)[:-1]] for q in getattr(outline, 'geoms', [outline])]
    c = outline.centroid; nl = any(info[keys[i]][0] == 'nl' for i in idx)
    civ = next((k for k, Pp in CIV.items() if outline.intersects(Pp.buffer(1.0))), '')
    out.append({'tri': np.round(P3(tm.vertices[tm.faces].reshape(-1, 3)), 2).ravel().tolist(), 'e': np.round(P3(E), 2).ravel().tolist(), 'c': [round(c.x, 1), round(c.y, 1)],
                'a': round(outline.area, 1), 'f': max(parts[keys[i]][1] for i in idx), 'o': rings, 'n': len(idx), 'nl': nl, 'civ': civ, 'h': round(float(tm.vertices[:, 2].max()), 1)})
cand = [k for k, g in enumerate(out) if g['f'] == 2 and 60 < g['a'] < 900 and not g['nl'] and not g['civ']]
hero = min(cand, key=lambda k: math.hypot(*out[k]['c']))
for g in out: g['d'] = round(math.hypot(g['c'][0] - out[hero]['c'][0], g['c'][1] - out[hero]['c'][1]), 1)
# encinas desde la vegetación alta del LiDAR: copas en una malla de 1 m, separadas por máximos locales
if not FIT and PL.get('encinas'): trees = PL['encinas']
elif not FIT:                                                                                      # sin encinas del LiDAR: las de la ortofoto, fuera de los edificios
  vv0 = json.load(open(VV)) if VV else {'t26': []}; FOOT = unary_union([p.buffer(0.3) for p in polys]); trees = []
  for x, z, r in vv0.get('t26', []):
      pnt = Point(x, z)
      if math.hypot(x, z) > 540 or FOOT.contains(pnt): continue
      r2 = min(r, FOOT.distance(pnt) - 0.2)
      if r2 >= 1.5: trees.append([x, z, round(r2, 1), round(r2 * 1.6 + 1.5, 1)])
else:
  xv, yv, zv = X[V], Y[V], Z[V]; zg = ZG[tg.query(np.c_[xv, yv])[1]]; hv = zv - zg; keep = hv > 2.5
  xv, yv, hv = xv[keep], yv[keep], hv[keep]
  x0, y0 = -560, -560; nx = ny = 1120; Hc = np.zeros((ny, nx)); ii = np.clip((xv - x0).astype(int), 0, nx - 1); jj = np.clip((yv - y0).astype(int), 0, ny - 1)
  np.maximum.at(Hc, (jj, ii), hv); Hs = ndi.gaussian_filter(Hc, 1.2); mx = (Hs == ndi.maximum_filter(Hs, size=7)) & (Hs > 3)
  lab, nlab = ndi.label(Hc > 2.0); trees = []
  for j, i in zip(*np.nonzero(mx)):
      comp = lab[j, i]
      if comp == 0: continue
      r = min(7.0, max(1.8, math.sqrt(((lab[max(0, j - 7):j + 8, max(0, i - 7):i + 8] == comp).sum()) / math.pi)))
      trees.append([round(i + x0 + 0.5, 1), round(j + y0 + 0.5, 1), round(r, 1), round(float(Hc[j, i]), 1)])
  trees = [t for t in trees if math.hypot(t[0], t[1]) < 540]
  # ninguna copa dentro de un edificio: fuera las que caen sobre una huella y las demás, recortadas para no tocar ninguna
  FOOT = unary_union([p.buffer(0.3) for p in polys]); n0 = len(trees); tt = []
  for x, z, r, h in trees:
      pnt = Point(x, z)
      if FOOT.contains(pnt): continue
      r2 = min(r, FOOT.distance(pnt) - 0.2)
      if r2 >= 1.5: tt.append([x, z, round(r2, 1), h])
  trees = tt; print('encinas fuera de edificios', len(trees), 'de', n0)
print('grupos', len(out), '(sin LiDAR', sum(g['nl'] for g in out), ') | encinas', len(trees), '| protagonista', out[hero]['c'])
vv = json.load(open(VV)) if VV else {'roads': []}
PLAZAS = [[[round(x, 2), round(z, 2)] for x, z in [L2(p['lon'], p['lat']) for p in e['geometry']]] for e in OSM if e.get('tags', {}).get('highway') == 'pedestrian' and e.get('geometry') and len(e['geometry']) > 3]
roads = [{'t': e['tags']['highway'], 'l': [list(L2(p['lon'], p['lat'])) for p in e['geometry']]} for e in OSM if 'highway' in e.get('tags', {}) and e.get('geometry')]
if FIT: json.dump({'origen': [float(cx), float(cy)], 'piezas': PLANES, 'encinas': trees, 'fuente': 'LiDAR-PNOA-cob3 2023 (IGN) + Catastro'}, open(OUT.replace('.json', '_planos.json'), 'w'), separators=(',', ':'))
json.dump({'g': out, 'hero': hero, 'trees': trees, 'roads': roads, 'plazas': PLAZAS, 'fuente': 'Catastro + LiDAR-PNOA-cob3 2023 (IGN)'}, open(OUT, 'w'), separators=(',', ':'))
import os; print(OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB')
