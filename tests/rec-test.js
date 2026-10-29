const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),path=require("path");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=DIR+(q.url==="/"?"index.html":q.url.slice(1));try{const b=fs.readFileSync(f);r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(b)}catch(e){r.statusCode=404;r.end()}}).listen(8766);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:900,height:900}});
 await ctx.route("**/supabase.min.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const errs=[];const mk=async()=>{const p=await ctx.newPage();p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push(m.text())});await p.goto("http://localhost:8766/");return p};
 const A=await mk(),B=await mk();
 const reg=async(p,em,name)=>{await p.click("text=Ny konto");await p.fill("#em",em);await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm",name);await p.click("#mk");await p.waitForSelector("#rccode")};
 await reg(A,"alice@x.test","Alice");
 const code=await A.textContent("#rccode");console.log("1 kode:",code,"| format ok:",/^([0-9A-HJKMNP-TV-Z]{5}-){4}[0-9A-HJKMNP-TV-Z]{5}$/.test(code));
 await A.fill("#rcv","FEIL-KODE");await A.click("#rcgo");await A.waitForTimeout(200);console.log("2 feil kode avvist:",await A.isVisible("#rccode"));
 await A.fill("#rcv",code.toLowerCase().replace(/-/g," "));const t0=Date.now();await A.click("#rcgo");await A.waitForSelector("#addf");console.log("3 bekreftet med små bokstaver og mellomrom. Tid for PBKDF2+lagring:",Date.now()-t0,"ms");
 console.log("   status:",await A.textContent("#bkst"));
 const raw=await A.evaluate(()=>localStorage.getItem("mockdb"));const bk=JSON.parse(raw).key_backups[0];console.log("4 lagret i databasen: felt",Object.keys(bk).join(","),"| inneholder privat nøkkel i klartekst?",/"d":"/.test(JSON.stringify(bk)));
 // Bob + venner + melding
 await reg(B,"bob@x.test","Bob");await B.click("#skip");await B.waitForSelector("#addf");
 await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForTimeout(200);
 await B.evaluate(()=>refresh());await B.click("#reqs button:has-text('Godta')");await B.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.waitForSelector(".conv[data-id]");
 await B.dblclick(".conv[data-id]");await B.waitForSelector("#tx:visible");await B.fill("#tx","gammel melding til Alice");await B.click("#sd");
 console.log("5 Bob uten kode: status",await B.textContent("#bkst"));
 // A mister nøkkelen -> gjenopprett med kode
 await A.evaluate(()=>{localStorage.removeItem(keyName(S.user.id))});await A.reload();await A.waitForSelector("#rc");
 console.log("6 A mistet nøkkelen:",await A.textContent("h1"));
 await A.fill("#rc","AAAAA-AAAAA-AAAAA-AAAAA-AAAAA");await A.click("#rcgo");await A.waitForTimeout(1800);console.log("7 feil kode gir fortsatt gjenopprettingsside:",await A.isVisible("#rc"));
 await A.fill("#rc",code);await A.click("#rcgo");await A.waitForSelector("#addf");
 await A.dblclick(".conv[data-id]");await A.waitForFunction(()=>document.querySelectorAll(".m").length>=1);
 console.log("8 gjenopprettet med kode. A leser:",await A.evaluate(()=>[...document.querySelectorAll(".m")].map(m=>m.firstChild.textContent).join(" / ")));
 // (The old QR/transfer-code steps were removed together with that feature; device transfer is covered by pair-test.js.)
 await A.screenshot({path:"rec.png"});
 // "Koden stemmer ikke" is the expected rejection of the wrong code in step 7, not a bug.
 const bad=errs.filter(e=>!/Koden stemmer ikke/.test(e));
 console.log("FEIL:",bad.length?bad:"ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
