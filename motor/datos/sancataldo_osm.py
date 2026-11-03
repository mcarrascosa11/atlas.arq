# 016 · San Cataldo · huellas reales de los edificios del cementerio desde OpenStreetMap (© colaboradores de OpenStreetMap, ODbL).
# Busca el cementerio en Nominatim, baja de Overpass los edificios y recintos de alrededor y los guarda en metros locales (x este, y norte).
import json, math, os, time, requests
O = 'datos/sancataldo'; os.makedirs(O, exist_ok=True); H = {'User-Agent': 'atlas.arq/1.0 (divulgación de arquitectura)'}
LOG = open(f'{O}/registro.txt', 'w')
def log(*a): LOG.write(' '.join(str(x) for x in a) + '\n'); LOG.flush(); print(*a)
r = requests.get('https://nominatim.openstreetmap.org/search', params={'q': 'Cimitero di San Cataldo, Modena', 'format': 'json', 'limit': 5}, headers=H, timeout=60)
cand = r.json(); log('nominatim', r.status_code, [(c.get('display_name', '')[:80], c.get('lat'), c.get('lon'), c.get('class'), c.get('type')) for c in cand])
lat0, lon0 = (float(cand[0]['lat']), float(cand[0]['lon'])) if cand else (44.6548, 10.9038)
q = f'''[out:json][timeout:90];
(way["building"](around:700,{lat0},{lon0}); relation["building"](around:700,{lat0},{lon0});
 way["landuse"="cemetery"](around:900,{lat0},{lon0}); way["amenity"="grave_yard"](around:900,{lat0},{lon0}); relation["landuse"="cemetery"](around:900,{lat0},{lon0});
 way["man_made"](around:700,{lat0},{lon0}); way["highway"](around:500,{lat0},{lon0}););
out body geom tags;'''
for url in ('https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'):
    try:
        r = requests.post(url, data={'data': q}, headers=H, timeout=180); log('overpass', url, r.status_code, len(r.content))
        if r.status_code == 200: break
    except Exception as e: log('overpass error', url, e); time.sleep(5)
D = r.json(); kx = 111320 * math.cos(math.radians(lat0)); ky = 110540
def xy(p): return [round((p['lon'] - lon0) * kx, 2), round((p['lat'] - lat0) * ky, 2)]
out = []
for e in D.get('elements', []):
    t = e.get('tags', {})
    if e['type'] == 'way' and 'geometry' in e: rings = [[xy(p) for p in e['geometry']]]
    elif e['type'] == 'relation': rings = [[xy(p) for p in m['geometry']] for m in e.get('members', []) if m.get('geometry') and m.get('role') in ('outer', '')]
    else: continue
    out.append({'id': f"{e['type'][0]}{e['id']}", 'tags': t, 'rings': rings})
json.dump({'origen': [lat0, lon0], 'fuente': '© colaboradores de OpenStreetMap (ODbL)', 'elementos': out}, open(f'{O}/osm.json', 'w'), ensure_ascii=False)
from collections import Counter
log('elementos', len(out), Counter(('building' if 'building' in x['tags'] else 'highway' if 'highway' in x['tags'] else 'otro') for x in out))
for x in out:
    if 'building' in x['tags'] or x['tags'].get('landuse') == 'cemetery':
        R = x['rings'][0]; xs, ys = [p[0] for p in R], [p[1] for p in R]
        log(x['id'], {k: v for k, v in x['tags'].items() if k in ('building', 'name', 'building:levels', 'height', 'landuse', 'religion', 'historic', 'architect', 'start_date')}, 'bbox', round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys)), 'n', len(R))
