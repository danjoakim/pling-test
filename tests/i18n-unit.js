// Tests for the language file: lookup and placeholders work, every key used by the app exists,
// and no key is left unused. Runs in Node (the TypeScript is bundled on the fly).
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-i18n-")),"i18n.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/i18n/index.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const {tr,messages}=await import(out);
 let n=0;const ok=(name,fn)=>{fn();n++;console.log("ok  ",name)};

 ok("fills placeholders and keeps unknown ones visible",()=>{
  assert.strictEqual(tr("invite.revoked",{n:3}),"3 aktive invitasjoner er trukket tilbake");
  assert.strictEqual(tr("gif.shrinking",{i:2,n:5}),"GIF-en er stor, gjør den mindre (2/5) …");
  assert.strictEqual(tr("friend.requestSent"),"Forespørsel sendt til {name}")});
 ok("unknown key throws",()=>assert.throws(()=>tr("no.such.key"),/Unknown text key/));

 const dir=path.join(__dirname,"../app");
 // texts are also used by the TypeScript modules in src/ (not the language files themselves)
 const sdir=path.join(__dirname,"../src");
 const src=[...fs.readdirSync(dir).filter(f=>f.endsWith(".js")||f.endsWith(".html")||f.endsWith(".py")).map(f=>fs.readFileSync(path.join(dir,f),"utf8")),
  ...fs.readdirSync(sdir).filter(f=>f.endsWith(".ts")).map(f=>fs.readFileSync(path.join(sdir,f),"utf8"))].join("\n");
 const used=new Set([...src.matchAll(/\btr\("([\w.]+)"/g)].map(m=>m[1]));
 for(const m of src.matchAll(/\{\{([a-z]+\.[\w.]+)\}\}/g))used.add(m[1]); // static page text in body.html
 ok("every key used in the app exists in the language file",()=>{
  const missing=[...used].filter(k=>!(k in messages));assert.deepStrictEqual(missing,[])});
 ok("no unused keys in the language file",()=>{
  const unused=Object.keys(messages).filter(k=>!used.has(k));assert.deepStrictEqual(unused,[])});
 ok("every placeholder in a text is a plain word",()=>{
  for(const [k,v] of Object.entries(messages))assert.ok(!/\{[^}\w]|\{\}/.test(v),k)});

 console.log(`all ${n} language tests passed`);
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
