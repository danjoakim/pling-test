const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8809);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/supabase.min.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8809/");return p};
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


 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx");
 console.log("skjult først:",await A.isHidden("#epv"));
 await A.fill("#tx","hei :) og :D");await A.dispatchEvent("#tx","input");
 console.log("figurer i visning:",await A.locator("#epv .an").count(),"| synlig:",await A.isVisible("#epv"));
 await A.screenshot({path:"epv.png"});
 await A.fill("#tx","vanlig tekst");await A.dispatchEvent("#tx","input");
 console.log("vanlig tekst skjuler:",await A.isHidden("#epv"));
 await A.fill("#tx","(heart) takk");await A.dispatchEvent("#tx","input");
 console.log("emoji-kode:",await A.isVisible("#epv"),JSON.stringify(await A.textContent("#epv")));
 await A.click("#sd");await A.waitForTimeout(300);
 console.log("etter sending skjult:",await A.isHidden("#epv"),"| felt tomt:",(await A.inputValue("#tx"))==="");
 console.log("FEIL A:",A.errs.length?A.errs:"ingen");
 await br.close();srv.close()})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
