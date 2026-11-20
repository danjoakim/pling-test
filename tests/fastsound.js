// Fast lane: the message sound (and the double ping) starts when the live event arrives, not after the whole refresh,
// and the normal code path does not ring a second time. Claude cannot hear, so the calls to pling()/dobbelt() are counted.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path"),assert=require("assert");
const DIR=path.resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8796);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:900,height:900}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const errs=[];const mk=async()=>{const p=await ctx.newPage();p.on("pageerror",e=>errs.push(e.message));await p.goto("http://localhost:8796/");return p};
 const signup=async(p,em,nm)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig12");await p.click("#go");await p.fill("#nm",nm);await p.click("#mk");await p.waitForSelector("#rccode");await p.click("#skip");await p.waitForSelector("#addf")};
 const A=await mk();await signup(A,"a@x.test","Alice");const B=await mk();await signup(B,"b@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","b@x.test");await A.click("#fadd");await A.waitForTimeout(300);
 await B.evaluate(()=>refresh());await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>{window.__n={p:0,d:0};const op=pling,od=dobbelt;pling=(...a)=>{__n.p++;return op(...a)};dobbelt=(...a)=>{__n.d++;return od(...a)}});
 // 1. plain message: one ring, quickly
 await B.click(".conv[data-id]");await B.waitForSelector("#tx:visible");await B.fill("#tx","hei");await B.click("#sd");
 await A.waitForFunction(()=>__n.p>=1,null,{timeout:1500});
 await A.waitForTimeout(2500);
 const one=await A.evaluate(()=>__n.p);
 assert.strictEqual(one,1,"one message gives exactly one ring (fast lane, no repeat from refresh): "+one);
 console.log("1 message: one ring, fast lane");
 // 2. double ping: one ring
 await A.evaluate(()=>{__n.p=0;__n.d=0});
 await B.click("#dp");await A.waitForFunction(()=>__n.d>=1,null,{timeout:1500});await A.waitForTimeout(2500);
 const dd=await A.evaluate(()=>({p:__n.p,d:__n.d}));
 assert.strictEqual(dd.d,1,"the double ping rings once: "+JSON.stringify(dd));
 console.log("2 double ping: one ring",JSON.stringify(dd));
 assert.deepStrictEqual(errs,[],"no page errors: "+errs.join(" | "));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
