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
 // Call every API function with a recording client.
 const calls=[];
 const api=createApi({rpc:async(name,args)=>{calls.push([name,args||{}]);return {data:null,error:null}}});
 const sample={findByEmail:["a@b.no"],sendRequest:["u"],acceptRequest:["u"],removeFriend:["u"],blockUser:["u"],unblockUser:["u"],
  openDm:["u"],setChatExpiry:["c",7],markRead:["c",5],setPresence:["on",null],getPresence:[],createInvite:["h"],peekInvite:["t"],
  redeemInvite:["t"],revokeInvites:[]};
 assert.deepStrictEqual(Object.keys(api).sort(),Object.keys(sample).sort(),"this test covers every API function");
 for(const k of Object.keys(sample)) await api[k](...sample[k]);
 for(const [name,args] of calls){
  assert(fns.has(name),`no SQL function public.${name}`);
  assert.deepStrictEqual(Object.keys(args).sort(),[...fns.get(name)].sort(),`${name}: argument names match the SQL`)}
 console.log("ok   "+calls.length+" calls match the SQL");
 // The app must go through the module.
 for(const f of ["main.js","views.js","crypto-glue.js"]){
  const s=fs.readFileSync(path.join(root,"app",f),"utf8");
  assert(!/\bsb\.rpc\(/.test(s),`${f} calls sb.rpc directly; add a function to src/api.ts`)}
 // The one allowed raw call: set_presence on page close (keepalive fetch; the supabase client cannot do that).
 const raw=[...fs.readFileSync(path.join(root,"app/main.js"),"utf8").matchAll(/\/rest\/v1\/rpc\/(\w+)/g)].map(m=>m[1]);
 assert.deepStrictEqual(raw,["set_presence"],"only set_presence may be called with fetch");
 console.log("ok   the app calls server functions only through src/api.ts");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
