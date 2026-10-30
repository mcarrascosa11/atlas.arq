# 013 · Piscina das Marés (Leça da Palmeira): genera motor/web/v013.json desde datos/013 (OSM + relieve Terrarium z15)
# Marco local: origen en las piscinas, x al este, z al sur (metros); y = cota en metros sobre el mar.
import json, math, glob, os, sys
import numpy as np
from PIL import Image
from shapely.geometry import LineString, Polygon, box, Point, MultiPolygon
from shapely.ops import linemerge, split, unary_union
ROOT = sys.argv[1] if len(sys.argv) > 1 else os.getcwd(); D = f'{ROOT}/datos/013'
P = (41.19274, -8.70748); kx = 111320 * math.cos(math.radians(P[0])); ky = 111320; R = 1150
xz = lambda p: (round((p['lon'] - P[1]) * kx, 2), round(-(p['lat'] - P[0]) * ky, 2))
els = json.load(open(f'{D}/osm.json'))['elements']
# relieve
Z = 15; tiles = {}
for f in glob.glob(f'{D}/dem/*.png'):
    _, tx, ty = os.path.basename(f)[:-4].split('_'); a = np.asarray(Image.open(f).convert('RGB')).astype(float)
    tiles[(int(tx), int(ty))] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
def elev(x, z):
    lat = P[0] - z / ky; lon = P[1] + x / kx
    X = (lon + 180) / 360 * 2**Z; la = math.radians(lat); Y = (1 - math.log(math.tan(la) + 1 / math.cos(la)) / math.pi) / 2 * 2**Z
    tx, ty = int(X), int(Y); a = tiles.get((tx, ty))
    if a is None: return 0.0
    fx, fy = (X - tx) * 256 - 0.5, (Y - ty) * 256 - 0.5; i0, j0 = int(math.floor(fy)), int(math.floor(fx)); u, v = fy - i0, fx - j0
    g = lambda i, j: a[min(max(i, 0), 255), min(max(j, 0), 255)]
    return float(max(0.0, (1 - u) * ((1 - v) * g(i0, j0) + v * g(i0, j0 + 1)) + u * ((1 - v) * g(i0 + 1, j0) + v * g(i0 + 1, j0 + 1))))
def rings(e):
    if e.get('geometry'): return [[xz(p) for p in e['geometry']]]
    out = []
    for m in e.get('members', []):
        if m.get('role') == 'outer' and m.get('geometry'): out.append([xz(p) for p in m['geometry']])
    return out
near = lambda r, d=R: any(abs(x) < d and abs(z) < d for x, z in r)
blds, beach, rock, roads, coast, pools, casa, complejo = [], [], [], [], [], [], None, None
for e in els:
    t = e.get('tags', {})
    if e['id'] == 599868145: casa = rings(e)[0]; continue
    if e['id'] == 101311936: complejo = rings(e)[0]; continue
    if e['id'] in (446746774, 1392193215): pools.append({'id': e['id'], 'r': rings(e)[0]}); continue
    if 'building' in t:
        for r in rings(e):
            if len(r) < 4 or not near(r): continue
            try: lv = float(str(t.get('building:levels', '')).split(';')[0])
            except ValueError: lv = None
            if t.get('height'):
                try: h = float(str(t['height']).replace('m', '').strip())
                except ValueError: h = None
            else: h = None
            if h is None: h = (lv if lv else {'apartments': 6, 'residential': 4, 'house': 2, 'detached': 2, 'garage': 1, 'retail': 1, 'industrial': 2, 'roof': 1}.get(t['building'], 3)) * 3.0 + 0.5
            base = min(elev(x, z) for x, z in r[:: max(1, len(r) // 6)])
            blds.append({'r': r[:-1] if r[0] == r[-1] else r, 'h': round(h, 1), 'b': round(base, 2)})
    elif t.get('natural') == 'beach' or t.get('natural') == 'sand':
        beach += [r for r in rings(e) if near(r)]
    elif t.get('natural') in ('bare_rock', 'rock', 'stone'):
        rock += [r for r in rings(e) if near(r)]
    elif t.get('natural') == 'coastline':
        coast.append(LineString(rings(e)[0]))
    elif 'highway' in t and e.get('geometry'):
        r = rings(e)[0]
        if near(r) and t['highway'] in ('primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'pedestrian', 'service', 'trunk'):
            roads.append({'l': r, 'w': {'primary': 12, 'trunk': 14, 'secondary': 10, 'tertiary': 8, 'pedestrian': 6}.get(t['highway'], 6), 'n': t.get('name', '')})
# mar: el recuadro partido por la costa; nos quedamos con las piezas que contienen puntos de mar conocidos
bb = box(-R, -R, R, R); line = linemerge(unary_union(coast))
lines = list(getattr(line, 'geoms', [line])); main = max(lines, key=lambda l: l.length); c = list(main.coords)
land = Polygon(c + [(c[-1][0] + 4000, c[-1][1] + 4000), (c[0][0] + 4000, c[0][1] - 4000)]).buffer(0)   # tierra a la izquierda del sentido de la costa (al este)
sea = bb.difference(land).simplify(0.5)
seaR = [[(round(x, 2), round(z, 2)) for x, z in list(g.exterior.coords)[:-1]] for g in (sea.geoms if isinstance(sea, MultiPolygon) else [sea]) if g.area > 50]
# relieve: rejilla estirada (3 m junto a las piscinas, ~25 m en los bordes) y curvas de nivel cada metro cerca de la costa
ax1 = [0.0]; st = 3.0
while ax1[-1] < R: ax1.append(ax1[-1] + st); st *= 1.025
ax1 = [-v for v in ax1[:0:-1]] + ax1
H = [[round(elev(x, z), 2) for x in ax1] for z in ax1]
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
fg = np.arange(-360, 361, 2.0); FH = np.array([[elev(x, z) for x in fg] for z in fg])
cs = plt.contour(fg, fg, FH, levels=np.arange(1, 26, 1)); cont = []
for lev, segsC in zip(cs.levels, cs.allsegs):
    for sg in segsC:
        if len(sg) >= 4: cont.append({'h': float(lev), 'l': [[round(float(a), 1), round(float(b), 1)] for a, b in sg[::2]]})
plt.close('all')
pts = np.array([q for l in coast for q in l.coords if math.hypot(*q) < 160]); pts = pts - pts.mean(0)
w, v = np.linalg.eigh(pts.T @ pts); a = v[:, -1]
if a[1] > 0: a = -a                                                    # eje de la costa hacia el norte (z negativa)
axis = [round(float(a[0]), 4), round(float(a[1]), 4)]
# corte transversal: por el centro de la piscina grande, perpendicular a la costa (hacia tierra)
nrm = [-axis[1], axis[0]]
if nrm[0] < 0: nrm = [-nrm[0], -nrm[1]]
pools.sort(key=lambda pp: -Polygon(pp['r']).area)
C = list(Polygon(pools[0]['r']).centroid.coords[0])
prof = [[round(t, 1), round(elev(C[0] + nrm[0] * t, C[1] + nrm[1] * t), 2)] for t in np.arange(-160, 220.1, 1.0)]
# rocas: polígonos de OSM y bolos a lo largo de la costa junto a las piscinas (fuera de piscinas y casa)
rng = np.random.default_rng(13); avoid = unary_union([Polygon(pp['r']).buffer(1.5) for pp in pools] + [Polygon(casa).buffer(2.0)])
coastL = main; bol = []
for rr in rock:
    poly = Polygon(rr).buffer(0)
    if poly.area < 10: continue
    n = int(min(260, poly.area / 30)); minx, minz, maxx, maxz = poly.bounds; k = 0
    while k < n * 6 and n > 0:
        k += 1; q = Point(rng.uniform(minx, maxx), rng.uniform(minz, maxz))
        if poly.contains(q) and not avoid.contains(q): bol.append([round(q.x, 2), round(q.y, 2), round(float(rng.uniform(1.2, 4.2)), 2), round(float(rng.uniform(0.6, 2.6)), 2), round(float(rng.uniform(0, 6.28)), 2)]); n -= 1
avoid2 = unary_union([Polygon(pp['r']).buffer(1.2) for pp in pools] + [Polygon(casa).buffer(14.0)])
for k in range(5200):                                                   # granito junto a las piscinas: bolos grandes a ambos lados de la línea de costa
    q = coastL.interpolate(rng.uniform(0, 1), normalized=True)
    if math.hypot(q.x - C[0], q.y - C[1]) > 140: continue
    off = rng.normal(-2, 11); q2 = Point(q.x + nrm[0] * off, q.y + nrm[1] * off)
    if avoid2.contains(q2): continue
    big = rng.random() < 0.35
    bol.append([round(q2.x, 2), round(q2.y, 2), round(float(rng.uniform(3.0, 7.5) if big else rng.uniform(1.4, 3.6)), 2), round(float(rng.uniform(1.4, 3.8) if big else rng.uniform(0.6, 2.2)), 2), round(float(rng.uniform(0, 6.28)), 2)])
for k in range(1400):
    t = rng.uniform(0, 1); q = coastL.interpolate(t, normalized=True)
    if math.hypot(q.x, q.y) > 330: continue
    off = rng.normal(0, 7); q2 = Point(q.x + nrm[0] * off, q.y + nrm[1] * off)
    if avoid.contains(q2): continue
    bol.append([round(q2.x, 2), round(q2.y, 2), round(float(rng.uniform(1.0, 3.6)), 2), round(float(rng.uniform(0.5, 2.2)), 2), round(float(rng.uniform(0, 6.28)), 2)])
# muros de las piscinas (anillo exterior) y muros del recinto que dan al mar; cortes de la sección con casa, piscinas y avenida
for pp in pools:
    po = Polygon(pp['r']).buffer(0); pp['out'] = [[round(x, 2), round(z, 2)] for x, z in list(po.buffer(0.7, join_style=2).exterior.coords)[:-1]]
    pp['r'] = [[round(x, 2), round(z, 2)] for x, z in list(po.exterior.coords)[:-1]]
cr = list(Polygon(complejo).exterior.coords); muros = []
for a, b in zip(cr, cr[1:]):
    if coastL.distance(Point((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) < 22: muros.append([[round(a[0], 2), round(a[1], 2)], [round(b[0], 2), round(b[1], 2)]])
cut = LineString([(C[0] + nrm[0] * t, C[1] + nrm[1] * t) for t in (-170, 240)])
def tr(geom):
    g = cut.intersection(geom); segs2 = []
    for q in getattr(g, 'geoms', [g]):
        if q.is_empty: continue
        cc = list(q.coords); tt = [ (x - C[0]) * nrm[0] + (z - C[1]) * nrm[1] for x, z in cc]; segs2.append([round(min(tt), 2), round(max(tt), 2)])
    return segs2
secc = {'casa': tr(Polygon(casa)), 'pools': [tr(Polygon(pp['r'])) for pp in pools],
        'av': [tr(LineString(r['l']).buffer(r['w'] / 2)) for r in roads if r['n'] == 'Avenida da Liberdade'],
        'coast': [round((q.x - C[0]) * nrm[0] + (q.y - C[1]) * nrm[1], 2) for q in getattr(cut.intersection(coastL), 'geoms', [cut.intersection(coastL)]) if not q.is_empty]}
secc['av'] = [v for v in secc['av'] if v]
# mitades del corte: lo que queda detrás (lado lejano, hacia el noroeste a lo largo de la costa) para la sección
from shapely.geometry import Polygon as Pg
far = Pg([(C[0] + nrm[0] * t + axis[0] * u, C[1] + nrm[1] * t + axis[1] * u) for t, u in ((-3000, 0), (3000, 0), (3000, 3000), (-3000, 3000))])
def ringsOf(g):
    out = []
    for q in getattr(g, 'geoms', [g]):
        if q.is_empty or q.geom_type != 'Polygon' or q.area < 0.5: continue
        out.append({'o': [[round(x, 2), round(z, 2)] for x, z in list(q.exterior.coords)[:-1]], 'h': [[[round(x, 2), round(z, 2)] for x, z in list(i.coords)[:-1]] for i in q.interiors]})
    return out
for pp in pools:
    band = Polygon(pp['out']).difference(Polygon(pp['r'])); pp['bandFar'] = ringsOf(band.intersection(far)); pp['waterFar'] = ringsOf(Polygon(pp['r']).intersection(far))
casaFar = ringsOf(Polygon(casa).intersection(far)); seaFar = ringsOf(unary_union([Polygon(r) for r in seaR]).intersection(far))
# la sección dibujada (en coordenadas t a lo largo del corte, y en altura)
tc = secc['coast'][0] if secc['coast'] else -10.0; pa, pb = secc['pools'][0][0]; ca, cb = secc['casa'][0]; FLOOR = -0.8; CASA0, CASA1 = 3.0, 6.6
def gtop(t, hdem):
    if t < pa: return max(-2.6, -2.6 * (pa - t) / 120.0)
    if t <= pb: return FLOOR
    if ca <= t <= cb: return CASA0
    return hdem
prof2 = [[t, round(gtop(t, h), 2)] for t, h in prof]
secPoly = prof2 + [[prof2[-1][0], -3.5], [prof2[0][0], -3.5]]
rects = [[pa - 0.7, pa, FLOOR, 2.0], [pb, pb + 0.7, FLOOR, 2.0], [ca, ca + 0.3, CASA0, CASA1], [cb - 0.3, cb, CASA0, CASA1], [ca, cb, CASA1 - 0.35, CASA1], [ca, cb, CASA0 - 0.3, CASA0]]
out = {'origin': P, 'blds': blds, 'sea': seaR, 'beach': beach, 'rock': rock, 'roads': roads, 'pools': pools, 'casa': casa, 'complejo': complejo,
       'grid': {'ax': [round(v, 2) for v in ax1], 'h': H}, 'cont': cont, 'coastAxis': axis, 'nrm': [round(nrm[0], 4), round(nrm[1], 4)], 'C': [round(C[0], 2), round(C[1], 2)], 'prof': prof, 'rocks': bol, 'muros': muros, 'secc': secc, 'casaFar': casaFar, 'seaFar': seaFar, 'sec': {'poly': secPoly, 'rects': rects, 'pa': pa, 'pb': pb, 'ca': ca, 'cb': cb, 'floor': FLOOR, 'casa0': CASA0, 'casa1': CASA1},
       'h': {'casa': round(elev(*Polygon(casa).centroid.coords[0]), 2), 'av': round(elev(85, -50), 2)}}
json.dump(out, open(f'{ROOT}/motor/web/v013.json', 'w'), separators=(',', ':'))
print('edificios', len(blds), 'mar', len(seaR), [len(r) for r in seaR][:5], 'playa', len(beach), 'roca', len(rock), 'calles', len(roads), 'piscinas', [len(p['r']) for p in pools], 'casa', len(casa or []), 'eje costa', axis, out['h'])
