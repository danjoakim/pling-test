const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8766);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8766/");return p};
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
 // profil
 await B.click("#men");await B.fill("#pm","Spiller sjakk i kveld");await B.press("#pm","Tab");
 await B.selectOption("#st","busy");
 const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==","base64");
 fs.writeFileSync("/tmp/av.png",png);
 await B.setInputFiles("#avf","/tmp/av.png");await B.waitForTimeout(500);
 console.log("5 B bilde lagret:",await B.evaluate(()=>okAv(myAv)));
 await A.evaluate(()=>{S.nref=0;return refresh()});await A.waitForTimeout(700);
 console.log("6 A ser B:",(await A.textContent(".conv[data-id]")).replace(/\s+/g," "),"| status:",await A.evaluate(()=>document.querySelector(".conv[data-id]").className+" / "+document.querySelector(".conv[data-id] .ff").className),"| bilde:",await A.evaluate(()=>!!document.querySelector(".conv[data-id] img")));
 await A.screenshot({path:__dirname+"/u1.png"});
 // chat
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 await B.dblclick(".conv[data-id]");await B.waitForSelector("#tx:visible");
 await A.fill("#tx","Hei Bob :) hemmelig æøå");
 await B.waitForTimeout(3200);
 console.log("7 B ser at A skriver:",await B.textContent("#typ"));
 await A.click("#sd");
 await B.evaluate(()=>refresh());await B.waitForSelector(".m");
 console.log("8 B leser:",(await B.textContent(".m")).replace(/\s+/g," "));
 await A.waitForSelector(".m.mine");
 const raw=await A.evaluate(()=>localStorage.getItem("mockdb"));
 console.log("9 klartekst i db?",/hemmelig æøå|Hei Bob/.test(raw)?"JA (feil)":"nei");
 // dobbeltpling
 await A.evaluate(()=>{window.__stor=0;const o=stor;});
 await B.evaluate(()=>{window.__n={s:0,p:0};const os=stor,op=pling;stor=function(){__n.s++;return os()};pling=function(){__n.p++;return op.apply(this,arguments)}});
 await A.click("#dp");await A.waitForTimeout(200);
 console.log("10 A knapp:",await A.textContent("#dp"),"disabled:",await A.isDisabled("#dp"));
 await B.evaluate(()=>refresh());await B.waitForTimeout(500);
 console.log("11 B stor/pling:",await B.evaluate(()=>JSON.stringify(__n)),"| logg:",(await B.evaluate(()=>[...document.querySelectorAll("#log > *")].map(x=>x.textContent.replace(/\s+/g," ")).join(" / "))));
 // meny
 await A.click("#mb");console.log("12 trygghetsnr:",await A.textContent("#sn"),"=",await (async()=>{await B.click("#mb");return B.textContent("#sn")})());
 await A.screenshot({path:__dirname+"/u2.png"});
 // utløp + slett
 await A.selectOption("#ex","1");await A.click("#bx");await A.click("#bx");await A.waitForTimeout(500);
 console.log("13 etter sletting, A meldinger:",await A.evaluate(()=>S.msgs.filter(m=>m.mine).length));
 // frakoblet
 await B.selectOption("#st","off");await A.waitForTimeout(400);
 console.log("14 B frakoblet hos A:",await A.evaluate(()=>document.querySelector(".conv[data-id] .ff").className));
 await A.screenshot({path:__dirname+"/u3.png"});
 // mobil
 await B.selectOption("#st","online");await A.setViewportSize({width:390,height:780});await A.waitForTimeout(500);
 await A.screenshot({path:__dirname+"/m_chat.png"});
 await A.click("#back");await A.waitForTimeout(300);await A.screenshot({path:__dirname+"/m_list.png"});
 console.log("15 mobil: liste synlig",await A.isVisible("#home"),"chat skjult",!(await A.isVisible("#chatpane")));
 await A.tap(".conv[data-id]").catch(()=>A.click(".conv[data-id]"));await A.waitForTimeout(500);
 console.log("16 mobil: chat åpnet",await A.isVisible("#tx"));
 console.log("FEIL A:",A.errs.length?A.errs:"ingen","| B:",B.errs.length?B.errs:"ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
