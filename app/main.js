/*@@PROTO@@*/
/* ---------- tilstand ---------- */
const S={backup:null,user:null,profile:null,id:null,profiles:new Map(),av:new Map(),friends:[],reqIn:[],reqOut:[],chat:null,msgs:[],mode:"in",needCode:false,
  status:"online",last:new Map(),exp:new Map(),reads:new Map(),older:[],more:false,unread:new Map(),dm:new Map(),firstRef:true,pres:new Map(),typ:new Map(),seen:new Map(),cdUntil:0,nref:0};
const api=PrekApi.createApi(sb); // typed server functions, src/api.ts
const q=async(p,ctx)=>{const r=await p;if(r.error)throw new Error((ctx?ctx+": ":"")+r.error.message);return r.data};
/* logo: «Prek!» tegnet som former (ikke tekst), så den ser lik ut uten skriften Inter. Prikken følger statusen (CSS-variabelen --dot), fargen på bokstavene følger temaet (--lgc). Se claude/utseende.md. */
const PRK='<svg class="prk" viewBox="-20 -20 2621 991" overflow="visible" role="img" aria-label="prek!" xmlns="http://www.w3.org/2000/svg"><g style="fill:var(--dot,#43d65a)"><circle cx="2433.0" cy="602" r="150" opacity=".07"/><circle cx="2433.0" cy="602" r="185" opacity=".07"/><circle cx="2433.0" cy="602" r="220" opacity=".07"/><circle cx="2433.0" cy="602" r="254" opacity=".07"/><circle cx="2433.0" cy="602" r="289" opacity=".07"/><circle cx="2433.0" cy="602" r="324" opacity=".07"/></g><path d="M46.9 931.0H243.0V637.2H246.0C268.4 692.8 320.6 733.8 397.2 733.8C513.8 733.8 611.9 643.1 611.9 454.7C611.9 257.1 507.0 174.7 399.2 174.7C318.2 174.7 267.0 221.5 246.0 277.1H241.1V181.5H46.9ZM325.0 583.6C271.3 583.6 238.2 533.8 238.2 454.7C238.2 373.7 271.3 325.0 325.0 325.0C379.2 325.0 409.9 373.7 409.9 454.7C409.9 535.2 379.2 583.6 325.0 583.6ZM656.1 727.0H852.3V442.8C852.3 380.3 894.8 339.3 952.9 339.3C972.9 339.3 1005.7 342.2 1025.2 349.1V182.1C1009.6 177.2 992.5 174.3 975.4 174.3C917.3 174.3 871.9 208.4 852.3 285.6H846.5V181.1H656.1ZM1289.1 736.8C1428.3 736.8 1520.1 675.2 1547.9 577.1L1375.1 551.7C1363.3 582.0 1333.1 599.1 1293.0 599.1C1238.8 599.1 1202.7 566.8 1200.2 499.5H1555.7V454.5C1555.7 280.7 1449.3 174.3 1284.2 174.3C1115.3 174.3 1007.9 286.6 1007.9 455.5C1007.9 632.3 1113.8 736.8 1289.1 736.8ZM1201.7 392.0C1207.6 340.3 1236.4 312.0 1286.2 312.0C1336.0 312.0 1364.8 340.3 1370.7 392.0ZM1602.8 727.0H1799.1V571.7L1828.4 534.6L1939.8 727.0H2163.4L1973.0 420.4L2158.5 181.1H1937.8L1806.0 364.7H1799.1V-0.5H1602.8Z" style="fill:var(--lgc,#1b5fb8);stroke:var(--lgc,#1b5fb8)" stroke-width="37" stroke-linejoin="round"/><path d="M2315.8 33.9Q2313.0 0.0 2347.0 0.0L2519.0 0.0Q2553.0 0.0 2550.2 33.9L2521.8 377.1Q2519.0 411.0 2485.0 411.0L2381.0 411.0Q2347.0 411.0 2344.2 377.1Z" style="fill:var(--lgc,#1b5fb8)"/><g style="fill:var(--dot,#43d65a)"><circle cx="2433.0" cy="602" r="125"/></g><circle cx="2433.0" cy="602" r="125" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="14"/></svg>';
const DOT={on:"#43d65a",away:"#f6b830",busy:"#ee4b3f",off:"#9aa7b5"};
function ico(c){const s=document.createElement("span");s.className="icow "+(c||"");s.innerHTML='<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="icg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b5fb8"/><stop offset="1" stop-color="#10304f"/></linearGradient></defs><rect width="96" height="96" rx="22" fill="url(#icg)"/><g transform="translate(7.1 0)"><path d="M30.3 17.7Q30.0 14.5 33.2 14.5L48.6 14.5Q51.8 14.5 51.5 17.7L49.0 48.1Q48.7 51.3 45.5 51.3L36.2 51.3Q33.0 51.3 32.7 48.1Z" fill="#eef6fd"/><circle cx="40.9" cy="68.7" r="11.3" style="fill:var(--dot)"/><circle cx="40.9" cy="68.7" r="11.3" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.3"/></g></svg>';return s}
function prk(c){const s=document.createElement("span");s.className="prkw "+(c||"");s.innerHTML=PRK;return s}
const ST={online:"on",away:"away",busy:"busy",off:"off"};
let myAv=null;
const narrow=()=>matchMedia("(max-width:700px)").matches;

/* ---------- skjermer utenfor hovedvinduet ---------- */
function scrHost(){const s=$("#scr"),c=s.firstElementChild;c.textContent="";s.hidden=false;$("#shell").hidden=true;$("#lock").hidden=true;return c}
function showShell(){$("#scr").hidden=true;$("#shell").hidden=false;$("#lock").hidden=false}

//@@VIEWS@@

/* ---------- godkjenne ny enhet (på enheten som har nøkkelen) ---------- */
async function checkTransfers(){
  if(!S.user||!S.id||!S.profile)return;
  let rows;try{rows=await q(api.pendingTransfers())}catch(e){return}
  for(const r of rows.filter(r=>!pairFresh(r)))api.deleteTransfer(r.id).then(()=>{},()=>{});
  const r=rows.filter(pairFresh)[0]||null,box=$("#pairbox");
  if(!box)return;
  if(!r){if(S.pairId){S.pairId=null;box.textContent=""}return}
  if(S.pairId===r.id)return;
  S.pairId=r.id;box.textContent="";
  const code=await pairCode(r.eph_pub);
  box.append(el("div",{class:"card pairreq",id:"pairreq"},
    el("strong",{},tr("device.requestTitle")),
    el("p",{},tr("device.codeShouldBe"),el("span",{class:"code"},code)),
    el("p",{class:"warn fine"},tr("device.approveWarning")),
    el("div",{class:"row"},
      el("button",{id:"papprove",onclick:async()=>{try{
        const e=await ephPair(),key=await aesFrom(e.priv,r.eph_pub),sl=await seal(key,{v:1,priv:S.id.priv,pub:S.id.pub});
        await q(api.approveTransfer(r.id,{sender_pub:e.pub,iv:sl.iv,ct:sl.ct}),tr("ctx.approve"));
        toast(tr("device.sent"));S.pairId=null;box.textContent=""}catch(err){fail(err)}}},"Godkjenn"),
      el("button",{class:"glass",id:"pdeny",onclick:async()=>{try{await q(api.deleteTransfer(r.id),tr("ctx.reject"));S.pairId=null;box.textContent=""}catch(err){fail(err)}}},"Avvis"))));
}

/* ---------- invitasjonslenker ----------
   HVORFOR i #-delen (fragmentet): den sendes aldri til noen tjener (heller ikke GitHub Pages). Tokenet er 128 bit tilfeldig, og bare SHA-256 av det lagres i databasen,
   så en lekkasje fra databasen ikke gir brukbare lenker. En lenke kan brukes én gang og varer i 7 dager. Den som åpner den blir kompis med den som inviterte (ingen forespørsel å godta),
   så lenken skal bare deles med den man vil ha som kompis. Tokenet lagres i nettleseren til personen har logget inn og har profil (pling_inv), og slettes når den er brukt. */
(function(){try{
  const h=new URLSearchParams(location.hash.replace(/^#/,"")),t=h.get("inv");
  if(t&&/^[A-Za-z0-9_-]{16,64}$/.test(t)){localStorage.setItem("pling_inv",t);S.mode="up"}
  if(h.has("inv")){h.delete("inv");const r=h.toString();history.replaceState(null,"",location.pathname+location.search+(r?"#"+r:""))}
}catch(e){}})();
const b64u=u8=>btoa(String.fromCharCode(...u8)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const hex=u8=>[...u8].map(b=>b.toString(16).padStart(2,"0")).join("");
async function redeemPending(){
  let t=null;try{t=localStorage.getItem("pling_inv")}catch(e){}
  if(!t)return;
  try{localStorage.removeItem("pling_inv")}catch(e){}
  try{
    const r=await q(api.redeemInvite(t),tr("ctx.invitation")),f=r&&r[0];
    toast(tr("invite.nowFriends",{name:f?f.name:tr("invite.fallbackName")}));await refresh();
  }catch(e){toast(tr("invite.failed"),true)}
}
async function showInviteBanner(){
  const box=$("#invb");if(!box)return;let t=null;try{t=localStorage.getItem("pling_inv")}catch(e){}
  if(!t)return;
  try{const r=await api.peekInvite(t);box.textContent="";
    if(r.data)box.append(el("b",{},r.data),tr("invite.invitedBy"));
    else box.append(tr("invite.expiredBanner"));
    box.hidden=false}catch(e){}
}
function drawInvite(){
  const box=$("#invbox");if(!box)return;box.textContent="";
  const mk=el("button",{class:"glass sm",id:"mkinv",type:"button",onclick:async()=>{
    try{
      const tok=b64u(crypto.getRandomValues(new Uint8Array(16))),hs=await PrekCrypto.inviteHash(tok);
      await q(api.createInvite(hs),tr("ctx.createInvite"));
      const link=location.origin+location.pathname+"#inv="+tok;
      box.textContent="";
      const q1=el("div",{class:"qr",id:"invqr"});q1.innerHTML=qrSvg(link);
      const inp=el("input",{id:"invlink",readonly:true,value:link,"aria-label":tr("invite.linkAria")});
      inp.addEventListener("focus",()=>inp.select());
      const row=el("div",{class:"row"},
        el("button",{class:"glass sm",id:"invcopy",type:"button",onclick:async()=>{try{await navigator.clipboard.writeText(link);toast(tr("invite.copied"))}catch(e){inp.select();toast(tr("invite.selectToCopy"),true)}}},tr("common.copy")));
      if(navigator.share)row.append(el("button",{class:"glass sm",type:"button",onclick:()=>navigator.share({title:"Prek!",text:tr("invite.shareText"),url:link}).catch(()=>{})},tr("invite.share")));
      box.append(q1,inp,row,el("div",{class:"fine"},tr("invite.validity")),
        el("button",{class:"llink",type:"button",onclick:async()=>{try{const n=await q(api.revokeInvites(),tr("ctx.revokeInvites"));toast(tr("invite.revoked",{n}));drawInvite()}catch(e){fail(e)}}},tr("invite.revokeAll")));
    }catch(e){fail(e)}
  }},tr("invite.create"));
  box.append(el("div",{class:"fine"},tr("invite.orSendLink")),mk);
}


/* ---------- personvern og hjelp ---------- */
/* Teksten skal være ærlig og kort. Oppdater den når noe endres i hva serveren ser (se claude/personvern.md). */
const INFO=[
 [tr("info.short.title"),[tr("info.short.p1")]],
 [tr("info.sees.title"),[["ul",tr("info.sees.li1"),tr("info.sees.li2"),tr("info.sees.li3"),tr("info.sees.li4"),tr("info.sees.li5"),tr("info.sees.li6"),tr("info.sees.li7")]]],
 [tr("info.notsees.title"),[["ul",tr("info.notsees.li1"),tr("info.notsees.li2")]]],
 [tr("info.linkprev.title"),[tr("info.linkprev.p1")]],
 [tr("info.recovery.title"),[tr("info.recovery.p1")]],
 [tr("info.invites.title"),[tr("info.invites.p1")]],
 [tr("info.expiry.title"),[tr("info.expiry.p1")]],
 [tr("info.howto.title"),[["ul",tr("info.howto.li1"),tr("info.howto.li2"),tr("info.howto.li3"),tr("info.howto.li4"),tr("info.howto.li5"),tr("info.howto.li6"),tr("info.howto.li7"),tr("info.howto.li8"),tr("info.howto.li9")]]],
 [tr("info.about.title"),[tr("info.about.p1")]]
];
function showInfo(){
  const o=$("#info");o.textContent="";
  const box=el("div",{class:"infob",role:"dialog","aria-modal":"true","aria-label":tr("info.title")});
  box.append(el("div",{class:"infoh"},el("b",{},tr("info.title")),el("button",{class:"glass sm",type:"button",onclick:closeInfo},tr("info.close"))));
  const body=el("div",{class:"infot"});
  for(const [h,ps] of INFO){
    body.append(el("h3",{},h));
    for(const p of ps){
      if(Array.isArray(p)){const ul=el("ul",{});for(const t of p.slice(1))ul.append(el("li",{},t));body.append(ul)}
      else body.append(el("p",{},p));
    }
  }
  box.append(body);o.append(box);o.hidden=false;
  o.onclick=e=>{if(e.target===o)closeInfo()};
  box.querySelector("button").focus();
}
function closeInfo(){const o=$("#info");o.hidden=true;o.textContent=""}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#info").hidden)closeInfo()});

/* Logg ut. supabase-js sin signOut() avbryter uten å gjøre noe hvis kallet mot serveren feiler (nett, utløpt økt, uventet svar), og da ble brukeren stående på skjermen. Derfor: prøv vanlig utlogging, ellers lokalt, ellers fjern økten for hånd og last siden på nytt. */
async function doLogout(){
  try{if(S.user&&S.id)await Promise.race([api.setPresence("off",null),new Promise(r=>setTimeout(r,2000))])}catch(e){}
  let bad=false;
  try{const r=await Promise.race([api.signOut(),new Promise(r=>setTimeout(()=>r({error:1}),4000))]);bad=!!(r&&r.error)}catch(e){bad=true}
  await new Promise(r=>setTimeout(r,50));
  if(S.user){
    try{await api.signOut(true)}catch(e){}
    await new Promise(r=>setTimeout(r,50));
    if(S.user){try{Object.keys(localStorage).filter(k=>/^sb-.*-auth-token/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}location.reload()}
  }
}
/* ---------- hovedvindu ---------- */
let wired=false;
async function start(){
  try{const bk=await q(api.getKeyBackupInfo(S.user.id));S.backup=bk[0]||null}catch(e){S.backup=null}
  showShell();
  try{const a=localStorage.getItem("pling_av_"+S.user.id);if(okAv(a)){myAv=a;localStorage.setItem("pling_last_av",a)}}catch(e){}
  S.status="online";
  try{const s=localStorage.getItem("pling_st_"+S.user.id);if(s&&ST[s])S.status=s}catch(e){}
  try{const n=localStorage.getItem("pling_st_next");if(n){localStorage.removeItem("pling_st_next");if(ST[n]){S.status=n;localStorage.setItem("pling_st_"+S.user.id,n)}}}catch(e){}
  $("#pnm").value=S.profile.name;$("#pm").value=S.profile.pm||"";$("#st").value=S.status;
  if(!wired){wired=true;wire()}
  paintMe();closeChat();
  await refresh();
  drawInvite();await redeemPending();
  startPresence();
  api.subscribeLive({
    onMessage:p=>{const r=p&&p.new;if(r&&r.sender&&S.user&&r.sender!==S.user.id&&S.typ.has(r.sender)){S.typ.delete(r.sender);drawTyping()}refreshSoon()},
    onChange:()=>refreshSoon(),
    onPresence:p=>presEvt(p)});
  clearInterval(S.poll);S.poll=setInterval(()=>{if(S.user&&!document.hidden)refresh()},8000);
  clearInterval(S.pp);S.pp=setInterval(()=>{if(!document.hidden)checkTransfers()},3000);checkTransfers();
  paintAvAll();
}
let rT=0;function refreshSoon(){clearTimeout(rT);rT=setTimeout(refresh,150)}

/* ---------- tilstedeværelse: tabell som bare kompiser kan lese ----------
   HVORFOR (25. okt): den felles Realtime-kanalen «pling-presence» lot alle innloggede se alles status og «skriver …». Private kanaler leverte aldri noe til kompiser mot ekte Supabase.
   Nå ligger status i tabellen `presence` (kun kompiser kan lese, via get_presence()). Hver enhet melder seg med set_presence() hvert 20. sekund og ved endringer.
   «Pålogget» betyr at siste melding er yngre enn 50 sekunder (alderen regnes på serveren, så klokken på enheten spiller ingen rolle). Realtime brukes bare som signal om at noe er endret.
   Rader slettes aldri: «frakoblet» settes som status `off` (Realtime leverer ikke slettinger for rader beskyttet av RLS). Forrige løsning: commit 30def30 og tidligere (main.js.bak-felleskanal). */
const PRES_BEAT=20000,PRES_STALE=50;
function startPresence(){
  clearInterval(S.pbT);clearInterval(S.pfT);
  trackMe(true);
  S.pbT=setInterval(()=>{if(S.user)trackMe(true)},PRES_BEAT);
  S.pfT=setInterval(()=>{if(S.user)pullPresence()},12000);
  pullPresence();
}
function trackMe(force){
  if(!S.user)return;
  const now=Date.now();
  if(!force&&now-(S.lastTrack||0)<2000){
    if(!S.trT)S.trT=setTimeout(()=>{S.trT=0;trackMe(true)},2000-(now-S.lastTrack));
    return}
  S.lastTrack=now;
  const typ=S.myTyp&&now-S.myTyp.n<3000?S.myTyp.c:null;
  api.setPresence(S.status,typ).then(()=>{},()=>{});
}
let prT=0,prBusy=false,prAgain=false;const typAt=new Map();
function presSoon(){clearTimeout(prT);prT=setTimeout(pullPresence,250)}
/* Raden som endret seg følger med i Realtime-hendelsen (bare rader vi har lov til å se, altså kompiser og oss selv). Bruker den med en gang, så «skriver …» vises uten ekstra runde mot serveren. Listen hentes likevel rett etterpå som kontroll. (26. okt: «skriver» kom for sent.) */
function presEvt(p){
  const r=p&&p.new;
  if(!S.user||!r||!r.user_id||r.user_id===S.user.id||!ST[r.st]){presSoon();return}
  const now=Date.now();let redraw=false;
  if(r.st==="off"){if(S.pres.delete(r.user_id))redraw=true}
  else if(S.pres.get(r.user_id)!==r.st){S.pres.set(r.user_id,r.st);redraw=true}
  if(r.st!=="off"&&r.typ_chat&&r.typ_at){
    if(typAt.get(r.user_id)!==r.typ_at){typAt.set(r.user_id,r.typ_at);S.typ.set(r.user_id,{n:now,c:r.typ_chat,seen:now})}
  }else S.typ.delete(r.user_id);
  if(redraw){drawFriends();drawChatHead()}
  drawTyping();presSoon();
}
async function pullPresence(){
  if(!S.user)return;
  if(prBusy){prAgain=true;return}
  prBusy=true;
  try{
    const r=await api.getPresence();if(r.error||!S.user)return;
    const m=new Map(),now=Date.now();
    for(const p of r.data||[]){
      if(!ST[p.st]||p.st==="off"||p.age_s==null||p.age_s>PRES_STALE)continue;
      m.set(p.user_id,p.st);
      if(p.typ_chat&&p.typ_age_s!=null&&p.typ_age_s<3)S.typ.set(p.user_id,{n:Math.round(now-p.typ_age_s*1000),c:p.typ_chat,seen:now-p.typ_age_s*1000});
    }
    if(S.status!=="off")m.set(S.user.id,S.status);
    S.pres=m;drawFriends();drawChatHead();drawTyping();
  }catch(e){}finally{prBusy=false;if(prAgain){prAgain=false;presSoon()}}
}
/* Fanen lukkes: si fra med en gang, så kompisene ser «frakoblet» i stedet for å vente 50 sekunder. keepalive lar kallet fullføres selv om siden forsvinner. */
window.addEventListener("pagehide",()=>{
  if(!S.user||!S.tok)return;
  try{fetch(SB_URL+"/rest/v1/rpc/set_presence",{method:"POST",keepalive:true,headers:{apikey:SB_KEY,authorization:"Bearer "+S.tok,"content-type":"application/json"},body:JSON.stringify({p_st:"off",p_typ:null})})}catch(e){}
});
/* demp: lagres bare på denne enheten (ingenting sendes til serveren, avsenderen får ikke vite det) */
const muteKey=()=>"pling_mute_"+S.user.id;
function muted(id){try{return JSON.parse(localStorage.getItem(muteKey())||"[]").includes(id)}catch(e){return false}}
function setMuted(id,on){let l=[];try{l=JSON.parse(localStorage.getItem(muteKey())||"[]")}catch(e){}l=l.filter(x=>x!==id);if(on)l.push(id);try{localStorage.setItem(muteKey(),JSON.stringify(l))}catch(e){}}
function drawMute(){const b=$("#bmu");if(!b||!S.chat)return;b.textContent=muted(S.chat.other)?tr("mute.unmuteButton"):tr("mute.muteButton")}
function stOf(id){return S.pres.get(id)||"off"}

/* ---------- data ---------- */
async function refresh(){
  if(!S.user||!S.profile)return;
  try{
    const [fr,rq]=await Promise.all([q(api.listFriends(),tr("ctx.friends")),q(api.listRequests(),tr("ctx.requests"))]);
    const ids=new Set();
    S.friends=fr.map(r=>r.a===S.user.id?r.b:r.a);S.friends.forEach(i=>ids.add(i));
    S.reqIn=rq.filter(r=>r.to_id===S.user.id).map(r=>r.from_id);S.reqIn.forEach(i=>ids.add(i));
    S.reqOut=rq.filter(r=>r.from_id===S.user.id).map(r=>r.to_id);S.reqOut.forEach(i=>ids.add(i));
    if(ids.size){const ps=await q(api.getProfiles([...ids]),tr("ctx.profiles"));ps.forEach(p=>S.profiles.set(p.id,p))}
    if(S.nref++%5===0&&S.friends.length){
      try{const as=await q(api.getAvatars(S.friends));for(const a of as)if(okAv(a.data))S.av.set(a.id,a.data)}catch(e){}
    }
    if(S.chat&&!S.friends.includes(S.chat.other))closeChat();
    try{S.blocks=await q(api.listBlocks(),tr("ctx.blocked"))}catch(e){S.blocks=S.blocks||[]}
    await loadPreviews();
    drawReqs();drawFriends();drawSec();drawBlocks();
    if(S.chat){drawExp();drawChatHead();await loadMsgs()}
  }catch(e){fail(e)}
}
function drawBlocks(){
  const c=$("#blist");if(!c)return;c.textContent="";const bl=S.blocks||[];$("#bgrp").hidden=!bl.length;
  for(const b of bl)c.append(el("div",{class:"brow"},el("span",{},b.name||tr("common.unknown")),el("button",{class:"glass sm",type:"button",onclick:async()=>{
    try{await q(api.unblockUser(b.blocked),tr("ctx.unblock"));toast(tr("block.removed"));refresh()}catch(e){fail(e)}}},tr("block.remove"))))}
const readKey=cid=>"pling_read_"+S.user.id+"_"+cid;
const getRead=cid=>S.reads.get(cid)||0;
const setRead=(cid,id)=>{if(id>getRead(cid)){S.reads.set(cid,id);api.markRead(cid,id).then(()=>{},()=>{})}};
async function loadPreviews(){
  const [cm,cs,rr]=await Promise.all([q(api.listChatMembers(),tr("ctx.chats")),q(api.listChats(),tr("ctx.chats")),q(api.listReads(),tr("ctx.read"))]);
  for(const c of cs)S.exp.set(c.id,c.exp_days||0);
  const hasSrv=new Set();
  for(const r of rr){hasSrv.add(r.chat_id);S.reads.set(r.chat_id,Math.max(S.reads.get(r.chat_id)||0,+r.last_id))}
  const mine=new Set(cm.filter(r=>r.user_id===S.user.id).map(r=>r.chat_id));
  /* engangs-flytting av «lest» som tidligere lå bare i nettleseren */
  for(const cid of mine)if(!hasSrv.has(cid)){let l=0;try{l=+localStorage.getItem(readKey(cid))||0}catch(e){}if(l>0)setRead(cid,l)}
  const dm=new Map();
  for(const r of cm)if(r.user_id!==S.user.id&&mine.has(r.chat_id)&&S.friends.includes(r.user_id))dm.set(r.user_id,r.chat_id);
  S.dm=dm;let more=false;
  await Promise.all([...dm].map(async([fid,cid])=>{
    const p=S.profiles.get(fid);if(!p)return;
    const rows=await q(api.latestMessages(cid,20),tr("ctx.messages"));
    if(!rows.length){S.last.delete(fid);S.unread.set(fid,0);return}
    const key=await pairKey(p.pub),top=rows[0],m=await open(key,top.iv,top.ct);
    S.last.set(fid,{id:top.id,mine:top.sender===S.user.id,t:m?(m.dp?tr("chat.dp"):m.img?(m.img.t==="image/gif"?"GIF":tr("chat.previewImage")):String(m.t==null?"":m.t)):tr("chat.undecryptable")});
    const isOpen=S.chat&&S.chat.id===cid;
    if(isOpen)setRead(cid,top.id);
    const rd=getRead(cid);
    if(!S.firstRef)for(const r of rows)if(r.sender!==S.user.id&&r.id>rd&&!dpSeen.has(r.id)&&Date.now()-new Date(r.created_at).getTime()<30000){
      const mm=await open(key,r.iv,r.ct);if(mm&&mm.dp)alertDp(fid,r.id,r.created_at)}
    const n=isOpen?0:rows.filter(r=>r.sender!==S.user.id&&r.id>rd).length;
    if(!S.firstRef&&n>(S.unread.get(fid)||0)&&!muted(fid))more=true;
    S.unread.set(fid,n);
  }));
  S.firstRef=false;
  if(more)pling();
  setTitle();
}
/* HVORFOR: dobbeltpling skal fange oppmerksomheten uansett hvor mottakeren er i appen, ikke bare når samtalen er åpen
   (Dan Joakim 25. okt: «poenget med et dobbeltpling er at man skal bli oppmerksom på at noen vil ha tak i en»).
   dpSeen = hver melding utløser bare én gang, selv om både forhåndsvisningen og den åpne samtalen ser den. */
const dpSeen=new Set(),dpFlash=new Set();let dpT=0;
function alertDp(fid,id,ts){
  if(dpSeen.has(id))return;dpSeen.add(id);
  if(Date.now()-new Date(ts).getTime()>30000)return; /* gammel melding: ikke ring */
  if(muted(fid))return; /* dempet: ingen lyd, risting, banner eller tittelblink */
  stor();
  dpFlash.add(fid);drawFriends();setTimeout(()=>{dpFlash.delete(fid);drawFriends()},10000);
  const old=$("#dpb");if(old)old.remove();
  const b=el("button",{id:"dpb",class:"dpb",type:"button"},"🔔 "+nameOf(fid)+" vil ha tak i deg!");
  b.addEventListener("click",()=>{b.remove();openChat(fid)});
  document.body.append(b);setTimeout(()=>{if(b.isConnected)b.remove()},12000);
  clearInterval(dpT);let n=0;const nm=nameOf(fid);
  dpT=setInterval(()=>{n++;document.title=n%2?"🔔 "+nm+" ringer!":tr("app.pageTitle");if(n>=20){clearInterval(dpT);setTitle()}},700);
}
function setTitle(){const tot=[...S.unread.values()].reduce((a,b)=>a+b,0);document.title=(tot?"("+tot+") ":"")+tr("app.pageTitle")}
const nameOf=id=>{const p=S.profiles.get(id);return p?p.name:"…"};

/* ---------- min profil ---------- */
function paintMe(){
  const i=$("#avimg"),s=$("#avini"),nm=S.profile.name;
  if(okAv(myAv)){i.src=myAv;i.hidden=false;s.hidden=true}else{i.hidden=true;s.hidden=false;s.textContent=initial(nm)}
  $("#avwrap").className="av "+ST[S.status];
  document.documentElement.style.setProperty("--dot",DOT[ST[S.status]]||DOT.on);
  $("#men").textContent=nm;
  const sel=$("#st");$("#mep").textContent=sel.options[sel.selectedIndex].text;const pmi=$("#pm");if(document.activeElement!==pmi)pmi.value=S.profile.pm||"";
  const f=$("#mef");f.textContent="";f.append(ff(ST[S.status]));
}
function paintAvAll(){paintMe()}
async function saveProfile(patch){
  try{await q(api.updateProfile(S.user.id,patch),tr("ctx.saveProfile"));Object.assign(S.profile,patch);paintMe();drawChatHead()}catch(e){fail(e)}
}

/* ---------- kompislisten ---------- */
const ORD={on:0,away:1,busy:1,off:2};
function pav(id,st){return avEl(nameOf(id),S.av.get(id),st)}
function prev(id){const l=S.last.get(id);if(!l)return "";const t=emoji(l.t).replace(/\s+/g," ");return (l.mine?tr("chat.youPrefix"):"")+(t.length>60?t.slice(0,60)+"…":t)}
function drawTitle(){
  const t=$("#title");if(!S.chat){t.textContent="";return}
  const id=S.chat.other,pm=(S.profiles.get(id)||{}).pm;t.textContent="";
  t.append(nameOf(id));if(pm){t.append(el("span",{class:"tpm"}," – "+pm));t.title=nameOf(id)+" – "+pm}else t.removeAttribute("title");
}
function drawFriends(){
  if(S.chat&&$("#title")&&$("#title").dataset.k!==((S.profiles.get(S.chat.other)||{}).pm||"")+"|"+nameOf(S.chat.other)){$("#title").dataset.k=((S.profiles.get(S.chat.other)||{}).pm||"")+"|"+nameOf(S.chat.other);drawTitle()}
  const box=$("#friends");if(!box)return;box.textContent="";
  const rows=S.friends.map(id=>({id,st:ST[stOf(id)]||"off"}));
  rows.sort((a,b)=>ORD[a.st]-ORD[b.st]||nameOf(a.id).localeCompare(nameOf(b.id),"nb"));
  const word={on:tr("status.on"),away:tr("status.away"),busy:tr("status.busy"),off:tr("status.off")};
  for(const r of rows){
    const p=S.profiles.get(r.id)||{},b=el("button",{class:"conv"+(S.chat&&S.chat.other===r.id?" act":"")+(dpFlash.has(r.id)?" dpflash":""),type:"button","data-id":r.id});
    b.append(pav(r.id,r.st),
      el("span",{class:"t"},el("span",{class:"nl"},el("b",{},nameOf(r.id)),muted(r.id)?el("span",{class:"mu",title:tr("chat.mutedTitle")}," 🔕"):null,p.pm?el("span",{class:"npm"}," – "+p.pm):null),el("small",{},prev(r.id)||word[r.st])),
      el("span",{class:"rt"},S.unread.get(r.id)?el("span",{class:"badge",title:tr("friends.unreadTitle")},S.unread.get(r.id)>=20?"20+":String(S.unread.get(r.id))):null,ff(r.st)));
    if(S.unread.get(r.id))b.classList.add("unread");
    b.addEventListener("dblclick",()=>openChat(r.id));
    b.addEventListener("click",()=>{if(narrow()||matchMedia("(pointer:coarse)").matches)openChat(r.id)});
    b.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();openChat(r.id)}});
    box.append(b);
  }
  for(const id of S.reqOut){
    const b=el("div",{class:"conv pend"});
    b.append(pav(id,"off"),el("span",{class:"t"},el("b",{},nameOf(id)),el("small",{},tr("friends.waiting"))),ff("off"));
    box.append(b);
  }
  if(!rows.length&&!S.reqOut.length)box.append(el("div",{class:"fine",style:"padding:6px 4px"},tr("friends.empty")));
}
function drawReqs(){
  const box=$("#reqs");box.textContent="";box.hidden=!S.reqIn.length;
  for(const id of S.reqIn){
    box.append(el("div",{class:"req"},pav(id,"on"),el("div",{},el("b",{},nameOf(id))," vil legge deg til"),
      el("div",{class:"row"},
        el("button",{class:"sm",onclick:async()=>{try{await q(api.acceptRequest(id),tr("friends.accept"));refresh()}catch(e){fail(e)}}},tr("friends.accept")),
        el("button",{class:"glass sm",onclick:async()=>{try{await q(api.declineRequest(id,S.user.id),tr("friends.decline"));refresh()}catch(e){fail(e)}}},tr("friends.decline")))));
  }
}
function drawSec(){
  const c=$("#seccard");if(!c)return;c.textContent="";
  $("#mewarn").hidden=!!S.backup;
  c.append(el("div",{class:S.backup?"sec":"warn",id:"bkst"},S.backup?tr("recovery.exists"):tr("recovery.missing")),
    el("div",{class:"row"},el("button",{class:"glass sm",id:"mkcode",onclick:()=>showRecovery(false)},S.backup?tr("recovery.makeNew"):tr("recovery.make"))),
    el("div",{class:"fine"},tr("recovery.newDeviceHint")));
}

/* ---------- samtale ---------- */
function closeChat(){
  S.chat=null;S.msgs=[];S.older=[];S.sig=null;S.anSeen=new Map();S.rx=new Map();S.rxSig="";
  $("#shell").classList.remove("inchat");
  for(const i of ["ch","menu","log","typ","emo","bar"])$("#"+i).hidden=true;
  $("#empty").hidden=false;$("#mb").setAttribute("aria-expanded","false");
  drawFriends();
}
async function openChat(otherId){
  try{
    const cid=await q(api.openDm(otherId),tr("ctx.openChat"));
    S.chat={id:cid,other:otherId};S.msgs=[];S.older=[];S.more=false;S.sig=null;S.first=true;S.anSeen=new Map();S.rx=new Map();S.rxSig="";
    $("#shell").classList.add("inchat");
    $("#empty").hidden=true;for(const i of ["ch","log","bar"])$("#"+i).hidden=false;
    $("#menu").hidden=true;$("#emo").hidden=true;$("#mb").setAttribute("aria-expanded","false");
    drawExp();
    $("#log").textContent="";
    drawChatHead();drawFriends();drawTyping();await loadMsgs();
    if(!narrow())$("#tx").focus();
  }catch(e){fail(e)}
}
const dagTxt=d=>d===1?"1 dag":d+" dager";
function drawExp(){
  if(!S.chat)return;drawMute();const d=S.exp.get(S.chat.id)||0,n=$("#expn");
  $("#ex").value=String(d);n.hidden=!d;
  n.textContent=d?tr("exp.chatNote",{when:dagTxt(d)}):"";
}
function drawChatHead(){
  if(!S.chat)return;const id=S.chat.other,st=ST[stOf(id)]||"off";
  drawTitle();
  const pr=$("#pr");pr.textContent="";pr.append(pav(id,st));
  const w=$("#who");w.textContent="";
  const p=S.profiles.get(id)||{};
  w.append(el("div",{class:"bud"},pav(id,st),el("span",{class:"t"},nameOf(id),el("small",{},p.pm||"")),ff(st)));
  const mine=ST[S.status];
  w.append(el("div",{class:"bud"},avEl(S.profile.name,myAv,mine),el("span",{class:"t"},S.profile.name+" (deg)",el("small",{},S.profile.pm||"")),ff(mine)));
  const o=S.profiles.get(id);
  if(o&&o.fp)safety(o.fp).then(s=>{if(S.chat&&S.chat.other===id)$("#sn").textContent=s});
  $("#fp").textContent=o?tr("chat.fingerprint",{fp:o.fp.match(/.{4}/g).join(" ")}):"";
}
async function safety(otherFp){
  return PrekCrypto.safetyNumber(S.profile.fp,otherFp);
}
function drawTyping(){
  const t=$("#typ");
  if(!S.chat){t.hidden=true;return}
  const x=S.typ.get(S.chat.other),on=x&&x.c===S.chat.id&&Date.now()-x.seen<3000&&S.pres.has(S.chat.other);
  t.hidden=false;t.textContent=on?tr("chat.typing",{name:nameOf(S.chat.other)}):"";
  if(on){clearTimeout(S.tT);S.tT=setTimeout(drawTyping,3100-(Date.now()-x.seen))}
}
const PAGE=50;
/* ---------- lenker og forhåndsvisning ----------
   HVORFOR avsenderen henter forhåndsvisningen: mottakeren skal aldri kontakte nettstedet (da ville det sett hvem som leste lenken).
   Avsenderens klient ber funksjonen «linkpreview» på Supabase hente tittel, tekst og bilde. Resultatet legges i meldingen og krypteres sammen med den.
   Avsenderen er ikke tillitsfull for mottakeren: alt som kommer i `lk` valideres før visning (bare http/https, bare jpeg-bilde som data-URL, kuttet lengde). */
const LP_ON=()=>{try{return localStorage.getItem("pling_lp")!=="0"}catch(e){return true}};
const URL_RE=/https?:\/\/[^\s<>"']+/gi;
const cutUrl=u=>{let t="";while(/[.,;:!?)\]»”]$/.test(u)){t=u.slice(-1)+t;u=u.slice(0,-1)}return[u,t]};
const okHttp=u=>{try{const x=new URL(u);return x.protocol==="http:"||x.protocol==="https:"}catch(e){return false}};
function firstUrl(t){URL_RE.lastIndex=0;const r=URL_RE.exec(t);if(!r)return null;const u=cutUrl(r[0])[0];return okHttp(u)&&u.length<=2000?u:null}
function linkify(t){
  const out=[];let last=0;URL_RE.lastIndex=0;let r;
  while((r=URL_RE.exec(t))){
    const[u,tail]=cutUrl(r[0]);if(!okHttp(u))continue;
    if(r.index>last)out.push(...emojiNodes(t.slice(last,r.index)));
    out.push(el("a",{class:"ulink",href:u,target:"_blank",rel:"noopener noreferrer nofollow"},u));
    if(tail)out.push(tail);last=r.index+r[0].length;
  }
  if(last<t.length)out.push(...emojiNodes(t.slice(last)));
  return out;
}
function validLk(x){
  if(!x||typeof x!=="object"||typeof x.u!=="string"||x.u.length>2000||!okHttp(x.u))return null;
  const s=(v,n)=>typeof v==="string"?v.slice(0,n):"";
  const o={u:x.u,ti:s(x.ti,140),d:s(x.d,240),s:s(x.s,60)};
  if(typeof x.i==="string"&&x.i.length<=90000&&/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(x.i))o.i=x.i;
  return o;
}
function lkCard(l){
  const a=el("a",{class:"lkc",href:l.u,target:"_blank",rel:"noopener noreferrer nofollow"});
  if(l.i)a.append(el("img",{class:"lki",src:l.i,alt:""}));
  a.append(el("span",{class:"lkb"},el("small",{},l.s||""),el("b",{},l.ti||l.u),l.d?el("span",{class:"lkd"},l.d):null));
  return a;
}
async function thumb(ct,b64){
  try{
    const bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const bm=await createImageBitmap(new Blob([u8],{type:ct}));
    for(const[W,qq]of[[360,.72],[300,.6],[220,.55]]){
      const sc=Math.min(1,W/bm.width),c=document.createElement("canvas");c.width=Math.max(1,Math.round(bm.width*sc));c.height=Math.max(1,Math.round(bm.height*sc));
      const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(bm,0,0,c.width,c.height);
      const d=c.toDataURL("image/jpeg",qq);if(d.length<=60000){bm.close&&bm.close();return d}
    }
    bm.close&&bm.close();
  }catch(e){}
  return "";
}
async function fetchPreview(u){
  try{
    const r=await Promise.race([api.linkPreview(u),new Promise((_,j)=>setTimeout(()=>j(new Error("tid")),8000))]);
    const d=r&&r.data;if(!d||!d.ok)return null;
    const lk={u,ti:String(d.ti||"").slice(0,140),d:String(d.d||"").slice(0,240),s:String(d.s||"").slice(0,60)};
    if(d.img&&/^image\/(jpeg|png|webp|gif)$/.test(d.img.ct)&&typeof d.img.b64==="string"){const i=await thumb(d.img.ct,d.img.b64);if(i)lk.i=i}
    return validLk(lk);
  }catch(e){return null}
}
async function decodeRows(rows,key){
  const out=[];
  for(const r of rows){const m=await open(key,r.iv,r.ct);out.push({id:r.id,mine:r.sender===S.user.id,t:m&&m.t!=null?String(m.t):null,dp:!!(m&&m.dp),img:(m&&m.img&&typeof m.img.p==="string")?m.img:null,lk:validLk(m&&m.lk),ok:!!m,ts:r.created_at})}
  return out;
}
async function loadMsgs(){
  if(!S.chat)return;
  const cid=S.chat.id,other=S.profiles.get(S.chat.other);if(!other)return;
  const rows=(await q(api.latestMessages(cid,PAGE),tr("ctx.messages"))).reverse();
  if(!S.chat||S.chat.id!==cid)return;
  const key=await pairKey(other.pub),latest=await decodeRows(rows,key);
  const rxr=await loadReacts(cid,key);
  if(!S.chat||S.chat.id!==cid)return;
  let rxChanged=false;if(rxr&&rxr.sig!==S.rxSig){S.rx=rxr.map;S.rxSig=rxr.sig;rxChanged=true}
  if(!S.older.length)S.more=rows.length>=PAGE;
  const out=[...S.older,...latest];
  const sig=out.map(m=>m.id).join(",");
  if(sig===S.sig){if(rxChanged)drawLog(true);return}S.sig=sig;
  const maxSeen=S.seen.get(cid)||0,fresh=S.first?[]:out.filter(m=>!m.mine&&m.id>maxSeen);
  S.seen.set(cid,out.length?out[out.length-1].id:0);
  if(out.length){setRead(cid,out[out.length-1].id);const l=out[out.length-1];S.last.set(S.chat.other,{id:l.id,mine:l.mine,t:l.dp?tr("chat.dp"):l.img?(l.img.t==="image/gif"?"GIF":tr("chat.previewImage")):(l.ok?l.t||"":tr("chat.undecryptable"))});S.unread.set(S.chat.other,0);setTitle();drawFriends()}
  if(S.first)for(const x of out)S.anSeen.set(String(x.id),0);
  S.first=false;S.msgs=out;drawLog();
  if(fresh.length){
    const bigs=fresh.filter(m=>m.dp);
    for(const m of bigs)alertDp(S.chat.other,m.id,m.ts);
    if(!bigs.length&&!muted(S.chat.other))pling();
  }
}
async function loadOlder(){
  if(!S.chat||!S.msgs.length)return;
  const cid=S.chat.id,other=S.profiles.get(S.chat.other),oldest=S.msgs[0].id,log=$("#log");
  try{
    const rows=(await q(api.olderMessages(cid,oldest,PAGE),tr("ctx.olderMessages"))).reverse();
    if(!S.chat||S.chat.id!==cid)return;
    const dec=await decodeRows(rows,await pairKey(other.pub));
    S.older=[...dec,...S.older];S.more=rows.length>=PAGE;
    S.msgs=[...dec,...S.msgs];S.sig=S.msgs.map(m=>m.id).join(",");
    const h=log.scrollHeight,t=log.scrollTop;drawLog(true);log.scrollTop=t+(log.scrollHeight-h);
  }catch(e){fail(e)}
}
function drawLog(keepPos){
  const log=$("#log"),near=log.scrollHeight-log.scrollTop-log.clientHeight<80;
  log.textContent="";
  const tm=ts=>new Date(ts).toLocaleTimeString("nb-NO",{hour:"2-digit",minute:"2-digit"});
  if(S.more&&S.msgs.length)log.append(el("button",{class:"glass sm older",type:"button",onclick:loadOlder},tr("chat.showOlder")));
  if(!S.msgs.length)log.append(el("div",{class:"sys"},tr("chat.empty",{name:nameOf(S.chat.other)})));
  for(const m of S.msgs){
    if(m.dp){log.append(el("div",{class:"sys"},tr("chat.sentDp",{who:m.mine?tr("chat.you"):nameOf(S.chat.other),time:tm(m.ts)})));continue}
    const d=el("div",{class:"m"+(m.mine?" mine":"")+(m.img?" pic":"")});d.dataset.mid=m.id;
    if(m.img)d.append(picEl(m.img));else
    if(m.ok)d.append(...linkify(m.t==null?"":m.t));else d.append(tr("chat.undecryptable"));
    if(m.lk)d.append(lkCard(m.lk));
    d.append(el("br"),el("time",{},tm(m.ts)));
    if(m.ok||m.img){const ch=rxChips(m);if(ch)d.append(ch);d.append(el("button",{type:"button",class:"rxb","aria-label":tr("rx.ariaReact"),title:tr("rx.react"),onclick:e=>{e.stopPropagation();openRx(m,e.currentTarget)}},"☺"))}
    log.append(d);
  }
  markAn();
  if(!keepPos&&(near||S.justSent))log.scrollTop=log.scrollHeight;S.justSent=false;
}
/* ---------- reaksjoner (kryptert som meldinger; se claude/reaksjoner.md) ---------- */
const RX=[["rofl",tr("rx.name.rofl")],["thumbup",tr("rx.name.thumbup")],["heart",tr("rx.name.heart")],["surprised",tr("rx.name.surprised")],["cry",tr("rx.name.cry")],["thumbdown",tr("rx.name.thumbdown")]];
const RX_OK=new Set(RX.map(x=>x[0]));
async function loadReacts(cid,key){
  try{
    const r=await api.listReactions(cid);
    if(!r||r.error||!Array.isArray(r.data))return null;
    const map=new Map(),parts=[];
    for(const x of r.data){
      const p=await open(key,x.iv,x.ct);
      /* meldings-id og avsender ligger også inne i det krypterte, så serveren ikke kan flytte en reaksjon til en annen melding eller person */
      if(!p||typeof p.r!=="string"||Number(p.m)!==Number(x.msg_id)||p.u!==x.user_id)continue;
      if(p.r===""||!RX_OK.has(p.r))continue;
      let mp=map.get(x.msg_id);if(!mp){mp=new Map();map.set(x.msg_id,mp)}
      mp.set(x.user_id,p.r);parts.push(x.msg_id+":"+x.user_id+":"+p.r);
    }
    parts.sort();return{map,sig:parts.join("|")};
  }catch(e){return null}
}
function rxChips(m){
  const mp=S.rx.get(m.id);if(!mp||!mp.size)return null;
  const g=new Map();for(const[u,r]of mp)g.set(r,(g.get(r)||[]).concat(u));
  const w=el("div",{class:"rxs"});
  for(const[r,us]of g){
    const mine=us.includes(S.user.id),nm=AN_FIG[r][0];
    const b=el("button",{type:"button",class:"rxc"+(mine?" me":""),title:mine?tr("rx.removeMine",{name:nm}):nm,"aria-label":mine?tr("rx.ariaMine",{name:nm,n:us.length}):tr("rx.aria",{name:nm,n:us.length}),onclick:e=>{e.stopPropagation();setReact(m.id,mine?null:r)}});
    b.append(anEl(r),el("span",{},String(us.length)));w.append(b);
  }
  return w;
}
let rxPop=null;
function closeRx(){if(rxPop){rxPop.remove();rxPop=null}}
function openRx(m,anchor){
  closeRx();
  const mine=(S.rx.get(m.id)||new Map()).get(S.user.id);
  const p=el("div",{class:"rxp",role:"menu","aria-label":tr("rx.choose")});
  for(const[r,nm]of RX){
    const b=el("button",{type:"button",class:"rxo"+(mine===r?" me":""),title:nm,"aria-label":nm,onclick:e=>{e.stopPropagation();closeRx();setReact(m.id,mine===r?null:r)}});
    b.append(anEl(r));p.append(b);
  }
  if(m.ok&&m.t!=null&&!m.img)p.append(el("button",{type:"button",class:"rxk",onclick:e=>{e.stopPropagation();closeRx();copyText(String(m.t))}},tr("common.copy")));
  document.body.append(p);rxPop=p;
  const a=anchor.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;
  let x=Math.min(Math.max(8,a.right-w),innerWidth-w-8),y=a.top-h-6;if(y<8)y=a.bottom+6;
  p.style.left=x+"px";p.style.top=y+"px";
}
async function copyText(t){
  try{await navigator.clipboard.writeText(t);toast(tr("msg.copied"));return}catch(e){}
  try{const a=document.createElement("textarea");a.value=t;a.style.cssText="position:fixed;left:-9999px;top:0";document.body.append(a);a.select();const ok=document.execCommand("copy");a.remove();toast(ok?tr("msg.copied"):tr("msg.copyFailed"))}catch(e){toast(tr("msg.copyFailed"))}
}
/* trykk og hold på en melding (berøring) åpner reaksjonsvalget */
let lp=null,lpFired=0;
function lpCancel(){if(lp){clearTimeout(lp.t);lp=null}}
document.addEventListener("pointerdown",e=>{
  if(rxPop&&!e.target.closest(".rxp,.rxb"))closeRx();
  if(e.pointerType!=="touch")return;
  const b=e.target.closest&&e.target.closest("#log .m[data-mid]");
  if(!b||e.target.closest("a,button,.rxs"))return;
  lpCancel();
  const mid=b.dataset.mid;
  lp={x:e.clientX,y:e.clientY,t:setTimeout(()=>{
    lp=null;const m=S.msgs.find(z=>String(z.id)===mid);if(!m||!(m.ok||m.img))return;
    lpFired=Date.now();b.classList.add("lpd");setTimeout(()=>b.classList.remove("lpd"),700);
    try{navigator.vibrate&&navigator.vibrate(10)}catch(x){}
    openRx(m,b);
  },450)};
});
document.addEventListener("pointermove",e=>{if(lp&&Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>10)lpCancel()});
for(const ev of["pointerup","pointercancel"])document.addEventListener(ev,lpCancel,true);
document.addEventListener("scroll",lpCancel,true);
document.addEventListener("contextmenu",e=>{if(e.target.closest&&e.target.closest("#log .m")&&matchMedia("(pointer:coarse)").matches)e.preventDefault()});
/* fingeren løftes etter trykk-og-hold: ikke la det åpne for eksempel bildevisning */
document.addEventListener("click",e=>{if(Date.now()-lpFired<800&&e.target.closest&&e.target.closest("#log")){e.stopPropagation();e.preventDefault()}},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeRx()});
async function setReact(mid,r){
  if(!S.chat)return;
  const cid=S.chat.id,other=S.profiles.get(S.chat.other);if(!other)return;
  try{
    const key=await pairKey(other.pub),s=await seal(key,{r:r||"",m:mid,u:S.user.id});
    const res=await api.saveReaction({msg_id:mid,chat_id:cid,user_id:S.user.id,iv:s.iv,ct:s.ct});
    if(res&&res.error)throw res.error;
    if(!S.chat||S.chat.id!==cid)return;
    let mp=S.rx.get(mid);if(!mp){mp=new Map();S.rx.set(mid,mp)}
    if(r)mp.set(S.user.id,r);else mp.delete(S.user.id);
    drawLog(true);refreshSoon();
  }catch(e){fail(e)}
}
async function sendMsg(payload,file){
  if(!S.chat)return false;
  const other=S.profiles.get(S.chat.other);
  try{
    const key=await pairKey(other.pub),s=await seal(key,payload);
    const row={chat_id:S.chat.id,sender:S.user.id,iv:s.iv,ct:s.ct};
    if(file)row.file=file;
    await q(api.sendMessage(row),tr("ctx.send"));
    S.justSent=true;S.myTyp=null;trackMe(true);refreshSoon();return true;
  }catch(e){fail(e);return false}
}

/* ---------- bilder (krypteres før opplasting) ---------- */
const picCache=new Map();
async function sendImage(file){
  if(!S.chat||!file)return;
  if(!/^image\//.test(file.type||"")){toast(tr("img.onlyImages"),true);return}
  const cid=S.chat.id,other=S.profiles.get(S.chat.other);let path=null;
  try{
    toast(tr("img.sending"));
    let w,h,bytes,t=null;
    const gif=file.type==="image/gif"?await readGif(file):null;
    if(gif){
      if(gif.bytes.length>GIF_MAX){
        /* HVORFOR: for store GIF-er gjøres mindre med animasjonen i behold (Dan Joakim 25. okt), ikke avvist og ikke stillbilde */
        const r=await shrinkGif(file,GIF_MAX,(i,n)=>toast(tr("gif.shrinking",{i,n})));
        ({w,h,bytes}=r);
      }else({w,h,bytes}=gif);
      t="image/gif";
    }else{const r=await shrink(file);w=r.w;h=r.h;bytes=new Uint8Array(await r.blob.arrayBuffer())}
    const key=await pairKey(other.pub),blob=await PrekCrypto.encryptBytes(key,bytes);
    path=cid+"/"+crypto.randomUUID();
    const up=await api.uploadFile(path,blob);
    if(up.error)throw new Error(tr("img.uploadFailed",{msg:up.error.message}));
    const ok=await sendMsg({img:t?{p:path,w,h,t}:{p:path,w,h},ts:Date.now()},path);
    if(!ok){await api.removeFiles([path]);return}
    toast(tr("img.sent"))
  }catch(e){fail(e);if(path)api.removeFiles([path]).then(()=>{},()=>{})}
}
function picEl(img){
  const box=el("span",{class:"pic-box",style:"width:"+Math.min(img.w||240,240)+"px;aspect-ratio:"+(img.w||4)+"/"+(img.h||3)});
  const gifT=img.t==="image/gif"; /* HVORFOR: avsenderens felt, så bare nøyaktig denne verdien godtas */
  const show=u=>{const i=el("img",{alt:gifT?"GIF":tr("img.alt"),src:u,tabindex:"0"});i.addEventListener("click",()=>lightbox(u,gifT));i.addEventListener("keydown",e=>{if(e.key==="Enter")lightbox(u,gifT)});box.textContent="";box.append(i)};
  if(picCache.has(img.p)){show(picCache.get(img.p));return box}
  box.textContent=tr("img.loading");
  const other=S.profiles.get(S.chat.other);
  (async()=>{
    try{
      const r=await api.downloadFile(img.p);if(r.error)throw r.error;
      const buf=new Uint8Array(await r.data.arrayBuffer()),key=await pairKey(other.pub);
      const pt=await PrekCrypto.decryptBytes(key,buf);
      const u=URL.createObjectURL(new Blob([pt],{type:gifT?"image/gif":"image/jpeg"}));picCache.set(img.p,u);show(u);
    }catch(e){box.textContent=tr("img.missing")}
  })();
  return box;
}
function lightbox(u,gif){
  const b=$("#lb");b.textContent="";
  b.append(el("img",{src:u,alt:tr("img.alt")}),el("div",{class:"row"},
    el("a",{class:"btnlink",href:u,download:gif?"prek.gif":"prek-bilde.jpg"},tr("img.download")),el("button",{class:"glass",type:"button",onclick:()=>{b.hidden=true;b.textContent=""}},tr("common.close"))));
  b.hidden=false;
}

/* ---------- kamera i appen ----------
   HVORFOR eget kamera og ikke bare filvelgeren: Dan Joakim vil kunne ta bilde direkte som i andre meldingsapper. getUserMedia gir levende forhåndsvisning,
   bytte mellom fremre og bakre kamera og «Send»/«Ta på nytt». Bildet går deretter samme vei som alle andre bilder (sendImage: skaleres, krypteres).
   Uten støtte eller tillatelse faller vi tilbake til filvelgeren med capture (åpner kameraappen på telefonen). Strømmen stoppes alltid når vinduet lukkes. */
let camStream=null,camFace="environment";
function camStop(){if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null}}
function camClose(){camStop();const c=$("#cam");c.hidden=true;c.textContent=""}
async function camOpen(){
  if(!S.chat)return;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$("#cf").click();return}
  const c=$("#cam");c.textContent="";
  const v=el("video",{class:"camv",autoplay:true,playsinline:true});v.muted=true;
  const ctl=el("div",{class:"camctl"});let blob=null;
  const mkb=(cls,label,fn)=>el("button",{class:cls,type:"button","aria-label":label,title:label,onclick:fn},label===tr("cam.shoot")?"":label);
  const live=()=>{
    blob=null;v.classList.toggle("mir",camFace==="user");
    const shut=mkb("camshut",tr("cam.shoot"),shoot),flip=mkb("glass camside",tr("cam.flip"),()=>{camFace=camFace==="user"?"environment":"user";start()}),cl=mkb("glass camside",tr("cam.cancel"),camClose);
    ctl.textContent="";ctl.append(cl,shut,flip);
  };
  const review=()=>{
    ctl.textContent="";
    ctl.append(mkb("glass camside",tr("cam.retake"),()=>{v.play().catch(()=>{});live()}),mkb("camsend",tr("common.send"),()=>{const b=blob;camClose();if(b)sendImage(new File([b],"kamera.jpg",{type:"image/jpeg"}))}));
  };
  function shoot(){
    if(!v.videoWidth)return;
    const cv=document.createElement("canvas");cv.width=v.videoWidth;cv.height=v.videoHeight;
    cv.getContext("2d").drawImage(v,0,0);
    cv.toBlob(b=>{if(!b)return;blob=b;v.pause();review()},"image/jpeg",.92);
  }
  async function start(){
    camStop();
    try{
      camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:camFace,width:{ideal:1920},height:{ideal:1920}},audio:false});
      v.srcObject=camStream;await v.play().catch(()=>{});live();
    }catch(e){camClose();toast(tr("cam.denied"),true)}
  }
  c.append(v,ctl);c.hidden=false;live();start();
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#cam").hidden)camClose()});

/* ---------- koble knapper ---------- */
function wire(){
  $("#meb").addEventListener("click",()=>{const p=$("#prof"),o=p.hidden;p.hidden=!o;$("#meb").setAttribute("aria-expanded",String(o))});
  $("#infob").addEventListener("click",showInfo);
  $("#outb").addEventListener("click",doLogout);
  $("#lpv").value=LP_ON()?"on":"off";$("#lpv").addEventListener("change",e=>{try{localStorage.setItem("pling_lp",e.target.value==="off"?"0":"1")}catch(x){}});
  $("#thm").value=window.plingThemeGet();$("#thm").addEventListener("change",e=>window.plingTheme(e.target.value));
  $("#pnm").addEventListener("change",()=>{const n=$("#pnm").value.trim();if(!n){$("#pnm").value=S.profile.name;return}if(n!==S.profile.name)saveProfile({name:n.slice(0,24)})});
  $("#pm").addEventListener("keydown",e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape"){e.target.value=S.profile.pm||"";e.target.blur()}});
  $("#pm").addEventListener("change",()=>{const v=$("#pm").value.trim().slice(0,60);saveProfile({pm:v||null})});
  $("#st").addEventListener("change",()=>{
    S.status=$("#st").value;try{localStorage.setItem("pling_st_"+S.user.id,S.status)}catch(e){}
    paintMe();trackMe(true);drawChatHead();
  });
  $("#avf").addEventListener("change",async e=>{
    const f=e.target.files[0];e.target.value="";if(!f)return;
    try{
      const a=await toAvatar(f);if(!okAv(a))throw new Error(tr("img.avatarTooBig"));
      await q(api.saveAvatar({id:S.user.id,data:a,updated_at:new Date().toISOString()}),tr("ctx.saveAvatar"));
      myAv=a;try{localStorage.setItem("pling_av_"+S.user.id,a);localStorage.setItem("pling_last_av",a)}catch(x){}
      paintMe();drawChatHead();toast(tr("avatar.saved"));
    }catch(err){fail(err)}
  });
  $("#addf").addEventListener("click",()=>{const p=$("#addfp"),o=p.hidden;p.hidden=!o;$("#addf").setAttribute("aria-expanded",String(o));if(o)$("#fe").focus()});
  const add=async()=>{
    const v=$("#fe").value.trim(),err=$("#ferr");err.textContent="";if(!v)return;
    try{
      const f=await q(api.findByEmail(v),tr("ctx.search"));
      if(!f.length){err.textContent=tr("friend.notFound");return}
      const r=await q(api.sendRequest(f[0].id),tr("ctx.request"));
      toast(r==="friends"?tr("friend.nowFriends"):tr("friend.requestSent",{name:f[0].name}));$("#fe").value="";$("#addfp").hidden=true;$("#addf").setAttribute("aria-expanded","false");refresh();
    }catch(e){fail(e)}
  };
  $("#fadd").addEventListener("click",add);
  $("#fe").addEventListener("keydown",e=>{if(e.key==="Enter")add()});
  /* samtale */
  $("#back").addEventListener("click",closeChat);
  $("#mb").addEventListener("click",()=>{const m=$("#menu"),o=m.hidden;m.hidden=!o;$("#mb").setAttribute("aria-expanded",String(o))});
  $("#pr").addEventListener("click",()=>$("#mb").click());
  $("#ex").addEventListener("change",async()=>{
    if(!S.chat)return;const v=+$("#ex").value,cid=S.chat.id;
    try{await q(api.setChatExpiry(cid,v),tr("ctx.changeExpiry"));S.exp.set(cid,v);drawExp();toast(v?tr("exp.on",{when:dagTxt(v)}):tr("exp.off"))}
    catch(e){fail(e);drawExp()}
  });
  const sure=(btn,label,fn)=>{let s=false,t;btn.addEventListener("click",()=>{
    if(!s){s=true;btn.textContent=tr("common.sure");t=setTimeout(()=>{s=false;btn.textContent=label},3500);return}
    clearTimeout(t);s=false;btn.textContent=label;fn()})};
  sure($("#bx"),tr("chat.deleteMine"),async()=>{try{
    const mine=S.msgs.filter(m=>m.mine&&m.img).map(m=>m.img.p);
    if(mine.length)await api.removeFiles(mine);
    await q(api.deleteMyMessages(S.chat.id,S.user.id),tr("ctx.delete"));S.sig=null;toast(tr("msg.mineDeleted"));refreshSoon()}catch(e){fail(e)}});
  sure($("#bfr"),tr("chat.removeFriend"),async()=>{try{await q(api.removeFriend(S.chat.other),tr("ctx.removeFriend"));closeChat();refresh()}catch(e){fail(e)}});
  $("#bmu").addEventListener("click",()=>{if(!S.chat)return;const id=S.chat.other,on=!muted(id);setMuted(id,on);drawMute();drawFriends();toast(on?tr("mute.on"):tr("mute.off"))});
  sure($("#bbl"),tr("chat.block"),async()=>{try{await q(api.blockUser(S.chat.other),tr("ctx.block"));closeChat();toast(tr("block.done"));refresh()}catch(e){fail(e)}});
  $("#bd").addEventListener("click",()=>{
    const t=S.msgs.map(m=>"["+new Date(m.ts).toLocaleString("nb-NO")+"] "+(m.mine?S.profile.name:nameOf(S.chat.other))+": "+(m.dp?tr("chat.dlDp"):m.img?tr("chat.dlImage"):m.ok?m.t:tr("chat.undecryptable"))).join("\n");
    download("prek-samtale.txt",t+"\n");
  });
  const tx=$("#tx");
  const send=async()=>{
    const t=tx.value.trim();if(!t)return;tx.value="";drawPv();
    const pl={t,ts:Date.now()},u=LP_ON()?firstUrl(t):null,sd=$("#sd");
    if(u){sd.disabled=true;sd.textContent="…";try{const lk=await fetchPreview(u);if(lk)pl.lk=lk}finally{sd.disabled=false;sd.textContent=tr("common.send")}}
    if(!await sendMsg(pl)){tx.value=t;drawPv()}};
  $("#sd").addEventListener("click",send);
  tx.addEventListener("keydown",e=>{if(e.key==="Enter")send()});
  /* «skriver …»: første tastetrykk etter en pause sendes med en gang, så sendes det hvert 2. sekund mens du skriver. Tomt felt sender «ikke skriver» med en gang. */
  tx.addEventListener("input",()=>{if(!S.chat)return;const now=Date.now();
    if(!tx.value){S.myTyp=null;trackMe(true);return}
    const first=!S.myTyp||now-S.myTyp.n>3000;S.myTyp={c:S.chat.id,n:now};trackMe(first)});
  /* forhåndsvisning av smilefjes mens du skriver (27. oktober): vises bare når teksten inneholder en kode; selve meldingen sendes som før */
  const epv=$("#epv");
  const drawPv=()=>{const t=tx.value;epv.textContent="";if(!t){epv.hidden=true;return}
    const ns=emojiNodes(t);if(!ns.some(n=>typeof n!=="string")&&ns.join("")===t){epv.hidden=true;return}
    ns.forEach(n=>epv.append(n));epv.hidden=false};
  tx.addEventListener("input",drawPv);
  const emo=$("#emo");
  const put=t=>{const v=tx.value,pre=v&&!/\s$/.test(v)?" ":"";tx.value=v+pre+t+" ";drawPv();tx.focus()};
  const FIGS=[[":)","smile"],[":D","grin"],[";)","wink"],[":(","sad"],[":P","tongue"],[":O","surprised"],[":'(","cry"],["xD","xd"],["(lol)","lol"],[":L","rofl"],["(Y)","yes"],["(N)","no"],[":-@","angry"],["(H)","cool"],["8-)","glasses"],["(6)","devil"],["(A)","angel"],["(K)","kiss"],["<3","heart"],["(U)","broken"],["(b)","beer"],["(*)","star"],["(brb)","hourglass"]];
  const pf=el("div",{class:"eg"}),pe=el("div",{class:"eg",hidden:true});
  for(const[c,id]of FIGS){const b=el("button",{type:"button",class:"ef",title:c+" ("+AN_FIG[id][0]+")","aria-label":tr("emo.pickAria",{name:AN_FIG[id][0],code:c}),onclick:()=>put(c)});b.append(anEl(id));pf.append(b)}
  for(const e of ["😊","😃","😉","🙁","😛","❤️","👍","👎","😮","😎","😈","😇","😢","💋","💔","🎉"]){
    pe.append(el("button",{type:"button",class:"ef",onclick:()=>{tx.value+=e;drawPv();tx.focus()}},e));
  }
  const t1=el("button",{type:"button",class:"etab on"},tr("emo.tabFigures")),t2=el("button",{type:"button",class:"etab"},tr("emo.tabEmoji"));
  const tab=n=>{pf.hidden=n!==1;pe.hidden=n!==2;t1.classList.toggle("on",n===1);t2.classList.toggle("on",n===2)};
  t1.onclick=()=>tab(1);t2.onclick=()=>tab(2);
  emo.append(el("div",{class:"etabs"},t1,t2),pf,pe);
  $("#ab").addEventListener("click",()=>$("#af").click());
  $("#cb").addEventListener("click",camOpen);
  $("#cf").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(f)sendImage(f)});
  $("#af").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(f)sendImage(f)});
  tx.addEventListener("paste",e=>{const f=[...(e.clipboardData&&e.clipboardData.files||[])].find(f=>/^image\//.test(f.type));if(f){e.preventDefault();sendImage(f)}});
  $("#lb").addEventListener("click",e=>{if(e.target.id==="lb"){$("#lb").hidden=true;$("#lb").textContent=""}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#lb").hidden){$("#lb").hidden=true;$("#lb").textContent=""}});
  $("#eb").addEventListener("click",()=>{emo.hidden=!emo.hidden});
  $("#dp").addEventListener("click",async()=>{
    if(Date.now()<S.cdUntil)return;
    if(await sendMsg({dp:1,ts:Date.now()})){S.cdUntil=Date.now()+60000;cdTick();clearInterval(S.cdT);S.cdT=setInterval(cdTick,1000);dobbelt()}
  });
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.user)refreshSoon()});
}
function cdTick(){const l=Math.ceil((S.cdUntil-Date.now())/1000),b=$("#dp");
  if(l>0){b.disabled=true;b.textContent=tr("chat.dpCooldown",{n:l})}else{b.disabled=false;b.textContent=tr("chat.dp");clearInterval(S.cdT)}}

/* ---------- start ---------- */
(function(){
  document.querySelectorAll("[data-prk]").forEach(e=>e.append(prk(e.dataset.prk)));
  $("#tbi").hidden=true;
  const a=$("#amb"),cl=["on","on","away","on","busy","on","away"];
  [[8,18],[82,12],[16,72],[70,78],[48,8],[90,54],[30,40]].forEach((p,i)=>{const f=ff(cl[i]);f.style.left=p[0]+"%";f.style.top=p[1]+"%";f.style.animationDuration=(7+i)+"s";f.style.animationDelay=(-i*1.3)+"s";f.firstChild.style.animationDelay=(-i*.7)+"s";a.append(f)});
})();
api.onAuthChange((ev,session)=>{
  S.tok=session&&session.access_token||null;
  if(session&&session.user){if(!S.user||S.user.id!==session.user.id)setTimeout(()=>afterLogin(session.user).catch(e=>fail(e)),0)}
  else{S.user=null;S.profile=null;S.id=null;S.chat=null;S.pres=new Map();S.reads=new Map();S.last=new Map();S.unread=new Map();S.exp=new Map();S.av=new Map();S.profiles=new Map();S.firstRef=true;S.older=[];clearInterval(S.poll);clearInterval(S.pp);clearInterval(S.pbT);clearInterval(S.pfT);S.pairId=null;api.closeLive();S.pch=null;myAv=null;viewLogin()}
});
api.getSession().then(({data})=>{if(!data.session)viewLogin()});
