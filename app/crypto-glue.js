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
async function pairKey(theirPub){
  const k=JSON.stringify(theirPub);if(pairCache.has(k))return pairCache.get(k);
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
const download=(name,text)=>{const a=el("a",{href:URL.createObjectURL(new Blob([text],{type:"text/plain"})),download:name});document.body.append(a);a.click();a.remove()};
