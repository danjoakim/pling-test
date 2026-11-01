/* Egen tekstmelding vises med en gang (svakt) mens serveren lagrer, og blir én vanlig melding etterpå. Feiler lagringen, forsvinner den og teksten kommer tilbake i feltet. */
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8788);
let bad=0;const ck=(n,ok,x)=>{console.log(ok?"ok  ":"FEIL",n,x===undefined?"":JSON.stringify(x));if(!ok)bad++};
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));await p.goto("http://localhost:8788/");return p};
 const A=await mk(),B=await mk();
 const signup=async(p,em,name)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#addf")};
 await signup(A,"alice@x.test","Alice");await signup(B,"bob@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForSelector("text=Venter på svar");
 await B.evaluate(()=>refresh());await B.waitForSelector("#reqs:not([hidden]) button");await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 // sakte lagring: 1,5 s
 await A.evaluate(()=>{const o=api.sendMessage;window.__orig=o;api.sendMessage=r=>new Promise(res=>setTimeout(res,1500)).then(()=>o(r))});
 await A.fill("#tx","hei sakte");const t0=Date.now();await A.click("#sd");
 await A.waitForSelector("#log .m.pending");const dt=Date.now()-t0;
 ck("meldingen vises før lagringen er ferdig",dt<700,dt);
 ck("teksten stemmer",(await A.textContent("#log .m.pending")).includes("hei sakte"));
 ck("feltet er tømt",(await A.inputValue("#tx"))==="");
 ck("ulagret melding ser ut som en vanlig (full styrke, ingen overgang)",await A.evaluate(()=>{const c=getComputedStyle(document.querySelector("#log .m.pending"));return c.opacity==="1"&&c.transitionDuration.split(",").every(x=>parseFloat(x)===0)}));
 ck("ingen ☺-knapp på ulagret melding",await A.locator("#log .m.pending .rxb").count()===0);
 await A.waitForFunction(()=>!document.querySelector("#log .m.pending")&&document.querySelectorAll("#log .m.mine").length>=1,null,{timeout:6000});
 await A.waitForTimeout(600);
 ck("etterpå: nøyaktig én melding, ikke ulagret",await A.locator("#log .m.mine").count()===1&&await A.locator("#log .m.pending").count()===0,await A.locator("#log .m").count());
 ck("mottakeren fikk den",await (async()=>{await B.dblclick(".conv[data-id]");await B.waitForSelector("#tx:visible");await B.evaluate(()=>refresh());await B.waitForTimeout(800);return (await B.textContent("#log")).includes("hei sakte")})());
 // lagring som feiler
 await A.evaluate(()=>{api.sendMessage=()=>new Promise((_,rej)=>setTimeout(()=>rej(new Error("nede")),400))});
 await A.fill("#tx","feiler");await A.click("#sd");
 await A.waitForSelector("#log .m.pending");
 await A.waitForFunction(()=>!document.querySelector("#log .m.pending"),null,{timeout:4000});
 ck("feilet: ulagret melding fjernet",await A.locator("#log .m.pending").count()===0&&!(await A.textContent("#log")).includes("feiler"));
 ck("feilet: teksten er tilbake i feltet",(await A.inputValue("#tx"))==="feiler",await A.inputValue("#tx"));
 // bilde/dobbeltpling vises ikke på forhånd
 ck("ingen feil i siden",A.errs.length===0,A.errs);
 await br.close();srv.close();
 console.log(bad?bad+" FEIL":"alt ok");process.exit(bad?1:0);
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
