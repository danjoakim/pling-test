const {chromium}=require("playwright");
const http=require("http"),fs=require("fs");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=DIR+(q.url==="/"?"index.html":q.url.slice(1));try{const b=fs.readFileSync(f);r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(b)}catch(e){r.statusCode=404;r.end()}}).listen(8777);
(async()=>{const br=await chromium.launch();
for(const sch of ["light","dark"]){
const ctx=await br.newContext({viewport:{width:1000,height:700},colorScheme:sch});
await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
const A=await ctx.newPage();await A.goto("http://localhost:8777/");
console.log(sch,"lys-klasse:",await A.evaluate(()=>document.documentElement.classList.contains("lys")));
await A.click("text=Ny konto");await A.fill("#em","alice@x.test");await A.fill("#pw","hemmelig1234");await A.click("#go");await A.fill("#nm","Alice");await A.click("#mk");await A.waitForSelector("#rccode",{timeout:5000}).catch(()=>{});
await A.click("#skip").catch(()=>{});await A.waitForSelector("#shell:not([hidden])",{timeout:5000}).catch(()=>{});
await A.screenshot({path:__dirname+"/th_"+sch+".png"});
if(sch==="light"){await A.click("#men");await A.selectOption("#thm","natt");console.log("etter valg natt, lys:",await A.evaluate(()=>document.documentElement.classList.contains("lys")+" "+localStorage.getItem("pling_theme")));await A.reload();console.log("etter reload lys:",await A.evaluate(()=>document.documentElement.classList.contains("lys")))}
await ctx.close()}
await br.close();srv.close()})();
