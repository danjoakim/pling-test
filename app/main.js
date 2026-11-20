/*@@PROTO@@*/
/* ---------- tilstand ---------- */
const S=PrekState.createState(); // the whole state, described in src/state.ts
const api=PrekApi.createApi(sb); // typed server functions, src/api.ts
/* logo: «prek» med skrå skrift, tegnet som former (ikke tekst), så den ser lik ut uten skriften Inter. Kula bakerst er statusen (CSS-variabelen --dot), fargen på bokstavene følger temaet (--lgc). Se claude/utseende.md. */
const PRK='<svg class="prk" viewBox="-20 -40 2650 1010" overflow="visible" role="img" aria-label="prek" xmlns="http://www.w3.org/2000/svg"><g style="fill:var(--dot,#43d65a)"><circle cx="2403" cy="625" r="215" opacity=".08"/><circle cx="2403" cy="625" r="170" opacity=".1"/><circle cx="2403" cy="625" r="125"/></g><g transform="translate(200 0) skewX(-12)"><path d="M46.9 931.0H243.0V637.2H246.0C268.4 692.8 320.6 733.8 397.2 733.8C513.8 733.8 611.9 643.1 611.9 454.7C611.9 257.1 507.0 174.7 399.2 174.7C318.2 174.7 267.0 221.5 246.0 277.1H241.1V181.5H46.9ZM325.0 583.6C271.3 583.6 238.2 533.8 238.2 454.7C238.2 373.7 271.3 325.0 325.0 325.0C379.2 325.0 409.9 373.7 409.9 454.7C409.9 535.2 379.2 583.6 325.0 583.6ZM656.1 727.0H852.3V442.8C852.3 380.3 894.8 339.3 952.9 339.3C972.9 339.3 1005.7 342.2 1025.2 349.1V182.1C1009.6 177.2 992.5 174.3 975.4 174.3C917.3 174.3 871.9 208.4 852.3 285.6H846.5V181.1H656.1ZM1289.1 736.8C1428.3 736.8 1520.1 675.2 1547.9 577.1L1375.1 551.7C1363.3 582.0 1333.1 599.1 1293.0 599.1C1238.8 599.1 1202.7 566.8 1200.2 499.5H1555.7V454.5C1555.7 280.7 1449.3 174.3 1284.2 174.3C1115.3 174.3 1007.9 286.6 1007.9 455.5C1007.9 632.3 1113.8 736.8 1289.1 736.8ZM1201.7 392.0C1207.6 340.3 1236.4 312.0 1286.2 312.0C1336.0 312.0 1364.8 340.3 1370.7 392.0ZM1602.8 727.0H1799.1V571.7L1828.4 534.6L1939.8 727.0H2163.4L1973.0 420.4L2158.5 181.1H1937.8L1806.0 364.7H1799.1V-0.5H1602.8Z" style="fill:var(--lgc,#1b5fb8);stroke:var(--lgc,#1b5fb8)" stroke-width="37" stroke-linejoin="round"/></g><circle cx="2403" cy="625" r="125" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="14"/></svg>';
const DOT={on:"#43d65a",away:"#f6b830",busy:"#ee4b3f",off:"#9aa7b5"};
function ico(c){const s=document.createElement("span");s.className="icow "+(c||"");s.innerHTML='<svg viewBox="0 0 96 96" aria-hidden="true"><defs><linearGradient id="icg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b5fb8"/><stop offset="1" stop-color="#10304f"/></linearGradient></defs><rect width="96" height="96" rx="22" fill="url(#icg)"/><svg x="0" y="0" width="96" height="96" viewBox="-30 40 1000 1000"><g transform="translate(200 0) skewX(-12)"><path d="M46.9 931.0H243.0V637.2H246.0C268.4 692.8 320.6 733.8 397.2 733.8C513.8 733.8 611.9 643.1 611.9 454.7C611.9 257.1 507.0 174.7 399.2 174.7C318.2 174.7 267.0 221.5 246.0 277.1H241.1V181.5H46.9ZM325.0 583.6C271.3 583.6 238.2 533.8 238.2 454.7C238.2 373.7 271.3 325.0 325.0 325.0C379.2 325.0 409.9 373.7 409.9 454.7C409.9 535.2 379.2 583.6 325.0 583.6Z" fill="#eef6fd" stroke="#eef6fd" stroke-width="37" stroke-linejoin="round"/></g><circle cx="810" cy="655" r="100" style="fill:var(--dot)"/></svg></svg>';return s}
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
        toast(tr("device.sent"));S.pairId=null;box.textContent=""}catch(err){fail(err)}}},tr("device.approveButton")),
      el("button",{class:"glass",id:"pdeny",onclick:async()=>{try{await q(api.deleteTransfer(r.id),tr("ctx.reject"));S.pairId=null;box.textContent=""}catch(err){fail(err)}}},tr("device.denyButton")))));
}

/* ---------- invitasjonslenker ----------
   HVORFOR i #-delen (fragmentet): den sendes aldri til noen tjener (heller ikke GitHub Pages). Tokenet er 128 bit tilfeldig, og bare SHA-256 av det lagres i databasen,
   så en lekkasje fra databasen ikke gir brukbare lenker. En lenke kan brukes én gang og varer i 7 dager. Den som åpner den blir kompis med den som inviterte (ingen forespørsel å godta),
   så lenken skal bare deles med den man vil ha som kompis. Tokenet lagres i nettleseren til personen har logget inn og har profil (pling_inv), og slettes når den er brukt. */
(function(){try{
  const iv=inviteFromHash(location.hash);
  if(iv.token){localStorage.setItem("pling_inv",iv.token);S.mode="up"}
  if(iv.rest!==null)history.replaceState(null,"",location.pathname+location.search+(iv.rest?"#"+iv.rest:""))
}catch(e){}})();
async function redeemPending(){
  let t=null;try{t=localStorage.getItem("pling_inv")}catch(e){}
  if(!t)return;
  try{localStorage.removeItem("pling_inv")}catch(e){}
  try{
    const r=await q(api.redeemInvite(t),tr("ctx.invitation")),f=r&&r[0];
    toast(tr("invite.nowFriends",{name:f?f.name:tr("invite.fallbackName")}));await refresh();
  }catch(e){toast(tr("invite.failed"),true)}
}
// "Har du fått en kode?" (phone layout): paste an invitation link or the bare code from it.
async function redeemCode(txt){
  txt=String(txt||"").trim();if(!txt)return;
  const iv=inviteFromHash(txt.includes("#")?txt.slice(txt.indexOf("#")):"#inv="+txt);
  if(!iv.token)return toast(tr("invite.badCode"),true);
  try{localStorage.setItem("pling_inv",iv.token)}catch(e){}
  await redeemPending();$("#cd2").value="";
}
/* Skann kompisens kode (telefon): kameraet leser QR-koden i invitasjonen. Biblioteket lib/jsqr.js lastes først når skanneren åpnes. */
let scanStop=null;
function loadJsQR(){return window.jsQR?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement("script");s.src="lib/jsqr.js";s.onload=ok;s.onerror=no;document.head.append(s)})}
async function scanOpen(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return toast(tr("scan.noCam"),true);
  let stream;
  try{await loadJsQR();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false})}catch(e){return toast(tr("scan.noCam"),true)}
  const o=$("#info");o.textContent="";
  const v=el("video",{class:"scanv",autoplay:true,playsinline:true});v.muted=true;v.srcObject=stream;
  const done=()=>{scanStop=null;try{stream.getTracks().forEach(t=>t.stop())}catch(e){}cancelAnimationFrame(raf);closeInfo()};
  scanStop=done;let raf=0;
  const box=el("div",{class:"infob scanb",role:"dialog","aria-modal":"true","aria-label":tr("nav.scanBtn")},v,el("div",{class:"scanfr","aria-hidden":"true"}),el("div",{class:"scanhint"},tr("scan.hint")),el("button",{class:"glass scanx",type:"button",onclick:done},tr("del.cancel")));
  o.classList.add("pg","scan");o.append(box);o.hidden=false;o.onclick=null;
  const cv=document.createElement("canvas"),cx=cv.getContext("2d",{willReadFrequently:true});
  const tick=()=>{
    if(!scanStop)return;
    if(v.readyState>=2&&v.videoWidth){
      const w=Math.min(640,v.videoWidth),h=Math.round(w*v.videoHeight/v.videoWidth);cv.width=w;cv.height=h;cx.drawImage(v,0,0,w,h);
      const r=window.jsQR(cx.getImageData(0,0,w,h).data,w,h);
      if(r&&r.data){const t=String(r.data);if(/#inv=|^[A-Za-z0-9_-]{16,}$/.test(t)){done();redeemCode(t);return}}
    }
    raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);
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
      /* Gjenbruk lenken fra sist så lenge den er gyldig (over 1 time igjen), ellers lages én ny. */
      const key="pling_myinv_"+(S.user&&S.user.id);let tok=null;
      try{const o=JSON.parse(localStorage.getItem(key)||"null");if(o&&o.t&&o.e&&new Date(o.e).getTime()>Date.now()+36e5)tok=o.t}catch(e){}
      if(!tok){
        tok=b64url(crypto.getRandomValues(new Uint8Array(16)));const hs=await PrekCrypto.inviteHash(tok);
        const ex=await q(api.createInvite(hs),tr("ctx.createInvite"));
        try{localStorage.setItem(key,JSON.stringify({t:tok,e:ex}))}catch(e){}
      }
      const link=appUrl()+"#inv="+tok;
      box.textContent="";
      const q1=el("div",{class:"qr",id:"invqr"});q1.innerHTML=qrSvg(link);
      const inp=el("input",{id:"invlink",readonly:true,value:link,"aria-label":tr("invite.linkAria")});
      inp.addEventListener("focus",()=>inp.select());
      const row=el("div",{class:"row"},
        el("button",{class:"glass sm",id:"invcopy",type:"button",onclick:async()=>{try{await navigator.clipboard.writeText(link);toast(tr("invite.copied"))}catch(e){inp.select();toast(tr("invite.selectToCopy"),true)}}},tr("nav.copyLink")));
      if(!navigator.share)row.classList.add("noshare");
      if(navigator.share)row.append(el("button",{class:"glass sm",type:"button",onclick:()=>navigator.share({title:"Prek!",text:tr("invite.shareText"),url:link}).catch(()=>{})},el("span",{class:"shic","aria-hidden":"true"}),tr("nav.shareLink")));
      box.append(q1,el("div",{class:"scantxt"},tr("nav.scanText")),inp,row,el("div",{class:"fine"},tr("invite.validity")),
        el("button",{class:"llink",type:"button",onclick:async()=>{try{const n=await q(api.revokeInvites(),tr("ctx.revokeInvites"));try{localStorage.removeItem("pling_myinv_"+(S.user&&S.user.id))}catch(e){}toast(tr("invite.revoked",{n}));drawInvite()}catch(e){fail(e)}}},tr("invite.revokeAll")));
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
  // Phone: a full page like Slett konto, so the close button sits below the status bar (class pg; the title span is hidden on desktop)
  box.append(el("div",{class:"infoh"},el("b",{},tr("info.title")),el("span",{class:"pgt"},tr("info.title")),el("button",{class:"glass sm",type:"button","aria-label":tr("info.close"),onclick:closeInfo},tr("info.close"))));
  const body=el("div",{class:"infot"});
  for(const [h,ps] of INFO){
    body.append(el("h3",{},h));
    for(const p of ps){
      if(Array.isArray(p)){const ul=el("ul",{class:"pl"});for(const t of p.slice(1))ul.append(el("li",{},t));body.append(ul)}
      else body.append(el("p",{},p));
    }
  }
  body.append(el("p",{class:"fine"},tr("info.version",{v:PREK_VERSION,b:PREK_BUILD})));
  box.append(body);o.classList.add("pg");o.append(box);o.hidden=false;
  o.onclick=e=>{if(e.target===o)closeInfo()};
  box.querySelector("button").focus();
}
let infoUndo=[];
function closeInfo(){const o=$("#info");for(const f of infoUndo.splice(0))try{f()}catch(e){}o.hidden=true;o.textContent="";o.classList.remove("pg")}
/* Hel side på telefon (som Slett konto og Rapporter): topplinje med tilbake, hvitt ark under. Eksisterende elementer flyttes inn og settes tilbake når siden lukkes. */
function showPage(title,build){
  const o=$("#info");for(const f of infoUndo.splice(0))try{f()}catch(e){}o.textContent="";
  const box=el("div",{class:"infob",role:"dialog","aria-modal":"true","aria-label":title}),body=el("div",{class:"infot"});
  box.append(el("div",{class:"infoh"},el("b",{},title),el("span",{class:"pgt"},title),el("button",{class:"glass sm",type:"button","aria-label":tr("del.cancel"),onclick:closeInfo},tr("del.cancel"))),body);
  build(body);o.classList.add("pg");o.append(box);o.hidden=false;o.onclick=e=>{if(e.target===o)closeInfo()};
}
function lend(node,into){const p=node.parentNode,n=node.nextSibling;into.append(node);infoUndo.push(()=>p.insertBefore(node,n))}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#info").hidden)closeInfo()});

/* Slett konto (Apple 5.1.1(v)). Serveren sletter alt (edge-funksjonen delete-account, se claude/slett-konto.md); her rydder vi bare denne enheten etterpå: nøkkelen og det som hører til brukeren, og så ut. */
function showDelete(){
  const o=$("#info");o.textContent="";
  const word=tr("del.word"),inp=el("input",{type:"text",autocomplete:"off",autocapitalize:"off",spellcheck:"false","aria-label":tr("del.label")}),
    go=el("button",{class:"glass dng",type:"button",disabled:true},tr("del.go")),msg=el("div",{class:"fine err"});
  const box=el("div",{class:"infob",role:"dialog","aria-modal":"true","aria-label":tr("del.title")});
  box.append(el("div",{class:"infoh"},el("b",{},tr("del.title")),el("span",{class:"pgt"},tr("del.open")),el("button",{class:"glass sm",type:"button","aria-label":tr("del.cancel"),onclick:closeInfo},tr("del.cancel"))));
  const ul=el("ul",{});for(const t of [tr("del.l1"),tr("del.l2"),tr("del.l3"),tr("del.l4")])ul.append(el("li",{},t));
  const ico=el("span",{class:"pgico","aria-hidden":"true"});ico.innerHTML='<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>';
  box.append(el("div",{class:"infot"},ico,el("h2",{class:"pgh2"},tr("del.title")),el("p",{class:"pglead"},tr("del.lead")),ul,el("p",{class:"pgnote"},tr("del.note")),el("label",{class:"fine pglbl"},tr("del.label")),inp,el("div",{class:"pgsp"}),go,el("button",{class:"pgcancel",type:"button",onclick:closeInfo},tr("del.cancel")),msg));
  o.classList.add("pg");
  o.append(box);o.hidden=false;o.onclick=e=>{if(e.target===o)closeInfo()};
  inp.addEventListener("input",()=>{go.disabled=inp.value.trim().toLowerCase()!==word});
  go.addEventListener("click",async()=>{
    if(go.disabled)return;go.disabled=true;inp.disabled=true;go.textContent=tr("del.busy");msg.textContent="";
    let r;try{r=await api.deleteAccount()}catch(e){r={error:e}}
    if(r&&!r.error&&r.data&&r.data.ok){
      const uid=S.user&&S.user.id;
      try{Object.keys(localStorage).filter(k=>(uid&&k.indexOf(uid)>=0)||/^pling_(st_next|inv)$/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}
      try{await api.signOut(true)}catch(e){}
      try{Object.keys(localStorage).filter(k=>/^sb-.*-auth-token/.test(k)).forEach(k=>localStorage.removeItem(k))}catch(e){}
      location.reload();return}
    msg.textContent=tr("del.failed");go.textContent=tr("del.go");inp.disabled=false;go.disabled=inp.value.trim().toLowerCase()!==word});
  inp.focus();
}
function pgField(label,input){return el("label",{class:"pgf"},el("span",{class:"pglbl"},label),input)}
function pageName(){
  showPage(tr("me.rowName"),body=>{
    const n=el("input",{type:"text",maxlength:"24",autocomplete:"off",value:S.profile.name,"aria-label":tr("me.nameLbl")}),m=el("input",{type:"text",maxlength:"60",autocomplete:"off",value:S.profile.pm||"","aria-label":tr("me.pmLbl")});
    n.addEventListener("change",()=>{const v=n.value.trim();if(!v){n.value=S.profile.name;return}if(v!==S.profile.name)saveProfile({name:v.slice(0,24)})});
    m.addEventListener("change",()=>saveProfile({pm:m.value.trim().slice(0,60)||null}));
    body.append(pgField(tr("me.nameLbl"),n),pgField(tr("me.pmLbl"),m),el("div",{class:"pgsp"}),el("button",{class:"glass pgprim",type:"button",onclick:()=>{n.blur();m.blur();closeInfo()}},tr("me.done")));
  });
}
function pageAbout(){
  showPage(tr("me.about"),body=>{
    const t=el("textarea",{maxlength:"200",rows:"6","aria-label":tr("me.about"),placeholder:tr("me.aboutEmpty")});t.value=S.profile.about||"";
    const cnt=el("div",{class:"pgcnt"});const pc=()=>{cnt.textContent=t.value.length+"/200"};pc();t.addEventListener("input",pc);
    const msg=el("div",{class:"fine err"}),go=el("button",{class:"glass pgprim",type:"button"},tr("me.save"));
    go.onclick=async()=>{go.disabled=true;await saveProfile({about:t.value.trim().slice(0,200)||null});go.disabled=false;if(S.paintAbout)S.paintAbout();closeInfo()};
    body.append(t,cnt,el("div",{class:"mal"},tr("me.aboutNote")),el("div",{class:"pgsp"}),go,msg);
  });
}
function pageDevices(){
  showPage(tr("me.rowDevices"),body=>{lend($("#seccard"),body)});
}
function pageSettings(){
  showPage(tr("me.rowSettings"),body=>{
    for(const[id,lb]of[["#thm",tr("html.thm.aria")],["#lpv",tr("html.lpv.aria")]]){const f=el("label",{class:"pgf"},el("span",{class:"pglbl"},lb));body.append(f);lend($(id),f)}
    const bg=el("div",{class:"pgblk"});body.append(bg);lend($("#bgrp"),bg);lend($("#blist"),bg);
    body.append(el("button",{class:"glass sm pgbtn",type:"button",onclick:showInfo},tr("info.title")));
    body.append(el("button",{class:"glass sm pgbtn dng",id:"delset",type:"button",onclick:showDelete},tr("del.open")));
  });
}
/* Rapporter én melding (Apple 1.2). Bare den valgte meldingen sendes, som klartekst; resten av samtalen er fortsatt kryptert. Se claude/personvern.md. */
function showReport(m){
  const o=$("#info");o.textContent="";const nm=nameOf(S.chat.other),cid=S.chat.id;
  const reasons=[["spam",tr("rpt.spam")],["threat",tr("rpt.threat")],["offensive",tr("rpt.offensive")],["other",tr("rpt.other")]];
  let pick="spam",blk=true;
  const box=el("div",{class:"infob",role:"dialog","aria-modal":"true","aria-label":tr("rpt.title")});
  box.append(el("div",{class:"infoh"},el("b",{},tr("rpt.title")),el("span",{class:"pgt"},tr("rpt.title")),el("button",{class:"glass sm",type:"button","aria-label":tr("del.cancel"),onclick:closeInfo},tr("del.cancel"))));
  const quote=el("div",{class:"rptq"},m.img?tr("rpt.img"):String(m.t==null?"":m.t));
  const grp=el("div",{class:"rptr",role:"radiogroup","aria-label":tr("rpt.title")}),opts=[];
  const paint=()=>{for(const[b,k]of opts){b.setAttribute("aria-checked",String(k===pick));b.classList.toggle("on",k===pick)}};
  for(const[k,lb]of reasons){const b=el("button",{type:"button",role:"radio",class:"rptro"},el("span",{class:"rpto"},el("span",{})),el("span",{},lb));b.onclick=()=>{pick=k;paint()};opts.push([b,k]);grp.append(b)}
  paint();
  const bl=el("button",{type:"button",role:"checkbox",class:"rptb"},el("span",{class:"rptc"}),el("span",{},tr("rpt.block",{name:nm})));
  const bp=()=>{bl.setAttribute("aria-checked",String(blk));bl.classList.toggle("on",blk)};bp();bl.onclick=()=>{blk=!blk;bp()};
  const note=el("div",{class:"rptn"},el("span",{}, tr("rpt.note")));
  const msg=el("div",{class:"fine err"}),go=el("button",{class:"glass pgprim",type:"button"},tr("rpt.send"));
  box.append(el("div",{class:"infot"},el("p",{class:"rptask"},tr("rpt.ask",{name:nm})),quote,grp,bl,note,el("div",{class:"pgsp"}),go,el("button",{class:"pgcancel",type:"button",onclick:closeInfo},tr("del.cancel")),msg));
  o.classList.add("pg");o.append(box);o.hidden=false;o.onclick=e=>{if(e.target===o)closeInfo()};
  go.addEventListener("click",async()=>{
    if(go.disabled)return;go.disabled=true;go.textContent=tr("rpt.sending");msg.textContent="";
    let r;try{r=await api.reportMessage(cid,m.id,pick,m.img?tr("rpt.img"):String(m.t==null?"":m.t),blk)}catch(e){r={error:e}}
    if(r&&!r.error){closeInfo();toast(tr("rpt.done"));if(blk){closeChat();refresh()}return}
    msg.textContent=tr("rpt.failed");go.textContent=tr("rpt.send");go.disabled=false});
  go.focus();
}
/* Logg ut. supabase-js sin signOut() avbryter uten å gjøre noe hvis kallet mot serveren feiler (nett, utløpt økt, uventet svar), og da ble brukeren stående på skjermen. Derfor: prøv vanlig utlogging, ellers lokalt, ellers fjern økten for hånd og last siden på nytt. */
async function doLogout(){
  await dropPush();
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
  initPush();
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
  const now=Date.now(),plan=trackPlan(now,S.lastTrack,force);
  if(plan){
    if(!S.trT)S.trT=setTimeout(()=>{S.trT=0;trackMe(true)},plan.wait);
    return}
  S.lastTrack=now;
  const typ=typingToSend(S.myTyp,now);
  api.setPresence(S.status,typ).then(()=>{},()=>{});
}
let prT=0,prBusy=false,prAgain=false;const typAt=new Map();
function presSoon(){clearTimeout(prT);prT=setTimeout(pullPresence,250)}
/* Raden som endret seg følger med i Realtime-hendelsen (bare rader vi har lov til å se, altså kompiser og oss selv). Bruker den med en gang, så «skriver …» vises uten ekstra runde mot serveren. Listen hentes likevel rett etterpå som kontroll. (26. okt: «skriver» kom for sent.) */
function presEvt(p){
  const res=applyPresenceEvent({me:S.user?S.user.id:null,pres:S.pres,typ:S.typ,typAt,isStatus:s=>!!ST[s]},p,Date.now());
  if(!res.used){presSoon();return}
  if(res.redraw){drawFriends();drawChatHead()}
  drawTyping();presSoon();
}
async function pullPresence(){
  if(!S.user)return;
  if(prBusy){prAgain=true;return}
  prBusy=true;
  try{
    const r=await api.getPresence();if(r.error||!S.user)return;
    const m=presenceFromRows(r.data||[],{me:S.user.id,status:S.status,typ:S.typ,isStatus:s=>!!ST[s],stale:PRES_STALE},Date.now());
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
function muted(id){let raw=null;try{raw=localStorage.getItem(muteKey())}catch(e){}return isMuted(raw,id)}
function setMuted(id,on){let raw=null;try{raw=localStorage.getItem(muteKey())}catch(e){}const v=withMuted(raw,id,on);try{localStorage.setItem(muteKey(),v)}catch(e){}
  if(S.user)api.setPushMute(S.user.id,id,on).then(()=>{},()=>{})}
/* Serveren kjenner ikke den lokale demp-lista, så push for dempede venner må stoppes der. Synk ved oppstart. */
async function syncPushMutes(){try{const ids=JSON.parse(localStorage.getItem(muteKey())||"[]");if(!Array.isArray(ids))return;const have=new Set(((await api.listPushMutes()).data||[]).map(r=>r.muted_id));for(const id of ids)if(!have.has(id))await api.setPushMute(S.user.id,id,true);for(const id of have)if(!ids.includes(id))await api.setPushMute(S.user.id,id,false)}catch(e){}}
function drawMute(){const b=$("#bmu");if(!b||!S.chat)return;b.textContent=muted(S.chat.other)?tr("mute.unmuteButton"):tr("mute.muteButton")}
function stOf(id){return S.pres.get(id)||"off"}

/* ---------- data ---------- */
async function refresh(){
  if(!S.user||!S.profile)return;
  try{
    const [fr,rq]=await Promise.all([q(api.listFriends(),tr("ctx.friends")),q(api.listRequests(),tr("ctx.requests"))]);
    const rel=relations(S.user.id,fr,rq),ids=rel.ids;
    S.friends=rel.friends;S.reqIn=rel.reqIn;S.reqOut=rel.reqOut;
    if(ids.length){const ps=await q(api.getProfiles(ids),tr("ctx.profiles"));ps.forEach(p=>S.profiles.set(p.id,p))}
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
  S.peerRead=S.peerRead||new Map();let pr=false;
  for(const r of rr){
    if(r.user_id&&r.user_id!==S.user.id){const o=S.peerRead.get(r.chat_id)||0;if(+r.last_id>o){S.peerRead.set(r.chat_id,+r.last_id);pr=true}continue}
    hasSrv.add(r.chat_id);S.reads.set(r.chat_id,Math.max(S.reads.get(r.chat_id)||0,+r.last_id))}
  if(pr&&S.chat)setTimeout(()=>{if(S.chat)drawLog(true)},0);
  const mine=new Set(cm.filter(r=>r.user_id===S.user.id).map(r=>r.chat_id));
  /* engangs-flytting av «lest» som tidligere lå bare i nettleseren */
  for(const cid of mine)if(!hasSrv.has(cid)){let l=0;try{l=+localStorage.getItem(readKey(cid))||0}catch(e){}if(l>0)setRead(cid,l)}
  const dm=dmChats(cm,S.user.id,S.friends);
  let more=false;
  await Promise.all([...dm].map(async([fid,cid])=>{
    const p=S.profiles.get(fid);if(!p)return;
    const rows=await q(api.latestMessages(cid,20),tr("ctx.messages"));
    if(!rows.length){S.last.delete(fid);S.unread.set(fid,0);return}
    const key=await pairKey(p.pub),top=rows[0],m=await open(key,top.iv,top.ct);
    S.last.set(fid,{id:top.id,mine:top.sender===S.user.id,t:previewText(m),at:top.created_at});
    const isOpen=S.chat&&S.chat.id===cid;
    if(isOpen)setRead(cid,top.id);
    const rd=getRead(cid);
    if(!S.firstRef)for(const r of rows)if(dpCandidate(r,S.user.id,rd,dpSeen,Date.now())){
      const mm=await open(key,r.iv,r.ct);if(mm&&mm.dp)alertDp(fid,r.id,r.created_at)}
    const n=unreadCount(rows,S.user.id,rd,!!isOpen);
    if(shouldRing(S.firstRef,n,S.unread.get(fid),muted(fid)))more=true;
    S.unread.set(fid,n);
  }));
  S.firstRef=false;
  if(more)pling();
  setTitle();
}
/* HVORFOR: dobbeltpling skal fange oppmerksomheten uansett hvor mottakeren er i appen, ikke bare når samtalen er åpen
   (Dan Joakim 25. okt: «poenget med et dobbeltpling er at man skal bli oppmerksom på at noen vil ha tak i en»).
   dpSeen = hver melding utløser bare én gang, selv om både forhåndsvisningen og den åpne samtalen ser den. */
/* Dansende banan i dobbeltpling-banneren (Dan 19. nov: hommage til MSN). Egen tegning, ren SVG med CSS-animasjon (extra.css, .dpb). */
const BANAN='<svg class="dpbn" viewBox="-6 -2 112 128" width="46" height="53" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g class="dpb-b"><g class="dpb-al"><path d="M24 62 C14 62 8 54 8 44" fill="none" stroke="#e0b21c" stroke-width="5" stroke-linecap="round"/></g><g class="dpb-ar"><path d="M50 64 C60 62 66 54 66 44" fill="none" stroke="#e0b21c" stroke-width="5" stroke-linecap="round"/></g><path d="M30 14 C16 44 20 76 52 90 C70 98 88 92 95 80 C74 84 56 72 50 52 C46 36 46 22 41 12 Z" fill="#f7d231" stroke="#d9a916" stroke-width="3" stroke-linejoin="round"/><path d="M30 14 L41 12 L39 4 L32 5 Z" fill="#7a5320" stroke="#7a5320" stroke-width="2" stroke-linejoin="round"/><path d="M21 40 C22 20 52 18 52 40" fill="none" stroke="#10304f" stroke-width="3.5" stroke-linecap="round"/><rect x="17" y="38" width="8" height="14" rx="4" fill="#1b5fb8" stroke="#10304f" stroke-width="2"/><rect x="48" y="38" width="8" height="14" rx="4" fill="#1b5fb8" stroke="#10304f" stroke-width="2"/><rect x="26" y="47" width="11" height="9" rx="3.5" fill="#10304f"/><rect x="38" y="47" width="11" height="9" rx="3.5" fill="#10304f"/><path d="M36.5 50 H38.5" stroke="#10304f" stroke-width="2.5"/><path d="M28.5 50 L31.5 49.2 M40.5 50 L43.5 49.2" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/><path d="M32 62 Q38 69 44 62" fill="none" stroke="#10304f" stroke-width="3" stroke-linecap="round"/><g class="dpb-l1"><path d="M54 90 L50 110 L42 110" fill="none" stroke="#e0b21c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g><g class="dpb-l2"><path d="M72 96 L76 112 L84 112" fill="none" stroke="#e0b21c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g></g><text class="dpb-n" x="74" y="30" font-size="16" fill="#a6ff3d" font-weight="900">\u266a</text><text class="dpb-n dpb-n2" x="84" y="46" font-size="13" fill="#a6ff3d" font-weight="900">\u266b</text></svg>';
const dpSeen=new Set(),dpFlash=new Set();let dpT=0;
/* Kraftig ring-vibrasjon ved dobbeltpling når appen er åpen: iOS-appen via Capacitor Haptics (nettleseren har navigator.vibrate). */
function buzz(){
  try{const h=nativePlugin("Haptics");
    if(h&&h.vibrate){for(let i=0;i<3;i++)setTimeout(()=>{try{h.vibrate({duration:400})}catch(x){}},i*700);return}}catch(x){}
  try{navigator.vibrate&&navigator.vibrate([400,300,400,300,400])}catch(x){}
}
function alertDp(fid,id,ts){
  /* hver melding utløser bare én gang; gammel melding: ikke ring; dempet: ingen lyd, risting, banner eller tittelblink */
  if(dpDecision(id,ts,Date.now(),dpSeen,muted(fid))!=="alert")return;
  stor();buzz();
  dpFlash.add(fid);drawFriends();setTimeout(()=>{dpFlash.delete(fid);drawFriends()},10000);
  const old=$("#dpb");if(old)old.remove();
  const b=el("button",{id:"dpb",class:"dpb",type:"button"},el("span",{class:"dpbw"}),el("span",{},tr("dp.banner",{name:nameOf(fid)})));
  b.firstChild.innerHTML=BANAN;
  b.addEventListener("click",()=>{b.remove();openChat(fid)});
  document.body.append(b);setTimeout(()=>{if(b.isConnected)b.remove()},12000);
  clearInterval(dpT);let n=0;const nm=nameOf(fid);
  dpT=setInterval(()=>{n++;document.title=n%2?tr("dp.titleRinging",{name:nm}):tr("app.pageTitle");if(n>=20){clearInterval(dpT);setTitle()}},700);
}
function setTitle(){document.title=pageTitle(S.unread.values())}
const nameOf=id=>{const p=S.profiles.get(id);return p?p.name:"…"};

/* ---------- min profil ---------- */
function paintMe(){
  const i=$("#avimg"),s=$("#avini"),nm=S.profile.name;
  if(okAv(myAv)){i.src=myAv;i.hidden=false;s.hidden=true}else{i.hidden=true;s.hidden=false;s.textContent=initial(nm);s.dataset.i2=initials2(nm)}
  $("#avwrap").className="av "+ST[S.status]+(okAv(myAv)?"":" noimg");
  document.documentElement.style.setProperty("--dot",DOT[ST[S.status]]||DOT.on);
  $("#men").textContent=nm;
  const na=$("#navav");if(na){na.textContent="";na.append(avEl(nm,okAv(myAv)?myAv:null,ST[S.status]));$("#navnm").textContent=nm}
  const sel=$("#st");$("#mep").textContent=sel.options[sel.selectedIndex].text;const pmi=$("#pm");if(document.activeElement!==pmi)pmi.value=S.profile.pm||"";
  const f=$("#mef");f.textContent="";f.append(ff(ST[S.status]));if(S.paintAbout)S.paintAbout();
  for(const b of document.querySelectorAll("#prof .seg"))b.setAttribute("aria-pressed",String(b.dataset.v===sel.value));
  const sp=$("#stp");if(sp){if(!sp.options.length)for(const o of sel.options)sp.append(new Option(o.text,o.value));sp.value=sel.value}
}
function paintAvAll(){paintMe()}
async function saveProfile(patch){
  try{await q(api.updateProfile(S.user.id,patch),tr("ctx.saveProfile"));Object.assign(S.profile,patch);paintMe();drawChatHead()}catch(e){fail(e)}
}

/* ---------- kompislisten ---------- */
// Time of the last message for the friend list on phones: clock time today, "I går" yesterday, otherwise day.month.
function fmtWhen(ts){
  if(!ts)return null;const d=new Date(ts),n=new Date(),day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime(),diff=Math.round((day(n)-day(d))/864e5);
  const t=diff<=0?d.toLocaleTimeString("nb-NO",{hour:"2-digit",minute:"2-digit"}):diff===1?tr("nav.yesterday"):d.toLocaleDateString("nb-NO",{day:"2-digit",month:"2-digit"});
  return el("span",{class:"tm"},t);
}
// Search field above the friend list (phone layout): hides rows that do not match.
function applyFilter(){const q=(($("#fq")||{}).value||"").trim().toLowerCase();$("#friends").classList.toggle("srch",!!q);for(const b of document.querySelectorAll("#friends .conv"))b.hidden=!!q&&!b.textContent.toLowerCase().includes(q)}
function pav(id,st){return avEl(nameOf(id),S.av.get(id),st)}
function prev(id){return listLine(S.last.get(id))}
function drawTitle(){
  const t=$("#title");if(!S.chat){t.textContent="";return}
  const id=S.chat.other,pm=(S.profiles.get(id)||{}).pm;t.textContent="";
  t.append(nameOf(id));if(pm){t.append(el("span",{class:"tpm"}," – "+pm));t.title=nameOf(id)+" – "+pm}else t.removeAttribute("title");
  const sw={on:tr("status.on"),away:tr("status.away"),busy:tr("status.busy"),off:tr("status.off")}[ST[stOf(id)]||"off"];
  t.append(el("span",{class:"tsub"},pm?sw+" · "+pm:sw)); // phone layout only (mobil.css)
}
// Which friend groups are folded (phone), kept per person in this browser. Offline starts folded.
let grpSet=null;
function grpShut(){if(!grpSet){try{grpSet=new Set(JSON.parse(localStorage.getItem("prek_grp_"+S.user.id)||'["off"]'))}catch(x){grpSet=new Set(["off"])}}return grpSet}
function grpSave(){try{localStorage.setItem("prek_grp_"+S.user.id,JSON.stringify([...grpSet]))}catch(x){}}
function drawFriends(){
  if(S.chat&&$("#title")&&$("#title").dataset.k!==((S.profiles.get(S.chat.other)||{}).pm||"")+"|"+nameOf(S.chat.other)+"|"+stOf(S.chat.other)){$("#title").dataset.k=((S.profiles.get(S.chat.other)||{}).pm||"")+"|"+nameOf(S.chat.other)+"|"+stOf(S.chat.other);drawTitle()}
  const box=$("#friends");if(!box)return;box.textContent="";
  const rows=S.friends.map(id=>({id,st:ST[stOf(id)]||"off"}));
  sortFriendRows(rows,nameOf);
  // Phone: MSN-style groups (Online incl. busy, Away, Offline) with fold-away headers. Desktop keeps the flat order above.
  const phone=matchMedia("(max-width:700px)").matches,gkey=r=>r.st==="away"?"away":r.st==="off"?"off":"on",gcount={on:0,away:0,off:0};
  if(phone){const ord={on:0,away:1,off:2};rows.sort((a,b)=>ord[gkey(a)]-ord[gkey(b)]||nameOf(a.id).localeCompare(nameOf(b.id),"nb"));for(const r of rows)gcount[gkey(r)]++}
  const shutG=grpShut();let lastG="";
  const word={on:tr("status.on"),away:tr("status.away"),busy:tr("status.busy"),off:tr("status.off")};
  for(const r of rows){
    const g=gkey(r);
    if(phone&&g!==lastG){lastG=g;const shut=shutG.has(g);
      const h=el("button",{class:"grph"+(shut?" shut":""),type:"button","aria-expanded":String(!shut),"data-g":g},el("span",{class:"gd "+g}),el("span",{class:"gt"},word[g]),el("span",{class:"gn"},"("+gcount[g]+")"));
      h.addEventListener("click",()=>{if(shut)shutG.delete(g);else shutG.add(g);grpSave();drawFriends()});
      box.append(h)}
    const p=S.profiles.get(r.id)||{},b=el("button",{class:"conv"+(S.chat&&S.chat.other===r.id?" act":"")+(dpFlash.has(r.id)?" dpflash":"")+(phone&&shutG.has(g)?" gc":""),type:"button","data-id":r.id});
    b.append(pav(r.id,r.st),
      el("span",{class:"t"},el("span",{class:"nl"},el("b",{},nameOf(r.id)),muted(r.id)?el("span",{class:"mu",title:tr("chat.mutedTitle")}," 🔕"):null,p.pm?el("span",{class:"npm"}," – "+p.pm):null),el("small",{},prev(r.id)||word[r.st])),
      el("span",{class:"rt"},fmtWhen((S.last.get(r.id)||{}).at),S.unread.get(r.id)?el("span",{class:"badge",title:tr("friends.unreadTitle")},S.unread.get(r.id)>=20?"20+":String(S.unread.get(r.id))):null,ff(r.st)));
    if(S.unread.get(r.id))b.classList.add("unread");
    b.addEventListener("click",()=>openChat(r.id)); // one click or tap opens the chat, on desktop and phone alike (Dan Joakim 5 Nov)
    b.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();openChat(r.id)}});
    box.append(b);
  }
  applyFilter();
  for(const id of S.reqOut){
    const b=el("div",{class:"conv pend"});
    b.append(pav(id,"off"),el("span",{class:"t"},el("b",{},nameOf(id)),el("small",{},tr("friends.waiting"))),ff("off"));
    box.append(b);
  }
  if(!rows.length&&!S.reqOut.length)box.append(el("div",{class:"fine",style:"padding:6px 4px"},tr("friends.empty")));
}
function drawReqs(){
  const box=$("#reqs");box.textContent="";box.hidden=!S.reqIn.length;
  const nb=$("#navb");if(nb){nb.hidden=!S.reqIn.length;nb.textContent=String(S.reqIn.length)}
  const rb=$("#rqbn");if(rb){rb.hidden=!S.reqIn.length;if(S.reqIn.length){rb.querySelector(".rqn").textContent=String(S.reqIn.length);rb.querySelector(".rqt").textContent=S.reqIn.length===1?tr("nav.reqOne",{name:nameOf(S.reqIn[0])}):tr("nav.reqMany",{n:String(S.reqIn.length)})}}
  if(S.reqIn.length)box.append(el("div",{class:"sechd"},tr("nav.reqHead")));
  for(const id of S.reqIn){
    const rpm=(S.profiles.get(id)||{}).pm;
    box.append(el("div",{class:"req"},pav(id,"on"),el("div",{class:"rtx"},el("b",{},nameOf(id)),el("span",{class:"rtd"}," vil legge deg til"),el("span",{class:"rtm"},tr("nav.reqWants")),rpm?el("i",{class:"rpm"},"«"+rpm+"»"):null),
      el("div",{class:"row"},
        el("button",{class:"sm",onclick:async()=>{try{await q(api.acceptRequest(id),tr("friends.accept"));refresh()}catch(e){fail(e)}}},tr("friends.accept")),
        el("button",{class:"glass sm dcl","aria-label":tr("friends.decline"),onclick:async()=>{try{await q(api.declineRequest(id,S.user.id),tr("friends.decline"));refresh()}catch(e){fail(e)}}},el("span",{class:"dtxt"},tr("friends.decline"))))));
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
    $("#menu").hidden=true;$("#emo").hidden=true;$("#snbox").classList.remove("open");$("#snb").setAttribute("aria-expanded","false");$("#mb").setAttribute("aria-expanded","false");
    drawExp();
    $("#log").textContent="";
    drawChatHead();drawFriends();drawTyping();await loadMsgs();
    if(!narrow())$("#tx").focus();
  }catch(e){fail(e)}
}
function drawExp(){
  if(!S.chat)return;drawMute();const d=S.exp.get(S.chat.id)||0,n=$("#expn");
  $("#ex").value=String(d);n.hidden=!d;
  n.textContent=d?tr("exp.chatNote",{when:daysText(d)}):"";
}
function drawChatHead(){
  if(!S.chat)return;const id=S.chat.other,st=ST[stOf(id)]||"off";
  drawTitle();
  const pr=$("#pr");pr.textContent="";pr.append(pav(id,st));
  const w=$("#who");w.textContent="";
  const p=S.profiles.get(id)||{};
  w.append(el("div",{class:"bud"},pav(id,st),el("span",{class:"t"},nameOf(id),el("small",{},p.pm||""),el("span",{class:"mst"},{on:tr("status.on"),away:tr("status.away"),busy:tr("status.busy"),off:tr("status.off")}[ST[stOf(id)]||"off"])),ff(st)));
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
  const sh=typingShown(S.typ.get(S.chat.other),S.chat,S.pres,Date.now());
  t.hidden=false;t.textContent=sh.on?tr("chat.typing",{name:nameOf(S.chat.other)}):"";
  if(sh.on){clearTimeout(S.tT);S.tT=setTimeout(drawTyping,sh.again)}
}
const PAGE=50;
/* ---------- lenker og forhåndsvisning: src/links.ts, glue i app/links.js ---------- */
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
  const maxSeen=S.seen.get(cid)||0,fresh=freshMessages(out,S.first,maxSeen);
  S.seen.set(cid,out.length?out[out.length-1].id:0);
  if(out.length){setRead(cid,out[out.length-1].id);const l=out[out.length-1];S.last.set(S.chat.other,{id:l.id,mine:l.mine,t:previewText(l.ok?l:null),at:l.ts});S.unread.set(S.chat.other,0);setTitle();drawFriends()}
  if(S.first)for(const x of out)S.anSeen.set(String(x.id),0);
  S.first=false;S.msgs=pend.length?[...out,...pend.filter(x=>x.cid===cid)]:out;drawLog();
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
  log.prepend(el("span",{class:"encp"},tr("auth.e2eShort"))); // phone layout only (mobil.css)
  let prevM=null,prevDay="";
  const dayWord=ts=>{const d=new Date(ts),n=new Date(),k=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime(),diff=Math.round((k(n)-k(d))/864e5);return diff<=0?tr("nav.today"):diff===1?tr("nav.yesterday"):d.toLocaleDateString("nb-NO",{day:"numeric",month:"long"})};
  for(const[i,m]of S.msgs.entries()){
    if(m.ts){const dk=new Date(m.ts).toDateString();if(dk!==prevDay){prevDay=dk;log.append(el("span",{class:"dday"},dayWord(m.ts)));prevM=null}}
    if(m.dp){log.append(el("div",{class:"sys"},tr("chat.sentDp",{who:m.mine?tr("chat.you"):nameOf(S.chat.other),time:tm(m.ts)})));prevM=null;continue}
    const cont=prevM&&prevM.mine===m.mine&&Math.abs(new Date(m.ts)-new Date(prevM.ts))<18e4;prevM=m;
    const d=el("div",{class:"m"+(m.mine?" mine":"")+(m.img?" pic":"")+(m.pending?" pending":"")+(cont?" cont":"")});d.dataset.mid=m.id;
    if(m.img)d.append(picEl(m.img));else
    if(m.ok)d.append(...linkify(m.t==null?"":m.t));else d.append(tr("chat.undecryptable"));
    if(m.lk)d.append(lkCard(m.lk));
    d.append(el("br"),el("time",{},tm(m.ts)));
    if((m.ok||m.img)&&!m.pending){const ch=rxChips(m);if(ch)d.append(ch);d.append(el("button",{type:"button",class:"rxb","aria-label":tr("rx.ariaReact"),title:tr("rx.react"),onclick:e=>{e.stopPropagation();openRx(m,e.currentTarget)}},"☺"))}
    log.append(d);
    const nx=S.msgs[i+1],last=!nx||nx.dp||nx.mine!==m.mine||Math.abs(new Date(nx.ts)-new Date(m.ts))>=18e4||new Date(nx.ts).toDateString()!==new Date(m.ts).toDateString();
    if(last&&!m.pending){ // phone layout: time (and read ticks on mine) under the last bubble of a run; hidden on desktop
      const meta=el("span",{class:"meta"+(m.mine?" mine":"")},tm(m.ts));
      if(m.mine&&typeof m.id==="number"){const rd=((S.peerRead&&S.peerRead.get(S.chat.id))||0)>=m.id,tk=el("span",{class:"tk"+(rd?" rd":""),title:rd?tr("chat.read"):tr("chat.sent")});tk.innerHTML=rd?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 13l4 4 8-10M10 14l3 3 9-11"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4 10-11"/></svg>';meta.append(tk)}
      log.append(meta);
    }
  }
  markAn();
  if(!keepPos&&(near||S.justSent))log.scrollTop=log.scrollHeight;S.justSent=false;
}
/* ---------- reaksjoner (kryptert som meldinger; se claude/reaksjoner.md) ---------- */
const RX=[["rofl",tr("rx.name.rofl")],["thumbup",tr("rx.name.thumbup")],["heart",tr("rx.name.heart")],["surprised",tr("rx.name.surprised")],["cry",tr("rx.name.cry")],["thumbdown",tr("rx.name.thumbdown")]];
const RX_OK=new Set(RX.map(x=>x[0]));
function rxChips(m){
  const mp=S.rx.get(m.id);if(!mp||!mp.size)return null;
  const g=groupReactions(mp);
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
  if(!m.mine&&(m.ok||m.img)&&!m.pending&&typeof m.id==="number")p.append(el("button",{type:"button",class:"rxk",onclick:e=>{e.stopPropagation();closeRx();showReport(m)}},tr("rpt.menu")));
  document.body.append(p);rxPop=p;
  const a=anchor.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;
  const{x,y}=menuPosition(a,w,h,innerWidth);
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
    const key=await pairKey(other.pub),s=await seal(key,reactionPayload(r,mid,S.user.id));
    const res=await api.saveReaction({msg_id:mid,chat_id:cid,user_id:S.user.id,iv:s.iv,ct:s.ct});
    if(res&&res.error)throw res.error;
    if(!S.chat||S.chat.id!==cid)return;
    applyReaction(S.rx,mid,S.user.id,r);
    drawLog(true);refreshSoon();
  }catch(e){fail(e)}
}
/* Egne tekstmeldinger vises med en gang, svakt, mens serveren lagrer dem (1. nov: «merkbart delay»). Før dukket de opp først etter lagring pluss full oppdatering av kompiser, profiler og forhåndsvisninger.
   Bildemeldinger og dobbeltpling vises ikke på forhånd. `pend` holder de som ikke er lagret ennå, så en oppdatering midt i sendingen ikke fjerner dem. Se claude/beslutningslogg.md. */
let pend=[];
async function sendMsg(payload,file){
  if(!S.chat)return false;
  const other=S.profiles.get(S.chat.other);let p=null;
  try{
    const key=await pairKey(other.pub),s=await seal(key,payload);
    const row={chat_id:S.chat.id,sender:S.user.id,iv:s.iv,ct:s.ct};
    if(file)row.file=file;
    if(payload.dp)row.dp=true; /* ren flagg så serveren kan sende ringelyd-push; innholdet er fortsatt kryptert */
    if(payload.t!=null&&!payload.img&&!payload.dp){
      p={id:"p"+Date.now(),cid:S.chat.id,pending:true,mine:true,t:String(payload.t),dp:false,img:null,lk:payload.lk||null,ok:true,ts:new Date().toISOString()};
      pend.push(p);S.msgs=[...S.msgs,p];S.justSent=true;drawLog();
    }
    await q(api.sendMessage(row),tr("ctx.send"));
  }catch(e){
    if(p){pend=pend.filter(x=>x!==p);S.msgs=S.msgs.filter(x=>x!==p);if(S.chat)drawLog(true)}
    fail(e);return false}
  if(p)pend=pend.filter(x=>x!==p);
  S.justSent=true;S.myTyp=null;trackMe(true);
  /* hent bare meldingene (to kall), ikke alt; resten følger i refreshSoon */
  loadMsgs().catch(()=>{}).then(()=>{if(p&&S.msgs.includes(p)){S.msgs=S.msgs.filter(x=>x!==p);if(S.chat)drawLog(true)}});
  refreshSoon();return true;
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
/* «Send et bilde» skal bare velge et bilde fra biblioteket, ikke tilby kamera (Dan Joakim 19. nov). I iPhone-appen bruker vi det innebygde bildevalget (Capacitor Camera.pickImages, ingen kameravalg);
   ellers (nettleser, skrivebord, eller om utvidelsen mangler) filvelgeren. Kamera er et eget valg i «+»-menyen. */
async function pickPhoto(){
  let cm=null;try{cm=nativePlugin("Camera")}catch(e){}
  if(cm&&cm.pickImages){
    try{
      const r=await cm.pickImages({limit:1,quality:90}),ph=r&&r.photos&&r.photos[0];
      if(ph){const b=await(await fetch(ph.webPath)).blob();sendImage(new File([b],"bilde."+(ph.format||"jpg"),{type:b.type||"image/"+(ph.format||"jpeg")}))}
      return;
    }catch(e){if(/cancel/i.test(String(e&&(e.message||e))))return}
  }
  $("#af").click();
}
/* Push (iPhone-appen): varsler når appen er lukket eller skjermen er låst. Serveren kan ikke lese meldinger, så teksten er «Navn har sendt deg en melding».
   Se claude/push.md. Nettversjonen har ingen push; der gjelder bare varslene mens siden er åpen. */
const pushKey="prek_push_token";
/* Uten bunter finnes ikke alltid cap.Plugins.X; registerPlugin(navn) gir en proxy til den innebygde modulen uansett. */
function nativePlugin(name){const cap=window.Capacitor;if(!(cap&&cap.isNativePlatform&&cap.isNativePlatform()))return null;
  return (cap.Plugins&&cap.Plugins[name])||(cap.registerPlugin?cap.registerPlugin(name):null)}
function pushPlugin(){try{return nativePlugin("PushNotifications")}catch(e){return null}}
let pushWired=false;
async function initPush(){
  if(!S.user)return;const pn=pushPlugin();if(!pn)return;
  try{
    if(!pushWired){pushWired=true;
      pn.addListener("registration",t=>{const tok=t&&t.value;if(!tok||!S.user)return;try{localStorage.setItem(pushKey,tok)}catch(e){}
        api.savePushToken(S.user.id,tok)});
      pn.addListener("pushNotificationActionPerformed",a=>{const d=a&&a.notification&&a.notification.data;if(d&&d.from&&S.profiles.has(d.from))openChat(d.from)})}
    let p=await pn.checkPermissions();
    if(p.receive==="prompt")p=await pn.requestPermissions();
    if(p.receive==="granted"){await pn.register();syncPushMutes()}
  }catch(e){}
}
async function dropPush(){let t=null;try{t=localStorage.getItem(pushKey);localStorage.removeItem(pushKey)}catch(e){}if(t)try{await Promise.race([api.deletePushToken(t),new Promise(r=>setTimeout(r,2000))])}catch(e){}}
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
  $("#meb").addEventListener("click",ev=>{
    // Phone: the profile card is not a toggle (it pushed the settings panel into the friend list); a tap on it opens the Meg tab. The status pill keeps its own select.
    if(matchMedia("(max-width:700px)").matches){if(ev.target.closest(".stw"))return;navTo("me");return}
    const p=$("#prof"),o=p.hidden;p.hidden=!o;$("#meb").setAttribute("aria-expanded",String(o))});
  $("#infob").addEventListener("click",showInfo);
  $("#outb").addEventListener("click",doLogout);
  $("#delb").addEventListener("click",showDelete);
  $("#lpv").value=LP_ON()?"on":"off";$("#lpv").addEventListener("change",e=>{try{localStorage.setItem("pling_lp",e.target.value==="off"?"0":"1")}catch(x){}});
  $("#thm").value=window.plingThemeGet();$("#thm").addEventListener("change",e=>window.plingTheme(e.target.value));
  $("#pnm").addEventListener("change",()=>{const n=$("#pnm").value.trim();if(!n){$("#pnm").value=S.profile.name;return}if(n!==S.profile.name)saveProfile({name:n.slice(0,24)})});
  $("#pm").addEventListener("keydown",e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape"){e.target.value=S.profile.pm||"";e.target.blur()}});
  $("#pm").addEventListener("change",()=>{const v=$("#pm").value.trim().slice(0,60);saveProfile({pm:v||null})});
  $("#st").addEventListener("change",()=>{
    S.status=$("#st").value;try{localStorage.setItem("pling_st_"+S.user.id,S.status)}catch(e){}
    paintMe();trackMe(true);drawChatHead();
  });
  const avPick=async e=>{
    const f=e.target.files[0];e.target.value="";if(!f)return;
    try{
      const a=await toAvatar(f);if(!okAv(a))throw new Error(tr("img.avatarTooBig"));
      await q(api.saveAvatar({id:S.user.id,data:a,updated_at:new Date().toISOString()}),tr("ctx.saveAvatar"));
      myAv=a;try{localStorage.setItem("pling_av_"+S.user.id,a);localStorage.setItem("pling_last_av",a)}catch(x){}
      paintMe();drawChatHead();toast(tr("avatar.saved"));
    }catch(err){fail(err)}
  };
  $("#avf").addEventListener("change",avPick);$("#avc").addEventListener("change",avPick);
  async function avRemove(){
    try{await q(api.deleteAvatar(S.user.id),tr("ctx.saveAvatar"));myAv=null;try{localStorage.removeItem("pling_av_"+S.user.id);localStorage.removeItem("pling_last_av")}catch(x){}paintMe();drawChatHead();toast(tr("avatar.removed"))}catch(err){fail(err)}
  }
  // Phone, Meg tab: the photo itself is the button. A small sheet offers pick / take / remove.
  $("#avwrap").addEventListener("click",ev=>{
    if(!narrow()||!$("#shell").classList.contains("tab-me"))return;
    ev.stopPropagation();if($("#avsheet"))return;
    const shut=()=>{const x=$("#avsheet");if(x)x.remove()};
    const b=(cls,txt,fn)=>el("button",{type:"button",class:"avs "+cls,onclick:()=>{shut();fn()}},txt);
    const items=[b("pick",tr("avatar.pick"),()=>$("#avf").click()),b("take",tr("avatar.take"),()=>$("#avc").click())];
    if(okAv(myAv))items.push(b("del",tr("avatar.remove"),avRemove));
    const sh=el("div",{class:"avsheet",id:"avsheet",role:"dialog","aria-label":tr("avatar.change")},el("div",{class:"avbk",onclick:shut}),el("div",{class:"avbox"},el("span",{class:"avh","aria-hidden":"true"}),...items,b("cx",tr("common.close"),()=>{})));
    document.body.append(sh);
  });
  // Phone bottom menu (Kompiser / Legg til / Meg): shows the friend list, the add panel or the profile panel full screen. Only visible on narrow screens (mobil.css).
  function navTo(t){
    const sh=$("#shell");sh.classList.remove("tab-friends","tab-add","tab-me");sh.classList.add("tab-"+t);
    $("#prof").hidden=t!=="me";$("#meb").setAttribute("aria-expanded",String(t==="me"));
    $("#addfp").hidden=t!=="add";$("#addf").setAttribute("aria-expanded",String(t==="add"));
    if(t==="add"&&!$("#invqr")&&$("#mkinv"))$("#mkinv").click();
    for(const b of document.querySelectorAll("#mnav button")){if(b.dataset.tab===t)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")}
  }
  for(const b of document.querySelectorAll("#mnav button"))b.addEventListener("click",()=>navTo(b.dataset.tab));
  { // Phone, Kompiser
    const sh=$("#shell");
    // Swipe right from the left edge in a conversation = back (the iOS gesture), same as the back button.
    let sx=0,sy=0,sw=false;
    const chp=$("#chatpane");
    chp.addEventListener("touchstart",e=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;sw=sx<28&&sh.classList.contains("inchat")},{passive:true});
    chp.addEventListener("touchend",e=>{if(!sw)return;sw=false;const t=e.changedTouches[0];if(t.clientX-sx>70&&Math.abs(t.clientY-sy)<50)$("#back").click()},{passive:true});
  }
  { // Lock button next to the logo: a short explanation of the encryption (phone only; the button is hidden on desktop)
    const lb=$("#lockb"),lp=$("#lockpop");
    const shut=()=>{lp.hidden=true;lb.setAttribute("aria-expanded","false")};
    lb.addEventListener("click",ev=>{ev.stopPropagation();const o=lp.hidden;lp.hidden=!o;lb.setAttribute("aria-expanded",String(o))});
    document.addEventListener("click",ev=>{if(!lp.hidden&&!lp.contains(ev.target))shut()});
    $("#lockmore").addEventListener("click",()=>{shut();showInfo()});
    $("#addplus").addEventListener("click",()=>navTo("add"));
    // The grouping of the friend list follows the layout, so draw again when the window crosses the phone width
    matchMedia("(max-width:700px)").addEventListener("change",()=>{if(S.friends)drawFriends()});
  }
  $("#rqbn").addEventListener("click",()=>navTo("add"));
  { // Status as three/four buttons on the profile page (phone layout); the select #st stays the source of truth
    const sel=$("#st"),box=el("div",{class:"segs",role:"group","aria-label":tr("nav.status")});
    for(const o of sel.options){const b=el("button",{type:"button",class:"seg "+({online:"on",away:"away",busy:"busy",off:"off"}[o.value]||"on"),"data-v":o.value,"aria-pressed":"false"},o.text);b.addEventListener("click",()=>{sel.value=o.value;sel.dispatchEvent(new Event("change"))});box.append(b)}
    sel.before(box);
  }
  { // Meg-fanen på telefon: Status, rader og Om meg (mockup Meg). De gamle kontrollene ligger i #prof og flyttes inn på undersider.
    const prof=$("#prof"),segs=prof.querySelector(".segs"),offb=segs.querySelector(".seg.off");
    const ic=d=>{const s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("viewBox","0 0 24 24");s.setAttribute("aria-hidden","true");const p=document.createElementNS("http://www.w3.org/2000/svg","path");p.setAttribute("d",d);s.append(p);return s};
    const stat=el("div",{class:"mnew mstat"},el("div",{class:"mgrp"},tr("me.status")));segs.before(stat);stat.append(segs);
    if(offb)stat.append(offb);
    const rows=el("div",{class:"mnew mrows"});
    const row=(icon,label,val,fn,cls)=>{const b=el("button",{type:"button",class:"mrow"+(cls?" "+cls:"")},el("span",{class:"mri"},ic(icon)),el("span",{class:"mrl"},label),el("span",{class:"mrv"},val||""),el("span",{class:"mrc","aria-hidden":"true"},"›"));b.onclick=fn;rows.append(b);return b};
    row("M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",tr("me.rowName"),"",()=>pageName());
    const snd=row("M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7",tr("me.rowSound"),"",()=>{setSound(!soundOn());paintSnd();if(soundOn())pling()});
    const paintSnd=()=>{snd.querySelector(".mrv").textContent=soundOn()?tr("me.soundOn"):tr("me.soundOff")};paintSnd();
    row("M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2",tr("me.rowDevices"),"",()=>pageDevices());
    row("M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.3 3h-4l-.3 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.3 2.6h4l.3-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",tr("me.rowSettings"),"",()=>pageSettings());
    row("M10 4H5v16h5M15 8l4 4-4 4M19 12H9",tr("common.logout"),"",doLogout);
    const ab=el("div",{class:"mnew mabout"},el("div",{class:"mah"},el("b",{},tr("me.about")),el("button",{type:"button",class:"mae",onclick:()=>pageAbout()},tr("me.aboutEdit"))),el("p",{class:"mat",id:"abouttxt"}),el("button",{type:"button",class:"mai",id:"aboutinfo","aria-label":tr("me.aboutInfo"),"aria-expanded":"false"},"i"),el("div",{class:"maipop",id:"aboutpop",role:"note",hidden:true},tr("me.aboutNote")));
    {const ai=ab.querySelector("#aboutinfo"),ap=ab.querySelector("#aboutpop");
      const shut=()=>{ap.hidden=true;ai.setAttribute("aria-expanded","false")};
      ai.onclick=e=>{e.stopPropagation();const o=ap.hidden;ap.hidden=!o;ai.setAttribute("aria-expanded",String(o))};
      document.addEventListener("click",e=>{if(!ap.hidden&&!ap.contains(e.target))shut()})}
    stat.after(rows);rows.after(ab);
    S.paintAbout=()=>{const t=$("#abouttxt");if(!t)return;const a=S.profile&&S.profile.about;t.textContent=a||tr("me.aboutEmpty");t.classList.toggle("empty",!a)};
  }
  $("#scanbtn").addEventListener("click",scanOpen);
  $("#emailtog").addEventListener("click",()=>{const sh=$("#addfp").classList.toggle("showem");$("#emailtog").setAttribute("aria-expanded",String(sh))});
  $("#cdgo").addEventListener("click",()=>redeemCode($("#cd2").value));
  $("#cd2").addEventListener("keydown",e=>{if(e.key==="Enter")redeemCode(e.target.value)});
  $("#fq").addEventListener("input",applyFilter);
  $("#stp").addEventListener("change",()=>{$("#st").value=$("#stp").value;$("#st").dispatchEvent(new Event("change"))});
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
  $("#snb").addEventListener("click",()=>{const b=$("#snbox"),o=!b.classList.contains("open");b.classList.toggle("open",o);$("#snb").setAttribute("aria-expanded",String(o))});
  $("#mb").addEventListener("click",()=>{const m=$("#menu"),o=m.hidden;m.hidden=!o;$("#mb").setAttribute("aria-expanded",String(o))});
  $("#pr").addEventListener("click",()=>$("#mb").click());
  $("#ex").addEventListener("change",async()=>{
    if(!S.chat)return;const v=+$("#ex").value,cid=S.chat.id;
    try{await q(api.setChatExpiry(cid,v),tr("ctx.changeExpiry"));S.exp.set(cid,v);drawExp();toast(v?tr("exp.on",{when:daysText(v)}):tr("exp.off"))}
    catch(e){fail(e);drawExp()}
  });
  const sure=(btn,label,fn)=>{let s=false,t;const L=btn.querySelector(".xl")||btn;btn.addEventListener("click",()=>{
    if(!s){s=true;L.textContent=tr("common.sure");t=setTimeout(()=>{s=false;L.textContent=label},3500);return}
    clearTimeout(t);s=false;L.textContent=label;fn()})};
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
  for(const[c,id]of FIGS){const b=el("button",{type:"button",class:"ef",title:c+" ("+AN_FIG[id][0]+")","aria-label":tr("emo.pickAria",{name:AN_FIG[id][0],code:c}),onclick:()=>put(c)});b.append(anEl(id),el("span",{class:"efn","aria-hidden":"true"},AN_FIG[id][0]));pf.append(b)}
  for(const e of ["😊","😃","😉","🙁","😛","❤️","👍","👎","😮","😎","😈","😇","😢","💋","💔","🎉"]){
    pe.append(el("button",{type:"button",class:"ef",onclick:()=>{tx.value+=e;drawPv();tx.focus()}},e));
  }
  const t1=el("button",{type:"button",class:"etab on"},tr("emo.tabFigures")),t2=el("button",{type:"button",class:"etab"},tr("emo.tabEmoji"));
  const tab=n=>{pf.hidden=n!==1;pe.hidden=n!==2;t1.classList.toggle("on",n===1);t2.classList.toggle("on",n===2)};
  t1.onclick=()=>tab(1);t2.onclick=()=>tab(2);
  emo.append(el("span",{class:"emoh","aria-hidden":"true"}),el("div",{class:"etabs"},t1,t2),pf,pe);
  $("#plusb").addEventListener("click",e=>{ // telefon: «+» åpner Bilde / Kamera
    e.stopPropagation();const old=document.querySelector(".plusm");if(old){old.remove();$("#plusb").setAttribute("aria-expanded","false");return}
    const m=el("div",{class:"plusm",role:"menu"},el("button",{type:"button",role:"menuitem",onclick:()=>{m.remove();$("#plusb").setAttribute("aria-expanded","false");pickPhoto()}},tr("html.ab.title")),el("button",{type:"button",role:"menuitem",onclick:()=>{m.remove();$("#plusb").setAttribute("aria-expanded","false");camOpen()}},tr("html.cb.title")));
    $("#bar").append(m);$("#plusb").setAttribute("aria-expanded","true");
  });
  document.addEventListener("click",e=>{const m=document.querySelector(".plusm");if(m&&!e.target.closest(".plusm,#plusb")){m.remove();$("#plusb").setAttribute("aria-expanded","false")}});
  $("#ab").addEventListener("click",pickPhoto);
  $("#cb").addEventListener("click",camOpen);
  $("#cf").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(f)sendImage(f)});
  $("#af").addEventListener("change",e=>{const f=e.target.files[0];e.target.value="";if(f)sendImage(f)});
  tx.addEventListener("paste",e=>{const f=[...(e.clipboardData&&e.clipboardData.files||[])].find(f=>/^image\//.test(f.type));if(f){e.preventDefault();sendImage(f)}});
  $("#lb").addEventListener("click",e=>{if(e.target.id==="lb"){$("#lb").hidden=true;$("#lb").textContent=""}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#lb").hidden){$("#lb").hidden=true;$("#lb").textContent=""}});
  $("#eb").addEventListener("click",()=>{emo.hidden=!emo.hidden});
  /* Flere måter å lukke velgeren på (Dan 19. nov: «får ikke stengt det igjen»): håndtaket øverst, trykk i samtalen, eller send. */
  const emoShut=()=>{emo.hidden=true};
  emo.querySelector(".emoh").addEventListener("click",emoShut);
  $("#tx").addEventListener("pointerdown",()=>{if(!emo.hidden)emoShut()});
  // Drag the panel down (from the handle or the tabs) to close it.
  {let y0=null,dy=0;
   emo.addEventListener("pointerdown",e=>{if(!e.target.closest(".emoh,.etabs"))return;y0=e.clientY;dy=0;emo.style.transition="none";try{emo.setPointerCapture(e.pointerId)}catch(x){}});
   emo.addEventListener("pointermove",e=>{if(y0===null)return;dy=Math.max(0,e.clientY-y0);emo.style.transform="translateY("+dy+"px)"});
   const up=()=>{if(y0===null)return;const go=dy>70;y0=null;emo.style.transition="";emo.style.transform="";if(go)emoShut();dy=0};
   emo.addEventListener("pointerup",up);emo.addEventListener("pointercancel",up);}
  $("#log").addEventListener("click",()=>{if(!emo.hidden)emoShut()});
  $("#sd").addEventListener("click",emoShut);
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
  else{S.user=null;S.profile=null;S.id=null;S.chat=null;S.pres=new Map();S.reads=new Map();S.last=new Map();S.unread=new Map();S.exp=new Map();S.av=new Map();S.profiles=new Map();S.firstRef=true;S.older=[];clearInterval(S.poll);clearInterval(S.pp);clearInterval(S.pbT);clearInterval(S.pfT);S.pairId=null;api.closeLive();myAv=null;viewLogin()}
});
api.getSession().then(({data})=>{if(!data.session)viewLogin()});
