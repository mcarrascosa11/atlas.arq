"""010 · genera motor/web/zgz10.json y motor/web/lyon10.json (no se suben al repo: se regeneran con este script).
Entradas:
  Zaragoza: GML del Catastro (WFS INSPIRE BU.BUILDINGPART), 4 recuadros de 600 x 600 m alrededor de la estación Delicias:
    python3 zgz_build.py link 41.6600 -0.9130 600 2      -> los 4 enlaces
  Lyon: GeoJSON de la BD TOPO (IGN) de todo Lyon Confluence, edificios y agua (enlaces en lyon_build.py / README).
uso: python3 v010_build.py ZGZ1.gml ZGZ2.gml ZGZ3.gml ZGZ4.gml confluence-edificios.json confluence-agua.json
"""
import json, math, random, subprocess, sys, os
from shapely.geometry import shape, Polygon, MultiPolygon, box
from shapely.ops import unary_union
here = os.path.dirname(os.path.abspath(__file__)); web = os.path.join(here, '..', 'web')
gmls, edif, agua = sys.argv[1:5], sys.argv[5], sys.argv[6]
# ---------- Zaragoza: origen en la estación Delicias (41.65861 N, 0.91111 O); cebras = parcelas 3738404 (torre + barra) y 3542802 (manzana cerrada)
subprocess.run([sys.executable, os.path.join(here, 'zgz_build.py'), 'json', '/tmp/zgz_all.json', '41.65861', '-0.91111', *gmls], check=True, stdout=subprocess.DEVNULL)
Z = json.load(open('/tmp/zgz_all.json')); ZEB = ('3738404', '3542802')
def off(ring, d):
    pg = Polygon(ring); pg = pg if pg.is_valid else pg.buffer(0)
    g = pg.buffer(d, join_style=2, mitre_limit=3.0); g = max(g.geoms, key=lambda q: q.area) if isinstance(g, MultiPolygon) else g
    return [[round(x, 2), round(z, 2)] for x, z in list(g.exterior.coords)[:-1]]
vols = []
for v in Z['vols']:
    k = 'zebra' if v['ref'][:7] in ZEB else ('flat' if v['fl'] == 0 else 'ctx')
    o = dict(r=v['r'], fl=v['fl'], h=v['h'], k=k, ref=v['ref'][:7])
    if k == 'zebra' and v['fl'] >= 1: o['ro'] = off(v['r'][0], 0.15)
    vols.append(o)
json.dump(dict(src='Catastro (DG del Catastro), WFS INSPIRE BU.BUILDINGPART; altura = plantas x 3 m (aproximada)', vols=vols), open(os.path.join(web, 'zgz10.json'), 'w'), separators=(',', ':'))
# ---------- Lyon: origen en el îlot A3 (Lambert-93 841575, 6517425)
X0, Y0 = 841575.0, 6517425.0
A3 = {'569173', '568935', '568304', '568291', '568890', '569058', '568867', '568495'}; HALL = '851837'
loc = lambda x, y: [round(x - X0, 2), round(-(y - Y0), 2)]
blds, a3polys = [], []
for f in json.load(open(edif))['features']:
    p = f['properties']; cid = p['cleabs'][-6:]; g = shape(f['geometry']).simplify(0.3, preserve_topology=True)
    for pg in ([g] if isinstance(g, Polygon) else list(g.geoms)):
        if pg.area < 6: continue
        b = dict(r=[[loc(x, y) for x, y, *_ in pg.exterior.coords[:-1]]] + [[loc(x, y) for x, y, *_ in h.coords[:-1]] for h in pg.interiors], h=p['hauteur'])
        if cid in A3: b['k'] = 'a3'; b['id'] = cid; a3polys.append(pg)
        elif cid == HALL: b['k'] = 'hall'; a3polys.append(pg)
        if b.get('k'): b['ro'] = off(b['r'][0], 0.12)
        blds.append(b)
xs = [q[0] for b in blds for q in b['r'][0]]; zs = [q[1] for b in blds for q in b['r'][0]]; Bx = box(min(xs), min(zs), max(xs), max(zs))
water = []
for f in json.load(open(agua))['features']:
    g = shape(f['geometry'])
    for pg in ([g] if isinstance(g, Polygon) else list(g.geoms)):
        lp = Polygon([loc(x, y) for x, y, *_ in pg.exterior.coords[:-1]], [[loc(x, y) for x, y, *_ in h.coords[:-1]] for h in pg.interiors]).buffer(0).intersection(Bx)
        for q in ([lp] if isinstance(lp, Polygon) else list(getattr(lp, 'geoms', []))):
            if not q.is_empty and q.area >= 50: water.append([[[round(x, 1), round(z, 1)] for x, z in list(q.exterior.coords)[:-1]]] + [[[round(x, 1), round(z, 1)] for x, z in list(h.coords)[:-1]] for h in q.interiors])
blk = unary_union(a3polys); court = blk.convex_hull.buffer(-3.0).difference(blk.buffer(1.5))
garden = [[[loc(x, y) for x, y, *_ in q.exterior.coords[:-1]]] for q in ([court] if isinstance(court, Polygon) else list(court.geoms)) if q.area > 40]
ring = blk.convex_hull.buffer(4.5, join_style=2).exterior; random.seed(7); ppl = []; Lr = ring.length; n = int(Lr / 4.5)
for i in range(n):
    if random.random() < 0.18: continue
    s = (i + random.random() * 0.5) / n * Lr; a = ring.interpolate(s); b2 = ring.interpolate(min(Lr, s + 1.0))
    dx, dz = b2.x - a.x, b2.y - a.y; ll = math.hypot(dx, dz) or 1; o = random.uniform(-1.2, 1.2); nx, nz = -dz / ll, dx / ll
    ppl.append([round(a.x + nx * o - X0, 2), round(-(a.y + nz * o - Y0), 2), round(dx / ll, 3), round(-dz / ll, 3)])
json.dump(dict(src='IGN BD TOPO (Licence Ouverte 2.0)', blds=blds, water=water, garden=garden, ppl=ppl), open(os.path.join(web, 'lyon10.json'), 'w'), separators=(',', ':'))
print('ok:', len(vols), 'partes en Zaragoza;', len(blds), 'volúmenes en Lyon;', len(water), 'polígonos de agua')
