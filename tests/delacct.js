const {chromium}=require("playwright");
const http=require("http"),fs=require("fs");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8805);
const ok=(c,m)=>{if(!c){console.error("TESTFEIL",m);process.exit(1)}};
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const mk=async()=>{const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});await p.goto("http://localhost:8805/");return p};
 const A=await mk(),B=await mk();
 const signup=async(p,em,name)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#addf")};
 await signup(A,"alice@x.test","Alice");await signup(B,"bob@x.test","Bob");
 await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForSelector("text=Venter på svar");
 await B.evaluate(()=>refresh());await B.waitForSelector("#reqs:not([hidden]) button");await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 // A åpner profilen og dialogen
 await A.evaluate(()=>{$("#prof").hidden=false});
 await A.click("#delb");await A.waitForSelector("#info:not([hidden]) input");
 const go=A.locator("#info button.dng");
 ok(await go.isDisabled(),"knappen skal være av før «slett» er skrevet");
 await A.fill("#info input","sle");ok(await go.isDisabled(),"delvis ord er ikke nok");
 await A.screenshot({path:"del1.png"});
 // feil først
 await A.evaluate(()=>{window.__delFail=true});
 await A.fill("#info input","Slett");ok(await go.isEnabled(),"«Slett» (stor S) skal virke");
 await go.click();await A.waitForSelector("#info .err:not(:empty)");
 console.log("1 feil:",await A.textContent("#info .err"),"| fortsatt innlogget:",await A.evaluate(()=>!!S.user),"| knapp igjen:",await go.isEnabled());
 ok((await A.textContent("#info .err")).includes("ikke slettet"),"feilmelding");
 // lukk uten å slette
 await A.keyboard.press("Escape");ok(await A.isHidden("#info"),"Esc lukker");
 ok(await A.evaluate(()=>window.__delCalls)===1,"bare ett kall så langt");
 // så på ekte
 await A.evaluate(()=>{window.__delFail=false});
 await A.click("#delb");await A.fill("#info input","slett");
 const nav=A.waitForNavigation({timeout:8000}).catch(()=>null);
 await A.locator("#info button.dng").click();await nav;
 await A.waitForSelector("#em",{timeout:8000});
 const left=await A.evaluate(()=>{const d=JSON.parse(localStorage.getItem("mockdb"));return {users:d.users.map(u=>u.email),profiles:d.profiles.length,chats:d.chats.length,friends:d.friends.length,keys:Object.keys(localStorage).filter(k=>/^pling_test_key_/.test(k)).length}});
 console.log("2 etter sletting:",JSON.stringify(left),"| på innloggingen igjen:",await A.isVisible("#em"));
 ok(JSON.stringify(left.users)==='["bob@x.test"]',"bare Bob igjen");
 ok(left.chats===0&&left.friends===0&&left.profiles===1,"samtale og kompis borte");
 await B.evaluate(()=>refresh());await B.waitForTimeout(600);
 console.log("3 Bob ser kompiser:",await B.locator(".conv[data-id]").count());
 ok(await B.locator(".conv[data-id]").count()===0,"Bob har ikke lenger Alice");
 console.log("FEIL A:",A.errs.length?A.errs:"ingen","| B:",B.errs.length?B.errs:"ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
