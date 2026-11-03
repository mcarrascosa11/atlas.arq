# Mezcla música + voz colocada: la música baja (hasta un 62 %) mientras habla Lydia y vuelve al callar. uso: mezcla.py MUSICA.wav VOZ.wav PLAN.json SALIDA.wav
import sys, json, wave, subprocess, numpy as np
MU, VO, PL, OUT = sys.argv[1:5]; SR = 44100
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', MU, '-ar', str(SR), '-ac', '2', '-sample_fmt', 's16', '/tmp/mu16.wav'], check=True)   # la música llega en 24 bits
w = wave.open('/tmp/mu16.wav'); M = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32).reshape(-1, 2) / 32768
v = wave.open(VO); x = np.frombuffer(v.readframes(v.getnframes()), np.int16).astype(np.float32) / 32768
if v.getframerate() != SR: x = np.interp(np.arange(int(len(x) * SR / v.getframerate())) * v.getframerate() / SR, np.arange(len(x)), x).astype(np.float32)
x = np.pad(x, (0, max(0, len(M) - len(x))))[:len(M)]; t = np.arange(len(M)) / SR; g = np.ones(len(M), np.float32)
for q in json.load(open(PL)):
    a1, b1 = q['t0'], q['t1']; g = np.minimum(g, np.clip(1 - 0.62 * np.minimum(np.clip((t - a1 + 0.15) / 0.15, 0, 1), np.clip((b1 + 0.25 - t) / 0.25, 0, 1)), 0.38, 1))
mix = M * g[:, None] * 0.8 + x[:, None]; mix /= max(1e-6, np.abs(mix).max()); mix *= 0.89
o = wave.open(OUT, 'wb'); o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((mix * 32767).astype(np.int16).tobytes()); o.close(); print('mezcla ok', round(len(M) / SR, 2), 's')
