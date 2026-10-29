import os
HERE=os.path.dirname(os.path.abspath(__file__))
import re
P=open(HERE+'/base/messenger.html',encoding='utf8').read().split('\n')
old=open(HERE+'/base/old-index.html',encoding='utf8').read().split('\n')
def L(a,b): return '\n'.join(P[a-1:b])
def find(prefix,start=0):
    for i in range(start,len(P)):
        if P[i].startswith(prefix): return i+1
    raise Exception(prefix)
emo=L(find('const EMO='),find('const emoji='))
assert emo.startswith('const EMO=')
# HVORFOR (26. okt, Dan Joakim): flere klassiske MSN-koder. Kodene er bare tekst; emojiene er standard Unicode (ingen MSN-grafikk, se claude/emoji.md).
# Kildeliste: github.com/Crissov/unicode-proposals/issues/256. Eksisterende koder beholdes uendret. Små/store bokstaver er likt. Koder som ofte står i vanlig tekst
# eller som listemarkører, som (c) (i) (o) (p) (s) (x), er med vilje utelatt ((a) fantes fra før og beholdes). Koder som slutter på bokstav (:D, :s) gjelder bare når bokstav/tall ikke følger rett etter («Note:Done» blir ikke endret). Omgjøringen skjer bare utenfor lenker (linkify).
emo=emo.split('\n')[0]+"""
const EMO2={":-D":"😃",":-P":"😛",":-(":"🙁",";-)":"😉",":-O":"😮",":-@":"😠",":@":"😠",":-#":"🤐",":-|":"😐",":|":"😐",":-$":"😳",":$":"😳",":-S":"😕",":S":"😕",":-*":"😘",":*":"😘",":-]":"😍",":]":"😍",":-[":"😈","*-)":"🤔","+o(":"🤢","|-)":"😴","8-|":"🤓","8o|":"😬",":8)":"👽",":}":"👸","<3":"❤️","(@)":"🐱","(&)":"🐶","(*)":"⭐","(#)":"☀️","(^)":"🎂","(||)":"🍜","(~)":"🎬","('.')":"🐰",
"(b)":"🍺","(d)":"🍸","(f)":"🌹","(g)":"🎁","(t)":"📞","(R)":"🌈","(w)":"🥀",
"(brb)":"⏳","(h)":"😎",":L":"🤣","(lol)":"😂","(rotfl)":"🤣","(boo)":"👻","(ap)":"✈️","(au)":"🚗","(bah)":"🐑","(bus)":"🚌","(co)":"💻","(ip)":"🏝️","(li)":"⚡","(mo)":"💰","(mp)":"📱","(nah)":"🐐","(nnh)":"🐐","(pi)":"🍕","(pl)":"🍽️","(pu)":"☝️","(sn)":"🐌","(so)":"⚽","(st)":"⛈️","(tu)":"🐢","(um)":"☂️","(wo)":"💼","(xo)":"😘","(yn)":"🤞","(h5)":"🙌","(xx)":"🎮"};
for(const k in EMO2)if(!(k in EMO))EMO[k]=EMO2[k];
const EMO_LC=new Map(Object.keys(EMO).map(k=>[k.toLowerCase(),EMO[k]]));
const EMO_RE=new RegExp(Object.keys(EMO).sort((a,b)=>b.length-a.length).map(k=>k.replace(/[^a-z0-9]/gi,c=>String.fromCharCode(92)+c)+(/[a-z0-9]$/i.test(k)?"(?![a-z0-9])":"")).join("|"),"gi");
/* Vanlige internett-smileys som ikke var i MSN (26. okt, Dan Joakim: «xD»). Skiller mellom store og små bokstaver, og må stå alene (ikke midt i et ord). Ingen lookbehind (eldre iPhone). */
const EMO_CS=new Map([["xD","😆"],["XD","😆"],["o_O","😳"],["O_o","😳"],["T_T","😭"],["^^","😊"],["-_-","😑"],[">:(","😠"]]);
const EMO_CS_RE=new RegExp("(^|[^A-Za-z0-9])(xD|XD|o_O|O_o|T_T)(?![A-Za-z0-9])|()("+String.fromCharCode(92)+"^"+String.fromCharCode(92)+"^|-_-|>:"+String.fromCharCode(92)+"()","g");
const emoji=t=>t.replace(EMO_CS_RE,(m,a,b,c,d)=>(b?a:"")+EMO_CS.get(b||d)).replace(EMO_RE,m=>EMO_LC.get(m.toLowerCase())||m);"""
ffb=L(find('const FF='),find('function ff('))
ffb=ffb[:ffb.index('const FF=')]+'const FF=\'<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="gl" cx="12" cy="17.5" r="6.5"/><path class="bd" d="M8.5 2.8Q8.4 1.6 9.6 1.6L14.4 1.6Q15.6 1.6 15.5 2.8L14.5 13.4Q14.4 14.6 13.2 14.6L10.8 14.6Q9.6 14.6 9.5 13.4Z"/><circle class="ab" cx="12" cy="18.2" r="3.1"/></svg>\';\n'+ffb[ffb.index('function ff('):] if 'function ff(' in ffb else ffb
a=find('let AC;'); c=find('function cd()')
audio=L(a,c-1).replace('$("app")','$("#app")')
# HVORFOR: meldingslyden er byttet fra klokketoner til marimba (Dan Joakim 25. okt). Tonene C4-D4-A4 og klangen er målt fra en
# referansefil han sendte (grunntone 260 Hz, e-tid 0,27 s; overtone 4,01x: 0,25 / 0,05 s; 8,78x: 0,14 / 0,02 s; 3x: 0,08 / 0,02 s).
# Lyden lages i koden (Web Audio), ingen lydfil. Referansefilen er bare målt, ikke kopiert.
old_pling=[l for l in audio.split('\n') if l.startswith('function pling(')][0]
old_dob=[l for l in audio.split('\n') if l.startswith('function dobbelt(')][0]
new_snd='''function marimbaBus(c){ /* HVORFOR: felles utgang med kompressor, slik at lyden kan være høy uten å klippe (lave toner høres svakt på små høyttalere) */
 if(!c._mb){const g=c.createGain(),k=c.createDynamicsCompressor();g.gain.value=1;
  k.threshold.value=-14;k.knee.value=8;k.ratio.value=5;k.attack.value=.002;k.release.value=.18;
  g.connect(k);k.connect(c.destination);c._mb=g}
 return c._mb}
function marimba(f,at,vol){const c=ac();if(!c)return;const t=c.currentTime+at,bus=marimbaBus(c);
 [[1,1,.17],[4.01,.34,.04],[8.78,.16,.015],[3,.1,.015]].forEach(([m,a,tau])=>{const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=f*m;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol*a,t+.003);g.gain.setTargetAtTime(0,t+.003,tau);
  o.connect(g);g.connect(bus);o.start(t);o.stop(t+tau*8+.05)})}
function pling(v=.12,at=0){const k=260.2/261.63; /* samme lette stemming som referansen */
 [[261.63,0],[293.66,.13],[440,.26]].forEach(([f,d])=>marimba(f*k,at+d,v*4.4))}'''
RING=r'''/* HVORFOR: dobbeltpling skal låte som en ringelyd (gammel telefonklokke), ikke som meldingsmelodien (Dan Joakim 25. okt).
   To klokker som slås vekslende ~24 ganger i sekundet, to rundt à ca. 1 s («brrring-brrring»). Klokkeklang = uharmoniske overtoner. */
function ringing(v){const c=ac();if(!c)return;const bus=marimbaBus(c),t0=c.currentTime+.02;
 const bells=[[1480,0],[1870,1]],parts=[[1,1,.07],[2.32,.55,.05],[3.86,.32,.035],[5.43,.16,.025]],step=1/24;
 [[0,1.0],[1.35,1.0]].forEach(([s,len])=>{
  bells.forEach(([f,par])=>parts.forEach(([m,a,tau])=>{const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=f*m;g.gain.value=0;
   for(let i=par;i*step<len;i+=2){const t=t0+s+i*step;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v*a,t+.002);g.gain.setTargetAtTime(0,t+.002,tau)}
   o.connect(g);g.connect(bus);o.start(t0+s);o.stop(t0+s+len+.4)}))})}'''
audio=audio.replace(old_pling,new_snd+'\n'+RING).replace(old_dob,'function dobbelt(){ringing(.34)}')
# kraftigere vibrasjon i takt med risten
assert '[120,50,120,50,120,50,220]' in audio
audio=audio.replace('[120,50,120,50,120,50,220]','[200,60,200,60,200,60,200,60,300]')
av=L(find('function okAv'),find('function toAvatar')+3)
hue=P[find('function hue')-1]
avel=L(find('function avEl'),find('function avEl')+2)
proto='\n'.join([emo,ffb,audio,av,hue,avel])
# old head and crypto
def oidx(prefix):
    for i,l in enumerate(old):
        if l.startswith(prefix): return i
    raise Exception(prefix)
head='\n'.join(old[oidx('const SB_URL'):oidx('const sb=')+1])
head=head.replace('document.getElementById("app").textContent=','document.body.textContent=')
crypto='\n'.join(old[oidx('/* ---------- kryptering'):oidx('/* ---------- tilstand')])
views='\n'.join(old[oidx('/* ---------- innlogging'):oidx('/* ---------- godkjenne')])
views=views.replace('const app=$("#app");app.textContent="";','const app=scrHost();')
views=views.replace("vennene dine","kompisene dine")
views=views.replace('{if(first)start();else{viewMain();refresh()}}','{if(first)start();else showShell()}')
assert 'onclick:()=>sb.auth.signOut()' in views
views=views.replace('onclick:()=>sb.auth.signOut()','onclick:doLogout')
views=views.replace('class:"small"','class:"glass sm"').replace('class:"ghost small"','class:"glass sm"').replace('class:"ghost"','class:"glass"')
# viewSetup must not use pm; keep. 
NEWLOGIN='  app.classList.add("lgn");\n  let remMail="";try{remMail=localStorage.getItem("pling_remember_email")||""}catch(e){}\n  if(remMail&&!email.value)email.value=remMail;\n  const rem=el("input",{type:"checkbox",id:"rem"});rem.checked=!!remMail;\n  const lst=el("select",{id:"lst","aria-label":"Logg på som"},el("option",{value:"online"},"Pålogget"),el("option",{value:"busy"},"Opptatt"),el("option",{value:"away"},"Borte"),el("option",{value:"off"},"Vis meg som frakoblet"));\n  const go0=go;\n  const goW=async()=>{try{localStorage.setItem("pling_st_next",lst.value);if(rem.checked)localStorage.setItem("pling_remember_email",email.value.trim());else{localStorage.removeItem("pling_remember_email");localStorage.removeItem("pling_last_av")}}catch(e){}await go0()};\n  const fr=el("div",{class:"lpic"});let lastAv=null;try{lastAv=remMail?localStorage.getItem("pling_last_av"):null}catch(e){}if(lastAv&&okAv(lastAv)){fr.classList.add("hasav");fr.append(el("img",{src:lastAv,alt:""}))}else fr.append(ico("lgi"));\n  const wm=el("div",{class:"lwm","aria-hidden":"true"});wm.hidden=true;\n  app.append(\n    fr,\n    el("div",{class:"lh"},prk("lgn")),\n    el("div",{class:"invb",id:"invb",hidden:true}),\n    el("div",{class:"dim lc"},S.mode==="up"?"Lag en konto. Samtalene dine blir kryptert i nettleseren.":"nå prekær vi!"),\n    el("label",{for:"em",class:"ll"},"E-postadresse:"),email,\n    el("label",{for:"pw",class:"ll"},"Passord:"),pw,\n    el("div",{class:"lrow"},el("label",{for:"lst",class:"ll"},"Status:"),lst),\n    el("label",{class:"lchk"},rem," Husk e-postadressen min"),\n    ...(S.needCode?[el("div",{class:"row"},code,el("button",{id:"vf",onclick:verify},"Bekreft"))]:[]),\n    el("button",{id:"go",class:"lgo",onclick:goW},S.mode==="up"?"Lag konto":"Logg på"),\n    el("div",{class:"llinks"},\n      el("button",{class:"llink",id:"otp",type:"button",onclick:sendCode},"Send engangskode i stedet"),\n      el("button",{class:"llink",type:"button",onclick:()=>{S.mode=S.mode==="up"?"in":"up";viewLogin()}},S.mode==="up"?"Jeg har en konto":"Ny konto")),\n    el("div",{class:"fine lc"},"Ende-til-ende-kryptert \u00b7 ",el("button",{class:"llink",type:"button",onclick:showInfo},"Personvern og hjelp")),\n    wm);\n  pw.addEventListener("keydown",e=>{if(e.key==="Enter")goW()});\n  showInviteBanner();\n'
_m=re.search(r'  app\.append\(\n    el\("h1",\{\},"Pling · testside"\).*?pw\.addEventListener\("keydown",e=>\{if\(e\.key==="Enter"\)go\(\)\}\);\n',views,re.S)
assert _m, "viewLogin block not found"
views=views[:_m.start()]+NEWLOGIN+views[_m.end():]
main=open(HERE+'/main.js',encoding='utf8').read().replace('/*@@PROTO@@*/',proto+'\n'+open(HERE+'/anim.js',encoding='utf8').read()).replace('//@@VIEWS@@',views)
css='\n'.join(P[3:135])
extra=open(HERE+'/extra.css',encoding='utf8').read()
body=open(HERE+'/body.html',encoding='utf8').read()
html=f'''<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Prek! testside</title>
<script>(function(){{var t="auto";try{{t=localStorage.getItem("pling_theme")||"auto"}}catch(e){{}}
var mq=matchMedia("(prefers-color-scheme: light)");
function ap(){{document.documentElement.classList.toggle("lys",t==="lys"||(t==="auto"&&mq.matches))}}
window.plingTheme=function(v){{t=v;try{{localStorage.setItem("pling_theme",v)}}catch(e){{}}ap()}};
window.plingThemeGet=function(){{return t}};
ap();if(mq.addEventListener)mq.addEventListener("change",ap)}})()</script>
<style>
{css}
{extra}
</style>
</head>
<body>
{body}
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>
<script src="lib/qrcode.js"></script>
<script>
"use strict";
{head}

{crypto}
{main}
</script>
</body>
</html>
'''
# HVORFOR: dobbeltpling skal riste vinduet voldsomt i 2,5 s (Dan Joakim 25. okt); var 0,6 s og ±10 px.
assert '.win.dp{animation:sh .6s,glimt .9s}' in html  # HVORFOR hele selektoren: .win.dp, ikke bare .dp (en delvis erstatning ødela regelen i 37d7494)
html=html.replace('.win.dp{animation:sh .6s,glimt .9s}','@keyframes sh2{0.0%{transform:none}3.3%{transform:translate(25px,13px) rotate(-2.4deg)}6.7%{transform:translate(-19px,-15px) rotate(-1.3deg)}10.0%{transform:translate(20px,-9px) rotate(1.4deg)}13.3%{transform:translate(-25px,-13px) rotate(1.4deg)}16.7%{transform:translate(-16px,-10px) rotate(-2.0deg)}20.0%{transform:translate(21px,-9px) rotate(-1.8deg)}23.3%{transform:translate(-21px,-12px) rotate(2.3deg)}26.7%{transform:translate(22px,11px) rotate(-2.3deg)}30.0%{transform:translate(-16px,12px) rotate(2.2deg)}33.3%{transform:translate(22px,-9px) rotate(1.5deg)}36.7%{transform:translate(17px,11px) rotate(-2.3deg)}40.0%{transform:translate(19px,13px) rotate(1.4deg)}43.3%{transform:translate(-25px,14px) rotate(-1.4deg)}46.7%{transform:translate(22px,10px) rotate(2.5deg)}50.0%{transform:translate(16px,11px) rotate(-1.9deg)}53.3%{transform:translate(-24px,-14px) rotate(1.8deg)}56.7%{transform:translate(16px,11px) rotate(2.4deg)}60.0%{transform:translate(25px,14px) rotate(2.2deg)}63.3%{transform:translate(26px,-9px) rotate(-1.6deg)}66.7%{transform:translate(-16px,-10px) rotate(-1.5deg)}70.0%{transform:translate(22px,16px) rotate(-1.9deg)}73.3%{transform:translate(18px,8px) rotate(1.2deg)}76.7%{transform:translate(-20px,7px) rotate(1.6deg)}80.0%{transform:translate(-10px,-8px) rotate(1.4deg)}83.3%{transform:translate(-14px,5px) rotate(1.4deg)}86.7%{transform:translate(9px,-7px) rotate(0.9deg)}90.0%{transform:translate(5px,-5px) rotate(0.6deg)}93.3%{transform:translate(-5px,-3px) rotate(0.3deg)}96.7%{transform:translate(-3px,2px) rotate(-0.2deg)}100.0%{transform:none}} .win.dp{animation:sh2 2.5s linear,glimt .9s}')
open(HERE+'/../index.html','w',encoding='utf8').write(html)
print(len(html))
