const {chromium}=require("playwright");
const http=require("http"),fs=require("fs");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8795);
(async()=>{const br=await chromium.launch();const ctx=await br.newContext();
await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto("http://localhost:8795/");await p.waitForTimeout(800);
const cases=[
 ["gamle koder","Hei :) :D ;) (L) (Y) :'( (K) (U) (6)"],
 ["nye ansikter",":-@ :@ :-# :-| :| :-$ :$ :-S :s :-* :* :-] :] 8-| 8o| |-) +o( *-) :8)"],
 ["parentes","(b) (d) (f) (g) (t) (R) (w) (BRB) (lol) (rotfl) (boo) (ap) (pi) (so) (um) (h5) (xx) (tu) (sn)"],
 ["symboler","<3 (@) (&) (*) (#) (^) (||) (~) ('.')"],
 ["IKKE omgjort","punkt (a) og (c) og (s) og (i), kl 12:30, tid:d, http://x.no/a_(b)_c, 3:1, a:b, (p) (x)"],
 ["ikke i lenker","se https://example.com/x:D/(y)/a;) nå :)"],
 ["bokstav etter","Note:Done :Dag :D! :s, :p"],["internett","xD XD xd, Max_D foo_O O_o T_T ^^ -_- >:( :( ok xDD (xD) a-_-b"],["store/små","(BRB) (Lol) :-d :P :p"]];
for(const [n,t] of cases)console.log(n+":",await p.evaluate(t=>emoji(t),t));
// lenker: sjekk at linkify ikke rører URL-en
const out=await p.evaluate(t=>{const d=document.createElement("div");d.append(...linkify(t));return d.innerHTML},cases[5][1]);
console.log("linkify:",out);
// In the built page (not just the module): every sample text from the fixture made by the old code must convert the same way
const V=JSON.parse(fs.readFileSync(__dirname+"/fixtures/emoji-vectors.json","utf8"));
const bad=await p.evaluate(cs=>cs.filter(([t,w])=>emoji(t)!==w).map(([t])=>t),V.cases);
if(bad.length){console.log("TESTFEIL emoji() differs from the old code for:",JSON.stringify(bad.slice(0,5)));process.exit(1)}
console.log("emoji() in the built page matches the old code for",V.cases.length,"texts");
console.log("feil:",errs.length?errs:"ingen");await br.close();srv.close()})();
