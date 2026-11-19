const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8813);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:390,height:844}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8813/");return p};
 const A=await mk();
 const signup=async(p,em,name)=>{await p.click(".ltab:has-text('Ny bruker')");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#mnav")};
 await signup(A,"alice@x.test","Dan Joakim");
 const must=(c,m)=>{if(!c)throw new Error(m)};
 await A.click("[data-tab=me]");await A.waitForTimeout(200);
 must(await A.locator(".mrow").count()===6,"seks rader i Meg");
 must((await A.textContent(".mabout")).includes("Om meg"),"Om meg-kort mangler");
 must(await A.evaluate(()=>document.getElementById("avini").dataset.i2)==="DJ","to initialer");
 // Innstillinger flytter inn eksisterende kontroller og setter dem tilbake
 await A.click(".mrow:has-text('Innstillinger')");await A.waitForSelector("#info.pg #thm");
 await A.click("#info .infoh button");await A.waitForTimeout(150);
 must(await A.evaluate(()=>document.getElementById("thm").parentElement.id)==="prof","#thm skal tilbake i #prof");
 // Lyd
 await A.click(".mrow:has-text('Lyd')");
 must(await A.evaluate(()=>localStorage.getItem("prek_sound"))==="off","lyd av");
 must((await A.textContent(".mrow:has-text('Lyd') .mrv"))==="Av","verdi Av");
 await A.click(".mrow:has-text('Lyd')");
 must(await A.evaluate(()=>localStorage.getItem("prek_sound"))==="on","lyd på");
 // Om meg
 await A.click(".mae");await A.fill("#info textarea","Bygger Prek!");await A.click("#info .pgprim");await A.waitForTimeout(300);
 must((await A.textContent("#abouttxt"))==="Bygger Prek!","Om meg lagret");
 // Navn og tekst
 await A.click(".mrow:has-text('Navn og tekst')");await A.fill("#info input >> nth=1","Ålreit nå vel?");await A.press("#info input >> nth=1","Tab");await A.waitForTimeout(300);
 must(await A.evaluate(()=>S.profile.pm)==="Ålreit nå vel?","pm lagret");
 // Kompiser: trykk på profilkortet skal ikke åpne innstillingspanelet inni lista (Dan: søket ble borte)
 await A.click("#info .infoh button");await A.waitForTimeout(150);
 await A.click("[data-tab=friends]");await A.waitForTimeout(150);
 must(await A.isHidden("#meb"),"profilkortet vises ikke i Kompiser (profilen ligger i bunnmenyen)");
 await A.click("[data-tab=friends]");await A.waitForTimeout(150);
 must(await A.evaluate(()=>getComputedStyle(document.getElementById("prof")).display)==="none","#prof skjult i Kompiser");
 must(await A.isVisible("#fq"),"søkefeltet synlig");
 // Sveip fra venstre kant i samtale = tilbake
 const sw=await A.evaluate(()=>{let n=0;document.getElementById("back").addEventListener("click",()=>n++);document.getElementById("shell").classList.add("inchat");const c=document.getElementById("chatpane");const mk=(t,x,y)=>new Touch({identifier:1,target:c,clientX:x,clientY:y});
  const ev=(type,x,y)=>c.dispatchEvent(new TouchEvent(type,{bubbles:true,touches:type==="touchend"?[]:[mk(0,x,y)],changedTouches:[mk(0,x,y)]}));
  ev("touchstart",100,400);ev("touchend",220,400);const mid=n;ev("touchstart",10,400);ev("touchend",160,410);return [mid,n]});
 must(sw[0]===0&&sw[1]===1,"sveip fra kanten gir tilbake, sveip midt på skjermen gjør ingenting: "+sw);
 // Kompiser: MSN-grupper (Pålogget inkl. opptatt, Borte, Frakoblet), Frakoblet er sammenfoldet, trykk på overskrift åpner/lukker og huskes
 await A.click("[data-tab=friends]");
 await A.evaluate(()=>{S.friends=["g1","g2","g3","g4"];for(const [i,n] of [["g1","Ola"],["g2","Kari"],["g3","Mari"],["g4","Sara"]])S.profiles.set(i,{id:i,name:n});S.pres=new Map([["g1","busy"],["g2","online"],["g3","away"]]);drawFriends()});
 const heads=await A.evaluate(()=>[...document.querySelectorAll(".grph")].map(h=>h.textContent.replace(/\s+/g," ").trim()));
 must(JSON.stringify(heads)===JSON.stringify(["Pålogget(2)","Borte(1)","Frakoblet(1)"]),"gruppeoverskrifter: "+heads);
 must(await A.evaluate(()=>[...document.querySelectorAll("#friends .conv:not(.gc)")].map(b=>b.dataset.id).join())==="g2,g1,g3","rekkefølge: Kari og Ola (opptatt) under Pålogget, så Mari");
 must(await A.isHidden("#friends .conv[data-id=g4]"),"Frakoblet er sammenfoldet fra start");
 must((await A.locator(".grph[data-g=off]").boundingBox()).height>=44,"overskriften er minst 44 px høy");
 await A.click(".grph[data-g=off]");await A.waitForTimeout(100);
 must(await A.isVisible("#friends .conv[data-id=g4]"),"Frakoblet åpnes ved trykk");
 await A.click(".grph[data-g=on]");await A.waitForTimeout(100);
 must(await A.isHidden("#friends .conv[data-id=g2]"),"Pålogget lukkes ved trykk");
 must(await A.evaluate(()=>localStorage.getItem("prek_grp_"+S.user.id))==='["on"]',"valget huskes: "+await A.evaluate(()=>localStorage.getItem("prek_grp_"+S.user.id)));
 await A.fill("#fq","kari");await A.waitForTimeout(100);
 must(await A.isVisible("#friends .conv[data-id=g2]"),"søk finner treff også i sammenfoldet gruppe");
 await A.fill("#fq","");
 // Lås-knappen forklarer krypteringen, + åpner Legg til, Meg-fanen viser navnet
 await A.click("#lockb");must(await A.isVisible("#lockpop"),"låsboble åpnes");
 await A.click("#friends",{position:{x:5,y:5},force:true});must(await A.isHidden("#lockpop"),"låsboble lukkes ved trykk utenfor");
 await A.click("#addplus");must(await A.evaluate(()=>document.getElementById("shell").classList.contains("tab-add")),"+ åpner Legg til");
 must((await A.textContent("#navnm")).trim()==="Dan Joakim","navnet i bunnmenyen");
 // Personvern og hjelp er en hel side: lukkeknappen ligger under statuslinjen, ikke oppunder batteri og nett
 await A.evaluate(()=>showInfo());await A.waitForSelector("#info.pg .infoh button");
 must((await A.locator("#info .infoh button").boundingBox()).y>=44,"lukkeknappen i Personvern ligger under statuslinjen");
 await A.click("#info .infoh button");must(await A.isHidden("#info"),"Personvern lukkes");
 console.log("FEIL A:",A.errs.length?A.errs:"ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
