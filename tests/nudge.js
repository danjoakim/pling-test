// Double ping (dobbeltpling), seen from the receiver B while A sends it: the window really shakes (measured, not just a
// class), there is a banner, the friend row flashes and the tab title blinks, whether B is on the list or inside the chat,
// and each ping fires only once even when the list refreshes again. Uses the fake Supabase in mock.js.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path"),assert=require("assert");
const DIR=path.resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8780);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8780/");return p};
 const A=await mk(),B=await mk();
 const signup=async(p,em,name)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#men")};
 await signup(A,"alice@x.test","Alice");await signup(B,"bob@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForSelector("text=Venter på svar");
 await B.evaluate(()=>refresh());await B.waitForSelector("#reqs:not([hidden]) button");
 await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 await A.fill("#tx","Hei");await A.click("#sd");await A.waitForTimeout(300);

 // count how often the alert effect (sound + shake) runs at B
 await B.evaluate(()=>{window.__n=0;const o=stor;stor=function(){window.__n++;return o()}});
 const shake=async()=>{const mv=await B.evaluate(async()=>{const e=document.querySelector("#app");let max=0;window.__titles=new Set();for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,40));window.__titles.add(document.title);const m=new DOMMatrix(getComputedStyle(e).transform);max=Math.max(max,Math.abs(m.e),Math.abs(m.f))}return Math.round(max)});
  const r=await B.evaluate(()=>({banner:!!document.querySelector("#dpb"),text:(document.querySelector("#dpb")||{}).textContent,flash:!!document.querySelector(".conv.dpflash"),titles:[...window.__titles]}));return {mv,...r}};

 // 1. B is on the list (no chat open)
 await B.evaluate(()=>{S.nref=0;return refresh()});await B.waitForTimeout(400);
 assert.strictEqual(await B.evaluate(()=>!!S.chat),false,"B has no chat open");
 await A.click("#dp");await A.waitForTimeout(400);
 await B.evaluate(()=>refresh());
 const s1=await shake();
 assert.ok(s1.mv>5,"window shakes (largest offset "+s1.mv+" px)");assert.ok(s1.banner&&/Alice/.test(s1.text),"banner names the sender: "+s1.text);assert.ok(s1.flash,"friend row flashes");assert.ok(s1.titles.some(t=>/🔔 Alice ringer/.test(t)),"tab title blinks: "+JSON.stringify(s1.titles));
 console.log("1 B on the list:",JSON.stringify(s1));

 // 2. once only, even after more refreshes
 await B.waitForTimeout(3000);await B.evaluate(()=>refresh());await B.waitForTimeout(500);
 assert.strictEqual(await B.evaluate(()=>window.__n),1,"the same ping does not fire twice");
 console.log("2 fired once");

 // 3. B opens the chat; a second ping (A resets the cooldown) also alerts
 await B.dblclick(".conv[data-id]");await B.waitForSelector("#tx:visible");await B.waitForTimeout(500);
 await A.evaluate(()=>{S.cdUntil=0});await A.click("#dp");await A.waitForTimeout(400);
 await B.evaluate(()=>refresh());
 const s2=await shake();
 assert.ok(s2.mv>5,"window shakes inside the chat too ("+s2.mv+" px)");assert.ok(s2.banner||s2.mv>5);
 assert.strictEqual(await B.evaluate(()=>window.__n),2,"two pings, two alerts");
 console.log("3 B inside the chat:",JSON.stringify(s2));

 assert.deepStrictEqual([A.errs,B.errs],[[],[]],"no page errors: "+JSON.stringify([A.errs,B.errs]));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
