// Unit test for src/presence.ts. tests/fixtures/presence-vectors.json has the answers of the inline code in main.js that this replaced
// (presEvt, pullPresence, trackMe, drawTyping). Never regenerate it with new code.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-pr-")),"presence.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/presence.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const P=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/presence-vectors.json"),"utf8")),NOW=V.now;
 const ST={online:"on",away:"away",busy:"busy",off:"off"},isStatus=s=>!!ST[s],mp=m=>[...m];
 const U=v=>v==="__undefined__"?undefined:v;
 for(const c of V.events){
  const w={me:c.signedIn?"me":null,pres:new Map(c.world.pres),typ:new Map(c.world.typ),typAt:new Map(c.world.typAt),isStatus};
  const r=P.applyPresenceEvent(w,U(c.e),NOW),tag=JSON.stringify([c.world,c.e,c.signedIn]);
  assert.deepStrictEqual(r,c.res,"result "+tag);
  assert.deepStrictEqual([mp(w.pres),mp(w.typ),mp(w.typAt)],[c.pres,c.typ,c.typAt],"maps "+tag);
 }
 console.log("ok   applyPresenceEvent gives the old answer and maps in "+V.events.length+" situations");
 for(const seq of V.sequence){
  const w={me:"me",pres:new Map(),typ:new Map(),typAt:new Map(),isStatus};
  for(const s of seq){assert.deepStrictEqual(P.applyPresenceEvent(w,s.e,s.t),s.res);assert.deepStrictEqual(mp(w.typ),s.typ,"the same typing signal counts once")}
 }
 console.log("ok   a repeated typing signal counts once");
 for(const c of V.pull){
  const typ=new Map([["old",{n:1,c:"x",seen:1}]]);
  const m=P.presenceFromRows(c.rows==="__null__"?[]:c.rows,{me:"me",status:c.status,typ,isStatus,stale:50},NOW);
  assert.deepStrictEqual([mp(m),mp(typ)],c.rows==="__null__"?[c.pres,[["old",{n:1,c:"x",seen:1}]]]:[c.pres,c.typ],"pull "+JSON.stringify([c.rows,c.status]));
 }
 console.log("ok   presenceFromRows gives the old map and typing in "+V.pull.length+" situations");
 for(const c of V.track){
  const plan=P.trackPlan(NOW,U(c.lastTrack),c.force);
  if(c.res.wait!==undefined)assert.deepStrictEqual(plan,{wait:c.res.wait},"wait "+JSON.stringify(c));
  else{assert.strictEqual(plan,null,"send now "+JSON.stringify(c));assert.strictEqual(P.typingToSend(U(c.myTyp),NOW),c.res.typ,"typing "+JSON.stringify(c))}
 }
 console.log("ok   trackPlan and typingToSend give the old answer in "+V.track.length+" situations");
 for(const c of V.typing){
  const x=U(c.x);
  assert.deepStrictEqual(P.typingShown(x,{id:"c1",other:"f1"},new Map(c.online?[["f1","online"]]:[]),NOW),c.res,"typing "+JSON.stringify(c));
 }
 console.log("ok   typingShown gives the old answer in "+V.typing.length+" situations");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
