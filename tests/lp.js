const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8803);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8803/");return p};
 const A=await mk(),B=await mk();
 const signup=async(p,em,name)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#addf")};
 await signup(A,"alice@x.test","Alice");await signup(B,"bob@x.test","Bob");
 console.log("1 hovedvindu:",await A.textContent("#men"),"|",await B.textContent("#men"),"| lås synlig:",await A.isVisible("#lock"));
 await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForSelector("text=Venter på svar");
 console.log("2 A venter:",await A.textContent("#friends"));
 await B.evaluate(()=>refresh());await B.waitForSelector("#reqs:not([hidden]) button");
 console.log("3 B forespørsel:",(await B.textContent("#reqs")).replace(/\s+/g," "));
 await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");
 console.log("4 venner:",await A.textContent(".conv[data-id]"),"|",await B.textContent(".conv[data-id]"));
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 await A.fill("#tx","Første :)");await A.click("#sd");await A.waitForTimeout(300);
 await A.fill("#tx","Andre melding med en ganske lang tekst som skal kuttes når den vises i listen fordi den er lengre enn seksti tegn");await A.click("#sd");await A.waitForTimeout(300);
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 await B.dblclick(".conv[data-id]");await B.waitForSelector("#tx:visible");
 const fire=(sel,type,dx=0)=>A.evaluate(([sel,type,dx])=>{const e=document.querySelector(sel).getBoundingClientRect();document.querySelector(sel).dispatchEvent(new PointerEvent(type,{pointerType:"touch",bubbles:true,clientX:e.left+20+dx,clientY:e.top+10,isPrimary:true}))},[sel,type,dx]);
 const S1="#log .m:first-of-type";
 // kort trykk: ingen meny
 await fire(S1,"pointerdown");await A.waitForTimeout(150);await fire(S1,"pointerup");await A.waitForTimeout(500);
 console.log("kort trykk åpner ikke:",await A.locator(".rxp").count()===0);
 // flytter fingeren: avbrytes
 await fire(S1,"pointerdown");await A.waitForTimeout(100);await A.evaluate(()=>document.dispatchEvent(new PointerEvent("pointermove",{pointerType:"touch",bubbles:true,clientX:400,clientY:400})));await A.waitForTimeout(600);await fire(S1,"pointerup");
 console.log("flytting avbryter:",await A.locator(".rxp").count()===0);
 // lang trykk
 await fire(S1,"pointerdown");await A.waitForTimeout(650);
 console.log("lang trykk åpner menyen:",await A.locator(".rxp").count()===1,"| Kopier med:",await A.locator(".rxp .rxk").count()===1,"| markert:",await A.evaluate(()=>document.querySelector("#log .m.lpd")!==null));
 await fire(S1,"pointerup");
 await A.screenshot({path:"lp1.png"});
 await A.context().grantPermissions(["clipboard-read","clipboard-write"]);
 await A.click(".rxp .rxk");await A.waitForTimeout(300);
 console.log("kopiert:",JSON.stringify(await A.evaluate(()=>navigator.clipboard.readText().catch(e=>"FEIL "+e.message))),"| meny lukket:",await A.locator(".rxp").count()===0);
 // reager via lang trykk
 await fire(S1,"pointerdown");await A.waitForTimeout(650);await fire(S1,"pointerup");
 await A.click(".rxp .rxo:nth-child(2)");await A.waitForTimeout(400);
 console.log("reaksjon via lang trykk:",JSON.stringify(await A.evaluate(()=>[...document.querySelectorAll("#log .m:first-of-type .rxc")].map(c=>c.getAttribute("aria-label")))));
 console.log("FEIL A:",A.errs.length?A.errs:"ingen","| B:",B.errs.length?B.errs:"ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
