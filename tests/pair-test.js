const {chromium}=require("playwright");
const http=require("http"),fs=require("fs");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=DIR+(q.url==="/"?"index.html":q.url.split("#")[0].slice(1));try{const b=fs.readFileSync(f);r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(b)}catch(e){r.statusCode=404;r.end()}}).listen(8768);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:900,height:900}});
 await ctx.route("**/supabase.min.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const errs=[];
 const mk=async(dev)=>{const p=await ctx.newPage();p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push(m.text())});
  if(dev){ // enhet B: egen nøkkellagring
   await p.addInitScript(()=>{const g=Storage.prototype.getItem,s=Storage.prototype.setItem,r=Storage.prototype.removeItem;
    const mine=k=>String(k).startsWith("pling_test_key_");
    Storage.prototype.getItem=function(k){return mine(k)?sessionStorage.__proto__.getItem.call(window.__dev,k):g.call(this,k)};
    Storage.prototype.setItem=function(k,v){return mine(k)?s.call(window.__dev,k,v):s.call(this,k,v)};
    Storage.prototype.removeItem=function(k){return mine(k)?r.call(window.__dev,k):r.call(this,k)};
    window.__dev=(()=>{const m={};return{getItem:k=>m[k]??null,setItem:(k,v)=>{m[k]=v},removeItem:k=>{delete m[k]},__proto__:null}})();
    // forenkle: bruk et vanlig objekt
    window.__dev=(()=>{const m={};return{getItem:k=>m[k]??null,setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}})();
    Storage.prototype.getItem=function(k){return mine(k)?window.__dev.getItem(k):g.call(this,k)};
    Storage.prototype.setItem=function(k,v){return mine(k)?window.__dev.setItem(k,v):s.call(this,k,v)};
    Storage.prototype.removeItem=function(k){return mine(k)?window.__dev.removeItem(k):r.call(this,k)};
   });
  }
  await p.goto("http://localhost:8768/");return p};
 const A=await mk(false);
 await A.click("text=Ny konto");await A.fill("#em","alice@x.test");await A.fill("#pw","hemmelig12");await A.click("#go");await A.fill("#nm","Alice");await A.click("#mk");await A.waitForSelector("#rccode");await A.click("#skip");await A.waitForSelector("#addf");
 // Bob (samme enhet A, andre konto) gir en samtale å lese etterpå
 const Bp=await mk(false);await Bp.click("text=Ny konto");await Bp.fill("#em","bob@x.test");await Bp.fill("#pw","hemmelig12");await Bp.click("#go");await Bp.fill("#nm","Bob");await Bp.click("#mk");await Bp.waitForSelector("#rccode");await Bp.click("#skip");await Bp.waitForSelector("#addf");
 await A.click("#addf");await A.fill("#fe","bob@x.test");await A.click("#fadd");await A.waitForTimeout(200);
 await Bp.evaluate(()=>refresh());await Bp.click("#reqs button:has-text('Godta')");await Bp.waitForSelector(".conv[data-id]");
 await A.evaluate(()=>refresh());await A.dblclick(".conv[data-id]");await A.waitForSelector("#tx:visible");await A.fill("#tx","hemmelig før ny enhet");await A.click("#sd");await A.waitForTimeout(300);
 // ny enhet (samme konto Alice, uten nøkkel)
 const N=await mk(true);
 await N.fill("#em","alice@x.test").catch(()=>{});
 await N.click("#em").catch(()=>{});await N.fill("#em","alice@x.test");await N.fill("#pw","hemmelig12");await N.click("#go");
 await N.waitForSelector("#pair");console.log("1 ny enhet uten nøkkel:",await N.textContent("h1"));
 await N.click("#pair");await N.waitForTimeout(800);console.log("DEBUG toast:",await N.textContent("#toast"),"| fel:",errs.join(" | ").slice(0,400),"| h1:",await N.textContent("h1"));await N.waitForSelector("#pcode");
 const code=await N.textContent("#pcode");console.log("2 kode på ny enhet:",code,"| QR-lenke i QR:",await N.evaluate(()=>!!document.querySelector("#qrbox svg")));
 await A.waitForSelector("#pairreq",{timeout:8000});const codeA=await A.textContent("#pairreq .code");
 console.log("3 gammel enhet ser forespørsel med kode:",codeA,"| samme kode:",codeA===code);
 const raw0=await A.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem("mockdb")).key_transfers));
 await A.click("#papprove");
 await N.waitForSelector("#addf",{timeout:10000});
 console.log("4 ny enhet fikk nøkkelen og er inne:",await N.textContent(".dim"));
 await N.dblclick(".conv[data-id]");await N.waitForFunction(()=>document.querySelectorAll(".m").length>=1);
 console.log("5 ny enhet leser gammel melding:",await N.evaluate(()=>document.querySelector(".m").firstChild.textContent));
 const db=JSON.parse(await A.evaluate(()=>localStorage.getItem("mockdb")));
 console.log("6 forespørselen er ryddet bort:",(db.key_transfers||[]).length===0);
 console.log("7 ingen privat nøkkel (d) i klartekst mens den lå i databasen:",!/"d":"/.test(raw0));
 // avvisning
 const N2=await mk(true);await N2.fill("#em","alice@x.test");await N2.fill("#pw","hemmelig12");await N2.click("#go");await N2.waitForSelector("#pair");await N2.click("#pair");await N2.waitForSelector("#pcode");
 await A.waitForSelector("#pairreq",{timeout:8000});await A.click("#pdeny");
 await N2.waitForSelector("#pair",{timeout:8000});console.log("8 avvist: ny enhet er tilbake på valg, og har fortsatt ikke nøkkel");
 console.log("   toasts/feil:",errs.length?errs.join(" | ").slice(0,300):"ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
