// Unit test for the pure parts of src/links.ts. tests/fixtures/links-vectors.json was made by the JavaScript this module replaced
// (cutUrl, okHttp, firstUrl, linkify, validLk on 85 texts and 30 link cards, including hostile ones). Never regenerate it with new code.
// The page-level behavior (preview fetching, timeout, picture) is tested in tests/links.js.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-links-")),"links.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/links.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const L=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/links-vectors.json"),"utf8"));
 // the same stand-ins the fixture was made with, and the same piece-by-piece assembly as app/links.js linkify()
 const el=(tag,attrs,...kids)=>({tag,attrs,kids}),emojiNodes=t=>[{emoji:t}];
 const linkify=t=>{const o=[];for(const p of L.splitLinks(t)){if("url" in p){o.push(el("a",{class:"ulink",href:p.url,target:"_blank",rel:"noopener noreferrer nofollow"},p.url));if(p.tail)o.push(p.tail)}else o.push(...emojiNodes(p.text))}return o};
 let nt=0,nc=0,no=0;
 for(const c of V.texts){
  if("cut" in c){assert.deepStrictEqual(L.cutUrl(c.cut),c.r,"cutUrl("+JSON.stringify(c.cut)+")");nc++}
  else if("ok" in c){assert.strictEqual(L.okHttp(c.ok),c.r,"okHttp("+JSON.stringify(c.ok)+")");no++}
  else{assert.strictEqual(L.firstUrl(c.t),c.first,"firstUrl("+JSON.stringify(c.t.slice(0,60))+")");
   assert.deepStrictEqual(JSON.parse(JSON.stringify(linkify(c.t))),c.linkify,"linkify("+JSON.stringify(c.t.slice(0,60))+")");nt++}
 }
 console.log("ok   "+nt+" texts: firstUrl and linkify as before;",nc,"cutUrl;",no,"okHttp");
 let nl=0;for(const {x,r} of V.lk){
  const input=x==="__undefined__"?undefined:x,want=r==="__undefined__"?undefined:r;
  assert.deepStrictEqual(L.validLk(input),want===undefined?null:want,"validLk("+String(JSON.stringify(input)).slice(0,80)+")");nl++}
 console.log("ok   "+nl+" link cards validated as before");
 // hand-checked, so the fixture is not the only judge
 assert.strictEqual(L.firstUrl("Se https://example.com/side."),"https://example.com/side");
 assert.strictEqual(L.firstUrl("ingenting her"),null);assert.strictEqual(L.firstUrl("javascript:alert(1)"),null);
 assert.strictEqual(L.validLk({u:"javascript:alert(1)"}),null);
 assert.strictEqual(L.validLk({u:"https://a.b",i:"data:image/svg+xml;base64,AAAA"}).i,undefined);
 assert.deepStrictEqual(L.splitLinks("a https://x.y/z, b"),[{text:"a "},{url:"https://x.y/z",tail:","},{text:" b"}]);
 console.log("ok   hand-checked cases");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
