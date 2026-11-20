// Warm start: on the next start the last known friends are drawn at once (names only, no messages), the text "Henter kompiser …"
// replaces "Ingen kompiser ennå" until the real list has been fetched, and logging out removes the saved list.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path"),assert=require("assert");
const DIR=path.resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8797);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:900,height:900}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const errs=[];const mk=async()=>{const p=await ctx.newPage();p.on("pageerror",e=>errs.push(e.message));await p.goto("http://localhost:8797/");return p};
 const signup=async(p,em,nm)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig12");await p.click("#go");await p.fill("#nm",nm);await p.click("#mk");await p.waitForSelector("#rccode");await p.click("#skip");await p.waitForSelector("#addf")};
 const A=await mk();await signup(A,"a@x.test","Alice");const B=await mk();await signup(B,"b@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","b@x.test");await A.click("#fadd");await A.waitForTimeout(300);
 await B.evaluate(()=>refresh());await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");await A.waitForTimeout(300);
 const saved=await A.evaluate(()=>[localStorage.getItem(flKey())].filter(Boolean));
 assert.strictEqual(saved.length,1,"friend list saved");
 assert.ok(saved[0].includes("Bob")&&!/hei|melding/i.test(saved[0]),"names only, no messages: "+saved[0]);
 console.log("1 saved:",saved[0].slice(0,90));
 // 2. new start with a slow server: the friend is drawn before the real list arrives, and "Ingen kompiser" is never shown
 await A.evaluate(()=>{const o=api.listFriends;api.listFriends=()=>new Promise(r=>setTimeout(()=>r(o()),1500))});
 await A.evaluate(()=>{window.__seen=[];new MutationObserver(()=>{const t=document.getElementById("friends").textContent;if(/Ingen kompiser/.test(t))__seen.push("tom")}).observe(document.getElementById("friends"),{childList:true,subtree:true,characterData:true})});
 await A.evaluate(async()=>{closeChat();friendsLoaded=false;warmStart();warmP=refresh();await 0});
 await A.waitForTimeout(300);
 const early=await A.evaluate(()=>document.getElementById("friends").textContent);
 assert.ok(early.includes("Bob"),"friend shown before the real list is fetched: "+early);
 await A.waitForTimeout(1800);
 assert.deepStrictEqual(await A.evaluate(()=>__seen),[],"never 'Ingen kompiser' while loading");
 console.log("2 warm start shows Bob at once, no empty text");
 // 3. empty cache and slow server: 'Henter kompiser'
 await A.evaluate(()=>{localStorage.removeItem(flKey());S.friends=[];S.reqOut=[];friendsLoaded=false;drawFriends()});
 const txt=await A.evaluate(()=>document.getElementById("friends").textContent);
 assert.ok(/Henter kompiser/.test(txt)&&!/Ingen kompiser/.test(txt),"loading text: "+txt);
 console.log("3 loading text instead of empty text");
 // 4. logout removes the saved list
 await A.evaluate(()=>{friendsLoaded=true});await A.evaluate(()=>refresh());await A.waitForTimeout(2000);
 assert.ok(await A.evaluate(()=>localStorage.getItem(flKey())!==null),"saved again");
 await A.evaluate(()=>{window.__k=flKey()});await A.evaluate(()=>doLogout());await A.waitForTimeout(1500);
 assert.ok(!(await A.evaluate(()=>localStorage.getItem(window.__k)!==null)),"logout removes the saved list");
 console.log("4 logout clears the list");
 assert.deepStrictEqual(errs,[],"no page errors: "+errs.join(" | "));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
