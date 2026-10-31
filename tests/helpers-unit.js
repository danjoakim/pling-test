// Unit test for src/helpers.ts. tests/fixtures/helpers-vectors.json has the answers of the inline code in main.js that this replaced
// (invitation from the page address, b64u, the mute list, dagTxt). Never regenerate it with new code.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-he-")),"helpers.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/helpers.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const H=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/helpers-vectors.json"),"utf8"));
 for(const c of V.invite)assert.deepStrictEqual(H.inviteFromHash(c.hash),c.out,"invite "+JSON.stringify(c.hash));
 console.log("ok   inviteFromHash gives the old answer for "+V.invite.length+" addresses");
 for(const c of V.b64)assert.strictEqual(H.b64url(Uint8Array.from(c.bytes)),c.out,"b64 "+c.bytes);
 console.log("ok   b64url gives the old text for "+V.b64.length+" byte lists");
 const w=(raw,id,on)=>{try{return H.withMuted(raw,id,on)}catch(e){return"__throws__"}};
 for(const c of V.mute){
  const t=JSON.stringify([c.raw,c.id]);
  assert.strictEqual(H.isMuted(c.raw,c.id),c.muted,"muted "+t);
  assert.strictEqual(w(c.raw,c.id,true),c.on,"mute "+t);
  assert.strictEqual(w(c.raw,c.id,false),c.off,"unmute "+t);
 }
 console.log("ok   isMuted and withMuted give the old answer in "+V.mute.length+" situations (including stored values that are not lists)");
 for(const c of V.days)assert.strictEqual(H.daysText(c.d),c.out,"days "+c.d);
 console.log("ok   daysText gives the old text in "+V.days.length+" cases");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
