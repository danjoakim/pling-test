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
 console.log("FEIL A:",A.errs.length?A.errs:"ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
