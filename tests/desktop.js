// Inside the desktop app (Tauri) a click on a link to another address must go to the system browser (the opener plugin) and must not
// replace the app window. This test fakes the Tauri side (window.__TAURI_INTERNALS__.invoke) and clicks links in the built page.
// On the web (no Tauri) the same click must be left alone.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),assert=require("assert");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8787);
async function open(br,withTauri){
 const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});
 if(withTauri)await p.addInitScript(()=>{window.__calls=[];window.__TAURI_INTERNALS__={invoke:(cmd,args)=>{window.__calls.push([cmd,args]);return Promise.resolve()}}});
 await p.goto("http://localhost:8787/");await p.waitForFunction(()=>typeof shrink==="function");
 return{ctx,p};
}
// click a link and report whether the page's own code prevented the default action (a later listener sees defaultPrevented)
const click=(p,href,target)=>p.evaluate(([href,target])=>{
 const a=document.createElement("a");a.href=href;if(target)a.target=target;a.textContent="x";document.body.append(a);
 let prevented=null;document.addEventListener("click",e=>{prevented=e.defaultPrevented;e.preventDefault()},{once:true}); // never really navigate in the test
 a.click();a.remove();return{prevented,calls:window.__calls||null};
},[href,target]);
(async()=>{
 const br=await chromium.launch();
 // in the desktop app
 let {ctx,p}=await open(br,true);
 let r=await click(p,"https://example.com/page?a=1","_blank");
 assert.strictEqual(r.prevented,true,"external link: the app window is not replaced");
 assert.deepStrictEqual(r.calls,[["plugin:opener|open_url",{url:"https://example.com/page?a=1"}]],"external link goes to the system browser");
 r=await click(p,"mailto:a@b.no");assert.deepStrictEqual(r.calls.slice(1),[["plugin:opener|open_url",{url:"mailto:a@b.no"}]],"mail link too");
 const before=(await p.evaluate(()=>window.__calls.length));
 r=await click(p,"#godkjenn");assert.strictEqual(r.prevented,false,"link inside the page is left alone");assert.strictEqual(r.calls.length,before);
 r=await click(p,"http://localhost:8787/other");assert.strictEqual(r.prevented,false,"link to the page's own address is left alone");assert.strictEqual(r.calls.length,before);
 console.log("1 in the desktop app: external and mail links go to the system browser, links inside the page stay");
 // a click on something inside a link (like the card in a link preview)
 const inner=await p.evaluate(()=>{const a=document.createElement("a");a.href="https://example.com/card";a.target="_blank";const s=document.createElement("span");s.textContent="inner";a.append(s);document.body.append(a);document.addEventListener("click",e=>e.preventDefault(),{once:true});s.click();a.remove();return window.__calls.slice(-1)[0]});
 assert.deepStrictEqual(inner,["plugin:opener|open_url",{url:"https://example.com/card"}]);
 console.log("2 a click on an element inside a link works too");
 // the page fills the whole app window (no frame, border, rounded corners or shadow), in the dark and the light theme
 const box=()=>p.evaluate(()=>{const w=document.querySelector(".win"),r=w.getBoundingClientRect(),c=getComputedStyle(w);return{x:r.x,y:r.y,w:r.width,h:r.height,iw:innerWidth,ih:innerHeight,desk:document.documentElement.classList.contains("desk"),radius:c.borderTopLeftRadius,border:c.borderLeftWidth,shadow:c.boxShadow}});
 for(const th of ["moerk","lys"]){
  await p.evaluate(t=>window.plingTheme(t),th);
  const b=await box();
  assert.ok(b.desk,"class desk is set in the app");
  assert.deepStrictEqual([b.x,b.y,b.w,b.h],[0,0,b.iw,b.ih],"fills the window ("+th+")");
  assert.deepStrictEqual([b.radius,b.border,b.shadow],["0px","0px","none"],"no rounded corners, border or shadow ("+th+")");
 }
 console.log("2b the page fills the whole app window in both themes");
 assert.deepStrictEqual(p.errs,[],"no page errors: "+JSON.stringify(p.errs));await ctx.close();
 // on the web
 ({ctx,p}=await open(br,false));
 r=await click(p,"https://example.com/page","_blank");
 assert.strictEqual(r.prevented,false,"on the web the click is not touched");assert.strictEqual(r.calls,null);
 for(const th of ["moerk","lys"]){
  await p.evaluate(t=>window.plingTheme(t),th);const b=await box();
  assert.ok(!b.desk,"no class desk on the web");
  assert.ok(b.w<=940&&b.h<=680&&b.x>0&&b.y>0,"on the web the page is a framed window on a background ("+th+"): "+JSON.stringify([b.x,b.y,b.w,b.h]));
  assert.ok(b.radius!=="0px"&&b.shadow!=="none","with rounded corners and shadow ("+th+")");
 }
 console.log("3 on the web nothing changes");
 assert.deepStrictEqual(p.errs,[],"no page errors: "+JSON.stringify(p.errs));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
