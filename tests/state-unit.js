// Unit test for src/state.ts. Three checks:
// 1. createState() gives exactly the starting values of the object that used to be written out in main.js
//    (tests/fixtures/state-vectors.json, made from that old code; never regenerate it with new code).
// 2. Every S.name used in app/*.js is described in the AppState interface (a misspelled name would silently become a new field).
// 3. Every field described in AppState is used somewhere in app/*.js (no dead fields).
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild"),ts=require("typescript");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-st-")),"state.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/state.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const M=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/state-vectors.json"),"utf8")).initial;
 const s=M.createState();
 const got=Object.fromEntries(Object.entries(s).map(([k,v])=>[k,Object.prototype.toString.call(v)==="[object Map]"?(v.size?"__nonempty__":"__Map__"):v]));
 assert.deepStrictEqual(got,V,"starting values");
 assert.notStrictEqual(M.createState().friends,s.friends,"each call makes new arrays");
 assert.notStrictEqual(M.createState().pres,s.pres,"each call makes new maps");
 console.log("ok   createState gives the old starting values ("+Object.keys(V).length+" fields)");
 // fields in the interface
 const file=path.join(__dirname,"../src/state.ts"),sf=ts.createSourceFile(file,fs.readFileSync(file,"utf8"),ts.ScriptTarget.ES2020,true);
 const declared=new Set();
 sf.forEachChild(n=>{if(ts.isInterfaceDeclaration(n)&&n.name.text==="AppState")n.members.forEach(m=>{if(ts.isPropertySignature(m))declared.add(m.name.text)})});
 assert.ok(declared.size>=40,"found the fields of AppState: "+declared.size);
 for(const k of Object.keys(V))assert.ok(declared.has(k),"start value for a field that is not declared: "+k);
 // usage in app files
 const dir=path.join(__dirname,"../app"),used=new Map();
 for(const f of fs.readdirSync(dir).filter(f=>f.endsWith(".js")&&f!=="bundle.js"&&f!=="build.py")){
  const code=fs.readFileSync(path.join(dir,f),"utf8").split("\n").filter(l=>!/^\s*\/\/#/.test(l)).join("\n");
  for(const m of code.matchAll(/(?<![\w$.])S\.([A-Za-z_$][\w$]*)/g))used.set(m[1],(used.get(m[1])||0)+1);
 }
 const undeclared=[...used.keys()].filter(k=>!declared.has(k)),unused=[...declared].filter(k=>!used.has(k));
 assert.deepStrictEqual(undeclared,[],"used in the app but not in AppState: "+undeclared);
 assert.deepStrictEqual(unused,[],"in AppState but never used: "+unused);
 console.log("ok   "+declared.size+" fields in AppState, all used, none missing");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
