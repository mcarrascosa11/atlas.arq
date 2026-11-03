# Voz de Lydia dentro del render: baja del historial de ElevenLabs la última locución que empieza por job.voz.inicio,
# la separa por los silencios (una frase por escena de TEXTOS), coloca cada frase en su escena y deja:
#   /tmp/voz/voz.wav   la voz ya colocada (mono, 44,1 kHz, duración del vídeo)
#   /tmp/voz/plan.json dónde empieza y acaba cada frase (los títulos entran palabra a palabra a ese ritmo)
#   motor/ci/voz_ok.txt resumen (o el motivo si no hay voz: el vídeo sale igual, solo con música)
# uso: voz_render.py JOB_JSON TEXTOS_JSON DURACION_S    (VOZ_MP3=archivo.mp3 para probar sin descargar)
import os, sys, re, json, subprocess, wave, numpy as np
J, TX, DUR = json.load(open(sys.argv[1])), json.load(open(sys.argv[2])), float(sys.argv[3]); V = J['voz']; O = '/tmp/voz'; os.makedirs(O, exist_ok=True)
EST = 'motor/ci/voz_ok.txt'
def fin(msg): open(EST, 'w').write(msg + '\n'); print(msg); raise SystemExit(0)
F = os.environ.get('VOZ_MP3') or f'{O}/voz.mp3'
if not os.environ.get('VOZ_MP3'):
    import requests
    H = {'xi-api-key': os.environ.get('ELEVENLABS_API_KEY', '')}
    r = requests.get('https://api.elevenlabs.io/v1/history', headers=H, params={'page_size': 100}, timeout=60)
    if r.status_code != 200: fin(f'SIN VOZ: historial de ElevenLabs {r.status_code} {r.text[:200]}')
    it = sorted([h for h in r.json().get('history', []) if (h.get('text') or '').strip().startswith(V['inicio'])], key=lambda h: -h.get('date_unix', 0))
    if not it: fin(f"SIN VOZ: no hay en el historial ninguna locución que empiece por «{V['inicio']}»")
    a = requests.get(f"https://api.elevenlabs.io/v1/history/{it[0]['history_item_id']}/audio", headers=H, timeout=120); open(F, 'wb').write(a.content)
out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', F, '-af', 'silencedetect=noise=-38dB:d=0.55', '-f', 'null', '-'], capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]; en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
tot = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', F], capture_output=True, text=True).stdout)
seg, p = [], 0.0
for s0, e0 in zip(st, en):
    if s0 < 0.2: p = e0; continue
    seg.append((max(0, p - 0.03), s0 + 0.06)); p = e0
if tot - p > 0.3: seg.append((p - 0.03, tot))
BEATS = [x[0] for x in TX['textos']] + [DUR]; N = len(TX['textos'])
if len(seg) != N: fin(f'SIN VOZ: la locución tiene {len(seg)} frases y el vídeo {N} escenas (revisa las pausas)')
SR = 44100; D = [s1 - s0 for s0, s1 in seg]; CAP, GAP, SPILL, LEAD = 1.2, 0.1, 0.35, 0.08
late, nxt = [0.0] * N, DUR + GAP                    # hacia atrás: hasta dónde puede llegar cada frase para que quepan las siguientes
for i in reversed(range(N)): late[i] = min(DUR - 0.05 if i == N - 1 else BEATS[i + 1] + SPILL, nxt - GAP); nxt = late[i] - D[i] / CAP
plan, prev, voz = [], -1.0, np.zeros(int(SR * (DUR + 1)), np.float32)
for i, (s0, s1) in enumerate(seg):                  # hacia delante: cada frase entra con su título y se acelera lo justo (máx. 20 %)
    t0 = max(BEATS[i] + LEAD, prev + GAP); tempo = min(CAP, max(1.0, D[i] / max(0.1, late[i] - t0)))
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{s0:.3f}', '-to', f'{s1:.3f}', '-i', F, '-af', f'atempo={tempo:.3f},afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse', '-ar', str(SR), '-ac', '1', f'{O}/s{i}.wav'], check=True)
    w = wave.open(f'{O}/s{i}.wav'); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    a0 = int(t0 * SR); b0 = min(len(voz), a0 + len(x)); voz[a0:b0] += x[:b0 - a0]; prev = b0 / SR
    plan.append({'t0': round(t0, 3), 't1': round(prev, 3), 'tempo': round(tempo, 3)})
voz = voz[:int(SR * DUR)]; voz /= max(1e-6, np.abs(voz).max()); voz *= 0.9
w = wave.open(f'{O}/voz.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((voz * 32767).astype(np.int16).tobytes()); w.close()
json.dump(plan, open(f'{O}/plan.json', 'w'))
fin('voz ok · ' + ' · '.join(f"{i + 1}: {q['t0']:.2f}-{q['t1']:.2f} s ×{q['tempo']:.2f}" for i, q in enumerate(plan)))
