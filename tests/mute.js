const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8804);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8804/");return p};
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

 const cnt=p=>p.evaluate(()=>[window.__pl,window.__st]);
 for(const p of [A,B])await p.evaluate(()=>{window.__pl=0;window.__st=0;const o=window.pling,o2=window.stor;window.pling=function(){window.__pl++;return o.apply(this,arguments)};window.stor=function(){window.__st++;return o2.apply(this,arguments)}});
 // 1: ikke dempet, A har ikke samtalen åpen
 await B.dblclick(".conv[data-id]");await B.waitForSelector("#tx:visible");
 await B.fill("#tx","hei 1");await B.click("#sd");await A.evaluate(()=>refresh());await A.waitForTimeout(800);
 console.log("1 ikke dempet, lyd:",JSON.stringify(await cnt(A)),"(forventer pling>=1)");
 // 2: demp
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 await A.click("#mb");console.log("2 knapp:",await A.textContent("#bmu"));
 await A.click("#bmu");console.log("  etter:",await A.textContent("#bmu"),"| liste:",JSON.stringify(await A.textContent(".conv[data-id] .nl")));
 await A.screenshot({path:"mute1.png"});
 await A.click("#back");
 const base=await cnt(A);
 await B.fill("#tx","hei 2");await B.click("#sd");await A.evaluate(()=>refresh());await A.waitForTimeout(800);
 await B.click("#dp");await A.evaluate(()=>refresh());await A.waitForTimeout(800);
 const after=await cnt(A);
 console.log("3 dempet (liste): endring",JSON.stringify([after[0]-base[0],after[1]-base[1]]),"(forventer 0,0) | ulest-merke:",await A.locator(".conv .badge").count(),"| dp-banner:",await A.locator("#dpb").count());
 // 4: dempet med åpen samtale
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 const b2=await cnt(A);
 await B.fill("#tx","hei 3");await B.click("#sd");await A.evaluate(()=>refresh());await A.waitForTimeout(800);
 await B.evaluate(()=>{S.cdUntil=0;cdTick()});await B.click("#dp");await A.evaluate(()=>refresh());await A.waitForTimeout(800);
 const a2=await cnt(A);
 console.log("4 dempet (åpen): endring",JSON.stringify([a2[0]-b2[0],a2[1]-b2[1]]),"(forventer 0,0) | meldinger synlige:",await A.locator("#log .m").count(),"| dp-linje:",await A.locator("#log .sys").count());
 // 5: huskes etter reload
 await A.reload();await A.waitForSelector(".conv[data-id]");
 console.log("5 etter reload, 🔕 i liste:",/🔕/.test(await A.textContent(".conv[data-id] .nl")));
 await A.evaluate(()=>{window.__pl=0});
 // 6: slå på igjen
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");await A.click("#mb");await A.click("#bmu");
 console.log("6 på igjen:",await A.textContent("#bmu"),"| liste:",JSON.stringify(await A.textContent(".conv[data-id] .nl")));
 await B.evaluate(()=>{S.cdUntil=0;cdTick()});await B.click("#dp");await A.evaluate(()=>refresh());await A.waitForTimeout(800);
 console.log("7 kontroll, ikke dempet dobbeltpling: stor =",(await cnt(A))[1],"(forventer >=1) | banner:",await A.locator("#dpb").count());
 console.log("FEIL A:",A.errs.length?A.errs:"ingen","| B:",B.errs.length?B.errs:"ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
