(function(){
const LS=localStorage,SS=sessionStorage;
const db=()=>JSON.parse(LS.getItem("mockdb")||'{"users":[],"profiles":[],"friends":[],"friend_requests":[],"chats":[],"chat_members":[],"messages":[],"key_backups":[],"key_transfers":[],"avatars":[],"chat_reads":[],"seq":1}');
const save=d=>{LS.setItem("mockdb",JSON.stringify(d))};
const uid=()=>{const s=SS.getItem("mocksess");return s?JSON.parse(s).user.id:null};
const rid=()=>crypto.randomUUID();
const subs=[];let authCbs=[];
let lastPres={},lastMsg=0;
window.addEventListener("storage",e=>{if(e.key!=="mockdb")return;
  const d=db(),rows=[];(d.presence||[]).forEach(r=>{const sig=[r.st,r.typ_chat,r.typ_at].join("|");if(lastPres[r.user_id]!==sig){lastPres[r.user_id]=sig;rows.push({user_id:r.user_id,st:r.st,typ_chat:r.typ_chat,typ_at:r.typ_at,seen_at:r.seen})}});
  const nm=(d.messages||[]).filter(m=>m.id>lastMsg);nm.forEach(m=>{lastMsg=Math.max(lastMsg,m.id)});
  subs.forEach(s=>{if(s.table==="presence"){rows.forEach(r=>{const me=uid();if(me&&r.user_id!==me&&d.friends.some(f=>(f.a===me&&f.b===r.user_id)||(f.b===me&&f.a===r.user_id)))s.cb({new:r})})}
    else if(s.table==="messages"){nm.forEach(m=>s.cb({new:m}))}else s.cb({})})});
const bump=()=>{/* andre vinduer får storage-event automatisk */};
const ok=data=>({data,error:null}),err=m=>({data:null,error:{message:m}});
const visible=(d,t,me)=>{
  const mem=d.chat_members.filter(m=>m.user_id===me).map(m=>m.chat_id);
  if(t==="friends")return d.friends.filter(r=>r.a===me||r.b===me);
  if(t==="friend_requests")return d.friend_requests.filter(r=>r.from_id===me||r.to_id===me);
  if(t==="blocks")return (d.blocks||[]).filter(r=>r.blocker===me);
  if(t==="messages")return d.messages.filter(m=>mem.includes(m.chat_id));
  if(t==="reactions")return (d.reactions||[]).filter(r=>mem.includes(r.chat_id)&&d.messages.some(m=>m.id===r.msg_id&&m.chat_id===r.chat_id));
  if(t==="key_transfers")return (d.key_transfers||[]).filter(r=>r.user_id===me);
  if(t==="key_backups")return (d.key_backups||[]).filter(r=>r.user_id===me);
  if(t==="chat_reads")return (d.chat_reads||[]).filter(r=>r.user_id===me);
  if(t==="avatars")return (d.avatars||[]).filter(r=>r.id===me||isFriend(d,me,r.id));
  if(t==="chats")return d.chats.filter(c=>mem.includes(c.id));
  if(t==="chat_members")return d.chat_members.filter(m=>mem.includes(m.chat_id));
  return d[t];
};
const isFriend=(d,a,b)=>d.friends.some(r=>r.a===(a<b?a:b)&&r.b===(a<b?b:a));
function from(t){
  let op="select",payload=null,fl=[],ord=null,lim=null;
  const b={
    select(){op="select";return b},insert(o){op="insert";payload=o;return b},upsert(o){op="upsert";payload=o;return b},update(o){op="update";payload=o;return b},delete(){op="delete";return b},
    eq(k,v){fl.push(r=>r[k]===v);return b},lt(k,v){fl.push(r=>r[k]<v);return b},in(k,vs){fl.push(r=>vs.includes(r[k]));return b},
    order(k,o){ord=[k,o&&o.ascending!==false];return b},limit(n){lim=n;return b},
    then(res,rej){return Promise.resolve(run()).then(res,rej)}
  };
  function run(){
    const d=db();d.invites=d.invites||[];
    const sha=async t=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,"0")).join("");
    if(name==="peek_invite")return sha(a.p_token).then(h=>{const i=d.invites.find(i=>i.hash===h&&!i.used&&i.exp>Date.now());const p=i&&d.profiles.find(p=>p.id===i.inviter);return ok(p?p.name:null)});
    const me=uid();if(!me)return err("ikke innlogget");
    if(name==="create_invite"){if(!d.profiles.some(p=>p.id===me))return err("lag profil først");if(!/^[0-9a-f]{64}$/.test(a.p_hash))return err("ugyldig");d.invites.push({hash:a.p_hash,inviter:me,exp:Date.now()+7*864e5,used:null});save(d);return ok(new Date(Date.now()+7*864e5).toISOString())}
    if(name==="revoke_invites"){const n=d.invites.filter(i=>i.inviter===me&&!i.used).length;d.invites=d.invites.filter(i=>!(i.inviter===me&&!i.used));save(d);return ok(n)}
    if(name==="redeem_invite")return sha(a.p_token).then(h=>{const i=d.invites.find(i=>i.hash===h);if(!i||i.used||i.exp<=Date.now())return err("invitasjonen er utløpt eller brukt");if(i.inviter===me)return err("dette er din egen invitasjon");
      d.blocks=d.blocks||[];if(d.blocks.some(b=>b.blocker===i.inviter&&b.blocked===me))return err("invitasjonen er utløpt eller brukt");if(d.blocks.some(b=>b.blocker===me&&b.blocked===i.inviter))return err("fjern blokkeringen først");
      const o=(x,y)=>x<y?[x,y]:[y,x];d.friend_requests=d.friend_requests.filter(r=>!((r.from_id===me&&r.to_id===i.inviter)||(r.from_id===i.inviter&&r.to_id===me)));const[x,y]=o(me,i.inviter);if(!d.friends.some(f=>f.a===x&&f.b===y))d.friends.push({a:x,b:y});i.used=me;save(d);const p=d.profiles.find(p=>p.id===i.inviter);return ok([{id:p.id,name:p.name}])});
    if(op==="select"){let rows=visible(d,t,me).filter(r=>fl.every(f=>f(r)));if(ord)rows=[...rows].sort((x,y)=>(x[ord[0]]>y[ord[0]]?1:-1)*(ord[1]?1:-1));if(lim)rows=rows.slice(0,lim);return ok(rows)}
    if(t==="key_transfers"){
      d.key_transfers=d.key_transfers||[];
      if(op==="insert"){if(payload.user_id!==me)return err("RLS: key_transfers");d.key_transfers.push({status:"pending",created_at:new Date().toISOString(),...payload});save(d);return ok(null)}
      if(op==="update"){d.key_transfers.forEach(r=>{if(r.user_id===me&&fl.every(f=>f(r)))Object.assign(r,payload)});save(d);return ok(null)}
      if(op==="delete"){d.key_transfers=d.key_transfers.filter(r=>!(r.user_id===me&&fl.every(f=>f(r))));save(d);return ok(null)}
    }
    if(t==="profiles"&&op==="update"){
      const bad=Object.keys(payload).filter(k=>!["name","pm"].includes(k));if(bad.length)return err("permission denied for table profiles");
      if(payload.pm&&payload.pm.length>60)return err("check constraint pm");
      d.profiles.forEach(p=>{if(p.id===me&&fl.every(f=>f(p)))Object.assign(p,payload)});save(d);return ok(null)}
    if(t==="avatars"&&op==="upsert"){if(payload.id!==me)return err("RLS: avatars");if(payload.data.length>60000)return err("check");d.avatars=(d.avatars||[]).filter(r=>r.id!==me);d.avatars.push({...payload});save(d);return ok(null)}
    if(t==="messages"&&op==="delete"){d.messages=d.messages.filter(m=>!(m.sender===me&&fl.every(f=>f(m))));save(d);return ok(null)}
    if(op==="insert"){
      if(t==="profiles"){if(payload.id!==me)return err("RLS: profiles");if(d.profiles.some(p=>p.id===me||p.fp===payload.fp))return err("duplicate key");d.profiles.push({...payload});save(d);return ok(null)}
      if(t==="messages"){
        const mem=d.chat_members.filter(m=>m.chat_id===payload.chat_id);
        if(payload.sender!==me||!mem.some(m=>m.user_id===me))return err("new row violates row-level security policy for table \"messages\"");
        const other=mem.find(m=>m.user_id!==me);if(!other||!isFriend(d,me,other.user_id))return err("new row violates row-level security policy for table \"messages\"");
        const ch=d.chats.find(c=>c.id===payload.chat_id),ed=(ch&&ch.exp_days)||0;d.messages.push({id:d.seq++,created_at:new Date().toISOString(),...payload,exp:ed?new Date(Date.now()+ed*864e5).toISOString():null});save(d);return ok(null)}
      return err("insert ikke tillatt");
    }
    if(op==="upsert"&&t==="reactions"){
      const mem=d.chat_members.filter(m=>m.chat_id===payload.chat_id);
      if(payload.user_id!==me||!mem.some(m=>m.user_id===me))return err("new row violates row-level security policy for table \"reactions\"");
      const other=mem.find(m=>m.user_id!==me);if(!other||!isFriend(d,me,other.user_id))return err("new row violates row-level security policy for table \"reactions\"");
      if(!d.messages.some(m=>m.id===payload.msg_id&&m.chat_id===payload.chat_id))return err("new row violates row-level security policy for table \"reactions\"");
      d.reactions=(d.reactions||[]).filter(r=>!(r.msg_id===payload.msg_id&&r.user_id===me));d.reactions.push({...payload});save(d);return ok(null)}
    if(op==="upsert"&&t==="key_backups"){if(payload.user_id!==me)return err("RLS: key_backups");d.key_backups=(d.key_backups||[]).filter(r=>r.user_id!==me);d.key_backups.push({...payload});save(d);return ok(null)}
    if(op==="delete"){
      if(t!=="friend_requests")return err("delete ikke tillatt");
      d.friend_requests=d.friend_requests.filter(r=>!((r.from_id===me||r.to_id===me)&&fl.every(f=>f(r))));save(d);return ok(null)}
  }
  return b;
}
function rpc(name,a){
  return Promise.resolve().then(()=>{
    const d=db();d.invites=d.invites||[];
    const sha=async t=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,"0")).join("");
    if(name==="peek_invite")return sha(a.p_token).then(h=>{const i=d.invites.find(i=>i.hash===h&&!i.used&&i.exp>Date.now());const p=i&&d.profiles.find(p=>p.id===i.inviter);return ok(p?p.name:null)});
    const me=uid();if(!me)return err("ikke innlogget");
    if(name==="create_invite"){if(!d.profiles.some(p=>p.id===me))return err("lag profil først");if(!/^[0-9a-f]{64}$/.test(a.p_hash))return err("ugyldig");d.invites.push({hash:a.p_hash,inviter:me,exp:Date.now()+7*864e5,used:null});save(d);return ok(new Date(Date.now()+7*864e5).toISOString())}
    if(name==="revoke_invites"){const n=d.invites.filter(i=>i.inviter===me&&!i.used).length;d.invites=d.invites.filter(i=>!(i.inviter===me&&!i.used));save(d);return ok(n)}
    if(name==="redeem_invite")return sha(a.p_token).then(h=>{const i=d.invites.find(i=>i.hash===h);if(!i||i.used||i.exp<=Date.now())return err("invitasjonen er utløpt eller brukt");if(i.inviter===me)return err("dette er din egen invitasjon");
      const o=(x,y)=>x<y?[x,y]:[y,x];d.friend_requests=d.friend_requests.filter(r=>!((r.from_id===me&&r.to_id===i.inviter)||(r.from_id===i.inviter&&r.to_id===me)));const[x,y]=o(me,i.inviter);if(!d.friends.some(f=>f.a===x&&f.b===y))d.friends.push({a:x,b:y});i.used=me;save(d);const p=d.profiles.find(p=>p.id===i.inviter);return ok([{id:p.id,name:p.name}])});
    const ord=(x,y)=>x<y?[x,y]:[y,x];
    if(name==="set_presence"){d.presence=d.presence||[];if(!["online","away","busy","off"].includes(a.p_st))return err("ugyldig status");
      let r=d.presence.find(r=>r.user_id===me);if(!r){r={user_id:me};d.presence.push(r)}
      const mem=a.p_typ&&d.chat_members.some(x=>x.chat_id===a.p_typ&&x.user_id===me);
      r.st=a.p_st;r.typ_chat=mem?a.p_typ:null;r.typ_at=mem?Date.now():null;r.seen=Date.now();save(d);return ok(null)}
    if(name==="get_presence"){const o=(x,y)=>x<y?[x,y]:[y,x];const n=Date.now();
      return ok((d.presence||[]).filter(r=>{if(r.user_id===me)return false;const[x,y]=o(me,r.user_id);return d.friends.some(f=>f.a===x&&f.b===y)}).map(r=>({user_id:r.user_id,st:r.st,age_s:(n-r.seen)/1000,typ_chat:r.typ_chat,typ_age_s:r.typ_at?(n-r.typ_at)/1000:null})))}
    if(name==="find_by_email"){const u=d.users.find(u=>u.email.toLowerCase()===a.p_email.trim().toLowerCase());const p=u&&u.id!==me&&d.profiles.find(p=>p.id===u.id);return ok(p?[{id:p.id,name:p.name,fp:p.fp,pub:p.pub}]:[])}
    d.blocks=d.blocks||[];
    if(name==="block_user"){const p=d.profiles.find(p=>p.id===a.p_other);if(!p)return err("finner ikke bruker");if(!d.blocks.some(b=>b.blocker===me&&b.blocked===a.p_other))d.blocks.push({blocker:me,blocked:a.p_other,name:p.name});const[x,y]=ord(me,a.p_other);d.friends=d.friends.filter(r=>!(r.a===x&&r.b===y));d.friend_requests=d.friend_requests.filter(r=>!((r.from_id===me&&r.to_id===a.p_other)||(r.from_id===a.p_other&&r.to_id===me)));save(d);return ok(null)}
    if(name==="unblock_user"){d.blocks=d.blocks.filter(b=>!(b.blocker===me&&b.blocked===a.p_other));save(d);return ok(null)}
    if(name==="send_request"){const to=a.p_to;if(to===me)return err("ikke deg selv");
      if(d.blocks.some(b=>b.blocker===to&&b.blocked===me))return err("finner ikke bruker");
      if(d.blocks.some(b=>b.blocker===me&&b.blocked===to))return err("fjern blokkeringen først");
      if(isFriend(d,me,to))return ok("friends");
      if(d.friend_requests.some(r=>r.from_id===to&&r.to_id===me)){d.friend_requests=d.friend_requests.filter(r=>!(r.from_id===to&&r.to_id===me));const[x,y]=ord(me,to);d.friends.push({a:x,b:y});save(d);return ok("friends")}
      if(!d.friend_requests.some(r=>r.from_id===me&&r.to_id===to))d.friend_requests.push({from_id:me,to_id:to});save(d);return ok("pending")}
    if(name==="accept_request"){if(!d.friend_requests.some(r=>r.from_id===a.p_from&&r.to_id===me))return err("ingen forespørsel");
      d.friend_requests=d.friend_requests.filter(r=>!(r.from_id===a.p_from&&r.to_id===me));const[x,y]=ord(me,a.p_from);d.friends.push({a:x,b:y});save(d);return ok(null)}
    if(name==="remove_friend"){const[x,y]=ord(me,a.p_other);d.friends=d.friends.filter(r=>!(r.a===x&&r.b===y));d.friend_requests=d.friend_requests.filter(r=>!((r.from_id===me&&r.to_id===a.p_other)||(r.from_id===a.p_other&&r.to_id===me)));save(d);return ok(null)}
    if(name==="open_dm"){if(!isFriend(d,me,a.p_other))return err("ikke venner");
      let c=d.chats.find(c=>d.chat_members.some(m=>m.chat_id===c.id&&m.user_id===me)&&d.chat_members.some(m=>m.chat_id===c.id&&m.user_id===a.p_other));
      if(!c){c={id:rid(),kind:"dm"};d.chats.push(c);d.chat_members.push({chat_id:c.id,user_id:me},{chat_id:c.id,user_id:a.p_other});save(d)}return ok(c.id)}
    if(name==="mark_read"){if(!d.chat_members.some(m=>m.chat_id===a.p_chat&&m.user_id===me))return err("ikke medlem");d.chat_reads=d.chat_reads||[];let r=d.chat_reads.find(r=>r.chat_id===a.p_chat&&r.user_id===me);if(!r){r={chat_id:a.p_chat,user_id:me,last_id:0};d.chat_reads.push(r)}r.last_id=Math.max(r.last_id,a.p_id);save(d);return ok(null)}
    if(name==="set_chat_expiry"){if(!d.chat_members.some(m=>m.chat_id===a.p_chat&&m.user_id===me))return err("ikke medlem");if(![0,1,7,30].includes(a.p_days))return err("ugyldig verdi");d.chats.find(c=>c.id===a.p_chat).exp_days=a.p_days;save(d);return ok(null)}
    return err("ukjent rpc "+name);
  });
}
const storage={from(bucket){
  const files=()=>JSON.parse(LS.getItem("mockfiles")||"{}");
  const b64=async blob=>{const u=new Uint8Array(await blob.arrayBuffer());let t="";for(const x of u)t+=String.fromCharCode(x);return btoa(t)};
  const memberOf=(d,me,path)=>d.chat_members.some(m=>m.chat_id===path.split("/")[0]&&m.user_id===me);
  return{
    async upload(path,blob){const me=uid(),d=db();if(!me)return err("ikke innlogget");if(!memberOf(d,me,path))return err("new row violates row-level security policy");
      const f=files();f[path]={data:await b64(blob),owner:me};LS.setItem("mockfiles",JSON.stringify(f));return ok({path})},
    async download(path){const me=uid(),d=db(),f=files()[path];if(!me||!f||!memberOf(d,me,path))return err("Object not found");
      return ok(new Blob([Uint8Array.from(atob(f.data),c=>c.charCodeAt(0))]))},
    async remove(paths){const me=uid(),f=files();paths.forEach(p=>{if(f[p]&&f[p].owner===me)delete f[p]});LS.setItem("mockfiles",JSON.stringify(f));return ok([])}
  }}};
const sessOf=u=>({user:{id:u.id,email:u.email}});
const auth={
  async signUp({email,password}){const d=db();if(d.users.some(u=>u.email===email))return err("User already registered");const u={id:rid(),email,password};d.users.push(u);save(d);SS.setItem("mocksess",JSON.stringify(sessOf(u)));authCbs.forEach(c=>c("SIGNED_IN",sessOf(u)));return ok({session:sessOf(u),user:u})},
  async signInWithPassword({email,password}){const u=db().users.find(u=>u.email===email&&u.password===password);if(!u)return err("Invalid login credentials");SS.setItem("mocksess",JSON.stringify(sessOf(u)));authCbs.forEach(c=>c("SIGNED_IN",sessOf(u)));return ok({session:sessOf(u)})},
  async signOut(){SS.removeItem("mocksess");authCbs.forEach(c=>c("SIGNED_OUT",null));return{error:null}},
  async getSession(){const s=SS.getItem("mocksess");return{data:{session:s?JSON.parse(s):null}}},
  onAuthStateChange(cb){authCbs.push(cb);const s=SS.getItem("mocksess");if(s)setTimeout(()=>cb("INITIAL_SESSION",JSON.parse(s)),0);return{data:{subscription:{unsubscribe(){}}}}},
  async signInWithOtp(){return ok({})},async verifyOtp(){return err("ikke i mock")}
};
const pk=()=>JSON.parse(LS.getItem("mockpres")||"{}");
const chans=[];
window.addEventListener("storage",e=>{if(e.key==="mockpres")chans.forEach(c=>c.sync&&c.sync())});
window.__chanLog=[];
function channel(name,opts){
  const key=opts&&opts.config&&opts.config.presence&&opts.config.presence.key;
  /* the real server only allows private channels named pres:<uuid> for presence; record what the app asks for */
  if(/^pres:/.test(name))window.__chanLog.push({name,priv:!!(opts&&opts.config&&opts.config.private)});
  else if(name==="pling-presence")window.__chanLog.push({name,priv:false,legacy:true});
  const ch={sync:null,on(type,f,cb){if(type==="presence"){if(f&&f.event==="sync")ch.sync=cb}else subs.push({cb,table:f&&f.table});return ch},
    subscribe(cb){chans.push(ch);if(cb)setTimeout(()=>cb("SUBSCRIBED"),0);if(ch.sync)setTimeout(()=>ch.sync(),0);return ch},
    track(p){const o=pk();o[key]=[p];LS.setItem("mockpres",JSON.stringify(o));setTimeout(()=>ch.sync&&ch.sync(),0);return Promise.resolve("ok")},
    untrack(){const o=pk();delete o[key];LS.setItem("mockpres",JSON.stringify(o));setTimeout(()=>ch.sync&&ch.sync(),0);return Promise.resolve("ok")},
    presenceState(){return pk()}};
  return ch}
const functions={async invoke(name,o){window.__lpCalls=(window.__lpCalls||0)+1;window.__lpLast={name,body:o&&o.body};
  if(window.__lpFail)return {data:{ok:false,error:"x"},error:null};
  const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return {data:{ok:true,ti:"Viktig sak i Bergen",d:"En lengre beskrivelse av saken som vises i kortet.",s:"Avisen",img:{ct:"image/png",b64:png}},error:null}}};
window.supabase={createClient:()=>({auth,from,rpc,channel,storage,functions,removeChannel(c){const i=chans.indexOf(c);if(i>=0)chans.splice(i,1)},removeAllChannels(){subs.length=0;chans.length=0}})};
})();
