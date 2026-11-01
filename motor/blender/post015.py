# 015 · textos, contador y línea de tiempo sobre los fotogramas de Blender, y portada. Mismas fuentes y posiciones que post.py.
# uso: post015.py FOTOGRAMAS_PNG TEXTOS_JSON PORTADA_JPG FUENTES  -> /tmp/frames/00000.jpg ...
import sys, os, glob, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fontTools.ttLib import TTFont
FR, TX, COVER, FONTS = sys.argv[1:5]; T = json.load(open(TX)); FPS = T.get('fps', 30)
for f in ('sg700', 'sm400'):
    t = TTFont(f'{FONTS}/{f}.woff2'); t.flavor = None; t.save(f'/tmp/{f}.ttf')
F = lambda f, s: ImageFont.truetype(f'/tmp/{f}.ttf', s)
INK, RED, PAPER, GREY = (26, 27, 32), (226, 64, 28), (242, 241, 236), (156, 153, 143)
def wrap(d, txt, font, width):
    out, cur = [], ''
    for w in txt.split():
        c = (cur + ' ' + w).strip()
        if d.textlength(c, font=font) <= width: cur = c
        else: out.append(cur); cur = w
    return out + [cur]
def fade(h, top=True, k=1.9):
    g = Image.new('L', (1, h))
    for y in range(h): g.putpixel((0, y), int(255 * min(1, max(0, ((h - y) if top else y) / h * k))))
    return g.resize((1080, h))
TOP, BOT = fade(520), fade(420, False); os.makedirs('/tmp/frames', exist_ok=True)
Y0, Y1, X0, X1, YL = 1955, 2026, 90, 990, 1780
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
def contador(d, t):
    c = [x for x in T['contador'] if x[0] <= t < x[1]]
    if not c: return
    t0, t1, a, b, pre, lab = c[-1]; u = min(1, (t - t0) / 0.9); u = 1 - (1 - u) ** 3; n = int(round(a + (b - a) * u))
    d.text((64, 1500), f'{pre}{n}', font=F('sg700', 150), fill=RED, stroke_width=8, stroke_fill=PAPER); d.text((70, 1662), lab, font=F('sm400', 30), fill=INK, stroke_width=6, stroke_fill=PAPER)
files = sorted(glob.glob(f'{FR}/*.png'))
for i, p in enumerate(files):
    t = i / FPS; im = Image.open(p).convert('RGB'); im.paste(Image.new('RGB', (1080, 520), PAPER), (0, 0), TOP); im.paste(Image.new('RGB', (1080, 420), PAPER), (0, 1500), BOT); d = ImageDraw.Draw(im)
    cur = [x for x in T['textos'] if x[0] <= t < x[1]]
    if cur:
        _, _, kick, title = cur[-1]; d.text((64, 150), kick, font=F('sm400', 27), fill=RED)
        for k, ln in enumerate(wrap(d, title, F('sg700', 74), 900)): d.text((62, 196 + k * 77), ln, font=F('sg700', 74), fill=INK)
    contador(d, t); linea(d, anio(t)); im.save(f'/tmp/frames/{i:05d}.jpg', quality=93)
P = T['portada']; im = Image.open(files[min(P['fotograma'], len(files) - 1)]).convert('RGB')
def halo(xy, txt, font, fill):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).text(xy, txt, font=font, fill=255)
    m = m.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(8)).point(lambda v: min(255, int(v * 1.7)))
    im.paste(Image.new('RGB', im.size, PAPER), (0, 0), m); ImageDraw.Draw(im).text(xy, txt, font=font, fill=fill)
d = ImageDraw.Draw(im); halo((48, 216), P['n'], F('sg700', 302), RED); y = 508
for ln in wrap(d, P['t'], F('sg700', 66), 640): halo((52, y), ln, F('sg700', 66), INK); y += 62
y += 38
for ln in P['m']: halo((54, y), ln, F('sm400', 23), INK); y += 37
os.makedirs(os.path.dirname(COVER), exist_ok=True); im.save(COVER, quality=92); print('ok', len(files), 'fotogramas y portada')
