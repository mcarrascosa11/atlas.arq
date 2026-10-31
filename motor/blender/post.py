# Textos de atlas sobre los fotogramas de Blender y portada, con las mismas fuentes y posiciones que el motor web.
# uso: post.py FOTOGRAMAS_PNG TEXTOS_JSON PORTADA_JPG FUENTES   -> /tmp/frames/00000.jpg ... (lo que espera enc_ci.sh)
# TEXTOS_JSON: {"fps": 30, "textos": [[t0, t1, "ANTETÍTULO", "Título"], ...], "portada": {"fotograma": n, "n": "014", "t": "título", "m": ["línea", ...]}}
import sys, os, glob, json
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from fontTools.ttLib import TTFont
FR, TX, COVER, FONTS = sys.argv[1:5]; T = json.load(open(TX)); FPS = T.get('fps', 30)
for f in ('sg700', 'sm400'):
    t = TTFont(f'{FONTS}/{f}.woff2'); t.flavor = None; t.save(f'/tmp/{f}.ttf')
F = lambda f, s: ImageFont.truetype(f'/tmp/{f}.ttf', s)
INK, RED, PAPER = (26, 27, 32), (226, 64, 28), (242, 241, 236)
def wrap(d, txt, font, width):
    out, cur = [], ''
    for w in txt.split():
        c = (cur + ' ' + w).strip()
        if d.textlength(c, font=font) <= width: cur = c
        else: out.append(cur); cur = w
    return out + [cur]
def fade(h, k=1.9):
    g = Image.new('L', (1, h))
    for y in range(h): g.putpixel((0, y), int(255 * min(1, max(0, (h - y) / h * k))))
    return g.resize((1080, h))
TOP = fade(520); os.makedirs('/tmp/frames', exist_ok=True)
files = sorted(glob.glob(f'{FR}/*.png'))
for i, p in enumerate(files):
    t = i / FPS; im = Image.open(p).convert('RGB'); im.paste(Image.new('RGB', (1080, 520), PAPER), (0, 0), TOP); d = ImageDraw.Draw(im)
    cur = [x for x in T['textos'] if x[0] <= t < x[1]]
    if cur:
        _, _, kick, title = cur[-1]; d.text((64, 150), kick, font=F('sm400', 27), fill=RED)
        for k, ln in enumerate(wrap(d, title, F('sg700', 74), 900)): d.text((62, 196 + k * 77), ln, font=F('sg700', 74), fill=INK)
    im.save(f'/tmp/frames/{i:05d}.jpg', quality=93)
# portada: fotograma elegido, sin textos del vídeo, con el número, el título y los datos como en las portadas anteriores
P = T['portada']; im = Image.open(files[min(P['fotograma'], len(files) - 1)]).convert('RGB')
def halo(xy, txt, font, fill):                                                  # texto con un halo de papel suave, como el text-shadow de las portadas web
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).text(xy, txt, font=font, fill=255)
    m = m.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(8)).point(lambda v: min(255, int(v * 1.7)))
    im.paste(Image.new('RGB', im.size, PAPER), (0, 0), m); ImageDraw.Draw(im).text(xy, txt, font=font, fill=fill)
d = ImageDraw.Draw(im); halo((48, 216), P['n'], F('sg700', 302), RED)
y = 508
for ln in wrap(d, P['t'], F('sg700', 66), 640): halo((52, y), ln, F('sg700', 66), INK); y += 62
y += 38
for ln in P['m']: halo((54, y), ln, F('sm400', 23), INK); y += 37
os.makedirs(os.path.dirname(COVER), exist_ok=True); im.save(COVER, quality=92); print('ok', len(files), 'fotogramas y portada')
