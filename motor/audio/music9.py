# Original cue for 009 (Gimnasio Maravillas): light, playful marimba-like ostinato in a major key, soft bass and
# brushed pulse. Deliberately different from 007 (minor pads) and 008 (bossa guitar). Clean mix, no saturation.
import numpy as np, scipy.signal as ss, wave
SR = 44100; DUR = 48.0; BPM = 112; B = 60 / BPM; E = B / 2
N = int(SR * DUR); BUS = {k: [np.zeros(N), np.zeros(N)] for k in ('mar', 'bass', 'perc', 'bell')}
rng = np.random.default_rng(9)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)
def add(sig, t, pan=0.0, bus='mar'):
    i = int(t * SR); j = min(N, i + len(sig)); s = sig[:j - i]; Lb, Rb = BUS[bus]
    Lb[i:j] += s * (1 - pan) * 0.5 ** 0.5; Rb[i:j] += s * (1 + pan) * 0.5 ** 0.5
def marimba(f, dur=0.9, amp=0.2):
    n = int(SR * dur); x = np.arange(n) / SR
    return amp * (np.sin(2 * np.pi * f * x) * np.exp(-x / 0.32) + 0.35 * np.sin(2 * np.pi * 3.98 * f * x) * np.exp(-x / 0.05) + 0.12 * np.sin(2 * np.pi * 9.2 * f * x) * np.exp(-x / 0.015)) * np.minimum(1, x / 0.002)
def bass(f, dur=0.8, amp=0.3):
    n = int(SR * dur); x = np.arange(n) / SR
    return amp * np.minimum(1, x / 0.01) * np.exp(-x / 0.45) * (np.sin(2 * np.pi * f * x) + 0.12 * np.sin(2 * np.pi * 2 * f * x))
def bell(f, dur=2.4, amp=0.07):
    n = int(SR * dur); x = np.arange(n) / SR
    return amp * (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * 2.76 * f * x) * np.exp(-x / 0.4)) * np.exp(-x / 1.1) * np.minimum(1, x / 0.004)
# harmony (F major area): F, Dm, Bb, C  — one chord per bar, ostinato in eighths
prog = [(65, [65, 69, 72, 77]), (62, [62, 65, 69, 74]), (58, [58, 62, 65, 70]), (60, [60, 64, 67, 72])]
pattern = [0, 2, 1, 3, 2, 1, 3, 2]
bar = 8 * E; t = 0.0; k = 0
while t < DUR - 0.5:
    root, ch = prog[k % 4]
    for i, p in enumerate(pattern):
        tt = t + i * E
        if tt > DUR - 1.5: break
        add(marimba(mtof(ch[p] + 12), 0.9, 0.16 if i % 2 else 0.2), tt, pan=-0.2 if i % 2 else 0.2)
    if t > 3.4:
        for q, mm in enumerate([root, root, root + 7, root]):
            tb = t + q * 2 * E
            if tb < DUR - 1.5: add(bass(mtof(mm - 24), 0.7, 0.32), tb, bus='bass')
    t += bar; k += 1
# brushed pulse from 8 s: soft noise on the off-beats
tt = np.arange(int(SR * 0.08)) / SR
for i in range(int(DUR / E)):
    t0 = i * E
    if t0 < 8.0 or t0 > DUR - 3.0: continue
    nz = ss.lfilter(*ss.butter(2, [2500, 7000], 'band', fs=SR), rng.normal(0, 1, len(tt))) * np.exp(-tt / 0.03) * (0.02 if i % 2 else 0.008)
    add(nz, t0, pan=0.3, bus='perc')
# a bell line in the middle section
mel = [77, 76, 74, 72, 74, 76, 77, 81, 79, 77, 76, 74]
for i, m in enumerate(mel):
    t0 = 18.0 + i * 4 * E
    if t0 < 44: add(bell(mtof(m)), t0, pan=0.25, bus='bell')
lp = lambda x, f: ss.sosfilt(ss.butter(2, f, 'low', fs=SR, output='sos'), x); hp = lambda x, f: ss.sosfilt(ss.butter(2, f, 'high', fs=SR, output='sos'), x)
Gn = {'mar': 1.0, 'bass': 0.8, 'perc': 0.7, 'bell': 0.8}; L = np.zeros(N); R = np.zeros(N)
for k2, (a, b) in BUS.items():
    if k2 == 'mar': a, b = lp(hp(a, 150), 6500), lp(hp(b, 150), 6500)
    if k2 == 'bass': a, b = lp(a, 400), lp(b, 400)
    if k2 == 'perc': a, b = lp(a, 9000), lp(b, 9000)
    if k2 == 'bell': a, b = lp(a, 5000), lp(b, 5000)
    L += Gn[k2] * a; R += Gn[k2] * b
fade = np.ones(N); fi = int(SR * 0.5); fo = int(SR * 3.0); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
L *= fade; R *= fade; mx = max(np.abs(L).max(), np.abs(R).max()); L /= mx; R /= mx
st = (np.stack([L, R], 1) * 0.89 * 32767).astype(np.int16)
w = wave.open('/root/teatro/audio/raw9.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close(); print('ok')
