const {chromium}=require("playwright");
const http=require("http"),fs=require("fs");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8807);
const ok=(c,m)=>{if(!c){console.error("TESTFEIL",m);process.exit(1)}};
// A fake of window.__TAURI__ (what Tauri's updater and process plugins give the page). mode: "new" | "none" | "throw" | "failinstall"
const fake=mode=>`window.__TAURI__={process:{relaunch:async()=>{window.__relaunched=(window.__relaunched||0)+1}},updater:{check:async()=>{window.__checks=(window.__checks||0)+1;
 if("${mode}"==="throw")throw new Error("offline");if("${mode}"==="none")return null;
 return {version:"0.1.99",downloadAndInstall:async cb=>{cb({event:"Started",data:{contentLength:200}});await new Promise(r=>setTimeout(r,150));cb({event:"Progress",data:{chunkLength:100}});await new Promise(r=>setTimeout(r,150));
  if("${mode}"==="failinstall")throw new Error("sig");cb({event:"Progress",data:{chunkLength:100}});cb({event:"Finished"})}}}}};`;
(async()=>{
 const br=await chromium.launch();
 const open=async mode=>{const ctx=await br.newContext({viewport:{width:1000,height:700}});await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
  if(mode)await ctx.addInitScript(fake(mode));const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));await p.goto("http://localhost:8807/");return p};
 // web: nothing happens
 let p=await open(null);ok(await p.evaluate(()=>typeof updCheck)==="function","updCheck finnes");await p.evaluate(()=>updCheck());
 ok(await p.locator("#upd").count()===0,"ingen linje på nett");console.log("1 nett: ingen linje, feil:",p.errs.length?p.errs:"ingen");
 // ingen ny versjon
 p=await open("none");await p.evaluate(()=>updCheck());ok(await p.locator("#upd").count()===0,"ingen linje uten ny versjon");console.log("2 ingen ny versjon: ingen linje | sjekket:",await p.evaluate(()=>window.__checks));
 // feil ved sjekk (frakoblet): stille
 p=await open("throw");await p.evaluate(()=>updCheck());ok(await p.locator("#upd").count()===0,"stille ved feil");console.log("3 sjekk feilet: stille, feil:",p.errs.length?p.errs:"ingen");
 // ny versjon, «Senere»
 p=await open("new");await p.evaluate(()=>updCheck());await p.waitForSelector("#upd");
 console.log("4 linje:",await p.textContent("#upd"));ok((await p.textContent("#upd")).includes("0.1.99"),"viser versjonen");
 await p.screenshot({path:"upd1.png"});
 await p.click("#upd button:has-text('Senere')");ok(await p.locator("#upd").count()===0,"Senere lukker");
 // ny versjon, oppdater
 await p.evaluate(()=>updCheck());await p.waitForSelector("#upd");await p.click("#upd button:has-text('Oppdater nå')");
 await p.waitForFunction(()=>/Laster ned/.test(document.querySelector("#upd").textContent));
 await p.waitForFunction(()=>window.__relaunched===1,null,{timeout:5000});
 console.log("5 etter oppdatering:",await p.textContent("#upd"),"| omstart:",await p.evaluate(()=>window.__relaunched));
 // mislykket installasjon
 p=await open("failinstall");await p.evaluate(()=>updCheck());await p.waitForSelector("#upd");await p.click("#upd button:has-text('Oppdater nå')");
 await p.waitForFunction(()=>/mislyktes/.test(document.querySelector("#upd").textContent));
 ok(await p.evaluate(()=>!window.__relaunched),"ingen omstart når installasjon feiler");
 ok(await p.locator("#upd button:has-text('Oppdater nå')").isEnabled(),"kan prøve igjen");
 console.log("6 feilet:",await p.textContent("#upd"));
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
