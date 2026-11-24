// Meldinger som kommer inn (24. nov): nye bobler glir inn fra sin side (kompisen fra venstre, egne fra høyre), første tegning og bekreftede
// egne meldinger animeres ikke, leser du lenger opp blir du stående og får pillen «Ny melding ↓», og skriver-boblen har bølgende prikker.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),assert=require("assert");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8805);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8805/");return p};
 const A=await mk(),B=await mk();
 const signup=async(p,em,name)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#men")};
 await signup(A,"alice@x.test","Alice");await signup(B,"bob@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForSelector("text=Venter på svar");
 await B.evaluate(()=>refresh());await B.waitForSelector("#reqs:not([hidden]) button");
 await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");
 await A.click(".conv[data-id]");await A.waitForSelector("#tx:visible");
 const send=async(p,t)=>{await p.fill("#tx",t);await p.click("#sd");await p.waitForFunction(()=>!document.querySelector("#sd").disabled,null,{timeout:15000});await p.waitForTimeout(120)};
 // 40 meldinger fra A før B åpner samtalen: første tegning animerer ingen av dem
 for(let i=1;i<=40;i++)await send(A,"Melding nummer "+i+" med litt tekst så den tar plass");
 await B.setViewportSize({width:390,height:760});
 await B.evaluate(()=>refresh());await B.click(".conv[data-id]");await B.waitForSelector("#tx:visible");await B.waitForSelector("#log .m");
 assert.strictEqual(await B.evaluate(()=>document.querySelectorAll("#log .m.enter").length),0,"første tegning: ingen animasjon");
 console.log("1 åpnet samtale: ingen boble animeres");

 // 2. en ny melding fra A mens B står nederst: glir inn fra venstre, ingen pille
 await B.evaluate(()=>{window.__ent=[];new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.classList&&n.classList.contains("m"))window.__ent.push([n.classList.contains("enter"),n.classList.contains("mine")])}).observe(document.querySelector("#log"),{childList:true})});
 await send(A,"Hei Bob");await B.evaluate(()=>refresh());await B.waitForFunction(()=>window.__ent.some(x=>x[0]&&!x[1]));
 const an=await B.evaluate(()=>{const e=document.createElement("div");e.className="m enter";document.querySelector("#log").append(e);const r=[getComputedStyle(e).animationName,getComputedStyle(e).animationDuration];e.remove();return r});
 assert.deepStrictEqual(an,["mleft","0.25s"]);
 await B.waitForTimeout(600);assert.strictEqual(await B.evaluate(()=>document.getAnimations().filter(a=>a.playState==="running"&&a.effect.target&&a.effect.target.classList&&a.effect.target.classList.contains("m")).length),0,"etter 0,25 s glir ingen boble");
 assert.strictEqual(await B.evaluate(()=>document.querySelectorAll(".npill").length),0,"nederst: ingen pille");
 console.log("2 innkommende glir inn fra venstre:",an.join(" "));

 // 3. egen melding: glir inn fra høyre mens den venter, og når den bekreftes tegnes den uten ny animasjon
 await B.evaluate(()=>{window.__ent.length=0});
 await send(B,"Hei Alice");await B.waitForTimeout(200);
 const ent=await B.evaluate(()=>window.__ent);
 // pending og bekreftet er to tegninger av "samme" boble; bare den første har enter, og den er egen
 assert.ok(ent.some(x=>x[0]&&x[1]),"egen melding glir inn mens den venter: "+JSON.stringify(ent));
 await B.waitForFunction(()=>![...document.querySelectorAll("#log .m.mine")].pop().classList.contains("pending"));
 assert.strictEqual(await B.evaluate(()=>[...document.querySelectorAll("#log .m.mine")].pop().classList.contains("enter")),false,"bekreftet egen melding animeres ikke på nytt");
 const mr=await B.evaluate(()=>{const e=document.createElement("div");e.className="m mine enter";document.querySelector("#log").append(e);const n=getComputedStyle(e).animationName;e.remove();return n});
 assert.strictEqual(mr,"mright");
 console.log("3 egen melding glir inn fra høyre, bare én gang");

 // 4. B leser lenger opp: ny melding flytter ikke chatten og gir pillen; trykk på den tar deg ned
 await B.evaluate(()=>{const l=document.querySelector("#log");l.scrollTop=0});await B.waitForTimeout(150);
 await send(A,"Ny melding mens du leser");await B.evaluate(()=>refresh());await B.waitForSelector(".npill");
 const top=await B.evaluate(()=>document.querySelector("#log").scrollTop);
 assert.ok(top<120,"chatten hoppet ikke ned: scrollTop="+top);
 assert.strictEqual(await B.evaluate(()=>document.querySelector(".npill").textContent),"Ny melding ↓");
 await send(A,"Og en til");await B.evaluate(()=>refresh());await B.waitForFunction(()=>document.querySelector(".npill")&&document.querySelector(".npill").textContent==="2 nye meldinger ↓");
 await B.click(".npill");await B.waitForFunction(()=>{const l=document.querySelector("#log");return l.scrollHeight-l.scrollTop-l.clientHeight<80},null,{timeout:4000});
 await B.waitForFunction(()=>!document.querySelector(".npill"));
 console.log("4 pille «Ny melding ↓» (1, så 2 nye), trykk tar deg ned, pillen forsvinner; scrollTop ble stående på",top);

 // 5. blar du ned selv, forsvinner pillen
 await B.evaluate(()=>{document.querySelector("#log").scrollTop=0});await B.waitForTimeout(100);
 await send(A,"Enda en");await B.evaluate(()=>refresh());await B.waitForSelector(".npill");
 await B.evaluate(()=>{const l=document.querySelector("#log");l.scrollTop=l.scrollHeight});await B.waitForFunction(()=>!document.querySelector(".npill"));
 console.log("5 pillen forsvinner når du blar ned selv");

 // 6. skriver-boblen: bølgende prikker og innsliding; stille med «reduser bevegelse»
 const ty=()=>B.evaluate(()=>{const t=document.querySelector("#typ");t.hidden=false;t.textContent="Alice skriver …";const s=getComputedStyle(t,"::before");return s.animationName});
 assert.strictEqual(await ty(),"tinn, tbolge");
 await B.emulateMedia({reducedMotion:"reduce"});
 assert.strictEqual(await ty(),"none");
 console.log("6 skriver: tinn + tbolge, ingen animasjon med «reduser bevegelse»");

 assert.deepStrictEqual([A.errs,B.errs],[[],[]],"ingen sidefeil: "+JSON.stringify([A.errs,B.errs]));
 await br.close();srv.close();console.log("FEIL: ingen");
})().catch(e=>{console.log("TESTFEIL",e.message);process.exit(1)});
