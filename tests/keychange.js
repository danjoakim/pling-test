// Key change warning (claude/noekkelvarsel.md): a friend's key is remembered the first time, a later change stops sending,
// hides the messages and shows the red card; "Stol på ny nøkkel" accepts it; a server that states another fingerprint than the key is never trusted.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path"),assert=require("assert");
const DIR=path.resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8798);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:900,height:900}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const errs=[];const mk=async()=>{const p=await ctx.newPage();p.on("pageerror",e=>errs.push(e.message));await p.goto("http://localhost:8798/");return p};
 const signup=async(p,em,nm)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig12");await p.click("#go");await p.fill("#nm",nm);await p.click("#mk");await p.waitForSelector("#rccode");await p.click("#skip");await p.waitForSelector("#addf")};
 const A=await mk();await signup(A,"a@x.test","Alice");const B=await mk();await signup(B,"b@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","b@x.test");await A.click("#fadd");await A.waitForTimeout(300);
 await B.evaluate(()=>refresh());await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");await A.waitForTimeout(300);
 await A.click(".conv[data-id]");await A.waitForSelector("#tx");
 await A.fill("#tx","hei Bob");await A.press("#tx","Enter");await A.waitForTimeout(600);
 // 1. the key is remembered the first time and the row says not confirmed
 const pin=await A.evaluate(()=>JSON.parse(localStorage.getItem(pinKey())));
 const bobId=await A.evaluate(()=>S.chat.other);
 assert.ok(pin[bobId]&&/^[0-9a-f]{32}$/.test(pin[bobId].fp),"pin saved");
 assert.ok(/Bekreft/.test(await A.textContent("#snb .mv")),"row says Bekreft");
 assert.ok(await A.evaluate(()=>!document.getElementById("bar").inert),"sending is open");
 console.log("1 key remembered, row not confirmed");
 // 2. mark as confirmed and back
 await A.evaluate(()=>{$("#mb").click()});await A.click("#snok");
 assert.ok(/Bekreftet/.test(await A.textContent("#snb .mv")),"confirmed");
 assert.ok((await A.evaluate(()=>JSON.parse(localStorage.getItem(pinKey()))))[bobId].verified>0,"verified saved");
 await A.click("#snok");assert.ok(/Bekreft\b/.test(await A.textContent("#snb .mv"))&&!/Bekreftet/.test(await A.textContent("#snb .mv")),"mark removed");
 await A.click("#snok");
 console.log("2 confirmed and removed");
 // 3. the server swaps Bob's key (fingerprint and key both new, consistent): everything stops
 const swap=async(keepFp)=>A.evaluate(async(keepFp)=>{
   const id=await PrekCrypto.generateIdentity(),fp=await fpOf(id.pub),d=JSON.parse(localStorage.getItem("mockdb"));
   const p=d.profiles.find(x=>x.id===S.chat.other);p.pub=id.pub;if(!keepFp)p.fp=fp;localStorage.setItem("mockdb",JSON.stringify(d));return fp},keepFp);
 const newFp=await swap(false);
 await A.evaluate(()=>refresh());await A.waitForSelector(".keyalert",{timeout:5000});
 assert.ok(await A.evaluate(()=>document.getElementById("bar").inert),"input locked");
 assert.ok(/Endret/.test(await A.textContent("#snb .mv")),"row says Endret");
 assert.ok(!(await A.textContent("#log")).includes("hei Bob"),"messages hidden");
 assert.ok(/Skjult/.test(await A.evaluate(()=>S.last.get(S.chat.other).t)),"list preview hidden");
 const err=await A.evaluate(async()=>{try{await pairKey(S.profiles.get(S.chat.other).pub);return null}catch(e){return e.keyChanged?e.message:"annen feil"}});
 assert.ok(err&&/endret/.test(err),"pairKey refuses: "+err);
 assert.strictEqual(await A.evaluate(()=>sendMsg({t:"lekkasje"})),false,"sendMsg refuses");
 assert.strictEqual((await A.evaluate(()=>JSON.parse(localStorage.getItem(pinKey()))))[bobId].fp===newFp,false,"old pin kept");
 console.log("3 swapped key stops sending, hides messages, shows the card");
 // 4. the alert keeps its place over a refresh (no flicker) and a second two-tap trust accepts it
 await A.evaluate(()=>refresh());await A.waitForTimeout(300);assert.ok(await A.$(".keyalert"),"still shown");
 await A.click(".keyalert .kab2");await A.waitForTimeout(100);assert.ok(await A.$(".keyalert"),"one tap is not enough");
 await A.click(".keyalert .kab2");await A.waitForFunction(()=>!document.querySelector(".keyalert")&&!document.getElementById("bar").inert,null,{timeout:5000});
 assert.strictEqual((await A.evaluate(()=>JSON.parse(localStorage.getItem(pinKey()))))[bobId].fp,newFp,"new key pinned");
 assert.ok(!(await A.evaluate(()=>JSON.parse(localStorage.getItem(pinKey()))))[bobId].verified,"confirmation cleared");
 console.log("4 trusting the new key re-opens the chat");
 // 5. a key whose stated fingerprint is not the key's: refused, trusting it is not possible, and the old pin stays
 await swap(true);await A.evaluate(()=>refresh());await A.waitForSelector(".keyalert",{timeout:5000});
 await A.click(".keyalert .kab2");await A.click(".keyalert .kab2");await A.waitForTimeout(400);
 assert.ok(await A.$(".keyalert"),"still blocked");
 assert.ok(await A.evaluate(()=>document.getElementById("bar").inert),"still locked");
 console.log("5 inconsistent server is never trusted");
 // 6. logout forgets the in-memory flags
 await A.evaluate(()=>{window.__k=pinKey()});await A.evaluate(()=>doLogout());await A.waitForTimeout(1500);
 assert.ok(await A.evaluate(()=>keyBadIds.size===0&&pins===null),"flags cleared at logout");
 assert.deepStrictEqual(errs,[],"no page errors: "+errs.join(" | "));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
