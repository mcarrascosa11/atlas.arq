"""Construye motor/web/lyon.json (010 · tramo de Lyon) a partir del GeoJSON de la BD TOPO (IGN, Licence Ouverte 2.0).
Descarga (recuadro 1.250 x 900 m en Lambert-93, Lyon Confluence: place nautique, Monolithe, îlot A3 y borde de Sainte-Blandine):
https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=BDTOPO_V3:batiment&SRSNAME=EPSG:2154&BBOX=840800,6517150,842050,6518050,EPSG:2154&OUTPUTFORMAT=application/json&COUNT=5000
uso: python3 lyon_build.py lyon-confluence.json ../web/lyon.json   (requiere shapely)
"""
import json, math, random, sys
from shapely.geometry import shape, Polygon
from shapely.ops import unary_union
src = json.load(open(sys.argv[1]))
X0, Y0 = 841575.0, 6517425.0                       # origen local: centro del îlot A3
A3 = {'569173', '568935', '568304', '568291', '568890', '569058', '568867', '568495'}   # los ocho edificios nuevos (alta en la BD 2018, confirmados 2017)
HALL = '851837'                                    # nave del antiguo mercado de flores, hoy gimnasio (uso "Sportif" en la BD TOPO)
MONO = '237834'                                    # Le Monolithe (îlot C, 2010)
loc = lambda x, y: [round(x - X0, 2), round(-(y - Y0), 2)]
blds, a3polys = [], []
for f in src['features']:
    p = f['properties']; cid = p['cleabs'][-6:]
    g = shape(f['geometry']).simplify(0.25, preserve_topology=True)
    for pg in ([g] if isinstance(g, Polygon) else list(g.geoms)):
        if pg.area < 4: continue
        rings = [[loc(x, y) for x, y, *_ in pg.exterior.coords[:-1]]] + [[loc(x, y) for x, y, *_ in h.coords[:-1]] for h in pg.interiors]
        app = (p['date_d_apparition'] or '')[:4]
        b = dict(id=cid, r=rings, h=p['hauteur'])
        if cid in A3: b['k'] = 'a3'
        elif cid == HALL: b['k'] = 'hall'
        elif cid == MONO: b['k'] = 'mono'
        elif app and app < '1950': b['k'] = 'old'
        if cid in A3 or cid == HALL: a3polys.append(pg)
        if p['construction_legere']: b['lg'] = 1
        blds.append(b)
# gente: por las aceras alrededor del îlot (4,5 m fuera de las fachadas), nunca dentro del patio
ring = unary_union(a3polys).convex_hull.buffer(4.5, join_style=2).exterior
random.seed(7); ppl = []; L = ring.length; n = int(L / 4.5)
for i in range(n):
    if random.random() < 0.18: continue
    s = (i + random.random() * 0.5) / n * L; a = ring.interpolate(s); b = ring.interpolate(min(L, s + 1.0))
    dx, dz = b.x - a.x, b.y - a.y; ll = math.hypot(dx, dz) or 1; off = random.uniform(-1.2, 1.2); nx, nz = -dz / ll, dx / ll
    ppl.append([round(a.x + nx * off - X0, 2), round(-(a.y + nz * off - Y0), 2), round(dx / ll, 3), round(-dz / ll, 3)])
json.dump(dict(src='IGN BD TOPO (Licence Ouverte 2.0), WFS Géoplateforme', origin_epsg2154=[X0, Y0], blds=blds, ppl=ppl), open(sys.argv[2], 'w'), separators=(',', ':'))
print(len(blds), 'volúmenes,', len(ppl), 'personas,', sum(1 for b in blds if b['h'] is None), 'sin altura (se dibujan solo en planta)')
