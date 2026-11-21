// The push token reaches the database (claude/pling-status.md, push): the registration event from iOS must save the token, and logging out must remove it.
// A query is only sent when somebody waits for it, so this test uses the real api against the mock database, not a stub that records calls.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path"),assert=require("assert");
const DIR=path.resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8804);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:900,height:900}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const errs=[];const p=await ctx.newPage();p.on("pageerror",e=>errs.push(e.message));await p.goto("http://localhost:8804/");
 await p.click("text=Ny konto");await p.fill("#em",'a@x.test');await p.fill("#pw","hemmelig12");await p.click("#go");await p.fill("#nm","Alice");await p.click("#mk");await p.waitForSelector("#rccode");await p.click("#skip");await p.waitForSelector("#addf");
 const rows=()=>p.evaluate(()=>(JSON.parse(localStorage.getItem("mockdb")).push_tokens||[]).map(r=>[r.user_id===S.user.id,r.token.length,r.platform]));
 // the phone says yes to notifications and iOS hands over a token
 await p.evaluate(async()=>{let cb;window.Capacitor={isNativePlatform:()=>true,Plugins:{PushNotifications:{
   addListener:(n,f)=>{if(n==="registration")window.__reg=f},checkPermissions:async()=>({receive:"granted"}),requestPermissions:async()=>({receive:"granted"}),register:async()=>{}}}};
   pushWired=false;await initPush();window.__reg({value:"T".repeat(64)})});
 await p.waitForTimeout(500);
 assert.deepStrictEqual(await rows(),[[true,64,"ios"]],"the token is saved for me");
 console.log("1 registration saves the token in the database");
 // a second registration (every start) does not make a second row
 await p.evaluate(()=>window.__reg({value:"T".repeat(64)}));await p.waitForTimeout(300);
 assert.strictEqual((await rows()).length,1);console.log("2 registering again keeps one row");
 // logging out removes this phone's token
 await p.evaluate(()=>dropPush());await p.waitForTimeout(300);
 assert.deepStrictEqual(await rows(),[],"token removed at logout");console.log("3 logout removes the token");
 assert.deepStrictEqual(errs,[],errs.join("|"));console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
