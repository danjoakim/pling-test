//# The sounds themselves live in src/sound.ts (bundled as PrekSound): the marimba message sound and the ringing double ping.
//# This file keeps what needs the page: the shared AudioContext `AC` (tests/sound.js swaps it for an offline one), starting it on
//# the first touch, the old function names, and stor() which shakes the window. The old unused tone() (bell chime) was dropped.
//# The reasons behind the sounds are in src/sound.ts and claude/beslutningslogg.md, «Lyd og dobbeltpling». (Lines starting with //# are not built into the page.)
let AC;
function ac(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state!=="running")AC.resume()}catch(e){}return AC}
document.addEventListener("pointerdown",ac);
function pling(v,at){const c=ac();if(c)PrekSound.pling(c,v,at)}
function dobbelt(){const c=ac();if(c)PrekSound.dobbelt(c)}
function stor(){const a=$("#app");a.classList.remove("dp");void a.offsetWidth;a.classList.add("dp");dobbelt();try{if(navigator.vibrate)navigator.vibrate([200,60,200,60,200,60,200,60,300])}catch(e){}}
