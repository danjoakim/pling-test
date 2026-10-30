// Unit test for src/sound.ts. tests/fixtures/sound-vectors.json holds every call the old JavaScript made on an audio context
// (which oscillators and gains were made, with which frequencies, envelopes, connections and start/stop times). If the new code
// makes exactly the same calls, the sound is the same. Never regenerate the fixture with new code.
// tests/sound.js separately renders the sounds in a browser and measures them.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
function record(fn){
 const log=[];let n=0;
 const param=(id,name)=>new Proxy({},{set(_,k,v){if(k==="value")log.push(["param",id,name,"value",v]);return true},get(_,k){return(...a)=>log.push(["call",id,name,k,a])}});
 const node=kind=>{const id=++n;log.push(["new",kind,id]);const params={};
  return new Proxy({id},{get(t,k){if(k==="id")return id;
    if(["frequency","gain","threshold","knee","ratio","attack","release"].includes(k))return params[k]||(params[k]=param(id,k));
    if(k==="connect")return o=>{log.push(["connect",id,o.id]);return o};
    if(k==="start"||k==="stop")return(...a)=>log.push([k,id,a]);
    return t[k]},set(t,k,v){log.push(["set",id,k,v]);t[k]=v;return true}})};
 const ctx={currentTime:1.25,state:"running",destination:{id:0},createOscillator:()=>node("osc"),createGain:()=>node("gain"),createDynamicsCompressor:()=>node("comp")};
 fn(ctx);return log}
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-sound-")),"sound.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/sound.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const S=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/sound-vectors.json"),"utf8"));
 const cases={
  pling_default:c=>S.pling(c),
  pling_args:c=>S.pling(c,.2,.5),
  pling_twice_same_context:c=>{S.pling(c);S.pling(c,.05,1)},
  marimba_direct:c=>S.marimba(c,100,.3,.5),
  double_ping:c=>S.dobbelt(c),
  ringing_direct:c=>S.ringing(c,.1),
  double_ping_after_pling_same_context:c=>{S.pling(c);S.dobbelt(c)}};
 assert.deepStrictEqual(Object.keys(cases).sort(),Object.keys(V.cases).sort(),"same cases as the fixture");
 for(const [k,f] of Object.entries(cases)){
  // JSON round trip, as the fixture went through it
  const got=JSON.parse(JSON.stringify(record(f)));
  assert.deepStrictEqual(got,V.cases[k],k+": same audio calls as the old code");
  console.log("ok   "+k+" ("+got.length+" calls)");
 }
 // hand-checked, so the fixture is not the only judge: the message sound is three notes (4 oscillators each), the double ping 2 rounds x 2 bells x 4 parts
 const count=f=>record(f).filter(e=>e[0]==="new"&&e[1]==="osc").length;
 assert.strictEqual(count(c=>S.pling(c)),12);assert.strictEqual(count(c=>S.dobbelt(c)),16);
 // one compressor per context, however many sounds
 assert.strictEqual(record(c=>{S.pling(c);S.dobbelt(c);S.pling(c)}).filter(e=>e[0]==="new"&&e[1]==="comp").length,1);
 console.log("ok   hand-checked counts");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
