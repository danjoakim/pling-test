// Reactions between two users (they travel encrypted, like messages): choosing, replacing, removing, counts, who sees what, the choose-menu
// staying inside the screen, and that a reaction that is moved to another message, forged for another person or of an unknown kind is ignored.
// Uses the fake Supabase.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),assert=require("assert");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8784);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/supabase.min.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8784/");return p};
 const A=await mk(),B=await mk();
 const signup=async(p,em,name)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#men")};
 await signup(A,"alice@x.test","Alice");await signup(B,"bob@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForSelector("text=Venter på svar");
 await B.evaluate(()=>refresh());await B.waitForSelector("#reqs:not([hidden]) button");
 await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");
 await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");
 await A.fill("#tx","Første");await A.click("#sd");await A.waitForTimeout(300);
 await A.fill("#tx","Andre");await A.click("#sd");await A.waitForTimeout(300);
 await B.dblclick(".conv[data-id]");await B.waitForSelector("#tx:visible");await B.waitForFunction(()=>document.querySelectorAll("#log .m").length>=2);
 // what each message shows: [[label, mine, count], ...] per message, oldest first
 const chips=p=>p.evaluate(()=>[...document.querySelectorAll("#log .m")].map(m=>[...m.querySelectorAll(".rxc")].map(c=>[c.getAttribute("aria-label"),c.classList.contains("me"),c.lastElementChild.textContent])));
 const pick=async(p,nth,which)=>{const sel="#log .m:nth-of-type("+nth+")";await p.hover(sel);await p.click(sel+" .rxb");await p.waitForSelector(".rxp");await p.click(".rxp .rxo:nth-child("+which+")");await p.waitForTimeout(450)};
 const sync=async p=>{await p.evaluate(()=>refresh());await p.waitForTimeout(900)};
 const names=await A.evaluate(()=>RX.map(x=>x[1]));
 assert.strictEqual(names.length,6);

 // 1. A reacts "rofl" (1st) on the first message; B sees it as someone else's
 await pick(A,1,1);
 const a1=await chips(A);assert.deepStrictEqual(a1[0].map(c=>[c[1],c[2]]),[[true,"1"]]);assert.deepStrictEqual(a1[1],[]);
 await sync(B);const b1=await chips(B);assert.deepStrictEqual(b1[0].map(c=>[c[1],c[2]]),[[false,"1"]]);const fig=await A.evaluate(()=>AN_FIG.rofl[0]);assert.strictEqual(b1[0][0][0],fig+", 1","B's label names the kind and count");assert.strictEqual(a1[0][0][0],fig+", 1, din reaksjon","A's own chip says so");
 console.log("1 A reacts; B sees a chip that is not B's");

 // 2. B reacts with the same kind: one chip, count 2, marked as B's own; B reacts with another kind on the same message: two chips
 await pick(B,1,1);
 let b2=await chips(B);assert.deepStrictEqual(b2[0].map(c=>[c[1],c[2]]),[[true,"2"]]);
 await pick(B,1,3); // changes B's reaction from the 1st to the 3rd kind
 b2=await chips(B);assert.deepStrictEqual(b2[0].map(c=>[c[1],c[2]]),[[false,"1"],[true,"1"]],"B's old reaction replaced, chips in order of first appearance");
 await sync(A);const a2=await chips(A);assert.deepStrictEqual(a2[0].map(c=>[c[1],c[2]]),[[true,"1"],[false,"1"]]);
 console.log("2 same kind counts 2; changing replaces; order is by first appearance");

 // 3. clicking your own chip removes it; the menu shows your current kind as marked
 await B.click("#log .m:nth-of-type(1) .rxc.me");await B.waitForTimeout(450);
 b2=await chips(B);assert.deepStrictEqual(b2[0].map(c=>[c[1],c[2]]),[[false,"1"]]);
 await B.hover("#log .m:nth-of-type(1)");await B.click("#log .m:nth-of-type(1) .rxb");await B.waitForSelector(".rxp");
 assert.strictEqual(await B.locator(".rxp .rxo.me").count(),0,"nothing marked when B has no reaction");
 await B.click(".rxp .rxo:nth-child(2)");await B.waitForTimeout(450);
 await B.hover("#log .m:nth-of-type(1)");await B.click("#log .m:nth-of-type(1) .rxb");await B.waitForSelector(".rxp");
 assert.strictEqual(await B.locator(".rxp .rxo.me").count(),1);assert.strictEqual(await B.evaluate(()=>[...document.querySelectorAll(".rxp .rxo")].findIndex(b=>b.classList.contains("me"))),1,"the 2nd kind is marked");
 await B.click(".rxp .rxo:nth-child(2)");await B.waitForTimeout(450); // choosing the marked kind again removes it
 b2=await chips(B);assert.deepStrictEqual(b2[0].map(c=>[c[1],c[2]]),[[false,"1"]]);
 await sync(A);const a3=await chips(A);assert.deepStrictEqual(a3[0].map(c=>[c[1],c[2]]),[[true,"1"]]);
 console.log("3 removing works from the chip and from the menu");

 // 4. the server only holds ciphertext
 const raw=await A.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem("mockdb")).reactions));
 assert.ok(!/rofl|heart|thumbup|surprised|cry|thumbdown/.test(raw),"no reaction names in the stored rows");
 console.log("4 stored reactions are encrypted");

 // 5. forged reactions are ignored: moved to another message, signed for another user, or an unknown kind
 const forge=(payloadOf)=>A.evaluate(async src=>{const f=new Function("S","mid1","mid2","uid",src);const ids=S.msgs.map(m=>m.id),p=f(S,ids[0],ids[1],S.user.id);
   const key=await pairKey(S.profiles.get(S.chat.other).pub),s=await seal(key,p);
   await api.saveReaction({msg_id:ids[1],chat_id:S.chat.id,user_id:S.user.id,iv:s.iv,ct:s.ct})},payloadOf);
 const before=await chips(B);
 await forge("return {r:'heart',m:mid1,u:uid}");   // payload says message 1 but the row says message 2
 await sync(B);assert.deepStrictEqual(await chips(B),before,"a reaction moved to another message is ignored");
 await forge("return {r:'heart',m:mid2,u:'someone-else'}"); // payload names another person
 await sync(B);assert.deepStrictEqual(await chips(B),before,"a reaction signed for another person is ignored");
 await forge("return {r:'zzz',m:mid2,u:uid}");     // unknown kind
 await sync(B);assert.deepStrictEqual(await chips(B),before,"an unknown reaction is ignored");
 await forge("return {r:5,m:mid2,u:uid}");         // not even a string
 await sync(B);assert.deepStrictEqual(await chips(B),before,"a reaction of the wrong type is ignored");
 await forge("return {r:'heart',m:String(mid2),u:uid}"); // the message id as text still counts (compared as numbers)
 await sync(B);const b5=await chips(B);assert.deepStrictEqual(b5[1].map(c=>[c[1],c[2]]),[[false,"1"]]);
 console.log("5 forged reactions ignored; a text message id is accepted");

 // 6. the menu stays inside the screen, also on a narrow phone, and opens above or below its message
 const geo=async p=>p.evaluate(()=>{const r=document.querySelector(".rxp").getBoundingClientRect();return{l:r.left,r:r.right,t:r.top,b:r.bottom,w:innerWidth,h:innerHeight}});
 await A.setViewportSize({width:360,height:640});await A.waitForTimeout(300);
 await A.evaluate(()=>closeRx&&closeRx());
 await A.hover("#log .m:nth-of-type(2)");await A.click("#log .m:nth-of-type(2) .rxb");await A.waitForSelector(".rxp");
 const g1=await geo(A);assert.ok(g1.l>=8-.5&&g1.r<=g1.w-8+.5,"inside the screen sideways: "+JSON.stringify(g1));assert.ok(g1.t>=8-.5,"not above the screen: "+JSON.stringify(g1));
 const anchor=await A.evaluate(()=>document.querySelector("#log .m:nth-of-type(2) .rxb").getBoundingClientRect().top);
 assert.ok(g1.b<=anchor+.5||g1.t>=anchor,"above or below the message");
 console.log("6 menu geometry:",JSON.stringify([Math.round(g1.l),Math.round(g1.r),Math.round(g1.t),Math.round(g1.b)]));

 assert.deepStrictEqual([A.errs,B.errs],[[],[]],"no page errors: "+JSON.stringify([A.errs,B.errs]));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
