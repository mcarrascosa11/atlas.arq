"""011 · genera motor/web/v011.json (terreno, curvas de nivel, carretera GI-3591, edificios y marco de la basílica) a partir de
datos/011/osm.json (OpenStreetMap, Overpass) y datos/011/dem/15_*.png (teselas de relieve Terrarium de AWS, zoom 15).
uso: python3 v011_build.py CARPETA_DATOS SALIDA.json"""
import json, math, sys, os, glob
import numpy as np
from PIL import Image
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
src, out_path = sys.argv[1], sys.argv[2]
el = json.load(open(f'{src}/osm.json'))['elements']
LAT0, LON0, ELEV0 = 42.9792, -2.3986, 720.0          # santuario; y = 0 en la plaza (cota 720 m)
kx = 111320 * math.cos(math.radians(LAT0)); ky = 110540
P = lambda g: [((p['lon'] - LON0) * kx, -(p['lat'] - LAT0) * ky) for p in g]   # x este, z sur
X0, Y0, NT = 16164, 12042, 3; dem = np.zeros((256 * NT, 256 * NT)); n = 2 ** 15
for i in range(NT):
    for j in range(NT):
        a = np.asarray(Image.open(f'{src}/dem/15_{X0 + i}_{Y0 + j}.png').convert('RGB')).astype(float)
        dem[j * 256:(j + 1) * 256, i * 256:(i + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
def h(x, zz):
    lon = LON0 + x / kx; lat = LAT0 - zz / ky
    px = (lon + 180) / 360 * n * 256 - X0 * 256; py = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n * 256 - Y0 * 256
    px = min(max(px, 0), 256 * NT - 1.01); py = min(max(py, 0), 256 * NT - 1.01)
    i, j = int(py), int(px); fy, fx = py - i, px - j
    return dem[i, j] * (1 - fx) * (1 - fy) + dem[i, j + 1] * fx * (1 - fy) + dem[i + 1, j] * (1 - fx) * fy + dem[i + 1, j + 1] * fx * fy - ELEV0
bas = [e for e in el if e.get('tags', {}).get('name') == 'Arantzazuko Amaren Santutegia'][0]
pts = np.array(P(bas['geometry'])[:-1]); C = pts.mean(0); AX = np.linalg.svd(pts - C)[2][0]
if AX[0] < 0: AX = -AX                                   # eje hacia el ábside (este)
PERP = np.array([-AX[1], AX[0]]); W = lambda u, v: C + u * AX + v * PERP
S = 5.0; R = 600; xs = np.arange(-R, R + S, S); zs = np.arange(-R, R + S, S)
Hg = np.array([[h(x, z) for x in xs] for z in zs])
UU, VV = np.meshgrid(xs, zs); rel = np.stack([UU - C[0], VV - C[1]], -1); uu = rel @ AX; vv = rel @ PERP
dist = np.maximum(np.maximum(-88 - uu, uu - 30), np.maximum(-vv - 34, vv - 28)); Hg = Hg * (1 - np.clip(1 - dist / 12, 0, 1))   # plaza a cota 0
cs = plt.contour(xs, zs, Hg, levels=np.arange(-200, 450, 5)); contours = []
for lev, segs in zip(cs.levels, cs.allsegs):
    for sgm in segs:
        if len(sgm) < 4: continue
        sg = sgm[::2] if len(sgm) > 60 else sgm
        contours.append({'y': float(lev), 'm': int(round(lev)) % 25 == 0, 'p': np.round(sg, 1).tolist()})
def flat_y(x, z):
    du, dv = (x - C[0]) * AX[0] + (z - C[1]) * AX[1], (x - C[0]) * PERP[0] + (z - C[1]) * PERP[1]
    return h(x, z) * (1 - float(np.clip(1 - max(max(-88 - du, du - 30), max(-dv - 34, dv - 28)) / 12, 0, 1)))
roads = []
for e in el:
    t = e.get('tags', {}); g = e.get('geometry')
    if not g or 'highway' not in t: continue
    p2 = [(x, z) for x, z in P(g) if abs(x) < R and abs(z) < R]
    if len(p2) < 2: continue
    roads.append({'w': 7.0 if t.get('ref') == 'GI-3591' else (4.0 if t['highway'] in ('tertiary', 'secondary', 'unclassified') else 1.6), 'p': [[round(x, 1), round(flat_y(x, z) + 0.15, 2), round(z, 1)] for x, z in p2]})
blds = []
for e in el:
    t = e.get('tags', {}); g = e.get('geometry')
    if not g or 'building' not in t or t.get('name') == 'Arantzazuko Amaren Santutegia': continue
    p2 = P(g)[:-1]
    if not all(abs(x) < R and abs(z) < R for x, z in p2): continue
    ht = float(t['height']) if 'height' in t else (float(t['building:levels']) * 3 if 'building:levels' in t else 8.0)
    blds.append({'r': [[round(x, 2), round(z, 2)] for x, z in p2], 'y0': round(min(h(x, z) for x, z in p2), 2), 'h': ht, 'n': t.get('name', '')})
# la curva anterior al santuario, en la GI-3591 que sube de Oñati (al oeste de la fachada), a unos 95 m
fac = W(-45, 0); cand = []
for e in el:
    if e.get('tags', {}).get('ref') != 'GI-3591': continue
    for x, z in P(e['geometry']):
        dd = math.hypot(x - fac[0], z - fac[1])
        if 70 < dd < 140 and z < fac[1] and x < fac[0] - 30: cand.append((abs(dd - 95), x, z))
cand.sort(); _, bx, bz = cand[0]
json.dump({'S': S, 'R': R, 'nx': len(xs), 'H': np.round(Hg, 2).tolist(), 'contours': contours, 'roads': roads, 'blds': blds,
           'bas': {'c': C.round(3).tolist(), 'ax': AX.round(5).tolist()}, 'cuneta': [round(bx, 1), round(h(bx, bz), 2), round(bz, 1)]}, open(out_path, 'w'), separators=(',', ':'))
print('ok', out_path, os.path.getsize(out_path) // 1024, 'KB ·', len(contours), 'curvas ·', len(roads), 'vías ·', len(blds), 'edificios · cuneta', round(bx, 1), round(bz, 1))
