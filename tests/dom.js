// The small helpers every screen uses: $ (find an element), el (make an element), toast and fail (show a message), q (unpack a database answer).
// Called directly in the built page, so it does not matter where their code lives. Odd behavior is pinned on purpose (marked "quirk"):
// the whole app depends on it.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),assert=require("assert");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8785);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error"&&!/^DOMTEST/.test(m.text()))p.errs.push(m.text())});
 await p.goto("http://localhost:8785/");
 await p.waitForFunction(()=>typeof el==="function"&&typeof q==="function"&&typeof fail==="function");

 // ---- $ ----
 const d1=await p.evaluate(()=>{const box=document.createElement("div");box.innerHTML="<span id=in>x</span><i>y</i>";document.body.append(box);
  return{found:$("#toast")===document.getElementById("toast"),missing:$("#finnes-ikke"),scoped:$("span",box)===box.firstChild,scopedMiss:$("#toast",box),first:$("i",box).textContent,wholePage:$("body")===document.body&&$("title")===document.querySelector("title")}});
 assert.deepStrictEqual(d1,{found:true,missing:null,scoped:true,scopedMiss:null,first:"y",wholePage:true});
 console.log("1 $ finds, returns null when missing, can be scoped");

 // ---- el: properties ----
 const d2=await p.evaluate(()=>{
  const a=el("div"),b=el("div",{class:"a b"}),c=el("p",{title:"t",hidden:true,disabled:false,x:null,y:undefined,n:0,s:"",big:12});
  let clicked=[];const f=e=>clicked.push(e.type);const btn=el("button",{onclick:f});btn.click();btn.dispatchEvent(new Event("foo"));
  const odd=el("div",{online:f});odd.dispatchEvent(new Event("line")); // quirk: any property that starts with "on" is an event, even "online"
  const noAttr=el("div",{onclick:f});
  return{tag:a.tagName,attrs:a.getAttributeNames(),cls:b.className,cattrs:Object.fromEntries(c.getAttributeNames().map(n=>[n,c.getAttribute(n)])),
   clicked,oddFired:clicked.length,noOnAttr:noAttr.getAttribute("onclick"),svgTag:el("svg").tagName}});
 assert.deepStrictEqual([d2.tag,d2.attrs,d2.cls],["DIV",[],"a b"]);
 assert.deepStrictEqual(d2.cattrs,{title:"t",hidden:"",n:"0",s:"",big:"12"},"true gives an empty attribute; false, null and undefined give none; 0 and '' are kept");
 assert.deepStrictEqual(d2.clicked,["click","line"]);assert.strictEqual(d2.noOnAttr,null,"handlers are listeners, not attributes");
 console.log("2 el properties: class, listeners, true/false/null/0/'' attributes");

 // ---- el: children ----
 const d3=await p.evaluate(()=>{
  const n=document.createElement("b");n.textContent="B";
  const kids=(...k)=>{const e=el("div",{},...k);return[...e.childNodes].map(c=>c.nodeType===3?"#"+c.data:c.tagName)};
  return{plain:kids("a","b"),num:kids(0,5),node:kids(n,"x"),nulls:kids(null,"a",undefined,"b"),nested:kids(["a",n],"c"),
   deep:kids([["x"]]),falsy:kids(false,true,""),empty:kids(),noProps:(()=>{const e=el("p",undefined,"x");return e.textContent})(),
   propsNull:(()=>{try{el("p",null,"x");return"no error"}catch(e){return e.constructor.name}})()}});
 assert.deepStrictEqual(d3.plain,["#a","#b"]);assert.deepStrictEqual(d3.num,["#0","#5"]);assert.deepStrictEqual(d3.node,["B","#x"]);
 assert.deepStrictEqual(d3.nulls,["#a","#b"],"null and undefined children are skipped");
 assert.deepStrictEqual(d3.nested,["#a","B","#c"],"one level of arrays is flattened");
 assert.deepStrictEqual(d3.deep,["#x"],"quirk: a deeper array becomes text");
 assert.deepStrictEqual(d3.falsy,["#false","#true","#"],"quirk: false and true become text, '' an empty text node");
 assert.deepStrictEqual([d3.empty,d3.noProps,d3.propsNull],[[],"x","TypeError"],"null instead of the properties object throws");
 console.log("3 el children: text, numbers, nodes, null skipped, one level flattened");

 // ---- toast ----
 const d4=await p.evaluate(()=>{
  const st=window.setTimeout,ct=window.clearTimeout,log=[];let id=100;
  window.setTimeout=(f,ms)=>{const i=++id;log.push(["set",i,ms,f]);return i};window.clearTimeout=i=>{log.push(["clear",i])};
  const t=$("#toast"),snap=()=>[t.textContent,t.className,t.style.display];
  toast("hei");const a=snap();toast("feil",true);const b=snap();
  const sets=log.filter(l=>l[0]==="set"),clears=log.filter(l=>l[0]==="clear");
  sets[sets.length-1][3]();const hidden=snap();
  window.setTimeout=st;window.clearTimeout=ct;
  return{a,b,delays:sets.map(l=>l[2]),cleared:clears.map(l=>l[1]),ids:sets.map(l=>l[1]),hidden}});
 assert.deepStrictEqual(d4.a,["hei","","block"]);assert.deepStrictEqual(d4.b,["feil","bad","block"]);
 assert.deepStrictEqual(d4.delays,[3500,7000],"a normal message stays 3.5 s, an error 7 s");
 assert.deepStrictEqual(d4.cleared.slice(-1),[d4.ids[0]],"a new toast cancels the timer of the previous one");
 assert.strictEqual(d4.hidden[2],"none");
 console.log("4 toast: text, class, display, 3.5 s / 7 s, previous timer cancelled");

 // ---- fail ----
 const d5=await p.evaluate(()=>{
  const errs=[],ce=console.error;console.error=(...a)=>errs.push(a);
  const t=$("#toast"),out=[];
  const run=(e,c)=>{fail(e,c);out.push([t.textContent,t.className])};
  run(new Error("boom"),"Send");run("tekst");run("tekst2","Ctx");run(null,"Ctx");run({message:""},"X");run(undefined);run({message:"m"});
  console.error=ce;
  return{out,logged:errs.map(a=>[a[0],a[1]&&a[1].message||String(a[1])]).slice(0,3),nLogged:errs.length}});
 assert.deepStrictEqual(d5.out,[["Send: boom","bad"],["tekst","bad"],["Ctx: tekst2","bad"],["Ctx: null","bad"],["X: [object Object]","bad"],["undefined","bad"],["m","bad"]]);
 assert.strictEqual(d5.nLogged,7,"every failure is also written to the console");
 assert.deepStrictEqual(d5.logged[0],["Send","boom"]);
 console.log("5 fail: message with context, console.error, odd inputs");

 // ---- q ----
 const d6=await p.evaluate(async()=>{
  const r={};
  r.ok=await q(Promise.resolve({data:[1,2],error:null}),"x");
  r.nullData=await q(Promise.resolve({data:null,error:null}));
  const tryq=async(pr,c)=>{try{await q(pr,c);return"no error"}catch(e){return e.constructor.name+": "+e.message}};
  r.ctx=await tryq(Promise.resolve({data:null,error:{message:"nei"}}),"Hent");
  r.errAndData=await tryq(Promise.resolve({data:[1],error:{message:"nei"}}),"Hent");
  r.noCtx=await tryq(Promise.resolve({data:null,error:{message:"nei"}}));
  r.noMsg=await tryq(Promise.resolve({data:null,error:{}}),"Hent");
  r.rejects=await tryq(Promise.reject(new Error("nett")),"Hent");
  r.thenable=await q({then:f=>f({data:7,error:null})});
  return r});
 assert.deepStrictEqual(d6,{ok:[1,2],nullData:null,ctx:"Error: Hent: nei",errAndData:"Error: Hent: nei",noCtx:"Error: nei",noMsg:"Error: Hent: undefined",rejects:"Error: nett",thenable:7});
 console.log("6 q: data out, errors with context, rejections pass through, accepts a query object");

 assert.deepStrictEqual(p.errs,[],"no page errors: "+JSON.stringify(p.errs));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
