// Unit test for okAv() and hue() in src/avatar.ts against tests/fixtures/avatar-vectors.json, made by the JavaScript they replaced
// (valid and invalid data URLs, odd inputs, names in many scripts). okAv decides what may be put into img.src, so it is tested hard.
const fs=require("fs"),os=require("os"),path=require("path"),assert=require("assert");
const esbuild=require("esbuild");
(async()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"prek-av-")),"avatar.mjs");
 await esbuild.build({entryPoints:[path.join(__dirname,"../src/avatar.ts")],bundle:true,format:"esm",outfile:out,logLevel:"silent"});
 const A=await import(out);
 const V=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures/avatar-vectors.json"),"utf8"));
 const P="data:image/jpeg;base64,";
 const non=[null,undefined,0,1,true,{},[],[P+"AAAA"],{startsWith(){return true},length:5},()=>P];
 assert.strictEqual(non.length,V.nonstrings);
 let n=0;
 for(const [s,want] of V.okAv){const v=s.startsWith("#nonstring")?non[Number(s.slice(10))]:s;assert.strictEqual(A.okAv(v),want,"okAv("+JSON.stringify(s).slice(0,60)+")");n++}
 console.log("ok   okAv gives the same answer as before for",n,"inputs");
 for(const [s,want] of V.hue)assert.strictEqual(A.hue(s),want,"hue("+JSON.stringify(s).slice(0,30)+")");
 console.log("ok   hue gives the same color as before for",V.hue.length,"names");
 // hand-checked: the limit is under 12000 characters, JPEG only, base64 characters only
 assert.strictEqual(A.okAv(P+"A".repeat(11976)),true);assert.strictEqual(A.okAv(P+"A".repeat(11977)),false);
 assert.strictEqual(A.okAv("data:image/png;base64,AAAA"),false);assert.strictEqual(A.okAv(P+"<script>"),false);assert.strictEqual(A.okAv(null),false);
 console.log("ok   hand-checked limits");
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
