# Prueba 014 (10 s): pulso marcado a 124 ppm, marimba en arpegio rápido, bombo suave y un golpe por cada oleada de casas
import numpy as np, scipy.signal as ss, wave, sys
SR = 44100; DUR = 10.0; N = int(SR * DUR); rng = np.random.default_rng(7); L = np.zeros(N); R = np.zeros(N)
def add(sig, t, pan=0.0, g=1.0):
    i = int(t * SR); j = min(N, i + len(sig)); s = sig[:j - i] * g; L[i:j] += s * (1 - pan) * 0.7071; R[i:j] += s * (1 + pan) * 0.7071
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
beat = 60 / 124; notes = [62, 69, 74, 78, 81, 78, 74, 69]
t = 0.0; k = 0
while t < 9.4:
    add(mallet(mtof(notes[k % 8] + (5 if 4.8 <= t < 7.4 else 0)), 0.5, 0.11), t, pan=0.3 if k % 2 else -0.3); t += beat / 2; k += 1
for i in range(int(9.4 / beat)): add(kick(0.32), i * beat); add(hat(0.05), i * beat + beat / 2)
for t0, ms in ((0.0, [50, 57, 62, 66]), (4.8, [55, 62, 67, 71]), (7.5, [57, 64, 69, 73])):          # colchón que cambia con cada texto, con fundidos solapados
    n = int(SR * 3.6) if t0 < 7 else int(SR * 2.6); x = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * mtof(m) * x) for m in ms) * 0.025
    env = np.minimum(1, x / 0.6) * np.minimum(1, (len(x) / SR - x) / 0.8); add(s * env, max(0, t0 - 0.2))
add(mallet(mtof(86), 1.5, 0.12), 9.35)
fade = np.ones(N); fo = int(SR * 0.6); fade[-fo:] = np.linspace(1, 0, fo); L *= fade; R *= fade; mx = max(abs(L).max(), abs(R).max()); L /= mx; R /= mx
w = wave.open(sys.argv[1], 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.stack([L, R], 1) * 0.89 * 32767).astype(np.int16).tobytes()); w.close(); print('ok')
