//# The sounds themselves live in src/sound.ts (bundled as PrekSound): the marimba message sound and the ringing double ping.
//# This file keeps what needs the page: the shared AudioContext `AC` (tests/sound.js swaps it for an offline one), starting it on
//# the first touch, the old function names, and stor() which shakes the window. The old unused tone() (bell chime) was dropped.
//# The reasons behind the sounds are in src/sound.ts and claude/beslutningslogg.md, «Lyd og dobbeltpling». (Lines starting with //# are not built into the page.)
let AC;
function ac(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state!=="running")AC.resume()}catch(e){}return AC}
document.addEventListener("pointerdown",ac);
/* Lyd på/av for hele appen (Meg > Lyd). Lagres bare på enheten. */
function soundOn(){try{return localStorage.getItem("prek_sound")!=="off"}catch(e){return true}}
function setSound(on){try{localStorage.setItem("prek_sound",on?"on":"off")}catch(e){}}
/* HVORFOR (20. nov): på iPhone står lydmotoren på pause etter en tid i bakgrunnen. En lyd som settes i kø da, spilles først når man trykker på skjermen, ofte minutter etter at meldingen kom
   (Dan: «plutselig kommer en lyd når jeg går et annet sted i appen»). Nå: vekk motoren; er den ikke våken innen 0,5 s, spilles ingenting senere. */
const acLive=c=>c.state==="running"||(typeof OfflineAudioContext!=="undefined"&&c instanceof OfflineAudioContext);
async function acReady(){const c=ac();if(!c)return null;if(acLive(c))return c;try{await Promise.race([c.resume(),new Promise(r=>setTimeout(r,500))])}catch(e){}return acLive(c)?c:null}
function wakeAc(){try{const c=ac();if(c&&!acLive(c))c.resume()}catch(e){}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)wakeAc()});window.addEventListener("pageshow",wakeAc);
function playNow(fn){const c=ac();if(!c)return;if(acLive(c)){fn(c);return}acReady().then(r=>{if(r)fn(r)})}
function pling(v,at){if(!soundOn())return;playNow(c=>PrekSound.pling(c,v,at))}
function dobbelt(){if(!soundOn())return;playNow(c=>PrekSound.dobbelt(c))}
function stor(){const a=$("#app");a.classList.remove("dp");void a.offsetWidth;a.classList.add("dp");dobbelt();try{if(navigator.vibrate)navigator.vibrate([200,60,200,60,200,60,200,60,300])}catch(e){}}
