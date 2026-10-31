// Unit test for src/previews.ts. tests/fixtures/previews-vectors.json has the answers of the inline code in main.js that this replaced
// (the list text of a message in two places, the shortened list line, the page title). Never regenerate it with new code.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-pv-")),"previews.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/previews.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const P=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/previews-vectors.json"),"utf8"));
 for(const c of V.raw)assert.strictEqual(P.previewText(c.m==="__undefined__"?undefined:c.m),c.out,"raw "+JSON.stringify(c.m));
 console.log("ok   previewText gives the old answer for "+V.raw.length+" raw messages (list refresh)");
 // the open chat passes a decoded message (or null when it could not be opened): same answer as the old second copy of the rule
 for(const c of V.decoded)assert.strictEqual(P.previewText(c.l.ok?c.l:null),c.out,"decoded "+JSON.stringify(c.l));
 console.log("ok   previewText gives the old answer for "+V.decoded.length+" decoded messages (open chat)");
 for(const c of V.line)assert.strictEqual(P.listLine(c.l==="__undefined__"?undefined:c.l),c.out,"line "+JSON.stringify(c.l));
 console.log("ok   listLine gives the old answer in "+V.line.length+" cases");
 for(const c of V.title)assert.strictEqual(P.pageTitle(c.u),c.out,"title "+c.u);
 assert.strictEqual(P.pageTitle(new Map([["a",2],["b",3]]).values()),"(5) Prek! testside","also takes an iterator");
 console.log("ok   pageTitle gives the old answer in "+V.title.length+" cases");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
