# 015 · Sarnago: extrae de los DXF del TFG (2019) lo que necesita la escena: edificios con su uso en 1955 y su estado en 2019,
# familias y personas de 1955, lazos entre casas, ocupación en 2019, caminos, lindes y árboles. Todo alineado al plano de 1955.
import ezdxf, json, math, numpy as np, sys
from ezdxf import path as ezpath
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union
from scipy.spatial import cKDTree
ROOT = sys.argv[1]; D = f'{ROOT}/datos/sarnago/dxf'; WORLD = sys.argv[2]
def load(n): return ezdxf.readfile(f'{D}/{n}.dxf').modelspace()
def ring(e):
    if e.dxftype() == 'LWPOLYLINE': pts = [(p[0], p[1]) for p in e.get_points('xy')]
    else: pts = [(v.x, v.y) for v in ezpath.make_path(e).flattening(0.2)]
    return pts
def hatchPolys(msp, layer):
    out = []
    for h in msp.query(f'HATCH[layer=="{layer}"]'):
        for p in h.paths.rendering_paths(h.dxf.hatch_style) if hasattr(h.paths, 'rendering_paths') else h.paths:
            try:
                pp = ezpath.from_hatch_boundary_path(p, ocs=h.ocs(), elevation=h.dxf.elevation.z)
                pts = [(v.x, v.y) for v in pp.flattening(0.2)]
                if len(pts) >= 3:
                    g = Polygon(pts).buffer(0)
                    if g.area > 0.5: out.append(g)
            except Exception: pass
    return out
def contornos(msp, layer='_Contorno'):
    from shapely.geometry import LineString
    from shapely.ops import polygonize
    ls = []
    for e in msp.query(f'LWPOLYLINE SPLINE[layer=="{layer}"]'):
        pts = ring(e)
        if e.dxftype() == 'LWPOLYLINE' and e.closed: pts = pts + [pts[0]]
        if len(pts) >= 2: ls.append(LineString(pts))
    return [p for p in polygonize(unary_union(ls)) if p.area > 4]
def polysLayer(msp, layer, closed_only=True):
    out = []
    for e in msp.query(f'LWPOLYLINE SPLINE[layer=="{layer}"]'):
        pts = ring(e)
        if len(pts) >= 3 and (not closed_only or e.dxftype() != 'LWPOLYLINE' or e.closed or math.dist(pts[0], pts[-1]) < 0.3):
            g = Polygon(pts).buffer(0)
            if g.area > 1: out.append(g)
    return out
def lines(msp, layer):
    out = []
    for e in msp.query(f'LWPOLYLINE SPLINE LINE[layer=="{layer}"]'):
        if e.dxftype() == 'LINE': pts = [(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)]
        else: pts = ring(e)
        if len(pts) >= 2: out.append(pts)
    return out
def wallpts(msp, layer='_Proyeccion1'):
    P = []
    for e in msp.query(f'LWPOLYLINE[layer=="{layer}"]'):
        P += [(p[0], p[1]) for p in e.get_points('xy')]
    return np.array(P)
def align(A, B, it=30):
    # traslación que lleva la nube B sobre la nube A (vecino más cercano iterativo)
    t = A.mean(0) - B.mean(0); tree = cKDTree(A)
    for _ in range(it):
        d, i = tree.query(B + t); m = d < np.percentile(d, 70); t = t + (A[i[m]] - (B[m] + t)).mean(0)
    d, _ = tree.query(B + t); return t, float(np.median(d))
n55, n19, r55, r19 = load('TFG_nucleo_1955_usos'), load('TFG_nucleo_2019_usos'), load('TFG_relaciones_sociales_1955'), load('TFG_relaciones_sociales_2019')
# traslaciones medidas: relaciones 1955 sobre núcleo 1955 por votación de muros (coincidencia total); núcleo 2019 por los números
# de los edificios públicos y los contornos; relaciones 2019 sobre núcleo 2019 (coincidencia total)
W55 = wallpts(n55); t19 = np.array([-698.023, 0.472]); tr55 = np.array([56.643, 1014.358]); tr19 = np.array([-36.81 - 698.023, 1204.95 + 0.472])
O = W55.mean(0)                                                                                           # origen: centro del núcleo de 1955
mv = lambda g, t: __import__('shapely.affinity', fromlist=['translate']).translate(g, t[0] - O[0], t[1] - O[1])
def R(g): return [[round(x, 2), round(-y, 2)] for x, y in list(g.exterior.coords)[:-1]]                 # x al este, z al sur (y del dibujo hacia el norte)
# edificios de 1955 y su uso
B55 = [mv(g, (0, 0)) for g in contornos(n55)]
use55 = {}
for lay, key in [('NU_VivPerm', 'viv'), ('NU_VivDesha', 'vivdes'), ('NU_Corrales', 'corral'), ('NU_Majadas', 'majada'), ('NU_Pajares', 'pajar'), ('NU_HornoPrivado', 'horno'), ('NU_Público', 'publico')]:
    use55[key] = unary_union([mv(g, (0, 0)) for g in hatchPolys(n55, lay)] + ([mv(g, (0, 0)) for g in polysLayer(n55, lay)] if key in ('viv', 'corral') else []))
bl = []
for g in B55:
    c = g.representative_point(); u = 'otro'
    for k in ('publico', 'viv', 'vivdes', 'corral', 'majada', 'pajar', 'horno'):
        if not use55[k].is_empty and use55[k].buffer(0.3).contains(c): u = k; break
    bl.append({'r': R(g), 'u55': u, 'a': round(g.area, 1)})
# estado en 2019: edificio en pie (contorno 2019), vivienda, ruina, almacén
B19 = [mv(g, t19) for g in contornos(n19)]
st = {k: unary_union([mv(g, t19) for g in hatchPolys(n19, lay)]) for lay, k in [('NU_VivGeneral', 'viv'), ('NU_VivDesha', 'vivdes'), ('NU_SolarRuina', 'ruina'), ('NU_Almacen_Garaje', 'almacen'), ('NU_Público', 'publico')]}
stand19 = unary_union(B19)
for b in bl:
    g = Polygon([(x, -z) for x, z in b['r']]); c = g.representative_point(); s = 'desaparece'
    if stand19.buffer(0.5).contains(c):
        s = 'en pie'
        for k in ('publico', 'viv', 'vivdes', 'almacen'):
            if not st[k].is_empty and st[k].buffer(0.5).contains(c): s = k; break
    elif not st['ruina'].is_empty and st['ruina'].buffer(0.5).contains(c): s = 'ruina'
    b['s19'] = s
new19 = [R(g) for g in B19 if not unary_union([Polygon([(x, -z) for x, z in b['r']]) for b in bl]).buffer(0.5).contains(g.representative_point())]
# familias (1955): círculo grande por vivienda, personas, lazos
fam = [[round(e.dxf.center.x + tr55[0] - O[0], 2), round(-(e.dxf.center.y + tr55[1] - O[1]), 2), round(e.dxf.radius, 2)] for e in r55.query('CIRCLE[layer=="S_Circulo grande"]')]
per = [[round(e.dxf.center.x + tr55[0] - O[0], 2), round(-(e.dxf.center.y + tr55[1] - O[1]), 2), round(e.dxf.radius, 2)] for e in r55.query('CIRCLE[layer=="S_Cabezas familia"]')]
def arcs(msp, layer, t):
    out = []
    for e in msp.query(f'ARC[layer=="{layer}"]'):
        pts = [(p.x + t[0] - O[0], -(p.y + t[1] - O[1])) for p in e.flattening(0.3)]; out.append([[round(x, 2), round(z, 2)] for x, z in pts])
    return out
laz = {'hermanos': arcs(r55, 'S_Lineas hermanos', tr55), 'hijos': arcs(r55, 'S_Lineas hijos', tr55), 'hoy': arcs(r19, 'S1_Lineas', tr19)}
occ19 = [[round(g.centroid.x, 2), round(-g.centroid.y, 2), round(math.sqrt(g.area / math.pi), 2)] for g in [mv(h, tr19) for h in hatchPolys(r19, 'Mapa_CirculoGurdu')]]
cam = {y: [[[round(x - O[0] + t[0], 2), round(-(z - O[1] + t[1]), 2)] for x, z in L] for L in lines(m, '_Caminos')] for y, m, t in (('1955', n55, (0, 0)), ('2019', n19, t19))}
tie = {y: [[[round(x - O[0] + t[0], 2), round(-(z - O[1] + t[1]), 2)] for x, z in L] for L in lines(m, '_Tierras')] for y, m, t in (('1955', n55, (0, 0)), ('2019', n19, t19))}
arb = {y: [[round(g.centroid.x, 1), round(-g.centroid.y, 1), round(math.sqrt(g.area / math.pi), 1)] for g in [mv(h, t) for h in hatchPolys(m, '_Arboles')]] for y, m, t in (('1955', n55, (0, 0)), ('2019', n19, t19))}
txt = []
for e in n55.query('MTEXT[layer=="NU_Texto"]'):
    p = e.dxf.insert; txt.append([e.plain_text().strip(), round(p.x - O[0], 2), round(-(p.y - O[1]), 2)])
out = {'blds': bl, 'new19': new19, 'fam': fam, 'per': per, 'lazos': laz, 'occ19': occ19, 'caminos': cam, 'tierras': tie, 'arboles': arb, 'pub': txt}
# mapa de España: personas por ciudad en 2019 (TFG, fig. 62, cifras medidas en el gráfico) en coordenadas de pantalla
T = json.load(open(WORLD)); sc, trn = T['transform']['scale'], T['transform']['translate']; arcsW = []
for a in T['arcs']:
    x = y = 0; pts = []
    for dx, dy in a: x += dx; y += dy; pts.append((x * sc[0] + trn[0], y * sc[1] + trn[1]))
    arcsW.append(pts)
def wring(ids):
    o = []
    for i in ids: s_ = arcsW[i] if i >= 0 else arcsW[~i][::-1]; o += s_ if not o else s_[1:]
    return o
geoms = {g.get('properties', {}).get('name'): g for g in T['objects']['countries']['geometries']}
lon0, lat0, S = -3.4, 40.1, 92.0
pr = lambda lon, lat: (540 + (lon - lon0) * S * math.cos(math.radians(lat0)), 1130 - (lat - lat0) * S)
def paths(name, minpts=12):
    g = geoms[name]; PP = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]; o = []
    for poly in PP:
        pts = [pr(x, y) for x, y in wring(poly[0])]
        if len(pts) < minpts or not all(-200 < x < 1300 and 300 < y < 1900 for x, y in pts[:3]): continue
        o.append('M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in pts[::2]) + 'Z')
    return ' '.join(o)
CIT = {'Tudela': (-1.605, 42.062, 102), 'Madrid': (-3.70, 40.42, 50), 'Tarazona': (-1.727, 41.904, 41), 'Calahorra': (-1.965, 42.302, 33), 'Soria': (-2.464, 41.764, 24), 'Zaragoza': (-0.889, 41.649, 17),
       'Corella': (-1.786, 42.115, 15), 'Barcelona': (2.170, 41.387, 12), 'Cenicero': (-2.644, 42.481, 10), 'Vitoria': (-2.672, 42.846, 9), 'Utebo': (-1.000, 41.714, 7), 'Aguilar del Río Alhama': (-1.995, 41.951, 6), 'Fontellas': (-1.574, 42.026, 4), 'Cádiz': (-6.288, 36.527, 3)}
out['map'] = {'spain': paths('Spain'), 'portugal': paths('Portugal'), 'france': paths('France', 40), 'sarnago': [round(v, 1) for v in pr(-2.33, 41.94)], 'cities': [[n, round(pr(lo, la)[0], 1), round(pr(lo, la)[1], 1), k] for n, (lo, la, k) in CIT.items()]}
json.dump(out, open(f'{ROOT}/motor/web/vsar.json', 'w'), separators=(',', ':'))
import collections
print('edificios 1955', len(bl), collections.Counter(b['u55'] for b in bl)); print('estado 2019', collections.Counter(b['s19'] for b in bl), 'nuevos 2019', len(new19))
print('viviendas 1955 (habitadas):', sum(b['u55'] == 'viv' for b in bl), '| familias', len(fam), 'personas', len(per), '| lazos', {k: len(v) for k, v in laz.items()}, '| ocupación 2019', len(occ19))
print('públicos', txt)
