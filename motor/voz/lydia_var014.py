# 014 · variantes con la voz de Lydia para Reels de prueba. Los audios se generan en la web de ElevenLabs y aquí se bajan del historial
# (clave en el secreto ELEVENLABS_API_KEY), se separan las frases por los silencios y se montan sobre el vídeo publicado.
import os, sys, subprocess, json, re, wave, numpy as np, requests
def sh(*a): subprocess.run(list(a), check=True)
if os.environ.get('GITHUB_ACTIONS'): sh('sudo', 'apt-get', 'install', '-y', '-qq', 'ffmpeg'); sh(sys.executable, '-m', 'pip', 'install', '-q', 'scipy', 'pillow', 'fonttools', 'brotli')
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
O = 'videos/pruebas014/lydia'; os.makedirs(O, exist_ok=True); LOG = open(f'{O}/registro.txt', 'w')
def log(*a): LOG.write(' '.join(str(x) for x in a) + '\n'); LOG.flush(); print(*a)
K = os.environ.get('ELEVENLABS_API_KEY', ''); H = {'xi-api-key': K}; LYDIA = 'SDVJaMLoJa7wc3s2sn7d'
r = requests.get('https://api.elevenlabs.io/v1/history', headers=H, params={'page_size': 100}, timeout=60); log('historial', r.status_code)
if r.status_code != 200: log(r.text[:400]); raise SystemExit(0)
items = r.json().get('history', [])
def busca(inicio):
    c = [it for it in items if (it.get('text') or '').strip().startswith(inicio)]
    c.sort(key=lambda it: -it.get('date_unix', 0)); return c[0] if c else None
IA, IB = busca('¿La solución a la vivienda'), busca('¿Construir pueblos enteros?')
log('encontrados', bool(IA), bool(IB), [(it.get('voice_name'), it.get('date_unix')) for it in (IA, IB) if it])
if not (IA and IB): raise SystemExit(0)
for nm, it in (('A', IA), ('B', IB)):
    a = requests.get(f"https://api.elevenlabs.io/v1/history/{it['history_item_id']}/audio", headers=H, timeout=120); log('audio', nm, a.status_code, len(a.content))
    open(f'{O}/voz_{nm}.mp3', 'wb').write(a.content)
def silencios(f):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'silencedetect=noise=-38dB:d=0.55', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    tot = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
    segs, a = [], 0.0
    for s, e in zip(st, en):
        if s < 0.2: a = e; continue
        segs.append((max(0, a - 0.03), s + 0.06)); a = e
    if tot - a > 0.3: segs.append((a - 0.03, tot))
    return segs
SA, SB = silencios(f'{O}/voz_A.mp3'), silencios(f'{O}/voz_B.mp3'); log('frases', len(SA), len(SB))
if len(SA) != 10 or len(SB) != 4: log('no cuadran las frases'); raise SystemExit(0)
A = [(f'{O}/voz_A.mp3', s) for s in SA]; C1 = (f'{O}/voz_B.mp3', SB[0]); B = [(f'{O}/voz_B.mp3', s) for s in SB[1:]]
BEATS = [0, 2.6, 5.6, 8.8, 12.0, 15.0, 18.0, 21.0, 24.5, 27.5, 30.0]; SR = 44100
sh('python3', 'motor/blender/music014.py', '/tmp/m14.wav')
w = wave.open('/tmp/m14.wav'); M = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float32) / 32768
def pista(lines, out):
    plan, prev = [], 0.0
    for i, (f, (s0, s1)) in enumerate(lines):
        d = s1 - s0; st = max(BEATS[i] + 0.1, prev + 0.12); lim = (29.95 if i == 9 else BEATS[i + 1] + 0.35) - st
        tempo = min(1.15, max(1.0, d / lim)); plan.append([f, s0, s1, st, tempo]); prev = st + d / tempo
    if prev > 29.95:
        f, s0, s1, st, _ = plan[8]; plan[8][4] = 1.15; e9 = st + (s1 - s0) / 1.15
        f, s0, s1, st, _ = plan[9]; plan[9][3] = max(BEATS[9] + 0.1, e9 + 0.1); plan[9][4] = min(1.18, max(1.0, (s1 - s0) / (29.95 - plan[9][3])))
    voz = np.zeros(int(SR * 30.5), np.float32); spans = []
    for k, (f, s0, s1, st, tempo) in enumerate(plan):
        sh('ffmpeg', '-y', '-v', 'error', '-ss', f'{s0:.3f}', '-to', f'{s1:.3f}', '-i', f, '-af', f'atempo={tempo:.3f},afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse', '-ar', str(SR), '-ac', '1', f'/tmp/s{k}.wav')
        ww = wave.open(f'/tmp/s{k}.wav'); x = np.frombuffer(ww.readframes(ww.getnframes()), np.int16).astype(np.float32) / 32768
        a0 = int(st * SR); b0 = min(len(voz), a0 + len(x)); voz[a0:b0] += x[:b0 - a0]; spans.append((st, b0 / SR))
    voz = voz[:int(SR * 30)]; voz /= max(1e-6, np.abs(voz).max()); voz *= 0.9
    vz = np.pad(voz, (0, max(0, len(M) - len(voz))))[:len(M)]; t = np.arange(len(M)) / SR; g = np.ones(len(M), np.float32)
    for a, b in spans: g = np.minimum(g, np.clip(1 - 0.62 * np.minimum(np.clip((t - a + 0.15) / 0.15, 0, 1), np.clip((b + 0.25 - t) / 0.25, 0, 1)), 0.38, 1))
    mix = M * g[:, None] * 0.8 + vz[:, None]; mix /= max(1e-6, np.abs(mix).max()); mix *= 0.89
    w2 = wave.open(out, 'wb'); w2.setnchannels(2); w2.setsampwidth(2); w2.setframerate(SR); w2.writeframes((mix * 32767).astype(np.int16).tobytes()); w2.close()
for f in ('sg700', 'sm400'):
    tt = TTFont(f'motor/web/fonts/{f}.woff2'); tt.flavor = None; tt.save(f'/tmp/{f}.ttf')
SG, SM = ImageFont.truetype('/tmp/sg700.ttf', 74), ImageFont.truetype('/tmp/sm400.ttf', 27)
KICK = ['014 · VEGAVIANA, CÁCERES', '014 · PUEBLOS DE COLONIZACIÓN', '014 · 1939 – 1971', '014 · 1950 – 1975', '014 · FERNÁNDEZ DEL AMO, 1954', '014 · LAS CASAS', '014 · EL LOTE', '014 · 1940', '014 · 1959 – 1975', '014 · VEGAVIANA, CÁCERES']
def wrap(d, txt):
    out, cur = [], ''
    for wd in txt.split():
        c = (cur + ' ' + wd).strip()
        if d.textlength(c, font=SG) <= 900: cur = c
        else: out.append(cur); cur = wd
    return out + [cur]
def parche(kick, title, path):
    im = Image.new('RGBA', (1080, 600), (0, 0, 0, 0)); px = im.load()
    for y in range(600):
        a = 255 if y < 450 else max(0, int(255 * (1 - (y - 450) / 140)))
        for x in range(1080): px[x, y] = (242, 241, 236, a)
    d = ImageDraw.Draw(im); d.text((64, 150), kick, font=SM, fill=(226, 64, 28))
    if title:
        for k, ln in enumerate(wrap(d, title)): d.text((62, 196 + k * 77), ln, font=SG, fill=(26, 27, 32))
    im.save(path)
SRC = 'videos/014_vegaviana.mp4'
def video(parches, audio, out):
    ins = ['-i', SRC] + sum([['-i', p] for p, _, _ in parches], []) + ['-i', audio]
    fc, last = ['[0:v]format=gbrp[b]'], 'b'
    for k, (p, a, b) in enumerate(parches): fc.append(f"[{last}][{k + 1}:v]overlay=0:0:format=gbrp:enable='between(t,{a},{b - 0.001})'[v{k}]"); last = f'v{k}'
    fc.append(f'[{last}]format=yuv420p[vout]')
    sh(*(['ffmpeg', '-y', '-v', 'error'] + ins + ['-filter_complex', ';'.join(fc), '-map', '[vout]', '-map', f'{len(parches) + 1}:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-shortest', out]))
TB = ['Casi 300 pueblos, hechos de cero.', 'Los construyó el Estado, en los años 50.', 'Para 55.000 familias.']
pista(A, '/tmp/mA.wav'); pista([C1] + A[1:], '/tmp/mC.wav'); pista(B + A[3:], '/tmp/mB.wav')
parche(KICK[0], '¿Construir pueblos enteros?', '/tmp/pc0.png'); pb = []
for i in range(3): parche(KICK[i], TB[i], f'/tmp/pb{i}.png'); pb.append((f'/tmp/pb{i}.png', BEATS[i], BEATS[i + 1]))
pn = []
for i in range(10): parche(KICK[i], '', f'/tmp/pn{i}.png'); pn.append((f'/tmp/pn{i}.png', BEATS[i], BEATS[i + 1]))
video([('/tmp/pc0.png', 0, 2.6)], '/tmp/mC.wav', f'{O}/L1_pregunta_lydia.mp4')
video([], '/tmp/mA.wav', f'{O}/L2_original_lydia.mp4')
video(pb, '/tmp/mB.wav', f'{O}/L3_gancho_lydia.mp4')
video(pn, '/tmp/mB.wav', f'{O}/L4_gancho_lydia_sin_titulos.mp4')
log('ok', sorted(f for f in os.listdir(O) if f.endswith('.mp4')))
