/* Versjon og byggekode vises under «Personvern og hjelp» og stemmer med det som står i siden (og dermed med navnet på nedlastingene i desktop.yml). */
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const html=fs.readFileSync(DIR+"index.html","utf8");
const m=html.match(/PREK_VERSION="([^"]+)",PREK_BUILD="([0-9a-f]{7})"/);
const pkg=JSON.parse(fs.readFileSync(DIR+"package.json","utf8"));
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8789);
let bad=0;const ck=(n,ok,x)=>{console.log(ok?"ok  ":"FEIL",n,x===undefined?"":JSON.stringify(x));if(!ok)bad++};
(async()=>{
 ck("siden har versjon og 7-tegns byggekode",!!m,m&&m.slice(1));
 ck("versjonen er den fra package.json",!!m&&m[1]===pkg.version,[m&&m[1],pkg.version]);
 ck("ingen plassholdere igjen",!/@@(VERSION|BUILD)@@/.test(html));
 ck("desktop.yml leser samme to verdier fra siden",/PREK_VERSION="\[\^"\]\*"/.test(fs.readFileSync(DIR+".github/workflows/desktop.yml","utf8"))&&/PREK_BUILD="\[\^"\]\*"/.test(fs.readFileSync(DIR+".github/workflows/desktop.yml","utf8")));
 const br=await chromium.launch();const ctx=await br.newContext();
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
 await p.goto("http://localhost:8789/");await p.click("text=Personvern og hjelp");await p.waitForSelector("#info:not([hidden])");
 const txt=await p.textContent("#info .infot");
 ck("hjelpedialogen viser «Versjon X, bygg Y»",!!m&&txt.includes("Versjon "+m[1]+", bygg "+m[2]),txt.slice(-60));
 ck("ingen feil i siden",errs.length===0,errs);
 await br.close();srv.close();
 console.log(bad?bad+" FEIL":"alt ok");process.exit(bad?1:0);
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
