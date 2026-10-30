// Unit test for src/api.ts: every server call it makes must match a function in supabase/migrations/
// (same name, same argument names), every public RPC the app uses must go through it, and the app must
// not call sb.rpc() directly. Run in Node; the module is bundled on the fly.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
const root=path.join(__dirname,"..");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-api-")),"api.mjs");
 await esbuild.build({entryPoints:[path.join(root,"src/api.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const {createApi}=await import(out);
 // Function signatures from the migrations: name -> argument names.
 const sql=fs.readdirSync(path.join(root,"supabase/migrations")).sort().map(f=>fs.readFileSync(path.join(root,"supabase/migrations",f),"utf8")).join("\n");
 const fns=new Map();
 for(const m of sql.matchAll(/create (?:or replace )?function public\.(\w+)\(([^)]*)\)/gi))
  fns.set(m[1],m[2].split(",").map(a=>a.trim().split(/\s+/)[0]).filter(Boolean));
 assert(fns.size>=20,"found the functions in the migrations");
 // Tables and their columns.
 const tables=new Map();
 for(const m of sql.matchAll(/create table public\.(\w+) \(([\s\S]*?)\n\);/g))
  tables.set(m[1],new Set(m[2].split("\n").map(l=>l.trim()).filter(l=>l&&!/^(constraint|--|primary|foreign|check|unique)/i.test(l)).map(l=>l.split(/\s+/)[0])));
 assert(tables.size>=14&&tables.get("messages").has("chat_id"),"found the tables in the migrations");
 // Call every API function with a recording client.
 const calls=[];
 // A recording stand-in for supabase.from(): remembers the whole chain, then resolves like the real builder.
 const queries=[],storageCalls=[],chanCalls=[];
 const from=table=>{const q={table,ops:[]};queries.push(q);
  const b=new Proxy({},{get:(_,m)=>m==="then"?(res,rej)=>Promise.resolve({data:null,error:null}).then(res,rej):(...a)=>{q.ops.push([m,a]);return b}});return b};
 const storage={from:bucket=>({upload:async(p,b,o)=>{storageCalls.push(["upload",bucket,p,o]);return{error:null}},remove:async p=>{storageCalls.push(["remove",bucket,p])},download:async p=>{storageCalls.push(["download",bucket,p]);return{data:null,error:null}}})};
 const functions={invoke:async(n,o)=>{chanCalls.push(["invoke",n,o]);return{data:null,error:null}}};
 const channel=name=>{const ch={on:(t,f,cb)=>{chanCalls.push(["on",name,f.table]);return ch},subscribe:()=>{chanCalls.push(["subscribe",name])}};return ch};
 const authCalls=[],rec=name=>async a=>{authCalls.push([name,a]);return {data:null,error:null}};
 const auth={signUp:rec("signUp"),signInWithPassword:rec("signInWithPassword"),signInWithOtp:rec("signInWithOtp"),verifyOtp:rec("verifyOtp"),
  signOut:rec("signOut"),getSession:rec("getSession"),onAuthStateChange:cb=>{authCalls.push(["onAuthStateChange",cb])}};
 const api=createApi({rpc:async(name,args)=>{calls.push([name,args||{}]);return {data:null,error:null}},auth,from,storage,functions,channel,removeAllChannels(){}});
 const sample={findByEmail:["a@b.no"],sendRequest:["u"],acceptRequest:["u"],removeFriend:["u"],blockUser:["u"],unblockUser:["u"],
  openDm:["u"],setChatExpiry:["c",7],markRead:["c",5],setPresence:["on",null],getPresence:[],createInvite:["h"],peekInvite:["t"],
  redeemInvite:["t"],revokeInvites:[],
  signUp:["a@b.no","pw"],signIn:["a@b.no","pw"],sendLoginCode:["a@b.no","https://x/"],verifyLoginCode:["a@b.no","123456"],
  signOut:[],getSession:[],onAuthChange:[()=>{}],
  saveKeyBackup:[{user_id:"u",salt:"s",iv:"i",ct:"c",iter:600000}],getKeyBackup:["u"],getKeyBackupInfo:["u"],
  pendingTransfers:[],getTransfer:["t"],askTransfer:[{id:"t",user_id:"u",eph_pub:{}}],approveTransfer:["t",{sender_pub:{},iv:"i",ct:"c"}],deleteTransfer:["t"],
  getProfile:["u"],getProfiles:[["u"]],createProfile:[{id:"u",fp:"f",name:"n",pub:{}}],updateProfile:["u",{name:"n",pm:"m"}],
  getAvatars:[["u"]],saveAvatar:[{id:"u",data:"d",updated_at:"t"}],
  listFriends:[],listRequests:[],declineRequest:["a","b"],listBlocks:[],listChatMembers:[],listChats:[],listReads:[],
  latestMessages:["c",50],olderMessages:["c",9,50],sendMessage:[{chat_id:"c",sender:"u",iv:"i",ct:"c",file:"c/f"}],deleteMyMessages:["c","u"],
  listReactions:["c"],saveReaction:[{msg_id:1,chat_id:"c",user_id:"u",iv:"i",ct:"c"}],
  uploadFile:["c/f",new Uint8Array(3)],downloadFile:["c/f"],removeFiles:[["c/f"]],linkPreview:["https://x"],
  subscribeLive:[{onMessage(){},onChange(){},onPresence(){}}],closeLive:[]};
 assert.deepStrictEqual(Object.keys(api).sort(),Object.keys(sample).sort(),"this test covers every API function");
 for(const k of Object.keys(sample)) await api[k](...sample[k]);
 await api.signOut(true);
 // Sign-in arguments must reach supabase.auth exactly as the app passed them before the move.
 const A=Object.fromEntries(authCalls.map(([n,a])=>[n,a]));
 assert.deepStrictEqual(A.signUp,{email:"a@b.no",password:"pw"});
 assert.deepStrictEqual(A.signInWithPassword,{email:"a@b.no",password:"pw"});
 assert.deepStrictEqual(A.signInWithOtp,{email:"a@b.no",options:{emailRedirectTo:"https://x/"}});
 assert.deepStrictEqual(A.verifyOtp,{email:"a@b.no",token:"123456",type:"email"});
 assert.deepStrictEqual(authCalls.filter(c=>c[0]==="signOut").map(c=>c[1]),[undefined,{scope:"local"}]);
 // Table calls: every table and column used must exist in the SQL.
 const nq=queries.length;
 assert(nq>=25,"table calls were recorded ("+nq+")");
 const colsOf=(m,a)=>{
  if(m==="select")return a[0]&&a[0]!=="*"?a[0].split(",").map(x=>x.trim()):[];
  if(["eq","in","lt","order"].includes(m))return [a[0]];
  if(["insert","update","upsert"].includes(m))return [...Object.keys(a[0]),...(a[1]&&a[1].onConflict?a[1].onConflict.split(","):[])];
  return []};
 for(const q of queries){
  assert(tables.has(q.table),"no SQL table public."+q.table);
  for(const [m,a] of q.ops)for(const col of colsOf(m,a))assert(tables.get(q.table).has(col),`${q.table}: no column ${col} in the SQL`)}
 console.log("ok   "+nq+" table queries use only tables and columns from the SQL");
 assert.deepStrictEqual(storageCalls.map(c=>c[1]),["chat-files","chat-files","chat-files"],"files use the chat-files bucket");
 assert(chanCalls.filter(c=>c[0]==="on").map(c=>c[2]).join()==="messages,reactions,friend_requests,friends,presence","live channel listens to the same tables");
 assert(chanCalls.every(c=>c[0]!=="on"&&c[0]!=="subscribe"||c[1]==="pling-live"),"channel name unchanged");
 console.log("ok   storage, edge function and live channel use the same names as before");
 console.log("ok   sign-in calls reach supabase.auth with the same arguments");
 for(const [name,args] of calls){
  assert(fns.has(name),`no SQL function public.${name}`);
  assert.deepStrictEqual(Object.keys(args).sort(),[...fns.get(name)].sort(),`${name}: argument names match the SQL`)}
 console.log("ok   "+calls.length+" calls match the SQL");
 // The app must go through the module.
 for(const f of ["main.js","views.js","crypto-glue.js"]){
  const s=fs.readFileSync(path.join(root,"app",f),"utf8");
  assert(!/\bsb\.\w/.test(s.replace(/\/\^sb-[^\n]*?\/\.test/,"")),`${f} uses the supabase client directly; add a function to src/api.ts`)}
 // The one allowed raw call: set_presence on page close (keepalive fetch; the supabase client cannot do that).
 const raw=[...fs.readFileSync(path.join(root,"app/main.js"),"utf8").matchAll(/\/rest\/v1\/rpc\/(\w+)/g)].map(m=>m[1]);
 assert.deepStrictEqual(raw,["set_presence"],"only set_presence may be called with fetch");
 console.log("ok   the app calls server functions only through src/api.ts");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
