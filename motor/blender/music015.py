# 015 · Sarnago (36 s): misma base que la 014 (marimba a 124 ppm, bombo suave y colchones que cambian con cada texto).
# Pregunta en Re mayor; el pueblo de 1955 en Re; la marcha y el vacío (6,5–16,5 s) en menor; desde las hacenderas, subida en mayor hasta El Refugio.
import numpy as np, scipy.signal as ss, wave, sys
SR = 44100; DUR = 36.0; N = int(SR * DUR); rng = np.random.default_rng(15); L = np.zeros(N); R = np.zeros(N)
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
SEC = [(0.0, 3.0, [50, 57, 62, 66], [62, 69, 74, 78, 81, 78, 74, 69]), (3.0, 6.5, [50, 57, 62, 66], [62, 69, 74, 78, 81, 78, 74, 69]),
       (6.5, 10.0, [47, 54, 59, 62], [59, 62, 66, 71, 74, 71, 66, 62]), (10.0, 13.0, [43, 50, 55, 58], [55, 58, 62, 67, 70, 67, 62, 58]),
       (13.0, 16.5, [45, 52, 57, 60], [57, 60, 64, 69, 72, 69, 64, 60]), (16.5, 20.0, [55, 62, 67, 71], [67, 71, 74, 79, 83, 79, 74, 71]),
       (20.0, 23.0, [50, 57, 62, 66], [62, 69, 74, 78, 81, 78, 74, 69]), (23.0, 26.0, [57, 64, 69, 73], [69, 73, 76, 81, 85, 81, 76, 73]),
       (26.0, 30.0, [55, 62, 67, 71], [67, 71, 74, 79, 83, 79, 74, 71]), (30.0, 33.0, [52, 59, 64, 67], [64, 67, 71, 76, 79, 76, 71, 67]),
       (33.0, 36.0, [50, 57, 62, 66], [62, 69, 74, 78, 81, 78, 74, 69])]
beat = 60 / 124; t = 0.0; k = 0
while t < 35.2:
    sec = [s for s in SEC if s[0] <= t + 1e-6][-1]; tense = 6.5 <= t < 16.5
    add(mallet(mtof(sec[3][k % 8]), 0.5, 0.10 if not tense else 0.085), t, pan=0.3 if k % 2 else -0.3); t += beat / 2; k += 1
for i in range(int(35.2 / beat)):
    tt = i * beat; tense = 6.5 <= tt < 16.5
    add(kick(0.30 if not tense else 0.24), tt); add(hat(0.045), tt + beat / 2)
for t0, t1, ms, _ in SEC:
    a0 = max(0.0, t0 - 0.3); n = int(SR * (min(DUR, t1 + 0.6) - a0)); x = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * mtof(m) * x + rng.random() * 6) for m in ms) * 0.024
    env = np.minimum(1, x / 0.6) * np.minimum(1, (n / SR - x) / 0.8); add(ss.sosfilt(ss.butter(2, 1800, 'low', fs=SR, output='sos'), s) * env, a0)
add(mallet(mtof(86), 1.6, 0.12), 35.0)
fade = np.ones(N); fo = int(SR * 0.8); fade[-fo:] = np.linspace(1, 0, fo); L *= fade; R *= fade; mx = max(abs(L).max(), abs(R).max()); L /= mx; R /= mx
w = wave.open(sys.argv[1], 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.stack([L, R], 1) * 0.89 * 32767).astype(np.int16).tobytes()); w.close(); print('ok')
