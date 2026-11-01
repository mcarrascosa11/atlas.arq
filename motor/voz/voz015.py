# 015 · voz de Lydia sobre el vídeo de Sarnago. El audio se genera en la web de ElevenLabs y aquí se baja del historial
# (secreto ELEVENLABS_API_KEY), se separa por los silencios, cada frase entra en su escena y se mezcla con la música, bajándola mientras habla.
import os, sys, re, subprocess, wave, numpy as np, requests
def sh(*a): subprocess.run(list(a), check=True)
if os.environ.get('GITHUB_ACTIONS'): sh('sudo', 'apt-get', 'install', '-y', '-qq', 'ffmpeg'); sh(sys.executable, '-m', 'pip', 'install', '-q', 'scipy')
O = 'videos/voz015'; os.makedirs(O, exist_ok=True); LOG = open(f'{O}/registro.txt', 'w')
def log(*a): LOG.write(' '.join(str(x) for x in a) + '\n'); LOG.flush(); print(*a)
K = os.environ.get('ELEVENLABS_API_KEY', ''); H = {'xi-api-key': K}
r = requests.get('https://api.elevenlabs.io/v1/history', headers=H, params={'page_size': 100}, timeout=60); log('historial', r.status_code)
if r.status_code != 200: log(r.text[:300]); raise SystemExit(0)
it = sorted([h for h in r.json().get('history', []) if (h.get('text') or '').strip().startswith('¿Cómo se recupera un pueblo')], key=lambda h: -h.get('date_unix', 0))
if not it: log('no está la voz en el historial'); raise SystemExit(0)
a = requests.get(f"https://api.elevenlabs.io/v1/history/{it[0]['history_item_id']}/audio", headers=H, timeout=120); open(f'{O}/voz.mp3', 'wb').write(a.content); log('audio', a.status_code, len(a.content), it[0].get('voice_name'))
F = f'{O}/voz.mp3'; out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', F, '-af', 'silencedetect=noise=-38dB:d=0.55', '-f', 'null', '-'], capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
tot = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', F], capture_output=True, text=True).stdout)
seg, p = [], 0.0
for s0, e0 in zip(st, en):
    if s0 < 0.2: p = e0; continue
    seg.append((max(0, p - 0.03), s0 + 0.06)); p = e0
if tot - p > 0.3: seg.append((p - 0.03, tot))
BEATS = [0, 3.0, 6.5, 10.0, 13.0, 16.5, 20.0, 23.0, 26.0, 30.0, 33.0, 36.0]; log('frases', len(seg), 'esperadas', len(BEATS) - 1)
if len(seg) != len(BEATS) - 1: raise SystemExit(0)
SR = 44100; DUR = 36.0; plan, prev = [], 0.0
for i, (s0, s1) in enumerate(seg):
    d = s1 - s0; t0 = max(BEATS[i] + 0.1, prev + 0.12); lim = (DUR - 0.05 if i == len(seg) - 1 else BEATS[i + 1] + 0.35) - t0
    tempo = min(1.15, max(1.0, d / lim)); plan.append([s0, s1, t0, tempo]); prev = t0 + d / tempo; log(f'  frase {i + 1}: {d:.2f} s -> entra {t0:.2f}, tempo {tempo:.2f}, acaba {prev:.2f}')
voz = np.zeros(int(SR * (DUR + 1)), np.float32); spans = []
for k, (s0, s1, t0, tempo) in enumerate(plan):
    sh('ffmpeg', '-y', '-v', 'error', '-ss', f'{s0:.3f}', '-to', f'{s1:.3f}', '-i', F, '-af', f'atempo={tempo:.3f},afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse', '-ar', str(SR), '-ac', '1', f'/tmp/s{k}.wav')
    w = wave.open(f'/tmp/s{k}.wav'); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    a0 = int(t0 * SR); b0 = min(len(voz), a0 + len(x)); voz[a0:b0] += x[:b0 - a0]; spans.append((t0, b0 / SR))
voz = voz[:int(SR * DUR)]; voz /= max(1e-6, np.abs(voz).max()); voz *= 0.9
sh('python3', 'motor/blender/music015.py', '/tmp/m15.wav')
w = wave.open('/tmp/m15.wav'); M = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float32) / 32768
vz = np.pad(voz, (0, max(0, len(M) - len(voz))))[:len(M)]; t = np.arange(len(M)) / SR; g = np.ones(len(M), np.float32)
for a1, b1 in spans: g = np.minimum(g, np.clip(1 - 0.62 * np.minimum(np.clip((t - a1 + 0.15) / 0.15, 0, 1), np.clip((b1 + 0.25 - t) / 0.25, 0, 1)), 0.38, 1))
mix = M * g[:, None] * 0.8 + vz[:, None]; mix /= max(1e-6, np.abs(mix).max()); mix *= 0.89
w2 = wave.open('/tmp/mix15.wav', 'wb'); w2.setnchannels(2); w2.setsampwidth(2); w2.setframerate(SR); w2.writeframes((mix * 32767).astype(np.int16).tobytes()); w2.close()
sh('ffmpeg', '-y', '-v', 'error', '-i', 'videos/015_sarnago.mp4', '-i', '/tmp/mix15.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-shortest', '-movflags', '+faststart', f'{O}/015_sarnago_voz.mp4')
log('ok 015_sarnago_voz.mp4')
