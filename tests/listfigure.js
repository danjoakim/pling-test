// The friend list shows our own drawn figures (still, not animated) for emoji codes, the same as the chat, and plain text stays text.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path"),assert=require("assert");
const DIR=path.resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8802);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:900,height:900}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const errs=[];const mk=async()=>{const p=await ctx.newPage();p.on("pageerror",e=>errs.push(e.message));await p.goto("http://localhost:8802/");return p};
 const signup=async(p,em,nm)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig12");await p.click("#go");await p.fill("#nm",nm);await p.click("#mk");await p.waitForSelector("#rccode");await p.click("#skip");await p.waitForSelector("#addf")};
 const A=await mk();await signup(A,"a@x.test","Alice");const B=await mk();await signup(B,"b@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","b@x.test");await A.click("#fadd");await A.waitForTimeout(300);
 await B.evaluate(()=>refresh());await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");await A.waitForTimeout(300);
 await A.click(".conv[data-id]");await A.waitForSelector("#tx");
 await A.fill("#tx",";)");await A.press("#tx","Enter");await A.waitForTimeout(700);
 await A.evaluate(()=>{closeChat();refresh()});await A.waitForTimeout(700);
 const f=await A.evaluate(()=>{const s=document.querySelector(".conv small");return{figs:s.querySelectorAll(".an").length,on:s.querySelectorAll(".an.on").length,text:s.textContent,label:(s.querySelector(".an")||{}).title}});
 assert.strictEqual(f.figs,1,"one drawn figure in the list");assert.strictEqual(f.on,0,"not animated");assert.ok(!/😉/.test(f.text),"no emoji character: "+f.text);assert.ok(/^Du: /.test(f.text),"prefix kept: "+f.text);
 console.log("1 figure in the list:",f.label);
 await A.click(".conv[data-id]");await A.waitForSelector("#tx");await A.fill("#tx","hei på deg");await A.press("#tx","Enter");await A.waitForTimeout(700);
 await A.evaluate(()=>{closeChat();refresh()});await A.waitForTimeout(700);
 const g=await A.evaluate(()=>{const s=document.querySelector(".conv small");return{figs:s.querySelectorAll(".an").length,text:s.textContent}});
 assert.strictEqual(g.figs,0);assert.strictEqual(g.text,"Du: hei på deg");console.log("2 plain text stays text");
 assert.deepStrictEqual(errs,[],errs.join("|"));console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
