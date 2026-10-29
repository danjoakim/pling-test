const {chromium}=require("playwright");
const fs=require("fs"),http=require("http");const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{r.setHeader("content-type","text/html; charset=utf-8");r.end(fs.readFileSync(DIR+"index.html"))}).listen(8776);
(async()=>{const br=await chromium.launch();
for(const [n,o] of [["mobil",{isMobile:true,hasTouch:true,viewport:{width:390,height:800}}],["maskin",{viewport:{width:1000,height:700}}]]){
const ctx=await br.newContext(o);await ctx.route("**/supabase.min.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
const p=await ctx.newPage();await p.goto("http://localhost:8776/");
console.log(n,"kamera-knapp:",await p.evaluate(()=>getComputedStyle(document.querySelector("#cb")).display+" | pointer coarse: "+matchMedia("(pointer:coarse)").matches));await ctx.close()}
await br.close();srv.close()})();
