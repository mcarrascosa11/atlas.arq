"""012 · genera motor/web/v012.json (edificios del Marais y la Seine en metros locales, marco del Centre Pompidou y plaza) a partir de
datos/012/edif.json y agua.json (IGN, BD TOPO V3, Lambert-93) . uso: python3 v012_build.py CARPETA_DATOS SALIDA.json"""
import json, math, sys, os
import numpy as np
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union
from pyproj import Transformer
src, out_path = sys.argv[1], sys.argv[2]
d = json.load(open(f'{src}/edif.json'))['features']; w = json.load(open(f'{src}/agua.json'))['features']
t = Transformer.from_crs('EPSG:4326', 'EPSG:2154', always_xy=True); PX, PY = t.transform(2.35225, 48.86065)
blds = []; pomp = None
for e in d:
    g = e['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]; p = e['properties']
    h = p.get('hauteur') or (p['nombre_d_etages'] * 3.1 if p.get('nombre_d_etages') else 18.5)
    for poly in polys:
        r = np.array(poly[0])[:, :2] - [PX, PY]
        if np.hypot(*r.mean(0)) < 40 and (p.get('hauteur') or 0) > 40: pomp = r; continue
        if np.abs(r).max() > 700: continue
        blds.append((r, float(h)))
# marco del Pompidou: eje largo (hacia el NNE), centro del cuerpo principal en la sección central
c = pomp.mean(0); ax = np.linalg.svd(pomp - c)[2][0]
if ax[1] < 0: ax = -ax                                # hacia el norte
perp = np.array([ax[1], -ax[0]])                       # hacia el este
P = Polygon(pomp)
def cut(u):
    a = c + ax * u; L = LineString([a - perp * 80, a + perp * 80]); I = P.intersection(L)
    pts = [np.array(q) for g in (I.geoms if hasattr(I, 'geoms') else [I]) for q in g.coords]
    vs = [(q - c) @ perp for q in pts]; return min(vs), max(vs)
sec = [cut(u) for u in np.linspace(-60, 60, 13)]
vw, ve = np.median([s[0] for s in sec]), np.median([s[1] for s in sec])
us = [(q - c) @ ax for q in pomp]
C = c + perp * (vw + ve) / 2
print('huella BD TOPO: largo', round(max(us) - min(us), 1), 'm · ancho en la sección central', round(ve - vw, 1), 'm (oeste', round(vw, 1), ', este', round(ve, 1), ')')
# plaza: espacio libre al oeste del edificio hasta los edificios de la rue Saint-Martin
B = unary_union([Polygon(r).buffer(0) for r, h in blds if np.hypot(*r.mean(0)) < 260])
gaps = []
for u in np.linspace(-70, 70, 15):
    a = C + ax * u - perp * 30.5; L = LineString([a, a - perp * 160]); I = L.intersection(B)
    if I.is_empty: continue
    gaps.append(min(Point(a).distance(Point(q)) for g in (I.geoms if hasattr(I, 'geoms') else [I]) for q in g.coords))
pw = float(np.median(gaps)) if gaps else 60.0
print('plaza: ancho mediano', round(pw, 1), 'm')
def loc(r): return [[round(float(x), 2), round(float(-y), 2)] for x, y in r]          # x este, z sur
water = []
for e in w:
    g = e['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for poly in polys:
        r = np.array(poly[0])[:, :2] - [PX, PY]
        if np.abs(r).max() < 2000: water.append(loc(r[::2] if len(r) > 400 else r))
out = {'blds': [{'r': loc(r), 'h': round(h, 1)} for r, h in blds], 'water': water, 'pompOSM': loc(pomp),
       'pomp': {'c': [round(float(C[0]), 2), round(float(-C[1]), 2)], 'ax': [round(float(ax[0]), 5), round(float(-ax[1]), 5)]}, 'plaza': round(pw, 1)}
json.dump(out, open(out_path, 'w'), separators=(',', ':'))
print('ok', out_path, os.path.getsize(out_path) // 1024, 'KB ·', len(blds), 'edificios ·', len(water), 'superficies de agua')
