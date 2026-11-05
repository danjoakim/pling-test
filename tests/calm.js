const {chromium}=require("playwright");
const fs=require("fs"),http=require("http");const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8806);
const ok=(c,m)=>{if(!c){console.error("TESTFEIL",m);process.exit(1)}};
(async()=>{const br=await chromium.launch();
for(const [n,o] of [["mobil",{isMobile:true,hasTouch:true,viewport:{width:390,height:800}}],["maskin",{viewport:{width:1000,height:700}}]]){
 const ctx=await br.newContext(o);await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));await p.goto("http://localhost:8806/");
 const s=await p.evaluate(()=>{const h=getComputedStyle(document.documentElement),b=getComputedStyle(document.body);
  return {ob:h.overscrollBehaviorY,ta:b.touchAction,pos:b.position,ov:h.overflowY,sw:document.documentElement.scrollWidth<=innerWidth,sh:document.documentElement.scrollHeight<=innerHeight+1}});
 console.log(n,JSON.stringify(s));
 ok(s.ob==="none","ingen sprett i siden ("+n+")");ok(s.ta==="manipulation","ingen dobbelttrykk-zoom ("+n+")");
 if(n==="mobil"){ok(s.pos==="fixed"&&s.ov==="hidden","siden er låst på telefon");ok(s.sw&&s.sh,"ingen rulling i selve siden på telefon")}
 else ok(s.pos!=="fixed","desktop er uendret (ikke låst)");
 console.log("FEIL:",p.errs.length?p.errs:"ingen");await ctx.close()}
await br.close();srv.close()})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
