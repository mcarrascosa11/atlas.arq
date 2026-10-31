# 014 · cinco variantes de Vegaviana para Reels de prueba: misma imagen, cambian el gancho, la voz y los títulos.
#   T1 pregunta corta + voz · T2 original + voz · T3 gancho corto · T4 gancho corto + voz · T5 gancho corto + voz, sin títulos (solo antetítulo)
#   (la referencia sin voz es el reel ya publicado: sus datos de «no seguidores»)
# La voz es sintética (Kokoro, modelo abierto, voz em_alex), generada a partir del guion: si cambia un texto, se regenera sola.
import os, sys, subprocess, json, numpy as np, wave
ROOT = sys.argv[1] if len(sys.argv) > 1 else '.'; OUT = sys.argv[2] if len(sys.argv) > 2 else f'{ROOT}/videos/pruebas014'; KOK = sys.argv[3] if len(sys.argv) > 3 else '/tmp/kok'
os.makedirs(OUT, exist_ok=True); os.makedirs(KOK, exist_ok=True)
def sh(*a): subprocess.run(list(a), check=True)
if os.environ.get('GITHUB_ACTIONS'):                                     # en GitHub: lo que necesita la voz y el montaje
    sh('sudo', 'apt-get', 'install', '-y', '-qq', 'ffmpeg', 'espeak-ng'); sh(sys.executable, '-m', 'pip', 'install', '-q', 'kokoro-onnx', 'soundfile', 'scipy', 'pillow', 'fonttools', 'brotli')
for f, u in (('kokoro_fp32.onnx', 'kokoro-v1.0.onnx'), ('voices.bin', 'voices-v1.0.bin')):
    if not os.path.exists(f'{KOK}/{f}'): sh('curl', '-sL', '-o', f'{KOK}/{f}', f'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/{u}')
import soundfile as sf
from kokoro_onnx import Kokoro
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
SRC = f'{ROOT}/videos/014_vegaviana.mp4'
BEATS = [0, 2.6, 5.6, 8.8, 12.0, 15.0, 18.0, 21.0, 24.5, 27.5, 30.0]
KICK = ['014 · VEGAVIANA, CÁCERES', '014 · PUEBLOS DE COLONIZACIÓN', '014 · 1939 – 1971', '014 · 1950 – 1975', '014 · FERNÁNDEZ DEL AMO, 1954', '014 · LAS CASAS', '014 · EL LOTE', '014 · 1940', '014 · 1959 – 1975', '014 · VEGAVIANA, CÁCERES']
TA = ['¿La solución a la vivienda es construir pueblos enteros?', 'Ya se probó en los años 50.', 'Casi 300 pueblos, para 55.000 familias.', 'Mientras, millones dejaban su pueblo.', 'Todo gira en torno a la plaza: la iglesia y el ayuntamiento.',
      'Casas encaladas, muchas con cubierta a un agua.', 'Casa, corral y cuadra. Y cinco años de tutela.', 'Las fincas de la reforma agraria vuelven a sus dueños.', 'En los 60 el plan se frena. El éxodo sigue.', '¿Es la solución construir pueblos enteros?']
TB = ['Casi 300 pueblos, hechos de cero.', 'Los construyó el Estado, en los años 50.', 'Para 55.000 familias.'] + TA[3:]
VA = ['¿La solución a la vivienda es construir pueblos enteros?', 'Ya se probó en los años cincuenta.', 'Casi trescientos pueblos, para cincuenta y cinco mil familias.', 'Mientras, millones dejaban su pueblo.', 'Todo gira en torno a la plaza: la iglesia y el ayuntamiento.',
      'Casas encaladas, muchas con cubierta a un agua.', 'Casa, corral y cuadra. Y cinco años de tutela.', 'Las fincas de la reforma agraria vuelven a sus dueños.', 'En los sesenta el plan se frena. El éxodo sigue.', '¿Es la solución construir pueblos enteros?']
VB = ['Casi trescientos pueblos, hechos de cero.', 'Los construyó el Estado, en los años cincuenta.', 'Para cincuenta y cinco mil familias.'] + VA[3:]
TC = ['¿Construir pueblos enteros?'] + TA[1:]; VC = ['¿Construir pueblos enteros?'] + VA[1:]
K = Kokoro(f'{KOK}/kokoro_fp32.onnx', f'{KOK}/voices.bin'); VOZ = 'em_alex'; SR = 24000
def linea(txt, slot):                                                  # la frase cabe en su escena: si no, se habla un poco más rápido
    for sp in (1.08, 1.15, 1.22, 1.3, 1.38):
        s, sr = K.create(txt, voice=VOZ, speed=sp, lang='es')
        if len(s) / sr <= slot - 0.25: break
    return s.astype(np.float32), sp
def pista(lines):
    v = np.zeros(int(SR * 30.0), np.float32); spans = []
    for i, txt in enumerate(lines):
        slot = BEATS[i + 1] - BEATS[i]; s, sp = linea(txt, slot); a = int((BEATS[i] + 0.1) * SR); b = min(len(v), a + len(s)); v[a:b] += s[:b - a]; spans.append((BEATS[i] + 0.1, (b) / SR, sp))
    return v / max(1e-6, np.abs(v).max()) * 0.89, spans
sh('python3', f'{ROOT}/motor/blender/music014.py', '/tmp/m14.wav')
w = wave.open('/tmp/m14.wav'); M = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float32) / 32768; MSR = w.getframerate()
def mezcla(voz, spans, out):
    from scipy.signal import resample_poly
    vz = resample_poly(voz, MSR, SR).astype(np.float32)[:len(M)]; vz = np.pad(vz, (0, len(M) - len(vz)))
    t = np.arange(len(M)) / MSR; g = np.ones(len(M), np.float32)
    for a, b, _ in spans: g = np.minimum(g, np.clip(1 - 0.62 * np.minimum(np.clip((t - a + 0.15) / 0.15, 0, 1), np.clip((b + 0.25 - t) / 0.25, 0, 1)), 0.38, 1))
    mix = M * g[:, None] * 0.8 + vz[:, None] * 1.0; mix /= max(1e-6, np.abs(mix).max()); mix *= 0.89
    w2 = wave.open(out, 'wb'); w2.setnchannels(2); w2.setsampwidth(2); w2.setframerate(MSR); w2.writeframes((mix * 32767).astype(np.int16).tobytes()); w2.close()
for f in ('sg700', 'sm400'):
    t = TTFont(f'{ROOT}/motor/web/fonts/{f}.woff2'); t.flavor = None; t.save(f'/tmp/{f}.ttf')
SG, SM = ImageFont.truetype('/tmp/sg700.ttf', 74), ImageFont.truetype('/tmp/sm400.ttf', 27)
def wrap(d, txt):
    out, cur = [], ''
    for wd in txt.split():
        c = (cur + ' ' + wd).strip()
        if d.textlength(c, font=SG) <= 900: cur = c
        else: out.append(cur); cur = wd
    return out + [cur]
def parche(kick, title, path):                                         # tapa los títulos originales con el mismo papel y escribe los nuevos
    im = Image.new('RGBA', (1080, 600), (0, 0, 0, 0)); px = im.load()
    for y in range(600):
        a = 255 if y < 450 else max(0, int(255 * (1 - (y - 450) / 140)))
        for x in range(1080): px[x, y] = (242, 241, 236, a)
    d = ImageDraw.Draw(im); d.text((64, 150), kick, font=SM, fill=(226, 64, 28))
    if title:
        for k, ln in enumerate(wrap(d, title)): d.text((62, 196 + k * 77), ln, font=SG, fill=(26, 27, 32))
    im.save(path)
def video(parches, audio, out):
    ins = ['-i', SRC] + sum([['-i', p] for p, _, _ in parches], []) + (['-i', audio] if audio else [])
    fc, last = ['[0:v]format=gbrp[b]'], 'b'                               # se compone en RGB: el papel del parche queda igual que el del vídeo
    for k, (p, a, b) in enumerate(parches):
        fc.append(f"[{last}][{k + 1}:v]overlay=0:0:format=gbrp:enable='between(t,{a},{b - 0.001})'[v{k}]"); last = f'v{k}'
    fc.append(f'[{last}]format=yuv420p[vout]')
    amap = f'{len(parches) + 1}:a' if audio else '0:a'
    cmd = ['ffmpeg', '-y', '-v', 'error'] + ins + ['-filter_complex', ';'.join(fc), '-map', '[vout]', '-map', amap, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-shortest', out]
    sh(*cmd)
va, sa = pista(VA); vb, sb = pista(VB); vc, sc_ = pista(VC); mezcla(va, sa, '/tmp/mixA.wav'); mezcla(vb, sb, '/tmp/mixB.wav'); mezcla(vc, sc_, '/tmp/mixC.wav')
pb = []
for i in range(3): parche(KICK[i], TB[i], f'/tmp/pb{i}.png'); pb.append((f'/tmp/pb{i}.png', BEATS[i], BEATS[i + 1]))
pc = [('/tmp/pc0.png', BEATS[0], BEATS[1])]; parche(KICK[0], TC[0], '/tmp/pc0.png')
pn = []
for i in range(10): parche(KICK[i], '', f'/tmp/pn{i}.png'); pn.append((f'/tmp/pn{i}.png', BEATS[i], BEATS[i + 1]))
video(pc, '/tmp/mixC.wav', f'{OUT}/T1_pregunta_voz.mp4')
video([], '/tmp/mixA.wav', f'{OUT}/T2_voz.mp4')
video(pb, None, f'{OUT}/T3_gancho.mp4')
video(pb, '/tmp/mixB.wav', f'{OUT}/T4_gancho_voz.mp4')
video(pn, '/tmp/mixB.wav', f'{OUT}/T5_solo_voz.mp4')
json.dump({'voz': VOZ, 'frases_A': [[round(a, 2), round(b, 2), sp] for a, b, sp in sa], 'frases_B': [[round(a, 2), round(b, 2), sp] for a, b, sp in sb], 'frases_C': [[round(a, 2), round(b, 2), sp] for a, b, sp in sc_]}, open(f'{OUT}/variantes.json', 'w'), indent=1)
print('ok', sorted(os.listdir(OUT)))
