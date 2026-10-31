# 014 · Vegaviana: edificios del Catastro (huella y plantas), encinas de 1956 y de hoy detectadas en las ortofotos del IGN, y calles de OSM
import json, re, glob, sys, numpy as np
from PIL import Image
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union
from scipy import ndimage as ndi
from pyproj import Transformer
D = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/v014/datos'; OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/v014/vveg.json'
tr = Transformer.from_crs('EPSG:4326', 'EPSG:25829', always_xy=True)
CX, CY = tr.transform(-6.71857, 40.04147)                                       # centro: nodo «Vegaviana» de OSM
loc = lambda x, y: [round(x - CX, 2), round(-(y - CY), 2)]                         # x al este, z al sur
# edificios: partes del Catastro con su número de plantas
parts = {}
for f in sorted(glob.glob(f'{D}/catastro/bu*.gml')):
    t = open(f, encoding='utf-8', errors='ignore').read()
    for m in re.finditer(r'<bu-ext2d:BuildingPart gml:id="([^"]+)"(.*?)</bu-ext2d:BuildingPart>', t, re.S):
        gid, body = m.group(1), m.group(2)
        if gid in parts: continue
        fl = re.search(r'numberOfFloorsAboveGround>(\d+)<', body); fl = int(fl.group(1)) if fl else 1
        pl = re.search(r'<gml:posList[^>]*>([^<]+)<', body)
        if not pl: continue
        v = [float(a) for a in pl.group(1).split()]; ring = [loc(v[i], v[i + 1]) for i in range(0, len(v) - 1, 2)]
        if len(ring) < 4: continue
        g = Polygon(ring).buffer(0)
        if g.area < 4 or fl < 1: continue
        parts[gid] = {'r': ring[:-1] if ring[0] == ring[-1] else ring, 'f': fl, 'a': round(g.area, 1)}
P = list(parts.values()); print('partes de edificio', len(P), 'plantas', {k: sum(1 for p in P if p['f'] == k) for k in (1, 2, 3)})
# encinas: manchas oscuras en las ortofotos (0,5 m/px, recuadro 694100-695700 x 4433900-4435500)
X0, Y1, PX = 694100, 4435500, 0.5
def trees(path, kind):
    im = np.asarray(Image.open(path).convert('RGB')).astype(float); g = im.mean(2)
    if kind == 'hoy': mask = (g < np.percentile(g, 22)) & (im[..., 1] >= im[..., 0] - 6)          # copas verdes oscuras
    else: mask = g < np.percentile(g, 18)                                                            # 1956: copas oscuras sobre el monte
    mask = ndi.binary_opening(mask, iterations=2); lab, n = ndi.label(mask)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start; area = (lab[sl] == i + 1).sum()
        if area < 40 or area > 2600 or max(h, w) > 3.2 * min(h, w): continue                        # copas de 3 a 25 m aprox.
        cy, cx = ndi.center_of_mass(lab[sl] == i + 1); x = X0 + (sl[1].start + cx) * PX; y = Y1 - (sl[0].start + cy) * PX
        out.append(loc(x, y) + [round(float(np.sqrt(area / np.pi) * PX), 1)])
    return out
T56, T26 = trees(f'{D}/orto/vuelo_1956.jpg', '1956'), trees(f'{D}/orto/pnoa_actual.jpg', 'hoy')
# fuera de los edificios de hoy (sombras y tejados oscuros no son árboles)
bu = unary_union([Polygon(p['r']).buffer(1.0) for p in P])
T26 = [t for t in T26 if not bu.contains(Point(t[0], t[1]))]
print('encinas 1956', len(T56), '| hoy', len(T26))
# calles de OSM
osm = json.load(open(f'{D}/osm.json'))['elements']; roads = []
for e in osm:
    tg = e.get('tags', {})
    if 'highway' in tg and e.get('geometry'):
        roads.append({'t': tg['highway'], 'l': [loc(*tr.transform(p['lon'], p['lat'])) for p in e['geometry']]})
print('calles', len(roads))
json.dump({'blds': P, 't56': T56, 't26': T26, 'roads': roads, 'c': [round(CX, 1), round(CY, 1)]}, open(OUT, 'w'), separators=(',', ':'))
import os; print(OUT, round(os.path.getsize(OUT) / 1e6, 2), 'MB')
