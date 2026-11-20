/* ---------- kryptering ----------
   The cryptography itself lives in src/crypto.ts (bundled into PrekCrypto by build.py).
   This file only connects it to the app: browser storage (key per user), app state (S) and Supabase. */
const enc=new TextEncoder(),dec=new TextDecoder();
const tr=PrekI18n.tr;
const {b64,ub64,fpOf,newCode,normCode,pairCode,ephPair,aesFrom,seal,open}=PrekCrypto;
const keyName=uid=>"pling_test_key_"+uid;
function loadIdentity(uid){try{const j=JSON.parse(localStorage.getItem(keyName(uid))||"null");return j}catch(e){return null}}
async function makeIdentity(uid){
  const id=await PrekCrypto.generateIdentity();
  localStorage.setItem(keyName(uid),JSON.stringify(id));return id;
}
const pairCache=new Map();
/* ---------- husk kompisens nøkkel og se om den endres (src/keypin.ts, claude/noekkelvarsel.md) ----------
   Nøkkelen til en kompis skal aldri endre seg. Første nøkkel vi ser huskes på denne enheten; avviker en senere,
   stoppes alt som bruker nøkkelen (pairKey kaster) til personen har valgt. */
let pins=null,pinsUid=null;const keyBadPubs=new Set(),keyBadIds=new Set();
const pinKey=()=>"pling_pins_"+S.user.id;
function pinsNow(){
  if(!pins||pinsUid!==S.user.id){pinsUid=S.user.id;keyBadPubs.clear();keyBadIds.clear();let t=null;try{t=localStorage.getItem(pinKey())}catch(e){}pins=PrekKeypin.parsePins(t)}
  return pins;
}
function savePins(){try{localStorage.setItem(pinKey(),JSON.stringify(pins))}catch(e){}}
async function checkKeys(){
  pinsNow();let dirty=false;
  for(const id of S.friends){
    const p=S.profiles.get(id);if(!p||!p.pub||!p.fp)continue;
    const k=JSON.stringify(p.pub);let fp=null;
    try{fp=await fpOf(p.pub)}catch(e){}
    const r=fp?PrekKeypin.checkKey(pins,id,fp,p.fp,Date.now()):{state:"changed",pins};
    if(r.pins!==pins){pins=r.pins;dirty=true}
    if(r.state==="changed"){keyBadPubs.add(k);keyBadIds.add(id);pairCache.delete(k)}else{keyBadPubs.delete(k);keyBadIds.delete(id)}
  }
  if(dirty)savePins();
}
function keyRow(id){return PrekKeypin.rowState(keyBadIds.has(id)?"changed":"ok",pinsNow()[id])}
async function trustNewKey(id){
  const p=S.profiles.get(id);if(!p||!p.pub)return false;
  const fp=await fpOf(p.pub);
  if(fp!==p.fp){toast(tr("keypin.inconsistent"),true);return false}
  pins=PrekKeypin.acceptNew(pinsNow(),id,fp,Date.now());savePins();
  keyBadIds.delete(id);keyBadPubs.delete(JSON.stringify(p.pub));return true;
}
function setVerified(id,on){pins=on?PrekKeypin.markVerified(pinsNow(),id,Date.now()):PrekKeypin.clearVerified(pinsNow(),id);savePins()}
async function pairKey(theirPub){
  const k=JSON.stringify(theirPub);
  if(keyBadPubs.has(k))throw Object.assign(new Error(tr("keypin.stopped")),{keyChanged:true});
  if(pairCache.has(k))return pairCache.get(k);
  const key=await PrekCrypto.deriveChatKey(S.id.priv,theirPub);
  pairCache.set(k,key);return key;
}

/* ---------- gjenopprettingskode og enhetsoverføring ---------- */
async function makeBackup(code){
  const b=await PrekCrypto.makeBackup(code,S.id);
  return{user_id:S.user.id,salt:b.salt,iv:b.iv,ct:b.ct,iter:b.iter,updated_at:new Date().toISOString()};
}
async function saveBackup(code){await q(api.saveKeyBackup(await makeBackup(code)),tr("ctx.saveBackup"));S.backup={updated_at:new Date().toISOString()}}
async function restoreFromCode(code){
  const rows=await q(api.getKeyBackup(S.user.id),tr("ctx.fetchBackup"));
  if(!rows.length)throw new Error(tr("key.noBackup"));
  const id=await PrekCrypto.restoreBackup(code,rows[0]);
  if(!id)throw new Error(tr("key.wrongCode"));
  return id;
}
async function adoptIdentity(id){
  const fp=await fpOf(id.pub);
  if(fp!==S.profile.fp)throw new Error(tr("key.wrongAccount"));
  localStorage.setItem(keyName(S.user.id),JSON.stringify(id));S.id=id;pairCache.clear();
}
const pairFresh=r=>Date.now()-new Date(r.created_at).getTime()<10*60*1000;
function qrSvg(text){const qr=qrcode(0,"M");qr.addData(text);qr.make();return qr.createSvgTag({cellSize:5,margin:0,scalable:true})}
// Phone app (WKWebView) ignores <a download>: there the share sheet is used (Files, Mail, copy), and as a last resort the text is copied.
const download=async(name,text)=>{
  const cap=window.Capacitor;
  if(cap&&cap.isNativePlatform&&cap.isNativePlatform()){
    try{const f=new File([text],name,{type:"text/plain"});
      if(navigator.share){await navigator.share(navigator.canShare&&navigator.canShare({files:[f]})?{files:[f]}:{text});return}
    }catch(e){if(e&&e.name==="AbortError")return}
    try{await navigator.clipboard.writeText(text);toast(tr("chat.dlCopied"));return}catch(e){}
  }
  const a=el("a",{href:URL.createObjectURL(new Blob([text],{type:"text/plain"})),download:name});document.body.append(a);a.click();a.remove()};
