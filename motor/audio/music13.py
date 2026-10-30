# Original cue for 013 (Piscina das Marés, Leça da Palmeira). Calm Atlantic mood: soft marimba-like arpeggio in D major, warm pad and quiet
# filtered-noise waves. 3.6 s: the walls (wooden knocks); 8 s: plan; 14 s: section (low drone); 22 s: between walls, closed; 25.6 s: the sea appears
# (open chord); 28 s: pumped seawater (low pulses); 34 s: warm chords; 40 s: resolve.
import numpy as np, scipy.signal as ss, wave, sys
SR = 44100; DUR = 50.0; N = int(SR * DUR); rng = np.random.default_rng(13)
BUS = {k: [np.zeros(N), np.zeros(N)] for k in ('arp', 'pad', 'hit', 'tick', 'sea')}
def add(sig, t, pan=0.0, bus='arp'):
    i = int(t * SR)
    if i >= N or i < 0: return
    j = min(N, i + len(sig)); s = sig[:j - i]; L, R = BUS[bus]; L[i:j] += s * (1 - pan) * 0.7071; R[i:j] += s * (1 + pan) * 0.7071
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
def mallet(f, dur, amp):             # marimba: fundamental + 4th partial, fast decay
    n = int(SR * dur); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * x) * np.exp(-x / (dur * 0.35)) + 0.35 * np.sin(2 * np.pi * f * 3.93 * x) * np.exp(-x / (dur * 0.08))
    return amp * s * np.minimum(1, x / 0.002)
def pad(ms, dur, amp, cut=1400):
    n = int(SR * dur); x = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        for det in (-0.06, 0.0, 0.05): s += np.sin(2 * np.pi * mtof(m + det) * x + rng.random() * 6) * 0.3 + 0.08 * ss.sawtooth(2 * np.pi * mtof(m + det) * x)
    return amp * ss.sosfilt(ss.butter(2, cut, 'low', fs=SR, output='sos'), s) * np.minimum(1, x / 2.2) * np.minimum(1, (dur - x) / 2.2)
def knock(f, amp):
    n = int(SR * 0.6); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * x) * np.exp(-x / 0.12) + 0.4 * np.sin(2 * np.pi * f * 2.7 * x) * np.exp(-x / 0.05)
    nz = ss.sosfilt(ss.butter(2, [300, 2500], 'band', fs=SR, output='sos'), rng.normal(0, 1, n)) * np.exp(-x / 0.008) * 0.5
    return amp * (s + nz)
def tick(amp):
    n = int(SR * 0.025); x = np.arange(n) / SR
    return amp * ss.sosfilt(ss.butter(2, [2500, 9000], 'band', fs=SR, output='sos'), rng.normal(0, 1, n)) * np.exp(-x / 0.004)
def drone(f, dur, amp):
    n = int(SR * dur); x = np.arange(n) / SR; s = sum(np.sin(2 * np.pi * f * k * x + k) / k ** 1.4 for k in range(1, 6))
    return amp * s * np.minimum(1, x / 1.8) * np.minimum(1, (dur - x) / 1.8)
step = 0.25   # corcheas a 120 bpm
def arp(t0, t1, notes, amp=0.15, pan=0.3, dur=0.9):
    t = t0; k = 0
    while t < t1:
        add(mallet(mtof(notes[k % len(notes)]), dur, amp), t, pan=pan if k % 2 else -pan); t += step; k += 1
# olas: ruido filtrado que respira cada ~7 s, todo el vídeo
x = np.arange(N) / SR; nz = rng.normal(0, 1, N); swell = 0.55 + 0.45 * np.sin(2 * np.pi * x / 7.0 - 1.2) ** 2
sea = ss.sosfilt(ss.butter(2, [120, 1400], 'band', fs=SR, output='sos'), nz) * swell * 0.18
BUS['sea'][0] += sea; BUS['sea'][1] += np.roll(sea, int(0.013 * SR))
# 0–3.6: arpegio escaso en Re mayor
arp(0.0, 3.8, [62, 69, 74, 78, 74, 69], 0.13)
add(pad([50, 57, 62, 66], 4.4, 0.05), 0.0, bus='pad')
# 3.6–8.2: los muros, un golpe de madera grave por tramo
for i in range(10): add(knock(mtof(43 + (i % 3) * 2), 0.16), 3.9 + i * 0.27, pan=-0.5 + i * 0.1, bus='hit')
arp(3.6, 8.4, [62, 66, 69, 74, 76, 74, 69, 66], 0.14)
add(pad([50, 57, 62, 69], 5.0, 0.06), 3.4, bus='pad')
# 8.2–14: la planta, el arpegio se aclara
arp(8.4, 14.2, [62, 66, 69, 74, 78, 81, 78, 74], 0.14)
add(pad([50, 57, 62, 66, 69], 6.2, 0.06), 8.2, bus='pad')
# 14–22: la sección, dron grave y el arpegio sostenido
add(drone(mtof(38), 8.2, 0.07), 14.0, bus='pad')
arp(14.2, 22.2, [69, 74, 76, 74], 0.11, dur=1.2)
add(pad([47, 54, 59, 62, 66], 8.4, 0.06), 13.8, bus='pad')
# 22–25.6: entre muros, todo se cierra; 25.6: aparece el mar, acorde abierto
add(pad([45, 52, 57], 3.8, 0.05, 900), 22.0, bus='pad')
for k in range(6): add(mallet(mtof(57 + (k % 2) * 3), 0.6, 0.08), 22.2 + k * 0.55, bus='arp')
add(pad([50, 57, 62, 66, 69, 74], 3.0, 0.09, 2400), 25.5, bus='pad'); add(mallet(mtof(81), 2.2, 0.16), 25.6, bus='hit'); add(mallet(mtof(74), 2.2, 0.12), 25.62, bus='hit')
arp(25.8, 28.4, [74, 78, 81, 86, 81, 78], 0.12)
# 28–34: el agua, pulsos de bomba graves y arpegio
for k in range(10): add(knock(mtof(36), 0.10), 28.5 + k * 0.56, bus='hit')
arp(28.4, 34.2, [62, 66, 69, 74, 69, 66], 0.11)
add(pad([45, 52, 57, 61, 64], 6.2, 0.05), 28.2, bus='pad')
# 34–40: acordes cálidos
arp(34.2, 40.2, [62, 66, 69, 74, 69, 66, 71, 74], 0.13)
add(pad([43, 50, 55, 59, 62], 6.4, 0.07), 34.0, bus='pad')
# 40–50: resolución
arp(40.2, 47.6, [62, 69, 74, 78, 81, 78, 74, 69], 0.12)
add(pad([50, 57, 62, 66, 69, 74], 10.0, 0.08, 1700), 40.0, bus='pad')
add(mallet(mtof(74), 3.0, 0.16), 47.6, bus='hit')
lp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'low', fs=SR, output='sos'), a); hp = lambda a, f: ss.sosfilt(ss.butter(2, f, 'high', fs=SR, output='sos'), a)
G = {'arp': 1.0, 'pad': 0.85, 'hit': 0.85, 'tick': 0.7, 'sea': 0.32}
FX = {'arp': lambda a: lp(hp(a, 120), 8000), 'pad': lambda a: lp(hp(a, 80), 3800), 'hit': lambda a: lp(hp(a, 60), 6000), 'tick': lambda a: hp(a, 1800), 'sea': lambda a: a}
L = np.zeros(N); R = np.zeros(N)
for k, (a, b) in BUS.items(): L += G[k] * FX[k](a); R += G[k] * FX[k](b)
for dly, g in ((0.19, 0.22), (0.38, 0.12)):
    d = int(dly * SR); L[d:] += g * R[:-d]; R[d:] += g * L[:-d]
fade = np.ones(N); fi = int(SR * 0.05); fo = int(SR * 3.0); fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
L *= fade; R *= fade; mx = max(np.abs(L).max(), np.abs(R).max()); L /= mx; R /= mx
st = (np.stack([L, R], 1) * 0.89 * 32767).astype(np.int16)
out = sys.argv[1] if len(sys.argv) > 1 else 'raw13.wav'
w = wave.open(out, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close(); print('ok', out)
