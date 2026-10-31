// The Content-Security-Policy in index.html: (1) the hashes in it are the hashes of the inline scripts, (2) the page starts and works under it
// (no policy violation while it starts), (3) a script that someone slips into the page is refused, and the page cannot talk to other
// servers than Supabase.
const {chromium}=require("playwright");
const http=require("http"),fs=require("fs"),assert=require("assert"),crypto=require("crypto");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const html=fs.readFileSync(DIR+"index.html","utf8");
// 1. the policy and the hashes
const meta=/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html);
assert.ok(meta,"the page has a Content-Security-Policy");
const csp=meta[1];
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.strictEqual(inline.length,2,"two inline scripts");
for(const t of inline)assert.ok(csp.includes("'sha256-"+crypto.createHash("sha256").update(t,"utf8").digest("base64")+"'"),"hash of an inline script is in the policy");
assert.ok(!/unsafe-inline[^;]*;/.test(csp.split("script-src")[1].split(";")[0]),"scripts: no unsafe-inline");
assert.ok(!/unsafe-eval/.test(csp),"no unsafe-eval");
assert.ok(/default-src 'self'/.test(csp)&&/object-src 'none'/.test(csp)&&/base-uri 'none'/.test(csp));
assert.ok(/connect-src[^;]*https:\/\/frvnbcltyvcnyympmjua\.supabase\.co[^;]*wss:\/\/frvnbcltyvcnyympmjua\.supabase\.co/.test(csp),"talks to Supabase (https and wss)");
console.log("1 policy present, hashes match the two inline scripts");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8786);
(async()=>{
 const br=await chromium.launch();const ctx=await br.newContext({viewport:{width:1000,height:760}});
 await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
 const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));p.on("console",m=>{if(m.type()==="error")p.errs.push(m.text())});
 await p.addInitScript(()=>{window.__csp=[];document.addEventListener("securitypolicyviolation",e=>window.__csp.push(e.violatedDirective+" "+e.blockedURI))});
 await p.goto("http://localhost:8786/");
 await p.waitForFunction(()=>typeof shrink==="function");
 // 2. started without violations
 assert.deepStrictEqual(await p.evaluate(()=>window.__csp),[],"no violation while the page starts");
 console.log("2 page starts under the policy without violations");
 // 3. foreign script and foreign server are refused
 const r=await p.evaluate(async()=>{
  window.__pwn=0;
  const s=document.createElement("script");s.textContent="window.__pwn=1";document.body.append(s);                       // inline script slipped in
  const d=document.createElement("div");d.innerHTML='<img src="x" onerror="window.__pwn=2">';document.body.append(d);      // handler attribute
  const e=document.createElement("script");e.src="https://example.com/x.js";document.body.append(e);                      // script from elsewhere
  let net="allowed";try{await fetch("https://example.com/");}catch(x){net="refused"}                                     // other server
  await new Promise(r=>setTimeout(r,300));
  return{pwn:window.__pwn,net,v:window.__csp.map(x=>x.split(" ")[0])};
 });
 assert.strictEqual(r.pwn,0,"slipped-in code did not run");
 assert.strictEqual(r.net,"refused","a foreign server is refused");
 for(const d of ["script-src-elem","script-src-attr","connect-src"])assert.ok(r.v.includes(d),"violation reported for "+d+": "+r.v);
 console.log("3 foreign script and foreign server refused:",[...new Set(r.v)].join(", "));
 assert.deepStrictEqual(p.errs.filter(x=>!/Content Security Policy|Refused to|example\.com|Failed to load resource|Failed to fetch/.test(x)),[],"no other page errors: "+JSON.stringify(p.errs));
 console.log("FEIL: ingen");
 await br.close();srv.close();
})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
