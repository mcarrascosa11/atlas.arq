# 014 · nube de puntos LiDAR del IGN (PNOA) para Vegaviana: busca el archivo en el Centro de Descargas del CNIG como lo haría el navegador,
# lo descarga, recorta el pueblo y guarda solo suelo y edificios (clases 2 y 6) en datos/014/lidar/vegaviana.npz. Deja un registro de cada paso.
import requests, re, json, sys, os, numpy as np
OUT = 'datos/014/lidar'; os.makedirs(OUT, exist_ok=True); LOG = open(f'{OUT}/registro.txt', 'w')
def log(*a): print(*a, flush=True); LOG.write(' '.join(str(x) for x in a) + '\n'); LOG.flush()
B = 'https://centrodedescargas.cnig.es/CentroDescargas/'
S = requests.Session(); S.headers.update({'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'es-ES,es;q=0.9'})
pt = json.dumps({"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [-6.7186, 40.0415]}}]}, separators=(',', ':'))
found = []
for serie in ('LIDA3', 'LIDA2'):
    r0 = S.get(B + f'catalogo.do?Serie={serie}', timeout=60); log(serie, 'catálogo', r0.status_code, len(r0.text), 'cookies', list(S.cookies.keys()))
    r = S.get(B + 'archivosSerie', params={'numPagina': 1, 'codSerie': serie, 'coordenadas': pt}, headers={'X-Requested-With': 'XMLHttpRequest', 'Referer': B + f'catalogo.do?Serie={serie}'}, timeout=90)
    log(serie, 'archivosSerie', r.status_code, len(r.text))
    open(f'{OUT}/archivos_{serie}.html', 'w').write(r.text)
    secs = re.findall(r'detalleArchivo\?sec=(\d+)', r.text); names = re.findall(r'([A-Za-z0-9_\-]+\.laz)', r.text, re.I)
    log(serie, 'secuenciales', secs[:10], 'nombres', names[:10])
    if secs: found.append((serie, secs, names))
if not found: log('sin archivos'); sys.exit(0)
serie, secs, names = found[0]; sec = secs[0]
dst = '/tmp/vegaviana.laz'
for how in ('post', 'get'):
    url = B + 'descargaDirS3'
    r = S.post(url, data={'secuencial': sec}, headers={'Referer': B + f'catalogo.do?Serie={serie}'}, stream=True, timeout=600, allow_redirects=True) if how == 'post' else S.get(url, params={'secuencial': sec}, stream=True, timeout=600)
    ct = r.headers.get('Content-Type', ''); log('descarga', how, r.status_code, ct, r.headers.get('Content-Length'), r.url[:120])
    if r.status_code == 200 and 'html' not in ct.lower():
        with open(dst, 'wb') as f:
            for ch in r.iter_content(1 << 20): f.write(ch)
        log('bajado', os.path.getsize(dst), 'bytes'); break
    else: log('respuesta', r.text[:400].replace('\n', ' '))
if not os.path.exists(dst): sys.exit(0)
import laspy
from pyproj import Transformer
las = laspy.read(dst); log('puntos', len(las.points), 'crs?', las.header.parse_crs())
X, Y, Z, C = np.asarray(las.x), np.asarray(las.y), np.asarray(las.z), np.asarray(las.classification)
cx, cy = Transformer.from_crs('EPSG:4326', 'EPSG:25829', always_xy=True).transform(-6.71857, 40.04147)
if abs(np.median(X) - cx) > 50000:                                                         # el archivo viene en otro huso: se pasa al 29
    tr = Transformer.from_crs('EPSG:25830', 'EPSG:25829', always_xy=True); X, Y = tr.transform(X, Y); log('reproyectado de 25830 a 25829')
m = (np.abs(X - cx) < 650) & (np.abs(Y - cy) < 650) & np.isin(C, (2, 6))
log('recorte', int(m.sum()), 'puntos; clases', {int(k): int((C[m] == k).sum()) for k in (2, 6)})
np.savez_compressed(f'{OUT}/vegaviana.npz', x=(X[m] - cx).astype(np.float32), y=(Y[m] - cy).astype(np.float32), z=Z[m].astype(np.float32), c=C[m].astype(np.uint8), origen=np.array([cx, cy]), archivo=np.array([names[0] if names else sec]))
log('guardado', os.path.getsize(f'{OUT}/vegaviana.npz'), 'bytes')
