# 016 · textos animados palabra a palabra (al ritmo de la voz), línea de tiempo y portada sobre los fotogramas de Blender.
# Mismas fuentes, colores y posiciones que post015.py. uso: post016.py FOTOGRAMAS_PNG TEXTOS_JSON PORTADA_JPG FUENTES -> /tmp/frames/00000.jpg ...
import sys, os, glob, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fontTools.ttLib import TTFont
FR, TX, COVER, FONTS = sys.argv[1:5]; T = json.load(open(TX)); FPS = T.get('fps', 30)
for f in ('sg700', 'sm400'):
    t = TTFont(f'{FONTS}/{f}.woff2'); t.flavor = None; t.save(f'/tmp/{f}.ttf')
F = lambda f, s: ImageFont.truetype(f'/tmp/{f}.ttf', s)
INK, RED, PAPER, GREY = (26, 27, 32), (226, 64, 28), (242, 241, 236), (156, 153, 143)
FT, FK = F('sg700', 74), F('sm400', 27)
PAS, ANIM, SUBE = T.get('paso', 0.16), 0.22, 26          # segundos entre palabras, duración de la entrada y desplazamiento en píxeles
ROJAS = {w.lower() for w in T.get('rojas', [])}          # palabras clave que entran en bermellón
PLAN = json.load(open('/tmp/voz/plan.json')) if os.path.exists('/tmp/voz/plan.json') else None   # dónde dice Lydia cada frase
def fade(h, top=True, k=1.9):
    g = Image.new('L', (1, h))
    for y in range(h): g.putpixel((0, y), int(255 * min(1, max(0, ((h - y) if top else y) / h * k))))
    return g.resize((1080, h))
TOP, BOT = fade(520), fade(420, False); os.makedirs('/tmp/frames', exist_ok=True)
LIN = 'linea' in T; Y0, Y1 = T.get('rango', (0, 1)); X0, X1, YL = 90, 990, T.get('linea_y', 1780)   # 1560 deja la línea fuera de la zona que tapan el nombre y la descripción en Reels
def anio(t):
    L = T['linea']
    for (ta, ya), (tb, yb) in zip(L, L[1:]):
        if ta <= t <= tb: u = (t - ta) / (tb - ta) if tb > ta else 1; u = u * u * (3 - 2 * u); return ya + (yb - ya) * u
    return L[-1][1]
def linea(d, year):
    d.line([(X0, YL), (X1, YL)], fill=GREY, width=4); xm = X0 + (X1 - X0) * (year - Y0) / (Y1 - Y0); d.line([(X0, YL), (xm, YL)], fill=RED, width=6)
    for yv in T['hitos']:
        x = X0 + (X1 - X0) * (yv - Y0) / (Y1 - Y0); d.line([(x, YL - 12), (x, YL + 12)], fill=INK, width=3); s = str(yv); d.text((x - d.textlength(s, font=F('sm400', 24)) / 2, YL + 22), s, font=F('sm400', 24), fill=INK)
    d.ellipse([xm - 13, YL - 13, xm + 13, YL + 13], fill=RED, outline=PAPER, width=4)
_d = ImageDraw.Draw(Image.new('RGB', (10, 10))); SP = _d.textlength(' ', font=FT)
def maqueta(title, width=900):                          # posición de cada palabra con el mismo ajuste de líneas que post015
    pos, x, k = [], 0, 0
    for w in title.split():
        lw = _d.textlength(w, font=FT)
        if x > 0 and x + lw > width: x, k = 0, k + 1
        pos.append((w, 62 + int(x), 196 + k * 77)); x += lw + SP
    return pos
CACHE = {}
def palabras(im, title, t, start, paso):
    for i, (w, x, y) in enumerate(CACHE.setdefault(title, maqueta(title))):
        a = (t - (start + i * paso)) / ANIM
        if a <= 0: break
        e = 1 - (1 - min(1, a)) ** 3; dy = int(round((1 - e) * SUBE)); col = RED if w.lower().strip('.,:;¿?') in ROJAS else INK
        lay = Image.new('RGBA', (int(_d.textlength(w, font=FT)) + 24, 110), (0, 0, 0, 0)); ImageDraw.Draw(lay).text((0, 0), w, font=FT, fill=col + (int(255 * e),))
        im.alpha_composite(lay, (x, y + dy))
files = sorted(glob.glob(f'{FR}/*.png'))
for i, p in enumerate(files):
    t = i / FPS; im = Image.open(p).convert('RGB'); im.paste(Image.new('RGB', (1080, 520), PAPER), (0, 0), TOP); (im.paste(Image.new('RGB', (1080, 420), PAPER), (0, 1500), BOT) if LIN else None)
    im = im.convert('RGBA'); d = ImageDraw.Draw(im)
    cur = [k for k, x in enumerate(T['textos']) if x[0] <= t < x[1]]
    if cur:
        k = cur[-1]; t0, _, kick, title = T['textos'][k][:4]; ka = min(1, (t - t0) / 0.15); nw = len(title.split())
        if PLAN and k < len(PLAN): start = PLAN[k]['t0']; paso = min(0.5, max(0.1, 0.9 * (PLAN[k]['t1'] - PLAN[k]['t0']) / nw))
        else: start, paso = t0 + 0.08, PAS
        d.text((64, 150), kick, font=FK, fill=RED + (int(255 * ka),)); palabras(im, title, t, start, paso)
    (linea(d, anio(t)) if LIN else None); im.convert('RGB').save(f'/tmp/frames/{i:05d}.jpg', quality=93)
P = T['portada']; im = Image.open(files[min(P['fotograma'], len(files) - 1)]).convert('RGB')
def halo(xy, txt, font, fill):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).text(xy, txt, font=font, fill=255)
    m = m.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(8)).point(lambda v: min(255, int(v * 1.7)))
    im.paste(Image.new('RGB', im.size, PAPER), (0, 0), m); ImageDraw.Draw(im).text(xy, txt, font=font, fill=fill)
def wrap(d, txt, font, width):
    out, cur = [], ''
    for w in txt.split():
        c = (cur + ' ' + w).strip()
        if d.textlength(c, font=font) <= width: cur = c
        else: out.append(cur); cur = w
    return out + [cur]
d = ImageDraw.Draw(im); halo((48, 216), P['n'], F('sg700', 302), RED); y = 508
for ln in wrap(d, P['t'], F('sg700', 66), 640): halo((52, y), ln, F('sg700', 66), INK); y += 62
y += 38
for ln in P['m']: halo((54, y), ln, F('sm400', 23), INK); y += 37
os.makedirs(os.path.dirname(COVER), exist_ok=True); im.save(COVER, quality=92); print('ok', len(files), 'fotogramas y portada')
