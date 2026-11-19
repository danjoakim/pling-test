# Renders the double-ping ringing sound (same recipe as src/sound.ts `ringing`) to ios/ring.wav. CI converts it to ring.caf (the push sound).
import numpy as np, wave
SR=44100; N=int(SR*3.1)
PARTS=[(1,1,.07),(2.32,.55,.05),(3.86,.32,.035),(5.43,.16,.025)]
out=np.zeros(N); step=1/24
for s in (0,1.35):
    for f,par in ((1480,0),(1870,1)):
        for m,a,tau in PARTS:
            i=par
            while i*step<1.0:
                t0=int((s+i*step)*SR); n=int(min(tau*8,.5)*SR)
                t=np.arange(n)/SR
                env=np.minimum(t/.002,1)*np.exp(-np.maximum(t-.002,0)/tau)
                seg=a*env*np.sin(2*np.pi*f*m*t)
                e=min(N,t0+n); out[t0:e]+=seg[:e-t0]
                i+=2
out*=0.77/np.abs(out).max()
fade=int(.05*SR); out[-fade:]*=np.linspace(1,0,fade)
with wave.open("ios/ring.wav","wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype("<i2").tobytes())
print("ok",N/SR,"s")
