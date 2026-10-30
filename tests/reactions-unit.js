// Unit test for src/reactions.ts. tests/fixtures/reactions-vectors.json has the answers of the JavaScript this replaced (loadReacts) for
// 27 situations: valid reactions, moved or forged ones, unknown kinds, undecryptable rows, failing calls. Never regenerate it with new code.
// groupReactions, applyReaction, reactionPayload and menuPosition were small pieces inside bigger functions; they are checked by hand here
// and in tests/reactions.js (in a browser).
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-rx-")),"reactions.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/reactions.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const R=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/reactions-vectors.json"),"utf8"));
 const ok=new Set(V.ids);let n=0;
 for(const [name,c] of Object.entries(V.cases)){
  const payloads=Object.fromEntries(c.rows.map(r=>[r.ct,r.p==="__undefined__"?undefined:r.p]));
  const list=async()=>{if(c.listThrows)throw new Error("net");if(c.list==="__rows__")return{data:c.rows.map(({msg_id,user_id,iv,ct})=>({msg_id,user_id,iv,ct})),error:null};return c.list==="__undefined__"?undefined:c.list};
  const open=async(iv,ct)=>{const p=payloads[ct];if(p==="__throw__")throw new Error("boom");return p};
  const r=await R.loadReactions(list,open,ok);
  const got=r===null?null:{map:[...r.map].map(([k,v])=>[k,[...v]]),sig:r.sig};
  assert.deepStrictEqual(got,c.result,name);n++;
 }
 console.log("ok   loadReactions gives the old answer in "+n+" situations");
 // hand-checked
 const g=R.groupReactions(new Map([["u1","heart"],["u2","rofl"],["u3","heart"]]));
 assert.deepStrictEqual([...g],[["heart",["u1","u3"]],["rofl",["u2"]]]);
 const rx=new Map();
 R.applyReaction(rx,7,"me","cry");assert.deepStrictEqual([...rx.get(7)],[["me","cry"]]);
 R.applyReaction(rx,7,"me","heart");assert.deepStrictEqual([...rx.get(7)],[["me","heart"]]);
 R.applyReaction(rx,7,"you","cry");R.applyReaction(rx,7,"me",null);assert.deepStrictEqual([...rx.get(7)],[["you","cry"]]);
 R.applyReaction(rx,8,"me",null);assert.strictEqual(rx.get(8).size,0,"removing on a message without reactions leaves an empty entry, as before");
 assert.deepStrictEqual(R.reactionPayload("heart",3,"me"),{r:"heart",m:3,u:"me"});
 assert.deepStrictEqual(R.reactionPayload(null,3,"me"),{r:"",m:3,u:"me"});
 // menu: wide screen, button near the right edge
 assert.deepStrictEqual(R.menuPosition({right:500,top:300,bottom:320},200,50,1000),{x:300,y:244});
 assert.deepStrictEqual(R.menuPosition({right:50,top:300,bottom:320},200,50,1000),{x:8,y:244},"not closer than 8 px to the left");
 assert.deepStrictEqual(R.menuPosition({right:1100,top:300,bottom:320},200,50,1000),{x:792,y:244},"not closer than 8 px to the right");
 assert.deepStrictEqual(R.menuPosition({right:500,top:40,bottom:60},200,50,1000),{x:300,y:66},"below the button when there is no room above");
 assert.deepStrictEqual(R.menuPosition({right:500,top:64,bottom:84},200,50,1000),{x:300,y:8},"exactly 8 px from the top is still above");
 console.log("ok   hand-checked cases");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
