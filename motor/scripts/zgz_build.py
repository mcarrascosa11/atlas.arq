"""010 · tramo de Zaragoza (bloque cebra): volumetría del Catastro (WFS INSPIRE, BU.BUILDINGPART, EPSG:25830).
  enlaces: python3 zgz_build.py link LAT LON [MEDIO_LADO_M=300] [N=1]   -> N x N recuadros (el Catastro rechaza
           recuadros grandes: 1,2 x 1,2 km dio "Area of extension out of limits"; 600 x 600 m funciona)
  datos:   python3 zgz_build.py json ../web/zgz.json LAT LON a.gml [b.gml ...]   -> une los GML (sin repetir partes)
Altura de cada parte = plantas sobre rasante x 3,0 m (aproximada: el Catastro da plantas, no metros).
Coordenadas locales: x = este, z = -norte, en metros desde el punto LAT LON (el bloque elegido).
"""
import sys, json, re, math
import xml.etree.ElementTree as ET
from pyproj import Transformer
TO_UTM = Transformer.from_crs('EPSG:4326', 'EPSG:25830', always_xy=True)
FLOOR = 3.0
def links(lat, lon, half=300, n=1):
    x, y = TO_UTM.transform(lon, lat); x0, y0 = round(x - half), round(y - half); step = 2 * half / n; out = []
    for j in range(n - 1, -1, -1):
        for i in range(n):
            b = [round(x0 + i * step), round(y0 + j * step), round(x0 + (i + 1) * step), round(y0 + (j + 1) * step)]
            out.append(('https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx?service=wfs&version=2&request=getfeature'
                        f'&typenames=BU.BUILDINGPART&bbox={b[0]},{b[1]},{b[2]},{b[3]}&srsname=EPSG::25830', b))
    return out
def local(tag): return tag.rsplit('}', 1)[-1]
def ring_of(el):
    pl = next((e for e in el.iter() if local(e.tag) == 'posList'), None)
    if pl is None:
        pts = [e.text for e in el.iter() if local(e.tag) == 'pos']
        v = [float(t) for p in pts for t in p.split()]
    else: v = [float(t) for t in pl.text.split()]
    pts = [(v[i], v[i + 1]) for i in range(0, len(v) - 1, 2)]
    if len(pts) > 1 and pts[0] == pts[-1]: pts = pts[:-1]
    return pts
def parts(gml_path):
    root = ET.parse(gml_path).getroot()
    for bp in root.iter():
        if local(bp.tag) != 'BuildingPart': continue
        gid = bp.get('{http://www.opengis.net/gml/3.2}id') or ''
        lid = next((e.text for e in bp.iter() if local(e.tag) == 'localId'), gid)
        fl = next((e.text for e in bp.iter() if local(e.tag) == 'numberOfFloorsAboveGround'), None)
        fb = next((e.text for e in bp.iter() if local(e.tag) == 'numberOfFloorsBelowGround'), None)
        for patch in (e for e in bp.iter() if local(e.tag) in ('PolygonPatch', 'Polygon')):
            ext = next((e for e in patch if local(e.tag) == 'exterior'), None)
            if ext is None: continue
            ints = [e for e in patch if local(e.tag) == 'interior']
            yield dict(ref=lid, floors=int(fl) if fl and fl.strip().isdigit() else 0, below=int(fb) if fb and fb.strip().isdigit() else 0,
                       rings=[ring_of(ext)] + [ring_of(i) for i in ints])
def build(gml_paths, out_path, lat, lon):
    x0, y0 = TO_UTM.transform(lon, lat)
    vols, seen = [], set()
    for gml_path in gml_paths:
        for p in parts(gml_path):
            rings = [[[round(x - x0, 2), round(-(y - y0), 2)] for x, y in r] for r in p['rings'] if len(r) >= 3]
            if not rings: continue
            key = (p['ref'], tuple(rings[0][0]), len(rings[0]))      # las partes que cruzan dos recuadros vienen repetidas
            if key in seen: continue
            seen.add(key); vols.append(dict(ref=p['ref'], r=rings, fl=p['floors'], h=round(p['floors'] * FLOOR, 2)))
    json.dump(dict(src='Catastro (DG del Catastro), WFS INSPIRE BU.BUILDINGPART', origin_epsg25830=[round(x0, 2), round(y0, 2)],
                   floor_h=FLOOR, vols=vols), open(out_path, 'w'), separators=(',', ':'))
    # resumen para localizar el bloque: partes más cercanas al punto, con su referencia y plantas
    def dist(v):
        xs = [q[0] for q in v['r'][0]]; zs = [q[1] for q in v['r'][0]]
        return math.hypot(sum(xs) / len(xs), sum(zs) / len(zs))
    print(len(vols), 'partes;', sum(1 for v in vols if v['fl'] == 0), 'sin plantas sobre rasante (patios, piscinas cubiertas, sótanos)')
    for v in sorted(vols, key=dist)[:15]: print(f"  {v['ref']:<28} {v['fl']:>2} pl  a {dist(v):5.0f} m")
if __name__ == '__main__':
    if sys.argv[1] == 'link':
        a = sys.argv[2:]
        for k, (u, b) in enumerate(links(float(a[0]), float(a[1]), float(a[2]) if len(a) > 2 else 300, int(a[3]) if len(a) > 3 else 1), 1):
            print(f'{k}: {u}')
    else: build(sys.argv[5:], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]))
