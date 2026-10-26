import numpy as np, wave
SR=44100; DUR=57.5; N=int(SR*DUR)
BPM=84; beat=60/BPM; bar=4*beat
rng=np.random.default_rng(31)
def env_ad(n, a, d):
    t=np.arange(n)/SR; e=np.minimum(1, t/max(a,1e-4))*np.exp(-np.maximum(0,t-a)/d); return e
def pluck(f, dur, bright=1.0):
    n=int(SR*dur); t=np.arange(n)/SR; y=np.zeros(n)
    for k in range(1,9):
        amp=(1/k**1.15)*(1 if k%2 else 0.7)*bright**(k-1)
        y+=amp*np.sin(2*np.pi*f*k*t*(1+0.0004*k*k))*np.exp(-t*(1.6+0.9*k))
    y*=np.minimum(1,t/0.003); return y
def pad(f, dur, att=1.2, rel=1.2):
    n=int(SR*dur); t=np.arange(n)/SR; y=np.zeros(n)
    for det in (-0.12,0.0,0.11):
        ff=f*2**(det/12)
        for k,a in ((1,1),(2,0.35),(3,0.18),(4,0.08)): y+=a*np.sin(2*np.pi*ff*k*t+rng.uniform(0,6))
    e=np.minimum(1,t/att)*np.minimum(1,(dur-t)/rel); return y*np.clip(e,0,1)/3
def bass(f, dur):
    n=int(SR*dur); t=np.arange(n)/SR
    y=np.sin(2*np.pi*f*t)+0.25*np.sin(2*np.pi*2*f*t)+0.08*np.sin(2*np.pi*3*f*t)
    return y*np.minimum(1,t/0.02)*np.exp(-t*0.9)
def m2f(m): return 440*2**((m-69)/12)
# progression (D minor, baroque-ish): Dm Bb F C Gm Dm A A7
prog=[[57,62,65],[58,62,65],[57,60,65],[55,60,64],[55,58,62],[57,62,65],[57,61,64],[55,61,64]]
roots=[38,34,41,36,43,38,33,33]
L=lambda: np.zeros(N)
plk,pd,bs,mel=L(),L(),L(),L()
def add(buf, y, t0, g=1.0):
    i=int(t0*SR); j=min(N,i+len(y))
    if i<N: buf[i:j]+=g*y[:j-i]
nb=int(DUR/bar)+1
for b in range(nb):
    t0=b*bar; ch=prog[b%8]; r=roots[b%8]
    add(pd, sum(pad(m2f(m),bar+1.2) for m in ch), t0, 0.5)
    add(bs, bass(m2f(r),bar*0.95), t0, 0.9); add(bs, bass(m2f(r+12 if b%2 else r+7),beat*1.8), t0+2*beat, 0.45)
    arp=[ch[0],ch[1],ch[2],ch[1]+12 if ch[1]+12<84 else ch[1], ch[2],ch[1],ch[0]+12,ch[2]]
    for k in range(8):
        add(plk, pluck(m2f(arp[k]+12), 1.6, 0.85), t0+k*beat/2, 0.42 if k%2==0 else 0.30)
    # simple melody line on top (enters in travel/map sections)
    mel_notes=[ch[2]+12, ch[1]+12, ch[0]+12+ (2 if b%2 else 0)]
    for k,mn in enumerate(mel_notes):
        add(mel, pluck(m2f(mn),2.2,0.6)*0.9, t0+k*beat*1.33, 0.32)
t=np.arange(N)/SR
def ramp(t,a,b): return np.clip((t-a)/(b-a),0,1)
def win(t,a,b,f=1.5): return np.minimum(ramp(t,a,a+f),1-ramp(t,b-f,b))
g_pad=0.55+0.25*win(t,12,50,3)
g_plk=ramp(t,0.2,1.5)*(1-0.5*win(t,10,17,2))*(1-0.7*ramp(t,54,58))
g_bs=ramp(t,3.5,5.5)*(1-ramp(t,53,57))
g_mel=win(t,20,52,2.5)
mix=pd*g_pad+plk*g_plk+bs*g_bs*0.8+mel*g_mel
# soft room: a few short delays
rev=np.zeros_like(mix)
for d,g in ((0.031,0.35),(0.057,0.28),(0.089,0.22),(0.143,0.16),(0.211,0.11),(0.317,0.07)):
    k=int(d*SR); rev[k:]+=g*mix[:-k]
mix=mix+0.6*rev
mix*=np.minimum(1,t/0.8)*np.minimum(1,(DUR-t)/1.8)
mix/=np.max(np.abs(mix))*1.05
st=np.stack([mix, np.roll(mix,int(0.006*SR))],1)
w=wave.open('/root/teatro/audio/raw7b.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((st*32767).astype(np.int16).tobytes()); w.close(); print('ok')
