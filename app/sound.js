//# HVORFOR: meldingslyden er byttet fra klokketoner til marimba (Dan Joakim 25. okt). Tonene C4-D4-A4 og klangen er målt fra en
//# referansefil han sendte (grunntone 260 Hz, e-tid 0,27 s; overtone 4,01x: 0,25 / 0,05 s; 8,78x: 0,14 / 0,02 s; 3x: 0,08 / 0,02 s).
//# Lyden lages i koden (Web Audio), ingen lydfil. Referansefilen er bare målt, ikke kopiert.
//# Vibrasjonen ved dobbeltpling er kraftigere, i takt med risten. Endrer du lyden: tests/sound.js måler tonene og at ingenting klipper.
//# Se claude/beslutningslogg.md, «Lyd og dobbeltpling». (Lines starting with //# are not built into the page.)
let AC;
function ac(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state!=="running")AC.resume()}catch(e){}return AC}
document.addEventListener("pointerdown",ac);
function tone(f,at,dur,vol){const c=ac();if(!c)return;const t=c.currentTime+at;
 [[1,1],[2.76,.35]].forEach(([m,v])=>{const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=f*m;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol*v,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+.05)})}
function marimbaBus(c){ /* HVORFOR: felles utgang med kompressor, slik at lyden kan være høy uten å klippe (lave toner høres svakt på små høyttalere) */
 if(!c._mb){const g=c.createGain(),k=c.createDynamicsCompressor();g.gain.value=1;
  k.threshold.value=-14;k.knee.value=8;k.ratio.value=5;k.attack.value=.002;k.release.value=.18;
  g.connect(k);k.connect(c.destination);c._mb=g}
 return c._mb}
function marimba(f,at,vol){const c=ac();if(!c)return;const t=c.currentTime+at,bus=marimbaBus(c);
 [[1,1,.17],[4.01,.34,.04],[8.78,.16,.015],[3,.1,.015]].forEach(([m,a,tau])=>{const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=f*m;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol*a,t+.003);g.gain.setTargetAtTime(0,t+.003,tau);
  o.connect(g);g.connect(bus);o.start(t);o.stop(t+tau*8+.05)})}
function pling(v=.12,at=0){const k=260.2/261.63; /* samme lette stemming som referansen */
 [[261.63,0],[293.66,.13],[440,.26]].forEach(([f,d])=>marimba(f*k,at+d,v*4.4))}
/* HVORFOR: dobbeltpling skal låte som en ringelyd (gammel telefonklokke), ikke som meldingsmelodien (Dan Joakim 25. okt).
   To klokker som slås vekslende ~24 ganger i sekundet, to rundt à ca. 1 s («brrring-brrring»). Klokkeklang = uharmoniske overtoner. */
function ringing(v){const c=ac();if(!c)return;const bus=marimbaBus(c),t0=c.currentTime+.02;
 const bells=[[1480,0],[1870,1]],parts=[[1,1,.07],[2.32,.55,.05],[3.86,.32,.035],[5.43,.16,.025]],step=1/24;
 [[0,1.0],[1.35,1.0]].forEach(([s,len])=>{
  bells.forEach(([f,par])=>parts.forEach(([m,a,tau])=>{const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=f*m;g.gain.value=0;
   for(let i=par;i*step<len;i+=2){const t=t0+s+i*step;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*a,t+.002);g.gain.setTargetAtTime(0,t+.002,tau)}
   o.connect(g);g.connect(bus);o.start(t0+s);o.stop(t0+s+len+.4)}))})}
function dobbelt(){ringing(.34)}
function stor(){const a=$("#app");a.classList.remove("dp");void a.offsetWidth;a.classList.add("dp");dobbelt();try{if(navigator.vibrate)navigator.vibrate([200,60,200,60,200,60,200,60,300])}catch(e){}}
