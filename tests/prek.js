const {chromium}=require("playwright");
const http=require("http"),fs=require("fs");
const DIR=require("path").resolve(__dirname,"..")+"/",MOCK=fs.readFileSync(__dirname+"/mock.js","utf8");
const srv=http.createServer((q,r)=>{const f=q.url.startsWith("/lib/")?DIR+q.url.slice(1):DIR+"index.html";r.setHeader("content-type",f.endsWith(".js")?"application/javascript":"text/html; charset=utf-8");r.end(fs.readFileSync(f))}).listen(8806);
(async()=>{
 const br=await chromium.launch();
 for(const scheme of ["light","dark"]){
  const ctx=await br.newContext({viewport:{width:1000,height:760},colorScheme:scheme});
  await ctx.route("**/lib/supabase.js",r=>r.fulfill({contentType:"application/javascript",body:MOCK}));
  const p=await ctx.newPage();p.errs=[];p.on("pageerror",e=>p.errs.push(e.message));
  await p.goto("http://localhost:8806/");await p.waitForSelector(".lh svg");
  console.log(scheme,"tittel:",await p.title(),"| logo på innlogging:",await p.locator(".lh svg.prk").count());
  await p.screenshot({path:`prek_login_${scheme}.png`});
  await p.click("text=Ny konto");await p.fill("#em","a@x.test");await p.fill("#pw","hemmelig1");await p.click("#go");await p.fill("#nm","Alice");await p.click("#mk");await p.waitForSelector("#skip");await p.click("#skip");await p.waitForSelector("#addf");
  console.log(scheme,"tomt vindu: logo",await p.locator(".empty h1 svg.prk").count(),"| tittellinje:",await p.locator(".tbn svg.prk").count(),"| prikkfarge:",await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--dot")));
  await p.screenshot({path:`prek_main_${scheme}.png`});
  if(scheme==="light"){await p.evaluate(()=>{$("#meb").click()});await p.selectOption("#st","busy");await p.waitForTimeout(500);console.log("opptatt -> prikk:",await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--dot")));await p.screenshot({path:"prek_busy.png"})}
  console.log("FEIL:",p.errs.length?p.errs:"ingen");
  await ctx.close()}
 await br.close();srv.close()})().catch(e=>{console.error("TESTFEIL",e.message);process.exit(1)});
