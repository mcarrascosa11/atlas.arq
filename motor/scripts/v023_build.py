# 023 · El chaflán de Cerdà (Ensanche de Barcelona) · prepara motor/web/v023.json desde OpenStreetMap (datos/eixample: b edificios, c calles y verde).
# Coordenadas locales en metros: x este, z sur. Ajusta la retícula de Cerdà (113,3 m + calles de 20 m) a las calles reales.
import json, math, sys
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'
D = f'{ROOT}/datos/eixample'
def carga(*fs):
    for f in fs:
        try: return json.load(open(f'{D}/{f}.json'))['elements']
        except Exception: pass
    return []
B = carga('b', 'b2'); C = carga('c', 'c2')
LAT0, LON0 = 41.3935, 2.1675; K = math.cos(math.radians(LAT0)); RMAX = 560
loc = lambda p: [round((p['lon'] - LON0) * 111320 * K, 2), round(-(p['lat'] - LAT0) * 110574, 2)]
ring = lambda g: (lambda r: r[:-1] if len(r) > 1 and r[0] == r[-1] else r)([loc(p) for p in g])
def alto(t, d=21.0):
    try:
        if 'height' in t: return float(t['height'].replace(' m', ''))
        if 'building:levels' in t: return float(t['building:levels']) * 3.2 + 1.5
    except Exception: pass
    return d
cen = lambda r: (sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r))
def dentro(p, rr):
    c = False
    for i in range(len(rr)):
        a, b = rr[i], rr[i - 1]
        if (a[1] > p[1]) != (b[1] > p[1]) and p[0] < a[0] + (p[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1]): c = not c
    return c
# 1) orientación de la retícula: ángulo dominante (módulo 90°) de las calles, ponderado por longitud
roads = []
for e in C:
    t = e.get('tags', {})
    if 'highway' in t and t['highway'] in ('primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'pedestrian', 'trunk') and len(e.get('geometry') or []) > 1: roads.append([loc(p) for p in e['geometry']])
sx = sy = 0
for r in roads:
    for a, b in zip(r, r[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1]); an = math.atan2(b[1] - a[1], b[0] - a[0]); sx += L * math.cos(4 * an); sy += L * math.sin(4 * an)
TH = math.atan2(sy, sx) / 4                      # ángulo de la retícula en el plano x-z
cu, su = math.cos(TH), math.sin(TH)
toUV = lambda p: (p[0] * cu + p[1] * su, -p[0] * su + p[1] * cu)
toXZ = lambda u, v: [round(u * cu - v * su, 2), round(u * su + v * cu, 2)]
# 2) desfase: media circular de los nudos de las calles alineadas con cada eje
P = 133.3; acc = {'u': [0, 0], 'v': [0, 0]}
for r in roads:
    for a, b in zip(r, r[1:]):
        ua, va = toUV(a); ub, vb = toUV(b); L = math.hypot(ub - ua, vb - va)
        if L < 8: continue
        if abs(vb - va) < 0.08 * L:   # calle en dirección u -> su v es constante
            ph = 2 * math.pi * ((va + vb) / 2) / P; acc['v'][0] += L * math.cos(ph); acc['v'][1] += L * math.sin(ph)
        elif abs(ub - ua) < 0.08 * L:
            ph = 2 * math.pi * ((ua + ub) / 2) / P; acc['u'][0] += L * math.cos(ph); acc['u'][1] += L * math.sin(ph)
OU = math.atan2(acc['u'][1], acc['u'][0]) * P / (2 * math.pi); OV = math.atan2(acc['v'][1], acc['v'][0]) * P / (2 * math.pi)
# 2b) cruces reales: nudos que comparten dos o más calles (para encajar cada cruce ideal en el real)
from collections import Counter
cnt = Counter()
for e in C:
    t = e.get('tags', {})
    if 'highway' in t and t['highway'] in ('primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street', 'pedestrian', 'trunk'):
        for q in {(round(p['lat'], 7), round(p['lon'], 7)) for p in (e.get('geometry') or [])}: cnt[q] += 1
JN = [loc({'lat': a_, 'lon': b_}) for (a_, b_), n in cnt.items() if n >= 2]
def encaja(u, v, rad=26):
    x, z = toXZ(u, v); best = None; bd = rad
    for q in JN:
        d = math.hypot(q[0] - x, q[1] - z)
        if d < bd: bd, best = d, q
    if best is None: return u, v, False
    bu, bv = toUV(best); return bu, bv, True
# 3) manzanas ideales (octógonos de 113,3 m con chaflán a 45°, cateto 14,14 m) y cruces
S = 113.3; CH = 14.14; HALF = S / 2
def octo(cu_, cv_):
    h = HALF; c = CH
    pts = [(h - c, -h), (h, -h + c), (h, h - c), (h - c, h), (-h + c, h), (-h, h - c), (-h, -h + c), (-h + c, -h)]
    return [toXZ(cu_ + a, cv_ + b) for a, b in pts]
blocks, cruces = [], []
for i in range(-6, 7):
    for j in range(-6, 7):
        q = [encaja(OU + (i + di) * P, OV + (j + dj) * P) for di in (0, 1) for dj in (0, 1)]; qq = [x for x in q if x[2]]
        bu, bv = (sum(x[0] for x in qq) / len(qq), sum(x[1] for x in qq) / len(qq)) if len(qq) >= 3 else (OU + P / 2 + i * P, OV + P / 2 + j * P); c = toXZ(bu, bv)
        if math.hypot(*c) < RMAX - 40: blocks.append({'c': c, 'uv': [round(bu, 2), round(bv, 2)], 'o': octo(bu, bv)})
        iu, iv, ok = encaja(OU + i * P, OV + j * P); ci = toXZ(iu, iv)
        if ok and math.hypot(*ci) < RMAX - 60:
            h = 10; c_ = CH; pl = [(h + c_, h), (h, h + c_), (-h, h + c_), (-h - c_, h), (-h - c_, -h), (-h, -h - c_), (h, -h - c_), (h + c_, -h)]
            cruces.append({'c': ci, 'o': [toXZ(iu + a, iv + b) for a, b in pl]})
# 4) edificios: los de la manzana central aparte (para la idea de Cerdà y la realidad)
bc = min(blocks, key=lambda b: math.hypot(*b['c']))
out = {'th': round(TH, 5), 'ou': round(OU, 2), 'ov': round(OV, 2), 'P': P, 'S': S, 'CH': CH, 'ctx': [], 'mz': [], 'roads': [], 'green': [], 'interior': [], 'blocks': blocks, 'cruces': cruces, 'bc': bc}
cerca = lambda r: math.hypot(*cen(r)) < RMAX
for e in B:
    t = e.get('tags', {}); rings = []
    if e['type'] == 'way' and 'building' in t and len(e.get('geometry', [])) > 3: rings = [(ring(e['geometry']), [])]
    elif e['type'] == 'relation' and 'building' in t:
        ms = e.get('members', []); cerr = lambda m: m.get('geometry') and m['geometry'][0] == m['geometry'][-1]
        outer = [ring(m['geometry']) for m in ms if m.get('role') == 'outer' and cerr(m)]; inner = [ring(m['geometry']) for m in ms if m.get('role') == 'inner' and cerr(m)]
        rings = [(o, [h for h in inner if len(h) >= 3 and dentro(h[0], o)]) for o in outer if len(o) >= 3]
    for o, hs in rings:
        if not cerca(o): continue
        it = {'r': o, 'h': alto(t), **({'holes': hs} if hs else {})}
        (out['mz'] if dentro(list(cen(o)), bc['o']) else out['ctx']).append(it)
for e in C:
    t = e.get('tags', {}); g = e.get('geometry') or []
    if 'highway' in t and len(g) > 1 and t['highway'] not in ('footway', 'steps', 'path', 'cycleway', 'service', 'corridor', 'track'): out['roads'].append([loc(p) for p in g])
    elif (t.get('leisure') in ('park', 'garden', 'playground') or t.get('landuse') == 'grass') and len(g) > 3:
        r = ring(g)
        if len(r) < 3 or not cerca(r): continue
        c = list(cen(r)); u, v = toUV(c); du = (u - OU) % P - P / 2; dv = (v - OV) % P - P / 2
        nombre = t.get('name', '')
        if abs(du) < 42 and abs(dv) < 42: out['interior'].append({'r': r, 'n': nombre})   # dentro de una manzana: interior ajardinado
        else: out['green'].append(r)
json.dump(out, open(f'{ROOT}/motor/web/v023.json', 'w'), separators=(',', ':'))
print('nudos', len(JN), 'ángulo', round(math.degrees(TH), 1), 'desfase', round(OU, 1), round(OV, 1), 'manzanas', len(blocks), 'cruces', len(cruces), 'edificios', len(out['ctx']), 'manzana central', len(out['mz']), 'interiores', len(out['interior']), [i['n'] for i in out['interior'] if i['n']][:12], 'calles', len(out['roads']))
