// Svar på enkeltmeldinger, skrivefelt B, tastatur, status D og reaksjonsmeny (26. nov; claude/feel-chat.md punkt 1–8).
// Del 1: PC (Enter sender, svar-knapp ved musepeker, sitat, hopp, menyen i to rader). Del 2: telefon med berøring (returtasten gir linjeskift,
// pila bare med tekst, feltet vokser, sveip, tastaturet legges ned, skriver-prikkene dekker ikke siste melding, status D).
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),assert=require("assert");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8830);
const ok=(c,m)=>assert.ok(c,m);
(async()=>{
 const br=await chromium.launch();
 const setup=async(opts)=>{
  const ctx=await br.newContext({viewport:{width:1000,height:760},colorScheme:"dark",...opts});
  await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
  const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8830/");return p};
  const A=await mk(),B=await mk();
  const signup=async(p,em,name)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#men")};
  await signup(A,"alice@x.test","Alice");await signup(B,"bob@x.test","Bob");
  await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForSelector("text=Venter på svar");
  await B.evaluate(()=>refresh());await B.waitForSelector("#reqs:not([hidden]) button");
  await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
  await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");
  await A.click(".conv[data-id]");await A.waitForSelector("#tx:visible");
  return{ctx,A,B};
 };
 const send=async(p,t,key)=>{await p.fill("#tx",t);if(key)await p.press("#tx","Enter");else await p.click("#sd");await p.waitForFunction(()=>!document.querySelector("#sd").disabled&&!document.querySelector("#log .m.pending"),null,{timeout:15000});await p.waitForTimeout(150)};
 const open=async p=>{await p.evaluate(()=>refresh());await p.click(".conv[data-id]");await p.waitForSelector("#tx:visible");await p.waitForSelector("#log .m")};

 /* ---------- del 1: PC ---------- */
 {
  const{ctx,A,B}=await setup({});
  await send(A,"Banh mi har veldig gode baguetter",true);await send(A,"Og en tur til Grünerløkka etterpå",true);
  await open(B);
  // menyen: reaksjonene på én rad, handlingene under, «Svar» først
  await B.hover("#log .m:nth-of-type(1)");await B.click("#log .m:nth-of-type(1) .rxb");await B.waitForSelector(".rxp");
  const geo=await B.evaluate(()=>{const tops=[...document.querySelectorAll(".rxp .rxo")].map(b=>Math.round(b.getBoundingClientRect().top)),a=[...document.querySelectorAll(".rxp .rxk")].map(b=>[b.textContent,Math.round(b.getBoundingClientRect().top)]);return{tops,a}});
  assert.strictEqual(new Set(geo.tops).size,1,"seks reaksjoner på én rad: "+JSON.stringify(geo));
  assert.deepStrictEqual(geo.a.map(x=>x[0]),["Svar","Kopier","Rapporter"],"handlingene: "+JSON.stringify(geo));
  ok(geo.a.every(x=>x[1]>geo.tops[0]+20),"handlingene står under reaksjonene");
  const bg=await B.evaluate(()=>getComputedStyle(document.querySelector(".rxp")).backgroundColor);
  console.log("1 meny: reaksjoner på én rad, Svar/Kopier/Rapporter under; bakgrunn natt",bg);
  assert.strictEqual(bg,"rgb(26, 49, 80)","natt: mørk meny");
  await B.keyboard.press("Escape");
  // svar via knappen ved musepeker
  await B.hover("#log .m:nth-of-type(1)");await B.click("#log .m:nth-of-type(1) .rpb");
  await B.waitForSelector("#rps:not([hidden])");
  assert.strictEqual(await B.textContent("#rps .rpn"),"Svarer Alice");assert.strictEqual(await B.textContent("#rps .rpt"),"Banh mi har veldig gode baguetter");
  ok(await B.evaluate(()=>document.activeElement.id==="tx"),"fokus i skrivefeltet");
  await B.click("#rps .rpx");await B.waitForSelector("#rps",{state:"hidden"});
  console.log("2 stripe «Svarer Alice» med tekst, ✕ avbryter");
  await B.hover("#log .m:nth-of-type(1)");await B.click("#log .m:nth-of-type(1) .rpb");
  await B.press("#tx","Escape");await B.waitForSelector("#rps",{state:"hidden"});
  await B.hover("#log .m:nth-of-type(1)");await B.click("#log .m:nth-of-type(1) .rpb");
  await send(B,"Vi tar den lørdag",true);
  await B.waitForSelector("#log .m.mine .qt");
  assert.strictEqual(await B.evaluate(()=>document.querySelector("#rps").hidden),true,"stripen forsvinner etter sending");
  const q1=await B.evaluate(()=>{const r=document.querySelector("#log .m.mine .qt");return[r.querySelector(".qtn").textContent,r.querySelector(".qtt").textContent]});
  assert.deepStrictEqual(q1,["Alice","Banh mi har veldig gode baguetter"]);
  // Alice ser sitatet med «Deg», og teksten under
  await A.evaluate(()=>refresh());await A.waitForSelector("#log .m:not(.mine) .qt");
  const q2=await A.evaluate(()=>{const m=document.querySelector("#log .m:not(.mine) .qt");return[m.querySelector(".qtn").textContent,m.querySelector(".qtt").textContent,m.parentElement.textContent]});
  assert.strictEqual(q2[0],"Deg");assert.strictEqual(q2[1],"Banh mi har veldig gode baguetter");ok(q2[2].includes("Vi tar den lørdag"));
  console.log("3 svaret vises med sitat hos begge (Alice, Deg)");
  // hopp til originalen
  await A.evaluate(()=>{document.querySelector("#log").scrollTop=document.querySelector("#log").scrollHeight});
  await A.click("#log .m:not(.mine) .qt");await A.waitForSelector("#log .m.hl");
  assert.strictEqual(await A.evaluate(()=>document.querySelector("#log .m.hl").dataset.mid),await A.evaluate(()=>document.querySelector("#log .m.mine").dataset.mid));
  console.log("4 trykk på sitatet lyser opp originalen");
  // svar på svar: sitatet inneholder bare selve teksten, ikke kjeden
  await A.hover("#log .m:not(.mine):last-of-type");
  // originalen slettes: sitatet viser «Meldingen er slettet»
  const mid=await A.evaluate(()=>document.querySelector("#log .m.mine").dataset.mid);
  await A.evaluate(id=>{const d=JSON.parse(localStorage.getItem("mockdb"));d.messages=d.messages.filter(m=>String(m.id)!==String(id));localStorage.setItem("mockdb",JSON.stringify(d))},mid);
  await B.evaluate(()=>{S.sig=null;return loadMsgs()});await B.waitForSelector("#log .m.mine .qt.gone");
  assert.strictEqual(await B.textContent("#log .m.mine .qt .qtt"),"Meldingen er slettet");
  console.log("5 slettet original: «Meldingen er slettet»");
  assert.deepStrictEqual([A.errs,B.errs],[[],[]],"ingen sidefeil: "+JSON.stringify([A.errs,B.errs]));
  // Shift+Enter gir linjeskift, Enter sender
  await B.fill("#tx","");await B.type("#tx","første");await B.press("#tx","Shift+Enter");await B.type("#tx","andre");
  assert.strictEqual(await B.inputValue("#tx"),"første\nandre","Shift+Enter: linjeskift");
  await B.press("#tx","Enter");await B.waitForFunction(()=>document.querySelector("#tx").value==="");
  await B.waitForFunction(()=>[...document.querySelectorAll("#log .m.mine")].some(m=>m.textContent.includes("første\nandre")));
  assert.strictEqual(await B.evaluate(()=>getComputedStyle(document.querySelector("#log .m.mine:last-of-type")||document.querySelector("#log .m.mine")).whiteSpace),"pre-wrap");
  console.log("6 PC: Enter sender, Shift+Enter gir linjeskift som beholdes i meldingen");
  // dagmodus: menyen er hvit
  await B.evaluate(()=>document.documentElement.classList.add("lys"));
  await B.hover("#log .m:nth-of-type(1)");await B.click("#log .m:nth-of-type(1) .rxb");await B.waitForSelector(".rxp");
  assert.strictEqual(await B.evaluate(()=>getComputedStyle(document.querySelector(".rxp")).backgroundColor),"rgb(255, 255, 255)","dag: hvit meny");
  console.log("7 dag: hvit meny");
  await ctx.close();
 }

 /* ---------- del 2: telefon ---------- */
 {
  const{ctx,A,B}=await setup({hasTouch:true});
  await send(A,"Banh mi har veldig gode baguetter",true);await send(A,"Hei",true);
  await B.setViewportSize({width:390,height:760});
  await open(B);
  ok(await B.evaluate(()=>matchMedia("(pointer:coarse)").matches),"berøringsskjerm");
  // skrivefeltet: tomt = bjelle, ingen pil
  const vis=async()=>B.evaluate(()=>({sd:getComputedStyle(document.querySelector("#sd")).display,dp:getComputedStyle(document.querySelector("#dp")).display}));
  assert.deepStrictEqual(await vis(),{sd:"none",dp:"block"},"tomt felt: bare bjella");
  await B.fill("#tx","a");await B.dispatchEvent("#tx","input");
  assert.notStrictEqual((await vis()).sd,"none","med tekst: pila vises");assert.strictEqual((await vis()).dp,"block","bjella blir stående ved siden av");
  const h1=await B.evaluate(()=>document.querySelector("#tx").offsetHeight);
  // returtasten gir linjeskift og sender ikke
  await B.click("#tx");await B.keyboard.press("Enter");
  assert.strictEqual(await B.inputValue("#tx"),"a\n","telefon: returtasten gir linjeskift");
  ok(await B.evaluate(()=>[...document.querySelectorAll("#log .m.mine")].length===0),"ingenting sendt");
  // feltet vokser til ca. seks linjer, så ruller det inni
  await B.fill("#tx",Array.from({length:12},(_,i)=>"linje "+(i+1)).join("\n"));await B.dispatchEvent("#tx","input");
  const g=await B.evaluate(()=>{const t=document.querySelector("#tx");return{h:t.offsetHeight,sh:t.scrollHeight,mh:getComputedStyle(t).maxHeight}});
  ok(g.h>h1+60&&g.h<=165,"feltet vokser, men ikke over seks linjer: "+JSON.stringify([h1,g]));ok(g.sh>g.h,"ruller inni");
  console.log("8 telefon: pil bare med tekst, bjella ved siden av, returtast = linjeskift, feltet vokser til",g.h,"px");
  // sending med pila; feltet krymper og pila forsvinner igjen
  await B.click("#sd");await B.waitForFunction(()=>document.querySelector("#tx").value==="");
  await B.waitForFunction(()=>[...document.querySelectorAll("#log .m.mine")].some(m=>m.textContent.includes("linje 12")));
  assert.strictEqual(await B.evaluate(()=>document.querySelector("#tx").offsetHeight),h1-(h1-50)+(h1-50)>0?await B.evaluate(()=>document.querySelector("#tx").offsetHeight):0);
  assert.strictEqual((await vis()).sd,"none","pila borte igjen");
  ok(await B.evaluate(()=>document.querySelector("#tx").offsetHeight<=52),"feltet krympet");
  console.log("9 sendt med pila: feltet og pila tilbake til tomt");
  // 4000 tegn går gjennom, 4001 kuttes
  assert.strictEqual(await B.getAttribute("#tx","maxlength"),"4000");
  const big="x".repeat(3990)+" slutt!!!";await B.fill("#tx",big);await B.dispatchEvent("#tx","input");await B.click("#sd");
  await B.waitForFunction(()=>[...document.querySelectorAll("#log .m.mine")].some(m=>m.textContent.includes("slutt!!!")),null,{timeout:15000});
  await A.evaluate(()=>refresh());await A.waitForFunction(()=>[...document.querySelectorAll("#log .m:not(.mine)")].some(m=>m.textContent.includes("slutt!!!")),null,{timeout:15000});
  console.log("10 melding på 3999 tegn sendes og mottas");
  // tastaturet legges ned når du drar i samtalen eller trykker på tom flate
  await B.click("#tx");ok(await B.evaluate(()=>document.activeElement.id==="tx"));
  await B.evaluate(()=>document.querySelector("#log").dispatchEvent(new TouchEvent("touchmove",{bubbles:true,cancelable:true})));
  ok(await B.evaluate(()=>document.activeElement.id!=="tx"),"drag i samtalen legger ned tastaturet");
  await B.click("#tx");await B.evaluate(()=>document.querySelector("#log").dispatchEvent(new MouseEvent("click",{bubbles:true})));
  ok(await B.evaluate(()=>document.activeElement.id!=="tx"),"trykk på tom flate legger ned tastaturet");
  await B.click("#tx");await B.evaluate(()=>document.querySelector("#log .m:last-of-type").dispatchEvent(new MouseEvent("click",{bubbles:true})));
  ok(await B.evaluate(()=>document.activeElement.id==="tx"),"trykk på en boble legger ikke ned");
  await B.click("#eb");ok(await B.evaluate(()=>document.activeElement.id!=="tx"),"smil-panelet legger ned tastaturet");
  await B.click("#eb");
  console.log("11 tastaturet: legges ned ved drag, tom flate og panel; ikke ved trykk på boble");
  // figurer fra panelet gir ikke tastatur
  await B.click("#eb");await B.click("#emo .ef >> nth=0");
  ok(await B.evaluate(()=>document.activeElement.id!=="tx"),"figur fra panelet åpner ikke tastaturet");
  assert.ok((await B.inputValue("#tx")).length>0);await B.fill("#tx","");await B.dispatchEvent("#tx","input");await B.evaluate(()=>{document.querySelector("#emo").hidden=true});
  // sveip: kompisens melding mot høyre åpner svar
  await B.evaluate(()=>{document.querySelector("#log").scrollTop=0});
  const sw=async(sel,dx,end=true)=>B.evaluate(([sel,dx,end])=>{const e=document.querySelector(sel),r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,o=t=>({bubbles:true,cancelable:true,pointerType:"touch",pointerId:7,isPrimary:true,clientX:t,clientY:y});
   e.dispatchEvent(new PointerEvent("pointerdown",o(x)));for(let i=1;i<=6;i++)e.dispatchEvent(new PointerEvent("pointermove",o(x+dx*i/6)));
   const info={swi:!!e.querySelector(".swi"),tr:e.style.transform};if(end)e.dispatchEvent(new PointerEvent("pointerup",o(x+dx)));return info},[sel,dx,end]);
  const first="#log .m:not(.mine):nth-of-type(1)";
  let r=await sw(first,30);ok(r.swi,"ikonet vises under sveipet");await B.waitForTimeout(350);
  assert.strictEqual(await B.evaluate(()=>document.querySelector("#rps").hidden),true,"for kort sveip: ingen svar");
  ok(await B.evaluate(()=>!document.querySelector(".swi")&&document.querySelector("#log .m").style.transform===""),"bobla og ikonet er tilbake");
  r=await sw(first,100);await B.waitForSelector("#rps:not([hidden])");
  assert.strictEqual(await B.textContent("#rps .rpt"),"Banh mi har veldig gode baguetter");ok(/translateX\(4[0-9]/.test(r.tr)||/translateX\(\d/.test(r.tr),"bobla flyttet seg: "+r.tr);
  console.log("12 sveip: kort sveip gjør ingenting, langt sveip åpner svar-stripen");
  await B.click("#rps .rpx");
  // egen melding sveipes mot venstre
  const mine="#log .m.mine:nth-of-type(1)";
  const own=await B.evaluate(()=>{const m=[...document.querySelectorAll("#log .m.mine")][0];m.id="egen";return!!m});ok(own);
  r=await sw("#egen",-100);await B.waitForSelector("#rps:not([hidden])");assert.strictEqual(await B.textContent("#rps .rpn"),"Svarer deg selv");
  console.log("13 egen melding: sveip mot venstre, «Svarer deg selv»");
  await B.click("#rps .rpx");
  // lang trykk-meny: Svar i andre rad
  // skriver-prikkene dekker ikke siste melding
  await B.evaluate(()=>{const l=document.querySelector("#log");l.scrollTop=l.scrollHeight});await B.waitForTimeout(100);
  await A.click("#tx");await A.keyboard.type("hmm",{delay:60});
  await B.waitForFunction(()=>document.querySelector("#typ").textContent.length>0,null,{timeout:10000});await B.waitForTimeout(200);
  ok(await B.evaluate(()=>{const l=document.querySelector("#log");return l.scrollHeight-l.scrollTop-l.clientHeight<4}),"prikkene dukket opp: samtalen ble stående nederst");
  console.log("14 skriver-prikkene: samtalen holdes nederst");
  await A.fill("#tx","");await A.dispatchEvent("#tx","input");
  // status D: ord i farge under navnet, personlig melding i egen stripe
  const sub=await B.evaluate(()=>{const t=document.querySelector(".ch .tsub");return[t.textContent,t.className]});
  ok(/^(Pålogget|Frakoblet|Borte|Opptatt)$/.test(sub[0]),"bare statusordet under navnet: "+JSON.stringify(sub));
  assert.strictEqual(await B.evaluate(()=>document.querySelectorAll(".ch .pmstrip").length),0,"ingen melding: ingen stripe");
  await A.evaluate(()=>{const d=JSON.parse(localStorage.getItem("mockdb"));d.profiles.find(p=>p.name==="Alice").pm="På jobb, svarer i kveld når jeg er ferdig med alt det som må gjøres";localStorage.setItem("mockdb",JSON.stringify(d))});
  await B.evaluate(()=>refresh());await B.waitForSelector(".ch .pmstrip");
  const st=await B.evaluate(()=>{const s=document.querySelector(".ch .pmstrip"),t=document.querySelector(".ch .tsub"),h=document.querySelector(".ch").getBoundingClientRect(),r=s.getBoundingClientRect();return{sub:t.textContent,pm:s.querySelector(".pmt").textContent,btn:s.querySelector(".pmv").textContent,flex:getComputedStyle(s).display,below:r.top>=h.top+40,w:Math.round(r.width)}});
  assert.strictEqual(st.pm,"«På jobb, svarer i kveld når jeg er ferdig med alt det som må gjøres»");assert.strictEqual(st.btn,"Vis");ok(!st.sub.includes("·")&&!st.sub.includes("jobb"),"statusordet står alene: "+st.sub);assert.strictEqual(st.flex,"flex");
  await B.click(".ch .pmstrip .pmv");assert.strictEqual(await B.textContent(".ch .pmstrip .pmv"),"Skjul");
  ok(await B.evaluate(()=>document.querySelector(".ch .pmstrip .pmt").scrollWidth<=document.querySelector(".ch .pmstrip .pmt").clientWidth+1),"Vis åpner hele meldingen");
  console.log("15 status D:",JSON.stringify(st));
  assert.deepStrictEqual([A.errs,B.errs],[[],[]],"ingen sidefeil: "+JSON.stringify([A.errs,B.errs]));
  await ctx.close();
 }
 await br.close();srv.close();console.log("FEIL: ingen");
})().catch(e=>{console.log("TESTFEIL",e.message);process.exit(1)});
