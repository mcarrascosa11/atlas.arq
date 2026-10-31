# 014 · Vegaviana (30 s): pulso a 124 ppm con marimba en arpegio, bombo suave y colchones que cambian con cada texto (fundidos solapados).
# Tramo de tensión (1940 y el éxodo) en menor, y vuelta al acorde del principio para cerrar.
import numpy as np, scipy.signal as ss, wave, sys
SR = 44100; DUR = 30.0; N = int(SR * DUR); rng = np.random.default_rng(14); L = np.zeros(N); R = np.zeros(N)
def add(sig, t, pan=0.0, g=1.0):
    i = int(t * SR)
    if i >= N: return
    j = min(N, i + len(sig)); s = sig[:j - i] * g; L[i:j] += s * (1 - pan) * 0.7071; R[i:j] += s * (1 + pan) * 0.7071
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def mallet(f, dur, amp):
    n = int(SR * dur); x = np.arange(n) / SR
    return amp * (np.sin(2 * np.pi * f * x) * np.exp(-x / (dur * 0.3)) + 0.3 * np.sin(2 * np.pi * f * 3.93 * x) * np.exp(-x / (dur * 0.07))) * np.minimum(1, x / 0.002)
def kick(amp):
    n = int(SR * 0.35); x = np.arange(n) / SR; f = 110 * np.exp(-x / 0.05) + 42
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.12)
def hat(amp):
    n = int(SR * 0.05); x = np.arange(n) / SR
    return amp * ss.sosfilt(ss.butter(2, 7000, 'high', fs=SR, output='sos'), rng.normal(0, 1, n)) * np.exp(-x / 0.012)
# tramos: (inicio, fin, colchón, arpegio)
SEC = [(0.0, 2.6, [50, 57, 62, 66], [62, 69, 74, 78, 81, 78, 74, 69]), (2.6, 5.6, [50, 57, 62, 66], [62, 69, 74, 78, 81, 78, 74, 69]),
       (5.6, 8.8, [55, 62, 67, 71], [67, 71, 74, 79, 83, 79, 74, 71]), (8.8, 12.0, [47, 54, 59, 62], [59, 62, 66, 71, 74, 71, 66, 62]),
       (12.0, 15.0, [55, 62, 67, 71], [67, 71, 74, 79, 83, 79, 74, 71]), (15.0, 18.0, [50, 57, 62, 66], [62, 69, 74, 78, 81, 78, 74, 69]),
       (18.0, 21.0, [45, 52, 57, 61], [57, 61, 64, 69, 73, 69, 64, 61]), (21.0, 24.5, [47, 54, 59, 62], [59, 62, 66, 71, 74, 71, 66, 62]),
       (24.5, 27.5, [43, 50, 55, 59], [55, 59, 62, 67, 71, 67, 62, 59]), (27.5, 30.0, [50, 57, 62, 66], [62, 69, 74, 78, 81, 78, 74, 69])]
beat = 60 / 124; t = 0.0; k = 0
while t < 29.2:
    sec = [s for s in SEC if s[0] <= t + 1e-6][-1]; tense = 21.0 <= t < 27.5
    add(mallet(mtof(sec[3][k % 8]), 0.5, 0.10 if not tense else 0.085), t, pan=0.3 if k % 2 else -0.3); t += beat / 2; k += 1
for i in range(int(29.2 / beat)):
    tt = i * beat; tense = 21.0 <= tt < 27.5
    add(kick(0.30 if not tense else 0.24), tt); add(hat(0.045), tt + beat / 2)
for t0, t1, ms, _ in SEC:
    a0 = max(0.0, t0 - 0.3); n = int(SR * (min(DUR, t1 + 0.6) - a0)); x = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * mtof(m) * x + rng.random() * 6) for m in ms) * 0.024
    env = np.minimum(1, x / 0.6) * np.minimum(1, (n / SR - x) / 0.8); add(ss.sosfilt(ss.butter(2, 1800, 'low', fs=SR, output='sos'), s) * env, a0)
add(mallet(mtof(86), 1.6, 0.12), 29.0)
fade = np.ones(N); fo = int(SR * 0.8); fade[-fo:] = np.linspace(1, 0, fo); L *= fade; R *= fade; mx = max(abs(L).max(), abs(R).max()); L /= mx; R /= mx
w = wave.open(sys.argv[1], 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.stack([L, R], 1) * 0.89 * 32767).astype(np.int16).tobytes()); w.close(); print('ok')
