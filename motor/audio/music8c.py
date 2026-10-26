# Original bossa-style cue for 008 (SESC Pompéia): nylon-like plucked guitar (Karplus-Strong), soft bass, shaker, rim, vibraphone-like melody.
import numpy as np, scipy.signal as ss, wave
SR = 44100; DUR = 56.0; BPM = 124; BEAT = 60 / BPM; E8 = BEAT / 2
N = int(SR * DUR); BUS = {k: [np.zeros(N), np.zeros(N)] for k in ('gtr', 'bass', 'perc', 'mel')}
rng = np.random.default_rng(58)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def pluck(freq, dur, amp, bright=0.5):
    n = int(SR * dur); P = max(2, int(SR / freq)); d = 0.996
    exc = rng.uniform(-1, 1, P); exc = ss.lfilter([bright, 1 - bright], [1], exc)       # softer attack (nylon)
    x = np.zeros(n); x[:P] = exc
    a = np.zeros(P + 2); a[0] = 1; a[P] = -0.5 * d; a[P + 1] = -0.5 * d
    y = ss.lfilter([1], a, x)
    env = np.minimum(1, np.linspace(0, n / SR, n) / 0.004)
    return amp * y * env
def add(sig, t, pan=0.0, bus='gtr'):
    i = int(t * SR); j = min(N, i + len(sig)); s = sig[:j - i]; Lb, Rb = BUS[bus]
    Lb[i:j] += s * (1 - pan) * 0.5 ** 0.5; Rb[i:j] += s * (1 + pan) * 0.5 ** 0.5
def softbass(freq, dur, amp):
    n = int(SR * dur); x = np.arange(n) / SR
    env = np.minimum(1, x / 0.012) * np.exp(-x / 0.55)
    return amp * env * (np.sin(2 * np.pi * freq * x) + 0.18 * np.sin(2 * np.pi * 2 * freq * x))
# harmony: two-bar cells; maj7 / m7 / dominant voicings (original progression)
prog = [([62, 66, 69, 73], 50), ([59, 62, 66, 69], 47), ([64, 67, 71, 74], 52), ([61, 64, 67, 69], 45),
        ([66, 69, 73, 76], 54), ([63, 66, 69, 71], 47), ([64, 67, 71, 74], 52), ([61, 64, 67, 70], 45)]
hits = [0, 3, 6, 10, 13]          # comping in eighths over two bars (16 eighths)
bar2 = 16 * E8
t0 = 0.0; k = 0
while t0 < DUR - 0.5:
    chord, root = prog[k % len(prog)]
    for h in hits:
        t = t0 + h * E8
        if t > DUR - 1: break
        for j, m in enumerate(chord): add(pluck(mtof(m), 1.1, 0.16, 0.62), t + j * 0.012, pan=-0.25)
    if t0 > 3.8:                          # thumb bass: root / fifth on beats 1 and 3
        for q, mm in enumerate([root, root + 7, root, root + 7]):
            tb = t0 + q * 4 * E8
            if tb < DUR - 1: add(softbass(mtof(mm - 12), 1.1, 0.30), tb, pan=0.0, bus='bass')
    t0 += bar2; k += 1
# shaker (eighths, accented off-beats) and rim (clave-like) from 8 s
tt = np.arange(int(SR * 0.06)) / SR
for i in range(int(DUR / E8)):
    t = i * E8
    if t < 8.0 or t > DUR - 3.0: continue
    nz = ss.lfilter(*ss.butter(2, [3500, 8000], 'band', fs=SR), rng.normal(0, 1, len(tt))) * np.exp(-tt / 0.016) * (0.022 if i % 2 else 0.012)
    add(nz, t, pan=0.35, bus='perc')
clave = [0, 3, 6, 10, 12]
for c in range(int(DUR / bar2)):
    for h in clave:
        t = c * bar2 + h * E8
        if t < 12.0 or t > DUR - 4: continue
        rim = (np.sin(2 * np.pi * 820 * tt) + 0.3 * np.sin(2 * np.pi * 1640 * tt)) * np.exp(-tt / 0.01) * 0.03; add(rim, t, pan=-0.4, bus='perc')
# vibraphone-like melody in the middle section (original line over the progression)
mel = [74, 76, 78, 81, 79, 78, 76, 74, 73, 74, 76, 69, 71, 73, 74, 76, 78, 76, 74, 71, 73, 74, 69, 66]
for i, m in enumerate(mel):
    t = 20.0 + i * 3 * E8
    if t > 46: break
    n = int(SR * 1.3); x = np.arange(n) / SR
    tone = (np.sin(2 * np.pi * mtof(m) * x) + 0.08 * np.sin(2 * np.pi * mtof(m) * 3 * x) * np.exp(-x / 0.06)) * np.exp(-x / 0.6) * (1 + 0.18 * np.sin(2 * np.pi * 5.0 * x))
    add(tone * 0.07, t, pan=0.3, bus='mel')
# master: fades, gentle saturation
lp = lambda x, f: ss.sosfilt(ss.butter(2, f, 'low', fs=SR, output='sos'), x); hp = lambda x, f: ss.sosfilt(ss.butter(2, f, 'high', fs=SR, output='sos'), x)
G = {'gtr': 1.0, 'bass': 0.8, 'perc': 0.7, 'mel': 0.8}
L = np.zeros(N); R = np.zeros(N)
for k, (a, b) in BUS.items():
    if k == 'gtr': a, b = lp(hp(a, 110), 5200), lp(hp(b, 110), 5200)
    if k == 'bass': a, b = lp(a, 380), lp(b, 380)
    if k == 'perc': a, b = lp(a, 9000), lp(b, 9000)
    if k == 'mel': a, b = lp(a, 3000), lp(b, 3000)
    L += G[k] * a; R += G[k] * b
fade = np.ones(N); fi = int(SR * 0.6); fo = int(SR * 3.5); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
L *= fade; R *= fade; mx = max(np.abs(L).max(), np.abs(R).max()); L /= mx; R /= mx
st = (np.stack([L, R], 1) * 0.89 * 32767).astype(np.int16)
w = wave.open('/root/teatro/audio/raw8c.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close(); print('ok')
